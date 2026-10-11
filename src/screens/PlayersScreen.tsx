import { useState } from "react";

import { api } from "../api/client";
import type { Role } from "../api/types";
import { ChampIcon, Flag, Loading, Ovr, PlayerLink, RoleTag } from "../components/Bits";
import { cx, money, ROLES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";

export function PlayersScreen() {
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const [region, setRegion] = useState(career.region);
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [freeAgents, setFreeAgents] = useState(false);
  const players = useApi(
    () => api.players(career.id, { region: region === "ALL" ? undefined : region, role: role === "ALL" ? undefined : role, freeAgents, limit: 250 }),
    [career.id, revision, region, role, freeAgents],
  );
  const teamTag = (id: string | null) => (id ? catalog.teams.find((t) => t.id === id)?.tag ?? id : null);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">Scouting</div>
          <h1 className="screen-title">Players</h1>
        </div>
        <div className="row">
          <select className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="ALL">Every region</option>
            {catalog.regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="tabs">
            {(["ALL", ...ROLES] as const).map((r) => (
              <button key={r} className={cx("tab", role === r && "active")} onClick={() => setRole(r)}>
                {r}
              </button>
            ))}
          </div>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={freeAgents} onChange={(e) => setFreeAgents(e.target.checked)} />
            <span className="muted">Free agents only</span>
          </label>
        </div>
      </div>
      <section className="panel">
        {!players.data ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>2026</th>
                  <th className="num">OVR</th>
                  <th className="num">POT</th>
                  <th className="num">Salary</th>
                  <th>Signatures</th>
                </tr>
              </thead>
              <tbody>
                {players.data.map((p) => (
                  <tr key={p.id} className={cx(p.team === career.team.id && "mine")}>
                    <td>
                      <RoleTag role={p.role} />
                    </td>
                    <td>
                      <Flag country={p.country} /> <PlayerLink careerId={career.id} id={p.id} name={p.name} />
                    </td>
                    <td>{teamTag(p.team) ?? <span className="muted">free agent</span>}</td>
                    <td className="muted">
                      {p.origin?.tag} · {p.league}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
