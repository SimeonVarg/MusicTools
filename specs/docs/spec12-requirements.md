# Spec 12 Requirements: Interval Trainer Keyboard (New Tool)

## Overview
An interactive piano keyboard where users identify and play intervals by clicking the correct key.

## Functional Requirements

### FR-1: SVG 2-Octave Keyboard (C3–B4)
- Full 2-octave SVG piano keyboard spanning C3 to B4 (24 white keys, 17 black keys)
- White keys: full height rectangles; black keys: shorter, narrower, overlapping
- Click on any key plays the note via Tone.js
- Correct answer key: green highlight; wrong answer key: red flash

### FR-2: Challenge Generator
- Challenge prompt: "Play a [interval name] above/below [root note]"
- Examples: "Play a Major 3rd above E4", "Play a Perfect 5th below G4"
- Root note: randomly selected from the keyboard range
- Interval: randomly selected from the current difficulty pool
- Direction: ascending or descending (configurable)

### FR-3: Answer Validation + Audio Feedback
- User clicks a key → check if it matches the target pitch
- Correct: green flash on key + success sound (short chord)
- Wrong: red flash on key + error sound (low buzz) + show correct key in yellow
- After 1.5 seconds, advance to next question

### FR-4: Progressive Difficulty
- Level 1: Perfect intervals only (P4, P5, P8)
- Level 2: + Major/minor 3rds and 6ths
- Level 3: + All diatonic intervals (M2, m2, M7, m7)
- Level 4: + Tritone, augmented/diminished
- Level advances after 5 consecutive correct answers
- Level shown in UI; can be manually set

### FR-5: Score + Streak Display
- Score: total correct answers
- Streak: current consecutive correct answers
- Accuracy: percentage correct
- High score persisted in localStorage

## Non-Functional Requirements
- Single file: `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Route already registered at `/interval-keyboard`
- SVG keyboard, no canvas
