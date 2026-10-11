import { useEffect, useRef, useState } from "react";

/**
 * A countdown in seconds that starts over whenever `key` changes and stands still while
 * `running` is false. Champion select and the draft use it for the time on each turn.
 */
export function useClock(key: string, seconds: number, running: boolean): number {
  const [left, setLeft] = useState(seconds);
  const spent = useRef(0);

  useEffect(() => {
    spent.current = 0;
    setLeft(seconds);
  }, [key, seconds]);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const before = spent.current;
    const timer = window.setInterval(() => {
      spent.current = before + (performance.now() - start);
      setLeft(Math.max(0, seconds - spent.current / 1000));
    }, 100);
    return () => window.clearInterval(timer);
  }, [key, seconds, running]);

  return left;
}

/** A pause between `min` and `max` seconds, drawn again for every new `key`. */
export function useThinkingTime(key: string, min: number, max: number): number {
  const [value, setValue] = useState(() => min + Math.random() * (max - min));
  useEffect(() => setValue(min + Math.random() * (max - min)), [key, min, max]);
  return value;
}
