import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  Series,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
} from "remotion";
import {
  Background,
  TitleCard,
  TextBlock,
  BulletList,
  ProgressBar,
  ImageSlideshow,
  KenBurnsImage,
  ParallaxImage,
  Particles,
  GlowingOrb,
  GradientOrbs,
  GradientMesh,
  LightRays,
  GlitchOverlay,
  Scanlines,
  Spotlight,
  FloatingShapes,
  Noise,
} from "../../components";
import { ExplainerVideoProps } from "./schema";

export const ExplainerVideo = ({
  topic,
  script,
  colorScheme = "default",
  accentColor,
  images = [],
  audio,
  targetDurationSeconds,
  aspectRatio = "9:16",
  fontSizeScale = 1,
  stylePreset,
  audience,
  platform,
  intensity,
  motionLevel,
  visualDensity,
}: ExplainerVideoProps) => {
  const { fps } = useVideoConfig();
  const creativeDirection = script.creativeDirection;
  const effectiveStylePreset = creativeDirection?.stylePreset || stylePreset || "cinematic";
  const effectiveIntensity = creativeDirection?.intensity || intensity || "balanced";
  const effectiveMotion = creativeDirection?.motionLevel || motionLevel || "medium";
  const effectiveVisualDensity = creativeDirection?.visualDensity || visualDensity || "balanced";

  // Get colors from script or fallback
  const primaryColor = script.primaryColor || "#0f172a";
  const effectiveAccent = accentColor || script.accentColor || "#38bdf8";
  const particleCount =
    effectiveVisualDensity === "rich" ? 44 : effectiveVisualDensity === "minimal" ? 14 : 28;
  const orbCount =
    effectiveStylePreset === "premium"
      ? 3
      : effectiveStylePreset === "documentary"
        ? 2
        : 4;
  const rayCount = effectiveIntensity === "wild" ? 9 : effectiveIntensity === "safe" ? 4 : 6;
  const backgroundSpeed =
    effectiveMotion === "high" ? 0.75 : effectiveMotion === "minimal" ? 0.25 : 0.5;
  const introSubtitle =
    effectiveStylePreset === "premium"
      ? "Premium Breakdown"
      : effectiveStylePreset === "educational"
        ? "Explained Clearly"
        : effectiveStylePreset === "documentary"
          ? "Context and Clarity"
          : "Explained";

  // Timing for each section (in frames) - scaled to the requested duration when provided
  const defaultIntroDuration = 5 * fps;
  const defaultHookDuration = 6 * fps;
  const defaultSectionTitleDuration = 3 * fps;
  const defaultSectionContentDuration = 7 * fps;
  const defaultOutroDuration = 6 * fps;

  const defaultDurationFrames =
    defaultIntroDuration +
    defaultHookDuration +
    script.sections.length * (defaultSectionTitleDuration + defaultSectionContentDuration) +
    defaultOutroDuration;

  const requestedDurationFrames = targetDurationSeconds ? targetDurationSeconds * fps : defaultDurationFrames;
  const timingScale = requestedDurationFrames / defaultDurationFrames;

  const scaleFrames = (frames: number) => Math.max(1, Math.round(frames * timingScale));

  const introDuration = scaleFrames(defaultIntroDuration);
  const hookDuration = scaleFrames(defaultHookDuration);
  const sectionTitleDuration = scaleFrames(defaultSectionTitleDuration);
  const sectionContentDuration = scaleFrames(defaultSectionContentDuration);
  const outroDuration = targetDurationSeconds
    ? Math.max(
        1,
        Math.round(
          requestedDurationFrames -
            (introDuration +
              hookDuration +
              script.sections.length * (sectionTitleDuration + sectionContentDuration))
        )
      )
    : scaleFrames(defaultOutroDuration);

  return (
    <AbsoluteFill>
      {audio?.src ? <Audio src={audio.src} volume={audio.volume ?? 0.55} /> : null}

      {/* Dynamic Background */}
      <GradientMesh
        colors={[primaryColor, "#1e293b", "#334155"]}
        speed={backgroundSpeed}
      />

      {/* Animated Gradient Orbs */}
      <GradientOrbs
        colors={[effectiveAccent, `${effectiveAccent}88`, "#818cf8"]}
        count={orbCount}
      />

      {/* Floating Particles */}
      <Particles
        count={particleCount}
        color={effectiveAccent}
        size={effectiveVisualDensity === "minimal" ? [1, 3] : [2, 5]}
        opacity={effectiveIntensity === "wild" ? 0.55 : 0.35}
      />

      {/* Noise Texture */}
      <Noise opacity={0.03} />

      {/* Progress Bar */}
      <ProgressBar color={effectiveAccent} />

      {/* Video Content */}
      <Series>
        {/* Dramatic Intro with Title */}
        <Series.Sequence durationInFrames={introDuration}>
          <DramaticIntro
            title={script.title}
            accentColor={effectiveAccent}
            images={images.slice(0, 3)}
            subtitle={introSubtitle}
            fontSizeScale={fontSizeScale}
          />
        </Series.Sequence>

        {/* Hook with Glitch Effect */}
        <Series.Sequence durationInFrames={hookDuration}>
          <HookSection
            hook={script.hook}
            accentColor={effectiveAccent}
            fontSizeScale={fontSizeScale}
          />
        </Series.Sequence>

        {/* Content Sections with Images */}
        {script.sections.map((section, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={sectionTitleDuration + sectionContentDuration}
          >
            <SectionWithImage
              section={section}
              sectionTitleDuration={sectionTitleDuration}
              sectionContentDuration={sectionContentDuration}
              accentColor={effectiveAccent}
              images={images.slice(3 + index * 2, 6 + index * 2)}
              caption={script.scenePlan?.[index + 1]?.caption}
              index={index}
              fontSizeScale={fontSizeScale}
            />
          </Series.Sequence>
        ))}

        {/* Dramatic Outro */}
        <Series.Sequence durationInFrames={outroDuration}>
          <DramaticOutro
            outro={script.outro}
            accentColor={effectiveAccent}
            title={script.title}
            cta={script.cta}
            fontSizeScale={fontSizeScale}
          />
        </Series.Sequence>
      </Series>

      {/* Light Rays Overlay */}
      <LightRays
        color={effectiveAccent}
        rayCount={rayCount}
        opacity={effectiveIntensity === "safe" ? 0.03 : 0.06}
        rotationSpeed={effectiveMotion === "high" ? 0.03 : 0.02}
      />

      {/* Subtle Scanlines */}
      <Scanlines opacity={0.02} lineSize={2} />
    </AbsoluteFill>
  );
};

/**
 * Dramatic intro with title reveal and image background
 */
interface DramaticIntroProps {
  title: string;
  accentColor: string;
  images: Array<{ src: string; alt?: string; author?: string; authorUrl?: string }>;
  subtitle: string;
  fontSizeScale: number;
}

const DramaticIntro = ({ title, accentColor, images, subtitle, fontSizeScale }: DramaticIntroProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image slideshow for background
  const hasImages = images.length > 0;

  return (
    <AbsoluteFill>
      {/* Background Image with Ken Burns */}
      {hasImages ? (
        <KenBurnsImage
          src={images[0].src}
          zoomDirection="in"
          intensity={1.2}
          overlayOpacity={0.5}
          author={images[0].author}
          authorUrl={images[0].authorUrl}
        />
      ) : (
        <GradientOrbs colors={[accentColor, "#818cf8", "#c084fc"]} count={3} />
      )}

      {/* Spotlight effect */}
      <Spotlight y="30%" size={500} softness={0.4} />

      {/* Title Reveal */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Decorative top line */}
          <div
            style={{
              width: "0px",
              height: "4px",
              background: accentColor,
              marginBottom: "24px",
              transformOrigin: "center",
              opacity: interpolate(frame, [0, 30], [0, 1]),
              boxShadow: `0 0 20px ${accentColor}`,
            }}
          />

          {/* Main Title */}
          <h1
            style={{
              fontFamily: "CalSans, sans-serif",
              fontSize: `${80 * fontSizeScale}px`,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: 1.1,
              opacity: interpolate(frame, [15, 45], [0, 1], { extrapolateRight: "clamp" }),
              transform: `scale(${interpolate(frame, [15, 45], [0.8, 1], {
                extrapolateRight: "clamp",
              })})`,
              textShadow: `0 0 60px ${accentColor}40, 0 4px 60px rgba(0,0,0,0.5)`,
              letterSpacing: "-2px",
            }}
          >
            {title.toUpperCase()}
          </h1>

          {/* Decorative bottom line */}
          <div
            style={{
              width: interpolate(frame, [60, 90], [0, 120 * fontSizeScale], { extrapolateRight: "clamp" }),
              height: "4px",
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              marginTop: `${32 * fontSizeScale}px`,
              borderRadius: "2px",
              boxShadow: `0 0 30px ${accentColor}`,
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: `${24 * fontSizeScale}px`,
              fontWeight: 400,
              color: `${accentColor}cc`,
              textAlign: "center",
              marginTop: `${40 * fontSizeScale}px`,
              opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" }),
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </p>
        </div>
      </AbsoluteFill>

      {/* Floating shapes */}
      <FloatingShapes count={8} colors={[accentColor, "#818cf8"]} />
    </AbsoluteFill>
  );
};

/**
 * Hook section with dramatic text reveal
 */
interface HookSectionProps {
  hook: string;
  accentColor: string;
  fontSizeScale: number;
}

const HookSection = ({ hook, accentColor, fontSizeScale }: HookSectionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = hook.split(" ");
  const wordsPerSecond = 2.5;
  const framesPerWord = fps / wordsPerSecond;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
      }}
    >
      {/* Glow effect behind text */}
      <GlowingOrb
        x="50%"
        y="50%"
        size={600}
        color={accentColor}
        pulseSpeed={0.5}
        blur={150}
      />

      {/* Text reveal word by word */}
      <div
        style={{
          maxWidth: "950px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        {words.map((word, i) => {
          const wordStartFrame = i * framesPerWord;
          const wordEndFrame = wordStartFrame + 15;

          const opacity = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + 10],
            [0, 1],
            { extrapolateRight: "clamp" }
          );

          const y = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + 15],
            [30, 0],
            { extrapolateRight: "clamp" }
          );

          return (
            <span
              key={i}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: `${42 * fontSizeScale}px`,
                fontWeight: 600,
                color: "#ffffff",
                opacity,
                transform: `translateY(${y}px)`,
                textShadow: `0 2px 30px rgba(0,0,0,0.5)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Section with image background and content
 */
interface SectionWithImageProps {
  section: { title: string; content: string; imageKeywords?: string[] };
  sectionTitleDuration: number;
  sectionContentDuration: number;
  accentColor: string;
  images: Array<{ src: string; alt?: string; author?: string; authorUrl?: string }>;
  caption?: string;
  index: number;
  fontSizeScale: number;
}

const SectionWithImage = ({
  section,
  sectionTitleDuration,
  sectionContentDuration,
  accentColor,
  images,
  caption,
  index,
  fontSizeScale,
}: SectionWithImageProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEndFrame = sectionTitleDuration;
  const isTitlePhase = frame < titleEndFrame;

  // Section number indicator
  const sectionNumberOpacity = isTitlePhase
    ? interpolate(frame, [0, 30], [0, 0.15], { extrapolateRight: "clamp" })
    : interpolate(frame, [titleEndFrame - 20, titleEndFrame], [0.15, 0.05], {
        extrapolateRight: "clamp",
      });

  return (
    <AbsoluteFill>
      {/* Background Image */}
      {images.length > 0 ? (
        <ImageSlideshow
          images={images}
          durationPerImage={sectionTitleDuration + sectionContentDuration}
          kenBurns
          kenBurnsIntensity="medium"
          overlayColor="#000000"
          overlayOpacity={0.5}
        />
      ) : (
        <GradientMesh colors={["#0f172a", "#1e293b", "#334155"]} speed={0.3} />
      )}

      {/* Section Number */}
      <div
        style={{
          position: "absolute",
          top: 200 * fontSizeScale,
          left: 80 * fontSizeScale,
          opacity: sectionNumberOpacity,
        }}
      >
        <span
          style={{
            fontFamily: "CalSans, sans-serif",
            fontSize: `${180 * fontSizeScale}px`,
            fontWeight: 800,
            color: accentColor,
            lineHeight: 1,
            opacity: 0.15,
            textShadow: `0 0 60px ${accentColor}40`,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: `${80 * fontSizeScale}px`,
        }}
      >
        {/* Section Title */}
        <div
          style={{
            opacity: isTitlePhase
              ? interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" })
              : interpolate(frame, [titleEndFrame - 25, titleEndFrame - 5], [1, 0.4], {
                  extrapolateRight: "clamp",
                }),
            transform: `translateY(${
              isTitlePhase
                ? interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" })
                : 0
            }px)`,
            marginBottom: `${40 * fontSizeScale}px`,
            transition: "opacity 0.5s",
          }}
        >
          {caption ? (
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: `${16 * fontSizeScale}px`,
                fontWeight: 600,
                color: `${accentColor}cc`,
                textAlign: "center",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: `${16 * fontSizeScale}px`,
              }}
            >
              {caption}
            </p>
          ) : null}
          <h2
            style={{
              fontFamily: "CalSans, sans-serif",
              fontSize: `${64 * fontSizeScale}px`,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: 1.2,
              marginBottom: `${24 * fontSizeScale}px`,
              textShadow: `0 4px 60px rgba(0,0,0,0.5)`,
            }}
          >
            {section.title.toUpperCase()}
          </h2>
          <div
            style={{
              width: `${100 * fontSizeScale}px`,
              height: "4px",
              background: accentColor,
              margin: "0 auto",
              borderRadius: "2px",
              boxShadow: `0 0 30px ${accentColor}`,
            }}
          />
        </div>

        {/* Section Content */}
        {frame >= titleEndFrame - 15 && (
          <div
            style={{
              opacity: interpolate(
                frame,
                [titleEndFrame - 15, titleEndFrame + 15],
                [0, 1],
                { extrapolateRight: "clamp" }
              ),
              transform: `translateY(${
                interpolate(
                  frame,
                  [titleEndFrame - 15, titleEndFrame + 20],
                  [40, 0],
                  { extrapolateRight: "clamp" }
                )
              }px)`,
              maxWidth: "850px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: `${38 * fontSizeScale}px`,
                fontWeight: 400,
                color: "#ffffffee",
                textAlign: "center",
                lineHeight: 1.5,
                textShadow: "0 2px 30px rgba(0,0,0,0.5)",
              }}
            >
              {section.content}
            </p>
          </div>
        )}
      </AbsoluteFill>

      {/* Decorative corner elements */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: "40px",
          height: "40px",
          borderLeft: `3px solid ${accentColor}`,
          borderTop: `3px solid ${accentColor}`,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          width: "40px",
          height: "40px",
          borderRight: `3px solid ${accentColor}`,
          borderBottom: `3px solid ${accentColor}`,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Dramatic outro with call to action
 */
interface DramaticOutroProps {
  outro: string;
  accentColor: string;
  title: string;
  cta?: string;
  fontSizeScale: number;
}

const DramaticOutro = ({ outro, accentColor, title, cta, fontSizeScale }: DramaticOutroProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Animated background */}
      <GradientOrbs
        colors={[accentColor, `${accentColor}88`, "#818cf8", "#c084fc"]}
        count={5}
      />

      {/* Particles */}
      <Particles count={50} color={accentColor} size={[2, 6]} opacity={0.5} />

      {/* Spotlight */}
      <Spotlight y="50%" size={700} softness={0.3} />

      {/* Content */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: `${80 * fontSizeScale}px`,
        }}
      >
        {/* Topic reminder */}
        <div
          style={{
            opacity: interpolate(frame, [0, 30], [0, 0.4], { extrapolateRight: "clamp" }),
            marginBottom: `${60 * fontSizeScale}px`,
          }}
        >
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: `${20 * fontSizeScale}px`,
              fontWeight: 500,
              color: accentColor,
              textAlign: "center",
              letterSpacing: "6px",
              textTransform: "uppercase",
            }}
          >
            {title}
          </p>
        </div>

        {/* Main message */}
        <div
          style={{
            opacity: interpolate(frame, [15, 45], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(frame, [15, 45], [0.9, 1], {
              extrapolateRight: "clamp",
            })})`,
          }}
        >
          <p
            style={{
              fontFamily: "CalSans, sans-serif",
              fontSize: `${56 * fontSizeScale}px`,
              fontWeight: 600,
              color: "#ffffff",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: 1.3,
              textShadow: `0 0 60px ${accentColor}40, 0 4px 60px rgba(0,0,0,0.5)`,
            }}
          >
            {outro}
          </p>
        </div>

        {/* Call to action */}
        <div
          style={{
            opacity: interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" }),
            marginTop: `${80 * fontSizeScale}px`,
          }}
        >
          <div
            style={{
              padding: `${20 * fontSizeScale}px ${50 * fontSizeScale}px`,
              border: `2px solid ${accentColor}`,
              borderRadius: "50px",
              background: `${accentColor}15`,
              backdropFilter: "blur(10px)",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: `${24 * fontSizeScale}px`,
                fontWeight: 600,
                color: "#ffffff",
                textAlign: "center",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              {cta || "Follow for more"}
            </p>
          </div>
        </div>
      </AbsoluteFill>

      {/* Scanlines */}
      <Scanlines opacity={0.05} />
    </AbsoluteFill>
  );
};

export const calculateMetadata: CalculateMetadataFunction<ExplainerVideoProps> = async ({
  props,
}) => {
  const fps = 30;

  const introDuration = 5 * fps;
  const hookDuration = 6 * fps;
  const sectionTitleDuration = 3 * fps;
  const sectionContentDuration = 7 * fps;
  const outroDuration = 6 * fps;

  const sectionCount = props.script.sections.length;
  const defaultDuration =
    introDuration +
    hookDuration +
    sectionCount * (sectionTitleDuration + sectionContentDuration) +
    outroDuration;

  return {
    durationInFrames: props.targetDurationSeconds
      ? Math.max(1, Math.round(props.targetDurationSeconds * fps))
      : defaultDuration,
  };
};
