import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { DraftTeam, DraftView, PoolPlayer, Role } from "../api/types";
import { ChampIcon, Flag, Loading, Meter, Ovr, PlayerLink, RoleTag, TeamBadge } from "../components/Bits";
import { cx, money, ROLES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import styles from "./DraftScreen.module.css";

type Sort = "overall" | "potential" | "salary";

export function DraftScreen() {
  const { career, revision, act, busy } = useCareer();
  const navigate = useNavigate();
  const draft = useApi(() => api.draft(career.id), [career.id, revision]);

  if (career.phase !== "draft" && draft.data?.done) return <DraftDone draft={draft.data} />;
  if (draft.error && career.phase !== "draft") return <Navigate to={`/career/${career.id}`} replace />;
  if (!draft.data) return <Loading text="Opening the draft room…" />;
  const d = draft.data;

  async function simAll() {
    const result = await act({ type: "draft_sim" });
    if (result?.career.phase === "season") navigate(`/career/${career.id}/squad`);
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">
            {d.league} pre-season draft · round {Math.min(d.round, d.required_rounds + d.optional_rounds)} of{" "}
            {d.required_rounds + d.optional_rounds}
            {d.round > d.required_rounds && " (bench round)"}
          </div>
          <h1 className="screen-title">
            {d.done ? "The draft is over" : d.my_turn ? "You are on the clock" : "Waiting for the next pick"}
          </h1>
        </div>
        <div className="row">
          {d.my_turn && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => act({ type: "draft_auto" })}>
              Let the assistant pick
            </button>
          )}
          {d.my_turn && d.me.can_pass && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => act({ type: "draft_pass" })}>
              Pass
            </button>
          )}
          <button className="btn btn-ghost" disabled={busy || d.done} onClick={simAll}>
            Auto-draft the rest
          </button>
        </div>
      </div>

      <PickStrip d={d} />

      <div className="grid-main-side" style={{ marginTop: 16 }}>
        <Pool d={d} />
        <div className="stack">
          <MyTeam d={d} />
          <Feed d={d} />
          <OtherTeams d={d} />
        </div>
      </div>
    </div>
  );
}

function PickStrip({ d }: { d: DraftView }) {
  const perRound = d.sequence.length / (d.required_rounds + d.optional_rounds);
  const round = Math.min(d.round, d.required_rounds + d.optional_rounds) - 1;
  const start = round * perRound;
  const slice = d.sequence.slice(start, start + perRound);
  const team = (id: string) => d.teams.find((t) => t.team.id === id)!.team;
  return (
    <div className={cx("panel", styles.strip)}>
      {slice.map((tid, i) => {
        const number = start + i + 1;
        const pick = d.picks.find((p) => p.number === number);
        const current = number === d.number && !d.done;
        return (
          <div key={number} className={cx(styles.slot, current && styles.current, pick && styles.made)}>
            <span className={styles.slotNo}>#{number}</span>
            <TeamBadge team={team(tid)} size="sm" />
            <span className={styles.slotPick}>{pick ? (pick.player ? pick.player.name : "pass") : current ? "on the clock" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function Pool({ d }: { d: DraftView }) {
  const { career, act, busy } = useCareer();
  const catalog = useCatalog();
  const [role, setRole] = useState<Role | "ALL">(d.me.open_roles[0] ?? "ALL");
  const [league, setLeague] = useState("ALL");
  const [query, setQuery] = useState("");
  const [affordable, setAffordable] = useState(false);
  const [sort, setSort] = useState<Sort>("overall");
  const openKey = d.me.open_roles.join(",");

  // After a pick fills a role, move the filter on to a role that is still open.
  useEffect(() => {
    setRole((current) => (current === "ALL" || d.me.open_roles.includes(current) ? current : d.me.open_roles[0] ?? "ALL"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const leagues = useMemo(() => Array.from(new Set(d.pool.map((p) => p.league))), [d.pool]);
  const leagueName = (id: string) => catalog.leagues.find((l) => l.id === id)?.name ?? id;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.pool
      .filter((p) => role === "ALL" || p.role === role)
      .filter((p) => league === "ALL" || p.league === league)
      .filter((p) => !affordable || p.problem === null)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.origin?.name.toLowerCase().includes(q) ?? false))
      .sort((a, b) => (sort === "salary" ? a.salary - b.salary : b[sort] - a[sort]))
      .slice(0, 150);
  }, [d.pool, role, league, query, affordable, sort]);

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Player pool · {d.pool.length} available</span>
      </div>
      <div className={styles.filters}>
        <div className="tabs">
          {(["ALL", ...ROLES] as const).map((r) => (
            <button key={r} className={cx("tab", role === r && "active")} onClick={() => setRole(r)}>
              {r}
              {r !== "ALL" && d.me.open_roles.includes(r) && " •"}
            </button>
          ))}
        </div>
        <select className="select" value={league} onChange={(e) => setLeague(e.target.value)}>
          <option value="ALL">All leagues</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {leagueName(l)}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Search player or team" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="overall">Best rated</option>
          <option value="potential">Highest potential</option>
          <option value="salary">Cheapest</option>
        </select>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={affordable} onChange={(e) => setAffordable(e.target.checked)} />
          <span className="muted">Only pickable</span>
        </label>
      </div>
      <div className={cx("table-wrap", styles.poolWrap)}>
        <table className="table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Player</th>
              <th>2026 team</th>
              <th className="num">OVR</th>
              <th className="num">POT</th>
              <th className="num">Salary</th>
              <th>Signatures</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <PoolRow key={p.id} p={p} canAct={d.my_turn && !busy} onPick={() => act({ type: "draft_pick", player: p.id })}
                careerId={career.id} leagueName={leagueName(p.league)} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">Nobody fits those filters.</div>}
      </div>
    </section>
  );
}

function PoolRow({ p, canAct, onPick, careerId, leagueName }: { p: PoolPlayer; canAct: boolean; onPick: () => void; careerId: string; leagueName: string }) {
  return (
    <tr className={cx(p.problem && "dim")}>
      <td>
        <RoleTag role={p.role} />
      </td>
      <td>
        <Flag country={p.country} /> <PlayerLink careerId={careerId} id={p.id} name={p.name} />
      </td>
      <td className="muted">
        {p.origin?.tag ?? "—"} <span className={styles.league}>{leagueName}</span>
      </td>
      <td className="num">
        <Ovr value={p.overall} />
      </td>
      <td className="num muted">{p.potential}</td>
      <td className="num">{money(p.salary)}</td>
      <td>
        <div className="row" style={{ gap: 3 }}>
          {p.signatures.map((c) => (
            <ChampIcon key={c} id={c} size={22} />
          ))}
        </div>
      </td>
      <td className="num">
        <button className="btn btn-primary btn-small" disabled={!canAct || !!p.problem} title={p.problem ?? "Draft this player"} onClick={onPick}>
          Draft
        </button>
      </td>
    </tr>
  );
}

function MyTeam({ d }: { d: DraftView }) {
  const { career } = useCareer();
  const mine = d.teams.find((t) => t.team.id === career.team.id)!;
  const byId = Object.fromEntries(mine.roster.map((p) => [p.id, p]));
  const bench = mine.roster.filter((p) => !Object.values(mine.lineup).includes(p.id));
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Your roster</span>
        <span className="muted">{money(d.me.left)} left</span>
      </div>
      <div className="panel-body stack" style={{ gap: 10 }}>
        <div className="row">
          <Meter value={d.me.payroll} max={d.me.budget} tone={d.me.left < d.me.reserve ? "red" : "gold"} />
          <span className="muted">
            {money(d.me.payroll)} of {money(d.me.budget)}
          </span>
        </div>
        {d.me.open_roles.length > 0 && (
          <div className="muted" style={{ fontSize: 13 }}>
            Filling {d.me.open_roles.join(", ")} at the cheapest would cost {money(d.me.reserve)}.
          </div>
        )}
        {ROLES.map((r) => {
          const pid = mine.lineup[r];
          const p = pid ? byId[pid] : null;
          return (
            <div key={r} className={cx(styles.lineSlot, !p && styles.open)}>
              <RoleTag role={r} />
              {p ? (
                <>
                  <span className={styles.lineName}>
                    <Flag country={p.country} /> {p.name}
                    {mine.franchise === p.id && <span className="chip chip-gold">Franchise</span>}
                  </span>
                  <Ovr value={p.overall} size="sm" />
                  <span className="muted">{money(p.salary)}</span>
                </>
              ) : (
                <span className="muted">open</span>
              )}
            </div>
          );
        })}
        {bench.length > 0 && (
          <div className="muted" style={{ fontSize: 13 }}>
            Bench: {bench.map((p) => `${p.name} (${p.role})`).join(", ")}
          </div>
        )}
      </div>
    </section>
  );
}

function Feed({ d }: { d: DraftView }) {
  const team = (id: string) => d.teams.find((t) => t.team.id === id)!.team;
  const recent = [...d.picks].reverse().slice(0, 12);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Latest picks</span>
      </div>
      <table className="table">
        <tbody>
          {recent.map((p) => (
            <tr key={p.number}>
              <td className="muted">#{p.number}</td>
              <td>
                <TeamBadge team={team(p.team)} size="sm" />
              </td>
              <td>{p.player ? p.player.name : <span className="muted">pass</span>}</td>
              <td>{p.player && <RoleTag role={p.player.role} />}</td>
              <td className="num">{p.player && <Ovr value={p.player.overall} size="sm" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recent.length === 0 && <div className="empty">No picks yet.</div>}
    </section>
  );
}

function OtherTeams({ d }: { d: DraftView }) {
  const { career } = useCareer();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Rivals</span>
      </div>
      {d.teams
        .filter((t) => t.team.id !== career.team.id)
        .map((t) => (
          <RivalRow key={t.team.id} t={t} open={open === t.team.id} toggle={() => setOpen(open === t.team.id ? null : t.team.id)} />
        ))}
    </section>
  );
}

function RivalRow({ t, open, toggle }: { t: DraftTeam; open: boolean; toggle: () => void }) {
  return (
    <div className={styles.rival}>
      <button className={styles.rivalHead} onClick={toggle}>
        <TeamBadge team={t.team} size="sm" />
        <span className="muted">{t.roster.length} players</span>
        <span className="spacer" />
        <span className="muted">{money(t.budget - t.payroll)} left</span>
      </button>
      {open && (
        <div className={styles.rivalBody}>
          {t.roster.map((p) => (
            <div key={p.id} className="row" style={{ gap: 8 }}>
              <RoleTag role={p.role} />
              <span>{p.name}</span>
              <span className="spacer" />
              <Ovr value={p.overall} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftDone({ draft }: { draft: DraftView }) {
  const { career } = useCareer();
  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{draft.league} pre-season draft</div>
          <h1 className="screen-title">Draft results</h1>
        </div>
      </div>
      <div className={styles.results}>
        {draft.teams.map((t) => (
          <section key={t.team.id} className={cx("panel", t.team.id === career.team.id && styles.mineResult)}>
            <div className="panel-head">
              <TeamBadge team={t.team} name />
            </div>
            <div className="panel-body stack" style={{ gap: 6 }}>
              {t.roster.map((p) => (
                <div key={p.id} className="row" style={{ gap: 8 }}>
                  <RoleTag role={p.role} />
                  <span>{p.name}</span>
                  <span className="spacer" />
                  <Ovr value={p.overall} size="sm" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
