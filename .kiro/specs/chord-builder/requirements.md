# Requirements: Chord Builder

## Bug References (from all-specs.md SPEC 2)
- No audio preview when clicking individual chord cards
- Tension score is a static lookup — no contextual awareness
- No voice leading analysis between adjacent chords
- No common tone highlighting between chords

## Acceptance Criteria

### AC-1: Click-to-Play
- Clicking any chord card triggers audio playback via Tone.js PolySynth
- Notes played are root + third + fifth (+ seventh if present)
- Audio starts on click, not on hover

### AC-2: Contextual Tension
- Tension score incorporates: interval from key root + distance from previous chord
- Score updates when the selected key changes
- Score updates when the preceding chord in the progression changes

### AC-3: Voice Leading Arrows
- When two adjacent chords are selected, semitone motion arrows are shown
- Arrows indicate direction (up/down) and distance (semitones) for each voice
- Smooth voice leading (≤2 semitones per voice) is visually distinguished from leaps

### AC-4: Common Tone Highlighting
- Notes shared between adjacent chords are highlighted in the mini keyboard display
- Common tones are shown in a distinct color (e.g., gold/yellow)
- Non-common tones are shown in their default colors

## Correctness Properties
- Common tones between Cmaj7 and Am7: {E, G} (pitch classes 4 and 7)
- Voice leading from G7 to Cmaj7: B→C (semitone up), F→E (semitone down)
- Tension of V7 chord in key > tension of I chord in key
