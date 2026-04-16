# Spec 13 Requirements: Scale Practice Mode (New Tool)

## Overview
An interactive tool for learning scales on a piano keyboard visualization with quizzes and audio playback.

## Functional Requirements

### FR-1: Scale Database
- Include all common scales: 7 diatonic modes, pentatonic major/minor, blues, melodic minor, harmonic minor, harmonic major, whole tone, diminished (whole-half and half-whole), augmented
- Each scale: name, intervals (semitones from root), description, characteristic notes
- Root note selectable (C–B)

### FR-2: Piano Keyboard Visualization
- 2-octave piano keyboard (C3–B4) with scale notes highlighted
- Scale notes: bright purple fill
- Non-scale notes: dark fill
- Root note: extra bright with "R" label
- Characteristic notes (e.g. ♯4 in Lydian): gold highlight

### FR-3: Interval Pattern Display
- Show the step pattern: W-W-H-W-W-W-H (for major)
- W = whole step (2 semitones), H = half step (1 semitone)
- For non-diatonic scales: show numeric intervals (1-2-1-2-1-2-2)
- Clickable steps: clicking a step plays that interval

### FR-4: Quiz Mode
- Question: "What is the [N]th degree of [Scale] in [Root]?"
- Answer: click the correct key on the keyboard
- Or: "What interval is between degree [N] and degree [N+1]?"
- Answer: W or H button
- Score tracking with streak

### FR-5: Audio Playback
- "Play Ascending" button: plays scale notes from root to octave
- "Play Descending" button: plays scale notes from octave to root
- "Play Random" button: plays scale notes in random order
- Tempo: 120 BPM (configurable)
- Each note highlighted as it plays

## Non-Functional Requirements
- Single file: `src/tools/ScalePractice/ScalePractice.tsx`
- Route already registered at `/scale-practice`
- No new dependencies
