import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { AttrBar, ChampIcon, Flag, Form, Loading, Meter, Ovr, RoleTag } from "../components/Bits";
import { ContractPanel } from "../components/ContractPanel";
import { ATTRIBUTE_NAMES, money, ROLE_NAMES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";

const STATS_2026: { key: string; label: string; digits?: number; pct?: boolean }[] = [
  { key: "games", label: "Games" },
  { key: "winrate", label: "Win rate", pct: true },
  { key: "kda", label: "KDA", digits: 1 },
  { key: "kills", label: "Kills / game", digits: 1 },
  { key: "deaths", label: "Deaths / game", digits: 1 },
  { key: "assists", label: "Assists / game", digits: 1 },
  { key: "csm", label: "CS / min", digits: 1 },
  { key: "kp", label: "Kill participation", pct: true },
  { key: "dmg_share", label: "Damage share", pct: true },
  { key: "dpm", label: "Damage / min" },
  { key: "vspm", label: "Vision / min", digits: 2 },
  { key: "gd15", label: "Gold diff @15" },
  { key: "csd15", label: "CS diff @15" },
  { key: "xpd15", label: "XP diff @15" },
  { key: "solo_kills", label: "Solo kills" },
];

export function PlayerScreen() {
  const { player } = useParams();
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const p = useApi(() => api.player(career.id, player!), [career.id, player, revision]);
  if (!p.data) return <Loading />;
  const d = p.data;
  const team = d.team ? catalog.teams.find((t) => t.id === d.team) : null;

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">
            {ROLE_NAMES[d.role]} · {d.origin ? `${d.origin.name} in 2026` : d.league}
          </div>
          <h1 className="screen-title" style={{ fontSize: 34 }}>
            <Flag country={d.country} /> {d.name}
          </h1>
          <div className="row" style={{ marginTop: 6 }}>
            <RoleTag role={d.role} />
            {team ? (
              <Link className="link" to={`/career/${career.id}/team/${team.id}`}>
                {team.name}
              </Link>
            ) : (
              <span className="chip">Free agent</span>
            )}
            {d.contract_until && <span className="muted">Contract to {d.contract_until}</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 26 }}>
          <div className="stack" style={{ gap: 0, alignItems: "center" }}>
            <span className="eyebrow">Overall</span>
            <Ovr value={d.overall} size="lg" />
          </div>
          <div className="stack" style={{ gap: 0, alignItems: "center" }}>
            <span className="eyebrow">Potential</span>
            <Ovr value={d.potential} size="lg" />
          </div>
          <div className="stack" style={{ gap: 0 }}>
            <span className="eyebrow">{d.contract_until ? "Salary" : "Market value"}</span>
            <strong style={{ fontSize: 20 }}>{money(d.salary)}</strong>
          </div>
        </div>
      </div>

      {career.phase !== "draft" || d.team === career.team.id ? (
        <div style={{ marginBottom: 18 }}>
          <ContractPanel player={d} />
        </div>
      ) : null}

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">Attributes</span>
          </div>
          <div className="panel-body stack" style={{ gap: 9 }}>
            {Object.keys(ATTRIBUTE_NAMES).map((a) => (
              <AttrBar key={a} label={ATTRIBUTE_NAMES[a]} value={d.attributes[a]} />
            ))}
            <div style={{ borderTop: "1px solid var(--line)", margin: "6px 0" }} />
            <AttrBar label="Aggression" value={d.aggression} />
            <AttrBar label="Leadership" value={d.leadership} />
            <div className="row" style={{ marginTop: 6 }}>
              <span className="muted">Speaks</span>
              {d.languages.map((l) => (
                <span key={l} className="chip">
                  {l}
                </span>
              ))}
            </div>
            <div className="row">
              <span className="muted">Form</span> <Form value={d.form} />
              <span className="muted">Morale</span> <Meter value={d.morale} tone={d.morale >= 60 ? "green" : "red"} />
              <span className="muted">Fatigue</span> <Meter value={d.fatigue} tone="red" />
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {d.experience} career games · reputation {d.reputation}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">Champion pool</span>
            <span className="muted">mastery · meta on patch {career.patch}</span>
          </div>
          <table className="table">
            <tbody>
              {d.pool.map((c) => (
                <tr key={c.champion}>
                  <td style={{ width: 40 }}>
                    <ChampIcon id={c.champion} size={30} />
                  </td>
                  <td>{catalog.champion[c.champion]?.name ?? c.champion}</td>
                  <td className="num muted">{c.games} games</td>
                  <td className="num muted">{c.winrate !== null ? `${c.winrate}%` : ""}</td>
                  <td>
                    <Meter value={c.mastery} tone="gold" />
                  </td>
                  <td className={c.meta >= 0 ? "num gain" : "num loss"}>{signed(c.meta, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">2026 season</span>
            <span className="muted">all competitions</span>
          </div>
          <table className="table">
            <tbody>
              {STATS_2026.map((s) => {
                const raw = d.stats_2026[s.key];
                const value = typeof raw === "number" ? (s.digits ? raw.toFixed(s.digits) : String(Math.round(raw))) : "—";
                return (
                  <tr key={s.key}>
                    <td className="muted">{s.label}</td>
                    <td className="num">
                      {value}
                      {s.pct && typeof raw === "number" ? "%" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">This season</span>
          </div>
          {d.season.games === 0 ? (
            <div className="empty">No games yet.</div>
          ) : (
            <div className="panel-body stack" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 22 }}>
                <span>
                  <span className="muted">Games</span> <strong>{d.season.games}</strong>
                </span>
                <span>
                  <span className="muted">Won</span> <strong>{d.season.wins}</strong>
                </span>
                <span>
                  <span className="muted">KDA</span> <strong>{d.season.kda}</strong>
                </span>
                <span>
                  <span className="muted">CS/min</span> <strong>{d.season.cs_per_min}</strong>
                </span>
                <span>
                  <span className="muted">Avg rating</span> <strong>{d.season.rating}</strong>
                </span>
                <span>
                  <span className="muted">MVPs</span> <strong>{d.season.mvps}</strong>
                </span>
              </div>
              <div className="row">
                {d.season.champions.map(([c, n]) => (
                  <span key={c} className="row" style={{ gap: 4 }}>
                    <ChampIcon id={c} size={26} />
                    <span className="muted">×{n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
