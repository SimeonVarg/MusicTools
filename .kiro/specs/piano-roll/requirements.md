# Requirements: Piano Roll

## Status: ALREADY FIXED (No-Op)

The Piano Roll was improved in a prior session. No further changes are required.

## Previously Implemented Features
- Black key rendering on the keyboard sidebar
- Snap-to-grid for note placement
- Selection box (rubber-band selection)
- Note drag and resize

## Acceptance Criteria (Verification Only)

### AC-1: Black Keys Visible
- The keyboard sidebar shows both white and black keys
- Black keys are rendered at the correct positions (C#, D#, F#, G#, A#)

### AC-2: Snap Grid
- Notes snap to the configured grid division when placed or moved
- Grid lines are visible on the roll canvas

### AC-3: Selection Box
- Click-drag on empty canvas area draws a selection rectangle
- Notes within the rectangle are selected on mouse-up

## Tasks
- T1: No changes required — verify existing implementation is correct
