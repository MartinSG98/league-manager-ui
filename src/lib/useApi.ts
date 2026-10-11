import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Load something from the API and load it again whenever `deps` change. The previous data
 * stays on screen while a reload is in flight, so screens do not flash empty after every action.
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const run = useCallback(() => {
    const ticket = ++latest.current;
    setLoading(true);
    load()
      .then((value) => {
        if (ticket !== latest.current) return;
        setData(value);
        setError(null);
      })
      .catch((err: Error) => {
        if (ticket === latest.current) setError(err.message);
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  return { data, error, loading, reload: run, setData };
}
