import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { useMemo } from "react";

export interface SlideImage {
  src: string;
  alt?: string;
  author?: string;
}

interface ImageSlideshowProps {
  images: SlideImage[];
  durationPerImage: number; // in frames
  kenBurns?: boolean;
  kenBurnsIntensity?: "subtle" | "medium" | "strong";
  overlayColor?: string;
  overlayOpacity?: number;
  blurEdges?: boolean;
}

export const ImageSlideshow = ({
  images,
  durationPerImage,
  kenBurns = true,
  kenBurnsIntensity = "medium",
  overlayColor = "#000000",
  overlayOpacity = 0.3,
  blurEdges = true,
}: ImageSlideshowProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Calculate which image to show
  const imageIndex = Math.floor(frame / durationPerImage) % images.length;
  const imageFrame = frame % durationPerImage;
  const progress = imageFrame / durationPerImage;

  // Ken Burns zoom and pan values
  const intensityValues = {
    subtle: { scaleIn: 1.05, scaleOut: 1.1, pan: 20 },
    medium: { scaleIn: 1.1, scaleOut: 1.2, pan: 40 },
    strong: { scaleIn: 1.15, scaleOut: 1.3, pan: 60 },
  };

  const intensity = intensityValues[kenBurnsIntensity];

  // Vary direction per image for visual interest
  const directions = [
    { x: -1, y: -1 }, // top-left
    { x: 1, y: -1 },  // top-right
    { x: -1, y: 1 },  // bottom-left
    { x: 1, y: 1 },   // bottom-right
    { x: 0, y: -1 },  // center-top
    { x: 0, y: 1 },   // center-bottom
  ];

  const direction = directions[imageIndex % directions.length];

  // Calculate Ken Burns effect
  const scale = interpolate(
    progress,
    [0, 1],
    [intensity.scaleIn, intensity.scaleOut],
    { extrapolateRight: "clamp" }
  );

  const panX = interpolate(progress, [0, 1], [0, direction.x * intensity.pan], {
    extrapolateRight: "clamp",
  });

  const panY = interpolate(progress, [0, 1], [0, direction.y * intensity.pan], {
    extrapolateRight: "clamp",
  });

  // Transition opacity
  const transitionDuration = 15; // frames
  let opacity = 1;

  if (imageFrame < transitionDuration) {
    // Fade in
    opacity = interpolate(imageFrame, [0, transitionDuration], [0, 1]);
  } else if (imageFrame > durationPerImage - transitionDuration) {
    // Fade out
    opacity = interpolate(
      imageFrame,
      [durationPerImage - transitionDuration, durationPerImage],
      [1, 0]
    );
  }

  const currentImage = images[imageIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Background Image with Ken Burns */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt || "Background"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
              opacity,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />

      {/* Blur edges effect (vignette) */}
      {blurEdges && (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at center, transparent 40%, ${overlayColor}${Math.floor(
                overlayOpacity * 255
              )
                .toString(16)
                .padStart(2, "0")} 100%)`,
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/**
 * Single image with Ken Burns effect and zoom
 */
interface SingleImageProps {
  src: string;
  zoomDirection?: "in" | "out";
  intensity?: number;
  panX?: number;
  panY?: number;
  overlayOpacity?: number;
  grayscale?: boolean;
}

export const KenBurnsImage = ({
  src,
  zoomDirection = "in",
  intensity = 1.15,
  panX = 0,
  panY = 0,
  overlayOpacity = 0.2,
  grayscale = false,
}: SingleImageProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate zoom over duration (default 5 seconds)
  const duration = 5 * fps;
  const progress = Math.min(frame / duration, 1);

  const scaleStart = zoomDirection === "in" ? 1 : intensity;
  const scaleEnd = zoomDirection === "in" ? intensity : 1;

  const scale = interpolate(progress, [0, 1], [scaleStart, scaleEnd]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <img
        src={src}
        alt="Background"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
          filter: grayscale ? "grayscale(100%)" : "none",
        }}
      />

      {/* Overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          opacity: overlayOpacity,
        }}
      />

      {/* Vignette */}
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Image with parallax scroll effect
 */
interface ParallaxImageProps {
  src: string;
  parallaxIntensity?: number;
  overlayOpacity?: number;
}

export const ParallaxImage = ({
  src,
  parallaxIntensity = 50,
  overlayOpacity = 0.3,
}: ParallaxImageProps) => {
  const frame = useCurrentFrame();

  const y = interpolate(frame, [0, 30], [-parallaxIntensity, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <img
        src={src}
        alt="Background"
        style={{
          position: "absolute",
          width: "100%",
          height: "120%", // Taller for parallax room
          top: "-10%",
          transform: `translateY(${y}px)`,
          objectFit: "cover",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          opacity: overlayOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
