import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { useMemo, useCallback } from "react";

export interface SlideImage {
  src: string;
  alt?: string;
  author?: string;
  authorUrl?: string;
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

  // MEMOIZED: Calculate which image to show
  const imageIndex = useMemo(
    () => Math.floor(frame / durationPerImage) % images.length,
    [frame, durationPerImage, images.length]
  );

  const imageFrame = frame % durationPerImage;
  const progress = imageFrame / durationPerImage;

  // MEMOIZED: Ken Burns zoom and pan values (cached per intensity)
  const intensityValues = useMemo(
    () => ({
      subtle: { scaleIn: 1.05, scaleOut: 1.1, pan: 20 },
      medium: { scaleIn: 1.1, scaleOut: 1.2, pan: 40 },
      strong: { scaleIn: 1.15, scaleOut: 1.3, pan: 60 },
    }),
    []
  );

  const intensity = intensityValues[kenBurnsIntensity];

  // MEMOIZED: Vary direction per image for visual interest
  const direction = useMemo(
    () => {
      const directions = [
        { x: -1, y: -1 }, // top-left
        { x: 1, y: -1 },  // top-right
        { x: -1, y: 1 },  // bottom-left
        { x: 1, y: 1 },   // bottom-right
        { x: 0, y: -1 },  // center-top
        { x: 0, y: 1 },   // center-bottom
      ];
      return directions[imageIndex % directions.length];
    },
    [imageIndex]
  );

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
  const opacity = useMemo(() => {
    if (imageFrame < transitionDuration) {
      // Fade in
      return interpolate(imageFrame, [0, transitionDuration], [0, 1]);
    } else if (imageFrame > durationPerImage - transitionDuration) {
      // Fade out
      return interpolate(
        imageFrame,
        [durationPerImage - transitionDuration, durationPerImage],
        [1, 0]
      );
    }
    return 1;
  }, [imageFrame, durationPerImage, transitionDuration]);

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

      {currentImage.author ? (
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 28,
            zIndex: 5,
            maxWidth: "70%",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.92)",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            lineHeight: 1.4,
            backdropFilter: "blur(12px)",
          }}
        >
          <span>Photo by {currentImage.author} on Unsplash</span>
          {currentImage.authorUrl ? (
            <span style={{ color: "rgba(255,255,255,0.7)", display: "block", marginTop: 2 }}>
              {currentImage.authorUrl}
            </span>
          ) : null}
        </div>
      ) : null}
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
  author?: string;
  authorUrl?: string;
}

export const KenBurnsImage = ({
  src,
  zoomDirection = "in",
  intensity = 1.15,
  panX = 0,
  panY = 0,
  overlayOpacity = 0.2,
  grayscale = false,
  author,
  authorUrl,
}: SingleImageProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate zoom over duration (default 5 seconds)
  const duration = 5 * fps;
  const progress = Math.min(frame / duration, 1);

  // MEMOIZED: Calculate scale values
  const { scaleStart, scaleEnd } = useMemo(
    () => ({
      scaleStart: zoomDirection === "in" ? 1 : intensity,
      scaleEnd: zoomDirection === "in" ? intensity : 1,
    }),
    [zoomDirection, intensity]
  );

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

      {author ? (
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 28,
            zIndex: 5,
            maxWidth: "70%",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.92)",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            lineHeight: 1.4,
            backdropFilter: "blur(12px)",
          }}
        >
          <span>Photo by {author} on Unsplash</span>
          {authorUrl ? (
            <span style={{ color: "rgba(255,255,255,0.7)", display: "block", marginTop: 2 }}>
              {authorUrl}
            </span>
          ) : null}
        </div>
      ) : null}

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
