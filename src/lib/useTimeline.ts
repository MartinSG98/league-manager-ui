import { useCallback, useEffect, useRef, useState } from "react";

const SPEED_KEY = "leagueManager.playbackSpeed";
export const SPEEDS = [1, 2, 5, 10];

export function readSpeed(): number {
  try {
    const value = Number(localStorage.getItem(SPEED_KEY));
    return SPEEDS.includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

export function writeSpeed(speed: number): void {
  try {
    localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    // not fatal, the speed just resets next time
  }
}

/**
 * A game clock in game seconds that runs from 0 to `end` at `rate` game seconds per real
 * second. Changing the rate keeps the time already played, and `skip` jumps to the end.
 * The game itself is decided before playback starts, so none of this can change it.
 */
export function useGameClock(end: number, rate: number) {
  const [t, setT] = useState(0);
  const played = useRef(0);

  useEffect(() => {
    played.current = 0;
    setT(0);
  }, [end]);

  useEffect(() => {
    if (played.current >= end) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      played.current = Math.min(end, played.current + ((now - last) / 1000) * rate);
      last = now;
      setT(played.current);
      if (played.current >= end) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [end, rate]);

  const skip = useCallback(() => {
    played.current = end;
    setT(end);
  }, [end]);

  return { t, done: t >= end, skip };
}
