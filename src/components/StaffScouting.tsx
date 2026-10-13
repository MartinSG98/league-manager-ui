import { Badge, Group, ScrollArea, Select, Stack, Switch, Table, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { StaffKind } from "../api/types";
import { cx, flag, money } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { PlayerPhoto, TeamLogo } from "./Media";
import { StaffAttributes } from "./Staff";
import { Loading, Ovr } from "./Ui";

/** Coaches or analysts for the Scouting screen, best first; a row opens their page. */
export function StaffScouting({ kind }: { kind: StaffKind }) {
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [region, setRegion] = useState<string | null>(career.region);
  const [freeOnly, setFreeOnly] = useState(false);
  const [query, setQuery] = useState("");
  const staff = useApi(
    () => api.staff(career.id, { kind, region: region ?? undefined, freeOnly, limit: 400 }),
    [career.id, revision, kind, region, freeOnly],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (staff.data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || (s.real_name ?? "").toLowerCase().includes(q));
  }, [staff.data, query]);

  return (
    <>
      <Group gap="sm" p="sm" style={{ borderBottom: "1px solid var(--line)" }}>
        <Select
          placeholder="Every region"
          clearable
          value={region}
          onChange={setRegion}
          data={catalog.regions.map((r) => ({ value: r.id, label: r.name }))}
          w={240}
        />
        <TextInput placeholder="Search" leftSection={<IconSearch size={14} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <Switch label="Free agents only" checked={freeOnly} onChange={(e) => setFreeOnly(e.currentTarget.checked)} />
      </Group>
      {!staff.data ? (
        <Loading />
      ) : (
        <ScrollArea h="calc(100vh - 260px)">
          <Table stickyHeader verticalSpacing={5}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{kind === "coach" ? "Coach" : "Analyst"}</Table.Th>
                <Table.Th>Club</Table.Th>
                <Table.Th className="num">OVR</Table.Th>
                <Table.Th>Attributes</Table.Th>
                <Table.Th className="num">Salary</Table.Th>
                <Table.Th className="num">Contract</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((s) => (
                <Table.Tr
                  key={s.id}
                  className={cx(s.mine && "mine")}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/career/${career.id}/staff/${s.id}`)}
                >
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <PlayerPhoto photo={s.photo} name={s.name} size={34} />
                      <Stack gap={0}>
                        <Text fw={700} fz="sm">
                          {s.name}
                        </Text>
                        <Text fz="xs" c="dimmed">
                          {flag(s.country)} {s.position}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {s.club ? (
                      <Group gap={6} wrap="nowrap">
                        <TeamLogo team={s.club} size={20} />
                        <Text fz="sm">{s.club.tag}</Text>
                      </Group>
                    ) : (
                      <Badge size="xs" variant="light" color="teal">
                        free
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td className="num">
                    <Ovr value={s.overall} />
                  </Table.Td>
                  <Table.Td>
                    <StaffAttributes person={s} />
                  </Table.Td>
                  <Table.Td className="num">{money(s.salary)}</Table.Td>
                  <Table.Td className="num">
                    <Text fz="sm" c="dimmed">
                      {s.contract_until ?? "—"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </>
  );
}
