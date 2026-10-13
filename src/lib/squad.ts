import type { PlayerDetail } from "../api/types";
import { ATTRIBUTE_NAMES } from "./format";

export const ATTRS = Object.keys(ATTRIBUTE_NAMES);

/** Each attribute's average over a starting five: the level a player is measured against in their own team. */
export function teamAverages(five: PlayerDetail[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ATTRS) out[k] = five.reduce((s, p) => s + p.attributes[k], 0) / Math.max(1, five.length);
  return out;
}
