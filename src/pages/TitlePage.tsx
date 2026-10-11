import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { TeamBadge } from "../components/Bits";
import { longDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCatalog } from "../state/catalog";
import styles from "./Pages.module.css";

export function TitlePage() {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const saves = useApi(() => api.saves(), []);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.deleteCareer(id);
      saves.reload();
    } finally {
      setDeleting(null);
    }
  }

  const players = catalog.leagues.reduce((n, lg) => n + lg.players, 0);

  return (
    <div className={styles.title}>
      <div className={styles.hero}>
        <div className="eyebrow">League of Legends esports manager</div>
        <h1 className={styles.wordmark}>League Manager</h1>
        <p className="lead">
          Take over one of {catalog.teams.length} tier-one teams. Keep your franchise player, draft the rest from {players}{" "}
          real 2026 pros across {catalog.leagues.length} leagues, then manage the whole season: three splits, First Stand, MSI
          and Worlds, with a new patch every two weeks.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 26 }}>
          <Link to="/new" className="btn btn-gold">
            New career
          </Link>
        </div>
      </div>

      {saves.data && saves.data.length > 0 && (
        <section className={`panel ${styles.saves}`}>
          <div className="panel-head">
            <span className="panel-title">Continue a career</span>
          </div>
          <table className="table">
            <tbody>
              {saves.data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <TeamBadge team={s.team} name />
                  </td>
                  <td className="muted">{s.manager}</td>
                  <td>
                    Season {s.season} · {longDate(s.day)}
                  </td>
                  <td>
                    <span className="chip">{s.phase}</span>
                  </td>
                  <td className="num">
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="btn btn-primary btn-small" onClick={() => navigate(`/career/${s.id}`)}>
                        Continue
                      </button>
                      <button className="btn btn-ghost btn-small" disabled={deleting === s.id} onClick={() => remove(s.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className={`muted ${styles.legal}`}>
        A fan project, not affiliated with or endorsed by Riot Games. Player data from gol.gg. Patch {catalog.patch}.
      </p>
    </div>
  );
}
