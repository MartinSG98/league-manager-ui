import { useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client";
import type { MatchView, TeamRef } from "../api/types";
import { Loading } from "../components/Bits";
import { GameReport } from "../components/GameReport";
import { GoldGraph } from "../components/GoldGraph";
import { MatchCard } from "../components/MatchCard";
import { clock, cx } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function MatchDetailScreen() {
  const { match } = useParams();
  const { career, revision } = useCareer();
  const view = useApi(() => api.match(career.id, match!), [career.id, match, revision]);
  if (!view.data) return <Loading />;
  return <SeriesReport match={view.data} />;
}

export function teamsOf(match: MatchView): Record<string, TeamRef | null> {
  const out: Record<string, TeamRef | null> = {};
  if (match.home) out[match.home.id] = match.home;
  if (match.away) out[match.away.id] = match.away;
  return out;
}

export function SeriesReport({ match }: { match: MatchView }) {
  const { career } = useCareer();
  const [number, setNumber] = useState(match.game_list.length);
  const game = match.game_list.find((g) => g.number === number) ?? match.game_list[match.game_list.length - 1];
  const detail = useApi(() => (game?.detailed ? api.game(career.id, match.id, game.number) : Promise.resolve(null)), [career.id, match.id, game?.number]);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{match.competition_name}</div>
          <h1 className="screen-title">Series report</h1>
        </div>
        <div className="tabs">
          {match.game_list.map((g) => (
            <button key={g.number} className={cx("tab", g.number === game?.number && "active")} onClick={() => setNumber(g.number)}>
              Game {g.number}
            </button>
          ))}
        </div>
      </div>
      <section className="panel panel-body" style={{ marginBottom: 18 }}>
        <MatchCard match={match} mine={career.team.id} />
      </section>
      {game && (
        <section className="panel panel-body">
          <GameReport game={game} teams={teamsOf(match)} />
        </section>
      )}
      {detail.data?.timeline && (
        <div className="grid-2" style={{ marginTop: 18 }}>
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Gold difference</span>
            </div>
            <div className="panel-body">
              <GoldGraph gold={detail.data.timeline.gold} />
            </div>
          </section>
          <section className="panel" style={{ maxHeight: 420, overflow: "auto" }}>
            <div className="panel-head">
              <span className="panel-title">Timeline</span>
            </div>
            {detail.data.timeline.events
              .filter((e) => e.kind !== "kill")
              .map((e, i) => (
                <div key={i} className="row" style={{ padding: "5px 16px", gap: 10, fontSize: 13 }}>
                  <span className="muted" style={{ width: 44 }}>
                    {clock(e.t)}
                  </span>
                  <span className={e.side ? `side-${e.side}` : "muted"}>{e.text}</span>
                </div>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
