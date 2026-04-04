import "./load-env.js";

export interface ScriptSection {
  title: string;
  content: string;
  imageKeywords?: string[]; // Keywords for image search
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
}

export interface GenerateScriptOptions {
  topic: string;
  tone?: "informative" | "casual" | "professional" | "dramatic" | "humorous" | "storytelling";
  complexity?: "simple" | "medium" | "detailed";
  targetDurationSeconds?: number;
  useAI?: boolean;
  apiKey?: string;
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
  } = options;

  // Try AI generation if requested
  if (useAI) {
    try {
      console.log("   🤖 Generating script with Z.ai...");
      // If no API key provided, use mock/demo mode
      if (!apiKey) {
        console.log("   🧪 Using DEMO mode (no API key)");
        const script = await generateMockAIScript(topic, tone, complexity, targetDurationSeconds);
        console.log("   ✅ Demo script generated successfully");
        return script;
      }
      const script = await generateAIScript(
        topic,
        tone,
        complexity,
        apiKey,
        targetDurationSeconds
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
    return buildScriptFromSearch(topic, searchResults, tone, complexity);
  } catch (error) {
    console.error("Error generating script:", error);
    // Fallback to template-based generation
    return generateTemplateScript(topic);
  }
}

/**
 * Generate mock AI script (demo mode without API key)
 * This simulates what Z.ai would return
 */
async function generateMockAIScript(
  topic: string,
  tone: string,
  complexity: string,
  targetDurationSeconds?: number
): Promise<ExplainerScript> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const { primaryColor, accentColor } = generateColorScheme(topic);

  // Pre-written high-quality scripts for different tones
  const mockScripts: Record<string, { hook: string; sections: Array<{title: string; content: string}>; outro: string }> = {
    humorous: {
      hook: `Everyone pretends to understand ${topic}. Today, you actually will. No more nodding along like you know what's going on.`,
      sections: [
        {
          title: "What is it really?",
          content: `Think of ${topic} like that one friend who overcomplicates everything. Strip away the jargon and it's actually pretty simple. It's just a tool/method/concept that solves a specific problem people have been dealing with forever.`
        },
        {
          title: "Why should you care?",
          content: `Here's the thing - ${topic} is already affecting your life. Whether you realize it or not. The people who understand it? They're the ones making decisions while everyone else is still confused.`
        },
        {
          title: "The bottom line",
          content: `You don't need to be an expert. You just need to understand the basics. And now? You already know more than 90% of people who pretend to get ${topic}.`
        }
      ],
      outro: `Boom. ${topic} unlocked. Go impress someone with your knowledge. Or don't. Either way, you're welcome.`
    },
    storytelling: {
      hook: `It started as a niche idea that experts said would never catch on. Now? ${topic} is everywhere. This is that story.`,
      sections: [
        {
          title: "The origin",
          content: `Picture this: a time when ${topic} didn't exist. People were struggling with the problem it would eventually solve. Then came the breakthrough - a simple idea that would change everything.`
        },
        {
          title: "The turning point",
          content: `What happened next was unexpected. ${topic} didn't just solve the original problem - it opened doors nobody even knew existed. Suddenly, everyone was talking about it. Using it. Building on it.`
        },
        {
          title: "Where we are now",
          content: `Today, ${topic} is so woven into our daily lives that we barely notice it. But the story isn't over. In fact, we're still writing the next chapter. And you? You're now part of it.`
        }
      ],
      outro: `The story of ${topic} continues. Follow to see what happens next.`
    },
    dramatic: {
      hook: `Stop everything. Because once you understand ${topic}, nothing will look the same again.`,
      sections: [
        {
          title: "The revelation",
          content: `${topic} isn't just another trend. It's not something you can ignore. This is fundamental. This changes how everything works. And most people still have no idea what's coming.`
        },
        {
          title: "The impact",
          content: `Every industry. Every career. Every aspect of daily life - ${topic} is reshaping it all. The question isn't whether you'll be affected. The question is whether you'll be ready.`
        },
        {
          title: "Your move",
          content: `You have two choices right now. Forget what you just learned and let the future happen to you. Or lean in. Understand ${topic}. And be ahead of the curve.`
        }
      ],
      outro: `The future doesn't wait. Neither should you. ${topic} is here. Remember that.`
    },
    informative: {
      hook: `${topic} is everywhere right now, but ask five people to explain it and you'll get five different answers. Let's end the confusion.`,
      sections: [
        {
          title: "Breaking it down",
          content: `At its core, ${topic} is simply [core concept]. Think of it like a relatable analogy that makes the complex suddenly simple. No jargon. No fluff. Just what it actually does.`
        },
        {
          title: "Real-world impact",
          content: `Here's why ${topic} matters: it solves a real problem. Companies use it to [specific use case]. Everyday people use it to [another use case]. The applications are growing every day.`
        },
        {
          title: "Key takeaway",
          content: `You don't need to be an expert to benefit from ${topic}. Understanding the basics puts you ahead of most people. And the basics? You just learned them.`
        }
      ],
      outro: `Now you actually understand ${topic}. Share this with someone who's still confused. They'll thank you.`
    },
    casual: {
      hook: `So you keep hearing about ${topic} everywhere. But like... what actually is it? Let's figure this out.`,
      sections: [
        {
          title: "The simple version",
          content: `Okay so ${topic} is basically [simple explanation]. That's it. All the complicated stuff people say? Just different ways of explaining this one simple thing.`
        },
        {
          title: "Why people care",
          content: `${topic} is useful because [practical reason]. It helps people [specific benefit]. That's literally why everyone's talking about it - it actually works for the thing it's supposed to do.`
        },
        {
          title: "What you need to know",
          content: `Bottom line: ${topic} is worth understanding. Not because it's trendy, but because it's actually useful. And now you get it. Nice.`
        }
      ],
      outro: `And that's ${topic}. Not so scary after you break it down, right? Follow for more stuff explained simply.`
    },
    professional: {
      hook: `In the next few minutes, you'll gain a comprehensive understanding of ${topic} - a critical topic in today's landscape.`,
      sections: [
        {
          title: "Overview and definition",
          content: `${topic} represents a significant development in [field/industry]. Formally defined as [definition], it addresses the fundamental challenge of [core problem] through an innovative approach.`
        },
        {
          title: "Strategic implications",
          content: `Organizations leveraging ${topic} have demonstrated measurable improvements in [metrics]. The competitive advantage is clear: early adopters are capturing market share while latecomers risk obsolescence.`
        },
        {
          title: "Key considerations",
          content: `When evaluating ${topic} for your context, consider [factors]. The potential ROI is substantial, but success requires thoughtful implementation aligned with business objectives.`
        }
      ],
      outro: `${topic} continues to evolve rapidly. Stay informed on developments to maintain competitive advantage.`
    }
  };

  // Get the mock script for the requested tone, default to informative
  const mockScript = mockScripts[tone] || mockScripts.informative;

  return {
    title: topic,
    hook: mockScript.hook,
    sections: mockScript.sections.map(s => ({
      title: s.title,
      content: s.content,
      imageKeywords: generateImageKeywords(topic, s.title)
    })),
    outro: mockScript.outro,
    primaryColor,
    accentColor,
    topicImages: generateImageKeywords(topic, "overview", "concept", "intro"),
    audioMood: "Cinematic ambient pulse with subtle tension and forward motion",
    estimatedDurationSeconds: targetDurationSeconds,
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
  targetDurationSeconds?: number
): Promise<ExplainerScript> {
  const prompt = buildAIPrompt(topic, tone, complexity, targetDurationSeconds);
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

  return parseAIResponse(content, topic, tone);
}

/**
 * Build the prompt for AI script generation
 */
function buildAIPrompt(
  topic: string,
  tone: string,
  complexity: string,
  targetDurationSeconds?: number
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

  return `You are an expert scriptwriter for viral short-form videos (TikTok, Reels, Shorts).

Create an engaging explainer video script about: **${topic}**

**Style Requirements:**
- Tone: ${toneInstructions[tone] || toneInstructions.informative}
- Complexity: ${complexityInstructions[complexity] || complexityInstructions.medium}
- Duration: ${targetDurationSeconds ? `about ${targetDurationSeconds} seconds` : "~60-90 seconds of spoken content"}
- Format: Vertical 9:16 video (TikTok/Reels style)

**Script Structure:**
1. HOOK - Grab attention in the first 2 seconds. Make it irresistible.
2. SECTION 1 - "What is it?" - Clear explanation
3. SECTION 2 - "Why does it matter?" - Real-world impact
4. SECTION 3 - "Key takeaway" - The most important thing to remember
5. OUTRO - Call to action (follow for more)

**Content Guidelines:**
- Hook must be provocative or intriguing
- Each section should be 2-3 sentences max
- Use simple, punchy language
- Include specific examples when possible
- Make it memorable and shareable
- Avoid clichés unless used intentionally
- Add a short audio mood line for a background bed
- Add image keyword ideas for each section
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
  "estimatedDurationSeconds": ${targetDurationSeconds ?? 75}
}
\`\`\`

Generate the script now. Return ONLY the JSON, no other text.`;
}

/**
 * Parse AI response into ExplainerScript
 */
function parseAIResponse(content: string, topic: string, tone: string): ExplainerScript {
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
    const { primaryColor, accentColor } = generateColorScheme(topic);

    return {
      title: parsed.title || topic,
      hook: parsed.hook || generateHook(topic, tone),
      sections: parsed.sections.map((section: any) => ({
        title: section.title || "Section",
        content: section.content || "",
        imageKeywords: generateImageKeywords(topic, section.title, "visual", "concept"),
      })),
      outro: parsed.outro || generateOutro(topic, tone),
      primaryColor,
      accentColor,
      topicImages: generateImageKeywords(topic, "overview", "landscape", "intro"),
      audioMood: parsed.audioMood || "Cinematic ambient pulse with subtle tension and forward motion",
      estimatedDurationSeconds: parsed.estimatedDurationSeconds,
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
  complexity: string
): ExplainerScript {
  // Extract key information from search results
  const keyPoints = searchResults.slice(0, 3).map((result) =>
    result
      .replace(/<span class="searchmatch">/g, "")
      .replace(/<\/span>/g, "")
      .replace(/\.\.\.$/, "")
  );

  // Generate color scheme based on topic
  const { primaryColor, accentColor } = generateColorScheme(topic);

  // Generate image keywords for each section
  const sections = [
    {
      title: "What is it?",
      content: keyPoints[0] || `Understanding ${topic} starts with knowing the basics. Let's break it down.`,
      imageKeywords: generateImageKeywords(topic, "concept", "abstract", "technology"),
    },
    {
      title: "Why does it matter?",
      content:
        keyPoints[1] ||
        `${topic} has a significant impact on how we work and live. Understanding it gives you an edge.`,
      imageKeywords: generateImageKeywords(topic, "impact", "innovation", "future"),
    },
    {
      title: "The key takeaway",
      content:
        keyPoints[2] ||
        `The main point to remember is that ${topic} is more relevant now than ever.`,
      imageKeywords: generateImageKeywords(topic, "success", "growth", "opportunity"),
    },
  ];

  return {
    title: topic,
    hook: generateHook(topic, tone),
    sections,
    outro: generateOutro(topic, tone),
    primaryColor,
    accentColor,
    topicImages: generateImageKeywords(topic, "overview", "landscape"),
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
function generateColorScheme(topic: string): { primaryColor: string; accentColor: string } {
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

  // Check for keywords in topic
  for (const [key, scheme] of Object.entries(colorSchemes)) {
    if (topicLower.includes(key)) {
      return scheme;
    }
  }

  // Default scheme
  return { primaryColor: "#0f172a", accentColor: "#38bdf8" };
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

function generateTemplateScript(topic: string): ExplainerScript {
  const { primaryColor, accentColor } = generateColorScheme(topic);

  return {
    title: topic,
    hook: `Let me explain ${topic} in a way that actually makes sense.`,
    sections: [
      {
        title: "The Basics",
        content: `${topic} is a fascinating subject that affects many aspects of our daily lives. Understanding it starts with the fundamentals.`,
        imageKeywords: generateImageKeywords(topic, "concept", "introduction"),
      },
      {
        title: "Why It Matters",
        content: `The importance of ${topic} cannot be overstated. It has implications for how we work, live, and interact with the world around us.`,
        imageKeywords: generateImageKeywords(topic, "importance", "impact"),
      },
      {
        title: "Looking Ahead",
        content: `The future of ${topic} is exciting and full of possibilities. Those who understand it now will be ahead of the curve.`,
        imageKeywords: generateImageKeywords(topic, "future", "innovation"),
      },
    ],
    outro: `Now you understand ${topic}. Share this with someone who could benefit from knowing more.`,
    primaryColor,
    accentColor,
    topicImages: generateImageKeywords(topic, "overview"),
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
