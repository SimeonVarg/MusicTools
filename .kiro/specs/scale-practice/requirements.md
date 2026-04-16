# Requirements: Scale Practice

## New Tool (from all-specs.md SPEC 13)

Interactive tool that:
- Shows a scale on a keyboard visualization
- Plays the scale ascending/descending
- Quizzes on scale degrees
- Shows interval pattern (W-W-H-W-W-W-H)

## Acceptance Criteria

### AC-1: Scale Data
- At minimum: all 7 modes, major/minor pentatonic, blues, melodic minor, harmonic minor
- Each scale has: name, intervals (semitones), step pattern (W/H notation)
- Scale selector dropdown or button group is visible

### AC-2: Keyboard Visualization
- A 2-octave piano keyboard shows scale notes highlighted
- Scale notes are highlighted in a distinct color (e.g., purple/teal)
- Non-scale notes are shown in default white/black
- Root note is highlighted differently (e.g., brighter/gold)

### AC-3: Interval Pattern Display
- The W/H step pattern is shown below the keyboard (e.g., "W W H W W W H")
- Each step is clickable and plays the interval
- The pattern updates when the scale changes

### AC-4: Quiz Mode
- Quiz asks: "What is degree N of [Scale] in [Key]?"
- User selects from 4 multiple-choice note names
- Correct/incorrect feedback is immediate
- Score and accuracy are tracked per scale

### AC-5: Audio Playback
- "Play Ascending" button plays scale notes from root to octave
- "Play Descending" button plays from octave back to root
- Notes play at 120 BPM with a short gap between

## Correctness Properties
- D Dorian scale degrees: D E F G A B C D
- C Major step pattern: W W H W W W H
- Blues scale (C): C Eb F F# G Bb C
- Harmonic minor raised 7th creates augmented 2nd between ♭6 and ♮7
