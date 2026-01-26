import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface ProgressBarProps {
  color?: string;
  height?: number;
  position?: "top" | "bottom";
}

export const ProgressBar = ({
  color = "#38bdf8",
  height = 4,
  position = "top",
}: ProgressBarProps) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        [position]: 0,
        left: 0,
        right: 0,
        height: `${height + 20}px`,
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Background track */}
      <div
        style={{
          position: "absolute",
          left: "40px",
          right: "40px",
          height: `${height}px`,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: `${height / 2}px`,
        }}
      />

      {/* Progress fill */}
      <div
        style={{
          position: "absolute",
          left: "40px",
          height: `${height}px`,
          width: `calc(${progress * 100}% - 80px)`,
          backgroundColor: color,
          borderRadius: `${height / 2}px`,
          boxShadow: `0 0 ${height * 3}px ${color}`,
          transition: "width 0.1s linear",
        }}
      />

      {/* Glow effect at the end */}
      <div
        style={{
          position: "absolute",
          left: `calc(${progress * 100}% - 60px)`,
          width: "20px",
          height: `${height * 2}px`,
          borderRadius: "50%",
          backgroundColor: color,
          filter: "blur(4px)",
          opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
        }}
      />
    </AbsoluteFill>
  );
};
