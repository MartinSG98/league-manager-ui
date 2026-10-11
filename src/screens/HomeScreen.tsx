import { Badge, Box, Button, Grid, Group, Paper, Progress, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowRight, IconCheck, IconClock, IconSwords, IconTransfer, IconWand, IconX } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { CompetitionRow, SquadView } from "../api/types";
import { MatchCard } from "../components/MatchCard";
import { PlayerPhoto, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { Stars } from "../components/Stars";
import { StandingsTable } from "../components/StandingsTable";
import { Empty, Loading, Ovr, Screen, Section } from "../components/Ui";
import { longDate, money, ROLES, shortDate, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./Screens.module.css";

function currentCompetition(rows: CompetitionRow[], league: string): CompetitionRow | null {
  const mine = rows.filter((c) => c.mine);
  return (
    mine.find((c) => c.status === "running") ??
    mine.find((c) => c.status === "upcoming") ??
    rows.find((c) => c.league === league && c.status === "running") ??
    [...mine].reverse().find((c) => c.status === "finished") ??
    null
  );
}

/** The splash behind the banner: the franchise player's favourite champion. */
function heroChampion(squad: SquadView | null): string | null {
  if (!squad) return null;
  const star = squad.players.find((p) => p.id === squad.franchise) ?? squad.players[0];
  return star?.signatures[0] ?? star?.pool[0]?.champion ?? null;
}

export function HomeScreen() {
  const { career, revision } = useCareer();
  const base = `/career/${career.id}`;
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  const current = comps.data ? currentCompetition(comps.data, career.league) : null;
  const table = useApi(() => (current ? api.competition(career.id, current.id) : Promise.resolve(null)), [career.id, revision, current?.id]);
  const squad = useApi(() => api.squad(career.id), [career.id, revision]);
  const stage = table.data ? table.data.stages.find((s) => s.kind === "round_robin" || s.kind === "swiss") ?? null : null;

  return (
    <Screen>
      <Paper className={classes.hero} mb="lg">
        <SplashBackdrop id={heroChampion(squad.data)} strength={0.62} />
        <Box className={classes.heroInner}>
          {career.phase === "draft" ? (
            <Group justify="space-between" align="center" wrap="wrap">
              <Stack gap={4}>
                <Text className="eyebrow">Pre-season</Text>
                <Text className="display" fz={40} lh={1}>
                  The draft is running
                </Text>
                <Text c="gray.4">{career.draft?.my_turn ? "You are on the clock." : "The other teams are picking."}</Text>
              </Stack>
              <Button component={Link} to={`${base}/draft`} size="lg" leftSection={<IconWand size={18} />}>
                Draft room
              </Button>
            </Group>
          ) : career.window ? (
            <Group justify="space-between" align="center" wrap="wrap">
              <Stack gap={4}>
                <Text className="eyebrow">Off-season {career.season}</Text>
                <Text className="display" fz={40} lh={1}>
                  The transfer window is open
                </Text>
                <Text c="gray.4">
                  Until {longDate(career.window.closes)}. Contracts that end run out on {shortDate(career.window.free_agency)}.
                  {career.pending.offers > 0 && ` ${career.pending.offers} bid${career.pending.offers > 1 ? "s" : ""} waiting for your answer.`}
                </Text>
              </Stack>
              <Button component={Link} to={`${base}/transfers`} size="lg" leftSection={<IconTransfer size={18} />}>
                Transfers
              </Button>
            </Group>
          ) : career.next_match ? (
            <Stack gap="md">
              <Text className="eyebrow">{career.live ? "Match day" : "Next match"}</Text>
              <MatchCard match={career.next_match} mine={career.team.id} size={88} />
              {career.live && (
                <Group justify="center">
                  <Button component={Link} to={`${base}/match`} size="lg" leftSection={<IconSwords size={18} />}>
                    To the stage
                  </Button>
                </Group>
              )}
            </Stack>
          ) : (
            <Stack gap={4}>
              <Text className="eyebrow">Season {career.season}</Text>
              <Text className="display" fz={40} lh={1}>
                {career.season_over ? "The season is over" : "No match scheduled"}
              </Text>
              <Text c="gray.4">{career.season_over ? "Your review is in the inbox. Start the next season when you are ready." : "Continue to the next event."}</Text>
            </Stack>
          )}
        </Box>
      </Paper>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Section
            title={current ? current.name : "Standings"}
            pad={false}
            right={
              current && (
                <Button component={Link} to={`${base}/competitions/${current.id}`} variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
                  Full view
                </Button>
              )
            }
          >
            {!table.data && (career.phase === "draft" ? <Empty>The schedule is made after the draft.</Empty> : <Loading />)}
            {stage && <StandingsTable stage={stage} mine={career.team.id} careerId={career.id} />}
          </Section>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            {squad.data && squad.data.players.length > 0 && (
              <Section
                title="Your five"
                right={
                  <Button component={Link} to={`${base}/squad`} variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
                    Squad
                  </Button>
                }
              >
                <SimpleGrid cols={5} spacing="xs">
                  {ROLES.map((r) => {
                    const p = squad.data!.players.find((x) => x.id === squad.data!.lineup[r]);
                    return (
                      <Stack key={r} gap={4} align="center">
                        <PlayerPhoto photo={p?.photo} name={p?.name ?? r} size={52} ring={career.team.color} />
                        <Group gap={4} wrap="nowrap">
                          <RoleIcon role={r} size={13} />
                          <Text fz="xs" fw={700} truncate maw={70}>
                            {p?.name ?? "—"}
                          </Text>
                        </Group>
                        {p && <Ovr value={p.overall} size="sm" />}
                      </Stack>
                    );
                  })}
                </SimpleGrid>
                <Group justify="space-between" mt="md">
                  <Text fz="sm" c="dimmed">
                    Team strength <b style={{ color: "var(--gold-bright)" }}>{squad.data.strength}</b>
                  </Text>
                  <Text fz="sm" c="dimmed">
                    Chemistry <b className={squad.data.chemistry.score >= 0 ? "gain" : "loss"}>{signed(squad.data.chemistry.score, 1)}</b>
                  </Text>
                  <Text fz="sm" c="dimmed">
                    Payroll <b>{money(squad.data.payroll)}</b>
                  </Text>
                </Group>
              </Section>
            )}

            <Section
              title="The board"
              right={
                <Button component={Link} to={`${base}/club`} variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
                  Club
                </Button>
              }
            >
              <Group justify="space-between" mb="xs">
                <Badge variant="light" color={career.board.confidence >= 45 ? "teal" : career.board.confidence >= 22 ? "orange" : "red"}>
                  {career.board.security}
                </Badge>
                <Stars value={career.reputation.team_stars} label={`Club reputation ${career.reputation.team}`} />
              </Group>
              <Progress value={career.board.confidence} color={career.board.confidence >= 45 ? "teal" : career.board.confidence >= 22 ? "orange" : "red"} size="sm" radius="xl" mb="sm" />
              <Stack gap={4}>
                {career.board.objectives.map((o) => (
                  <Group key={o.id} gap={8} wrap="nowrap">
                    {o.status === "met" ? (
                      <IconCheck size={15} color="var(--mantine-color-teal-5)" />
                    ) : o.status === "failed" ? (
                      <IconX size={15} color="var(--mantine-color-red-5)" />
                    ) : (
                      <IconClock size={15} color="var(--mantine-color-gray-6)" />
                    )}
                    <Text fz="sm" c={o.status === "pending" ? undefined : "dimmed"} truncate>
                      {o.text}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Section>

            <Section
              title="Inbox"
              pad={false}
              right={
                <Button component={Link} to={`${base}/inbox`} variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
                  All
                </Button>
              }
            >
              {career.inbox.slice(0, 7).map((m) => (
                <UnstyledButton key={m.id} component={Link} to={`${base}/inbox`} className={classes.inboxRow}>
                  <Badge size="xs" variant={m.read ? "outline" : "filled"} color={m.kind === "patch" ? "hextech" : "gold"} w={64}>
                    {m.kind}
                  </Badge>
                  <Text fz="sm" fw={m.read ? 400 : 700} truncate style={{ flex: 1 }}>
                    {m.subject}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {shortDate(m.day)}
                  </Text>
                </UnstyledButton>
              ))}
            </Section>
            <Group gap="xs" c="dimmed">
              <TeamLogo team={career.team} size={18} />
              <Text fz="xs" c="dimmed">
                {career.team.name} · bank {money(career.cash)}
              </Text>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}
