import { z } from "zod";

export const ScriptSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  imageKeywords: z.array(z.string()).optional(),
});

export const ExplainerScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  sections: z.array(ScriptSectionSchema),
  outro: z.string(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  topicImages: z.array(z.string()).optional(),
  audioMood: z.string().optional(),
  estimatedDurationSeconds: z.number().optional(),
  cta: z.string().optional(),
  creativeDirection: z
    .object({
      stylePreset: z.enum(["cinematic", "educational", "bold", "playful", "premium", "documentary"]),
      audience: z.enum([
        "general",
        "beginners",
        "students",
        "creators",
        "founders",
        "executives",
        "professionals",
      ]),
      platform: z.enum(["tiktok", "reels", "shorts", "vertical"]),
      intensity: z.enum(["safe", "balanced", "wild"]),
      motionLevel: z.enum(["minimal", "medium", "high"]),
      visualDensity: z.enum(["minimal", "balanced", "rich"]),
      typography: z.string(),
      palette: z.string(),
      narrativeTemplate: z.enum([
        "problem-solution",
        "myth-busting",
        "timeline",
        "comparison",
        "transformation",
      ]),
    })
    .optional(),
  scenePlan: z
    .array(
      z.object({
        title: z.string(),
        purpose: z.string(),
        emotion: z.string(),
        visualDirection: z.string(),
        cameraMotion: z.string(),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export const SlideImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
  author: z.string().optional(),
  authorUrl: z.string().optional(),
});

export const AudioTrackSchema = z.object({
  src: z.string(),
  volume: z.number().optional(),
});

export const ExplainerVideoSchema = z.object({
  topic: z.string(),
  script: ExplainerScriptSchema,
  colorScheme: z.enum(["default", "warm", "cool", "dark"]).optional(),
  accentColor: z.string().optional(),
  images: z.array(SlideImageSchema).optional(),
  audio: AudioTrackSchema.optional(),
  targetDurationSeconds: z.number().positive().optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5", "4:3"]).optional(),
  fontSizeScale: z.number().optional(),
  stylePreset: z.enum(["cinematic", "educational", "bold", "playful", "premium", "documentary"]).optional(),
  audience: z
    .enum(["general", "beginners", "students", "creators", "founders", "executives", "professionals"])
    .optional(),
  platform: z.enum(["tiktok", "reels", "shorts", "vertical"]).optional(),
  intensity: z.enum(["safe", "balanced", "wild"]).optional(),
  motionLevel: z.enum(["minimal", "medium", "high"]).optional(),
  visualDensity: z.enum(["minimal", "balanced", "rich"]).optional(),
});

export type ExplainerVideoProps = z.infer<typeof ExplainerVideoSchema>;
export type SlideImage = z.infer<typeof SlideImageSchema>;
export type AudioTrack = z.infer<typeof AudioTrackSchema>;
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "4:3";
