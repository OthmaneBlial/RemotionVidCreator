#!/usr/bin/env node

/**
 * CLI script to generate explainer videos from any topic.
 *
 * Usage:
 *   npm run generate -- "topic name"
 *   npm run generate -- "topic name" --tone casual
 *   npm run generate -- "topic name" --complexity simple --no-images
 */

import { generateScript, type GenerateScriptOptions } from "../src/utils/generate-script.js";
import { fetchUnsplashImages } from "../src/utils/fetch-images.js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import https from "https";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

// Parse CLI arguments
function parseArgs(cliArgs: string[]): {
  topic: string;
  options: GenerateScriptOptions;
  outputPath: string;
  fetchImages: boolean;
} {
  const topic = cliArgs[0];

  if (!topic) {
    console.error("❌ Error: Please provide a topic");
    console.log("\nUsage: npm run generate -- \"topic name\" [options]");
    console.log("\nOptions:");
    console.log("  --tone <informative|casual|professional|dramatic>");
    console.log("  --complexity <simple|medium|detailed>");
    console.log("  --output <path>");
    console.log("  --no-images  Skip fetching images from Unsplash");
    process.exit(1);
  }

  const options: GenerateScriptOptions = { topic };
  let outputPath = path.join(process.cwd(), "output", `${topic.replace(/\s+/g, "-").toLowerCase()}.mp4`);
  let fetchImages = true;

  for (let i = 1; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    switch (arg) {
      case "--tone":
        options.tone = cliArgs[++i] as any;
        break;
      case "--complexity":
        options.complexity = cliArgs[++i] as any;
        break;
      case "--output":
        outputPath = cliArgs[++i];
        break;
      case "--no-images":
        fetchImages = false;
        break;
    }
  }

  return { topic, options, outputPath, fetchImages };
}

// Create output directory if it doesn't exist
async function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

// Fetch images for the video
async function fetchVideoImages(topic: string, script: any, count = 10) {
  console.log("\n🖼️  Fetching images from Unsplash...");

  const imagesDir = path.join(process.cwd(), "public", "images");
  await fs.mkdir(imagesDir, { recursive: true });

  const images: Array<{ src: string; alt: string }> = [];

  // Collect all keywords from script
  const allKeywords = new Set<string>();
  allKeywords.add(topic);

  if (script.topicImages) {
    script.topicImages.forEach((kw: string) => allKeywords.add(kw));
  }

  script.sections.forEach((section: any) => {
    if (section.imageKeywords) {
      section.imageKeywords.forEach((kw: string) => allKeywords.add(kw));
    }
  });

  const keywordArray = Array.from(allKeywords).slice(0, count);

  for (let i = 0; i < Math.min(keywordArray.length, count); i++) {
    const keyword = keywordArray[i];
    try {
      const fetchedImages = await fetchUnsplashImages(keyword, 1);
      if (fetchedImages.length > 0) {
        images.push({
          src: fetchedImages[0].url,
          alt: keyword,
        });
        process.stdout.write(`\r   Fetched: ${i + 1}/${count} images`);
      }
    } catch (error) {
      console.error(`\n   Failed to fetch image for "${keyword}":`, error);
    }
  }

  // If we didn't get enough images, fetch more generic ones
  if (images.length < count) {
    const remaining = count - images.length;
    for (let i = 0; i < remaining; i++) {
      try {
        const fetchedImages = await fetchUnsplashImages(topic, 1);
        if (fetchedImages.length > 0) {
          images.push({
            src: fetchedImages[0].url,
            alt: `${topic}-${i}`,
          });
        }
      } catch {}
    }
  }

  process.stdout.write(`\r   Fetched: ${images.length}/${count} images\n`);

  return images;
}

// Generate a temporary Root file with the generated script
async function createTempRoot(script: any, images: any[]) {
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
      }}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
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

  await fs.writeFile(rootPath, rootTemplate);
  await fs.writeFile(indexPath, indexTemplate);

  return { rootPath, indexPath };
}

// Clean up temporary files
async function cleanup(rootPath: string, indexPath: string) {
  try {
    await fs.unlink(rootPath);
  } catch {}
  try {
    await fs.unlink(indexPath);
  } catch {}
}

// Main function
async function main() {
  console.log("🎬 Remotion Explainer Video Generator\n");
  console.log("   ════════════════════════════════════\n");

  const { topic, options, outputPath, fetchImages } = parseArgs(args);

  console.log(`📚 Topic:    ${topic}`);
  console.log(`🎭 Tone:     ${options.tone || "informative"}`);
  console.log(`📊 Level:    ${options.complexity || "medium"}`);
  console.log(`🖼️  Images:   ${fetchImages ? "Yes (Unsplash)" : "No"}`);
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
    images = await fetchVideoImages(topic, script, 10);
  }

  // Ensure output directory exists
  await ensureOutputDir(outputPath);

  // Create temporary Root with generated script
  const { rootPath, indexPath } = await createTempRoot(script, images);

  try {
    // Bundle the Remotion project
    console.log("\n📦 Bundling project...");

    const entryPoint = path.resolve(process.cwd(), "src/index.generated.ts");
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
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
