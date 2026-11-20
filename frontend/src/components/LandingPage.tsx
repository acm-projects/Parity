import { useRef } from 'react';
import Screen from './Screen';
import GithubIcon from './GithubIcon';
import PillButton from './PillButton';
import { useFrame } from '../hooks/useFrame';
import { wave, ease, clamp } from '../lib/anim';
import p from '../assets/p.png';
import star from '../assets/star.png';
import wordmark from '../assets/wordmark.png';

const SPARK = 'M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z';
// left, top, length, colour, start delay (seconds)
const SHOOTERS = [[262, 6, 84, '#F0B25E', 0], [236, 2, 64, '#8F72F0', 2.6], [290, 56, 56, '#5A32C6', 5.1]] as const;
// left, top, colour, phase offset
const TWINKLES = [[78, 26, '#B7A3F5', 0], [40, 100, '#F0B25E', 1.7], [246, 92, '#B7A3F5', 3.1]] as const;
// big background sparkles: class name, size
const SKY = [['s1', 34], ['s2', 18], ['s3', 24], ['s4', 14]] as const;

// Sync loop: the ghost logo drifts in, locks into place, then fades out
const SYNC = 5; // seconds per cycle

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function LandingPage({ onGithub, busy = false, error = '' }: { onGithub: () => void; busy?: boolean; error?: string }) {
  const els = useRef<Record<string, HTMLElement | SVGElement | null>>({});
  const ref = (id: string) => (el: HTMLElement | SVGElement | null) => { els.current[id] = el; };

 useFrame((t) => {
    if (reduceMotion()) return;

    const put = (id: string, transform?: string, opacity?: number) => {
      const e = els.current[id] as HTMLElement | null;
      if (!e) return;
      if (transform !== undefined) e.style.transform = transform;
      if (opacity !== undefined) e.style.opacity = opacity.toFixed(2);
    };

    // crescent moon sway
    const w = wave(7, 0, t);
    put('moon', `translateY(${(-2 * w).toFixed(1)}px) rotate(${(-3 + 6 * w).toFixed(1)}deg)`);

    SHOOTERS.forEach(([, , , , delay], i) => {
      const P = 7.5;
      const ph = ((((t - delay) % P) + P) % P) / P;
      const run = Math.min(ph / 0.22, 1);
      let o = 0;
      if (ph < 0.03) o = (ph / 0.03) * 0.85;
      else if (ph < 0.14) o = 0.85;
      else if (ph < 0.22) o = 0.85 * (1 - (ph - 0.14) / 0.08);
      const d = Math.pow(run, 1.4);
      put('sh' + i, `translate(${(-175 * d).toFixed(1)}px,${(89 * d).toFixed(1)}px)`, o);
    });
    TWINKLES.forEach(([, , , off], i) => {
      const v = wave(4.5, off, t);
      put('tw' + i, `scale(${(0.8 + 0.25 * v).toFixed(2)})`, 0.25 + 0.65 * v);
    });
    SKY.forEach((_, i) => {
      const v = wave(3.2, i * 0.8, t);
      put('sky' + i, `scale(${(0.75 + 0.25 * v).toFixed(2)})`, 0.35 + 0.65 * v);
    });

    // rings glow and the check dots pop every few seconds
    const ph = (t % SYNC) / SYNC;
    const hit = (center: number, width: number) => clamp(1 - Math.abs(ph - center) / width);
    put('halo', undefined, ease(hit(0.54, 0.12)));
  });

  return (
    <Screen>
      {/* full-panel gradient + sparkles */}
      <div className="parity-hero-bg" aria-hidden="true">
        {SKY.map(([cls, size], i) => (
          <svg key={cls} ref={ref('sky' + i)} className={cls} viewBox="0 0 24 24" width={size} height={size}>
            <path d={SPARK} />
          </svg>
        ))}
      </div>

      <div className="parity-hero">
        {/* moon with the logo inside */}
        <div className="parity-moon-wrap">
          <div ref={ref('halo')} className="parity-moon-halo" aria-hidden="true" style={{ opacity: 0 }} />
          <div className="parity-moon force-light">
            <div className="parity-logo-fit">
              <div className="relative h-40" aria-hidden="true">
                <svg ref={ref('moon')} viewBox="0 0 24 24" width="38" height="38" className="absolute" style={{ left: 23, top: 21 }}>
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="#F0B25E" />
                </svg>
                {TWINKLES.map(([x, y, c], i) => (
                  <svg key={i} ref={ref('tw' + i)} viewBox="0 0 24 24" width="12" height="12" className="absolute" style={{ left: x, top: y }}>
                    <path d={SPARK} fill={c} />
                  </svg>
                ))}
                {SHOOTERS.map(([x, y, len, c], i) => (
                  <div key={i} ref={ref('sh' + i)} className="absolute opacity-0" style={{ left: x, top: y }}>
                    <div className="relative h-0.5" style={{ width: len, transform: 'rotate(-27deg)', transformOrigin: 'left center' }}>
                      <div className="absolute left-0 top-0 h-0.5 rounded-sm" style={{ width: len, background: `linear-gradient(270deg, rgba(255,255,255,0), ${c})` }} />
                      <div className="absolute rounded-full" style={{ left: -2, top: -1.5, width: 5, height: 5, background: c, boxShadow: `0 0 6px 1px ${c}` }} />
                    </div>
                  </div>
                ))}
              </div>


              {/* real logo */}
              <div className="absolute left-1/2 top-[38px] -ml-[54px] h-28 w-[108px]" ref={ref('logo')} style={{ transformOrigin: '54px 108px' }} aria-hidden="true">
                <img src={p} alt="" className="absolute left-0 top-0 block h-28 w-[108px]" />
                <img ref={ref('star')} src={star} alt="" className="absolute left-0 top-0 block h-28 w-[108px]" style={{ transformOrigin: '48.8px 50.7px' }} />
              </div>
              <img src={wordmark} alt="Parity" className="absolute left-1/2 top-[156px] block h-11 w-auto -translate-x-1/2" />
            </div>
          </div>
        </div>

        <div className="parity-hero-copy">
          <div className="flex flex-col gap-2">
            <h1 className="parity-hero-title">Design and build, in sync.</h1>
            <p className="parity-hero-sub">Sign in to compare your site with your Figma file.</p>
          </div>

          <PillButton
            onClick={onGithub}
            disabled={busy}
            className="flex h-14 w-full max-w-[360px] items-center justify-center gap-3 px-6 text-base font-bold shadow-[0_12px_28px_rgba(90,50,198,.35)] disabled:cursor-wait disabled:opacity-70"
          >
            <GithubIcon size={22} />{busy ? 'Opening GitHub…' : 'Continue with GitHub'}
          </PillButton>
          {error && <p role="alert" className="m-0 max-w-[360px] text-center text-xs font-semibold text-[var(--err)]">{error}</p>}

        </div>
      </div>
    </Screen>
  );
}