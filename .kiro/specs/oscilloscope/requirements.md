# Requirements: Oscilloscope

## Bug References (from all-specs.md SPEC 7)
- No keyboard/MIDI input — frequency only settable via knob drag
- Frequency range 20-2000 Hz too limited (piano goes to 4186 Hz)
- No note name buttons for quick frequency selection
- Canvas doesn't resize responsively

## Acceptance Criteria

### AC-1: Extended Frequency Range
- Frequency knob range is 20–8000 Hz (up from 20–2000 Hz)
- Logarithmic mapping is used for the knob (not linear)
- The displayed frequency label updates correctly across the full range

### AC-2: Note Buttons
- A row of clickable note buttons covers C2–C7 (white keys only)
- Clicking a note button sets the oscillator frequency to that note's exact frequency
- The active note button is visually highlighted

### AC-3: Keyboard Input
- Keys A–L on the keyboard map to C4–B4 (one octave, 7 white keys)
- Z shifts the active octave down by 1; X shifts it up by 1
- The current octave is displayed numerically
- Keyboard input only fires when the oscilloscope panel has focus (not globally)

### AC-4: Octave Controls
- +/- buttons increment/decrement the active octave
- Octave range: 1–7
- Changing octave updates the keyboard mapping immediately

## Correctness Properties
- A4 = 440 Hz exactly
- C4 = 261.63 Hz (middle C)
- Key 'A' → C4, 'S' → D4, 'D' → E4, 'F' → F4, 'G' → G4, 'H' → A4, 'J' → B4
- freqToKnob(knobToFreq(k)) ≈ k for all k in [0,1]
