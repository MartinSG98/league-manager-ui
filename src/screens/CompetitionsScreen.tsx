import { Badge, Group, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { CompetitionRow, CompetitionView, MatchSummary, TeamRef } from "../api/types";
import { LeagueLogo, TeamLink, TeamLogo } from "../components/Media";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { ordinal, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import classes from "./CompetitionsScreen.module.css";

type Status = "finished" | "running" | "upcoming" | "tba";

/** A step of the season: a split with every league's competition, or an international event. */
interface Phase {
  key: string;
  label: string;
  kind: "split" | "international";
  comps: CompetitionRow[];
  status: Status;
  after: number; // the split it follows, for an event not announced yet
}

const EVENTS = ["First Stand", "MSI", "Worlds"];

function statusOf(comps: CompetitionRow[]): Status {
  if (comps.length === 0) return "tba";
  if (comps.every((c) => c.status === "finished")) return "finished";
  if (comps.every((c) => c.status === "upcoming")) return "upcoming";
  return "running";
}

function phasesOf(rows: CompetitionRow[]): Phase[] {
  const international = rows.filter((c) => c.kind === "international").sort((a, b) => a.start.localeCompare(b.start));
  const out: Phase[] = [];
  for (let n = 1; n <= 3; n++) {
    const split = rows.filter((c) => c.split === n);
    out.push({ key: `split-${n}`, label: `Split ${n}`, kind: "split", comps: split, status: statusOf(split), after: n });
    const event = international[n - 1];
    out.push({ key: `event-${n}`, label: EVENTS[n - 1], kind: "international", comps: event ? [event] : [], status: statusOf(event ? [event] : []), after: n });
  }
  return out;
}

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86_400_000);

function span(comps: CompetitionRow[]): string {
  if (!comps.length) return "";
  const start = comps.map((c) => c.start).sort()[0];
  const end = comps.map((c) => c.end).sort().slice(-1)[0];
  return `${shortDate(start)} – ${shortDate(end)}`;
}

/** A competition in detail: undefined while it loads, null if it could not be loaded. */
type Views = { get: (c: CompetitionRow) => CompetitionView | null | undefined };

/**
 * Every competition the screen shows in detail, fetched once after each action and kept by its id,
 * so the phase cards and the season matrix share one request and never show another phase's data.
 * What was loaded before an action stays on screen until the new one lands, as with useApi.
 */
function useDetails(ids: string[]): Views {
  const { career, revision } = useCareer();
  const [views, setViews] = useState(() => new Map<string, CompetitionView | null>());
  const fetched = useRef({ at: "", ids: new Set<string>() });
  const wanted = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    const at = `${career.id}:${revision}`;
    if (fetched.current.at !== at) fetched.current = { at, ids: new Set() };
    const missing = wanted ? wanted.split(",").filter((id) => !fetched.current.ids.has(id)) : [];
    if (missing.length === 0) return;
    missing.forEach((id) => fetched.current.ids.add(id));
    void Promise.all(missing.map((id) => api.competition(career.id, id).catch(() => null))).then((loaded) => {
      if (fetched.current.at !== at) return; // a newer action asks again
      setViews((old) => {
        const next = new Map(old);
        missing.forEach((id, i) => next.set(`${career.id}:${id}`, loaded[i]));
        return next;
      });
    });
  }, [career.id, revision, wanted]);
  return { get: (c) => views.get(`${career.id}:${c.id}`) };
}

export function CompetitionsScreen() {
  const { career, revision } = useCareer();
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);
  const [picked, setPicked] = useState<string | null>(null);
  const phases = phasesOf(comps.data ?? []);
  const current = phases.find((p) => p.status === "running") ?? phases.find((p) => p.status === "upcoming" || p.status === "tba") ?? phases[phases.length - 1];
  const phase = phases.find((p) => p.key === picked) ?? current;
  // The matrix needs the events' teams and places and a running split's leader; the cards their phase.
  const shown = [...(comps.data ?? []).filter((c) => c.kind === "international" || c.status === "running"), ...phase.comps];
  const views = useDetails(shown.map((c) => c.id));
  if (career.phase === "draft") {
    return (
      <Screen>
        <Empty>Competitions are scheduled once the draft is done.</Empty>
      </Screen>
    );
  }
  if (!comps.data) return <Loading />;

  return (
    <Screen>
      <PageHeader eyebrow={`Season ${career.season}`} title="Competitions" />
      <div className={classes.stripWrap}>
        <ol className={classes.strip} aria-label="The season">
          {phases.map((p) => (
            <UnstyledButton
              key={p.key}
              component="li"
              className={classes.node}
              data-state={p.status}
              data-selected={p.key === phase.key || undefined}
              onClick={() => setPicked(p.key)}
            >
              <span className={classes.dot} />
              <Group justify="space-between" gap={6} wrap="nowrap">
                <Text fw={800} fz="sm" tt="uppercase" lts="0.04em">
                  {p.label}
                </Text>
                {p.key === current.key && p.status === "running" && (
                  <Badge size="xs" color="hextech" variant="filled">
                    now
                  </Badge>
                )}
              </Group>
              <Text fz={11} c="dimmed">
                {p.status === "tba" ? `After split ${p.after}` : span(p.comps)}
              </Text>
              <div className={classes.nodeLogos}>
                {p.comps
                  .filter((c) => c.winner)
                  .map((c) => (
                    <span key={c.id} title={`${c.short}: ${c.winner!.name}`} style={{ outline: c.mine ? "1px solid var(--gold)" : undefined, borderRadius: 4 }}>
                      <TeamLogo team={c.winner} size={p.kind === "international" ? 24 : 18} />
                    </span>
                  ))}
              </div>
            </UnstyledButton>
          ))}
        </ol>
      </div>

      <Stack gap="lg">
        {phase.kind === "split" ? <SplitPhase phase={phase} all={comps.data} views={views} /> : <EventPhase phase={phase} views={views} />}
        <Season rows={comps.data} phases={phases} selected={phase.key} onPick={setPicked} views={views} />
      </Stack>
    </Screen>
  );
}

// ---------- the season at a glance ----------

/** Every league across the season: its split winners, or where a split stands, and its teams at each international event. */
function Season({ rows, phases, selected, onPick, views }: { rows: CompetitionRow[]; phases: Phase[]; selected: string; onPick: (key: string) => void; views: Views }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const open = (c: CompetitionRow) => navigate(`/career/${career.id}/competitions/${c.id}`);
  const leagues = [...new Set(rows.filter((c) => c.kind === "league").map((c) => c.league!))].sort(
    (a, b) => Number(b === career.league) - Number(a === career.league) || a.localeCompare(b),
  );
  /** A league's standings right now: its running split, else its last one, else the next. */
  const current = (league: string) => {
    const own = rows.filter((c) => c.league === league).sort((a, b) => a.start.localeCompare(b.start));
    return own.find((c) => c.status === "running") ?? own.filter((c) => c.status === "finished").pop() ?? own[0];
  };
  const me = career.team.id;

  const splitCell = (c: CompetitionRow | undefined, key: string) => {
    if (!c) return <div key={key} className={classes.matrixCell} data-empty />;
    const view = c.status === "running" ? views.get(c) : null;
    const stage = view?.stages.find((s) => !s.finished);
    const table = stage?.tables.find((t) => t.rows.some((r) => r.team.id === me)) ?? stage?.tables[0];
    const leader = table?.rows[0];
    const place = table ? table.rows.findIndex((r) => r.team.id === me) + 1 : 0;
    return (
      <div key={key} className={classes.matrixCell} data-mine={c.mine || undefined} title={`${c.name}: standings`} onClick={() => open(c)}>
        {c.winner ? (
          <>
            <TeamLogo team={c.winner} size={22} />
            <Text fz="sm" fw={700} truncate c={c.winner.id === me ? "gold.4" : undefined}>
              {c.winner.name}
            </Text>
          </>
        ) : c.status === "running" ? (
          leader ? (
            <>
              <TeamLogo team={leader.team} size={20} />
              <Text fz="sm" fw={700} truncate>
                {leader.team.tag} {leader.wins}–{leader.losses}
              </Text>
              {place > 1 && (
                <Text fz="xs" c="gold.4" fw={700} style={{ flex: "none" }}>
                  · you {ordinal(place)}
                </Text>
              )}
            </>
          ) : view === undefined ? (
            <Text fz="xs" c="dimmed">
              …
            </Text>
          ) : (
            <Badge size="sm" color="hextech" variant="light">
              under way
            </Badge>
          )
        ) : (
          <Text fz="xs" c="dimmed">
            from {shortDate(c.start)}
          </Text>
        )}
      </div>
    );
  };

  const eventCell = (p: Phase, league: string) => {
    const c = p.comps[0];
    const key = `${league}-${p.key}`;
    if (!c) return <div key={key} className={classes.matrixCell} data-empty data-event />;
    const view = views.get(c);
    const placed = view?.placements ?? [];
    const teams = (placed.length ? placed : view?.entrants ?? []).filter((t) => t.league === league);
    return (
      <div key={key} className={classes.matrixCell} data-event data-mine={teams.some((t) => t.id === me) || undefined} title={`${c.name}: standings`} onClick={() => open(c)}>
        {!view ? (
          <Text fz="xs" c="dimmed">
            …
          </Text>
        ) : teams.length === 0 ? (
          <Text fz="xs" c="dimmed">
            —
          </Text>
        ) : (
          teams.map((t) => {
            const place = placed.findIndex((x) => x.id === t.id) + 1;
            return (
              <span key={t.id} className={classes.eventTeam} data-mine={t.id === me || undefined} data-champion={place === 1 || undefined}>
                <TeamLogo team={t} size={18} />
                {t.tag}
                {place > 0 && <span className={classes.eventPlace}>{ordinal(place)}</span>}
              </span>
            );
          })
        )}
      </div>
    );
  };

  const columns = phases; // split 1, First Stand, split 2, MSI, split 3, Worlds
  return (
    <Section title="The season at a glance" pad={false} right={<Text fz="xs" c="dimmed">click a league for its standings now, a cell for that competition's</Text>}>
      <div className={classes.matrixWrap}>
        <div className={classes.matrix}>
          <div className={classes.matrixHead}>League</div>
          {columns.map((p) =>
            p.kind === "split" ? (
              <button key={p.key} type="button" className={classes.matrixHead} data-selected={selected === p.key || undefined} onClick={() => onPick(p.key)}>
                {p.label}
              </button>
            ) : (
              <button
                key={p.key}
                type="button"
                className={classes.matrixHead}
                data-event
                data-selected={selected === p.key || undefined}
                disabled={!p.comps[0]}
                title={p.comps[0] ? `${p.comps[0].name}: standings` : `Announced after split ${p.after}`}
                onClick={() => p.comps[0] && open(p.comps[0])}
              >
                {p.label}
                {!p.comps[0] && <span className={classes.eventPlace}>after split {p.after}</span>}
              </button>
            ),
          )}
          {leagues.map((league) => {
            const own = rows.filter((c) => c.league === league);
            const info = catalog.leagues.find((l) => l.id === league);
            const now = current(league);
            return [
              <div key={league} className={classes.matrixLeague} data-mine={league === career.league || undefined} title={now ? `${now.name}: standings` : undefined} onClick={() => now && open(now)}>
                <LeagueLogo logo={own[0]?.logo ?? info?.logo} name={league} size={24} />
                <Text fz="sm" fw={700} truncate>
                  {info?.name ?? league}
                </Text>
              </div>,
              ...columns.map((p) => (p.kind === "split" ? splitCell(own.find((c) => c.split === p.after), `${league}-${p.key}`) : eventCell(p, league))),
            ];
          })}
        </div>
      </div>
    </Section>
  );
}

// ---------- a split: every league ----------

function SplitPhase({ phase, all, views }: { phase: Phase; all: CompetitionRow[]; views: Views }) {
  // Who won each league last: the holders an upcoming split starts against.
  const holder = (c: CompetitionRow) =>
    all.filter((o) => o.league === c.league && o.kind === "league" && o.winner && o.end < c.start).sort((a, b) => a.end.localeCompare(b.end)).pop()?.winner ?? null;
  const rows = [...phase.comps].sort((a, b) => Number(b.mine) - Number(a.mine));
  return (
    <Section title={`${phase.label} · ${phase.status === "finished" ? "finished" : phase.status === "running" ? "under way" : "to come"}`} right={<Text fz="xs" c="dimmed">{span(phase.comps)}</Text>}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {rows.map((c) => (
          <LeagueCard key={c.id} c={c} view={views.get(c) ?? null} holder={holder(c)} />
        ))}
      </SimpleGrid>
    </Section>
  );
}

function byDay(matches: MatchSummary[]) {
  return [...matches].sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
}

/** The last match played in the competition's last stage: its final once it is over. */
function lastPlayed(view: CompetitionView): MatchSummary | null {
  const stage = view.stages[view.stages.length - 1];
  return stage ? byDay(stage.matches).filter((m) => m.winner).pop() ?? null : null;
}

function LeagueCard({ c, view, holder }: { c: CompetitionRow; view: CompetitionView | null; holder: TeamRef | null }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const me = career.team.id;
  return (
    <div className={classes.card} data-mine={c.mine || undefined} onClick={() => navigate(`/career/${career.id}/competitions/${c.id}`)}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <LeagueLogo logo={c.logo} name={c.short} size={36} />
          <Stack gap={0} miw={0}>
            {c.mine && <Text className="eyebrow">Your league</Text>}
            <Text fw={800} truncate>
              {c.name}
            </Text>
            <Text fz={11} c="dimmed">
              {shortDate(c.start)} – {shortDate(c.end)}
            </Text>
          </Stack>
        </Group>
        <Badge size="sm" variant={c.status === "running" ? "filled" : "light"} color={c.status === "finished" ? "gray" : c.status === "running" ? "hextech" : "gold"}>
          {c.status}
        </Badge>
      </Group>
      {c.status === "upcoming" ? (
        <Stack gap={6}>
          <Text fz="sm" c="dimmed">
            Starts {shortDate(c.start)}, in {days(career.day, c.start)} days{c.mine ? ". Your team plays here." : "."}
          </Text>
          {holder && (
            <Group gap={6} wrap="nowrap">
              <Text fz="xs" c="dimmed">
                Holders
              </Text>
              <TeamLogo team={holder} size={20} />
              <Text fz="sm" fw={700} c={holder.id === career.team.id ? "gold.4" : undefined} truncate>
                <TeamLink team={holder}>{holder.name}</TeamLink>
              </Text>
            </Group>
          )}
        </Stack>
      ) : !view ? (
        <Text fz="sm" c="dimmed">
          …
        </Text>
      ) : c.status === "finished" ? (
        <Finished view={view} me={me} mine={c.mine} />
      ) : (
        <Running view={view} me={me} />
      )}
    </div>
  );
}

function Finished({ view, me, mine }: { view: CompetitionView; me: string; mine: boolean }) {
  const winner = view.placements[0];
  const final = lastPlayed(view);
  const loser = final ? (final.winner === final.home?.id ? final.away : final.home) : view.placements[1];
  const score = final ? [...final.score].sort((a, b) => b - a).join("–") : null;
  const place = view.placements.findIndex((t) => t.id === me) + 1;
  return (
    <Stack gap={6}>
      {winner && (
        <Group gap="sm" wrap="nowrap">
          <TeamLogo team={winner} size={30} />
          <Stack gap={0} miw={0}>
            <Text fw={800} truncate>
              <TeamLink team={winner}>{winner.name}</TeamLink>
            </Text>
            {loser && (
              <Text fz="xs" c="dimmed" truncate>
                {score ? `${score} over ${loser.name} in the final` : `ahead of ${loser.name}`}
              </Text>
            )}
          </Stack>
        </Group>
      )}
      {mine && place > 0 && (
        <Text fz="sm" fw={700} c={place === 1 ? "gold.4" : undefined}>
          {place === 1 ? "You won it" : `You finished ${ordinal(place)}`}
        </Text>
      )}
    </Stack>
  );
}

function Running({ view, me }: { view: CompetitionView; me: string }) {
  const stage = view.stages.find((s) => !s.finished) ?? view.stages[view.stages.length - 1];
  if (!stage) return null;
  if (stage.kind === "round_robin" || stage.kind === "swiss") {
    const table = stage.tables.find((t) => t.rows.some((r) => r.team.id === me)) ?? stage.tables[0];
    const rows = table?.rows ?? [];
    const mine = rows.findIndex((r) => r.team.id === me);
    const shown = rows.slice(0, 3).map((r, i) => ({ r, pos: i + 1 }));
    if (mine >= 3) shown.push({ r: rows[mine], pos: mine + 1 });
    return (
      <Stack gap={4}>
        <Text fz={11} c="dimmed" fw={700} tt="uppercase" lts="0.08em">
          {stage.name}
        </Text>
        {shown.map(({ r, pos }) => (
          <div key={r.team.id} className={classes.miniRow} data-mine={r.team.id === me || undefined}>
            <Text span fz={12} c="dimmed">
              {pos}
            </Text>
            <TeamLogo team={r.team} size={18} />
            <Text span fz={13} truncate fw="inherit">
              <TeamLink team={r.team}>{r.team.name}</TeamLink>
            </Text>
            <Text span fz={13} fw={700}>
              {r.wins}–{r.losses}
            </Text>
          </div>
        ))}
      </Stack>
    );
  }
  const ordered = byDay(stage.matches);
  const last = ordered.filter((m) => m.winner).pop();
  const next = ordered.find((m) => !m.winner && m.home && m.away);
  return (
    <Stack gap={4}>
      <Text fz={11} c="dimmed" fw={700} tt="uppercase" lts="0.08em">
        {stage.name}
      </Text>
      {last && <MatchLine m={last} me={me} prefix="Last" />}
      {next && <MatchLine m={next} me={me} prefix="Next" />}
    </Stack>
  );
}

function MatchLine({ m, me, prefix }: { m: MatchSummary; me: string; prefix: string }) {
  const mine = m.home?.id === me || m.away?.id === me;
  return (
    <Group gap={6} wrap="nowrap" fz={13} c={mine ? "gold.4" : undefined}>
      <Text span fz={11} c="dimmed" w={30}>
        {prefix}
      </Text>
      <TeamLogo team={m.home} size={18} />
      <Text span fz={13} fw={m.winner === m.home?.id ? 800 : 500}>
        {m.home?.tag ?? "TBD"}
      </Text>
      <Text span fz={13} fw={700} c="dimmed">
        {m.winner ? `${m.score[0]}–${m.score[1]}` : "vs"}
      </Text>
      <Text span fz={13} fw={m.winner === m.away?.id ? 800 : 500}>
        {m.away?.tag ?? "TBD"}
      </Text>
      <TeamLogo team={m.away} size={18} />
      <Text span fz={11} c="dimmed" truncate>
        · {m.label}
      </Text>
    </Group>
  );
}

// ---------- an international event ----------

function EventPhase({ phase, views }: { phase: Phase; views: Views }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const c = phase.comps[0];
  if (!c) {
    return (
      <Section title={phase.label}>
        <Text c="dimmed">
          {phase.label} is announced when every region has finished split {phase.after}, with the teams that qualified from each.
        </Text>
      </Section>
    );
  }
  const view = views.get(c) ?? null;
  const me = career.team.id;
  const entrants = view?.entrants ?? [];
  const stage = view ? (view.stages.find((s) => !s.finished) ?? view.stages[view.stages.length - 1]) : null;
  const mineNext = view ? byDay(view.stages.flatMap((s) => s.matches)).find((m) => !m.winner && (m.home?.id === me || m.away?.id === me)) : undefined;
  const regions = new Map<string, TeamRef[]>();
  for (const t of entrants) regions.set(t.region, [...(regions.get(t.region) ?? []), t]);
  const regionName = (id: string) => catalog.regions.find((r) => r.id === id)?.name ?? id;
  const inIt = entrants.some((t) => t.id === me);
  const place = view ? view.placements.findIndex((t) => t.id === me) + 1 : 0;
  const final = view && c.status === "finished" ? lastPlayed(view) : null;

  return (
    <div className={classes.card} data-mine={inIt || undefined} onClick={() => navigate(`/career/${career.id}/competitions/${c.id}`)}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="md" wrap="nowrap">
          <LeagueLogo logo={c.logo} name={c.short} size={64} />
          <Stack gap={2}>
            <Text className="display" fz={28} lh={1}>
              {c.name}
            </Text>
            <Text fz="sm" c="dimmed">
              {shortDate(c.start)} – {shortDate(c.end)}
              {stage && c.status === "running" ? ` · ${stage.name}` : ""}
              {c.status === "upcoming" ? ` · in ${days(career.day, c.start)} days` : ""}
            </Text>
          </Stack>
        </Group>
        <Badge variant={c.status === "running" ? "filled" : "light"} color={c.status === "finished" ? "gray" : c.status === "running" ? "hextech" : "gold"}>
          {c.status}
        </Badge>
      </Group>

      <Group gap="xl" wrap="wrap">
        {c.winner && (
          <Group gap="sm" wrap="nowrap">
            <TeamLogo team={c.winner} size={36} />
            <Stack gap={0}>
              <Text className="eyebrow">Champion</Text>
              <Text fw={800}>
                <TeamLink team={c.winner}>{c.winner.name}</TeamLink>
              </Text>
              {final && (
                <Text fz="xs" c="dimmed">
                  {[...final.score].sort((a, b) => b - a).join("–")} over {(final.winner === final.home?.id ? final.away : final.home)?.name} in the final
                </Text>
              )}
            </Stack>
          </Group>
        )}
        <Text fz="sm" fw={700} c={inIt ? "gold.4" : "dimmed"}>
          {!view
            ? "…"
            : !inIt
              ? `${career.team.name} did not qualify.`
              : c.status === "finished"
                ? place === 1
                  ? "You won it."
                  : `You finished ${ordinal(place)}.`
                : "You are in it."}
        </Text>
        {mineNext && <MatchLine m={mineNext} me={me} prefix="Next" />}
      </Group>

      {entrants.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing="sm">
          {[...regions.entries()].map(([region, teams]) => (
            <div key={region} className={classes.region}>
              <Text fz={11} c="dimmed" fw={700} tt="uppercase" lts="0.08em">
                {regionName(region)}
              </Text>
              {teams.map((t) => (
                <span key={t.id} className={classes.entrant} data-mine={t.id === me || undefined}>
                  <TeamLogo team={t} size={20} />
                  <TeamLink team={t}>{t.name}</TeamLink>
                </span>
              ))}
            </div>
          ))}
        </SimpleGrid>
      )}
    </div>
  );
}
