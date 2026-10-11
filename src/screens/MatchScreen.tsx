import { Badge, Box, Button, Grid, Group, Paper, ScrollArea, SegmentedControl, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconBolt, IconPlayerPlayFilled, IconPlayerTrackNext, IconRobot, IconSearch, IconSwords } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Champion, GameView, LiveView, Role, Side, SideView, Suggestion, TimelineEvent } from "../api/types";
import { GameReport } from "../components/GameReport";
import { GoldGraph } from "../components/GoldGraph";
import { ChampIcon, ChampPortrait, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { Empty, FormArrow, Loading, Ovr, Screen, Section } from "../components/Ui";
import { clock, cx, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { readSpeed, useTimeline, writeSpeed } from "../lib/useTimeline";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { SeriesReport, teamsOf } from "./MatchDetailScreen";
import classes from "./MatchScreen.module.css";

export function MatchScreen() {
  const { career, revision } = useCareer();
  const live = useApi(() => api.live(career.id), [career.id, revision]);
  const [finished, setFinished] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  if (!career.live) {
    if (finished) return <FinishedSeries matchId={finished} />;
    return (
      <Screen>
        <Empty>No match today. {career.next_match ? "Press Continue to go to the next match day." : ""}</Empty>
      </Screen>
    );
  }
  if (!live.data) return <Loading text="Walking onto the stage…" />;
  const view = live.data;
  const gameKey = `${view.match.id}-${view.game}`;
  // While a game plays back, the series score must not give its result away.
  const hideLast = view.phase === "result" && revealed !== gameKey;

  return (
    <Screen>
      <SeriesHeader view={view} hideLast={hideLast} />
      {view.phase === "lineup" && <LineupStage view={view} onFinished={setFinished} />}
      {(view.phase === "draft" || view.phase === "ready") && <ChampSelectStage view={view} onFinished={setFinished} />}
      {view.phase === "result" && <ResultStage view={view} onFinished={setFinished} onRevealed={() => setRevealed(gameKey)} />}
    </Screen>
  );
}

// ---------- header ----------

function SeriesHeader({ view, hideLast }: { view: LiveView; hideLast: boolean }) {
  const m = view.match;
  const last = m.game_list[m.game_list.length - 1];
  const score: [number, number] = [...m.score];
  if (hideLast && last) score[last.winner === m.home?.id ? 0 : 1] -= 1;
  return (
    <Paper className={classes.header} mb="lg">
      <Group gap="md" wrap="nowrap">
        <TeamLogo team={m.home} size={64} />
        <Text className="display" fz={28} truncate>
          {m.home?.name}
        </Text>
      </Group>
      <Stack gap={2} align="center">
        <Group gap={6}>
          <LeagueLogo logo={m.competition_logo} name={m.competition_name} size={18} />
          <Text fz="xs" c="dimmed" tt="uppercase" fw={700} lts="0.08em">
            {m.competition_name} · {m.label}
          </Text>
        </Group>
        <Text className="display" fz={52} lh={1}>
          {score[0]} <Text span c="dimmed" inherit>:</Text> {score[1]}
        </Text>
        <Text fz="xs" c="dimmed">
          Game {view.game} · best of {m.best_of}
          {m.fearless && " · fearless"}
        </Text>
      </Stack>
      <Group gap="md" wrap="nowrap" justify="flex-end">
        <Text className="display" fz={28} truncate ta="right">
          {m.away?.name}
        </Text>
        <TeamLogo team={m.away} size={64} />
      </Group>
    </Paper>
  );
}

// ---------- lineup ----------

function LineupStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { act, busy } = useCareer();
  const theirs: Side = view.our_side === "blue" ? "red" : "blue";

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  return (
    <Stack gap="lg">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <LineupCard side={view.our_side} sideView={view[view.our_side]} label="Your lineup" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <LineupCard side={theirs} sideView={view[theirs]} label="Opponent" />
        </Grid.Col>
      </Grid>
      <Paper p="md">
        <Group justify="space-between" wrap="wrap">
          <Text fz="sm" c="dimmed" maw={520}>
            Change the starting five or tactics on the Squad screen before champion select starts.
            {view.select.locked.length > 0 && ` Fearless: ${view.select.locked.length} champions are already used in this series.`}
          </Text>
          <Group>
            <Button variant="default" leftSection={<IconPlayerTrackNext size={16} />} loading={busy} onClick={simSeries}>
              Simulate the series
            </Button>
            <Button variant="light" color="hextech" leftSection={<IconRobot size={16} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
              Auto draft
            </Button>
            <Button size="md" leftSection={<IconSwords size={18} />} disabled={busy} onClick={() => act({ type: "start_champ_select" })}>
              Champion select
            </Button>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
}

function LineupCard({ side, sideView, label }: { side: Side; sideView: SideView; label: string }) {
  return (
    <Section
      title={
        <span>
          {label} · <span className={`side-${side}`}>{side} side</span>
        </span>
      }
      right={
        <Text fz="xs" c="dimmed">
          strength <b>{sideView.strength}</b> · chemistry{" "}
          <b className={sideView.chemistry.score >= 0 ? "gain" : "loss"}>{signed(sideView.chemistry.score, 1)}</b>
        </Text>
      }
    >
      <SimpleGrid cols={5} spacing="sm">
        {sideView.lineup.map((p) => (
          <Stack key={p.id} gap={4} align="center">
            <PlayerPhoto photo={p.photo} name={p.name} size={64} ring={sideView.team.color} />
            <Group gap={4} wrap="nowrap">
              <RoleIcon role={p.slot} size={14} />
              <Text fw={700} fz="sm" truncate maw={80}>
                {p.name}
              </Text>
            </Group>
            <Group gap={6}>
              <Ovr value={p.overall} size="sm" />
              <FormArrow value={p.form} />
            </Group>
            <Group gap={2}>
              {p.signatures.map((c) => (
                <ChampIcon key={c} id={c} size={20} />
              ))}
            </Group>
          </Stack>
        ))}
      </SimpleGrid>
      <Text fz="xs" c="dimmed" mt="md">
        {sideView.tactics.style} game plan · jungle {sideView.tactics.lane} · {sideView.tactics.objectives}
      </Text>
    </Section>
  );
}

// ---------- champion select ----------

function ChampSelectStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { act, busy } = useCareer();
  const catalog = useCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const s = view.select;
  const turn = s.turn;
  const ourTurn = turn?.side === view.our_side;
  const ourPicks = view.our_side === "blue" ? s.blue_picks : s.red_picks;
  const openRoles = ROLES.filter((r) => !ourPicks[r]);
  const taken = new Set([...s.blue_bans, ...s.red_bans, ...Object.values(s.blue_picks), ...Object.values(s.red_picks), ...s.locked]);
  const ourLineup = Object.fromEntries(view[view.our_side].lineup.map((p) => [p.slot, p]));

  const champs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.champions.filter((c) => (filter === "ALL" || c.roles.includes(filter)) && (!q || c.name.toLowerCase().includes(q)));
  }, [catalog.champions, filter, query]);

  function choose(c: Champion) {
    if (!ourTurn || taken.has(c.id)) return;
    setSelected(c.id);
    if (turn?.kind === "pick") setRole(openRoles.find((r) => c.roles.includes(r)) ?? openRoles[0] ?? null);
  }

  async function lockIn() {
    if (!selected || !turn) return;
    if (turn.kind === "ban") await act({ type: "ban", champion: selected });
    else if (role) await act({ type: "pick", champion: selected, role });
    setSelected(null);
    setRole(null);
  }

  async function take(sg: Suggestion) {
    if (turn?.kind === "ban") await act({ type: "ban", champion: sg.champion });
    else if (sg.role) await act({ type: "pick", champion: sg.champion, role: sg.role });
  }

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  const masteryFor = (championId: string, r: Role) => {
    const p = ourLineup[r];
    return p ? view.mastery[p.id]?.[championId] ?? 0 : 0;
  };

  return (
    <Stack gap="md">
      <BanRow view={view} />
      <Box className={classes.selectBody}>
        <PickColumn side="blue" view={view} />
        <Stack gap="md" miw={0}>
          {view.phase === "ready" ? (
            <Paper p="xl" className={classes.ready}>
              <Text className="eyebrow" ta="center">
                Champion select complete
              </Text>
              <Text className="display" fz={40} ta="center">
                Ready for game {view.game}
              </Text>
              <SimpleGrid cols={2} spacing="lg" mt="md">
                {(["blue", "red"] as Side[]).map((side) => {
                  const comp = view.compositions[side];
                  return (
                    <Stack key={side} gap={4}>
                      <Group gap={6}>
                        <TeamLogo team={view[side].team} size={22} />
                        <Text className={`eyebrow side-${side}`}>composition</Text>
                        {comp && (
                          <Text fw={800} className={comp.value >= 0 ? "gain" : "loss"}>
                            {signed(comp.value, 1)}
                          </Text>
                        )}
                      </Group>
                      {comp?.notes.map((n) => (
                        <Text key={n} fz="sm" c="dimmed">
                          {n}
                        </Text>
                      ))}
                    </Stack>
                  );
                })}
              </SimpleGrid>
              <Group justify="center" mt="xl">
                <Button variant="default" leftSection={<IconPlayerTrackNext size={16} />} loading={busy} onClick={simSeries}>
                  Simulate the rest
                </Button>
                <Button size="lg" leftSection={<IconPlayerPlayFilled size={18} />} disabled={busy} onClick={() => act({ type: "play_game" })}>
                  Play game
                </Button>
              </Group>
            </Paper>
          ) : (
            <>
              <Paper p="sm" className={cx(classes.turn, ourTurn && classes.turnActive)}>
                <Group justify="space-between">
                  <Text fw={800} tt="uppercase" lts="0.06em" c={ourTurn ? "gold.3" : "dimmed"}>
                    {ourTurn ? `Your ${turn?.kind}` : "Opponent is choosing…"} · step {s.step + 1} / 20
                  </Text>
                  <Button size="xs" variant="light" color="hextech" leftSection={<IconRobot size={14} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
                    Let the assistant finish
                  </Button>
                </Group>
              </Paper>

              {ourTurn && view.suggestions.length > 0 && (
                <Section title={`Assistant · best ${turn?.kind === "ban" ? "bans" : "picks"}`}>
                  <SimpleGrid cols={{ base: 2, md: 3 }} spacing="xs">
                    {view.suggestions.slice(0, 6).map((sg) => (
                      <UnstyledButton key={`${sg.champion}-${sg.role ?? ""}`} className={classes.suggestion} disabled={busy} onClick={() => take(sg)}>
                        <ChampIcon id={sg.champion} size={40} />
                        <Stack gap={0} miw={0}>
                          <Group gap={4} wrap="nowrap">
                            {sg.role && <RoleIcon role={sg.role} size={14} />}
                            <Text fw={700} fz="sm" truncate>
                              {catalog.champion[sg.champion]?.name}
                            </Text>
                          </Group>
                          <Text fz={11} c="dimmed">
                            {turn?.kind === "ban" ? `threat ${signed(sg.threat ?? 0, 1)}` : `fit ${signed(sg.power ?? 0, 1)}`}
                            {sg.need ? ` · comp +${sg.need}` : ""}
                            {sg.counter ? ` · lane ${signed(sg.counter, 1)}` : ""}
                          </Text>
                        </Stack>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </Section>
              )}

              <Section pad={false}>
                <Group gap="sm" p="sm" style={{ borderBottom: "1px solid var(--line)" }}>
                  <SegmentedControl
                    size="xs"
                    value={filter}
                    onChange={(v) => setFilter(v as Role | "ALL")}
                    data={[{ value: "ALL", label: "All" }, ...ROLES.map((r) => ({ value: r, label: <RoleIcon role={r} size={14} /> }))]}
                  />
                  <TextInput size="xs" placeholder="Search champion" leftSection={<IconSearch size={14} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
                </Group>
                <ScrollArea h={380}>
                  <Box className={classes.grid}>
                    {champs.map((c) => {
                      const off = taken.has(c.id);
                      const best = Math.max(0, ...openRoles.filter((r) => c.roles.includes(r)).map((r) => masteryFor(c.id, r)));
                      return (
                        <UnstyledButton key={c.id} className={cx(classes.tile, selected === c.id && classes.tileSelected)} disabled={off || !ourTurn || busy} onClick={() => choose(c)}>
                          <ChampIcon id={c.id} size={52} dim={off} title={c.name} />
                          {best >= 50 && !off && <span className={classes.mastery}>{best}</span>}
                          <Text fz={10} c={off ? "dark.3" : "dimmed"} truncate maw={64}>
                            {c.name}
                          </Text>
                        </UnstyledButton>
                      );
                    })}
                  </Box>
                </ScrollArea>
              </Section>

              {selected && ourTurn && (
                <Paper p="sm" className={classes.lock}>
                  <Group gap="md" wrap="wrap">
                    <ChampIcon id={selected} size={48} />
                    <Text className="display" fz={26}>
                      {catalog.champion[selected]?.name}
                    </Text>
                    {turn?.kind === "pick" && (
                      <SegmentedControl
                        value={role ?? undefined}
                        onChange={(v) => setRole(v as Role)}
                        data={openRoles.map((r) => ({
                          value: r,
                          label: (
                            <Group gap={4} wrap="nowrap">
                              <RoleIcon role={r} size={14} />
                              <span>
                                {ourLineup[r]?.name}
                                {!catalog.champion[selected]?.roles.includes(r) && " (off-role)"}
                              </span>
                            </Group>
                          ),
                        }))}
                      />
                    )}
                    <Box style={{ flex: 1 }} />
                    <Button size="md" color={turn?.kind === "ban" ? "red" : "gold"} disabled={busy || (turn?.kind === "pick" && !role)} onClick={lockIn}>
                      {turn?.kind === "ban" ? "Ban" : "Lock in"}
                    </Button>
                  </Group>
                </Paper>
              )}
            </>
          )}
        </Stack>
        <PickColumn side="red" view={view} />
      </Box>
    </Stack>
  );
}

function BanRow({ view }: { view: LiveView }) {
  const s = view.select;
  const slots = (bans: string[]) =>
    Array.from({ length: 5 }, (_, i) => (bans[i] ? <ChampIcon key={i} id={bans[i]} size={36} dim /> : <span key={i} className={classes.emptyBan} />));
  return (
    <Paper p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Text className="eyebrow side-blue" mr={4}>
            Bans
          </Text>
          {slots(s.blue_bans)}
        </Group>
        {s.locked.length > 0 && (
          <Group gap={3} wrap="nowrap" visibleFrom="lg">
            <Text className="eyebrow" mr={4}>
              Fearless
            </Text>
            {s.locked.slice(0, 20).map((c) => (
              <ChampIcon key={c} id={c} size={22} dim />
            ))}
          </Group>
        )}
        <Group gap={6} wrap="nowrap">
          {slots(s.red_bans)}
          <Text className="eyebrow side-red" ml={4}>
            Bans
          </Text>
        </Group>
      </Group>
    </Paper>
  );
}

function PickColumn({ side, view }: { side: Side; view: LiveView }) {
  const catalog = useCatalog();
  const picks = side === "blue" ? view.select.blue_picks : view.select.red_picks;
  const sv = view[side];
  const choosing = view.select.turn?.side === side && view.select.turn.kind === "pick";
  return (
    <Stack gap={6} className={classes.column}>
      <Group gap="xs" justify={side === "red" ? "flex-end" : "flex-start"} wrap="nowrap">
        {side === "blue" && <TeamLogo team={sv.team} size={30} />}
        <Text fw={800} className={`side-${side}`} tt="uppercase" fz="sm">
          {side === view.our_side ? "You" : sv.team.tag}
        </Text>
        {side === "red" && <TeamLogo team={sv.team} size={30} />}
      </Group>
      {sv.lineup.map((p) => {
        const champ = picks[p.slot];
        return (
          <Box key={p.id} className={cx(classes.pickSlot, side === "red" && classes.pickRed, choosing && !champ && classes.pickWaiting)}>
            {champ && <ChampPortrait id={champ} className={classes.pickArt} />}
            <Box className={classes.pickShade} />
            <Group className={classes.pickInfo} gap={8} wrap="nowrap" justify={side === "red" ? "flex-end" : "flex-start"}>
              {side === "blue" && <PlayerPhoto photo={p.photo} name={p.name} size={32} />}
              <Stack gap={0} align={side === "red" ? "flex-end" : "flex-start"} miw={0}>
                <Group gap={4} wrap="nowrap">
                  <RoleIcon role={p.slot} size={13} />
                  <Text fw={800} fz="sm" truncate>
                    {p.name}
                  </Text>
                </Group>
                <Text fz={11} c={champ ? "gold.2" : "dimmed"} fw={champ ? 700 : 400}>
                  {champ ? catalog.champion[champ]?.name : "picking…"}
                </Text>
              </Stack>
              {side === "red" && <PlayerPhoto photo={p.photo} name={p.name} size={32} />}
            </Group>
          </Box>
        );
      })}
    </Stack>
  );
}

// ---------- the game ----------

function beatsFor(events: TimelineEvent[]): { ms: number }[] {
  return events.map((e, i) => {
    const next = events[i + 1];
    const gap = next ? next.t - e.t : 60;
    return { ms: Math.max(220, Math.min(1500, gap * 9)) };
  });
}

function ResultStage({ view, onFinished, onRevealed }: { view: LiveView; onFinished: (id: string) => void; onRevealed: () => void }) {
  const { career, act, busy } = useCareer();
  const game = useApi(() => api.game(career.id, view.match.id, view.game), [career.id, view.match.id, view.game]);
  if (!game.data?.timeline) return <Loading text="Loading the game…" />;
  return (
    <Playback
      key={`${view.match.id}-${view.game}`}
      view={view}
      data={game.data}
      busy={busy}
      onRevealed={onRevealed}
      onNext={async () => {
        const result = await act({ type: "next_game" });
        if (result && !result.career.live) onFinished(view.match.id);
      }}
    />
  );
}

const EVENT_ICON: Record<string, string> = {
  first_blood: "🩸", kill: "⚔", teamfight: "💥", dragon: "🐉", soul: "🐉", elder: "🐲", baron: "👾", herald: "🦀",
  grubs: "🪲", tower: "🗼", inhibitor: "💠", nexus: "🏆", note: "•",
};

function Playback({ view, data, busy, onNext, onRevealed }: { view: LiveView; data: GameView; busy: boolean; onNext: () => void; onRevealed: () => void }) {
  const events = data.timeline!.events;
  const beats = useMemo(() => beatsFor(events), [events]);
  const [speed, setSpeed] = useState(readSpeed());
  const timeline = useTimeline(beats, speed);
  useEffect(() => {
    if (timeline.done) onRevealed();
  }, [timeline.done, onRevealed]);
  const current = events[timeline.index];
  const shown = events.slice(0, timeline.index + 1).reverse();
  const minute = Math.floor((current?.t ?? 0) / 60);
  const counts = useMemo(() => {
    const upTo = events.slice(0, timeline.index + 1);
    const count = (kinds: string[], side: Side) => upTo.filter((e) => kinds.includes(e.kind) && e.side === side).length;
    return {
      towers: [count(["tower"], "blue"), count(["tower"], "red")],
      dragons: [count(["dragon", "soul"], "blue"), count(["dragon", "soul"], "red")],
      barons: [count(["baron"], "blue"), count(["baron"], "red")],
    };
  }, [events, timeline.index]);
  const record = data.game;
  const seriesOver = Math.max(...view.match.score) >= Math.floor(view.match.best_of / 2) + 1;
  const blueTeam = view.blue.team;
  const redTeam = view.red.team;

  function changeSpeed(next: string) {
    setSpeed(Number(next));
    writeSpeed(Number(next));
  }

  return (
    <Stack gap="lg">
      <Paper p="md" className={classes.scoreboard}>
        <Box className={classes.scoreRow}>
          <Group gap="sm" wrap="nowrap">
            <TeamLogo team={blueTeam} size={48} />
            <Text fw={800} className="side-blue" visibleFrom="sm">
              {blueTeam.tag}
            </Text>
          </Group>
          <Text className={cx(classes.bigKills, "side-blue")}>{current?.score[0] ?? 0}</Text>
          <Stack gap={0} align="center">
            <Text className={classes.clock}>{clock(current?.t ?? 0)}</Text>
            <Text fz="xs" c="dimmed">
              🗼 {counts.towers[0]}-{counts.towers[1]} · 🐉 {counts.dragons[0]}-{counts.dragons[1]} · 👾 {counts.barons[0]}-{counts.barons[1]}
            </Text>
          </Stack>
          <Text className={cx(classes.bigKills, "side-red")}>{current?.score[1] ?? 0}</Text>
          <Group gap="sm" wrap="nowrap" justify="flex-end">
            <Text fw={800} className="side-red" visibleFrom="sm">
              {redTeam.tag}
            </Text>
            <TeamLogo team={redTeam} size={48} />
          </Group>
        </Box>
        <GoldGraph gold={data.timeline!.gold} upTo={timeline.done ? undefined : minute} height={140} />
        <Group justify="space-between" mt="xs">
          <SegmentedControl size="xs" value={String(speed)} onChange={changeSpeed} data={["1", "2", "4"].map((v) => ({ value: v, label: `${v}×` }))} />
          {!timeline.done && (
            <Button size="xs" variant="subtle" leftSection={<IconBolt size={14} />} onClick={timeline.skip}>
              Skip to the end
            </Button>
          )}
        </Group>
      </Paper>

      {!timeline.done ? (
        <Paper p={0} className={classes.feed}>
          {shown.slice(0, 14).map((e, i) => (
            <Group key={events.length - i} gap="md" wrap="nowrap" className={cx(classes.event, i === 0 && classes.latest)}>
              <Text fz="xs" c="dimmed" w={44}>
                {clock(e.t)}
              </Text>
              <Text w={22} ta="center">
                {EVENT_ICON[e.kind] ?? "•"}
              </Text>
              <Text fz="sm" className={e.side ? `side-${e.side}` : undefined} fw={i === 0 ? 700 : 500}>
                {e.text}
              </Text>
            </Group>
          ))}
        </Paper>
      ) : (
        <>
          <Paper p="lg">
            <GameReport game={record} teams={teamsOf(view.match)} />
          </Paper>
          <Paper p="md">
            <Group justify="space-between">
              <Badge size="xl" color={record.winner === view[view.our_side].team.id ? "teal" : "red"} variant="light">
                {record.winner === view[view.our_side].team.id ? "Victory" : "Defeat"}
              </Badge>
              <Button size="md" loading={busy} rightSection={<IconPlayerPlayFilled size={16} />} onClick={onNext}>
                {seriesOver ? "Finish the series" : "Next game"}
              </Button>
            </Group>
          </Paper>
        </>
      )}
    </Stack>
  );
}

// ---------- after the series ----------

function FinishedSeries({ matchId }: { matchId: string }) {
  const { career, revision } = useCareer();
  const navigate = useNavigate();
  const match = useApi(() => api.match(career.id, matchId), [career.id, matchId, revision]);
  if (!match.data) return <Loading />;
  const won = match.data.winner === career.team.id;
  return (
    <Screen>
      <Paper p="xl" mb="lg" className={cx(classes.verdict, won ? classes.won : classes.lost)}>
        <Stack align="center" gap="xs">
          <Text className="eyebrow">Series over</Text>
          <Text className="display" fz={56} lh={1}>
            {won ? "Victory" : "Defeat"}
          </Text>
          <Group mt="sm">
            <Button component={Link} to={`/career/${career.id}`} variant="default">
              Back to the office
            </Button>
            <Button onClick={() => navigate(`/career/${career.id}/competitions/${match.data!.competition}`)}>Standings</Button>
          </Group>
        </Stack>
      </Paper>
      <SeriesReport match={match.data} />
    </Screen>
  );
}
