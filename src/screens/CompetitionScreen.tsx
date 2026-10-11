import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { MatchSummary, StageView } from "../api/types";
import { Loading, TeamBadge } from "../components/Bits";
import { StandingsTable } from "../components/StandingsTable";
import { cx, money, ordinal, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import styles from "./CompetitionScreen.module.css";

export function CompetitionScreen() {
  const { comp } = useParams();
  const { career, revision } = useCareer();
  const view = useApi(() => api.competition(career.id, comp!), [career.id, comp, revision]);
  const [stageId, setStageId] = useState<string | null>(null);
  if (!view.data) return <Loading />;
  const c = view.data;
  const stage = c.stages.find((s) => s.id === stageId) ?? c.stages[c.stages.length - 1];

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">
            {shortDate(c.start)} – {shortDate(c.end)} · prize pool {money(c.prize_pool)}
          </div>
          <h1 className="screen-title">{c.name}</h1>
        </div>
        <div className="tabs">
          {c.stages.map((s) => (
            <button key={s.id} className={cx("tab", s.id === stage.id && "active")} onClick={() => setStageId(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {c.placements.length > 0 && (
        <section className={cx("panel", styles.podium)}>
          {c.placements.slice(0, 4).map((t, i) => (
            <div key={t.id} className={cx(styles.place, i === 0 && styles.champion)}>
              <span className="eyebrow">{i === 0 ? "Champion" : ordinal(i + 1)}</span>
              <TeamBadge team={t} name size={i === 0 ? "lg" : "md"} />
            </div>
          ))}
        </section>
      )}

      <div className="grid-main-side">
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">{stage.name}</span>
            <span className="muted">
              Bo{stage.best_of}
              {stage.advance ? ` · top ${stage.advance} advance` : ""}
            </span>
          </div>
          {stage.kind === "single_elim" ? <Bracket stage={stage} /> : <StandingsTable stage={stage} mine={career.team.id} careerId={career.id} />}
        </section>
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">Results</span>
          </div>
          <ResultsList matches={stage.matches} />
        </section>
      </div>
    </div>
  );
}

function Bracket({ stage }: { stage: StageView }) {
  const { career } = useCareer();
  const rounds: { label: string; matches: MatchSummary[] }[] = [];
  for (const m of stage.matches) {
    const last = rounds[rounds.length - 1];
    if (last && last.label === m.label) last.matches.push(m);
    else rounds.push({ label: m.label, matches: [m] });
  }
  return (
    <div className={styles.bracket}>
      {rounds.map((r, i) => (
        <div key={i} className={styles.round}>
          <div className="eyebrow">{r.label}</div>
          {r.matches.map((m) => (
            <Link key={m.id} to={m.games ? `/career/${career.id}/matches/${m.id}` : "#"} className={cx(styles.tie, "link")}>
              <TieSide team={m.home} score={m.score[0]} won={m.winner === m.home?.id} done={!!m.winner} mine={m.home?.id === career.team.id} />
              <TieSide team={m.away} score={m.score[1]} won={m.winner === m.away?.id} done={!!m.winner} mine={m.away?.id === career.team.id} />
              <span className={styles.tieDate}>
                {shortDate(m.day)} · Bo{m.best_of}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

function TieSide({ team, score, won, done, mine }: { team: MatchSummary["home"]; score: number; won: boolean; done: boolean; mine: boolean }) {
  return (
    <div className={cx(styles.tieSide, done && !won && styles.out, mine && styles.mineSide)}>
      <TeamBadge team={team} name size="sm" />
      <span className={styles.tieScore}>{done || score ? score : ""}</span>
    </div>
  );
}

function ResultsList({ matches }: { matches: MatchSummary[] }) {
  const { career } = useCareer();
  const played = matches.filter((m) => m.winner).reverse();
  const next = matches.filter((m) => !m.winner).slice(0, 8);
  return (
    <div>
      {next.length > 0 && <div className="eyebrow" style={{ padding: "10px 16px 4px" }}>Upcoming</div>}
      {next.map((m) => (
        <ResultRow key={m.id} m={m} careerId={career.id} />
      ))}
      {played.length > 0 && <div className="eyebrow" style={{ padding: "10px 16px 4px" }}>Played</div>}
      {played.slice(0, 30).map((m) => (
        <ResultRow key={m.id} m={m} careerId={career.id} />
      ))}
      {matches.length === 0 && <div className="empty">No matches yet.</div>}
    </div>
  );
}

function ResultRow({ m, careerId }: { m: MatchSummary; careerId: string }) {
  const body = (
    <div className="row" style={{ padding: "6px 16px", gap: 8, fontSize: 13 }}>
      <span className="muted" style={{ width: 52 }}>
        {shortDate(m.day)}
      </span>
      <TeamBadge team={m.home} size="sm" />
      <strong style={{ minWidth: 36, textAlign: "center" }}>{m.winner ? `${m.score[0]}-${m.score[1]}` : "vs"}</strong>
      <TeamBadge team={m.away} size="sm" />
    </div>
  );
  return m.games ? (
    <Link to={`/career/${careerId}/matches/${m.id}`} className="link" style={{ display: "block" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
