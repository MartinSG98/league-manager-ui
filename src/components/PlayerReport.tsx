import { Alert, Badge, Box, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import type { PlayerReport as Report, ReportGrade } from "../api/types";
import { ATTRIBUTE_NAMES, longDate, money, ROLE_NAMES } from "../lib/format";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { ChampIcon, PlayerPhoto, RoleIcon, TeamLogo } from "./Media";
import { Ovr } from "./Ui";

export const GRADE_COLOR: Record<ReportGrade, string> = { "A+": "gold", A: "teal", B: "lime", C: "yellow", D: "red" };
export const INTEREST_COLOR: Record<string, string> = { keen: "teal", open: "gold", reluctant: "orange", refuses: "red" };

export function GradeBadge({ grade, size = "sm" }: { grade: ReportGrade; size?: "sm" | "xl" }) {
  if (size === "xl") {
    return (
      <Box
        w={64}
        h={64}
        style={{ flex: "none", display: "grid", placeItems: "center", borderRadius: 8, background: `var(--mantine-color-${GRADE_COLOR[grade]}-filled)` }}
      >
        <Text className="display" fz={30} fw={800} c="dark.9" lh={1}>
          {grade}
        </Text>
      </Box>
    );
  }
  return (
    <Badge color={GRADE_COLOR[grade]} variant="light" size="sm" radius="sm">
      {grade}
    </Badge>
  );
}

/** The analyst's report on a shortlisted player. `header` adds who the report is about. */
export function PlayerReport({ report: r, header = false }: { report: Report; header?: boolean }) {
  const { career } = useCareer();
  const { team: teams } = useCatalog();
  const team = r.team ? teams[r.team] : null;
  return (
    <Stack gap="md">
      {header && (
        <Group gap="sm" wrap="nowrap">
          <PlayerPhoto photo={r.photo} name={r.name} size={48} />
          <Stack gap={0}>
            <Link to={`/career/${career.id}/player/${r.player}`} className="link">
              <Text fw={800} fz="lg">
                {r.name}
              </Text>
            </Link>
            <Group gap={6}>
              <RoleIcon role={r.role} size={14} />
              <Text fz="sm" c="dimmed">
                {ROLE_NAMES[r.role]} ·
              </Text>
              {team ? (
                <Group gap={4}>
                  <TeamLogo team={team} size={18} />
                  <Text fz="sm">{team.name}</Text>
                </Group>
              ) : (
                <Text fz="sm" c="hextech.4">
                  free agent
                </Text>
              )}
            </Group>
          </Stack>
        </Group>
      )}

      <Group gap="md" wrap="nowrap" align="center">
        <GradeBadge grade={r.grade} size="xl" />
        <Stack gap={2}>
          <Text fw={800}>{r.verdict}</Text>
          <Text fz="sm" c="gray.4">
            {r.fit}
          </Text>
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Fact label="Now">
          <Ovr value={r.overall} />
        </Fact>
        <Fact label={`Potential · ${r.confidence} estimate`}>
          <Text fw={800} fz="lg">
            {r.peaked ? "Has peaked" : `${r.potential[0]}–${r.potential[1]}`}
          </Text>
        </Fact>
        <Fact label="Would come?">
          <Badge color={INTEREST_COLOR[r.interest]} variant="light">
            {r.interest}
          </Badge>
        </Fact>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Fact label="Strengths">
          <Text fz="sm">{r.strengths.map((a) => ATTRIBUTE_NAMES[a] ?? a).join(", ")}</Text>
        </Fact>
        <Fact label="Weaknesses">
          <Text fz="sm">{r.weaknesses.map((a) => ATTRIBUTE_NAMES[a] ?? a).join(", ")}</Text>
        </Fact>
        <Fact label="Best champions">
          <Group gap={6}>
            {r.champions.map(([c, mastery]) => (
              <ChampIcon key={c} id={c} size={30} title={`${c} · mastery ${mastery}`} />
            ))}
          </Group>
        </Fact>
        <Fact label="This season">
          <Text fz="sm">
            {r.form ? `${r.form.games} games, ${r.form.wins} wins · KDA ${r.form.kda} · rating ${r.form.rating}` : "No games yet"}
          </Text>
        </Fact>
      </SimpleGrid>

      <Paper p="sm" withBorder>
        <Text className="eyebrow" mb={6}>
          The deal
        </Text>
        <Stack gap={4}>
          <Text fz="sm" c="gray.4">
            {r.interest_text}.
          </Text>
          <Text fz="sm">
            {r.contract ? `Contract to ${r.contract.until} at ${money(r.contract.salary)} a year.` : "No contract: no transfer fee."} Market value{" "}
            {money(r.value)}
            {r.asking !== null ? `, their club asks about ${money(r.asking)}` : r.contract ? ", not for sale" : ""}. Would want about {money(r.wage)} a year
            from you.
          </Text>
        </Stack>
      </Paper>

      {r.notes.map((n) => (
        <Alert key={n} color="orange" variant="light" py={6}>
          {n}
        </Alert>
      ))}

      <Text fz="xs" c="dimmed">
        Report {r.number} on {r.name} by {r.analyst ?? "your staff (no analyst)"} · {longDate(r.day)}
      </Text>
    </Stack>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={4}>
      <Text className="eyebrow">{label}</Text>
      {children}
    </Stack>
  );
}
