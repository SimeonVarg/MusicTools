# Spec 1 Requirements: Circle of Fifths — Chord Ring Fix + Mode Teaching

## Overview
Fix critical bugs in the Circle of Fifths tool and add mode/scale teaching capabilities.

## Functional Requirements

### FR-1: Chord Ring Fix (Critical Bug)
- The diatonic chord ring currently maps 7 chords to 12 slices, causing `undefined` at indices 7–11
- The chord ring MUST display exactly 7 diatonic chords for the selected key
- Chords must be shown in a dedicated inner display panel, NOT mapped 1:1 to the 12 chromatic slices
- Each chord slot must show: Roman numeral (I–VII), chord symbol (e.g. Cmaj7), and quality label

### FR-2: Mode Selector
- Add a mode selector with all 7 diatonic modes: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
- Selecting a mode highlights the rotated interval pattern on the wheel (which notes are in the mode)
- Mode name and characteristic interval (e.g. "Lydian: ♯4") displayed in the center info panel
- Mode selector persists with the selected root key

### FR-3: Click-to-Play Diatonic Chords
- Each diatonic chord card in the jazz theory panel must be clickable
- Clicking plays the chord via Tone.js PolySynth (all chord tones simultaneously)
- Visual feedback: card briefly highlights on click
- Chord voicing: root position triad or 7th chord depending on chord quality

### FR-4: Minor Key Click Plays Correct Chord
- Clicking an inner ring segment (minor key) must play a minor chord, not a major chord
- Root note derived from the minor key name (e.g. "Am" → A minor triad)
- Fix: use correct minor triad intervals [0, 3, 7] for minor keys

## Non-Functional Requirements
- No new dependencies
- All audio via existing Tone.js PolySynth
- Mode highlighting uses CSS color changes only (no new SVG elements required)
- Chord ring panel must not break existing wheel layout
