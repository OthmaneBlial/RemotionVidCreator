import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { ExplainerScript } from "./generate-script";
import type { UnsplashImage } from "./unsplash";

export type VisualSource = "offline" | "online" | "auto";

export interface OfflineAssetImage {
  src: string;
  alt?: string;
  author?: string;
  authorUrl?: string;
  source?: string;
  sourceUrl?: string;
  keywords?: string[];
  photoId?: string;
  sourceQuery?: string;
}

export interface OfflineAssetCategory {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  images: OfflineAssetImage[];
}

interface OfflineAssetManifest {
  version: number;
  updatedAt?: string;
  categories: OfflineAssetCategory[];
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ASSET_ROOT = path.join(PUBLIC_DIR, "assets", "offline-images");
const MANIFEST_FILE = path.join(ASSET_ROOT, "manifest.json");
const DEFAULT_CATEGORY = "technology";
const UTM_SOURCE = process.env.UNSPLASH_UTM_SOURCE?.trim() || "remotion-ai-video-generator";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48) || "asset";
}

function buildProfileUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    url.searchParams.set("utm_source", UTM_SOURCE);
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    return value;
  }
}

async function readManifest(): Promise<OfflineAssetManifest> {
  const raw = await fs.readFile(MANIFEST_FILE, "utf8");
  const manifest = JSON.parse(raw) as OfflineAssetManifest;
  if (!Array.isArray(manifest.categories)) {
    throw new Error("Offline image manifest is invalid.");
  }
  return manifest;
}

async function writeManifest(manifest: OfflineAssetManifest): Promise<void> {
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  manifest.updatedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

function categoryScore(category: OfflineAssetCategory, topic: string, script: ExplainerScript): number {
  const haystack = normalize(
    [
      topic,
      script.title,
      script.hook,
      script.outro,
      ...script.sections.flatMap((section) => [section.title, section.content, ...(section.imageKeywords ?? [])]),
      ...(script.topicImages ?? []),
    ].join(" ")
  );

  const keywords = [category.id, category.label, ...(category.keywords ?? [])].map(normalize);
  return keywords.reduce((score, keyword) => {
    if (!keyword) {
      return score;
    }
    return haystack.includes(keyword) ? score + keyword.split(" ").length : score;
  }, 0);
}

function pickCategory(
  manifest: OfflineAssetManifest,
  categoryId: string | undefined,
  topic: string,
  script: ExplainerScript
): OfflineAssetCategory {
  const available = manifest.categories.filter((category) => category.images.length > 0);
  if (available.length === 0) {
    throw new Error("No offline image assets are available.");
  }

  if (categoryId && categoryId !== "auto") {
    return available.find((category) => category.id === categoryId) ?? available[0];
  }

  return [...available].sort((a, b) => categoryScore(b, topic, script) - categoryScore(a, topic, script))[0];
}

export async function listOfflineAssetCategories(): Promise<OfflineAssetCategory[]> {
  const manifest = await readManifest();
  return manifest.categories;
}

export async function fetchOfflineImages(
  topic: string,
  script: ExplainerScript,
  count = 5,
  categoryId = "auto"
): Promise<UnsplashImage[]> {
  const manifest = await readManifest();
  const category = pickCategory(manifest, categoryId, topic, script);
  const images = category.images;

  return Array.from({ length: count }, (_, index) => {
    const image = images[index % images.length];
    return {
      src: image.src,
      alt: image.alt || `${category.label} visual`,
      author: image.author || "",
      authorUrl: buildProfileUrl(image.authorUrl) || "",
      photoId: image.photoId || `${category.id}-${index % images.length}`,
      sourceQuery: category.label,
    };
  });
}

async function downloadImage(url: string, destination: string): Promise<boolean> {
  const response = await fetch(url);
  if (!response.ok) {
    return false;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
  return true;
}

/**
 * Adds API-picked images to the reusable local library. The manifest is always
 * updated with metadata. Binary downloads are opt-in because API production
 * review expects API-rendered images to keep using Unsplash CDN URLs.
 */
export async function rememberOnlineImages(
  images: UnsplashImage[],
  topic: string,
  categoryId = "auto",
  saveLocalCopies = false
): Promise<void> {
  if (images.length === 0) {
    return;
  }

  const manifest = await readManifest();
  const normalizedCategoryId = categoryId && categoryId !== "auto" ? categoryId : slugify(topic);
  let category = manifest.categories.find((item) => item.id === normalizedCategoryId);

  if (!category) {
    category = {
      id: normalizedCategoryId || DEFAULT_CATEGORY,
      label: normalizedCategoryId
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      description: `Saved online visuals for "${topic}".`,
      keywords: normalize(topic).split(" ").filter(Boolean),
      images: [],
    };
    manifest.categories.push(category);
  }

  const known = new Set(category.images.map((image) => image.photoId || image.src));
  for (const image of images) {
    if (known.has(image.photoId) || known.has(image.src)) {
      continue;
    }

    let src = image.src;
    if (saveLocalCopies) {
      const filename = `${slugify(image.sourceQuery || topic)}-${image.photoId || crypto.randomUUID()}.jpg`;
      const relativePath = path.posix.join("assets", "offline-images", category.id, filename);
      const destination = path.join(PUBLIC_DIR, relativePath);
      if (await downloadImage(image.src, destination)) {
        src = relativePath;
      }
    }

    category.images.push({
      src,
      alt: image.alt,
      author: image.author,
      authorUrl: buildProfileUrl(image.authorUrl),
      source: "unsplash",
      sourceUrl: buildProfileUrl(image.authorUrl),
      photoId: image.photoId,
      sourceQuery: image.sourceQuery,
      keywords: normalize(`${topic} ${image.sourceQuery}`).split(" ").filter(Boolean),
    });
  }

  await writeManifest(manifest);
}
