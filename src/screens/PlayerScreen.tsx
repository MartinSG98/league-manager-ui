import { Badge, Box, Button, Group, Modal, Paper, Progress, Radio, SegmentedControl, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBinoculars, IconCrown } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { FranchiseChange, FranchiseReason, PlayerDetail, PoolChampion } from "../api/types";
import { AttributeRadar } from "../components/AttributeRadar";
import { ContractPanel } from "../components/ContractPanel";
import { PlayerReport } from "../components/PlayerReport";
import { ShortlistButton } from "../components/ShortlistButton";
import { TransferPanel } from "../components/TransferPanel";
import { ChampIcon, PlayerPhoto, PlayerPortrait, RoleIcon, SplashBackdrop, TeamLogo } from "../components/Media";
import { Empty, FormArrow, Loading, Meter, Ovr, Screen, Section, Stat } from "../components/Ui";
import { ATTRIBUTE_NAMES, flag, longDate, money, ROLE_NAMES, shortDate, signed, vars } from "../lib/format";
import { ATTRS, teamAverages } from "../lib/squad";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import classes from "./Screens.module.css";

const ATTRIBUTE_HINTS: Record<string, string> = {
  mechanics: "KDA, solo kills and damage per minute",
  laning: "Gold, CS and XP difference at 15 minutes",
  teamfighting: "Kill participation, damage share and staying alive",
  vision: "Vision score, wards cleared and vision share",
  macro: "Win rate and early gold leads",
  consistency: "Few deaths, steady KDA, rarely first blood",
  composure: "Career games and winning under pressure",
  champion_pool: "Champions with five or more career games",
};

const STATS_2026: { key: string; label: string; digits?: number; pct?: boolean }[] = [
  { key: "games", label: "Games" },
  { key: "winrate", label: "Win rate", pct: true },
  { key: "kda", label: "KDA", digits: 1 },
  { key: "kills", label: "Kills / game", digits: 1 },
  { key: "deaths", label: "Deaths / game", digits: 1 },
  { key: "assists", label: "Assists / game", digits: 1 },
  { key: "csm", label: "CS / min", digits: 1 },
  { key: "kp", label: "Kill participation", pct: true },
  { key: "dmg_share", label: "Damage share", pct: true },
  { key: "dpm", label: "Damage / min" },
  { key: "vspm", label: "Vision / min", digits: 2 },
  { key: "gd15", label: "Gold diff @15" },
  { key: "csd15", label: "CS diff @15" },
  { key: "xpd15", label: "XP diff @15" },
  { key: "solo_kills", label: "Solo kills" },
];

/** Two or three sentences a manager can act on: ceiling, what stands out against the team, form. */
function verdict(d: PlayerDetail, avg: Record<string, number> | null): string {
  const out: string[] = [];
  out.push(d.overall >= d.potential ? `At the peak: ${d.overall} of ${d.potential}.` : `Room to grow: ${d.overall} now, ${d.potential} potential.`);
  const name = (k: string) => ATTRIBUTE_NAMES[k];
  if (avg) {
    const deltas = ATTRS.map((k) => [k, d.attributes[k] - avg[k]] as const).sort((a, b) => b[1] - a[1]);
    const [up, upBy] = deltas[0];
    const [down, downBy] = deltas[deltas.length - 1];
    if (upBy >= 1.5) out.push(`${name(up)} (${d.attributes[up]}) is well above the team's level.`);
    else out.push(`Best at ${name(up).toLowerCase()} (${d.attributes[up]}).`);
    if (downBy <= -1.5) out.push(`${name(down)} (${d.attributes[down]}) is the one to work on.`);
  } else {
    const ranked = [...ATTRS].sort((a, b) => d.attributes[b] - d.attributes[a]);
    const low = ranked[ranked.length - 1];
    out.push(`Best at ${name(ranked[0]).toLowerCase()} (${d.attributes[ranked[0]]}), weakest at ${name(low).toLowerCase()} (${d.attributes[low]}).`);
  }
  if (d.form >= 1) out.push("In form.");
  else if (d.form <= -1) out.push("Out of form.");
  return out.slice(0, 3).join(" ");
}

export function PlayerScreen() {
  const { player } = useParams();
  const { career, revision } = useCareer();
  const catalog = useCatalog();
  const p = useApi(() => api.player(career.id, player!), [career.id, player, revision]);
  const teamId = p.data?.team ?? null;
  const squad = useApi(() => (teamId ? api.squad(career.id, teamId) : Promise.resolve(null)), [career.id, teamId, revision]);
  if (!p.data) return <Loading />;
  const d = p.data;
  const team = d.team ? catalog.teams.find((t) => t.id === d.team) : null;
  const signature = d.signatures[0] ?? d.pool[0]?.champion;
  const mine = d.team === career.team.id;

  const five = squad.data && squad.data.team.id === d.team ? Object.values(squad.data.lineup).map((id) => squad.data!.players.find((x) => x.id === id)).filter((x): x is PlayerDetail => !!x) : [];
  const avg = five.length === 5 ? teamAverages(five) : null;

  const report = d.shortlist?.report ?? null;
  const take = report ? report.verdict : verdict(d, avg);
  const takeBy = report ? `${report.analyst ?? "The analyst"}'s report` : mine ? `${career.staff.analyst?.name ?? "Your analyst"}'s take` : "At a glance";

  return (
    <Screen>
      <Box style={vars({ "--team": team?.color ?? "#c8aa6e" })}>
        <Paper radius={14} className={classes.hero} mb="lg">
          <SplashBackdrop id={signature} strength={0.6} position="center 20%" />
          <div className={classes.glow} aria-hidden />
          <Group className={classes.heroInner} align="flex-end" wrap="wrap" gap="xl">
            <Box w={200} style={{ flex: "none" }}>
              <PlayerPortrait photo={d.photo} name={d.name} color={team?.color} height={230} />
            </Box>
            <Stack gap={8} style={{ flex: "1 1 380px", minWidth: 0 }}>
              <Group gap="xs">
                <RoleIcon role={d.role} size={20} />
                <Text className="eyebrow">{ROLE_NAMES[d.role]}</Text>
                {d.franchise && <Text className={classes.franchise}>Franchise player</Text>}
                {mine && career.franchise_choice && !d.retired && <MakeFranchise player={d.id} name={d.name} until={career.franchise_choice} />}
                {mine && d.franchise_change && !d.retired && <ChangeFranchise player={d.id} name={d.name} change={d.franchise_change} />}
                {d.retired && (
                  <Badge size="sm" color="gray" variant="light">
                    retired
                  </Badge>
                )}
                {d.retiring && (
                  <Badge size="sm" color="orange" variant="light">
                    retires after the {d.retiring} season
                  </Badge>
                )}
                {d.rookie && (
                  <Badge size="sm" color="lime" variant="light">
                    rookie · {d.origin ? `came through ${d.origin.name}` : "straight from solo queue"}
                  </Badge>
                )}
                {d.status
                  .filter((s) => s !== "Sharp")
                  .map((s) => (
                    <Badge key={s} size="sm" color="orange" variant="light">
                      {s}
                    </Badge>
                  ))}
              </Group>
              <Text className="display" fz={68} lh={0.95}>
                {d.name}
              </Text>
              <Group gap="sm" wrap="wrap">
                <Text fz="lg" c="gray.3">
                  {flag(d.country)} {d.real_name ?? d.country}
                </Text>
                {team ? (
                  <Link to={`/career/${career.id}/team/${team.id}`} className="link">
                    <Group gap={8}>
                      <TeamLogo team={team} size={26} />
                      <Text fw={700}>{team.name}</Text>
                    </Group>
                  </Link>
                ) : (
                  <Badge variant="light" color="hextech">
                    Free agent
                  </Badge>
                )}
                {!d.rookie && d.origin && d.origin.id !== d.team && (
                  <Text fz="sm" c="dimmed">
                    {d.origin.name} in 2026
                  </Text>
                )}
              </Group>
              <div className={classes.read}>
                <PlayerPhoto photo={career.staff.analyst?.photo} name={report?.analyst ?? career.staff.analyst?.name ?? "Analyst"} size={34} ring="var(--teal)" />
                <Stack gap={2} miw={0}>
                  <Text fz="xs" c="dimmed" fw={600}>
                    {takeBy}
                  </Text>
                  <Text fz="md" lh={1.45}>
                    {take}
                  </Text>
                </Stack>
              </div>
            </Stack>
            <Group gap={32} wrap="nowrap" align="flex-end">
              <Stack gap={0} align="center">
                <Text className="label">Overall</Text>
                <Ovr value={d.overall} size="xl" plain={mine} />
                <Text fz="xs" fw={700} c="dimmed">
                  {d.potential > d.overall ? `potential ${d.potential}` : "at peak"}
                </Text>
              </Stack>
              <Stat
                label={d.team ? "Value" : "Market value"}
                value={money(d.market.value)}
                size={36}
                sub={d.contract_until ? `salary ${money(d.salary)} · to ${d.contract_until}` : `asks about ${money(d.salary)} a season`}
              />
            </Group>
          </Group>
        </Paper>

        <div className={classes.strip} role="list" aria-label="Condition">
          <div role="listitem">
            <Text className="label">Form</Text>
            <Group gap={8} mt={4}>
              <FormArrow value={d.form} />
              <Text fw={700} fz="lg">
                {signed(d.form, 1)}
              </Text>
            </Group>
          </div>
          <div role="listitem">
            <Text className="label">Morale</Text>
            <Group gap={10} mt={8} wrap="nowrap">
              <Meter value={d.morale} color={d.morale >= 60 ? "teal" : "orange"} w={90} />
              <Text fw={700}>{d.morale}</Text>
            </Group>
          </div>
          <div role="listitem">
            <Text className="label">Sharpness · fatigue</Text>
            <Text fw={700} fz="lg" mt={4}>
              {d.sharpness}{" "}
              <Text span c="dimmed" inherit>
                ·
              </Text>{" "}
              {d.fatigue}
            </Text>
          </div>
          <div role="listitem">
            <Text className="label">Development</Text>
            <Text fw={700} fz="lg" mt={4}>
              {d.development}
            </Text>
          </div>
          <div role="listitem">
            <Text className="label">Own training</Text>
            <Text fw={700} fz="lg" mt={4} truncate>
              {d.training.attribute
                ? ATTRIBUTE_NAMES[d.training.attribute]
                : d.training.champion
                  ? `Learns ${catalog.champion[d.training.champion]?.name ?? d.training.champion}`
                  : "Nothing set"}
              {mine && (
                <Link to={`/career/${career.id}/training`} className={classes.inlineLink}>
                  Change
                </Link>
              )}
            </Text>
          </div>
        </div>

        {/* The decisions about the player, side by side: a bid or the transfer list, the scout report, the contract. */}
        <Box className={classes.panels}>
          {career.phase !== "draft" && d.team && <TransferPanel player={d} />}
          {career.phase !== "draft" && d.team !== career.team.id && <ScoutPanel player={d} />}
          {(career.phase !== "draft" || d.team === career.team.id) && <ContractPanel player={d} />}
        </Box>

        <div className={classes.row}>
          <Section title="Attributes" className={classes.grow1}>
            <Group gap="lg" align="center" wrap="wrap">
              <Box style={{ flex: "1 1 340px", minWidth: 0 }}>
                <AttributeRadar values={d.attributes} compare={avg} name={d.name} />
              </Box>
              <Stack gap="md" style={{ flex: "1 1 190px", minWidth: 0 }}>
                {avg ? <AgainstTeam d={d} avg={avg} /> : <AttributeList d={d} />}
                <Text fz="xs" c="dimmed" lh={1.5}>
                  <Tooltip label="A style, not a quality: first bloods and solo kills">
                    <span>Aggression {d.aggression}</span>
                  </Tooltip>
                  {" · "}
                  <Tooltip label="Shotcalling, worth chemistry when it is high">
                    <span>leadership {d.leadership}</span>
                  </Tooltip>
                  <br />
                  Speaks {d.languages.join(", ")} · {d.experience} career games · reputation {d.reputation}
                </Text>
              </Stack>
            </Group>
          </Section>
          <Numbers d={d} />
        </div>

        <Pool d={d} />
      </Box>
    </Screen>
  );
}

/** What stands out against the team's five, both ways. */
function AgainstTeam({ d, avg }: { d: PlayerDetail; avg: Record<string, number> }) {
  const deltas = ATTRS.map((k) => ({ k, by: d.attributes[k] - avg[k] })).sort((a, b) => b.by - a.by);
  const above = deltas.filter((x) => x.by >= 0.5).slice(0, 3);
  const below = deltas.filter((x) => x.by <= -0.5).reverse().slice(0, 3);
  const line = (x: { k: string; by: number }) => (
    <Tooltip key={x.k} label={ATTRIBUTE_HINTS[x.k]} position="left">
      <Group justify="space-between" fz="sm" py={3}>
        <span>
          {ATTRIBUTE_NAMES[x.k]} <Text span c="dimmed" inherit>{d.attributes[x.k]}</Text>
        </span>
        <b className={x.by > 0 ? "gain" : classes.worse}>{signed(x.by, 1)}</b>
      </Group>
    </Tooltip>
  );
  return (
    <>
      <Stack gap={0}>
        <Text className="label" mb={4}>
          Above the five
        </Text>
        {above.length ? above.map(line) : <Text fz="sm" c="dimmed">Nothing stands out.</Text>}
      </Stack>
      <Stack gap={0}>
        <Text className="label" mb={4}>
          Below the five
        </Text>
        {below.length ? below.map(line) : <Text fz="sm" c="dimmed">Nothing holds them back.</Text>}
      </Stack>
    </>
  );
}

/** Without a team to compare with: the attributes, best first. */
function AttributeList({ d }: { d: PlayerDetail }) {
  return (
    <Stack gap={0}>
      {[...ATTRS]
        .sort((a, b) => d.attributes[b] - d.attributes[a])
        .map((k) => (
          <Tooltip key={k} label={ATTRIBUTE_HINTS[k]} position="left">
            <Group justify="space-between" fz="sm" py={3}>
              <span>{ATTRIBUTE_NAMES[k]}</span>
              <b>{d.attributes[k]}</b>
            </Group>
          </Tooltip>
        ))}
    </Stack>
  );
}

function stat(d: PlayerDetail, key: string, digits = 0): string {
  const raw = d.stats_2026[key];
  return typeof raw === "number" ? raw.toFixed(digits) : "—";
}

/** Four numbers that tell the story, for this season or for 2026, and the rest on request. */
function Numbers({ d }: { d: PlayerDetail }) {
  const has2026 = typeof d.stats_2026.games === "number" && (d.stats_2026.games as number) > 0;
  const [tab, setTab] = useState(d.season.games > 0 || !has2026 ? "season" : "2026");
  const [all, setAll] = useState(false);
  const s = d.season;
  const n = (key: string) => (typeof d.stats_2026[key] === "number" ? (d.stats_2026[key] as number) : 0);

  return (
    <Section
      title="In numbers"
      className={classes.grow1}
      right={
        <SegmentedControl
          size="xs"
          value={tab}
          onChange={setTab}
          data={[
            { value: "season", label: "This season" },
            { value: "2026", label: "2026" },
          ]}
        />
      }
    >
      {tab === "season" ? (
        s.games === 0 ? (
          <Empty>No games this season yet.</Empty>
        ) : (
          <Stack gap="md">
            <SimpleGrid cols={2} spacing="sm">
              <Tile label="Won" value={`${s.wins}–${s.games - s.wins}`} sub={`${s.games} games`} />
              <Tile label="KDA" value={String(s.kda)} sub={`${s.kills} / ${s.deaths} / ${s.assists} in all`} />
              <Tile label="Average rating" value={String(s.rating ?? "—")} sub={`${s.mvps} MVP${s.mvps === 1 ? "" : "s"}`} />
              <Tile label="CS a minute" value={String(s.cs_per_min)} />
            </SimpleGrid>
            {s.champions.length > 0 && (
              <Group gap="xs">
                {s.champions.map(([c, count]) => (
                  <Group key={c} gap={4}>
                    <ChampIcon id={c} size={28} />
                    <Text fz="xs" c="dimmed">
                      ×{count}
                    </Text>
                  </Group>
                ))}
              </Group>
            )}
          </Stack>
        )
      ) : !has2026 ? (
        <Empty>No 2026 games on record.</Empty>
      ) : (
        <Stack gap="md">
          <SimpleGrid cols={2} spacing="sm">
            <Tile label="Win rate" value={`${stat(d, "winrate", 1)}%`} sub={`${stat(d, "games")} games`} />
            <Tile label="KDA" value={stat(d, "kda", 1)} sub={`${stat(d, "kills", 1)} / ${stat(d, "deaths", 1)} / ${stat(d, "assists", 1)} a game`} />
            <Tile label="Damage a minute" value={stat(d, "dpm")} sub={`${stat(d, "dmg_share", 1)}% of the team's damage`} />
            <Tile
              label="Gold lead at 15"
              value={signed(n("gd15"))}
              tone={n("gd15") > 0 ? "gain" : n("gd15") < 0 ? classes.worse : undefined}
              sub={`${signed(n("csd15"))} CS, ${signed(n("xpd15"))} XP`}
            />
          </SimpleGrid>
          {all && (
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
              {STATS_2026.map((x) => {
                const raw = d.stats_2026[x.key];
                const value = typeof raw === "number" ? (x.digits ? raw.toFixed(x.digits) : String(Math.round(raw))) : "—";
                return <Mini key={x.key} label={x.label} value={`${value}${x.pct && typeof raw === "number" ? "%" : ""}`} />;
              })}
            </SimpleGrid>
          )}
          <Group>
            <Button variant="default" size="xs" onClick={() => setAll(!all)} aria-expanded={all}>
              {all ? "Show fewer" : `All ${STATS_2026.length} stats`}
            </Button>
          </Group>
        </Stack>
      )}
    </Section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Box className={classes.tile}>
      <Text fz="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text className={`display ${tone ?? ""}`} fz={34} lh={1.05}>
        {value}
      </Text>
      {sub && (
        <Text fz="xs" c="dimmed">
          {sub}
        </Text>
      )}
    </Box>
  );
}

/** The champions they are known for, the ones this patch favours, and the whole pool on request. */
function Pool({ d }: { d: PlayerDetail }) {
  const { career } = useCareer();
  const catalog = useCatalog();
  const [all, setAll] = useState(false);
  const signature = d.pool.filter((c) => c.games > 0).sort((a, b) => b.games - a.games).slice(0, 3);
  const patch = d.pool
    .filter((c) => !signature.includes(c) && c.meta >= 0.8 && c.mastery >= 40)
    .sort((a, b) => b.meta - a.meta)
    .slice(0, 4);
  const name = (c: PoolChampion) => catalog.champion[c.champion]?.name ?? c.champion;
  const line = (c: PoolChampion, onPatch: boolean) => (
    <Group key={c.champion} gap="sm" wrap="nowrap" py={6}>
      <ChampIcon id={c.champion} size={40} radius={8} />
      <Stack gap={5} style={{ flex: 1 }} miw={0}>
        <Group justify="space-between" wrap="nowrap" gap={6}>
          <Text fw={700} fz="sm" truncate>
            {name(c)}{" "}
            {onPatch && (
              <Text span c="hextech.4" fw={700} inherit>
                {signed(c.meta, 1)}
              </Text>
            )}
          </Text>
          <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {c.games ? `${c.games} games${c.winrate !== null ? ` · ${c.winrate}%` : ""}` : "learned in training"}
          </Text>
        </Group>
        <Progress value={c.mastery} color={onPatch ? "hextech" : "gold"} size={5} radius="xl" />
      </Stack>
    </Group>
  );

  return (
    <Section
      title="Champion pool"
      right={
        <Button variant="subtle" size="xs" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Full pool · ${d.pool.length}`}
        </Button>
      }
    >
      {all ? (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="xs">
          {d.pool.map((c) => (
            <Group key={c.champion} gap="sm" wrap="nowrap" className={classes.poolItem}>
              <ChampIcon id={c.champion} size={38} />
              <Stack gap={3} miw={0} style={{ flex: 1 }}>
                <Group justify="space-between" wrap="nowrap" gap={6}>
                  <Text fw={700} fz="sm" truncate>
                    {name(c)}
                  </Text>
                  <Tooltip label={`Meta power on patch ${career.patch}`}>
                    <Text fz="xs" fw={700} className={c.meta >= 0 ? "gain" : "loss"}>
                      {signed(c.meta, 1)}
                    </Text>
                  </Tooltip>
                </Group>
                <Progress value={c.mastery} color="gold" size="xs" radius="xl" />
                <Text fz={11} c="dimmed">
                  {c.games ? `${c.games} games${c.winrate !== null ? ` · ${c.winrate}% won` : ""}` : "learned in training"} · mastery {c.mastery}
                </Text>
              </Stack>
            </Group>
          ))}
        </SimpleGrid>
      ) : (
        <div className={classes.row} style={{ marginBottom: 0, gap: 28 }}>
          <Stack gap={0} className={classes.grow1}>
            <Text className="label" mb={4}>
              Signature
            </Text>
            {signature.length ? signature.map((c) => line(c, false)) : <Text fz="sm" c="dimmed">No games on record yet.</Text>}
          </Stack>
          <Stack gap={0} className={classes.grow1}>
            <Text className="label" mb={4}>
              Strong on patch {career.patch}
            </Text>
            {patch.length ? patch.map((c) => line(c, true)) : <Text fz="sm" c="dimmed">Nothing else in the pool is strong on this patch.</Text>}
          </Stack>
        </div>
      )}
      <Text fz="xs" c="dimmed" mt="sm">
        Bars show mastery out of 100.
      </Text>
    </Section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Text fz={11} c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fw={800} fz="lg" className="display">
        {value}
      </Text>
    </Stack>
  );
}

/** The shortlist button and the analyst's latest report on the player. */
function ScoutPanel({ player: d }: { player: PlayerDetail }) {
  const { act, busy } = useCareer();
  const entry = d.shortlist;
  return (
    <Section title="Scout report" right={<ShortlistButton player={d.id} />}>
      {!entry ? (
        <Empty>Add {d.name} to your shortlist and the analyst goes to watch them, then sends a report.</Empty>
      ) : (
        <Stack gap="md">
          {entry.report && <PlayerReport report={entry.report} />}
          {entry.due ? (
            <Text fz="sm" c="dimmed">
              The analyst is watching {d.name}: {entry.report ? "a new" : "the"} report is due on {longDate(entry.due)}.
            </Text>
          ) : (
            <Group>
              <Button variant="light" leftSection={<IconBinoculars size={16} />} disabled={busy} onClick={() => act({ type: "scout_player", player: d.id })}>
                Ask for a new report
              </Button>
              <Text fz="xs" c="dimmed">
                Every new report narrows the potential estimate.
              </Text>
            </Group>
          )}
        </Stack>
      )}
    </Section>
  );
}

/** While the club has a franchise player: ask the board to make this one the face of the club instead. */
function ChangeFranchise({ player, name, change }: { player: string; name: string; change: FranchiseChange }) {
  const { act, busy } = useCareer();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FranchiseReason | null>(null);

  async function ask() {
    const result = await act({ type: "change_franchise", player, reason: change.trusted ? null : reason });
    if (!result) return;
    setOpen(false);
    // The board's answer is the newest board message (the inbox comes newest first).
    const answer = result.career.inbox.find((m) => m.kind === "board");
    const agreed = answer?.subject === `${name} is the new franchise player`;
    notifications.show({ color: agreed ? "teal" : "orange", title: answer?.subject ?? "The board has answered", message: answer?.body });
  }

  return (
    <>
      <Tooltip label={change.problem ?? `Ask the board to make ${name} the franchise player instead of ${change.current}`} multiline w={280}>
        <span>
          <Button size="compact-xs" variant="light" color="gold" leftSection={<IconCrown size={12} />} disabled={busy || !!change.problem} onClick={() => setOpen(true)}>
            Make franchise player
          </Button>
        </span>
      </Tooltip>
      {open && (
        <Modal opened onClose={() => setOpen(false)} centered title={<Text fw={800}>A new franchise player</Text>}>
          <Stack gap="md">
            <Text fz="sm">
              {name} would take over from {change.current} as the face of the club: not for sale unless a club bids twice his value, never
              released, kept on when the contract runs out. {change.current} would be an ordinary member of the squad.
            </Text>
            {change.trusted ? (
              <Text fz="sm" c="teal.4">
                The board trusts your judgement and will agree.
              </Text>
            ) : (
              <>
                <Text fz="sm">
                  The board wants to know why. It weighs your answer against the facts and its confidence in you. If it says no, it will not hear of it
                  again this season, and an answer the facts do not bear out costs you some of its confidence.
                </Text>
                <Radio.Group value={reason} onChange={(v) => setReason(v as FranchiseReason)}>
                  <Stack gap="xs">
                    {change.reasons.map((r) => (
                      <Radio key={r.id} value={r.id} label={r.text} />
                    ))}
                  </Stack>
                </Radio.Group>
              </>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={busy} disabled={!change.trusted && !reason} onClick={ask}>
                Ask the board
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </>
  );
}

/** While the club has no franchise player: make this one the face of the club. */
function MakeFranchise({ player, name, until }: { player: string; name: string; until: string }) {
  const { act, busy } = useCareer();
  return (
    <Tooltip label={`Name ${name} the franchise player by ${shortDate(until)}: not for sale unless a club bids twice his value, never released, kept on when the contract ends`} multiline w={280}>
      <Button size="compact-xs" color="gold" disabled={busy} onClick={() => act({ type: "set_franchise", player })}>
        Make franchise player
      </Button>
    </Tooltip>
  );
}
