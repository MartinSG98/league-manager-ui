import type { MatchSummary } from "../api/types";
import { cx, longDate } from "../lib/format";
import { TeamBadge } from "./Bits";
import styles from "./MatchCard.module.css";

/** Two teams, the score once there is one, and when and what it is. */
export function MatchCard({ match, mine }: { match: MatchSummary; mine?: string }) {
  const [h, a] = match.score;
  const played = match.games > 0;
  return (
    <div className={styles.card}>
      <div className={cx(styles.side, match.winner && match.winner !== match.home?.id && styles.lost)}>
        <TeamBadge team={match.home} name size="lg" />
      </div>
      <div className={styles.middle}>
        {played ? (
          <div className={styles.score}>
            <span className={cx(mine && match.home?.id === mine && (h > a ? "gain" : "loss"))}>{h}</span>
            <span className="muted">–</span>
            <span className={cx(mine && match.away?.id === mine && (a > h ? "gain" : "loss"))}>{a}</span>
          </div>
        ) : (
          <div className={styles.vs}>vs</div>
        )}
        <div className="muted">
          Bo{match.best_of}
          {match.fearless && " · fearless"}
        </div>
      </div>
      <div className={cx(styles.side, styles.right, match.winner && match.winner !== match.away?.id && styles.lost)}>
        <TeamBadge team={match.away} name size="lg" />
      </div>
      <div className={styles.foot}>
        {match.label} · {longDate(match.day)}
      </div>
    </div>
  );
}
