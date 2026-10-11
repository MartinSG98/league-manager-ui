import type { Role } from "../api/types";

// Every image is a list of sources tried in order: the copy in public/ that `npm run fetch:art`
// downloads, then the same file on Riot's CDN. <Img> moves down the list when one fails.

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";
const POSITIONS =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions";
const ROLE_FILE: Record<Role, string> = { TOP: "top", JNG: "jungle", MID: "middle", BOT: "bottom", SUP: "utility" };

/** Square 120px portrait. */
export function championIcon(patch: string, id: string): string[] {
  return [`/champions/icons/${id}.png`, `${DDRAGON}/${patch}/img/champion/${id}.png`];
}

/** Tall loading-screen art, 308 by 560. */
export function championLoading(id: string): string[] {
  return [`/champions/loading/${id}_0.jpg`, `${DDRAGON}/img/champion/loading/${id}_0.jpg`];
}

/** Wide default splash, 1215 by 717. */
export function championSplash(id: string): string[] {
  return [`/champions/splash/${id}_0.jpg`, `${DDRAGON}/img/champion/splash/${id}_0.jpg`];
}

export function roleIcon(role: Role): string[] {
  return [`/roles/${role}.png`, `${POSITIONS}/icon-position-${ROLE_FILE[role]}.png`];
}
