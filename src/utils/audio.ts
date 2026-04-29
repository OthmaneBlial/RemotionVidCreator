import * as crypto from "crypto";

export interface GeneratedAudioTrack {
  src: string;
  durationSeconds: number;
  mood: string;
  volume: number;
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
    volume: 0.18,
  };
}

function createAmbientWav(topic: string, durationSeconds: number, mood: string): Buffer {
  const sampleRate = 16000;
  const channels = 1;
  const totalSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  const seed = crypto.createHash("sha256").update(`${topic}:${mood}`).digest();
  const baseFrequency = 110 + (seed[0] % 18);
  const harmonyOffset = (seed[1] % 2) === 0 ? 4 : 3;
  const fifthOffset = 7;
  const pulseRate = 0.08 + (seed[2] % 4) * 0.02;
  const phase = (seed[3] / 255) * Math.PI * 2;

  writeWavHeader(buffer, totalSamples, channels, sampleRate, bytesPerSample);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / durationSeconds;

    const root = Math.sin(2 * Math.PI * baseFrequency * t + phase) * 0.2;
    const third = Math.sin(2 * Math.PI * baseFrequency * Math.pow(2, harmonyOffset / 12) * t + phase * 0.7) * 0.13;
    const fifth = Math.sin(2 * Math.PI * baseFrequency * Math.pow(2, fifthOffset / 12) * t + phase * 0.4) * 0.1;
    const bass = Math.sin(2 * Math.PI * (baseFrequency * 0.5) * t + phase) * 0.18;
    const pulse = 0.92 + Math.sin(2 * Math.PI * pulseRate * t + phase) * 0.08;
    const fade = Math.min(1, Math.min(progress * 5, (1 - progress) * 5));

    const sample = clampSample((root + third + fifth + bass) * pulse * fade * 0.45);
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
