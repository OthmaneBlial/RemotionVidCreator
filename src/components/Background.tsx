import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Background = ({
  variant = "gradient",
  colorScheme = "default",
}: {
  variant?: "gradient" | "solid" | "pattern";
  colorScheme?: "default" | "warm" | "cool" | "dark";
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const schemes = {
    default: {
      from: "#0f172a",
      via: "#1e293b",
      to: "#334155",
      accent: "#38bdf8",
    },
    warm: {
      from: "#1c1917",
      via: "#292524",
      to: "#44403c",
      accent: "#f97316",
    },
    cool: {
      from: "#0c4a6e",
      via: "#075985",
      to: "#0369a1",
      accent: "#22d3ee",
    },
    dark: {
      from: "#000000",
      via: "#0a0a0a",
      to: "#171717",
      accent: "#ffffff",
    },
  };

  const colors = schemes[colorScheme];

  const rotation = interpolate(
    frame,
    [0, 10 * fps],
    [0, 360],
    { extrapolateRight: "clamp" }
  );

  const pulseOpacity = interpolate(
    frame % (3 * fps),
    [0, 1.5 * fps, 3 * fps],
    [0.3, 0.6, 0.3],
    { extrapolateRight: "clamp" }
  );

  if (variant === "pattern") {
    return (
      <AbsoluteFill style={{ backgroundColor: colors.from }}>
        {/* Animated geometric pattern */}
        <svg
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            opacity: 0.1,
          }}
        >
          <defs>
            <pattern
              id="grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="30" cy="30" r="2" fill={colors.accent} />
              <line
                x1="0"
                y1="30"
                x2="60"
                y2="30"
                stroke={colors.accent}
                strokeWidth="0.5"
              />
              <line
                x1="30"
                y1="0"
                x2="30"
                y2="60"
                stroke={colors.accent}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating orbs */}
        <div
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`,
            filter: "blur(60px)",
            left: "-100px",
            top: `${height * 0.2}px`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.accent}30 0%, transparent 70%)`,
            filter: "blur(50px)",
            right: "-50px",
            bottom: `${height * 0.3}px`,
            opacity: pulseOpacity,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (variant === "solid") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.from,
        }}
      />
    );
  }

  // Default gradient
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${rotation}deg, ${colors.from}, ${colors.via}, ${colors.to}, ${colors.from})`,
          backgroundSize: "400% 400%",
        }}
      />

      {/* Animated gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% ${interpolate(
            frame,
            [0, 5 * fps],
            [30, 70],
            { extrapolateRight: "clamp" }
          )}%, ${colors.accent}15 0%, transparent 50%)`,
        }}
      />

      {/* Noise texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </AbsoluteFill>
  );
};
