import { Alert, Button, Group, NumberInput, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconMessage } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { PlayerDetail } from "../api/types";
import { money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { Section } from "./Ui";

/** Sign a free agent, extend one of your own players, or release them. */
export function ContractPanel({ player }: { player: PlayerDetail }) {
  const { career, act, busy, revision } = useCareer();
  const mine = player.team === career.team.id;
  const talks = useApi(() => api.negotiation(career.id, player.id), [career.id, player.id, revision]);
  const [salary, setSalary] = useState<number>(0);
  const [years, setYears] = useState("2");
  const [confirmRelease, setConfirmRelease] = useState(false);

  useEffect(() => {
    if (talks.data && salary === 0) {
      setSalary(Math.round((talks.data.asking * 0.9) / 5) * 5);
      setYears(String(talks.data.years));
    }
  }, [talks.data, salary]);

  if (player.team && !mine) return null;
  const t = talks.data;
  if (!t) return null;
  const expiring = mine && player.contract_until !== null && player.contract_until <= career.season;

  return (
    <Section
      title={mine ? "Contract" : "Sign this player"}
      right={
        mine ? (
          <Text fz="sm" c="dimmed">
            {money(player.salary)} a season until {player.contract_until}
          </Text>
        ) : undefined
      }
    >
      <Stack gap="sm">
        {(!mine || expiring) && (
          <>
            <Text fz="sm" c="dimmed">
              {t.hint}
            </Text>
            {t.problem ? (
              <Alert color="red" variant="light">
                {t.problem}
              </Alert>
            ) : (
              <>
                <Group align="flex-end" gap="md">
                  <NumberInput
                    label="Salary a season (k$)"
                    value={salary}
                    onChange={(v) => setSalary(Number(v) || 0)}
                    min={15}
                    step={5}
                    w={170}
                    thousandSeparator=","
                  />
                  <Stack gap={4}>
                    <Text fz="sm" fw={500}>
                      Seasons
                    </Text>
                    <SegmentedControl value={years} onChange={setYears} data={["1", "2", "3"]} />
                  </Stack>
                </Group>
                <Text fz="xs" c="dimmed">
                  Room in your budget {money(t.budget_room)} · {t.rounds_left} round{t.rounds_left === 1 ? "" : "s"} of talks left
                </Text>
                <Group>
                  <Button loading={busy} disabled={salary > t.budget_room} onClick={() => act({ type: "offer", player: player.id, salary, years: Number(years) })}>
                    {mine ? "Offer extension" : "Make offer"}
                  </Button>
                  {t.counter !== null && (
                    <Button variant="light" color="hextech" disabled={busy || t.counter > t.budget_room} onClick={() => act({ type: "accept_counter", player: player.id })}>
                      Accept {money(t.counter)} × {t.counter_years}
                    </Button>
                  )}
                </Group>
              </>
            )}
            {t.message && (
              <Alert color="gold" variant="light" icon={<IconMessage size={16} />}>
                {t.message}
              </Alert>
            )}
          </>
        )}
        {mine && !expiring && (
          <Text fz="sm" c="dimmed">
            Signed through {player.contract_until}. Talks open in the contract's last season.
          </Text>
        )}
        {mine && (
          <Group gap="xs">
            {!confirmRelease ? (
              <Button variant="subtle" color="gray" size="xs" onClick={() => setConfirmRelease(true)}>
                Release…
              </Button>
            ) : (
              <>
                <Text fz="xs" c="dimmed">
                  Pays half the remaining contract as severance.
                </Text>
                <Button size="xs" color="red" variant="light" loading={busy} onClick={() => act({ type: "release", player: player.id })}>
                  Confirm release
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={() => setConfirmRelease(false)}>
                  Keep
                </Button>
              </>
            )}
          </Group>
        )}
      </Stack>
    </Section>
  );
}
