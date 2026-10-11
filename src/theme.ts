import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

/*
  The look is an esports broadcast: near-black navy, League's gold for everything you can act on
  and for titles, hextech teal as the second accent, the map's blue and red for sides. Mantine
  takes the palettes below; colours Mantine has no slot for live as CSS variables in global.css.
*/

const gold: MantineColorsTuple = [
  "#fbf6ea", "#f0e6d2", "#e3cfa3", "#d6bd85", "#c8aa6e", "#b8954e", "#a17f3c", "#85672e", "#6a5223", "#4e3c18",
];

const hextech: MantineColorsTuple = [
  "#e0fffb", "#b3fbf3", "#80f4e9", "#4deede", "#1fe6d3", "#0ac8b9", "#08a397", "#067f75", "#045b54", "#023834",
];

// Mantine's dark scheme reads text from the light end and surfaces from the dark end.
const dark: MantineColorsTuple = [
  "#e9edf4", "#c4cbd9", "#8e99ae", "#626d85", "#3b4661", "#28324a", "#1a2336", "#121a29", "#0c121e", "#070a12",
];

export const theme = createTheme({
  primaryColor: "gold",
  primaryShade: { light: 6, dark: 4 },
  colors: { gold, hextech, dark },
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, monospace",
  headings: {
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "sm",
  cursorType: "pointer",
  components: {
    Paper: { defaultProps: { withBorder: true, radius: "md" } },
    Table: { defaultProps: { verticalSpacing: 6, highlightOnHover: true } },
    Badge: { defaultProps: { radius: "sm" } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 150 } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-body": "#0d1320",
    "--mantine-color-default-border": "#222c42",
  },
});
