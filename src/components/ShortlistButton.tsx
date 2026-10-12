import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconStar, IconStarFilled } from "@tabler/icons-react";

import { useCareer } from "../state/career";

/** Puts a player on the shortlist, which sends the analyst to watch them, or takes them off. */
export function ShortlistButton({ player, compact = false }: { player: string; compact?: boolean }) {
  const { career, act, busy } = useCareer();
  const on = career.shortlist.includes(player);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    act({ type: "shortlist", player, on: !on });
  };
  if (compact) {
    return (
      <Tooltip label={on ? "Take off the shortlist" : "Add to the shortlist"}>
        <ActionIcon variant="subtle" color={on ? "gold" : "gray"} disabled={busy} onClick={toggle} aria-label="Shortlist">
          {on ? <IconStarFilled size={16} /> : <IconStar size={16} />}
        </ActionIcon>
      </Tooltip>
    );
  }
  return (
    <Button
      variant={on ? "light" : "default"}
      color={on ? "gold" : undefined}
      leftSection={on ? <IconStarFilled size={16} /> : <IconStar size={16} />}
      disabled={busy}
      onClick={toggle}
    >
      {on ? "On your shortlist" : "Add to shortlist"}
    </Button>
  );
}
