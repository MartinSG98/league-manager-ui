import { Badge, Box, Button, Grid, Group, Paper, Progress, ScrollArea, Select, SimpleGrid, Stack, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBarbell, IconCheck, IconPlayerStop, IconTarget } from "@tabler/icons-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Load, SetPlayInfo, TrainingPlayer, TrainingView } from "../api/types";
import { ChampIcon, PlayerPhoto, RoleIcon } from "../components/Media";
import { ReviewReport } from "../components/ReviewReport";
import { Empty, Loading, Meter, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { ATTRIBUTE_NAMES, attributeBand, cx, longDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import classes from "./TrainingScreen.module.css";

const BAND_COLOR = { elite: "#3ee08f", good: "#a4d65e", decent: "#f0c64a", weak: "#ff8a5c" } as const;
const TREND_COLOR: Record<string, string> = { Thriving: "teal", Developing: "lime", Slow: "orange", Stagnating: "red", "Burned out": "red" };
const STATUS_COLOR: Record<string, string> = { "Burned out": "red", Exhausted: "red", Tired: "orange", Complacent: "yellow", Sharp: "teal", Unsettled: "grape" };

export function TrainingScreen() {
  const { career, revision } = useCareer();
  const view = useApi(() => api.training(career.id), [career.id, revision]);
  if (!view.data) return <Loading text="Opening the scrim schedule…" />;
  return <Training view={view.data} />;
}

function Training({ view }: { view: TrainingView }) {
  const { career } = useCareer();
  return (
    <Screen>
      <PageHeader
        icon={<IconBarbell size={40} color="var(--gold-bright)" />}
        eyebrow={`Week of ${longDate(career.day)}`}
        title="Training"
        right={
          view.coach && (
            <Text fz="sm" c="dimmed">
              Assistant coach <b>{view.coach.name}</b> · teaching {view.coach.attributes.teaching} · development {view.coach.attributes.development}
            </Text>
          )
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, xl: 7 }}>
          <Stack gap="lg">
            <LoadPicker view={view} />
            <FocusPicker view={view} />
            <SetPlays view={view} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, xl: 5 }}>
          <Section title="Analyst review" right={view.review && <Text fz="xs" c="dimmed">{view.review.day}</Text>}>
            {view.review ? (
              <ReviewReport report={view.review} focus={view.focus} />
            ) : (
              <Empty>The analyst writes a review after every six games the team plays.</Empty>
            )}
          </Section>
        </Grid.Col>
        <Grid.Col span={12}>
          <PlayersTable view={view} />
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function LoadPicker({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  return (
    <Section title="Scrim load" right={<Text fz="xs" c="dimmed">{view.advice}</Text>}>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        {view.loads.map((l) => (
          <UnstyledButton
            key={l.id}
            className={cx(classes.option, view.load === l.id && classes.active)}
            disabled={busy}
            onClick={() => act({ type: "set_training", load: l.id as Load })}
          >
            <Stack gap={4}>
              <Group justify="space-between" wrap="wrap" gap={4}>
                <Text fw={800}>{l.name}</Text>
                {view.recommended === l.id && (
                  <Badge size="xs" color="gold" variant="light">
                    advised
                  </Badge>
                )}
              </Group>
              <Text fz="xs" c="dimmed" lh={1.35}>
                {l.text}
              </Text>
              <Stack gap={0} mt={4}>
                <Text fz="xs" className={l.fatigue > 0 ? "loss" : undefined}>
                  +{l.fatigue} fatigue a week
                </Text>
                <Text fz="xs" className={l.sharpness >= 0 ? "gain" : "loss"}>
                  {l.sharpness >= 0 ? "+" : ""}
                  {l.sharpness} sharpness
                </Text>
                <Text fz="xs">×{l.gain} progress</Text>
              </Stack>
            </Stack>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Text fz="xs" c="dimmed" mt="sm">
        Rest takes 28 fatigue off a week, and every game on stage adds 4. From {view.thresholds.burnout} fatigue a player may burn out
        for three weeks; under {view.thresholds.complacent} sharpness they get complacent.
      </Text>
    </Section>
  );
}

function FocusPicker({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  function toggle(area: string) {
    const on = view.focus.includes(area);
    const next = on ? view.focus.filter((a) => a !== area) : [...view.focus, area].slice(-2);
    act({ type: "set_training", focus: next });
  }
  return (
    <Section title="Team focus" right={<Text fz="xs" c="dimmed">one area trains at full speed, two at 60% each</Text>}>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {view.areas.map((a) => {
          const on = view.focus.includes(a.id);
          const band = attributeBand(a.level);
          return (
            <UnstyledButton key={a.id} className={cx(classes.option, on && classes.active)} disabled={busy} onClick={() => toggle(a.id)}>
              <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={800}>{a.label}</Text>
                  {on ? <IconTarget size={16} color="var(--gold-bright)" /> : <Text fz="xs" c="dimmed">focus</Text>}
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Progress value={(a.level / 20) * 100} color={BAND_COLOR[band]} size="sm" radius="xl" style={{ flex: 1 }} />
                  <Text fw={800} fz="sm" style={{ color: BAND_COLOR[band] }}>
                    {a.level.toFixed(1)}
                  </Text>
                </Group>
                <Text fz="xs" c="dimmed" lh={1.35}>
                  {a.effect}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Section>
  );
}

function SetPlays({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  return (
    <Section title="Set plays" right={<Text fz="xs" c="dimmed">drill one at a time · usable from {view.usable_from}% · once a series</Text>}>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {view.plays.map((p) => (
          <PlayCard
            key={p.id}
            play={p}
            drilling={view.drilling === p.id}
            usableFrom={view.usable_from}
            busy={busy}
            onDrill={() => act({ type: "set_training", play: p.id })}
            onStop={() => act({ type: "set_training", clear_play: true })}
          />
        ))}
      </SimpleGrid>
    </Section>
  );
}

function PlayCard({ play, drilling, usableFrom, busy, onDrill, onStop }: { play: SetPlayInfo; drilling: boolean; usableFrom: number; busy: boolean; onDrill: () => void; onStop: () => void }) {
  const known = play.learned >= 100;
  const usable = play.learned >= usableFrom;
  return (
    <Paper p="sm" withBorder className={cx(drilling && classes.drilling)}>
      <Stack gap={6} h="100%">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={0}>
            <Text fw={800}>{play.name}</Text>
            <Text fz="xs" c="dimmed">
              {play.phase} · minute {play.minute} · {play.area_label}
            </Text>
          </Stack>
          {known ? (
            <Badge size="sm" color="teal" variant="light" leftSection={<IconCheck size={10} />}>
              known
            </Badge>
          ) : drilling ? (
            <Badge size="sm" color="gold">
              drilling
            </Badge>
          ) : usable ? (
            <Badge size="sm" color="orange" variant="light">
              usable
            </Badge>
          ) : null}
        </Group>
        <Tooltip label={play.text} multiline w={260}>
          <Text fz="xs" c="gray.4" lh={1.35}>
            {play.effect}
          </Text>
        </Tooltip>
        <Box mt="auto">
          <Progress value={play.learned} color={known ? "teal" : usable ? "orange" : "gray"} size="sm" radius="xl" />
          <Group justify="space-between" mt={6}>
            <Text fz="xs" c="dimmed">
              {play.learned}% · about {play.weeks} weeks from scratch
            </Text>
            {!known &&
              (drilling ? (
                <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconPlayerStop size={12} />} disabled={busy} onClick={onStop}>
                  Stop
                </Button>
              ) : (
                <Button size="compact-xs" variant="light" disabled={busy} onClick={onDrill}>
                  Drill
                </Button>
              ))}
          </Group>
        </Box>
      </Stack>
    </Paper>
  );
}

function PlayersTable({ view }: { view: TrainingView }) {
  const { career, act, busy } = useCareer();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const champions = useMemo(
    () => [...catalog.champions].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
    [catalog.champions],
  );
  const attributes = view.attributes.filter((a) => a !== "composure").map((a) => ({ value: a, label: ATTRIBUTE_NAMES[a] ?? a }));

  function set(p: TrainingPlayer, attribute: string | null, champion: string | null) {
    act({ type: "set_player_training", player: p.id, attribute, champion });
  }

  return (
    <Section title={`Players · ${view.players.length}`} right={<Text fz="xs" c="dimmed">their own work on top of the team's scrims</Text>} pad={false}>
      <ScrollArea type="auto">
        <Table verticalSpacing={6} miw={1050}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={34} />
              <Table.Th>Player</Table.Th>
              <Table.Th className="num">OVR</Table.Th>
              <Table.Th>Development</Table.Th>
              <Table.Th>Fatigue</Table.Th>
              <Table.Th>Sharpness</Table.Th>
              <Table.Th>Morale</Table.Th>
              <Table.Th>Condition</Table.Th>
              <Table.Th w={180}>Works on</Table.Th>
              <Table.Th w={220}>Learns champion</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {view.players.map((p) => (
              <Table.Tr key={p.id} className={cx(!p.starter && "dim")}>
                <Table.Td>
                  <RoleIcon role={p.role} />
                </Table.Td>
                <Table.Td>
                  <UnstyledButton onClick={() => navigate(`/career/${career.id}/player/${p.id}`)}>
                    <Group gap="sm" wrap="nowrap">
                      <PlayerPhoto photo={p.photo} name={p.name} size={30} />
                      <Text fw={700} fz="sm">
                        {p.name}
                      </Text>
                    </Group>
                  </UnstyledButton>
                </Table.Td>
                <Table.Td className="num">
                  <Ovr value={p.overall} />
                </Table.Td>
                <Table.Td>
                  <Tooltip label={p.quality !== null ? `Average week quality ${p.quality} (1.0 is a normal week for a starter)` : "Not enough weeks yet"}>
                    <Badge size="sm" variant="light" color={TREND_COLOR[p.development] ?? "gray"}>
                      {p.development}
                    </Badge>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Meter value={p.fatigue} color={p.fatigue >= view.thresholds.burnout ? "red" : p.fatigue >= 40 ? "orange" : "teal"} label={`Fatigue ${p.fatigue}`} />
                </Table.Td>
                <Table.Td>
                  <Meter value={p.sharpness} color={p.sharpness < view.thresholds.complacent ? "yellow" : "hextech"} label={`Sharpness ${p.sharpness}`} />
                </Table.Td>
                <Table.Td>
                  <Meter value={p.morale} color={p.morale >= 60 ? "teal" : "red"} label={`Morale ${p.morale}`} />
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {p.status.map((s) => (
                      <Badge key={s} size="xs" color={STATUS_COLOR[s] ?? "gray"} variant="light">
                        {s}
                        {s === "Burned out" && p.burnout ? ` · ${p.burnout}w` : ""}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    placeholder="Anything"
                    clearable
                    data={attributes}
                    value={p.training.attribute}
                    disabled={busy}
                    onChange={(v) => set(p, v, p.training.champion)}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    {p.learning && <ChampIcon id={p.learning.champion} size={26} title={`Mastery ${p.learning.mastery} of ${view.thresholds.champion_cap}`} />}
                    <Select
                      size="xs"
                      placeholder="Coach's choice"
                      clearable
                      searchable
                      data={champions}
                      value={p.training.champion}
                      disabled={busy}
                      onChange={(v) => set(p, p.training.attribute, v)}
                      style={{ flex: 1 }}
                    />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Section>
  );
}
