# Tasks: Ear Training

- [ ] T1: Remove canvas-confetti
  - Delete `import confetti from 'canvas-confetti'`
  - Remove all `confetti(...)` call sites
  - Inject `@keyframes pulse` via `<style>` tag in useEffect
  - Replace confetti trigger with `animation: 'pulse 0.4s ease-out'` on streak element
  - Verify: no confetti import, streak still shows visual feedback

- [ ] T2: Add adaptive question weighting
  - Implement `getWeight(key: string, stats: StatsMap): number`
    - acc < 0.5 → weight 4; acc < 0.7 → weight 2; else → weight 1; unseen → weight 2
  - Implement `weightedRandom<T>(items: T[], weights: number[]): T`
  - Replace `randomItem(pool)` in `generateQuestion()` with `weightedRandom(pool, weights)`
  - Verify: after several wrong answers on m2, m2 appears more frequently

- [ ] T3: Add "Play Root" button for interval mode
  - Add button below question prompt, only visible when `mode === 'interval'`
  - `onClick`: call `synth.triggerAttackRelease(currentQuestion.rootNote, '4n')`
  - Verify: button plays root note, not the interval

- [ ] T4: Track per-item accuracy
  - Confirm `stats: StatsMap` already in state (it is)
  - Ensure stats update on every answer: `stats[item].correct++` or `stats[item].total++`
  - In stats panel: items with accuracy < 50% shown with red indicator
  - Verify: stats panel shows per-interval accuracy percentages
