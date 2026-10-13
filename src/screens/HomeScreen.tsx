import { ActionIcon, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import {
  IconAlertTriangle, IconArrowRight, IconBarbell, IconCheck, IconChevronLeft, IconChevronRight, IconClipboardList, IconCoin, IconFileCertificate,
  IconFileText, IconMail, IconMessageCircle, IconSwords, IconTransfer, IconTrophy, IconWand,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { CareerView, CompetitionRow, CompetitionView, InboxMessage, MatchSummary, ScoutingReport, SquadView, StageView, StandingRow, Tactics, TeamRef, TrainingView } from "../api/types";
import { isReview } from "../api/types";
import { PlayerPhoto, SplashBackdrop, TeamLogo } from "../components/Media";
import { Empty, Loading, Screen, Section } from "../components/Ui";
import { dayLabel, longDate, ordinal, shortDate, signed, whenLabel } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./HomeScreen.module.css";

function currentCompetition(rows: CompetitionRow[], league: string): CompetitionRow | null {
  const mine = rows.filter((c) => c.mine);
  return (
    mine.find((c) => c.status === "running") ??
    mine.find((c) => c.status === "upcoming") ??
    rows.find((c) => c.league === league && c.status === "running") ??
    [...mine].reverse().find((c) => c.status === "finished") ??
    null
  );
}

/** The splash behind the stage: the franchise player's favourite champion. */
function heroChampion(squad: SquadView | null): string | null {
  if (!squad) return null;
  const star = squad.players.find((p) => p.id === squad.franchise) ?? squad.players[0];
  return star?.signatures[0] ?? star?.pool[0]?.champion ?? null;
}

function isScouting(report: InboxMessage["report"]): report is ScoutingReport {
  return !!report && "opponent" in report && "match" in report;
}

/** The standings table a team is in, with its place. */
function tableOf(stage: StageView | null, team: string | undefined): { rows: StandingRow[]; index: number } | null {
  if (!stage || !team) return null;
  for (const t of stage.tables) {
    const index = t.rows.findIndex((r) => r.team.id === team);
    if (index >= 0) return { rows: t.rows, index };
  }
  return null;
}

export function HomeScreen() {
  const { career, revision } = useCareer();
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  const current = comps.data ? currentCompetition(comps.data, career.league) : null;
  const table = useApi(() => (current ? api.competition(career.id, current.id) : Promise.resolve(null)), [career.id, revision, current?.id]);
  const squad = useApi(() => api.squad(career.id), [career.id, revision]);
  const schedule = useApi(() => (career.phase === "draft" ? Promise.resolve([]) : api.schedule(career.id)), [career.id, revision, career.phase]);
  const training = useApi(() => (career.phase === "draft" ? Promise.resolve(null) : api.training(career.id).catch(() => null)), [career.id, revision, career.phase]);
  const stage = table.data ? table.data.stages.find((s) => s.kind === "round_robin" || s.kind === "swiss") ?? null : null;

  return (
    <Screen>
      <div className={classes.top}>
        <StageCard squad={squad.data} schedule={schedule.data ?? []} comp={table.data} stage={stage} />
        <ThisWeek squad={squad.data} training={training.data} />
      </div>

      <div className={classes.bottom}>
        <Section
          className={classes.race}
          title="The race"
          pad={false}
          right={
            current && (
              <Button component={Link} to={`/career/${career.id}/competitions/${current.id}`} variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
                {current.short}
              </Button>
            )
          }
        >
          {!table.data ? (
            career.phase === "draft" ? <Empty>The schedule is made after the draft.</Empty> : <Loading />
          ) : stage ? (
            <Race stage={stage} league={table.data.kind === "league"} />
          ) : (
            <Empty>{table.data.short} is down to its bracket.</Empty>
          )}
        </Section>

        <Round comp={table.data} />

        <Storylines comps={comps.data ?? []} current={current} stage={stage} schedule={schedule.data ?? []} />
      </div>
    </Screen>
  );
}

// ---------- the stage: the one thing this screen is about ----------

function StageCard({ squad, schedule, comp, stage }: { squad: SquadView | null; schedule: MatchSummary[]; comp: CompetitionView | null; stage: StageView | null }) {
  const { career } = useCareer();
  const base = `/career/${career.id}`;
  const next = career.next_match;

  let body: ReactNode;
  if (career.phase === "draft") {
    body = (
      <Banner eyebrow="Pre-season" title="The draft is running" text={career.draft?.my_turn ? "You are on the clock." : "The other teams are picking."}>
        <Button component={Link} to={`${base}/draft`} size="lg" leftSection={<IconWand size={18} />}>
          Draft room
        </Button>
      </Banner>
    );
  } else if (career.window) {
    body = (
      <Banner
        eyebrow={`Off-season ${career.season}`}
        title="The transfer window is open"
        text={`Until ${longDate(career.window.closes)}. Contracts that end run out on ${shortDate(career.window.free_agency)}.`}
      >
        <Button component={Link} to={`${base}/transfers`} size="lg" leftSection={<IconTransfer size={18} />}>
          Transfers
        </Button>
      </Banner>
    );
  } else if (next) {
    body = <NextMatch next={next} squad={squad} schedule={schedule} comp={comp} stage={stage} />;
  } else {
    body = (
      <Banner
        eyebrow={`Season ${career.season}`}
        title={career.season_over ? "The season is over" : "No match scheduled"}
        text={career.season_over ? "Your review is in the inbox. Start the next season when you are ready." : "Continue to the next event."}
      />
    );
  }

  return (
    <Paper radius={14} className={classes.stage}>
      <SplashBackdrop id={heroChampion(squad)} strength={0.74} />
      <div className={classes.glow} aria-hidden />
      <div className={classes.stageInner}>{body}</div>
    </Paper>
  );
}

function Banner({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" h="100%">
      <Stack gap={6} maw={640} style={{ alignSelf: "center" }}>
        <Text className="eyebrow">{eyebrow}</Text>
        <Text className="display" fz={46} lh={1}>
          {title}
        </Text>
        <Text c="gray.3" fz="md">
          {text}
        </Text>
      </Stack>
      {children}
    </Group>
  );
}

const STYLE_TEXT: Record<Tactics["style"], string> = { early: "an early game", balanced: "a balanced game", scaling: "for the late game" };
const OBJECTIVE_TEXT: Record<Tactics["objectives"], string> = { dragons: ", dragons first", balanced: "", barons: ", grubs and Baron first" };

/** One or two sentences from the scouting report: how they play, and who to stop. */
function analystRead(report: ScoutingReport, mine: Tactics | undefined): string {
  const parts: string[] = [];
  const plan = report.plan;
  if (plan) {
    parts.push(`They play ${STYLE_TEXT[plan.style]} with the jungler on ${plan.lane}${OBJECTIVE_TEXT[plan.objectives]}.`);
    if (mine && plan.objectives === mine.objectives && plan.objectives !== "balanced") {
      parts.push(`You both want ${plan.objectives === "dragons" ? "the drakes" : "Baron"}: expect the fights there.`);
    }
  }
  if (report.threat) parts.push(`Watch ${report.threat.name}, ${report.threat.why}.`);
  else if (report.weaknesses?.length) parts.push(`Weak spot: ${report.weaknesses[0]}.`);
  if (parts.length === 0 && report.form.length) parts.push(`Recent form: ${report.form.map((f) => (f.won ? "W" : "L")).join("")}.`);
  return parts.slice(0, 2).join(" ") || "The report is in.";
}

function NextMatch({ next, squad, schedule, comp, stage }: { next: MatchSummary; squad: SquadView | null; schedule: MatchSummary[]; comp: CompetitionView | null; stage: StageView | null }) {
  const { career } = useCareer();
  const base = `/career/${career.id}`;
  const me = career.team.id;
  const opponent = next.home?.id === me ? next.away : next.home;
  const sameComp = comp?.id === next.competition ? stage : null;

  const record = (team: TeamRef | null) => {
    const t = tableOf(sameComp, team?.id);
    if (!t) return null;
    const row = t.rows[t.index];
    if (sameComp?.kind === "swiss") return `${row.wins}–${row.losses} in the Swiss stage`;
    return `${row.wins}–${row.losses} · ${ordinal(t.index + 1)} in the ${comp?.short ?? "table"}`;
  };

  const message = career.inbox.find((m) => m.kind === "scouting" && isScouting(m.report) && m.report.match === next.id);
  const report = message && isScouting(message.report) ? message.report : null;

  const inComp = schedule.filter((m) => m.competition === next.competition);
  const played = inComp.filter((m) => m.winner).slice(-5);
  const upcoming = inComp.filter((m) => !m.winner).slice(0, 5);

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Text className="eyebrow">
          {career.live ? "Match day" : "Next match"} · {next.competition_name} · {next.label}
        </Text>
        <Text fz="sm" fw={600} c="gray.4">
          {whenLabel(next.day, career.day)} · Best of {next.best_of}
          {next.fearless && " · fearless"}
        </Text>
      </Group>

      <div className={classes.faceoff}>
        <TeamSide team={career.team} record={record(career.team)} careerId={career.id} />
        <Text className={classes.vs}>VS</Text>
        <TeamSide team={opponent} record={record(opponent)} careerId={career.id} right />
      </div>

      {message && report && (
        <div className={classes.read}>
          <PlayerPhoto photo={career.staff.analyst?.photo} name={report.analyst ?? "Analyst"} size={38} ring="var(--teal)" />
          <Stack gap={2} style={{ flex: "1 1 320px" }} miw={0}>
            <Text fz="xs" c="dimmed" fw={600}>
              {report.analyst ?? "Your analyst"} · scouting report
            </Text>
            <Text fz="md" lh={1.4}>
              {analystRead(report, squad?.tactics)}
            </Text>
          </Stack>
          <Button component={Link} to={`${base}/inbox?m=${message.id}`} variant="default" size="sm">
            Full report
          </Button>
        </div>
      )}

      {(played.length > 0 || upcoming.length > 0) && (
        <Stack gap={8}>
          <Text className="label">Your {next.competition_name.replace(/ \d{4}$/, "")} run</Text>
          <div className={classes.run}>
            {played.map((m) => {
              const home = m.home?.id === me;
              const opp = home ? m.away : m.home;
              const [us, them] = home ? m.score : [m.score[1], m.score[0]];
              const won = m.winner === me;
              return (
                <Link key={m.id} to={`${base}/matches/${m.id}`} className={classes.runChip}>
                  <TeamLogo team={opp} size={16} />
                  {opp?.tag ?? "TBD"}
                  <span className={won ? "gain" : classes.worse}>
                    {won ? "W" : "L"} {us}–{them}
                  </span>
                </Link>
              );
            })}
            {upcoming.map((m, i) => {
              const opp = m.home?.id === me ? m.away : m.home;
              return (
                <span key={m.id} className={classes.runChip} data-next={i === 0 || undefined} data-upcoming={i > 0 || undefined}>
                  <TeamLogo team={opp} size={16} />
                  {opp?.tag ?? "TBD"}
                  <span>{i === 0 ? whenLabel(m.day, career.day) : shortDate(m.day)}</span>
                </span>
              );
            })}
          </div>
        </Stack>
      )}

      {career.live && (
        <Group>
          <Button component={Link} to={`${base}/match`} size="lg" leftSection={<IconSwords size={18} />}>
            To the stage
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function TeamSide({ team, record, careerId, right = false }: { team: TeamRef | null; record: string | null; careerId: string; right?: boolean }) {
  return (
    <div className={classes.side} data-right={right || undefined}>
      <TeamLogo team={team} size={84} />
      <Stack gap={6} miw={0}>
        {team ? (
          <Link to={`/career/${careerId}/team/${team.id}`} className={`link ${classes.teamName}`}>
            {team.name}
          </Link>
        ) : (
          <Text className={classes.teamName}>TBD</Text>
        )}
        {record && (
          <Text fz="sm" c="gray.4">
            {record}
          </Text>
        )}
      </Stack>
    </div>
  );
}

// ---------- this week: what needs you ----------

type AgendaItem = { key: string; icon: ReactNode; title: string; text: string; to?: string; action?: string; ok?: boolean };

function matchDay(day: string, today: string): string {
  const when = whenLabel(day, today);
  if (when === "Today") return "Read it before the match.";
  if (when === "Tomorrow") return "The match is tomorrow.";
  return `The match is on ${when}.`;
}

function agenda(career: CareerView, squad: SquadView | null, training: TrainingView | null): AgendaItem[] {
  const base = `/career/${career.id}`;
  const items: AgendaItem[] = [];
  const mentioned = new Set<number>();

  if (career.pending.offers > 0) {
    const n = career.pending.offers;
    items.push({ key: "offers", icon: <IconTransfer size={19} />, title: `${n} bid${n > 1 ? "s" : ""} waiting for your answer`, text: "Clubs want your players. They will not wait long.", to: `${base}/transfers`, action: "Answer" });
  }
  if (career.pending.talks > 0) {
    items.push({ key: "talks", icon: <IconMessageCircle size={19} />, title: "A player wants to talk", text: "Unhappy players play worse. Hear them out.", to: `${base}/transfers`, action: "Talk" });
  }
  if (career.board.warned) {
    items.push({ key: "warned", icon: <IconAlertTriangle size={19} />, title: "The board is losing patience", text: `Confidence ${career.board.confidence} of 100.`, to: `${base}/club`, action: "Club" });
  }
  if (career.cash < 0) {
    items.push({ key: "debt", icon: <IconCoin size={19} />, title: "The bank is in debt", text: "The board loses confidence every week until it is back above zero.", to: `${base}/club`, action: "Finances" });
  }

  const next = career.next_match;
  const scouting = next ? career.inbox.find((m) => m.kind === "scouting" && isScouting(m.report) && m.report.match === next.id) : null;
  if (next && scouting && !scouting.read && isScouting(scouting.report)) {
    mentioned.add(scouting.id);
    const opp = next.home?.id === career.team.id ? next.away : next.home;
    items.push({
      key: "scouting", icon: <IconFileText size={19} />, title: `Scouting report on ${opp?.name ?? "your opponent"}`,
      text: `In from ${scouting.report.analyst ?? "the staff"}. ${matchDay(next.day, career.day)}`,
      to: `${base}/inbox?m=${scouting.id}`, action: "Read",
    });
  }

  const review = career.inbox.find((m) => !m.read && isReview(m.report));
  if (review && isReview(review.report)) {
    mentioned.add(review.id);
    const n = review.report.recommend.length;
    items.push({
      key: "review", icon: <IconClipboardList size={19} />, title: review.subject,
      text: n ? `${review.report.analyst ?? "The analyst"} has ${n} thing${n > 1 ? "s" : ""} to work on.` : "The analyst's read of your last games.",
      to: `${base}/inbox?m=${review.id}`, action: "Open",
    });
  }

  if (training && training.load !== training.recommended && career.phase !== "draft") {
    const name = (id: string) => training.loads.find((l) => l.id === id)?.name ?? id;
    items.push({ key: "load", icon: <IconBarbell size={19} />, title: `Scrim load is ${name(training.load)}`, text: training.advice, to: `${base}/training`, action: "Training" });
  }

  if (squad && career.window && career.day < career.window.free_agency) {
    const ending = squad.players.filter((p) => p.contract_until !== null && p.contract_until <= career.season && p.id !== squad.franchise && !p.retiring);
    if (ending.length) {
      items.push({
        key: "contracts", icon: <IconFileCertificate size={19} />, title: `${ending.length} contract${ending.length > 1 ? "s" : ""} run out on ${shortDate(career.window.free_agency)}`,
        text: ending.map((p) => p.name).join(", "), to: `${base}/squad`, action: "Squad",
      });
    }
  }

  const unread = career.inbox.filter((m) => !m.read && !mentioned.has(m.id));
  if (unread.length) {
    items.push({ key: "unread", icon: <IconMail size={19} />, title: `${unread.length} unread message${unread.length > 1 ? "s" : ""}`, text: unread[0].subject, to: `${base}/inbox?m=${unread[0].id}`, action: "Inbox" });
  }

  const actions = items.slice(0, 5);
  if (!career.board.warned && actions.length < 5) {
    const objective = career.board.objectives.find((o) => o.status === "pending");
    if (objective) actions.push({ key: "board", icon: <IconCheck size={19} />, title: `Board: ${career.board.security}`, text: objective.text, to: `${base}/club`, ok: true });
  }
  return actions;
}

function ThisWeek({ squad, training }: { squad: SquadView | null; training: TrainingView | null }) {
  const { career } = useCareer();
  const items = agenda(career, squad, training);
  const needed = items.filter((i) => !i.ok).length;
  return (
    <Section
      className={classes.week}
      title="This week"
      pad={false}
      right={
        <Text fz="sm" fw={700} c={needed ? "gold.4" : "dimmed"}>
          {needed ? `${needed} need${needed === 1 ? "s" : ""} you` : "All clear"}
        </Text>
      }
    >
      {items.length === 0 ? (
        <Empty>Nothing needs you this week.</Empty>
      ) : (
        items.map((i) => (
          <div key={i.key} className={classes.agendaRow} data-ok={i.ok || undefined}>
            <span className={classes.agendaIcon} aria-hidden>
              {i.icon}
            </span>
            <Stack gap={2} style={{ flex: 1 }} miw={0}>
              <Text fw={700} fz="md" lh={1.25} c={i.ok ? "gray.4" : undefined}>
                {i.title}
              </Text>
              <Text fz="sm" c="dimmed" lineClamp={2}>
                {i.text}
              </Text>
            </Stack>
            {i.to && i.action && (
              <Button component={Link} to={i.to} size="xs" variant="light">
                {i.action}
              </Button>
            )}
          </div>
        ))
      )}
    </Section>
  );
}

// ---------- the race, the round, the storylines ----------

function Race({ stage, league }: { stage: StageView; league: boolean }) {
  const { career } = useCareer();
  const me = career.team.id;
  const found = tableOf(stage, me);
  const rows = found?.rows ?? stage.tables[0]?.rows ?? [];
  const index = found?.index ?? -1;
  const swiss = stage.kind === "swiss";
  // A Swiss stage goes by wins, not by place, so it gets no line.
  const cut = swiss ? 0 : stage.tables.length > 1 ? stage.advance / stage.tables.length : stage.advance;
  const top = Math.min(rows.length, Math.max(cut + 1, swiss ? 8 : 6));
  // Down to your team when only a few rows lie between: skipping two teams reads like a bug.
  const limit = index >= top && index - top <= 3 ? index + 1 : top;
  const shown = rows.slice(0, limit).map((r, i) => ({ row: r, pos: i + 1 }));
  if (index >= limit) shown.push({ row: rows[index], pos: index + 1 });

  return (
    <div>
      <div className={classes.raceRow} data-head>
        <span>#</span>
        <span />
        <span>Team</span>
        <span className="num">W–L</span>
        <span className="num">{swiss ? "" : "+/-"}</span>
      </div>
      {shown.map(({ row, pos }, i) => (
        <div key={row.team.id}>
          {i > 0 && shown[i - 1].pos !== pos - 1 && <div className={classes.cut}>…</div>}
          <div className={classes.raceRow} data-mine={row.team.id === me || undefined}>
            <Text span c="dimmed" fw={600}>
              {pos}
            </Text>
            <TeamLogo team={row.team} size={20} />
            <Link to={`/career/${career.id}/team/${row.team.id}`} className="link" style={{ fontWeight: row.team.id === me ? 700 : 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.team.name}
            </Link>
            <Text span className="num" fw={700}>
              {row.wins}–{row.losses}
            </Text>
            <Text span className="num" c="dimmed">
              {swiss ? "" : signed(row.game_wins - row.game_losses)}
            </Text>
          </div>
          {pos === cut && cut < rows.length && <div className={classes.cut}>{league ? "Playoffs above" : "Through above"}</div>}
        </div>
      ))}
      <div style={{ height: 10 }} />
    </div>
  );
}

// ---------- the round: who plays whom ----------

/** A stage's rounds in the order they are played: its matches by day, grouped by label (Week 3, Upper final…). */
function roundsOf(stage: StageView): { label: string; matches: MatchSummary[] }[] {
  const rounds = new Map<string, MatchSummary[]>();
  for (const m of [...stage.matches].sort((a, b) => a.day.localeCompare(b.day))) rounds.set(m.label, [...(rounds.get(m.label) ?? []), m]);
  return [...rounds].map(([label, matches]) => ({ label, matches }));
}

/** Every match of the current round, day by day; the arrows page through the other rounds. */
function Round({ comp }: { comp: CompetitionView | null }) {
  const { career } = useCareer();
  const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
  const stage = comp ? (comp.stages.find((s) => !s.finished) ?? comp.stages[comp.stages.length - 1]) : undefined;
  const rounds = stage ? roundsOf(stage) : [];
  const open = rounds.findIndex((r) => r.matches.some((m) => !m.winner));
  const current = open >= 0 ? open : rounds.length - 1;
  // A round paged to holds until the day moves on; then the current round shows again.
  const key = `${stage?.id}|${career.day}`;
  const index = picked?.key === key ? picked.index : current;
  const round = rounds[index];
  const days = new Map<string, MatchSummary[]>();
  for (const m of round?.matches ?? []) days.set(m.day, [...(days.get(m.day) ?? []), m]);

  return (
    <Section
      className={classes.round}
      title={round?.label ?? "This round"}
      pad={false}
      right={
        rounds.length > 1 && (
          <Group gap={4} wrap="nowrap">
            {index !== current && (
              <Button variant="subtle" size="compact-xs" onClick={() => setPicked(null)}>
                Now
              </Button>
            )}
            <ActionIcon variant="subtle" color="gray" disabled={index <= 0} onClick={() => setPicked({ key, index: index - 1 })} aria-label="Previous round">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" disabled={index >= rounds.length - 1} onClick={() => setPicked({ key, index: index + 1 })} aria-label="Next round">
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        )
      }
    >
      {!round ? (
        <Empty>{career.phase === "draft" ? "The schedule is made after the draft." : "No matches to show."}</Empty>
      ) : (
        <>
          {[...days].map(([day, matches]) => {
            const when = whenLabel(day, career.day);
            return (
              <div key={day}>
                <div className={classes.fixDay}>{when === "Today" || when === "Tomorrow" ? `${when} · ${dayLabel(day)}` : dayLabel(day)}</div>
                {matches.map((m) => (
                  <Fixture key={m.id} m={m} />
                ))}
              </div>
            );
          })}
          <div style={{ height: 10 }} />
        </>
      )}
    </Section>
  );
}

function Fixture({ m }: { m: MatchSummary }) {
  const { career } = useCareer();
  const me = career.team.id;
  const side = (team: TeamRef | null, away: boolean) => {
    const lost = !!m.winner && m.winner !== team?.id;
    const name = (
      <Text fz="sm" fw={team?.id === me ? 800 : m.winner === team?.id ? 700 : 500} c={lost ? "dimmed" : undefined} truncate>
        {team?.name ?? "TBD"}
      </Text>
    );
    const logo = <TeamLogo team={team} size={20} />;
    return (
      <Group gap={8} wrap="nowrap" justify={away ? "flex-start" : "flex-end"} miw={0}>
        {away ? logo : name}
        {away ? name : logo}
      </Group>
    );
  };
  const body = (
    <>
      {side(m.home, false)}
      <Text ta="center" fw={800} fz="sm" c={m.games ? undefined : "dimmed"}>
        {m.games ? `${m.score[0]} : ${m.score[1]}` : "vs"}
      </Text>
      {side(m.away, true)}
    </>
  );
  const mine = m.home?.id === me || m.away?.id === me || undefined;
  return m.games ? (
    <Link to={`/career/${career.id}/matches/${m.id}`} className={classes.fixture} data-mine={mine}>
      {body}
    </Link>
  ) : (
    <div className={classes.fixture} data-mine={mine}>
      {body}
    </div>
  );
}

type Story = { key: string; big?: string; art?: ReactNode; text: string };

function Storylines({ comps, current, stage, schedule }: { comps: CompetitionRow[]; current: CompetitionRow | null; stage: StageView | null; schedule: MatchSummary[] }) {
  const { career } = useCareer();
  const me = career.team.id;
  const stories: Story[] = [];

  // Unbeaten in the current table beats a plain streak; a streak of three or more otherwise.
  const found = tableOf(stage, me);
  const row = found ? found.rows[found.index] : null;
  if (current && row && row.losses === 0 && row.wins >= 2) {
    const only = found!.rows.filter((r) => r.losses === 0).length === 1;
    const clean = stage!.kind !== "swiss" && row.game_losses === 0;
    stories.push({
      key: "unbeaten",
      big: clean ? `${row.game_wins}–0` : `${row.wins}–0`,
      text: `${clean ? "Not a game dropped" : "Unbeaten"} in the ${current.short}.${only ? " The only team without a defeat." : ""}`,
    });
  } else {
    const played = schedule.filter((m) => m.winner);
    let streak = 0;
    const lastWon = played.length ? played[played.length - 1].winner === me : false;
    for (let i = played.length - 1; i >= 0 && (played[i].winner === me) === lastWon; i--) streak++;
    if (streak >= 3) stories.push({ key: "streak", big: String(streak), text: lastWon ? "Wins in a row, across every competition." : "Defeats in a row. Something has to change." });
  }

  const titles = comps.filter((c) => c.status === "finished" && c.winner?.id === me);
  const lastTitle = titles[titles.length - 1];
  if (lastTitle) {
    const lastLeague = [...comps].reverse().find((c) => c.status === "finished" && c.kind === "league" && c.mine);
    const backToBack = current && current.status === "running" && current.kind === "league" && lastTitle.id === lastLeague?.id;
    stories.push({
      key: "title",
      art: <IconTrophy size={34} stroke={1.5} />,
      text: `${lastTitle.name} champions.${backToBack ? ` A ${current!.short} title makes it back-to-back.` : ""}`,
    });
  }

  const next = career.next_match;
  const opponent = next ? (next.home?.id === me ? next.away : next.home) : null;
  const won = opponent ? comps.filter((c) => c.status === "finished" && c.winner?.id === opponent.id) : [];
  if (next && opponent && won.length) {
    const when = whenLabel(next.day, career.day);
    stories.push({
      key: "rival",
      art: <TeamLogo team={opponent} size={40} />,
      text: `${opponent.name} won the ${won[won.length - 1].short}. You meet them ${/^(Today|Tomorrow)$/.test(when) ? when.toLowerCase() : `on ${when}`}.`,
    });
  }

  if (stories.length === 0) return null;
  return (
    <div className={classes.stories}>
      <Title order={2} className={classes.storiesTitle}>
        Storylines
      </Title>
      {stories.slice(0, 3).map((s) => (
        <div key={s.key} className={classes.story}>
          <div className={classes.storyBig}>{s.big ?? s.art}</div>
          <Text fz="sm" lh={1.45} c="gray.3">
            {s.text}
          </Text>
        </div>
      ))}
    </div>
  );
}
