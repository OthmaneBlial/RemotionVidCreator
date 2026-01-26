import { Composition } from "remotion";
import { ExplainerVideo, calculateMetadata } from "./compositions/ExplainerVideo";
import { ExplainerVideoSchema } from "./compositions/ExplainerVideo/schema";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ExplainerVideo"
      component={ExplainerVideo}
      schema={ExplainerVideoSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={{
        topic: "The Future of AI",
        script: {
          title: "The Future of AI",
          hook: "Artificial Intelligence is reshaping our world faster than ever before. Here's what you need to know.",
          sections: [
            {
              title: "What's Happening Now",
              content:
                "AI models can now write code, create art, and have conversations that feel almost human.",
            },
            {
              title: "The Impact",
              content:
                "From healthcare to transportation, AI is automating tasks and revealing insights we never could have found alone.",
            },
            {
              title: "What's Next",
              content:
                "The future holds AI assistants, personalized education, and scientific breakthroughs we can barely imagine.",
            },
          ],
          outro: "The question isn't whether AI will change your world—it already has. The question is: will you be ready?",
        },
      }}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
