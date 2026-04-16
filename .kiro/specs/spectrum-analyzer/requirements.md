# Requirements: Spectrum Analyzer

## Bug References (from all-specs.md SPEC 8)
- No user control over smoothing (hardcoded 0.8)
- 3D mode has no orbit controls or instructions
- No freeze/snapshot feature
- Band energy not shown numerically

## Acceptance Criteria

### AC-1: Smoothing Slider
- A slider labeled "Smoothing" is visible in the controls area
- Range: 0.0–0.99, step 0.01, default 0.8
- Moving the slider immediately updates `analyser.smoothingTimeConstant`

### AC-2: 3D Orbit Controls
- In 3D mode, OrbitControls from `@react-three/drei` are active
- A brief instruction text "Drag to orbit" is shown in 3D mode
- Mouse drag rotates the 3D visualization

### AC-3: Freeze Button
- A "Freeze" toggle button is visible
- When frozen, the animation loop stops and the last frame is held
- The button label changes to "Unfreeze" when active
- Frozen state is indicated visually (e.g., border color change)

### AC-4: Band Energy Readout
- Below the visualizer, 7 band energy values are shown numerically in dB
- Band labels: Sub-Bass, Bass, Low-Mid, Mid, Hi-Mid, Presence, Brilliance
- Values update in real time (unless frozen)

## Correctness Properties
- smoothingTimeConstant is clamped to [0, 0.99] by the Web Audio API
- Freeze stops requestAnimationFrame loop but does not disconnect the analyser
- Band energy = average dB of FFT bins within the band's frequency range
