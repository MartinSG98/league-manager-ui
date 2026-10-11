import { Link } from "react-router-dom";

import { api } from "../api/client";
import { Loading, TeamBadge } from "../components/Bits";
import { cx, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function ScheduleScreen() {
  const { career, revision } = useCareer();
  const schedule = useApi(() => api.schedule(career.id), [career.id, revision]);
  if (career.phase === "draft") return <div className="empty">The schedule is made once the draft is done.</div>;
  if (!schedule.data) return <Loading />;
  const me = career.team.id;
  const played = schedule.data.filter((m) => m.winner);
  const wins = played.filter((m) => m.winner === me).length;

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">
            {wins}-{played.length - wins} in series this season
          </div>
          <h1 className="screen-title">Schedule</h1>
        </div>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Competition</th>
              <th>Round</th>
              <th>Opponent</th>
              <th className="num">Result</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {schedule.data.map((m) => {
              const home = m.home?.id === me;
              const opponent = home ? m.away : m.home;
              const [us, them] = home ? m.score : [m.score[1], m.score[0]];
              const won = m.winner === me;
              return (
                <tr key={m.id} className={cx(m.id === career.live?.match && "mine")}>
                  <td>{shortDate(m.day)}</td>
                  <td className="muted">{m.competition_name}</td>
                  <td className="muted">{m.label}</td>
                  <td>
                    <TeamBadge team={opponent} name size="sm" />
                  </td>
                  <td className="num">
                    {m.winner ? (
                      <strong className={won ? "gain" : "loss"}>
                        {won ? "W" : "L"} {us}-{them}
                      </strong>
                    ) : (
                      <span className="muted">Bo{m.best_of}</span>
                    )}
                  </td>
                  <td className="num">
                    {m.games > 0 && (
                      <Link className="link muted" to={`/career/${career.id}/matches/${m.id}`}>
                        Report →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
