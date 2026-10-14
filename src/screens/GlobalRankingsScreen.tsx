import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { api } from "../api/client";
import type { PowerRegion, PowerTeam } from "../api/types";
import { LeagueLogo, TeamLink, TeamLogo } from "../components/Media";
import { Loading, PageHeader, Screen, Section } from "../components/Ui";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./GlobalRankingsScreen.module.css";

/**
 * The global power rankings, as LoL Esports keeps them: every region and every tier-one team by an
 * Elo that moves with each series. A region rises only by beating other regions, and its strength
 * is how much of its results the world counts, which moves reputations and the Worlds pots.
 */
export function GlobalRankingsScreen() {
  const { career, revision } = useCareer();
  const view = useApi(() => api.power(career.id), [career.id, revision]);
  const [league, setLeague] = useState("all");
  if (!view.data) return <Loading />;
  const { regions, teams, season } = view.data;
  const names = Object.fromEntries(regions.map((r) => [r.league, r.name]));
  const shown = league === "all" ? teams : teams.filter((t) => t.league === league);

  return (
    <Screen>
      <PageHeader eyebrow={`Season ${season} · power rankings`} title="Global Rankings" />
      <Stack gap="lg">
        <Section
          title="Regions"
          right={
            <Text fz="xs" c="dimmed">
              a region rises only by beating other regions at First Stand, MSI and Worlds · change since the season began
            </Text>
          }
        >
          <div className={classes.regions}>
            {regions.map((r) => (
              <RegionCard key={r.region} r={r} mine={r.league === career.league} />
            ))}
          </div>
          <Text fz="xs" c="dimmed" mt="md">
            Strength is how much of a region&apos;s results the world counts: 100 for the strongest region. It weighs clubs&apos; world stars and how
            much a title there adds to a manager&apos;s world reputation, and the regions&apos; order sets the Worlds Swiss pots.
          </Text>
        </Section>

        <Section
          title="Teams"
          pad={false}
          right={
            <SegmentedControl
              size="xs"
              value={league}
              onChange={setLeague}
              data={[{ value: "all", label: "World" }, ...regions.map((r) => ({ value: r.league, label: r.name }))]}
            />
          }
        >
          <div className={classes.row} data-head>
            <span>#</span>
            <span>Team</span>
            <span>League</span>
            <span className="num">Power</span>
            <span className="num">Season</span>
          </div>
          {shown.map((t) => (
            <TeamRow key={t.team.id} t={t} league={names[t.league] ?? t.league} />
          ))}
        </Section>
      </Stack>
    </Screen>
  );
}

function Change({ value }: { value: number }) {
  if (!value)
    return (
      <Text span fz="sm" c="dimmed">
        –
      </Text>
    );
  return (
    <Text span fz="sm" fw={700} className={value > 0 ? "gain" : "loss"}>
      {value > 0 ? "▲" : "▼"} {Math.abs(value)}
    </Text>
  );
}

function RegionCard({ r, mine }: { r: PowerRegion; mine: boolean }) {
  // The bar runs from 50, the weakest a region can fall to, up to 100.
  const width = Math.max(4, Math.min(100, (r.strength - 50) * 2));
  return (
    <div className={classes.region} data-mine={mine || undefined}>
      <Group justify="space-between" wrap="nowrap">
        <span className={classes.rank}>{r.rank}</span>
        <Change value={r.change} />
      </Group>
      <Group gap="sm" wrap="nowrap">
        <LeagueLogo logo={r.logo} name={r.name} size={36} />
        <Text fw={800} fz="lg">
          {r.name}
        </Text>
      </Group>
      <div>
        <Group justify="space-between">
          <Text fz={11} c="dimmed" fw={700} tt="uppercase" lts="0.08em">
            Strength
          </Text>
          <Text fw={800}>{r.strength.toFixed(1)}</Text>
        </Group>
        <div className={classes.bar}>
          <span style={{ width: `${width}%` }} />
        </div>
      </div>
      <Text fz="xs" c="dimmed">
        Elo {r.elo.toLocaleString("en-US")}
        {r.best && (
          <>
            {" · best "}
            <TeamLink team={r.best}>{r.best.tag}</TeamLink>
          </>
        )}
      </Text>
    </div>
  );
}

function TeamRow({ t, league }: { t: PowerTeam; league: string }) {
  return (
    <div className={classes.row} data-mine={t.mine || undefined}>
      <Text span c="dimmed" fw={700}>
        {t.rank}
      </Text>
      <Group gap="sm" wrap="nowrap" miw={0}>
        <TeamLogo team={t.team} size={22} />
        <Text span fw={t.mine ? 800 : 600} truncate>
          <TeamLink team={t.team}>{t.team.name}</TeamLink>
        </Text>
      </Group>
      <Text span fz="sm" c="dimmed">
        {league}
      </Text>
      <Text span className="num" fw={800}>
        {t.score.toLocaleString("en-US")}
      </Text>
      <span className="num">
        <Change value={t.change} />
      </span>
    </div>
  );
}
