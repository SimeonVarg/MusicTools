# Spec 5 Requirements: Ambient Engine — Convert Tailwind to Inline Styles

## Overview
Convert all Tailwind CSS classes to inline styles for consistency with the rest of the project, add a now-playing Markov state indicator, and add a scale degree highlight strip.

## Functional Requirements

### FR-1: Convert Tailwind to Inline Styles
- AmbientEngine.tsx is the only tool using Tailwind `className` attributes
- ALL Tailwind classes must be replaced with equivalent inline `style` objects
- No Tailwind classes should remain in the component after this change
- Visual appearance must be identical before and after conversion

### FR-2: Now-Playing Markov State Indicator
- Show which scale degree the Markov chain is currently on
- Display: a labeled indicator showing "Current: Degree N" (e.g. "Current: V")
- Updates in real-time as the melody generator advances
- Roman numeral display (I, II, III, IV, V, VI, VII)

### FR-3: Scale Degree Highlight Strip
- A horizontal strip of 7 boxes (one per scale degree)
- Each box shows the scale degree Roman numeral
- The currently playing degree is highlighted (bright purple)
- Recently played degrees fade out over ~2 seconds
- Strip positioned below the waveform display

## Non-Functional Requirements
- No new dependencies
- Inline styles must match the dark theme of other tools
- Markov state is read from existing state variable (not new state)
- Scale degree strip uses CSS transitions for fade effect
