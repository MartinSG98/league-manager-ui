import { Badge, Box, Button, Group, Paper, SegmentedControl, Select, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { PlayerDetail, Role, SquadView, StaffRow, Tactics, TrainingView } from "../api/types";
import { PlayerPhoto, PlayerPortrait, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { Empty, Loading, Meter, Ovr, Screen, Section, Stat, Tag } from "../components/Ui";
import { ATTRIBUTE_NAMES, flag, money, ROLE_NAMES, ROLES, signed, STAFF_ATTRIBUTES, STAFF_KIND_NAMES, vars } from "../lib/format";
import { ATTRS, teamAverages } from "../lib/squad";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./SquadScreen.module.css";

const SHORT: Record<string, string> = { champion_pool: "Pool" };
const attrName = (k: string) => SHORT[k] ?? ATTRIBUTE_NAMES[k];

const TACTIC_TEXT = {
  style: { early: "Early game", balanced: "Balanced game", scaling: "Scaling" },
  lane: { top: "Jungle on top", mid: "Jungle on mid", bot: "Jungle on bot" },
  objectives: { dragons: "Dragons first", balanced: "Balanced objectives", barons: "Grubs & Baron" },
} as const;

export function SquadScreen() {
  const { team } = useParams();
  const { career, revision } = useCareer();
  const squad = useApi(() => api.squad(career.id, team), [career.id, revision, team]);
  const mine = !team || team === career.team.id;
  const training = useApi(() => (mine && career.phase !== "draft" ? api.training(career.id).catch(() => null) : Promise.resolve(null)), [career.id, revision, mine, career.phase]);
  if (career.phase === "draft" && !team && squad.data && squad.data.players.length < 5) {
    return (
      <Screen>
        <Empty>Your squad takes shape in the draft.</Empty>
      </Screen>
    );
  }
  if (!squad.data) return <Loading />;
  return <Squad squad={squad.data} training={training.data} />;
}

function Squad({ squad, training }: { squad: SquadView; training: TrainingView | null }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  const starters = ROLES.map((r) => squad.players.find((p) => p.id === squad.lineup[r]) ?? null);
  const five = starters.filter((p): p is PlayerDetail => !!p);
  const bench = squad.players.filter((p) => !Object.values(squad.lineup).includes(p.id));
  const avg = teamAverages(five);

  return (
    <Screen>
      <Box style={vars({ "--team": squad.team.color })}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="lg" mb="lg">
          <Group gap="md" wrap="nowrap">
            <TeamLogo team={squad.team} size={64} />
            <Stack gap={4}>
              <Text className="eyebrow">{squad.is_mine ? "Your squad" : "Team"}</Text>
              <Title order={1} className="display" fz={44} lh={1}>
                {squad.team.name}
              </Title>
              <Group gap={6} mt={4}>
                <Tag>{TACTIC_TEXT.style[squad.tactics.style]}</Tag>
                <Tag>{TACTIC_TEXT.lane[squad.tactics.lane]}</Tag>
                <Tag>{TACTIC_TEXT.objectives[squad.tactics.objectives]}</Tag>
              </Group>
            </Stack>
          </Group>
          <Group gap={36} wrap="wrap">
            <Stat label="Strength" value={squad.strength.toFixed(1)} />
            <Stat label="Chemistry" value={signed(squad.chemistry.score, 1)} tone={squad.chemistry.score >= 0 ? "gain" : "loss"} />
            <Stack gap={0}>
              <Text className="label">Payroll</Text>
              <Text className="display" fz={34} lh={1.05}>
                {money(squad.payroll)}
              </Text>
              <Group gap={8} wrap="nowrap">
                <Meter value={squad.payroll} max={squad.budget} w={80} color={squad.payroll > squad.budget ? "red" : "gold"} />
                <Text fz="xs" c="dimmed" fw={600}>
                  of {money(squad.budget)}
                </Text>
              </Group>
            </Stack>
          </Group>
        </Group>

        <div className={classes.starters}>
          {starters.map((p, i) => (
            <StarterCard key={ROLES[i]} role={ROLES[i]} p={p} squad={squad} avg={avg} onOpen={(id) => navigate(`/career/${career.id}/player/${id}`)} />
          ))}
        </div>

        <div className={classes.columns}>
          <div className={classes.mainCol}>
            <TeamProfile squad={squad} five={five} bench={bench} avg={avg} training={training} />
          </div>
          <Stack gap="lg" className={classes.sideCol}>
            <Section title="Chemistry" right={<Text className="display" fz={26} c={squad.chemistry.score >= 0 ? "teal.4" : "red.4"}>{signed(squad.chemistry.score, 2)}</Text>}>
              {squad.chemistry.reasons.length === 0 ? (
                <Text fz="sm" c="dimmed">
                  Nothing helps or hurts this five yet.
                </Text>
              ) : (
                <Stack gap={8}>
                  {squad.chemistry.reasons.map((r) => (
                    <Text key={r} fz="sm" c="gray.3" lh={1.4}>
                      {r}
                    </Text>
                  ))}
                </Stack>
              )}
            </Section>
            {squad.is_mine && <TacticsPanel tactics={squad.tactics} />}
            <Section title="Staff" pad={false}>
              <StaffLine person={squad.staff.coach} kind="coach" />
              <StaffLine person={squad.staff.analyst} kind="analyst" />
            </Section>
            {squad.is_mine && bench.length > 0 && <LineupPanel squad={squad} />}
          </Stack>
        </div>
      </Box>
    </Screen>
  );
}

/** A player's two best attributes, and the one furthest below the team's level. */
function highlights(p: PlayerDetail, avg: Record<string, number>) {
  const ranked = [...ATTRS].sort((a, b) => p.attributes[b] - p.attributes[a] || p.attributes[b] - avg[b] - (p.attributes[a] - avg[a]));
  const best = ranked.slice(0, 2);
  const weak = [...ATTRS].filter((k) => !best.includes(k)).sort((a, b) => p.attributes[a] - avg[a] - (p.attributes[b] - avg[b]) || p.attributes[a] - p.attributes[b])[0];
  return { best, weak };
}

function StarterCard({ role, p, squad, avg, onOpen }: { role: Role; p: PlayerDetail | null; squad: SquadView; avg: Record<string, number>; onOpen: (id: string) => void }) {
  if (!p) {
    return (
      <Paper p="md" radius={14} className={classes.starter}>
        <Group gap="xs">
          <RoleIcon role={role} />
          <Text c="dimmed">No {ROLE_NAMES[role].toLowerCase()}</Text>
        </Group>
      </Paper>
    );
  }
  const { best, weak } = highlights(p, avg);
  const flags = [
    p.rookie && "rookie",
    p.retiring && "last season",
    squad.listed.includes(p.id) && "listed",
    ...p.status.filter((s) => s !== "Sharp"),
  ].filter(Boolean) as string[];
  return (
    <Paper radius={14} className={classes.starter} onClick={() => onOpen(p.id)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)}>
      <SplashBackdrop id={p.signatures[0] ?? p.pool[0]?.champion} strength={0.78} position="center 15%" />
      <Stack gap="sm" className={classes.starterInner}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={6}>
            <RoleIcon role={role} size={20} />
            {squad.franchise === p.id && <Text className={classes.franchise}>Franchise</Text>}
          </Group>
          <Stack gap={0} align="flex-end">
            <Ovr value={p.overall} size="lg" plain={squad.is_mine} />
            <Text fz={11} fw={700} c="dimmed" tt="uppercase" lts="0.08em">
              {p.potential > p.overall ? `pot ${p.potential}` : "at peak"}
            </Text>
          </Stack>
        </Group>
        <PlayerPortrait photo={p.photo} name={p.name} color={squad.team.color} height={130} />
        <Box>
          <Text className="display" fz={28} lh={1} truncate>
            {p.name}
          </Text>
          <Text fz="xs" c="dimmed" truncate mt={4}>
            {flag(p.country)} {p.real_name ?? ROLE_NAMES[role]}
            {p.contract_until && ` · to ${p.contract_until}`}
          </Text>
        </Box>
        <Group gap={6}>
          {best.map((k) => (
            <Tag key={k} tone="better">
              {attrName(k)} {p.attributes[k]}
            </Tag>
          ))}
          <Tag tone="worse">
            {attrName(weak)} {p.attributes[weak]}
          </Tag>
        </Group>
        {flags.length > 0 && (
          <Group gap={4}>
            {flags.map((f) => (
              <Badge key={f} size="xs" variant="light" color={f === "rookie" ? "lime" : "orange"}>
                {f}
              </Badge>
            ))}
          </Group>
        )}
        <Group gap="xs" wrap="nowrap" className={classes.condition}>
          <Text fz="sm" c="dimmed">
            Form{" "}
            <b className={p.form >= 1 ? "gain" : p.form <= -1 ? classes.worse : undefined}>
              {p.form >= 1 ? "▲ " : p.form <= -1 ? "▼ " : ""}
              {signed(p.form, 1)}
            </b>
          </Text>
          <Box style={{ flex: 1 }} />
          <Text fz="sm" c="dimmed">
            Morale
          </Text>
          <Meter value={p.morale} color={p.morale >= 60 ? "teal" : "orange"} w={56} label={`Morale ${p.morale}`} />
        </Group>
      </Stack>
    </Paper>
  );
}

type Cell = { text: string | number; tone?: "better" | "worse" | "note" };
type Row = { label: string; cells: Cell[]; team: string; teamTone?: "worse" };
type View = "profile" | "condition" | "contracts";

/** The squad side by side: attributes against the team's level, condition, or contracts. */
function TeamProfile({ squad, five, bench, avg, training }: { squad: SquadView; five: PlayerDetail[]; bench: PlayerDetail[]; avg: Record<string, number>; training: TrainingView | null }) {
  const { career } = useCareer();
  const [view, setView] = useState<View>("profile");
  const players = [...five, ...bench];
  const weakest = [...ATTRS].sort((a, b) => avg[a] - avg[b])[0];

  let rows: Row[];
  let teamLabel = "Five";
  if (view === "profile") {
    rows = ATTRS.map((k) => ({
      label: ATTRIBUTE_NAMES[k],
      team: avg[k].toFixed(1),
      teamTone: k === weakest ? "worse" : undefined,
      cells: players.map((p) => {
        const d = p.attributes[k] - avg[k];
        return { text: p.attributes[k], tone: d >= 2 ? "better" : d <= -2 ? "worse" : undefined };
      }),
    }));
  } else if (view === "condition") {
    const mean = (f: (p: PlayerDetail) => number) => five.reduce((s, p) => s + f(p), 0) / Math.max(1, five.length);
    rows = [
      { label: "Form", team: signed(mean((p) => p.form), 1), cells: players.map((p) => ({ text: signed(p.form, 1), tone: p.form >= 1 ? "better" : p.form <= -1 ? "worse" : undefined })) },
      { label: "Morale", team: String(Math.round(mean((p) => p.morale))), cells: players.map((p) => ({ text: p.morale, tone: p.morale < 60 ? "worse" : undefined })) },
      { label: "Sharpness", team: String(Math.round(mean((p) => p.sharpness))), cells: players.map((p) => ({ text: p.sharpness, tone: p.sharpness < 40 ? "worse" : undefined })) },
      { label: "Fatigue", team: String(Math.round(mean((p) => p.fatigue))), cells: players.map((p) => ({ text: p.fatigue, tone: p.fatigue >= 60 ? "worse" : undefined })) },
      { label: "Status", team: "", cells: players.map((p) => {
        const s = p.status.filter((x) => x !== "Sharp");
        return s.length ? { text: s.join(", "), tone: "worse" } : { text: p.status.length ? "Sharp" : "—" };
      }) },
    ];
  } else {
    teamLabel = "Total";
    rows = [
      { label: "Salary", team: money(players.reduce((s, p) => s + p.salary, 0)), cells: players.map((p) => ({ text: money(p.salary) })) },
      { label: "Contract to", team: "", cells: players.map((p) => ({ text: p.contract_until ?? "—", tone: p.contract_until !== null && p.contract_until <= career.season ? "note" : undefined })) },
      { label: "Market value", team: money(players.reduce((s, p) => s + p.market.value, 0)), cells: players.map((p) => ({ text: money(p.market.value) })) },
    ];
  }

  const columns = `150px repeat(${players.length}, minmax(76px, 1fr)) 84px`;
  const pulling = five.filter((p) => p.attributes[weakest] <= avg[weakest] - 2);
  const area = training?.areas.find((a) => a.id === weakest);
  let advice = "";
  if (squad.is_mine) {
    if (area) advice = training!.focus.includes(weakest) ? " It is already one of the scrims' focus areas." : " The scrims can focus on it in Training.";
    else advice = " Players can work on it in their own training.";
  }

  return (
    <Section
      title={squad.is_mine ? "Team profile" : "Profile"}
      pad={false}
      right={
        <SegmentedControl
          size="xs"
          value={view}
          onChange={(v) => setView(v as View)}
          data={[
            { value: "profile", label: "Profile" },
            { value: "condition", label: "Condition" },
            { value: "contracts", label: "Contracts" },
          ]}
        />
      }
    >
      <Box className={classes.gridScroll}>
        <Box className={classes.grid} style={{ minWidth: 150 + players.length * 80 + 84 }}>
          <div className={classes.gridRow} style={{ gridTemplateColumns: columns }} data-head>
            <span />
            {players.map((p, i) => (
              <Link key={p.id} to={`/career/${career.id}/player/${p.id}`} className={classes.head} data-bench={i >= five.length || undefined}>
                <span className={classes.headName}>{p.name}</span>
                <span className={classes.headRole}>{i >= five.length ? `bench · ${p.role}` : p.role}</span>
              </Link>
            ))}
            <span className={classes.teamHead}>{teamLabel}</span>
          </div>
          {rows.map((r) => (
            <div key={r.label} className={classes.gridRow} style={{ gridTemplateColumns: columns }}>
              <span className={classes.rowLabel}>{r.label}</span>
              {r.cells.map((c, i) => (
                <span key={i} className={classes.cell} data-tone={c.tone} data-bench={i >= five.length || undefined}>
                  {c.text}
                </span>
              ))}
              <span className={classes.teamCell} data-tone={r.teamTone}>
                {r.team}
              </span>
            </div>
          ))}
        </Box>
      </Box>

      {view === "profile" && (
        <>
          <Group gap="lg" px="md" pt="sm" className={classes.legend}>
            <span>
              <i data-tone="better" /> 2 or more above the five
            </span>
            <span>
              <i data-tone="worse" /> 2 or more below the five
            </span>
          </Group>
          <div className={classes.insight}>
            <IconAlertTriangle size={22} stroke={1.8} color="var(--worse)" style={{ flex: "none" }} />
            <Text fz="sm" lh={1.45} style={{ flex: "1 1 320px" }}>
              <b>
                {ATTRIBUTE_NAMES[weakest]} is the soft spot: {avg[weakest].toFixed(1)} on average.
              </b>{" "}
              <Text span c="gray.4" inherit>
                {pulling.length > 0 && `${pulling.map((p) => `${p.name} (${p.attributes[weakest]})`).join(" and ")} pull${pulling.length === 1 ? "s" : ""} it down.`}
                {advice}
              </Text>
            </Text>
            {squad.is_mine && (
              <Button component={Link} to={`/career/${career.id}/training`} variant="default" size="xs">
                Training
              </Button>
            )}
          </div>
        </>
      )}
      {view !== "profile" && <Box h={16} />}
    </Section>
  );
}

/** A staff member on one line: who, what they are good at, how good overall. */
function StaffLine({ person, kind }: { person: StaffRow | null; kind: "coach" | "analyst" }) {
  const { career } = useCareer();
  if (!person) {
    return (
      <Group className={classes.staffLine} gap="sm">
        <Text fz="sm" c="dimmed">
          No {STAFF_KIND_NAMES[kind].toLowerCase()}. The team works as if it had a weak one.
        </Text>
      </Group>
    );
  }
  return (
    <Group className={classes.staffLine} gap="sm" wrap="nowrap">
      <PlayerPhoto photo={person.photo} name={person.name} size={40} ring={kind === "analyst" ? "var(--teal)" : undefined} />
      <Stack gap={2} style={{ flex: 1 }} miw={0}>
        <Text fz="md" fw={700} truncate>
          <Link to={`/career/${career.id}/staff/${person.id}`} className="link">
            {person.name}
          </Link>{" "}
          <Text span fz="sm" c="dimmed" fw={500}>
            · {STAFF_KIND_NAMES[kind].toLowerCase()}
          </Text>
        </Text>
        <Text fz="xs" c="dimmed" truncate>
          {Object.entries(person.attributes)
            .map(([a, v]) => `${STAFF_ATTRIBUTES[a]?.name ?? a} ${v}`)
            .join(" · ")}
        </Text>
      </Stack>
      <Ovr value={person.overall} size="md" plain />
    </Group>
  );
}

function TacticsPanel({ tactics }: { tactics: Tactics }) {
  const { act, busy } = useCareer();
  const [draft, setDraft] = useState(tactics);
  const changed = JSON.stringify(draft) !== JSON.stringify(tactics);
  return (
    <Section title="Tactics">
      <Stack gap="sm">
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Game plan
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.style}
            onChange={(v) => setDraft({ ...draft, style: v as Tactics["style"] })}
            data={[
              { value: "early", label: "Early game" },
              { value: "balanced", label: "Balanced" },
              { value: "scaling", label: "Scaling" },
            ]}
          />
        </Stack>
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Jungle focus
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.lane}
            onChange={(v) => setDraft({ ...draft, lane: v as Tactics["lane"] })}
            data={[
              { value: "top", label: "Top" },
              { value: "mid", label: "Mid" },
              { value: "bot", label: "Bot" },
            ]}
          />
        </Stack>
        <Stack gap={4}>
          <Text fz="sm" fw={600}>
            Objectives
          </Text>
          <SegmentedControl
            fullWidth
            value={draft.objectives}
            onChange={(v) => setDraft({ ...draft, objectives: v as Tactics["objectives"] })}
            data={[
              { value: "dragons", label: "Dragons" },
              { value: "balanced", label: "Balanced" },
              { value: "barons", label: "Grubs & Baron" },
            ]}
          />
        </Stack>
        <Text fz="xs" c="dimmed">
          A game plan that matches your champions' power curve is worth about a point of team strength.
        </Text>
        <Button disabled={!changed} loading={busy} onClick={() => act({ type: "set_tactics", tactics: draft })}>
          Save tactics
        </Button>
      </Stack>
    </Section>
  );
}

function LineupPanel({ squad }: { squad: SquadView }) {
  const { act, busy } = useCareer();
  const [lineup, setLineup] = useState(squad.lineup as Record<Role, string>);
  const changed = JSON.stringify(lineup) !== JSON.stringify(squad.lineup);
  return (
    <Section title="Starting five">
      <Stack gap="xs">
        {ROLES.map((r) => (
          <Select
            key={r}
            leftSection={<RoleIcon role={r} size={16} />}
            value={lineup[r]}
            allowDeselect={false}
            onChange={(v) => v && setLineup({ ...lineup, [r]: v })}
            data={squad.players.map((p) => ({ value: p.id, label: `${p.name} · ${p.role} ${p.overall}` }))}
          />
        ))}
        <Button disabled={!changed} loading={busy} onClick={() => act({ type: "set_lineup", lineup })}>
          Save lineup
        </Button>
      </Stack>
    </Section>
  );
}
