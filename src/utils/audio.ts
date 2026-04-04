import * as crypto from "crypto";

export interface GeneratedAudioTrack {
  src: string;
  durationSeconds: number;
  mood: string;
}

/**
 * Generate a lightweight ambient WAV bed for a topic.
 * This gives the AI mode a real audio track without extra runtime dependencies.
 */
export async function generateAmbientAudioTrack(
  topic: string,
  durationSeconds: number,
  mood = "Cinematic ambient pulse with subtle tension and forward motion"
): Promise<GeneratedAudioTrack> {
  const wavBuffer = createAmbientWav(topic, durationSeconds, mood);
  const base64 = wavBuffer.toString("base64");
  const src = `data:audio/wav;base64,${base64}`;

  return {
    src,
    durationSeconds,
    mood,
  };
}

function createAmbientWav(topic: string, durationSeconds: number, mood: string): Buffer {
  const sampleRate = 22050;
  const channels = 1;
  const totalSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  const seed = crypto.createHash("sha256").update(`${topic}:${mood}`).digest();
  const baseFrequency = 82 + (seed[0] % 48);
  const harmonyOffset = (seed[1] % 7) - 3;
  const swingRate = 0.15 + (seed[2] % 6) * 0.03;
  const phase = (seed[3] / 255) * Math.PI * 2;

  writeWavHeader(buffer, totalSamples, channels, sampleRate, bytesPerSample);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / durationSeconds;

    const motifStep = Math.floor(t / 0.75) % 4;
    const noteShift = [0, 3, 7, 10][motifStep];
    const currentFrequency = baseFrequency * Math.pow(2, (noteShift + harmonyOffset) / 12);

    const lowPad = Math.sin(2 * Math.PI * currentFrequency * 0.5 * t + phase) * 0.22;
    const pulse = Math.sin(2 * Math.PI * swingRate * t + phase) * 0.08;
    const shimmer = Math.sin(2 * Math.PI * currentFrequency * 1.997 * t) * 0.06;
    const tone = Math.sin(2 * Math.PI * currentFrequency * t) * 0.18;
    const bass = Math.sin(2 * Math.PI * (currentFrequency * 0.25) * t) * 0.24;
    const noise = (((seed[(i * 7) % seed.length] ?? 128) / 255) - 0.5) * 0.02;
    const fade = Math.min(1, Math.min(progress * 4, (1 - progress) * 5));

    const sample = clampSample((tone + bass + lowPad + shimmer + pulse + noise) * fade);
    buffer.writeInt16LE(Math.floor(sample * 32767), offset);
    offset += 2;
  }

  return buffer;
}

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function writeWavHeader(
  buffer: Buffer,
  totalSamples: number,
  channels: number,
  sampleRate: number,
  bytesPerSample: number
) {
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
}
