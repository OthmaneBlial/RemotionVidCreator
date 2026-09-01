# Contributing to RemotionVidCreator

Thanks for helping improve the brief-to-video workflow. Contributions are most
useful when they make the first local render clearer, safer, faster, or more
reproducible.

## Before opening a change

1. Search existing issues and discussions for related work.
2. Keep the scope focused; avoid mixing UI, renderer, and documentation changes
   unless one requires the others.
3. Do not commit `.env`, generated videos, local history, API caches, or provider
   credentials.
4. Keep public claims bounded by behavior that can be reproduced from the repo.

## Local setup

```bash
git clone https://github.com/OthmaneBlial/RemotionVidCreator.git
cd RemotionVidCreator
npm ci
cp .env.example .env
npm run check
npm start
```

The default browser workflow uses the bundled offline image library and a
template script fallback, so provider keys are not required for a first run.

## Pull request checklist

- Add or update tests when behavior changes.
- Run `npm run check`.
- For UI changes, test at desktop and mobile widths and report any remaining
  overflow or interaction limitations.
- For render changes, include the prompt, duration, command, and media metadata
  used to validate the output.
- Update the README when setup, capabilities, provider behavior, or known limits
  change.

## Project boundaries

RemotionVidCreator is an opinionated topic/brief-to-video application, not a
general timeline editor or hosted rendering API. Large features should reinforce
the structured brief, inspectable scene plan, asset sourcing, and local render
workflow.
