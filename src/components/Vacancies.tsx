import { Badge, Button, Group, Modal, Stack, Table, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Vacancy } from "../api/types";
import { shortDate } from "../lib/format";
import { useCareer } from "../state/career";
import { TeamLogo } from "./Media";
import { Stars } from "./Stars";
import { Empty } from "./Ui";

/**
 * AI clubs looking for a head coach. A club may offer you the job on its own; you can also apply.
 * Taking an offer means leaving your club, so it asks first.
 */
export function Vacancies({ vacancies, reach }: { vacancies: Vacancy[]; reach: number }) {
  const { act, busy } = useCareer();
  const [taking, setTaking] = useState<Vacancy | null>(null);
  if (!vacancies.length) {
    return <Empty>No club is looking for a head coach right now. Clubs that sack theirs appear here.</Empty>;
  }
  return (
    <>
      <Table verticalSpacing={6}>
        <Table.Tbody>
          {vacancies.map((v) => (
            <Table.Tr key={v.team.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <TeamLogo team={v.team} size={26} />
                  <Stack gap={0}>
                    <Text fz="sm" fw={700}>
                      {v.team.name}
                    </Text>
                    <Group gap={6} wrap="nowrap">
                      <Stars value={v.stars} size={11} />
                      <Text fz={11} c="dimmed">
                        {v.league_name} · until {shortDate(v.closes)}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              </Table.Td>
              <Table.Td ta="right">
                <Status v={v} busy={busy} onTake={() => setTaking(v)} onApply={() => act({ type: "apply_job", team: v.team.id })} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text fz="xs" c="dimmed" mt="sm">
        Your reputation reaches clubs up to {reach.toFixed(1)} stars. Clubs out of reach turn applications down.
      </Text>
      {taking && <TakeJob v={taking} onClose={() => setTaking(null)} />}
    </>
  );
}

function Status({ v, busy, onTake, onApply }: { v: Vacancy; busy: boolean; onTake: () => void; onApply: () => void }) {
  const { act } = useCareer();
  if (v.offer_until) {
    return (
      <Group gap="xs" justify="flex-end" wrap="nowrap">
        <Text fz={11} c="dimmed">
          offer until {shortDate(v.offer_until)}
        </Text>
        <Button size="compact-xs" variant="default" disabled={busy} onClick={() => act({ type: "decline_job", team: v.team.id })}>
          Decline
        </Button>
        <Button size="compact-xs" disabled={busy} onClick={onTake}>
          Take the job
        </Button>
      </Group>
    );
  }
  if (v.declined) return <Badge variant="light" color="gray">declined</Badge>;
  if (v.applied) return <Badge variant="light" color="red">turned you down</Badge>;
  return (
    <Button size="compact-xs" variant="light" disabled={busy} onClick={onApply}>
      {v.in_reach ? "Apply" : "Apply (out of reach)"}
    </Button>
  );
}

function TakeJob({ v, onClose }: { v: Vacancy; onClose: () => void }) {
  const { career, act, busy } = useCareer();
  const navigate = useNavigate();

  async function take() {
    if (await act({ type: "accept_job", team: v.team.id })) navigate(`/career/${career.id}`);
  }

  return (
    <Modal
      opened
      onClose={onClose}
      centered
      size="sm"
      title={
        <Group gap="sm">
          <IconBriefcase size={20} color="var(--gold-bright)" />
          <Text fw={800}>Take the {v.team.tag} job?</Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Text fz="sm" c="gray.4">
          You leave {career.team.name} to become head coach of {v.team.name}. Your bids and talks at {career.team.tag} end, and the new
          board will want to meet you about its objectives.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Stay
          </Button>
          <Button loading={busy} onClick={take}>
            Take the job
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
