import { useElementSize } from "@mantine/hooks";

/** Gold difference (blue minus red) per minute. Above the line blue is ahead, below red is. It
 * fills the width it is given, drawn at that width so the labels keep their size. `lead` writes the
 * latest difference in the top right corner. */
export function GoldGraph({ gold, upTo, height = 150, lead = true }: { gold: number[]; upTo?: number; height?: number; lead?: boolean }) {
  const { ref, width: measured } = useElementSize();
  const width = Math.max(300, Math.round(measured) || 600);
  const shown = upTo === undefined ? gold : gold.slice(0, Math.max(1, upTo + 1));
  const minutes = Math.max(gold.length - 1, 20);
  const peak = Math.max(10000, Math.ceil(Math.max(...gold.map((g) => Math.abs(g))) / 5000) * 5000); // as on the match screen
  const x = (m: number) => (m / minutes) * width;
  const y = (g: number) => height / 2 - (g / peak) * (height / 2 - 8);
  const line = shown.map((g, m) => `${x(m).toFixed(1)},${y(g).toFixed(1)}`).join(" ");
  const area = `0,${height / 2} ${line} ${x(shown.length - 1).toFixed(1)},${height / 2}`;
  const last = shown[shown.length - 1] ?? 0;
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Gold difference over time">
        <defs>
          <clipPath id="gold-above">
            <rect x="0" y="0" width={width} height={height / 2} />
          </clipPath>
          <clipPath id="gold-below">
            <rect x="0" y={height / 2} width={width} height={height / 2} />
          </clipPath>
        </defs>
        {[10, 20, 30, 40].filter((m) => m <= minutes).map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={0} y2={height} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={x(m) + 3} y={height - 4} fill="#8e99ae" fontSize="10">
              {m}′
            </text>
          </g>
        ))}
        <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="#3b4661" />
        <polygon points={area} fill="color-mix(in srgb, var(--side-blue) 30%, transparent)" clipPath="url(#gold-above)" />
        <polygon points={area} fill="color-mix(in srgb, var(--side-red) 30%, transparent)" clipPath="url(#gold-below)" />
        <polyline points={line} fill="none" stroke="var(--gold)" strokeWidth="2" />
        <text x={6} y={14} fill="var(--side-blue)" fontSize="11" fontWeight="700">
          BLUE
        </text>
        <text x={6} y={height - 18} fill="var(--side-red)" fontSize="11" fontWeight="700">
          RED
        </text>
        {lead && (
          <text x={width - 6} y={14} textAnchor="end" fill={last >= 0 ? "var(--side-blue)" : "var(--side-red)"} fontSize="12" fontWeight="800">
            {last >= 0 ? "+" : "−"}
            {(Math.abs(last) / 1000).toFixed(1)}k
          </text>
        )}
      </svg>
    </div>
  );
}
