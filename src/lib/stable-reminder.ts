/** Deterministic fraction in [0,1) from a string seed (FNV-1a style). */
export function unitFromSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Hours in [minH, maxH] derived from seed — stable across refreshes. */
export function reminderHoursFromSeed(
  seed: string,
  minH = 4,
  maxH = 8
): number {
  return minH + unitFromSeed(seed) * (maxH - minH);
}
