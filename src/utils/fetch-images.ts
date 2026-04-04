export interface FetchedImage {
  url: string;
  width: number;
  height: number;
  author?: string;
  authorUrl?: string;
  source?: string;
}

function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitKeywords(topic: string): string[] {
  const normalized = normalizeTopic(topic);
  const words = normalized.split(" ").filter(Boolean);
  const pairs: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`);
  }

  const related: Record<string, string[]> = {
    solar: ["solar panels", "renewable energy", "clean power", "sunlight"],
    energy: ["renewable energy", "power grid", "electricity", "sustainability"],
    ai: ["artificial intelligence", "technology", "data", "automation"],
    climate: ["environment", "nature", "green energy", "sustainability"],
    business: ["startup", "office", "strategy", "growth"],
    health: ["wellness", "medicine", "medical", "care"],
  };

  const expanded = [...words, ...pairs];
  for (const [needle, values] of Object.entries(related)) {
    if (normalized.includes(needle)) {
      expanded.push(...values);
    }
  }

  return [...new Set(expanded)].slice(0, 12);
}

function buildSourceUrls(topic: string, count: number, width: number, height: number): FetchedImage[] {
  const keywords = splitKeywords(topic);
  const seed = Date.now();

  return Array.from({ length: count }, (_, index) => {
    const keyword = keywords[index % keywords.length] || normalizeTopic(topic) || "abstract";
    const lock = seed + index;
    const tag = encodeURIComponent(keyword.replace(/\s+/g, ","));

    // Use direct remote URLs so Remotion can fetch them at render time.
    const url = index % 2 === 0
      ? `https://loremflickr.com/${width}/${height}/${tag}?lock=${lock}`
      : `https://picsum.photos/seed/${encodeURIComponent(`${keyword}-${lock}`)}/${width}/${height}`;

    return {
      url,
      width,
      height,
      source: index % 2 === 0 ? "loremflickr" : "picsum",
    };
  });
}

/**
 * Fetch free images using remote URLs only.
 * This avoids downloading into /public at runtime, which breaks Remotion bundles.
 */
export async function fetchFreeImages(
  topic: string,
  count = 5,
  width = 1080,
  height = 1920
): Promise<FetchedImage[]> {
  console.log(`🖼️  Preparing ${count} remote images...`);
  return buildSourceUrls(topic, count, width, height);
}

// Keep backward compatibility
export const fetchUnsplashImages = fetchFreeImages;

/**
 * Get image keywords for a topic section
 */
export function getImageKeywords(topic: string, sectionTitle?: string): string[] {
  const keywords = splitKeywords(topic);

  if (sectionTitle) {
    keywords.unshift(sectionTitle);
  }

  return [...new Set(keywords)];
}
