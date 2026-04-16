# Tasks: Circle of Fifths

## Status: Already Implemented — Verification Only

- [x] T1: Chord ring shows 7 diatonic chord cards (not 12 slices)
  - Verify: `diatonicChords.map(...)` renders exactly 7 divs
  - Verify: `getDiatonicChords()` returns array of length 7

- [x] T2: Mode selector dims out-of-mode wheel slices
  - Verify: `inModeKeys` set computed from `MODE_INTERVALS[mode]`
  - Verify: slices not in set rendered with `opacity={0.3}`

- [x] T3: Diatonic chord cards are clickable and play audio
  - Verify: `handleDiatonicCardClick` calls `synth.triggerAttackRelease(chord.notes, '2n')`
  - Verify: visual flash on click (`glowIdx` state)

- [x] T4: Minor key clicks play minor triad
  - Verify: `handleMinorKeyClick` uses `MINOR_KEY_NOTES` (not `KEY_NOTES`)
  - Verify: `MINOR_KEY_NOTES.C = ['C4','Eb4','G4']` (minor triad [0,3,7])

## Verification Steps
1. Open `/circle-of-fifths`
2. Select key C — confirm 7 chord cards appear below wheel
3. Click each chord card — confirm audio plays
4. Click inner ring (Am) — confirm minor chord sounds (not major)
5. Switch mode to Dorian — confirm non-Dorian slices dim
