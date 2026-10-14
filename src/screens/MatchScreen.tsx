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
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type {
  BoardChoice, BoardEntry, Champion, GameRecord, GameView, LiveView, PlayChoice, PlayerLine, Role, ScoutingReport as ScoutReport, Side, SideView,
  Suggestion, Tactics, TimelineEvent,
} from "../api/types";
import { ChampSelectMusic } from "../components/ChampSelectMusic";
import { GameIcon, type GameIconKind } from "../components/GameIcons";
import { GameReport } from "../components/GameReport";
import { ChampIcon, ChampPortrait, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { PlayerHoverCard } from "../components/PlayerHoverCard";
import { ScoutingReport } from "../components/ScoutingReport";
import { SeriesSoFar } from "../components/SeriesSoFar";
import { TacticsPanel } from "../components/TacticsPanel";
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

/** The series score in side order (blue first). During a game's playback, as it stood before that game, so nothing is given away. */
function seriesBySide(view: LiveView, beforeThisGame = false): [number, number] {
  const m = view.match;
  const blue = view.blue.team.id;
  const score: [number, number] = m.home?.id === blue ? [m.score[0], m.score[1]] : [m.score[1], m.score[0]];
  const last = m.game_list[m.game_list.length - 1];
  if (beforeThisGame && last && last.number === view.game) score[last.winner === blue ? 0 : 1] -= 1;
  return score;
}

export function MatchScreen() {
  const { career, revision } = useCareer();
  const live = useApi(() => api.live(career.id), [career.id, revision]);
  const [finished, setFinished] = useState<string | null>(null);

  if (!career.live) {
    if (finished) return <FinishedSeries matchId={finished} />;
    return (
      <Screen>
        <Empty>No match today. {career.next_match ? "Continue moves a day at a time until match day." : ""}</Empty>
      </Screen>
    );
  }
  if (!live.data) return <Loading text="Walking onto the stage…" />;
  const view = live.data;

  return (
    <>
      <MatchBar view={view} />
      <Screen>
        {view.phase === "lineup" && <LineupStage view={view} onFinished={setFinished} />}
        {(view.phase === "draft" || view.phase === "ready") && <ChampSelectStage view={view} onFinished={setFinished} />}
        {view.phase === "result" && <ResultStage view={view} onFinished={setFinished} />}
      </Screen>
    </>
  );
}

// ---------- the bar that stands in for the office's header on match day ----------

/** Where you are: back to the office, and which match and game this is. The series score sits in each stage's own card. */
function MatchBar({ view }: { view: LiveView }) {
  const { career } = useCareer();
  const m = view.match;
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
            {view.match.best_of > 1 ? (
              <Stack gap={0} align="center">
                <Text className="display" fz={46} lh={1}>
                  {seriesBySide(view)[ourSide === "blue" ? 0 : 1]}{" "}
                  <Text span c="dimmed" inherit>
                    :
                  </Text>{" "}
                  {seriesBySide(view)[ourSide === "blue" ? 1 : 0]}
                </Text>
                <Text fz={11} fw={700} c="dimmed" tt="uppercase" lts="0.12em">
                  series · game {view.game}
                </Text>
              </Stack>
            ) : (
              <Text className="display" fz={26} c="dark.3" ta="center">
                VS
              </Text>
            )}
            <Compare label="Strength" ours={ours.strength.toFixed(1)} theirs={theirs.strength.toFixed(1)} share={strengthShare} ourSide={ourSide} />
            <Compare label="Chemistry" ours={signed(ours.chemistry.score, 1)} theirs={signed(theirs.chemistry.score, 1)} share={chemShare} ourSide={ourSide} />
          </Stack>
          <TapeTeam sv={theirs} side={theirSide} right />
        </div>
      </Paper>

      <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-lg)", alignItems: "flex-start" }}>
        <Box style={{ flex: "2 1 720px", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-lg)" }}>
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
          <SeriesSoFar view={view} />
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
          <TacticsPanel tactics={ours.tactics} />
        </Stack>
      </Box>

      <Paper radius={14} p="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Text fz="sm" c="dimmed" maw={560}>
            The lineup is set on the Squad screen; tactics saved here count from this game on.
            {view.select.locked.length > 0 && ` Fearless: ${view.select.locked.length} champions are already used in this series.`}
          </Text>
          <Group>
            <Button variant="default" leftSection={<IconPlayerTrackNext size={16} />} loading={busy} onClick={simSeries}>
              Simulate the series
            </Button>
            <Button variant="light" color="hextech" leftSection={<IconRobot size={16} />} disabled={busy} onClick={() => act({ type: "auto_select" })}>
              {view.reader?.you ? "Auto draft" : `Let ${view.coach?.name ?? "the assistant"} draft`}
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
      <Group gap="md" wrap="nowrap" justify="flex-end" miw={0}>
        <Box ta="right" miw={0}>
          <PlayerHoverCard player={us} mastery={mastery[us.id]} position="bottom">
            <Text fw={700} fz="md" span>
              {us.name}
            </Text>
          </PlayerHoverCard>
          {comfort(us, false)}
        </Box>
        <PlayerPhoto photo={us.photo} name={us.name} size={56} ring={sideColor(ourSide)} />
      </Group>
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
      <Group gap="md" wrap="nowrap" miw={0}>
        <PlayerPhoto photo={them.photo} name={them.name} size={56} ring={sideColor(other(ourSide))} />
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
      </Group>
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
  const reader = view.reader;

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

  /** A lock by hand answers this step: the clock must not lock it again while the next view loads. */
  async function lockByHand(champion: string, pickRole: Role | null) {
    const key = stepKey;
    moved.current = key;
    const result = await lock(champion, pickRole);
    if (!result && moved.current === key) moved.current = null; // refused: the clock still runs for this step
  }

  async function lockIn() {
    if (selected) await lockByHand(selected, role);
  }

  async function take(sg: Suggestion) {
    await lockByHand(sg.champion, sg.role ?? null);
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
        message: `${selected ? "Locked in" : reader?.you ? "Locked in your first choice," : "The assistant locked in"} ${catalog.champion[champion]?.name ?? champion}.`,
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
      <ChampSelectMusic match={view.match} game={view.game} active={view.phase === "draft" || view.phase === "ready"} />
      <BanRow view={view} />
      <FearlessStrip view={view} />
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
                        {reader?.you ? "Auto finish" : `Let ${view.coach?.name ?? "the assistant"} finish`}
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
                    <Text className="label">{reader?.you ? "Your read" : `${coachName} suggests`}</Text>
                    <Text fz={11} c="dimmed">
                      click to {turn?.kind === "ban" ? "ban" : "pick"}
                      {reader && ` · drafting ${reader.drafting}/20`}
                    </Text>
                  </Group>
                  <div className={classes.suggestRow}>
                    {view.suggestions.slice(0, 6).map((sg, i) => {
                      const entry = board?.champions[sg.champion];
                      const sgChoice = choiceFor(entry, sg.role ?? null);
                      const parts = valueParts(sgChoice, sg, turn?.kind ?? "pick");
                      const name = catalog.champion[sg.champion]?.name ?? sg.champion;
                      return (
                        <Tooltip
                          key={`${sg.champion}-${sg.role ?? ""}`}
                          label={entry ? <Breakdown name={name} entry={entry} kind={board?.kind ?? null} reader={reader} /> : parts.map((p) => `${p.label} ${signed(p.value, 1)}`).join(" · ")}
                          multiline
                          w={entry ? 300 : undefined}
                          classNames={{ tooltip: classes.tip }}
                          openDelay={250}
                        >
                          <UnstyledButton className={classes.suggestion} data-first={i === 0 || undefined} disabled={busy} onClick={() => take(sg)}>
                            <ChampIcon id={sg.champion} size={48} tooltip={false} />
                            <Box miw={0} style={{ flex: 1 }}>
                              <Group justify="space-between" wrap="nowrap" gap={4}>
                                <Group gap={5} wrap="nowrap" miw={0}>
                                  {sg.role && <RoleIcon role={sg.role} size={14} />}
                                  <Text fw={700} fz="sm" truncate>
                                    {name}
                                  </Text>
                                </Group>
                                <Text fw={800} fz="sm" className={sg.score >= 3 ? "gain" : undefined}>
                                  {signed(sg.score, 1)}
                                </Text>
                              </Group>
                              <div className={classes.suggestParts}>
                                {parts.map((p) => (
                                  <div key={p.label} className={classes.part}>
                                    <span>{p.label}</span>
                                    <span className={classes.partTrack}>
                                      <span className={classes.partBar} data-loss={p.value < 0 || undefined} style={barStyle(p.value)} />
                                    </span>
                                    <b className={p.value > 0 ? "gain" : "loss"}>{signed(p.value, 1)}</b>
                                  </div>
                                ))}
                              </div>
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
                          reader={reader}
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
                        Pick a champion from the grid, or click one of {reader?.you ? "your" : `${coachName}'s`} suggestions.
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

/** Short names for the kinds of reasons in a pick or ban value. */
const PART_NAMES: Record<string, string> = { comfort: "comfort", meta: "patch", role: "off-role", comp: "comp", combo: "combo", lane: "lane", own: "yours too" };

// Where zero sits on a suggestion's bars (as a share of the bar; .partTrack::after draws it) and how much of the bar one point takes.
const BAR_ZERO = 0.35;
const BAR_UNIT = 0.16;

/** A part's bar from zero: to the right for a plus, to the left for a minus, cut at the bar's end. */
function barStyle(value: number): React.CSSProperties {
  const w = Math.min(Math.abs(value) * BAR_UNIT, value >= 0 ? 1 - BAR_ZERO : BAR_ZERO);
  return { left: `${(value >= 0 ? BAR_ZERO : BAR_ZERO - w) * 100}%`, width: `${w * 100}%` };
}

/** What a suggestion shows under its name: the biggest pluses and minuses of its value, by kind. The full breakdown is on hover. */
function valueParts(choice: BoardChoice | null, sg: Suggestion, kind: "ban" | "pick"): { label: string; value: number }[] {
  const byKind = new Map<string, number>();
  for (const n of choice?.notes ?? []) byKind.set(n.kind, (byKind.get(n.kind) ?? 0) + n.value);
  let parts = [...byKind].map(([k, value]) => ({ label: PART_NAMES[k] ?? k, value }));
  if (parts.length === 0) {
    parts =
      kind === "ban"
        ? [{ label: "threat", value: sg.threat ?? 0 }]
        : [
            { label: "fit", value: sg.power ?? 0 },
            { label: "comp", value: sg.need ?? 0 },
            { label: "lane", value: sg.counter ?? 0 },
          ];
  }
  return parts
    .filter((p) => Math.abs(p.value) >= 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);
}

/** Both sides' five ban slots along the top, the one being filled lit, and the series score between them. */
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
    <Paper p="sm" radius={12}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Text className="eyebrow side-blue" mr={4}>
            Bans
          </Text>
          {slots("blue", s.blue_bans)}
        </Group>
        {view.match.best_of > 1 && (
          <Group gap={8} wrap="nowrap">
            <TeamLogo team={view.blue.team} size={46} />
            <Text className="display" fz={46} lh={1}>
              {seriesBySide(view)[0]}{" "}
              <Text span c="dimmed" inherit>
                :
              </Text>{" "}
              {seriesBySide(view)[1]}
            </Text>
            <TeamLogo team={view.red.team} size={46} />
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

/**
 * Fearless draft: every champion already played in the series, by game and by team, in a strip of
 * its own under the bans. The grid greys the same champions out.
 */
function FearlessStrip({ view }: { view: LiveView }) {
  const teams = teamsOf(view.match);
  const games = view.match.game_list.filter((g) => g.number < view.game);
  if (!view.match.fearless || games.length === 0) return null;
  const sideOf = (g: GameRecord, team: string) => (team === g.blue ? g.blue_picks : g.red_picks);
  return (
    <Paper radius={12} px="md" py="xs">
      <Group gap="xl" wrap="wrap" justify="center">
        <Text className="eyebrow">Fearless · already played</Text>
        {games.map((g) => (
          <Group key={g.number} gap="md" wrap="nowrap">
            <Text fz="sm" fw={800} c="dimmed" style={{ whiteSpace: "nowrap" }}>
              Game {g.number}
            </Text>
            {[g.blue, g.red].map((team) => (
              <Group key={team} gap={4} wrap="nowrap">
                <Text fz="xs" fw={700} c="gray.4" mr={2}>
                  {teams[team]?.tag ?? team}
                </Text>
                {ROLES.map((r) => {
                  const c = sideOf(g, team)[r];
                  return c ? <ChampIcon key={r} id={c} size={28} /> : null;
                })}
              </Group>
            ))}
          </Group>
        ))}
      </Group>
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
  reader,
  off,
  mastery,
  selected,
  disabled,
  onClick,
}: {
  champion: Champion;
  entry: BoardEntry | undefined;
  kind: "ban" | "pick" | null;
  reader: LiveView["reader"];
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
      label={entry ? <Breakdown name={champion.name} entry={entry} kind={kind} reader={reader} /> : champion.name}
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

function Breakdown({ name, entry, kind, reader }: { name: string; entry: BoardEntry; kind: "ban" | "pick" | null; reader: LiveView["reader"] }) {
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
        {reader ? `${reader.you ? "Your" : `${reader.name}'s`} read (drafting ${reader.drafting}/20)` : "No assistant coach: a rough read"}
      </Text>
    </Stack>
  );
}

/** One side's five: the player's name, and the champion's portrait and name once picked. */
function PickColumn({ side, view, unavailable }: { side: Side; view: LiveView; unavailable: Set<string> }) {
  const catalog = useCatalog();
  const picks = side === "blue" ? view.select.blue_picks : view.select.red_picks;
  const sv = view[side];
  const ours = side === view.our_side;
  const choosing = view.select.turn?.side === side && view.select.turn.kind === "pick";
  const red = side === "red";

  return (
    <Stack gap={8} className={classes.column}>
      <Group gap="sm" justify={red ? "flex-end" : "flex-start"} wrap="nowrap">
        {!red && <TeamLogo team={sv.team} size={34} />}
        <Text fw={800} className={`display side-${side}`} fz={20}>
          {ours ? "You" : sv.team.tag} · {side}
        </Text>
        {red && <TeamLogo team={sv.team} size={34} />}
      </Group>
      {sv.lineup.map((p) => {
        const champ = picks[p.slot];
        return (
          <PlayerHoverCard key={p.id} player={p} mastery={view.mastery[p.id]} unavailable={unavailable} position={red ? "left" : "right"}>
            <Box className={cx(classes.pickSlot, red && classes.pickRed, choosing && !champ && classes.pickWaiting)}>
              {champ && <ChampPortrait id={champ} className={classes.pickArt} />}
              <Box className={classes.pickShade} />
              <Group className={classes.pickInfo} gap={12} wrap="nowrap" justify={red ? "flex-end" : "flex-start"}>
                {!red && <PlayerPhoto photo={p.photo} name={p.name} size={46} />}
                <Stack gap={2} align={red ? "flex-end" : "flex-start"} miw={0}>
                  <Group gap={6} wrap="nowrap">
                    <RoleIcon role={p.slot} size={16} />
                    <Text fw={800} fz="md" truncate>
                      {p.name}
                    </Text>
                  </Group>
                  {champ ? (
                    <Text className={classes.pickChamp} truncate>
                      {catalog.champion[champ]?.name ?? champ}
                    </Text>
                  ) : (
                    <Text fz="sm" c={choosing ? "gold.4" : "dimmed"} fw={choosing ? 700 : 400}>
                      {choosing ? "picking…" : "waiting"}
                    </Text>
                  )}
                </Stack>
                {red && <PlayerPhoto photo={p.photo} name={p.name} size={46} />}
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
// How long a caster's call holds the moment banner, in real seconds, at any speed.
const CALL_SECONDS = 6;

/** What each kind of event is called and its colour. Key events are the ones worth stopping for. */
const KINDS: Record<string, { label: string; tone: string; key?: boolean }> = {
  first_blood: { label: "First blood", tone: "#e9edf4", key: true },
  kill: { label: "Kill", tone: "#8e99ae" },
  teamfight: { label: "Fight", tone: "#e9edf4", key: true },
  dragon: { label: "Drake", tone: "#0ac8b9", key: true },
  soul: { label: "Soul", tone: "#0ac8b9", key: true },
  elder: { label: "Elder", tone: "#f0c64a", key: true },
  baron: { label: "Baron", tone: "#a98bff", key: true },
  herald: { label: "Herald", tone: "#0ac8b9", key: true },
  grubs: { label: "Grubs", tone: "#8e99ae" },
  tower: { label: "Tower", tone: "#8e99ae" },
  inhibitor: { label: "Inhibitor", tone: "#e9edf4", key: true },
  nexus: { label: "Nexus", tone: "#f0e6d2", key: true },
  play: { label: "Set play", tone: "#c8aa6e", key: true },
  throw: { label: "Throw", tone: "#ff8a5c", key: true },
  // The caster's call on a fight: the headline of the moment it belongs to, and a key line of its own.
  highlight: { label: "Caster", tone: "#f0c64a", key: true },
  note: { label: "", tone: "#8e99ae" },
};
const kindOf = (k: string) => KINDS[k] ?? KINDS.note;

/** "Set play, Tower dive: TH dive the bot lane" → "Tower dive". */
function playName(e: TimelineEvent | undefined): string {
  return (e && /^Set play, ([^:]+):/.exec(e.text)?.[1]) || "set play";
}

function ResultStage({ view, onFinished }: { view: LiveView; onFinished: (id: string) => void }) {
  const { career, act, busy } = useCareer();
  const game = useApi(() => api.game(career.id, view.match.id, view.game), [career.id, view.match.id, view.game]);
  if (!game.data?.timeline) return <Loading text="Loading the game…" />;
  return (
    <Playback
      key={`${view.match.id}-${view.game}`}
      view={view}
      data={game.data}
      busy={busy}
      onNext={async () => {
        const result = await act({ type: "next_game" });
        if (result && !result.career.live) onFinished(view.match.id);
      }}
    />
  );
}

function Playback({ view, data, busy, onNext }: { view: LiveView; data: GameView; busy: boolean; onNext: () => void }) {
  const events = data.timeline!.events;
  const end = events[events.length - 1]?.t ?? 0;
  const [speed, setSpeed] = useState(readSpeed());
  const [mode, setMode] = useState<"key" | "all">("key");
  const timeline = useGameClock(end, speed * GAME_SECONDS_PER_SECOND);
  // Every event whose time the clock has reached is on screen.
  const reached = useMemo(() => {
    let n = 0;
    while (n < events.length && events[n].t <= timeline.t) n += 1;
    return n;
  }, [events, timeline.t]);
  const upTo = events.slice(0, reached);
  const current = upTo[upTo.length - 1] as TimelineEvent | undefined;
  const gold = data.timeline!.gold;
  const goldLead = timeline.done ? (gold[gold.length - 1] ?? 0) : goldAt(gold, events, timeline.t);
  const ourSide = view.our_side;
  const ourId = view[ourSide].team.id;
  const blueTeam = view.blue.team;
  const redTeam = view.red.team;
  const leader = goldLead > 0 ? blueTeam : goldLead < 0 ? redTeam : null;
  const latestKey = [...upTo].reverse().find((e) => kindOf(e.kind).key && e.kind !== "highlight");
  // A caster's call stays on the banner for a few real seconds whatever the speed, then the banner
  // goes back to the latest moment. The engine logs a call just before the fight it is about.
  const lastCall = [...upTo].reverse().find((e) => e.kind === "highlight");
  const [held, setHeld] = useState<{ t: number; at: number } | null>(null);
  useEffect(() => {
    if (lastCall && lastCall.t !== held?.t) setHeld({ t: lastCall.t, at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCall?.t]);
  const call = lastCall && held?.t === lastCall.t && Date.now() - held.at < CALL_SECONDS * 1000 ? lastCall : undefined;
  const fight = call ? upTo.find((e) => e.t >= call.t && e.kind === "teamfight") : undefined;
  const ourPlay = upTo.find((e) => e.kind === "play" && e.side === ourSide);
  const shown = (mode === "key" ? upTo.filter((e) => kindOf(e.kind).key) : upTo).slice().reverse().slice(0, 12);

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
          <ScoreSide team={blueTeam} side="blue" kills={current?.score[0] ?? 0} />
          <Stack gap={0} align="center">
            <Text className={classes.clock}>{clock(Math.floor(timeline.t))}</Text>
            <span className={classes.leadChip}>{leader ? `${leader.tag} +${(Math.abs(goldLead) / 1000).toFixed(1)}k gold` : "Gold even"}</span>
            {view.match.best_of > 1 && (
              <Text fz="xs" fw={700} c="dimmed" mt={6} tt="uppercase" lts="0.1em">
                Series {seriesBySide(view, true).join(" : ")} · game {view.game}
              </Text>
            )}
          </Stack>
          <ScoreSide team={redTeam} side="red" kills={current?.score[1] ?? 0} right />
        </div>
        <div className={classes.objectives}>
          <ObjectiveSide side="blue" events={upTo} />
          <Text className="label" style={{ alignSelf: "center" }}>
            Objectives
          </Text>
          <ObjectiveSide side="red" events={upTo} right />
        </div>
      </Paper>

      <Moment event={latestKey} call={call} fight={fight} blue={blueTeam.tag} red={redTeam.tag} game={view.game} />

      <Box style={{ display: "flex", flexWrap: "wrap", gap: "var(--mantine-spacing-md)", alignItems: "flex-start" }}>
        <Box style={{ flex: "3 1 560px", minWidth: 0 }}>
          <Section
            title="Gold difference"
            right={
              <Group gap={12} fz={12} c="dimmed">
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "var(--side-blue)" }} />
                  {blueTeam.tag}'s moment
                </Group>
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "var(--side-red)" }} />
                  {redTeam.tag}'s moment
                </Group>
                <Group gap={5}>
                  <span className={classes.feedDot} style={{ background: "var(--gold)" }} />
                  set play
                </Group>
              </Group>
            }
          >
            <SideGraph gold={gold} seconds={timeline.t} events={upTo} blue={blueTeam.tag} red={redTeam.tag} />
          </Section>
        </Box>

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

function ScoreSide({ team, side, kills, right = false }: { team: SideView["team"]; side: Side; kills: number; right?: boolean }) {
  return (
    <div className={classes.scoreSide} data-right={right || undefined}>
      <TeamLogo team={team} size={52} />
      <Stack gap={0} miw={0} align={right ? "flex-end" : "flex-start"}>
        <Text className="display" fz={22} lh={1.1} truncate style={{ color: sideColor(side) }}>
          {team.name}
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
  const dragons = mine.filter((e) => e.kind === "dragon" || e.kind === "soul" || e.kind === "elder");
  // Elemental drakes only, as the game's record counts them; the Elder still shows among the types.
  const drakes = dragons.filter((e) => e.kind !== "elder");
  const types = dragons.map((e) =>
    e.kind === "elder" ? "Elder" : e.kind === "soul" ? `${/the (\w+) Soul/.exec(e.text)?.[1] ?? ""} Soul`.trim() : /the (\w+) Drake/.exec(e.text)?.[1] ?? "Drake",
  );
  const heralds = count("herald");
  const grubs = count("grubs");
  const barons = count("baron");
  const inhibitors = count("inhibitor");
  const items = [
    <span key="t" className={classes.obj} data-none={towers === 0 || undefined}>
      <GameIcon kind="tower" size={20} label="Towers" />
      {towers}
    </span>,
    <span key="d" className={classes.obj} data-none={drakes.length === 0 || undefined}>
      <GameIcon kind="dragon" size={20} label="Drakes" />
      {drakes.length}
    </span>,
    types.length > 0 && (
      <span key="dt" className={classes.drakeType}>
        {types.join(" · ")}
      </span>
    ),
    (heralds > 0 || grubs > 0) && (
      <span key="h" className={classes.obj}>
        <GameIcon kind="herald" size={20} label="Rift Herald and Voidgrubs" />
        {[heralds && `Herald${heralds > 1 ? ` ×${heralds}` : ""}`, grubs && `grubs ×${grubs}`].filter(Boolean).join(" · ")}
      </span>
    ),
    inhibitors > 0 && (
      <span key="i" className={classes.obj}>
        <GameIcon kind="inhibitor" size={20} label="Inhibitors" />
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
    <div className={classes.objSide} data-side={side} data-right={right || undefined}>
      {right ? items.reverse() : items}
    </div>
  );
}

/**
 * The latest moment that matters, big enough to notice from across the room. A caster's call takes
 * the banner while it is fresh, with the fight it belongs to under it.
 */
function Moment({ event, call, fight, blue, red, game }: { event: TimelineEvent | undefined; call?: TimelineEvent; fight?: TimelineEvent; blue: string; red: string; game: number }) {
  if (call) {
    return (
      <Paper radius={14} className={classes.moment} style={{ "--tone": "#f0c64a" } as React.CSSProperties}>
        <Box miw={0}>
          <Text fz={12} fw={700} tt="uppercase" lts="0.14em" style={{ color: "#f0c64a" }}>
            {clock(call.t)} · Caster
          </Text>
          <Text className={classes.momentTitle} fz={36}>
            {call.text}
          </Text>
          {fight && (
            <Text fz="md" c="gray.3" mt={4}>
              {fight.text}
            </Text>
          )}
        </Box>
      </Paper>
    );
  }
  const k = event ? kindOf(event.kind) : KINDS.note;
  return (
    <Paper radius={14} className={classes.moment} style={{ "--tone": k.tone } as React.CSSProperties}>
      <Box miw={0}>
        <Text fz={12} fw={700} tt="uppercase" lts="0.14em" style={{ color: k.tone }}>
          {event ? `${clock(event.t)} · ${k.label}` : `Game ${game}`}
        </Text>
        <Text className={classes.momentTitle}>{event ? event.text : `${blue} and ${red} walk out`}</Text>
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

/**
 * A smooth curve through the points that never overshoots them (monotone cubic, Fritsch–Carlson):
 * its path, and its height at any x, so marks sit on the curve itself.
 */
function smooth(pts: [number, number][]): { d: string; yAt: (px: number) => number } {
  const f = (v: number) => v.toFixed(1);
  const n = pts.length;
  if (n < 2) return { d: n ? `M${f(pts[0][0])},${f(pts[0][1])}` : "", yAt: () => (n ? pts[0][1] : 0) };
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    slope.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const tan = [slope[0]];
  for (let i = 1; i < n - 1; i++) tan.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  tan.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tan[i] = tan[i + 1] = 0;
      continue;
    }
    const a = tan[i] / slope[i];
    const b = tan[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      tan[i] = (3 / Math.sqrt(s)) * a * slope[i];
      tan[i + 1] = (3 / Math.sqrt(s)) * b * slope[i];
    }
  }
  // Control points a third of the way along each segment, so x runs evenly with the curve's t.
  const controls = (i: number) => [pts[i][1], pts[i][1] + (tan[i] * dx[i]) / 3, pts[i + 1][1] - (tan[i + 1] * dx[i]) / 3, pts[i + 1][1]];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [, c1, c2, end] = controls(i);
    d += ` C${f(pts[i][0] + dx[i] / 3)},${f(c1)} ${f(pts[i + 1][0] - dx[i] / 3)},${f(c2)} ${f(pts[i + 1][0])},${f(end)}`;
  }
  const yAt = (px: number) => {
    if (px <= pts[0][0]) return pts[0][1];
    if (px >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (i < n - 2 && px > pts[i + 1][0]) i++;
    const t = (px - pts[i][0]) / dx[i];
    const [p0, p1, p2, p3] = controls(i);
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  return { d, yAt };
}

/**
 * The gold lead at second t, without looking ahead. gold[m] is the lead at the end of minute m,
 * after that minute's fights, so at t it is the last whole minute's value, then the latest event
 * since; each event carries the lead right after it.
 */
function goldAt(gold: number[], events: TimelineEvent[], t: number): number {
  const m = Math.floor(t / 60);
  let value = m >= 1 ? (gold[Math.min(m - 1, gold.length - 1)] ?? 0) : 0;
  for (const e of events) {
    if (e.t > t) break;
    if (e.t >= m * 60) value = e.gold;
  }
  return value;
}

/** Objectives get an icon in the lane under the graph; fights stay dots on the line. */
const LANE: Record<string, GameIconKind> = { dragon: "dragon", soul: "dragon", elder: "dragon", baron: "baron", herald: "herald", inhibitor: "inhibitor", play: "play" };

const lead = (g: number, blue: string, red: string) => (Math.abs(g) < 50 ? "Even" : `+${(Math.abs(g) / 1000).toFixed(1)}k ${g > 0 ? blue : red}`);
const tone = (side: Side | null) => (side === "blue" ? "var(--side-blue)" : side === "red" ? "var(--side-red)" : "#8e99ae");

/**
 * Gold difference minute by minute in the sides' colours: above the line blue is ahead, below it
 * red is. Fights are dots on the line in the colour of the side they went to, objectives icons in
 * the lane under it, and hovering a minute shows what happened in it. Scaled to what has been
 * played, so neither the axis nor the scale gives away how the game goes on.
 */
function SideGraph({ gold, seconds, events, blue, red, height = 300 }: { gold: number[]; seconds: number; events: TimelineEvent[]; blue: string; red: string; height?: number }) {
  const { ref, width: measured } = useElementSize();
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(320, Math.round(measured) || 700);
  // gold[m] is the lead at the end of minute m, so it sits at m + 1; the game starts even at 0. Only
  // minutes already over are drawn, then the line runs to this very second at the latest event's lead.
  const minute = Math.min(Math.floor(seconds / 60), gold.length);
  const series = [0, ...gold.slice(0, minute)]; // the lead at 0′, 1′, … minute′
  const live = seconds / 60 > minute ? goldAt(gold, events, seconds) : null;
  // The time axis shows half an hour from the start, and grows once the game nears its end.
  const minutes = Math.max(30, minute + 4);
  // At least 10k either way, so an early lead of a thousand looks like one; past that, the next 5k up.
  const peak = Math.max(10000, Math.ceil(Math.max(...series.map((g) => Math.abs(g)), Math.abs(live ?? 0)) / 5000) * 5000);
  const left = 44;
  const right = 16;
  const top = 12;
  const lane = 30; // the objective icons, between the plot and the minutes
  const bottom = 20 + lane;
  const plotBottom = height - bottom;
  const x = (m: number) => left + (m / minutes) * (width - left - right);
  const mid = top + (plotBottom - top) / 2;
  const y = (g: number) => mid - (g / peak) * ((plotBottom - top) / 2);
  const points = series.map((g, m) => [x(m), y(g)] as [number, number]);
  if (live !== null) points.push([x(seconds / 60), y(live)]);
  const curve = smooth(points);
  const line = curve.d;
  const last = points[points.length - 1];
  const area = `${line} L${last[0].toFixed(1)},${mid} L${x(0)},${mid} Z`;
  const now = live ?? series[series.length - 1] ?? 0;
  const key = events.filter((e) => kindOf(e.kind).key && e.kind !== "nexus" && e.kind !== "highlight");
  const dots = key.filter((e) => !LANE[e.kind]);
  const marks = key.filter((e) => LANE[e.kind]);
  const half = Math.round(peak / 2000);
  const full = Math.round(peak / 1000);
  const ticks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter((m) => m <= minutes);
  const headColor = now > 50 ? "var(--side-blue)" : now < -50 ? "var(--side-red)" : "var(--gold)";
  const label = lead(now, blue, red);
  const labelWidth = label.length * 7 + 16;
  const labelLeft = last[0] + 12 + labelWidth > width - right;
  const hovered = hover !== null ? Math.min(hover, series.length - 1) : null;
  // What happened in the minute that ends at the hovered mark.
  const inMinute = hovered === null ? [] : key.filter((e) => Math.floor(e.t / 60) === hovered - 1).slice(0, 4);

  function move(ev: MouseEvent<HTMLDivElement>) {
    const box = ev.currentTarget.getBoundingClientRect();
    const m = Math.round(((ev.clientX - box.left - left) / (width - left - right)) * minutes);
    setHover(m < 0 || m > series.length - 1 ? null : m);
  }

  return (
    <div ref={ref} className={classes.graph} onMouseMove={move} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Gold difference over time: above the line blue is ahead, below it red">
        <defs>
          <clipPath id={`${id}-above`}>
            <rect x="0" y="0" width={width} height={mid} />
          </clipPath>
          <clipPath id={`${id}-below`}>
            <rect x="0" y={mid} width={width} height={height - mid} />
          </clipPath>
          <linearGradient id={`${id}-blue`} x1="0" y1={top} x2="0" y2={mid} gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--side-blue)", stopOpacity: 0.5 }} />
            <stop offset="1" style={{ stopColor: "var(--side-blue)", stopOpacity: 0.02 }} />
          </linearGradient>
          <linearGradient id={`${id}-red`} x1="0" y1={mid} x2="0" y2={plotBottom} gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--side-red)", stopOpacity: 0.02 }} />
            <stop offset="1" style={{ stopColor: "var(--side-red)", stopOpacity: 0.5 }} />
          </linearGradient>
          {/* In the graph's own units: a region from the line's box would have no height while the game is
              even and the line flat, and the browser would then draw nothing of it. */}
          <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The scale: half and full either way, and the even line. */}
        {[peak, peak / 2, -peak / 2, -peak].map((g) => (
          <line key={g} x1={left} x2={width - right} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.05)" />
        ))}
        {[
          [peak, `+${full}k`],
          [peak / 2, `+${half}k`],
          [-peak / 2, `+${half}k`],
          [-peak, `+${full}k`],
        ].map(([g, text]) => (
          <text key={g} x={left - 8} y={y(g as number) + 4} textAnchor="end" fill="#5e6982" fontSize="11">
            {text}
          </text>
        ))}
        <text x={left - 8} y={mid + 4} textAnchor="end" fill="#8e99ae" fontSize="11" fontWeight="700">
          0
        </text>
        {ticks.map((m) => (
          <text key={m} x={x(m)} y={height - 5} textAnchor="middle" fill="#5e6982" fontSize="11">
            {m}′
          </text>
        ))}
        <line x1={left} x2={width - right} y1={plotBottom + lane / 2} y2={plotBottom + lane / 2} stroke="rgba(255,255,255,0.05)" />

        {/* Who is ahead: the area fades towards even, the line glows in the leader's colour. */}
        <path d={area} fill={`url(#${id}-blue)`} clipPath={`url(#${id}-above)`} />
        <path d={area} fill={`url(#${id}-red)`} clipPath={`url(#${id}-below)`} />
        <line x1={left} x2={width - right} y1={mid} y2={mid} stroke="#3a4560" strokeWidth="1.5" />
        <g filter={`url(#${id}-glow)`} fill="none" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d={line} style={{ stroke: "var(--side-blue)" }} clipPath={`url(#${id}-above)`} />
          <path d={line} style={{ stroke: "var(--side-red)" }} clipPath={`url(#${id}-below)`} />
        </g>
        <text x={left + 10} y={top + 14} style={{ fill: "var(--side-blue)" }} fontSize="11" fontWeight="800" letterSpacing="0.08em">
          {blue} AHEAD
        </text>
        <text x={left + 10} y={plotBottom - 8} style={{ fill: "var(--side-red)" }} fontSize="11" fontWeight="800" letterSpacing="0.08em">
          {red} AHEAD
        </text>

        {/* Fights and other moments on the line. */}
        {dots.map((e, i) => (
          <circle key={i} cx={x(e.t / 60)} cy={curve.yAt(x(e.t / 60))} r={e.kind === "throw" ? 4.5 : 3.5} style={{ fill: tone(e.side) }} stroke="#070a12" strokeWidth="1.5">
            <title>{`${clock(e.t)} ${e.text}`}</title>
          </circle>
        ))}

        {/* Hover: the minute under the mouse. */}
        {hovered !== null && (
          <g pointerEvents="none">
            <line x1={x(hovered)} x2={x(hovered)} y1={top} y2={plotBottom} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
            <circle cx={x(hovered)} cy={y(series[hovered])} r="5" fill="#070a12" strokeWidth="2.5" style={{ stroke: tone(series[hovered] > 0 ? "blue" : series[hovered] < 0 ? "red" : null) }} />
          </g>
        )}

        {/* Now: where the game stands, with a pulse and the lead. */}
        <line x1={last[0]} x2={last[0]} y1={top} y2={plotBottom} stroke="rgba(255,255,255,0.08)" />
        <circle className={classes.graphPulse} cx={last[0]} cy={last[1]} r="5" style={{ fill: headColor }} />
        <circle cx={last[0]} cy={last[1]} r="5" style={{ fill: headColor }} stroke="#070a12" strokeWidth="2" />
        <g transform={`translate(${labelLeft ? last[0] - 12 - labelWidth : last[0] + 12}, ${Math.max(top, Math.min(plotBottom - 22, last[1] - 11))})`}>
          <rect width={labelWidth} height="22" rx="11" fill="#0b111c" style={{ stroke: headColor }} strokeWidth="1.2" />
          <text x={labelWidth / 2} y="15" textAnchor="middle" fontSize="12" fontWeight="800" style={{ fill: headColor }}>
            {label}
          </text>
        </g>
      </svg>

      {/* Objectives in the lane, in the colour of the side that took them. */}
      {marks.map((e, i) => (
        <span
          key={i}
          className={classes.graphMark}
          title={`${clock(e.t)} ${e.text}`}
          style={{ left: x(e.t / 60), top: plotBottom + lane / 2, color: e.kind === "play" ? "var(--gold)" : e.kind === "elder" ? "#f0c64a" : tone(e.side) }}
        >
          <GameIcon kind={LANE[e.kind]} size={13} />
        </span>
      ))}

      {hovered !== null && (
        <div className={classes.graphTip} style={x(hovered) > width - 280 ? { right: width - x(hovered) + 12 } : { left: x(hovered) + 12 }}>
          <Group justify="space-between" gap="md" wrap="nowrap">
            <Text fz={11} fw={700} c="dimmed">
              {hovered}′
            </Text>
            <Text fz={13} fw={800} style={{ color: tone(series[hovered] > 50 ? "blue" : series[hovered] < -50 ? "red" : null) }}>
              {lead(series[hovered], blue, red)}
            </Text>
          </Group>
          {inMinute.map((e, i) => (
            <Text key={i} fz={11} c="gray.4" mt={4} lh={1.35}>
              <span style={{ color: e.kind === "play" ? "var(--gold)" : tone(e.side), fontWeight: 700 }}>{kindOf(e.kind).label}</span> · {e.text}
            </Text>
          ))}
        </div>
      )}
    </div>
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
