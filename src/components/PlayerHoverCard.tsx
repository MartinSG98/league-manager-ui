import { Badge, Box, Group, HoverCard, Progress, SimpleGrid, Stack, Text, type FloatingPosition } from "@mantine/core";
import { useState, type ReactNode } from "react";

import { api } from "../api/client";
import type { PlayerRow } from "../api/types";
import { cx, flag, ROLE_NAMES } from "../lib/format";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { ChampIcon, PlayerPhoto, RoleIcon } from "./Media";
import classes from "./PlayerHoverCard.module.css";
import { FormArrow, Ovr } from "./Ui";

interface PoolLine {
  champion: string;
  mastery: number;
  games?: number;
}

// Champion pools hardly change within a session, so each player is fetched once.
const pools = new Map<string, PoolLine[]>();

/**
 * Hovering a player shows their signature champions and the rest of their pool with mastery.
 * Pass `mastery` when the screen already has it (champion select); otherwise the pool is
 * loaded the first time the card opens. `unavailable` greys out banned and picked champions.
 */
export function PlayerHoverCard({
  player,
  mastery,
  unavailable,
  position = "right",
  children,
}: {
  player: PlayerRow;
  mastery?: Record<string, number>;
  unavailable?: Set<string>;
  position?: FloatingPosition;
  children: ReactNode;
}) {
  const { career } = useCareer();
  const key = `${career.id}:${player.id}`;
  const [loaded, setLoaded] = useState<PoolLine[] | null>(() => pools.get(key) ?? null);

  function load() {
    if (mastery || loaded) return;
    api
      .player(career.id, player.id)
      .then((detail) => {
        const lines = detail.pool.map((c) => ({ champion: c.champion, mastery: c.mastery, games: c.games }));
        lines.sort((a, b) => b.mastery - a.mastery);
        pools.set(key, lines);
        setLoaded(lines);
      })
      .catch(() => setLoaded([]));
  }

  const lines: PoolLine[] | null = mastery
    ? Object.entries(mastery)
        .map(([champion, m]) => ({ champion, mastery: m }))
        .sort((a, b) => b.mastery - a.mastery)
    : loaded;

  return (
    <HoverCard openDelay={180} closeDelay={60} position={position} withArrow shadow="xl" width={320} onOpen={load}>
      <HoverCard.Target>
        <Box className={classes.target}>{children}</Box>
      </HoverCard.Target>
      <HoverCard.Dropdown className={classes.card}>
        <PlayerCardBody player={player} lines={lines} unavailable={unavailable} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function PlayerCardBody({ player, lines, unavailable }: { player: PlayerRow; lines: PoolLine[] | null; unavailable?: Set<string> }) {
  const { champion } = useCatalog();
  const byChampion = new Map((lines ?? []).map((l) => [l.champion, l]));
  const signatures = player.signatures;
  const rest = (lines ?? []).filter((l) => !signatures.includes(l.champion)).slice(0, 8);
  const gone = (id: string) => unavailable?.has(id) ?? false;

  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="nowrap">
        <PlayerPhoto photo={player.photo} name={player.name} size={52} />
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <Text className="display" fz={22} lh={1} truncate>
            {player.name}
          </Text>
          <Text fz="xs" c="dimmed" truncate>
            {flag(player.country)} {player.real_name ?? player.country ?? ""}
          </Text>
          <Group gap={6}>
            <RoleIcon role={player.role} size={14} />
            <Text fz="xs" c="dimmed">
              {ROLE_NAMES[player.role]}
            </Text>
            <Ovr value={player.overall} size="sm" />
            <FormArrow value={player.form} />
          </Group>
        </Stack>
      </Group>

      <Box>
        <Text className="eyebrow" mb={6}>
          Signature champions
        </Text>
        {signatures.length === 0 ? (
          <Text fz="xs" c="dimmed">
            No signature champions yet.
          </Text>
        ) : (
          <SimpleGrid cols={4} spacing={6}>
            {signatures.map((id) => (
              <Stack key={id} gap={2} align="center" className={cx(gone(id) && classes.gone)}>
                <ChampIcon id={id} size={44} tooltip={false} />
                <Text fz={11} fw={700} ta="center" truncate maw={64}>
                  {champion[id]?.name ?? id}
                </Text>
                {byChampion.get(id) && (
                  <Badge size="xs" variant="light" color="gold">
                    {byChampion.get(id)!.mastery}
                  </Badge>
                )}
              </Stack>
            ))}
          </SimpleGrid>
        )}
      </Box>

      <Box>
        <Text className="eyebrow" mb={6}>
          Champion pool
        </Text>
        {lines === null ? (
          <Text fz="xs" c="dimmed">
            Loading…
          </Text>
        ) : rest.length === 0 ? (
          <Text fz="xs" c="dimmed">
            Nothing else played on stage.
          </Text>
        ) : (
          <Stack gap={4}>
            {rest.map((l) => (
              <Group key={l.champion} gap={8} wrap="nowrap" className={cx(gone(l.champion) && classes.gone)}>
                <ChampIcon id={l.champion} size={22} tooltip={false} />
                <Text fz="xs" w={92} truncate>
                  {champion[l.champion]?.name ?? l.champion}
                </Text>
                <Progress value={l.mastery} size="sm" color={l.mastery >= 75 ? "gold" : l.mastery >= 50 ? "hextech" : "gray"} style={{ flex: 1 }} />
                <Text fz="xs" fw={700} w={22} ta="right">
                  {l.mastery}
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Box>
      {unavailable && <Text fz={10} c="dimmed">Greyed out: banned, picked or used earlier in the series.</Text>}
    </Stack>
  );
}
