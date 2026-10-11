import { AppShell, Badge, Box, Button, Group, NavLink, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconArrowLeft, IconCalendar, IconChartBar, IconHome, IconMail, IconPlayerPlayFilled, IconSwords, IconTrophy,
  IconUserSearch, IconUsersGroup, IconWand,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { LeagueLogo, TeamLogo } from "../components/Media";
import { Meter } from "../components/Ui";
import { longDate, money } from "../lib/format";
import { useCareer } from "../state/career";
import classes from "./CareerLayout.module.css";

export function CareerLayout() {
  const { career, act, busy } = useCareer();
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/career/${career.id}`;

  async function proceed() {
    if (career.phase === "draft") return navigate(`${base}/draft`);
    if (career.phase === "offseason") {
      const result = await act({ type: "next_season" });
      if (result) navigate(`${base}/draft`);
      return;
    }
    if (career.live) return navigate(`${base}/match`);
    const result = await act({ type: "advance" });
    if (result?.career.live) navigate(`${base}/match`);
  }

  let label = "Continue";
  if (career.phase === "draft") label = career.draft?.my_turn ? "Your pick" : "Draft room";
  else if (career.live) label = "Match day";
  else if (career.phase === "offseason") label = `Start ${career.season + 1}`;
  const urgent = !!career.live || !!career.draft?.my_turn;

  const items = [
    { to: base, label: "Home", icon: IconHome },
    { to: `${base}/inbox`, label: "Inbox", icon: IconMail, badge: career.unread || undefined },
    { to: `${base}/draft`, label: "Draft room", icon: IconWand, show: career.phase === "draft", badge: career.draft?.my_turn ? "!" : undefined },
    { to: `${base}/match`, label: "Match day", icon: IconSwords, show: !!career.live, badge: "LIVE" },
    { to: `${base}/squad`, label: "Squad", icon: IconUsersGroup },
    { to: `${base}/schedule`, label: "Schedule", icon: IconCalendar },
    { to: `${base}/competitions`, label: "Competitions", icon: IconTrophy },
    { to: `${base}/players`, label: "Scouting", icon: IconUserSearch },
    { to: `${base}/meta`, label: "Meta & patches", icon: IconChartBar },
  ];

  return (
    <AppShell header={{ height: 68 }} navbar={{ width: 250, breakpoint: "sm" }} padding={0}>
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="lg" gap="xl" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <LeagueLogo logo={career.league_logo} name={career.league} size={36} />
            <Stack gap={0}>
              <Text className="eyebrow">Season {career.season}</Text>
              <Text fw={700}>{longDate(career.day)}</Text>
            </Stack>
          </Group>
          <Stack gap={0} visibleFrom="md">
            <Text className="eyebrow">Patch</Text>
            <Text fw={700}>{career.patch}</Text>
          </Stack>
          <Stack gap={4} visibleFrom="md">
            <Text className="eyebrow">Payroll</Text>
            <Group gap="xs" wrap="nowrap">
              <Meter value={career.payroll} max={career.budget} w={90} color={career.payroll > career.budget ? "red" : "gold"} />
              <Text fz="sm" fw={600}>
                {money(career.payroll)} <Text span c="dimmed" fz="sm">/ {money(career.budget)}</Text>
              </Text>
            </Group>
          </Stack>
          <Stack gap={0} visibleFrom="lg">
            <Text className="eyebrow">Bank</Text>
            <Text fw={700} className={career.cash < 0 ? "loss" : undefined}>
              {money(career.cash)}
            </Text>
          </Stack>
          <Box style={{ flex: 1 }} />
          <Button
            size="md"
            color={urgent ? "gold" : "hextech"}
            variant={urgent ? "filled" : "light"}
            loading={busy}
            rightSection={<IconPlayerPlayFilled size={16} />}
            onClick={proceed}
            className={classes.continue}
          >
            {label}
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className={classes.navbar}>
        <Stack gap="lg" p="md" h="100%">
          <Stack gap={6} className={classes.club} style={{ "--team": career.team.color } as React.CSSProperties}>
            <TeamLogo team={career.team} size={64} />
            <Text fw={800} fz="lg" lh={1.15}>
              {career.team.name}
            </Text>
            <Text fz="sm" c="dimmed">
              {career.manager}
            </Text>
          </Stack>
          <Stack gap={2}>
            {items
              .filter((i) => i.show !== false)
              .map((i) => {
                const active = i.to === base ? location.pathname === base : location.pathname.startsWith(i.to);
                return (
                  <NavLink
                    key={i.to}
                    component={Link}
                    to={i.to}
                    label={i.label}
                    active={active}
                    leftSection={<i.icon size={18} stroke={1.6} />}
                    rightSection={
                      i.badge !== undefined ? (
                        <Badge size="sm" color={i.badge === "LIVE" ? "red" : "gold"} variant={i.badge === "LIVE" ? "filled" : "light"}>
                          {i.badge}
                        </Badge>
                      ) : undefined
                    }
                    className={classes.navItem}
                  />
                );
              })}
          </Stack>
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
      </AppShell.Main>
    </AppShell>
  );
}
