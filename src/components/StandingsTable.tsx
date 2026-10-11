import { Table, Text } from "@mantine/core";

import type { StageView } from "../api/types";
import { cx } from "../lib/format";
import { TeamName } from "./Media";
import { Empty } from "./Ui";

/** Round robin or Swiss tables of a stage, with a line under the last team that advances. */
export function StandingsTable({ stage, mine, careerId, compact = false }: { stage: StageView; mine: string; careerId: string; compact?: boolean }) {
  if (stage.tables.length === 0) return <Empty>This stage is a bracket.</Empty>;
  const perGroup = stage.tables.length > 1 ? stage.advance / stage.tables.length : stage.advance;
  return (
    <>
      {stage.tables.map((table, ti) => (
        <div key={ti}>
          {table.name && (
            <Text className="eyebrow" px="md" pt="sm">
              {table.name}
            </Text>
          )}
          <Table verticalSpacing={compact ? 4 : 7}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={32}>#</Table.Th>
                <Table.Th>Team</Table.Th>
                <Table.Th className="num">W</Table.Th>
                <Table.Th className="num">L</Table.Th>
                {stage.kind !== "swiss" && !compact && <Table.Th className="num">Games</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {table.rows.map((row, i) => (
                <Table.Tr
                  key={row.team.id}
                  className={cx(row.team.id === mine && "mine")}
                  style={i + 1 === perGroup ? { boxShadow: "inset 0 -2px 0 #6a5223" } : undefined}
                >
                  <Table.Td c="dimmed">{i + 1}</Table.Td>
                  <Table.Td>
                    <TeamName team={row.team} size={compact ? 20 : 26} careerId={careerId} short={compact} />
                  </Table.Td>
                  <Table.Td className="num" fw={700}>
                    {row.wins}
                  </Table.Td>
                  <Table.Td className="num">{row.losses}</Table.Td>
                  {stage.kind !== "swiss" && !compact && (
                    <Table.Td className="num" c="dimmed">
                      {row.game_wins}-{row.game_losses}
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ))}
    </>
  );
}
