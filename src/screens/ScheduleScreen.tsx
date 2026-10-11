import { Badge, Button, Group, Table, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { LeagueLogo, TeamName } from "../components/Media";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { cx, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

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

  return (
    <Screen>
      <PageHeader eyebrow={`${wins}-${played.length - wins} in series this season`} title="Schedule" />
      <Section pad={false}>
        <Table verticalSpacing={7}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Competition</Table.Th>
              <Table.Th>Round</Table.Th>
              <Table.Th>Opponent</Table.Th>
              <Table.Th className="num">Result</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {schedule.data.map((m) => {
              const home = m.home?.id === me;
              const opponent = home ? m.away : m.home;
              const [us, them] = home ? m.score : [m.score[1], m.score[0]];
              const won = m.winner === me;
              return (
                <Table.Tr key={m.id} className={cx(m.id === career.live?.match && "mine")}>
                  <Table.Td fz="sm">{shortDate(m.day)}</Table.Td>
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <LeagueLogo logo={m.competition_logo} name={m.competition_name} size={20} />
                      <Text fz="sm" c="dimmed">
                        {m.competition_name}
                      </Text>
                    </Group>
                  </Table.Td>
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
            })}
          </Table.Tbody>
        </Table>
      </Section>
    </Screen>
  );
}
