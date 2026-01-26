import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  delayRender,
  continueRender,
} from "remotion";
import { useMemo, useEffect, useState } from "react";

/**
 * Particle system with floating particles
 */
interface ParticlesProps {
  count?: number;
  color?: string;
  size?: [number, number];
  speed?: number;
  opacity?: number;
}

export const Particles = ({
  count = 50,
  color = "#ffffff",
  size = [2, 6],
  speed = 1,
  opacity = 0.3,
}: ParticlesProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Generate particles once
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: size[0] + Math.random() * (size[1] - size[0]),
      speed: 0.5 + Math.random() * speed,
      phase: Math.random() * Math.PI * 2,
      amplitude: 20 + Math.random() * 80,
    }));
  }, [count, width, height, size, speed]);

  return (
    <AbsoluteFill>
      {particles.map((p) => {
        const y = p.y + Math.sin((frame * p.speed * 0.02) + p.phase) * p.amplitude;
        const fadeOpacity = opacity * (0.5 + 0.5 * Math.sin((frame * 0.02) + p.phase));

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: fadeOpacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Glowing orb effect
 */
interface GlowingOrbProps {
  x?: number | string;
  y?: number | string;
  size?: number;
  color?: string;
  pulseSpeed?: number;
  blur?: number;
}

export const GlowingOrb = ({
  x = "50%",
  y = "50%",
  size = 400,
  color = "#38bdf8",
  pulseSpeed = 1,
  blur = 100,
}: GlowingOrbProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin((frame * pulseSpeed * Math.PI * 2) / fps) * 0.2 + 0.8;
  const currentSize = size * pulse;

  return (
    <div
      style={{
        position: "absolute",
        left: typeof x === "number" ? x - currentSize / 2 : x,
        top: typeof y === "number" ? y - currentSize / 2 : y,
        width: currentSize,
        height: currentSize,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity: 0.6,
      }}
    />
  );
};

/**
 * Multiple animated gradient orbs
 */
export const GradientOrbs = ({
  colors = ["#38bdf8", "#818cf8", "#c084fc"],
  count = 3,
}: {
  colors?: string[];
  count?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      baseX: (width / (count + 1)) * (i + 1),
      baseY: height * 0.3 + Math.random() * height * 0.4,
      size: 300 + Math.random() * 200,
      color: colors[i % colors.length],
      phase: (i / count) * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
    }));
  }, [count, width, height, colors]);

  return (
    <AbsoluteFill>
      {orbs.map((orb) => {
        const x = orb.baseX + Math.sin((frame * orb.speed * 0.02) + orb.phase) * 100;
        const y = orb.baseY + Math.cos((frame * orb.speed * 0.015) + orb.phase) * 80;
        const pulse = 0.8 + 0.2 * Math.sin((frame * 0.03) + orb.phase);
        const size = orb.size * pulse;

        return (
          <div
            key={orb.id}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}40 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Animated gradient mesh background
 */
export const GradientMesh = ({
  colors = ["#0f172a", "#1e293b", "#334155"],
  speed = 1,
}: {
  colors?: string[];
  speed?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rotation = (frame * speed * 0.1) % 360;
  const phase1 = (frame * speed * 0.02) % (Math.PI * 2);
  const phase2 = (frame * speed * 0.015 + Math.PI) % (Math.PI * 2);

  const gradient = `
    linear-gradient(
      ${rotation}deg,
      ${colors[0]} 0%,
      ${colors[1]} ${40 + 10 * Math.sin(phase1) * 100}%,
      ${colors[2]} ${70 + 10 * Math.cos(phase2) * 100}%,
      ${colors[0]} 100%
    )
  `;

  return (
    <AbsoluteFill
      style={{
        background: gradient,
        backgroundSize: "200% 200%",
      }}
    />
  );
};

/**
 * Light rays / god rays effect
 */
export const LightRays = ({
  color = "#ffffff",
  rayCount = 8,
  opacity = 0.1,
  rotationSpeed = 0.05,
}: {
  color?: string;
  rayCount?: number;
  opacity?: number;
  rotationSpeed?: number;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const rotation = frame * rotationSpeed;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          opacity,
        }}
      >
        <defs>
          <radialGradient id="rayGradient">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g
          transform={`rotate(${rotation} ${width / 2} ${height / 2})`}
          style={{
            transformOrigin: "center",
          }}
        >
          {Array.from({ length: rayCount }).map((_, i) => {
            const angle = (i / rayCount) * 360;
            const rayWidth = 30 + Math.sin(i * 0.5) * 20;

            return (
              <path
                key={i}
                d={`M ${width / 2} ${height / 2} L ${width / 2 + Math.cos((angle * Math.PI) / 180) * width} ${
                  height / 2 + Math.sin((angle * Math.PI) / 180) * width
                } L ${width / 2 + Math.cos(((angle + 5) * Math.PI) / 180) * width} ${
                  height / 2 + Math.sin(((angle + 5) * Math.PI) / 180) * width
                } Z`}
                fill="url(#rayGradient)"
                opacity={0.3 + 0.2 * Math.sin(i)}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Glitch effect for text or content
 */
export const GlitchOverlay = ({
  intensity = 0.5,
  frequency = 0.1,
}: {
  intensity?: number;
  frequency?: number;
}) => {
  const frame = useCurrentFrame();

  // Random glitch trigger
  const shouldGlitch = Math.random() < frequency;

  if (!shouldGlitch) return null;

  const offset1 = (Math.random() - 0.5) * 10 * intensity;
  const offset2 = (Math.random() - 0.5) * 10 * intensity;
  const colorShift = ["#ff0000", "#00ff00", "#0000ff"][Math.floor(Math.random() * 3)];

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: colorShift,
          opacity: 0.1 * intensity,
          transform: `translate(${offset1}px, 0)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: colorShift,
          opacity: 0.1 * intensity,
          transform: `translate(${offset2}px, 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Scanlines effect
 */
export const Scanlines = ({
  opacity = 0.03,
  lineSize = 2,
  speed = 0,
}: {
  opacity?: number;
  lineSize?: number;
  speed?: number;
}) => {
  const frame = useCurrentFrame();
  const offset = speed ? (frame * speed) % (lineSize * 2) : 0;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent ${lineSize}px,
            rgba(0, 0, 0, ${opacity}) ${lineSize}px,
            rgba(0, 0, 0, ${opacity}) ${lineSize * 2}px
          )`,
          transform: `translateY(${offset}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Spotlight / vignette effect
 */
export const Spotlight = ({
  x = "50%",
  y = "30%",
  size = 400,
  softness = 0.5,
}: {
  x?: string | number;
  y?: string | number;
  size?: number;
  softness?: number;
}) => {
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(
            circle at ${x} ${y},
            transparent 0%,
            transparent ${size * (1 - softness)}px,
            rgba(0, 0, 0, 0.8) ${size}px
          )`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Floating shapes background
 */
interface FloatingShape {
  type: "circle" | "square" | "triangle";
  x: number;
  y: number;
  size: number;
  rotation: number;
  speed: number;
  color: string;
}

export const FloatingShapes = ({
  count = 10,
  colors = ["#38bdf8", "#818cf8", "#c084fc", "#f472b6"],
}: {
  count?: number;
  colors?: string[];
}) => {
  const frame = useCurrentFrame();

  const shapes = useMemo<FloatingShape[]>(() => {
    const types: Array<"circle" | "square" | "triangle"> = ["circle", "square", "triangle"];
    return Array.from({ length: count }, (_, i) => ({
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 60,
      rotation: Math.random() * 360,
      speed: 0.2 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [count, colors]);

  return (
    <AbsoluteFill>
      {shapes.map((shape, i) => {
        const yOffset = Math.sin((frame * shape.speed * 0.02) + i) * 50;
        const rotation = shape.rotation + frame * shape.speed * 0.5;
        const opacity = 0.1 + 0.1 * Math.sin((frame * 0.02) + i * 0.5);

        const shapeStyle = {
          position: "absolute" as const,
          left: `${shape.x}%`,
          top: `calc(${shape.y}% + ${yOffset}px)`,
          width: shape.size,
          height: shape.size,
          backgroundColor: shape.color,
          opacity,
          transform: `rotate(${rotation}deg)`,
        };

        if (shape.type === "circle") {
          return <div key={i} style={{ ...shapeStyle, borderRadius: "50%" }} />;
        }
        if (shape.type === "triangle") {
          return (
            <div
              key={i}
              style={{
                ...shapeStyle,
                backgroundColor: "transparent",
                borderLeft: `${shape.size / 2}px solid transparent`,
                borderRight: `${shape.size / 2}px solid transparent`,
                borderBottom: `${shape.size}px solid ${shape.color}`,
                width: 0,
                height: 0,
              }}
            />
          );
        }
        return <div key={i} style={shapeStyle} />;
      })}
    </AbsoluteFill>
  );
};

/**
 * Noise texture overlay
 */
export const Noise = ({ opacity = 0.02 }: { opacity?: number }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        pointerEvents: "none",
      }}
    />
  );
};
