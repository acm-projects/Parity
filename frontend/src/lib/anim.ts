export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const ease = (x: number) => x * x * (3 - 2 * x);
/** Smooth 0 to 1 to 0 cycle with the given period in seconds. */
export const wave = (period: number, offset: number, t: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (t + offset)) / period);