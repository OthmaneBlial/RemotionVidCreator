#!/usr/bin/env node

import "../src/utils/load-env.js";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
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

type JobState = {
  id: string;
  prompt: string;
  seconds: number;
  state: "queued" | "writing" | "researching" | "audio" | "bundling" | "rendering" | "complete" | "error";
  stage: "queued" | "script" | "visuals" | "audio" | "bundle" | "render" | "done" | "error";
  progress: number;
  message: string;
  outputPath?: string;
  error?: string;
  updatedAt: number;
};

const jobs = new Map<string, JobState>();
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
      tone: "informative",
      complexity: "medium",
      targetDurationSeconds: job.seconds,
      useAI: true,
      apiKey: process.env.ZAI_API_KEY,
    });

    updateJob(jobId, {
      state: "researching",
      stage: "visuals",
      progress: 25,
      message: "Searching Unsplash for topic visuals...",
    });

    const imageCount = Math.max(4, Math.min(6, script.sections.length + 2));
    const images = await fetchUnsplashImages(job.prompt, script, imageCount, 1080, 1920);

    updateJob(jobId, {
      state: "audio",
      stage: "audio",
      progress: 45,
      message: "Synthesizing the background audio bed...",
    });

    const audio = await generateAmbientAudioTrack(job.prompt, job.seconds, script.audioMood);

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
  <style>
    :root {
      color-scheme: dark;
      --bg: #06070a;
      --panel: rgba(14, 18, 27, 0.86);
      --panel-2: rgba(255, 255, 255, 0.04);
      --line: rgba(255, 255, 255, 0.1);
      --text: rgba(255, 255, 255, 0.92);
      --muted: rgba(255, 255, 255, 0.64);
      --accent: #38bdf8;
      --accent-2: #f59e0b;
      --good: #22c55e;
      --shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 26%),
        radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.14), transparent 22%),
        linear-gradient(180deg, #050608 0%, #080b11 100%);
      color: var(--text);
      overflow: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.09;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
    }
    .shell {
      position: relative;
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 20px 28px;
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 16px;
    }
    .hero {
      display: grid;
      place-items: center;
      text-align: center;
      padding: 10px 0 4px;
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 10px;
    }
    h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.05;
      letter-spacing: -0.04em;
      max-width: 16ch;
    }
    .lede {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      max-width: 62ch;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
      min-height: 0;
      align-items: stretch;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 28px;
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(24px);
      overflow: hidden;
    }
    .form {
      padding: 24px;
      display: grid;
      gap: 18px;
      height: 100%;
    }
    .field label {
      display: block;
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    textarea, input {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 18px;
      background: rgba(255,255,255,0.04);
      color: var(--text);
      padding: 16px 18px;
      font: inherit;
      outline: none;
    }
    textarea {
      min-height: 220px;
      resize: vertical;
      line-height: 1.6;
      text-align: center;
      padding-top: 88px;
      font-size: 18px;
    }
    textarea:focus, input:focus {
      border-color: rgba(56, 189, 248, 0.75);
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12);
    }
    .controls {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 12px;
      align-items: end;
      max-width: 420px;
      margin: 0 auto;
      width: 100%;
    }
    .button {
      border: 0;
      border-radius: 18px;
      background: linear-gradient(135deg, var(--accent) 0%, #60a5fa 50%, var(--accent-2) 120%);
      color: #04111e;
      padding: 16px 20px;
      font-weight: 800;
      font-size: 15px;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 18px 36px rgba(56, 189, 248, 0.22);
    }
    .button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .sidebar {
      display: grid;
      grid-template-rows: auto auto auto 1fr;
      gap: 16px;
      padding: 24px;
    }
    .stat {
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(255,255,255,0.035);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .stat .label {
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .stat .value {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.35;
      word-break: break-word;
    }
    .stat .subvalue {
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .progress {
      height: 16px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .bar {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      box-shadow: 0 0 24px rgba(56, 189, 248, 0.5);
      transition: width 180ms linear;
    }
    .log {
      min-height: 0;
      border-radius: 22px;
      background: rgba(0,0,0,0.24);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 18px;
      color: rgba(255,255,255,0.7);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.7;
      overflow: auto;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 12px;
      padding-top: 6px;
      max-width: 420px;
      margin: 0 auto;
      text-align: center;
      flex-wrap: wrap;
      justify-content: center;
    }
    @media (max-width: 900px) {
      body { overflow: auto; }
      .shell { height: auto; min-height: 100vh; }
      .grid { grid-template-columns: 1fr; display: grid; }
      .controls, .foot { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <div class="eyebrow">AI mode</div>
        <h1>Describe the video. Pick the length. Generate.</h1>
        <p class="lede">
          The server writes the script with Z.ai, pulls Unsplash visuals, synthesizes audio, and renders in the background.
        </p>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="form">
          <div class="field">
            <label for="prompt">Sentence or topic</label>
            <textarea id="prompt" placeholder="Example: Explain why solar energy is becoming cheaper than coal in plain language.">Explain why solar energy is becoming cheaper than coal in plain language.</textarea>
          </div>
          <div class="controls">
            <div class="field">
              <label for="seconds">Duration</label>
              <input id="seconds" type="number" min="5" max="300" step="5" value="5" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button id="generate" class="button">Generate video</button>
            </div>
          </div>
          <div class="foot">
            <div>Uses <code>.env</code> automatically.</div>
            <div>Output saves to <code>output/ai-mode</code>.</div>
          </div>
        </div>
      </div>

      <div class="card sidebar">
        <div class="stat">
          <div class="label">Status</div>
          <div class="value" id="status">Idle</div>
          <div class="subvalue" id="statusMeta">Ready when you are.</div>
        </div>
        <div class="stat">
          <div class="label">Unsplash budget</div>
          <div class="value" id="budget">Loading...</div>
          <div class="subvalue" id="budgetMeta">Checking local request cache.</div>
        </div>
        <div class="stat">
          <div class="label">Progress</div>
          <div class="progress" aria-label="Generation progress">
            <div id="bar" class="bar"></div>
          </div>
        </div>
        <div class="log" id="log">Waiting for a prompt.</div>
      </div>
    </section>
  </main>
  <script>
    const promptEl = document.getElementById("prompt");
    const secondsEl = document.getElementById("seconds");
    const button = document.getElementById("generate");
    const statusEl = document.getElementById("status");
    const statusMetaEl = document.getElementById("statusMeta");
    const budgetEl = document.getElementById("budget");
    const budgetMetaEl = document.getElementById("budgetMeta");
    const barEl = document.getElementById("bar");
    const logEl = document.getElementById("log");
    let pollTimer = null;
    let activeJobId = null;
    let usageTimer = null;

    function setUi(job) {
      statusEl.textContent = job.state === "complete"
        ? "Done"
        : job.state === "error"
          ? "Error"
          : job.message;
      statusMetaEl.textContent = job.stage === "render"
        ? "Rendering now. The bar is live."
        : job.stage === "bundle"
          ? "Bundling assets and composition."
          : job.stage === "visuals"
            ? "Finding visuals on Unsplash."
            : job.stage === "audio"
              ? "Building the audio bed."
              : job.stage === "script"
                ? "Writing the script."
                : "Ready when you are.";
      barEl.style.width = Math.max(0, Math.min(100, job.progress || 0)) + "%";
      logEl.textContent = [
        "Prompt: " + job.prompt,
        "Duration: " + job.seconds + "s",
        "State: " + job.state,
        "Stage: " + job.stage,
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
        budgetMetaEl.textContent = "Used " + usage.used + " this hour. Resets at " + new Date(usage.resetAt).toLocaleTimeString() + ".";
      } catch (error) {
        budgetEl.textContent = "Unavailable";
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
      const seconds = Number(secondsEl.value || 5);
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
        body: JSON.stringify({ prompt, seconds }),
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

    refreshBudget();
    usageTimer = setInterval(refreshBudget, 60000);
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
      if (activeJobId) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A job is already running." }));
        return;
      }

      const body = await readJsonBody(req);
      const prompt = String(body.prompt || "").trim();
      const seconds = Math.max(5, Math.min(300, Number(body.seconds || 5)));

      if (!prompt) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Prompt is required." }));
        return;
      }

      const jobId = createId();
      const job: JobState = {
        id: jobId,
        prompt,
        seconds,
        state: "queued",
        stage: "queued",
        progress: 1,
        message: "Queued for generation.",
        updatedAt: Date.now(),
      };

      jobs.set(jobId, job);
      activeJobId = jobId;
      void runJob(jobId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jobId }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/status") {
      const jobId = url.searchParams.get("id");
      if (!jobId || !jobs.has(jobId)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found." }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jobs.get(jobId)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/usage") {
      const usage = await getUnsplashUsage();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(usage));
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
  const url = `http://localhost:${port}`;
  console.log(`AI mode running at ${url}`);
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} ${url}`, () => {});
});
