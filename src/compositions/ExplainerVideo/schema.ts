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
});

export const SlideImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
  author: z.string().optional(),
});

export const ExplainerVideoSchema = z.object({
  topic: z.string(),
  script: ExplainerScriptSchema,
  colorScheme: z.enum(["default", "warm", "cool", "dark"]).optional(),
  accentColor: z.string().optional(),
  images: z.array(SlideImageSchema).optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5", "4:3"]).optional(),
  fontSizeScale: z.number().optional(),
});

export type ExplainerVideoProps = z.infer<typeof ExplainerVideoSchema>;
export type SlideImage = z.infer<typeof SlideImageSchema>;
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "4:3";
