import { Badge, Button, Group, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { IconPlayerTrackNext, IconArrowsShuffle } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { MatchSummary, StageView, TeamRef } from "../api/types";
import { cx, shortDate } from "../lib/format";
import { useCareer } from "../state/career";
import { TeamLogo } from "./Media";
import classes from "./SwissStage.module.css";

interface Cell {
  wins: number;
  losses: number;
  size: number;
  decided: "through" | "out" | null;
}

/** Every record a Swiss stage passes through, one column per number of games played. Each pool
 * splits in two every round until a team has `wins` wins or as many defeats. */
function layout(teams: number, wins: number): Cell[][] {
  const columns: Cell[][] = [];
  let pools: Cell[] = [{ wins: 0, losses: 0, size: teams, decided: null }];
  while (pools.length) {
    columns.push(pools);
    const next = new Map<string, Cell>();
    const add = (w: number, l: number, size: number) => {
      const cell = next.get(`${w}-${l}`) ?? {
        wins: w,
        losses: l,
        size: 0,
        decided: w === wins ? "through" : l === wins ? "out" : null,
      };
      cell.size += size;
      next.set(`${w}-${l}`, cell);
    };
    for (const p of pools) {
      if (p.decided) continue;
      add(p.wins + 1, p.losses, Math.ceil(p.size / 2));
      add(p.wins, p.losses + 1, Math.floor(p.size / 2));
    }
    pools = [...next.values()].sort((a, b) => b.wins - a.wins);
  }
  return columns;
}

const inPool = (m: MatchSummary, c: Cell) => m.pool?.[0] === c.wins && m.pool?.[1] === c.losses;
const roundOf = (m: MatchSummary) => (m.pool ? m.pool[0] + m.pool[1] + 1 : 0);
const REVEAL_MS = 900;
const NEW_POOL_MS = 1800;

/**
 * The Swiss stage the way broadcasts draw it: a column per round, a pool per record, and the teams
 * that reach three wins or three defeats leaving at the top and the bottom. With `draw` set, that
 * round's pairings come out of the pots one team at a time.
 */
export function SwissStage({
  stage,
  draw,
  onWatch,
  onDrawDone,
}: {
  stage: StageView;
  draw: number | null;
  onWatch: (round: number) => void;
  onDrawDone: () => void;
}) {
  const wins = stage.swiss_wins ?? 3;
  const records = stage.tables[0]?.rows ?? [];
  const columns = layout(records.length, wins);
  const order = useMemo(() => (draw ? stage.matches.filter((m) => roundOf(m) === draw) : []), [stage.matches, draw]);
  const steps = order.length * 2;
  const [shown, setShown] = useState(steps);

  useEffect(() => setShown(0), [draw, stage.id]);
  useEffect(() => {
    if (!draw || shown >= steps) return;
    const startsPool = shown % 2 === 0 && shown > 0 && !samePool(order[shown / 2], order[shown / 2 - 1]);
    const timer = setTimeout(() => setShown((s) => s + 1), shown === 0 || startsPool ? NEW_POOL_MS : REVEAL_MS);
    return () => clearTimeout(timer);
  }, [draw, shown, steps, order]);

  const slot = new Map(order.map((m, i) => [m.id, i]));
  const revealed = (m: MatchSummary, side: 0 | 1) => {
    const i = slot.get(m.id);
    return i === undefined || 2 * i + side < shown;
  };
  const current = shown < steps ? order[Math.floor(shown / 2)] : undefined;
  const latest = Math.max(0, ...stage.matches.map(roundOf));
  const fresh = latest > 0 && !stage.matches.some((m) => roundOf(m) === latest && m.winner);

  return (
    <>
      {draw !== null && order.length > 0 && (
        <DrawPanel
          round={draw}
          order={order}
          pots={draw === 1 ? (stage.pots ?? []) : []}
          shown={shown}
          onSkip={() => setShown(steps)}
          onDone={onDrawDone}
        />
      )}
      <ScrollArea type="auto">
        <Group align="stretch" gap="md" p="md" wrap="nowrap">
          {columns.map((cells, played) => {
            const round = played + 1;
            const playing = cells.some((c) => !c.decided);
            const day = stage.matches.find((m) => roundOf(m) === round)?.day;
            return (
              <Stack key={played} gap="sm" className={classes.column}>
                <Group justify="space-between" gap={4} wrap="nowrap" className={classes.columnHead}>
                  <Text className="eyebrow">{playing ? `Round ${round}` : "Final records"}</Text>
                  {playing && day && (
                    <Text fz={10} c="dimmed">
                      {shortDate(day)}
                    </Text>
                  )}
                </Group>
                <Stack gap="sm" justify="center" style={{ flex: 1 }}>
                  {cells.map((c) =>
                    c.decided ? (
                      <Decided
                        key={`${c.wins}-${c.losses}`}
                        cell={c}
                        teams={records.filter((r) => r.wins === c.wins && r.losses === c.losses).map((r) => r.team)}
                      />
                    ) : (
                      <Pool
                        key={`${c.wins}-${c.losses}`}
                        cell={c}
                        matches={stage.matches.filter((m) => inPool(m, c))}
                        revealed={revealed}
                        drawing={draw === round && inPool(current ?? ({} as MatchSummary), c)}
                        animate={draw === round}
                      />
                    ),
                  )}
                </Stack>
                {fresh && round === latest && draw === null && (
                  <Button size="compact-xs" variant="subtle" leftSection={<IconArrowsShuffle size={12} />} onClick={() => onWatch(round)}>
                    Watch the draw
                  </Button>
                )}
              </Stack>
            );
          })}
        </Group>
      </ScrollArea>
    </>
  );
}

function samePool(a?: MatchSummary, b?: MatchSummary): boolean {
  return !!a && !!b && a.pool?.[0] === b.pool?.[0] && a.pool?.[1] === b.pool?.[1];
}

function Pool({
  cell,
  matches,
  revealed,
  drawing,
  animate,
}: {
  cell: Cell;
  matches: MatchSummary[];
  revealed: (m: MatchSummary, side: 0 | 1) => boolean;
  drawing: boolean;
  animate: boolean;
}) {
  const bo = matches[0]?.best_of;
  return (
    <Paper p={6} className={cx(classes.pool, drawing && classes.drawing)}>
      <Group justify="space-between" px={4} mb={4}>
        <Text fw={800} fz="sm">
          {cell.wins}-{cell.losses}
        </Text>
        {bo && (
          <Text fz={10} c="dimmed">
            Bo{bo}
          </Text>
        )}
      </Group>
      <Stack gap={4}>
        {matches.length
          ? matches.map((m) => <SwissTie key={m.id} m={m} show={[revealed(m, 0), revealed(m, 1)]} animate={animate} />)
          : Array.from({ length: Math.floor(cell.size / 2) }, (_, i) => <SwissTie key={i} m={null} show={[false, false]} />)}
      </Stack>
    </Paper>
  );
}

function SwissTie({ m, show, animate = false }: { m: MatchSummary | null; show: [boolean, boolean]; animate?: boolean }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const link = !!m?.games && show[0] && show[1];
  return (
    <div className={classes.tie} data-link={link || undefined} onClick={() => link && navigate(`/career/${career.id}/matches/${m!.id}`)}>
      <Side team={show[0] ? (m?.home ?? null) : null} score={m?.score[0] ?? 0} m={m} animate={animate} />
      <Side team={show[1] ? (m?.away ?? null) : null} score={m?.score[1] ?? 0} m={m} animate={animate} />
    </div>
  );
}

function Side({ team, score, m, animate }: { team: TeamRef | null; score: number; m: MatchSummary | null; animate: boolean }) {
  const { career } = useCareer();
  const done = !!m?.winner && !!team;
  const won = done && m!.winner === team!.id;
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      gap={6}
      className={cx(classes.side, done && !won && classes.lost, team?.id === career.team.id && classes.mine, team && animate && classes.reveal)}
    >
      <Group gap={6} wrap="nowrap" miw={0}>
        <TeamLogo team={team} size={20} />
        <Text fz="sm" fw={won ? 800 : 500} truncate>
          {team?.tag ?? "TBD"}
        </Text>
      </Group>
      {done && (
        <Text fz="sm" fw={800}>
          {score}
        </Text>
      )}
    </Group>
  );
}

function Decided({ cell, teams }: { cell: Cell; teams: TeamRef[] }) {
  const { career } = useCareer();
  const through = cell.decided === "through";
  return (
    <Paper p={6} className={cx(classes.decided, through ? classes.through : classes.out)}>
      <Group justify="space-between" px={4} mb={4}>
        <Text fw={800} fz="sm">
          {cell.wins}-{cell.losses}
        </Text>
        <Badge size="xs" variant="light" color={through ? "teal" : "red"}>
          {through ? "Through" : "Out"}
        </Badge>
      </Group>
      <Stack gap={2}>
        {Array.from({ length: cell.size }, (_, i) => teams[i] ?? null).map((t, i) => (
          <Group key={t?.id ?? i} gap={6} wrap="nowrap" className={cx(classes.side, t?.id === career.team.id && classes.mine)}>
            <TeamLogo team={t} size={20} />
            <Text fz="sm" c={t ? undefined : "dimmed"} truncate>
              {t?.tag ?? "TBD"}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

/** The draw itself: the pot being drawn from, and the pairing that just came out of it. The first
 * round of a stage with seeding pots draws pot 1 against the last pot, pot 2 against the one before. */
function DrawPanel({
  round,
  order,
  pots,
  shown,
  onSkip,
  onDone,
}: {
  round: number;
  order: MatchSummary[];
  pots: TeamRef[][];
  shown: number;
  onSkip: () => void;
  onDone: () => void;
}) {
  const done = shown >= order.length * 2;
  const next = order[Math.min(Math.floor(shown / 2), order.length - 1)];
  const last = shown > 0 ? order[Math.floor((shown - 1) / 2)] : null;
  const lastShown = last ? (shown - 1) % 2 === 1 : false;
  const potOf = new Map(pots.flatMap((pot, i) => pot.map((t) => [t.id, i + 1] as const)));
  const potsOf = (m: MatchSummary) => `Pot ${potOf.get(m.home?.id ?? "")} v Pot ${potOf.get(m.away?.id ?? "")}`;
  if (pots.length) {
    const from = done ? null : potOf.get((shown % 2 === 0 ? next.home : next.away)?.id ?? "");
    const drawn = done ? new Set<string>() : drawnBy(order, shown);
    return (
      <Paper p="md" m="md" mb={0} className={classes.drawPanel}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Text className="eyebrow">Swiss round {round} draw</Text>
            <Text fw={800} fz="xl">
              {done ? "The draw is complete" : `${potsOf(next).replace(" v ", " against ")} · Bo${next.best_of}`}
            </Text>
            <Text fz="xs" c="dimmed">
              Pot 1 meets pot {pots.length}, pot 2 meets pot {pots.length - 1}, and teams from the same region are kept apart.
            </Text>
          </Stack>
          <DrawButton done={done} onSkip={onSkip} onDone={onDone} />
        </Group>
        <Group gap="xl" mt="md" wrap="wrap" align="center">
          <Group gap="sm" wrap="wrap" align="stretch">
            {pots.map((pot, i) => (
              <Stack key={i} gap={6} className={cx(classes.potBox, from === i + 1 && classes.potActive)}>
                <Text className="eyebrow">Pot {i + 1}</Text>
                <Group gap={6} wrap="nowrap">
                  {pot.map((t) => (
                    <div key={t.id} className={cx(drawn.has(t.id) && classes.potDrawn)}>
                      <TeamLogo team={t} size={30} />
                    </div>
                  ))}
                </Group>
              </Stack>
            ))}
          </Group>
          {last && !done && (
            <Stack gap={4} align="center">
              <Text className="eyebrow">{potsOf(last)}</Text>
              <Group gap="md" wrap="nowrap">
                <DrawnTeam key={last.home?.id} team={last.home} />
                <Text fw={800} c="dimmed">
                  vs
                </Text>
                <DrawnTeam key={lastShown ? last.away?.id : "tbd"} team={lastShown ? last.away : null} />
              </Group>
            </Stack>
          )}
        </Group>
      </Paper>
    );
  }
  const pot = done
    ? []
    : order
        .flatMap((m, i) => [
          { team: m.home, slot: 2 * i },
          { team: m.away, slot: 2 * i + 1 },
        ])
        .filter((x) => x.slot >= shown && samePool(order[Math.floor(x.slot / 2)], next))
        .map((x) => x.team)
        .filter((t): t is TeamRef => !!t)
        .sort((a, b) => a.tag.localeCompare(b.tag));
  const pool = done ? null : next.pool;

  return (
    <Paper p="md" m="md" mb={0} className={classes.drawPanel}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Stack gap={2}>
          <Text className="eyebrow">Swiss round {round} draw</Text>
          <Text fw={800} fz="xl">
            {done ? "The draw is complete" : `The ${pool![0]}-${pool![1]} pool · Bo${next.best_of}`}
          </Text>
          <Text fz="xs" c="dimmed">
            {round === 1 ? "Teams from the same region are kept apart." : "Teams with the same record meet, and nobody plays the same team twice."}
          </Text>
        </Stack>
        <DrawButton done={done} onSkip={onSkip} onDone={onDone} />
      </Group>
      {!done && (
        <Group gap="xl" mt="md" wrap="wrap" align="center">
          <Stack gap={6}>
            <Text className="eyebrow">In the pot</Text>
            <Group gap={8} className={classes.pot}>
              {pot.map((t) => (
                <TeamLogo key={t.id} team={t} size={34} />
              ))}
            </Group>
          </Stack>
          {last && (
            <Stack gap={4} align="center">
              <Text className="eyebrow">
                {last.pool![0]}-{last.pool![1]}
              </Text>
              <Group gap="md" wrap="nowrap">
                <DrawnTeam key={last.home?.id} team={last.home} />
                <Text fw={800} c="dimmed">
                  vs
                </Text>
                <DrawnTeam key={lastShown ? last.away?.id : "tbd"} team={lastShown ? last.away : null} />
              </Group>
            </Stack>
          )}
        </Group>
      )}
    </Paper>
  );
}

/** Teams already out of the pots. */
function drawnBy(order: MatchSummary[], shown: number): Set<string> {
  return new Set(
    order.flatMap((m, i) => [2 * i < shown ? m.home?.id : undefined, 2 * i + 1 < shown ? m.away?.id : undefined]).filter((id): id is string => !!id),
  );
}

function DrawButton({ done, onSkip, onDone }: { done: boolean; onSkip: () => void; onDone: () => void }) {
  return done ? (
    <Button size="xs" onClick={onDone}>
      Close
    </Button>
  ) : (
    <Button size="xs" variant="default" leftSection={<IconPlayerTrackNext size={14} />} onClick={onSkip}>
      Skip the draw
    </Button>
  );
}

function DrawnTeam({ team }: { team: TeamRef | null }) {
  return (
    <Stack gap={4} align="center" w={90} className={team ? classes.reveal : undefined}>
      <TeamLogo team={team} size={48} />
      <Text fw={800} fz="sm">
        {team?.tag ?? "?"}
      </Text>
    </Stack>
  );
}
