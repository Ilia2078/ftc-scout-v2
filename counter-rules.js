/** Scouting counter invariant: 0 <= hits <= artifacts <= 1000.
 * Each added hit also counts as an artifact attempt.
 * Removing a hit never removes the attempt.
 */
export function adjustCounters(artifacts, hits, target, delta) {
  const clamp = value => Math.max(0, Math.min(1000, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0));
  let attempts = clamp(artifacts);
  let successes = clamp(hits);
  attempts = Math.max(attempts, successes);
  if (!['artifacts', 'hits'].includes(target) || ![-1, 1].includes(delta)) {
    throw new Error('Invalid counter operation');
  }
  if (target === 'hits') {
    if (delta === 1 && attempts < 1000 && successes < 1000) {
      attempts++;
      successes++;
    } else if (delta === -1 && successes > 0) {
      successes--;
    }
  } else {
    if (delta === 1 && attempts < 1000) attempts++;
    if (delta === -1 && attempts > successes) attempts--;
  }
  return {artifacts: attempts, hits: successes};
}
