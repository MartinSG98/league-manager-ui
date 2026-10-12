import { Alert, Badge, Button, Group, NumberInput, Stack, Switch, Text } from "@mantine/core";
import { IconCash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import type { PlayerDetail } from "../api/types";
import { money } from "../lib/format";
import { useCareer } from "../state/career";
import { useCatalog } from "../state/catalog";
import { OfferStatus } from "./TransferActions";
import { Section } from "./Ui";

const INTEREST_COLOR: Record<string, string> = { keen: "teal", open: "gold", reluctant: "orange", refuses: "red" };

/** Buying a player from another club, or putting one of yours up for sale. */
export function TransferPanel({ player }: { player: PlayerDetail }) {
  const { career, act, busy } = useCareer();
  const { team } = useCatalog();
  const m = player.market;
  const mine = player.team === career.team.id;
  const [fee, setFee] = useState(0);

  useEffect(() => {
    if (m.asking) setFee(m.bid?.counter ?? Math.round((m.asking * 0.85) / 5) * 5);
  }, [m.asking, m.bid?.counter]);

  if (!player.team) return null;

  if (mine) {
    if (player.franchise) return null;
    return (
      <Section title="Transfers" right={<Text fz="sm" c="dimmed">market value {money(m.value)}</Text>}>
        <Stack gap="xs">
          <Switch
            checked={m.listed}
            disabled={busy}
            label="On the transfer list"
            description="Other clubs know you would sell, and the asking fee drops by a fifth."
            onChange={(e) => act({ type: "transfer_list", player: player.id, listed: e.currentTarget.checked })}
          />
          {m.unsettled && (
            <Alert color="red" variant="light">
              {player.name} is unsettled and wants to leave.
            </Alert>
          )}
          {m.promise && (
            <Text fz="xs" c="dimmed">
              You promised to let {player.name} go if a big club bids in the {m.promise} off-season.
            </Text>
          )}
        </Stack>
      </Section>
    );
  }

  const bid = m.bid;
  return (
    <Section
      title={`Buy from ${team[player.team]?.name ?? "their club"}`}
      right={
        <Badge color={INTEREST_COLOR[m.interest]} variant="light">
          {m.interest}
        </Badge>
      }
    >
      <Stack gap="sm">
        <Text fz="sm" c="dimmed">
          {m.interest_text}. Market value {money(m.value)}
          {m.asking !== null ? `, their club wants about ${money(m.asking)}.` : "."}
        </Text>
        {!m.window_open ? (
          <Text fz="sm" c="dimmed">
            Players under contract can only be bought in the off-season transfer window, after Worlds.
          </Text>
        ) : bid?.status === "agreed" ? (
          <Alert color="teal" variant="light">
            {bid.note} Use the contract panel below to agree personal terms; the fee is paid when they sign.
          </Alert>
        ) : m.bid_problem ? (
          <Alert color="red" variant="light">
            {m.bid_problem}
          </Alert>
        ) : (
          <>
            <Group align="flex-end" gap="md">
              <NumberInput label="Transfer fee (k$)" value={fee} onChange={(v) => setFee(Number(v) || 0)} min={10} step={25} w={180} thousandSeparator="," />
              <Button leftSection={<IconCash size={16} />} loading={busy} disabled={fee <= 0 || fee > career.cash} onClick={() => act({ type: "transfer_bid", player: player.id, fee })}>
                Make a bid
              </Button>
              {bid?.status === "open" && (
                <Button variant="subtle" color="gray" disabled={busy} onClick={() => act({ type: "withdraw_bid", offer: bid.id })}>
                  Withdraw
                </Button>
              )}
            </Group>
            <Text fz="xs" c="dimmed">
              In the bank: {money(career.cash)}
            </Text>
          </>
        )}
        {bid && bid.status !== "agreed" && (
          <Group gap="xs">
            <OfferStatus status={bid.status} />
            <Text fz="sm">{bid.note}</Text>
          </Group>
        )}
      </Stack>
    </Section>
  );
}
