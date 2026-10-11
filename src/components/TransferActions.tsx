import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessageCircle } from "@tabler/icons-react";

import { api } from "../api/client";
import type { ConversationRow, TalkChoice, TransferOfferRow } from "../api/types";
import { money, shortDate } from "../lib/format";
import { useCareer } from "../state/career";

const STATUS_COLOR: Record<string, string> = {
  open: "gold", agreed: "teal", completed: "teal", rejected: "red", withdrawn: "gray", expired: "gray", collapsed: "gray",
};

export function OfferStatus({ status }: { status: string }) {
  return (
    <Badge size="sm" variant="light" color={STATUS_COLOR[status] ?? "gray"}>
      {status}
    </Badge>
  );
}

/** A bid from another club for one of your players: accept, turn it down or ask for more. */
export function IncomingOffer({ offer }: { offer: TransferOfferRow }) {
  const { act, busy } = useCareer();
  async function respond(response: "accept" | "reject" | "negotiate") {
    const result = await act({ type: "respond_offer", offer: offer.id, response });
    if (result && response === "negotiate") {
      const after = await api.transfers(result.career.id);
      const note = after.incoming.find((o) => o.id === offer.id)?.note;
      if (note) notifications.show({ color: "gold", title: offer.buyer_team.name, message: note });
    }
  }
  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="wrap">
        <Text fw={700}>
          {offer.buyer_team.name} bid {money(offer.fee)} for {offer.player_row.name}
        </Text>
        <OfferStatus status={offer.status} />
      </Group>
      <Text fz="xs" c="dimmed">
        Market value about {money(offer.value)}
        {offer.status === "open" && ` · answer by ${shortDate(offer.expires)}`}
        {offer.note && ` · ${offer.note}`}
      </Text>
      {offer.status === "open" && (
        <Group gap="xs">
          <Button size="xs" color="teal" loading={busy} onClick={() => respond("accept")}>
            Accept {money(offer.fee)}
          </Button>
          <Button size="xs" variant="light" disabled={busy || offer.rounds >= 2} onClick={() => respond("negotiate")}>
            Ask for more
          </Button>
          <Button size="xs" variant="subtle" color="red" disabled={busy} onClick={() => respond("reject")}>
            Turn it down
          </Button>
        </Group>
      )}
    </Stack>
  );
}

/** A player who asked to talk, and the three things you can tell them. */
export function Conversation({ talk }: { talk: ConversationRow }) {
  const { act, busy } = useCareer();
  const club = talk.team_ref?.name ?? "the other club";
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <IconMessageCircle size={18} color="var(--gold-bright)" />
        <Text fw={700}>
          {talk.player_row.name} {talk.topic === "broken_promise" ? "feels betrayed" : `wants to talk about ${club}`}
        </Text>
      </Group>
      <Text fz="xs" c="dimmed">
        Morale {talk.player_row.morale} · answer by {shortDate(talk.expires)}, or the silence counts as "the decision is final".
      </Text>
      <Stack gap={6}>
        {(Object.entries(talk.choices) as [TalkChoice, string][]).map(([choice, line]) => (
          <Button
            key={choice}
            variant={choice === "final" ? "subtle" : "light"}
            color={choice === "final" ? "red" : "gold"}
            justify="flex-start"
            disabled={busy}
            onClick={async () => {
              const result = await act({ type: "talk", conversation: talk.id, choice });
              const reply = result?.career.inbox.find((m) => m.kind === "player");
              if (reply) notifications.show({ color: "gold", title: reply.subject, message: reply.body.split("\n").slice(-1)[0] });
            }}
            styles={{ label: { whiteSpace: "normal", textAlign: "left" } }}
            h="auto"
            py={6}
          >
            “{line}”
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

export function TalkOutcome({ text }: { text: string }) {
  return (
    <Alert variant="light" color="gold" icon={<IconMessageCircle size={16} />}>
      {text}
    </Alert>
  );
}
