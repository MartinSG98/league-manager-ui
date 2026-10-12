import { Badge, Box, Button, Grid, Group, Progress, ScrollArea, Select, SimpleGrid, Stack, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBarbell, IconCheck, IconPlayerStop, IconTarget, IconTargetArrow } from "@tabler/icons-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Load, TrainingPlayer, TrainingView } from "../api/types";
import { ChampIcon, PlayerPhoto, RoleIcon } from "../components/Media";
import { problemColor } from "../components/ReviewReport";
import { Loading, Meter, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { ATTRIBUTE_NAMES, attributeBand, cx, longDate, shortDate } from "../lib/format";
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
    <Screen wide>
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
      <Stack gap="lg">
        <LoadPicker view={view} />
        <PlayersTable view={view} />
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, xl: 7 }}>
            <TeamAreas view={view} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, xl: 5 }}>
            <SetPlays view={view} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Screen>
  );
}

/** The week's scrim load, side by side, with what each does to fatigue, sharpness and progress. */
function LoadPicker({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  return (
    <Section title="Scrim load this week" right={<Text fz="xs" c="dimmed">{view.advice}</Text>}>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        {view.loads.map((l) => (
          <UnstyledButton
            key={l.id}
            className={cx(classes.option, view.load === l.id && classes.active)}
            disabled={busy}
            onClick={() => act({ type: "set_training", load: l.id as Load })}
          >
            <Stack gap={4}>
              <Group justify="space-between" wrap="nowrap" gap={4}>
                <Group gap={6} wrap="nowrap">
                  {view.load === l.id && <IconCheck size={16} color="var(--gold-bright)" />}
                  <Text fw={800}>{l.name}</Text>
                </Group>
                {view.recommended === l.id && (
                  <Badge size="xs" color="gold" variant="light">
                    advised
                  </Badge>
                )}
              </Group>
              <Text fz="xs" c="dimmed" lh={1.35}>
                {l.text}
              </Text>
              <Group gap="md" mt={4} wrap="wrap">
                <Stat value={`+${l.fatigue}`} label="fatigue" tone={l.fatigue > 0 ? "loss" : undefined} />
                <Stat value={`${l.sharpness >= 0 ? "+" : ""}${l.sharpness}`} label="sharpness" tone={l.sharpness >= 0 ? "gain" : "loss"} />
                <Stat value={`×${l.gain}`} label="progress" />
              </Group>
            </Stack>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Text fz="xs" c="dimmed" mt="sm">
        A week. Rest takes 28 fatigue off, and every game on stage adds 4. From {view.thresholds.burnout} fatigue a player may burn out for
        three weeks; under {view.thresholds.complacent} sharpness they get complacent.
      </Text>
    </Section>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "gain" | "loss" }) {
  return (
    <Text fz="xs" c="dimmed">
      <Text span fw={800} fz="sm" className={tone} c={tone ? undefined : "gray.2"}>
        {value}
      </Text>{" "}
      {label}
    </Text>
  );
}

/** The five team areas with the analyst's read of each, and which ones the scrims focus on. */
function TeamAreas({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  const review = view.review;
  const read = new Map((review?.areas ?? []).map((a) => [a.area, a]));
  const recommend = review?.recommend ?? [];
  const applied = recommend.length > 0 && recommend.length === view.focus.length && recommend.every((a) => view.focus.includes(a));

  function toggle(area: string) {
    const on = view.focus.includes(area);
    const next = on ? view.focus.filter((a) => a !== area) : [...view.focus, area].slice(-2);
    act({ type: "set_training", focus: next });
  }

  return (
    <Section
      title="Team areas"
      pad={false}
      right={
        recommend.length > 0 && (
          <Button
            size="compact-xs"
            variant={applied ? "default" : "light"}
            leftSection={<IconTargetArrow size={14} />}
            disabled={busy || applied}
            onClick={() => act({ type: "set_training", focus: recommend })}
          >
            {applied ? "The analyst's picks are in focus" : "Focus what the analyst says"}
          </Button>
        )
      }
    >
      <Text fz="xs" c="dimmed" px="md" py="xs" className={classes.note}>
        One area in focus trains at full speed, two at 60% each.{" "}
        {review
          ? `${review.analyst ?? "Your staff"} watched the last ${review.games} games (${shortDate(review.day)}).`
          : "The analyst reviews the team after every six games."}
      </Text>
      {view.areas.map((a) => {
        const on = view.focus.includes(a.id);
        const band = attributeBand(a.level);
        const r = read.get(a.id);
        return (
          <Box key={a.id} className={cx(classes.row, classes.areaRow, on && classes.rowOn)}>
            <Stack gap={2} miw={0}>
              <Group gap={6} wrap="nowrap">
                <Text fw={800}>{a.label}</Text>
                {recommend.includes(a.id) && (
                  <Badge size="xs" color="gold" variant="filled">
                    work on this
                  </Badge>
                )}
              </Group>
              <Text fz="xs" c="dimmed" lh={1.35}>
                {a.effect}
              </Text>
            </Stack>
            <Stack gap={6} miw={0}>
              <Group gap="xs" wrap="nowrap">
                <Progress value={(a.level / 20) * 100} color={BAND_COLOR[band]} size="sm" radius="xl" style={{ flex: 1 }} />
                <Text fw={800} fz="sm" w={34} ta="right" style={{ color: BAND_COLOR[band] }}>
                  {a.level.toFixed(1)}
                </Text>
              </Group>
              {r && (
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <Box className={classes.dot} style={{ background: `var(--mantine-color-${problemColor(r.score)}-5)` }} />
                  <Text fz="xs" c="gray.4" lh={1.35}>
                    {r.line}
                  </Text>
                </Group>
              )}
            </Stack>
            <Button
              size="xs"
              variant={on ? "filled" : "default"}
              color={on ? "gold" : undefined}
              leftSection={<IconTarget size={14} />}
              disabled={busy}
              onClick={() => toggle(a.id)}
            >
              {on ? "In focus" : "Focus"}
            </Button>
          </Box>
        );
      })}
    </Section>
  );
}

/** Set plays as a list: what each does, how far the team has learned it, and the one in drills. */
function SetPlays({ view }: { view: TrainingView }) {
  const { act, busy } = useCareer();
  const drilling = view.plays.find((p) => p.id === view.drilling);
  return (
    <Section title="Set plays" pad={false} right={<Text fz="xs" c="dimmed">usable from {view.usable_from}% · each once a series</Text>}>
      <Text fz="xs" c="dimmed" px="md" py="xs" className={classes.note}>
        One play in drills at a time. {drilling ? `Drilling ${drilling.name}.` : "Nothing in drills this week."}
      </Text>
      {view.plays.map((p) => {
        const known = p.learned >= 100;
        const usable = p.learned >= view.usable_from;
        const on = view.drilling === p.id;
        return (
          <Box key={p.id} className={cx(classes.row, classes.playRow, on && classes.rowOn)}>
            <Stack gap={0} miw={0}>
              <Text fw={700} fz="sm">
                {p.name}
              </Text>
              <Tooltip label={p.text} multiline w={280}>
                <Text fz="xs" c="dimmed" lh={1.35} lineClamp={1}>
                  {p.phase} · minute {p.minute} · {p.effect}
                </Text>
              </Tooltip>
            </Stack>
            <Stack gap={4}>
              <Progress value={p.learned} color={known ? "teal" : usable ? "orange" : "gray"} size="sm" radius="xl" />
              <Text fz={11} c={known ? "teal.4" : usable ? "orange.4" : "dimmed"}>
                {known ? "known" : `${p.learned}%${usable ? " · usable" : ""}`}
              </Text>
            </Stack>
            {known ? (
              <IconCheck size={18} color="var(--mantine-color-teal-5)" style={{ justifySelf: "end" }} />
            ) : on ? (
              <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconPlayerStop size={12} />} disabled={busy} onClick={() => act({ type: "set_training", clear_play: true })}>
                Stop
              </Button>
            ) : (
              <Tooltip label={`About ${p.weeks} weeks from scratch`}>
                <Button size="compact-xs" variant="light" disabled={busy} onClick={() => act({ type: "set_training", play: p.id })}>
                  Drill
                </Button>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Section>
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
    <Section title={`Players · ${view.players.length}`} right={<Text fz="xs" c="dimmed">condition, and their own work on top of the team's scrims</Text>} pad={false}>
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
