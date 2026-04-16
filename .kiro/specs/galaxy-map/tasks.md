# Tasks: Galaxy Map

- [ ] T1: Reduce MDS iterations from 80 to 40
  - Find `computeMDS` call in useMemo
  - Change iterations argument from 80 to 40
  - Verify: layout still converges visually (no significant difference)

- [ ] T2: Verify scale descriptions are shown in info panel
  - Confirm `description` field exists on all SCALES entries (already present)
  - Confirm info panel renders `selectedScale.description`
  - Verify: clicking a scale node shows its description text

- [ ] T3: Add similarity threshold slider
  - Add `threshold: number` state (default 0.6)
  - Add slider to controls bar: range 0.3–0.9, step 0.05
  - Replace hardcoded `0.6` in connection-line filter with `threshold`
  - Verify: moving slider adds/removes connection lines

- [ ] T4: Add compare mode (shift-click)
  - Add `compareScale: ScaleData | null` state
  - Modify node click handler: if `e.shiftKey`, set compareScale
  - Compute `sharedNotes` and `differentNotes` between selected and compareScale
  - Render shared notes green, different notes red in note display
  - Add "Clear Compare" button
  - Verify: shift-clicking two scales shows shared/different notes
