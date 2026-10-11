import { useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client";
import type { PlayerDetail, Role, SquadView, Tactics } from "../api/types";
import { ChampIcon, Flag, Form, Loading, Meter, Ovr, PlayerLink, RoleTag, TeamBadge } from "../components/Bits";
import { ATTRIBUTE_NAMES, attributeBand, cx, money, ROLE_NAMES, ROLES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import styles from "./SquadScreen.module.css";

export function SquadScreen() {
  const { team } = useParams();
  const { career, revision } = useCareer();
  const squad = useApi(() => api.squad(career.id, team), [career.id, revision, team]);
  if (career.phase === "draft" && !team) return <div className="empty">Your squad takes shape in the draft.</div>;
  if (!squad.data) return <Loading />;
  return <Squad squad={squad.data} />;
}

function Squad({ squad }: { squad: SquadView }) {
  const { career } = useCareer();
  const starters = ROLES.map((r) => squad.players.find((p) => p.id === squad.lineup[r]) ?? null);
  const bench = squad.players.filter((p) => !Object.values(squad.lineup).includes(p.id));
  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{squad.is_mine ? "Your squad" : "Team"}</div>
          <h1 className="screen-title">
            <TeamBadge team={squad.team} name size="lg" />
          </h1>
        </div>
        <div className="row" style={{ gap: 24 }}>
          <Stat label="Strength" value={squad.strength.toFixed(1)} />
          <Stat label="Chemistry" value={squad.chemistry.score.toFixed(1)} tone={squad.chemistry.score >= 0 ? "gain" : "loss"} />
          <Stat label="Payroll" value={`${money(squad.payroll)} / ${money(squad.budget)}`} />
        </div>
      </div>

      <div className={styles.lineup}>
        {starters.map((p, i) => (
          <StarterCard key={ROLES[i]} role={ROLES[i]} p={p} careerId={career.id} franchise={squad.franchise} />
        ))}
      </div>

      <div className="grid-main-side" style={{ marginTop: 18 }}>
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">Players</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Player</th>
                  <th className="num">OVR</th>
                  <th className="num">POT</th>
                  {Object.keys(ATTRIBUTE_NAMES).map((a) => (
                    <th key={a} className="num" title={ATTRIBUTE_NAMES[a]}>
                      {ATTRIBUTE_NAMES[a].slice(0, 4)}
                    </th>
                  ))}
                  <th>Form</th>
                  <th>Morale</th>
                  <th className="num">Salary</th>
                  <th className="num">Until</th>
                </tr>
              </thead>
              <tbody>
                {[...starters.filter((p): p is PlayerDetail => !!p), ...bench].map((p) => (
                  <tr key={p.id} className={cx(bench.includes(p) && "dim")}>
                    <td>
                      <RoleTag role={p.role} />
                    </td>
                    <td>
                      <Flag country={p.country} /> <PlayerLink careerId={career.id} id={p.id} name={p.name} />
                    </td>
                    <td className="num">
                      <Ovr value={p.overall} />
                    </td>
                    <td className="num muted">{p.potential}</td>
                    {Object.keys(ATTRIBUTE_NAMES).map((a) => (
                      <td key={a} className={cx("num", `band-${attributeBand(p.attributes[a])}`)}>
                        {p.attributes[a]}
                      </td>
                    ))}
                    <td>
                      <Form value={p.form} />
                    </td>
                    <td>
                      <Meter value={p.morale} tone={p.morale >= 60 ? "green" : "red"} />
                    </td>
                    <td className="num">{money(p.salary)}</td>
                    <td className="num muted">{p.contract_until ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Chemistry</span>
              <strong className={squad.chemistry.score >= 0 ? "gain" : "loss"}>{squad.chemistry.score.toFixed(1)}</strong>
            </div>
            <ul className={styles.reasons}>
              {squad.chemistry.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          {squad.is_mine && <TacticsPanel tactics={squad.tactics} />}
          {squad.is_mine && bench.length > 0 && <LineupPanel squad={squad} />}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stack" style={{ gap: 0 }}>
      <span className="eyebrow">{label}</span>
      <strong className={tone} style={{ fontSize: 18 }}>
        {value}
      </strong>
    </div>
  );
}

function StarterCard({ role, p, careerId, franchise }: { role: Role; p: PlayerDetail | null; careerId: string; franchise: string | null }) {
  return (
    <div className={cx("panel", styles.starter)}>
      <div className="row">
        <RoleTag role={role} />
        <span className="muted">{ROLE_NAMES[role]}</span>
        <span className="spacer" />
        {p && <Ovr value={p.overall} size="lg" />}
      </div>
      {p ? (
        <>
          <div className={styles.starterName}>
            <Flag country={p.country} /> <PlayerLink careerId={careerId} id={p.id} name={p.name} />
          </div>
          <div className="row" style={{ gap: 6 }}>
            {franchise === p.id && <span className="chip chip-gold">Franchise</span>}
            <span className="muted">{p.origin?.tag ?? ""} 2026</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {p.pool.slice(0, 5).map((c) => (
              <ChampIcon key={c.champion} id={c.champion} size={26} title={`${c.champion} · mastery ${c.mastery}`} />
            ))}
          </div>
        </>
      ) : (
        <div className="muted">Nobody in this role</div>
      )}
    </div>
  );
}

function TacticsPanel({ tactics }: { tactics: Tactics }) {
  const { act, busy } = useCareer();
  const [draft, setDraft] = useState(tactics);
  const changed = JSON.stringify(draft) !== JSON.stringify(tactics);
  const options: { key: keyof Tactics; label: string; values: { v: string; t: string }[] }[] = [
    { key: "style", label: "Game plan", values: [{ v: "early", t: "Early game" }, { v: "balanced", t: "Balanced" }, { v: "scaling", t: "Scaling" }] },
    { key: "lane", label: "Jungle focus", values: [{ v: "top", t: "Top" }, { v: "mid", t: "Mid" }, { v: "bot", t: "Bot" }] },
    { key: "objectives", label: "Objectives", values: [{ v: "dragons", t: "Dragons" }, { v: "balanced", t: "Balanced" }, { v: "barons", t: "Grubs & Baron" }] },
  ];
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Tactics</span>
      </div>
      <div className="panel-body stack" style={{ gap: 12 }}>
        {options.map((o) => (
          <div key={o.key} className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">{o.label}</span>
            <div className="tabs">
              {o.values.map((v) => (
                <button key={v.v} className={cx("tab", draft[o.key] === v.v && "active")} onClick={() => setDraft({ ...draft, [o.key]: v.v })}>
                  {v.t}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          A game plan that matches your champions' power curve is worth about a point of team strength.
        </p>
        <button className="btn btn-primary" disabled={!changed || busy} onClick={() => act({ type: "set_tactics", tactics: draft })}>
          Save tactics
        </button>
      </div>
    </section>
  );
}

function LineupPanel({ squad }: { squad: SquadView }) {
  const { act, busy } = useCareer();
  const [lineup, setLineup] = useState(squad.lineup as Record<Role, string>);
  const changed = JSON.stringify(lineup) !== JSON.stringify(squad.lineup);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Starting five</span>
      </div>
      <div className="panel-body stack" style={{ gap: 8 }}>
        {ROLES.map((r) => (
          <label key={r} className="row" style={{ gap: 8 }}>
            <RoleTag role={r} />
            <select className="select" style={{ flex: 1 }} value={lineup[r]} onChange={(e) => setLineup({ ...lineup, [r]: e.target.value })}>
              {squad.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role} {p.overall})
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="btn btn-primary" disabled={!changed || busy} onClick={() => act({ type: "set_lineup", lineup })}>
          Save lineup
        </button>
      </div>
    </section>
  );
}
