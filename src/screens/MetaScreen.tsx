import { useState } from "react";

import { api } from "../api/client";
import type { Role } from "../api/types";
import { ChampIcon, Loading } from "../components/Bits";
import { cx, longDate, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const TIER_COLOR: Record<string, string> = {
  S: "var(--band-elite)",
  A: "var(--band-good)",
  B: "var(--band-decent)",
  C: "var(--band-weak)",
  D: "var(--text-muted)",
};

export function MetaScreen() {
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const meta = useApi(() => api.meta(career.id), [career.id, revision]);
  const [role, setRole] = useState<Role>("MID");
  if (!meta.data) return <Loading />;
  const m = meta.data;
  const inRole = m.champions.filter((c) => c.roles.includes(role));

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">
            Patch {m.version}
            {m.next_patch && ` · next patch ${longDate(m.next_patch)}`}
          </div>
          <h1 className="screen-title">The meta</h1>
        </div>
        <div className="tabs">
          {ROLES.map((r) => (
            <button key={r} className={cx("tab", role === r && "active")} onClick={() => setRole(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid-main-side">
        <section className="panel">
          {TIERS.map((tier) => {
            const champs = inRole.filter((c) => c.tier === tier);
            if (champs.length === 0) return null;
            return (
              <div key={tier} className="row" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", alignItems: "flex-start" }}>
                <span style={{ width: 34, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: TIER_COLOR[tier] }}>{tier}</span>
                <div className="row" style={{ flex: 1, gap: 6 }}>
                  {champs.map((c) => (
                    <span key={c.champion} title={`${c.name}: power ${signed(c.power, 1)}, ${c.picks} picks and ${c.bans} bans this patch`}>
                      <ChampIcon id={c.champion} size={42} />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">Patch notes</span>
          </div>
          {m.history.length === 0 && <div className="empty">The first patch of the season lands on January 6th.</div>}
          {m.history.map((p) => (
            <div key={p.version} className="panel-body" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="eyebrow">{longDate(p.day)}</div>
              <div style={{ fontWeight: 800, margin: "4px 0 8px" }}>{p.headline}</div>
              <div className="stack" style={{ gap: 4 }}>
                {p.changes.map((c) => (
                  <div key={c.champion} className="row" style={{ gap: 8, fontSize: 13 }}>
                    <ChampIcon id={c.champion} size={22} />
                    <span style={{ flex: 1 }}>{c.note}</span>
                    <span className={c.delta > 0 ? "gain" : "loss"}>{c.delta > 0 ? "buff" : "nerf"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="panel-body muted" style={{ fontSize: 13 }}>
            {m.games} pro games played on this patch. {catalog.champions.length} champions in the game.
          </div>
        </section>
      </div>
    </div>
  );
}
