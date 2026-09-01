# Unsplash production evidence — RemotionVidCreator

Prepared for the Unsplash production review request from Victor Ballesteros.

## What this shows

- The app visibly attributes each Unsplash photo as `Photo by [photographer] on Unsplash`.
- The photographer name is clickable.
- The `Unsplash` text is clickable.
- The visible photographer profile URL includes `utm_source=remotion-ai-video-generator` and `utm_medium=referral`.
- The rendered video itself displays an attribution overlay with the photographer name, Unsplash mention, and profile URL.
- The code screenshot shows the API path building photographer profile URLs with UTM parameters and rendering the clickable attribution links.

## Review files

1. `01-app-attribution-visible-online-mode.png`
   Shows the web app in Unsplash API mode with the attribution box visible.

2. `02-photographer-link-hover-highlight.png`
   Shows the photographer name link highlighted inside the attribution box.

3. `03-rendered-video-attribution-overlay.jpg`
   Shows the generated video frame with the attribution overlay.

4. `04-code-attribution-and-utm-links.png`
   Shows code proving links are built with `utm_source` and `utm_medium`, and rendered as `Photo by [photographer] on Unsplash`.

The source folder also includes the exact clicked photographer URL, a compact
HTML code excerpt, the rendered 10-second MP4, and a machine-readable summary.

## Clicked photographer URL

`https://unsplash.com/@thomasrichter?utm_source=remotion-ai-video-generator&utm_medium=referral`

## Official requirements matched

Unsplash API Guidelines require attribution for Unsplash, the photographer, and a link back to the photographer profile with UTM parameters. These files show all three.
