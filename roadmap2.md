# Roadmap 2: AI-First Video Creator

This roadmap assumes a hard product decision:

- Keep only the AI video mode.
- Remove the video editor mode and all editor-first flows.
- Turn AI mode into the main product, with much deeper customization, stronger generation quality, and a better end-to-end creation experience.

Execution rule:

- Each phase below should be shipped as its own commit.
- Keep the scope of each commit tight and reversible.
- Do not mix cleanup, product changes, and refactors in the same phase unless they are directly required for the phase to land.

## Phase 01 - Lock the product direction

Commit: `phase-01-ai-only-product-direction`

Goal:

- Make the repository and docs reflect that the product is AI-first and not editor-first.

Steps:

- Audit all mentions of preview/editor/studio flows.
- Define the AI mode as the single supported user workflow.
- Write down what stays, what goes, and what gets renamed.
- Add a short product note in the repo explaining the direction.

## Phase 02 - Remove editor entry points

Commit: `phase-02-remove-editor-entry-points`

Goal:

- Remove visible editor-mode navigation and any user-facing paths into a manual editor experience.

Steps:

- Remove editor-mode buttons, tabs, and menu items.
- Keep only the AI generation flow in the main UI.
- Update scripts and docs so the primary workflow is AI mode only.
- Make sure there is no dead-end navigation after removal.

## Phase 03 - Clean up editor-specific code paths

Commit: `phase-03-delete-editor-code-paths`

Goal:

- Remove code that only exists to support manual editing.

Steps:

- Delete unused editor components, routes, hooks, and props.
- Remove editor-only state and feature flags.
- Simplify shared types that were carrying editor-specific fields.
- Keep the app compiling after the cleanup.

## Phase 04 - Simplify the application shell

Commit: `phase-04-simplify-app-shell`

Goal:

- Make the app shell clearly AI-first.

Steps:

- Rework the landing page to center on topic input and generation.
- Replace any generic “studio” framing with a creation assistant framing.
- Make the first screen immediately useful.
- Remove duplicated navigation that no longer serves the product.

## Phase 05 - Redesign the AI mode home screen

Commit: `phase-05-redesign-ai-home`

Goal:

- Turn the AI mode home screen into a premium creation console.

Steps:

- Add a stronger hero area with a clear call to action.
- Add visible output previews and recent generations.
- Introduce smarter default suggestions for first-time users.
- Make the screen feel like a product, not a form.

## Phase 06 - Build a better creation brief

Commit: `phase-06-structured-creation-brief`

Goal:

- Replace a simple topic input with a rich creation brief.

Steps:

- Add fields for audience, goal, platform, tone, pacing, and style.
- Let users describe the video in plain language.
- Support optional advanced fields without overwhelming beginners.
- Keep defaults intelligent so one-field generation still works.

## Phase 07 - Add style presets

Commit: `phase-07-style-presets`

Goal:

- Give users fast, high-quality style choices.

Steps:

- Add presets such as cinematic, educational, bold, playful, premium, and documentary.
- Map each preset to typography, motion, colors, pacing, and audio feel.
- Let presets act as starting points, not rigid templates.
- Expose a clean way to compare presets before rendering.

## Phase 08 - Add deeper tone control

Commit: `phase-08-deeper-tone-control`

Goal:

- Make tone selection more expressive and useful.

Steps:

- Expand tone options beyond the current basic set.
- Support tone ranges such as calm-to-energetic or subtle-to-dramatic.
- Tie tone directly to script language and visual behavior.
- Make tone previews understandable before generation starts.

## Phase 09 - Add audience targeting

Commit: `phase-09-audience-targeting`

Goal:

- Let the AI create videos for a specific audience, not just a topic.

Steps:

- Add audience types such as beginners, founders, students, creators, and executives.
- Adapt the script depth and vocabulary to the audience.
- Let the AI choose examples and metaphors appropriate for that audience.
- Surface the audience choice in the generation summary.

## Phase 10 - Add platform-aware output

Commit: `phase-10-platform-aware-output`

Goal:

- Make the AI generate videos optimized for the destination platform.

Steps:

- Support TikTok, Reels, Shorts, and generic vertical video.
- Tune pacing, caption density, and hook style per platform.
- Adjust intro length and CTA style to match the platform.
- Keep the main format vertical-first.

## Phase 11 - Improve script generation quality

Commit: `phase-11-script-quality-upgrade`

Goal:

- Make generated scripts feel sharper, clearer, and more intentional.

Steps:

- Rewrite the script generator prompt and structure.
- Require stronger hooks, better transitions, and clearer payoffs.
- Support multiple narrative structures.
- Reduce repetitive phrasing and generic filler.

## Phase 12 - Add narrative templates

Commit: `phase-12-narrative-templates`

Goal:

- Give the AI better story shapes to choose from.

Steps:

- Add templates like problem-solution, myth-busting, timeline, comparison, and transformation.
- Let users pick a template or let the AI choose one.
- Make each template influence scene order and visual pacing.
- Keep template selection editable at the brief level.

## Phase 13 - Add scene planning

Commit: `phase-13-scene-planning`

Goal:

- Generate a real scene plan before rendering.

Steps:

- Convert the script into a structured scene outline.
- Add purpose, emotion, and visual intent to each scene.
- Give the AI enough structure to create better visuals later.
- Use the scene plan as the bridge between script and rendering.

## Phase 14 - Add shot-level direction

Commit: `phase-14-shot-direction`

Goal:

- Make each scene more visually specific.

Steps:

- Add shot type, camera motion, and focal point metadata.
- Let the AI suggest zooms, pans, cuts, and emphasis moments.
- Use shot direction to drive animation choices.
- Preserve the ability to keep things simple when needed.

## Phase 15 - Upgrade the visual system

Commit: `phase-15-visual-system-upgrade`

Goal:

- Make the videos look more premium and less template-like.

Steps:

- Introduce more distinct art directions.
- Expand backgrounds, overlays, and motion effects.
- Add stronger hierarchy for titles, subtitles, and callouts.
- Ensure the visuals still render reliably at scale.

## Phase 16 - Add advanced customization controls

Commit: `phase-16-advanced-customization`

Goal:

- Let users shape the result without forcing manual editing.

Steps:

- Add controls for intensity, density, motion level, and visual richness.
- Allow users to lock or unlock specific creative choices.
- Add a “safe”, “balanced”, and “wild” control spectrum.
- Keep the UI understandable for non-technical users.

## Phase 17 - Expand typography control

Commit: `phase-17-typography-controls`

Goal:

- Make text styling a first-class creative lever.

Steps:

- Add font pairing options.
- Add type scale, line height, and tracking controls.
- Tune title treatment by style preset.
- Ensure captions remain readable on mobile.

## Phase 18 - Improve color and brand themes

Commit: `phase-18-color-theme-system`

Goal:

- Make the AI generate coherent visual identities.

Steps:

- Generate palettes from topic, tone, and style.
- Support custom accent colors and brand colors.
- Keep contrast and accessibility in check.
- Make colors drive the whole composition, not just the background.

## Phase 19 - Upgrade image selection

Commit: `phase-19-image-selection-upgrade`

Goal:

- Make the visuals feel more relevant and more deliberate.

Steps:

- Improve image keyword generation.
- Rank images by scene relevance, not just topic match.
- Add fallback strategies when the first search is weak.
- Allow the AI to request more context-specific imagery.

## Phase 20 - Add visual fallback intelligence

Commit: `phase-20-visual-fallback-intelligence`

Goal:

- Keep the video strong even when image search is poor.

Steps:

- Add gradients, generative shapes, and text-led scenes as fallback visuals.
- Let missing images become a design choice instead of a failure.
- Preserve motion and polish in every scene.
- Make fallback behavior consistent and intentional.

## Phase 21 - Improve subtitle and caption design

Commit: `phase-21-caption-design-upgrade`

Goal:

- Turn captions into part of the design system.

Steps:

- Add stronger subtitle layouts.
- Support emphasis words, pauses, and line breaks.
- Make captions adapt to tone and pacing.
- Prioritize legibility on small screens.

## Phase 22 - Add audio direction controls

Commit: `phase-22-audio-direction-controls`

Goal:

- Make audio part of the creative brief.

Steps:

- Add music energy, ambience, and intensity controls.
- Let the AI choose audio behavior based on the script.
- Support silent or voiceover-centric outputs when needed.
- Make the audio match the emotional arc.

## Phase 23 - Improve render feedback

Commit: `phase-23-render-feedback`

Goal:

- Make generation and rendering feel transparent.

Steps:

- Show clear stages for research, script, assets, and render.
- Improve error messages and recovery paths.
- Keep users informed during long-running jobs.
- Make failed steps actionable.

## Phase 24 - Add generation history

Commit: `phase-24-generation-history`

Goal:

- Help users revisit, compare, and refine past outputs.

Steps:

- Save previous prompts, presets, and renders.
- Add history views with status and timestamps.
- Let users duplicate a past generation as a starting point.
- Make history useful for iteration, not just logging.

## Phase 25 - Add iterative regeneration

Commit: `phase-25-iterative-regeneration`

Goal:

- Let users improve specific parts without restarting everything.

Steps:

- Support regenerating the hook, a scene, or the outro.
- Allow locking parts of a generation before rerunning.
- Keep diffs understandable so users know what changed.
- Preserve the strongest parts of the original output.

## Phase 26 - Add quality scoring

Commit: `phase-26-quality-scoring`

Goal:

- Give the AI a way to self-evaluate output quality.

Steps:

- Score hook strength, clarity, pacing, and visual variety.
- Use scores to suggest improvements.
- Surface the score only where it adds value.
- Use scoring to guide retries and prompt tuning.

## Phase 27 - Add smarter defaults

Commit: `phase-27-smarter-defaults`

Goal:

- Make the first use experience excellent with minimal setup.

Steps:

- Generate strong defaults from the topic alone.
- Choose tone, structure, and visuals automatically when the user skips them.
- Optimize defaults for speed and usefulness.
- Reduce the number of decisions required for a great first result.

## Phase 28 - Harden reliability

Commit: `phase-28-reliability-hardening`

Goal:

- Make the AI-first workflow dependable at higher usage.

Steps:

- Tighten validation on all inputs and generated outputs.
- Add stronger fallback handling for API failures and missing assets.
- Remove brittle assumptions in generation and rendering code.
- Verify the system remains stable after the editor removal.

## Phase 29 - Polish the product experience

Commit: `phase-29-product-polish`

Goal:

- Make the app feel finished and intentional.

Steps:

- Refine spacing, copy, empty states, and loading states.
- Improve onboarding copy and helper text.
- Make the UI consistent across the whole AI flow.
- Remove any leftover rough edges from earlier phases.

## Phase 30 - Final cleanup and launch readiness

Commit: `phase-30-launch-readiness`

Goal:

- Ship a clean AI-only product with no legacy editor baggage.

Steps:

- Remove unused code and stale docs.
- Run a full pass on naming, scripts, and repository structure.
- Confirm the AI mode is the only supported mode.
- Write the final release notes for the new direction.

## Suggested Execution Order

The phases are already ordered for implementation. If you want to compress the plan later, the safest grouping is:

- First 3 phases for removing the editor.
- Phases 4 to 10 for product shape and customization.
- Phases 11 to 20 for AI quality and visual sophistication.
- Phases 21 to 30 for iteration, reliability, and polish.

