import { Alert, Badge, Button, Grid, Group, NumberInput, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconMessage } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { StaffDetail } from "../api/types";
import { PlayerPhoto, TeamLogo } from "../components/Media";
import { StaffCard } from "../components/Staff";
import { Loading, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { flag, money, STAFF_KIND_NAMES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

/** A coach or analyst: who they are, and talks to hire, extend or release them. */
export function StaffScreen() {
  const { staff: sid } = useParams();
  const { career, revision } = useCareer();
  const person = useApi(() => api.staffMember(career.id, sid!), [career.id, sid, revision]);
  if (!person.data) return <Loading />;
  const p = person.data;
  return (
    <Screen>
      <PageHeader
        icon={<PlayerPhoto photo={p.photo} name={p.name} size={72} />}
        eyebrow={p.position.toLowerCase() === STAFF_KIND_NAMES[p.kind].toLowerCase() ? p.position : `${STAFF_KIND_NAMES[p.kind]} · ${p.position}`}
        title={p.name}
        right={
          <Group gap="lg">
            {p.club ? (
              <Group gap="xs">
                <TeamLogo team={p.club} size={36} />
                <Text fw={700}>{p.club.name}</Text>
              </Group>
            ) : (
              <Badge variant="light" color="teal">
                free agent
              </Badge>
            )}
            <Ovr value={p.overall} size="lg" />
          </Group>
        }
      />
      <Text c="dimmed" fz="sm" mb="md">
        {flag(p.country)} {p.real_name ?? ""} {p.region}
        {p.joined_market ? ` · joined the market in ${p.joined_market}` : ""}
        {p.former_player && (
          <>
            {" · former player: "}
            <Link to={`/career/${career.id}/player/${p.former_player.id}`}>{p.former_player.name}</Link>
          </>
        )}
      </Text>
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StaffCard person={p} kind={p.kind} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StaffContract p={p} />
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function StaffContract({ p }: { p: StaffDetail }) {
  const { career, act, busy } = useCareer();
  const [salary, setSalary] = useState(0);
  const [years, setYears] = useState(String(p.wanted_years));
  const [confirmRelease, setConfirmRelease] = useState(false);
  useEffect(() => setSalary(Math.round((p.ask * 0.9) / 5) * 5), [p.id, p.ask]);

  const expiring = p.mine && p.contract_until !== null && p.contract_until <= career.season;
  const talking = !p.mine || expiring;
  const t = p.talks;
  return (
    <Section
      title={p.mine ? "Contract" : p.club ? `Hire from ${p.club.tag}` : "Hire"}
      right={
        p.mine ? (
          <Text fz="sm" c="dimmed">
            {money(p.salary)} a season until {p.contract_until}
          </Text>
        ) : undefined
      }
    >
      <Stack gap="sm">
        {talking && (
          <>
            <Text fz="sm" c="dimmed">
              Wants about {money(p.ask)} a season over {p.wanted_years} seasons.
              {p.compensation ? ` ${p.club?.name} want ${money(p.compensation)} compensation, paid from the bank when you agree.` : ""}
              {p.stars_wanted > 0 ? ` Works for clubs of ${Math.max(0, p.stars_wanted - 1).toFixed(1)} stars and up.` : ""}
            </Text>
            {p.problem ? (
              <Alert color="red" variant="light">
                {p.problem}
                {p.seat && (
                  <>
                    {" "}
                    <Link to={`/career/${career.id}/staff/${p.seat.id}`}>Open {p.seat.name}</Link>
                  </>
                )}
              </Alert>
            ) : (
              <>
                <Group align="flex-end" gap="md">
                  <NumberInput label="Salary a season (k$)" value={salary} onChange={(v) => setSalary(Number(v) || 0)} min={10} step={5} w={170} />
                  <Stack gap={4}>
                    <Text fz="sm" fw={500}>
                      Seasons
                    </Text>
                    <SegmentedControl value={years} onChange={setYears} data={["1", "2", "3"]} />
                  </Stack>
                </Group>
                <Text fz="xs" c="dimmed">
                  Room in your budget {money(p.budget_room)} · {p.rounds_left} round{p.rounds_left === 1 ? "" : "s"} of talks left
                </Text>
                <Group>
                  <Button
                    loading={busy}
                    disabled={salary > p.budget_room}
                    onClick={() => act({ type: "staff_offer", staff: p.id, salary, years: Number(years) })}
                  >
                    {p.mine ? "Offer extension" : "Make offer"}
                  </Button>
                  {t?.counter != null && (
                    <Button
                      variant="light"
                      color="hextech"
                      disabled={busy || t.counter > p.budget_room}
                      onClick={() => act({ type: "staff_accept_counter", staff: p.id })}
                    >
                      Accept {money(t.counter)} × {t.counter_years}
                    </Button>
                  )}
                </Group>
              </>
            )}
            {t?.message && (
              <Alert color="gold" variant="light" icon={<IconMessage size={16} />}>
                {t.message}
              </Alert>
            )}
          </>
        )}
        {p.mine && !expiring && (
          <Text fz="sm" c="dimmed">
            Signed through {p.contract_until}. Talks open in the contract's last season; if nobody extends it, they leave on free agency day.
          </Text>
        )}
        {p.mine && (
          <Group gap="xs">
            {!confirmRelease ? (
              <Button variant="subtle" color="gray" size="xs" onClick={() => setConfirmRelease(true)}>
                Release…
              </Button>
            ) : (
              <>
                <Text fz="xs" c="dimmed">
                  Pays {money(p.release_cost ?? 0)}, half the remaining contract. The seat stays empty until you hire someone or the window
                  closes.
                </Text>
                <Button size="xs" color="red" variant="light" loading={busy} onClick={() => act({ type: "staff_release", staff: p.id })}>
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
