import { Alert, Badge, Button, Grid, Group, Paper, Stack, Table, Text, UnstyledButton } from "@mantine/core";
import { IconArrowRight, IconTransfer, IconUserSearch } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { TransferOfferRow, TransfersView } from "../api/types";
import { PlayerPhoto, RoleIcon, TeamLogo } from "../components/Media";
import { Conversation, IncomingOffer, OfferStatus } from "../components/TransferActions";
import { Empty, Loading, Ovr, PageHeader, Screen, Section } from "../components/Ui";
import { longDate, money, shortDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

export function TransfersScreen() {
  const { career, revision } = useCareer();
  const view = useApi(() => api.transfers(career.id), [career.id, revision]);
  if (!view.data) return <Loading />;
  return <Transfers view={view.data} />;
}

function Transfers({ view }: { view: TransfersView }) {
  const { career } = useCareer();
  const base = `/career/${career.id}`;
  const openIncoming = view.incoming.filter((o) => o.status === "open");
  const pastIncoming = view.incoming.filter((o) => o.status !== "open");
  return (
    <Screen>
      <PageHeader
        icon={<IconTransfer size={40} color="var(--gold-bright)" />}
        eyebrow={view.open ? `Window open until ${longDate(view.closes!)}` : "Transfer window closed"}
        title="Transfers"
        right={
          <Group gap="xl">
            <Stack gap={0} align="flex-end">
              <Text className="eyebrow">Bank</Text>
              <Text fw={800} fz="lg">
                {money(view.cash)}
              </Text>
            </Stack>
            <Stack gap={0} align="flex-end">
              <Text className="eyebrow">Salary room</Text>
              <Text fw={800} fz="lg" className={view.room < 0 ? "loss" : undefined}>
                {money(view.room)}
              </Text>
            </Stack>
            <Button component={Link} to={`${base}/players`} variant="light" leftSection={<IconUserSearch size={16} />}>
              Find players
            </Button>
          </Group>
        }
      />
      {!view.open && (
        <Alert color="gray" variant="light" mb="lg">
          Players under contract can only be bought and sold in the off-season, from the day after the Worlds final to December 15th. Free
          agents can be signed any time from their player page.
        </Alert>
      )}
      {view.open && view.free_agency && (
        <Alert color="gold" variant="light" mb="lg">
          Contracts that end this season run out on {longDate(view.free_agency)}. Until then you can still extend your own players.
        </Alert>
      )}
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Stack gap="lg">
            {view.conversations.length > 0 && (
              <Section title="Players who want to talk">
                <Stack gap="lg">
                  {view.conversations.map((t) => (
                    <Conversation key={t.id} talk={t} />
                  ))}
                </Stack>
              </Section>
            )}
            <Section title={`Bids for your players${openIncoming.length ? ` · ${openIncoming.length} open` : ""}`}>
              {view.incoming.length === 0 ? (
                <Empty>No club has bid for one of your players{view.open ? " yet" : ""}.</Empty>
              ) : (
                <Stack gap="md">
                  {[...openIncoming, ...pastIncoming].map((o) => (
                    <Group key={o.id} gap="md" wrap="nowrap" align="flex-start">
                      <TeamLogo team={o.buyer_team} size={36} />
                      <IncomingOffer offer={o} />
                    </Group>
                  ))}
                </Stack>
              )}
            </Section>
            <Section title="Your transfer list" pad={false}>
              {view.listed.length === 0 ? (
                <Empty>Put a player on the list from their player page and other clubs know you would sell.</Empty>
              ) : (
                view.listed.map((p) => <PlayerLine key={p.id} id={p.id} name={p.name} photo={p.photo} role={p.role} overall={p.overall} right={money(p.salary)} />)
              )}
            </Section>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Stack gap="lg">
            <Section title="Your bids" pad={false}>
              {view.outgoing.length === 0 ? (
                <Empty>Bid for a player from their page: find them under Scouting.</Empty>
              ) : (
                view.outgoing.map((o) => <OutgoingBid key={o.id} offer={o} />)
              )}
            </Section>
            <Section title="Moves this window" pad={false}>
              {view.moves.length === 0 ? (
                <Empty>Nobody has moved yet.</Empty>
              ) : (
                <Table verticalSpacing={5}>
                  <Table.Tbody>
                    {view.moves.slice(0, 40).map((m) => (
                      <Table.Tr key={`${m.day}-${m.player}`}>
                        <Table.Td c="dimmed" fz="xs" w={60}>
                          {shortDate(m.day)}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            <RoleIcon role={m.player_row.role} size={14} />
                            <Link to={`${base}/player/${m.player}`} className="link">
                              <Text fz="sm" fw={700}>
                                {m.player_row.name}
                              </Text>
                            </Link>
                            <Ovr value={m.player_row.overall} size="sm" />
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            {m.from_team ? <TeamLogo team={m.from_team} size={20} /> : <Badge size="xs" variant="outline" color="gray">FA</Badge>}
                            <IconArrowRight size={12} />
                            <TeamLogo team={m.to_team} size={20} />
                            <Text fz="xs">{m.to_team.tag}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fz="sm" fw={600}>
                          {m.fee ? money(m.fee) : "free"}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </Screen>
  );
}

function OutgoingBid({ offer }: { offer: TransferOfferRow }) {
  const { career } = useCareer();
  return (
    <Paper p="sm" style={{ borderBottom: "1px solid var(--line)", borderRadius: 0 }}>
      <Group justify="space-between" wrap="nowrap">
        <PlayerLine id={offer.player} name={offer.player_row.name} photo={offer.player_row.photo} role={offer.player_row.role} overall={offer.player_row.overall} bare />
        <Stack gap={2} align="flex-end">
          <Group gap={6}>
            <Text fw={700}>{money(offer.fee)}</Text>
            <OfferStatus status={offer.status} />
          </Group>
          <Text fz="xs" c="dimmed" ta="right" maw={320}>
            {offer.note}
          </Text>
          {(offer.status === "open" || offer.status === "agreed") && (
            <Button component={Link} to={`/career/${career.id}/player/${offer.player}`} size="compact-xs" variant="subtle">
              {offer.status === "agreed" ? "Agree personal terms" : "Answer the counter"}
            </Button>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

function PlayerLine({ id, name, photo, role, overall, right, bare }: { id: string; name: string; photo: string | null; role: TransferOfferRow["player_row"]["role"]; overall: number; right?: string; bare?: boolean }) {
  const { career } = useCareer();
  const navigate = useNavigate();
  return (
    <UnstyledButton onClick={() => navigate(`/career/${career.id}/player/${id}`)} p={bare ? 0 : "sm"} style={{ width: bare ? undefined : "100%" }}>
      <Group gap="sm" wrap="nowrap" justify="space-between">
        <Group gap="sm" wrap="nowrap">
          <RoleIcon role={role} size={16} />
          <PlayerPhoto photo={photo} name={name} size={30} />
          <Text fw={700} fz="sm">
            {name}
          </Text>
          <Ovr value={overall} size="sm" />
        </Group>
        {right && (
          <Text fz="sm" c="dimmed">
            {right}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );
}
