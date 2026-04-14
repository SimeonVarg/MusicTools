# MusicTools — 10 Specs

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Audio**: Tone.js (synthesis, scheduling, effects)
- **3D/WebGL**: Three.js + @react-three/fiber + @react-three/drei
- **2D Viz**: D3.js (SVG-based interactive charts)
- **Animation**: Framer Motion
- **State**: Zustand
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS v4

---

## Spec 1: Interactive Circle of Fifths Visualizer
**Route**: `/circle-of-fifths`

### Requirements
- Rotating SVG wheel with all 12 major + 12 minor keys
- Click any key to hear it played (Tone.js PolySynth)
- Highlight related keys: relative minor, parallel minor, dominant, subdominant
- Show diatonic chords (I–VII) for selected key in an outer ring
- Display secondary dominants and tritone substitutions (jazz theory)
- Color-coded by key signature (sharps = warm, flats = cool)
- Animate rotation to selected key with spring physics

### Design
- Full-screen dark canvas, neon glow on active segments
- Outer ring: diatonic chord labels (animated in on selection)
- Inner ring: key names with accidentals
- Center: displays selected key info (scale degrees, relative minor, parallel minor)
- Hover: shows tooltip with key signature count
- Framer Motion spring rotation animation

### Tasks
1. Build SVG arc-segment wheel with D3 pie layout
2. Implement key selection state + Tone.js playback
3. Render outer diatonic chord ring (animated)
4. Add jazz theory annotations (secondary dominants, tritone subs)
5. Color mapping + glow effects via CSS filters
6. Spring rotation animation with Framer Motion

---

## Spec 2: Chord Progression Builder & Jazz Harmony Explorer
**Route**: `/chord-builder`

### Requirements
- Drag-and-drop chord slots (up to 8 bars)
- Chord palette: triads, 7ths, 9ths, 11ths, 13ths, altered chords
- Jazz voicing engine: drop-2, drop-3, shell voicings, rootless voicings
- Roman numeral analysis overlay (shows function: tonic/subdominant/dominant)
- Detect and label: ii-V-I, tritone subs, modal interchange, backdoor progressions
- Play progression with Tone.js (piano samples or synth)
- Export progression as text (e.g. "Cmaj7 | Am7 | Dm7 | G7")
- Tension/resolution meter (visual arc showing harmonic tension)

### Design
- Dark piano-roll-style horizontal layout
- Each chord card: chord symbol + voicing diagram (mini keyboard)
- Animated tension arc above the progression (D3 line chart)
- Color: tonic=blue, subdominant=green, dominant=red/orange
- Chord palette sidebar with search

### Tasks
1. Chord data model (root, quality, extensions, alterations)
2. Voicing engine (drop-2, rootless, shell)
3. Drag-and-drop progression slots
4. Roman numeral analysis + jazz pattern detection
5. Tone.js playback with scheduling
6. Tension/resolution D3 arc visualization
7. Mini keyboard voicing diagram per chord

---

## Spec 3: Oscilloscope / Waveform Synthesizer
**Route**: `/oscilloscope`

### Requirements
- 3 oscillators (sine, square, sawtooth, triangle, custom)
- Real-time waveform display on canvas (oscilloscope style)
- ADSR envelope controls per oscillator
- LFO modulation (rate, depth, target: pitch/filter/amplitude)
- Filter section: lowpass/highpass/bandpass with resonance
- Lissajous figure mode (X/Y plot of two oscillators)
- Frequency display in Hz + musical note name
- Detune control (cents) for chorus/unison effects

### Design
- Dark CRT-style aesthetic with phosphor green/amber glow
- Canvas oscilloscope with scanline overlay effect
- Knob controls (SVG rotary knobs)
- Lissajous mode: glowing parametric curve on black canvas
- Animated waveform that reacts to parameter changes

### Tasks
1. Tone.js oscillator setup (3 voices + LFO)
2. Web Audio API AnalyserNode → canvas waveform renderer
3. ADSR + filter controls (SVG knobs)
4. Lissajous mode (two-channel X/Y canvas plot)
5. CRT scanline shader effect (CSS + canvas overlay)
6. Note name display from frequency

---

## Spec 4: Polyrhythm Drum Machine
**Route**: `/drum-machine`

### Requirements
- Up to 6 independent rhythm tracks, each with its own step count (3–16)
- Each track: kick, snare, hi-hat, clap, tom, cowbell, shaker
- Visual: concentric rotating circles (each track = one ring)
- Tempo control (40–240 BPM) + swing amount
- Euclidean rhythm generator (Bjorklund algorithm)
- Accent/velocity per step (click = on, shift+click = accent)
- Mute/solo per track
- Polyrhythm ratio display (e.g. "3:4:5")

### Design
- Circular step sequencer: each track is a ring of dots
- Active step: bright pulse with glow
- Rotating playhead line sweeps around all rings simultaneously
- Color per track (distinct hues)
- Center: BPM display + tap tempo button
- Euclidean generator panel slides in from bottom

### Tasks
1. Tone.js Transport + Sequence for each track
2. Circular step sequencer SVG renderer
3. Rotating playhead animation (requestAnimationFrame)
4. Euclidean rhythm algorithm
5. Accent/velocity system
6. Swing implementation
7. Mute/solo logic

---

## Spec 5: Spectral Frequency Analyzer
**Route**: `/spectrum`

### Requirements
- Real-time FFT spectrum analyzer (microphone or oscillator input)
- Multiple display modes: bar chart, waterfall, 3D spectrogram
- Frequency bands: sub-bass, bass, low-mid, mid, high-mid, presence, brilliance
- Peak hold with decay
- Logarithmic vs linear frequency scale toggle
- Note detection overlay (shows closest musical note for each peak)
- Cepstrum analysis mode (shows fundamental + harmonics)
- A-weighting filter toggle

### Design
- 3D spectrogram: Three.js plane geometry with vertex displacement
- Bar mode: neon bars with gradient (purple→cyan→white by amplitude)
- Waterfall: scrolling heatmap (D3 color scale)
- Frequency labels along X axis, dB along Y
- Floating note labels on detected peaks

### Tasks
1. Web Audio API: getUserMedia + AnalyserNode (FFT 2048/4096)
2. Bar chart renderer (canvas 2D)
3. Waterfall scrolling heatmap (canvas 2D)
4. Three.js 3D spectrogram mesh
5. Peak detection + note labeling
6. Cepstrum computation
7. A-weighting filter coefficients

---

## Spec 6: Scale & Mode Galaxy Map
**Route**: `/galaxy-map`

### Requirements
- 3D star-field where each star = a musical scale/mode
- 35+ scales: major, minor, all 7 modes, melodic minor modes, harmonic minor modes, pentatonics, blues, bebop, whole tone, diminished, augmented, exotic (Hungarian minor, Persian, Phrygian dominant, etc.)
- Click a star to hear the scale played + see its interval structure
- Proximity = harmonic similarity (scales sharing many notes cluster together)
- Filter by: number of notes, mood (bright/dark/exotic), genre (jazz/classical/world)
- Constellation lines connecting related scales
- Search by name

### Design
- Three.js starfield with bloom post-processing
- Stars: size = popularity, color = mood (warm=bright, cool=dark, purple=exotic)
- Selected star: expands with orbit rings showing scale degrees
- Constellation lines: thin glowing lines between related scales
- HUD overlay: scale name, intervals, modes, characteristic notes

### Tasks
1. Scale database (35+ scales with intervals + metadata)
2. Three.js particle system for stars
3. Similarity clustering (shared pitch-class sets → 3D positions)
4. Click interaction + scale playback (Tone.js)
5. Constellation line rendering
6. Bloom post-processing (@react-three/postprocessing)
7. Filter/search UI overlay

---

## Spec 7: Ear Training Game — Interval & Chord Recognition
**Route**: `/ear-training`

### Requirements
- 4 game modes: Interval ID, Chord Quality, Chord Inversion, Progression ID
- Difficulty levels: beginner (P4/P5/octave), intermediate (all intervals), advanced (altered chords, tritone subs)
- Streak counter + XP system with level-up animations
- Wrong answer: shows correct answer with visual explanation
- Interval: ascending, descending, or harmonic
- Chord mode: root position + all inversions + drop voicings
- Progression mode: identify ii-V-I, I-IV-V, I-vi-IV-V, etc.
- Stats: accuracy per interval/chord type (radar chart)

### Design
- Arcade game aesthetic: dark bg, neon UI, pixel-style score counter
- Answer buttons animate on correct/wrong (green flash / red shake)
- Streak fire animation (canvas-confetti on milestones)
- Radar chart (D3) showing accuracy per category
- Level-up screen with Three.js particle burst

### Tasks
1. Question generator (all modes + difficulties)
2. Tone.js playback for intervals/chords/progressions
3. Answer validation + streak/XP logic
4. Animated feedback (Framer Motion)
5. Radar chart (D3)
6. Confetti + level-up effects
7. Stats persistence (localStorage)

---

## Spec 8: MIDI Piano Roll Visualizer
**Route**: `/piano-roll`

### Requirements
- Scrolling piano roll (time on X, pitch on Y)
- Draw notes by clicking/dragging on the grid
- Quantization: 1/4, 1/8, 1/16, 1/32, triplets
- Velocity lane below the roll (drag to adjust)
- Playback with Tone.js (piano samples)
- Zoom in/out (time axis)
- Select + move + resize notes
- Chord detection overlay (shows chord name above note clusters)
- Export as JSON

### Design
- Classic DAW dark theme: black keys darker, white keys lighter
- Notes: colored by pitch class (C=red, D=orange, etc.)
- Velocity bars: gradient from blue (soft) to red (loud)
- Playhead: bright vertical line with glow
- Chord labels: floating above note clusters

### Tasks
1. Canvas-based piano roll renderer (pitch grid + note blocks)
2. Note CRUD (draw, select, move, resize, delete)
3. Quantization engine
4. Velocity lane renderer + drag interaction
5. Tone.js playback with scheduling
6. Chord detection from simultaneous notes
7. Zoom/scroll handling

---

## Spec 9: Tuner + Harmonic Overtone Series Display
**Route**: `/tuner`

### Requirements
- Chromatic tuner: microphone input → pitch detection (autocorrelation)
- Displays: note name, octave, cents deviation, frequency in Hz
- Strobe tuner mode (rotating strobe disc that freezes when in tune)
- Harmonic series visualizer: shows first 16 partials of detected fundamental
- Overtone ratios display (1:1, 2:1, 3:2, 4:3, 5:4, etc.)
- Just intonation vs equal temperament comparison (shows cent differences)
- Lissajous comparison: detected pitch vs reference pitch
- Reference pitch adjustment (A=432–446 Hz)

### Design
- Analog VU meter aesthetic for cents deviation
- Strobe disc: SVG rotating segments that appear to stop when in tune
- Harmonic series: vertical bars with harmonic number labels, colored by harmonic distance
- Just vs ET comparison: side-by-side colored bars with cent labels
- Lissajous: glowing parametric curve

### Tasks
1. Web Audio API: getUserMedia + autocorrelation pitch detection
2. Note name + cents calculation
3. Strobe disc SVG animation
4. Harmonic series computation + bar chart
5. Just intonation ratio table
6. Lissajous canvas renderer
7. Reference pitch control

---

## Spec 10: Generative Ambient Music Engine
**Route**: `/ambient`

### Requirements
- Procedurally generates evolving ambient music
- Parameters: key, scale, density, tempo, reverb, harmonic complexity
- 4 generative layers: drone, melody, harmony, percussion
- Markov chain melody generation (trained on jazz/ambient patterns)
- Spectral freeze effect (freezes a moment of audio)
- Visual: 3D fluid simulation reacting to audio
- Mood presets: "Deep Space", "Forest Rain", "Jazz Club", "Underwater", "Sunrise"
- Record output (Web Audio API MediaRecorder)

### Design
- Three.js fluid/particle simulation (audio-reactive)
- Particles pulse and flow with the music
- Mood selector: large atmospheric cards with preview
- Parameter sliders with real-time effect
- Waveform display of current output
- Record button with pulsing animation

### Tasks
1. Tone.js generative engine (drone + melody + harmony + perc layers)
2. Markov chain melody generator
3. Spectral freeze effect (custom Tone.js node)
4. Three.js audio-reactive particle system
5. Mood preset system
6. MediaRecorder output capture
7. Parameter UI with real-time updates
