import { Text, Tooltip } from "@mantine/core";
import { IconStar, IconStarFilled, IconStarHalfFilled } from "@tabler/icons-react";
import type { ClubRatings } from "../api/types";

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

const WORLD = "How the whole scene sees the club: its reputation weighed by its league's strength";
const regionTip = (region: string) => `How the ${region} sees the club: against the region's biggest club, who is five stars`;

/** A club's two ratings: in the world and in its region. Stacked (a label over each row) or in one line. */
export function ClubStars({ r, size = 12, inline = false }: { r: Partial<ClubRatings>; size?: number; inline?: boolean }) {
  if (r.world_stars === undefined || r.region_stars === undefined) return null;
  const region = r.region ?? "Region";
  const rows = [
    { key: "world", label: "World", value: r.world_stars, tip: `${WORLD}: ${r.world_stars} stars` },
    { key: "region", label: region, value: r.region_stars, tip: `${regionTip(region)}: ${r.region_stars} stars` },
  ];
  if (inline)
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, verticalAlign: "middle", whiteSpace: "nowrap" }}>
        {rows.map((row) => (
          <span key={row.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Text span fz={size - 1} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
              {row.label}
            </Text>
            <Stars value={row.value} size={size} label={row.tip} />
          </span>
        ))}
      </span>
    );
  return (
    <span style={{ display: "inline-grid", gridTemplateColumns: "auto auto", alignItems: "center", columnGap: 8, rowGap: 2 }}>
      {rows.map((row) => [
        <Text key={`${row.key}-l`} span fz={Math.max(10, size - 2)} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
          {row.label}
        </Text>,
        <Stars key={`${row.key}-s`} value={row.value} size={size} label={row.tip} />,
      ])}
    </span>
  );
}
