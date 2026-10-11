import { Badge, Box, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";

import type { StaffKind, StaffRow } from "../api/types";
import { flag, money, STAFF_ATTRIBUTES, STAFF_KIND_NAMES } from "../lib/format";
import { PlayerPhoto, TeamLogo } from "./Media";
import classes from "./Staff.module.css";
import { AttrBar, Ovr } from "./Ui";

/** Where someone worked in 2026: the team's logo and the job, or a free agent. */
export function StaffOrigin({ person }: { person: StaffRow }) {
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      {person.origin && <TeamLogo team={{ tag: person.origin.tag, color: "#3b4661", logo: person.origin.logo }} size={20} />}
      <Text fz="xs" c="dimmed" truncate>
        {person.origin ? `${person.position}, ${person.origin.tag}` : person.generated ? "Free agent" : person.position}
      </Text>
    </Group>
  );
}

/** A staff member with every attribute and what it does. */
export function StaffCard({ person, kind, emptyText }: { person: StaffRow | null; kind: StaffKind; emptyText?: string }) {
  if (!person) {
    return (
      <Paper p="md" className={classes.card} data-empty>
        <Text className="eyebrow">{STAFF_KIND_NAMES[kind]}</Text>
        <Text fz="sm" c="dimmed" mt={6}>
          {emptyText ?? "Nobody in this seat. The team works as if it had a weak one."}
        </Text>
      </Paper>
    );
  }
  return (
    <Paper p="md" className={classes.card}>
      <Group justify="space-between" wrap="nowrap" mb="sm">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <PlayerPhoto photo={person.photo} name={person.name} size={48} />
          <Stack gap={1} miw={0}>
            <Text className="eyebrow">{STAFF_KIND_NAMES[kind]}</Text>
            <Text className="display" fz={22} lh={1} truncate>
              {person.name}
            </Text>
            <Text fz="xs" c="dimmed" truncate>
              {flag(person.country)} {person.real_name ?? ""}
            </Text>
          </Stack>
        </Group>
        <Ovr value={person.overall} size="lg" />
      </Group>
      <StaffOrigin person={person} />
      <Stack gap={6} mt="sm">
        {Object.entries(person.attributes).map(([attr, value]) => (
          <AttrBar key={attr} label={STAFF_ATTRIBUTES[attr]?.name ?? attr} value={value} hint={STAFF_ATTRIBUTES[attr]?.hint} />
        ))}
      </Stack>
      <Group justify="space-between" mt="sm">
        <Text fz="xs" c="dimmed">
          {money(person.salary)} a season
        </Text>
        {person.contract_until && (
          <Badge size="sm" variant="light" color="gray">
            until {person.contract_until}
          </Badge>
        )}
      </Group>
    </Paper>
  );
}

/** The attributes as small numbers, for tables. */
export function StaffAttributes({ person }: { person: StaffRow }) {
  return (
    <Group gap={6} wrap="nowrap">
      {Object.entries(person.attributes).map(([attr, value]) => (
        <Tooltip key={attr} label={`${STAFF_ATTRIBUTES[attr]?.name}: ${STAFF_ATTRIBUTES[attr]?.hint}`} multiline w={240}>
          <Box className={classes.attr} data-band={value >= 15 ? "elite" : value >= 11 ? "good" : value >= 7 ? "decent" : "weak"}>
            <span className={classes.attrName}>{(STAFF_ATTRIBUTES[attr]?.name ?? attr).slice(0, 3)}</span>
            <span className={classes.attrValue}>{value}</span>
          </Box>
        </Tooltip>
      ))}
    </Group>
  );
}
