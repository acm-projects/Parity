export function sector(a0: number, a1: number, ro = 18.5, ri = 12.5, rc = 1.0, cx = 21, cy = 21): string {
  const pt = (r: number, t: number): [number, number] => [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  const dOut = Math.sqrt((ro - rc) ** 2 - rc ** 2);
  const dIn = Math.sqrt((ri + rc) ** 2 - rc ** 2);
  const aOut = Math.asin(rc / (ro - rc));
  const aIn = Math.asin(rc / (ri + rc));
  if (a1 - aOut <= a0 + aOut) return ''; // slice too thin to round: draw nothing
  const P = [
    pt(dIn, a0), pt(dOut, a0), pt(ro, a0 + aOut), pt(ro, a1 - aOut),
    pt(dOut, a1), pt(dIn, a1), pt(ri, a1 - aIn), pt(ri, a0 + aIn),
  ];
  const big = (a1 - aOut) - (a0 + aOut) > Math.PI ? 1 : 0;
  const bigIn = (a1 - aIn) - (a0 + aIn) > Math.PI ? 1 : 0;
  const f = (p: [number, number]) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
  return `M${f(P[0])} L${f(P[1])} A${rc} ${rc} 0 0 1 ${f(P[2])} A${ro} ${ro} 0 ${big} 1 ${f(P[3])} ` +
         `A${rc} ${rc} 0 0 1 ${f(P[4])} L${f(P[5])} A${rc} ${rc} 0 0 1 ${f(P[6])} ` +
         `A${ri} ${ri} 0 ${bigIn} 0 ${f(P[7])} A${rc} ${rc} 0 0 1 ${f(P[0])} Z`;
}

/** Paths for the filled slices (values are percentages) plus the unfilled remainder. */
export function donutPaths(values: number[], remainder: number, gap = 0.058) {
  const ang = (pct: number) => (pct / 100) * 2 * Math.PI;
  let c = 0;
  const slices = values.map((v) => {
    const d = sector(ang(c) + gap / 2, ang(c + v) - gap / 2);
    c += v;
    return d;
  });
  const rest = remainder > 0 ? sector(ang(c) + gap / 2, ang(c + remainder) - gap / 2) : '';
  return { slices, rest };
}