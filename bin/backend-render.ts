#!/usr/bin/env node

import "../src/utils/load-env.js";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { generateScript } from "../src/utils/generate-script.js";
import { generateAmbientAudioTrack } from "../src/utils/audio.js";
import { fetchUnsplashImages } from "../src/utils/unsplash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

type JobPayload = {
  id: string;
  prompt: string;
  seconds: number;
  tone: "informative" | "casual" | "professional" | "dramatic" | "humorous" | "storytelling";
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
  await writeFile(statusFile, JSON.stringify(status, null, 2), "utf8");
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

async function main() {
  const { jobFile, statusFile } = parseArgs();
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

  const qualityScore = scoreGeneration(payload, script);
  await writeStatus(statusFile, {
    ...payload,
    qualityScore,
    state: "researching",
    stage: "visuals",
    progress: 25,
    message: `Script drafted. Quality score: ${qualityScore}/100.`,
    updatedAt: Date.now(),
    script,
  });

  const imageCount =
    payload.visualDensity === "rich"
      ? Math.max(8, script.sections.length * 2)
      : payload.visualDensity === "minimal"
        ? Math.max(3, script.sections.length + 1)
        : Math.max(5, script.sections.length + 2);
  const images = await fetchUnsplashImages(payload.prompt, script, imageCount, 1080, 1920);

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
    audio,
  });

  await writeFile(path.join(outputDir, ".keep"), "", "utf8").catch(() => {});
  const outputPath = path.join(outputDir, `${payload.prompt.toLowerCase().replace(/\s+/g, "-").slice(0, 64) || "ai-video"}-${Date.now()}.mp4`);

  const bundleLocation = await bundle({
    entryPoint: path.join(projectRoot, "src", "index.ts"),
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
    audio,
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
