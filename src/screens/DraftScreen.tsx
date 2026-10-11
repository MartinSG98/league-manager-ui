import {
  Accordion, Badge, Box, Button, Grid, Group, Paper, Progress, ScrollArea, SegmentedControl, Select, SimpleGrid, Stack, Switch,
  Table, Text, TextInput, Tooltip,
} from "@mantine/core";
import {
  IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipForward, IconPlayerTrackNext, IconRobot, IconSearch,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { DraftView, PoolPlayer, Role } from "../api/types";
import { ChampIcon, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo, TeamName } from "../components/Media";
import { PlayerHoverCard } from "../components/PlayerHoverCard";
import { Loading, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { cx, flag, money, ROLES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useClock, useThinkingTime } from "../lib/useClock";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import classes from "./DraftScreen.module.css";

type Sort = "overall" | "potential" | "salary";

// Seconds each AI team takes over its pick, so the board fills up where you can follow it.
const AI_PICK_SECONDS: [number, number] = [1.2, 2.4];

export function DraftScreen() {
  const { career, revision } = useCareer();
  const draft = useApi(() => api.draft(career.id), [career.id, revision]);

  if (draft.error && career.phase !== "draft") return <Navigate to={`/career/${career.id}`} replace />;
  if (!draft.data) return <Loading text="Opening the draft room…" />;
  if (draft.data.done) return <DraftDone draft={draft.data} />;
  return <DraftRoom d={draft.data} />;
}

function DraftRoom({ d }: { d: DraftView }) {
  const { career, act, busy } = useCareer();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const league = catalog.league[d.league];

  // The team on the clock thinks for a moment, then the server makes its pick.
  const waiting = !d.my_turn && !d.done && career.phase === "draft";
  const key = String(d.number);
  const thinking = useThinkingTime(key, ...AI_PICK_SECONDS);
  const left = useClock(key, thinking, waiting && !paused);
  const moved = useRef<string | null>(null);
  useEffect(() => {
    if (!waiting || paused || left > 0 || moved.current === key) return;
    moved.current = key;
    void act({ type: "draft_next" }, { quiet: true });
  }, [left, waiting, paused, key, act]);
  const rounds = d.required_rounds + d.optional_rounds;

  async function simAll() {
    const result = await act({ type: "draft_sim" });
    if (result?.career.phase === "season") navigate(`/career/${career.id}/squad`);
  }

  return (
    <Screen>
      <PageHeader
        icon={<LeagueLogo logo={league?.logo} name={d.league} size={52} />}
        eyebrow={`${d.league} pre-season draft · round ${Math.min(d.round, rounds)} of ${rounds}${d.round > d.required_rounds ? " · bench round" : ""} · pick ${d.number} of ${d.total}`}
        title={d.my_turn ? "You are on the clock" : "Waiting for the next pick"}
        right={
          <Group>
            {d.my_turn && (
              <Button variant="light" color="hextech" leftSection={<IconRobot size={16} />} loading={busy} onClick={() => act({ type: "draft_auto" })}>
                Assistant pick
              </Button>
            )}
            {d.my_turn && d.me.can_pass && (
              <Button variant="default" leftSection={<IconPlayerSkipForward size={16} />} disabled={busy} onClick={() => act({ type: "draft_pass" })}>
                Pass
              </Button>
            )}
            <Button variant="default" leftSection={<IconPlayerTrackNext size={16} />} disabled={busy} onClick={simAll}>
              Auto-draft the rest
            </Button>
          </Group>
        }
      />

      <OnTheClock d={d} paused={paused} onPause={() => setPaused((p) => !p)} progress={waiting ? 1 - left / thinking : 0} />

      <PickStrip d={d} />

      <Grid gap="lg" mt="md">
        <Grid.Col span={{ base: 12, xl: 8 }}>
          <Pool d={d} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xl: 4 }}>
          <Stack gap="lg">
            <MyRoster d={d} />
            <Feed d={d} />
            <Rivals d={d} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function OnTheClock({ d, paused, onPause, progress }: { d: DraftView; paused: boolean; onPause: () => void; progress: number }) {
  const { career, act, busy } = useCareer();
  const team = (id: string) => d.teams.find((t) => t.team.id === id)?.team;
  const onClock = d.on_the_clock ? team(d.on_the_clock) : null;
  const next = d.sequence.indexOf(career.team.id, d.number - 1);
  const until = next < 0 ? null : next - (d.number - 1);
  const last = d.picks[d.picks.length - 1];
  const lastTeam = last ? team(last.team) : null;

  return (
    <Paper p="sm" mb="md" className={classes.clockBar} data-mine={d.my_turn || undefined}>
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <TeamLogo team={onClock} size={40} />
          <Stack gap={0} miw={0}>
            <Text fw={800} tt="uppercase" lts="0.05em" c={d.my_turn ? "gold.3" : undefined} truncate>
              {d.my_turn ? "Your pick" : `${onClock?.name ?? "Next team"} ${paused ? "is waiting" : "is picking…"}`}
            </Text>
            <Text fz="xs" c="dimmed">
              Pick {d.number} of {d.total}
              {!d.my_turn && until !== null && ` · ${until === 1 ? "you are next" : `${until} picks until yours`}`}
              {until === null && " · you have no picks left"}
            </Text>
          </Stack>
        </Group>

        {last && (
          <Group gap="xs" wrap="nowrap" className={classes.lastPick} key={last.number} visibleFrom="md">
            <Text fz={10} c="dimmed" tt="uppercase" fw={700} lts="0.08em">
              Last pick
            </Text>
            <TeamLogo team={lastTeam} size={24} />
            {last.player ? (
              <>
                <PlayerPhoto photo={last.player.photo} name={last.player.name} size={30} />
                <RoleIcon role={last.player.role} size={14} />
                <Text fw={700} fz="sm">
                  {last.player.name}
                </Text>
                <Ovr value={last.player.overall} size="sm" />
              </>
            ) : (
              <Text fz="sm" c="dimmed">
                pass
              </Text>
            )}
          </Group>
        )}

        {!d.my_turn && (
          <Group gap="xs" wrap="nowrap">
            <Button size="xs" variant="default" leftSection={paused ? <IconPlayerPlayFilled size={14} /> : <IconPlayerPauseFilled size={14} />} onClick={onPause}>
              {paused ? "Resume" : "Pause"}
            </Button>
            {until !== null && (
              <Button size="xs" leftSection={<IconPlayerTrackNext size={14} />} disabled={busy} onClick={() => act({ type: "draft_next", until_mine: true })}>
                Skip to my pick
              </Button>
            )}
          </Group>
        )}
      </Group>
      {!d.my_turn && <Progress mt={8} size={3} value={Math.min(100, progress * 100)} color={paused ? "gray" : "gold"} transitionDuration={100} />}
    </Paper>
  );
}

function PickStrip({ d }: { d: DraftView }) {
  const rounds = d.required_rounds + d.optional_rounds;
  const perRound = d.sequence.length / rounds;
  const round = Math.min(d.round, rounds) - 1;
  const start = round * perRound;
  const team = (id: string) => d.teams.find((t) => t.team.id === id)!.team;
  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Group gap={8} wrap="nowrap" pb={4}>
        {d.sequence.slice(start, start + perRound).map((tid, i) => {
          const number = start + i + 1;
          const pick = d.picks.find((p) => p.number === number);
          const current = number === d.number;
          const fresh = number === d.picks.length;
          return (
            <Paper key={number} className={classes.slot} data-current={current || undefined} data-made={!!pick || undefined} data-fresh={fresh || undefined}>
              <Group justify="space-between" wrap="nowrap">
                <Text fz={10} c="dimmed" fw={700}>
                  #{number}
                </Text>
                <TeamLogo team={team(tid)} size={22} />
              </Group>
              {pick?.player ? (
                <Group gap={6} wrap="nowrap" mt={6}>
                  <PlayerPhoto photo={pick.player.photo} name={pick.player.name} size={26} />
                  <Text fz="xs" fw={700} truncate>
                    {pick.player.name}
                  </Text>
                </Group>
              ) : (
                <Text fz="xs" mt={10} c={current ? "gold.4" : "dimmed"} fw={current ? 700 : 400}>
                  {pick ? "pass" : current ? "on the clock" : "—"}
                </Text>
              )}
            </Paper>
          );
        })}
      </Group>
    </ScrollArea>
  );
}

function Pool({ d }: { d: DraftView }) {
  const { career, act, busy } = useCareer();
  const catalog = useCatalog();
  const [role, setRole] = useState<Role | "ALL">(d.me.open_roles[0] ?? "ALL");
  const [league, setLeague] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pickable, setPickable] = useState(false);
  const [sort, setSort] = useState<Sort>("overall");
  const openKey = d.me.open_roles.join(",");

  // After a pick fills a role, move the filter on to a role that is still open.
  useEffect(() => {
    setRole((current) => (current === "ALL" || d.me.open_roles.includes(current) ? current : d.me.open_roles[0] ?? "ALL"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const leagues = useMemo(() => Array.from(new Set(d.pool.map((p) => p.league))), [d.pool]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.pool
      .filter((p) => role === "ALL" || p.role === role)
      .filter((p) => !league || p.league === league)
      .filter((p) => !pickable || p.problem === null)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.origin?.name.toLowerCase().includes(q) ?? false))
      .sort((a, b) => (sort === "salary" ? a.salary - b.salary : b[sort] - a[sort]))
      .slice(0, 150);
  }, [d.pool, role, league, query, pickable, sort]);

  return (
    <Section title={`Player pool · ${d.pool.length} available`} pad={false}>
      <Group gap="sm" p="sm" className={classes.filters}>
        <SegmentedControl
          value={role}
          onChange={(v) => setRole(v as Role | "ALL")}
          data={[
            { value: "ALL", label: "All" },
            ...ROLES.map((r) => ({
              value: r,
              label: (
                <Group gap={4} wrap="nowrap" justify="center">
                  <RoleIcon role={r} size={14} />
                  {d.me.open_roles.includes(r) && <span className={classes.openDot} />}
                </Group>
              ),
            })),
          ]}
        />
        <Select
          placeholder="All leagues"
          clearable
          value={league}
          onChange={setLeague}
          data={leagues.map((l) => ({ value: l, label: catalog.league[l]?.name ?? l }))}
          w={170}
        />
        <TextInput placeholder="Player or team" leftSection={<IconSearch size={14} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} w={190} />
        <Select
          value={sort}
          onChange={(v) => setSort((v as Sort) ?? "overall")}
          data={[
            { value: "overall", label: "Best rated" },
            { value: "potential", label: "Highest potential" },
            { value: "salary", label: "Cheapest" },
          ]}
          w={160}
          allowDeselect={false}
        />
        <Switch label="Only pickable" checked={pickable} onChange={(e) => setPickable(e.currentTarget.checked)} />
      </Group>
      <ScrollArea h="calc(100vh - 330px)" mih={380}>
        <Table stickyHeader verticalSpacing={5}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={36} />
              <Table.Th>Player</Table.Th>
              <Table.Th>2026</Table.Th>
              <Table.Th className="num">OVR</Table.Th>
              <Table.Th className="num">POT</Table.Th>
              <Table.Th className="num">Salary</Table.Th>
              <Table.Th>Signatures</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((p) => (
              <PoolRow key={p.id} p={p} canAct={d.my_turn && !busy} onPick={() => act({ type: "draft_pick", player: p.id })} careerId={career.id} />
            ))}
          </Table.Tbody>
        </Table>
        {rows.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            Nobody fits those filters.
          </Text>
        )}
      </ScrollArea>
    </Section>
  );
}

function PoolRow({ p, canAct, onPick, careerId }: { p: PoolPlayer; canAct: boolean; onPick: () => void; careerId: string }) {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const league = catalog.league[p.league];
  return (
    <Table.Tr className={cx(p.problem && "dim")}>
      <Table.Td>
        <RoleIcon role={p.role} />
      </Table.Td>
      <Table.Td>
        <PlayerHoverCard player={p}>
          <Group gap="sm" wrap="nowrap" style={{ cursor: "pointer" }} onClick={() => navigate(`/career/${careerId}/player/${p.id}`)}>
            <PlayerPhoto photo={p.photo} name={p.name} size={34} />
            <Stack gap={0}>
              <Text fw={700} fz="sm">
                {p.name}
              </Text>
              <Text fz={11} c="dimmed">
                {flag(p.country)} {p.real_name ?? p.country ?? ""}
              </Text>
            </Stack>
          </Group>
        </PlayerHoverCard>
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          {p.origin && <TeamLogo team={{ tag: p.origin.tag, color: "#3b4661", logo: p.origin.logo }} size={22} />}
          <Tooltip label={league?.full_name ?? p.league}>
            <span>
              <LeagueLogo logo={league?.logo} name={p.league} size={18} />
            </span>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td className="num">
        <Ovr value={p.overall} />
      </Table.Td>
      <Table.Td className="num" c="dimmed">
        {p.potential}
      </Table.Td>
      <Table.Td className="num" fz="sm">
        {money(p.salary)}
      </Table.Td>
      <Table.Td>
        <Group gap={3} wrap="nowrap">
          {p.signatures.map((c) => (
            <ChampIcon key={c} id={c} size={24} />
          ))}
        </Group>
      </Table.Td>
      <Table.Td className="num">
        <Tooltip label={p.problem ?? "Draft this player"} disabled={!p.problem && canAct}>
          <Button size="compact-sm" disabled={!canAct || !!p.problem} onClick={onPick}>
            Draft
          </Button>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}

function MyRoster({ d }: { d: DraftView }) {
  const { career } = useCareer();
  const mine = d.teams.find((t) => t.team.id === career.team.id)!;
  const byId = Object.fromEntries(mine.roster.map((p) => [p.id, p]));
  const bench = mine.roster.filter((p) => !Object.values(mine.lineup).includes(p.id));
  const tight = d.me.left < d.me.reserve;
  return (
    <Section title="Your roster" right={<Text fz="sm" fw={700}>{money(d.me.left)} left</Text>}>
      <Stack gap="xs">
        <Progress value={(d.me.payroll / d.me.budget) * 100} color={tight ? "red" : "gold"} size="sm" radius="xl" />
        <Text fz="xs" c="dimmed">
          {money(d.me.payroll)} of {money(d.me.budget)}
          {d.me.open_roles.length > 0 && ` · filling ${d.me.open_roles.join(", ")} at the cheapest costs ${money(d.me.reserve)}`}
        </Text>
        {ROLES.map((r) => {
          const pid = mine.lineup[r];
          const p = pid ? byId[pid] : null;
          return (
            <Paper key={r} p="xs" className={classes.rosterSlot} data-open={!p || undefined}>
              <Group gap="sm" wrap="nowrap">
                <RoleIcon role={r} />
                {p ? (
                  <>
                    <PlayerPhoto photo={p.photo} name={p.name} size={34} ring={mine.franchise === p.id ? "#c8aa6e" : undefined} />
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={700} fz="sm" truncate>
                          {p.name}
                        </Text>
                        {mine.franchise === p.id && (
                          <Badge size="xs" variant="light">
                            Franchise
                          </Badge>
                        )}
                      </Group>
                      <Text fz="xs" c="dimmed">
                        {money(p.salary)}
                      </Text>
                    </Stack>
                    <Ovr value={p.overall} />
                  </>
                ) : (
                  <Text fz="sm" c="dimmed">
                    Open
                  </Text>
                )}
              </Group>
            </Paper>
          );
        })}
        {bench.length > 0 && (
          <Text fz="xs" c="dimmed">
            Bench: {bench.map((p) => `${p.name} (${p.role})`).join(", ")}
          </Text>
        )}
      </Stack>
    </Section>
  );
}

function Feed({ d }: { d: DraftView }) {
  const team = (id: string) => d.teams.find((t) => t.team.id === id)!.team;
  const recent = [...d.picks].reverse().slice(0, 10);
  return (
    <Section title="Latest picks" pad={false}>
      <Table verticalSpacing={4}>
        <Table.Tbody>
          {recent.map((p) => (
            <Table.Tr key={p.number}>
              <Table.Td c="dimmed" fz="xs" w={36}>
                #{p.number}
              </Table.Td>
              <Table.Td w={30}>
                <TeamLogo team={team(p.team)} size={22} />
              </Table.Td>
              <Table.Td>
                {p.player ? (
                  <Group gap={6} wrap="nowrap">
                    <PlayerPhoto photo={p.player.photo} name={p.player.name} size={24} />
                    <Text fz="sm" fw={600}>
                      {p.player.name}
                    </Text>
                  </Group>
                ) : (
                  <Text fz="sm" c="dimmed">
                    pass
                  </Text>
                )}
              </Table.Td>
              <Table.Td className="num">{p.player && <Ovr value={p.player.overall} size="sm" />}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {recent.length === 0 && (
        <Text c="dimmed" ta="center" py="md" fz="sm">
          No picks yet.
        </Text>
      )}
    </Section>
  );
}

function Rivals({ d }: { d: DraftView }) {
  const { career } = useCareer();
  return (
    <Section title="Rivals" pad={false}>
      <Accordion variant="default" chevronPosition="left">
        {d.teams
          .filter((t) => t.team.id !== career.team.id)
          .map((t) => (
            <Accordion.Item key={t.team.id} value={t.team.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  <TeamName team={t.team} size={22} />
                  <Text fz="xs" c="dimmed">
                    {t.roster.length} · {money(t.budget - t.payroll)} left
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap={4}>
                  {t.roster.map((p) => (
                    <Group key={p.id} gap="xs" wrap="nowrap">
                      <RoleIcon role={p.role} size={14} />
                      <PlayerPhoto photo={p.photo} name={p.name} size={22} />
                      <Text fz="sm" style={{ flex: 1 }}>
                        {p.name}
                      </Text>
                      <Ovr value={p.overall} size="sm" />
                    </Group>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
      </Accordion>
    </Section>
  );
}

function DraftDone({ draft }: { draft: DraftView }) {
  const { career } = useCareer();
  const catalog = useCatalog();
  return (
    <Screen>
      <PageHeader icon={<LeagueLogo logo={catalog.league[draft.league]?.logo} name={draft.league} size={52} />} eyebrow={`${draft.league} pre-season draft`} title="Draft results" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
        {draft.teams.map((t) => (
          <Paper key={t.team.id} p="md" className={cx(t.team.id === career.team.id && classes.mineResult)}>
            <TeamName team={t.team} size={32} />
            <Stack gap={6} mt="sm">
              {t.roster.map((p) => (
                <Group key={p.id} gap="xs" wrap="nowrap">
                  <RoleIcon role={p.role} size={14} />
                  <PlayerPhoto photo={p.photo} name={p.name} size={24} />
                  <Text fz="sm" style={{ flex: 1 }}>
                    {p.name}
                  </Text>
                  <Ovr value={p.overall} size="sm" />
                </Group>
              ))}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
      <Box h={20} />
    </Screen>
  );
}
