import { Badge, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { CompetitionRow } from "../api/types";
import { LeagueLogo, TeamLogo } from "../components/Media";
import { Empty, Loading, PageHeader, Screen } from "../components/Ui";
import { shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function CompetitionsScreen() {
  const { career, revision } = useCareer();
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  if (career.phase === "draft") {
    return (
      <Screen>
        <Empty>Competitions are scheduled once the draft is done.</Empty>
      </Screen>
    );
  }
  if (!comps.data) return <Loading />;
  const international = comps.data.filter((c) => c.kind === "international");
  const splits = [1, 2, 3].map((n) => comps.data!.filter((c) => c.split === n));

  return (
    <Screen>
      <PageHeader eyebrow={`Season ${career.season}`} title="Competitions" />
      <Stack gap="xl">
        {splits.map((rows, i) => (
          <Stack key={i} gap="sm">
            <Text className="eyebrow">Split {i + 1}</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing="sm">
              {rows.map((c) => (
                <CompetitionCard key={c.id} c={c} />
              ))}
            </SimpleGrid>
            {international[i] && (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <CompetitionCard c={international[i]} big />
              </SimpleGrid>
            )}
          </Stack>
        ))}
        {international.length < 3 && (
          <Text fz="sm" c="dimmed">
            First Stand, MSI and Worlds are announced when every region has finished the split before them.
          </Text>
        )}
      </Stack>
    </Screen>
  );
}

function CompetitionCard({ c, big = false }: { c: CompetitionRow; big?: boolean }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  return (
    <Paper
      p="md"
      onClick={() => navigate(`/career/${career.id}/competitions/${c.id}`)}
      style={{ cursor: "pointer", borderColor: c.mine ? "var(--gold)" : undefined }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <LeagueLogo logo={c.logo} name={c.short} size={big ? 64 : 40} />
        <Badge size="sm" variant={c.status === "running" ? "filled" : "light"} color={c.status === "finished" ? "gray" : c.status === "running" ? "hextech" : "gold"}>
          {c.status}
        </Badge>
      </Group>
      <Text fw={800} mt="sm" fz={big ? "xl" : "md"} className={big ? "display" : undefined} lineClamp={1}>
        {c.name}
      </Text>
      <Text fz="xs" c="dimmed">
        {shortDate(c.start)} – {shortDate(c.end)}
      </Text>
      {c.winner && (
        <Group gap={6} mt="sm" wrap="nowrap">
          <Text fz="xs" c="dimmed">
            Winner
          </Text>
          <TeamLogo team={c.winner} size={22} />
          <Text fz="sm" fw={700} truncate>
            {c.winner.name}
          </Text>
        </Group>
      )}
    </Paper>
  );
}
