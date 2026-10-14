import { Badge, Stack, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";

import { api } from "../api/client";
import { ClubStars, Stars } from "../components/Stars";
import { Loading, PageHeader, Screen, Section } from "../components/Ui";
import { Vacancies } from "../components/Vacancies";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";

/** Head coach jobs at other clubs: the ones that sacked their coach, and any that want you. */
export function JobCenterScreen() {
  const { career, revision } = useCareer();
  const board = useApi(() => api.board(career.id), [career.id, revision]);
  if (!board.data) return <Loading />;
  const b = board.data;
  const vacancies = b.vacancies ?? [];
  const offers = vacancies.filter((v) => v.offer_until).length;
  return (
    <Screen>
      <PageHeader
        icon={<IconBriefcase size={40} color="var(--gold-bright)" />}
        eyebrow="Your career"
        title="Job center"
        right={
          <Stack gap={2} align="flex-end">
            <Text className="label">{career.manager}</Text>
            {b.reputation.manager_ratings ? (
              <ClubStars r={b.reputation.manager_ratings} size={16} who="manager" />
            ) : (
              <Stars value={b.reputation.manager_stars} size={18} label={`Manager reputation ${b.reputation.manager}`} />
            )}
          </Stack>
        }
      />
      <Section
        title="Head coach vacancies"
        right={
          offers ? (
            <Badge color="gold" variant="filled">
              {offers === 1 ? "An offer for you" : `${offers} offers for you`}
            </Badge>
          ) : (
            <Text fz="xs" c="dimmed">
              clubs that sacked their coach
            </Text>
          )
        }
      >
        <Vacancies vacancies={vacancies} reach={b.reach ?? 0} />
      </Section>
    </Screen>
  );
}
