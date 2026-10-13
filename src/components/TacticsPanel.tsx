import { Button, SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import type { Tactics } from "../api/types";
import { useCareer } from "../state/career";
import { Section } from "./Ui";

/** The game plan, jungle focus and objectives, saved for the next game. On the Squad screen and
 * before each game of a series, next to the tale of the tape. */
export function TacticsPanel({ tactics }: { tactics: Tactics }) {
  const { act, busy } = useCareer();
  const saved = JSON.stringify(tactics);
  const [draft, setDraft] = useState(tactics);
  useEffect(() => setDraft(JSON.parse(saved) as Tactics), [saved]); // only when the saved tactics change, not on every refresh
  const changed = JSON.stringify(draft) !== saved;
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
