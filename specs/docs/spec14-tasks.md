# Spec 14 Tasks: Rhythm Trainer

## T1: Metronome Engine
**File**: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Implement Tone.js Transport-based metronome
- BPM slider (40–200)
- Visual beat indicator (flashing circle)
- High/low click sounds for beat 1 vs other beats
- Count-in: 1 bar before pattern starts

## T2: Pattern Library
**File**: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Define `PATTERNS` array with 6+ patterns across 4 levels
- Pattern selector UI (buttons or dropdown)
- Display pattern as beat boxes (filled = beat, empty = rest)
- Show time signature and BPM

## T3: Tap Input + Timing Measurement
**File**: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Spacebar and large tap button
- `performance.now()` for tap timing
- Compare tap time to nearest expected beat
- Classify: correct (±100ms), close (±200ms), miss (>200ms)
- Visual feedback per tap

## T4: Accuracy Timeline Visualization
**File**: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- SVG timeline: expected beats as vertical lines
- Tap dots colored by accuracy
- Running accuracy percentage display
- Show ms early/late for each tap

## T5: Score + Grade System
**File**: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Score: 10 (correct), 5 (close), 0 (miss)
- Grade: A/B/C/D based on accuracy %
- High score per pattern in localStorage
- Level advance after grade A

## T6: Route Verification
- Verify `/rhythm-trainer` route works (already registered)

## Acceptance Criteria
- [ ] Metronome plays at correct BPM with visual indicator
- [ ] 6+ patterns available across 4 levels
- [ ] Spacebar tap measured against expected beats
- [ ] Timeline shows expected vs actual taps
- [ ] Grade and score displayed after each round
