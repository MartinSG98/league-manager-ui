import { Affix, Button, Group, Modal, Paper, SimpleGrid, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBriefcase, IconEye } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { money } from "../lib/format";
import { useCareer } from "../state/career";
import { TeamLogo } from "./Media";
import { ClubStars } from "./Stars";

/**
 * After a sacking: the clubs that want you. Nothing else can happen until you pick one, but you can
 * look around first: viewing a club folds the offers into a bar and opens its team page. The bar, or
 * the Choose a club button, brings them back.
 */
export function JobOffers({ browsing, onBrowse }: { browsing: boolean; onBrowse: (browsing: boolean) => void }) {
  const { career, act, busy } = useCareer();
  const navigate = useNavigate();

  async function accept(team: string) {
    const result = await act({ type: "accept_job", team });
    if (result) navigate(`/career/${career.id}`);
  }

  function view(team: string) {
    onBrowse(true);
    navigate(`/career/${career.id}/team/${team}`);
  }

  if (browsing) {
    return (
      <Affix position={{ bottom: 20, left: "50%" }} style={{ transform: "translateX(-50%)" }}>
        <Paper p="sm" px="md" withBorder shadow="xl" style={{ borderColor: "var(--gold-bright)" }}>
          <Group gap="md" wrap="nowrap">
            <IconBriefcase size={20} color="var(--gold-bright)" />
            <Text fz="sm" fw={700}>
              {career.job_offers.length === 1 ? "A club wants you" : `${career.job_offers.length} clubs want you`}
            </Text>
            <Group gap={6} wrap="nowrap">
              {career.job_offers.map((offer) => (
                <Tooltip key={offer.team.id} label={offer.team.name}>
                  <UnstyledButton onClick={() => view(offer.team.id)}>
                    <TeamLogo team={offer.team} size={30} />
                  </UnstyledButton>
                </Tooltip>
              ))}
            </Group>
            <Button size="xs" onClick={() => onBrowse(false)}>
              Back to the offers
            </Button>
          </Group>
        </Paper>
      </Affix>
    );
  }

  return (
    <Modal
      opened
      onClose={() => undefined}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      size="xl"
      centered
      title={
        <Group gap="sm">
          <IconBriefcase size={22} color="var(--gold-bright)" />
          <Stack gap={0}>
            <Text className="eyebrow">You have been sacked</Text>
            <Text fw={800} fz="lg">
              Clubs that called your agent
            </Text>
          </Stack>
        </Group>
      }
    >
      <Stack gap="md">
        <Text fz="sm" c="gray.4">
          Your reputation <ClubStars r={career.reputation.manager_ratings ?? {}} size={11} inline who="manager" /> reaches clubs up to one and a
          half stars above it: clubs of the {career.reputation.manager_ratings?.region ?? "region"} go by its stars, the rest by world stars. Pick where
          your career goes next; the new board will want to meet you first.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {career.job_offers.map((offer) => (
            <Paper key={offer.team.id} p="md" withBorder>
              <Stack gap="xs" align="center">
                <TeamLogo team={offer.team} size={64} />
                <Text fw={800} ta="center">
                  {offer.team.name}
                </Text>
                <Text fz="xs" c="dimmed">
                  {offer.league_name}
                </Text>
                <ClubStars r={offer} size={13} />
                <Text fz="sm" c="dimmed">
                  Strength {offer.strength} · budget {money(offer.budget)}
                </Text>
                <Button fullWidth variant="default" leftSection={<IconEye size={16} />} disabled={busy} onClick={() => view(offer.team.id)}>
                  View the club
                </Button>
                <Button fullWidth loading={busy} onClick={() => accept(offer.team.id)}>
                  Take the job
                </Button>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Modal>
  );
}
