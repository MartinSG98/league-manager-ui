import { Badge, Box, Group, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconBan, IconCrosshair, IconStarFilled } from "@tabler/icons-react";

import type { ScoutingReport as Report } from "../api/types";
import { ROLE_NAMES } from "../lib/format";
import { useCatalog } from "../state/catalog";
import { ChampIcon, PlayerPhoto, RoleIcon, TeamLogo } from "./Media";
import { FormArrow, Ovr } from "./Ui";

const LEVEL_TEXT = ["", "Basic", "Solid", "Detailed", "Complete"];
const PLAN_TEXT: Record<string, Record<string, string>> = {
  style: { early: "Early game", balanced: "Balanced", scaling: "Scaling" },
  lane: { top: "Jungle plays top", mid: "Jungle plays mid", bot: "Jungle plays bot" },
  objectives: { dragons: "Dragon priority", balanced: "Balanced objectives", barons: "Baron priority" },
};

/** The analyst's report on an opponent. Sections the analyst could not fill are left out. */
export function ScoutingReport({ report, compact = false }: { report: Report; compact?: boolean }) {
  const { team } = useCatalog();
  const opponent = team[report.opponent];
  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="nowrap">
          <TeamLogo team={opponent} size={40} />
          <Stack gap={0}>
            <Text className="display" fz={24} lh={1}>
              {opponent?.name ?? report.opponent}
            </Text>
            <Text fz="xs" c="dimmed">
              {report.competition} · {report.label} · best of {report.best_of}
            </Text>
          </Stack>
        </Group>
        <Group gap={6}>
          <Text fz="xs" c="dimmed">
            {report.analyst ? `by ${report.analyst}` : "no analyst"}
          </Text>
          <Badge variant="light" color={report.level >= 3 ? "teal" : report.level === 2 ? "gold" : "gray"} leftSection={<IconStarFilled size={10} />}>
            {LEVEL_TEXT[report.level]} report
          </Badge>
        </Group>
      </Group>

      <Group gap={6}>
        <Text fz="xs" c="dimmed" tt="uppercase" fw={700} lts="0.08em" mr={4}>
          Form
        </Text>
        {report.form.length === 0 && (
          <Text fz="xs" c="dimmed">
            no results yet
          </Text>
        )}
        {report.form.map((f, i) => (
          <Badge key={i} size="sm" variant="light" color={f.won ? "teal" : "red"} tt="none">
            {f.won ? "W" : "L"} {f.score} {f.against}
          </Badge>
        ))}
      </Group>

      <Table verticalSpacing={4} horizontalSpacing="xs">
        <Table.Tbody>
          {report.players.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td w={24}>
                <RoleIcon role={p.role} size={16} />
              </Table.Td>
              <Table.Td>
                <Group gap={8} wrap="nowrap">
                  <PlayerPhoto photo={p.photo} name={p.name} size={28} />
                  <Text fw={700} fz="sm">
                    {p.name}
                  </Text>
                  {report.threat?.id === p.id && <IconCrosshair size={14} color="var(--side-red)" />}
                </Group>
              </Table.Td>
              <Table.Td w={70}>
                <Group gap={4} wrap="nowrap">
                  <Ovr value={p.overall} size="sm" />
                  <FormArrow value={p.form} />
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap={3} wrap="nowrap">
                  {p.signatures.map((c) => (
                    <ChampIcon key={c} id={c} size={22} />
                  ))}
                </Group>
              </Table.Td>
              {!compact && report.level >= 2 && (
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    {(p.recent ?? []).map(([c, games]) => (
                      <Group key={c} gap={2} wrap="nowrap">
                        <ChampIcon id={c} size={22} />
                        <Text fz={10} c="dimmed">
                          ×{games}
                        </Text>
                      </Group>
                    ))}
                    {(p.recent ?? []).length === 0 && (
                      <Text fz="xs" c="dimmed">
                        no games yet
                      </Text>
                    )}
                  </Group>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {!compact && report.level >= 2 && (
        <Text fz={11} c="dimmed" mt={-8}>
          Icons: signature champions, then the champions played most this season.
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: compact ? 1 : 2 }} spacing="md">
        {report.plan && (
          <Box>
            <Text className="eyebrow" mb={6}>
              Game plan
            </Text>
            <Group gap={6}>
              {(["style", "lane", "objectives"] as const).map((k) => (
                <Badge key={k} variant="outline" color="gray" tt="none">
                  {PLAN_TEXT[k][report.plan![k]]}
                </Badge>
              ))}
            </Group>
          </Box>
        )}
        {report.bans && (
          <Box>
            <Group gap={6} mb={6}>
              <IconBan size={14} />
              <Text className="eyebrow">Ban priorities</Text>
            </Group>
            <Group gap={6}>
              {report.bans.map((c) => (
                <ChampIcon key={c} id={c} size={36} />
              ))}
            </Group>
          </Box>
        )}
        {report.threat && (
          <Box>
            <Group gap={6} mb={6}>
              <IconCrosshair size={14} />
              <Text className="eyebrow">Key player</Text>
            </Group>
            <Text fz="sm">
              <b>{report.threat.name}</b> ({ROLE_NAMES[report.players.find((p) => p.id === report.threat!.id)?.role ?? "MID"]}), {report.threat.why}
            </Text>
          </Box>
        )}
        {report.weaknesses && report.weaknesses.length > 0 && (
          <Box>
            <Group gap={6} mb={6}>
              <IconAlertTriangle size={14} />
              <Text className="eyebrow">Weak spots</Text>
            </Group>
            <Stack gap={2}>
              {report.weaknesses.map((w) => (
                <Text key={w} fz="sm">
                  {w}
                </Text>
              ))}
            </Stack>
          </Box>
        )}
      </SimpleGrid>
      {report.level < 4 && (
        <Text fz="xs" c="dimmed">
          {report.level < 2 && "A better analyst would add what they play and their game plan. "}
          {report.level < 3 && "Ban priorities and their key player need a detailed report. "}
          Weak spots only show in a complete report.
        </Text>
      )}
    </Stack>
  );
}
