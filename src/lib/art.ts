import type { Champion } from "../api/types";

/** Square champion portrait from Riot's Data Dragon CDN. Champion ids are Data Dragon ids already. */
export function iconUrl(patch: string, championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${championId}.png`;
}

/** Wide default splash. */
export function splashUrl(championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_0.jpg`;
}

export function championName(champions: Record<string, Champion>, id: string): string {
  return champions[id]?.name ?? id;
}
