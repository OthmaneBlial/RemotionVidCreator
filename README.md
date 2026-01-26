# Remotion Explainer Video Generator

Generate engaging explainer videos from any topic using Remotion. The system researches the topic, generates a script, and produces a polished 9:16 vertical video ready for TikTok, Instagram Reels, or YouTube Shorts.

## Features

- **Auto-generated scripts**: Researches topics and structures content into hooks, sections, and outros
- **Multiple tones**: informative, casual, professional, or dramatic
- **Animated components**: Smooth transitions, text animations, and progress indicators
- **Customizable**: Color schemes, timing, and content styles
- **CLI interface**: Simple command to generate videos from any topic

## Quick Start

```bash
# Install dependencies
npm install

# Start Remotion Studio (preview mode)
npm start

# Generate a video
npm run generate "The Future of AI"
```

## Usage

### Generate a video

```bash
npm run generate "your topic here"
```

### With options

```bash
npm run generate "your topic" --tone casual --complexity simple
```

### Options

| Option | Values | Description |
|--------|--------|-------------|
| `--tone` | `informative`, `casual`, `professional`, `dramatic` | Sets the video tone |
| `--complexity` | `simple`, `medium`, `detailed` | Content depth |
| `--output` | filepath | Custom output path |

## Examples

```bash
# Casual video about quantum computing
npm run generate "Quantum Computing" --tone casual

# Professional explanation of blockchain
npm run generate "Blockchain Technology" --tone professional

# Detailed video with custom output
npm run generate "Machine Learning Basics" --complexity detailed --output ./videos/ml.mp4
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Background.tsx    # Animated gradient backgrounds
│   ├── TitleCard.tsx     # Title with spring animations
│   ├── TextBlock.tsx     # Typewriter text effect
│   ├── BulletList.tsx    # Staggered list animations
│   ├── ProgressBar.tsx   # Video progress indicator
│   └── Transition.tsx    # Scene transitions
├── compositions/
│   └── ExplainerVideo/   # Main video composition
│       ├── ExplainerVideo.tsx
│       └── schema.ts
├── utils/
│   └── generate-script.ts # Script generation logic
├── root.tsx              # Composition definitions
└── index.ts              # Entry point
```

## Customization

### Modify the video style

Edit `src/compositions/ExplainerVideo/ExplainerVideo.tsx` to change timing, layout, or animations.

### Add new components

Create components in `src/components/` following the Remotion animation guidelines:
- Use `useCurrentFrame()` for all animations
- Avoid CSS transitions and animations
- Use `interpolate()` for smooth values

### Change color schemes

Edit `src/components/Background.tsx` to add new color schemes.

## Development

```bash
# Type check
npm run typecheck

# Preview in Remotion Studio
npm start

# Render with custom props
npx remotion render ExplainerVideo out.mp4 --props='{"topic":"Test"}'
```

## License

MIT
