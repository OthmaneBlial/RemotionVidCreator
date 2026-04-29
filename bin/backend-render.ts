#!/usr/bin/env node

import "../src/utils/load-env.js";
import crypto from "crypto";
import { readFile, readdir, rename, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { generateScript } from "../src/utils/generate-script.js";
import { generateAmbientAudioTrack } from "../src/utils/audio.js";
import { fetchUnsplashImages, type UnsplashImage } from "../src/utils/unsplash.js";
import { fetchOfflineImages, rememberOnlineImages, type VisualSource } from "../src/utils/local-assets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const bundleCacheDir = path.join(projectRoot, ".cache", "remotion-bundle");
const bundleManifestFile = path.join(bundleCacheDir, "manifest.json");
let statusWriteQueue = Promise.resolve();

type JobPayload = {
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
  visualSource?: VisualSource;
  offlineCategory?: string;
  saveOnlineImages?: boolean;
};

type RenderTimings = {
  scriptMs?: number;
  visualsMs?: number;
  audioMs?: number;
  bundleMs?: number;
  renderMs?: number;
  totalMs?: number;
  bundleCached?: boolean;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const map: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      map[arg.slice(2)] = args[i + 1];
      i++;
    }
  }
  if (!map["job-file"] || !map["status-file"]) {
    throw new Error("Missing --job-file or --status-file");
  }
  return {
    jobFile: map["job-file"],
    statusFile: map["status-file"],
  };
}

async function writeStatus(statusFile: string, status: Record<string, unknown>) {
  const write = async () => {
    const tempFile = `${statusFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(status, null, 2), "utf8");
    await rename(tempFile, statusFile);
  };
  statusWriteQueue = statusWriteQueue.then(write, write);
  await statusWriteQueue;
}

function scoreGeneration(payload: JobPayload, script: Awaited<ReturnType<typeof generateScript>>) {
  let score = 50;
  score += Math.min(15, Math.max(0, script.sections.length - 2) * 3);
  score += script.scenePlan?.length ? 10 : 0;
  score += script.cta ? 5 : 0;
  score += script.audioMood ? 5 : 0;
  score += script.creativeDirection ? 10 : 0;
  score += payload.goal ? 4 : 0;
  score += payload.pacing ? 3 : 0;
  score += payload.brief ? 5 : 0;
  score += payload.visualDensity === "rich" ? 5 : 0;
  score += payload.intensity === "wild" ? 3 : 0;
  return Math.max(0, Math.min(100, score));
}

function getImageCount(payload: JobPayload, sectionCount: number): number {
  if (payload.seconds <= 15) {
    return payload.seconds <= 10 ? 2 : 3;
  }

  return payload.visualDensity === "rich"
    ? Math.max(8, sectionCount * 2)
    : payload.visualDensity === "minimal"
      ? Math.max(3, sectionCount + 1)
      : Math.max(5, sectionCount + 2);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFingerprintEntries(targetPath: string, entries: string[]): Promise<void> {
  if (!(await pathExists(targetPath))) {
    return;
  }

  const details = await stat(targetPath);
  if (details.isDirectory()) {
    const children = await readdir(targetPath);
    for (const child of children.sort()) {
      await collectFingerprintEntries(path.join(targetPath, child), entries);
    }
    return;
  }

  const relativePath = path.relative(projectRoot, targetPath);
  entries.push(`${relativePath}:${details.size}:${Math.round(details.mtimeMs)}`);
}

async function getBundleFingerprint(): Promise<string> {
  const entries: string[] = [];
  await collectFingerprintEntries(path.join(projectRoot, "src"), entries);
  await collectFingerprintEntries(path.join(projectRoot, "public", "assets", "offline-images"), entries);
  await collectFingerprintEntries(path.join(projectRoot, "package.json"), entries);
  await collectFingerprintEntries(path.join(projectRoot, "tsconfig.json"), entries);
  return crypto.createHash("sha256").update(entries.join("\n")).digest("hex");
}

async function getBundleLocation(
  statusFile: string,
  payload: JobPayload,
  qualityScore: number,
  timings: RenderTimings
): Promise<{ bundleLocation: string; cached: boolean }> {
  const fingerprint = await getBundleFingerprint();
  const manifest = await readFile(bundleManifestFile, "utf8")
    .then((raw) => JSON.parse(raw) as { fingerprint?: string })
    .catch(() => null);
  const cached = manifest?.fingerprint === fingerprint && await pathExists(path.join(bundleCacheDir, "index.html"));

  if (cached) {
    await writeStatus(statusFile, {
      ...payload,
      qualityScore,
      state: "bundling",
      stage: "bundle",
      progress: 72,
      message: "Using cached Remotion bundle...",
      updatedAt: Date.now(),
      timings: {
        ...timings,
        bundleCached: true,
      },
    });
    return { bundleLocation: bundleCacheDir, cached: true };
  }

  await rm(bundleCacheDir, { recursive: true, force: true });
  const bundleLocation = await bundle({
    entryPoint: path.join(projectRoot, "src", "index.ts"),
    outDir: bundleCacheDir,
    enableCaching: true,
    onProgress: (progress) => {
      void writeStatus(statusFile, {
        ...payload,
        qualityScore,
        state: "bundling",
        stage: "bundle",
        progress: Math.min(72, 60 + Math.round(progress * 12)),
        message: "Bundling the Remotion project...",
        updatedAt: Date.now(),
      });
    },
  });
  await writeFile(bundleManifestFile, JSON.stringify({ fingerprint, updatedAt: Date.now() }, null, 2), "utf8");
  return { bundleLocation, cached: false };
}

async function main() {
  const { jobFile, statusFile } = parseArgs();
  const startedAt = performance.now();
  const timings: RenderTimings = {};
  const payload = JSON.parse(await readFile(jobFile, "utf8")) as JobPayload;
  const outputDir = path.join(process.cwd(), "output", "ai-mode");
  await writeStatus(statusFile, {
    ...payload,
    state: "writing",
    stage: "script",
    progress: 5,
    message: "Drafting the script with Z.ai...",
    updatedAt: Date.now(),
  });

  const script = await generateScript({
    topic: payload.prompt,
    tone: payload.tone,
    complexity: payload.complexity,
    targetDurationSeconds: payload.seconds,
    useAI: true,
    apiKey: process.env.ZAI_API_KEY,
    stylePreset: payload.stylePreset,
    audience: payload.audience,
    platform: payload.platform,
    intensity: payload.intensity,
    motionLevel: payload.motionLevel,
    visualDensity: payload.visualDensity,
    narrativeTemplate: payload.narrativeTemplate,
    goal: payload.goal,
    pacing: payload.pacing,
    brief: payload.brief,
    audioMood: payload.audioMood,
    focus: payload.focus,
  });
  timings.scriptMs = Math.round(performance.now() - startedAt);

  const qualityScore = scoreGeneration(payload, script);
  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "researching",
    stage: "visuals",
    progress: 25,
    message:
      (payload.visualSource || "offline") === "online"
        ? `Script drafted. Searching Unsplash. Quality score: ${qualityScore}/100.`
        : `Script drafted. Loading offline image assets. Quality score: ${qualityScore}/100.`,
    updatedAt: Date.now(),
    script,
  });

  const imageCount = getImageCount(payload, script.sections.length);
  const visualSource = payload.visualSource || "offline";
  const offlineCategory = payload.offlineCategory || "auto";
  let images: UnsplashImage[];

  if (visualSource === "auto") {
    try {
      images = await fetchOfflineImages(payload.prompt, script, imageCount, offlineCategory);
    } catch {
      images = await fetchUnsplashImages(payload.prompt, script, imageCount, 1080, 1920);
    }
  } else {
    images =
      visualSource === "online"
        ? await fetchUnsplashImages(payload.prompt, script, imageCount, 1080, 1920)
        : await fetchOfflineImages(payload.prompt, script, imageCount, offlineCategory);
  }
  timings.visualsMs = Math.round(performance.now() - startedAt - (timings.scriptMs ?? 0));

  const shouldSaveOnlineImages = Boolean(payload.saveOnlineImages || process.env.UNSPLASH_SAVE_LOCAL === "1");
  if ((visualSource === "online" || images.some((image) => image.src.startsWith("http"))) && shouldSaveOnlineImages) {
    await rememberOnlineImages(
      images,
      payload.prompt,
      offlineCategory,
      true
    );
  }

  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "audio",
    stage: "audio",
    progress: 45,
    message: "Synthesizing the background audio bed...",
    updatedAt: Date.now(),
    script,
    images,
  });

  const audio = await generateAmbientAudioTrack(
    payload.prompt,
    payload.seconds,
    payload.audioMood || script.audioMood
  );
  timings.audioMs = Math.round(
    performance.now() - startedAt - (timings.scriptMs ?? 0) - (timings.visualsMs ?? 0)
  );

  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "bundling",
    stage: "bundle",
    progress: 60,
    message: "Bundling the Remotion project...",
    updatedAt: Date.now(),
    script,
    images,
    audioMeta: {
      durationSeconds: audio.durationSeconds,
      mood: audio.mood,
    },
    timings,
  });

  await writeFile(path.join(outputDir, ".keep"), "", "utf8").catch(() => {});
  const outputPath = path.join(outputDir, `${payload.prompt.toLowerCase().replace(/\s+/g, "-").slice(0, 64) || "ai-video"}-${Date.now()}.mp4`);

  const { bundleLocation, cached: bundleCached } = await getBundleLocation(statusFile, payload, qualityScore, timings);
  timings.bundleMs = Math.round(
    performance.now() -
      startedAt -
      (timings.scriptMs ?? 0) -
      (timings.visualsMs ?? 0) -
      (timings.audioMs ?? 0)
  );
  timings.bundleCached = bundleCached;

  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "rendering",
    stage: "render",
    progress: 75,
    message: "Rendering the final video...",
    updatedAt: Date.now(),
    script,
    images,
    audio,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ExplainerVideo",
    inputProps: {
      topic: script.title,
      script,
      images,
      audio,
      targetDurationSeconds: payload.seconds,
      fontSizeScale: 1,
      stylePreset: payload.stylePreset,
      audience: payload.audience,
      platform: payload.platform,
      intensity: payload.intensity,
      motionLevel: payload.motionLevel,
      visualDensity: payload.visualDensity,
    },
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    crf: Number(process.env.REMOTION_CRF || 23),
    imageFormat: "jpeg",
    jpegQuality: 88,
    outputLocation: outputPath,
    inputProps: {
      topic: script.title,
      script,
      images,
      audio,
      targetDurationSeconds: payload.seconds,
      fontSizeScale: 1,
      stylePreset: payload.stylePreset,
      audience: payload.audience,
      platform: payload.platform,
      intensity: payload.intensity,
      motionLevel: payload.motionLevel,
      visualDensity: payload.visualDensity,
    },
    onProgress: ({ progress }) => {
      void writeStatus(statusFile, {
        ...payload,
        qualityScore,
        state: "rendering",
        stage: "render",
        progress: 75 + Math.round(progress * 25),
        message: "Rendering the final video...",
        updatedAt: Date.now(),
      });
    },
  });
  timings.renderMs = Math.round(
    performance.now() -
      startedAt -
      (timings.scriptMs ?? 0) -
      (timings.visualsMs ?? 0) -
      (timings.audioMs ?? 0) -
      (timings.bundleMs ?? 0)
  );

  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "complete",
    stage: "done",
    progress: 100,
    message: "Video finished and saved locally.",
    outputPath,
    updatedAt: Date.now(),
    script,
    images,
    audioMeta: {
      durationSeconds: audio.durationSeconds,
      mood: audio.mood,
    },
    timings: {
      ...timings,
      totalMs: Math.round(performance.now() - startedAt),
    },
  });
}

main().catch(async (error) => {
  const { statusFile } = parseArgs();
  await writeStatus(statusFile, {
    state: "error",
    stage: "error",
    progress: 100,
    message: "Generation failed.",
    error: error instanceof Error ? error.message : String(error),
    updatedAt: Date.now(),
  });
  console.error(error);
  process.exit(1);
});
