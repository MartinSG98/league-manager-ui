import { Button, Group, Modal, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { money } from "../lib/format";
import { useCareer } from "../state/career";
import { TeamLogo } from "./Media";
import { Stars } from "./Stars";

/** After a sacking: the clubs that want you. Nothing else can happen until you pick one. */
export function JobOffers() {
  const { career, act, busy } = useCareer();
  const navigate = useNavigate();

  async function accept(team: string) {
    const result = await act({ type: "accept_job", team });
    if (result) navigate(`/career/${career.id}`);
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
          Your reputation <Stars value={career.reputation.manager_stars} size={12} label={`Manager reputation ${career.reputation.manager}`} />{" "}
          reaches clubs up to one and a half stars above it. Pick where your career goes next; the new board will want to meet you first.
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
                <Stars value={offer.stars} />
                <Text fz="sm" c="dimmed">
                  Strength {offer.strength} · budget {money(offer.budget)}
                </Text>
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
