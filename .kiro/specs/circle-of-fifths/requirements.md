# Requirements: Circle of Fifths

## Bug References (from all-specs.md SPEC 1)
- CRITICAL: Chord ring maps 7 diatonic chords to 12 slices — indices 7-11 are undefined
- Minor key click plays major chord (KEY_NOTES are all major triads)
- No mode/scale teaching panel
- No audio playback for individual diatonic chords

## Acceptance Criteria

### AC-1: Chord Ring Correctness
- The chord ring displays exactly 7 diatonic chord cards (I through vii°), not 12
- Each card shows the correct degree label (I, ii, iii, IV, V, vi, vii°)
- No undefined chord slots appear in the UI
- Chords are generated from `getDiatonicChords(rootIdx, mode)` using `MODE_INTERVALS`

### AC-2: Minor Key Audio
- Clicking an inner-ring (minor key) slice plays a minor triad [root, root+3, root+7]
- The `MINOR_KEY_NOTES` map is used, not `KEY_NOTES`

### AC-3: Mode Selector
- A mode selector (Ionian through Locrian) is visible above the wheel
- Selecting a mode dims wheel slices not in that mode to 0.3 opacity
- The center panel shows the mode's degree pattern and characteristic note

### AC-4: Diatonic Chord Audio
- Each of the 7 diatonic chord cards is clickable
- Clicking a card plays the chord via PolySynth (root + third + fifth)
- A brief visual flash confirms the click

## Correctness Properties
- `getDiatonicChords(rootIdx, mode).length === 7` for all valid inputs
- For Ionian mode on C: chords are C, Dm, Em, F, G, Am, B°
- Minor key click interval pattern is always [0, 3, 7] semitones
- Mode intervals sum check: `MODE_INTERVALS[mode].length === 7` for all 7-note modes
