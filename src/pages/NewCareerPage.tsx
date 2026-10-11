import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, ApiError } from "../api/client";
import { ChampIcon, Flag, Ovr, RoleTag, TeamBadge } from "../components/Bits";
import { cx, money, ordinal, vars } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCatalog } from "../state/catalog";
import styles from "./Pages.module.css";

export function NewCareerPage() {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [region, setRegion] = useState(catalog.regions[2]?.id ?? catalog.regions[0].id);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [manager, setManager] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const league = catalog.regions.find((r) => r.id === region)!.league;
  const teams = useMemo(() => catalog.teams.filter((t) => t.league === league), [catalog.teams, league]);
  const tierTwo = catalog.leagues.filter((lg) => lg.region === region && lg.tier === 2);
  const preview = useApi(() => (teamId ? api.teamPreview(teamId) : Promise.resolve(null)), [teamId]);

  async function start() {
    if (!teamId) return;
    setStarting(true);
    setError(null);
    try {
      const career = await api.createCareer(manager || "Manager", teamId);
      navigate(`/career/${career.id}/draft`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the career");
      setStarting(false);
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 18 }}>
        <Link to="/" className="btn btn-ghost btn-small">
          ← Back
        </Link>
      </div>
      <div className="eyebrow">New career</div>
      <h1 className="display" style={{ marginBottom: 18 }}>
        Choose your team
      </h1>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {catalog.regions.map((r) => (
          <button
            key={r.id}
            className={cx("tab", r.id === region && "active")}
            onClick={() => {
              setRegion(r.id);
              setTeamId(null);
            }}
          >
            {r.league} · {r.name}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Draft pool: every {league} player who is not a franchise player
        {tierTwo.length > 0 && <> plus {tierTwo.map((lg) => lg.name).join(", ")}</>}.
      </p>

      <div className="grid-main-side">
        <div className={styles.teamGrid}>
          {teams.map((t) => (
            <button
              key={t.id}
              className={cx("panel", styles.teamCard, t.id === teamId && styles.selected)}
              style={vars({ "--team": t.color })}
              onClick={() => setTeamId(t.id)}
            >
              <div className="row">
                <TeamBadge team={{ ...t }} size="lg" />
                <span className="spacer" />
                <span className="muted">
                  {ordinal(t.rank)} in 2026 · {t.wins}-{t.losses}
                </span>
              </div>
              <div className={styles.teamName}>{t.name}</div>
              {t.franchise && (
                <div className={styles.franchise}>
                  <span className="eyebrow">Franchise</span>
                  <span className={styles.franchiseName}>
                    <Flag country={t.franchise.country} /> {t.franchise.name}
                  </span>
                  <RoleTag role={t.franchise.role} />
                  <Ovr value={t.franchise.overall} />
                </div>
              )}
              <div className={styles.prestige}>
                <span className="muted">Prestige</span>
                <span className={styles.prestigeBar}>
                  <span style={{ width: `${t.prestige}%` }} />
                </span>
              </div>
            </button>
          ))}
        </div>

        <aside className="panel">
          {!teamId && <div className="empty">Pick a team to see who you keep and who goes into the draft.</div>}
          {teamId && preview.data && (
            <>
              <div className="panel-head">
                <TeamBadge team={{ ...preview.data }} name />
              </div>
              <div className="panel-body stack">
                {preview.data.franchise && (
                  <div>
                    <div className="eyebrow">You keep</div>
                    <div className={styles.keep}>
                      <Ovr value={preview.data.franchise.overall} size="lg" />
                      <div>
                        <div className={styles.keepName}>
                          <Flag country={preview.data.franchise.country} /> {preview.data.franchise.name}
                        </div>
                        <div className="row">
                          <RoleTag role={preview.data.franchise.role} />
                          <span className="muted">{money(preview.data.franchise.salary)} a season</span>
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      {preview.data.franchise.signatures.map((c) => (
                        <ChampIcon key={c} id={c} size={30} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="eyebrow">Released into the draft</div>
                  <table className="table">
                    <tbody>
                      {preview.data.roster_2026
                        .filter((p) => p.id !== preview.data!.franchise?.id)
                        .map((p) => (
                          <tr key={p.id} className={cx(!p.starter && "dim")}>
                            <td>
                              <RoleTag role={p.role} />
                            </td>
                            <td>
                              <Flag country={p.country} /> {p.name}
                            </td>
                            <td className="num">
                              <Ovr value={p.overall} size="sm" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="muted">
                  {preview.data.pool_size} players in the {league} region pool.
                </div>
                <label className="stack" style={{ gap: 6 }}>
                  <span className="eyebrow">Manager name</span>
                  <input className="input" value={manager} placeholder="Your name" onChange={(e) => setManager(e.target.value)} />
                </label>
                {error && <div className="error-box">{error}</div>}
                <button className="btn btn-gold btn-block" disabled={starting} onClick={start}>
                  {starting ? "Drafting the other regions…" : `Take over ${preview.data.tag}`}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
