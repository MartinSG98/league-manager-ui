import { AppShell, Badge, Box, Button, Group, NavLink, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconArrowLeft, IconBarbell, IconBuildingSkyscraper, IconCalendar, IconChartBar, IconHome, IconMail, IconPlayerPlayFilled,
  IconSwords, IconTransfer, IconTrophy, IconUserSearch, IconUsersGroup, IconWand,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { BoardMeeting } from "../components/BoardMeeting";
import { DrawPrompt } from "../components/DrawPrompt";
import { JobOffers } from "../components/JobOffers";
import { LeagueLogo, TeamLogo } from "../components/Media";
import { SeasonTrack } from "../components/SeasonTrack";
import { Stars } from "../components/Stars";
import { Meter } from "../components/Ui";
import { dayLabel, money, shortDate, vars, whenLabel } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./CareerLayout.module.css";

type NavItem = { to: string; label: string; icon: typeof IconHome; show?: boolean; badge?: string };

export function CareerLayout() {
  const { career, act, busy, revision } = useCareer();
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/career/${career.id}`;
  const comps = useApi(() => api.competitions(career.id), [career.id, revision]);

  const pending = career.pending.offers + career.pending.talks;
  const next = career.next_match;
  const opponent = next ? (next.home?.id === career.team.id ? next.away : next.home) : null;

  async function proceed() {
    if (career.board.meeting || career.board.sacked) return;
    if (career.phase === "draft") return navigate(`${base}/draft`);
    if (career.live) return navigate(`${base}/match`);
    if (pending > 0) return navigate(`${base}/transfers`);
    const result = await act({ type: "advance" });
    if (result?.career.live) navigate(`${base}/match`);
    else if (result && (result.career.pending.offers || result.career.pending.talks)) navigate(`${base}/transfers`);
  }

  // The button says what it does next, and its second line says where that leads.
  let label = "Continue";
  let sub: string | null = null;
  if (career.board.sacked) [label, sub] = ["Choose a club", "Offers from other clubs"];
  else if (career.board.meeting) [label, sub] = ["Board meeting", "Agree the season's objectives"];
  else if (career.phase === "draft") [label, sub] = career.draft?.my_turn ? ["Your pick", "You are on the clock"] : ["Draft room", career.draft ? `Pick ${career.draft.number} of ${career.draft.total}` : null];
  else if (career.live) [label, sub] = ["Match day", opponent ? `vs ${opponent.name}` : null];
  else if (pending > 0) [label, sub] = ["Answer the offers", `${pending} waiting for you`];
  else if (next && opponent) sub = `Next: ${opponent.tag} · ${whenLabel(next.day, career.day)}`;
  else if (career.window) sub = `Window closes ${shortDate(career.window.closes)}`;
  const urgent = !!career.live || !!career.draft?.my_turn || pending > 0 || career.board.meeting;

  const groups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { to: base, label: "Home", icon: IconHome },
        { to: `${base}/inbox`, label: "Inbox", icon: IconMail, badge: career.unread ? String(career.unread) : undefined },
        { to: `${base}/draft`, label: "Draft room", icon: IconWand, show: career.phase === "draft", badge: career.draft?.my_turn ? "!" : undefined },
        { to: `${base}/match`, label: "Match day", icon: IconSwords, show: !!career.live, badge: "LIVE" },
      ],
    },
    {
      label: "Team",
      items: [
        { to: `${base}/squad`, label: "Squad", icon: IconUsersGroup },
        { to: `${base}/training`, label: "Training", icon: IconBarbell, show: career.phase !== "draft" },
      ],
    },
    {
      label: "Club",
      items: [
        { to: `${base}/transfers`, label: "Transfers", icon: IconTransfer, badge: pending ? String(pending) : career.window ? "OPEN" : undefined },
        { to: `${base}/club`, label: "Board & finances", icon: IconBuildingSkyscraper, badge: career.board.warned ? "!" : undefined },
      ],
    },
    {
      label: "League",
      items: [
        { to: `${base}/schedule`, label: "Schedule", icon: IconCalendar },
        { to: `${base}/competitions`, label: "Competitions", icon: IconTrophy },
        { to: `${base}/players`, label: "Scouting", icon: IconUserSearch },
        { to: `${base}/meta`, label: "Meta & patches", icon: IconChartBar },
      ],
    },
  ];

  const boardColor = career.board.confidence >= 45 ? "teal" : career.board.confidence >= 22 ? "orange" : "red";

  return (
    <AppShell header={{ height: 72 }} navbar={{ width: 236, breakpoint: "sm" }} padding={0} style={vars({ "--team": career.team.color })}>
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="lg" gap="xl" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ flex: "none" }}>
            <LeagueLogo logo={career.league_logo} name={career.league} size={36} />
            <Stack gap={0}>
              <Text className="eyebrow">Season {career.season}</Text>
              <Text fw={700} fz="md" style={{ whiteSpace: "nowrap" }}>
                {dayLabel(career.day)}
              </Text>
            </Stack>
          </Group>

          <Box visibleFrom="md" style={{ flex: "1 1 360px", minWidth: 0, maxWidth: 760, display: "flex" }}>
            {comps.data && <SeasonTrack comps={comps.data} league={career.league} today={career.day} team={career.team.id} careerId={career.id} />}
          </Box>

          <Box style={{ flex: 1 }} />

          <Group gap="lg" wrap="nowrap" style={{ flex: "none" }}>
            <Stack gap={4} visibleFrom="xl">
              <Text className="label">Payroll</Text>
              <Group gap="xs" wrap="nowrap">
                <Meter value={career.payroll} max={career.budget} w={64} color={career.payroll > career.budget ? "red" : "gold"} />
                <Text fz="sm" fw={700} style={{ whiteSpace: "nowrap" }}>
                  {money(career.payroll)}{" "}
                  <Text span c="dimmed" fz="sm" fw={500}>
                    / {money(career.budget)}
                  </Text>
                </Text>
              </Group>
            </Stack>
            <Tooltip label={`Board confidence ${career.board.confidence} of 100`}>
              <UnstyledButton component={Link} to={`${base}/club`} className={classes.chip} data-tone={boardColor} visibleFrom="lg">
                <span className={classes.dot} />
                Board · {career.board.security}
              </UnstyledButton>
            </Tooltip>
            {career.cash < 0 && (
              <Tooltip label="In debt: the board loses confidence every week until the bank is back above zero">
                <UnstyledButton component={Link} to={`${base}/club`} className={classes.chip} data-tone="orange">
                  <span className={classes.dot} />
                  Bank {money(career.cash)}
                </UnstyledButton>
              </Tooltip>
            )}
            <Button
              h={52}
              color={urgent ? "gold" : "hextech"}
              variant={urgent ? "filled" : "light"}
              loading={busy}
              rightSection={<IconPlayerPlayFilled size={16} />}
              onClick={proceed}
              className={classes.continue}
            >
              <span className={classes.continueText}>
                <span className={classes.continueLabel}>{label}</span>
                {sub && <span className={classes.continueSub}>{sub}</span>}
              </span>
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className={classes.navbar}>
        <Stack gap="lg" p="md" h="100%">
          <Group gap="sm" wrap="nowrap" className={classes.club}>
            <TeamLogo team={career.team} size={48} />
            <Stack gap={2} miw={0}>
              <Text fw={800} fz="md" lh={1.15}>
                {career.team.name}
              </Text>
              <Stars value={career.reputation.team_stars} size={12} label={`Club reputation ${career.reputation.team}`} />
              <Text fz="xs" c="dimmed" truncate>
                {career.manager}
              </Text>
            </Stack>
          </Group>

          {groups.map((group, gi) => {
            const items = group.items.filter((i) => i.show !== false);
            if (items.length === 0) return null;
            return (
              <Stack key={gi} gap={2}>
                {group.label && <Text className={classes.groupLabel}>{group.label}</Text>}
                {items.map((i) => {
                  const active = i.to === base ? location.pathname === base : location.pathname.startsWith(i.to);
                  const alert = i.badge === "LIVE" || i.badge === "!";
                  return (
                    <NavLink
                      key={i.to}
                      component={Link}
                      to={i.to}
                      label={i.label}
                      active={active}
                      color="gray"
                      leftSection={<i.icon size={18} stroke={1.6} />}
                      rightSection={
                        i.badge !== undefined ? (
                          <Badge size="sm" color={alert ? "red" : "gold"} variant={alert || /^\d+$/.test(i.badge) ? "filled" : "light"}>
                            {i.badge}
                          </Badge>
                        ) : undefined
                      }
                      className={classes.navItem}
                    />
                  );
                })}
              </Stack>
            );
          })}

          <Box mt="auto">
            <Tooltip label="Your saves">
              <Button component={Link} to="/" variant="subtle" color="gray" size="xs" leftSection={<IconArrowLeft size={14} />}>
                Main menu
              </Button>
            </Tooltip>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <Outlet />
        {career.board.sacked ? (
          <JobOffers />
        ) : career.board.meeting ? (
          <BoardMeeting />
        ) : (
          career.draw && !location.pathname.endsWith("/match") && <DrawPrompt draw={career.draw} />
        )}
      </AppShell.Main>
    </AppShell>
  );
}
