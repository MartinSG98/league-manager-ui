import { ATTRIBUTE_NAMES } from "../lib/format";
import { ATTRS } from "../lib/squad";

const R = 120;
const LABEL_R = 138;
const SHORT: Record<string, string> = { champion_pool: "Pool" };

/**
 * The eight attributes as a radar, and a team's level as a dashed outline when there is one to compare
 * with. The scale starts a little under the lowest value, so the differences that matter show.
 */
export function AttributeRadar({ values, compare, name }: { values: Record<string, number>; compare?: Record<string, number> | null; name: string }) {
  const all = [...ATTRS.map((k) => values[k]), ...(compare ? ATTRS.map((k) => compare[k]) : [])];
  const lo = Math.max(0, Math.min(14, Math.floor((Math.min(...all) - 2) / 2) * 2));
  const hi = 20;
  const angle = (i: number) => ((-90 + (360 / ATTRS.length) * i) * Math.PI) / 180;
  const at = (i: number, r: number) => [Math.cos(angle(i)) * r, Math.sin(angle(i)) * r] as const;
  const radius = (v: number) => (R * Math.max(0, v - lo)) / (hi - lo);
  const shape = (vals: Record<string, number>) => ATTRS.map((k, i) => at(i, radius(vals[k])).map((n) => n.toFixed(1)).join(",")).join(" ");
  const ring = (f: number) => ATTRS.map((_, i) => at(i, R * f).map((n) => n.toFixed(1)).join(",")).join(" ");

  return (
    <svg
      role="img"
      aria-label={`${name}'s attributes${compare ? " against the team's five" : ""}, on a scale from ${lo} to ${hi}`}
      viewBox="-245 -168 490 336"
      style={{ width: "100%", maxWidth: 470, height: "auto", display: "block" }}
    >
      <g fill="none" stroke="#1f2940" strokeWidth={1}>
        {[1, 0.75, 0.5, 0.25].map((f) => (
          <polygon key={f} points={ring(f)} />
        ))}
        {ATTRS.map((_, i) => {
          const [x, y] = at(i, R);
          return <line key={i} x1={0} y1={0} x2={x} y2={y} />;
        })}
      </g>
      {compare && <polygon points={shape(compare)} fill="none" stroke="#8e99ae" strokeWidth={1.5} strokeDasharray="5 4" />}
      <polygon points={shape(values)} style={{ fill: "color-mix(in srgb, var(--team) 28%, transparent)", stroke: "var(--team)" }} strokeWidth={2.5} strokeLinejoin="round" />
      <g fontFamily="Barlow, sans-serif" fontSize={14} fill="#aab3c5">
        {ATTRS.map((k, i) => {
          const [x, y] = at(i, LABEL_R);
          const anchor = Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
          const dy = y > 1 ? 12 : y < -1 ? -2 : 5;
          const d = compare ? values[k] - compare[k] : 0;
          const tone = d >= 2 ? "#3ee08f" : d <= -2 ? "#ff8a5c" : "#e9edf4";
          return (
            <text key={k} x={x} y={y + dy} textAnchor={anchor}>
              {SHORT[k] ?? ATTRIBUTE_NAMES[k]}{" "}
              <tspan fontWeight={700} fill={tone}>
                {values[k]}
              </tspan>
            </text>
          );
        })}
      </g>
    </svg>
  );
}
