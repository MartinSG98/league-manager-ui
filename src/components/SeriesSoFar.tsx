import { Badge, Group, Stack, Text } from "@mantine/core";

import { api } from "../api/client";
import type { GameRecord, LiveView, MatchSummary, Role, TeamRef } from "../api/types";
import { clock, ROLES, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { ChampIcon, TeamLogo } from "./Media";
import { Section } from "./Ui";

/**
 * Before a game: the games of this series so far, each side's picks as the tale of the tape lays them
 * out (yours left), and the champions fearless has burned. Before the first game of a series, the two
 * teams' meetings this season instead.
 */
export function SeriesSoFar({ view }: { view: LiveView }) {
  const ourSide = view.our_side;
  const ours = view[ourSide].team;
  const theirs = view[ourSide === "blue" ? "red" : "blue"].team;
  const games = view.match.game_list;
  const locked = view.match.fearless ? view.select.locked : [];
  if (!games.length) return <HeadToHead matchId={view.match.id} ours={ours} theirs={theirs} />;
  return (
    <Section title="Series so far" pad={false} right={view.match.fearless ? <Badge variant="light" color="gold">fearless</Badge> : undefined}>
      {games.map((g) => (
        <GameRow key={g.number} g={g} ours={ours} />
      ))}
      {locked.length > 0 && (
        <Stack gap={8} px="md" py="sm" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <Text fz="xs" c="dimmed" fw={700} tt="uppercase" lts="0.08em">
            Burned by fearless · {locked.length}
          </Text>
          <Group gap={6}>
            {locked.map((c) => (
              <ChampIcon key={c} id={c} size={30} dim />
            ))}
          </Group>
        </Stack>
      )}
    </Section>
  );
}

function picks(record: Partial<Record<Role, string>>) {
  return ROLES.map((r) => record[r]).filter((c): c is string => !!c);
}

function GameRow({ g, ours }: { g: GameRecord; ours: TeamRef }) {
  const weBlue = g.blue === ours.id;
  const won = g.winner === ours.id;
  const [k1, k2] = weBlue ? g.kills : [g.kills[1], g.kills[0]];
  return (
    <Group justify="space-between" wrap="nowrap" gap="md" px="md" py="sm" style={{ borderTop: "1px solid var(--line-soft)" }}>
      <Group gap={4} wrap="nowrap">
        {picks(weBlue ? g.blue_picks : g.red_picks).map((c) => (
          <ChampIcon key={c} id={c} size={34} />
        ))}
      </Group>
      <Stack gap={2} align="center" miw={140}>
        <Group gap={6} wrap="nowrap">
          <Text fw={800} fz="sm">
            Game {g.number}
          </Text>
          <Badge size="sm" variant="light" color={won ? "teal" : "red"}>
            {won ? "won" : "lost"}
          </Badge>
        </Group>
        <Text fz="xs" c="dimmed">
          {k1} – {k2} kills · {clock(g.duration)}
        </Text>
      </Stack>
      <Group gap={4} wrap="nowrap">
        {picks(weBlue ? g.red_picks : g.blue_picks).map((c) => (
          <ChampIcon key={c} id={c} size={34} />
        ))}
      </Group>
    </Group>
  );
}

function HeadToHead({ matchId, ours, theirs }: { matchId: string; ours: TeamRef; theirs: TeamRef }) {
  const { career, revision } = useCareer();
  const schedule = useApi(() => api.schedule(career.id), [career.id, revision]);
  const met: MatchSummary[] = (schedule.data ?? [])
    .filter((m) => m.id !== matchId && m.winner && (m.home?.id === theirs.id || m.away?.id === theirs.id))
    .slice(-5)
    .reverse();
  return (
    <Section title={`Head to head with ${theirs.tag}`} pad={false} right={<Text fz="xs" c="dimmed">this season</Text>}>
      {met.length === 0 ? (
        <Text fz="sm" c="dimmed" px="md" py="sm">
          {schedule.data ? `The first meeting with ${theirs.name} this season.` : "…"}
        </Text>
      ) : (
        met.map((m) => {
          const home = m.home?.id === ours.id;
          const [a, b] = home ? m.score : [m.score[1], m.score[0]];
          const won = m.winner === ours.id;
          return (
            <Group key={m.id} justify="space-between" wrap="nowrap" px="md" py="sm" style={{ borderTop: "1px solid var(--line-soft)" }}>
              <Group gap="sm" wrap="nowrap">
                <Badge size="sm" variant="light" color={won ? "teal" : "red"} w={44}>
                  {won ? "won" : "lost"}
                </Badge>
                <Text fz="sm" fw={700}>
                  {a} : {b}
                </Text>
                <TeamLogo team={theirs} size={20} />
              </Group>
              <Text fz="xs" c="dimmed" truncate>
                {m.competition_name} · {m.label} · {shortDate(m.day)}
              </Text>
            </Group>
          );
        })
      )}
    </Section>
  );
}
