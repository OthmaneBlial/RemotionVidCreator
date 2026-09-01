import path from "path";

export function slugifyVideoName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64) || "ai-video";
}

export function createVideoOutputPath(
  outputDirectory: string,
  prompt: string,
  timestamp = Date.now()
): string {
  const root = path.resolve(outputDirectory);
  const filename = `${slugifyVideoName(prompt)}-${timestamp}.mp4`;
  const outputPath = path.resolve(root, filename);

  if (path.dirname(outputPath) !== root) {
    throw new Error("Refusing to create a video outside the output directory.");
  }

  return outputPath;
}
