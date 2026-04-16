# Spec 2 Requirements: Chord Builder — Voice Leading + Click-to-Play + Dynamic Tension

## Overview
Enhance the Chord Builder with audio preview, contextual tension scoring, voice leading visualization, and common tone highlighting.

## Functional Requirements

### FR-1: Click-to-Play Chord Cards
- Every ChordCard in the progression must be clickable to hear the chord
- Clicking plays all chord tones simultaneously via Tone.js PolySynth
- Voicing used: the chord's current voicing (drop-2, rootless, shell, or root position)
- Visual feedback: card border briefly glows on click (200ms)
- Must not interfere with drag-and-drop reordering

### FR-2: Contextual Tension Score
- Current tension is a static lookup table — replace with dynamic computation
- Contextual tension factors:
  1. **Interval from key root**: tritone = high tension, perfect 5th = low tension
  2. **Distance from previous chord**: large root motion = higher tension
  3. **Chord quality**: altered/diminished = higher tension, major = lower
- Tension score: 0.0 (resolved) to 1.0 (maximum tension)
- Display as a colored bar on each chord card (blue=low, orange=medium, red=high)

### FR-3: Voice Leading Arrows
- Between adjacent chord cards, show semitone motion for each voice
- Voices: bass, tenor, alto, soprano (bottom 4 notes of voicing)
- Arrow direction: up (↑), down (↓), or dash (—) for same note
- Arrow color: green = smooth (≤2 semitones), yellow = moderate (3–4), red = leap (≥5)
- Arrows appear between cards in the progression row

### FR-4: Common Tone Highlighting
- In the mini keyboard diagram on each chord card, highlight notes that are ALSO in the adjacent chord
- Common tones: filled circle (bright color)
- Non-common tones: outline circle (dim color)
- Compare with both previous and next chord

## Non-Functional Requirements
- No new dependencies
- Tension computation is pure JS (no async)
- Voice leading arrows are SVG elements between cards
- Common tone comparison is computed on render, not stored in state
