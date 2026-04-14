# Piano Roll Improvements Spec

**Date:** 2026-04-14
**Component:** `src/tools/PianoRoll/PianoRoll.tsx`
**Status:** Draft

---

## Overview

Three issues in the Piano Roll need to be addressed:

1. The Select tool does not draw a rubber-band selection box when dragging on empty space
2. The quantization buttons (`Q: 1/4 | 1/8 | 1/16 | 1/32`) are unclear in purpose, especially since notes are already placed by dragging
3. Black keys on the piano keyboard are rendered at the same width as white keys, unlike a real piano

---

## Issue 1: Select Tool — Missing Rubber-Band Selection Box

### Current Behavior

When the Select tool is active and the user clicks on empty space, the selection is cleared. If the user clicks and drags on empty space, nothing happens — no visual rectangle is drawn and no notes are selected.

Relevant code in `onRollMouseDown`:

```tsx
if (tool === 'select') {
  if (hit) {
    // ... select/move/resize the hit note
  } else {
    setSelectedIds(new Set()); // just clears — no marquee
  }
  return;
}
```

There is no state tracking for a selection rectangle, no rendering of a selection box in `drawRoll`, and no logic to determine which notes fall within a dragged region.

### Root Cause

The marquee (rubber-band) selection feature was never implemented. The select tool only supports clicking individual notes and shift-clicking to add to selection.

### Proposed Fix

#### 1. Add selection box state

Add a ref to track the selection box coordinates during drag:

```tsx
const selBoxRef = useRef<{
  startBeat: number;
  startPitch: number;
  endBeat: number;
  endPitch: number;
} | null>(null);
```

#### 2. Track drag in `onRollMouseDown`

When the select tool is active and no note is hit, begin tracking a selection box:

```tsx
} else {
  if (!e.shiftKey) setSelectedIds(new Set());
  selBoxRef.current = {
    startBeat: beat,
    startPitch: pitch,
    endBeat: beat,
    endPitch: pitch,
  };
  dragRef.current = { type: 'select-box', startX: e.clientX, startY: e.clientY };
}
```

Add `'select-box'` to the `dragRef.type` union.

#### 3. Update box in `onRollMouseMove`

When `dragRef.current.type === 'select-box'`, update `selBoxRef.current.endBeat` and `selBoxRef.current.endPitch` from the current mouse position, then trigger a re-render.

#### 4. Render the box in `drawRoll`

After drawing notes and before the playhead, if `selBoxRef.current` is non-null, draw a semi-transparent rectangle:

```tsx
// Selection box
if (selBox) {
  const x1 = selBox.startBeat * beatW - scrollX;
  const x2 = selBox.endBeat * beatW - scrollX;
  const y1 = (TOTAL_KEYS - 1 - selBox.startPitch) * KEY_H - scrollY;
  const y2 = (TOTAL_KEYS - 1 - selBox.endPitch) * KEY_H - scrollY;
  const rx = Math.min(x1, x2);
  const ry = Math.min(y1, y2);
  const rw = Math.abs(x2 - x1);
  const rh = Math.abs(y2 - y1);

  ctx.fillStyle = 'rgba(100, 150, 255, 0.15)';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);
}
```

#### 5. Resolve selection in `onRollMouseUp`

On mouse up, compute which notes fall within the selection box bounds and add them to `selectedIds`. Clear `selBoxRef.current`.

```tsx
if (dragRef.current?.type === 'select-box' && selBoxRef.current) {
  const box = selBoxRef.current;
  const minBeat = Math.min(box.startBeat, box.endBeat);
  const maxBeat = Math.max(box.startBeat, box.endBeat);
  const minPitch = Math.min(box.startPitch, box.endPitch);
  const maxPitch = Math.max(box.startPitch, box.endPitch);

  const ids = notes
    .filter(n =>
      n.startBeat + n.durationBeats > minBeat &&
      n.startBeat < maxBeat &&
      n.pitch >= minPitch &&
      n.pitch <= maxPitch
    )
    .map(n => n.id);

  setSelectedIds(prev =>
    e.shiftKey ? new Set([...prev, ...ids]) : new Set(ids)
  );
  selBoxRef.current = null;
}
```

### Acceptance Criteria

- [ ] Clicking empty space with Select tool and dragging draws a visible dashed rectangle
- [ ] Releasing the mouse selects all notes whose bounding boxes intersect the rectangle
- [ ] Shift+drag adds to the existing selection instead of replacing it
- [ ] Clicking empty space without dragging clears the selection (existing behavior preserved)
- [ ] The selection box disappears on mouse up

---

## Issue 2: Quantization Buttons — Unclear UX

### Current Behavior

The toolbar shows:

```
Q: [1/4] [1/8] [1/16] [1/32]
```

These buttons change the `quant` state, which controls:
- The snap grid for note placement (`quantize(beat, quant)`)
- The minimum note duration when drawing
- The snap resolution when moving/resizing notes

However, there is no visual indication of what "Q" means, no tooltip, and the grid lines in `drawRoll` do not change based on quantization — they always show beat and bar lines only. Since notes are placed by clicking and dragging (which already snaps), users have no way to understand what these buttons do or confirm they're working.

### Root Cause

The quantization feature is functional but has no visual feedback. The grid is hardcoded to show only beat/bar lines regardless of the quantization setting. The label "Q:" is cryptic.

### Proposed Fix

#### 1. Replace "Q:" with a descriptive label

Change the label from `Q:` to `Snap:` or `Grid:` for clarity:

```tsx
<span style={{ color: '#888', marginLeft: 8 }}>Snap:</span>
```

#### 2. Add tooltips to quantization buttons

Add a `title` attribute to each button:

```tsx
<button key={label} onClick={() => setQuant(val)}
  title={`Snap notes to ${label} note grid`}
  style={...}>
  {label}
</button>
```

#### 3. Draw quantization sub-grid lines in `drawRoll`

Add finer grid lines that reflect the current quantization setting. After the existing beat grid loop, draw sub-beat lines:

```tsx
// Quantization sub-grid
if (quant < 0.25) {
  const stepsPerBeat = 1 / quant;
  for (let b = firstBeat; b <= lastBeat; b++) {
    for (let s = 1; s < stepsPerBeat; s++) {
      const x = (b + s * quant) * beatW - scrollX;
      if (x < 0 || x > canvasW) continue;
      ctx.strokeStyle = '#262630';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
  }
}
```

This makes the grid visually denser when a finer quantization is selected, giving immediate feedback.

#### 4. Show the active quantization value in the status bar

Update the bottom status text to include the current snap value:

```tsx
<div style={{ padding: '4px 8px', fontSize: 10, color: '#555', background: '#12121a' }}>
  {notes.length} notes · snap: {quantLabel} · scroll: shift+wheel (X) / wheel (Y) · zoom: ctrl+wheel · alt+click = delete
</div>
```

Where `quantLabel` maps `quant` to its display string (e.g., `"1/16"`).

### Acceptance Criteria

- [ ] The label reads "Snap:" instead of "Q:"
- [ ] Each quantization button has a tooltip explaining its function
- [ ] Selecting 1/8, 1/16, or 1/32 draws visible sub-grid lines between the beat lines
- [ ] Selecting 1/4 shows no sub-grid (it matches the existing beat lines)
- [ ] The status bar at the bottom displays the current snap value
- [ ] Drawing notes still snaps correctly to the selected quantization (no regression)

---

## Issue 3: Black Keys — Same Width as White Keys

### Current Behavior

In `drawPianoKeys`, both black and white keys are drawn at the same width:

```tsx
ctx.fillRect(0, y, KEY_W - 1, KEY_H - 1); // same for both
```

This makes the keyboard look like a flat grid of alternating dark/light rows rather than a realistic piano keyboard. On a real piano, black keys are approximately 60% the length of white keys.

### Root Cause

The draw logic does not differentiate key width based on key type. Both branches use `KEY_W - 1` as the width.

### Proposed Fix

#### 1. Add a constant for black key width

```tsx
const BLACK_KEY_W = Math.round(KEY_W * 0.6); // ~29px
```

#### 2. Update `drawPianoKeys` to use different widths

```tsx
function drawPianoKeys(ctx: CanvasRenderingContext2D, scrollY: number) {
  const totalH = TOTAL_KEYS * KEY_H;
  ctx.clearRect(0, 0, KEY_W, totalH);

  // Draw white keys first (full width)
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const pitch = TOTAL_KEYS - 1 - i;
    const y = i * KEY_H - scrollY;
    if (y + KEY_H < 0 || y > ctx.canvas.height) continue;
    if (BLACK_KEYS.has(pitch % 12)) continue;

    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, y, KEY_W - 1, KEY_H - 1);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(0, y, KEY_W - 1, KEY_H - 1);

    if (pitch % 12 === 0) {
      ctx.fillStyle = '#333';
      ctx.font = '9px monospace';
      ctx.fillText(pitchToName(pitch), BLACK_KEY_W + 2, y + KEY_H - 3);
    }
  }

  // Draw black keys on top (shorter width)
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const pitch = TOTAL_KEYS - 1 - i;
    const y = i * KEY_H - scrollY;
    if (y + KEY_H < 0 || y > ctx.canvas.height) continue;
    if (!BLACK_KEYS.has(pitch % 12)) continue;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, y, BLACK_KEY_W, KEY_H - 1);
  }
}
```

#### 3. Update the roll background rows to match

Optionally, extend the visual distinction into the roll grid. The background rows for black keys could have a slightly different left-edge treatment, or a subtle marker at the black key boundary. This is optional but improves visual continuity.

### Acceptance Criteria

- [ ] Black keys render at ~60% the width of white keys
- [ ] White keys render at full `KEY_W` width with a visible border
- [ ] Black keys are drawn on top of white keys (correct z-order via draw order)
- [ ] The "C" octave labels are positioned to the right of the black key area so they remain visible
- [ ] Clicking on the exposed white key area (right of a black key) still triggers the correct pitch preview
- [ ] The visual result resembles a sideways piano keyboard

---

## Implementation Order

1. **Issue 3 (Black keys)** — Smallest change, purely visual, no state changes. Good warmup.
2. **Issue 2 (Quantization UX)** — Label rename + tooltip + sub-grid rendering. Low risk.
3. **Issue 1 (Selection box)** — Most complex: new state, new drag type, new rendering, new selection logic.

## Testing Notes

- All three fixes are isolated to `PianoRoll.tsx` — no other files are affected.
- Manual testing is sufficient: draw notes, switch tools, drag-select, change quantization, verify visual output.
- Verify no regressions in: note drawing, note moving/resizing, velocity editing, playback, export.
