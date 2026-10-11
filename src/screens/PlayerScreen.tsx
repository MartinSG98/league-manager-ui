import { Badge, Box, Grid, Group, Paper, Progress, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { ContractPanel } from "../components/ContractPanel";
import { TransferPanel } from "../components/TransferPanel";
import { ChampIcon, PlayerPortrait, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { AttrBar, Empty, FormArrow, Loading, Meter, Ovr, Screen, Section } from "../components/Ui";
import { ATTRIBUTE_NAMES, flag, money, ROLE_NAMES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import classes from "./Screens.module.css";

const ATTRIBUTE_HINTS: Record<string, string> = {
  mechanics: "KDA, solo kills and damage per minute",
  laning: "Gold, CS and XP difference at 15 minutes",
  teamfighting: "Kill participation, damage share and staying alive",
  vision: "Vision score, wards cleared and vision share",
  macro: "Win rate and early gold leads",
  consistency: "Few deaths, steady KDA, rarely first blood",
  composure: "Career games and winning under pressure",
  champion_pool: "Champions with five or more career games",
};

const STATS_2026: { key: string; label: string; digits?: number; pct?: boolean }[] = [
  { key: "games", label: "Games" },
  { key: "winrate", label: "Win rate", pct: true },
  { key: "kda", label: "KDA", digits: 1 },
  { key: "kills", label: "Kills / game", digits: 1 },
  { key: "deaths", label: "Deaths / game", digits: 1 },
  { key: "assists", label: "Assists / game", digits: 1 },
  { key: "csm", label: "CS / min", digits: 1 },
  { key: "kp", label: "Kill participation", pct: true },
  { key: "dmg_share", label: "Damage share", pct: true },
  { key: "dpm", label: "Damage / min" },
  { key: "vspm", label: "Vision / min", digits: 2 },
  { key: "gd15", label: "Gold diff @15" },
  { key: "csd15", label: "CS diff @15" },
  { key: "xpd15", label: "XP diff @15" },
  { key: "solo_kills", label: "Solo kills" },
];

export function PlayerScreen() {
  const { player } = useParams();
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const p = useApi(() => api.player(career.id, player!), [career.id, player, revision]);
  if (!p.data) return <Loading />;
  const d = p.data;
  const team = d.team ? catalog.teams.find((t) => t.id === d.team) : null;
  const signature = d.signatures[0] ?? d.pool[0]?.champion;

  return (
    <Screen>
      <Paper className={classes.hero} mb="lg">
        <SplashBackdrop id={signature} strength={0.55} position="center 20%" />
        <Group className={classes.heroInner} align="flex-end" wrap="nowrap" gap="xl">
          <Box w={210} style={{ flex: "none" }}>
            <PlayerPortrait photo={d.photo} name={d.name} color={team?.color} height={230} />
          </Box>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs">
              <RoleIcon role={d.role} size={20} />
              <Text className="eyebrow">{ROLE_NAMES[d.role]}</Text>
              {d.origin && (
                <Text fz="sm" c="gray.4">
                  · {d.origin.name} in 2026
                </Text>
              )}
            </Group>
            <Text className="display" fz={64} lh={0.95}>
              {d.name}
            </Text>
            <Text fz="lg" c="gray.3">
              {flag(d.country)} {d.real_name ?? d.country}
            </Text>
            <Group gap="sm" mt={4}>
              {team ? (
                <Link to={`/career/${career.id}/team/${team.id}`} className="link">
                  <Group gap={8}>
                    <TeamLogo team={team} size={28} />
                    <Text fw={700}>{team.name}</Text>
                  </Group>
                </Link>
              ) : (
                <Badge variant="light" color="hextech">
                  Free agent
                </Badge>
              )}
              {d.contract_until && (
                <Text fz="sm" c="dimmed">
                  contract to {d.contract_until}
                </Text>
              )}
            </Group>
          </Stack>
          <Group gap="xl" visibleFrom="md">
            <Stack gap={0} align="center">
              <Text className="eyebrow">Overall</Text>
              <Ovr value={d.overall} size="xl" />
            </Stack>
            <Stack gap={0} align="center">
              <Text className="eyebrow">Potential</Text>
              <Ovr value={d.potential} size="xl" />
            </Stack>
            <Stack gap={0}>
              <Text className="eyebrow">{d.contract_until ? "Salary" : "Market value"}</Text>
              <Text fw={800} fz={28} className="display">
                {money(d.salary)}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Paper>

      {career.phase !== "draft" && d.team && (
        <Box mb="lg">
          <TransferPanel player={d} />
        </Box>
      )}
      {(career.phase !== "draft" || d.team === career.team.id) && (
        <Box mb="lg">
          <ContractPanel player={d} />
        </Box>
      )}

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <Section title="Attributes">
              <Stack gap={10}>
                {Object.keys(ATTRIBUTE_NAMES).map((a) => (
                  <AttrBar key={a} label={ATTRIBUTE_NAMES[a]} value={d.attributes[a]} hint={ATTRIBUTE_HINTS[a]} />
                ))}
                <Box style={{ borderTop: "1px solid var(--line)" }} my={4} />
                <AttrBar label="Aggression" value={d.aggression} hint="A style, not a quality: first bloods and solo kills" />
                <AttrBar label="Leadership" value={d.leadership} hint="Shotcalling, worth chemistry when it is high" />
              </Stack>
              <Group gap="xs" mt="md">
                <Text fz="sm" c="dimmed">
                  Speaks
                </Text>
                {d.languages.map((l) => (
                  <Badge key={l} variant="outline" color="gray" size="sm">
                    {l}
                  </Badge>
                ))}
              </Group>
              <Group gap="lg" mt="sm">
                <Group gap={6}>
                  <Text fz="sm" c="dimmed">
                    Form
                  </Text>
                  <FormArrow value={d.form} />
                </Group>
                <Group gap={6}>
                  <Text fz="sm" c="dimmed">
                    Morale
                  </Text>
                  <Meter value={d.morale} color={d.morale >= 60 ? "teal" : "red"} />
                </Group>
                <Group gap={6}>
                  <Text fz="sm" c="dimmed">
                    Fatigue
                  </Text>
                  <Meter value={d.fatigue} color="red" label={`Fatigue ${d.fatigue}`} />
                </Group>
                <Group gap={6}>
                  <Text fz="sm" c="dimmed">
                    Sharpness
                  </Text>
                  <Meter value={d.sharpness} color="hextech" label={`Sharpness ${d.sharpness}`} />
                </Group>
              </Group>
              <Group gap="xs" mt="sm">
                <Badge variant="light" color="gold">
                  {d.development}
                </Badge>
                {d.status.map((s) => (
                  <Badge key={s} variant="light" color={s === "Sharp" ? "teal" : "red"}>
                    {s}
                  </Badge>
                ))}
                {d.training.attribute && (
                  <Text fz="xs" c="dimmed">
                    works on {ATTRIBUTE_NAMES[d.training.attribute]?.toLowerCase()}
                  </Text>
                )}
                {d.training.champion && (
                  <Text fz="xs" c="dimmed">
                    learns {catalog.champion[d.training.champion]?.name}
                  </Text>
                )}
              </Group>
              <Text fz="xs" c="dimmed" mt="sm">
                {d.experience} career games · reputation {d.reputation}
              </Text>
            </Section>

            <Section title="This season">
              {d.season.games === 0 ? (
                <Empty>No games yet.</Empty>
              ) : (
                <Stack gap="md">
                  <SimpleGrid cols={3} spacing="sm">
                    <Mini label="Won" value={`${d.season.wins}-${d.season.games - d.season.wins}`} />
                    <Mini label="KDA" value={String(d.season.kda)} />
                    <Mini label="Avg rating" value={String(d.season.rating ?? "—")} />
                    <Mini label="CS / min" value={String(d.season.cs_per_min)} />
                    <Mini label="K / D / A" value={`${d.season.kills}/${d.season.deaths}/${d.season.assists}`} />
                    <Mini label="MVPs" value={String(d.season.mvps)} />
                  </SimpleGrid>
                  <Group gap="xs">
                    {d.season.champions.map(([c, n]) => (
                      <Group key={c} gap={4}>
                        <ChampIcon id={c} size={28} />
                        <Text fz="xs" c="dimmed">
                          ×{n}
                        </Text>
                      </Group>
                    ))}
                  </Group>
                </Stack>
              )}
            </Section>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="lg">
            <Section title="Champion pool" right={<Text fz="xs" c="dimmed">mastery · meta on patch {career.patch}</Text>} pad={false}>
              <Table verticalSpacing={5}>
                <Table.Tbody>
                  {d.pool.map((c) => (
                    <Table.Tr key={c.champion}>
                      <Table.Td w={46}>
                        <ChampIcon id={c.champion} size={36} />
                      </Table.Td>
                      <Table.Td fw={600} fz="sm">
                        {catalog.champion[c.champion]?.name ?? c.champion}
                      </Table.Td>
                      <Table.Td className="num" c="dimmed" fz="sm">
                        {c.games} games
                      </Table.Td>
                      <Table.Td className="num" c="dimmed" fz="sm">
                        {c.winrate !== null ? `${c.winrate}%` : ""}
                      </Table.Td>
                      <Table.Td w={140}>
                        <Progress value={c.mastery} color="gold" size="sm" radius="xl" />
                      </Table.Td>
                      <Table.Td className={c.meta >= 0 ? "num gain" : "num loss"} fw={700} fz="sm">
                        {signed(c.meta, 1)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Section>

            <Section title="2026 season" right={<Text fz="xs" c="dimmed">all competitions</Text>}>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
                {STATS_2026.map((s) => {
                  const raw = d.stats_2026[s.key];
                  const value = typeof raw === "number" ? (s.digits ? raw.toFixed(s.digits) : String(Math.round(raw))) : "—";
                  return <Mini key={s.key} label={s.label} value={`${value}${s.pct && typeof raw === "number" ? "%" : ""}`} />;
                })}
              </SimpleGrid>
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Text fz={11} c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fw={800} fz="lg" className="display">
        {value}
      </Text>
    </Stack>
  );
}
