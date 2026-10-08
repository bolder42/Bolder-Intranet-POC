import { useCallback, useEffect, useState } from 'react';

function readValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.).
  }
}

/**
 * Simple localStorage-backed state hook.
 *
 * The initial render uses the fallback so SSR and the first client render
 * agree (avoids hydration mismatches). After mount, the value syncs from
 * storage. The hook does not currently subscribe to the `storage` event,
 * so changes made in another tab will only appear on next mount.
 */
export function useLocalStorage<T>(key: string, fallback: T) {
  // Start with the fallback so SSR and the first client render agree
  // (avoids hydration mismatches). The post-mount effect below syncs from
  // storage so the persisted value still wins.
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(readValue(key, fallback));
  }, [key, fallback]);

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const updated = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        writeValue(key, updated);
        return updated;
      });
    },
    [key],
  );

  return [value, setStoredValue] as const;
}
