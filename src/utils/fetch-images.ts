import { staticFile } from "remotion";
import path from "path";
import fs from "fs/promises";
import https from "https";

export interface FetchedImage {
  url: string;
  localPath: string;
  width: number;
  height: number;
  author?: string;
  authorUrl?: string;
}

/**
 * Fetch images from Unsplash source API (free, no key required)
 * Returns images related to the given topic
 */
export async function fetchUnsplashImages(
  topic: string,
  count = 5
): Promise<FetchedImage[]> {
  const imagesDir = path.join(process.cwd(), "public", "images");
  await fs.mkdir(imagesDir, { recursive: true });

  const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const images: FetchedImage[] = [];

  // Unsplash Source API - free, no authentication required
  const baseUrl = "https://source.unsplash.com";

  for (let i = 0; i < count; i++) {
    try {
      // Use different dimensions for variety
      const dimensions = [
        { w: 1080, h: 1920 },
        { w: 1080, h: 1350 },
        { w: 1080, h: 1600 },
      ][i % 3];

      // Create image URL with timestamp to avoid caching
      const timestamp = Date.now() + i * 1000;
      const imageUrl = `${baseUrl}/${dimensions.w}x${dimensions.h}/?${encodeURIComponent(
        topic
      )}&t=${timestamp}`;

      const filename = `${sanitizedTopic}-${i}.jpg`;
      const localPath = path.join(imagesDir, filename);

      // Download image
      await downloadImage(imageUrl, localPath);

      images.push({
        url: staticFile(`images/${filename}`),
        localPath,
        width: dimensions.w,
        height: dimensions.h,
      });
    } catch (error) {
      console.error(`Failed to fetch image ${i}:`, error);
    }
  }

  return images;
}

/**
 * Download an image from URL to local path
 */
function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Unsplash source redirects to actual image, so we need to follow redirects
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = require("fs").createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err: Error) => {
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(30000, () => {
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
  // Return a data URL with gradient
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
