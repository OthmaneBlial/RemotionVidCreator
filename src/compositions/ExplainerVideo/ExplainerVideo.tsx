import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  Series,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Background, TitleCard, TextBlock, BulletList, ProgressBar } from "../../components";
import { ExplainerVideoProps } from "./schema";

export const ExplainerVideo = ({
  topic,
  script,
  colorScheme = "default",
  accentColor,
}: ExplainerVideoProps) => {
  const { fps } = useVideoConfig();

  // Get accent color from scheme if not provided
  const schemeColors: Record<string, string> = {
    default: "#38bdf8",
    warm: "#f97316",
    cool: "#22d3ee",
    dark: "#ffffff",
  };
  const effectiveAccent = accentColor || schemeColors[colorScheme];

  // Timing for each section (in frames)
  const introDuration = 4 * fps; // 4 seconds
  const hookDuration = 5 * fps; // 5 seconds
  const sectionTitleDuration = 2 * fps; // 2 seconds per section title
  const sectionContentDuration = 5 * fps; // 5 seconds per section content
  const outroDuration = 5 * fps; // 5 seconds

  return (
    <AbsoluteFill>
      {/* Background */}
      <Background variant="gradient" colorScheme={colorScheme} />

      {/* Progress Bar */}
      <ProgressBar color={effectiveAccent} />

      {/* Video Content */}
      <Series>
        {/* Intro with Title */}
        <Series.Sequence durationInFrames={introDuration}>
          <TitleCard
            title={script.title}
            subtitle="Explained"
            color={effectiveAccent}
          />
        </Series.Sequence>

        {/* Hook */}
        <Series.Sequence durationInFrames={hookDuration}>
          <AbsoluteFill style={{ justifyContent: "center", padding: 60 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 60,
                  backgroundColor: effectiveAccent,
                  marginRight: 24,
                  borderRadius: 2,
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 42,
                  fontWeight: 600,
                  color: "#ffffff",
                  textAlign: "center",
                  lineHeight: 1.4,
                  maxWidth: 900,
                }}
              >
                {script.hook}
              </p>
            </div>
          </AbsoluteFill>
        </Series.Sequence>

        {/* Content Sections */}
        {script.sections.map((section, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={sectionTitleDuration + sectionContentDuration}
          >
            <SectionContent
              section={section}
              sectionTitleDuration={sectionTitleDuration}
              sectionContentDuration={sectionContentDuration}
              accentColor={effectiveAccent}
              index={index}
            />
          </Series.Sequence>
        ))}

        {/* Outro */}
        <Series.Sequence durationInFrames={outroDuration}>
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              padding: 60,
            }}
          >
            <p
              style={{
                fontFamily: "CalSans, sans-serif",
                fontSize: 48,
                fontWeight: 600,
                color: effectiveAccent,
                textAlign: "center",
                maxWidth: 900,
                lineHeight: 1.3,
              }}
            >
              {script.outro}
            </p>
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

interface SectionContentProps {
  section: { title: string; content: string };
  sectionTitleDuration: number;
  sectionContentDuration: number;
  accentColor: string;
  index: number;
}

const SectionContent = ({
  section,
  sectionTitleDuration,
  sectionContentDuration,
  accentColor,
  index,
}: SectionContentProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which phase we're in
  const titleEndFrame = sectionTitleDuration;
  const isTitlePhase = frame < titleEndFrame;
  const isContentPhase = frame >= titleEndFrame;

  // Title animation
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  // Content animation
  const contentStartFrame = titleEndFrame;
  const contentFrame = Math.max(0, frame - contentStartFrame);
  const contentOpacity = interpolate(contentFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const contentY = interpolate(contentFrame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
  });

  // Section number indicator
  const sectionNumberOpacity = isTitlePhase
    ? titleOpacity
    : interpolate(frame, [titleEndFrame - 10, titleEndFrame], [1, 0.3], {
        extrapolateRight: "clamp",
      });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Section Number */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 60,
          opacity: sectionNumberOpacity,
        }}
      >
        <span
          style={{
            fontFamily: "CalSans, sans-serif",
            fontSize: 120,
            fontWeight: 700,
            color: `${accentColor}15`,
            lineHeight: 1,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Section Title */}
      <div
        style={{
          opacity: isTitlePhase ? titleOpacity : interpolate(frame, [
            titleEndFrame - 20,
            titleEndFrame - 5,
          ], [1, 0.3], {
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${isTitlePhase ? titleY : 0}px)`,
          transition: "opacity 0.5s",
        }}
      >
        <h2
          style={{
            fontFamily: "CalSans, sans-serif",
            fontSize: 56,
            fontWeight: 600,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          {section.title}
        </h2>
        <div
          style={{
            width: 100,
            height: 4,
            backgroundColor: accentColor,
            margin: "0 auto",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Section Content */}
      {isContentPhase && (
        <div
          style={{
            opacity: contentOpacity,
            transform: `translateY(${contentY}px)`,
            marginTop: 40,
          }}
        >
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 36,
              fontWeight: 400,
              color: "#ffffffee",
              textAlign: "center",
              maxWidth: 850,
              lineHeight: 1.5,
            }}
          >
            {section.content}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const calculateMetadata: CalculateMetadataFunction<ExplainerVideoProps> = async ({
  props,
}) => {
  const fps = 30;

  // Calculate duration based on script length
  const introDuration = 4 * fps; // 4 seconds
  const hookDuration = 5 * fps; // 5 seconds
  const sectionTitleDuration = 2 * fps; // 2 seconds per section title
  const sectionContentDuration = 5 * fps; // 5 seconds per section content
  const outroDuration = 5 * fps; // 5 seconds

  const sectionCount = props.script.sections.length;
  const totalDuration =
    introDuration +
    hookDuration +
    sectionCount * (sectionTitleDuration + sectionContentDuration) +
    outroDuration;

  return {
    durationInFrames: totalDuration,
  };
};
