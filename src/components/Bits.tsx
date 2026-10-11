import { useState } from "react";
import { Link } from "react-router-dom";

import type { Role, TeamRef } from "../api/types";
import { iconUrl } from "../lib/art";
import { attributeBand, cx, flag, ratingBand, vars } from "../lib/format";
import { useCatalog } from "../state/catalog";
import styles from "./Bits.module.css";

/** A team's tag on its colour, optionally with the full name next to it. */
export function TeamBadge({ team, name = false, size = "md" }: { team: TeamRef | null; name?: boolean; size?: "sm" | "md" | "lg" }) {
  if (!team) return <span className="muted">TBD</span>;
  return (
    <span className={cx(styles.team, styles[size])} style={vars({ "--team": team.color })}>
      <span className={styles.tag}>{team.tag}</span>
      {name && <span className={styles.teamName}>{team.name}</span>}
    </span>
  );
}

/** Champion portrait from Data Dragon, falling back to initials if the image fails. */
export function ChampIcon({ id, size = 32, dim = false, title }: { id: string; size?: number; dim?: boolean; title?: string }) {
  const { patch, champion } = useCatalog();
  const [failed, setFailed] = useState(false);
  const name = champion[id]?.name ?? id;
  return (
    <span className={cx(styles.champ, dim && styles.dim)} style={{ width: size, height: size }} title={title ?? name}>
      {failed ? (
        <span className={styles.champFallback}>{name.slice(0, 2)}</span>
      ) : (
        <img src={iconUrl(patch, id)} alt={name} width={size} height={size} loading="lazy" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

export function RoleTag({ role }: { role: Role }) {
  return <span className={cx(styles.role, styles[`role${role}`])}>{role}</span>;
}

export function Ovr({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  return <span className={cx(styles.ovr, styles[size], `band-${ratingBand(value)}`)}>{value}</span>;
}

export function AttrBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.attr}>
      <span className={styles.attrLabel}>{label}</span>
      <span className={styles.attrTrack}>
        <span className={cx(styles.attrFill, styles[`fill-${attributeBand(value)}`])} style={{ width: `${(value / 20) * 100}%` }} />
      </span>
      <span className={cx(styles.attrValue, `band-${attributeBand(value)}`)}>{value}</span>
    </div>
  );
}

export function Flag({ country }: { country: string | null }) {
  if (!country) return null;
  return (
    <span className={styles.flag} title={country}>
      {flag(country)}
    </span>
  );
}

export function PlayerLink({ careerId, id, name }: { careerId: string; id: string; name: string }) {
  return (
    <Link className="link" to={`/career/${careerId}/player/${id}`}>
      {name}
    </Link>
  );
}

/** -3..+3 form as a small arrow. */
export function Form({ value }: { value: number }) {
  const label = value >= 1 ? "▲" : value <= -1 ? "▼" : "▬";
  return (
    <span className={cx(styles.form, value >= 1 ? "gain" : value <= -1 ? "loss" : "muted")} title={`Form ${value.toFixed(1)}`}>
      {label}
    </span>
  );
}

export function Meter({ value, max = 100, tone = "teal" }: { value: number; max?: number; tone?: "teal" | "gold" | "red" | "green" }) {
  return (
    <span className={styles.meter}>
      <span className={cx(styles.meterFill, styles[`tone-${tone}`])} style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%` }} />
    </span>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return <div className="empty">{text}</div>;
}
