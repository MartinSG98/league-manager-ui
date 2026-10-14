import { AppShell, Badge, Box, Button, Group, NavLink, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconArrowLeft, IconBarbell, IconBriefcase, IconBuildingSkyscraper, IconCalendar, IconChartBar, IconHome, IconMail, IconPlayerPlayFilled,
  IconSwords, IconTransfer, IconTrophy, IconUser, IconUserSearch, IconUsersGroup, IconWand,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { BoardMeeting } from "../components/BoardMeeting";
import { MusicControl } from "../components/ChampSelectMusic";
import { CreateManager } from "../components/CreateManager";
import { DrawPrompt } from "../components/DrawPrompt";
import { JobOffers } from "../components/JobOffers";
import { LeagueLogo, TeamLogo } from "../components/Media";
import { SeasonTrack } from "../components/SeasonTrack";
import { ClubStars } from "../components/Stars";
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
  // Only for the Job center's badge: a club that offers you its head coach job.
  const board = useApi(() => (career.phase === "draft" ? Promise.resolve(null) : api.board(career.id).catch(() => null)), [career.id, revision, career.phase]);
  const jobOffer = (board.data?.vacancies ?? []).some((v) => v.offer_until);

  const pending = career.pending.offers + career.pending.talks;
  const next = career.next_match;
  const opponent = next ? (next.home?.id === career.team.id ? next.away : next.home) : null;
  // Sacked: looking at the clubs that want you folds their offers into a bar until you go back to them.
  const [browsing, setBrowsing] = useState(false);
  // Unread mail comes before the next day, one message a press, oldest first, as in Football Manager.
  const unread = [...career.inbox].reverse().find((m) => !m.read);

  // A career whose manager is not created yet (null; a server from before managers sends nothing) waits for it.
  const creating = career.profile === null;

  async function proceed() {
    if (creating) return;
    if (career.board.sacked) return setBrowsing(false);
    if (career.board.meeting) return;
    if (career.phase === "draft") return navigate(`${base}/draft`);
    if (career.live) return navigate(`${base}/match`);
    if (pending > 0) return navigate(`${base}/transfers`);
    if (unread) return navigate(`${base}/inbox?m=${unread.id}`);
    const result = await act({ type: "advance" });
    if (result?.career.live) navigate(`${base}/match`);
    else if (result && (result.career.pending.offers || result.career.pending.talks)) navigate(`${base}/transfers`);
  }

  // The button says what it does next, and its second line says where that leads.
  let label = "Continue";
  let sub: string | null = null;
  if (creating) [label, sub] = ["Create your manager", "Before anything else"];
  else if (career.board.sacked) [label, sub] = ["Choose a club", "Offers from other clubs"];
  else if (career.board.meeting) [label, sub] = ["Board meeting", "Agree the season's objectives"];
  else if (career.phase === "draft") [label, sub] = career.draft?.my_turn ? ["Your pick", "You are on the clock"] : ["Draft room", career.draft ? `Pick ${career.draft.number} of ${career.draft.total}` : null];
  else if (career.live) [label, sub] = ["Match day", opponent ? `vs ${opponent.name}` : null];
  else if (pending > 0) [label, sub] = ["Answer the offers", `${pending} waiting for you`];
  else if (unread) [label, sub] = ["Next message", `${career.unread} unread`];
  else if (next && opponent) sub = `Next: ${opponent.tag} · ${whenLabel(next.day, career.day)}`;
  else if (career.window) sub = `Window closes ${shortDate(career.window.closes)}`;
  const urgent = creating || !!career.live || !!career.draft?.my_turn || pending > 0 || career.board.meeting;

  const groups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { to: base, label: "Home", icon: IconHome },
        { to: `${base}/me`, label: "Me", icon: IconUser },
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
        { to: `${base}/jobs`, label: "Job center", icon: IconBriefcase, show: career.phase !== "draft", badge: jobOffer ? "OFFER" : undefined },
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
  // On the stage the office steps aside: no header, no menu, the match screen has its own bar.
  const matchMode = !!career.live && location.pathname.endsWith("/match");

  return (
    <AppShell
      header={{ height: 72, collapsed: matchMode, offset: !matchMode }}
      navbar={{ width: 236, breakpoint: "sm", collapsed: { desktop: matchMode, mobile: matchMode } }}
      padding={0}
      style={vars({ "--team": career.team.color })}
    >
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
            <MusicControl />
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
              <ClubStars r={career.reputation} size={11} />
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
                          <Badge size="sm" color={alert ? "red" : "gold"} variant={alert || /^\d+$/.test(i.badge) || i.badge === "OFFER" ? "filled" : "light"}>
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
        {creating ? (
          <CreateManager />
        ) : career.board.sacked ? (
          <JobOffers browsing={browsing} onBrowse={setBrowsing} />
        ) : career.board.meeting ? (
          <BoardMeeting />
        ) : (
          career.draw && !location.pathname.endsWith("/match") && <DrawPrompt draw={career.draw} />
        )}
      </AppShell.Main>
    </AppShell>
  );
}
