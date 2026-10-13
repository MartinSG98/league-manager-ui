/**
 * Line icons for what happens on the map. They take the text colour, so a side or an event kind
 * colours them from outside.
 */
export type GameIconKind = "tower" | "dragon" | "baron" | "herald" | "fight" | "play" | "inhibitor" | "nexus" | "blood" | "throw";

export function GameIcon({ kind, size = 18, label }: { kind: GameIconKind; size?: number; label?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    style: { flex: "none" },
  };
  switch (kind) {
    case "tower":
      return (
        <svg {...common}>
          <path d="M7 21h10M8 21l1-11h6l1 11M8 10V4h2v2h1V4h2v2h1V4h2v6" />
        </svg>
      );
    case "dragon":
      return (
        <svg {...common}>
          <path d="M3 14c4 0 6-3 7-8 1 3 3 5 7 5l4-2-2 5c-2 3-5 5-9 5-3 0-5-2-7-5z" />
          <circle cx="15" cy="12" r="0.8" fill="currentColor" />
        </svg>
      );
    case "baron":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="5" />
          <path d="M8 13l-3 7M16 13l3 7M10.5 14.5V20M13.5 14.5V20" />
        </svg>
      );
    case "herald":
      return (
        <svg {...common}>
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "fight":
      return (
        <svg {...common}>
          <path d="M4 4l10 10M4 4v4M4 4h4M20 4L10 14M20 4v4M20 4h-4M7 17l-3 3M17 17l3 3" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
      );
    case "inhibitor":
      return (
        <svg {...common}>
          <path d="M12 3l6 9-6 9-6-9z" />
        </svg>
      );
    case "nexus":
      return (
        <svg {...common}>
          <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" />
        </svg>
      );
    case "blood":
      return (
        <svg {...common}>
          <path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" />
        </svg>
      );
    case "throw":
      return (
        <svg {...common}>
          <path d="M12 3l10 18H2z" />
          <path d="M12 10v4M12 17.5v.5" />
        </svg>
      );
  }
}
