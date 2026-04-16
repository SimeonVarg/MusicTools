# Tasks: Drum Machine

- [ ] T1: Fix Euclidean input to use onChange + debounce
  - Find Euclidean input element (currently uses onBlur)
  - Add `euclideanDebounce` ref
  - Replace `onBlur` with `onChange={e => handleEuclideanChange(i, +e.target.value)}`
  - Implement debounce (250ms) before dispatching `APPLY_EUCLIDEAN`
  - Verify: changing value immediately updates pattern without clicking away

- [ ] T2: Verify preset buttons are rendered and functional
  - Confirm `PRESETS` record exists with all 6 presets
  - Confirm `LOAD_PRESET` action is handled in reducer
  - Confirm preset buttons are rendered in UI
  - Verify: clicking "4-on-floor" loads kick on beats 1,5,9,13

- [ ] T3: Add ring labels to SVG
  - In the circular SVG display, for each track ring:
    - Compute label position at top of ring (angle = -π/2, radius = ringR + 12)
    - Add `<text>` element with `track.name`
  - Verify: instrument names visible on SVG rings

- [ ] T4: Visualize swing by offsetting even step dots
  - Implement `stepAngle(stepIdx, stepCount, swing)` function
  - Apply to dot position calculation in SVG ring renderer
  - At swing=0: dots evenly spaced; at swing=100: even dots shifted
  - Verify: moving swing slider visually shifts even-numbered dots
