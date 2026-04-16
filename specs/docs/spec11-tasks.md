# Spec 11 Tasks: Chord Progression Analyzer

## T1: Chord Parser
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Implement `parseChord(raw)` returning `ParsedChord` with root, quality, extensions, valid flag
- Handle: major, minor, dominant 7th, major 7th, minor 7th, diminished, half-diminished, augmented
- Support shorthand: `m`, `M7`, `°`, `ø`, `dim`, `aug`
- Invalid chords: `valid: false`, shown with red styling

## T2: Key Detection Algorithm
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Implement `detectKey(chords)` returning `{ root, mode }`
- Score each of 24 keys (12 major + 12 minor) by diatonic chord count
- Display detected key above the chord cards
- Add manual key override dropdown (12 roots × 2 modes)

## T3: Roman Numeral + Function Analysis
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Implement `getRomanNumeral(chordRoot, keyRoot, mode)`
- Implement `getFunction(roman)` returning T/S/D
- Detect secondary dominants (V/V, V/ii, etc.)
- Detect modal interchange (chords from parallel minor/major)
- Display below each chord card

## T4: Voice Leading D3 Chart
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Compute SATB voicings for each chord (4-part close voicing)
- Use D3 line generator with CatmullRom curve
- 4 colored lines (S/A/T/B)
- SVG chart 400×150px

## T5: Substitution Engine
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Implement `getSubs(chord, keyRoot)` returning substitution strings
- Tritone sub for dominant 7ths
- Relative major/minor subs
- Modal interchange suggestions
- Collapsible panel per chord (click to expand)

## T6: Audio Playback
**File**: `src/tools/ProgressionAnalyzer/ProgressionAnalyzer.tsx`
- Add Tone.js PolySynth for playback
- "Play" button plays each chord for 1 bar at 80 BPM
- Stop button cancels playback
- Highlight current chord during playback

## T7: Route Registration
- Route already registered in App.tsx — verify it works

## Acceptance Criteria
- [ ] Text input parses chord symbols correctly
- [ ] Key auto-detected and displayed
- [ ] Roman numerals and T/S/D labels shown
- [ ] Voice leading chart renders
- [ ] Substitutions shown per chord
- [ ] Play button plays the progression
