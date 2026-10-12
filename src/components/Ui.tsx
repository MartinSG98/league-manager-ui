import { Box, Center, Group, Loader, Paper, Progress, Stack, Text, Title, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

import { attributeBand, cx, ratingBand } from "../lib/format";
import classes from "./Ui.module.css";

const BAND_COLOR = { elite: "#3ee08f", good: "#a4d65e", decent: "#f0c64a", weak: "#ff8a5c" } as const;

/** A card with a small uppercase title bar. With `fill` it grows to the height its flex column leaves it. */
export function Section({ title, right, children, pad = true, fill = false, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; pad?: boolean; fill?: boolean; className?: string }) {
  return (
    <Paper className={cx(classes.section, fill && classes.fill, className)}>
      {(title || right) && (
        <Group justify="space-between" className={classes.sectionHead} wrap="nowrap">
          <Text className="eyebrow">{title}</Text>
          {right}
        </Group>
      )}
      <Box p={pad ? "md" : 0} className={fill ? classes.fill : undefined}>
        {children}
      </Box>
    </Paper>
  );
}

export function PageHeader({ eyebrow, title, right, icon }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="md">
      <Group gap="md" wrap="nowrap">
        {icon}
        <Stack gap={2}>
          {eyebrow && <Text className="eyebrow">{eyebrow}</Text>}
          <Title order={1} className="display" fz={34} lh={1}>
            {title}
          </Title>
        </Stack>
      </Group>
      {right}
    </Group>
  );
}

/** Overall rating, coloured by band. */
export function Ovr({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" | "xl" }) {
  const band = ratingBand(value);
  return (
    <span className={cx(classes.ovr, classes[`ovr-${size}`])} style={{ color: BAND_COLOR[band], borderColor: BAND_COLOR[band] }}>
      {value}
    </span>
  );
}

export function AttrBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const band = attributeBand(value);
  const bar = (
    <div className={classes.attr}>
      <Text fz="sm" c="dimmed">
        {label}
      </Text>
      <Progress value={(value / 20) * 100} color={BAND_COLOR[band]} size="sm" radius="xl" />
      <Text fz="sm" fw={800} ta="right" style={{ color: BAND_COLOR[band] }}>
        {value}
      </Text>
    </div>
  );
  return hint ? <Tooltip label={hint}>{bar}</Tooltip> : bar;
}

export function FormArrow({ value }: { value: number }) {
  const label = value >= 1 ? "▲" : value <= -1 ? "▼" : "●";
  return (
    <Tooltip label={`Form ${value > 0 ? "+" : ""}${value.toFixed(1)}`}>
      <Text span fz={11} className={value >= 1 ? "gain" : value <= -1 ? "loss" : undefined} c={Math.abs(value) < 1 ? "dimmed" : undefined}>
        {label}
      </Text>
    </Tooltip>
  );
}

export function Meter({ value, max = 100, color = "gold", w = 64, label }: { value: number; max?: number; color?: string; w?: number; label?: string }) {
  const bar = <Progress value={Math.max(0, Math.min(1, value / max)) * 100} color={color} size={6} radius="xl" w={w} />;
  return label ? <Tooltip label={label}>{bar}</Tooltip> : bar;
}

export function Loading({ text }: { text?: string }) {
  return (
    <Center py={60}>
      <Stack align="center" gap="xs">
        <Loader color="gold" type="bars" size="sm" />
        {text && (
          <Text c="dimmed" fz="sm">
            {text}
          </Text>
        )}
      </Stack>
    </Center>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Text c="dimmed" ta="center" py="xl" fz="sm">
      {children}
    </Text>
  );
}

/** Page padding for every screen inside a career. Screens use the whole window: layouts grow with it. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <Box px={{ base: "md", md: "xl" }} py="lg">
      {children}
    </Box>
  );
}
