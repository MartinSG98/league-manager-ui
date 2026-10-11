import { Link } from "react-router-dom";

import type { StageView } from "../api/types";
import { cx } from "../lib/format";
import { TeamBadge } from "./Bits";

/** Round robin or Swiss tables of a stage, the line where teams advance drawn under the cut. */
export function StandingsTable({ stage, mine, careerId }: { stage: StageView; mine: string; careerId: string }) {
  if (stage.tables.length === 0) {
    return <div className="empty">This stage is a bracket; open the competition for the full view.</div>;
  }
  const perGroup = stage.tables.length > 1 ? stage.advance / stage.tables.length : stage.advance;
  return (
    <div className="stack" style={{ gap: 0 }}>
      {stage.tables.map((table, ti) => (
        <div key={ti}>
          {table.name && <div className="eyebrow" style={{ padding: "10px 16px 0" }}>{table.name}</div>}
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th className="num">W</th>
                <th className="num">L</th>
                {stage.kind !== "swiss" && <th className="num">Games</th>}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={row.team.id} className={cx(row.team.id === mine && "mine")}
                  style={i + 1 === perGroup ? { boxShadow: "inset 0 -2px 0 var(--gold-deep)" } : undefined}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <Link className="link" to={`/career/${careerId}/team/${row.team.id}`}>
                      <TeamBadge team={row.team} name size="sm" />
                    </Link>
                  </td>
                  <td className="num">{row.wins}</td>
                  <td className="num">{row.losses}</td>
                  {stage.kind !== "swiss" && (
                    <td className="num muted">
                      {row.game_wins}-{row.game_losses}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
