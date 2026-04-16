# Spec 2 Tasks: Chord Builder — Voice Leading + Click-to-Play + Dynamic Tension

## T1: Add Click-to-Play on ChordCard
**File**: `src/tools/ChordBuilder/ChordBuilder.tsx`
- Add `onClick` handler to each chord card div
- On click: call `synth.triggerAttackRelease(voicingFreqs, '2n')`
- Add 200ms glow animation via inline style state (`isPlaying` boolean per card)
- Ensure click doesn't trigger drag-and-drop (use `e.stopPropagation()` if needed)

## T2: Implement Contextual Tension
**File**: `src/tools/ChordBuilder/ChordBuilder.tsx`
- Add `computeTension(chord, prevChord, keyRoot)` function (see design doc)
- Replace static tension lookup with this function
- Pass `prevChord` from the progression array (index - 1)
- Render tension as a colored bar at the bottom of each chord card
- Color: `hsl((1-tension)*120, 80%, 50%)` — green to red

## T3: Add Voice Leading Arrows
**File**: `src/tools/ChordBuilder/ChordBuilder.tsx`
- Add `getVoiceLeading(voicingA, voicingB)` function
- Between each pair of adjacent chord cards, render a small SVG with 4 arrows
- Arrow direction: ↑ (up), ↓ (down), — (same)
- Arrow color: green ≤2 semitones, yellow 3–4, red ≥5
- SVG size: 24×60px, positioned between cards

## T4: Highlight Common Tones in Mini Keyboard
**File**: `src/tools/ChordBuilder/ChordBuilder.tsx`
- Add `getCommonTones(voicingA, voicingB)` function returning `Set<number>` of pitch classes
- In the mini keyboard canvas render, check each key's pitch class against `commonTones`
- Common tone keys: bright purple fill
- Non-common keys: existing dim fill

## Acceptance Criteria
- [ ] Clicking any chord card plays audio
- [ ] Tension bar color changes based on context (not static)
- [ ] Voice leading arrows appear between adjacent chords
- [ ] Common tones highlighted in mini keyboard
- [ ] No regression in drag-and-drop, playback, or export
