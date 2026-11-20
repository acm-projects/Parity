import { useEffect, useState } from 'react';

// chrome.storage exists inside the extension; plain localStorage is the fallback for `npm run dev`.
const area = typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = area
          ? (await area.get(key))[key]
          : JSON.parse(localStorage.getItem(key) ?? 'null');
        if (alive && saved !== undefined && saved !== null) setValue(saved as T);
      } catch { /* first run or storage blocked: keep the default */ }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (area) area.set({ [key]: value });
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* best effort */ }
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}
