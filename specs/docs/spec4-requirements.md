# Spec 4 Requirements: Drum Machine — Euclidean UX + Presets + Swing Viz

## Overview
Fix Euclidean rhythm input UX, add pattern presets, add ring labels, and visualize swing.

## Functional Requirements

### FR-1: Euclidean Input — Immediate onChange
- Current: Euclidean inputs use `onBlur` — user must click away to apply
- Fix: Replace `onBlur` with `onChange` + 300ms debounce
- Pattern updates immediately as user types (with debounce to avoid excessive recomputation)
- Input validation: clamp values to valid range on change

### FR-2: Pattern Presets
- Add 6 preset buttons: 4-on-floor, Backbeat, Bossa Nova, Shuffle, Breakbeat, Empty
- Preset definitions (steps per track, active steps):
  - **4-on-floor**: Kick on beats 1,5,9,13 of 16; Hi-hat every 2 steps
  - **Backbeat**: Kick 1,9; Snare 5,13 of 16
  - **Bossa Nova**: Kick E(3,8); Snare E(2,8); Hi-hat E(5,8)
  - **Shuffle**: Kick E(2,8); Hi-hat E(5,8) with swing 60%
  - **Breakbeat**: Kick E(3,16); Snare E(2,16); Hi-hat E(7,16)
  - **Empty**: All tracks cleared
- Clicking a preset replaces all track patterns

### FR-3: Ring Labels on SVG
- Add instrument name labels near each ring on the circular SVG display
- Label position: outside the ring, at the 9 o'clock position (left side)
- Font: 10px, color matching the ring's track color
- Labels: Kick, Snare, Hi-Hat, Clap, Tom, Cowbell (per track)

### FR-4: Swing Visualization
- When swing > 0%, offset even-numbered active dots slightly clockwise on the SVG
- Offset amount: proportional to swing percentage (max ~5° at 100% swing)
- Visual cue: even dots appear slightly "late" relative to the grid

## Non-Functional Requirements
- Debounce: 300ms using `useRef` timer (no lodash)
- Presets are pure data constants, no async
- Ring labels are SVG `<text>` elements
- Swing offset is a pure CSS/SVG transform
