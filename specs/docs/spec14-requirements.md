# Spec 14 Requirements: Rhythm Trainer (New Tool)

## Overview
A tool that plays rhythmic patterns and measures the user's tap accuracy, with progressive difficulty.

## Functional Requirements

### FR-1: Metronome Engine
- Tone.js Transport-based metronome
- BPM range: 40–200, default 80
- Visual beat indicator: flashing circle on each beat
- Audible click: high click on beat 1, low click on other beats
- Count-in: 1 bar of clicks before pattern starts

### FR-2: Pattern Library
- At least 8 patterns across 4 difficulty levels:
  - Level 1: Quarter notes (4 taps per bar)
  - Level 2: Eighth notes (8 taps per bar)
  - Level 3: Dotted quarter + eighth, syncopation
  - Level 4: Triplets, 16th notes, odd meters (5/4, 7/8)
- Each pattern: name, time signature, note values, BPM range
- Pattern displayed as a simple notation strip (boxes for beats)

### FR-3: Tap Input + Timing Measurement
- Spacebar or large tap button for input
- Measure timing: ms early/late relative to expected beat
- Tolerance window: ±100ms = correct, ±200ms = close, >200ms = miss
- Visual feedback: green (correct), yellow (close), red (miss)

### FR-4: Accuracy Visualization
- Timeline showing expected beats (vertical lines) vs actual taps (dots)
- Dots colored by accuracy (green/yellow/red)
- Running accuracy percentage
- "Timing histogram" showing distribution of early/late errors

### FR-5: Score + Grade System
- Grade: A (>90% correct), B (80–90%), C (70–80%), D (<70%)
- Score: points based on accuracy (perfect = 10, close = 5, miss = 0)
- High score per pattern in localStorage
- Level advances after grade A on current level

## Non-Functional Requirements
- Single file: `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Route already registered at `/rhythm-trainer`
- Tone.js Transport for scheduling
- `performance.now()` for tap timing
