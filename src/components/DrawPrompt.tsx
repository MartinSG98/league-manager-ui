import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconArrowsShuffle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import type { PendingDraw } from "../api/types";
import { useCareer } from "../state/career";

/** A Swiss round was just drawn: watch the teams come out of the pots, or skip it. */
export function DrawPrompt({ draw }: { draw: PendingDraw }) {
  const { career, act, busy } = useCareer();
  const navigate = useNavigate();

  function watch() {
    navigate(`/career/${career.id}/competitions/${draw.competition}?draw=${draw.round}`);
    act({ type: "read_message", id: draw.message });
  }

  return (
    <Modal
      opened
      onClose={() => act({ type: "read_message", id: draw.message })}
      centered
      size="sm"
      title={
        <Group gap="sm">
          <IconArrowsShuffle size={20} color="var(--gold-bright)" />
          <Text fw={800}>The draw is in</Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Text fz="sm" c="gray.4">
          {draw.name}: the pairings for Swiss round {draw.round} are out. Watch the teams come out of the pots, or skip
          straight to the bracket.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" disabled={busy} onClick={() => act({ type: "read_message", id: draw.message })}>
            Skip
          </Button>
          <Button leftSection={<IconArrowsShuffle size={16} />} disabled={busy} onClick={watch}>
            Watch the draw
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
