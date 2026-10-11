import type { GameRecord, PlayerLine, Side, TeamRef } from "../api/types";
import { clock, cx, ROLES } from "../lib/format";
import { useCareer } from "../state/career";
import { ChampIcon, PlayerLink, TeamBadge } from "./Bits";
import styles from "./GameReport.module.css";

/** Final scoreboard of one game: objectives, picks and bans, every player's line. */
export function GameReport({ game, teams }: { game: GameRecord; teams: Record<string, TeamRef | null> }) {
  const blue = teams[game.blue];
  const red = teams[game.red];
  const maxDamage = Math.max(...game.players.map((p) => p.damage));
  return (
    <div className={styles.report}>
      <div className={styles.header}>
        <SideHead team={blue} side="blue" won={game.winner === game.blue} />
        <div className={styles.center}>
          <div className={styles.kills}>
            <span className="side-blue">{game.kills[0]}</span>
            <span className="muted">⚔</span>
            <span className="side-red">{game.kills[1]}</span>
          </div>
          <div className="muted">{clock(game.duration)}</div>
        </div>
        <SideHead team={red} side="red" won={game.winner === game.red} />
      </div>

      <div className={styles.objectives}>
        <Objective label="Gold" blue={`${(game.gold[0] / 1000).toFixed(1)}k`} red={`${(game.gold[1] / 1000).toFixed(1)}k`} />
        <Objective label="Towers" blue={game.towers[0]} red={game.towers[1]} />
        <Objective label="Dragons" blue={game.dragons[0]} red={game.dragons[1]} />
        <Objective label="Barons" blue={game.barons[0]} red={game.barons[1]} />
      </div>

      <div className={styles.bans}>
        <div className="row" style={{ gap: 4 }}>
          <span className="eyebrow">Bans</span>
          {game.blue_bans.map((c) => (
            <ChampIcon key={c} id={c} size={24} dim />
          ))}
        </div>
        <div className="row" style={{ gap: 4 }}>
          {game.red_bans.map((c) => (
            <ChampIcon key={c} id={c} size={24} dim />
          ))}
        </div>
      </div>

      <div className={styles.boards}>
        {(["blue", "red"] as Side[]).map((side) => {
          const team = side === "blue" ? game.blue : game.red;
          const lines = ROLES.map((r) => game.players.find((p) => p.team === team && p.role === r)).filter((p): p is PlayerLine => !!p);
          return (
            <table key={side} className={cx("table", styles.board)}>
              <thead>
                <tr>
                  <th className={`side-${side}`}>{side}</th>
                  <th>Player</th>
                  <th className="num">K / D / A</th>
                  <th className="num">CS</th>
                  <th>Damage</th>
                  <th className="num">Rating</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((p) => (
                  <PlayerRow key={p.player} p={p} mvp={game.mvp === p.player} maxDamage={maxDamage} />
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}

function SideHead({ team, side, won }: { team: TeamRef | null; side: Side; won: boolean }) {
  return (
    <div className={cx(styles.sideHead, side === "red" && styles.right)}>
      <span className={cx("chip", side === "blue" ? "chip-teal" : "chip-red")}>{side}</span>
      <TeamBadge team={team} name size="lg" />
      {won && <span className="chip chip-gold">Victory</span>}
    </div>
  );
}

function Objective({ label, blue, red }: { label: string; blue: string | number; red: string | number }) {
  return (
    <div className={styles.objective}>
      <span className="side-blue">{blue}</span>
      <span className="eyebrow">{label}</span>
      <span className="side-red">{red}</span>
    </div>
  );
}

function PlayerRow({ p, mvp, maxDamage }: { p: PlayerLine; mvp: boolean; maxDamage: number }) {
  const { career } = useCareer();
  return (
    <tr>
      <td>
        <ChampIcon id={p.champion} size={28} />
      </td>
      <td>
        <PlayerLink careerId={career.id} id={p.player} name={p.name} /> {mvp && <span className="chip chip-gold">MVP</span>}
      </td>
      <td className="num">
        {p.kills} / <span className="loss">{p.deaths}</span> / {p.assists}
      </td>
      <td className="num muted">{p.cs}</td>
      <td>
        <span className={styles.dmg}>
          <span style={{ width: `${(p.damage / maxDamage) * 100}%` }} />
        </span>
        <span className="muted" style={{ fontSize: 11 }}>
          {(p.damage / 1000).toFixed(1)}k
        </span>
      </td>
      <td className={cx("num", p.rating >= 7.5 ? "gain" : p.rating < 6 ? "loss" : undefined)}>{p.rating.toFixed(1)}</td>
    </tr>
  );
}
