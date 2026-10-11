import { Link } from "react-router-dom";

import { api } from "../api/client";
import { Loading, TeamBadge } from "../components/Bits";
import { cx, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function CompetitionsScreen() {
  const { career, revision } = useCareer();
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  if (career.phase === "draft") return <div className="empty">Competitions are scheduled once the draft is done.</div>;
  if (!comps.data) return <Loading />;
  const rows = comps.data;

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">Season {career.season}</div>
          <h1 className="screen-title">Competitions</h1>
        </div>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Dates</th>
              <th>Competition</th>
              <th>Status</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={cx(c.mine && "mine", c.kind === "international" && "intl")}>
                <td className="muted">
                  {shortDate(c.start)} – {shortDate(c.end)}
                </td>
                <td>
                  <Link className="link" to={`/career/${career.id}/competitions/${c.id}`} style={{ fontWeight: c.kind === "international" ? 800 : 600 }}>
                    {c.name}
                  </Link>
                  {c.kind === "international" && <span className="chip chip-gold" style={{ marginLeft: 8 }}>International</span>}
                </td>
                <td>
                  <span className={cx("chip", c.status === "running" && "chip-teal")}>{c.status}</span>
                </td>
                <td>{c.winner ? <TeamBadge team={c.winner} name size="sm" /> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel-body muted" style={{ fontSize: 13 }}>
          First Stand, MSI and Worlds are announced when every region has finished the split before them.
        </div>
      </section>
    </div>
  );
}
