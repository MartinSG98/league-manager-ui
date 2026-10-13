import {
  Badge, Box, Button, Group, Paper, Progress, ScrollArea, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Title, Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft, IconBolt, IconChevronDown, IconChevronsDown, IconChevronsUp, IconChevronUp, IconPlayerPlayFilled, IconPlayerTrackNext,
  IconRobot, IconSearch, IconSwords,
} from "@tabler/icons-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type {
  BoardChoice, BoardEntry, Champion, GameRecord, GameView, LiveView, PlayChoice, PlayerLine, Role, ScoutingReport as ScoutReport, Side, SideView,
  Suggestion, Tactics, TimelineEvent,
} from "../api/types";
import { GameIcon, type GameIconKind } from "../components/GameIcons";
import { GameReport } from "../components/GameReport";
import { ChampIcon, ChampPortrait, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { PlayerHoverCard } from "../components/PlayerHoverCard";
import { ScoutingReport } from "../components/ScoutingReport";
import { Empty, Loading, Screen, Section } from "../components/Ui";
import { clock, cx, ROLE_NAMES, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useClock, useThinkingTime } from "../lib/useClock";
import { readSpeed, SPEEDS, useGameClock, writeSpeed } from "../lib/useTimeline";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { SeriesReport, teamsOf } from "./MatchDetailScreen";
import classes from "./MatchScreen.module.css";

const other = (side: Side): Side => (side === "blue" ? "red" : "blue");
const sideColor = (side: Side) => (side === "blue" ? "var(--side-blue)" : "var(--side-red)");

const STYLE_TEXT: Record<Tactics["style"], string> = { early: "early game", balanced: "balanced game", scaling: "scaling game" };
const OBJECTIVE_TEXT: Record<Tactics["objectives"], string> = { dragons: "dragons first", balanced: "no objective first", barons: "grubs and Baron first" };
const tacticsLine = (t: Tactics) => `${STYLE_TEXT[t.style]} · jungle ${t.lane} · ${OBJECTIVE_TEXT[t.objectives]}`;

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
    <>
      <MatchBar view={view} hideLast={hideLast} />
      <Screen>
        {view.phase === "lineup" && <LineupStage view={view} onFinished={setFinished} />}
        {(view.phase === "draft" || view.phase === "ready") && <ChampSelectStage view={view} onFinished={setFinished} />}
        {view.phase === "result" && <ResultStage view={view} onFinished={setFinished} onRevealed={() => setRevealed(gameKey)} />}
      </Screen>
    </>
  );
}

// ---------- the bar that stands in for the office's header on match day ----------

function MatchBar({ view, hideLast }: { view: LiveView; hideLast: boolean }) {
  const { career } = useCareer();
  const m = view.match;
  const last = m.game_list[m.game_list.length - 1];
  const score: [number, number] = [...m.score];
  if (hideLast && last) score[last.winner === m.home?.id ? 0 : 1] -= 1;
  return (
    <div className={classes.matchBar}>
      <Button component={Link} to={`/career/${career.id}`} variant="subtle" color="gray" size="sm" leftSection={<IconArrowLeft size={16} />}>
        Office
      </Button>
      <Group gap={8} wrap="nowrap" miw={0} style={{ flex: "1 1 auto" }}>
        <LeagueLogo logo={m.competition_logo} name={m.competition_name} size={22} />
        <Text className="eyebrow" truncate>
          {m.competition_name} · {m.label} · game {view.game} · best of {m.best_of}
          {m.fearless && " · fearless"}
        </Text>
      </Group>
      <Group gap="sm" wrap="nowrap">
        <TeamLogo team={m.home} size={30} />
        <Text fw={800} visibleFrom="sm">
          {m.home?.tag}
        </Text>
        <span className={classes.barScore}>
          {score[0]}{" "}
          <Text span c="dimmed" inherit>
            :
          </Text>{" "}
          {score[1]}
        </span>
        <Text fw={800} visibleFrom="sm">
          {m.away?.tag}
        </Text>
        <TeamLogo team={m.away} size={30} />
      </Group>
    </div>
  );
}

// ---------- before champion select: the tale of the tape ----------

function LineupStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { act, busy } = useCareer();
  const catalog = useCatalog();
  const ourSide = view.our_side;
  const theirSide = other(ourSide);
  const ours = view[ourSide];
  const theirs = view[theirSide];
  const champName = (id: string) => catalog.champion[id]?.name ?? id;
  const ourComfort = new Set(ours.lineup.flatMap((p) => p.signatures));
  const contested = [...new Set(theirs.lineup.flatMap((p) => p.signatures).filter((c) => ourComfort.has(c)))];
  const scouting = view.scouting;
  const weakest = [...theirs.lineup].sort((a, b) => a.overall - b.overall)[0]?.id;
  const threat = scouting?.threat?.id ?? null;
  const strengthShare = ours.strength / Math.max(1, ours.strength + theirs.strength);
  const chemShare = Math.min(0.9, Math.max(0.1, 0.5 + (ours.chemistry.score - theirs.chemistry.score) / 10));

  async function simSeries() {
    const result = await act({ type: "sim_series" });
    if (result && !result.career.live) onFinished(view.match.id);
  }

  return (
    <Stack gap="lg">
      <Paper radius={14} className={classes.tape}>
        <div className={classes.faceoff}>
          <TapeTeam sv={ours} side={ourSide} ours />
          <Stack gap={10}>
            <Text className="display" fz={26} c="dark.3" ta="center">
              VS
            </Text>
            <Compare label="Strength" ours={ours.strength.toFixed(1)} theirs={theirs.strength.toFixed(1)} share={strengthShare} ourSide={ourSide} />
            <Compare label="Chemistry" ours={signed(ours.chemistry.score, 1)} theirs={signed(theirs.chemistry.score, 1)} share={chemShare} ourSide={ourSide} />
          </Stack>
          <TapeTeam sv={theirs} side={theirSide} right />
        </div>
      </Paper>

      <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-lg)", alignItems: "flex-start" }}>
        <Box style={{ flex: "2 1 720px", minWidth: 0 }}>
          <Section title="Tale of the tape" pad={false} right={<Text fz="xs" c="dimmed">overall · form · comfort picks</Text>}>
            {ROLES.map((r) => {
              const us = ours.lineup.find((p) => p.slot === r);
              const them = theirs.lineup.find((p) => p.slot === r);
              if (!us || !them) return null;
              return (
                <LaneRow
                  key={r}
                  role={r}
                  us={us}
                  them={them}
                  ourSide={ourSide}
                  contested={contested}
                  champName={champName}
                  mastery={view.mastery}
                  note={them.id === threat ? "threat" : them.id === weakest ? "weakest" : null}
                />
              );
            })}
            <Group gap="lg" px="md" py="sm" fz="xs" c="dimmed" style={{ borderTop: "1px solid var(--line-soft)" }}>
              {contested.length > 0 && (
                <Group gap={6}>
                  <span className={classes.comfort} data-contested>
                    {champName(contested[0])}
                  </span>
                  a comfort pick both sides want
                </Group>
              )}
              <Group gap={6}>
                <span style={{ width: 14, height: 8, borderRadius: 3, background: sideColor(ourSide) }} />
                edge to you
              </Group>
              <Group gap={6}>
                <span style={{ width: 14, height: 8, borderRadius: 3, background: sideColor(theirSide) }} />
                edge to them
              </Group>
            </Group>
          </Section>
        </Box>
        <Stack gap="lg" style={{ flex: "1 1 380px", minWidth: 0 }}>
          {scouting && <ScoutRead report={scouting} champName={champName} />}
          {contested.length > 0 && (
            <Paper radius={14} p="md" className={classes.contested}>
              <Title order={2} className="display" fz={20}>
                Both sides want
              </Title>
              <Text fz="sm" c="gray.3" mt={6} lh={1.5}>
                {contested.map(champName).join(", ")}.{" "}
                {ourSide === "blue" ? "On blue side you pick first: take one, or ban the one that hurts most." : "They pick first: ban the one that hurts most."}
              </Text>
            </Paper>
          )}
        </Stack>
      </Box>

      <Paper radius={14} p="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Text fz="sm" c="dimmed" maw={560}>
            Lineup and tactics are set on the Squad screen.
            {view.select.locked.length > 0 && ` Fearless: ${view.select.locked.length} champions are already used in this series.`}
          </Text>
          <Group>
            <Button variant="default" leftSection={<IconPlayerTrackNext size={16} />} loading={busy} onClick={simSeries}>
              Simulate the series
            </Button>
            <Button variant="light" color="hextech" leftSection={<IconRobot size={16} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
              Let {view.coach?.name ?? "the assistant"} draft
            </Button>
            <Button size="lg" leftSection={<IconSwords size={18} />} disabled={busy} onClick={() => act({ type: "start_champ_select" })}>
              Champion select
            </Button>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
}

function TapeTeam({ sv, side, right = false, ours = false }: { sv: SideView; side: Side; right?: boolean; ours?: boolean }) {
  return (
    <div className={classes.teamSide} data-right={right || undefined}>
      <TeamLogo team={sv.team} size={80} />
      <Stack gap={6} miw={0} align={right ? "flex-end" : "flex-start"}>
        <span className={classes.sideChip} data-side={side}>
          {side} side{ours ? " · you" : ""}
        </span>
        <Text className={classes.teamName}>{sv.team.name}</Text>
        <Text fz="sm" c="gray.4">
          {tacticsLine(sv.tactics)}
        </Text>
      </Stack>
    </div>
  );
}

function Compare({ label, ours, theirs, share, ourSide }: { label: string; ours: string; theirs: string; share: number; ourSide: Side }) {
  return (
    <Box>
      <Group justify="space-between" fz="xs" c="dimmed" fw={600}>
        <b style={{ color: "#e9edf4" }}>{ours}</b>
        <span>{label}</span>
        <b style={{ color: "#e9edf4" }}>{theirs}</b>
      </Group>
      <div className={classes.compareBar}>
        <div style={{ width: `${share * 100}%`, background: sideColor(ourSide) }} />
        <div style={{ flex: 1, background: sideColor(other(ourSide)), opacity: 0.55 }} />
      </div>
    </Box>
  );
}

type LinePlayer = SideView["lineup"][number];

function LaneRow({
  role, us, them, ourSide, contested, champName, mastery, note,
}: {
  role: Role;
  us: LinePlayer;
  them: LinePlayer;
  ourSide: Side;
  contested: string[];
  champName: (id: string) => string;
  mastery: LiveView["mastery"];
  note: "threat" | "weakest" | null;
}) {
  const d = us.overall - them.overall;
  const w = Math.min(50, Math.abs(d) * 3.4);
  const comfort = (p: LinePlayer, right: boolean) => (
    <Group gap={4} mt={5} justify={right ? "flex-start" : "flex-end"}>
      {p.signatures.slice(0, 3).map((c) => (
        <span key={c} className={classes.comfort} data-contested={contested.includes(c) || undefined}>
          {champName(c)}
        </span>
      ))}
    </Group>
  );
  const form = (v: number) => (
    <Text fz="xs" fw={700} c={v >= 1 ? "teal.4" : v <= -1 ? "orange.4" : "dimmed"}>
      {v >= 1 ? "▲ " : v <= -1 ? "▼ " : ""}
      {signed(v, 1)}
    </Text>
  );
  return (
    <div className={classes.laneRow}>
      <Box ta="right" miw={0}>
        <PlayerHoverCard player={us} mastery={mastery[us.id]} position="bottom">
          <Text fw={700} fz="md" span>
            {us.name}
          </Text>
        </PlayerHoverCard>
        {comfort(us, false)}
      </Box>
      <Stack gap={0} align="center">
        <Text className="display" fz={28} lh={1}>
          {us.overall}
        </Text>
        {form(us.form)}
      </Stack>
      <Box>
        <Group justify="center" gap={6}>
          <RoleIcon role={role} size={14} />
          <Text fz={12} fw={700} c="dimmed" tt="uppercase" lts="0.1em">
            {ROLE_NAMES[role]}
          </Text>
        </Group>
        <div className={classes.edgeTrack}>
          <div
            className={classes.edgeFill}
            style={{ left: d >= 0 ? `${50 - w}%` : "50%", width: `${w}%`, background: sideColor(d >= 0 ? ourSide : other(ourSide)) }}
          />
          <div className={classes.edgeCenter} />
        </div>
        <Text ta="center" fz={12} fw={700} mt={6} c={d === 0 ? "dimmed" : undefined}>
          {d === 0 ? "even" : d > 0 ? `+${d} to you` : `+${-d} to them`}
        </Text>
      </Box>
      <Stack gap={0} align="center">
        <Text className="display" fz={28} lh={1}>
          {them.overall}
        </Text>
        {form(them.form)}
      </Stack>
      <Box miw={0}>
        <Group gap={6}>
          <PlayerHoverCard player={them} mastery={mastery[them.id]} position="bottom">
            <Text fw={700} fz="md" span>
              {them.name}
            </Text>
          </PlayerHoverCard>
          {note && (
            <Text span fz={12} fw={700} c={note === "threat" ? "orange.4" : "teal.4"}>
              {note}
            </Text>
          )}
        </Group>
        {comfort(them, true)}
      </Box>
    </div>
  );
}

/** The scouting report's headlines; the whole report one click away. */
function ScoutRead({ report, champName }: { report: ScoutReport; champName: (id: string) => string }) {
  const [full, setFull] = useState(false);
  const plan = report.plan;
  return (
    <Section title={`${report.analyst ?? "The staff"}'s read`} right={<Text fz="xs" c="dimmed">scouting level {report.level} of 4</Text>}>
      <Stack gap={10}>
        {report.threat && (
          <Group gap={10} wrap="nowrap" align="flex-start">
            <span className={classes.readTag} data-tone="worse">
              THREAT
            </span>
            <Text fz="sm" lh={1.4}>
              {report.threat.name}, {report.threat.why}.
            </Text>
          </Group>
        )}
        {report.weaknesses?.[0] && (
          <Group gap={10} wrap="nowrap" align="flex-start">
            <span className={classes.readTag} data-tone="better">
              ATTACK
            </span>
            <Text fz="sm" lh={1.4}>
              {report.weaknesses[0]}.
            </Text>
          </Group>
        )}
        {plan && (
          <Group gap={10} wrap="nowrap" align="flex-start">
            <span className={classes.readTag}>PLAN</span>
            <Text fz="sm" lh={1.4}>
              A {STYLE_TEXT[plan.style]} with the jungler on {plan.lane}, {OBJECTIVE_TEXT[plan.objectives]}.
            </Text>
          </Group>
        )}
        {report.level < 4 && (
          <Text fz="xs" c="dimmed">
            A sharper analyst would find out more.
          </Text>
        )}
      </Stack>
      {report.bans && report.bans.length > 0 && (
        <>
          <Text className="label" mt="md" mb={6}>
            Ban priorities
          </Text>
          <Group gap={6}>
            {report.bans.map((b) => (
              <Badge key={b} variant="outline" color="gray" tt="none" size="lg" radius="sm">
                {champName(b)}
              </Badge>
            ))}
          </Group>
        </>
      )}
      {report.form.length > 0 && (
        <>
          <Text className="label" mt="md" mb={6}>
            Their last {report.form.length}
          </Text>
          <Group gap={6}>
            {report.form.map((f, i) => (
              <Badge key={i} variant="light" color={f.won ? "teal" : "orange"} tt="none" size="lg" radius="sm">
                {f.won ? "W" : "L"} {f.against}
              </Badge>
            ))}
          </Group>
        </>
      )}
      <Button variant="subtle" size="xs" mt="md" onClick={() => setFull(!full)}>
        {full ? "Hide the full report" : "Full report"}
      </Button>
      {full && (
        <Box mt="sm">
          <ScoutingReport report={report} />
        </Box>
      )}
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
  const coachName = view.coach?.name ?? "The assistant";

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
  const heading = !turn
    ? ""
    : ourTurn
      ? turn.kind === "pick" && selected && role
        ? `Your pick · ${ROLE_NAMES[role]} for ${ourLineup[role]?.name ?? "?"}`
        : `Your ${turn.kind}`
      : `${view[turn.side].team.tag} ${turn.kind === "ban" ? "banning" : "picking"}…`;

  return (
    <Stack gap="md">
      <DraftStrip view={view} />
      <Box className={classes.selectBody}>
        <PickColumn side="blue" view={view} unavailable={taken} />
        <Stack gap="md" miw={0} className={classes.selectMiddle}>
          {view.phase === "ready" ? (
            <Paper p="xl" radius={14} className={classes.ready}>
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
                <Paper p="md" radius={12} className={cx(classes.turn, ourTurn && classes.turnActive)}>
                  <Group justify="space-between" wrap="nowrap" gap="md">
                    <Group gap="sm" wrap="nowrap" miw={0}>
                      <TeamLogo team={view[turn.side].team} size={36} />
                      <Stack gap={2} miw={0}>
                        <Text className="display" fz={24} lh={1} truncate c={ourTurn ? "gold.1" : undefined}>
                          {heading}
                        </Text>
                        <Text fz="xs" c="dimmed">
                          {phaseName(s.step)} · step {s.step + 1} of {s.order.length}
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap="md" wrap="nowrap">
                      <Text className={cx(classes.clock, classes.turnClock, left <= 10 && classes.clockLow)}>{Math.ceil(left)}</Text>
                      {theirTurn && (
                        <Button size="xs" variant="default" leftSection={<IconPlayerTrackNext size={14} />} disabled={busy} onClick={() => act({ type: "opponent_turn", until_mine: true })}>
                          Skip to my turn
                        </Button>
                      )}
                      <Button size="xs" variant="light" color="hextech" leftSection={<IconRobot size={14} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
                        Let {view.coach?.name ?? "the assistant"} finish
                      </Button>
                    </Group>
                  </Group>
                  <Progress
                    mt={10}
                    size={4}
                    value={(left / TURN_SECONDS) * 100}
                    color={left <= 10 ? "red" : ourTurn ? "gold" : turn.side === "blue" ? "blue" : "red"}
                    transitionDuration={100}
                  />
                </Paper>
              )}

              {ourTurn && view.suggestions.length > 0 && (
                <Paper p="sm" radius={12}>
                  <Group justify="space-between" mb={8} px={2}>
                    <Text className="label">{coachName} suggests</Text>
                    <Text fz={11} c="dimmed">
                      click to {turn?.kind === "ban" ? "ban" : "pick"}
                      {view.coach && ` · drafting ${view.coach.drafting}/20`}
                    </Text>
                  </Group>
                  <div className={classes.suggestRow}>
                    {view.suggestions.slice(0, 6).map((sg, i) => {
                      const entry = board?.champions[sg.champion];
                      const sgChoice = choiceFor(entry, sg.role ?? null);
                      const why = topReason(sgChoice, sg, turn?.kind ?? "pick");
                      const name = catalog.champion[sg.champion]?.name ?? sg.champion;
                      return (
                        <Tooltip
                          key={`${sg.champion}-${sg.role ?? ""}`}
                          label={entry ? <Breakdown name={name} entry={entry} kind={board?.kind ?? null} coach={view.coach} /> : why}
                          multiline
                          w={entry ? 300 : undefined}
                          classNames={{ tooltip: classes.tip }}
                          openDelay={250}
                        >
                          <UnstyledButton className={classes.suggestion} data-first={i === 0 || undefined} disabled={busy} onClick={() => take(sg)}>
                            <ChampIcon id={sg.champion} size={40} tooltip={false} />
                            <Box miw={0} style={{ flex: 1 }}>
                              <Group justify="space-between" wrap="nowrap" gap={4}>
                                <Text fw={700} fz="sm" truncate>
                                  {name}
                                </Text>
                                <Text fw={800} fz="sm" className={sg.score >= 3 ? "gain" : undefined}>
                                  {signed(sg.score, 1)}
                                </Text>
                              </Group>
                              <Text fz={11} c="dimmed" truncate>
                                {sg.role ? `${ROLE_NAMES[sg.role]} · ` : ""}
                                {why}
                              </Text>
                            </Box>
                          </UnstyledButton>
                        </Tooltip>
                      );
                    })}
                  </div>
                </Paper>
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
                <ScrollArea.Autosize mah={560} type="auto">
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
                </ScrollArea.Autosize>
                {s.locked.length > 0 && (
                  <Group gap={4} p="sm" style={{ borderTop: "1px solid var(--line)" }}>
                    <Text className="label" mr={6}>
                      Fearless · used this series
                    </Text>
                    {s.locked.map((c) => (
                      <ChampIcon key={c} id={c} size={22} dim />
                    ))}
                  </Group>
                )}
              </Section>

              {ourTurn && (
                <Paper p="sm" radius={12} className={classes.lock} data-armed={selected || undefined}>
                  {selected ? (
                    <Group gap="md" wrap="wrap">
                      <ChampIcon id={selected} size={52} />
                      <Stack gap={4} miw={0} style={{ flex: "1 1 260px" }}>
                        <Text className="display" fz={24} lh={1}>
                          {catalog.champion[selected]?.name}
                          {turn?.kind === "pick" && role && (
                            <Text span fz={16} c="dimmed" inherit>
                              {" "}
                              → {ROLE_NAMES[role]} · {ourLineup[role]?.name}
                            </Text>
                          )}
                        </Text>
                        {choice && (
                          <Group gap={4}>
                            {choice.notes
                              .filter((n) => Math.abs(n.value) >= 0.05)
                              .map((n) => (
                                <Badge key={n.text} size="sm" variant="light" color={n.value > 0 ? "teal" : "orange"} tt="none">
                                  {n.text} {signed(n.value, 1)}
                                </Badge>
                              ))}
                          </Group>
                        )}
                      </Stack>
                      {turn?.kind === "pick" && openRoles.length > 1 && (
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
                      <Button size="lg" color={turn?.kind === "ban" ? "red" : "gold"} disabled={busy || (turn?.kind === "pick" && !role)} onClick={lockIn}>
                        {turn?.kind === "ban" ? "Ban" : "Lock in"}
                      </Button>
                    </Group>
                  ) : (
                    <Group justify="space-between" wrap="nowrap">
                      <Text fz="sm" c="dimmed">
                        Pick a champion from the grid, or click one of {coachName}'s suggestions.
                      </Text>
                      <Button size="lg" disabled>
                        {turn?.kind === "ban" ? "Ban" : "Lock in"}
                      </Button>
                    </Group>
                  )}
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

/** The one line a suggestion shows: its strongest reason, the rest of the breakdown on hover. */
function topReason(choice: BoardChoice | null, sg: Suggestion, kind: "ban" | "pick"): string {
  const best = choice?.notes.filter((n) => n.value > 0).sort((a, b) => b.value - a.value)[0];
  if (best) return best.text;
  if (kind === "ban") return `threat ${signed(sg.threat ?? 0, 1)}`;
  const parts: [number, string][] = [
    [sg.power ?? 0, "suits the player"],
    [sg.need ?? 0, "fits the comp"],
    [sg.counter ?? 0, "wins the lane"],
  ];
  return parts.sort((a, b) => b[0] - a[0])[0][1];
}

/** The twenty steps of champion select, done and to come, with the one on the clock lit. */
function DraftStrip({ view }: { view: LiveView }) {
  const catalog = useCatalog();
  const s = view.select;
  const lists: Record<Side, Record<"ban" | "pick", string[]>> = {
    blue: { ban: s.blue_bans, pick: Object.values(s.blue_picks) },
    red: { ban: s.red_bans, pick: Object.values(s.red_picks) },
  };
  const used: Record<Side, Record<"ban" | "pick", number>> = { blue: { ban: 0, pick: 0 }, red: { ban: 0, pick: 0 } };
  const steps = s.order.map((o, i) => {
    const champ = lists[o.side][o.kind][used[o.side][o.kind]++] ?? null;
    return { i, side: o.side, kind: o.kind, champ, now: !!s.turn && i === s.step };
  });
  const phases: [number, number, string][] = [
    [0, 6, "Bans 1"],
    [6, 12, "Picks 1"],
    [12, 16, "Bans 2"],
    [16, steps.length, "Picks 2"],
  ];
  return (
    <Paper radius={12} className={classes.strip}>
      {phases.map(([from, to, name]) => (
        <Stack key={name} gap={5}>
          <Text fz={10} fw={700} tt="uppercase" lts="0.14em" c="dark.3">
            {name}
          </Text>
          <Group gap={3} wrap="nowrap">
            {steps.slice(from, to).map((st) => {
              const mine = st.side === view.our_side;
              return (
                <Tooltip key={st.i} label={`Step ${st.i + 1}: ${mine ? "your" : view[st.side].team.tag} ${st.kind}`}>
                  <span
                    className={classes.stripStep}
                    data-state={st.now ? "now" : st.champ ? st.kind : undefined}
                    style={{ "--side": sideColor(st.side) } as React.CSSProperties}
                  >
                    {st.champ ? catalog.champion[st.champ]?.name ?? st.champ : st.now ? (mine ? "YOU · NOW" : "NOW") : mine ? "you" : view[st.side].team.tag}
                  </span>
                </Tooltip>
              );
            })}
          </Group>
        </Stack>
      ))}
    </Paper>
  );
}

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

/** The score for the role the manager has chosen, which may be a flex pick's other role. */
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

/**
 * One side's five: the champion portrait once picked, what the champion does, and for an
 * opponent still to pick, the comfort picks the scouting report knows of that are still open.
 */
function PickColumn({ side, view, unavailable }: { side: Side; view: LiveView; unavailable: Set<string> }) {
  const catalog = useCatalog();
  const picks = side === "blue" ? view.select.blue_picks : view.select.red_picks;
  const bans = side === "blue" ? view.select.blue_bans : view.select.red_bans;
  const sv = view[side];
  const ours = side === view.our_side;
  const choosing = view.select.turn?.side === side && view.select.turn.kind === "pick";
  const red = side === "red";
  const scouted = !ours && view.scouting ? view.scouting.players : [];
  const name = (id: string) => catalog.champion[id]?.name ?? id;

  const comfortFor = (role: Role): [string, number][] => {
    const sp = scouted.find((p) => p.role === role);
    if (!sp) return [];
    const seen = new Map<string, number>();
    for (const [c, n] of sp.recent ?? []) seen.set(c, n);
    for (const c of sp.signatures) if (!seen.has(c)) seen.set(c, 0);
    return [...seen].filter(([c]) => !unavailable.has(c)).slice(0, 3);
  };

  return (
    <Stack gap={8} className={classes.column}>
      <Group gap="xs" justify={red ? "flex-end" : "flex-start"} wrap="nowrap">
        {!red && <TeamLogo team={sv.team} size={30} />}
        <Text fw={800} className={`side-${side}`} tt="uppercase" fz="sm">
          {ours ? "You" : sv.team.tag} · {side}
        </Text>
        {red && <TeamLogo team={sv.team} size={30} />}
      </Group>
      {sv.lineup.map((p) => {
        const champ = picks[p.slot];
        const info = champ ? catalog.champion[champ] : null;
        const comfort = !champ && !ours ? comfortFor(p.slot) : [];
        return (
          <PlayerHoverCard key={p.id} player={p} mastery={view.mastery[p.id]} unavailable={unavailable} position={red ? "left" : "right"}>
            <Box className={cx(classes.pickSlot, red && classes.pickRed, choosing && !champ && classes.pickWaiting, !champ && !choosing && classes.pickOpen)}>
              {champ && <ChampPortrait id={champ} className={classes.pickArt} />}
              <Box className={classes.pickShade} />
              <Group className={classes.pickInfo} gap={10} wrap="nowrap" justify={red ? "flex-end" : "flex-start"}>
                {!red && <PlayerPhoto photo={p.photo} name={p.name} size={38} />}
                <Stack gap={0} align={red ? "flex-end" : "flex-start"} miw={0}>
                  <Group gap={4} wrap="nowrap">
                    <RoleIcon role={p.slot} size={14} />
                    <Text fw={700} fz="sm" truncate>
                      {p.name}
                    </Text>
                  </Group>
                  {champ ? (
                    <>
                      <Text className={classes.pickChamp} truncate>
                        {info?.name ?? champ}
                      </Text>
                      {info && (
                        <Text fz={11} c="gray.4">
                          {info.focus} · {info.damage} {info.cls.toLowerCase()}
                        </Text>
                      )}
                    </>
                  ) : comfort.length > 0 ? (
                    <Text fz={11} fw={600} style={{ color: "#ffb3b5" }} ta={red ? "right" : "left"}>
                      comfort: {comfort.map(([c, n]) => (n ? `${name(c)} ${n}` : name(c))).join(" · ")}
                    </Text>
                  ) : (
                    <Text fz="xs" c={choosing ? "gold.4" : "dimmed"} fw={choosing ? 700 : 400}>
                      {choosing ? "picking…" : "waiting"}
                    </Text>
                  )}
                </Stack>
                {red && <PlayerPhoto photo={p.photo} name={p.name} size={38} />}
              </Group>
            </Box>
          </PlayerHoverCard>
        );
      })}
      {bans.length > 0 && (
        <>
          <Text className="label" ta={red ? "right" : "left"} mt={4}>
            {ours ? "Your bans" : "Their bans"}
          </Text>
          <Group gap={4} justify={red ? "flex-end" : "flex-start"}>
            {bans.map((b) => (
              <span key={b} className={classes.banChip}>
                {name(b)}
              </span>
            ))}
          </Group>
        </>
      )}
    </Stack>
  );
}

// ---------- the game ----------

// At 1x the game clock runs nine times faster than real time: a game minute takes about 6.7
// seconds and a 30-minute game about three and a half minutes. Faster speeds multiply that.
const GAME_SECONDS_PER_SECOND = 9;

/** What each kind of event is called, its icon and its colour. Key events are the ones worth stopping for. */
const KINDS: Record<string, { label: string; icon: GameIconKind; tone: string; key?: boolean }> = {
  first_blood: { label: "First blood", icon: "blood", tone: "#e9edf4", key: true },
  kill: { label: "Kill", icon: "fight", tone: "#8e99ae" },
  teamfight: { label: "Fight", icon: "fight", tone: "#e9edf4", key: true },
  dragon: { label: "Drake", icon: "dragon", tone: "#0ac8b9", key: true },
  soul: { label: "Soul", icon: "dragon", tone: "#0ac8b9", key: true },
  elder: { label: "Elder", icon: "dragon", tone: "#f0c64a", key: true },
  baron: { label: "Baron", icon: "baron", tone: "#a98bff", key: true },
  herald: { label: "Herald", icon: "herald", tone: "#0ac8b9", key: true },
  grubs: { label: "Grubs", icon: "herald", tone: "#8e99ae" },
  tower: { label: "Tower", icon: "tower", tone: "#8e99ae" },
  inhibitor: { label: "Inhibitor", icon: "inhibitor", tone: "#e9edf4", key: true },
  nexus: { label: "Nexus", icon: "nexus", tone: "#f0e6d2", key: true },
  play: { label: "Set play", icon: "play", tone: "#c8aa6e", key: true },
  throw: { label: "Throw", icon: "throw", tone: "#ff8a5c", key: true },
  // The caster's call on a fight: quoted under the moment it belongs to, listed with everything else.
  highlight: { label: "Caster", icon: "fight", tone: "#f0e6d2" },
  note: { label: "", icon: "fight", tone: "#8e99ae" },
};
const kindOf = (k: string) => KINDS[k] ?? KINDS.note;

/** "Set play, Tower dive: TH dive the bot lane" → "Tower dive". */
function playName(e: TimelineEvent | undefined): string {
  return (e && /^Set play, ([^:]+):/.exec(e.text)?.[1]) || "set play";
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

function Playback({ view, data, busy, onNext, onRevealed }: { view: LiveView; data: GameView; busy: boolean; onNext: () => void; onRevealed: () => void }) {
  const events = data.timeline!.events;
  const end = events[events.length - 1]?.t ?? 0;
  const [speed, setSpeed] = useState(readSpeed());
  const [mode, setMode] = useState<"key" | "all">("key");
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
  const upTo = events.slice(0, reached);
  const current = upTo[upTo.length - 1] as TimelineEvent | undefined;
  const minute = Math.floor(timeline.t / 60);
  const gold = data.timeline!.gold;
  const goldLead = gold[timeline.done ? gold.length - 1 : Math.min(minute, gold.length - 1)] ?? 0;
  const ourSide = view.our_side;
  const ourId = view[ourSide].team.id;
  const blueTeam = view.blue.team;
  const redTeam = view.red.team;
  const leader = goldLead > 0 ? blueTeam : goldLead < 0 ? redTeam : null;
  const latestKey = [...upTo].reverse().find((e) => kindOf(e.kind).key);
  const ourPlay = upTo.find((e) => e.kind === "play" && e.side === ourSide);
  const shown = (mode === "key" ? upTo.filter((e) => kindOf(e.kind).key) : upTo).slice().reverse().slice(0, 16);

  function changeSpeed(next: string) {
    setSpeed(Number(next));
    writeSpeed(Number(next));
  }

  if (timeline.done) return <PostGame view={view} record={data.game} events={events} busy={busy} onNext={onNext} />;

  return (
    <Stack gap="md">
      <Group justify="flex-end" gap="sm">
        <SegmentedControl size="xs" value={String(speed)} onChange={changeSpeed} data={SPEEDS.map((v) => ({ value: String(v), label: `${v}×` }))} />
        <Button size="xs" variant="default" leftSection={<IconBolt size={14} />} onClick={timeline.skip}>
          Skip to the end
        </Button>
      </Group>

      <Paper radius={14} p="md" className={classes.scoreboard}>
        <div className={classes.scoreRow}>
          <ScoreSide team={blueTeam} side="blue" kills={current?.score[0] ?? 0} ours={ourSide === "blue"} />
          <Stack gap={0} align="center">
            <Text className={classes.clock}>{clock(Math.floor(timeline.t))}</Text>
            <span className={classes.leadChip}>{leader ? `${leader.tag} +${(Math.abs(goldLead) / 1000).toFixed(1)}k gold` : "Gold even"}</span>
          </Stack>
          <ScoreSide team={redTeam} side="red" kills={current?.score[1] ?? 0} ours={ourSide === "red"} right />
        </div>
        <div className={classes.objectives}>
          <ObjectiveSide side="blue" events={upTo} />
          <Text className="label" style={{ alignSelf: "center" }}>
            Objectives
          </Text>
          <ObjectiveSide side="red" events={upTo} right />
        </div>
      </Paper>

      <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-md)", alignItems: "flex-start" }}>
        <Stack gap="md" style={{ flex: "3 1 560px", minWidth: 0 }}>
          <Moment
            event={latestKey}
            call={latestKey && upTo.find((e) => e.kind === "highlight" && e.t === latestKey.t)}
            blue={blueTeam.tag}
            red={redTeam.tag}
            game={view.game}
          />
          <Section
            title="Your gold lead"
            right={
              <Group gap={12} fz={12} c="dimmed">
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "var(--gold)" }} />
                  your set play
                </Group>
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "#e9edf4" }} />
                  yours
                </Group>
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "var(--worse)" }} />
                  theirs
                </Group>
              </Group>
            }
          >
            <LeadGraph gold={gold} minute={minute} t={timeline.t} events={upTo} ourSide={ourSide} />
          </Section>
          <Lineups record={data.game} view={view} />
        </Stack>

        <Stack gap="md" style={{ flex: "2 1 380px", minWidth: 0 }}>
          {ourPlay && <PlayCard event={ourPlay} t={timeline.t} worked={!!data.game.play_results[ourId]} />}
          <Section
            title="Play by play"
            pad={false}
            right={
              <SegmentedControl
                size="xs"
                value={mode}
                onChange={(v) => setMode(v as "key" | "all")}
                data={[
                  { value: "key", label: "Key moments" },
                  { value: "all", label: "Everything" },
                ]}
              />
            }
          >
            {shown.length === 0 ? (
              <div className={classes.feedRow} data-latest>
                <Text fz="xs" c="dimmed" w={40}>
                  {clock(0)}
                </Text>
                <Text fz="sm" fw={600}>
                  Minions are spawning. {blueTeam.tag} on blue side, {redTeam.tag} on red.
                </Text>
              </div>
            ) : (
              shown.map((e, i) => {
                const k = kindOf(e.kind);
                return (
                  <div key={`${e.t}-${e.kind}-${i}`} className={classes.feedRow} data-latest={i === 0 || undefined} data-play={(e.kind === "play" && e.side === ourSide) || undefined}>
                    <Text fz="xs" c="dimmed" w={40} style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>
                      {clock(e.t)}
                    </Text>
                    <span className={classes.feedDot} style={{ background: e.side ? sideColor(e.side) : "#3a4560" }} />
                    <span className={classes.feedKind} style={{ color: k.tone }}>
                      {k.label}
                    </span>
                    <Text fz="sm" fw={k.key ? 700 : 500} style={{ flex: 1, minWidth: 0 }}>
                      {e.text}
                    </Text>
                  </div>
                );
              })
            )}
          </Section>
        </Stack>
      </Box>
    </Stack>
  );
}

function ScoreSide({ team, side, kills, ours, right = false }: { team: SideView["team"]; side: Side; kills: number; ours: boolean; right?: boolean }) {
  return (
    <div className={classes.scoreSide} data-right={right || undefined}>
      <TeamLogo team={team} size={52} />
      <Stack gap={0} miw={0} align={right ? "flex-end" : "flex-start"}>
        <Text className="display" fz={22} lh={1.1} truncate style={{ color: sideColor(side) }}>
          {team.name}
        </Text>
        <Text fz="xs" c="dimmed">
          {side} side{ours ? " · you" : ""}
        </Text>
      </Stack>
      <Text className={classes.bigKills} style={{ color: sideColor(side) }}>
        {kills}
      </Text>
    </div>
  );
}

/** Towers, drakes by type, Herald and grubs, Baron: what one side has taken so far. */
function ObjectiveSide({ side, events, right = false }: { side: Side; events: TimelineEvent[]; right?: boolean }) {
  const mine = events.filter((e) => e.side === side);
  const count = (...kinds: string[]) => mine.filter((e) => kinds.includes(e.kind)).length;
  const towers = count("tower");
  const drakes = mine.filter((e) => e.kind === "dragon" || e.kind === "soul" || e.kind === "elder");
  const types = drakes.map((e) => /the (\w+) Drake/.exec(e.text)?.[1] ?? (e.kind === "elder" ? "Elder" : e.kind === "soul" ? "Soul" : "Drake"));
  const heralds = count("herald");
  const grubs = count("grubs");
  const barons = count("baron");
  const inhibitors = count("inhibitor");
  const items = [
    <span key="t" className={classes.obj} data-none={towers === 0 || undefined}>
      <GameIcon kind="tower" label="Towers" />
      {towers}
    </span>,
    <span key="d" className={classes.obj} data-none={drakes.length === 0 || undefined}>
      <GameIcon kind="dragon" label="Drakes" />
      {drakes.length}
    </span>,
    types.length > 0 && (
      <span key="dt" className={classes.drakeType}>
        {types.join(" · ")}
      </span>
    ),
    (heralds > 0 || grubs > 0) && (
      <span key="h" className={classes.obj}>
        <GameIcon kind="herald" label="Rift Herald and Voidgrubs" />
        {[heralds && `Herald${heralds > 1 ? ` ×${heralds}` : ""}`, grubs && `grubs ×${grubs}`].filter(Boolean).join(" · ")}
      </span>
    ),
    inhibitors > 0 && (
      <span key="i" className={classes.obj}>
        <GameIcon kind="inhibitor" label="Inhibitors" />
        {inhibitors}
      </span>
    ),
    barons > 0 && (
      <span key="b" className={classes.baronChip}>
        <GameIcon kind="baron" size={16} />
        Baron{barons > 1 ? ` ×${barons}` : ""}
      </span>
    ),
  ].filter(Boolean);
  return (
    <div className={classes.objSide} data-right={right || undefined}>
      {right ? items.reverse() : items}
    </div>
  );
}

/** The latest moment that matters, big enough to notice from across the room. */
function Moment({ event, call, blue, red, game }: { event: TimelineEvent | undefined; call?: TimelineEvent; blue: string; red: string; game: number }) {
  const k = event ? kindOf(event.kind) : KINDS.note;
  return (
    <Paper radius={14} className={classes.moment} style={{ "--tone": k.tone } as React.CSSProperties}>
      <span className={classes.momentIcon}>
        <GameIcon kind={event ? k.icon : "fight"} size={30} />
      </span>
      <Box miw={0}>
        <Text fz={12} fw={700} tt="uppercase" lts="0.14em" style={{ color: k.tone }}>
          {event ? `${clock(event.t)} · ${k.label}` : `Game ${game}`}
        </Text>
        <Text className={classes.momentTitle}>{event ? event.text : `${blue} and ${red} walk out`}</Text>
        {call && (
          <Text fz="md" fs="italic" c="gray.3" mt={4}>
            “{call.text}”
          </Text>
        )}
      </Box>
    </Paper>
  );
}

/** Your set play: when it ran, and once it has had time to play out, whether it worked. */
function PlayCard({ event, t, worked }: { event: TimelineEvent; t: number; worked: boolean }) {
  const settled = t >= event.t + 45;
  const rest = event.text.replace(/^Set play, [^:]+:\s*/, "");
  return (
    <Paper radius={14} p="md" className={classes.playCard}>
      <Group justify="space-between" wrap="nowrap">
        <Text className="eyebrow">Your set play · {clock(event.t)}</Text>
        <Badge variant="light" color={!settled ? "gray" : worked ? "teal" : "orange"} tt="none">
          {!settled ? "Running" : worked ? "Worked" : "Failed"}
        </Badge>
      </Group>
      <Text className="display" fz={24} mt={4}>
        {playName(event)}
      </Text>
      <Text fz="sm" c="gray.3" lh={1.45}>
        {rest}
      </Text>
    </Paper>
  );
}

/** Your gold lead minute by minute (above the line you are ahead), with the moments that moved it. */
function LeadGraph({ gold, minute, t, events, ourSide, done = false }: { gold: number[]; minute: number; t: number; events: TimelineEvent[]; ourSide: Side; done?: boolean }) {
  const { ref, width: measured } = useElementSize();
  const id = useId();
  const width = Math.max(320, Math.round(measured) || 700);
  const height = 170;
  const sign = ourSide === "blue" ? 1 : -1;
  const series = (done ? gold : gold.slice(0, Math.max(1, minute + 1))).map((g) => g * sign);
  // Scaled to what has been played, so neither the axis nor the scale gives away how the game goes on.
  const minutes = done ? Math.max(gold.length - 1, 20) : Math.max(20, minute + 4);
  const peak = Math.max(3000, ...series.map((g) => Math.abs(g)));
  const left = 40;
  const right = 14;
  const top = 12;
  const bottom = 22;
  const x = (m: number) => left + (m / minutes) * (width - left - right);
  const mid = top + (height - top - bottom) / 2;
  const y = (g: number) => mid - (g / peak) * ((height - top - bottom) / 2);
  const line = series.map((g, m) => `${x(m).toFixed(1)},${y(g).toFixed(1)}`).join(" ");
  const area = `${x(0)},${mid} ${line} ${x(series.length - 1).toFixed(1)},${mid}`;
  const leadAt = (seconds: number) => {
    const m = Math.min(series.length - 1, Math.floor(seconds / 60));
    return series[Math.max(0, m)] ?? 0;
  };
  const marks = events.filter((e) => kindOf(e.kind).key && e.kind !== "nexus");
  const fmt = (g: number) => `${g > 0 ? "+" : g < 0 ? "−" : ""}${Math.round(Math.abs(g) / 1000)}k`;
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Your gold lead over time">
        <defs>
          <clipPath id={`${id}-above`}>
            <rect x="0" y="0" width={width} height={mid} />
          </clipPath>
          <clipPath id={`${id}-below`}>
            <rect x="0" y={mid} width={width} height={height - mid} />
          </clipPath>
        </defs>
        {[10, 20, 30, 40].filter((m) => m <= minutes).map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={top} y2={height - bottom} stroke="var(--line-soft)" strokeDasharray="2 4" />
            <text x={x(m)} y={height - 6} textAnchor="middle" fill="#5e6982" fontSize="11">
              {m}′
            </text>
          </g>
        ))}
        <text x={left - 6} y={top + 4} textAnchor="end" fill="#5e6982" fontSize="11">
          {fmt(peak)}
        </text>
        <text x={left - 6} y={mid + 4} textAnchor="end" fill="#5e6982" fontSize="11">
          even
        </text>
        <text x={left - 6} y={height - bottom + 2} textAnchor="end" fill="#5e6982" fontSize="11">
          {fmt(-peak)}
        </text>
        <line x1={left} x2={width - right} y1={mid} y2={mid} stroke="#3a4560" strokeWidth="1.5" />
        <polygon points={area} style={{ fill: "color-mix(in srgb, var(--team) 26%, transparent)" }} clipPath={`url(#${id}-above)`} />
        <polygon points={area} style={{ fill: "rgba(255, 138, 92, 0.2)" }} clipPath={`url(#${id}-below)`} />
        <polyline points={line} fill="none" style={{ stroke: "var(--team)" }} strokeWidth="2.5" strokeLinejoin="round" />
        {marks.map((e, i) => {
          const fill = e.kind === "play" && e.side === ourSide ? "var(--gold)" : e.side === ourSide ? "#e9edf4" : e.side ? "var(--worse)" : "#8e99ae";
          return (
            <circle key={i} cx={x(e.t / 60)} cy={y(leadAt(e.t))} r={e.kind === "play" || e.kind === "baron" ? 6 : 4.5} style={{ fill }} stroke="#070a12" strokeWidth="2">
              <title>{`${clock(e.t)} ${e.text}`}</title>
            </circle>
          );
        })}
        {!done && (
          <>
            <line x1={x(t / 60)} x2={x(t / 60)} y1={top} y2={height - bottom} stroke="#e9edf4" strokeWidth="1" strokeDasharray="3 3" />
            <text x={x(t / 60)} y={top - 2} textAnchor="middle" fill="#e9edf4" fontSize="10" fontWeight="700">
              now
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/** Who plays what, both sides. */
function Lineups({ record, view }: { record: GameRecord; view: LiveView }) {
  const catalog = useCatalog();
  const order = (team: string) =>
    record.players.filter((p) => p.team === team).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  return (
    <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-md)" }}>
      {(["blue", "red"] as Side[]).map((side) => {
        const team = view[side].team;
        return (
          <Paper key={side} radius={12} px="md" py="sm" style={{ flex: "1 1 280px", minWidth: 0 }}>
            <Text fz={11} fw={700} tt="uppercase" lts="0.14em" mb={6} style={{ color: sideColor(side) }}>
              {team.tag}
            </Text>
            <Group gap="sm">
              {order(team.id).map((p) => (
                <Group key={p.player} gap={6} wrap="nowrap">
                  <ChampIcon id={p.champion} size={24} />
                  <Text fz="sm" c="gray.4">
                    {p.name} ·{" "}
                    <Text span fw={700} c="gray.0">
                      {catalog.champion[p.champion]?.name ?? p.champion}
                    </Text>
                  </Text>
                </Group>
              ))}
            </Group>
          </Paper>
        );
      })}
    </Box>
  );
}

// ---------- after a game ----------

type Factor = { big: string; title: string; text: string; good: boolean; tone?: "play" | "worse" };

/** Up to three reasons the game went the way it did, read from the record. */
function factors(record: GameRecord, events: TimelineEvent[], ourSide: Side, ourId: string, theirId: string): Factor[] {
  const o = ourSide === "blue" ? 0 : 1;
  const th = 1 - o;
  const out: Factor[] = [];
  const g15 = (ourSide === "blue" ? 1 : -1) * record.gold15;
  if (Math.abs(g15) >= 1000) {
    out.push({
      big: `${g15 > 0 ? "+" : "−"}${(Math.abs(g15) / 1000).toFixed(1)}k`,
      title: g15 > 0 ? "Ahead from the lanes" : "Behind from the lanes",
      text: "Gold difference at 15 minutes.",
      good: g15 > 0,
      tone: g15 > 0 ? undefined : "worse",
    });
  }
  if (record.plays[ourId]) {
    const e = events.find((x) => x.kind === "play" && x.side === ourSide);
    const ok = !!record.play_results[ourId];
    out.push({
      big: e ? clock(e.t) : "—",
      title: `${playName(e)} ${ok ? "worked" : "failed"}`,
      text: ok ? "Your set play paid off. It is used for this series." : "Your set play came to nothing, and it is used for this series.",
      good: ok,
      tone: ok ? "play" : "worse",
    });
  }
  if (record.plays[theirId] && record.play_results[theirId]) {
    const e = events.find((x) => x.kind === "play" && x.side === other(ourSide));
    out.push({ big: e ? clock(e.t) : "—", title: `Their ${playName(e)} worked`, text: "The opponent's set play caught you.", good: false, tone: "worse" });
  }
  const drakes = [record.dragons[o], record.dragons[th]];
  const barons = [record.barons[o], record.barons[th]];
  if (drakes[0] !== drakes[1] || barons[0] !== barons[1]) {
    const good = drakes[0] + barons[0] * 2 > drakes[1] + barons[1] * 2;
    out.push({
      big: `${drakes[0]}–${drakes[1]}`,
      title: barons[0] + barons[1] > 0 ? "Drakes and Baron" : "Drakes",
      text: `${drakes[0]} drakes to ${drakes[1]}${barons[0] + barons[1] > 0 ? `, Baron ${barons[0]}–${barons[1]}` : ""}.`,
      good,
      tone: good ? undefined : "worse",
    });
  }
  if (record.throws[o] > 0) out.push({ big: String(record.throws[o]), title: "You threw a lead", text: "A fight taken from ahead went wrong.", good: false, tone: "worse" });
  if (record.throws[th] > 0) out.push({ big: String(record.throws[th]), title: "They threw a lead", text: "They gave a fight away from ahead.", good: true });
  const fights = [record.fights[o], record.fights[th]];
  if (fights[0] !== fights[1]) {
    out.push({ big: `${fights[0]}–${fights[1]}`, title: "Teamfights", text: `${fights[0]} won to ${fights[1]}.`, good: fights[0] > fights[1], tone: fights[0] > fights[1] ? undefined : "worse" });
  }
  const won = record.winner === ourId;
  return out.sort((a, b) => Number(b.good === won) - Number(a.good === won)).slice(0, 3);
}

function PostGame({ view, record, events, busy, onNext }: { view: LiveView; record: GameRecord; events: TimelineEvent[]; busy: boolean; onNext: () => void }) {
  const catalog = useCatalog();
  const [full, setFull] = useState(false);
  const ourSide = view.our_side;
  const us = view[ourSide].team;
  const them = view[other(ourSide)].team;
  const o = ourSide === "blue" ? 0 : 1;
  const th = 1 - o;
  const won = record.winner === us.id;
  const m = view.match;
  const ourScore = m.home?.id === us.id ? m.score[0] : m.score[1];
  const theirScore = m.home?.id === us.id ? m.score[1] : m.score[0];
  const seriesOver = Math.max(...m.score) >= Math.floor(m.best_of / 2) + 1;
  const five = record.players.filter((p) => p.team === us.id).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  const most = Math.max(1, ...record.players.map((p) => p.damage));
  const mvp = record.players.find((p) => p.player === record.mvp);
  const theirBest = record.players.filter((p) => p.team !== us.id).sort((a, b) => b.rating - a.rating).slice(0, 2);
  const why = factors(record, events, ourSide, us.id, them.id);
  const champ = (p: PlayerLine) => catalog.champion[p.champion]?.name ?? p.champion;
  const stats: [string, string][] = [
    ["Kills", `${record.kills[o]}–${record.kills[th]}`],
    ["Gold", `${(record.gold[o] / 1000).toFixed(1)}k`],
    ["Towers", `${record.towers[o]}–${record.towers[th]}`],
    ["Drakes", `${record.dragons[o]}–${record.dragons[th]}`],
    ["Baron", `${record.barons[o]}–${record.barons[th]}`],
  ];

  return (
    <Stack gap="lg">
      <Paper radius={16} p="xl" className={classes.result} data-lost={!won || undefined}>
        <Group gap="xl" wrap="wrap">
          <TeamLogo team={us} size={88} />
          <Stack gap={4} style={{ flex: "1 1 320px" }} miw={0}>
            <Text className="eyebrow">
              Game {view.game} · {clock(record.duration)}
            </Text>
            <Text className={classes.resultWord} c={won ? "gold.1" : "orange.3"}>
              {won ? "Victory" : "Defeat"}
            </Text>
            <Text fz="md" c="gray.3">
              {us.name} {won ? "beat" : "lose to"} {them.name} from {ourSide} side.
            </Text>
          </Stack>
          <div className={classes.resultStats}>
            {stats.map(([label]) => (
              <Text key={label} className="label">
                {label}
              </Text>
            ))}
            {stats.map(([label, value]) => (
              <Text key={label} className="display" fz={30}>
                {value}
              </Text>
            ))}
          </div>
        </Group>
      </Paper>

      <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-lg)", alignItems: "flex-start" }}>
        <Stack gap="md" style={{ flex: "3 1 640px", minWidth: 0 }}>
          {why.length > 0 && (
            <>
              <Title order={2} className="display" fz={22}>
                {won ? "Why you won" : "Why you lost"}
              </Title>
              <div className={classes.factors}>
                {why.map((f) => (
                  <div key={f.title} className={classes.factor} data-tone={f.tone}>
                    <Text className={classes.factorBig} c={f.tone === "worse" ? "orange.4" : f.tone === "play" ? "gold.4" : undefined} style={f.tone ? undefined : { color: "var(--team)" }}>
                      {f.big}
                    </Text>
                    <Text fw={700} mt={8}>
                      {f.title}
                    </Text>
                    <Text fz="sm" c="dimmed" mt={4} lh={1.4}>
                      {f.text}
                    </Text>
                  </div>
                ))}
              </div>
            </>
          )}
          <Section title="Your five" pad={false}>
            <div className={classes.fiveRow} data-head>
              <span>Role</span>
              <span>Player</span>
              <span>Champion</span>
              <span style={{ textAlign: "center" }}>K / D / A</span>
              <span>Damage</span>
              <span style={{ textAlign: "right" }}>Rating</span>
            </div>
            {five.map((p) => (
              <div key={p.player} className={classes.fiveRow} data-mvp={p.player === record.mvp || undefined}>
                <RoleIcon role={p.role} size={18} />
                <Text fw={700} truncate>
                  {p.name}{" "}
                  {p.player === record.mvp && (
                    <Text span fz={11} fw={800} c="gold.4" lts="0.08em">
                      MVP
                    </Text>
                  )}
                </Text>
                <Group gap={6} wrap="nowrap" miw={0}>
                  <ChampIcon id={p.champion} size={24} />
                  <Text fz="sm" c="gray.3" truncate>
                    {champ(p)}
                  </Text>
                </Group>
                <Text ta="center" fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {p.kills} / {p.deaths} / {p.assists}
                </Text>
                <Group gap={8} wrap="nowrap">
                  <span className={classes.dmgBar}>
                    <span style={{ width: `${Math.round((p.damage / most) * 100)}%` }} />
                  </span>
                  <Text fz="xs" c="dimmed" w={40} ta="right">
                    {(p.damage / 1000).toFixed(1)}k
                  </Text>
                </Group>
                <Text ta="right" className="display" fz={22} c={p.rating >= 8 ? "teal.4" : p.rating >= 6 ? undefined : "dimmed"}>
                  {p.rating.toFixed(1)}
                </Text>
              </div>
            ))}
            {theirBest.length > 0 && (
              <Text fz="sm" c="dimmed" px="md" py="sm" style={{ borderTop: "1px solid var(--line-soft)" }}>
                Best for {them.tag}: {theirBest.map((p) => `${p.name} (${champ(p)}) ${p.rating.toFixed(1)}`).join(", ")}.
              </Text>
            )}
          </Section>
        </Stack>

        <Stack gap="lg" style={{ flex: "2 1 380px", minWidth: 0 }}>
          {mvp && (
            <Paper radius={14} p="lg" style={{ borderColor: "rgba(200, 170, 110, 0.45)" }}>
              <Group gap="md" wrap="nowrap">
                <PlayerPhoto photo={mvp.photo} name={mvp.name} size={72} ring="var(--gold)" />
                <Stack gap={2} miw={0}>
                  <Text className="eyebrow">Player of the game{mvp.team !== us.id ? ` · ${them.tag}` : ""}</Text>
                  <Text className="display" fz={32} lh={1}>
                    {mvp.name}
                  </Text>
                  <Text fz="sm" c="gray.4">
                    {champ(mvp)} · {mvp.kills}/{mvp.deaths}/{mvp.assists} · {mvp.cs} CS · rating {mvp.rating.toFixed(1)}
                  </Text>
                </Stack>
              </Group>
            </Paper>
          )}
          <Section title="The series">
            <Group justify="space-between" py={6} style={{ borderBottom: "1px solid var(--line-soft)" }}>
              <Text fz="sm" c="dimmed">
                {us.tag} against {them.tag}
              </Text>
              <Text fw={800}>
                {ourScore}–{theirScore}
              </Text>
            </Group>
            <Group justify="space-between" py={6}>
              <Text fz="sm" c="dimmed">
                {seriesOver ? "Result" : "Next"}
              </Text>
              <Text fw={700} c={seriesOver ? (ourScore > theirScore ? "teal.4" : "orange.4") : undefined}>
                {seriesOver ? (ourScore > theirScore ? "Series won" : "Series lost") : `Game ${view.game + 1}, best of ${m.best_of}`}
              </Text>
            </Group>
          </Section>
          <Group gap="sm">
            <Button variant="default" style={{ flex: "1 1 160px" }} onClick={() => setFull(!full)}>
              {full ? "Hide the game report" : "Full game report"}
            </Button>
            <Button size="md" style={{ flex: "2 1 200px" }} loading={busy} rightSection={<IconPlayerPlayFilled size={16} />} onClick={onNext}>
              {seriesOver ? "Finish the series" : "Next game"}
            </Button>
          </Group>
        </Stack>
      </Box>

      {full && (
        <Paper p="lg" radius={14}>
          <GameReport game={record} teams={teamsOf(view.match)} />
        </Paper>
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
      <Paper p="xl" mb="lg" radius={16} className={cx(classes.verdict, won ? classes.won : classes.lost)}>
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
