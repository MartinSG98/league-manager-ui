import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { TeamBadge } from "../components/Bits";
import { cx, longDate, money } from "../lib/format";
import { useCareer } from "../state/career";
import styles from "./CareerLayout.module.css";

export function CareerLayout() {
  const { career, act, busy, error, clearError } = useCareer();
  const navigate = useNavigate();
  const base = `/career/${career.id}`;

  async function proceed() {
    if (career.phase === "draft") return navigate(`${base}/draft`);
    if (career.phase === "offseason") {
      const result = await act({ type: "next_season" });
      if (result) navigate(`${base}/draft`);
      return;
    }
    if (career.live) return navigate(`${base}/match`);
    const result = await act({ type: "advance" });
    if (result?.career.live) navigate(`${base}/match`);
  }

  let label = "Continue";
  if (career.phase === "draft") label = career.draft?.my_turn ? "Your pick" : "To the draft";
  else if (career.live) label = "Match day";
  else if (career.phase === "offseason") label = `Start ${career.season + 1}`;

  const items: { to: string; label: string; badge?: number | string; show?: boolean }[] = [
    { to: base, label: "Home" },
    { to: `${base}/inbox`, label: "Inbox", badge: career.unread || undefined },
    { to: `${base}/draft`, label: "Draft", show: career.phase === "draft", badge: career.draft?.my_turn ? "!" : undefined },
    { to: `${base}/match`, label: "Match day", show: !!career.live, badge: "!" },
    { to: `${base}/squad`, label: "Squad" },
    { to: `${base}/schedule`, label: "Schedule" },
    { to: `${base}/competitions`, label: "Competitions" },
    { to: `${base}/players`, label: "Players" },
    { to: `${base}/meta`, label: "Meta & patches" },
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink to="/" className={styles.brand}>
          League Manager
        </NavLink>
        <div className={styles.club}>
          <TeamBadge team={career.team} size="lg" />
          <div className={styles.clubName}>{career.team.name}</div>
          <div className="muted">{career.manager}</div>
        </div>
        <nav className={styles.nav}>
          {items
            .filter((i) => i.show !== false)
            .map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === base} className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}>
                <span>{i.label}</span>
                {i.badge !== undefined && <span className={styles.badge}>{i.badge}</span>}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.date}>
            <span className="eyebrow">Season {career.season}</span>
            <span className={styles.day}>{longDate(career.day)}</span>
          </div>
          <div className={styles.stat}>
            <span className="eyebrow">Patch</span>
            <span>{career.patch}</span>
          </div>
          <div className={styles.stat}>
            <span className="eyebrow">Payroll</span>
            <span>
              {money(career.payroll)} <span className="muted">/ {money(career.budget)}</span>
            </span>
          </div>
          <div className={styles.stat}>
            <span className="eyebrow">Bank</span>
            <span className={career.cash < 0 ? "loss" : undefined}>{money(career.cash)}</span>
          </div>
          <span className="spacer" />
          <button className={cx("btn", career.live || career.draft?.my_turn ? "btn-gold" : "btn-primary", styles.continue)}
            disabled={busy} onClick={proceed}>
            {busy ? "Simulating…" : label} ▸
          </button>
        </header>
        {error && (
          <div className={styles.toast}>
            <span>{error}</span>
            <button className="btn btn-ghost btn-small" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
