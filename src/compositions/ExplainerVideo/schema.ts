import { z } from "zod";

export const ScriptSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const ExplainerScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  sections: z.array(ScriptSectionSchema),
  outro: z.string(),
});

export const ExplainerVideoSchema = z.object({
  topic: z.string(),
  script: ExplainerScriptSchema,
  colorScheme: z.enum(["default", "warm", "cool", "dark"]).optional(),
  accentColor: z.string().optional(),
});

export type ExplainerVideoProps = z.infer<typeof ExplainerVideoSchema>;
