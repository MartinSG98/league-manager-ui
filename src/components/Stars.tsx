import { Tooltip } from "@mantine/core";
import { IconStar, IconStarFilled, IconStarHalfFilled } from "@tabler/icons-react";

/** Reputation in half stars, 0.5 to 5. A span, so it can sit inside a line of text. */
export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  const icons = [1, 2, 3, 4, 5].map((n) => {
    if (value >= n) return <IconStarFilled key={n} size={size} color="var(--gold-bright)" />;
    if (value >= n - 0.5) return <IconStarHalfFilled key={n} size={size} color="var(--gold-bright)" />;
    return <IconStar key={n} size={size} color="rgba(200, 170, 110, 0.35)" />;
  });
  return (
    <Tooltip label={label ?? `${value} stars`}>
      <span style={{ display: "inline-flex", gap: 1, verticalAlign: "middle" }}>{icons}</span>
    </Tooltip>
  );
}
