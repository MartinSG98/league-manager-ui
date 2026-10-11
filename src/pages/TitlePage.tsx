import { ActionIcon, Badge, Box, Button, Group, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconPlayerPlay, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { LeagueLogo, SplashBackdrop, TeamLogo } from "../components/Media";
import { longDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCatalog } from "../state/catalog";
import classes from "./Pages.module.css";

const HERO_CHAMPIONS = ["Azir", "Orianna", "Ryze", "LeeSin", "Ahri", "Jayce", "Rakan", "Ezreal", "Sylas", "Gnar"];

export function TitlePage() {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const saves = useApi(() => api.saves(), []);
  const [deleting, setDeleting] = useState<string | null>(null);
  const hero = useMemo(() => HERO_CHAMPIONS[Math.floor(Math.random() * HERO_CHAMPIONS.length)], []);
  const players = catalog.leagues.reduce((n, lg) => n + lg.players, 0);
  const tierOne = catalog.regions.map((r) => catalog.league[r.league]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.deleteCareer(id);
      saves.reload();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Box className={classes.title}>
      <SplashBackdrop id={hero} strength={0.6} position="center 25%" />
      <Stack className={classes.titleInner} gap="xl">
        <Stack gap="xs" maw={720}>
          <Text className="eyebrow">League of Legends esports manager</Text>
          <Title className={classes.wordmark}>League Manager</Title>
          <Text c="gray.4" fz="lg" maw={620}>
            Take over one of {catalog.teams.length} tier-one teams. Keep your franchise player, draft the rest from {players} real
            2026 pros across {catalog.leagues.length} leagues, then run the whole season: three splits, First Stand, MSI and
            Worlds, with a new patch every two weeks.
          </Text>
          <Group mt="md">
            <Button component={Link} to="/new" size="lg" leftSection={<IconPlus size={18} />}>
              New career
            </Button>
            {saves.data?.[0] && (
              <Button variant="default" size="lg" leftSection={<IconPlayerPlay size={18} />} onClick={() => navigate(`/career/${saves.data![0].id}`)}>
                Continue as {saves.data[0].team.tag}
              </Button>
            )}
          </Group>
        </Stack>

        {saves.data && saves.data.length > 0 && (
          <Stack gap="xs">
            <Text className="eyebrow">Saved careers</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              {saves.data.map((s) => (
                <Paper key={s.id} p="sm" className={classes.saveCard} onClick={() => navigate(`/career/${s.id}`)}>
                  <Group wrap="nowrap" gap="sm">
                    <TeamLogo team={s.team} size={44} />
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700} truncate>
                        {s.team.name}
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {s.manager} · Season {s.season} · {longDate(s.day)}
                      </Text>
                    </Stack>
                    <Badge variant="light" color={s.phase === "season" ? "hextech" : "gold"}>
                      {s.phase}
                    </Badge>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        loading={deleting === s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(s.id);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        )}

        <Group gap="xl" mt="auto" className={classes.leagueStrip}>
          {tierOne.map((lg) => (
            <Tooltip key={lg.id} label={lg.full_name}>
              <span>
                <LeagueLogo logo={lg.logo} name={lg.name} size={42} />
              </span>
            </Tooltip>
          ))}
          <Text fz="xs" c="dimmed" ml="auto">
            A fan project, not affiliated with or endorsed by Riot Games. Data from gol.gg and lolesports.com. Patch {catalog.patch}.
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}
