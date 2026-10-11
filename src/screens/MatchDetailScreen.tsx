import { Grid, Group, Paper, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client";
import type { MatchView, TeamRef } from "../api/types";
import { GameReport } from "../components/GameReport";
import { GoldGraph } from "../components/GoldGraph";
import { MatchCard } from "../components/MatchCard";
import { Loading, PageHeader, Screen, Section } from "../components/Ui";
import { clock } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function MatchDetailScreen() {
  const { match } = useParams();
  const { career, revision } = useCareer();
  const view = useApi(() => api.match(career.id, match!), [career.id, match, revision]);
  if (!view.data) return <Loading />;
  return (
    <Screen>
      <SeriesReport match={view.data} />
    </Screen>
  );
}

export function teamsOf(match: MatchView): Record<string, TeamRef | null> {
  const out: Record<string, TeamRef | null> = {};
  if (match.home) out[match.home.id] = match.home;
  if (match.away) out[match.away.id] = match.away;
  return out;
}

export function SeriesReport({ match }: { match: MatchView }) {
  const { career } = useCareer();
  const [number, setNumber] = useState(String(match.game_list.length));
  const game = match.game_list.find((g) => String(g.number) === number) ?? match.game_list[match.game_list.length - 1];
  const detail = useApi(
    () => (game?.detailed ? api.game(career.id, match.id, game.number) : Promise.resolve(null)),
    [career.id, match.id, game?.number],
  );

  return (
    <Stack gap="lg">
      <PageHeader eyebrow={match.competition_name} title="Series report" />
      <Paper p="lg">
        <MatchCard match={match} mine={career.team.id} size={84} />
      </Paper>
      {match.game_list.length > 1 && (
        <Tabs value={number} onChange={(v) => v && setNumber(v)}>
          <Tabs.List>
            {match.game_list.map((g) => (
              <Tabs.Tab key={g.number} value={String(g.number)}>
                Game {g.number}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}
      {game && (
        <Paper p="lg">
          <GameReport game={game} teams={teamsOf(match)} />
        </Paper>
      )}
      {detail.data?.timeline && (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Section title="Gold difference">
              <GoldGraph gold={detail.data.timeline.gold} height={180} />
            </Section>
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Section title="Timeline" pad={false}>
              <ScrollArea h={240}>
                {detail.data.timeline.events
                  .filter((e) => e.kind !== "kill")
                  .map((e, i) => (
                    <Group key={i} gap="sm" px="md" py={4} wrap="nowrap">
                      <Text fz="xs" c="dimmed" w={42}>
                        {clock(e.t)}
                      </Text>
                      <Text fz="sm" className={e.side ? `side-${e.side}` : undefined}>
                        {e.text}
                      </Text>
                    </Group>
                  ))}
              </ScrollArea>
            </Section>
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}
