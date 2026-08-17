# Changelog

All notable changes to Vextris will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Release-candidate documentation, GitHub contribution templates, and CI workflow are prepared locally pending review.

## [0.3.0] - 2026-08-16

### Added
- Touch-first portrait gameplay with a compact mobile HUD and two-row control dock.
- Touch controls for movement, soft drop, hard drop, rotation, cycling spells, casting spells, pause, and mute.
- Pointer-owned held input handling that safely combines touch and keyboard holds.
- A touch-accessible high-score initials keypad with A–Z, Backspace, and Confirm actions.
- Mobile-specific instructions that explain the touch dock and spell actions.
- Mobile viewport evidence for 375×667 with safe-area insets, 390×740, 390×812, and 390×844.

### Changed
- Shared game-action dispatch keeps keyboard and touch one-shot actions consistent.
- Mobile controls are state-scoped to active or paused coarse-pointer portrait gameplay.
- Touch buttons suppress text selection, iOS callouts, and tap highlighting while retaining readable labels and accessible names.
- README now documents desktop and mobile play, controls, accessibility, testing, and browser support.

### Fixed
- Touch intro and instructions advance via pointer interaction.
- Pressed/held touch state is cleaned up on blur, visibility changes, cancellation, and lost capture.
- Initials entry and gameplay actions are usable without a hardware keyboard.

## [0.2.0]

### Added
- Vex spell system, high-score persistence, music, and the current desktop game experience.

[Unreleased]: https://github.com/xbillwatsonx/vextris/compare/v0.2.0...HEAD
[0.3.0]: https://github.com/xbillwatsonx/vextris/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/xbillwatsonx/vextris/releases/tag/v0.2.0
