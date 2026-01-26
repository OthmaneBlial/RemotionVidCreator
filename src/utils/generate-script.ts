export interface ScriptSection {
  title: string;
  content: string;
}

export interface ExplainerScript {
  title: string;
  hook: string;
  sections: ScriptSection[];
  outro: string;
}

export interface GenerateScriptOptions {
  topic: string;
  tone?: "informative" | "casual" | "professional" | "dramatic";
  complexity?: "simple" | "medium" | "detailed";
}

/**
 * Generate an explainer script for a given topic.
 * This uses web search to gather information and structures it into a video script.
 */
export async function generateScript(
  options: GenerateScriptOptions
): Promise<ExplainerScript> {
  const { topic, tone = "informative", complexity = "medium" } = options;

  // For now, we'll use a template-based approach with web search
  // In production, you'd want to use an AI API for more sophisticated generation

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

async function searchTopic(topic: string): Promise<string[]> {
  // Use web search to gather information
  // This is where you'd integrate with a search API or web scraping

  // For demonstration, we'll use a web fetch approach
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      topic
    )}&format=json&origin=*`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.query?.search) {
      return data.query.search.map((result: any) => result.snippet);
    }
  } catch (error) {
    console.error("Search error:", error);
  }

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

  return {
    title: topic,
    hook: generateHook(topic, tone),
    sections: [
      {
        title: "What is it?",
        content: keyPoints[0] || `Understanding ${topic} starts with knowing the basics. Let's break it down.`,
      },
      {
        title: "Why does it matter?",
        content:
          keyPoints[1] ||
          `${topic} has a significant impact on how we work and live. Understanding it gives you an edge.`,
      },
      {
        title: "The key takeaway",
        content:
          keyPoints[2] ||
          `The main point to remember is that ${topic} is more relevant now than ever.`,
      },
    ],
    outro: generateOutro(topic, tone),
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
  };

  const options = outros[tone] || outros.informative;
  return options[Math.floor(Math.random() * options.length)];
}

function generateTemplateScript(topic: string): ExplainerScript {
  return {
    title: topic,
    hook: `Let me explain ${topic} in a way that actually makes sense.`,
    sections: [
      {
        title: "The Basics",
        content: `${topic} is a fascinating subject that affects many aspects of our daily lives. Understanding it starts with the fundamentals.`,
      },
      {
        title: "Why It Matters",
        content: `The importance of ${topic} cannot be overstated. It has implications for how we work, live, and interact with the world around us.`,
      },
      {
        title: "Looking Ahead",
        content: `The future of ${topic} is exciting and full of possibilities. Those who understand it now will be ahead of the curve.`,
      },
    ],
    outro: `Now you understand ${topic}. Share this with someone who could benefit from knowing more.`,
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
