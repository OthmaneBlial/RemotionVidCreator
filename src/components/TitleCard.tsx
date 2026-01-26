import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface TitleCardProps {
  title: string;
  subtitle?: string;
  delay?: number;
  color?: string;
}

export const TitleCard = ({
  title,
  subtitle,
  delay = 0,
  color = "#ffffff",
}: TitleCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const effectiveFrame = Math.max(0, frame - delay);

  const titleSpring = spring({
    frame: effectiveFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
  });

  const subtitleSpring = spring({
    frame: effectiveFrame - 5,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
  });

  const titleOpacity = interpolate(effectiveFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(effectiveFrame, [5, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleScale = interpolate(titleSpring, [0, 1], [0.9, 1]);
  const subtitleScale = interpolate(subtitleSpring, [0, 1], [0.9, 1]);

  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Decorative line */}
      <div
        style={{
          width: "80px",
          height: "4px",
          background: color,
          borderRadius: "2px",
          marginBottom: "24px",
          opacity: titleOpacity,
          transform: `scaleX(${titleSpring})`,
          transformOrigin: "center",
        }}
      />

      {/* Title */}
      <h1
        style={{
          fontFamily: "CalSans, sans-serif",
          fontSize: "72px",
          fontWeight: 600,
          color,
          textAlign: "center",
          maxWidth: "900px",
          lineHeight: 1.1,
          opacity: titleOpacity,
          transform: `scale(${titleScale}) translateY(${titleY}px)`,
          textShadow: "0 4px 60px rgba(0,0,0,0.3)",
        }}
      >
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "28px",
            fontWeight: 400,
            color: `${color}cc`,
            textAlign: "center",
            maxWidth: "800px",
            marginTop: "24px",
            opacity: subtitleOpacity,
            transform: `scale(${subtitleScale}) translateY(${subtitleY}px)`,
          }}
        >
          {subtitle}
        </p>
      )}
    </AbsoluteFill>
  );
};
