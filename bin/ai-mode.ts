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
  <title>AI Video Mode</title>
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
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">A</div>
        <div class="brand-copy">
          <strong>AI Video Mode</strong>
          <span>Backend-driven AI video workspace with live job tracking</span>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="pill"><span class="pill-dot"></span><span id="statusPill">Ready</span></div>
        <div class="pill">Unsplash usage: <strong id="budgetInline">--</strong></div>
      </div>
    </header>

    <section class="hero">
      <div class="eyebrow">AI mode</div>
      <h1>Build a cinematic video from one clear idea.</h1>
      <p class="lede">
        Start with a topic or a full brief below. The app turns it into a script, scene plan, licensed visuals, an audio bed, and the final render.
      </p>
      <div class="hero-actions">
        <a class="button hero-link" href="#creation-brief">Start with the brief</a>
        <div class="hero-note">No editor steps, no extra tabs, no dead-end navigation.</div>
      </div>
    </section>

    <section class="workspace">
      <div class="stack">
        <div class="card" id="creation-brief">
          <div class="composer">
            <div class="composer-head">
              <div class="section-title">
                <strong>Creation brief</strong>
                <span>One idea in, one finished video out</span>
              </div>
              <p>Write the topic in plain language. Add details only if you want tighter audience, tone, or platform control.</p>
            </div>
            <div class="starter-prompts" aria-label="Starter suggestions">
              <button class="starter-prompt" type="button" data-suggestion="Why solar energy is becoming cheaper than coal">Solar energy costs</button>
              <button class="starter-prompt" type="button" data-suggestion="Explain how AI agents can save a small team hours every week">AI agents for teams</button>
              <button class="starter-prompt" type="button" data-suggestion="Show why creator-led brands are growing faster than ads">Creator economy</button>
              <button class="starter-prompt" type="button" data-suggestion="Explain the future of electric cars in plain language">Future of EVs</button>
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
            <label for="brief">Creative brief</label>
            <textarea id="brief" class="brief" placeholder="Optional: add audience, angle, brand voice, or specific points to include."></textarea>
          </div>
          <div class="field-grid four">
            <div class="field">
              <label for="seconds">Duration</label>
              <input id="seconds" type="number" min="5" max="300" step="5" value="45" />
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
            </div>
            <div class="field">
              <label for="platform">Platform</label>
              <select id="platform">
                <option value="vertical" selected>Vertical</option>
                <option value="tiktok">TikTok</option>
                <option value="reels">Reels</option>
                <option value="shorts">Shorts</option>
              </select>
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
                <option value="Cinematic ambient pulse with rising energy and low-end movement">Cinematic</option>
                <option value="Clean ambient bed with steady pulse and minimal distraction">Clean</option>
                <option value="Percussive pulse with sharp accents and forward momentum">Percussive</option>
                <option value="Bright rhythmic bed with light percussion and bounce">Bright</option>
                <option value="Polished atmospheric bed with restrained tension">Premium</option>
                <option value="Textured ambient score with subtle tension and space">Textured</option>
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
          <div class="composer-actions">
            <button id="generate" class="button">Generate video</button>
            <button id="reset" class="button secondary" type="button">Reset to defaults</button>
          </div>
          <div class="foot">
            <div>Uses <code>.env</code> automatically.</div>
            <div>Output saves to <code>output/ai-mode</code>.</div>
          </div>
        </div>
        </div>
      </div>

      <aside class="right-rail">
        <section class="card panel preview-card">
          <div class="section-title">
            <strong>Output preview</strong>
            <span>Latest render at a glance</span>
          </div>
          <div id="previewPane" class="preview-pane" aria-live="polite"></div>
        </section>

        <section class="card panel">
          <div class="section-title">
            <strong>Quick presets</strong>
            <span>Tap to steer the mood</span>
          </div>
          <div class="chips" id="presetChips">
            <button class="chip" data-preset="cinematic">Cinematic</button>
            <button class="chip" data-preset="educational">Educational</button>
            <button class="chip" data-preset="bold">Bold</button>
            <button class="chip" data-preset="playful">Playful</button>
            <button class="chip" data-preset="premium">Premium</button>
            <button class="chip" data-preset="documentary">Documentary</button>
          </div>
          <div class="preset-guide" id="presetGuide"></div>
        </section>

        <section class="card panel stage-card">
          <div class="stage-header">
            <div class="panel-title">Creation assistant</div>
            <span class="pill">Live composition</span>
          </div>
          <p class="stage-copy">The first screen stays focused on the brief, the current job, and the next useful action.</p>
          <div class="preset-grid">
            <div class="preset-card">
              <div class="preset-name">Hook</div>
              <div class="preset-copy">Sharper opening language and immediate visual intent.</div>
            </div>
            <div class="preset-card">
              <div class="preset-name">Scenes</div>
              <div class="preset-copy">Sections become a structured plan with pacing and mood.</div>
            </div>
            <div class="preset-card">
              <div class="preset-name">Fallback</div>
              <div class="preset-copy">Missing visuals are handled as part of the design, not a bug.</div>
            </div>
            <div class="preset-card">
              <div class="preset-name">Audio</div>
              <div class="preset-copy">The score adapts to tone, tempo, and energy.</div>
            </div>
          </div>
        </section>

        <section class="card panel-stack">
          <div class="panel">
            <div class="section-title">
              <strong>Current status</strong>
              <span>Backend job state</span>
            </div>
            <div class="status-banner">
              <div class="label">State</div>
              <div class="value" id="status">Idle</div>
              <div class="subvalue" id="statusMeta">Ready when you are.</div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>Usage</strong>
              <span>Unsplash requests</span>
            </div>
            <div class="metrics">
              <div class="metric">
                <div class="label">Remaining</div>
                <div class="value" id="budget">Loading...</div>
                <div class="subvalue" id="budgetMeta">Checking local request cache.</div>
              </div>
              <div class="metric">
                <div class="label">Progress</div>
                <div class="value" id="percent">0%</div>
                <div class="subvalue">From script to render.</div>
              </div>
            </div>
            <div style="margin-top: 12px;" class="progress" aria-label="Generation progress">
              <div id="bar" class="bar"></div>
            </div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>Recent generations</strong>
              <span>Reuse and remix</span>
            </div>
            <div class="timeline" id="history">Loading history...</div>
          </div>
          <div class="panel">
            <div class="section-title">
              <strong>Job log</strong>
              <span>Readable trace</span>
            </div>
            <div class="log" id="log">Waiting for a prompt.</div>
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
      seconds: "45",
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
    const platformEl = document.getElementById("platform");
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
    const presetChips = document.getElementById("presetChips");
    const presetGuideEl = document.getElementById("presetGuide");
    const starterPrompts = document.querySelector(".starter-prompts");
    const resetButton = document.getElementById("reset");
    let pollTimer = null;
    let activeJobId = null;
    let usageTimer = null;
    let historyTimer = null;

    const TONE_GUIDES = {
      informative: {
        title: "Informative",
        summary: "Clear, direct, and structured for explanation-first videos.",
        range: "steady-to-clear",
        script: "Simple phrasing, fast clarity, and practical examples.",
        visual: "Measured motion with clean emphasis.",
      },
      casual: {
        title: "Casual",
        summary: "Friendly and relaxed, like a good voice note with structure.",
        range: "relaxed-to-steady",
        script: "Conversational language and approachable transitions.",
        visual: "Soft motion and warm pacing.",
      },
      professional: {
        title: "Professional",
        summary: "Polished and credible for founder, business, and expert topics.",
        range: "steady-to-controlled",
        script: "Concise sentences, sharper framing, and fewer flourishes.",
        visual: "Controlled motion with crisp visual hierarchy.",
      },
      dramatic: {
        title: "Dramatic",
        summary: "High contrast and heavier emphasis for big stakes.",
        range: "subtle-to-dramatic",
        script: "Stronger breaks, sharper reveals, and higher tension.",
        visual: "Bold transitions and punchy framing.",
      },
      humorous: {
        title: "Humorous",
        summary: "Light, playful, and tuned for wit without losing clarity.",
        range: "playful-to-energetic",
        script: "Shorter lines, timing beats, and a little surprise.",
        visual: "Quick motion and expressive cuts.",
      },
      storytelling: {
        title: "Storytelling",
        summary: "Narrative flow that builds tension and payoff scene by scene.",
        range: "calm-to-immersive",
        script: "Scene-to-scene progression with stronger callbacks.",
        visual: "Gentle movement and cinematic continuity.",
      },
      calm: {
        title: "Calm",
        summary: "Slow, thoughtful, and easy to absorb.",
        range: "quiet-to-calm",
        script: "Longer breaths, soft transitions, and measured language.",
        visual: "Minimal motion and soft contrast.",
      },
      energetic: {
        title: "Energetic",
        summary: "Punchy, forward, and built to keep attention moving.",
        range: "steady-to-energetic",
        script: "Short lines, faster rhythm, and active verbs.",
        visual: "Faster motion and brighter contrast.",
      },
      subtle: {
        title: "Subtle",
        summary: "Understated and refined, with less hype and more nuance.",
        range: "subtle-to-controlled",
        script: "Lower-volume language with smoother pacing.",
        visual: "Quiet motion and restrained emphasis.",
      },
      urgent: {
        title: "Urgent",
        summary: "Fast-moving and time-sensitive without becoming noisy.",
        range: "subtle-to-urgent",
        script: "Immediate hooks, tighter edits, and direct payoff language.",
        visual: "Quick cuts and strong accent beats.",
      },
    };

    const PRESET_GUIDES = {
      cinematic: {
        title: "Cinematic",
        summary: "High-contrast titles, sweeping motion, and a dramatic but controlled pace.",
        typography: "Editorial title case",
        motion: "Sweeping pushes and layered transitions",
        palette: "Midnight tones with bright highlights",
        pacing: "Steady",
        audio: "Cinematic ambient pulse",
      },
      educational: {
        title: "Educational",
        summary: "Clear spacing, legible titles, and a calm structure that explains fast.",
        typography: "Highly legible instructional framing",
        motion: "Gentle cuts and measured emphasis",
        palette: "Clean blues and signal whites",
        pacing: "Calm",
        audio: "Clean ambient bed",
      },
      bold: {
        title: "Bold",
        summary: "Compact headlines, strong contrast, and a faster rhythm for attention.",
        typography: "Condensed headline type",
        motion: "Snappy cuts and strong visual hits",
        palette: "Dark base with bright accent flashes",
        pacing: "Fast",
        audio: "Percussive pulse",
      },
      playful: {
        title: "Playful",
        summary: "Rounded type, lively motion, and a lighter mood that feels expressive.",
        typography: "Friendly rounded type",
        motion: "Bouncy transitions and expressive accents",
        palette: "Bright accent mix with friendly contrast",
        pacing: "Fast",
        audio: "Bright rhythmic bed",
      },
      premium: {
        title: "Premium",
        summary: "Elegant spacing, restrained movement, and an expensive editorial feel.",
        typography: "Elegant editorial typography",
        motion: "Controlled motion with soft reveal timing",
        palette: "Black, gold, and polished neutrals",
        pacing: "Calm",
        audio: "Polished atmospheric bed",
      },
      documentary: {
        title: "Documentary",
        summary: "Measured motion and grounded framing that makes the topic feel credible.",
        typography: "Measured journalistic type",
        motion: "Stable framing and authentic pacing",
        palette: "Steel blues and muted neutrals",
        pacing: "Steady",
        audio: "Textured ambient score",
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

    function renderPreview(item) {
      if (!previewEl) return;
      if (!item) {
        previewEl.innerHTML = [
          '<div class="preview-frame">',
          '<div class="preview-kicker">Fresh start</div>',
          '<h3 class="preview-title">Your first render will appear here.</h3>',
          '<p class="preview-copy">Use a starter prompt or write your own idea. The preview updates once you generate a video.</p>',
          '<div class="preview-meta">',
          '<span class="preview-chip">AI mode</span>',
          '<span class="preview-chip">Goal-driven</span>',
          '<span class="preview-chip">Live render</span>',
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
        '<div class="preview-kicker">Latest output</div>',
        '<h3 class="preview-title">',
        item.prompt,
        '</h3>',
        '<p class="preview-copy">',
        item.qualityScore ? 'Quality score ' + item.qualityScore + '/100. ' : '',
        item.goal ? 'Goal: ' + item.goal + '. ' : '',
        'Created ',
        new Date(item.updatedAt).toLocaleDateString(),
        ' with a ',
        item.stylePreset || 'custom',
        ' finish.',
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
        ? "Rendering now. The bar is live."
        : job.stage === "bundle"
          ? "Bundling assets and composition."
          : job.stage === "visuals"
            ? "Finding licensed visuals."
            : job.stage === "audio"
              ? "Building the audio bed."
              : job.stage === "script"
                ? "Writing the script."
                : "Ready when you are.";
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
        budgetEl.textContent = "Unavailable";
        budgetInlineEl.textContent = "Unavailable";
        budgetMetaEl.textContent = String(error);
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
      } catch (error) {
        if (historyEl) {
          historyEl.innerHTML = "<div class='subvalue'>" + String(error) + "</div>";
        }
        renderPreview(null);
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
      promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    resetButton?.addEventListener("click", () => {
      applyDefaults();
      promptEl.focus();
      promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    applyDefaults();
    renderPreview(null);
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
