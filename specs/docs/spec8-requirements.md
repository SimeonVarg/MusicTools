# Spec 8 Requirements: Spectrum Analyzer — Smoothing Control + 3D Orbit

## Overview
Add user-controlled smoothing, OrbitControls for 3D mode, freeze/snapshot, and numeric band readout.

## Functional Requirements

### FR-1: Smoothing Slider
- Add a slider to control `analyser.smoothingTimeConstant` (0.0–0.99, step 0.01)
- Default: 0.8 (current hardcoded value)
- Label: "Smoothing: X.XX"
- Slider updates the analyser node in real-time

### FR-2: OrbitControls for 3D Mode
- In 3D spectrogram mode, add `OrbitControls` from `@react-three/drei`
- User can rotate, pan, and zoom the 3D view with mouse
- Add a small text hint: "Drag to rotate · Scroll to zoom"
- OrbitControls only active in 3D mode

### FR-3: Freeze/Snapshot
- Add a "Freeze" toggle button
- When frozen: animation loop pauses, last frame remains visible
- When unfrozen: animation resumes
- Button label: "❄ Freeze" / "▶ Resume"
- Frozen state indicated by a blue border on the visualizer

### FR-4: Numeric Band Energy Readout
- Below the visualizer, show a row of 7 frequency band energy values
- Bands: Sub-bass, Bass, Low-mid, Mid, High-mid, Presence, Brilliance
- Each band shows: name + dB value (e.g. "Bass: -12 dB")
- Values update in real-time (not frozen by freeze mode)
- Color-coded: green (quiet) → yellow → red (loud)

## Non-Functional Requirements
- `@react-three/drei` is already installed
- Smoothing slider uses existing `analyserRef`
- Freeze uses a `frozenRef` boolean to skip `requestAnimationFrame` updates
- Band readout computed from FFT data in the animation loop
