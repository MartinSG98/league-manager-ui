import { Badge, Button, Grid, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChecks, IconArrowsShuffle } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { isPlayerReport, isReview, type InboxMessage } from "../api/types";
import { PlayerReport } from "../components/PlayerReport";
import { ReviewReport } from "../components/ReviewReport";
import { ScoutingReport } from "../components/ScoutingReport";
import { Conversation, IncomingOffer } from "../components/TransferActions";
import { Empty, PageHeader, Screen, Section } from "../components/Ui";
import { longDate, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
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
  transfer: "orange",
  player: "pink",
  training: "lime",
  draw: "cyan",
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
                {isPlayerReport(open.report) ? (
                  <PlayerReport report={open.report} header />
                ) : isReview(open.report) ? (
                  <ReviewReport report={open.report} />
                ) : open.report ? (
                  <ScoutingReport report={open.report} />
                ) : (
                  <Text c="gray.4" style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                    {open.body}
                  </Text>
                )}
                {(open.offer !== null || open.conversation !== null) && <MessageActions message={open} />}
                {open.kind === "draw" && open.competition && (
                  <Group>
                    <Button
                      component={Link}
                      to={`/career/${career.id}/competitions/${open.competition}?draw=${open.round}`}
                      variant="light"
                      leftSection={<IconArrowsShuffle size={16} />}
                    >
                      Watch the draw
                    </Button>
                  </Group>
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

/** The decision a transfer message asks for, while it is still open. */
function MessageActions({ message }: { message: InboxMessage }) {
  const { career, revision } = useCareer();
  const view = useApi(() => api.transfers(career.id), [career.id, revision]);
  if (!view.data) return null;
  const offer = view.data.incoming.find((o) => o.id === message.offer);
  const talk = view.data.conversations.find((c) => c.id === message.conversation);
  if (talk) return <Conversation talk={talk} />;
  if (offer) return <IncomingOffer offer={offer} />;
  return null;
}
