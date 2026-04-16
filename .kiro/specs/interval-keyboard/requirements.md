# Requirements: Interval Keyboard

## New Tool (from all-specs.md SPEC 12)

Interactive piano keyboard where:
- A target interval is shown (e.g., "Play a Major 3rd above E")
- User clicks the correct key
- Immediate audio + visual feedback
- Progressive difficulty
- Score tracking

## Acceptance Criteria

### AC-1: SVG Keyboard
- A 2-octave SVG piano keyboard (C3–B4) is rendered
- White keys and black keys are correctly positioned and sized
- Each key is clickable

### AC-2: Challenge Generator
- Each challenge specifies: root note + interval name + direction (above/below)
- Root note is randomly selected from the visible keyboard range
- Interval is randomly selected from the current difficulty pool

### AC-3: Audio + Visual Feedback
- Clicking the correct key: key flashes green, correct sound plays
- Clicking the wrong key: key flashes red, correct answer is briefly shown
- Root note is highlighted in blue throughout the challenge

### AC-4: Progressive Difficulty
- Beginner: P4, P5, P8, M2, M3 only
- Intermediate: all diatonic intervals
- Advanced: all 13 intervals including chromatic
- Difficulty advances automatically after 5 consecutive correct answers

### AC-5: Score Tracking
- Current score, streak, and best streak are displayed
- Correct answer: +10 points; wrong answer: streak resets
- Session high score is tracked

## Correctness Properties
- Major 3rd above E = G# (4 semitones up)
- Perfect 5th above C = G (7 semitones up)
- Minor 3rd below A = F# (3 semitones down)
- Answer validation uses pitch class arithmetic (mod 12)
