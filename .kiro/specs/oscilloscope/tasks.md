# Tasks: Oscilloscope

- [ ] T1: Verify frequency range is 20–8000 Hz
  - Confirm `FREQ_MAX = 8000` in source (already set)
  - Confirm `freqToKnob`/`knobToFreq` use logarithmic mapping
  - Verify: knob can reach 8000 Hz

- [ ] T2: Verify note buttons C2–C7 are rendered
  - Confirm `NOTE_BUTTONS` array is defined and rendered
  - Confirm clicking a button sets oscillator frequency
  - Verify: clicking "A4" sets frequency to 440 Hz

- [ ] T3: Add keyboard input (A–L = C4–B4, Z/X = octave shift)
  - Add `octave: number` state (default 4)
  - Add `KEY_MAP` mapping A→0, S→2, D→4, F→5, G→7, H→9, J→11 semitones
  - Add `useEffect` with `keydown` listener
  - Z: decrement octave (min 1); X: increment octave (max 7)
  - Letter keys: compute MIDI from octave + semitone, set frequency
  - Verify: pressing 'H' plays A4 (440 Hz) when octave=4

- [ ] T4: Add octave display and +/- buttons
  - Render current octave number
  - Add − and + buttons to change octave
  - Verify: buttons change octave and keyboard mapping updates
