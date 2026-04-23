# Remotion AI Video Generator

Generate engaging explainer videos from any topic using Remotion. The system researches the topic, builds a scene plan, generates a script, and produces a polished vertical video ready for TikTok, Instagram Reels, or YouTube Shorts.

The app now uses a Python backend for job orchestration and Unsplash rate tracking, while the browser frontend stays focused on prompting, status, and review.

## Product Direction

This repository is now locked to a single supported user workflow: AI video generation.

Stays:

- AI mode as the primary creation flow
- Python-backed orchestration, progress tracking, and render execution
- Unsplash sourcing, hotlinking, download tracking, and attribution

Goes:

- Editor-first navigation and manual timeline editing as a product path
- Generic studio-style positioning that implies a broader editing suite

Renamed:

- User-facing wording should favor `AI mode`, `creation console`, or `creation workspace`
- `Studio` is reserved for Remotion's technical preview tooling, not the product identity

## Features

- **Auto-generated scripts**: Researches topics and structures content into hooks, sections, outros, and scene plans
- **AI mode only**: The browser-based generator is the primary workflow
- **Deep customization**: Style presets, audience targeting, platform targeting, intensity, motion, and narrative templates
- **Animated components**: Smooth transitions, text animations, and progress indicators
- **Creative fallback system**: Strong defaults when AI or assets are limited
- **CLI interface**: Simple command to generate videos from any topic
- **Python backend**: Handles job queueing, progress, usage tracking, and render orchestration

## Unsplash Production Application

Recommended application name:

- `Remotion AI Video Generator`

Recommended application description:

- `An AI-powered vertical video generator that uses Unsplash photos as licensed visual sources, hotlinks image URLs directly from Unsplash, triggers download events when a photo is used in a render, and shows photographer attribution in the generated video.`

Why this should pass review:

- It does not use the Unsplash logo.
- It does not use a name similar to Unsplash.
- The product is clearly an AI video generator, not a wallpaper app or an Unsplash client.
- Photo URLs are hotlinked from `photo.urls`.
- The app calls the download endpoint when a photo is selected for use.
- Photographer attribution is visible in the rendered video and profile links include the required UTM parameters.

Compliance checklist:

- Hotlinked photos: yes, the renderer uses direct Unsplash image URLs.
- Download tracking: yes, the app calls `download_location` when a photo is used.
- Attribution: yes, the video overlays photographer credit and profile links.
- Branding: yes, the app name and UI do not use the Unsplash logo or a confusingly similar name.
- Accuracy: yes, the application description above matches what the product actually does.

## Quick Start

```bash
# Install dependencies
npm install

# Make sure Python 3 is installed for the backend
python3 --version

# Start the full stack
npm start

# Or explicitly
npm run dev

# Generate a video
npm run generate "The Future of AI"
```

## Usage

### Generate a video

```bash
npm run generate "your topic here"
```

### AI mode

```bash
npm run ai
```

`npm start`, `npm run dev`, and `npm run ai` all launch the full local stack: the Python backend plus the browser frontend.

The AI mode opens a local page with a rich creation brief, preset controls, and a live progress bar. It:

- Uses Z.ai through the Anthropic-compatible `messages` API
- Uses Unsplash for topic-aware images with a hard 50-requests/hour server limit
- Generates an ambient audio bed
- Builds a scene plan and creative direction before rendering
- Renders the final video in the background
- Uses a Python backend service to queue the job and track Unsplash usage

The browser controls now include style presets, audience targeting, platform targeting, motion and density controls, custom audio mood, and a regeneration focus for remixing specific parts of a video.

### Backend architecture

- Frontend: `bin/ai-mode.ts`
- Backend: `backend/server.py`
- Render worker: `bin/backend-render.ts`

The frontend only displays state and accepts input. The Python backend owns job creation, status, history, and Unsplash usage tracking. The render worker does the actual script generation, image selection, audio generation, and Remotion render.

### Unsplash attribution

Every used Unsplash photo should appear with credit in the rendered video as:

- `Photo by <Photographer Name> on Unsplash`

The photographer profile link is built with UTM parameters in the form:

- `https://unsplash.com/@username?utm_source=remotion-ai-video-generator&utm_medium=referral`

This keeps attribution visible and reviewable while staying inside the API guidelines.

### With options

```bash
npm run generate "your topic" --tone casual --complexity simple
```

### Options

| Option | Values | Description |
|--------|--------|-------------|
| `--tone` | `informative`, `casual`, `professional`, `dramatic` | Sets the video tone |
| `--complexity` | `simple`, `medium`, `detailed` | Content depth |
| `--style` | `cinematic`, `educational`, `bold`, `playful`, `premium`, `documentary` | Creative style preset |
| `--audience` | `general`, `beginners`, `students`, `creators`, `founders`, `executives`, `professionals` | Target audience |
| `--platform` | `tiktok`, `reels`, `shorts`, `vertical` | Platform-aware pacing |
| `--intensity` | `safe`, `balanced`, `wild` | Visual energy level |
| `--motion` | `minimal`, `medium`, `high` | Motion level |
| `--density` | `minimal`, `balanced`, `rich` | Visual density |
| `--narrative` | `problem-solution`, `myth-busting`, `timeline`, `comparison`, `transformation` | Story structure |
| `--brief` | text | Extra creative brief for the AI |
| `--audio-mood` | text | Custom ambient audio direction |
| `--focus` | `full`, `hook`, `middle`, `outro` | Regeneration focus |
| `--output` | filepath | Custom output path |

### Environment variables

| Variable | Description |
|----------|-------------|
| `ZAI_API_KEY` | Z.ai API key used for script generation |
| `ZAI_BASE_URL` | Optional override for the Anthropic-compatible base URL |
| `ZAI_MODEL` | Optional model name, defaults to `claude-sonnet-4-20250514` |
| `UNSPLASH_ACCESS_KEY` | Unsplash access key used for image search |
| `BACKEND_PORT` | Optional backend port, defaults to `3010` |
| `PYTHON` | Optional Python binary path used to launch the backend |

## Examples

```bash
# Cinematic video about quantum computing
npm run generate "Quantum Computing" --tone casual --style cinematic

# Professional explanation of blockchain for founders
npm run generate "Blockchain Technology" --tone professional --audience founders --platform shorts

# Detailed video with custom output and a stronger narrative
npm run generate "Machine Learning Basics" --complexity detailed --narrative comparison --output ./videos/ml.mp4
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

# Preview locally in Remotion Studio for technical inspection
npm start

# Render with custom props
npx remotion render ExplainerVideo out.mp4 --props='{"topic":"Test"}'
```

## License

MIT
