# Spec 7 Requirements: Oscilloscope — Keyboard Input + Extended Range

## Overview
Extend frequency range, add note buttons, add keyboard input, and add octave controls.

## Functional Requirements

### FR-1: Extended Frequency Range
- Current range: 20–2000 Hz
- New range: 20–8000 Hz
- Covers full piano range (A0=27.5 Hz to C8=4186 Hz) plus upper harmonics
- Knob mapping: logarithmic scale (not linear)

### FR-2: Note Buttons (C2–C7)
- Add a row of clickable note buttons spanning C2 to C7 (6 octaves)
- Each button shows the note name (C2, D2, E2, ... C7)
- Clicking sets the oscillator frequency to that note's exact frequency
- Buttons are styled as small piano-key-like tiles
- Current note highlighted if frequency matches exactly

### FR-3: Keyboard Input (A–L = C4–B4, Z/X = octave shift)
- Keys A–L map to C4–B4 (one octave, 8 white keys: C D E F G A B + C)
  - A=C4, S=D4, D=E4, F=F4, G=G4, H=A4, J=B4, K=C5
- Z key: shift octave down (all key mappings shift down one octave)
- X key: shift octave up
- Key press: sets frequency + triggers note on
- Key release: triggers note off (or sustain for 0.5s)
- Only active when the oscilloscope panel is focused

### FR-4: Octave Display + Buttons
- Show current octave number prominently (e.g. "Octave 4")
- Add "−" and "+" buttons to shift octave down/up
- Octave range: 1–7
- Octave display updates when Z/X keys are pressed

## Non-Functional Requirements
- Keyboard listener: `keydown`/`keyup` on `window` with focus guard
- Frequency calculation: `440 * 2^((midi - 69) / 12)`
- No new dependencies
