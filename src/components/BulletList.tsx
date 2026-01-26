import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface BulletListProps {
  items: string[];
  title?: string;
  delay?: number;
  color?: string;
  accentColor?: string;
}

export const BulletList = ({
  items,
  title,
  delay = 0,
  color = "#ffffff",
  accentColor = "#38bdf8",
}: BulletListProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const effectiveFrame = Math.max(0, frame - delay);

  const titleOpacity = interpolate(effectiveFrame, [0, 15], [0, 1], {
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
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {/* Title */}
        {title && (
          <h2
            style={{
              fontFamily: "CalSans, sans-serif",
              fontSize: "42px",
              fontWeight: 600,
              color,
              marginBottom: "40px",
              opacity: titleOpacity,
              textAlign: "center",
            }}
          >
            {title}
          </h2>
        )}

        {/* List items */}
        {items.map((item, index) => {
          const itemStart = 15 + index * 10;
          const itemFrame = Math.max(0, effectiveFrame - itemStart);

          const springVal = spring({
            frame: itemFrame,
            fps,
            config: {
              damping: 20,
              stiffness: 100,
            },
          });

          const opacity = interpolate(itemFrame, [0, 10], [0, 1], {
            extrapolateRight: "clamp",
          });

          const x = interpolate(springVal, [0, 1], [-30, 0]);
          const scale = interpolate(springVal, [0, 1], [0.95, 1]);

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "24px",
                opacity,
                transform: `translateX(${x}px) scale(${scale})`,
              }}
            >
              {/* Bullet point */}
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: accentColor,
                  marginTop: "14px",
                  marginRight: "20px",
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${accentColor}80`,
                }}
              />

              {/* Text */}
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: `${color}dd`,
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {item}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
