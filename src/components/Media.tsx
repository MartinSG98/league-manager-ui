import { Avatar, Box, Group, Text, Tooltip } from "@mantine/core";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import type { Role, TeamRef } from "../api/types";
import { championIcon, championLoading, championSplash, roleIcon } from "../lib/art";
import { ROLE_NAMES } from "../lib/format";
import { useCatalog } from "../state/catalog";
import { Img } from "./Img";
import classes from "./Media.module.css";

type Team = Pick<TeamRef, "tag" | "color" | "logo"> & Partial<TeamRef>;

/** A team's logo, or its tag on the team colour when there is none. */
export function TeamLogo({ team, size = 28 }: { team: Team | null | undefined; size?: number }) {
  if (!team) return <Box w={size} h={size} className={classes.tbd} />;
  const tag = (
    <span className={classes.tag} style={{ "--team": team.color, fontSize: Math.max(9, size * 0.32) } as CSSProperties}>
      {team.tag}
    </span>
  );
  return (
    <Box w={size} h={size} className={classes.logo}>
      <Img sources={[team.logo]} fallback={tag} alt={team.tag} loading="lazy" />
    </Box>
  );
}

/** Logo plus name (or tag), optionally linking to the team page. */
export function TeamName({ team, size = 24, short = false, careerId, fw = 600 }: { team: TeamRef | null | undefined; size?: number; short?: boolean; careerId?: string; fw?: number }) {
  if (!team) {
    return (
      <Text c="dimmed" fz="sm">
        TBD
      </Text>
    );
  }
  const label = (
    <Text fw={fw} fz="sm" truncate>
      {short ? team.tag : team.name}
    </Text>
  );
  return (
    <Group gap={8} wrap="nowrap" miw={0}>
      <TeamLogo team={team} size={size} />
      {careerId ? (
        <Link className="link" to={`/career/${careerId}/team/${team.id}`} style={{ minWidth: 0 }}>
          {label}
        </Link>
      ) : (
        label
      )}
    </Group>
  );
}

export function LeagueLogo({ logo, name, size = 28 }: { logo: string | null | undefined; name: string; size?: number }) {
  return (
    <Box w={size} h={size} className={classes.logo}>
      <Img
        sources={[logo]}
        alt={name}
        fallback={
          <Text fz={10} fw={800} c="gold.4">
            {name.slice(0, 4)}
          </Text>
        }
      />
    </Box>
  );
}

/** Round player photo with initials when there is no photo. */
export function PlayerPhoto({ photo, name, size = 32, ring }: { photo: string | null | undefined; name: string; size?: number; ring?: string }) {
  return (
    <Avatar
      src={photo ?? null}
      name={name}
      color="initials"
      size={size}
      radius="xl"
      className={classes.photo}
      style={ring ? ({ "--ring": ring } as CSSProperties) : undefined}
      data-ring={ring ? true : undefined}
    />
  );
}

/** A tall player photo for cards: the photo stands on a glow in the team colour. */
export function PlayerPortrait({ photo, name, color, height = 150 }: { photo: string | null | undefined; name: string; color?: string; height?: number }) {
  return (
    <Box className={classes.portrait} h={height} style={{ "--team": color ?? "#c8aa6e" } as CSSProperties}>
      <Img
        sources={[photo]}
        alt={name}
        className={classes.portraitImg}
        fallback={<span className={classes.portraitInitials}>{name.slice(0, 2).toUpperCase()}</span>}
      />
    </Box>
  );
}

export function ChampIcon({ id, size = 32, dim = false, title, radius = 4, tooltip = true }: { id: string; size?: number; dim?: boolean; title?: string; radius?: number; tooltip?: boolean }) {
  const { patch, champion } = useCatalog();
  const name = champion[id]?.name ?? id;
  return (
    <Tooltip label={title ?? name} disabled={!tooltip || size >= 64}>
      <Box w={size} h={size} className={classes.champ} data-dim={dim || undefined} style={{ borderRadius: radius }}>
        <Img
          sources={championIcon(patch, id)}
          alt={name}
          loading="lazy"
          fallback={<span className={classes.champFallback}>{name.slice(0, 2)}</span>}
        />
      </Box>
    </Tooltip>
  );
}

/** Loading-screen portrait, as champion select shows a locked pick. */
export function ChampPortrait({ id, className, style }: { id: string; className?: string; style?: CSSProperties }) {
  const { champion } = useCatalog();
  return (
    <Img sources={championLoading(id)} alt={champion[id]?.name ?? id} className={className} style={style} loading="lazy" />
  );
}

/** Splash art filling its parent, behind a dark gradient so text on top stays readable. */
export function SplashBackdrop({ id, position = "center 20%", strength = 0.75 }: { id: string | null | undefined; position?: string; strength?: number }) {
  if (!id) return null;
  return (
    <div className={classes.backdrop} aria-hidden>
      <Img sources={championSplash(id)} alt="" className={classes.backdropImg} style={{ objectPosition: position }} />
      <div className={classes.backdropShade} style={{ "--shade": strength } as CSSProperties} />
    </div>
  );
}

export function RoleIcon({ role, size = 18 }: { role: Role; size?: number }) {
  return (
    <Tooltip label={ROLE_NAMES[role]}>
      <Box w={size} h={size} className={classes.role}>
        <Img
          sources={roleIcon(role)}
          alt={role}
          fallback={
            <Text fz={9} fw={800}>
              {role}
            </Text>
          }
        />
      </Box>
    </Tooltip>
  );
}
