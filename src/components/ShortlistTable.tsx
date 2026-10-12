import { Badge, Button, Group, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { money, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { PlayerPhoto, RoleIcon, TeamLogo } from "./Media";
import { GradeBadge, INTEREST_COLOR } from "./PlayerReport";
import { ShortlistButton } from "./ShortlistButton";
import { Empty, Loading, Ovr } from "./Ui";

/** The players on the shortlist with the analyst's latest verdict on each. */
export function ShortlistTable() {
  const { career, revision, act, busy } = useCareer();
  const { team: teams } = useCatalog();
  const navigate = useNavigate();
  const rows = useApi(() => api.shortlist(career.id), [career.id, revision]);
  if (!rows.data) return <Loading />;
  if (rows.data.length === 0) {
    return <Empty>Nobody yet. Star a player under Scouting or on their page and the analyst goes to watch them.</Empty>;
  }
  return (
    <ScrollArea type="auto">
      <Table verticalSpacing={6} highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40} />
            <Table.Th>Player</Table.Th>
            <Table.Th>Team</Table.Th>
            <Table.Th className="num">OVR</Table.Th>
            <Table.Th className="num">Potential</Table.Th>
            <Table.Th>Grade</Table.Th>
            <Table.Th>Would come?</Table.Th>
            <Table.Th className="num">Value</Table.Th>
            <Table.Th className="num">Asking</Table.Th>
            <Table.Th>Contract</Table.Th>
            <Table.Th>Report</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.data.map((p) => {
            const report = p.shortlist.report;
            const team = p.team ? teams[p.team] : null;
            return (
              <Table.Tr key={p.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/career/${career.id}/player/${p.id}`)}>
                <Table.Td>
                  <ShortlistButton player={p.id} compact />
                </Table.Td>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <RoleIcon role={p.role} size={16} />
                    <PlayerPhoto photo={p.photo} name={p.name} size={30} />
                    <Text fw={700} fz="sm">
                      {p.name}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {team ? (
                    <Group gap={6} wrap="nowrap">
                      <TeamLogo team={team} size={20} />
                      <Text fz="sm">{team.tag}</Text>
                    </Group>
                  ) : (
                    <Text fz="sm" c="hextech.4">
                      free agent
                    </Text>
                  )}
                </Table.Td>
                <Table.Td className="num">
                  <Ovr value={p.overall} size="sm" />
                </Table.Td>
                <Table.Td className="num" fz="sm">
                  {report ? (report.peaked ? "peaked" : `${report.potential[0]}–${report.potential[1]}`) : <Text span c="dimmed">?</Text>}
                </Table.Td>
                <Table.Td>{report ? <GradeBadge grade={report.grade} size="sm" /> : <Text c="dimmed">–</Text>}</Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={INTEREST_COLOR[p.interest]}>
                    {p.interest}
                  </Badge>
                </Table.Td>
                <Table.Td className="num" fz="sm">
                  {money(p.value)}
                </Table.Td>
                <Table.Td className="num" fz="sm">
                  {p.asking !== null ? money(p.asking) : <Text span c="dimmed">{p.team ? "not for sale" : "free"}</Text>}
                </Table.Td>
                <Table.Td fz="sm">{p.contract_until ?? "–"}</Table.Td>
                <Table.Td>
                  {p.shortlist.due ? (
                    <Text fz="xs" c="dimmed">
                      due {shortDate(p.shortlist.due)}
                    </Text>
                  ) : (
                    <Stack gap={2} align="flex-start">
                      {report && (
                        <Text fz="xs" c="dimmed">
                          #{report.number} · {shortDate(report.day)}
                        </Text>
                      )}
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          act({ type: "scout_player", player: p.id });
                        }}
                      >
                        New report
                      </Button>
                    </Stack>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
