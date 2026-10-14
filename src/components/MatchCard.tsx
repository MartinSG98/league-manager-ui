import { Box, Group, Stack, Text } from "@mantine/core";

import type { MatchSummary, TeamRef } from "../api/types";
import { cx, longDate } from "../lib/format";
import { LeagueLogo, TeamLink, TeamLogo } from "./Media";
import classes from "./MatchCard.module.css";

/** Two teams face to face with their logos, the score once there is one, and what and when it is. */
export function MatchCard({ match, mine, size = 72 }: { match: MatchSummary; mine?: string; size?: number }) {
  const [h, a] = match.score;
  const played = match.games > 0;
  return (
    <Stack gap="sm" className={classes.card}>
      <Group justify="center" gap="xs">
        <LeagueLogo logo={match.competition_logo} name={match.competition_name} size={20} />
        <Text fz="xs" c="dimmed" tt="uppercase" fw={700} lts="0.08em">
          {match.competition_name} · {match.label}
        </Text>
      </Group>
      <Box className={classes.row}>
        <Side team={match.home} size={size} lost={!!match.winner && match.winner !== match.home?.id} />
        <Stack gap={2} align="center">
          {played ? (
            <Group gap="sm" className={classes.score}>
              <span className={cx(mine && match.home?.id === mine && (h > a ? "gain" : "loss"))}>{h}</span>
              <Text span c="dimmed" inherit>
                :
              </Text>
              <span className={cx(mine && match.away?.id === mine && (a > h ? "gain" : "loss"))}>{a}</span>
            </Group>
          ) : (
            <Text className={classes.vs}>VS</Text>
          )}
          <Text fz="xs" c="dimmed">
            Best of {match.best_of}
            {match.fearless && " · fearless"}
          </Text>
        </Stack>
        <Side team={match.away} size={size} lost={!!match.winner && match.winner !== match.away?.id} />
      </Box>
      <Text ta="center" fz="sm" c="dimmed">
        {longDate(match.day)}
      </Text>
    </Stack>
  );
}

function Side({ team, size, lost }: { team: TeamRef | null; size: number; lost: boolean }) {
  return (
    <Stack align="center" gap={6} className={cx(lost && classes.lost)}>
      <TeamLogo team={team} size={size} />
      <Text fw={700} ta="center" fz="sm" lineClamp={1}>
        {team ? <TeamLink team={team}>{team.name}</TeamLink> : "TBD"}
      </Text>
    </Stack>
  );
}
