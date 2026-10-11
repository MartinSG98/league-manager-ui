import { Badge, Grid, Group, Paper, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { useState } from "react";

import { api } from "../api/client";
import type { Role } from "../api/types";
import { ChampIcon, RoleIcon } from "../components/Media";
import { Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { longDate, ROLES, signed } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const TIER_COLOR: Record<string, string> = { S: "#ff5a5f", A: "#f0a04a", B: "#f0c64a", C: "#a4d65e", D: "#626d85" };

export function MetaScreen() {
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const meta = useApi(() => api.meta(career.id), [career.id, revision]);
  const [role, setRole] = useState<Role>("MID");
  if (!meta.data) return <Loading />;
  const m = meta.data;
  const inRole = m.champions.filter((c) => c.roles.includes(role));

  return (
    <Screen>
      <PageHeader
        eyebrow={`Patch ${m.version}${m.next_patch ? ` · next patch ${longDate(m.next_patch)}` : ""}`}
        title="The meta"
        right={
          <SegmentedControl
            value={role}
            onChange={(v) => setRole(v as Role)}
            data={ROLES.map((r) => ({
              value: r,
              label: (
                <Group gap={6} wrap="nowrap">
                  <RoleIcon role={r} size={15} />
                  <span>{r}</span>
                </Group>
              ),
            }))}
          />
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="sm">
            {TIERS.map((tier) => {
              const champs = inRole.filter((c) => c.tier === tier);
              if (champs.length === 0) return null;
              return (
                <Paper key={tier} p="sm">
                  <Group align="flex-start" wrap="nowrap" gap="md">
                    <Text className="display" fz={44} lh={1} w={40} ta="center" style={{ color: TIER_COLOR[tier] }}>
                      {tier}
                    </Text>
                    <Group gap={8} style={{ flex: 1 }}>
                      {champs.map((c) => (
                        <Tooltip key={c.champion} label={`${c.name} · power ${signed(c.power, 1)} · ${c.picks} picks, ${c.bans} bans this patch`}>
                          <Stack gap={2} align="center" w={60}>
                            <ChampIcon id={c.champion} size={52} title="" />
                            <Text fz={10} c="dimmed" truncate maw={60}>
                              {c.name}
                            </Text>
                          </Stack>
                        </Tooltip>
                      ))}
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Section title="Patch notes" pad={false}>
            {m.history.length === 0 && <Empty>The first patch of the season lands on January 6th.</Empty>}
            {m.history.map((p) => (
              <Stack key={p.version} gap={6} p="md" style={{ borderBottom: "1px solid var(--line)" }}>
                <Text className="eyebrow">{longDate(p.day)}</Text>
                <Text fw={800}>{p.headline}</Text>
                {p.changes.map((c) => (
                  <Group key={c.champion} gap="sm" wrap="nowrap">
                    <ChampIcon id={c.champion} size={26} />
                    <Text fz="sm" style={{ flex: 1 }}>
                      {c.note}
                    </Text>
                    <Badge size="sm" variant="light" color={c.delta > 0 ? "teal" : "red"}>
                      {c.delta > 0 ? "buff" : "nerf"}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            ))}
            <Text fz="xs" c="dimmed" p="md">
              {m.games} pro games played on this patch. {catalog.champions.length} champions in the game.
            </Text>
          </Section>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}
