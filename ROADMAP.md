# Remotion Explainer Video Generator - Roadmap

> **Last Updated:** 2026-01-26
> **Version:** 1.0.0
> **Goal:** Create the best free explainer video generator using only free tools and services

---

## ✅ Completed Features

### Better Script Generation with Claude AI ✅
**Status:** ✅ Done | **Difficulty:** Medium | **Impact:** High

Uses Claude AI (Sonnet 3.5) for engaging scripts:

**Usage:**
```bash
export ANTHROPIC_API_KEY=your_key_here
npm run generate -- "AI" --use-ai
```

**Features:**
- Viral-worthy hooks
- 3 tone options: humorous, storytelling added
- Better structure for short-form video
- Fallback to template if API fails
- JSON parsing with error handling

---

## Priority Legend

| Priority | Description |
|----------|-------------|
| 🔴 **P0 - Critical** | Core features that significantly improve the product |
| 🟠 **P1 - High** | Important features that users will love |
| 🟡 **P2 - Medium** | Nice-to-have enhancements |
| 🟢 **P3 - Low** | Future polish and extras |

## Status Legend

| Status | Icon |
|--------|------|
| Todo | 📋 |
| In Progress | 🚧 |
| Done | ✅ |
| Blocked | 🚫 |

---

## 🔴 P0 - Critical Features

### 1. Aspect Ratio Presets ✅
**Status:** ✅ Done | **Difficulty:** Easy | **Impact:** High

Support multiple aspect ratios for different platforms:
- `--aspect 9:16` (default) - TikTok, Reels, Shorts
- `--aspect 16:9` - YouTube, standard video
- `--aspect 1:1` - Instagram posts
- `--aspect 4:5` - Instagram portrait
- `--aspect 4:3` - standard display

**Usage:**
```bash
npm run generate -- "AI" --aspect 16:9
npm run generate -- "Tech" --aspect 1:1 --use-ai
```

**Implementation:**
- CLI argument parsing with validation
- Dynamic composition dimensions per preset
- Font size scaling per aspect ratio
- Image fetching with correct dimensions

---

### 2. Batch Video Generation ✅
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** High

Generate multiple videos in one command:

```bash
npm run generate -- "AI,Blockchain,Quantum Computing" --batch
```

**Implementation:**
- Parse comma-separated topics
- Generate videos sequentially
- Show overall progress
- Save to individual output files

---

### 3. Visual Themes System 🎨
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** High

Pre-built visual themes for instant variety:

| Theme | Colors | Style | Best For |
|-------|--------|-------|----------|
| Cyberpunk | Neon pink, cyan, purple | Glitch, scanlines, grid | Tech, AI, Gaming |
| Minimal | Black, white, gray | Clean, subtle animations | Business, Education |
| Nature | Greens, earth tones | Organic shapes, soft gradients | Environment, Health |
| Corporate | Blue, navy, white | Professional, smooth | Business, Finance |
| Retro | Sepia, orange, cream | Film grain, vintage fonts | History, Nostalgia |
| Dramatic | Red, black, gold | Bold, high contrast | Sports, Motivation |
| Science | Blue, purple, teal | Particles, molecules | Science, Research |
- Pre-configured color schemes
- Theme-specific animations
- Matching font styles

**Implementation:**
- Create theme config file
- Add `--theme` CLI flag
- Update composition to use theme

---

### 4. Background Music Support 🎵
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** High

Add royalty-free background music:

**Free Music Sources:**
- [YouTube Audio Library](https://www.youtube.com/audiolibrary) - Download and use
- [Pixabay Music](https://pixabay.com/music/) - Free, no attribution required
- [Freesound.org](https://freesound.org/) - Sound effects
- [Openverse](https://openverse.org/) - CC-licensed music

**Implementation:**
- Download free music tracks to `public/music/`
- Add `--music` flag (calm, upbeat, dramatic, epic)
- Volume ducking during sections
- Fade in/out

```bash
npm run generate -- "AI" --music epic
```

---

## 🟠 P1 - High Priority

### 6. Custom Font System ✍️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Google Fonts integration:

**Free Font Sources:**
- [Google Fonts](https://fonts.google.com/) - Completely free

**Fonts to Add:**
- Display: CalSans, Montserrat, Oswald, Poppins
- Body: Inter, Roboto, Open Sans, Lato
- Handwriting: Caveat, Pacifico, Dancing Script
- Monospace: JetBrains Mono, Fira Code

**Implementation:**
- Add fonts to Remotion config
- `--font` CLI flag
- Font preview option

---

### 7. Animated Text Styles Library 📝
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

More text animation options:

| Style | Description |
|-------|-------------|
| Typewriter | Character-by-character reveal |
| Glitch | Digital glitch effect |
| Neon Glow | Pulsing neon light |
| Bounce | Bouncy entrance |
| Fade Slide | Fade with slide in |
| 3D Rotate | 3D rotation entrance |
| Wave | Wave motion through text |
| Gradient Fill | Animated gradient text |

---

### 8. Video Backgrounds Support 🎥
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Use video clips instead of images:

**Free Video Sources:**
- [Pexels Videos](https://www.pexels.com/videos/) - Free stock videos
- [Pixabay Videos](https://pixabay.com/videos/) - Free, no attribution
- [Coverr](https://coverr.co/) - Free background videos

**Implementation:**
- Download video clips alongside images
- `--use-videos` flag
- Ken Burns effect on videos

---

### 9. Subtitle/Caption Generation 📝
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Auto-generate subtitle files:

**Implementation:**
- Export `.srt` file alongside video
- Timestamp each word/phrase
- `--captions` flag
- Multiple caption styles (TikTok, YouTube, plain)

```bash
npm run generate -- "AI" --captions tiktok
```

---

### 10. Image Filters & Effects 🖼️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Apply filters to images:

| Filter | Description |
|--------|-------------|
| Grayscale | Black and white |
| Sepia | Vintage brown tone |
| Vintage | Faded, scratched look |
| Cinematic | Movie-like color grading |
| High Contrast | Dramatic contrast |
| Blur | Background blur |
| Brightness+ | Brighter image |

**Implementation:**
- CSS filters applied to `<img>` tags
- `--filter` CLI flag

---

### 11. Sound Effects Library 🔊
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Add sound effects at key moments:

**Free Sources:**
- [Freesound.org](https://freesound.org/) - Free sound effects

**Sounds to Add:**
- Whoosh (transitions)
- Pop (text reveals)
- Dramatic boom (intro)
- Success chime (outro)
- Click (bullet points)

**Implementation:**
- Download SFX to `public/sfx/`
- Trigger at specific frames
- `--sfx` flag

---

### 12. Template System 📋
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Save and load custom configurations:

```bash
# Save current settings as template
npm run template --save my-viral-style

# Use template
npm run generate -- "AI" --template my-viral-style
```

**Templates Store:**
- `templates/` directory
- JSON config files
- Shareable templates

---

### 13. Preview-Only Mode 👁️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Quick preview without full render:

```bash
npm run generate -- "AI" --preview-only
```

**Implementation:**
- Start Remotion preview server
- Open in browser
- Skip video export
- Faster iteration

---

### 14. Progress Notifications 📱
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low-Medium

Get notified when video is done:

**Implementation:**
- `--webhook` flag for HTTP POST
- Desktop notification (libnotify)
- Optional Discord/Slack integration

---

## 🟡 P2 - Medium Priority

### 15. AI Voiceover (Text-to-Speech) 🎙️
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** High

Add voice narration using free TTS:

**Free TTS Options:**
- [Edge TTS](https://github.com/rany2/edge-tts) - Microsoft Edge voices, free
- [Google Translate TTS](https://github.com/stn1/uv-tts) - Free Google voices
- [ElevenLabs](https://elevenlabs.io/) - Free tier (limited characters/month)
- [Coqui TTS](https://github.com/coqui-ai/TTS) - Open source, local

**Voices to Support:**
- Male/Female options
- Different accents (US, UK, AU)
- Emotions (serious, excited, calm)

**Implementation:**
```bash
npm run generate -- "AI" --voiceover --voice male-us --voice-style excited
```

---

### 16. Multi-Language Support 🌍
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** High

Generate videos in different languages:

**Languages to Add:**
- Spanish (Español)
- French (Français)
- German (Deutsch)
- Portuguese (Português)
- Italian (Italiano)
- Japanese (日本語)
- Korean (한국어)
- Chinese (中文)

**Implementation:**
- Translate scripts
- Multi-language TTS
- Font support for non-Latin

```bash
npm run generate -- "AI" --language spanish
```

---

### 17. Custom Script Input 📝
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Use your own script:

```bash
npm run generate -- --script my-script.txt
```

**Script Format:**
```markdown
Title: My Topic
Hook: Amazing hook here
Section 1: Content here
Section 2: More content
Outro: Final message
```

---

### 18. Image Cropping & Positioning ✂️
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Better image control:

**Features:**
- `--crop smart` - AI-based focal point detection
- `--crop center` - Center crop
- `--position top/bottom/left/right`
- Pan direction override

---

### 19. Color Grading Presets 🎨
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Low

Cinematic color grading:

| Preset | Look |
|--------|------|
| Blockbuster | High saturation, warm shadows |
| Moody | Desaturated, cool tones |
| Vintage | Faded, film-like |
| Noir | High contrast B&W |
| Sunset | Orange/teal color grading |

---

### 20. Transition Effects Library 🔄
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

More transition options:

| Transition | Description |
|------------|-------------|
| Fade | Simple fade |
| Wipe | Left-to-right wipe |
| Zoom | Zoom in/out transition |
| Spin | Rotate transition |
| Glitch | Digital glitch |
| Dissolve | Pixelated dissolve |

---

### 21. Thumbnail Generator 🖼️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Medium

Auto-generate video thumbnail:

**Features:**
- Extract best frame
- Add title overlay
- Include topic/gradient
- Save as `thumbnail.png`

---

### 22. Video Metadata Injection 📄
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low

Add metadata to video file:

**Metadata to Add:**
- Title
- Description
- Tags
- Author/Channel

---

### 23. Render Quality Presets ⚙️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low

Quality vs speed options:

```bash
npm run generate -- "AI" --quality fast    # Draft
npm run generate -- "AI" --quality normal  # Default
npm run generate -- "AI" --quality high    # Best quality
```

---

### 24. Resume Interrupted Renders ▶️
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low

Continue from where it stopped:

**Implementation:**
- Save progress state
- Checkpoint frames
- `--resume` flag

---

## 🟢 P3 - Low Priority / Future

### 25. Web UI 🌐
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** High

Browser-based interface:

**Features:**
- Form for all options
- Live preview
- Download generated video
- History of generations

---

### 26. Server Mode / API 🚀
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** High

Run as HTTP service:

```bash
npm run server
```

**API:**
```http
POST /generate
{
  "topic": "AI",
  "tone": "dramatic",
  "theme": "cyberpunk"
}
```

---

### 27. Platform-Specific Optimizations 📱
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Per-platform settings:

| Platform | Settings |
|----------|----------|
| TikTok | 9:16, fast cuts, trending audio |
| Reels | 9:16, 30s max, Instagram fonts |
| Shorts | 9:16, YouTube pacing |
| YouTube | 16:9, longer form |

---

### 28. A/B Testing Generator 🧪
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Generate multiple variations:

```bash
npm run generate -- "AI" --ab-test 3
```

**Varies:**
- Different hooks
- Different visuals
- Different pacing

---

### 29. Analytics Dashboard 📊
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low**

Track video performance:

**Metrics:**
- Videos generated
- Average render time
- Most used topics
- Theme popularity

---

### 30. Community Templates Sharing 👥
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Share and discover templates:

**Implementation:**
- GitHub Gists integration
- Template gallery
- One-click apply

---

### 31. Advanced Text Effects ✨
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low**

Fancy text animations:

- Text on path (curved text)
- Text stroke/outline
- Text shadow/glow customization
- Animated gradients in text
- Character scrambling (hacker effect)

---

### 32. Scene Library 🎬
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium

Pre-built scene types:

| Scene | Description |
|-------|-------------|
| Quote | Big quote text |
| Stat | Animated number/stat |
| Comparison | Side-by-side comparison |
| Timeline | Vertical timeline |
| List Item | Bullet point with icon |

---

### 33. Music Genre Selection 🎵
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low**

More music categories:

- Lo-fi
- Orchestral
- Electronic
- Acoustic
- Jazz
- Rock
- Ambient

---

### 34. Custom Colors CLI Flag 🎨
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low**

Override theme colors:

```bash
npm run generate -- "AI" --colors "#ff0000,#00ff00"
```

---

### 35. Video Looping 🔁
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low**

Create seamless loop videos:

```bash
npm run generate -- "AI" --loop
```

---

### 36. Intro/Outro Templates 🎬
**Status:** 📋 Todo | **Difficulty:** Medium | **Impact:** Medium**

Branded intros and outros:

**Templates:**
- Channel subscribe animation
- Logo reveal
- "Follow for more" CTA
- Social media handles

---

### 37. Export Frame Stamps 🖼️
**Status:** 📋 Todo | **Difficulty:** Easy | **Impact:** Low**

Export key frames as images:

```bash
npm run generate -- "AI" --export-frames
```

---

### 38. Noise Reduction 🔇
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low**

Clean up audio if voiceover is used:

**Tools:**
- [RNNoise](https://github.com/xiph/rnnoise) - Free noise reduction
- Basic audio filtering

---

### 39. Auto-Pacing Detection ⏱️
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low**

Calculate optimal timing based on content:

**Analysis:**
- Word count per section
- Reading speed estimation
- Image complexity consideration

---

### 40. Collaborative Mode 👥
**Status:** 📋 Todo | **Difficulty:** Hard | **Impact:** Low**

Multiple users working together:

**Features:**
- Shared project files
- Comment system
- Version history

---

## 📊 Progress Tracking

### Overall Progress: 2/40 (5%)

| Priority | Done | Total | Percent |
|----------|------|-------|---------|
| P0 - Critical | 2 | 5 | 40% |
| P1 - High | 0 | 8 | 0% |
| P2 - Medium | 0 | 10 | 0% |
| P3 - Low | 0 | 17 | 0% |

---

## 🛠️ Free Tools & Services Reference

| Service | Free Tier | Usage |
|---------|-----------|-------|
| [Lorem Picsum](https://picsum.photos) | Unlimited | Images |
| [Pixabay](https://pixabay.com) | Unlimited | Images, Videos |
| [Pexels](https://pexels.com) | Unlimited | Images, Videos |
| [Google Fonts](https://fonts.google.com) | Unlimited | Fonts |
| [Wikipedia API](https://en.wikipedia.org/api) | Unlimited | Script research |
| [Groq](https://groq.com) | Free tier | AI scripts |
| [Ollama](https://ollama.com) | Free | Local AI |
| [Edge TTS](https://github.com/rany2/edge-tts) | Free | Voiceover |
| [Freesound.org](https://freesound.org) | Free tier | Sound effects |
| [Pixabay Music](https://pixabay.com/music) | Free | Background music |
| [Openverse](https://openverse.org) | Free | CC media |

---

## 📝 Changelog

### 2026-01-27
- **✅ Completed: Aspect Ratio Presets**
  - Added --aspect CLI flag
  - Support for 9:16, 16:9, 1:1, 4:5, 4:3 ratios
  - Dynamic composition dimensions
  - Font size scaling per ratio
  - Correct image dimensions per preset

### 2026-01-26
- **✅ Completed: AI Script Generation with Claude**
  - Integrated Claude 3.5 Sonnet API
  - Added --use-ai CLI flag
  - New tones: humorous, storytelling
  - Fallback to template on error
- Created initial roadmap with 40 features
- Organized by priority (P0-P3)
- All features use free tools only

---

*This roadmap is a living document. Features may be added, removed, or reprioritized based on user feedback and technical constraints.*
