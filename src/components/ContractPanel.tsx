import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { PlayerDetail } from "../api/types";
import { cx, money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

/** Sign a free agent, extend one of your own players, or release them. */
export function ContractPanel({ player }: { player: PlayerDetail }) {
  const { career, act, busy, revision } = useCareer();
  const mine = player.team === career.team.id;
  const talks = useApi(() => api.negotiation(career.id, player.id), [career.id, player.id, revision]);
  const [salary, setSalary] = useState(0);
  const [years, setYears] = useState(2);
  const [confirmRelease, setConfirmRelease] = useState(false);

  useEffect(() => {
    if (talks.data && salary === 0) {
      setSalary(Math.round((talks.data.asking * 0.9) / 5) * 5);
      setYears(talks.data.years);
    }
  }, [talks.data, salary]);

  if (player.team && !mine) return null;
  const t = talks.data;
  if (!t) return null;
  const expiring = mine && player.contract_until !== null && player.contract_until <= career.season;

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">{mine ? "Contract" : "Sign this player"}</span>
        {mine && <span className="muted">{money(player.salary)} until {player.contract_until}</span>}
      </div>
      <div className="panel-body stack" style={{ gap: 10 }}>
        {(!mine || expiring) && (
          <>
            <div className="muted">{t.hint}</div>
            {t.problem ? (
              <div className="error-box">{t.problem}</div>
            ) : (
              <>
                <div className="row">
                  <label className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Salary a season (k$)</span>
                    <input className="input" type="number" min={15} step={5} value={salary} onChange={(e) => setSalary(Number(e.target.value))} style={{ width: 130 }} />
                  </label>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Seasons</span>
                    <div className="tabs">
                      {[1, 2, 3].map((y) => (
                        <button key={y} className={cx("tab", years === y && "active")} onClick={() => setYears(y)}>
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Room in your budget: {money(t.budget_room)} · {t.rounds_left} round{t.rounds_left === 1 ? "" : "s"} of talks left
                </div>
                <div className="row">
                  <button className="btn btn-primary" disabled={busy || salary > t.budget_room} onClick={() => act({ type: "offer", player: player.id, salary, years })}>
                    {mine ? "Offer extension" : "Make offer"}
                  </button>
                  {t.counter !== null && (
                    <button className="btn btn-gold" disabled={busy || t.counter > t.budget_room} onClick={() => act({ type: "accept_counter", player: player.id })}>
                      Accept {money(t.counter)} × {t.counter_years}
                    </button>
                  )}
                </div>
              </>
            )}
            {t.message && <div style={{ fontWeight: 600 }}>{t.message}</div>}
          </>
        )}
        {mine && !expiring && <div className="muted">Signed through {player.contract_until}. Talks open in the contract's last season.</div>}
        {mine && (
          <div className="row">
            {!confirmRelease ? (
              <button className="btn btn-ghost btn-small" onClick={() => setConfirmRelease(true)}>
                Release…
              </button>
            ) : (
              <>
                <span className="muted">Pays half the remaining contract as severance.</span>
                <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act({ type: "release", player: player.id })}>
                  Confirm release
                </button>
                <button className="btn btn-ghost btn-small" onClick={() => setConfirmRelease(false)}>
                  Keep
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
