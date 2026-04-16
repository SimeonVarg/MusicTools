# Spec 3 Tasks: Ear Training — Adaptive Difficulty + Remove Confetti

## T1: Remove canvas-confetti
**File**: `src/tools/EarTraining/EarTraining.tsx`
- Delete `import confetti from 'canvas-confetti'` (and `@types/canvas-confetti` usage)
- Remove all `confetti(...)` call sites
- Add CSS `@keyframes streakPulse` animation in a `<style>` tag or inline
- Trigger animation by toggling `celebrating` state for 600ms on milestone streaks

## T2: Add Adaptive Question Weighting
**File**: `src/tools/EarTraining/EarTraining.tsx`
- Add `StatsMap` type and `stats` state loaded from `localStorage`
- Add `buildWeightedPool(items, stats)` function
- Replace current random question selection with weighted pool selection
- Save stats to `localStorage` after each answer

## T3: Add "Play Root" Reference Tone Button
**File**: `src/tools/EarTraining/EarTraining.tsx`
- Add button visible only in interval identification mode
- Button plays root note for 1 second via Tone.js
- Button disabled while audio is playing
- Position: above the answer buttons, below the question prompt

## T4: Track Per-Item Accuracy + Bias Generation
**File**: `src/tools/EarTraining/EarTraining.tsx`
- After each answer, call `updateStats(itemId, isCorrect)`
- `updateStats` increments `correct` and `total` for the item
- Weak items (accuracy < 60%) get red border on their answer button
- Stats displayed in the radar chart (already exists — feed real data)

## Acceptance Criteria
- [ ] No `canvas-confetti` import or usage
- [ ] Streak milestone shows CSS pulse animation
- [ ] Weak items appear more frequently over multiple sessions
- [ ] "Play Root" button appears in interval mode and plays audio
- [ ] Stats persist across page reloads
