# Unsplash Production Application Notes

Application name:

- Remotion AI Video Generator

Application description:

- An AI-powered vertical video generator that uses Unsplash photos as licensed visual sources, hotlinks image URLs directly from Unsplash, triggers download events when a photo is used in a render, and shows photographer attribution in the generated video.

Review checklist mapping:

- Hotlink photos: the app uses `photo.urls.raw` with size parameters for the actual displayed image.
- Trigger downloads: the app calls `photo.links.download_location` when a selected photo is used.
- Distinct branding: the app name and UI do not use the Unsplash logo or a confusingly similar name.
- Accurate description: the product is a social video generator, not a wallpaper or gallery app.
- Attribution: the rendered video shows `Photo by <Photographer> on Unsplash` and includes the photographer profile link with UTM parameters.

Suggested profile-link format:

- `https://unsplash.com/@username?utm_source=remotion-ai-video-generator&utm_medium=referral`

Notes for screenshots:

- Show a generated video frame with the attribution overlay visible.
- Show the UI where the photo source budget and credits are displayed.
- Show one rendered output where an Unsplash photo is used inside the video.
