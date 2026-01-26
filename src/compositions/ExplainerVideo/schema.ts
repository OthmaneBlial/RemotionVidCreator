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
});

export type ExplainerVideoProps = z.infer<typeof ExplainerVideoSchema>;
export type SlideImage = z.infer<typeof SlideImageSchema>;
