# Spec 1 Tasks: Circle of Fifths — Chord Ring Fix + Mode Teaching

## T1: Fix Chord Ring (Critical Bug)
**File**: `src/tools/CircleOfFifths/CircleOfFifths.tsx`
- Remove the broken mapping of `diatonic[i]` over 12 slices
- Add `getDiatonicChords(rootIdx, mode)` function returning exactly 7 `ChordInfo` objects
- Render 7 chord cards in a horizontal flex row below the wheel
- Each card shows: Roman numeral, chord symbol, quality badge (maj/min/dim)

## T2: Add Mode Selector
**File**: `src/tools/CircleOfFifths/CircleOfFifths.tsx`
- Add `const [selectedMode, setSelectedMode] = useState('Ionian')`
- Render 7 pill buttons (Ionian–Locrian) in a horizontal bar
- On mode change: recompute diatonic chords + update wheel highlight
- Show mode character description in center info panel
- Highlight wheel segments: in-mode = full opacity, out-of-mode = 0.3 opacity

## T3: Click-to-Play Diatonic Chords
**File**: `src/tools/CircleOfFifths/CircleOfFifths.tsx`
- Add `onClick` to each chord card
- On click: compute MIDI notes for the chord (root + third + fifth, optionally 7th)
- Call `synth.triggerAttackRelease(freqs, '2n')`
- Add 200ms CSS highlight animation on the clicked card

## T4: Fix Minor Key Click
**File**: `src/tools/CircleOfFifths/CircleOfFifths.tsx`
- Find the inner ring click handler
- Replace major triad intervals `[0,4,7]` with minor triad `[0,3,7]` for minor key segments
- Verify: clicking "Am" plays A-C-E, not A-C#-E

## Acceptance Criteria
- [ ] No `undefined` chord labels in the chord display
- [ ] Exactly 7 chord cards shown for any selected key
- [ ] Mode selector changes chord qualities and wheel opacity
- [ ] Clicking any chord card plays audio
- [ ] Clicking a minor key segment plays a minor chord
