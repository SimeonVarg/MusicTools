# Tasks: Chord Builder

- [ ] T1: Add click-to-play on chord cards
  - Read ChordBuilder.tsx to find ChordCard component
  - Add `onClick={() => playChord(chord.notes)}` to each card
  - Implement `playChord(notes: string[])` using existing PolySynth ref
  - Verify: clicking a card plays audio

- [ ] T2: Compute contextual tension score
  - Add `prevChord` tracking in state (last chord in progression)
  - Implement `contextualTension(chord, keyRoot, prevChord)` function
  - Replace static tension lookup with contextual score
  - Verify: V7 chord scores higher tension than I chord

- [ ] T3: Voice leading arrows between adjacent chords
  - Implement `computeVoiceLeading(from: string[], to: string[]): VoiceLeadingArrow[]`
  - Render SVG arrows between two selected adjacent chord mini-keyboards
  - Color: green for smooth motion (≤2 semitones), orange for leaps
  - Verify: G7→Cmaj7 shows B→C (up 1) and F→E (down 1)

- [ ] T4: Common tone highlighting in mini keyboard
  - Implement `commonTones(a: string[], b: string[]): Set<number>` (pitch classes)
  - In mini keyboard render: keys in common tone set → gold fill `#ffd700`
  - Verify: Cmaj7 and Am7 share E and G (highlighted gold)
