import { Box, Button, Divider, Grid, Group, Paper, SimpleGrid, Stack, Table, Text, TextInput, Title, Tooltip, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconPlayerPlay } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, ApiError } from "../api/client";
import { ChampIcon, LeagueLogo, PlayerPhoto, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { Empty, Ovr, Section } from "../components/Ui";
import { money, ordinal } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCatalog } from "../state/catalog";
import classes from "./Pages.module.css";

export function NewCareerPage() {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [region, setRegion] = useState("EMEA");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [manager, setManager] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const league = catalog.regions.find((r) => r.id === region)!.league;
  const teams = useMemo(() => catalog.teams.filter((t) => t.league === league), [catalog.teams, league]);
  const tierTwo = catalog.leagues.filter((lg) => lg.region === region && lg.tier === 2);
  const preview = useApi(() => (teamId ? api.teamPreview(teamId) : Promise.resolve(null)), [teamId]);

  async function start() {
    if (!teamId) return;
    setStarting(true);
    setError(null);
    try {
      const career = await api.createCareer(manager || "Manager", teamId);
      navigate(`/career/${career.id}/draft`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the career");
      setStarting(false);
    }
  }

  return (
    <Box maw={1440} mx="auto" px="xl" py="xl">
      <Button component={Link} to="/" variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md">
        Back
      </Button>
      <Text className="eyebrow">New career</Text>
      <Title className="display" fz={44} mb="lg">
        Choose your team
      </Title>

      <Group gap="sm" mb="md">
        {catalog.regions.map((r) => {
          const lg = catalog.league[r.league];
          return (
            <UnstyledButton
              key={r.id}
              className={classes.leagueTab}
              data-active={r.id === region || undefined}
              onClick={() => {
                setRegion(r.id);
                setTeamId(null);
              }}
            >
              <LeagueLogo logo={lg.logo} name={lg.name} size={30} />
              <Stack gap={0}>
                <Text fw={800} fz="sm">
                  {lg.name}
                </Text>
                <Text fz="xs" c="dimmed">
                  {r.name}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </Group>

      <Group gap="xs" mb="lg">
        <Text fz="sm" c="dimmed">
          Draft pool: every {league} player who is not a franchise player
          {tierTwo.length > 0 ? ", plus" : "."}
        </Text>
        {tierTwo.map((lg) => (
          <Tooltip key={lg.id} label={`${lg.full_name} · ${lg.players} players`}>
            <span>
              <LeagueLogo logo={lg.logo} name={lg.name} size={22} />
            </span>
          </Tooltip>
        ))}
      </Group>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
            {teams.map((t) => (
              <Paper
                key={t.id}
                p="md"
                className={classes.teamCard}
                data-selected={t.id === teamId || undefined}
                style={{ "--team": t.color } as React.CSSProperties}
                onClick={() => setTeamId(t.id)}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <TeamLogo team={t} size={64} />
                  <Stack gap={0} align="flex-end">
                    <Text fz="xs" c="dimmed">
                      {ordinal(t.rank)} in 2026
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {t.wins}-{t.losses}
                    </Text>
                  </Stack>
                </Group>
                <Text fw={800} fz="lg" mt="sm" truncate>
                  {t.name}
                </Text>
                {t.franchise && (
                  <Group gap="sm" mt="sm" wrap="nowrap">
                    <PlayerPhoto photo={t.franchise.photo} name={t.franchise.name} size={40} ring={t.color} />
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text fz={10} className="eyebrow">
                        Franchise
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        <RoleIcon role={t.franchise.role} size={14} />
                        <Text fw={700} truncate>
                          {t.franchise.name}
                        </Text>
                      </Group>
                    </Stack>
                    <Ovr value={t.franchise.overall} />
                  </Group>
                )}
                <Group gap="xs" mt="md" wrap="nowrap">
                  <Text fz={10} c="dimmed" tt="uppercase" fw={700}>
                    Prestige
                  </Text>
                  <Box className={classes.prestige} style={{ flex: 1 }}>
                    <span style={{ width: `${t.prestige}%` }} />
                  </Box>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Box className={classes.sticky}>
            {!teamId && (
              <Section>
                <Empty>Pick a team to see who you keep and who goes into the draft.</Empty>
              </Section>
            )}
            {teamId && preview.data && (
              <Paper p={0}>
                <Box className={classes.previewHero}>
                  <SplashBackdrop id={preview.data.franchise?.signatures[0]} strength={0.55} />
                  <Group wrap="nowrap" gap="md" align="flex-end" className={classes.previewInner}>
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <TeamLogo team={preview.data} size={56} />
                      <Text className="eyebrow" mt="xs">
                        You keep
                      </Text>
                      <Text className="display" fz={36} lh={1}>
                        {preview.data.franchise?.name}
                      </Text>
                      <Text fz="sm" c="gray.4">
                        {preview.data.franchise?.real_name}
                      </Text>
                      {preview.data.franchise && (
                        <Group gap="xs">
                          <RoleIcon role={preview.data.franchise.role} />
                          <Ovr value={preview.data.franchise.overall} size="lg" />
                          <Text fz="sm" c="dimmed">
                            {money(preview.data.franchise.salary)} a season
                          </Text>
                        </Group>
                      )}
                    </Stack>
                    {preview.data.franchise && (
                      <PlayerPhoto photo={preview.data.franchise.photo} name={preview.data.franchise.name} size={96} ring={preview.data.color} />
                    )}
                  </Group>
                </Box>
                <Stack p="md" gap="md">
                  {preview.data.franchise && preview.data.franchise.signatures.length > 0 && (
                    <Group gap={6}>
                      <Text fz="xs" c="dimmed" mr={4}>
                        Signature champions
                      </Text>
                      {preview.data.franchise.signatures.map((c) => (
                        <ChampIcon key={c} id={c} size={30} />
                      ))}
                    </Group>
                  )}
                  <Divider label="Released into the draft" labelPosition="left" />
                  <Table verticalSpacing={4}>
                    <Table.Tbody>
                      {preview.data.roster_2026
                        .filter((p) => p.id !== preview.data!.franchise?.id)
                        .map((p) => (
                          <Table.Tr key={p.id} style={{ opacity: p.starter ? 1 : 0.5 }}>
                            <Table.Td w={28}>
                              <RoleIcon role={p.role} size={16} />
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <PlayerPhoto photo={p.photo} name={p.name} size={26} />
                                <Text fz="sm" fw={600}>
                                  {p.name}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td className="num">
                              <Ovr value={p.overall} size="sm" />
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                  <Text fz="sm" c="dimmed">
                    {preview.data.pool_size} players in the {league} region pool.
                  </Text>
                  <TextInput label="Manager name" placeholder="Your name" value={manager} onChange={(e) => setManager(e.currentTarget.value)} />
                  {error && (
                    <Text c="red" fz="sm">
                      {error}
                    </Text>
                  )}
                  <Button size="md" fullWidth loading={starting} leftSection={<IconPlayerPlay size={18} />} onClick={start}>
                    Take over {preview.data.tag}
                  </Button>
                </Stack>
              </Paper>
            )}
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
