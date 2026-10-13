import { Badge, Box, Button, Grid, Group, List, Paper, ScrollArea, SegmentedControl, Select, SimpleGrid, Stack, Table, Text, Tooltip } from "@mantine/core";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { PlayerDetail, Role, SquadView, Tactics } from "../api/types";
import { ChampIcon, PlayerPhoto, PlayerPortrait, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { StaffCard } from "../components/Staff";
import { Empty, FormArrow, Loading, Meter, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { ATTRIBUTE_NAMES, attributeBand, cx, flag, money, ROLE_NAMES, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./SquadScreen.module.css";

export function SquadScreen() {
  const { team } = useParams();
  const { career, revision } = useCareer();
  const squad = useApi(() => api.squad(career.id, team), [career.id, revision, team]);
  if (career.phase === "draft" && !team && squad.data && squad.data.players.length < 5) {
    return (
      <Screen>
        <Empty>Your squad takes shape in the draft.</Empty>
      </Screen>
    );
  }
  if (!squad.data) return <Loading />;
  return <Squad squad={squad.data} />;
}

function Squad({ squad }: { squad: SquadView }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const starters = ROLES.map((r) => squad.players.find((p) => p.id === squad.lineup[r]) ?? null);
  const bench = squad.players.filter((p) => !Object.values(squad.lineup).includes(p.id));
  const ordered = [...starters.filter((p): p is PlayerDetail => !!p), ...bench];
  // Your staff sit in the side column; another club's, with no tactics to show, get a row of their own.
  const staff = (
    <Section title="Staff">
      <SimpleGrid cols={{ base: 1, md: squad.is_mine ? 1 : 2 }} spacing="sm">
        <StaffCard person={squad.staff.coach} kind="coach" />
        <StaffCard person={squad.staff.analyst} kind="analyst" />
      </SimpleGrid>
    </Section>
  );

  return (
    <Screen>
      <PageHeader
        icon={<TeamLogo team={squad.team} size={60} />}
        eyebrow={squad.is_mine ? "Your squad" : "Team"}
        title={squad.team.name}
        right={
          <Group gap="xl">
            <Stat label="Strength" value={squad.strength.toFixed(1)} />
            <Stat label="Chemistry" value={signed(squad.chemistry.score, 1)} tone={squad.chemistry.score >= 0 ? "gain" : "loss"} />
            <Stat label="Payroll" value={`${money(squad.payroll)} / ${money(squad.budget)}`} />
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 2, md: 3, xl: 5 }} spacing="md">
        {starters.map((p, i) => (
          <StarterCard key={ROLES[i]} role={ROLES[i]} p={p} color={squad.team.color} franchise={squad.franchise} onOpen={(id) => navigate(`/career/${career.id}/player/${id}`)} />
        ))}
      </SimpleGrid>

      <Grid gap="lg" mt="lg">
        <Grid.Col span={{ base: 12, xl: 8 }}>
          <Stack gap="lg">
            <Section title={`Players · ${squad.players.length}`} pad={false}>
              <ScrollArea type="auto">
                <Table verticalSpacing={6}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={34} />
                      <Table.Th>Player</Table.Th>
                      <Table.Th className="num">OVR</Table.Th>
                      <Table.Th className="num">POT</Table.Th>
                      {Object.entries(ATTRIBUTE_NAMES).map(([key, name]) => (
                        <Table.Th key={key} className="num">
                          <Tooltip label={name}>
                            <span>{name.slice(0, 4)}</span>
                          </Tooltip>
                        </Table.Th>
                      ))}
                      <Table.Th>Form</Table.Th>
                      <Table.Th>Morale</Table.Th>
                      <Table.Th className="num">Salary</Table.Th>
                      <Table.Th className="num">To</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {ordered.map((p) => (
                      <Table.Tr key={p.id} className={cx(bench.includes(p) && "dim")} style={{ cursor: "pointer" }} onClick={() => navigate(`/career/${career.id}/player/${p.id}`)}>
                        <Table.Td>
                          <RoleIcon role={p.role} />
                        </Table.Td>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <PlayerPhoto photo={p.photo} name={p.name} size={30} />
                            <Text fw={700} fz="sm">
                              {p.name}
                            </Text>
                            {p.rookie && (
                            <Badge size="xs" color="lime" variant="light">
                              rookie
                            </Badge>
                          )}
                          {p.retiring && (
                            <Badge size="xs" color="orange" variant="light">
                              last season
                            </Badge>
                          )}
                          {squad.listed.includes(p.id) && (
                              <Badge size="xs" color="orange" variant="light">
                                listed
                              </Badge>
                            )}
                            {p.status
                              .filter((s) => s !== "Sharp")
                              .map((s) => (
                                <Badge key={s} size="xs" color="red" variant="light">
                                  {s}
                                </Badge>
                              ))}
                          </Group>
                        </Table.Td>
                        <Table.Td className="num">
                          <Ovr value={p.overall} />
                        </Table.Td>
                        <Table.Td className="num" c="dimmed">
                          {p.potential}
                        </Table.Td>
                        {Object.keys(ATTRIBUTE_NAMES).map((a) => (
                          <Table.Td key={a} className={cx("num", `band-${attributeBand(p.attributes[a])}`)} fw={700} fz="sm">
                            {p.attributes[a]}
                          </Table.Td>
                        ))}
                        <Table.Td>
                          <FormArrow value={p.form} />
                        </Table.Td>
                        <Table.Td>
                          <Meter value={p.morale} color={p.morale >= 60 ? "teal" : "red"} label={`Morale ${p.morale}`} />
                        </Table.Td>
                        <Table.Td className="num" fz="sm">
                          {money(p.salary)}
                        </Table.Td>
                        <Table.Td className="num" c="dimmed" fz="sm">
                          {p.contract_until ?? "—"}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Section>
            {squad.is_mine && <TacticsPanel tactics={squad.tactics} />}
            {squad.is_mine && bench.length > 0 && <LineupPanel squad={squad} />}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 4 }}>
          <Stack gap="lg">
            <Section title="Chemistry" right={<Text fw={800} className={squad.chemistry.score >= 0 ? "gain" : "loss"}>{signed(squad.chemistry.score, 1)}</Text>}>
              <List spacing={6} size="sm" c="dimmed">
                {squad.chemistry.reasons.map((r) => (
                  <List.Item key={r}>{r}</List.Item>
                ))}
              </List>
            </Section>
            {squad.is_mine && staff}
          </Stack>
        </Grid.Col>
        {!squad.is_mine && <Grid.Col span={12}>{staff}</Grid.Col>}
      </Grid>
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Stack gap={0}>
      <Text className="eyebrow">{label}</Text>
      <Text fw={800} fz="xl" className={tone}>
        {value}
      </Text>
    </Stack>
  );
}

function StarterCard({ role, p, color, franchise, onOpen }: { role: Role; p: PlayerDetail | null; color: string; franchise: string | null; onOpen: (id: string) => void }) {
  if (!p) {
    return (
      <Paper p="md" className={classes.starter}>
        <Group gap="xs">
          <RoleIcon role={role} />
          <Text c="dimmed">No {ROLE_NAMES[role].toLowerCase()}</Text>
        </Group>
      </Paper>
    );
  }
  return (
    <Paper className={classes.starter} onClick={() => onOpen(p.id)}>
      <SplashBackdrop id={p.signatures[0] ?? p.pool[0]?.champion} strength={0.72} position="center 15%" />
      <Box className={classes.starterInner}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={6}>
            <RoleIcon role={role} size={20} />
            {franchise === p.id && (
              <Badge size="xs" variant="filled">
                Franchise
              </Badge>
            )}
          </Group>
          <Ovr value={p.overall} size="lg" />
        </Group>
        <PlayerPortrait photo={p.photo} name={p.name} color={color} height={150} />
        <Text className="display" fz={26} lh={1} mt={6} truncate>
          {p.name}
        </Text>
        <Text fz="xs" c="dimmed" truncate>
          {flag(p.country)} {p.real_name ?? ROLE_NAMES[role]}
        </Text>
        <Group gap={4} mt={8}>
          {p.pool.slice(0, 5).map((c) => (
            <ChampIcon key={c.champion} id={c.champion} size={24} title={`${c.champion} · mastery ${c.mastery}`} />
          ))}
        </Group>
      </Box>
    </Paper>
  );
}

function TacticsPanel({ tactics }: { tactics: Tactics }) {
  const { act, busy } = useCareer();
  const [draft, setDraft] = useState(tactics);
  const changed = JSON.stringify(draft) !== JSON.stringify(tactics);
  return (
    <Section title="Tactics">
      <Stack gap="sm">
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Game plan
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.style}
            onChange={(v) => setDraft({ ...draft, style: v as Tactics["style"] })}
            data={[
              { value: "early", label: "Early game" },
              { value: "balanced", label: "Balanced" },
              { value: "scaling", label: "Scaling" },
            ]}
          />
        </Stack>
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Jungle focus
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.lane}
            onChange={(v) => setDraft({ ...draft, lane: v as Tactics["lane"] })}
            data={[
              { value: "top", label: "Top" },
              { value: "mid", label: "Mid" },
              { value: "bot", label: "Bot" },
            ]}
          />
        </Stack>
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Objectives
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.objectives}
            onChange={(v) => setDraft({ ...draft, objectives: v as Tactics["objectives"] })}
            data={[
              { value: "dragons", label: "Dragons" },
              { value: "balanced", label: "Balanced" },
              { value: "barons", label: "Grubs & Baron" },
            ]}
          />
        </Stack>
        <Text fz="xs" c="dimmed">
          A game plan that matches your champions' power curve is worth about a point of team strength.
        </Text>
        <Button disabled={!changed} loading={busy} onClick={() => act({ type: "set_tactics", tactics: draft })}>
          Save tactics
        </Button>
      </Stack>
    </Section>
  );
}

function LineupPanel({ squad }: { squad: SquadView }) {
  const { act, busy } = useCareer();
  const [lineup, setLineup] = useState(squad.lineup as Record<Role, string>);
  const changed = JSON.stringify(lineup) !== JSON.stringify(squad.lineup);
  return (
    <Section title="Starting five">
      <Stack gap="xs">
        {ROLES.map((r) => (
          <Select
            key={r}
            leftSection={<RoleIcon role={r} size={16} />}
            value={lineup[r]}
            allowDeselect={false}
            onChange={(v) => v && setLineup({ ...lineup, [r]: v })}
            data={squad.players.map((p) => ({ value: p.id, label: `${p.name} · ${p.role} ${p.overall}` }))}
          />
        ))}
        <Button disabled={!changed} loading={busy} onClick={() => act({ type: "set_lineup", lineup })}>
          Save lineup
        </Button>
      </Stack>
    </Section>
  );
}
