import { Badge, Button, Group, Table, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { MatchSummary } from "../api/types";
import { LeagueLogo, TeamName } from "../components/Media";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { cx, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./Screens.module.css";

interface Block {
  competition: string;
  name: string;
  logo: string | null;
  matches: MatchSummary[];
}

/** Consecutive matches in the same competition, in the order they are played. */
function blocks(matches: MatchSummary[]): Block[] {
  const out: Block[] = [];
  for (const m of matches) {
    const last = out[out.length - 1];
    if (last && last.competition === m.competition) last.matches.push(m);
    else out.push({ competition: m.competition, name: m.competition_name, logo: m.competition_logo, matches: [m] });
  }
  return out;
}

export function ScheduleScreen() {
  const { career, revision } = useCareer();
  const schedule = useApi(() => api.schedule(career.id), [career.id, revision]);
  if (career.phase === "draft") {
    return (
      <Screen>
        <Empty>The schedule is made once the draft is done.</Empty>
      </Screen>
    );
  }
  if (!schedule.data) return <Loading />;
  const me = career.team.id;
  const played = schedule.data.filter((m) => m.winner);
  const wins = played.filter((m) => m.winner === me).length;
  const next = schedule.data.find((m) => !m.winner);

  return (
    <Screen>
      <PageHeader eyebrow={`${wins}-${played.length - wins} in series this season`} title="Schedule" />
      <Section pad={false}>
        <Table verticalSpacing={7}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={110}>Date</Table.Th>
              <Table.Th>Round</Table.Th>
              <Table.Th>Opponent</Table.Th>
              <Table.Th className="num">Result</Table.Th>
              <Table.Th w={110} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {blocks(schedule.data).map((b) => {
              const done = b.matches.filter((m) => m.winner);
              const won = done.filter((m) => m.winner === me).length;
              return [
                <Table.Tr key={`${b.competition}-${b.matches[0].id}`} className={classes.groupRow}>
                  <Table.Td colSpan={5}>
                    <Group gap="sm" wrap="nowrap">
                      <LeagueLogo logo={b.logo} name={b.name} size={22} />
                      <Link to={`/career/${career.id}/competitions/${b.competition}`} className="link">
                        <Text fw={800} fz="sm">
                          {b.name}
                        </Text>
                      </Link>
                      {done.length > 0 && (
                        <Text fz="xs" c="dimmed">
                          {won}-{done.length - won} in series
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>,
                ...b.matches.map((m) => <Row key={m.id} m={m} next={m.id === next?.id} />),
              ];
            })}
          </Table.Tbody>
        </Table>
      </Section>
    </Screen>
  );
}

function Row({ m, next }: { m: MatchSummary; next: boolean }) {
  const { career } = useCareer();
  const me = career.team.id;
  const home = m.home?.id === me;
  const opponent = home ? m.away : m.home;
  const [us, them] = home ? m.score : [m.score[1], m.score[0]];
  const won = m.winner === me;
  return (
    <Table.Tr className={cx((m.id === career.live?.match || next) && "mine")}>
      <Table.Td fz="sm">{shortDate(m.day)}</Table.Td>
      <Table.Td fz="sm" c="dimmed">
        {m.label}
      </Table.Td>
      <Table.Td>
        <TeamName team={opponent} size={26} careerId={career.id} />
      </Table.Td>
      <Table.Td className="num">
        {m.winner ? (
          <Badge color={won ? "teal" : "red"} variant="light" size="lg">
            {won ? "W" : "L"} {us}-{them}
          </Badge>
        ) : next ? (
          <Badge color="gold" variant="filled">
            next · Bo{m.best_of}
          </Badge>
        ) : (
          <Text fz="sm" c="dimmed">
            Bo{m.best_of}
          </Text>
        )}
      </Table.Td>
      <Table.Td className="num">
        {m.games > 0 && (
          <Button component={Link} to={`/career/${career.id}/matches/${m.id}`} variant="subtle" size="compact-sm">
            Report
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
