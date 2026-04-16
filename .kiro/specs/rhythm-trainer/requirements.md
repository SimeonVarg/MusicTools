# Requirements: Rhythm Trainer

## New Tool (from all-specs.md SPEC 14)

Tool that:
- Plays a rhythmic pattern
- User taps along (spacebar or click)
- Measures timing accuracy
- Progressive difficulty

## Acceptance Criteria

### AC-1: Metronome Engine
- Metronome uses Tone.js Transport for accurate timing
- BPM is adjustable (40–200 BPM)
- Visual beat indicators flash on each beat
- Audio click plays on each beat (distinct sounds for downbeat vs upbeat)

### AC-2: Pattern Library
- At least 5 patterns: quarter notes, eighth notes, dotted quarter, syncopated, triplets
- Each pattern has a difficulty level (1–5)
- Pattern is shown as a visual grid before and during playback

### AC-3: Tap Input
- Spacebar and a visible "Tap" button both register taps
- Each tap is timestamped using `performance.now()`
- Taps are matched to the nearest expected beat within ±200ms window

### AC-4: Accuracy Visualization
- A timeline shows expected beats (circles) and actual taps (markers)
- Early taps shown in blue, late taps in orange, accurate taps in green
- Timing error in milliseconds is shown for each tap

### AC-5: Score System
- Accuracy within ±20ms = "Perfect" (100 points)
- Accuracy within ±50ms = "Good" (70 points)
- Accuracy within ±100ms = "OK" (40 points)
- Outside ±100ms = "Miss" (0 points)
- Final grade: A (≥90%), B (≥75%), C (≥60%), F (<60%)

## Correctness Properties
- At 120 BPM, beat interval = 500ms
- Quarter note pattern: tap expected every 500ms at 120 BPM
- Triplet pattern: tap expected every 333ms at 120 BPM
- Timing accuracy = |tap_time - expected_time| in milliseconds
