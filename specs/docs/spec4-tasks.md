# Spec 4 Tasks: Drum Machine — Euclidean UX + Presets + Swing Viz

## T1: Fix Euclidean Input UX
**File**: `src/tools/DrumMachine/DrumMachine.tsx`
- Add `euclidDebounceRef = useRef<ReturnType<typeof setTimeout>>()`
- Create `handleEuclidChange(trackIdx, field, value)` with 300ms debounce
- Replace all `onBlur` handlers on Euclidean inputs with `onChange` calling `handleEuclidChange`
- Clamp input values to valid range (pulses ≤ steps, steps 3–16)

## T2: Add Pattern Presets
**File**: `src/tools/DrumMachine/DrumMachine.tsx`
- Define `PRESETS` constant with 6 preset objects (4-on-floor, backbeat, bossa nova, shuffle, breakbeat, empty)
- Add `applyPreset(name)` function that sets all track patterns from the preset
- Render 6 preset buttons in a horizontal row above the sequencer
- Shuffle preset also sets swing to 60%

## T3: Add Ring Labels to SVG
**File**: `src/tools/DrumMachine/DrumMachine.tsx`
- In the SVG ring render loop, add a `<text>` element for each ring
- Position: left of the ring (9 o'clock), `x = cx - ringRadius - 8`
- Text: instrument name (Kick, Snare, Hi-Hat, Clap, Tom, Cowbell)
- Color: matching track color, font-size 10

## T4: Visualize Swing on SVG Dots
**File**: `src/tools/DrumMachine/DrumMachine.tsx`
- In the dot position calculation, add swing offset for even-indexed steps
- `swingOffset = (swing/100) * (2π/steps) * 0.5` for odd-index steps (even beats)
- Apply offset to the angle calculation for dot placement
- Swing = 0% → no offset (existing behavior preserved)

## Acceptance Criteria
- [ ] Euclidean pattern updates while typing (not on blur)
- [ ] 6 preset buttons load correct patterns
- [ ] Instrument names visible on SVG rings
- [ ] Even-beat dots shift clockwise when swing > 0%
