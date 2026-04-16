# Music Tools — 15 Specs (10 Improvements + 5 New Tools)

## SPEC 1: Circle of Fifths — Chord Ring Fix + Mode Teaching

### Issues
1. **CRITICAL BUG**: Chord ring maps 7 diatonic chords to 12 slices — `diatonic[i]` where i=0..11 but only 7 chords exist, so indices 7-11 are undefined
2. No mode/scale teaching (Dorian, Mixolydian, etc.)
3. Minor key click plays the major chord (uses KEY_NOTES which are all major triads)
4. No audio playback for individual diatonic chords

### Tasks
- T1: Fix chord ring to show 7 diatonic chords in a separate inner display (not mapped to 12 slices); generate chords from `MODE_INTERVALS[selectedMode]`
- T2: Add mode selector (Ionian through Locrian) that highlights the rotated pattern on the wheel; dim out-of-mode segments to 0.3 opacity
- T3: Add click-to-play on each diatonic chord in the jazz theory panel; use PolySynth with root+third+fifth
- T4: Play minor chord `[0,3,7]` when clicking inner ring (minor keys); fix the `[0,4,7]` major triad bug

---

## SPEC 2: Chord Builder — Voice Leading + Click-to-Play + Dynamic Tension

### Issues
1. No audio preview when clicking individual chord cards
2. Tension score is a static lookup table — doesn't account for context (key, preceding chord)
3. No voice leading analysis between adjacent chords
4. No indication of common tones between chords

### Tasks
- T1: Add click-to-play on each ChordCard (trigger synth on card click)
- T2: Compute contextual tension: incorporate interval from key root + distance from previous chord
- T3: Add voice leading arrows: show semitone motion between adjacent chord voicings
- T4: Highlight common tones between adjacent chords in the mini keyboard

---

## SPEC 3: Ear Training — Adaptive Difficulty + Remove Confetti

### Issues
1. Confetti dependency (canvas-confetti) for a trivial visual effect — bloats bundle
2. No adaptive difficulty — pool stays static regardless of performance
3. Questions are purely random — no spaced repetition for weak areas
4. No reference tone option for intervals

### Tasks
- T1: Remove canvas-confetti dependency, replace with a simple CSS animation for streaks
- T2: Add adaptive question weighting: items with lower accuracy appear more frequently
- T3: Add "play reference tone" button that plays the root before interval questions
- T4: Track per-item accuracy and bias question generation toward weak items

---

## SPEC 4: Drum Machine — Euclidean UX + Presets + Swing Viz

### Issues
1. Euclidean input uses onBlur — user must click away to apply, very poor UX
2. No pattern presets (common beats like 4-on-floor, bossa nova, etc.)
3. Swing amount has no visual feedback on the circular display
4. No visual indication of which ring is which instrument (only color, no labels on SVG)

### Tasks
- T1: Replace Euclidean onBlur with immediate onChange + debounce (apply on every value change)
- T2: Add 6 pattern presets: 4-on-floor, backbeat, bossa nova, shuffle, breakbeat, empty
- T3: Add ring labels (instrument names) on the SVG near each ring
- T4: Visualize swing by offsetting even-numbered dots slightly clockwise

---

## SPEC 5: Ambient Engine — Convert Tailwind to Inline Styles

### Issues
1. **INCONSISTENCY**: Only tool using Tailwind classes — all others use inline styles
2. Markov chain has no user-visible state or explanation
3. No visual feedback showing which scale degree is currently playing

### Tasks
- T1: Convert ALL Tailwind className usage to inline styles (matching project convention)
- T2: Add a "now playing" indicator showing the current Markov state (scale degree)
- T3: Add a simple scale degree highlight strip showing recent melody notes

---

## SPEC 6: Galaxy Map — Performance + Teaching Content

### Issues
1. MDS layout runs 80 iterations over 36 scales on every render — blocking main thread
2. No teaching content: clicking a scale shows intervals but doesn't explain what makes it unique
3. Similarity threshold 0.6 is arbitrary with no user control
4. No comparison mode between two scales

### Tasks
- T1: Memoize positions with useMemo (already done) but reduce iterations from 80→40 (sufficient convergence)
- T2: Add a "description" field to each scale with 1-line teaching content about its character
- T3: Add similarity threshold slider to the controls bar
- T4: Add compare mode: shift-click a second scale to see shared/different notes highlighted

---

## SPEC 7: Oscilloscope — Keyboard Input + Extended Range

### Issues
1. No keyboard/MIDI input — can only set frequency via knob drag
2. Frequency range 20-2000 Hz is too limited (misses upper harmonics, standard piano goes to 4186 Hz)
3. No note name buttons for quick frequency selection
4. Canvas doesn't resize responsively

### Tasks
- T1: Extend frequency knob range to 20-8000 Hz
- T2: Add a row of clickable note buttons (C2-C7) that set the frequency
- T3: Add keyboard listener: keys A-L map to C4-B4 (one octave), Z/X shift octave down/up
- T4: Add octave display and +/- octave buttons

---

## SPEC 8: Spectrum Analyzer — Smoothing Control + 3D Orbit

### Issues
1. No user control over smoothing (hardcoded smoothingTimeConstant = 0.8)
2. 3D mode has no visible orbit controls or instructions
3. No freeze/snapshot feature to analyze a moment in time
4. Band energy readout not shown numerically

### Tasks
- T1: Add smoothing slider (0.0-0.99) that updates analyser.smoothingTimeConstant
- T2: Add OrbitControls to the 3D Canvas (import from @react-three/drei)
- T3: Add freeze button that pauses the animation loop but keeps the last frame visible
- T4: Add numeric band energy readout below the visualizer

---

## SPEC 9: Tuner — Fix JI_RATIOS + Fix JustVsET Math

### Issues
1. **CRITICAL BUG**: JI_RATIOS is labeled "partials 1-16" but contains JI interval ratios (3/2, 5/4, etc.) not harmonic series (1, 2, 3, 4...). The HarmonicBars component uses `fundamental * (i+1)` which is correct for harmonics, but then displays JI_RATIOS as fractions below — these are unrelated values
2. **CRITICAL BUG**: JustVsET computes `etFreq = fundamental * n` and `jiFreq = fundamental * ratio` — but JI_RATIOS[0]=1/1, JI_RATIOS[1]=2/1, JI_RATIOS[2]=3/2... so partial 3 uses ratio 3/2 instead of 3/1. The comparison is between harmonic partials and JI intervals, which are different concepts
3. The component conflates two distinct concepts: harmonic series (overtones) and just intonation intervals

### Tasks
- T1: Replace JI_RATIOS with correct HARMONIC_RATIOS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] for the harmonic series display
- T2: Add separate JI_INTERVALS for the JI vs ET comparison: [1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8] (the 12 JI intervals)
- T3: Fix JustVsET to compare each JI interval against its ET equivalent: `etFreq = fundamental * 2^(semitones/12)`, `jiFreq = fundamental * jiRatio`
- T4: Fix HarmonicBars to show `fundamental * n` with the fraction label showing `n/1`

---

## SPEC 10: Piano Roll — Already Fixed (No-Op)

Piano Roll was already improved in the previous session (black keys, snap grid, selection box). No further changes needed.

### Tasks
- T1: No changes required

---

## SPEC 11: NEW TOOL — Chord Progression Analyzer (Interactive)

### Requirements
A tool where users paste or input a chord progression (text like "Dm7 G7 Cmaj7") and get:
- Roman numeral analysis in detected key
- Functional harmony labels (T/S/D)
- Voice leading graph
- Common substitution suggestions
- Audio playback of the progression

### Design
- Single-file component at `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Text input field for chord symbols
- Auto-detect key from chord content
- D3 voice leading graph showing soprano/alto/tenor/bass motion
- Substitution suggestions panel

### Tasks
- T1: Create chord parser (text → root + quality)
- T2: Key detection algorithm (find key with most diatonic matches)
- T3: Roman numeral + function analysis
- T4: Voice leading visualization (D3 line chart of SATB voices)
- T5: Substitution engine (tritone subs, relative major/minor, modal interchange)
- T6: Audio playback with Tone.js
- T7: Register route in App.tsx

---

## SPEC 12: NEW TOOL — Interval Trainer Keyboard

### Requirements
An interactive piano keyboard where:
- A target interval is shown (e.g., "Play a Major 3rd above E")
- User clicks the correct key on a visual keyboard
- Immediate audio + visual feedback
- Progressive difficulty (simple intervals → compound → chromatic)
- Score tracking

### Design
- Single-file component at `src/tools/IntervalKeyboard/IntervalKeyboard.tsx`
- Full 2-octave SVG piano keyboard (C3-B4)
- Challenge prompt at top
- Click detection on keys
- Color feedback (green=correct, red=wrong)

### Tasks
- T1: SVG 2-octave keyboard with click handlers
- T2: Challenge generator (random root + interval)
- T3: Answer validation + audio feedback
- T4: Progressive difficulty system
- T5: Score/streak display
- T6: Register route in App.tsx

---

## SPEC 13: NEW TOOL — Scale Practice Mode

### Requirements
An interactive tool that:
- Shows a scale on a fretboard OR keyboard
- Plays the scale ascending/descending
- Quizzes the user on scale degrees ("What's the 6th degree of D Dorian?")
- Shows interval pattern (W-W-H-W-W-W-H for major)

### Design
- Single-file component at `src/tools/ScalePractice/ScalePractice.tsx`
- Piano keyboard visualization showing scale notes highlighted
- Interval pattern display
- Quiz mode with degree questions
- Audio playback

### Tasks
- T1: Scale data (all modes, pentatonics, blues, melodic/harmonic minor)
- T2: Piano keyboard visualization with highlighted scale notes
- T3: Interval pattern display (W/H steps)
- T4: Quiz mode: "What is degree N of X scale?"
- T5: Audio playback (ascending, descending, random)
- T6: Register route in App.tsx

---

## SPEC 14: NEW TOOL — Rhythm Trainer

### Requirements
A tool that:
- Plays a rhythmic pattern
- User taps along (spacebar or click)
- Measures timing accuracy
- Progressive difficulty (quarter notes → eighth → syncopation → odd meters)

### Design
- Single-file component at `src/tools/RhythmTrainer/RhythmTrainer.tsx`
- Visual metronome with beat indicators
- Tap input via spacebar/click
- Timing accuracy display (ms early/late)
- Pattern library with difficulty levels

### Tasks
- T1: Metronome engine with Tone.js
- T2: Pattern library (quarter, eighth, dotted, syncopated, triplet)
- T3: Tap input handler with timing measurement
- T4: Accuracy visualization (timeline showing expected vs actual taps)
- T5: Score/grade system
- T6: Register route in App.tsx

---

## SPEC 15: NEW TOOL — Harmonic Series Visualizer

### Requirements
An interactive 3D visualization of the harmonic series that:
- Shows overtones as orbiting particles at heights proportional to frequency
- Plays individual harmonics on click
- Shows how harmonics combine to form timbres
- Teaches the relationship between harmonics and intervals

### Design
- Single-file component at `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- R3F 3D scene with harmonic nodes
- Click to toggle harmonics on/off
- Waveform display showing the combined result
- Teaching panel explaining each harmonic's interval relationship

### Tasks
- T1: 3D scene with harmonic nodes (spheres at heights proportional to frequency)
- T2: Click to toggle individual harmonics with Tone.js
- T3: Combined waveform canvas
- T4: Teaching panel (harmonic N = interval from fundamental)
- T5: Timbre presets (select which harmonics to emphasize)
- T6: Register route in App.tsx
