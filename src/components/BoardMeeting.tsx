import { Badge, Button, Group, Modal, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconBuildingSkyscraper } from "@tabler/icons-react";
import { useState } from "react";

import { api } from "../api/client";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { BonusList } from "./BonusList";
import { Stars } from "./Stars";
import { Loading } from "./Ui";

const STANCE_LABEL: Record<number, string> = { [-1]: "Ask for less", 0: "Accept", 1: "Promise more" };

/** The board's meeting about the season's objectives. It blocks the career until it is held. */
export function BoardMeeting() {
  const { career, act, busy, revision } = useCareer();
  const board = useApi(() => api.board(career.id), [career.id, revision]);
  const [stances, setStances] = useState<Record<string, number>>({});
  const b = board.data;
  const steps = b ? b.objectives.reduce((sum, o) => sum + (o.options?.find((x) => x.stance === (stances[o.id] ?? 0))?.budget ?? 0), 0) : 0;
  const budget = Math.round((career.budget * (1 + steps)) / 10) * 10;

  return (
    <Modal
      opened
      onClose={() => undefined}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      size="lg"
      centered
      title={
        <Group gap="sm">
          <IconBuildingSkyscraper size={22} color="var(--gold-bright)" />
          <Stack gap={0}>
            <Text className="eyebrow">Board meeting · season {career.board.season}</Text>
            <Text fw={800} fz="lg">
              {career.team.name}
            </Text>
          </Stack>
        </Group>
      }
    >
      {!b ? (
        <Loading />
      ) : (
        <Stack gap="md">
          <Text fz="sm" c="gray.4">
            The board ranks the club by its standing in the {b.reputation.region}{" "}
            <Stars value={b.reputation.region_stars} size={12} label={`Club reputation ${b.reputation.team}`} /> and asks for the
            following. Ask for less and the budget shrinks by {Math.round(b.finances.budget_step * 100)}% a step, promise more and it
            grows by as much. Every objective you miss costs the board's confidence.
          </Text>
          {b.objectives.map((o) => {
            const stance = stances[o.id] ?? 0;
            const option = o.options?.find((x) => x.stance === stance);
            return (
              <Paper key={o.id} p="sm" withBorder>
                <Stack gap={6}>
                  <Group justify="space-between" wrap="wrap" gap="xs">
                    <Text fw={700}>{option?.text ?? o.text}</Text>
                    {option && option.budget !== 0 && (
                      <Badge color={option.budget > 0 ? "teal" : "red"} variant="light">
                        budget {option.budget > 0 ? "+" : ""}
                        {Math.round(option.budget * 100)}%
                      </Badge>
                    )}
                  </Group>
                  <SegmentedControl
                    size="xs"
                    value={String(stance)}
                    onChange={(v) => setStances((s) => ({ ...s, [o.id]: Number(v) }))}
                    data={(o.options ?? []).map((x) => ({ value: String(x.stance), label: STANCE_LABEL[x.stance], disabled: !x.possible }))}
                  />
                </Stack>
              </Paper>
            );
          })}
          {b.bonuses.length > 0 && (
            <Paper p="sm" withBorder>
              <Text className="eyebrow" mb="xs">
                Bonuses on offer · nothing lost if you miss them
              </Text>
              <BonusList bonuses={b.bonuses} />
            </Paper>
          )}
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">
              Salary budget {money(budget)}
            </Text>
            <Button loading={busy} onClick={() => act({ type: "board_meeting", stances })}>
              Agree the objectives
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
