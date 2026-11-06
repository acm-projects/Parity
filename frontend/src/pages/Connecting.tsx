import { useRef } from 'react';
import type { CSSProperties } from 'react';
import Screen from '../components/Screen';
import { useFrame } from '../hooks/useFrame';
import { clamp, ease, wave } from '../lib/anim';
import p from '../assets/p.png';
import star from '../assets/star.png';

const SPARK = 'M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z';
const T0 = 0.4, T1 = 2.8;          // the spiral runs from T0 to T1 seconds
const CX = 150.2, CY = 224.4;      // centre of the P's star inside the scene
const CYCLE = 4.8;                 // loop length
const FINISH = 0.4;                // seconds for the bar to fill once the data is in
const DESIGN = '#8F72F0', CODE = '#F0B25E';

const TWINKLES = [[92, 52, '#B7A3F5'], [250, 110, CODE], [44, 372, CODE], [262, 350, '#B7A3F5'], [196, 436, '#B7A3F5'], [70, 150, '#B7A3F5']] as const;
const SHOOTERS = [[232, 10, 84, CODE], [204, 2, 64, DESIGN], [276, 74, 56, '#5A32C6']] as const; // left, top, length, colour
const ORBITS = [DESIGN, CODE];

type El = HTMLElement | SVGElement;
type RefFn = (el: El | null) => void;

function Sparkle({ color, size, setRef, style }: { color: string; size: number; setRef?: RefFn; style?: CSSProperties }) {
  return (
    <svg ref={setRef} viewBox="0 0 24 24" width={size} height={size} style={style} aria-hidden="true">
      <path d={SPARK} fill={color} />
    </svg>
  );
}

interface Props { ready: boolean; onDone: () => void; onCancel: () => void }

export default function Connecting({ ready, onDone, onCancel }: Props) {
  const els = useRef<Record<string, El | null>>({});
  const finished = useRef(false);
  const doneAt = useRef<{ t: number; from: number } | null>(null);
  const progress = useRef(0);
  const ref = (id: string): RefFn => (el) => { els.current[id] = el; };

  useFrame((t) => {
    const g = (id: string) => els.current[id] as HTMLElement | null; // only .style is used
    const u = t % CYCLE;
    const fadeIn = clamp(u / 0.35);
    const fadeOut = u > 4.2 ? clamp(1 - (u - 4.2) / 0.5) : 1;
    const fin = u >= T1;
    const bump = fin && u - T1 < 0.7 ? Math.sin((Math.PI * (u - T1)) / 0.7) : 0;

    // the two sparks and their tails
    const posAt = (uu: number, phase: number): [number, number, number] => {
      const pr = ease(clamp((uu - T0) / (T1 - T0)));
      const R = 100 * (1 - pr);
      const th = phase + 1.6 * uu + 5 * pr;
      return [CX + R * Math.cos(th), CY + 0.5 * R * Math.sin(th), Math.sin(th)];
    };
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 8; k++) {
        const e = g(`o${j}_${k}`);
        if (!e) continue;
        const [x, y, depth] = posAt(u - k * 0.05, j * Math.PI);
        const size = k === 0 ? 16 : Math.max(2, 6 * (1 - k / 8));
        e.style.left = (x - size / 2).toFixed(1) + 'px';
        e.style.top = (y - size / 2).toFixed(1) + 'px';
        if (k > 0) { e.style.width = size.toFixed(1) + 'px'; e.style.height = size.toFixed(1) + 'px'; }
        e.style.opacity = ((k === 0 ? 1 : 0.6 * (1 - k / 8)) * fadeIn * fadeOut * (fin ? 0 : 1)).toFixed(2);
        e.style.zIndex = String(depth > 0 ? 4 : 1);
      }
    }

    // star flash and ripple
    const st = g('lst');
    if (st) {
      st.style.transform = `scale(${(1 + 0.14 * wave(3.2, 0, u) + 0.6 * bump).toFixed(3)})`;
      st.style.opacity = (0.85 + 0.15 * wave(3.2, 0, u) + 0.15 * bump).toFixed(2);
    }
    const rip = g('lrip');
    if (rip) {
      const q = u - T1;
      if (q > 0 && q < 1) {
        const R = 10 + 70 * q;
        rip.style.left = CX - R + 'px'; rip.style.top = CY - R + 'px';
        rip.style.width = 2 * R + 'px'; rip.style.height = 2 * R + 'px';
        rip.style.opacity = (0.5 * (1 - q) * fadeOut).toFixed(2);
      } else rip.style.opacity = '0';
    }

    // the calm scene around it
    const lp = g('lp'); if (lp) lp.style.transform = `translateY(${(-4 * wave(6, 0, u)).toFixed(1)}px)`;
    const glow = g('lglow'); if (glow) glow.style.opacity = (0.55 + 0.25 * wave(4, 0, u) + 0.3 * bump).toFixed(2);
    const w = wave(7, 0, u);
    const moon = g('lmoon'); if (moon) moon.style.transform = `translateY(${(-2 * w).toFixed(1)}px) rotate(${(-3 + 6 * w).toFixed(1)}deg)`;
    const mg = g('lmg'); if (mg) mg.style.opacity = (0.4 + 0.3 * w).toFixed(2);
    TWINKLES.forEach((_, i) => {
      const e = g('lt' + i); if (!e) return;
      const v = wave(4.5, (i + 1) * 1.3, u);
      e.style.opacity = (0.25 + 0.65 * v).toFixed(2);
      e.style.transform = `scale(${(0.8 + 0.25 * v).toFixed(2)})`;
    });
    SHOOTERS.forEach((_, i) => {
      const e = g('ls' + i); if (!e) return;
      const P = 3.8, ph = ((((u - i * 1.3) % P) + P) % P) / P, pp = Math.min(ph / 0.24, 1);
      let o = 0;
      if (ph < 0.03) o = (ph / 0.03) * 0.85;
      else if (ph < 0.15) o = 0.85;
      else if (ph < 0.24) o = 0.85 * (1 - (ph - 0.15) / 0.09);
      const d = Math.pow(pp, 1.4);
      e.style.transform = `translate(${(-175 * d).toFixed(1)}px,${(89 * d).toFixed(1)}px)`;
      e.style.opacity = o.toFixed(2);
    });

    // progress bar: eases toward 90% while loading, then fills up and leaves
    let prog: number;
    if (!ready) {
      prog = 0.9 * (1 - Math.exp(-t / 2.5));
    } else {
      if (!doneAt.current) doneAt.current = { t, from: progress.current };
      const k = ease(clamp((t - doneAt.current.t) / FINISH));
      prog = doneAt.current.from + (1 - doneAt.current.from) * k;
      if (k >= 1 && !finished.current) { finished.current = true; onDone(); }
    }
    progress.current = prog;
    const bar = g('bar'); if (bar) bar.style.width = (prog * 100).toFixed(1) + '%';
    const pb = g('pb'); if (pb) pb.setAttribute('aria-valuenow', String(Math.round(prog * 100)));
  });

  return (
    <Screen>
      <div className="relative mx-auto my-auto -translate-y-8 h-[496px] w-[312px] flex-none overflow-hidden" aria-hidden="true">        <div ref={ref('lglow')} className="absolute rounded-full" style={{ left: 46, top: 120, width: 220, height: 220, background: 'radial-gradient(circle, rgba(124,92,255,.38) 0%, rgba(124,92,255,0) 68%)' }} />
        <div ref={ref('lmg')} className="absolute rounded-full" style={{ left: 12, top: 22, width: 60, height: 60, background: 'radial-gradient(circle, rgba(240,178,94,.55) 0%, rgba(240,178,94,0) 70%)' }} />
        <svg ref={ref('lmoon')} viewBox="0 0 24 24" width="36" height="36" className="absolute" style={{ left: 24, top: 34 }}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill={CODE} />
        </svg>

        {TWINKLES.map(([x, y, c], i) => (
          <Sparkle key={i} color={c} size={12} setRef={ref('lt' + i)} style={{ position: 'absolute', left: x, top: y }} />
        ))}

        {SHOOTERS.map(([x, y, len, c], i) => (
          <div key={i} ref={ref('ls' + i)} className="absolute opacity-0" style={{ left: x, top: y }}>
            <div className="relative h-0.5" style={{ width: len, transform: 'rotate(-27deg)', transformOrigin: 'left center' }}>
              <div className="absolute left-0 top-0 h-0.5 rounded-sm" style={{ width: len, background: `linear-gradient(270deg, rgba(255,255,255,0), ${c})` }} />
              <div className="absolute rounded-full" style={{ left: -2, top: -1.5, width: 5, height: 5, background: c, boxShadow: `0 0 6px 1px ${c}` }} />
            </div>
          </div>
        ))}

        <div ref={ref('lrip')} className="absolute box-border rounded-full opacity-0" style={{ border: '1.5px solid #8F72F0', zIndex: 0 }} />

        <div ref={ref('lp')} className="absolute" style={{ left: 96, top: 168, width: 120, height: 124, zIndex: 2 }}>
          <img src={p} alt="" className="absolute left-0 top-0 block h-[124px] w-[120px]" />
          <img ref={ref('lst')} src={star} alt="" className="absolute left-0 top-0 block h-[124px] w-[120px]" style={{ transformOrigin: '54.2px 56.4px' }} />
        </div>

        {ORBITS.map((c, j) => (
          <div key={j}>
            {[7, 6, 5, 4, 3, 2, 1].map((k) => (
              <div key={k} ref={ref(`o${j}_${k}`)} className="absolute left-0 top-0 rounded-full opacity-0" style={{ background: c }} />
            ))}
            <Sparkle color={c} size={16} setRef={ref(`o${j}_0`)} style={{ position: 'absolute', left: 0, top: 0, opacity: 0, filter: `drop-shadow(0 0 4px ${c})` }} />
          </div>
        ))}
      </div>

      {/* loading bar */}
      <div className="mx-auto mb-4 w-full max-w-[220px]">
        <div
          ref={ref('pb')}
          role="progressbar"
          aria-label="Loading your Figma file"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="h-1.5 overflow-hidden rounded-full bg-[var(--track)]"
        >
          <div
            ref={ref('bar')}
            className="h-full rounded-full"
            style={{ width: '0%', background: `linear-gradient(90deg, ${DESIGN}, ${CODE})` }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--muted)]">Loading your Figma file…</p>
      </div>

      <button type="button" onClick={onCancel} className="py-0.5 text-center text-xs font-bold text-[var(--p1)]">Cancel</button>
    </Screen>
  );
}