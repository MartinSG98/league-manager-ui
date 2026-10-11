import { Badge, Button, Grid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChecks } from "@tabler/icons-react";
import { useState } from "react";

import { ScoutingReport } from "../components/ScoutingReport";
import { Empty, PageHeader, Screen, Section } from "../components/Ui";
import { longDate, shortDate } from "../lib/format";
import { useCareer } from "../state/career";
import classes from "./Screens.module.css";

const KIND_COLOR: Record<string, string> = {
  patch: "hextech",
  draft: "gold",
  contract: "teal",
  board: "grape",
  match: "blue",
  news: "gray",
  finance: "yellow",
  scouting: "red",
  staff: "teal",
};

export function InboxScreen() {
  const { career, act, busy } = useCareer();
  const [openId, setOpenId] = useState<number | null>(career.inbox[0]?.id ?? null);
  const open = career.inbox.find((m) => m.id === openId) ?? null;

  function select(id: number, read: boolean) {
    setOpenId(id);
    if (!read) act({ type: "read_message", id });
  }

  return (
    <Screen>
      <PageHeader
        eyebrow={`${career.unread} unread`}
        title="Inbox"
        right={
          <Button variant="default" leftSection={<IconChecks size={16} />} disabled={busy || career.unread === 0} onClick={() => act({ type: "read_message" })}>
            Mark all read
          </Button>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Section pad={false}>
            {career.inbox.map((m) => (
              <UnstyledButton key={m.id} className={classes.inboxRow} data-active={m.id === openId || undefined} onClick={() => select(m.id, m.read)}>
                <Badge size="xs" w={70} variant={m.read ? "outline" : "filled"} color={KIND_COLOR[m.kind] ?? "gray"}>
                  {m.kind}
                </Badge>
                <Text fz="sm" fw={m.read ? 400 : 700} truncate style={{ flex: 1 }}>
                  {m.subject}
                </Text>
                <Text fz="xs" c="dimmed">
                  {shortDate(m.day)}
                </Text>
              </UnstyledButton>
            ))}
            {career.inbox.length === 0 && <Empty>Nothing yet.</Empty>}
          </Section>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Section>
            {open ? (
              <Stack gap="sm">
                <Text className="eyebrow">{longDate(open.day)}</Text>
                <Title order={2} className="display" fz={30}>
                  {open.subject}
                </Title>
                {open.report ? (
                  <ScoutingReport report={open.report} />
                ) : (
                  <Text c="gray.4" style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                    {open.body}
                  </Text>
                )}
              </Stack>
            ) : (
              <Empty>Pick a message.</Empty>
            )}
          </Section>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}
