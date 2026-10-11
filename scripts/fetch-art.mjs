// Download every champion's art from Riot's Data Dragon (square icon, loading-screen portrait and
// splash) and the five role icons from CommunityDragon into public/, the way riftlike keeps its art.
//
//   npm run fetch:art            # patch 16.20.1
//   npm run fetch:art -- 16.21.1
//
// About 45 MB in all. Files that already exist are skipped, so a rerun only fetches what is new.
// public/champions and public/roles are git-ignored: the art belongs to Riot and anyone can fetch it.

import { mkdir, stat, writeFile } from "node:fs/promises";

const PATCH = process.argv[2] ?? "16.20.1";
const PUBLIC = new URL("../public/", import.meta.url);
const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";
const ROLES = {
  TOP: "top",
  JNG: "jungle",
  MID: "middle",
  BOT: "bottom",
  SUP: "utility",
};
const ROLE_URL = (name) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${name}.png`;
const PARALLEL = 8;

async function exists(url) {
  try {
    await stat(url);
    return true;
  } catch {
    return false;
  }
}

async function download(source, target) {
  if (await exists(target)) return "skipped";
  const response = await fetch(source);
  if (!response.ok) throw new Error(`${response.status} for ${source}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return "fetched";
}

async function run(jobs) {
  const counts = { fetched: 0, skipped: 0, failed: 0 };
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const [source, target] = jobs[next++];
      try {
        counts[await download(source, target)]++;
      } catch (error) {
        counts.failed++;
        console.warn(String(error));
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return counts;
}

const list = await fetch(`${DDRAGON}/${PATCH}/data/en_US/champion.json`).then((r) => r.json());
const ids = Object.keys(list.data);

const folders = ["champions/icons", "champions/loading", "champions/splash", "roles"];
for (const folder of folders) await mkdir(new URL(folder, PUBLIC), { recursive: true });

const jobs = [];
for (const id of ids) {
  jobs.push([`${DDRAGON}/${PATCH}/img/champion/${id}.png`, new URL(`champions/icons/${id}.png`, PUBLIC)]);
  jobs.push([`${DDRAGON}/img/champion/loading/${id}_0.jpg`, new URL(`champions/loading/${id}_0.jpg`, PUBLIC)]);
  jobs.push([`${DDRAGON}/img/champion/splash/${id}_0.jpg`, new URL(`champions/splash/${id}_0.jpg`, PUBLIC)]);
}
for (const [role, name] of Object.entries(ROLES)) jobs.push([ROLE_URL(name), new URL(`roles/${role}.png`, PUBLIC)]);

const counts = await run(jobs);
console.log(`${ids.length} champions on patch ${PATCH}: ${counts.fetched} fetched, ${counts.skipped} already there, ${counts.failed} failed`);
