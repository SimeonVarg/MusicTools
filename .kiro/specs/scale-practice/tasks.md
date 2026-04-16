# Tasks: Scale Practice

- [ ] T1: Define scale data
  - Create `SCALES: ScaleDef[]` with 12 scales (7 modes + pentatonics + blues + melodic/harmonic minor)
  - Each entry: name, intervals, steps string
  - Verify: Major scale intervals = [0,2,4,5,7,9,11], steps = "W W H W W W H"

- [ ] T2: Build keyboard visualization
  - Reuse SVG piano key layout (C3–B4, same as IntervalKeyboard)
  - `getScaleNotes(rootPc, scale)` returns Set of pitch classes
  - Root note: gold; scale notes: purple; non-scale: default
  - Verify: C Major highlights C D E F G A B keys

- [ ] T3: Interval pattern display
  - Render step pattern string below keyboard (e.g. "W W H W W W H")
  - Each step shown as a pill/badge
  - Verify: switching scale updates step pattern

- [ ] T4: Quiz mode
  - `generateQuestion(rootPc, scale): QuizQuestion`
  - Random degree index, 4 multiple-choice note names
  - Correct/incorrect feedback with color
  - Track score and accuracy per scale
  - Verify: "What is degree 3 of C Major?" → correct answer = E

- [ ] T5: Audio playback
  - "▶ Ascending" and "▶ Descending" buttons
  - Play scale notes via Tone.js at 120 BPM
  - Verify: ascending plays C D E F G A B C for C Major

- [ ] T6: Route already registered in App.tsx — verify `/scale-practice` loads
