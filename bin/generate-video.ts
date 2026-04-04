#!/usr/bin/env node

/**
 * CLI script to generate explainer videos from any topic.
 *
 * Usage:
 *   npm run generate -- "topic name"
 *   npm run generate -- "topic name" --tone casual
 *   npm run generate -- "topic name" --complexity simple --no-images
 *   npm run generate -- "topic name" --use-ai
 */

import "../src/utils/load-env.js";
import { generateScript, type GenerateScriptOptions } from "../src/utils/generate-script.js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import http from "http";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

// Aspect ratio presets
type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "4:3";

interface AspectRatioPreset {
  width: number;
  height: number;
  description: string;
  fontSizeScale: number;
}

const aspectRatioPresets: Record<AspectRatio, AspectRatioPreset> = {
  "9:16": { width: 1080, height: 1920, description: "TikTok, Reels, Shorts", fontSizeScale: 1 },
  "16:9": { width: 1920, height: 1080, description: "YouTube, standard video", fontSizeScale: 1.3 },
  "1:1": { width: 1080, height: 1080, description: "Instagram posts", fontSizeScale: 1.2 },
  "4:5": { width: 1080, height: 1350, description: "Instagram portrait", fontSizeScale: 1.1 },
  "4:3": { width: 1440, height: 1080, description: "Standard display", fontSizeScale: 1.25 },
};

// Parse CLI arguments
function parseArgs(cliArgs: string[]): {
  topic: string;
  options: GenerateScriptOptions;
  outputPath: string;
  fetchImages: boolean;
  aspectRatio: AspectRatio;
} {
  const topic = cliArgs[0];

  if (!topic) {
    console.error("❌ Error: Please provide a topic");
    console.log("\nUsage: npm run generate -- \"topic name\" [options]");
    console.log("\nOptions:");
    console.log("  --tone <informative|casual|professional|dramatic|humorous|storytelling>");
    console.log("  --complexity <simple|medium|detailed>");
    console.log("  --aspect <9:16|16:9|1:1|4:5|4:3>  Aspect ratio (default: 9:16)");
    console.log("  --output <path>");
    console.log("  --no-images    Skip fetching images");
    console.log("  --use-ai       Use Z.ai for script generation");
    console.log("\nAspect Ratios:");
    console.log("  9:16   Vertical video (TikTok, Reels, Shorts)");
    console.log("  16:9   Horizontal video (YouTube, standard)");
    console.log("  1:1    Square video (Instagram posts)");
    console.log("  4:5    Portrait (Instagram)");
    console.log("  4:3    Standard display");
    console.log("\nEnvironment Variables:");
    console.log("  ZAI_API_KEY          Your Z.ai API key");
    console.log("  ZAI_BASE_URL         Optional Anthropic-compatible base URL");
    console.log("  ZAI_MODEL            Optional model name");
    console.log("\nExamples:");
    console.log("  npm run generate -- \"AI\" --use-ai");
    console.log("  npm run generate -- \"Space\" --tone storytelling --aspect 16:9");
    console.log("  npm run generate -- \"Tech\" --aspect 1:1 --use-ai");
    process.exit(1);
  }

  const options: GenerateScriptOptions = { topic };
  let outputPath = path.join(process.cwd(), "output", `${topic.replace(/\s+/g, "-").toLowerCase()}.mp4`);
  let fetchImages = true;
  let aspectRatio: AspectRatio = "9:16"; // Default

  for (let i = 1; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    switch (arg) {
      case "--tone":
        options.tone = cliArgs[++i] as any;
        break;
      case "--complexity":
        options.complexity = cliArgs[++i] as any;
        break;
      case "--aspect":
        const ratio = cliArgs[++i] as AspectRatio;
        if (ratio in aspectRatioPresets) {
          aspectRatio = ratio;
        } else {
          console.error(`❌ Error: Invalid aspect ratio "${ratio}"`);
          console.error(`   Valid options: ${Object.keys(aspectRatioPresets).join(", ")}`);
          process.exit(1);
        }
        break;
      case "--output":
        outputPath = cliArgs[++i];
        break;
      case "--no-images":
        fetchImages = false;
        break;
      case "--use-ai":
        options.useAI = true;
        options.apiKey = process.env.ZAI_API_KEY || process.env.ANTHROPIC_API_KEY || undefined;
        // No longer require API key - demo mode will be used if not provided
        break;
    }
  }

  return { topic, options, outputPath, fetchImages, aspectRatio };
}

// Create output directory if it doesn't exist
async function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

// Fetch images for the video (PARALLEL - 10x faster)
async function fetchVideoImages(topic: string, script: any, aspectRatio: AspectRatio, count = 10) {
  const preset = aspectRatioPresets[aspectRatio];
  console.log(`\n🖼️  Fetching images from Lorem Picsum (${preset.width}x${preset.height})...`);

  const imagesDir = path.join(process.cwd(), "public", "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  // Create a unique seed for this video generation
  const seed = Date.now();
  const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // PARALLEL: Fetch all images concurrently using Promise.all
  const fetchPromises = Array.from({ length: count }, async (_, i) => {
    const imageUrl = `https://picsum.photos/seed/${sanitizedTopic}-${seed}-${i}/${preset.width}/${preset.height}`;
    const filename = `${sanitizedTopic}-${i}.jpg`;
    const localPath = path.join(imagesDir, filename);

    try {
      // Download with retry
      await downloadImageWithRetry(imageUrl, localPath);

      // Convert to base64 data URL for Remotion
      const imageBuffer = await readFile(localPath);
      const base64 = imageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      return {
        src: dataUrl,
        alt: `${topic}-${i}`,
        index: i,
      };
    } catch (error) {
      console.error(`\n   Failed to fetch image ${i}:`, error);
      return null;
    }
  });

  // Wait for all downloads to complete
  const results = await Promise.all(fetchPromises);

  // Filter out failed downloads and sort by index
  const images = results
    .filter((r): r is { src: string; alt: string; index: number } => r !== null)
    .sort((a, b) => a.index - b.index)
    .map(({ src, alt }) => ({ src, alt }));

  console.log(`   ✅ Fetched: ${images.length}/${count} images`);

  return images;
}

// Download with retry mechanism (exponential backoff)
async function downloadImageWithRetry(
  url: string,
  outputPath: string,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await downloadImageDirect(url, outputPath);
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isLastAttempt) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Download image helper
function downloadImageDirect(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.request(url, (response: any) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImageDirect(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err: Error) => {
        // Ignore cleanup errors
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error("Timeout"));
    });

    request.end();
  });
}

// Generate a temporary Root file with the generated script
async function createTempRoot(script: any, images: any[], aspectRatio: AspectRatio) {
  const preset = aspectRatioPresets[aspectRatio];
  const rootTemplate = `import { Composition } from "remotion";
import { ExplainerVideo } from "./compositions/ExplainerVideo";
import { ExplainerVideoSchema } from "./compositions/ExplainerVideo/schema";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ExplainerVideo"
      component={ExplainerVideo}
      schema={ExplainerVideoSchema}
      defaultProps={{
        topic: ${JSON.stringify(script.title)},
        script: ${JSON.stringify(script)},
        images: ${JSON.stringify(images)},
        colorScheme: "default",
        aspectRatio: "${aspectRatio}",
        fontSizeScale: ${preset.fontSizeScale},
      }}
      durationInFrames={900}
      fps={30}
      width={${preset.width}}
      height={${preset.height}}
    />
  );
};
`;

  const indexTemplate = `import { registerRoot } from "remotion";
import { RemotionRoot } from "./root.generated";

registerRoot(RemotionRoot);
`;

  const rootPath = path.join(process.cwd(), "src", "root.generated.tsx");
  const indexPath = path.join(process.cwd(), "src", "index.generated.ts");

  fs.writeFileSync(rootPath, rootTemplate);
  fs.writeFileSync(indexPath, indexTemplate);

  return { rootPath, indexPath };
}

// Clean up temporary files
async function cleanup(rootPath: string, indexPath: string) {
  try {
    fs.unlinkSync(rootPath);
  } catch {}
  try {
    fs.unlinkSync(indexPath);
  } catch {}
}

// Main function
async function main() {
  console.log("🎬 Remotion Explainer Video Generator\n");
  console.log("   ════════════════════════════════════\n");

  const { topic, options, outputPath, fetchImages, aspectRatio } = parseArgs(args);
  const preset = aspectRatioPresets[aspectRatio];

  console.log(`📚 Topic:    ${topic}`);
  console.log(`🎭 Tone:     ${options.tone || "informative"}`);
  console.log(`📊 Level:    ${options.complexity || "medium"}`);
  const aiMode = options.useAI
    ? (options.apiKey ? "Yes (Z.ai)" : "Yes (Demo Mode)")
    : "No (Template)";
  console.log(`🤖 AI:       ${aiMode}`);
  console.log(`📐 Ratio:    ${aspectRatio} (${preset.description})`);
  console.log(`📐 Size:     ${preset.width}x${preset.height}`);
  console.log(`🖼️  Images:   ${fetchImages ? `Yes (${preset.width}x${preset.height})` : "No"}`);
  console.log(`📁 Output:   ${outputPath}\n`);

  // Generate script
  console.log("🔍 Researching topic and generating script...");
  const script = await generateScript(options);

  console.log("\n📝 Generated Script:");
  console.log(`   Title:    ${script.title}`);
  console.log(`   Accent:   ${script.accentColor || "#38bdf8"}`);
  console.log(`   Hook:     ${script.hook.substring(0, 50)}...`);
  console.log(`   Sections: ${script.sections.length}`);

  // Fetch images
  let images: any[] = [];
  if (fetchImages) {
    images = await fetchVideoImages(topic, script, aspectRatio, 10);
  }

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Create temporary Root with generated script
  const { rootPath, indexPath } = await createTempRoot(script, images, aspectRatio);

  try {
    // Bundle the Remotion project
    console.log("\n📦 Bundling project...");

    const entryPoint = path.resolve(process.cwd(), "src/index.generated.ts");
    const bundleLocation = await bundle({
      entryPoint,
      onProgress: (progress) => {
        if (progress % 10 === 0) {
          process.stdout.write(`\r   Progress: ${progress}%`);
        }
      },
    });

    process.stdout.write(`\r   Progress: 100%\n`);

    // Select composition
    console.log("\n🎥 Selecting composition...");
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ExplainerVideo",
      inputProps: {
        topic: script.title,
        script,
        images,
      },
    });

    const duration = Math.floor(composition.durationInFrames / 30);
    console.log(`   Duration:   ${duration}s`);
    console.log(`   Dimensions: ${composition.width}x${composition.height}`);
    console.log(`   Images:     ${images.length} sourced\n`);

    // Render video
    console.log("🎬 Rendering video...");
    console.log("   ════════════════════════════════════\n");

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {
        topic: script.title,
        script,
        images,
      },
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100);
        const bar = "█".repeat(Math.floor(percent / 2)) + "░".repeat(50 - Math.floor(percent / 2));
        process.stdout.write(`\r   [$bar] ${percent}%`);
      },
    });

    process.stdout.write(`\r   [██████████████████████████████████████████████████] 100%\n`);

    console.log(`\n✅ Video saved to: ${outputPath}`);
    console.log("\n🎉 Done!");

    // Open the video
    const { exec } = await import("child_process");
    const openCmd = process.platform === "darwin" ? "open" :
                    process.platform === "win32" ? "start" : "xdg-open";
    exec(`${openCmd} "${outputPath}"`, (err: any) => {
      if (err) console.log(`\n💡 Tip: Open the video manually at ${outputPath}`);
    });
  } finally {
    // Clean up temporary files
    await cleanup(rootPath, indexPath);
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
});
