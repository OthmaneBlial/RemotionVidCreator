import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface TextBlockProps {
  text: string;
  delay?: number;
  wordsPerSecond?: number;
  color?: string;
  fontSize?: number;
  maxWidth?: number;
}

export const TextBlock = ({
  text,
  delay = 0,
  wordsPerSecond = 2.5,
  color = "#ffffff",
  fontSize = 36,
  maxWidth = 900,
}: TextBlockProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const effectiveFrame = Math.max(0, frame - delay);

  // Calculate total characters and timing
  const totalChars = text.length;
  const charsPerFrame = (totalChars / (text.split(" ").length / wordsPerSecond)) / fps;

  // Typewriter effect - show characters progressively
  const visibleChars = Math.min(
    totalChars,
    Math.floor(effectiveFrame * charsPerFrame)
  );

  const visibleText = text.slice(0, visibleChars);

  const opacity = interpolate(effectiveFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const y = interpolate(effectiveFrame, [0, 15], [20, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
      }}
    >
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: 500,
          color,
          textAlign: "center",
          maxWidth: `${maxWidth}px`,
          lineHeight: 1.5,
          opacity,
          transform: `translateY(${y}px)`,
          textShadow: "0 2px 30px rgba(0,0,0,0.3)",
        }}
      >
        {visibleText}
        <span
          style={{
            display: "inline-block",
            width: "3px",
            height: "1em",
            backgroundColor: color,
            marginLeft: "4px",
            opacity: interpolate(
              effectiveFrame % 30,
              [0, 15, 30],
              [1, 1, 0],
              { extrapolateRight: "clamp" }
            ),
            verticalAlign: "middle",
          }}
        />
      </p>
    </AbsoluteFill>
  );
};
