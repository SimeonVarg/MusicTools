# Spec 3 Requirements: Ear Training — Adaptive Difficulty + Remove Confetti

## Overview
Remove the canvas-confetti dependency, add adaptive question weighting, reference tone playback, and spaced repetition for weak items.

## Functional Requirements

### FR-1: Remove canvas-confetti
- Remove all imports and usage of `canvas-confetti`
- Replace milestone celebration with a pure CSS animation (e.g. scale + color pulse on the streak counter)
- No visual regression: streaks still feel rewarding

### FR-2: Adaptive Question Weighting
- Track per-item accuracy: `{ itemId: string, correct: number, total: number }`
- Items with accuracy < 60% appear 3× more frequently in the question pool
- Items with accuracy > 85% appear 0.5× as frequently (spaced out)
- Weighting recalculated after each answer
- Persisted in `localStorage` under key `ear-training-stats`

### FR-3: Reference Tone Button
- For interval questions: add a "Play Root" button that plays the root note before the interval
- Button appears only in interval identification mode
- Plays a single sustained tone (1 second) at the root pitch
- Button is disabled while audio is playing

### FR-4: Per-Item Accuracy Tracking
- After each answer, update the accuracy record for that specific item
- Display accuracy percentage on the stats radar chart
- Weak items (< 60%) shown with a red indicator in the answer buttons

## Non-Functional Requirements
- Remove `canvas-confetti` from `package.json` dependencies
- `localStorage` stats persist across sessions
- Adaptive weighting is computed client-side, no server needed
- Reference tone uses existing Tone.js synth
