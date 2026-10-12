import { Badge, Box, Grid, Group, Paper, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import type { MatchSummary, StageView, TeamRef } from "../api/types";
import { LeagueLogo, TeamLogo } from "../components/Media";
import { StandingsTable } from "../components/StandingsTable";
import { SwissStage } from "../components/SwissStage";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { cx, money, ordinal, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./CompetitionScreen.module.css";

export function CompetitionScreen() {
  const { comp } = useParams();
  const { career, revision } = useCareer();
  const view = useApi(() => api.competition(career.id, comp!), [career.id, comp, revision]);
  const [stageId, setStageId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const draw = Number(params.get("draw")) || null;
  if (!view.data) return <Loading />;
  const c = view.data;
  const swiss = c.stages.find((s) => s.kind === "swiss");
  const stage = (draw && swiss) || c.stages.find((s) => s.id === stageId) || c.stages[c.stages.length - 1];

  return (
    <Screen>
      <PageHeader
        icon={<LeagueLogo logo={c.logo} name={c.short} size={64} />}
        eyebrow={`${shortDate(c.start)} – ${shortDate(c.end)} · prize pool ${money(c.prize_pool)}`}
        title={c.name}
      />

      {c.placements.length > 0 && (
        <Group gap="md" mb="lg" wrap="wrap">
          {c.placements.slice(0, 4).map((t, i) => (
            <Paper key={t.id} p="md" className={cx(classes.place, i === 0 && classes.champion)}>
              <Group gap="sm" wrap="nowrap">
                {i === 0 && <IconTrophy size={22} color="var(--gold)" />}
                <TeamLogo team={t} size={i === 0 ? 52 : 36} />
                <Stack gap={0}>
                  <Text className="eyebrow">{i === 0 ? "Champion" : ordinal(i + 1)}</Text>
                  <Text fw={800} fz={i === 0 ? "lg" : "sm"}>
                    {t.name}
                  </Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Group>
      )}

      <Tabs
        value={stage.id}
        onChange={(id) => {
          setStageId(id);
          if (draw) setParams({}, { replace: true });
        }}
        mb="md"
      >
        <Tabs.List>
          {c.stages.map((s) => (
            <Tabs.Tab key={s.id} value={s.id} rightSection={s.finished ? undefined : <Badge size="xs" color="hextech">live</Badge>}>
              {s.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {stage.kind === "swiss" ? (
        <Section
          title={stage.name}
          right={
            <Text fz="xs" c="dimmed">
              {stage.swiss_wins} wins go through, {stage.swiss_wins} defeats go out · Bo3 when a team can go through or out
            </Text>
          }
          pad={false}
        >
          <SwissStage
            stage={stage}
            draw={draw}
            onWatch={(round) => setParams({ draw: String(round) }, { replace: true })}
            onDrawDone={() => setParams({}, { replace: true })}
          />
        </Section>
      ) : (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, xl: 8 }}>
            <Section title={stage.name} right={<Text fz="xs" c="dimmed">Bo{stage.best_of}{stage.advance ? ` · top ${stage.advance} advance` : ""}</Text>} pad={false}>
              {stage.kind === "single_elim" ? (
                <Bracket stage={stage} />
              ) : stage.kind === "double_elim" ? (
                <DoubleBracket stage={stage} />
              ) : (
                <StandingsTable stage={stage} mine={career.team.id} careerId={career.id} />
              )}
            </Section>
          </Grid.Col>
          <Grid.Col span={{ base: 12, xl: 4 }}>
            <Section title="Results" pad={false}>
              <ResultsList matches={stage.matches} />
            </Section>
          </Grid.Col>
        </Grid>
      )}
    </Screen>
  );
}

/** Consecutive matches with the same label make a column. */
function columns(matches: MatchSummary[]): { label: string; matches: MatchSummary[] }[] {
  const rounds: { label: string; matches: MatchSummary[] }[] = [];
  for (const m of matches) {
    const last = rounds[rounds.length - 1];
    if (last && last.label === m.label) last.matches.push(m);
    else rounds.push({ label: m.label, matches: [m] });
  }
  return rounds;
}

function Bracket({ stage }: { stage: StageView }) {
  return (
    <ScrollArea type="auto">
      <BracketRow rounds={columns(stage.matches)} />
    </ScrollArea>
  );
}

/** Upper bracket on top with the grand final at its end, lower bracket underneath. */
function DoubleBracket({ stage }: { stage: StageView }) {
  const byRound = (m: MatchSummary[]) => [...m].sort((a, b) => a.round - b.round);
  const upper = columns(byRound(stage.matches.filter((m) => m.bracket === "upper")));
  const final = stage.matches.filter((m) => m.bracket === "final");
  const lower = columns(byRound(stage.matches.filter((m) => m.bracket === "lower")));
  return (
    <ScrollArea type="auto">
      <Text className="eyebrow" px="md" pt="md">
        Upper bracket
      </Text>
      <BracketRow rounds={[...upper, ...(final.length ? [{ label: "Grand final", matches: final }] : [])]} />
      <Text className="eyebrow" px="md" pt="xs">
        Lower bracket · one more defeat and you are out
      </Text>
      <BracketRow rounds={lower} />
    </ScrollArea>
  );
}

function BracketRow({ rounds }: { rounds: { label: string; matches: MatchSummary[] }[] }) {
  return (
    <Group align="stretch" gap="lg" p="md" wrap="nowrap">
      {rounds.map((r, i) => (
        <Stack key={i} justify="space-around" gap="md" miw={230}>
          <Text className="eyebrow">{r.label}</Text>
          {r.matches.map((m) => (
            <Tie key={m.id} m={m} />
          ))}
        </Stack>
      ))}
    </Group>
  );
}

function Tie({ m }: { m: MatchSummary }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  return (
    <Paper
      p="xs"
      className={classes.tie}
      data-link={m.games ? true : undefined}
      onClick={() => m.games && navigate(`/career/${career.id}/matches/${m.id}`)}
    >
      <TieSide team={m.home} score={m.score[0]} won={m.winner === m.home?.id} done={!!m.winner} mine={m.home?.id === career.team.id} />
      <TieSide team={m.away} score={m.score[1]} won={m.winner === m.away?.id} done={!!m.winner} mine={m.away?.id === career.team.id} />
      <Text fz={10} c="dimmed" mt={4}>
        {shortDate(m.day)} · Bo{m.best_of}
      </Text>
    </Paper>
  );
}

function TieSide({ team, score, won, done, mine }: { team: TeamRef | null; score: number; won: boolean; done: boolean; mine: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap" className={cx(classes.tieSide, done && !won && classes.out, mine && classes.mineSide)}>
      <Group gap={8} wrap="nowrap" miw={0}>
        <TeamLogo team={team} size={24} />
        <Text fz="sm" fw={won ? 800 : 500} truncate>
          {team?.name ?? "TBD"}
        </Text>
      </Group>
      <Text fw={800} className="display" fz="lg">
        {done || score ? score : ""}
      </Text>
    </Group>
  );
}

function ResultsList({ matches }: { matches: MatchSummary[] }) {
  const { career } = useCareer();
  const played = matches.filter((m) => m.winner).reverse();
  const next = matches.filter((m) => !m.winner).slice(0, 8);
  if (matches.length === 0) return <Empty>No matches yet.</Empty>;
  return (
    <Box>
      {next.length > 0 && <Text className="eyebrow" px="md" pt="sm">Upcoming</Text>}
      {next.map((m) => (
        <ResultRow key={m.id} m={m} careerId={career.id} />
      ))}
      {played.length > 0 && <Text className="eyebrow" px="md" pt="sm">Played</Text>}
      {played.slice(0, 30).map((m) => (
        <ResultRow key={m.id} m={m} careerId={career.id} />
      ))}
    </Box>
  );
}

function ResultRow({ m, careerId }: { m: MatchSummary; careerId: string }) {
  const body = (
    <Group gap="xs" px="md" py={6} wrap="nowrap" className={classes.resultRow}>
      <Text fz="xs" c="dimmed" w={48}>
        {shortDate(m.day)}
      </Text>
      <Group gap={6} wrap="nowrap" justify="flex-end" style={{ flex: 1 }}>
        <Text fz="sm" fw={m.winner === m.home?.id ? 800 : 400}>
          {m.home?.tag ?? "TBD"}
        </Text>
        <TeamLogo team={m.home} size={22} />
      </Group>
      <Text fw={800} w={40} ta="center" fz="sm">
        {m.winner ? `${m.score[0]}-${m.score[1]}` : "vs"}
      </Text>
      <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
        <TeamLogo team={m.away} size={22} />
        <Text fz="sm" fw={m.winner === m.away?.id ? 800 : 400}>
          {m.away?.tag ?? "TBD"}
        </Text>
      </Group>
    </Group>
  );
  return m.games ? (
    <Link to={`/career/${careerId}/matches/${m.id}`} className="link" style={{ display: "block" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
