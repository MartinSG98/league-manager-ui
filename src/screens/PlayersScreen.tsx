import { Group, ScrollArea, SegmentedControl, Select, Stack, Switch, Table, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Role } from "../api/types";
import { ChampIcon, LeagueLogo, PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { ShortlistButton } from "../components/ShortlistButton";
import { Loading, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { cx, flag, money, ROLES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";

export function PlayersScreen() {
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [region, setRegion] = useState<string | null>(career.region);
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [freeAgents, setFreeAgents] = useState(false);
  const [query, setQuery] = useState("");
  const players = useApi(
    () => api.players(career.id, { region: region ?? undefined, role: role === "ALL" ? undefined : role, freeAgents, limit: 400 }),
    [career.id, revision, region, role, freeAgents],
  );
  const teamOf = (id: string | null) => (id ? catalog.teams.find((t) => t.id === id) ?? null : null);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (players.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || (p.real_name ?? "").toLowerCase().includes(q));
  }, [players.data, query]);

  return (
    <Screen>
      <PageHeader eyebrow="Scouting" title="Players" />
      <Section pad={false}>
        <Group gap="sm" p="sm" style={{ borderBottom: "1px solid var(--line)" }}>
          <Select
            placeholder="Every region"
            clearable
            value={region}
            onChange={setRegion}
            data={catalog.regions.map((r) => ({ value: r.id, label: r.name }))}
            w={240}
          />
          <SegmentedControl
            value={role}
            onChange={(v) => setRole(v as Role | "ALL")}
            data={[{ value: "ALL", label: "All" }, ...ROLES.map((r) => ({ value: r, label: <RoleIcon role={r} size={14} /> }))]}
          />
          <TextInput placeholder="Search" leftSection={<IconSearch size={14} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
          <Switch label="Free agents only" checked={freeAgents} onChange={(e) => setFreeAgents(e.currentTarget.checked)} />
        </Group>
        {!players.data ? (
          <Loading />
        ) : (
          <ScrollArea h="calc(100vh - 260px)">
            <Table stickyHeader verticalSpacing={5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40} />
                  <Table.Th w={36} />
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Team</Table.Th>
                  <Table.Th>2026</Table.Th>
                  <Table.Th className="num">OVR</Table.Th>
                  <Table.Th className="num">POT</Table.Th>
                  <Table.Th className="num">Salary</Table.Th>
                  <Table.Th>Signatures</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((p) => {
                  const team = teamOf(p.team);
                  const league = catalog.league[p.league];
                  return (
                    <Table.Tr key={p.id} className={cx(p.team === career.team.id && "mine")} style={{ cursor: "pointer" }} onClick={() => navigate(`/career/${career.id}/player/${p.id}`)}>
                      <Table.Td>{p.team !== career.team.id && <ShortlistButton player={p.id} compact />}</Table.Td>
                      <Table.Td>
                        <RoleIcon role={p.role} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <PlayerPhoto photo={p.photo} name={p.name} size={34} />
                          <Stack gap={0}>
                            <Text fw={700} fz="sm">
                              {p.name}
                            </Text>
                            <Text fz={11} c="dimmed">
                              {flag(p.country)} {p.real_name ?? p.country ?? ""}
                            </Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {team ? (
                          <Group gap={6} wrap="nowrap">
                            <TeamLogo team={team} size={22} />
                            <Text fz="sm">{team.tag}</Text>
                          </Group>
                        ) : (
                          <Text fz="sm" c="hextech.4">
                            free agent
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          {p.origin && <TeamLogo team={{ tag: p.origin.tag, color: "#3b4661", logo: p.origin.logo }} size={20} />}
                          <LeagueLogo logo={league?.logo} name={p.league} size={18} />
                        </Group>
                      </Table.Td>
                      <Table.Td className="num">
                        <Ovr value={p.overall} />
                      </Table.Td>
                      <Table.Td className="num" c="dimmed">
                        {p.potential}
                      </Table.Td>
                      <Table.Td className="num" fz="sm">
                        {money(p.salary)}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={3} wrap="nowrap">
                          {p.signatures.map((c) => (
                            <ChampIcon key={c} id={c} size={24} />
                          ))}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Section>
    </Screen>
  );
}
