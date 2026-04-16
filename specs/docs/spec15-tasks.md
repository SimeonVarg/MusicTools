# Spec 15 Tasks: Harmonic Series Visualizer

## T1: 3D Scene with Harmonic Nodes
**File**: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- R3F Canvas with 16 sphere meshes
- Height: `Math.log2(n) * 2` (logarithmic)
- Radius: `0.3 / Math.sqrt(n)` (smaller for higher harmonics)
- Color: `hsl((n/16)*360, 80%, 60%)` when active, gray when inactive
- Orbit position: `[cos(n)*orbitRadius, height, sin(n)*orbitRadius]`
- Add ambient + point lights

## T2: Click to Toggle Harmonics + Tone.js
**File**: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- `const [activeHarmonics, setActiveHarmonics] = useState<Set<number>>(new Set([1]))`
- Clicking a sphere toggles it in/out of `activeHarmonics`
- For each active harmonic: create/start Tone.js Oscillator at `fundamental * n`
- For each inactive harmonic: stop/dispose its oscillator
- Fundamental slider: 55–440 Hz, updates all oscillator frequencies
- Use `useRef<Map<number, Tone.Oscillator>>` to track oscillators

## T3: Combined Waveform Canvas
**File**: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- `<canvas>` element below the 3D scene (400×80px)
- `drawWaveform(canvas, activeHarmonics, fundamental)` function
- Redraws on every `activeHarmonics` or `fundamental` change
- Shows one period of the combined waveform
- Purple stroke color

## T4: Teaching Panel
**File**: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- `HARMONIC_INFO` array with interval name and significance for each harmonic
- On hover/click of a sphere: show that harmonic's info in a side panel
- Panel shows: n, frequency, interval name, musical significance
- Default: show all harmonics in a scrollable list

## T5: Timbre Presets
**File**: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- `PRESETS` object with 6 preset harmonic sets
- Preset buttons: Sine, Square, Sawtooth, Triangle, Clarinet, Brass
- Clicking a preset sets `activeHarmonics` to the preset's harmonic set

## T6: Route Verification
- Verify `/harmonic-series` route works (already registered)

## Acceptance Criteria
- [ ] 16 spheres rendered at correct heights and sizes
- [ ] Clicking sphere toggles audio on/off
- [ ] Waveform canvas updates in real-time
- [ ] Teaching panel shows harmonic info
- [ ] 6 timbre presets work correctly
- [ ] Fundamental frequency slider works
