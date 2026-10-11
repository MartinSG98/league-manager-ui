import { Badge, Button, Group, Progress, Stack, Text } from "@mantine/core";
import { IconTargetArrow } from "@tabler/icons-react";

import type { ReviewReport as Report } from "../api/types";
import { useCareer } from "../state/career";

/** How big a problem an area is in the analyst's read, 0 (fine) to 1 or more (costs us games). */
function problemColor(score: number): string {
  if (score >= 0.45) return "red";
  if (score >= 0.15) return "orange";
  return "teal";
}

/** The analyst's review of recent games, with a button that puts the recommendation into training. */
export function ReviewReport({ report, focus }: { report: Report; focus?: string[] }) {
  const { act, busy } = useCareer();
  const applied = !!focus && report.recommend.length > 0 && report.recommend.every((a) => focus.includes(a)) && focus.length === report.recommend.length;
  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap">
        <Text fz="sm" c="dimmed">
          {report.analyst ? `${report.analyst} (scouting ${report.skill})` : "Your coaching staff"} watched the last {report.games} games.
        </Text>
        {report.recommend.length > 0 && (
          <Button
            size="xs"
            variant={applied ? "default" : "light"}
            leftSection={<IconTargetArrow size={14} />}
            disabled={busy || applied}
            onClick={() => act({ type: "set_training", focus: report.recommend })}
          >
            {applied ? "In the training plan" : "Train it"}
          </Button>
        )}
      </Group>
      <Stack gap={8}>
        {report.areas.map((a) => (
          <Stack key={a.area} gap={2}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6}>
                <Text fz="sm" fw={700}>
                  {a.label}
                </Text>
                {report.recommend.includes(a.area) && (
                  <Badge size="xs" color="gold" variant="filled">
                    work on this
                  </Badge>
                )}
              </Group>
              <Text fz="xs" c="dimmed">
                team level {a.level}
              </Text>
            </Group>
            <Progress value={Math.max(4, Math.min(100, a.score * 100))} color={problemColor(a.score)} size={5} radius="xl" />
            <Text fz="xs" c="dimmed">
              {a.line}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
