#!/usr/bin/env node

import "../src/utils/load-env.js";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { exec, spawn } from "child_process";
import * as fs from "fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { generateScript } from "../src/utils/generate-script.js";
import { generateAmbientAudioTrack } from "../src/utils/audio.js";
import { fetchUnsplashImages, getUnsplashUsage } from "../src/utils/unsplash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 3005);
const backendPort = Number(process.env.BACKEND_PORT || 3010);
let backendProcess: ReturnType<typeof spawn> | null = null;

type JobState = {
  id: string;
  prompt: string;
  seconds: number;
  tone:
    | "informative"
    | "casual"
    | "professional"
    | "dramatic"
    | "humorous"
    | "storytelling"
    | "calm"
    | "energetic"
    | "subtle"
    | "urgent";
  complexity: "simple" | "medium" | "detailed";
  stylePreset: "cinematic" | "educational" | "bold" | "playful" | "premium" | "documentary";
  audience: "general" | "beginners" | "students" | "creators" | "founders" | "executives" | "professionals";
  platform: "tiktok" | "reels" | "shorts" | "vertical";
  intensity: "safe" | "balanced" | "wild";
  motionLevel: "minimal" | "medium" | "high";
  visualDensity: "minimal" | "balanced" | "rich";
  narrativeTemplate: "problem-solution" | "myth-busting" | "timeline" | "comparison" | "transformation";
  goal: string;
  pacing: "calm" | "steady" | "fast";
  brief: string;
  audioMood: string;
  focus: "full" | "hook" | "middle" | "outro";
  state: "queued" | "writing" | "researching" | "audio" | "bundling" | "rendering" | "complete" | "error";
  stage: "queued" | "script" | "visuals" | "audio" | "bundle" | "render" | "done" | "error";
  progress: number;
  message: string;
  qualityScore?: number;
  outputPath?: string;
  error?: string;
  updatedAt: number;
};

const jobs = new Map<string, JobState>();
const history: JobState[] = [];
let activeJobId: string | null = null;

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64) || "ai-video";
}

function updateJob(id: string, patch: Partial<JobState>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  });
}

function scoreGeneration(job: JobState, script: Awaited<ReturnType<typeof generateScript>>) {
  let score = 50;
  score += Math.min(15, Math.max(0, script.sections.length - 2) * 3);
  score += script.scenePlan?.length ? 10 : 0;
  score += script.cta ? 5 : 0;
  score += script.audioMood ? 5 : 0;
  score += script.creativeDirection ? 10 : 0;
  score += job.goal ? 4 : 0;
  score += job.pacing ? 3 : 0;
  score += job.brief ? 5 : 0;
  score += job.visualDensity === "rich" ? 5 : 0;
  score += job.intensity === "wild" ? 3 : 0;
  return Math.max(0, Math.min(100, score));
}

function pushHistory(job: JobState) {
  history.unshift({ ...job });
  if (history.length > 12) {
    history.length = 12;
  }
}

function startBackend() {
  if (backendProcess && !backendProcess.killed) {
    return;
  }

  const python = process.env.PYTHON || "python3";
  backendProcess = spawn(python, [path.join(projectRoot, "backend", "server.py")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      BACKEND_PORT: String(backendPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[backend] ${chunk}`);
  });
  backendProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[backend] ${chunk}`);
  });

  backendProcess.on("exit", (code) => {
    console.log(`Python backend exited with code ${code ?? "unknown"}`);
    backendProcess = null;
  });
}

async function proxyToBackend(req: http.IncomingMessage, res: http.ServerResponse) {
  const targetUrl = `http://127.0.0.1:${backendPort}${req.url || "/"}`;
  const method = req.method || "GET";
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (key === "host" || key === "content-length") continue;
    if (Array.isArray(value)) {
      headers[key] = value.join(", ");
    } else if (value) {
      headers[key] = value;
    }
  }

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on("end", () => resolve(Buffer.concat(chunks)));
          req.on("error", reject);
        });

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}

async function runJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    updateJob(jobId, {
      state: "writing",
      stage: "script",
      progress: 5,
      message: "Drafting the script with Z.ai...",
    });

    const script = await generateScript({
      topic: job.prompt,
      tone: job.tone,
      complexity: job.complexity,
      targetDurationSeconds: job.seconds,
      useAI: true,
      apiKey: process.env.ZAI_API_KEY,
      stylePreset: job.stylePreset,
      audience: job.audience,
      platform: job.platform,
      intensity: job.intensity,
      motionLevel: job.motionLevel,
      visualDensity: job.visualDensity,
      narrativeTemplate: job.narrativeTemplate,
      goal: job.goal,
      pacing: job.pacing,
      brief: job.brief,
      audioMood: job.audioMood,
      focus: job.focus,
    });

    const qualityScore = scoreGeneration(job, script);
    updateJob(jobId, {
      qualityScore,
      message: `Script drafted. Quality score: ${qualityScore}/100.`,
    });

    updateJob(jobId, {
      state: "researching",
      stage: "visuals",
      progress: 25,
      message: "Searching Unsplash for topic visuals...",
    });

    const imageCount =
      job.visualDensity === "rich"
        ? Math.max(8, script.sections.length * 2)
        : job.visualDensity === "minimal"
          ? Math.max(3, script.sections.length + 1)
          : Math.max(5, script.sections.length + 2);
    const images = await fetchUnsplashImages(job.prompt, script, imageCount, 1080, 1920);

    updateJob(jobId, {
      state: "audio",
      stage: "audio",
      progress: 45,
      message: "Synthesizing the background audio bed...",
    });

    const audio = await generateAmbientAudioTrack(
      job.prompt,
      job.seconds,
      job.audioMood || script.audioMood
    );

    updateJob(jobId, {
      state: "bundling",
      stage: "bundle",
      progress: 60,
      message: "Bundling the Remotion project...",
    });

    const outputDir = path.join(process.cwd(), "output", "ai-mode");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${slugify(job.prompt)}-${Date.now()}.mp4`);

    const bundleLocation = await bundle({
      entryPoint: path.join(projectRoot, "src", "index.ts"),
      onProgress: (progress) => {
        updateJob(jobId, {
          state: "bundling",
          stage: "bundle",
          progress: Math.min(72, 60 + Math.round(progress * 12)),
          message: "Bundling the Remotion project...",
        });
      },
    });

    updateJob(jobId, {
      state: "rendering",
      stage: "render",
      progress: 75,
      message: "Rendering the final video...",
    });

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ExplainerVideo",
      inputProps: {
        topic: script.title,
        script,
        images,
        audio,
        targetDurationSeconds: job.seconds,
        fontSizeScale: 1,
      },
    });

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {
        topic: script.title,
        script,
        images,
        audio,
        targetDurationSeconds: job.seconds,
        fontSizeScale: 1,
      },
      onProgress: ({ progress }) => {
        updateJob(jobId, {
          state: "rendering",
          stage: "render",
          progress: 75 + Math.round(progress * 25),
          message: "Rendering the final video...",
        });
      },
    });

    updateJob(jobId, {
      state: "complete",
      stage: "done",
      progress: 100,
      message: "Video finished and saved locally.",
      qualityScore,
      outputPath,
    });

    openFile(outputPath);
  } catch (error) {
    updateJob(jobId, {
      state: "error",
      stage: "error",
      progress: 100,
      message: "Generation failed.",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    const finalJob = jobs.get(jobId);
    if (finalJob) {
      pushHistory(finalJob);
    }
    activeJobId = null;
  }
}

function openFile(filePath: string) {
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${filePath}"`, () => {});
}

function renderHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RemotionVidCreator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
      --bg: #050608;
      --panel: rgba(12, 15, 23, 0.84);
      --panel-strong: rgba(16, 20, 30, 0.96);
      --panel-soft: rgba(255, 255, 255, 0.04);
      --line: rgba(255, 255, 255, 0.09);
      --line-strong: rgba(255, 255, 255, 0.16);
      --text: rgba(255, 255, 255, 0.94);
      --muted: rgba(255, 255, 255, 0.62);
      --muted-strong: rgba(255, 255, 255, 0.78);
      --accent: #8ddcff;
      --accent-2: #ffb86b;
      --accent-3: #8ef7c7;
      --danger: #ff6b7a;
      --shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
      --shadow-soft: 0 12px 30px rgba(0, 0, 0, 0.24);
      --radius-xl: 32px;
      --radius-lg: 24px;
      --radius-md: 18px;
      --radius-sm: 14px;
    }
    * { box-sizing: border-box; }
    html {
      scroll-behavior: smooth;
      background: var(--bg);
    }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Manrope, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 14% 12%, rgba(141, 220, 255, 0.16), transparent 24%),
        radial-gradient(circle at 88% 18%, rgba(255, 184, 107, 0.13), transparent 22%),
        radial-gradient(circle at 20% 85%, rgba(142, 247, 199, 0.11), transparent 20%),
        linear-gradient(180deg, #040506 0%, #090b10 40%, #050608 100%);
      color: var(--text);
      overflow-x: hidden;
      overflow-y: auto;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.11;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
    }
    body::after {
      content: "";
      position: fixed;
      inset: auto auto -180px -120px;
      width: 520px;
      height: 520px;
      pointer-events: none;
      background: radial-gradient(circle, rgba(141, 220, 255, 0.15), transparent 68%);
      filter: blur(16px);
      opacity: 0.8;
    }
    .shell {
      position: relative;
      max-width: 1320px;
      margin: 0 auto;
      padding: 28px 20px 56px;
    }
    .topbar {
      position: sticky;
      top: 16px;
      z-index: 50;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      background: rgba(8, 10, 15, 0.72);
      backdrop-filter: blur(24px);
      box-shadow: var(--shadow-soft);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background:
        linear-gradient(135deg, rgba(141, 220, 255, 0.95), rgba(255, 184, 107, 0.9));
      color: #0a1018;
      font-weight: 900;
      letter-spacing: -0.08em;
      box-shadow: 0 14px 30px rgba(141, 220, 255, 0.18);
    }
    .brand-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .brand-copy strong {
      font-size: 15px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    .brand-copy span {
      font-size: 12px;
      color: var(--muted);
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--muted-strong);
      font-size: 12px;
      white-space: nowrap;
    }
    .pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent-3);
      box-shadow: 0 0 0 6px rgba(142, 247, 199, 0.08);
    }
    .hero {
      text-align: center;
      padding: 24px 0 22px;
      display: grid;
      gap: 12px;
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--accent);
    }
    h1 {
      margin: 0;
      font-family: Fraunces, Georgia, serif;
      font-size: clamp(36px, 5vw, 68px);
      line-height: 0.98;
      letter-spacing: -0.04em;
      max-width: 13ch;
      margin-inline: auto;
    }
    .lede {
      margin: 0 auto;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
      max-width: 68ch;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 4px;
    }
    .hero-link {
      text-decoration: none;
    }
    .hero-note {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .starter-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    .starter-prompt {
      border: 1px solid rgba(141, 220, 255, 0.16);
      border-radius: 999px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
    }
    .starter-prompt:hover {
      transform: translateY(-1px);
      border-color: rgba(141, 220, 255, 0.5);
      background: rgba(141, 220, 255, 0.08);
    }
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      background: linear-gradient(180deg, rgba(18, 22, 33, 0.92), rgba(11, 14, 22, 0.92));
      box-shadow: var(--shadow);
      backdrop-filter: blur(24px);
      overflow: hidden;
    }
    .composer {
      padding: 24px;
      display: grid;
      gap: 18px;
    }
    .field label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    textarea, input {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-lg);
      background: rgba(255,255,255,0.045);
      color: var(--text);
      padding: 16px 18px;
      font: inherit;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }
    select {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-lg);
      background: rgba(255,255,255,0.045);
      color: var(--text);
      padding: 16px 18px;
      font: inherit;
      outline: none;
      appearance: none;
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }
    textarea {
      min-height: 260px;
      resize: vertical;
      line-height: 1.55;
      font-size: 18px;
      padding-top: 20px;
    }
    textarea:focus, input:focus, select:focus {
      border-color: rgba(141, 220, 255, 0.78);
      box-shadow: 0 0 0 4px rgba(141, 220, 255, 0.12);
      transform: translateY(-1px);
    }
    .composer-head {
      display: grid;
      gap: 8px;
    }
    .composer-head h2,
    .panel-title {
      margin: 0;
      font-size: 17px;
      letter-spacing: -0.03em;
    }
    .composer-head p,
    .panel-copy {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .field-grid.three {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .field-grid.four {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .advanced-panel,
    .diagnostics-panel {
      margin-top: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      background: rgba(255,255,255,0.03);
      overflow: hidden;
    }
    .advanced-panel summary,
    .diagnostics-panel summary {
      cursor: pointer;
      list-style: none;
      padding: 16px 18px;
      color: var(--muted-strong);
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .advanced-panel summary::-webkit-details-marker,
    .diagnostics-panel summary::-webkit-details-marker {
      display: none;
    }
    .advanced-panel summary::after,
    .diagnostics-panel summary::after {
      content: "+";
      width: 26px;
      height: 26px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,0.06);
      color: var(--accent);
    }
    .advanced-panel[open] summary::after,
    .diagnostics-panel[open] summary::after {
      content: "-";
    }
    .advanced-fields {
      padding: 0 18px 18px;
    }
    .brief {
      min-height: 92px;
      resize: vertical;
      padding-top: 14px;
      font-size: 14px;
    }
    .tone-hint {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(141, 220, 255, 0.12);
      background: rgba(255,255,255,0.035);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .field-hint {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(141, 220, 255, 0.12);
      background: rgba(255,255,255,0.035);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .stack {
      display: grid;
      gap: 14px;
    }
    .button {
      border: 0;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--accent) 0%, #c6f3ff 40%, var(--accent-2) 120%);
      color: #06101a;
      padding: 18px 22px;
      font-weight: 900;
      font-size: 15px;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 18px 36px rgba(141, 220, 255, 0.18);
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
    }
    .button:hover { transform: translateY(-1px); filter: brightness(1.02); }
    .button:active { transform: translateY(1px); }
    .button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .button.secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 700;
    }
    .right-rail {
      display: grid;
      gap: 14px;
      position: sticky;
      top: 86px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-guide {
      margin-top: 12px;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(141, 220, 255, 0.12);
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
      display: grid;
      gap: 8px;
    }
    .preset-guide strong {
      font-size: 13px;
      letter-spacing: -0.02em;
    }
    .preset-guide p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }
    .preset-guide-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-guide-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--muted-strong);
      font-size: 11px;
      white-space: nowrap;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
    }
    .chip:hover {
      transform: translateY(-1px);
      border-color: rgba(141, 220, 255, 0.45);
      background: rgba(141, 220, 255, 0.08);
    }
    .chip.active {
      border-color: rgba(141, 220, 255, 0.75);
      background: rgba(141, 220, 255, 0.14);
      color: #e9fbff;
    }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .preset-card {
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.035);
      padding: 14px;
      text-align: left;
    }
    .preset-name {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .preset-copy {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
    }
    .panel {
      padding: 18px;
    }
    .preview-card {
      display: grid;
      gap: 12px;
    }
    .preview-pane {
      display: grid;
      gap: 12px;
    }
    .preview-frame {
      min-height: 240px;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.09);
      background:
        radial-gradient(circle at 18% 18%, rgba(141, 220, 255, 0.3), transparent 30%),
        radial-gradient(circle at 82% 20%, rgba(255, 184, 107, 0.22), transparent 24%),
        linear-gradient(160deg, rgba(9, 17, 28, 0.98), rgba(16, 20, 33, 0.94));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04), 0 18px 40px rgba(0,0,0,0.28);
      padding: 18px;
      display: grid;
      align-content: end;
      gap: 12px;
      position: relative;
      overflow: hidden;
    }
    .preview-frame::after {
      content: "";
      position: absolute;
      inset: auto -12% -30% auto;
      width: 170px;
      height: 170px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(142, 247, 199, 0.34), transparent 68%);
      filter: blur(10px);
      opacity: 0.8;
    }
    .preview-kicker {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.09);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .preview-title {
      margin: 0;
      max-width: 12ch;
      font-size: 24px;
      line-height: 1;
      letter-spacing: -0.04em;
      position: relative;
      z-index: 1;
    }
    .preview-copy {
      margin: 0;
      color: rgba(233, 245, 255, 0.78);
      font-size: 13px;
      line-height: 1.6;
      max-width: 34ch;
      position: relative;
      z-index: 1;
    }
    .preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preview-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 11px;
      color: var(--muted-strong);
    }
    .attribution-card {
      display: grid;
      gap: 12px;
    }
    .attribution-list {
      display: grid;
      gap: 10px;
    }
    .credit-row {
      display: grid;
      gap: 6px;
      padding: 13px;
      border-radius: 18px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 13px;
      line-height: 1.5;
    }
    .credit-row a {
      color: #d4f7ff;
      text-decoration: underline;
      text-underline-offset: 3px;
      word-break: break-word;
    }
    .credit-meta {
      color: var(--muted);
      font-size: 11px;
      word-break: break-word;
    }
    .panel + .panel {
      margin-top: 0;
    }
    .panel-stack {
      display: grid;
      gap: 14px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      padding: 14px;
      border-radius: 18px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .metric .label {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .metric .value {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .metric .subvalue {
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .timeline {
      display: grid;
      gap: 10px;
    }
    .timeline-item {
      padding: 14px;
      border-radius: 18px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      display: grid;
      gap: 8px;
    }
    .timeline-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      color: var(--muted);
    }
    .timeline-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.4;
    }
    .timeline-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 11px;
      color: var(--muted);
    }
    .timeline-btn {
      justify-self: start;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 999px;
      padding: 8px 10px;
      background: rgba(255,255,255,0.05);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
    }
    .timeline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .workspace {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 22px;
      align-items: start;
    }
    .progress {
      height: 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .bar {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), #d4f7ff 45%, var(--accent-2));
      box-shadow: 0 0 24px rgba(141, 220, 255, 0.4);
      transition: width 180ms linear;
    }
    .stage-card {
      display: grid;
      gap: 12px;
    }
    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stage-title {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .stage-copy {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
      margin: 0;
    }
    .status-banner {
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      border: 1px solid rgba(255,255,255,0.08);
      display: grid;
      gap: 8px;
    }
    .status-banner .label {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .status-banner .value {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.03em;
    }
    .status-banner .subvalue {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }
    .log {
      min-height: 220px;
      border-radius: 22px;
      background: rgba(0,0,0,0.24);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 18px;
      color: rgba(255,255,255,0.78);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.7;
      overflow: auto;
      white-space: pre-wrap;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 12px;
      padding-top: 6px;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 12px;
    }
    .section-title strong {
      font-size: 16px;
      letter-spacing: -0.02em;
    }
    .section-title span {
      color: var(--muted);
      font-size: 12px;
    }
    .composer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .composer-actions .button {
      min-width: 190px;
      flex: 1 1 220px;
    }
    .composer-actions .button.secondary {
      min-width: 160px;
      flex: 0 1 180px;
    }
    @media (max-width: 900px) {
      .topbar {
        position: static;
        border-radius: 28px;
        align-items: flex-start;
      }
      .workspace,
      .grid {
        grid-template-columns: 1fr;
      }
      .right-rail {
        position: static;
      }
      .preset-grid,
      .field-grid {
        grid-template-columns: 1fr;
      }
      .composer-actions .button,
      .composer-actions .button.secondary {
        flex: 1 1 100%;
        min-width: 0;
      }
      .shell {
        padding-inline: 14px;
      }
      h1 {
        font-size: clamp(34px, 12vw, 54px);
      }
    }

    /* Light redesign override: calm SaaS workspace with no horizontal overflow. */
    :root {
      color-scheme: light;
      --bg: #f8f3ea;
      --panel: #fffdf8;
      --panel-strong: #ffffff;
      --panel-soft: #f2eee6;
      --line: #ded6c9;
      --line-strong: #c9bead;
      --text: #17211d;
      --muted: #756f67;
      --muted-strong: #4d554f;
      --accent: #087f72;
      --accent-2: #f29b50;
      --accent-3: #69b99d;
      --danger: #c2414b;
      --shadow: 0 26px 70px rgba(79, 64, 40, 0.12);
      --shadow-soft: 0 14px 34px rgba(79, 64, 40, 0.08);
    }
    html,
    body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      background: var(--bg);
    }
    body {
      font-family: Manrope, "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 8% 12%, rgba(8, 127, 114, 0.14), transparent 28%),
        radial-gradient(circle at 92% 8%, rgba(242, 155, 80, 0.18), transparent 24%),
        linear-gradient(135deg, #fbf8f1 0%, #f5efe4 52%, #eff5ef 100%);
    }
    body::before {
      opacity: 0.08;
      mix-blend-mode: multiply;
    }
    body::after {
      background: radial-gradient(circle, rgba(8, 127, 114, 0.12), transparent 70%);
    }
    .shell {
      width: min(1180px, 100%);
      padding: 22px clamp(16px, 4vw, 34px) 48px;
    }
    .topbar {
      top: 12px;
      margin-bottom: 34px;
      background: rgba(255, 253, 248, 0.86);
      border: 1px solid rgba(50, 43, 34, 0.1);
      box-shadow: 0 18px 40px rgba(66, 53, 36, 0.08);
    }
    .brand-mark {
      background: #17211d;
      color: #fff8ec;
      box-shadow: none;
    }
    .brand-copy strong,
    .section-title strong,
    .panel-title,
    .timeline-title,
    .status-banner .value,
    .metric .value {
      color: var(--text);
    }
    .pill {
      background: #ffffff;
      border-color: rgba(23, 33, 29, 0.1);
      color: var(--muted-strong);
    }
    .pill-dot {
      background: var(--accent);
      box-shadow: 0 0 0 6px rgba(8, 127, 114, 0.1);
    }
    .hero {
      text-align: left;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      column-gap: 28px;
      padding: 10px 2px 30px;
    }
    .eyebrow,
    .lede,
    .hero-actions {
      grid-column: 1;
    }
    h1 {
      grid-column: 1;
      margin-inline: 0;
      max-width: 12ch;
      color: var(--text);
      font-size: clamp(42px, 7vw, 86px);
      letter-spacing: -0.06em;
    }
    .lede {
      margin: 0;
      max-width: 54ch;
      color: var(--muted-strong);
    }
    .hero-actions {
      justify-content: flex-start;
    }
    .hero-note {
      color: var(--muted);
    }
    .workspace {
      grid-template-columns: minmax(0, 1fr) minmax(320px, 390px);
      gap: 18px;
      width: 100%;
    }
    .card,
    .panel,
    .panel-stack {
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid rgba(23, 33, 29, 0.1);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(18px);
    }
    .card {
      border-radius: 30px;
      overflow: hidden;
    }
    #creation-brief {
      display: grid;
      gap: 18px;
      padding: clamp(18px, 3vw, 28px);
    }
    #creation-brief > .composer,
    #creation-brief > .field-grid,
    #creation-brief > .field,
    #creation-brief > .advanced-panel,
    #creation-brief > .composer-actions,
    #creation-brief > .foot {
      min-width: 0;
    }
    .composer {
      padding: 0;
      gap: 16px;
    }
    .composer-head p,
    .panel-copy,
    .stage-copy,
    .section-title span,
    .metric .subvalue,
    .status-banner .subvalue,
    .brand-copy span,
    .timeline-top,
    .timeline-meta,
    .credit-meta {
      color: var(--muted);
    }
    .starter-prompts {
      gap: 10px;
    }
    .starter-prompt,
    .chip,
    .timeline-btn {
      background: #ffffff;
      color: var(--text);
      border-color: rgba(23, 33, 29, 0.12);
      box-shadow: 0 8px 18px rgba(79, 64, 40, 0.04);
    }
    .starter-prompt:hover,
    .chip:hover,
    .timeline-btn:hover {
      background: #f1f8f5;
      border-color: rgba(8, 127, 114, 0.35);
    }
    .field label,
    .metric .label,
    .status-banner .label {
      color: #7f7669;
      letter-spacing: 0.16em;
    }
    textarea,
    input,
    select {
      background: #ffffff;
      color: var(--text);
      border-color: rgba(23, 33, 29, 0.13);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }
    textarea::placeholder,
    input::placeholder {
      color: #9d968c;
    }
    textarea {
      min-height: 210px;
      font-size: 18px;
    }
    .brief {
      min-height: 72px;
      font-size: 14px;
    }
    textarea:focus,
    input:focus,
    select:focus {
      border-color: rgba(8, 127, 114, 0.7);
      box-shadow: 0 0 0 4px rgba(8, 127, 114, 0.12);
      transform: none;
    }
    .field-grid,
    .field-grid.four {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .advanced-panel,
    .diagnostics-panel {
      background: #fffaf0;
      border-color: rgba(23, 33, 29, 0.1);
      border-radius: 22px;
    }
    .advanced-panel summary,
    .diagnostics-panel summary {
      color: var(--text);
    }
    .advanced-panel summary::after,
    .diagnostics-panel summary::after {
      background: #ecf7f3;
      color: var(--accent);
    }
    .tone-hint,
    .field-hint,
    .preset-guide,
    .metric,
    .status-banner,
    .timeline-item,
    .credit-row {
      background: #ffffff;
      border-color: rgba(23, 33, 29, 0.1);
      color: var(--muted-strong);
    }
    .composer-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
    }
    .composer-actions .button,
    .composer-actions .button.secondary {
      min-width: 0;
      flex: none;
    }
    .button {
      background: linear-gradient(135deg, #0c8b7d 0%, #36b396 55%, #f4b56d 125%);
      color: #ffffff;
      box-shadow: 0 18px 36px rgba(8, 127, 114, 0.18);
    }
    .button.secondary {
      background: #ffffff;
      color: var(--text);
      border-color: rgba(23, 33, 29, 0.12);
      box-shadow: none;
    }
    .foot {
      color: var(--muted);
      padding-top: 0;
    }
    code {
      color: #324039;
    }
    .right-rail {
      top: 88px;
      min-width: 0;
    }
    .preview-frame {
      min-height: 230px;
      background:
        radial-gradient(circle at 18% 18%, rgba(8, 127, 114, 0.18), transparent 28%),
        radial-gradient(circle at 82% 24%, rgba(242, 155, 80, 0.22), transparent 24%),
        linear-gradient(155deg, #fcfbf7, #eaf4ef);
      border-color: rgba(23, 33, 29, 0.1);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8);
    }
    .preview-kicker,
    .preview-chip {
      background: rgba(255, 255, 255, 0.76);
      border-color: rgba(23, 33, 29, 0.1);
      color: var(--muted-strong);
    }
    .preview-title,
    .preview-copy {
      color: var(--text);
    }
    .preview-copy {
      color: var(--muted-strong);
    }
    .panel-stack {
      border-radius: 30px;
      overflow: hidden;
    }
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
    .progress {
      background: #ede6da;
      border-color: rgba(23, 33, 29, 0.08);
    }
    .bar {
      background: linear-gradient(90deg, var(--accent), #63c2a9, var(--accent-2));
      box-shadow: none;
    }
    .log {
      background: #17211d;
      color: #eff8f3;
      border-color: rgba(23, 33, 29, 0.12);
    }
    .credit-row a {
      color: #076d63;
    }
    @media (max-width: 980px) {
      .hero {
        display: grid;
        grid-template-columns: 1fr;
      }
      .workspace,
      .field-grid,
      .field-grid.four,
      .metrics,
      .composer-actions {
        grid-template-columns: 1fr;
      }
      .right-rail {
        position: static;
      }
      .topbar {
        border-radius: 24px;
      }
      h1 {
        font-size: clamp(38px, 13vw, 62px);
      }
    }
    @media (max-width: 520px) {
      .shell {
        padding-inline: 12px;
      }
      .topbar {
        display: grid;
        grid-template-columns: 1fr;
      }
      .brand {
        width: 100%;
      }
      .brand-copy strong,
      .brand-copy span {
        white-space: normal;
      }
      #creation-brief {
        padding: 16px;
        border-radius: 24px;
      }
      textarea {
        min-height: 180px;
      }
      .topbar-actions {
        width: 100%;
        justify-content: stretch;
      }
      .pill {
        flex: 1;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">R</div>
        <div class="brand-copy">
          <strong>RemotionVidCreator</strong>
          <span>Simple AI video workspace</span>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="pill"><span class="pill-dot"></span><span id="statusPill">Ready</span></div>
        <div class="pill">Usage <strong id="budgetInline">--</strong></div>
      </div>
    </header>

    <section class="hero">
      <div class="eyebrow">Create</div>
      <h1>Make a video from one idea.</h1>
      <p class="lede">
        Write a topic. The app handles the script, visuals, audio, and render.
      </p>
      <div class="hero-actions">
        <a class="button hero-link" href="#creation-brief">Start</a>
        <div class="hero-note">No extra tabs.</div>
      </div>
    </section>

    <section class="workspace">
      <div class="stack">
        <div class="card" id="creation-brief">
          <div class="composer">
            <div class="composer-head">
              <div class="section-title">
                <strong>Brief</strong>
                <span>One idea in, one video out</span>
              </div>
              <p>Keep it short. Add detail only when you need it.</p>
            </div>
            <div class="starter-prompts" aria-label="Starter suggestions">
              <button class="starter-prompt" type="button" data-suggestion="Why solar energy is becoming cheaper than coal">Solar</button>
              <button class="starter-prompt" type="button" data-suggestion="Explain how AI agents can save a small team hours every week">Teams</button>
              <button class="starter-prompt" type="button" data-suggestion="Show why creator-led brands are growing faster than ads">Creators</button>
              <button class="starter-prompt" type="button" data-suggestion="Explain the future of electric cars in plain language">EVs</button>
            </div>
          </div>

          <div class="field-grid">
            <div class="field">
              <label for="goal">Goal</label>
              <input id="goal" type="text" placeholder="Educate, persuade, compare, inspire" />
            </div>
            <div class="field">
              <label for="pacing">Pacing</label>
              <select id="pacing">
                <option value="calm">Calm</option>
                <option value="steady" selected>Steady</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label for="prompt">Topic or idea</label>
            <textarea id="prompt" placeholder="Example: Explain why solar energy is becoming cheaper than coal in plain language.">Explain why solar energy is becoming cheaper than coal in plain language.</textarea>
          </div>
          <div class="field">
            <label for="brief">Notes</label>
            <textarea id="brief" class="brief" placeholder="Optional details."></textarea>
          </div>
          <details class="advanced-panel">
            <summary>Advanced settings <span>Optional</span></summary>
            <div class="advanced-fields">
              <div class="field-grid four">
                <div class="field">
                  <label for="seconds">Duration</label>
                  <input id="seconds" type="number" min="5" max="300" step="5" value="10" />
                </div>
                <div class="field">
                  <label for="tone">Tone</label>
                  <select id="tone">
                    <option value="informative" selected>Informative</option>
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="humorous">Humorous</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="calm">Calm</option>
                    <option value="energetic">Energetic</option>
                    <option value="subtle">Subtle</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <div class="tone-hint" id="toneHint"></div>
                </div>
                <div class="field">
                  <label for="complexity">Complexity</label>
                  <select id="complexity">
                    <option value="simple">Simple</option>
                    <option value="medium" selected>Medium</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div class="field">
                  <label for="stylePreset">Style preset</label>
                  <select id="stylePreset">
                    <option value="cinematic" selected>Cinematic</option>
                    <option value="educational">Educational</option>
                    <option value="bold">Bold</option>
                    <option value="playful">Playful</option>
                    <option value="premium">Premium</option>
                    <option value="documentary">Documentary</option>
                  </select>
                </div>
                <div class="field">
                  <label for="audience">Audience</label>
                  <select id="audience">
                    <option value="general" selected>General</option>
                    <option value="beginners">Beginners</option>
                    <option value="students">Students</option>
                    <option value="creators">Creators</option>
                    <option value="founders">Founders</option>
                    <option value="executives">Executives</option>
                    <option value="professionals">Professionals</option>
                  </select>
                  <div class="field-hint" id="audienceHint"></div>
                </div>
                <div class="field">
                  <label for="platform">Platform</label>
                  <select id="platform">
                    <option value="vertical" selected>Vertical</option>
                    <option value="tiktok">TikTok</option>
                    <option value="reels">Reels</option>
                    <option value="shorts">Shorts</option>
                  </select>
                  <div class="field-hint" id="platformHint"></div>
                </div>
                <div class="field">
                  <label for="intensity">Intensity</label>
                  <select id="intensity">
                    <option value="safe">Safe</option>
                    <option value="balanced" selected>Balanced</option>
                    <option value="wild">Wild</option>
                  </select>
                </div>
                <div class="field">
                  <label for="motionLevel">Motion</label>
                  <select id="motionLevel">
                    <option value="minimal">Minimal</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div class="field">
                  <label for="visualDensity">Visual density</label>
                  <select id="visualDensity">
                    <option value="minimal">Minimal</option>
                    <option value="balanced" selected>Balanced</option>
                    <option value="rich">Rich</option>
                  </select>
                </div>
                <div class="field">
                  <label for="narrativeTemplate">Narrative</label>
                  <select id="narrativeTemplate">
                    <option value="problem-solution" selected>Problem / solution</option>
                    <option value="myth-busting">Myth busting</option>
                    <option value="timeline">Timeline</option>
                    <option value="comparison">Comparison</option>
                    <option value="transformation">Transformation</option>
                  </select>
                </div>
                <div class="field">
                  <label for="audioMood">Audio mood</label>
                  <select id="audioMood">
                    <option value="">Auto</option>
                    <option value="Cinematic pulse">Cinematic</option>
                    <option value="Clean bed">Clean</option>
                    <option value="Percussive pulse">Percussive</option>
                    <option value="Bright rhythm">Bright</option>
                    <option value="Polished bed">Premium</option>
                    <option value="Textured score">Textured</option>
                  </select>
                </div>
                <div class="field">
                  <label for="focus">Focus</label>
                  <select id="focus">
                    <option value="full" selected>Full video</option>
                    <option value="hook">Hook</option>
                    <option value="middle">Middle</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>
          </details>
          <div class="composer-actions">
            <button id="generate" class="button">Generate</button>
            <button id="reset" class="button secondary" type="button">Reset</button>
          </div>
          <div class="foot">
            <div>Uses <code>.env</code>.</div>
            <div>Saves to <code>output/ai-mode</code>.</div>
          </div>
        </div>
      </div>

      <aside class="right-rail">
        <section class="card panel preview-card">
          <div class="section-title">
            <strong>Preview</strong>
            <span>Latest render</span>
          </div>
          <div id="previewPane" class="preview-pane" aria-live="polite"></div>
        </section>

        <section class="card panel attribution-card">
          <div class="section-title">
            <strong>Unsplash attribution</strong>
            <span>Required</span>
          </div>
          <div id="attributionPane" class="attribution-list" aria-live="polite"></div>
        </section>

        <section class="card panel-stack">
          <div class="panel">
            <div class="section-title">
              <strong>Status</strong>
              <span>Backend</span>
            </div>
            <div class="status-banner">
              <div class="label">State</div>
              <div class="value" id="status">Idle</div>
              <div class="subvalue" id="statusMeta">Ready.</div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>Usage</strong>
              <span>Unsplash</span>
            </div>
            <div class="metrics">
              <div class="metric">
                <div class="label">Remaining</div>
                <div class="value" id="budget">Loading...</div>
                <div class="subvalue" id="budgetMeta">Checking usage.</div>
              </div>
              <div class="metric">
                <div class="label">Progress</div>
                <div class="value" id="percent">0%</div>
                <div class="subvalue">Script to render.</div>
              </div>
            </div>
            <div style="margin-top: 12px;" class="progress" aria-label="Generation progress">
              <div id="bar" class="bar"></div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>History</strong>
              <span>Reuse</span>
            </div>
            <div class="timeline" id="history">Loading history...</div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>Log</strong>
              <span>Trace</span>
            </div>
            <details class="diagnostics-panel">
              <summary>Show diagnostics <span>Technical</span></summary>
              <div class="advanced-fields">
                <div class="log" id="log">Waiting.</div>
              </div>
            </details>
          </div>
        </section>
      </aside>
    </section>
  </main>
  <script>
    const DEFAULTS = {
      prompt: "Explain why solar energy is becoming cheaper than coal in plain language.",
      goal: "Educate viewers clearly",
      pacing: "steady",
      brief: "",
      seconds: "10",
      tone: "informative",
      complexity: "medium",
      stylePreset: "cinematic",
      audience: "general",
      platform: "vertical",
      intensity: "balanced",
      motionLevel: "medium",
      visualDensity: "balanced",
      narrativeTemplate: "problem-solution",
      audioMood: "",
      focus: "full",
    };

    const promptEl = document.getElementById("prompt");
    const goalEl = document.getElementById("goal");
    const pacingEl = document.getElementById("pacing");
    const briefEl = document.getElementById("brief");
    const secondsEl = document.getElementById("seconds");
    const toneEl = document.getElementById("tone");
    const toneHintEl = document.getElementById("toneHint");
    const complexityEl = document.getElementById("complexity");
    const stylePresetEl = document.getElementById("stylePreset");
    const audienceEl = document.getElementById("audience");
    const audienceHintEl = document.getElementById("audienceHint");
    const platformEl = document.getElementById("platform");
    const platformHintEl = document.getElementById("platformHint");
    const intensityEl = document.getElementById("intensity");
    const motionLevelEl = document.getElementById("motionLevel");
    const visualDensityEl = document.getElementById("visualDensity");
    const narrativeTemplateEl = document.getElementById("narrativeTemplate");
    const audioMoodEl = document.getElementById("audioMood");
    const focusEl = document.getElementById("focus");
    const button = document.getElementById("generate");
    const statusEl = document.getElementById("status");
    const statusMetaEl = document.getElementById("statusMeta");
    const budgetEl = document.getElementById("budget");
    const budgetMetaEl = document.getElementById("budgetMeta");
    const budgetInlineEl = document.getElementById("budgetInline");
    const statusPillEl = document.getElementById("statusPill");
    const barEl = document.getElementById("bar");
    const percentEl = document.getElementById("percent");
    const logEl = document.getElementById("log");
    const historyEl = document.getElementById("history");
    const previewEl = document.getElementById("previewPane");
    const attributionEl = document.getElementById("attributionPane");
    const presetChips = document.getElementById("presetChips");
    const presetGuideEl = document.getElementById("presetGuide");
    const starterPrompts = document.querySelector(".starter-prompts");
    const resetButton = document.getElementById("reset");
    let pollTimer = null;
    let activeJobId = null;
    let usageTimer = null;
    let historyTimer = null;

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function safeUnsplashUrl(value) {
      try {
        const url = new URL(String(value));
        if (url.hostname !== "unsplash.com" && !url.hostname.endsWith(".unsplash.com")) {
          return "";
        }
        url.searchParams.set("utm_medium", "referral");
        if (!url.searchParams.get("utm_source")) {
          url.searchParams.set("utm_source", "remotion-ai-video-generator");
        }
        return url.toString();
      } catch {
        return "";
      }
    }

    function buildUnsplashHomeUrl(profileUrl) {
      const home = new URL("https://unsplash.com/");
      try {
        const profile = new URL(String(profileUrl));
        home.searchParams.set(
          "utm_source",
          profile.searchParams.get("utm_source") || "remotion-ai-video-generator"
        );
      } catch {
        home.searchParams.set("utm_source", "remotion-ai-video-generator");
      }
      home.searchParams.set("utm_medium", "referral");
      return home.toString();
    }

    function normalizeCredits(images) {
      const seen = new Set();
      return (Array.isArray(images) ? images : [])
        .map((image) => ({
          author: image?.author,
          authorUrl: safeUnsplashUrl(image?.authorUrl),
          photoId: image?.photoId,
          sourceQuery: image?.sourceQuery,
        }))
        .filter((credit) => credit.author && credit.authorUrl)
        .filter((credit) => {
          const key = credit.photoId || credit.authorUrl;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    function renderAttributions(images) {
      if (!attributionEl) return;
      const credits = normalizeCredits(images);
      if (!credits.length) {
        attributionEl.innerHTML = [
          '<div class="credit-row">',
          '<div>No Unsplash photos have been selected yet.</div>',
          '<div class="credit-meta">Generate a video to show clickable photographer credits here.</div>',
          '</div>',
        ].join("");
        return;
      }

      attributionEl.innerHTML = credits.slice(0, 8).map((credit) => {
        const profileUrl = credit.authorUrl;
        const homeUrl = buildUnsplashHomeUrl(profileUrl);
        return [
          '<div class="credit-row">',
          '<div>Photo by <a href="',
          escapeHtml(profileUrl),
          '" target="_blank" rel="noopener noreferrer">',
          escapeHtml(credit.author),
          '</a> on <a href="',
          escapeHtml(homeUrl),
          '" target="_blank" rel="noopener noreferrer">Unsplash</a></div>',
          '<div class="credit-meta">',
          escapeHtml(profileUrl),
          credit.sourceQuery ? ' · query: ' + escapeHtml(credit.sourceQuery) : '',
          '</div>',
          '</div>',
        ].join("");
      }).join("");
    }

    const TONE_GUIDES = {
      informative: {
        title: "Informative",
        summary: "Clear and direct.",
        range: "Steady",
        script: "Plain phrasing.",
        visual: "Clean emphasis.",
      },
      casual: {
        title: "Casual",
        summary: "Friendly and relaxed.",
        range: "Loose",
        script: "Conversational lines.",
        visual: "Soft motion.",
      },
      professional: {
        title: "Professional",
        summary: "Polished and credible.",
        range: "Controlled",
        script: "Short, precise lines.",
        visual: "Crisp hierarchy.",
      },
      dramatic: {
        title: "Dramatic",
        summary: "High contrast, high stakes.",
        range: "Strong",
        script: "Sharper reveals.",
        visual: "Bold transitions.",
      },
      humorous: {
        title: "Humorous",
        summary: "Light and playful.",
        range: "Punchy",
        script: "Short lines, good timing.",
        visual: "Quick cuts.",
      },
      storytelling: {
        title: "Storytelling",
        summary: "Scene by scene.",
        range: "Immersive",
        script: "Clear progression.",
        visual: "Smooth continuity.",
      },
      calm: {
        title: "Calm",
        summary: "Slow and easy.",
        range: "Quiet",
        script: "Gentle pacing.",
        visual: "Minimal motion.",
      },
      energetic: {
        title: "Energetic",
        summary: "Fast and punchy.",
        range: "Bright",
        script: "Short, active lines.",
        visual: "Brighter contrast.",
      },
      subtle: {
        title: "Subtle",
        summary: "Understated and refined.",
        range: "Soft",
        script: "Lower-volume language.",
        visual: "Quiet motion.",
      },
      urgent: {
        title: "Urgent",
        summary: "Fast and time-sensitive.",
        range: "Direct",
        script: "Immediate hooks.",
        visual: "Quick cuts.",
      },
    };

    const AUDIENCE_GUIDES = {
      general: {
        title: "General audience",
        summary: "Broad and approachable.",
        depth: "Clear basics.",
        examples: "Everyday examples.",
      },
      beginners: {
        title: "Beginners",
        summary: "Start simple.",
        depth: "Gentle onboarding.",
        examples: "Simple analogies.",
      },
      students: {
        title: "Students",
        summary: "Learning first.",
        depth: "Explain the why.",
        examples: "Definitions and recaps.",
      },
      creators: {
        title: "Creators",
        summary: "Practical and visual.",
        depth: "Short, useful phrasing.",
        examples: "Hooks and retention.",
      },
      founders: {
        title: "Founders",
        summary: "Business framing.",
        depth: "Strategy first.",
        examples: "Tradeoffs and growth.",
      },
      executives: {
        title: "Executives",
        summary: "High signal.",
        depth: "Tight structure.",
        examples: "Risk and impact.",
      },
      professionals: {
        title: "Professionals",
        summary: "Clear and precise.",
        depth: "Practical detail.",
        examples: "Workflows and tools.",
      },
    };

    const PLATFORM_GUIDES = {
      vertical: {
        title: "Vertical video",
        summary: "Mobile-first default.",
        hook: "Strong opening.",
        length: "Flexible format.",
      },
      tiktok: {
        title: "TikTok",
        summary: "Fast hooks.",
        hook: "Start hot.",
        length: "Keep it tight.",
      },
      reels: {
        title: "Reels",
        summary: "Clean and smooth.",
        hook: "Keep it crisp.",
        length: "Easy to save.",
      },
      shorts: {
        title: "Shorts",
        summary: "Direct and brisk.",
        hook: "Go straight in.",
        length: "Fast payoff.",
      },
    };

    const PRESET_GUIDES = {
      cinematic: {
        title: "Cinematic",
        summary: "Dramatic, but clean.",
        typography: "Editorial type",
        motion: "Sweeping pushes",
        palette: "Dark tones",
        pacing: "Steady",
        audio: "Ambient pulse",
      },
      educational: {
        title: "Educational",
        summary: "Clear and legible.",
        typography: "Simple framing",
        motion: "Gentle cuts",
        palette: "Clean blues",
        pacing: "Calm",
        audio: "Clean bed",
      },
      bold: {
        title: "Bold",
        summary: "Strong contrast.",
        typography: "Condensed type",
        motion: "Snappy cuts",
        palette: "Dark base",
        pacing: "Fast",
        audio: "Percussive pulse",
      },
      playful: {
        title: "Playful",
        summary: "Light and lively.",
        typography: "Rounded type",
        motion: "Bouncy transitions",
        palette: "Bright accents",
        pacing: "Fast",
        audio: "Bright rhythm",
      },
      premium: {
        title: "Premium",
        summary: "Elegant and restrained.",
        typography: "Editorial type",
        motion: "Controlled motion",
        palette: "Black and gold",
        pacing: "Calm",
        audio: "Polished bed",
      },
      documentary: {
        title: "Documentary",
        summary: "Grounded and credible.",
        typography: "Journal type",
        motion: "Stable framing",
        palette: "Muted neutrals",
        pacing: "Steady",
        audio: "Textured score",
      },
    };

    function syncPresetChips() {
      presetChips?.querySelectorAll(".chip").forEach((chip) => {
        const preset = chip.getAttribute("data-preset");
        chip.classList.toggle("active", preset === stylePresetEl.value);
      });
      renderPresetGuide();
    }

    function renderPresetGuide() {
      if (!presetGuideEl) return;
      const guide = PRESET_GUIDES[stylePresetEl.value] || PRESET_GUIDES.cinematic;
      presetGuideEl.innerHTML = [
        '<strong>',
        guide.title,
        '</strong>',
        '<p>',
        guide.summary,
        '</p>',
        '<div class="preset-guide-meta">',
        '<span class="preset-guide-chip">Typography: ',
        guide.typography,
        '</span>',
        '<span class="preset-guide-chip">Motion: ',
        guide.motion,
        '</span>',
        '<span class="preset-guide-chip">Pacing: ',
        guide.pacing,
        '</span>',
        '<span class="preset-guide-chip">Audio: ',
        guide.audio,
        '</span>',
        '</div>',
        '<div class="preset-guide-chip">Palette: ',
        guide.palette,
        '</div>',
      ].join("");
    }

    function renderToneHint() {
      if (!toneHintEl) return;
      const guide = TONE_GUIDES[toneEl.value] || TONE_GUIDES.informative;
      toneHintEl.innerHTML = [
        '<strong style="display:block;color:var(--text);margin-bottom:6px;">',
        guide.title,
        '</strong>',
        '<div style="display:grid;gap:6px;">',
        '<div>',
        guide.summary,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Range:</span> ',
        guide.range,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Script:</span> ',
        guide.script,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Visual:</span> ',
        guide.visual,
        '</div>',
        '</div>',
      ].join("");
    }

    function renderAudienceHint() {
      if (!audienceHintEl) return;
      const guide = AUDIENCE_GUIDES[audienceEl.value] || AUDIENCE_GUIDES.general;
      audienceHintEl.innerHTML = [
        '<strong style="display:block;color:var(--text);margin-bottom:6px;">',
        guide.title,
        '</strong>',
        '<div style="display:grid;gap:6px;">',
        '<div>',
        guide.summary,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Depth:</span> ',
        guide.depth,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Examples:</span> ',
        guide.examples,
        '</div>',
        '</div>',
      ].join("");
    }

    function renderPlatformHint() {
      if (!platformHintEl) return;
      const guide = PLATFORM_GUIDES[platformEl.value] || PLATFORM_GUIDES.vertical;
      platformHintEl.innerHTML = [
        '<strong style="display:block;color:var(--text);margin-bottom:6px;">',
        guide.title,
        '</strong>',
        '<div style="display:grid;gap:6px;">',
        '<div>',
        guide.summary,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Hook:</span> ',
        guide.hook,
        '</div>',
        '<div><span style="color:var(--muted-strong);">Length:</span> ',
        guide.length,
        '</div>',
        '</div>',
      ].join("");
    }

    function renderPreview(item) {
      if (!previewEl) return;
      if (!item) {
        previewEl.innerHTML = [
          '<div class="preview-frame">',
          '<div class="preview-kicker">Start</div>',
          '<h3 class="preview-title">Your render shows here.</h3>',
          '<p class="preview-copy">Use a starter prompt or write your own idea.</p>',
          '<div class="preview-meta">',
          '<span class="preview-chip">AI mode</span>',
          '<span class="preview-chip">Simple</span>',
          '<span class="preview-chip">Unsplash credits</span>',
          '</div>',
          '</div>',
        ].join("");
        return;
      }

      const tags = [
        item.stylePreset,
        item.audience,
        item.platform,
        item.pacing,
      ].filter(Boolean);

      previewEl.innerHTML = [
        '<div class="preview-frame">',
        '<div class="preview-kicker">Latest</div>',
        '<h3 class="preview-title">',
        item.prompt,
        '</h3>',
        '<p class="preview-copy">',
        item.qualityScore ? 'Score ' + item.qualityScore + '/100. ' : '',
        item.goal ? item.goal + '. ' : '',
        'Updated ',
        new Date(item.updatedAt).toLocaleDateString(),
        ' • ',
        item.stylePreset || 'custom',
        '.',
        '</p>',
        '<div class="preview-meta">',
        tags.map((tag) => '<span class="preview-chip">' + tag + '</span>').join(''),
        item.outputPath ? '<span class="preview-chip">Exported</span>' : '<span class="preview-chip">Queued</span>',
        '</div>',
        '</div>',
      ].join("");
    }

    function applyDefaults() {
      promptEl.value = DEFAULTS.prompt;
      goalEl.value = DEFAULTS.goal;
      pacingEl.value = DEFAULTS.pacing;
      briefEl.value = DEFAULTS.brief;
      secondsEl.value = DEFAULTS.seconds;
      toneEl.value = DEFAULTS.tone;
      complexityEl.value = DEFAULTS.complexity;
      stylePresetEl.value = DEFAULTS.stylePreset;
      audienceEl.value = DEFAULTS.audience;
      platformEl.value = DEFAULTS.platform;
      intensityEl.value = DEFAULTS.intensity;
      motionLevelEl.value = DEFAULTS.motionLevel;
      visualDensityEl.value = DEFAULTS.visualDensity;
      narrativeTemplateEl.value = DEFAULTS.narrativeTemplate;
      audioMoodEl.value = DEFAULTS.audioMood;
      focusEl.value = DEFAULTS.focus;
      syncPresetChips();
      renderToneHint();
      renderAudienceHint();
      renderPlatformHint();
    }

    function setUi(job) {
      const statusText = job.state === "complete"
        ? "Done"
        : job.state === "error"
          ? "Error"
          : job.message;
      statusEl.textContent = statusText;
      statusPillEl.textContent = statusText;
      statusMetaEl.textContent = job.stage === "render"
        ? "Rendering."
        : job.stage === "bundle"
          ? "Bundling."
          : job.stage === "visuals"
            ? "Finding visuals."
            : job.stage === "audio"
              ? "Building audio."
              : job.stage === "script"
                ? "Writing the script."
                : "Ready.";
      barEl.style.width = Math.max(0, Math.min(100, job.progress || 0)) + "%";
      percentEl.textContent = Math.max(0, Math.min(100, job.progress || 0)) + "%";
      logEl.textContent = [
        "Prompt: " + job.prompt,
        job.goal ? "Goal: " + job.goal : null,
        "Pacing: " + job.pacing,
        job.brief ? "Brief: " + job.brief : null,
        "Duration: " + job.seconds + "s",
        "Tone: " + job.tone,
        "Complexity: " + job.complexity,
        "Style: " + job.stylePreset,
        "Audience: " + job.audience,
        "Platform: " + job.platform,
        "Intensity: " + job.intensity,
        "Motion: " + job.motionLevel,
        "Density: " + job.visualDensity,
        "Narrative: " + job.narrativeTemplate,
        "Audio mood: " + (job.audioMood || "auto"),
        "Focus: " + job.focus,
        "State: " + job.state,
        "Stage: " + job.stage,
        job.qualityScore ? "Quality score: " + job.qualityScore + "/100" : null,
        "Message: " + job.message,
        job.outputPath ? "Output: " + job.outputPath : null,
        job.error ? "Error: " + job.error : null,
      ].filter(Boolean).join("\\n");
      renderAttributions(job.images || job.imageCredits || []);
      button.disabled = job.state !== "complete" && job.state !== "error" && job.state !== "idle";
    }

    async function refreshBudget() {
      try {
        const response = await fetch("/usage");
        if (!response.ok) {
          throw new Error("Failed to fetch usage");
        }
        const usage = await response.json();
        budgetEl.textContent = usage.remaining + " / " + usage.limit;
        budgetInlineEl.textContent = usage.remaining + " left";
        budgetMetaEl.textContent = "Used " + usage.used + " this hour. Resets at " + new Date(usage.resetAt).toLocaleTimeString() + ".";
      } catch (error) {
        budgetEl.textContent = "Starting";
        budgetInlineEl.textContent = "Checking";
        budgetMetaEl.textContent = "Backend is starting. Usage will refresh automatically.";
      }
    }

    async function fetchStatus(jobId) {
      const response = await fetch("/status?id=" + encodeURIComponent(jobId));
      if (!response.ok) {
        throw new Error("Failed to load job status");
      }
      return await response.json();
    }

    function renderHistory(items) {
      if (!historyEl) return;
      if (!items || !items.length) {
        historyEl.innerHTML = "<div class='panel-copy'>No generations yet.</div>";
        renderPreview(null);
        return;
      }
      historyEl.innerHTML = items.map((item) => {
        const tags = [
          item.stylePreset,
          item.audience,
          item.platform,
          item.narrativeTemplate,
        ].filter(Boolean);
        return [
          '<div class="timeline-item">',
          '<div class="timeline-top"><span>',
          new Date(item.updatedAt).toLocaleString(),
          '</span><span>',
          item.qualityScore ? item.qualityScore + '/100' : 'n/a',
          '</span></div>',
          '<div class="timeline-title">',
          item.prompt,
          '</div>',
          '<div class="timeline-meta">',
          tags.map((tag) => '<span>' + tag + '</span>').join(''),
          '</div>',
          '<div class="timeline-actions">',
          '<button class="timeline-btn" data-history-id="',
          item.id,
          '" data-history-focus="full">Reuse</button>',
          '<button class="timeline-btn" data-history-id="',
          item.id,
          '" data-history-focus="hook">Remix hook</button>',
          '<button class="timeline-btn" data-history-id="',
          item.id,
          '" data-history-focus="outro">Remix outro</button>',
          '</div>',
          '</div>',
        ].join('');
      }).join("");
    }

    async function refreshHistory() {
      try {
        const response = await fetch("/history");
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const items = await response.json();
        renderHistory(items);
        renderPreview(items[0] || null);
        if (!activeJobId) {
          renderAttributions(items[0]?.imageCredits || items[0]?.images || []);
        }
      } catch (error) {
        if (historyEl) {
          historyEl.innerHTML = "<div class='panel-copy'>History will appear after the backend is ready.</div>";
        }
        renderPreview(null);
        if (!activeJobId) {
          renderAttributions([]);
        }
      }
    }

    async function poll(jobId) {
      clearInterval(pollTimer);
      const tick = async () => {
        try {
          const job = await fetchStatus(jobId);
          setUi(job);
          if (job.state === "complete" || job.state === "error") {
            clearInterval(pollTimer);
            pollTimer = null;
            activeJobId = null;
          }
        } catch (error) {
          logEl.textContent = String(error);
        }
      };
      tick();
      pollTimer = setInterval(tick, 1000);
    }

    button.addEventListener("click", async () => {
      const prompt = promptEl.value.trim();
      const goal = goalEl.value.trim();
      const pacing = pacingEl.value;
      const brief = briefEl.value.trim();
      const seconds = Number(secondsEl.value || 5);
      const tone = toneEl.value;
      const complexity = complexityEl.value;
      const stylePreset = stylePresetEl.value;
      const audience = audienceEl.value;
      const platform = platformEl.value;
      const intensity = intensityEl.value;
      const motionLevel = motionLevelEl.value;
      const visualDensity = visualDensityEl.value;
      const narrativeTemplate = narrativeTemplateEl.value;
      const audioMood = audioMoodEl.value;
      const focus = focusEl.value;
      if (!prompt) {
        alert("Enter a topic or sentence first.");
        return;
      }

      button.disabled = true;
      statusEl.textContent = "Starting...";
      barEl.style.width = "2%";
      logEl.textContent = "Creating the job...";
      renderAttributions([]);

      const response = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          goal,
          pacing,
          brief,
          seconds,
          tone,
          complexity,
          stylePreset,
          audience,
          platform,
          intensity,
          motionLevel,
          visualDensity,
          narrativeTemplate,
          audioMood,
          focus,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        logEl.textContent = text;
        button.disabled = false;
        return;
      }

      const payload = await response.json();
      activeJobId = payload.jobId;
      poll(activeJobId);
    });

    presetChips?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const preset = target.getAttribute("data-preset");
      if (!preset) return;
      stylePresetEl.value = preset;
      syncPresetChips();
      target.blur();
    });

    starterPrompts?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const suggestion = target.getAttribute("data-suggestion");
      if (!suggestion) return;
      promptEl.value = suggestion;
      promptEl.focus();
      promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    stylePresetEl.addEventListener("change", syncPresetChips);
    toneEl.addEventListener("change", renderToneHint);
    audienceEl.addEventListener("change", renderAudienceHint);
    platformEl.addEventListener("change", renderPlatformHint);
    toneEl.addEventListener("change", renderToneHint);

    historyEl?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const itemId = target.getAttribute("data-history-id");
      if (!itemId) return;
      const response = await fetch("/history");
      const items = await response.json();
      const item = items.find((entry) => entry.id === itemId);
      if (!item) return;
      promptEl.value = item.prompt || promptEl.value;
      goalEl.value = item.goal || goalEl.value;
      pacingEl.value = item.pacing || pacingEl.value;
      briefEl.value = item.brief || briefEl.value;
      secondsEl.value = String(item.seconds || secondsEl.value);
      toneEl.value = item.tone || toneEl.value;
      complexityEl.value = item.complexity || complexityEl.value;
      stylePresetEl.value = item.stylePreset || stylePresetEl.value;
      audienceEl.value = item.audience || audienceEl.value;
      platformEl.value = item.platform || platformEl.value;
      intensityEl.value = item.intensity || intensityEl.value;
      motionLevelEl.value = item.motionLevel || motionLevelEl.value;
      visualDensityEl.value = item.visualDensity || visualDensityEl.value;
      narrativeTemplateEl.value = item.narrativeTemplate || narrativeTemplateEl.value;
      audioMoodEl.value = item.audioMood || audioMoodEl.value;
      focusEl.value = target.getAttribute("data-history-focus") || item.focus || focusEl.value;
      syncPresetChips();
      renderToneHint();
      renderAudienceHint();
      renderPlatformHint();
      promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    resetButton?.addEventListener("click", () => {
      applyDefaults();
      promptEl.focus();
      promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    applyDefaults();
    renderPreview(null);
    renderAttributions([]);
    refreshBudget();
    refreshHistory();
    usageTimer = setInterval(refreshBudget, 60000);
    historyTimer = setInterval(refreshHistory, 30000);
  </script>
</body>
</html>`;
}

async function readJsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderHtml());
      return;
    }

    if (req.method === "POST" && url.pathname === "/generate") {
      await proxyToBackend(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/status") {
      await proxyToBackend(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/usage") {
      await proxyToBackend(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/history") {
      await proxyToBackend(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, () => {
  startBackend();
  const url = `http://localhost:${port}`;
  console.log(`AI mode running at ${url}`);
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} ${url}`, () => {});
});
