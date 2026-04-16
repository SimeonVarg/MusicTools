# Requirements: Progression Analyzer

## New Tool (from all-specs.md SPEC 11)

Users paste a chord progression (e.g., "Dm7 G7 Cmaj7") and receive:
- Roman numeral analysis in detected key
- Functional harmony labels (T/S/D)
- Voice leading graph
- Substitution suggestions
- Audio playback

## Acceptance Criteria

### AC-1: Chord Parser
- Input field accepts chord symbols separated by spaces or commas
- Supported qualities: maj, min, m, 7, maj7, m7, dim, aug, sus2, sus4, m7b5, dim7
- Parser returns `{ root: string, quality: string }` for each chord
- Invalid tokens are skipped with a warning indicator

### AC-2: Key Detection
- Algorithm finds the key where the most chords are diatonic
- Detected key is displayed prominently
- If ambiguous (tie), the key with the most common chords wins

### AC-3: Roman Numeral Analysis
- Each chord is labeled with its Roman numeral in the detected key
- Functional labels: T (tonic: I, iii, vi), S (subdominant: ii, IV), D (dominant: V, vii°)
- Non-diatonic chords are labeled with chromatic Roman numerals (e.g., ♭VII)

### AC-4: Voice Leading Graph
- A D3 line chart shows SATB voice motion across the progression
- X-axis: chord index; Y-axis: MIDI pitch
- Each voice (S/A/T/B) is a separate colored line

### AC-5: Audio Playback
- A "Play" button plays the progression using Tone.js PolySynth
- Each chord plays for 1 beat at 80 BPM
- Playback stops when the button is clicked again

### AC-6: Substitution Suggestions
- For each dominant chord (V7), suggest tritone substitution (bII7)
- For each minor chord, suggest relative major substitution
- Suggestions are shown in a collapsible panel

## Correctness Properties
- "Dm7 G7 Cmaj7" → key C, analysis: ii7 V7 Imaj7
- "Am F C G" → key C, analysis: vi IV I V
- Tritone sub of G7 in C = Db7
