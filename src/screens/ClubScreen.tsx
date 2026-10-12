import { Alert, Badge, Grid, Group, List, Progress, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconClock, IconX } from "@tabler/icons-react";

import { api } from "../api/client";
import type { BoardView, ObjectiveStatus } from "../api/types";
import { BonusList } from "../components/BonusList";
import { TeamLogo } from "../components/Media";
import { Stars } from "../components/Stars";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { longDate, money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

const SECURITY_COLOR: Record<string, string> = {
  Secure: "teal", Stable: "lime", "Under pressure": "orange", "At risk": "red", "Final warning": "red", Sacked: "red",
};

export function ClubScreen() {
  const { career, revision } = useCareer();
  const board = useApi(() => api.board(career.id), [career.id, revision]);
  if (!board.data) return <Loading />;
  return <Club b={board.data} />;
}

function StatusIcon({ status }: { status: ObjectiveStatus }) {
  if (status === "met") return <IconCheck size={18} color="var(--mantine-color-teal-5)" />;
  if (status === "failed") return <IconX size={18} color="var(--mantine-color-red-5)" />;
  return <IconClock size={18} color="var(--mantine-color-gray-5)" />;
}

function Club({ b }: { b: BoardView }) {
  const { career } = useCareer();
  const color = SECURITY_COLOR[b.security] ?? "gray";
  return (
    <Screen>
      <PageHeader
        icon={<TeamLogo team={career.team} size={60} />}
        eyebrow="Club"
        title={career.team.name}
        right={
          <Group gap="xl">
            <Stack gap={2} align="flex-end">
              <Text className="eyebrow">Club reputation</Text>
              <Stars value={b.reputation.team_stars} size={18} label={`${b.reputation.team} (prestige ${b.reputation.prestige})`} />
            </Stack>
            <Stack gap={2} align="flex-end">
              <Text className="eyebrow">{career.manager}</Text>
              <Stars value={b.reputation.manager_stars} size={18} label={`Manager reputation ${b.reputation.manager}`} />
            </Stack>
          </Group>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="lg">
            <Section title="Board confidence" right={<Badge color={color} variant="light">{b.security}</Badge>}>
              <Group align="center" gap="lg" wrap="nowrap">
                <Text className="display" fz={54} lh={1} style={{ color: `var(--mantine-color-${color}-5)` }}>
                  {b.confidence}
                </Text>
                <Stack gap={6} style={{ flex: 1 }}>
                  <Progress value={b.confidence} color={color} size="lg" radius="xl" />
                  <Text fz="xs" c="dimmed">
                    Below {b.thresholds.warning} after a review the board warns you; the next review still below it ends your contract.
                    Back above {b.thresholds.safe} lifts the warning.
                    {b.joined && ` In charge since ${longDate(b.joined)}.`}
                  </Text>
                </Stack>
              </Group>
              {b.warned && (
                <Alert mt="md" color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
                  Final warning: the next review below {b.thresholds.warning} and the board looks for a new manager.
                </Alert>
              )}
            </Section>

            <SimpleGrid cols={{ base: 1, xl: b.bonuses.length > 0 ? 2 : 1 }} spacing="lg">
              <Section title={`Objectives for ${b.season}`}>
                {b.objectives.length === 0 ? (
                  <Empty>No objectives this season.</Empty>
                ) : (
                  <Stack gap="sm">
                    {b.objectives.map((o) => (
                      <Group key={o.id} justify="space-between" wrap="nowrap" gap="md">
                        <Group gap="sm" wrap="nowrap">
                          <StatusIcon status={o.status} />
                          <Stack gap={0}>
                            <Text fw={700}>{o.text}</Text>
                            <Text fz="xs" c="dimmed">
                              {o.result || o.progress || "Not decided yet"}
                              {o.target !== o.proposed && (o.kind === "worlds" ? o.target > o.proposed : o.target < o.proposed)
                                ? " · you promised more"
                                : o.target !== o.proposed
                                  ? " · you asked for less"
                                  : ""}
                            </Text>
                          </Stack>
                        </Group>
                        <Badge variant="light" color={o.status === "met" ? "teal" : o.status === "failed" ? "red" : "gray"}>
                          {o.status}
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Section>
              {b.bonuses.length > 0 && (
                <Section title="Bonuses" right={<Text fz="xs" c="dimmed">rewarded, never demanded</Text>}>
                  <BonusList bonuses={b.bonuses} />
                </Section>
              )}
            </SimpleGrid>

            <Section title="The board's reviews">
              {b.history.length === 0 ? (
                <Empty>The board reviews you after every split and after Worlds.</Empty>
              ) : (
                <List spacing={6} size="sm" c="gray.4">
                  {b.history.map((h) => (
                    <List.Item key={h}>{h}</List.Item>
                  ))}
                </List>
              )}
            </Section>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <Section title="Finances">
              <Table verticalSpacing={6}>
                <Table.Tbody>
                  <Row label="Salary budget" value={money(b.finances.budget)} />
                  <Row label="Payroll" value={money(b.finances.payroll)} />
                  <Row label="Bank (transfer funds)" value={money(b.finances.cash)} />
                  <Row label="Sponsors" value={`${money(b.finances.sponsors_per_week)} a week`} />
                </Table.Tbody>
              </Table>
              <Text fz="xs" c="dimmed" mt="sm">
                The owners fund the salary budget: what the payroll leaves of it goes to the bank every week, with sponsors and prize money.
                Every off-season the board adds money for transfers, more for a bigger club.
              </Text>
            </Section>

            <Section title={`${career.league} by reputation`} pad={false}>
              <Table verticalSpacing={5}>
                <Table.Tbody>
                  {b.league_reputation.map((row, i) => (
                    <Table.Tr key={row.team.id} style={row.team.id === career.team.id ? { background: "rgba(200, 170, 110, 0.08)" } : undefined}>
                      <Table.Td w={30} c="dimmed" fz="sm">
                        {i + 1}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <TeamLogo team={row.team} size={24} />
                          <Text fz="sm" fw={row.team.id === career.team.id ? 800 : 500}>
                            {row.team.name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Stars value={row.stars} size={12} label={`Reputation ${row.reputation}`} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Table.Tr>
      <Table.Td c="dimmed" fz="sm">
        {label}
      </Table.Td>
      <Table.Td ta="right" fw={700}>
        {value}
      </Table.Td>
    </Table.Tr>
  );
}
