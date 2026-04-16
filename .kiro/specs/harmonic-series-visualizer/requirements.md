# Requirements: Harmonic Series Visualizer

## New Tool (from all-specs.md SPEC 15)

3D visualization of the harmonic series with orbiting particles, click-to-play, combined waveform, and teaching panel.

## Acceptance Criteria

### AC-1: 3D Scene
- R3F Canvas renders 16 harmonic nodes as spheres
- Each sphere's Y position is proportional to harmonic number n
- Spheres colored by harmonic number (warm→cool gradient)

### AC-2: Click to Toggle Harmonics
- Clicking a sphere toggles that harmonic on/off
- Active harmonics play sine wave at `fundamental * n` via Tone.js
- Active spheres glow; inactive spheres are dim

### AC-3: Combined Waveform Canvas
- 2D canvas shows sum of all active harmonic sine waves
- Updates in real time as harmonics are toggled

### AC-4: Teaching Panel
- Each harmonic labeled: "Harmonic N — [interval name]"
- Interval names: 1=Fundamental, 2=Octave, 3=P5+8va, 4=2 Octaves, 5=M3+2×8va

### AC-5: Timbre Presets
- Presets: Sine (1 only), Sawtooth (all), Square (odd only), Custom
- Selecting preset toggles appropriate harmonics

## Correctness Properties
- Harmonic 2 = fundamental × 2 (one octave)
- Harmonic 3 = fundamental × 3 (P5 + octave)
- Square wave = odd harmonics only (1,3,5,7...)
- Sawtooth = all harmonics with amplitude 1/n
