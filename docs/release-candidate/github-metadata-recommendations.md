# GitHub metadata recommendations — v0.3.0 candidate

Do not apply these until the release candidate has passed review.

## Repository metadata

- **Homepage:** `https://xbillwatsonx.github.io/vextris/`
- **Topics:** `typescript`, `vite`, `vitest`, `canvas-game`, `puzzle-game`, `tetris-inspired`, `mobile-game`

## Social preview

Use a purpose-made **1280×640 PNG** that combines the Vextris logo, a clean crop of the board with a Vex glyph, and the line: **“Arcane falling-block puzzle game”**. Do not use the existing `intro-16x9.jpg` unchanged: it is 16:9 rather than GitHub’s 2:1 recommendation and lacks a clear social-card message at small sizes.

Until that asset exists, the least-bad temporary image is `public/intro-16x9.jpg`, cropped deliberately for the logo and core board art.

## Branch protection for `master`

After CI has successfully run on a test PR, protect `master` with:

1. Require a pull request before merging.
2. Require the `Test, lint, and build` check to pass.
3. Require one approving review (Alex or Bill’s chosen reviewer).
4. Dismiss stale approvals when new commits are pushed.
5. Require branches to be up to date before merging if the repository pace makes that practical.
6. Restrict direct pushes to maintainers; do not enable force pushes or branch deletion.

Avoid making the check required until the first workflow run confirms the exact check name.
