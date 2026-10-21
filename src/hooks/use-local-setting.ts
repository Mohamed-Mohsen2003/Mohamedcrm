import { useCallback, useSyncExternalStore } from "react";

const EVENT = "nexora:local-setting";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A localStorage-backed value that is SSR-safe (server snapshot = fallback)
 * and stays in sync across components and tabs.
 */
export function useLocalSetting(key: string, fallback: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (e: Event) => {
      if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent<string>).detail === key) onChange();
    };
    window.addEventListener("storage", handler);
    window.addEventListener(EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EVENT, handler);
    };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key) ?? fallback, () => fallback);
  const set = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );
  return [value, set] as const;
}

/** Subscribes to a CSS media query. */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const mq = window.matchMedia(query);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
      },
      [query],
    ),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
