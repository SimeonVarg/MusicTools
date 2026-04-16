# Requirements: Ear Training

## Bug References (from all-specs.md SPEC 3)
- canvas-confetti dependency bloats bundle for a trivial visual effect
- No adaptive difficulty — question pool is static
- No spaced repetition for weak areas
- No reference tone option for interval questions

## Acceptance Criteria

### AC-1: Remove Confetti
- `canvas-confetti` is not imported or called anywhere in EarTraining.tsx
- Streak celebrations use a CSS-only animation (e.g., scale pulse or color flash)
- Bundle size is reduced by removing the dependency

### AC-2: Adaptive Question Weighting
- Items with accuracy < 60% appear at least 2× more frequently than items > 80%
- Question selection uses weighted random sampling based on per-item accuracy
- Weights are recalculated after each answer

### AC-3: Reference Tone
- A "Play Root" button is visible during interval questions
- Clicking it plays the root note via Tone.js before the interval
- The button is only shown in interval mode

### AC-4: Per-Item Accuracy Tracking
- Each interval/chord type has its own correct/total counter in state
- Stats persist within the session (not across page reloads)
- Weak items (accuracy < 50%) are visually flagged in the stats panel

## Correctness Properties
- Weighted selection: item with weight 3 appears ~3× as often as item with weight 1
- Reference tone plays the exact root note of the current question
- Removing confetti does not affect score/streak logic
