import { useEffect, useRef } from 'react';

/** Calls cb(secondsSinceMount) on every animation frame while the component is mounted. */
export function useFrame(cb: (t: number) => void) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; });
  useEffect(() => {
    const t0 = performance.now();
    let id = requestAnimationFrame(function loop(now) {
      ref.current((now - t0) / 1000);
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, []);
}