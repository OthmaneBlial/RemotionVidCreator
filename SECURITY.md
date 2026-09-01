# Security policy

## Supported version

Security fixes are applied to the latest commit on `main` until tagged release
support is documented here.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not
open a public issue containing exploit details, credentials, private prompts, or
local file paths.

Include:

- the affected commit or release;
- the smallest reproducible case;
- impact and required preconditions;
- suggested mitigation, if known.

## Credential handling

- Keep provider credentials in the ignored `.env` file or process environment.
- Never expose an Unsplash secret key or AI provider key in browser code, logs,
  screenshots, generated media, issues, or commits.
- The renderer only needs `UNSPLASH_ACCESS_KEY` for online image search. The
  application ID and secret are not read by the current runtime.
- Rotate any credential that has been committed, shared publicly, or included in
  an untrusted diagnostic bundle.

## Local service boundary

The workspace and Python API bind to loopback addresses by default. They are not
designed to be exposed directly to an untrusted network without authentication,
request limits, and deployment hardening.
