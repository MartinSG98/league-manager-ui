import { Tooltip } from "@mantine/core";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { CompetitionRow } from "../api/types";
import { ordinal, shortDate } from "../lib/format";
import classes from "./SeasonTrack.module.css";

type State = "won" | "done" | "missed" | "now" | "elsewhere" | "next";

/** The names the scene uses for the international events, short enough for the bar. */
const NICKNAMES: Record<string, string> = { "Mid-Season Invitational": "MSI", "World Championship": "Worlds" };

/** A finished competition's places never change, so each one is fetched once per session. */
const placeCache = new Map<string, number | null>();

function usePlaces(careerId: string, team: string, comps: CompetitionRow[]) {
  const [, setTick] = useState(0);
  const wanted = comps.filter((c) => c.status === "finished" && c.mine && c.winner?.id !== team).map((c) => c.id);
  const key = wanted.join(",");
  useEffect(() => {
    for (const id of wanted) {
      const k = `${careerId}:${id}`;
      if (placeCache.has(k)) continue;
      placeCache.set(k, null);
      api
        .competition(careerId, id)
        .then((view) => {
          const i = view.placements.findIndex((t) => t.id === team);
          placeCache.set(k, i >= 0 ? i + 1 : null);
          setTick((n) => n + 1);
        })
        .catch(() => placeCache.delete(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careerId, team, key]);
  return (id: string) => placeCache.get(`${careerId}:${id}`) ?? null;
}

/** The splits and international events of the season, in order, with where you finished and where you are now. */
export function SeasonTrack({ comps, league, today, team, careerId }: { comps: CompetitionRow[]; league: string; today: string; team: string; careerId: string }) {
  const rows = comps.filter((c) => c.league === league || c.kind === "international");
  const place = usePlaces(careerId, team, rows);
  if (rows.length === 0) return null;
  const now = Date.parse(`${today}T12:00:00`);
  return (
    <ol className={classes.track} aria-label="The season so far">
      {rows.map((c) => {
        const start = Date.parse(`${c.start}T12:00:00`);
        const end = Date.parse(`${c.end}T12:00:00`);
        const days = Math.max(7, (end - start) / 86_400_000);
        const name = c.kind === "league" ? c.short.split(" ").slice(1).join(" ") || c.short : NICKNAMES[c.short] ?? c.short;
        let state: State;
        if (c.status === "finished") state = c.winner?.id === team ? "won" : c.mine ? "done" : "missed";
        else if (c.status === "running") state = c.mine ? "now" : "elsewhere";
        else state = "next";
        const finish = state === "won" ? 1 : state === "done" ? place(c.id) : null;
        const progress = c.status === "running" ? Math.min(1, Math.max(0.04, (now - start) / Math.max(1, end - start))) : 0;
        const text =
          state === "won" ? "champions" :
          state === "done" ? (finish ? `finished ${ordinal(finish)}` : "finished") :
          state === "missed" ? "did not qualify" :
          state === "now" ? `running until ${shortDate(c.end)}` :
          state === "elsewhere" ? "on now, without you" :
          `starts ${shortDate(c.start)}`;
        return (
          <Tooltip key={c.id} label={`${c.name}: ${text}`}>
            <li className={classes.step} style={{ flexGrow: days }} data-state={state}>
              <span className={classes.name}>
                {name}
                {finish && <b> {ordinal(finish)}</b>}
              </span>
              <span className={classes.bar}>
                <span style={{ width: `${progress * 100}%` }} />
              </span>
            </li>
          </Tooltip>
        );
      })}
    </ol>
  );
}
