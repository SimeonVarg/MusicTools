# Requirements: Ambient Engine

## Bug References (from all-specs.md SPEC 5)
- INCONSISTENCY: Only tool using Tailwind classes — all others use inline styles
- Markov chain state not visible to user
- No visual feedback for currently playing scale degree

## Acceptance Criteria

### AC-1: No Tailwind Classes
- Zero `className` attributes containing Tailwind utility classes in AmbientEngine.tsx
- All styling uses React inline `style` objects
- Visual appearance is preserved after conversion

### AC-2: Markov State Display
- A "Now Playing" indicator shows the current Markov state (scale degree index 0–6)
- The indicator updates in real time as the melody advances
- The scale degree name (e.g., "Tonic", "Supertonic") is shown alongside the index

### AC-3: Scale Degree Highlight Strip
- A horizontal strip of 7 (or 5 for pentatonic) cells represents scale degrees
- The currently playing degree cell is highlighted
- Recent notes leave a fading trail (last 3–4 notes shown at reduced opacity)

## Correctness Properties
- After conversion, no string in any `className` prop matches `/[a-z]+-[0-9]+/` (Tailwind pattern)
- Markov state index is always in range [0, scaleLength-1]
- Scale degree strip cell count equals the current scale's interval count
