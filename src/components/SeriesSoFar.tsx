import { Badge, Box, Group, Stack, Text, Tooltip } from "@mantine/core";

import { api } from "../api/client";
import type { GameRecord, LiveView, MatchSummary, Role, TeamRef } from "../api/types";
import { clock, ROLES, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { ChampIcon, TeamLogo } from "./Media";
import { Section } from "./Ui";

/**
 * Before a game: one slot per game of the series, played or not, so the panel keeps its height as
 * games stack up. A played game shows both sides' picks (yours on top), the kills and the length.
 * Under fearless those picks are the burned champions. Before the first game of a series, the two
 * teams' meetings this season instead.
 */
export function SeriesSoFar({ view }: { view: LiveView }) {
  const ourSide = view.our_side;
  const ours = view[ourSide].team;
  const theirs = view[ourSide === "blue" ? "red" : "blue"].team;
  const games = view.match.game_list;
  if (!games.length) return <HeadToHead matchId={view.match.id} ours={ours} theirs={theirs} />;
  const slots = Array.from({ length: Math.max(view.match.best_of, games.length) }, (_, i) => games.find((g) => g.number === i + 1) ?? i + 1);
  const size = slots.length >= 5 ? 22 : 28;
  const burned = view.match.fearless ? view.select.locked.length : 0;
  return (
    <Section
      title="Series so far"
      pad={false}
      right={
        view.match.fearless ? (
          <Tooltip label="Fearless: every champion picked in this series is burned for the rest of it">
            <Badge variant="light" color="gold">
              fearless · {burned} burned
            </Badge>
          </Tooltip>
        ) : undefined
      }
    >
      <Box style={{ display: "grid", gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
        {slots.map((g, i) => (
          <Stack
            key={i}
            gap={6}
            align="center"
            px="xs"
            py="sm"
            style={{
              borderTop: "1px solid var(--line-soft)",
              borderLeft: i ? "1px solid var(--line-soft)" : undefined,
              background: g === view.game ? "rgba(200, 170, 110, 0.06)" : undefined,
            }}
          >
            {typeof g === "number" ? <Upcoming number={g} next={g === view.game} size={size} /> : <Played g={g} ours={ours} theirs={theirs} size={size} />}
          </Stack>
        ))}
      </Box>
    </Section>
  );
}

function picks(record: Partial<Record<Role, string>>) {
  return ROLES.map((r) => record[r]).filter((c): c is string => !!c);
}

function Picks({ ids, size }: { ids: string[]; size: number }) {
  return (
    <Group gap={3} wrap="nowrap" justify="center">
      {ids.map((c) => (
        <ChampIcon key={c} id={c} size={size} />
      ))}
    </Group>
  );
}

function Played({ g, ours, theirs, size }: { g: GameRecord; ours: TeamRef; theirs: TeamRef; size: number }) {
  const weBlue = g.blue === ours.id;
  const won = g.winner === ours.id;
  const [k1, k2] = weBlue ? g.kills : [g.kills[1], g.kills[0]];
  return (
    <>
      <Group gap={6} wrap="nowrap" justify="center">
        <Text fw={800} fz="sm">
          Game {g.number}
        </Text>
        <Badge size="xs" variant="light" color={won ? "teal" : "red"}>
          {won ? "won" : "lost"}
        </Badge>
        <Text fz="xs" c="dimmed">
          {clock(g.duration)}
        </Text>
      </Group>
      <Picks ids={picks(weBlue ? g.blue_picks : g.red_picks)} size={size} />
      <Text fz="xs" c="dimmed" truncate>
        {ours.tag}{" "}
        <Text span fw={700} c="gray.2">
          {k1} – {k2}
        </Text>{" "}
        {theirs.tag}
      </Text>
      <Picks ids={picks(weBlue ? g.red_picks : g.blue_picks)} size={size} />
    </>
  );
}

/** A game still to come, the same height as a played one. */
function Upcoming({ number, next, size }: { number: number; next: boolean; size: number }) {
  const empty = (
    <Group gap={3} wrap="nowrap" justify="center">
      {ROLES.map((r) => (
        <Box key={r} w={size} h={size} style={{ borderRadius: 4, border: "1px dashed var(--line)" }} />
      ))}
    </Group>
  );
  return (
    <>
      <Group gap={6} wrap="nowrap" justify="center">
        <Text fw={800} fz="sm" c={next ? undefined : "dimmed"}>
          Game {number}
        </Text>
        <Badge size="xs" variant={next ? "filled" : "outline"} color={next ? "gold" : "gray"}>
          {next ? "next" : "if needed"}
        </Badge>
      </Group>
      {empty}
      <Text fz="xs" c="dimmed">
        –
      </Text>
      {empty}
    </>
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
