# Tasks: Harmonic Series Visualizer

- [ ] T1: 3D scene with harmonic nodes
  - R3F Canvas with 16 spheres at Y = n * 0.6
  - Colors from HARMONIC_COLORS array (warm→cool)
  - OrbitControls for camera navigation
  - Verify: 16 spheres visible, stacked vertically

- [ ] T2: Click to toggle harmonics + audio
  - `active: Set<number>` state tracking active harmonics
  - On sphere click: toggle harmonic n in active set
  - Start/stop Tone.Oscillator at `fundamental * n` for each toggle
  - Active spheres: emissive glow + pulse animation
  - Verify: clicking sphere 3 plays 3× fundamental frequency

- [ ] T3: Combined waveform canvas
  - 2D canvas below 3D scene
  - `drawWaveform(canvas, activeSet)`: sum of sin(n*t)/n for active n
  - Redraw on every active set change
  - Verify: adding harmonics changes waveform shape

- [ ] T4: Teaching panel
  - List of 16 rows: "Harmonic N — [interval name] — [freq] Hz"
  - Active harmonics highlighted
  - Verify: harmonic 2 shows "Octave", harmonic 3 shows "P5 + 8va"

- [ ] T5: Timbre presets
  - Buttons: Sine, Sawtooth, Square, Custom
  - Each sets `active` to the appropriate harmonic set
  - Verify: Square activates only odd harmonics (1,3,5,7,9,11,13,15)

- [ ] T6: Route already registered in App.tsx — verify `/harmonic-series` loads
