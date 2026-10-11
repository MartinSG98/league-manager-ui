import { Group, Stack, Text } from "@mantine/core";
import { IconCheck, IconClock, IconX } from "@tabler/icons-react";

import type { BoardBonus } from "../api/types";
import { money } from "../lib/format";

/** The board's bonuses: what each is worth and whether it was earned. */
export function BonusList({ bonuses }: { bonuses: BoardBonus[] }) {
  return (
    <Stack gap="xs">
      {bonuses.map((x) => (
        <Group key={x.id} justify="space-between" wrap="nowrap" gap="md">
          <Group gap="sm" wrap="nowrap">
            {x.status === "earned" ? (
              <IconCheck size={18} color="var(--mantine-color-teal-5)" />
            ) : x.status === "missed" ? (
              <IconX size={18} color="var(--mantine-color-gray-6)" />
            ) : (
              <IconClock size={18} color="var(--mantine-color-gray-5)" />
            )}
            <Text fw={600} c={x.status === "missed" ? "dimmed" : undefined}>
              {x.text}
            </Text>
          </Group>
          <Text fz="sm" c={x.status === "earned" ? "teal" : "dimmed"} style={{ whiteSpace: "nowrap" }}>
            +{x.confidence} confidence · {money(x.payment)}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
