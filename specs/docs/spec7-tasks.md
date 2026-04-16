# Spec 7 Tasks: Oscilloscope — Keyboard Input + Extended Range

## T1: Extend Frequency Range to 20–8000 Hz
**File**: `src/tools/Oscilloscope/Oscilloscope.tsx`
- Change `FREQ_MAX` from 2000 to 8000
- Update knob mapping to use logarithmic scale: `knobToFreq` and `freqToKnob`
- Verify frequency display still shows correct Hz value

## T2: Add Note Buttons (C2–C7)
**File**: `src/tools/Oscilloscope/Oscilloscope.tsx`
- Generate `NOTE_BUTTONS` array for C2–C7 (42 notes)
- Render as a scrollable flex-wrap row of small buttons
- Clicking a button sets the oscillator frequency
- Active button (matching current frequency) highlighted in purple

## T3: Add Keyboard Input (A–L, Z/X)
**File**: `src/tools/Oscilloscope/Oscilloscope.tsx`
- Add `const [octave, setOctave] = useState(4)`
- Add `KEY_MAP` constant mapping A–K to semitone offsets
- Add `useEffect` with `keydown` listener on `window`
- Z = octave down, X = octave up, A–K = play note in current octave
- Clean up listener on unmount

## T4: Add Octave Display + ±Buttons
**File**: `src/tools/Oscilloscope/Oscilloscope.tsx`
- Render "Octave N" label with − and + buttons
- Buttons call `setOctave` with clamping (1–7)
- Z/X keys also update octave display
- Position: near the frequency display

## Acceptance Criteria
- [ ] Frequency knob goes up to 8000 Hz
- [ ] Note buttons C2–C7 set frequency correctly
- [ ] A–K keys play notes in current octave
- [ ] Z/X keys shift octave and update display
- [ ] Octave ± buttons work
