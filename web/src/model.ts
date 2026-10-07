// Browser-only numerical model. No wallet or RPC dependencies.
export const SCALE = 1_000_000;
export const UNIFORM = Array<number>(8).fill(SCALE / 8);
export const BASELINE = Object.freeze({ noise: 25, feedback: 25 });
export function apportion(weights: bigint[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0n);
  if (total <= 0n) throw Error("Weights must have positive mass.");
  const numerators = weights.map((x) => x * BigInt(SCALE));
  const result = numerators.map((x) => Number(x / total));
  const order = numerators
    .map((x, i) => ({ i, remainder: x % total }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.i - b.i
        : a.remainder > b.remainder
          ? -1
          : 1,
    );
  const missing = SCALE - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < missing; i++) result[order[i].i]++;
  return result;
}
function sqrt(n: bigint): bigint {
  if (n === 0n) return 0n;
  let x = n,
    next = (n + 1n) / 2n;
  while (next < x) {
    x = next;
    next = (n / next + next) / 2n;
  }
  return x;
}
export function transition(
  p: number[],
  counts: number[],
  noise = 25,
  feedback = 25,
): number[] {
  if (
    p.length !== 8 ||
    counts.length !== 8 ||
    p.some((x) => !Number.isSafeInteger(x) || x < 0) ||
    counts.some((x) => !Number.isSafeInteger(x) || x < 0) ||
    p.reduce((a, b) => a + b, 0) !== SCALE ||
    counts.reduce((a, b) => a + b, 0) > 1024 ||
    [noise, feedback].some((x) => !Number.isInteger(x) || x < 0 || x > 100)
  )
    throw Error(
      "Use eight nonnegative integer states, mass 1,000,000, at most 1,024 observations and 0–100% parameters.",
    );
  const amplitudes = p.map((x) => sqrt(BigInt(x) * BigInt(SCALE)));
  // Explicit signed matrix, independent of the Solidity butterfly implementation.
  const squared = p.map((_, i) => {
    const b = amplitudes.reduce((sum, a, j) => {
      const bits = (i & j).toString(2).replaceAll("0", "").length;
      return sum + (bits % 2 ? -a : a);
    }, 0n);
    return b * b;
  });
  const coherent = apportion(squared);
  const mixed = apportion(
    coherent.map(
      (x) => BigInt(100 - noise) * BigInt(x) + BigInt((noise * SCALE) / 8),
    ),
  );
  const n = counts.reduce((a, b) => a + b, 0);
  return n === 0
    ? mixed
    : apportion(
        mixed.map(
          (x, i) =>
            BigInt(100 - feedback) * BigInt(x) * BigInt(n) +
            BigInt(feedback) * BigInt(counts[i]) * BigInt(SCALE),
        ),
      );
}
export function experiment(
  p: number[],
  counts: number[],
  noise: number,
  feedback: number,
  steps: number,
) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 12)
    throw Error("Choose 1–12 steps.");
  let baseline = [...p],
    candidate = [...p];
  for (let i = 0; i < steps; i++) {
    baseline = transition(baseline, counts);
    candidate = transition(candidate, counts, noise, feedback);
  }
  return {
    baseline,
    candidate,
    distance:
      baseline.reduce((sum, x, i) => sum + Math.abs(x - candidate[i]), 0) /
      (2 * SCALE),
  };
}
