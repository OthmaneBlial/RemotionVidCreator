# RemotionVidCreator roadmap

This roadmap keeps the product focused on one job: turn a structured brief into
a reproducible Remotion video rendered on the user's machine. It does not assume
that RemotionVidCreator should become a general editor or managed rendering API.

## Shipped foundation

- Guided 9:16 browser workflow and multi-ratio CLI
- Structured creative controls and scene planning
- Template script fallback plus optional Z.ai generation
- Bundled offline visuals plus optional Unsplash sourcing and attribution
- Python queue, progress, history, bundle cache, and local H.264 render worker
- Procedural ambient audio bed
- Output-path safety tests, typechecking, and Remotion composition verification
- Public documentation, capability boundaries, demo output, and GitHub Pages site

## P0 — reproducible projects

The next release should make a render portable and debuggable rather than adding
more visual presets.

- Add a versioned project manifest containing input brief, chosen controls,
  script, scene plan, asset references, provider mode, and render settings.
- Import local image and audio files without copying data outside the project.
- Re-render from a manifest without re-running provider calls.
- Validate manifest versions and provide clear migration errors.
- Export a diagnostic summary that excludes credentials and large base64 media.

Acceptance evidence:

- A saved manifest produces the same duration, dimensions, scene order, and
  selected local assets on a second run.
- A fixture covers migration and invalid-manifest behavior.
- The README documents exactly which provider responses are not deterministic.

## P0 — cancellation and recovery

- Add a cancel endpoint and visible cancel control.
- Terminate the render worker safely and leave a truthful terminal job state.
- Recover stale `ACTIVE_JOB_ID` state after an interrupted process.
- Add bounded request sizes and enum validation at the Python API boundary.
- Make failed stages retryable without duplicating completed provider calls.

Acceptance evidence:

- Cancellation is tested during script, bundle, and render stages.
- A killed worker cannot leave the queue permanently locked.
- Invalid payloads return structured 4xx errors.

## P1 — captions that creators can trust

- Generate timing-aware captions from supplied narration or imported transcript.
- Let users correct text and timing before render.
- Support burned-in captions and `.srt` export.
- Add overflow checks for long words, multiple languages, and mobile-safe areas.

This milestone should not claim transcription or voice-over until those paths are
implemented and verified.

## P1 — batch automation

- Accept JSON or CSV input with schema validation and dry-run output.
- Add concurrency controls, retry policy, per-item state, and failure summaries.
- Provide documented CLI exit codes and machine-readable output.
- Include a small GitHub Actions example only when CI is intentionally re-enabled.

Acceptance evidence:

- A mixed batch reports successes and failures without losing completed outputs.
- Re-running with resume enabled skips successful deterministic items.

## P2 — release packaging

- Define the supported Node, Python, operating-system, and architecture matrix.
- Package reproducible release archives with checksums.
- Test a clean install from the exact release artifact.
- Publish a compatibility note covering Chromium, fonts, codecs, and local file access.

## Explicit non-goals

- A full timeline editor
- A hosted service that renders arbitrary user-supplied Remotion projects
- A text-to-video foundation model
- Claims of fully offline operation while optional network providers are enabled
- Automatic cross-platform social publishing without platform review, OAuth,
  explicit user consent, and truthful status handling

## External gates

- Z.ai and Unsplash quotas, review, pricing, and terms are controlled by providers.
- Remotion is source-available under its own license. Some organization sizes and
  automated uses require a paid Remotion license.
- Publishing integrations would require separate platform approval and user-owned
  credentials; they are not implied by local rendering.
