# Spec 8 Tasks: Spectrum Analyzer — Smoothing Control + 3D Orbit

## T1: Add Smoothing Slider
**File**: `src/tools/SpectrumAnalyzer/SpectrumAnalyzer.tsx`
- Add `const [smoothing, setSmoothing] = useState(0.8)`
- Add `useEffect` to apply `smoothing` to `analyserRef.current.smoothingTimeConstant`
- Render range slider (0–0.99, step 0.01) in the controls bar
- Label shows current value

## T2: Add OrbitControls to 3D Mode
**File**: `src/tools/SpectrumAnalyzer/SpectrumAnalyzer.tsx`
- Import `OrbitControls` from `@react-three/drei`
- Add `<OrbitControls />` inside the `<Canvas>` in 3D mode
- Add hint text below the 3D canvas
- Ensure OrbitControls only renders in 3D mode

## T3: Add Freeze Button
**File**: `src/tools/SpectrumAnalyzer/SpectrumAnalyzer.tsx`
- Add `const [frozen, setFrozen] = useState(false)` and `frozenRef`
- In animation loop: skip `getByteFrequencyData` + redraw when `frozenRef.current === true`
- Add "❄ Freeze" / "▶ Resume" toggle button in controls
- Frozen state: blue border on visualizer canvas

## T4: Add Numeric Band Energy Readout
**File**: `src/tools/SpectrumAnalyzer/SpectrumAnalyzer.tsx`
- Define `BANDS` array with 7 frequency ranges
- Add `getBandEnergy(data, sampleRate, lo, hi)` function returning dB value
- In animation loop, compute band energies and store in state
- Render 7 band badges below the visualizer with color coding

## Acceptance Criteria
- [ ] Smoothing slider updates analyser in real-time
- [ ] 3D mode has orbit controls (rotate/zoom/pan)
- [ ] Freeze button pauses the visualization
- [ ] 7 band energy values shown below visualizer
