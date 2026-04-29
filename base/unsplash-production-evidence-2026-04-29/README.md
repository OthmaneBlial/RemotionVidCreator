# Unsplash Production Evidence - RemotionVidCreator

Prepared for the Unsplash production review request from Victor Ballesteros.

## What This Shows

- The app visibly attributes each Unsplash photo as `Photo by [photographer] on Unsplash`.
- The photographer name is clickable.
- The `Unsplash` text is clickable.
- The visible photographer profile URL includes `utm_source=remotion-ai-video-generator` and `utm_medium=referral`.
- The rendered video itself displays an attribution overlay with the photographer name, Unsplash mention, and profile URL.
- The code screenshot shows the API path building photographer profile URLs with UTM parameters and rendering the clickable attribution links.
- The click-through video/screenshot shows the actual photographer link opening in the browser address bar.

## Best Files To Upload

1. `01-app-attribution-visible-online-mode.png`
   Shows the web app in Unsplash API mode with the attribution box visible.

2. `02-photographer-link-hover-highlight.png`
   Shows the photographer name link highlighted inside the attribution box.

3. `03-rendered-video-attribution-overlay.jpg`
   Shows the generated video frame with the attribution overlay.

4. `04-code-attribution-and-utm-links.png`
   Shows code proving links are built with `utm_source` and `utm_medium`, and rendered as `Photo by [photographer] on Unsplash`.

5. `07-desktop-click-through-photographer-link.mp4`
   Screen recording of clicking the photographer link.


## Clicked Photographer URL

`https://unsplash.com/@thomasrichter?utm_source=remotion-ai-video-generator&utm_medium=referral`

## Official Requirements Matched

Unsplash API Guidelines require attribution for Unsplash, the photographer, and a link back to the photographer profile with UTM parameters. These files show all three.
