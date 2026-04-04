import "./load-env.js";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { ExplainerScript } from "./generate-script";

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description?: string | null;
  alt_description?: string | null;
  blur_hash?: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

export interface UnsplashImage {
  src: string;
  alt: string;
  author: string;
  authorUrl: string;
  photoId: string;
  sourceQuery: string;
}

interface RateLimitState {
  windowStart: number;
  requestCount: number;
}

interface CacheEntry {
  savedAt: number;
  photos: UnsplashPhoto[];
}

const WINDOW_MS = 60 * 60 * 1000;
const REQUEST_LIMIT = 50;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), ".cache");
const RATE_LIMIT_FILE = path.join(CACHE_DIR, "unsplash-rate-limit.json");
const CACHE_FILE = path.join(CACHE_DIR, "unsplash-search-cache.json");

const lock = createMutex();

function getAccessKey(): string {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error(
      "UNSPLASH_ACCESS_KEY is required for Unsplash image search. Set it in your environment."
    );
  }
  return accessKey;
}

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQueryVariants(topic: string, script: ExplainerScript): string[] {
  const base = normalizeQuery(topic);
  const sectionQueries = script.sections
    .map((section) => normalizeQuery(`${topic} ${section.title}`))
    .filter(Boolean);

  const keywords = new Set<string>([
    base,
    ...sectionQueries,
    ...script.topicImages?.map(normalizeQuery).filter(Boolean) ?? [],
  ]);

  if (script.sections.length > 0) {
    keywords.add(normalizeQuery(`${topic} overview`));
  }

  return [...keywords].slice(0, 3);
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await ensureCacheDir();
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

function createMutex() {
  let chain = Promise.resolve();

  return async function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = chain;
    let release!: () => void;
    chain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

async function reserveRequests(requestsNeeded: number): Promise<{ remaining: number; resetAt: number }> {
  return lock(async () => {
    const now = Date.now();
    const current = await readJsonFile<RateLimitState>(RATE_LIMIT_FILE, {
      windowStart: now,
      requestCount: 0,
    });

    const windowExpired = now - current.windowStart >= WINDOW_MS;
    const state: RateLimitState = windowExpired
      ? { windowStart: now, requestCount: 0 }
      : current;

    if (state.requestCount + requestsNeeded > REQUEST_LIMIT) {
      const remaining = Math.max(0, REQUEST_LIMIT - state.requestCount);
      const resetAt = state.windowStart + WINDOW_MS;
      throw new Error(
        `Unsplash request budget exceeded. Remaining this hour: ${remaining}. Reset at ${new Date(
          resetAt
        ).toLocaleTimeString()}.`
      );
    }

    state.requestCount += requestsNeeded;
    await writeJsonFile(RATE_LIMIT_FILE, state);

    return {
      remaining: REQUEST_LIMIT - state.requestCount,
      resetAt: state.windowStart + WINDOW_MS,
    };
  });
}

async function getCachedPhotos(cacheKey: string): Promise<UnsplashPhoto[] | null> {
  const cache = await readJsonFile<Record<string, CacheEntry>>(CACHE_FILE, {});
  const entry = cache[cacheKey];
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    return null;
  }

  return entry.photos;
}

async function setCachedPhotos(cacheKey: string, photos: UnsplashPhoto[]) {
  const cache = await readJsonFile<Record<string, CacheEntry>>(CACHE_FILE, {});
  cache[cacheKey] = { savedAt: Date.now(), photos };
  await writeJsonFile(CACHE_FILE, cache);
}

async function searchPhotos(query: string, perPage: number): Promise<UnsplashPhoto[]> {
  const cacheKey = crypto
    .createHash("sha256")
    .update(JSON.stringify({ query, perPage }))
    .digest("hex");

  const cached = await getCachedPhotos(cacheKey);
  if (cached) {
    return cached;
  }

  await reserveRequests(1);

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", "1");
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("order_by", "relevant");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${getAccessKey()}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unsplash search failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { results?: UnsplashPhoto[] };
  const photos = data.results ?? [];
  await setCachedPhotos(cacheKey, photos);

  return photos;
}

async function trackDownload(downloadLocation: string): Promise<void> {
  if (!downloadLocation) {
    return;
  }

  await reserveRequests(1);

  const response = await fetch(downloadLocation, {
    headers: {
      Authorization: `Client-ID ${getAccessKey()}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unsplash download tracking failed (${response.status}): ${text}`);
  }
}

function buildPhotoUrl(photo: UnsplashPhoto, width: number, height: number): string {
  const raw = new URL(photo.urls.raw);
  raw.searchParams.set("w", String(width));
  raw.searchParams.set("h", String(height));
  raw.searchParams.set("fit", "crop");
  raw.searchParams.set("crop", "entropy");
  raw.searchParams.set("q", "80");
  raw.searchParams.set("fm", "jpg");
  return raw.toString();
}

function dedupePhotos(photos: UnsplashPhoto[]): UnsplashPhoto[] {
  const seen = new Set<string>();
  const unique: UnsplashPhoto[] = [];

  for (const photo of photos) {
    if (seen.has(photo.id)) {
      continue;
    }
    seen.add(photo.id);
    unique.push(photo);
  }

  return unique;
}

/**
 * Build a topic-aware set of Unsplash images for the AI mode renderer.
 * Search calls are cached locally, and all requests are counted against a strict
 * 50-request/hour budget.
 */
export async function fetchUnsplashImages(
  topic: string,
  script: ExplainerScript,
  count = 10,
  width = 1080,
  height = 1920
): Promise<UnsplashImage[]> {
  const queryVariants = buildQueryVariants(topic, script);
  const perQueryTarget = Math.max(1, Math.ceil(count / Math.max(1, queryVariants.length)));

  const collected: UnsplashImage[] = [];
  const usedPhotoIds = new Set<string>();

  for (const query of queryVariants) {
    if (collected.length >= count) {
      break;
    }

    const photos = dedupePhotos(await searchPhotos(query, perQueryTarget * 2));
    for (const photo of photos) {
      if (collected.length >= count) {
        break;
      }
      if (usedPhotoIds.has(photo.id)) {
        continue;
      }

      await trackDownload(photo.links.download_location);
      usedPhotoIds.add(photo.id);

      collected.push({
        src: buildPhotoUrl(photo, width, height),
        alt: photo.alt_description || photo.description || topic,
        author: photo.user.name,
        authorUrl: photo.user.links.html,
        photoId: photo.id,
        sourceQuery: query,
      });
    }
  }

  if (collected.length === 0) {
    throw new Error("Unsplash returned no usable photos for this topic.");
  }

  return collected;
}

export async function getUnsplashUsage() {
  return lock(async () => {
    const now = Date.now();
    const current = await readJsonFile<RateLimitState>(RATE_LIMIT_FILE, {
      windowStart: now,
      requestCount: 0,
    });

    const windowExpired = now - current.windowStart >= WINDOW_MS;
    const state: RateLimitState = windowExpired
      ? { windowStart: now, requestCount: 0 }
      : current;

    return {
      used: state.requestCount,
      remaining: Math.max(0, REQUEST_LIMIT - state.requestCount),
      limit: REQUEST_LIMIT,
      resetAt: state.windowStart + WINDOW_MS,
    };
  });
}
