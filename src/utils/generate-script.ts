import "./load-env.js";

export interface ScriptSection {
  title: string;
  content: string;
  imageKeywords?: string[]; // Keywords for image search
}

export type StylePreset =
  | "cinematic"
  | "educational"
  | "bold"
  | "playful"
  | "premium"
  | "documentary";

export type Audience =
  | "general"
  | "beginners"
  | "students"
  | "creators"
  | "founders"
  | "executives"
  | "professionals";

export type Platform = "tiktok" | "reels" | "shorts" | "vertical";

export type CreativeIntensity = "safe" | "balanced" | "wild";
export type MotionLevel = "minimal" | "medium" | "high";
export type NarrativeTemplate =
  | "problem-solution"
  | "myth-busting"
  | "timeline"
  | "comparison"
  | "transformation";
export type VisualDensity = "minimal" | "balanced" | "rich";

export interface ScenePlanItem {
  title: string;
  purpose: string;
  emotion: string;
  visualDirection: string;
  cameraMotion: string;
  caption?: string;
}

export interface CreativeDirection {
  stylePreset: StylePreset;
  audience: Audience;
  platform: Platform;
  intensity: CreativeIntensity;
  motionLevel: MotionLevel;
  visualDensity: VisualDensity;
  typography: string;
  palette: string;
  pacing: "calm" | "steady" | "fast";
  motionSignature: string;
  audioMood: string;
  narrativeTemplate: NarrativeTemplate;
}

export interface ExplainerScript {
  title: string;
  hook: string;
  sections: ScriptSection[];
  outro: string;
  // Color scheme suggestions
  primaryColor?: string;
  accentColor?: string;
  // Main topic image keywords
  topicImages?: string[];
  // Suggested background audio mood for the renderer
  audioMood?: string;
  // Approximate speaking time in seconds
  estimatedDurationSeconds?: number;
  creativeDirection?: CreativeDirection;
  scenePlan?: ScenePlanItem[];
  cta?: string;
}

export interface GenerateScriptOptions {
  topic: string;
  tone?:
    | "informative"
    | "casual"
    | "professional"
    | "dramatic"
    | "humorous"
    | "storytelling";
  complexity?: "simple" | "medium" | "detailed";
  targetDurationSeconds?: number;
  useAI?: boolean;
  apiKey?: string;
  stylePreset?: StylePreset;
  audience?: Audience;
  platform?: Platform;
  intensity?: CreativeIntensity;
  motionLevel?: MotionLevel;
  visualDensity?: VisualDensity;
  narrativeTemplate?: NarrativeTemplate;
  goal?: string;
  pacing?: "calm" | "steady" | "fast";
  brief?: string;
  accentColor?: string;
  brandColor?: string;
  audioMood?: string;
  focus?: "full" | "hook" | "middle" | "outro";
}

/**
 * Generate an explainer script for a given topic.
 * Uses Z.ai's Anthropic-compatible API when useAI is true, falls back to Wikipedia + template.
 */
export async function generateScript(
  options: GenerateScriptOptions
): Promise<ExplainerScript> {
  const {
    topic,
    tone = "informative",
    complexity = "medium",
    targetDurationSeconds,
    useAI = false,
    apiKey,
    stylePreset = "cinematic",
    audience = "general",
    platform = "vertical",
    intensity = "balanced",
    motionLevel = "medium",
    visualDensity = "balanced",
    narrativeTemplate = "problem-solution",
    goal,
    pacing = "steady",
    brief,
    accentColor,
    brandColor,
    audioMood,
    focus = "full",
  } = options;

  // Try AI generation if requested
  if (useAI) {
    try {
      console.log("   🤖 Generating script with Z.ai...");
      // If no API key provided, use mock/demo mode
      if (!apiKey) {
        console.log("   🧪 Using DEMO mode (no API key)");
        const script = await generateMockAIScript({
          topic,
          tone,
          complexity,
          targetDurationSeconds,
          stylePreset,
          audience,
          platform,
          intensity,
          motionLevel,
          visualDensity,
          narrativeTemplate,
          goal,
          pacing,
          brief,
          accentColor,
          brandColor,
          audioMood,
          focus,
        });
        console.log("   ✅ Demo script generated successfully");
        return script;
      }
      const script = await generateAIScript(
        topic,
        tone,
        complexity,
        apiKey,
        targetDurationSeconds,
        {
          stylePreset,
          audience,
          platform,
          intensity,
          motionLevel,
          visualDensity,
          narrativeTemplate,
          goal,
          pacing,
          brief,
          accentColor,
          brandColor,
          audioMood,
          focus,
        }
      );
      console.log("   ✅ AI script generated successfully");
      return script;
    } catch (error) {
      console.error("   ⚠️ AI generation failed, falling back to template");
      console.error(`   Error: ${(error as Error).message}`);
    }
  }

  // Fallback: Wikipedia + template
  try {
    // Search for information about the topic
    const searchResults = await searchTopic(topic);

    // Generate script based on search results
    return buildScriptFromSearch(topic, searchResults, tone, complexity, {
      stylePreset,
      audience,
      platform,
      intensity,
      motionLevel,
      visualDensity,
      narrativeTemplate,
      goal,
      pacing,
      brief,
      accentColor,
      brandColor,
      targetDurationSeconds,
      audioMood,
      focus,
    });
  } catch (error) {
    console.error("Error generating script:", error);
    // Fallback to template-based generation
    return generateTemplateScript(topic, {
      stylePreset,
      audience,
      platform,
      intensity,
      motionLevel,
      visualDensity,
      narrativeTemplate,
      goal,
      pacing,
      brief,
      accentColor,
      brandColor,
      targetDurationSeconds,
      tone,
      audioMood,
      focus,
    });
  }
}

/**
 * Generate mock AI script (demo mode without API key)
 * This simulates what Z.ai would return
 */
async function generateMockAIScript(options: {
  topic: string;
  tone: string;
  complexity: string;
  targetDurationSeconds?: number;
  stylePreset: StylePreset;
  audience: Audience;
  platform: Platform;
  intensity: CreativeIntensity;
  motionLevel: MotionLevel;
  visualDensity: VisualDensity;
  narrativeTemplate: NarrativeTemplate;
  goal?: string;
  pacing?: "calm" | "steady" | "fast";
  brief?: string;
  accentColor?: string;
  brandColor?: string;
  audioMood?: string;
  focus?: "full" | "hook" | "middle" | "outro";
}): Promise<ExplainerScript> {
  const {
    topic,
    tone,
    complexity,
    targetDurationSeconds,
    stylePreset,
    audience,
    platform,
    intensity,
    motionLevel,
    visualDensity,
    narrativeTemplate,
    goal,
    pacing,
    brief,
    accentColor,
    brandColor,
    audioMood,
    focus,
  } = options;

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const direction = buildCreativeDirection({
    topic,
    stylePreset,
    audience,
    platform,
    intensity,
    motionLevel,
    visualDensity,
    narrativeTemplate,
    tone,
    brief,
  });
  const palette = generateColorScheme(topic, stylePreset, accentColor || brandColor);

  const toneHookBank: Record<string, string[]> = {
    humorous: [
      `Everyone pretends to understand ${topic}. Today, you actually will.`,
      `If ${topic} has been sounding like corporate fog, this fixes that.`,
      `Let's make ${topic} feel way less mysterious than it sounds.`,
    ],
    storytelling: [
      `It started as a small idea. Now ${topic} is shaping the bigger story.`,
      `The rise of ${topic} is a story of timing, pressure, and change.`,
      `Every big shift has a beginning. ${topic} is having its moment.`,
    ],
    dramatic: [
      `Stop scrolling. ${topic} is changing the rules faster than most people realize.`,
      `What looks ordinary today could rewrite everything tomorrow: ${topic}.`,
      `Once you see ${topic} clearly, you can't unsee what it changes.`,
    ],
    informative: [
      `${topic} is everywhere right now, but most explanations miss the point.`,
      `Here's the version of ${topic} that actually makes sense.`,
      `Let’s break down ${topic} without the jargon or filler.`,
    ],
    casual: [
      `So you keep hearing about ${topic}. Here's the version that actually lands.`,
      `Let's make ${topic} simple enough to remember later.`,
      `If ${topic} has felt confusing, this should clean it up.`,
    ],
    professional: [
      `Here’s a concise, practical look at ${topic} and why it matters now.`,
      `Let’s examine ${topic} through a clear, decision-ready lens.`,
      `This is ${topic}, explained with enough depth to be useful.`,
    ],
  };

  const sectionTemplates = buildSectionTemplates(topic, tone, complexity, direction, brief, goal, pacing);
  const mockScript = {
    title: topic,
    hook: emphasizeHook(pick(toneHookBank[tone] || toneHookBank.informative), focus),
    sections: sectionTemplates.map((section, index) => ({
      ...section,
      imageKeywords: generateImageKeywords(topic, section.title, direction.stylePreset, direction.audience, String(index + 1)),
    })),
    outro: buildOutro(topic, tone, direction),
    cta: direction.platform === "shorts" ? `Subscribe for more on ${topic}` : `Follow for more`,
    scenePlan: buildScenePlan(topic, sectionTemplates, direction),
    creativeDirection: {
      ...direction,
      palette: palette.paletteName,
    },
    primaryColor: palette.primaryColor,
    accentColor: palette.accentColor,
    topicImages: generateImageKeywords(topic, "overview", "concept", direction.stylePreset, direction.audience),
    audioMood: audioMood || buildAudioMood(direction),
    estimatedDurationSeconds: targetDurationSeconds,
  } satisfies ExplainerScript;

  return {
    ...mockScript,
    primaryColor: mockScript.primaryColor || palette.primaryColor,
    accentColor: mockScript.accentColor || palette.accentColor,
  };
}

/**
 * Generate script using Z.ai's Anthropic-compatible API
 */
async function generateAIScript(
  topic: string,
  tone: string,
  complexity: string,
  apiKey: string,
  targetDurationSeconds?: number,
  creative?: {
    stylePreset: StylePreset;
    audience: Audience;
    platform: Platform;
    intensity: CreativeIntensity;
    motionLevel: MotionLevel;
    visualDensity: VisualDensity;
    narrativeTemplate: NarrativeTemplate;
    motionSignature?: string;
    goal?: string;
    pacing?: "calm" | "steady" | "fast";
    brief?: string;
    accentColor?: string;
    brandColor?: string;
    audioMood?: string;
    focus?: "full" | "hook" | "middle" | "outro";
  }
): Promise<ExplainerScript> {
  const prompt = buildAIPrompt(topic, tone, complexity, targetDurationSeconds, creative);
  const baseUrl = process.env.ZAI_BASE_URL || "https://api.z.ai/api/anthropic";
  const model = process.env.ZAI_MODEL || "claude-sonnet-4-20250514";
  const maxTokens = targetDurationSeconds && targetDurationSeconds <= 10 ? 700 : 2200;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || process.env.ZAI_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.35,
      system: "Return concise JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Z.ai API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";

  return parseAIResponse(content, topic, tone, creative);
}

/**
 * Build the prompt for AI script generation
 */
function buildAIPrompt(
  topic: string,
  tone: string,
  complexity: string,
  targetDurationSeconds?: number,
  creative?: {
    stylePreset: StylePreset;
    audience: Audience;
    platform: Platform;
    intensity: CreativeIntensity;
    motionLevel: MotionLevel;
    visualDensity: VisualDensity;
    narrativeTemplate: NarrativeTemplate;
    motionSignature?: string;
    goal?: string;
    pacing?: "calm" | "steady" | "fast";
    brief?: string;
    accentColor?: string;
    brandColor?: string;
    audioMood?: string;
    focus?: "full" | "hook" | "middle" | "outro";
  }
): string {
  const toneInstructions: Record<string, string> = {
    informative: "educational and clear, perfect for learning",
    casual: "conversational and friendly, like explaining to a friend",
    professional: "polished and business-appropriate",
    dramatic: "intense and attention-grabbing, with powerful statements",
    humorous: "funny and entertaining while still being informative",
    storytelling: "narrative-driven, like telling a compelling story",
  };

  const complexityInstructions: Record<string, string> = {
    simple: "Keep it simple. Avoid jargon. Explain like I'm 12.",
    medium: "Balanced depth. Some details but not overwhelming.",
    detailed: "Comprehensive. Go deep into nuances and specifics.",
  };

  const creativeDirection = creative
    ? `- Style preset: ${creative.stylePreset}
- Audience: ${creative.audience}
- Platform: ${creative.platform}
- Intensity: ${creative.intensity}
- Motion level: ${creative.motionLevel}
- Visual density: ${creative.visualDensity}
- Narrative template: ${creative.narrativeTemplate}
- Motion signature: ${creative.motionSignature || "steady cinematic motion"}
- Goal: ${creative.goal || "not specified"}
- Pacing: ${creative.pacing || "steady"}
- Audio feel: ${creative.audioMood || "auto"}
- Optional brief: ${creative.brief || "none"}
- Brand color: ${creative.brandColor || "auto"}
- Accent color: ${creative.accentColor || "auto"}`
    : "- Style preset: cinematic\n- Audience: general\n- Platform: vertical\n- Intensity: balanced\n- Motion level: medium\n- Visual density: balanced\n- Narrative template: problem-solution";
  const focusLine = creative?.focus ? `- Regeneration focus: ${creative.focus}` : "- Regeneration focus: full";
  const audioMoodLine = creative?.audioMood ? `- Audio mood: ${creative.audioMood}` : "- Audio mood: auto";

  return `You are an expert scriptwriter for premium short-form videos.

Create an engaging explainer video script about: **${topic}**

**Style Requirements:**
- Tone: ${toneInstructions[tone] || toneInstructions.informative}
- Complexity: ${complexityInstructions[complexity] || complexityInstructions.medium}
- Duration: ${targetDurationSeconds ? `about ${targetDurationSeconds} seconds` : "~60-90 seconds of spoken content"}
- Format: Vertical-first video
${creativeDirection}
${focusLine}
${audioMoodLine}

**Script Structure:**
1. HOOK - Grab attention in the first 2 seconds. Make it irresistible.
2. SECTION 1 - Explain the core idea clearly.
3. SECTION 2 - Show why it matters in the real world.
4. SECTION 3 - Add the strongest takeaway or contrast.
5. OUTRO - End with a crisp CTA that matches the platform.

**Content Guidelines:**
- Hook must be provocative or intriguing
- Each section should be 2-3 sentences max
- Use simple, punchy language
- Include specific examples when possible
- Make it memorable and shareable
- Avoid clichés unless used intentionally
- Make the story feel tailored to the audience
- Keep the pacing aligned with the requested speed
- Shape the payoff around the stated goal
- Make the visuals feel deliberate, not generic
- Add a short audio mood line for a background bed
- Add image keyword ideas for each section and topic
- Add a scene plan with visual direction and camera motion
- Add creative direction metadata
- If duration is very short, keep it extremely tight with one hook and one compact section

**Response Format (JSON):**
\`\`\`json
{
  "title": "Catchy Title",
  "hook": "The hook text here...",
  "sections": [
    {
      "title": "What is it?",
      "content": "Content here..."
    },
    {
      "title": "Why does it matter?",
      "content": "Content here..."
    },
    {
      "title": "Key takeaway",
      "content": "Content here..."
    }
  ],
  "outro": "Outro text here...",
  "audioMood": "One short line describing the background audio bed",
  "cta": "Short call to action",
    "creativeDirection": {
    "stylePreset": "${creative?.stylePreset || "cinematic"}",
    "audience": "${creative?.audience || "general"}",
    "platform": "${creative?.platform || "vertical"}",
    "intensity": "${creative?.intensity || "balanced"}",
    "motionLevel": "${creative?.motionLevel || "medium"}",
    "visualDensity": "${creative?.visualDensity || "balanced"}",
    "typography": "Short phrase describing typography",
    "palette": "Short phrase describing palette",
    "narrativeTemplate": "${creative?.narrativeTemplate || "problem-solution"}",
    "pacing": "${creative?.pacing || "steady"}",
    "motionSignature": "Short phrase describing motion language",
    "audioMood": "Short phrase describing audio feel"
  },
  "scenePlan": [
    {
      "title": "Scene title",
      "purpose": "What this scene accomplishes",
      "emotion": "What the viewer should feel",
      "visualDirection": "What should appear on screen",
      "cameraMotion": "Zoom in, pan, or hold",
      "caption": "Optional caption line"
    }
  ],
  "estimatedDurationSeconds": ${targetDurationSeconds ?? 75}
}
\`\`\`

Generate the script now. Return ONLY the JSON, no other text.`;
}

/**
 * Parse AI response into ExplainerScript
 */
function parseAIResponse(
  content: string,
  topic: string,
  tone: string,
  creative?: {
    stylePreset: StylePreset;
    audience: Audience;
    platform: Platform;
    intensity: CreativeIntensity;
    motionLevel: MotionLevel;
    visualDensity: VisualDensity;
    narrativeTemplate: NarrativeTemplate;
    goal?: string;
    pacing?: "calm" | "steady" | "fast";
    brief?: string;
    accentColor?: string;
    brandColor?: string;
    audioMood?: string;
    focus?: "full" | "hook" | "middle" | "outro";
  }
): ExplainerScript {
  try {
    // Try to extract JSON from markdown code blocks
    let jsonContent = content;

    // Extract from code blocks if present
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    } else {
      // Try to find JSON object directly
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonContent = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonContent);

    // Validate structure
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error("Invalid script structure");
    }

    // Generate color scheme based on topic
    const palette = generateColorScheme(topic, creative?.stylePreset, creative?.accentColor || creative?.brandColor);
    const fallbackCreativeDirection = buildCreativeDirection({
      topic,
      tone,
      stylePreset: creative?.stylePreset || "cinematic",
      audience: creative?.audience || "general",
      platform: creative?.platform || "vertical",
      intensity: creative?.intensity || "balanced",
      motionLevel: creative?.motionLevel || "medium",
      visualDensity: creative?.visualDensity || "balanced",
      narrativeTemplate: creative?.narrativeTemplate || "problem-solution",
      brief: creative?.brief,
    });
    const creativeDirection = parsed.creativeDirection
      ? {
          ...fallbackCreativeDirection,
          ...parsed.creativeDirection,
        }
      : fallbackCreativeDirection;
    const sections = parsed.sections.map((section: any, index: number) => ({
      title: section.title || `Section ${index + 1}`,
      content: section.content || "",
      imageKeywords: section.imageKeywords?.length
        ? section.imageKeywords
        : generateImageKeywords(topic, section.title, creativeDirection.stylePreset, creativeDirection.audience),
    }));

    return {
      title: parsed.title || topic,
      hook: emphasizeHook(parsed.hook || generateHook(topic, tone), creative?.focus),
      sections,
      outro: parsed.outro || generateOutro(topic, tone),
      cta: parsed.cta || buildDefaultCTA(creativeDirection),
      creativeDirection,
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
      topicImages: parsed.topicImages?.length
        ? parsed.topicImages
        : generateImageKeywords(topic, "overview", "landscape", "intro", creativeDirection.stylePreset),
      audioMood: creative?.audioMood || parsed.audioMood || buildAudioMood(creativeDirection),
      estimatedDurationSeconds: parsed.estimatedDurationSeconds,
      scenePlan: Array.isArray(parsed.scenePlan) && parsed.scenePlan.length > 0
        ? parsed.scenePlan
        : buildScenePlan(topic, sections, creativeDirection),
    };
  } catch (error) {
    console.error("Failed to parse AI response, falling back to template");
    throw error;
  }
}

async function searchTopic(topic: string): Promise<string[]> {
  // Try multiple search sources in parallel for speed and reliability
  const searchPromises = [
    // Primary: Wikipedia API
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout (faster)

        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          topic
        )}&format=json&origin=*`;

        const response = await fetch(searchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.query?.search) {
          return data.query.search.map((result: any) => result.snippet);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("   Wikipedia search timed out");
        }
      }
      return null;
    })(),
    // Fallback: Use template immediately if Wikipedia fails
    Promise.resolve(null),
  ];

  // Race between sources - use first successful result
  for (const promise of searchPromises) {
    const result = await promise;
    if (result && result.length > 0) {
      return result;
    }
  }

  console.log("   Using template-based script");
  return [];
}

function buildScriptFromSearch(
  topic: string,
  searchResults: string[],
  tone: string,
  complexity: string,
  creative?: {
    stylePreset: StylePreset;
    audience: Audience;
    platform: Platform;
    intensity: CreativeIntensity;
    motionLevel: MotionLevel;
    visualDensity: VisualDensity;
    narrativeTemplate: NarrativeTemplate;
    goal?: string;
    pacing?: "calm" | "steady" | "fast";
    brief?: string;
    accentColor?: string;
    brandColor?: string;
    audioMood?: string;
    focus?: "full" | "hook" | "middle" | "outro";
    targetDurationSeconds?: number;
  }
): ExplainerScript {
  // Extract key information from search results
  const keyPoints = searchResults.slice(0, 3).map((result) =>
    result
      .replace(/<span class="searchmatch">/g, "")
      .replace(/<\/span>/g, "")
      .replace(/\.\.\.$/, "")
  );

  // Generate color scheme based on topic
  const direction = buildCreativeDirection({
    topic,
    tone,
    stylePreset: creative?.stylePreset || "educational",
    audience: creative?.audience || "general",
    platform: creative?.platform || "vertical",
    intensity: creative?.intensity || "balanced",
    motionLevel: creative?.motionLevel || "medium",
    visualDensity: creative?.visualDensity || "balanced",
    narrativeTemplate: creative?.narrativeTemplate || "problem-solution",
    brief: creative?.brief,
  });
  const palette = generateColorScheme(topic, direction.stylePreset, creative?.accentColor || creative?.brandColor);

  // Generate image keywords for each section
  const sections = [
    {
      title: "What is it?",
      content: keyPoints[0] || `Understanding ${topic} starts with knowing the basics. Let's break it down.`,
      imageKeywords: generateImageKeywords(topic, "concept", "abstract", "technology", direction.stylePreset),
    },
    {
      title: "Why does it matter?",
      content:
        keyPoints[1] ||
        `${topic} has a significant impact on how we work and live. Understanding it gives you an edge.`,
      imageKeywords: generateImageKeywords(topic, "impact", "innovation", "future", direction.audience),
    },
    {
      title: "The key takeaway",
      content:
        keyPoints[2] ||
        `The main point to remember is that ${topic} is more relevant now than ever.`,
      imageKeywords: generateImageKeywords(topic, "success", "growth", "opportunity", direction.intensity),
    },
  ];

  return {
    title: topic,
    hook: emphasizeHook(generateHook(topic, tone), creative?.focus),
    sections,
    outro: buildOutro(topic, tone, direction),
    cta: buildDefaultCTA(direction),
    creativeDirection: direction,
    primaryColor: palette.primaryColor,
    accentColor: palette.accentColor,
    topicImages: generateImageKeywords(topic, "overview", "landscape", direction.stylePreset),
    audioMood: creative?.audioMood || buildAudioMood(direction),
    scenePlan: buildScenePlan(topic, sections, direction),
  };
}

/**
 * Generate image keywords for a topic
 */
function generateImageKeywords(...inputs: string[]): string[] {
  const keywords = new Set<string>();

  inputs.forEach((input) => {
    const words = input.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3) {
        keywords.add(word);
      }
    });
  });

  return Array.from(keywords).slice(0, 5);
}

/**
 * Generate a color scheme based on the topic
 */
function generateColorScheme(
  topic: string,
  stylePreset?: StylePreset,
  customAccent?: string
): { primaryColor: string; accentColor: string; paletteName: string } {
  const topicLower = topic.toLowerCase();

  const colorSchemes: Record<string, { primaryColor: string; accentColor: string }> = {
    tech: { primaryColor: "#0f172a", accentColor: "#38bdf8" },
    ai: { primaryColor: "#1a1a2e", accentColor: "#a855f7" },
    science: { primaryColor: "#0c4a6e", accentColor: "#22d3ee" },
    nature: { primaryColor: "#14532d", accentColor: "#4ade80" },
    business: { primaryColor: "#1e293b", accentColor: "#f59e0b" },
    health: { primaryColor: "#1e3a5f", accentColor: "#3b82f6" },
    art: { primaryColor: "#2d1b4e", accentColor: "#ec4899" },
    finance: { primaryColor: "#1a1a1a", accentColor: "#22c55e" },
    education: { primaryColor: "#1e3a5f", accentColor: "#60a5fa" },
    sports: { primaryColor: "#1a1a1a", accentColor: "#ef4444" },
  };

  const styleOverrides: Record<StylePreset, Partial<{ primaryColor: string; accentColor: string; paletteName: string }>> = {
    cinematic: { paletteName: "Midnight Cinema" },
    educational: { accentColor: "#60a5fa", paletteName: "Blue Signal" },
    bold: { primaryColor: "#111827", accentColor: "#f97316", paletteName: "Bold Ember" },
    playful: { primaryColor: "#312e81", accentColor: "#f472b6", paletteName: "Playful Neon" },
    premium: { primaryColor: "#111111", accentColor: "#d4af37", paletteName: "Premium Gold" },
    documentary: { primaryColor: "#0b1320", accentColor: "#94a3b8", paletteName: "Documentary Steel" },
  };

  // Check for keywords in topic
  for (const [key, scheme] of Object.entries(colorSchemes)) {
    if (topicLower.includes(key)) {
      return {
        primaryColor: styleOverrides[stylePreset || "cinematic"]?.primaryColor || scheme.primaryColor,
        accentColor:
          customAccent ||
          styleOverrides[stylePreset || "cinematic"]?.accentColor ||
          scheme.accentColor,
        paletteName:
          styleOverrides[stylePreset || "cinematic"]?.paletteName || `${key} scheme`,
      };
    }
  }

  // Default scheme
  const style = styleOverrides[stylePreset || "cinematic"];
  return {
    primaryColor: style?.primaryColor || "#0f172a",
    accentColor: customAccent || style?.accentColor || "#38bdf8",
    paletteName: style?.paletteName || "Default Night",
  };
}

function generateHook(topic: string, tone: string): string {
  const hooks: Record<string, string[]> = {
    informative: [
      `${topic} is something everyone's talking about, but few truly understand. Here's what you need to know.`,
      `In just a few minutes, you'll understand ${topic} better than most people ever will.`,
      `Let me explain ${topic} in a way that actually makes sense.`,
    ],
    casual: [
      `So you keep hearing about ${topic}, but what's the big deal? Let's break it down.`,
      `Here's the deal with ${topic} — explained simply.`,
      `Wondering what all the ${topic} hype is about? I got you.`,
    ],
    professional: [
      `${topic}: A comprehensive overview of the key concepts and implications.`,
      `Understanding ${topic} is essential in today's landscape. Here's a primer.`,
      `Let's examine ${topic} and its practical applications.`,
    ],
    dramatic: [
      `Everything is about to change. This is ${topic}.`,
      `You need to know this. This is ${topic}, explained.`,
      `${topic} will reshape everything. Here's why.`,
    ],
    humorous: [
      `Buckle up. We're talking about ${topic}, and yes, it's actually a big deal.`,
      `Everyone pretends to understand ${topic}. Today, you actually will.`,
      `${topic} sounds complicated because people love using big words. Let's fix that.`,
    ],
    storytelling: [
      `It started as a niche idea, now ${topic} is everywhere. Here's the story.`,
      `Imagine a world where ${topic} changes everything. That world is now.`,
      `The journey of ${topic} is fascinating, and it's only just beginning.`,
    ],
  };

  const options = hooks[tone] || hooks.informative;
  return options[Math.floor(Math.random() * options.length)];
}

function generateOutro(topic: string, tone: string): string {
  const outros: Record<string, string[]> = {
    informative: [
      `Now you understand ${topic}. Share this with someone who needs to know.`,
      `${topic} is complex, but it doesn't have to be confusing. You're now equipped with the basics.`,
      `Follow for more insights on topics like ${topic}.`,
    ],
    casual: [
      `And that's ${topic}. Pretty straightforward, right?`,
      `Now you can actually talk about ${topic} without pretending.`,
      `Hope that cleared things up! Drop a comment if you want more on ${topic}.`,
    ],
    professional: [
      `In summary, ${topic} represents a significant development worth monitoring.`,
      `For continued analysis on ${topic} and related topics, stay connected.`,
      `${topic} is evolving rapidly. Stay informed on latest developments.`,
    ],
    dramatic: [
      `${topic}. Remember it. Because it's happening right now.`,
      `The future of ${topic} is being written. You're now part of the conversation.`,
      `Don't forget what you just learned about ${topic}. It matters.`,
    ],
    humorous: [
      `Boom. Now you know ${topic}. Go impress someone.`,
      `You just became the smartest person in the room about ${topic}. Use it wisely.`,
      `${topic} unlocked. You're welcome.`,
    ],
    storytelling: [
      `The story of ${topic} continues, and now you're part of it.`,
      `And that's where ${topic} stands today. The next chapter is yours to write.`,
      `From obscure to essential - that's the story of ${topic}.`,
    ],
  };

  const options = outros[tone] || outros.informative;
  return options[Math.floor(Math.random() * options.length)];
}

function buildCreativeDirection(options: {
  topic: string;
  tone?: string;
  stylePreset: StylePreset;
  audience: Audience;
  platform: Platform;
  intensity: CreativeIntensity;
  motionLevel: MotionLevel;
  visualDensity: VisualDensity;
  narrativeTemplate: NarrativeTemplate;
  brief?: string;
}): CreativeDirection {
  const typographyByStyle: Record<StylePreset, string> = {
    cinematic: "High-contrast title case with wide tracking",
    educational: "Clear, highly legible educational framing",
    bold: "Condensed headline typography with hard edges",
    playful: "Friendly rounded type with lively emphasis",
    premium: "Elegant editorial typography with restraint",
    documentary: "Measured, journalistic typography with clarity",
  };
  const pacingByStyle: Record<StylePreset, "calm" | "steady" | "fast"> = {
    cinematic: "steady",
    educational: "calm",
    bold: "fast",
    playful: "fast",
    premium: "calm",
    documentary: "steady",
  };
  const motionByStyle: Record<StylePreset, string> = {
    cinematic: "Sweeping pushes, layered transitions, and cinematic reveals",
    educational: "Clear cuts, gentle movement, and steady emphasis",
    bold: "Snappy cuts, strong contrast, and immediate visual hits",
    playful: "Bouncy motion, lively transitions, and expressive accents",
    premium: "Controlled motion with luxurious spacing and restraint",
    documentary: "Measured motion, grounded framing, and authentic pacing",
  };

  return {
    stylePreset: options.stylePreset,
    audience: options.audience,
    platform: options.platform,
    intensity: options.intensity,
    motionLevel: options.motionLevel,
    visualDensity: options.visualDensity,
    narrativeTemplate: options.narrativeTemplate,
    typography: typographyByStyle[options.stylePreset],
    palette: `${options.stylePreset} palette`,
    pacing: pacingByStyle[options.stylePreset],
    motionSignature: motionByStyle[options.stylePreset],
    audioMood: buildAudioMood({
      stylePreset: options.stylePreset,
      audience: options.audience,
      platform: options.platform,
      intensity: options.intensity,
      motionLevel: options.motionLevel,
      visualDensity: options.visualDensity,
      typography: typographyByStyle[options.stylePreset],
      palette: `${options.stylePreset} palette`,
      pacing: pacingByStyle[options.stylePreset],
      motionSignature: motionByStyle[options.stylePreset],
      audioMood: "",
      narrativeTemplate: options.narrativeTemplate,
    }),
  };
}

function buildScenePlan(topic: string, sections: ScriptSection[], direction: CreativeDirection): ScenePlanItem[] {
  const entries: ScenePlanItem[] = [
    {
      title: "Hook",
      purpose: "Stop the scroll and frame the topic fast.",
      emotion: direction.intensity === "wild" ? "urgent" : "curious",
      visualDirection: `Bold title treatment for ${topic} with immediate motion and contrast.`,
      cameraMotion: direction.motionLevel === "minimal" ? "hold" : "slow push in",
      caption: direction.stylePreset === "premium" ? "A better way to see the topic." : "Here’s the real version.",
    },
  ];

  sections.forEach((section, index) => {
    entries.push({
      title: section.title,
      purpose: section.content.slice(0, 90),
      emotion: index % 2 === 0 ? "clarity" : "momentum",
      visualDirection: section.imageKeywords?.length
        ? `Use imagery around ${section.imageKeywords.slice(0, 3).join(", ")}.`
        : `Use text-led motion and abstract design around ${section.title}.`,
      cameraMotion:
        direction.motionLevel === "high"
          ? "dynamic pan with subtle zoom"
          : direction.motionLevel === "medium"
            ? "measured push"
            : "static emphasis",
      caption: section.title,
    });
  });

  entries.push({
    title: "Outro",
    purpose: "Land the takeaway and set up the CTA.",
    emotion: "resolve",
    visualDirection: `Close with strong branding and a ${direction.stylePreset} finish.`,
    cameraMotion: "gentle pull back",
    caption: "Follow for more.",
  });

  return entries;
}

function buildAudioMood(direction: CreativeDirection): string {
  const moodByStyle: Record<StylePreset, string> = {
    cinematic: "Cinematic ambient pulse with rising energy and low-end movement",
    educational: "Clean ambient bed with steady pulse and minimal distraction",
    bold: "Percussive pulse with sharp accents and forward momentum",
    playful: "Bright rhythmic bed with light percussion and bounce",
    premium: "Polished atmospheric bed with restrained tension",
    documentary: "Textured ambient score with subtle tension and space",
  };

  return moodByStyle[direction.stylePreset];
}

function buildDefaultCTA(direction: CreativeDirection): string {
  const byPlatform: Record<Platform, string> = {
    tiktok: "Follow for the next breakdown",
    reels: "Save this and share it",
    shorts: "Subscribe for more",
    vertical: "Keep watching for more",
  };

  return byPlatform[direction.platform];
}

function buildOutro(topic: string, tone: string, direction: CreativeDirection): string {
  const toneOutro = generateOutro(topic, tone);
  const platformCall = direction.platform === "shorts" ? "Subscribe for more." : "Follow for more.";
  if (/follow|subscribe/i.test(toneOutro)) {
    return toneOutro;
  }
  return `${toneOutro} ${platformCall}`;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function emphasizeHook(hook: string, focus?: "full" | "hook" | "middle" | "outro"): string {
  if (focus === "hook") {
    return `${hook} This opening matters, so it stays tight and attention-first.`;
  }
  if (focus === "middle") {
    return `${hook} The middle sections should carry the strongest explanation and payoff.`;
  }
  if (focus === "outro") {
    return `${hook} The ending should land with a stronger callback and CTA.`;
  }
  return hook;
}

function buildSectionTemplates(
  topic: string,
  tone: string,
  complexity: string,
  direction: CreativeDirection,
  brief?: string,
  goal?: string,
  pacing?: "calm" | "steady" | "fast"
): Array<{ title: string; content: string }> {
  const goalLine = goal ? `The goal is to ${goal}. ` : "";
  const paceLine =
    pacing === "fast"
      ? "Keep the language tight, punchy, and momentum-driven."
      : pacing === "calm"
        ? "Keep the language measured, clear, and easy to absorb."
        : "Keep the language steady and easy to follow.";
  const firstSection =
    direction.narrativeTemplate === "myth-busting"
      ? {
          title: "The myth vs the truth",
          content: `${topic} gets explained in a lot of confusing ways. ${goalLine}${brief || "it solves a real-world problem with a clearer, faster approach."} ${paceLine}`,
        }
      : direction.narrativeTemplate === "timeline"
        ? {
            title: "How it got here",
            content: `${topic} did not appear overnight. It evolved through pressure, experimentation, and a shift in what people needed. ${goalLine}${paceLine}`,
          }
        : {
            title: "The core idea",
            content: `${topic} is easier to understand when you strip away the noise and focus on the main job it does. ${goalLine}${paceLine}`,
          };

  const secondSection =
    direction.narrativeTemplate === "comparison"
      ? {
          title: "Why this beats the old way",
          content: `Compared with older approaches, ${topic} is often faster, clearer, or more scalable depending on the use case.`,
        }
      : direction.narrativeTemplate === "transformation"
      ? {
          title: "What changes when you use it",
          content: `Once you understand ${topic}, the way you make decisions, build things, or explain the problem gets sharper. ${paceLine}`,
        }
      : {
          title: "Why it matters",
          content: `${topic} matters because it changes the outcome in ways people actually notice. ${goalLine}${paceLine}`,
        };

  const thirdSection =
    complexity === "detailed"
      ? {
          title: "What to remember",
          content: `The main thing to remember about ${topic} is how it changes tradeoffs. That is where the real value shows up. ${goalLine}${paceLine}`,
        }
      : {
          title: "The takeaway",
          content: `The short version: ${topic} is worth understanding because it keeps showing up in real decisions. ${goalLine}${paceLine}`,
        };

  return [firstSection, secondSection, thirdSection];
}

function generateTemplateScript(
  topic: string,
  creative?: {
    stylePreset: StylePreset;
    audience: Audience;
    platform: Platform;
    intensity: CreativeIntensity;
    motionLevel: MotionLevel;
    visualDensity: VisualDensity;
    narrativeTemplate: NarrativeTemplate;
    goal?: string;
    pacing?: "calm" | "steady" | "fast";
    brief?: string;
    accentColor?: string;
    brandColor?: string;
    audioMood?: string;
    focus?: "full" | "hook" | "middle" | "outro";
    targetDurationSeconds?: number;
    tone?: string;
  }
): ExplainerScript {
  const direction = buildCreativeDirection({
    topic,
    tone: creative?.tone,
    stylePreset: creative?.stylePreset || "educational",
    audience: creative?.audience || "general",
    platform: creative?.platform || "vertical",
    intensity: creative?.intensity || "balanced",
    motionLevel: creative?.motionLevel || "medium",
    visualDensity: creative?.visualDensity || "balanced",
    narrativeTemplate: creative?.narrativeTemplate || "problem-solution",
    brief: creative?.brief,
  });
  const palette = generateColorScheme(topic, direction.stylePreset, creative?.accentColor || creative?.brandColor);

  return {
    title: topic,
    hook: emphasizeHook(generateHook(topic, creative?.tone || "informative"), creative?.focus),
    sections: buildSectionTemplates(
      topic,
      creative?.tone || "informative",
      "medium",
      direction,
      creative?.brief,
      creative?.goal,
      creative?.pacing
    ).map((section) => ({
      ...section,
      imageKeywords: generateImageKeywords(topic, section.title, direction.stylePreset),
    })),
    outro: buildOutro(topic, creative?.tone || "informative", direction),
    cta: buildDefaultCTA(direction),
    creativeDirection: direction,
    primaryColor: palette.primaryColor,
    accentColor: palette.accentColor,
    topicImages: generateImageKeywords(topic, "overview", direction.stylePreset),
    audioMood: creative?.audioMood || buildAudioMood(direction),
    estimatedDurationSeconds: creative?.targetDurationSeconds,
    scenePlan: buildScenePlan(topic, buildSectionTemplates(
      topic,
      creative?.tone || "informative",
      "medium",
      direction,
      creative?.brief,
      creative?.goal,
      creative?.pacing
    ).map((section) => ({
      ...section,
      imageKeywords: generateImageKeywords(topic, section.title, direction.stylePreset),
    })), direction),
  };
}

/**
 * Calculate the duration in frames for a script based on word count
 */
export function calculateScriptDuration(
  script: ExplainerScript,
  fps = 30,
  wordsPerSecond = 2.5
): number {
  // Count words in all sections
  const hookWords = script.hook.split(" ").length;
  const sectionWords = script.sections.reduce(
    (acc, section) => acc + section.content.split(" ").length,
    0
  );
  const outroWords = script.outro.split(" ").length;

  const totalWords = hookWords + sectionWords + outroWords;
  const totalSeconds = totalWords / wordsPerSecond;

  // Add time for title cards and transitions
  const introTime = 3; // seconds for title
  const sectionBreaks = script.sections.length * 1; // 1 second between sections
  const outroTime = 4; // seconds for outro

  const totalDuration = introTime + totalSeconds + sectionBreaks + outroTime;

  return Math.ceil(totalDuration * fps);
}
