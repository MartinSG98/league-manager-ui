import {
  Badge, Box, Button, Grid, Group, Paper, Progress, ScrollArea, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBolt, IconChevronDown, IconChevronsDown, IconChevronsUp, IconChevronUp, IconPlayerPlayFilled, IconPlayerTrackNext, IconRobot,
  IconSearch, IconSwords,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type {
  BoardChoice, BoardEntry, Champion, GameView, LiveView, PlayChoice, Role, Side, SideView, Suggestion, TimelineEvent,
} from "../api/types";
import { GameReport } from "../components/GameReport";
import { GoldGraph } from "../components/GoldGraph";
import { ChampIcon, ChampPortrait, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { PlayerHoverCard } from "../components/PlayerHoverCard";
import { ScoutingReport } from "../components/ScoutingReport";
import { Empty, FormArrow, Loading, Ovr, Screen, Section } from "../components/Ui";
import { clock, cx, ROLE_NAMES, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useClock, useThinkingTime } from "../lib/useClock";
import { readSpeed, SPEEDS, useGameClock, writeSpeed } from "../lib/useTimeline";
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
    <Screen wide>
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
          <LineupCard side={view.our_side} sideView={view[view.our_side]} label="Your lineup" mastery={view.mastery} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <LineupCard side={theirs} sideView={view[theirs]} label="Opponent" mastery={view.mastery} />
        </Grid.Col>
      </Grid>
      {view.scouting && (
        <Section title="Scouting report">
          <ScoutingReport report={view.scouting} />
        </Section>
      )}
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

function LineupCard({ side, sideView, label, mastery }: { side: Side; sideView: SideView; label: string; mastery: LiveView["mastery"] }) {
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
            <PlayerHoverCard player={p} mastery={mastery[p.id]} position="bottom">
              <PlayerPhoto photo={p.photo} name={p.name} size={64} ring={sideView.team.color} />
            </PlayerHoverCard>
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

const TURN_SECONDS = 30;
// The AI takes its time over every ban and pick, like a real team, instead of locking in at once.
const OPPONENT_THINKS: [number, number] = [7, 30];

function phaseName(step: number): string {
  if (step < 6) return "Ban phase 1";
  if (step < 12) return "Pick phase 1";
  if (step < 16) return "Ban phase 2";
  return "Pick phase 2";
}

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
  const theirTurn = !!turn && !ourTurn;
  const ourPicks = view.our_side === "blue" ? s.blue_picks : s.red_picks;
  const openRoles = ROLES.filter((r) => !ourPicks[r]);
  const taken = useMemo(
    () => new Set([...s.blue_bans, ...s.red_bans, ...Object.values(s.blue_picks), ...Object.values(s.red_picks), ...s.locked]),
    [s],
  );
  const ourLineup = Object.fromEntries(view[view.our_side].lineup.map((p) => [p.slot, p]));
  const board = ourTurn ? view.board : null;

  // ---- the clock: every turn has thirty seconds, the opponent uses a few of them ----
  const stepKey = `${view.match.id}-${view.game}-${s.step}`;
  const running = view.phase === "draft" && !!turn;
  const left = useClock(stepKey, TURN_SECONDS, running);
  const thinking = useThinkingTime(stepKey, ...OPPONENT_THINKS);
  const moved = useRef<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setRole(null);
  }, [stepKey]);

  useEffect(() => {
    if (!running || moved.current === stepKey) return;
    if (theirTurn && TURN_SECONDS - left >= thinking) {
      moved.current = stepKey;
      void act({ type: "opponent_turn" }, { quiet: true });
    } else if (ourTurn && left <= 0 && !busy) {
      moved.current = stepKey;
      void timeUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, running, stepKey, theirTurn, ourTurn, thinking, busy]);

  const champs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.champions.filter((c) => (filter === "ALL" || c.roles.includes(filter)) && (!q || c.name.toLowerCase().includes(q)));
  }, [catalog.champions, filter, query]);

  function choose(c: Champion) {
    if (!ourTurn || taken.has(c.id)) return;
    setSelected(c.id);
    if (turn?.kind === "pick") {
      const best = board?.champions[c.id]?.role ?? null;
      setRole(best && openRoles.includes(best) ? best : openRoles.find((r) => c.roles.includes(r)) ?? openRoles[0] ?? null);
    }
  }

  async function lock(champion: string, pickRole: Role | null) {
    if (!turn) return null;
    if (turn.kind === "ban") return act({ type: "ban", champion });
    if (pickRole) return act({ type: "pick", champion, role: pickRole });
    return null;
  }

  async function lockIn() {
    if (selected) await lock(selected, role);
  }

  async function take(sg: Suggestion) {
    await lock(sg.champion, sg.role ?? null);
  }

  async function timeUp() {
    // Like the real client: the champion you were hovering locks in, otherwise the assistant's choice.
    const champion = selected ?? view.suggestions[0]?.champion;
    const pickRole = selected ? role : view.suggestions[0]?.role ?? null;
    if (!champion) return;
    const result = await lock(champion, pickRole);
    if (result) {
      notifications.show({
        color: "gold",
        title: "Time ran out",
        message: `${selected ? "Locked in" : "The assistant locked in"} ${catalog.champion[champion]?.name ?? champion}.`,
      });
    }
  }

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  const masteryFor = (championId: string, r: Role) => {
    const p = ourLineup[r];
    return p ? view.mastery[p.id]?.[championId] ?? 0 : 0;
  };

  const choice = selected && board ? choiceFor(board.champions[selected], role) : null;

  return (
    <Stack gap="md">
      <BanRow view={view} />
      <Box className={classes.selectBody}>
        <PickColumn side="blue" view={view} unavailable={taken} />
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
              {view.plays && <SetPlayPicker plays={view.plays} />}
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
              {turn && (
                <Paper p="sm" className={cx(classes.turn, ourTurn && classes.turnActive)}>
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Group gap="sm" wrap="nowrap" miw={0}>
                      <TeamLogo team={view[turn.side].team} size={34} />
                      <Stack gap={0} miw={0}>
                        <Text fw={800} tt="uppercase" lts="0.06em" truncate c={ourTurn ? "gold.3" : undefined} className={ourTurn ? undefined : `side-${turn.side}`}>
                          {ourTurn ? `Your ${turn.kind}` : `${view[turn.side].team.tag} ${turn.kind === "ban" ? "banning" : "picking"}…`}
                        </Text>
                        <Text fz="xs" c="dimmed">
                          {phaseName(s.step)} · step {s.step + 1} of 20
                        </Text>
                      </Stack>
                    </Group>
                    <Text className={cx(classes.clock, classes.turnClock, left <= 10 && classes.clockLow)}>{Math.ceil(left)}</Text>
                    <Group gap="xs" wrap="nowrap">
                      {theirTurn && (
                        <Button size="xs" variant="default" leftSection={<IconPlayerTrackNext size={14} />} disabled={busy} onClick={() => act({ type: "opponent_turn", until_mine: true })}>
                          Skip to my turn
                        </Button>
                      )}
                      <Button size="xs" variant="light" color="hextech" leftSection={<IconRobot size={14} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
                        Let the assistant finish
                      </Button>
                    </Group>
                  </Group>
                  <Progress
                    mt={8}
                    size={4}
                    value={(left / TURN_SECONDS) * 100}
                    color={left <= 10 ? "red" : ourTurn ? "gold" : turn.side === "blue" ? "blue" : "red"}
                    transitionDuration={100}
                  />
                </Paper>
              )}

              {ourTurn && view.suggestions.length > 0 && (
                <Section
                  title={`${view.coach ? `${view.coach.name} suggests` : "Assistant"} · best ${turn?.kind === "ban" ? "bans" : "picks"}`}
                  right={
                    view.coach && (
                      <Text fz="xs" c="dimmed">
                        drafting {view.coach.drafting}/20
                      </Text>
                    )
                  }
                >
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
                            {sg.need ? ` · comp ${signed(sg.need, 1)}` : ""}
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
                  {board && (
                    <Group gap={10} ml="auto" visibleFrom="md">
                      <Group gap={4}>
                        <VerdictMark value={1} />
                        <Text fz={11} c="dimmed">
                          {board.kind === "ban" ? "worth banning" : "good pick"}
                        </Text>
                      </Group>
                      <Group gap={4}>
                        <VerdictMark value={-1} />
                        <Text fz={11} c="dimmed">
                          {board.kind === "ban" ? "you need it more" : "bad here"}
                        </Text>
                      </Group>
                    </Group>
                  )}
                </Group>
                <ScrollArea h={400}>
                  <Box className={classes.grid}>
                    {champs.map((c) => {
                      const off = taken.has(c.id);
                      const best = Math.max(0, ...openRoles.filter((r) => c.roles.includes(r)).map((r) => masteryFor(c.id, r)));
                      return (
                        <ChampTile
                          key={c.id}
                          champion={c}
                          entry={off ? undefined : board?.champions[c.id]}
                          kind={board?.kind ?? null}
                          coach={view.coach}
                          off={off}
                          mastery={turn?.kind === "pick" ? best : 0}
                          selected={selected === c.id}
                          disabled={off || !ourTurn || busy}
                          onClick={() => choose(c)}
                        />
                      );
                    })}
                  </Box>
                </ScrollArea>
              </Section>

              {selected && ourTurn && (
                <Paper p="sm" className={classes.lock}>
                  <Group gap="md" wrap="wrap">
                    <ChampIcon id={selected} size={52} />
                    <Stack gap={4} miw={0}>
                      <Text className="display" fz={26} lh={1}>
                        {catalog.champion[selected]?.name}
                      </Text>
                      {choice && (
                        <Group gap={4}>
                          {choice.notes
                            .filter((n) => Math.abs(n.value) >= 0.05)
                            .map((n) => (
                              <Badge key={n.text} size="sm" variant="light" color={n.value > 0 ? "teal" : "red"} tt="none">
                                {n.text} {signed(n.value, 1)}
                              </Badge>
                            ))}
                        </Group>
                      )}
                    </Stack>
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
        <PickColumn side="red" view={view} unavailable={taken} />
      </Box>
    </Stack>
  );
}

/** The score for the role the manager has chosen, which may be a flex pick's other role. */
/** After champion select: which set play to call this game, if any. Each one runs once a series. */
function SetPlayPicker({ plays }: { plays: PlayChoice }) {
  const { act, busy } = useCareer();
  const usable = plays.options.filter((o) => !o.used);
  return (
    <Stack gap="xs" mt="lg">
      <Group justify="space-between">
        <Text className="eyebrow">Set play</Text>
        <Text fz="xs" c="dimmed">
          {plays.used.length > 0 ? `Used this series: ${plays.options.filter((o) => o.used).map((o) => o.name).join(", ")}` : "Each play runs once a series"}
        </Text>
      </Group>
      {plays.options.length === 0 ? (
        <Text fz="sm" c="dimmed">
          The team knows no set play well enough yet. Drill one on the training screen.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <UnstyledButton className={cx(classes.playOption, plays.chosen === null && classes.playChosen)} disabled={busy} onClick={() => act({ type: "set_play", play: null })}>
            <Text fw={700} fz="sm">
              No set play
            </Text>
            <Text fz="xs" c="dimmed">
              Keep them all for later in the series
            </Text>
          </UnstyledButton>
          {plays.options.map((o) => (
            <Tooltip key={o.id} label={o.text} multiline w={280} disabled={o.used}>
              <UnstyledButton
                className={cx(classes.playOption, plays.chosen === o.id && classes.playChosen)}
                disabled={busy || o.used}
                data-used={o.used || undefined}
                onClick={() => act({ type: "set_play", play: o.id })}
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text fw={700} fz="sm">
                    {o.name}
                  </Text>
                  <Text fz="sm" fw={800} className={o.chance >= 0.6 ? "gain" : o.chance < 0.45 ? "loss" : undefined}>
                    {o.used ? "used" : `${Math.round(o.chance * 100)}%`}
                  </Text>
                </Group>
                <Text fz="xs" c="dimmed">
                  {o.phase} · min {o.minute} · {o.effect}
                  {o.learned < 100 ? ` · ${o.learned}% learned` : ""}
                  {o.fit > 0 ? " · suits the comp" : o.fit < 0 ? " · wrong comp for it" : ""}
                </Text>
              </UnstyledButton>
            </Tooltip>
          ))}
        </SimpleGrid>
      )}
      {usable.length > 0 && plays.chosen && (
        <Text fz="xs" c="dimmed" ta="center">
          Your assistant's call is selected; change it or pick no play.
        </Text>
      )}
    </Stack>
  );
}

function choiceFor(entry: BoardEntry | undefined, role: Role | null): BoardChoice | null {
  if (!entry) return null;
  if (!role || entry.role === role) return entry;
  return entry.others[role] ?? null;
}

function VerdictMark({ value }: { value: number }) {
  const Icon = value >= 2 ? IconChevronsUp : value === 1 ? IconChevronUp : value === -1 ? IconChevronDown : IconChevronsDown;
  return (
    <span className={cx(classes.mark, value > 0 ? classes.markUp : classes.markDown)}>
      <Icon size={12} stroke={3} />
    </span>
  );
}

function ChampTile({
  champion,
  entry,
  kind,
  coach,
  off,
  mastery,
  selected,
  disabled,
  onClick,
}: {
  champion: Champion;
  entry: BoardEntry | undefined;
  kind: "ban" | "pick" | null;
  coach: LiveView["coach"];
  off: boolean;
  mastery: number;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const tile = (
    <UnstyledButton className={cx(classes.tile, selected && classes.tileSelected, entry && !entry.fits && classes.tileUnfit)} disabled={disabled} onClick={onClick}>
      <Box className={classes.tileArt}>
        <ChampIcon id={champion.id} size={56} dim={off} tooltip={false} />
        {mastery >= 50 && !off && <span className={classes.mastery}>{mastery}</span>}
        {entry && entry.fits && entry.verdict !== 0 && <VerdictMark value={entry.verdict} />}
      </Box>
      <Text fz={10} c={off ? "dark.3" : "dimmed"} truncate maw={66}>
        {champion.name}
      </Text>
    </UnstyledButton>
  );
  return (
    <Tooltip
      label={entry ? <Breakdown name={champion.name} entry={entry} kind={kind} coach={coach} /> : champion.name}
      multiline
      w={entry ? 300 : undefined}
      openDelay={150}
      classNames={{ tooltip: classes.tip }}
      position="top"
      withArrow
    >
      <span className={classes.tileWrap}>{tile}</span>
    </Tooltip>
  );
}

function Breakdown({ name, entry, kind, coach }: { name: string; entry: BoardEntry; kind: "ban" | "pick" | null; coach: LiveView["coach"] }) {
  const others = Object.entries(entry.others) as [Role, BoardChoice][];
  return (
    <Stack gap={5}>
      <Group justify="space-between" wrap="nowrap">
        <Text fw={800} fz="sm">
          {name}
        </Text>
        {entry.role && (
          <Group gap={4} wrap="nowrap">
            <RoleIcon role={entry.role} size={12} />
            <Text fz={11} c="dimmed">
              {kind === "ban" ? `their ${ROLE_NAMES[entry.role].toLowerCase()}` : ROLE_NAMES[entry.role]}
            </Text>
          </Group>
        )}
      </Group>
      {entry.notes.map((n) => (
        <Group key={n.text} justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
          <Text fz="xs" c="gray.3">
            {n.text}
          </Text>
          {n.value !== 0 && (
            <Text fz="xs" fw={700} className={n.value > 0.05 ? "gain" : n.value < -0.05 ? "loss" : undefined} style={{ flex: "none" }}>
              {signed(n.value, 1)}
            </Text>
          )}
        </Group>
      ))}
      {entry.score !== null && (
        <Group justify="space-between" className={classes.tipTotal}>
          <Text fz="xs" fw={700} tt="uppercase" lts="0.06em">
            {kind === "ban" ? "Ban value" : "Pick value"}
          </Text>
          <Group gap={6}>
            {entry.verdict !== 0 && <VerdictMark value={entry.verdict} />}
            <Text fz="sm" fw={800} className={entry.score >= 0 ? "gain" : "loss"}>
              {signed(entry.score, 1)}
            </Text>
          </Group>
        </Group>
      )}
      {others.map(([r, o]) => (
        <Text key={r} fz={11} c="dimmed">
          Also playable {ROLE_NAMES[r].toLowerCase()}: {signed(o.score ?? 0, 1)}
        </Text>
      ))}
      <Text fz={10} c="dimmed" fs="italic">
        {coach ? `${coach.name}'s read (drafting ${coach.drafting}/20)` : "No assistant coach: a rough read"}
      </Text>
    </Stack>
  );
}

function BanRow({ view }: { view: LiveView }) {
  const s = view.select;
  const banning = s.turn?.kind === "ban" ? s.turn.side : null;
  const slots = (side: Side, bans: string[]) =>
    Array.from({ length: 5 }, (_, i) =>
      bans[i] ? (
        <span key={i} className={classes.banned}>
          <ChampIcon id={bans[i]} size={42} dim />
        </span>
      ) : (
        <span key={i} className={cx(classes.emptyBan, banning === side && i === bans.length && classes.banWaiting)} />
      ),
    );
  return (
    <Paper p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Text className="eyebrow side-blue" mr={4}>
            Bans
          </Text>
          {slots("blue", s.blue_bans)}
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
          {slots("red", s.red_bans)}
          <Text className="eyebrow side-red" ml={4}>
            Bans
          </Text>
        </Group>
      </Group>
    </Paper>
  );
}

function PickColumn({ side, view, unavailable }: { side: Side; view: LiveView; unavailable: Set<string> }) {
  const catalog = useCatalog();
  const picks = side === "blue" ? view.select.blue_picks : view.select.red_picks;
  const sv = view[side];
  const choosing = view.select.turn?.side === side && view.select.turn.kind === "pick";
  const red = side === "red";
  return (
    <Stack gap={8} className={classes.column}>
      <Group gap="xs" justify={red ? "flex-end" : "flex-start"} wrap="nowrap">
        {!red && <TeamLogo team={sv.team} size={32} />}
        <Text fw={800} className={`side-${side}`} tt="uppercase" fz="sm">
          {side === view.our_side ? "You" : sv.team.tag}
        </Text>
        {red && <TeamLogo team={sv.team} size={32} />}
      </Group>
      {sv.lineup.map((p) => {
        const champ = picks[p.slot];
        return (
          <PlayerHoverCard key={p.id} player={p} mastery={view.mastery[p.id]} unavailable={unavailable} position={red ? "left" : "right"}>
            <Box className={cx(classes.pickSlot, red && classes.pickRed, choosing && !champ && classes.pickWaiting)}>
              {champ && <ChampPortrait id={champ} className={classes.pickArt} />}
              <Box className={classes.pickShade} />
              <Group className={classes.pickInfo} gap={10} wrap="nowrap" justify={red ? "flex-end" : "flex-start"}>
                {!red && <PlayerPhoto photo={p.photo} name={p.name} size={40} />}
                <Stack gap={0} align={red ? "flex-end" : "flex-start"} miw={0}>
                  <Group gap={4} wrap="nowrap">
                    <RoleIcon role={p.slot} size={14} />
                    <Text fw={700} fz="sm" truncate>
                      {p.name}
                    </Text>
                  </Group>
                  {champ ? (
                    <Text className={classes.pickChamp} truncate>
                      {catalog.champion[champ]?.name}
                    </Text>
                  ) : (
                    <Text fz="xs" c={choosing ? "gold.4" : "dimmed"} fw={choosing ? 700 : 400}>
                      {choosing ? "picking…" : "waiting"}
                    </Text>
                  )}
                </Stack>
                {red && <PlayerPhoto photo={p.photo} name={p.name} size={40} />}
              </Group>
            </Box>
          </PlayerHoverCard>
        );
      })}
    </Stack>
  );
}

// ---------- the game ----------

// At 1x the game clock runs nine times faster than real time: a game minute takes about 6.7
// seconds and a 30-minute game about three and a half minutes. Faster speeds multiply that.
const GAME_SECONDS_PER_SECOND = 9;

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
  grubs: "🪲", tower: "🗼", inhibitor: "💠", nexus: "🏆", note: "•", play: "🎯", throw: "😱",
};

function Playback({ view, data, busy, onNext, onRevealed }: { view: LiveView; data: GameView; busy: boolean; onNext: () => void; onRevealed: () => void }) {
  const events = data.timeline!.events;
  const end = events[events.length - 1]?.t ?? 0;
  const [speed, setSpeed] = useState(readSpeed());
  const timeline = useGameClock(end, speed * GAME_SECONDS_PER_SECOND);
  useEffect(() => {
    if (timeline.done) onRevealed();
  }, [timeline.done, onRevealed]);
  // Every event whose time the clock has reached is on screen.
  const reached = useMemo(() => {
    let n = 0;
    while (n < events.length && events[n].t <= timeline.t) n += 1;
    return n;
  }, [events, timeline.t]);
  const current = events[reached - 1] as TimelineEvent | undefined;
  const shown = events.slice(0, reached).reverse();
  const minute = Math.floor(timeline.t / 60);
  const counts = useMemo(() => {
    const upTo = events.slice(0, reached);
    const count = (kinds: string[], side: Side) => upTo.filter((e) => kinds.includes(e.kind) && e.side === side).length;
    return {
      towers: [count(["tower"], "blue"), count(["tower"], "red")],
      dragons: [count(["dragon", "soul"], "blue"), count(["dragon", "soul"], "red")],
      barons: [count(["baron"], "blue"), count(["baron"], "red")],
    };
  }, [events, reached]);
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
            <Text className={classes.clock}>{clock(Math.floor(timeline.t))}</Text>
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
          <SegmentedControl size="xs" value={String(speed)} onChange={changeSpeed} data={SPEEDS.map((v) => ({ value: String(v), label: `${v}×` }))} />
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
            <Group key={reached - i} gap="md" wrap="nowrap" className={cx(classes.event, i === 0 && classes.latest, (e.kind === "play" || e.kind === "throw") && classes.special)}>
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
          {shown.length < 14 && (
            <Group gap="md" wrap="nowrap" className={cx(classes.event, shown.length === 0 && classes.latest)}>
              <Text fz="xs" c="dimmed" w={44}>
                {clock(0)}
              </Text>
              <Text w={22} ta="center">
                •
              </Text>
              <Text fz="sm" fw={shown.length === 0 ? 700 : 500}>
                Minions are spawning. {blueTeam.tag} on blue side, {redTeam.tag} on red.
              </Text>
            </Group>
          )}
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
