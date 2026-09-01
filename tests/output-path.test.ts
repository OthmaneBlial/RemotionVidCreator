import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createVideoOutputPath, slugifyVideoName } from "../src/utils/output-path.js";

test("slugifyVideoName creates readable, portable file stems", () => {
  assert.equal(slugifyVideoName("  Énergie solaire : pourquoi ?  "), "energie-solaire-pourquoi");
  assert.equal(slugifyVideoName("I fixed this bug in 10 seconds… here’s how"), "i-fixed-this-bug-in-10-seconds-here-s-how");
  assert.equal(slugifyVideoName("🎬🎬🎬"), "ai-video");
});

test("createVideoOutputPath cannot escape the output directory", () => {
  const outputDirectory = path.resolve("output", "ai-mode");
  const outputPath = createVideoOutputPath(outputDirectory, "../../../../tmp/owned; echo nope", 1234);

  assert.equal(path.dirname(outputPath), outputDirectory);
  assert.equal(path.basename(outputPath), "tmp-owned-echo-nope-1234.mp4");
});
