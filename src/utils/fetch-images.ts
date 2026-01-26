import { staticFile } from "remotion";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import https from "https";
import http from "http";

export interface FetchedImage {
  url: string;
  localPath: string;
  width: number;
  height: number;
  author?: string;
  authorUrl?: string;
}

/**
 * Fetch images from Lorem Picsum (picsum.photos)
 * Free, reliable, no API key required - redirects to actual Unsplash photos
 */
export async function fetchLoremPicsumImages(
  topic: string,
  count = 5,
  width = 1080,
  height = 1920
): Promise<FetchedImage[]> {
  const imagesDir = path.join(process.cwd(), "public", "images");
  await fsPromises.mkdir(imagesDir, { recursive: true });

  const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const images: FetchedImage[] = [];

  // Lorem Picsum uses random seeds - we use timestamp for variety
  const seed = Date.now();

  for (let i = 0; i < count; i++) {
    try {
      // Lorem Picsum URL - each seed gives a consistent random image
      const imageUrl = `https://picsum.photos/seed/${sanitizedTopic}-${seed}-${i}/${width}/${height}`;

      const filename = `${sanitizedTopic}-${i}.jpg`;
      const localPath = path.join(imagesDir, filename);

      // Download image
      await downloadImage(imageUrl, localPath);

      images.push({
        url: staticFile(`images/${filename}`),
        localPath,
        width,
        height,
      });
    } catch (error) {
      console.error(`Failed to fetch image ${i}:`, error);
    }
  }

  return images;
}

/**
 * Fetch images from multiple free sources (fallback chain)
 * Tries Lorem Picsum first, then other free sources
 */
export async function fetchFreeImages(
  topic: string,
  count = 5,
  width = 1080,
  height = 1920
): Promise<FetchedImage[]> {
  console.log(`🖼️  Fetching ${count} images...`);

  const imagesDir = path.join(process.cwd(), "public", "images");
  await fsPromises.mkdir(imagesDir, { recursive: true });

  const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const images: FetchedImage[] = [];
  const seed = Date.now();

  // Image sources to try (in order)
  const sources = [
    {
      name: "Lorem Picsum",
      getUrl: (i: number) => `https://picsum.photos/seed/${sanitizedTopic}-${seed}-${i}/${width}/${height}`,
    },
    {
      name: "Picsum Random",
      getUrl: (i: number) => `https://picsum.photos/${width}/${height}?random=${seed + i}`,
    },
    {
      name: "LoremFlickr",
      getUrl: (i: number) => `https://loremflickr.com/${width}/${height}/${sanitizedTopic}?lock=${seed + i}`,
    },
  ];

  let sourceIndex = 0;

  while (images.length < count && sourceIndex < sources.length) {
    const source = sources[sourceIndex];
    const needed = count - images.length;

    console.log(`   Trying ${source.name}...`);

    for (let i = 0; i < needed; i++) {
      const imageIndex = images.length;
      try {
        const imageUrl = source.getUrl(imageIndex);
        const filename = `${sanitizedTopic}-${imageIndex}.jpg`;
        const localPath = path.join(imagesDir, filename);

        await downloadImage(imageUrl, localPath, 15000); // 15 second timeout

        images.push({
          url: staticFile(`images/${filename}`),
          localPath,
          width,
          height,
        });

        process.stdout.write(`\r   Fetched: ${images.length}/${count} images`);
      } catch (error) {
        console.error(`\n   ${source.name} failed for image ${imageIndex}`);
        break; // Try next source
      }
    }

    sourceIndex++;
  }

  process.stdout.write(`\r   Fetched: ${images.length}/${count} images\n`);

  return images;
}

// Keep backward compatibility
export const fetchUnsplashImages = fetchFreeImages;

/**
 * Download an image from URL to local path
 */
function downloadImage(
  url: string,
  outputPath: string,
  timeout = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (
        response.statusCode === 301 ||
        response.statusCode === 302 ||
        response.statusCode === 307 ||
        response.statusCode === 308
      ) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, outputPath, timeout).then(resolve).catch(reject);
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
        fsPromises.unlink(outputPath).catch(() => {});
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error("Timeout"));
    });
  });
}

/**
 * Get image keywords for a topic section
 */
export function getImageKeywords(topic: string, sectionTitle?: string): string[] {
  const baseKeywords = [topic];

  if (sectionTitle) {
    baseKeywords.push(sectionTitle);
  }

  // Add related keywords
  const relatedKeywords: Record<string, string[]> = {
    "artificial intelligence": ["AI", "neural network", "robot", "technology"],
    "blockchain": ["cryptocurrency", "bitcoin", "decentralized", "fintech"],
    "climate": ["nature", "environment", "earth", "sustainability"],
    "health": ["medical", "wellness", "doctor", "medicine"],
    "technology": ["innovation", "digital", "computer", "future"],
    "business": ["office", "startup", "meeting", "success"],
    "education": ["learning", "school", "student", "knowledge"],
    "science": ["research", "laboratory", "experiment", "discovery"],
  };

  for (const [key, values] of Object.entries(relatedKeywords)) {
    if (topic.toLowerCase().includes(key)) {
      baseKeywords.push(...values);
    }
  }

  return [...new Set(baseKeywords)];
}

/**
 * Get a fallback/gradients image if image fetching fails
 */
export function getGradientImage(color1: string, color2: string): string {
  const svg = `
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#grad)" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
