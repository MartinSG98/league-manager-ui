import type { CSSProperties } from "react";

import type { Role } from "../api/types";

export const ROLES: Role[] = ["TOP", "JNG", "MID", "BOT", "SUP"];

export const ROLE_NAMES: Record<Role, string> = {
  TOP: "Top",
  JNG: "Jungle",
  MID: "Mid",
  BOT: "Bot",
  SUP: "Support",
};

export const ATTRIBUTE_NAMES: Record<string, string> = {
  mechanics: "Mechanics",
  laning: "Laning",
  teamfighting: "Teamfighting",
  vision: "Vision",
  macro: "Macro",
  consistency: "Consistency",
  composure: "Composure",
  champion_pool: "Champion pool",
};

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Inline style with CSS custom properties, e.g. vars({ "--team": "#e2012d" }). */
export function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

export function signed(n: number, digits = 0): string {
  const text = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${text}`;
  if (n < 0) return `−${text}`;
  return text;
}

/** Thousands of USD as $1.25M or $480k. */
export function money(thousands: number): string {
  const sign = thousands < 0 ? "−" : "";
  const value = Math.abs(thousands);
  if (value >= 1000) return `${sign}$${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}M`;
  return `${sign}$${Math.round(value)}k`;
}

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Colour band for a 30-99 overall: elite, good, decent, weak. */
export function ratingBand(overall: number): "elite" | "good" | "decent" | "weak" {
  if (overall >= 85) return "elite";
  if (overall >= 75) return "good";
  if (overall >= 62) return "decent";
  return "weak";
}

/** Colour band for a 1-20 attribute. */
export function attributeBand(value: number): "elite" | "good" | "decent" | "weak" {
  if (value >= 16) return "elite";
  if (value >= 12) return "good";
  if (value >= 8) return "decent";
  return "weak";
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Regional indicator flag from a two-letter country code, or the code itself when it has none. */
export function flag(code: string | null): string {
  if (!code || code.length !== 2) return code ?? "";
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65));
}
