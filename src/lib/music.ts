import { useSyncExternalStore } from "react";

import type { MatchSummary } from "../api/types";

/**
 * Champion select music. The audio files sit in three folders of public/music, listed by the Vite
 * plugin at /music/index.json:
 * - splits: the regions' splits and playoffs;
 * - international: First Stand, MSI and Worlds;
 * - decider: a best of five at 2-2, whatever the competition.
 * Each champion select plays one track at random from its folder, never the one the folder played
 * last when there is a choice, and loops it until the select is over.
 */
export type MusicPool = "splits" | "international" | "decider";
export type Track = { pool: MusicPool; file: string };

const INTERNATIONAL = /-(FST|MSI|WORLDS)$/;

export function poolFor(match: MatchSummary): MusicPool {
  if (match.best_of === 5 && match.score[0] === 2 && match.score[1] === 2) return "decider";
  return INTERNATIONAL.test(match.competition) ? "international" : "splits";
}

export async function musicFiles(): Promise<Partial<Record<MusicPool, string[]>>> {
  try {
    const r = await fetch("/music/index.json", { cache: "no-store" });
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

function stored(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // private windows and blocked storage: the choice just is not remembered
  }
}

/** The track for this champion select: the same one again if the screen reloads mid-select. */
export function chooseTrack(files: Partial<Record<MusicPool, string[]>>, match: MatchSummary, game: number): Track | null {
  let pool = poolFor(match);
  if (pool === "decider" && !files.decider?.length) pool = INTERNATIONAL.test(match.competition) ? "international" : "splits";
  const list = files[pool] ?? [];
  if (list.length === 0) return null;
  const key = `music:${match.id}:${game}`;
  const kept = stored(key);
  if (kept && list.includes(kept)) return { pool, file: kept };
  const last = stored(`music:last:${pool}`);
  const options = list.length > 1 ? list.filter((f) => f !== last) : list;
  const file = options[Math.floor(Math.random() * options.length)];
  store(key, file);
  store(`music:last:${pool}`, file);
  return { pool, file };
}

export const trackUrl = (t: Track) => `/music/${t.pool}/${encodeURIComponent(t.file)}`;
/** A file's name made short: "LCS 2015 - Born a Champion", "Worlds 2021 - Destiny", "Silver Scrapes". */
export const trackTitle = (t: Track) =>
  t.file
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\|?\s*Extended Version/gi, "")
    .replace(/\s+Music\s+-\s+/i, " - ")
    .replace(/\s+Champ Select\s+/i, " - ")
    .replace(/^League of Legends Song - /i, "")
    .trim();

// ---------- the volume, shared by the champion select player and the control in the top bar ----------

export type MusicSettings = { volume: number; muted: boolean };

const VOLUME = "lm:music:volume";
const MUTED = "lm:music:muted";

function load(): MusicSettings {
  try {
    const volume = Number(localStorage.getItem(VOLUME));
    return { volume: Number.isFinite(volume) && localStorage.getItem(VOLUME) !== null ? volume : 0.5, muted: localStorage.getItem(MUTED) === "1" };
  } catch {
    return { volume: 0.5, muted: false };
  }
}

let settings = load();
const listeners = new Set<() => void>();

export function setMusic(next: Partial<MusicSettings>): void {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(VOLUME, String(settings.volume));
    localStorage.setItem(MUTED, settings.muted ? "1" : "0");
  } catch {
    // the setting just is not remembered
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMusic(): MusicSettings {
  return useSyncExternalStore(subscribe, () => settings);
}
