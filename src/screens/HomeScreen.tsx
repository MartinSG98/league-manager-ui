import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { CompetitionRow } from "../api/types";
import { Loading, TeamBadge } from "../components/Bits";
import { MatchCard } from "../components/MatchCard";
import { StandingsTable } from "../components/StandingsTable";
import { cx, money, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

function currentCompetition(rows: CompetitionRow[], league: string): CompetitionRow | null {
  const mine = rows.filter((c) => c.mine);
  return (
    mine.find((c) => c.status === "running") ??
    mine.find((c) => c.status === "upcoming") ??
    rows.find((c) => c.league === league && c.status === "running") ??
    [...mine].reverse().find((c) => c.status === "finished") ??
    null
  );
}

export function HomeScreen() {
  const { career, revision } = useCareer();
  const base = `/career/${career.id}`;
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  const current = comps.data ? currentCompetition(comps.data, career.league) : null;
  const table = useApi(() => (current ? api.competition(career.id, current.id) : Promise.resolve(null)), [career.id, revision, current?.id]);
  const squad = useApi(() => (career.phase === "draft" ? Promise.resolve(null) : api.squad(career.id)), [career.id, revision, career.phase]);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{career.team.name}</div>
          <h1 className="screen-title">Manager's office</h1>
        </div>
      </div>

      {career.phase === "draft" && (
        <div className="panel panel-body" style={{ marginBottom: 18 }}>
          <div className="row">
            <div>
              <div className="eyebrow">Pre-season</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                The draft is running. {career.draft?.my_turn ? "You are on the clock." : "The other teams are picking."}
              </div>
            </div>
            <span className="spacer" />
            <Link className="btn btn-gold" to={`${base}/draft`}>
              Draft room
            </Link>
          </div>
        </div>
      )}

      <div className="grid-main-side">
        <div className="stack">
          {career.next_match && (
            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">{career.live ? "Match day" : "Next match"}</span>
                <span className="muted">{career.next_match.competition_name}</span>
              </div>
              <div className="panel-body">
                <MatchCard match={career.next_match} mine={career.team.id} />
                {career.live && (
                  <div className="row" style={{ marginTop: 12 }}>
                    <Link className="btn btn-gold" to={`${base}/match`}>
                      To the stage
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}
          {career.season_over && (
            <section className="panel panel-body">
              <div className="eyebrow">Season over</div>
              <p>The {career.season} season is complete. Your review is in the inbox.</p>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">{current ? current.name : "Standings"}</span>
              {current && (
                <Link className="link muted" to={`${base}/competitions/${current.id}`}>
                  Full view →
                </Link>
              )}
            </div>
            {!table.data && <Loading text={career.phase === "draft" ? "The schedule is made after the draft." : "Loading…"} />}
            {table.data && <StandingsTable stage={table.data.stages[table.data.stages.length - 1].kind === "round_robin" ? table.data.stages[table.data.stages.length - 1] : table.data.stages[0]} mine={career.team.id} careerId={career.id} />}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Inbox</span>
              <Link className="link muted" to={`${base}/inbox`}>
                All →
              </Link>
            </div>
            <div>
              {career.inbox.slice(0, 7).map((m) => (
                <Link key={m.id} to={`${base}/inbox`} className={cx("link", "row")} style={{ padding: "9px 16px", borderBottom: "1px solid var(--line)", gap: 10 }}>
                  <span className={cx("chip", !m.read && "chip-gold")}>{m.kind}</span>
                  <span style={{ flex: 1, fontWeight: m.read ? 500 : 700 }}>{m.subject}</span>
                  <span className="muted">{shortDate(m.day)}</span>
                </Link>
              ))}
            </div>
          </section>

          {squad.data && (
            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Team</span>
                <Link className="link muted" to={`${base}/squad`}>
                  Squad →
                </Link>
              </div>
              <div className="panel-body stack" style={{ gap: 8 }}>
                <div className="row">
                  <TeamBadge team={squad.data.team} />
                  <span className="spacer" />
                  <span className="muted">Team strength</span>
                  <strong>{squad.data.strength}</strong>
                </div>
                <div className="row">
                  <span className="muted">Chemistry</span>
                  <span className="spacer" />
                  <strong className={squad.data.chemistry.score >= 0 ? "gain" : "loss"}>{squad.data.chemistry.score.toFixed(1)}</strong>
                </div>
                <div className="row">
                  <span className="muted">Payroll / budget</span>
                  <span className="spacer" />
                  <span>
                    {money(squad.data.payroll)} / {money(squad.data.budget)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
