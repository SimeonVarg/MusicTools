# Tasks: Spectrum Analyzer

- [ ] T1: Add smoothing slider
  - Add `smoothing: number` state (default 0.8)
  - Add `useEffect` to sync `analyserRef.current.smoothingTimeConstant = smoothing`
  - Render slider: range 0–0.99, step 0.01, label shows current value
  - Verify: moving slider changes how quickly spectrum responds

- [ ] T2: Verify OrbitControls in 3D mode
  - Confirm `OrbitControls` is imported from `@react-three/drei`
  - Confirm it's inside the Canvas in 3D mode
  - Add "Drag to orbit · Scroll to zoom" instruction text below canvas in 3D mode
  - Verify: mouse drag rotates 3D view

- [ ] T3: Add freeze button
  - Add `frozen: boolean` state and `frozenRef` ref
  - In animation loop: skip `getByteFrequencyData` call when `frozenRef.current === true`
  - Add toggle button: label "⏸ Freeze" / "▶ Unfreeze"
  - Frozen state: button border changes to highlight color
  - Verify: freeze holds last frame; unfreeze resumes

- [ ] T4: Add band energy readout
  - Implement `getBandEnergy(dataArray, sampleRate, fftSize, minHz, maxHz): number`
  - Add `bandEnergies: Record<string, number>` state
  - Update band energies in animation loop (skip when frozen)
  - Render 7 band labels with dB values below visualizer
  - Verify: values update in real time and freeze when frozen
