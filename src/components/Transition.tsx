import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type TransitionType = "fade" | "slide" | "scale" | "wipe";

interface TransitionProps {
  type?: TransitionType;
  duration?: number; // in frames
  direction?: "in" | "out";
  children: React.ReactNode;
}

export const Transition = ({
  type = "fade",
  duration = 15,
  direction = "in",
  children,
}: TransitionProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const progress = Math.min(1, frame / duration);

  let style: React.CSSProperties = {};
  let contentStyle: React.CSSProperties = {};

  switch (type) {
    case "fade":
      const opacity = direction === "in" ? progress : 1 - progress;
      contentStyle = { opacity };
      break;

    case "slide":
      const slideY = direction === "in"
        ? interpolate(progress, [0, 1], [height, 0])
        : interpolate(progress, [0, 1], [0, -height]);
      contentStyle = {
        transform: `translateY(${slideY}px)`,
      };
      break;

    case "scale":
      const scale = direction === "in"
        ? interpolate(progress, [0, 1], [1.2, 1])
        : interpolate(progress, [0, 1], [1, 0.8]);
      const scaleOpacity = direction === "in"
        ? interpolate(progress, [0, 0.5, 1], [0, 0, 1])
        : interpolate(progress, [0, 0.5, 1], [1, 0, 0]);
      contentStyle = {
        transform: `scale(${scale})`,
        opacity: scaleOpacity,
      };
      break;

    case "wipe":
      const clipWidth = direction === "in"
        ? interpolate(progress, [0, 1], [0, width])
        : interpolate(progress, [0, 1], [width, 0]);
      contentStyle = {
        clipPath: `inset(0 ${width - clipWidth}px 0 0)`,
      };
      break;
  }

  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          width: "100%",
          height: "100%",
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
