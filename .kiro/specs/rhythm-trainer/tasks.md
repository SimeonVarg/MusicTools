# Tasks: Rhythm Trainer

- [ ] T1: Metronome engine
  - Implement `startMetronome(bpm, pattern)` using Tone.Transport + Tone.Sequence
  - Downbeat click: C5 triangle; upbeat click: G4 triangle
  - Visual beat indicator flashes on each subdivision
  - BPM slider: 40–200
  - Verify: metronome plays at correct tempo

- [ ] T2: Pattern library
  - Define `PATTERNS: RhythmPattern[]` with 5 patterns
  - Pattern selector buttons with difficulty labels
  - Show pattern grid (expected tap positions)
  - Verify: selecting "Triplets" shows 12 subdivisions per 4 beats

- [ ] T3: Tap input handler
  - Spacebar and "Tap" button both call `handleTap()`
  - `handleTap()`: record `performance.now()` relative to start time
  - Match tap to nearest expected beat within ±200ms
  - Verify: tapping spacebar records a tap event

- [ ] T4: Accuracy visualization
  - SVG timeline: expected beats as circles, actual taps as triangles
  - Color by grade: green=Perfect, yellow=Good, orange=OK, red=Miss
  - Show ms error for each tap
  - Verify: timeline renders after each round

- [ ] T5: Score/grade system
  - Calculate points per tap: Perfect=100, Good=70, OK=40, Miss=0
  - Final grade: A≥90%, B≥75%, C≥60%, F<60%
  - Display grade after round ends
  - Verify: all Perfect taps → grade A

- [ ] T6: Route already registered in App.tsx — verify `/rhythm-trainer` loads
