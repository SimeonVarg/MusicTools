# Spec 11 Requirements: Chord Progression Analyzer (New Tool)

## Overview
A tool where users input a chord progression as text and receive harmonic analysis, voice leading visualization, substitution suggestions, and audio playback.

## Functional Requirements

### FR-1: Chord Parser
- Text input field accepting chord symbols (e.g. "Dm7 G7 Cmaj7 Am7")
- Parser handles: root note, quality (maj, min, dim, aug, dom), extensions (7, 9, 11, 13), alterations (b5, #5, b9, #9, #11, b13)
- Supports common shorthand: `m` = minor, `M7` = major 7th, `°` = diminished, `ø` = half-diminished
- Invalid chords shown with red underline, valid chords shown as parsed cards

### FR-2: Key Detection
- Auto-detect the key from the chord content
- Algorithm: find the key where the most chords are diatonic
- Display detected key: "Key: C major" or "Key: A minor"
- Allow manual key override via dropdown

### FR-3: Roman Numeral + Function Analysis
- For each chord, show: Roman numeral (I, ii, iii, IV, V, vi, vii°)
- Functional label: T (Tonic), S (Subdominant/Pre-dominant), D (Dominant)
- Secondary dominants labeled: V/V, V/ii, etc.
- Modal interchange chords labeled: ♭VII, ♭III, iv, etc.

### FR-4: Voice Leading Visualization
- D3 line chart showing SATB voice motion across the progression
- X-axis: chord positions; Y-axis: MIDI pitch
- 4 colored lines (S=blue, A=green, T=orange, B=red)
- Smooth voice leading = gradual slopes; leaps = steep slopes

### FR-5: Substitution Suggestions
- For each chord, suggest common substitutions:
  - Tritone sub for dominant 7th chords
  - Relative major/minor substitution
  - Modal interchange alternatives
- Shown as a collapsible panel per chord

### FR-6: Audio Playback
- "Play" button plays the progression with Tone.js
- Each chord plays for 1 bar (configurable tempo)
- Piano-like synth sound

## Non-Functional Requirements
- Single file: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Route already registered in App.tsx at `/progression-analyzer`
- No new dependencies beyond existing stack
