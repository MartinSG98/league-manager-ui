import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Champion, GameView, LiveView, Role, Side, SideView, Suggestion, TimelineEvent } from "../api/types";
import { ChampIcon, Flag, Form, Loading, Ovr, RoleTag, TeamBadge } from "../components/Bits";
import { GameReport } from "../components/GameReport";
import { GoldGraph } from "../components/GoldGraph";
import { clock, cx, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { readSpeed, useTimeline, writeSpeed } from "../lib/useTimeline";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { SeriesReport, teamsOf } from "./MatchDetailScreen";
import styles from "./MatchScreen.module.css";

export function MatchScreen() {
  const { career, revision } = useCareer();
  const live = useApi(() => api.live(career.id), [career.id, revision]);
  const [finished, setFinished] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  if (!career.live) {
    if (finished) return <FinishedSeries matchId={finished} />;
    return (
      <div className="screen">
        <div className="empty">
          No match today. {career.next_match ? "Press Continue to go to the next match day." : ""}
        </div>
      </div>
    );
  }
  if (!live.data) return <Loading text="Walking onto the stage…" />;
  const view = live.data;
  const gameKey = `${view.match.id}-${view.game}`;
  // While a game plays back, the series score must not give its result away.
  const hideLast = view.phase === "result" && revealed !== gameKey;

  return (
    <div className="screen">
      <SeriesHeader view={view} hideLast={hideLast} />
      {view.phase === "lineup" && <LineupStage view={view} onFinished={setFinished} />}
      {(view.phase === "draft" || view.phase === "ready") && <ChampSelectStage view={view} onFinished={setFinished} />}
      {view.phase === "result" && <ResultStage view={view} onFinished={setFinished} onRevealed={() => setRevealed(gameKey)} />}
    </div>
  );
}

// ---------- header ----------

function SeriesHeader({ view, hideLast }: { view: LiveView; hideLast: boolean }) {
  const m = view.match;
  const last = m.game_list[m.game_list.length - 1];
  const score: [number, number] = [...m.score];
  if (hideLast && last) score[last.winner === m.home?.id ? 0 : 1] -= 1;
  return (
    <div className={cx("panel", styles.header)}>
      <div className={styles.headTeam}>
        <TeamBadge team={m.home} name size="lg" />
      </div>
      <div className={styles.headMid}>
        <div className="eyebrow">
          {m.competition_name} · {m.label}
        </div>
        <div className={styles.headScore}>
          {score[0]} <span className="muted">–</span> {score[1]}
        </div>
        <div className="muted">
          Game {view.game} · Bo{m.best_of}
          {m.fearless && " · fearless draft"}
        </div>
      </div>
      <div className={cx(styles.headTeam, styles.headRight)}>
        <TeamBadge team={m.away} name size="lg" />
      </div>
    </div>
  );
}

// ---------- lineup ----------

function LineupStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { act, busy } = useCareer();
  const ours = view[view.our_side];
  const theirs = view[view.our_side === "blue" ? "red" : "blue"];

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  return (
    <>
      <div className="grid-2">
        <LineupCard side={view.our_side} sideView={ours} label="Your lineup" />
        <LineupCard side={view.our_side === "blue" ? "red" : "blue"} sideView={theirs} label="Opponent" />
      </div>
      <div className={cx("panel", styles.actions)}>
        <div className="muted">
          Change the starting five or tactics on the Squad screen before champion select starts.
          {view.select.locked.length > 0 && ` Fearless: ${view.select.locked.length} champions are already used in this series.`}
        </div>
        <span className="spacer" />
        <button className="btn btn-ghost" disabled={busy} onClick={simSeries}>
          Simulate the series
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => act({ type: "auto_select" })}>
          Auto draft
        </button>
        <button className="btn btn-gold" disabled={busy} onClick={() => act({ type: "start_champ_select" })}>
          Champion select ▸
        </button>
      </div>
    </>
  );
}

function LineupCard({ side, sideView, label }: { side: Side; sideView: SideView; label: string }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">
          {label} · <span className={`side-${side}`}>{side} side</span>
        </span>
        <span className="muted">
          strength <strong>{sideView.strength}</strong> · chemistry{" "}
          <strong className={sideView.chemistry.score >= 0 ? "gain" : "loss"}>{signed(sideView.chemistry.score, 1)}</strong>
        </span>
      </div>
      <table className="table">
        <tbody>
          {sideView.lineup.map((p) => (
            <tr key={p.id}>
              <td>
                <RoleTag role={p.slot} />
              </td>
              <td>
                <Flag country={p.country} /> <strong>{p.name}</strong>
              </td>
              <td className="num">
                <Ovr value={p.overall} />
              </td>
              <td>
                <Form value={p.form} />
              </td>
              <td>
                <div className="row" style={{ gap: 3 }}>
                  {p.signatures.map((c) => (
                    <ChampIcon key={c} id={c} size={22} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel-body muted" style={{ fontSize: 13 }}>
        {sideView.tactics.style} game plan · jungle {sideView.tactics.lane} · {sideView.tactics.objectives}
      </div>
    </section>
  );
}

// ---------- champion select ----------

function ChampSelectStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { act, busy } = useCareer();
  const catalog = useCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const s = view.select;
  const turn = s.turn;
  const ourTurn = turn?.side === view.our_side;
  const ourPicks = view.our_side === "blue" ? s.blue_picks : s.red_picks;
  const openRoles = ROLES.filter((r) => !ourPicks[r]);
  const taken = new Set([...s.blue_bans, ...s.red_bans, ...Object.values(s.blue_picks), ...Object.values(s.red_picks), ...s.locked]);
  const ourLineup = Object.fromEntries(view[view.our_side].lineup.map((p) => [p.slot, p]));

  const champs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.champions.filter((c) => (filter === "ALL" || c.roles.includes(filter)) && (!q || c.name.toLowerCase().includes(q)));
  }, [catalog.champions, filter, query]);

  function choose(c: Champion) {
    if (!ourTurn || taken.has(c.id)) return;
    setSelected(c.id);
    if (turn?.kind === "pick") {
      const fit = openRoles.find((r) => c.roles.includes(r)) ?? openRoles[0] ?? null;
      setRole(fit);
    }
  }

  async function lockIn() {
    if (!selected || !turn) return;
    if (turn.kind === "ban") await act({ type: "ban", champion: selected });
    else if (role) await act({ type: "pick", champion: selected, role });
    setSelected(null);
    setRole(null);
  }

  async function useSuggestion(sg: Suggestion) {
    if (turn?.kind === "ban") await act({ type: "ban", champion: sg.champion });
    else if (sg.role) await act({ type: "pick", champion: sg.champion, role: sg.role });
  }

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  const masteryFor = (championId: string, r: Role) => {
    const p = ourLineup[r];
    return p ? view.mastery[p.id]?.[championId] ?? 0 : 0;
  };

  return (
    <div className={styles.select}>
      <BanRow view={view} />
      <div className={styles.selectBody}>
        <PickColumn side="blue" view={view} />
        <div className={styles.centre}>
          {view.phase === "ready" ? (
            <div className={cx("panel", styles.ready)}>
              <div className="eyebrow">Champion select complete</div>
              <h2 className="screen-title">Ready to play game {view.game}</h2>
              <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
                <button className="btn btn-ghost" disabled={busy} onClick={simSeries}>
                  Simulate the rest
                </button>
                <button className="btn btn-gold" disabled={busy} onClick={() => act({ type: "play_game" })}>
                  Play game ▸
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={cx("panel", styles.turn)}>
                {ourTurn ? (
                  <span>
                    Your {turn?.kind} · step {s.step + 1} of 20
                  </span>
                ) : (
                  <span className="muted">Waiting for the opponent…</span>
                )}
                <span className="spacer" />
                <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act({ type: "auto_select" })}>
                  Let the assistant finish
                </button>
              </div>

              {ourTurn && view.suggestions.length > 0 && (
                <div className={cx("panel", styles.suggest)}>
                  <div className="eyebrow">Assistant · best {turn?.kind === "ban" ? "bans" : "picks"}</div>
                  <div className={styles.suggestList}>
                    {view.suggestions.slice(0, 6).map((sg) => (
                      <button key={`${sg.champion}-${sg.role ?? ""}`} className={styles.suggestion} disabled={busy} onClick={() => useSuggestion(sg)}>
                        <ChampIcon id={sg.champion} size={34} />
                        <span className={styles.suggestText}>
                          <strong>{catalog.champion[sg.champion]?.name}</strong>
                          <span className="muted">
                            {sg.role && `${sg.role} · `}
                            {turn?.kind === "ban" ? `threat ${signed(sg.threat ?? 0, 1)}` : `fit ${signed(sg.power ?? 0, 1)}`}
                            {sg.need ? ` · comp +${sg.need}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={cx("panel", styles.gridPanel)}>
                <div className="row" style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
                  <div className="tabs">
                    {(["ALL", ...ROLES] as const).map((r) => (
                      <button key={r} className={cx("tab", filter === r && "active")} onClick={() => setFilter(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <input className="input" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className={styles.grid}>
                  {champs.map((c) => {
                    const off = taken.has(c.id);
                    const best = Math.max(...openRoles.filter((r) => c.roles.includes(r)).map((r) => masteryFor(c.id, r)), 0);
                    return (
                      <button key={c.id} className={cx(styles.tile, selected === c.id && styles.tileSelected, off && styles.tileOff)}
                        disabled={off || !ourTurn || busy} onClick={() => choose(c)} title={c.name}>
                        <ChampIcon id={c.id} size={48} dim={off} />
                        {best >= 50 && !off && <span className={styles.mastery}>{best}</span>}
                        <span className={styles.tileName}>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selected && ourTurn && (
                <div className={cx("panel", styles.lock)}>
                  <ChampIcon id={selected} size={44} />
                  <strong>{catalog.champion[selected]?.name}</strong>
                  {turn?.kind === "pick" && (
                    <div className="tabs">
                      {openRoles.map((r) => (
                        <button key={r} className={cx("tab", role === r && "active")} onClick={() => setRole(r)}>
                          {r} {ourLineup[r]?.name}
                          {!catalog.champion[selected]?.roles.includes(r) && " (off-role)"}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="spacer" />
                  <button className="btn btn-gold" disabled={busy || (turn?.kind === "pick" && !role)} onClick={lockIn}>
                    {turn?.kind === "ban" ? "Ban" : "Lock in"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <PickColumn side="red" view={view} />
      </div>
    </div>
  );
}

function BanRow({ view }: { view: LiveView }) {
  const s = view.select;
  return (
    <div className={cx("panel", styles.bans)}>
      <div className="row" style={{ gap: 4 }}>
        <span className="eyebrow side-blue">Bans</span>
        {Array.from({ length: 5 }, (_, i) =>
          s.blue_bans[i] ? <ChampIcon key={i} id={s.blue_bans[i]} size={30} dim /> : <span key={i} className={styles.emptyBan} />,
        )}
      </div>
      {s.locked.length > 0 && (
        <div className="row" style={{ gap: 3 }} title="Fearless: already played this series">
          <span className="eyebrow">Fearless</span>
          {s.locked.slice(0, 20).map((c) => (
            <ChampIcon key={c} id={c} size={20} dim />
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 4 }}>
        {Array.from({ length: 5 }, (_, i) =>
          s.red_bans[i] ? <ChampIcon key={i} id={s.red_bans[i]} size={30} dim /> : <span key={i} className={styles.emptyBan} />,
        )}
        <span className="eyebrow side-red">Bans</span>
      </div>
    </div>
  );
}

function PickColumn({ side, view }: { side: Side; view: LiveView }) {
  const catalog = useCatalog();
  const picks = side === "blue" ? view.select.blue_picks : view.select.red_picks;
  const sv = view[side];
  return (
    <div className={cx("panel", styles.picks, side === "red" && styles.picksRed)}>
      <div className="panel-head">
        <TeamBadge team={sv.team} size="sm" />
        <span className={`eyebrow side-${side}`}>{side === view.our_side ? "you" : "them"}</span>
      </div>
      {sv.lineup.map((p) => {
        const champ = picks[p.slot];
        return (
          <div key={p.id} className={styles.pickSlot}>
            {champ ? <ChampIcon id={champ} size={46} /> : <span className={styles.emptyPick}>{p.slot}</span>}
            <div className={styles.pickText}>
              <span className={styles.pickPlayer}>{p.name}</span>
              <span className="muted">{champ ? catalog.champion[champ]?.name : p.slot}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- the game ----------

function beatsFor(events: TimelineEvent[]): { ms: number }[] {
  return events.map((e, i) => {
    const next = events[i + 1];
    const gap = next ? next.t - e.t : 60;
    return { ms: Math.max(220, Math.min(1500, gap * 9)) };
  });
}

function ResultStage({ view, onFinished, onRevealed }: { view: LiveView; onFinished: (id: string) => void; onRevealed: () => void }) {
  const { career, act, busy } = useCareer();
  const game = useApi(() => api.game(career.id, view.match.id, view.game), [career.id, view.match.id, view.game]);
  if (!game.data?.timeline) return <Loading text="Loading the game…" />;
  return (
    <Playback key={`${view.match.id}-${view.game}`} view={view} data={game.data} busy={busy} onRevealed={onRevealed}
      onNext={async () => {
        const result = await act({ type: "next_game" });
        if (result && !result.career.live) onFinished(view.match.id);
      }} />
  );
}

function Playback({ view, data, busy, onNext, onRevealed }: { view: LiveView; data: GameView; busy: boolean; onNext: () => void; onRevealed: () => void }) {
  const events = data.timeline!.events;
  const beats = useMemo(() => beatsFor(events), [events]);
  const [speed, setSpeed] = useState(readSpeed());
  const timeline = useTimeline(beats, speed);
  useEffect(() => {
    if (timeline.done) onRevealed();
  }, [timeline.done, onRevealed]);
  const current = events[timeline.index];
  const shown = events.slice(0, timeline.index + 1).reverse();
  const minute = Math.floor((current?.t ?? 0) / 60);
  const counts = useMemo(() => {
    const upTo = events.slice(0, timeline.index + 1);
    const count = (kind: string[], side: Side) => upTo.filter((e) => kind.includes(e.kind) && e.side === side).length;
    return {
      towers: [count(["tower"], "blue"), count(["tower"], "red")],
      dragons: [count(["dragon", "soul"], "blue"), count(["dragon", "soul"], "red")],
      barons: [count(["baron"], "blue"), count(["baron"], "red")],
    };
  }, [events, timeline.index]);
  const record = data.game;
  const seriesOver = Math.max(...view.match.score) >= Math.floor(view.match.best_of / 2) + 1;

  function changeSpeed(next: number) {
    setSpeed(next);
    writeSpeed(next);
  }

  return (
    <div className="stack">
      <div className={cx("panel", styles.live)}>
        <div className={styles.liveTop}>
          <TeamBadge team={view.blue.team} size="lg" />
          <span className={cx(styles.liveKills, "side-blue")}>{current?.score[0] ?? 0}</span>
          <div className={styles.liveClock}>
            <div className={styles.clock}>{clock(current?.t ?? 0)}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              towers {counts.towers[0]}-{counts.towers[1]} · drakes {counts.dragons[0]}-{counts.dragons[1]} · barons {counts.barons[0]}-{counts.barons[1]}
            </div>
          </div>
          <span className={cx(styles.liveKills, "side-red")}>{current?.score[1] ?? 0}</span>
          <TeamBadge team={view.red.team} size="lg" />
        </div>
        <GoldGraph gold={data.timeline!.gold} upTo={timeline.done ? undefined : minute} height={130} />
        <div className="row" style={{ marginTop: 6 }}>
          <div className="tabs">
            {[1, 2, 4].map((sp) => (
              <button key={sp} className={cx("tab", speed === sp && "active")} onClick={() => changeSpeed(sp)}>
                {sp}×
              </button>
            ))}
          </div>
          <span className="spacer" />
          {!timeline.done && (
            <button className="btn btn-ghost btn-small" onClick={timeline.skip}>
              Skip to the end
            </button>
          )}
        </div>
      </div>

      {!timeline.done ? (
        <section className={cx("panel", styles.feed)}>
          {shown.slice(0, 14).map((e, i) => (
            <div key={events.length - i} className={cx(styles.event, i === 0 && styles.latest, styles[`k-${e.kind}`])}>
              <span className="muted">{clock(e.t)}</span>
              <span className={e.side ? `side-${e.side}` : undefined}>{e.text}</span>
            </div>
          ))}
        </section>
      ) : (
        <>
          <section className="panel panel-body">
            <GameReport game={record} teams={teamsOf(view.match)} />
          </section>
          <div className={cx("panel", styles.actions)}>
            <span>{record.winner === view[view.our_side].team.id ? "Victory." : "Defeat."}</span>
            <span className="spacer" />
            <button className="btn btn-gold" disabled={busy} onClick={onNext}>
              {seriesOver ? "Finish the series ▸" : "Next game ▸"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- after the series ----------

function FinishedSeries({ matchId }: { matchId: string }) {
  const { career, revision } = useCareer();
  const navigate = useNavigate();
  const match = useApi(() => api.match(career.id, matchId), [career.id, matchId, revision]);
  if (!match.data) return <Loading />;
  const won = match.data.winner === career.team.id;
  return (
    <div>
      <div className={cx("panel", styles.verdict, won ? styles.won : styles.lostSeries)}>
        <div className="eyebrow">Series over</div>
        <h2 className="screen-title">{won ? "Victory" : "Defeat"}</h2>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-ghost" to={`/career/${career.id}`}>
            Back to the office
          </Link>
          <button className="btn btn-primary" onClick={() => navigate(`/career/${career.id}/competitions/${match.data!.competition}`)}>
            Standings
          </button>
        </div>
      </div>
      <SeriesReport match={match.data} />
    </div>
  );
}
