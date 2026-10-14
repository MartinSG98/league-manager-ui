import { ActionIcon, Badge, Button, Group, Modal, Progress, Select, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconMinus, IconPlus, IconUserCircle } from "@tabler/icons-react";
import { useState } from "react";

import { api } from "../api/client";
import type { ManagerAttribute, ManagerView } from "../api/types";
import { attributeBand, flag } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import classes from "./CreateManager.module.css";
import { Loading } from "./Ui";

const BAND_COLOR = { elite: "#3ee08f", good: "#a4d65e", decent: "#f0c64a", weak: "#ff8a5c" } as const;

const GROUPS: { title: string; note: string; seat: ManagerAttribute["seat"] }[] = [
  { title: "Coaching", note: "shared with your assistant coach", seat: "coach" },
  { title: "Analysis", note: "shared with your analyst", seat: "analyst" },
  { title: "Management", note: "yours alone", seat: null },
];

// Countries the scene's players and staff come from, and a few more.
const COUNTRIES = [
  "KR", "CN", "TW", "HK", "VN", "JP", "PH", "TH", "ID", "MY", "SG", "AU", "NZ", "BR", "AR", "CL", "MX", "PE", "CO",
  "US", "CA", "GB", "IE", "DE", "FR", "ES", "PT", "IT", "NL", "BE", "DK", "SE", "NO", "FI", "IS", "PL", "CZ", "SK",
  "AT", "CH", "HU", "SI", "HR", "RS", "BA", "ME", "MK", "AL", "BG", "RO", "GR", "CY", "TR", "UA", "LT", "LV", "EE",
  "MD", "GE", "AM", "AZ", "KZ", "IL", "SA", "AE", "MA", "EG", "TN", "ZA", "IN",
];

function countryOptions() {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  return COUNTRIES.map((code) => ({ value: code, label: `${flag(code)}  ${names?.of(code) ?? code}` })).sort((a, b) =>
    a.label.slice(4).localeCompare(b.label.slice(4)),
  );
}

/** Every attribute at the base, before any points are spent. */
function baseline(v: ManagerView): Record<string, number> {
  return Object.fromEntries(v.attributes.map((a) => [a.id, v.rules.base]));
}

/** The points spread as evenly as they go, as the server does for a quick start. */
function evenly(v: ManagerView, total: number): Record<string, number> {
  const ids = v.attributes.map((a) => a.id);
  const each = Math.floor(total / ids.length);
  const extra = total - each * ids.length;
  return Object.fromEntries(ids.map((id, i) => [id, Math.min(v.rules.highest, each + (i < extra ? 1 : 0))]));
}

/**
 * Create your manager, as in Football Manager: a background, then points spread over the attributes.
 * It blocks the career until it is done, for a new career right after the club is picked and once
 * for a career from before managers had attributes.
 */
export function CreateManager() {
  const { career, act, busy } = useCareer();
  const view = useApi(() => api.manager(career.id), [career.id]);
  const v = view.data;

  return (
    <Modal
      opened
      onClose={() => undefined}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      size={1080}
      centered
      title={
        <Group gap="sm">
          <IconUserCircle size={24} color="var(--gold-bright)" />
          <Stack gap={0}>
            <Text className="eyebrow">Head coach of {career.team.name}</Text>
            <Text fw={800} fz="lg">
              Create your manager
            </Text>
          </Stack>
        </Group>
      }
    >
      {!v ? <Loading /> : <Creator v={v} busy={busy} manager={career.manager} create={(body) => act({ type: "create_manager", ...body })} />}
    </Modal>
  );
}

function Creator({
  v,
  busy,
  manager,
  create,
}: {
  v: ManagerView;
  busy: boolean;
  manager: string;
  create: (body: { background: string; attributes: Record<string, number>; name: string; country: string | null }) => void;
}) {
  const [name, setName] = useState(manager);
  const [country, setCountry] = useState<string | null>(null);
  const [background, setBackground] = useState(v.backgrounds.find((b) => b.id === "coach")?.id ?? v.backgrounds[0].id);
  const [values, setValues] = useState<Record<string, number>>(() => baseline(v));
  const [countries] = useState(countryOptions);

  const bg = v.backgrounds.find((b) => b.id === background) ?? v.backgrounds[0];
  const total = v.rules.base * v.attributes.length + bg.points;
  const spent = Object.values(values).reduce((s, x) => s + x, 0);
  const left = total - spent;
  const step = (id: string, by: number) => setValues((cur) => ({ ...cur, [id]: Math.max(v.rules.lowest, Math.min(v.rules.highest, cur[id] + by)) }));

  return (
    <Stack gap="lg">
      <div className={classes.layout}>
        <Stack gap="md">
          <Text fz="sm" c="gray.4">
            Who you are decides where you start. Where you are weak, hire staff who are strong: for coaching and analysis the better of
            you and your staff does the work, unless you decide otherwise on the Squad screen.
          </Text>
          <Group grow align="flex-start">
            <TextInput label="Name" value={name} maxLength={v.rules.name_length} onChange={(e) => setName(e.currentTarget.value)} />
            <Select label="Nationality" placeholder="Pick a country" searchable clearable data={countries} value={country} onChange={setCountry} />
          </Group>
          <Stack gap={6}>
            <Text className="label">Background</Text>
            <div className={classes.backgrounds}>
              {v.backgrounds.map((b) => (
                <button key={b.id} type="button" className={classes.background} data-selected={b.id === background || undefined} onClick={() => setBackground(b.id)}>
                  <Text fw={800}>{b.name}</Text>
                  <Text fz="xs" c="dimmed" lh={1.35}>
                    {b.text}
                  </Text>
                  <div className={classes.chips}>
                    {Object.entries(b.bonus).map(([a, n]) => (
                      <span key={a} className={classes.chip}>
                        +{n} {v.attributes.find((x) => x.id === a)?.name ?? a}
                      </span>
                    ))}
                    {b.reputation > 0 && <span className={classes.chip}>+{b.reputation} reputation</span>}
                    <span className={classes.chip}>{b.points} points</span>
                  </div>
                </button>
              ))}
            </div>
          </Stack>
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between" align="flex-end">
            <div className={classes.points}>
              <Text className="display" fz={40} lh={1} c={left < 0 ? "red.5" : left === 0 ? "teal.4" : "gold.4"}>
                {left}
              </Text>
              <Text fz="sm" c="dimmed">
                {left === 1 || left === -1 ? "point" : "points"} left
              </Text>
            </div>
            <Group gap="xs">
              <Button size="xs" variant="default" onClick={() => setValues(evenly(v, total))}>
                Spread evenly
              </Button>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setValues(baseline(v))}>
                Reset
              </Button>
            </Group>
          </Group>
          <Text fz="xs" c="dimmed">
            Every attribute starts at {v.rules.base}. Points take it up to {v.rules.highest}; lower one to free points for another. The background's
            bonus goes on top.
          </Text>
          {GROUPS.map((g) => (
            <div key={g.title} className={classes.group}>
              <Group gap={6} mb={2}>
                <Text className="label">{g.title}</Text>
                <Text fz="xs" c="dimmed">
                  · {g.note}
                </Text>
              </Group>
              {v.attributes
                .filter((a) => a.seat === g.seat)
                .map((a) => {
                  const bonus = bg.bonus[a.id] ?? 0;
                  const final = Math.min(v.rules.cap, values[a.id] + bonus);
                  const color = BAND_COLOR[attributeBand(final)];
                  return (
                    <div key={a.id} className={classes.row}>
                      <Tooltip label={a.text} multiline w={260}>
                        <Text fz="sm" fw={600} truncate>
                          {a.name}
                        </Text>
                      </Tooltip>
                      <span className={classes.stepper}>
                        <ActionIcon size="sm" variant="default" disabled={values[a.id] <= v.rules.lowest} onClick={() => step(a.id, -1)} aria-label={`Lower ${a.name}`}>
                          <IconMinus size={12} />
                        </ActionIcon>
                        <span className={classes.stepValue}>{values[a.id]}</span>
                        <ActionIcon size="sm" variant="default" disabled={values[a.id] >= v.rules.highest || left <= 0} onClick={() => step(a.id, 1)} aria-label={`Raise ${a.name}`}>
                          <IconPlus size={12} />
                        </ActionIcon>
                      </span>
                      <span className={classes.bonus}>{bonus ? `+${bonus}` : ""}</span>
                      <Group gap={8} wrap="nowrap" justify="flex-end">
                        <Progress value={(final / 20) * 100} color={color} size="sm" radius="xl" w={52} />
                        <span className={classes.final} style={{ color }}>
                          {final}
                        </span>
                      </Group>
                    </div>
                  );
                })}
            </div>
          ))}
        </Stack>
      </div>

      <Group justify="space-between">
        <Text fz="xs" c="dimmed">
          {left > 0 ? `${left} unspent ${left === 1 ? "point is" : "points are"} lost.` : left < 0 ? `${-left} points too many.` : "Every point is spent."}
        </Text>
        <Group gap="sm">
          <Badge variant="light" color="gold">
            {bg.name}
          </Badge>
          <Button loading={busy} disabled={left < 0 || !name.trim()} onClick={() => create({ background, attributes: values, name: name.trim(), country })}>
            Start as {name.trim() || "manager"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
