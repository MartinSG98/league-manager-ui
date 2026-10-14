import { Badge, Button, Group, Modal, SegmentedControl, Select, Stack, Switch, Table, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Vacancy } from "../api/types";
import { shortDate } from "../lib/format";
import { useCareer } from "../state/career";
import { TeamLogo } from "./Media";
import { ClubStars } from "./Stars";
import { Empty } from "./Ui";

/**
 * AI clubs looking for a head coach. A club may offer you the job on its own; you can also apply.
 * Taking an offer means leaving your club, so it asks first. Each club links to its team page.
 * The list filters by league, by world stars and to the clubs in reach; offers always show.
 */
function reachText(reach: number | { region: number; world: number; region_name: string }): string {
  const upTo = (n: number) => (n >= 5 ? "every club" : `clubs up to ${n.toFixed(1)} stars`);
  if (typeof reach === "number") return `Your reputation reaches ${upTo(reach)}.`;
  return `In the ${reach.region_name} your reputation reaches ${upTo(reach.region)}; elsewhere ${upTo(reach.world)} (world stars).`;
}

export function Vacancies({ vacancies, reach }: { vacancies: Vacancy[]; reach: number | { region: number; world: number; region_name: string } }) {
  const { career, act, busy } = useCareer();
  const [taking, setTaking] = useState<Vacancy | null>(null);
  const [league, setLeague] = useState<string | null>(null);
  const [stars, setStars] = useState("0");
  const [reachOnly, setReachOnly] = useState(false);
  if (!vacancies.length) {
    return <Empty>No club is looking for a head coach right now. Clubs that sack theirs appear here.</Empty>;
  }
  const leagues = [...new Set(vacancies.map((v) => v.league_name))].sort();
  const shown = vacancies.filter(
    (v) => !!v.offer_until || ((!league || v.league_name === league) && v.world_stars >= Number(stars) && (!reachOnly || v.in_reach)),
  );
  return (
    <>
      <Group gap="md" mb="sm" wrap="wrap">
        <Select
          size="xs"
          w={150}
          placeholder="All leagues"
          clearable
          value={league}
          onChange={setLeague}
          data={leagues}
          aria-label="League"
        />
        <Group gap={6} wrap="nowrap">
          <Text fz="xs" c="dimmed">
            World stars
          </Text>
          <SegmentedControl
            size="xs"
            value={stars}
            onChange={setStars}
            data={[
              { value: "0", label: "Any" },
              { value: "2", label: "2+" },
              { value: "3", label: "3+" },
              { value: "4", label: "4+" },
              { value: "5", label: "5" },
            ]}
          />
        </Group>
        <Switch size="xs" label="In reach only" checked={reachOnly} onChange={(e) => setReachOnly(e.currentTarget.checked)} />
      </Group>
      {shown.length === 0 && <Empty>No club looking for a coach matches these filters.</Empty>}
      <Table verticalSpacing={6}>
        <Table.Tbody>
          {shown.map((v) => (
            <Table.Tr key={v.team.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Link to={`/career/${career.id}/team/${v.team.id}`}>
                    <TeamLogo team={v.team} size={26} />
                  </Link>
                  <Stack gap={0}>
                    <Text fz="sm" fw={700} component={Link} to={`/career/${career.id}/team/${v.team.id}`} className="link">
                      {v.team.name}
                    </Text>
                    <Group gap={6} wrap="nowrap">
                      <ClubStars r={v} size={10} inline />
                      <Text fz={11} c="dimmed">
                        until {shortDate(v.closes)}
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
        {reachText(reach)} Clubs out of reach turn applications down.
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
