# Spec 15 Requirements: Harmonic Series Visualizer (New Tool)

## Overview
An interactive 3D visualization of the harmonic series with clickable harmonics, waveform display, and teaching content.

## Functional Requirements

### FR-1: 3D Scene with Harmonic Nodes
- R3F 3D scene with 16 spheres representing harmonics 1–16
- Sphere height proportional to frequency (harmonic n = n × fundamental)
- Sphere size: inversely proportional to harmonic number (lower harmonics = larger)
- Sphere color: hue based on harmonic number (rainbow spectrum)
- Spheres orbit around a central axis at different radii

### FR-2: Click to Toggle Harmonics
- Clicking a sphere toggles it on/off
- Active harmonics: bright, glowing
- Inactive harmonics: dim, gray
- Tone.js oscillator for each active harmonic at `fundamental * n` Hz
- Fundamental frequency: adjustable slider (55–440 Hz, default 110 Hz)

### FR-3: Combined Waveform Canvas
- 2D canvas below the 3D scene
- Shows the combined waveform of all active harmonics
- Updates in real-time as harmonics are toggled
- X-axis: one period; Y-axis: amplitude
- Color: gradient matching the active harmonic colors

### FR-4: Teaching Panel
- For each harmonic n, show:
  - Harmonic number (n)
  - Frequency (fundamental × n Hz)
  - Interval from fundamental (e.g. "Octave", "Perfect 5th + octave")
  - Musical significance
- Panel updates when a harmonic is selected/hovered

### FR-5: Timbre Presets
- Preset buttons that activate specific harmonic combinations:
  - **Sine**: only harmonic 1
  - **Square**: odd harmonics (1,3,5,7,9...)
  - **Sawtooth**: all harmonics (1–16)
  - **Triangle**: odd harmonics with 1/n² amplitude
  - **Clarinet**: odd harmonics (1,3,5) with specific amplitudes
  - **Brass**: all harmonics with rising then falling envelope

## Non-Functional Requirements
- Single file: `src/tools/HarmonicSeries/HarmonicSeries.tsx`
- Route already registered at `/harmonic-series`
- R3F + @react-three/drei already installed
- Tone.js for audio synthesis
