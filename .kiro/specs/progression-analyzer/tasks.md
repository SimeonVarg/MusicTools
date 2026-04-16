# Tasks: Progression Analyzer

- [ ] T1: Implement chord parser
  - Write `parseChord(token: string): ParsedChord | null`
  - Support: maj, m, 7, maj7, m7, dim, aug, sus2, sus4, m7b5, dim7
  - Wire to text input onChange
  - Verify: "Dm7 G7 Cmaj7" parses to 3 chords

- [ ] T2: Implement key detection
  - Write `detectKey(chords: ParsedChord[]): number` (returns pitch class 0–11)
  - Score each key by count of diatonic chord roots
  - Verify: [Dm7, G7, Cmaj7] → key C (pitch class 0)

- [ ] T3: Roman numeral + function analysis
  - Write `analyzeChord(chord, keyPc): AnalyzedChord`
  - Map scale degree to Roman numeral and T/S/D function
  - Render analysis table: chord | Roman | Function
  - Verify: G7 in C → "V7" / "D"

- [ ] T4: D3 voice leading graph
  - useEffect with D3 line chart (SVG)
  - X: chord index, Y: MIDI pitch of root/3rd/5th/7th
  - 4 colored lines for SATB voices
  - Verify: graph renders with correct voice positions

- [ ] T5: Substitution suggestions panel
  - Write `getSubs(chord, keyPc): string[]`
  - Tritone sub for dominant chords; relative major for minor chords
  - Render collapsible panel per chord
  - Verify: G7 in C suggests "Db7 (tritone sub)"

- [ ] T6: Audio playback
  - PolySynth plays each chord for '2n' in sequence
  - Play/Stop button using Tone.Transport
  - Verify: progression plays in order at correct tempo

- [ ] T7: Route already registered in App.tsx — verify `/progression-analyzer` loads
