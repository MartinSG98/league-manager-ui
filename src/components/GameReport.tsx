import { Badge, Box, Group, Progress, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import type { GameRecord, PlayerLine, Side, TeamRef } from "../api/types";
import { clock, ROLES } from "../lib/format";
import { useCareer } from "../state/career";
import classes from "./GameReport.module.css";
import { ChampIcon, PlayerPhoto, TeamLogo } from "./Media";

const PLAY_NAMES: Record<string, string> = {
  invade: "a level 1 invade", fnatic_bush: "the Fnatic bush", lane_swap: "a lane swap", grubs: "a Voidgrub setup", dive: "a tower dive",
  drakes: "a dragon setup", pick: "a vision trap", baron_bait: "a Baron bait", split_push: "a 1-3-1 split push",
};

/** Final scoreboard of one game: objectives, picks and bans, set plays, every player's line. */
export function GameReport({ game, teams }: { game: GameRecord; teams: Record<string, TeamRef | null> }) {
  const blue = teams[game.blue];
  const red = teams[game.red];
  const maxDamage = Math.max(...game.players.map((p) => p.damage));
  return (
    <Stack gap="md">
      <Box className={classes.header}>
        <SideHead team={blue} side="blue" won={game.winner === game.blue} />
        <Stack gap={0} align="center">
          <Group gap="md" className={classes.kills}>
            <span className="side-blue">{game.kills[0]}</span>
            <Text span c="dimmed" fz={22}>
              ⚔
            </Text>
            <span className="side-red">{game.kills[1]}</span>
          </Group>
          <Text c="dimmed" fz="sm">
            {clock(game.duration)}
          </Text>
        </Stack>
        <SideHead team={red} side="red" won={game.winner === game.red} />
      </Box>

      <Group justify="center" gap={36}>
        <Objective label="Gold" blue={`${(game.gold[0] / 1000).toFixed(1)}k`} red={`${(game.gold[1] / 1000).toFixed(1)}k`} />
        <Objective label="Towers" blue={game.towers[0]} red={game.towers[1]} />
        <Objective label="Drakes" blue={game.dragons[0]} red={game.dragons[1]} />
        <Objective label="Barons" blue={game.barons[0]} red={game.barons[1]} />
      </Group>

      {Object.keys(game.plays ?? {}).length > 0 && (
        <Group justify="center" gap="lg">
          {Object.entries(game.plays).map(([team, play]) => (
            <Text key={team} fz="sm" c="dimmed">
              <b className={team === game.blue ? "side-blue" : "side-red"}>{teams[team]?.tag ?? team}</b> ran{" "}
              <b>{PLAY_NAMES[play] ?? play}</b>
              {team in game.play_results ? (game.play_results[team] ? " · it worked" : " · it backfired") : " · the game ended first"}
            </Text>
          ))}
          {game.throws && game.throws[0] + game.throws[1] > 0 && (
            <Text fz="sm" c="dimmed">
              Fights thrown with a big lead: {game.throws[0]} - {game.throws[1]}
            </Text>
          )}
        </Group>
      )}

      <Group justify="space-between">
        <Group gap={4}>
          <Text className="eyebrow" mr={6}>
            Bans
          </Text>
          {game.blue_bans.map((c) => (
            <ChampIcon key={c} id={c} size={26} dim />
          ))}
        </Group>
        <Group gap={4}>
          {game.red_bans.map((c) => (
            <ChampIcon key={c} id={c} size={26} dim />
          ))}
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        {(["blue", "red"] as Side[]).map((side) => {
          const team = side === "blue" ? game.blue : game.red;
          const lines = ROLES.map((r) => game.players.find((p) => p.team === team && p.role === r)).filter((p): p is PlayerLine => !!p);
          return (
            <Table key={side} className={classes.board} verticalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className={`side-${side}`} tt="uppercase">
                    {side}
                  </Table.Th>
                  <Table.Th>Player</Table.Th>
                  <Table.Th className="num">K / D / A</Table.Th>
                  <Table.Th className="num">CS</Table.Th>
                  <Table.Th>Damage</Table.Th>
                  <Table.Th className="num">Rating</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lines.map((p) => (
                  <PlayerRow key={p.player} p={p} mvp={game.mvp === p.player} maxDamage={maxDamage} />
                ))}
              </Table.Tbody>
            </Table>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function SideHead({ team, side, won }: { team: TeamRef | null; side: Side; won: boolean }) {
  return (
    <Group gap="sm" justify={side === "red" ? "flex-end" : "flex-start"} wrap="nowrap" style={{ flexDirection: side === "red" ? "row-reverse" : "row" }}>
      <TeamLogo team={team} size={56} />
      <Stack gap={2} align={side === "red" ? "flex-end" : "flex-start"}>
        <Text fw={800} fz="lg">
          {team?.name}
        </Text>
        <Group gap={6}>
          <Badge size="sm" variant="light" color={side === "blue" ? "blue" : "red"}>
            {side} side
          </Badge>
          {won && (
            <Badge size="sm" color="gold">
              Victory
            </Badge>
          )}
        </Group>
      </Stack>
    </Group>
  );
}

function Objective({ label, blue, red }: { label: string; blue: string | number; red: string | number }) {
  return (
    <Group gap="sm" className={classes.objective}>
      <span className="side-blue">{blue}</span>
      <Text className="eyebrow">{label}</Text>
      <span className="side-red">{red}</span>
    </Group>
  );
}

function PlayerRow({ p, mvp, maxDamage }: { p: PlayerLine; mvp: boolean; maxDamage: number }) {
  const { career } = useCareer();
  return (
    <Table.Tr>
      <Table.Td w={44}>
        <ChampIcon id={p.champion} size={34} />
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <PlayerPhoto photo={p.photo} name={p.name} size={28} />
          <Link className="link" to={`/career/${career.id}/player/${p.player}`}>
            <Text fw={600} fz="sm">
              {p.name}
            </Text>
          </Link>
          {mvp && (
            <Badge size="xs" color="gold">
              MVP
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td className="num" fz="sm">
        {p.kills} / <span className="loss">{p.deaths}</span> / {p.assists}
      </Table.Td>
      <Table.Td className="num" c="dimmed" fz="sm">
        {p.cs}
      </Table.Td>
      <Table.Td miw={110}>
        <Group gap={6} wrap="nowrap">
          <Progress value={(p.damage / maxDamage) * 100} color="gold" size={6} w={64} />
          <Text fz={11} c="dimmed">
            {(p.damage / 1000).toFixed(1)}k
          </Text>
        </Group>
      </Table.Td>
      <Table.Td className="num" fw={700} fz="sm" c={p.rating >= 7.5 ? "teal" : p.rating < 6 ? "red" : undefined}>
        {p.rating.toFixed(1)}
      </Table.Td>
    </Table.Tr>
  );
}
