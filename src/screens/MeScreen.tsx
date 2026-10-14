import { Badge, Group, Stack, Table, Text } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { CompetitionRecordView, ManagerView } from "../api/types";
import { TeamLogo } from "../components/Media";
import { ClubStars, Stars } from "../components/Stars";
import { AttrBar, Empty, Loading, PageHeader, Screen, Section } from "../components/Ui";
import { flag, longDate, ordinal, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./MeScreen.module.css";

const GROUPS: { title: string; seat: "coach" | "analyst" | null }[] = [
  { title: "Coaching", seat: "coach" },
  { title: "Analysis", seat: "analyst" },
  { title: "Management", seat: null },
];

const TROPHY_COLOR: Record<string, string> = { WORLDS: "#f0c64a", MSI: "#0ac8b9", FST: "#c8aa6e", league: "var(--gold-bright)" };

const pct = ([w, l]: [number, number]) => (w + l ? `${Math.round((100 * w) / (w + l))}%` : "–");
const wl = ([w, l]: [number, number]) => `${w}–${l}`;

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const dayMonthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** You, as Football Manager shows a manager: profile, attributes, record, trophies, clubs and reputation. */
export function MeScreen() {
  const { career, revision } = useCareer();
  const view = useApi(() => api.manager(career.id), [career.id, revision]);
  const v = view.data;
  if (!v) return <Loading />;
  if (!v.profile)
    return (
      <Screen>
        <Empty>Create your manager first.</Empty>
      </Screen>
    );
  const initials = v.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const country = countryName(v.profile.country);
  const first = v.record.clubs[v.record.clubs.length - 1]?.start;

  return (
    <Screen>
      <PageHeader
        icon={<span className={classes.avatar}>{initials}</span>}
        eyebrow={
          <>
            Manager{country ? ` · ${flag(v.profile.country)} ${country}` : ""} · {v.profile.background_name}
          </>
        }
        title={v.name}
        right={
          <Group gap="xl">
            {v.club && (
              <Group gap="sm" wrap="nowrap">
                <TeamLogo team={v.club} size={40} />
                <Stack gap={0}>
                  <Text className="eyebrow">Head coach</Text>
                  <Text fw={800}>{v.club.name}</Text>
                  {v.record.since && (
                    <Text fz="xs" c="dimmed">
                      since {longDate(v.record.since)}
                    </Text>
                  )}
                </Stack>
              </Group>
            )}
            <Stack gap={2} align="flex-end">
              <Text className="eyebrow">Reputation</Text>
              {v.ratings ? (
                <ClubStars r={v.ratings} size={16} who="manager" />
              ) : (
                <Stars value={v.stars} size={18} label={`Manager reputation ${v.reputation}`} />
              )}
            </Stack>
          </Group>
        }
      />

      <div className={classes.layout}>
        <Stack gap="lg">
          <Attributes v={v} />
          <Section title="Reputation">
            <ReputationGraph log={v.record.reputation_log} region={v.ratings?.region ?? "Region"} />
          </Section>
        </Stack>

        <Stack gap="lg">
          <div className={classes.tiles}>
            <Tile label="Series" value={wl(v.record.totals.series)} sub={`${pct(v.record.totals.series)} won`} />
            <Tile label="Games" value={wl(v.record.totals.games)} sub={`${pct(v.record.totals.games)} won`} />
            <Tile label="Trophies" value={String(v.record.totals.titles)} sub={v.record.totals.titles === 1 ? "title" : "titles"} />
            <Tile label="Seasons" value={String(v.record.totals.seasons)} sub={first ? `in charge since ${monthYear(first)}` : ""} />
          </div>
          <Trophies v={v} />
          <Seasons v={v} />
          <Clubs v={v} />
        </Stack>
      </div>
    </Screen>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={classes.tile}>
      <Text className="label">{label}</Text>
      <Text className="display" fz={32} lh={1.1}>
        {value}
      </Text>
      <Text fz="xs" c="dimmed" fw={600}>
        {sub}
      </Text>
    </div>
  );
}

function Attributes({ v }: { v: ManagerView }) {
  const attrs = v.profile!.attributes;
  const who = Object.fromEntries(v.duties.map((d) => [d.attribute, d.who]));
  return (
    <Section title="Attributes" right={<Text fz="xs" c="dimmed">who does the work</Text>}>
      {GROUPS.map((g) => (
        <div key={g.title} className={classes.attrGroup}>
          <Text className="label" mb={4}>
            {g.title}
          </Text>
          <Stack gap={4}>
            {v.attributes
              .filter((a) => a.seat === g.seat)
              .map((a) => (
                <Group key={a.id} gap="sm" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <AttrBar label={a.name} value={Math.floor(attrs[a.id] ?? 0)} hint={a.text} />
                  </div>
                  <span className={classes.doer} data-mine={!a.seat || who[a.id] === "manager" || undefined} style={{ width: 62, textAlign: "right" }}>
                    {!a.seat ? "you" : who[a.id] === "manager" ? "you" : a.seat === "coach" ? "assistant" : "analyst"}
                  </span>
                </Group>
              ))}
          </Stack>
        </div>
      ))}
      <Text fz="xs" c="dimmed" mt="md">
        Change who does what on the{" "}
        <Text span component={Link} to="../squad" relative="path" className="link" fz="xs">
          Squad screen
        </Text>
        .
      </Text>
    </Section>
  );
}

function Trophies({ v }: { v: ManagerView }) {
  const list = v.record.trophies;
  return (
    <Section title="Trophy cabinet" right={<Text fz="xs" c="dimmed">{list.length ? `${list.length} won` : null}</Text>}>
      {list.length === 0 ? (
        <Text fz="sm" c="dimmed">
          No trophies yet. The first one is the hardest.
        </Text>
      ) : (
        <div className={classes.cabinet}>
          {list.map((t, i) => (
            <div key={i} className={classes.trophy} data-kind={t.kind}>
              <IconTrophy size={34} color={TROPHY_COLOR[t.kind] ?? TROPHY_COLOR.league} stroke={1.6} />
              <Text fw={800} fz="sm" lh={1.2}>
                {t.name}
              </Text>
              <Group gap={6} justify="center">
                {t.team && <TeamLogo team={t.team} size={18} />}
                <Text fz="xs" c="dimmed">
                  {t.team?.tag ?? ""} · {t.season}
                </Text>
              </Group>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function place(c: CompetitionRecordView): string {
  if (c.place === 1) return "Champions";
  if (c.place) return ordinal(c.place);
  return "under way";
}

function Seasons({ v }: { v: ManagerView }) {
  return (
    <Section title="Season by season" pad={false}>
      <Table verticalSpacing={6} horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="label">Season</Table.Th>
            <Table.Th className="label">Club</Table.Th>
            <Table.Th className="label" ta="right">
              Series
            </Table.Th>
            <Table.Th className="label" ta="right">
              Games
            </Table.Th>
            <Table.Th className="label" ta="right">
              Won
            </Table.Th>
            <Table.Th className="label">Finish</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {v.record.seasons.map((s) => [
            <Table.Tr key={s.season} className={classes.seasonRow}>
              <Table.Td>
                <Group gap={6}>
                  <Text fw={800}>{s.season}</Text>
                  {s.current && (
                    <Badge size="xs" variant="light" color="hextech">
                      now
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  {s.teams.map((t) => (
                    <Group key={t.id} gap={6} wrap="nowrap">
                      <TeamLogo team={t} size={20} />
                      <Text fz="sm" fw={600}>
                        {t.tag}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td ta="right" fw={700}>
                {wl(s.series)}
              </Table.Td>
              <Table.Td ta="right">{wl(s.games)}</Table.Td>
              <Table.Td ta="right">{pct(s.series)}</Table.Td>
              <Table.Td>
                {s.titles.length > 0 ? (
                  <Group gap={4}>
                    <IconTrophy size={14} color="var(--gold-bright)" />
                    <Text fz="sm" fw={700} c="gold.4">
                      {s.titles.length} {s.titles.length === 1 ? "title" : "titles"}
                    </Text>
                  </Group>
                ) : (
                  <Text fz="sm" c="dimmed">
                    –
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>,
            ...s.competitions.map((c, i) => (
              <Table.Tr key={`${s.season}-${i}`} className={classes.compRow}>
                <Table.Td />
                <Table.Td>
                  <Text fz="xs" c="dimmed" truncate>
                    {c.name}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text fz="xs" c="dimmed">
                    {wl(c.series)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text fz="xs" c="dimmed">
                    {wl(c.games)}
                  </Text>
                </Table.Td>
                <Table.Td />
                <Table.Td>
                  <Text fz="xs" fw={c.place === 1 ? 800 : 500} c={c.place === 1 ? "gold.4" : "dimmed"}>
                    {place(c)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )),
          ])}
        </Table.Tbody>
      </Table>
    </Section>
  );
}

function Clubs({ v }: { v: ManagerView }) {
  return (
    <Section title="Clubs" pad={false}>
      <Table verticalSpacing={8} horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="label">Club</Table.Th>
            <Table.Th className="label">From</Table.Th>
            <Table.Th className="label">To</Table.Th>
            <Table.Th className="label" ta="right">
              Series
            </Table.Th>
            <Table.Th className="label" ta="right">
              Games
            </Table.Th>
            <Table.Th className="label" ta="right">
              Titles
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {v.record.clubs.map((c, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  {c.team && <TeamLogo team={c.team} size={24} />}
                  <Text fz="sm" fw={700}>
                    {c.team?.name ?? "—"}
                  </Text>
                  {c.left === "sacked" && (
                    <Badge size="xs" color="red" variant="light">
                      sacked
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td fz="sm">{dayMonthYear(c.start)}</Table.Td>
              <Table.Td fz="sm">{c.end ? dayMonthYear(c.end) : <Text span fz="sm" c="teal.4" fw={700}>now</Text>}</Table.Td>
              <Table.Td ta="right" fw={700}>
                {wl(c.series)}
              </Table.Td>
              <Table.Td ta="right">{wl(c.games)}</Table.Td>
              <Table.Td ta="right" fw={c.titles ? 800 : 500} c={c.titles ? "gold.4" : "dimmed"}>
                {c.titles}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Section>
  );
}

/** Colours for the regions the manager worked in before: the current one is always teal. */
const EARLIER = ["#c389f5", "#f08c5a", "#6fa8ff", "#e06c9f"];

/**
 * The manager's reputation over time: the world in gold, and a line for each region they worked in,
 * each starting where they took a job there, since a region's standing means nothing elsewhere.
 */
function ReputationGraph({ log, region }: { log: [string, number, number?, string?][]; region: string }) {
  if (log.length < 2) {
    const [, world, regional] = log[0] ?? ["", 0];
    return (
      <Text fz="sm" c="dimmed">
        World {world.toFixed(1)}
        {regional !== undefined ? `, ${region} ${regional.toFixed(1)}` : ""} now. From here on every change is kept: objectives met, titles, a sacking.
      </Text>
    );
  }
  const w = 420;
  const h = 150;
  const pad = { l: 34, r: 10, t: 10, b: 22 };
  const times = log.map(([d]) => new Date(d).getTime());
  const t0 = times[0];
  const t1 = Math.max(times[times.length - 1], t0 + 1);
  const all = log.flatMap(([, a, b]) => (b === undefined ? [a] : [a, b]));
  const lo = Math.floor((Math.min(...all) - 2) / 5) * 5;
  const hi = Math.ceil((Math.max(...all) + 2) / 5) * 5;
  const x = (time: number) => pad.l + ((time - t0) / (t1 - t0)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  // A step line: reputation changes on a day and stays until the next change.
  const steps = (values: (number | undefined)[]) => {
    let d = "";
    values.forEach((v, i) => {
      if (v === undefined) return;
      d += d ? ` H${x(times[i]).toFixed(1)} V${y(v).toFixed(1)}` : `M${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return d;
  };
  // One line per spell in a region: a return to a region after working elsewhere starts a new one.
  const spells: { name: string; from: number; to: number }[] = [];
  log.forEach((e, i) => {
    if (e[2] === undefined) return;
    const name = e[3] ?? region;
    const last = spells[spells.length - 1];
    if (last && last.name === name && last.to === i - 1) last.to = i;
    else spells.push({ name, from: i, to: i });
  });
  const named = [...new Set(spells.map((s) => s.name))].filter((n) => n !== region);
  const colour = (name: string) => (name === region ? "#0ac8b9" : EARLIER[named.indexOf(name) % EARLIER.length]);
  const lines = [
    { key: "world", label: "World", color: "var(--gold-bright)", values: log.map((e) => e[1]), until: undefined as number | undefined },
    ...spells.map((s) => ({
      key: `${s.name}-${s.from}`,
      label: s.name,
      color: colour(s.name),
      values: log.map((e, i) => (i >= s.from && i <= s.to ? e[2] : undefined)),
      // A region left behind keeps its standing until the day of the move.
      until: s.to + 1 < log.length ? times[s.to + 1] : undefined,
    })),
  ];
  const legend = [...new Map(lines.map((l) => [l.label, l])).values()];
  return (
    <Stack gap={6}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Manager reputation over time, in the world and in the region">
        {[lo, (lo + hi) / 2, hi].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fill="#5e6982" fontSize="11">
              {Math.round(g)}
            </text>
          </g>
        ))}
        {lines.map((l) => (
          <g key={l.key}>
            <path d={steps(l.values) + (l.until !== undefined ? ` H${x(l.until).toFixed(1)}` : "")} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" />
            {l.values.map((v, i) =>
              v === undefined ? null : (
                <circle key={i} cx={x(times[i])} cy={y(v)} r="3" fill={l.color}>
                  <title>{`${shortDate(log[i][0])} · ${l.label} ${v}`}</title>
                </circle>
              ),
            )}
          </g>
        ))}
        <text x={pad.l} y={h - 5} fill="#5e6982" fontSize="11">
          {dayMonthYear(log[0][0])}
        </text>
        <text x={w - pad.r} y={h - 5} textAnchor="end" fill="#5e6982" fontSize="11">
          {dayMonthYear(log[log.length - 1][0])}
        </text>
      </svg>
      <Group gap="md">
        {legend.map((l) => (
          <Group key={l.key} gap={6}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: l.color }} />
            <Text fz="xs" c="dimmed">
              {l.label}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}
