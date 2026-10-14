import { SegmentedControl, Text, Tooltip } from "@mantine/core";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { Duty, DutyChoice, ManagerView, StaffRow, TeamStaff } from "../api/types";
import { STAFF_ATTRIBUTES, STAFF_KIND_NAMES } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useCareer } from "../state/career";
import { PlayerPhoto } from "./Media";
import classes from "./StaffPanel.module.css";
import { AttrBar, Ovr, Section } from "./Ui";

/**
 * A club's staff under its squad: the assistant coach and the analyst, each with what they are good
 * at. At your club each seat lists its share of the work with who does it (you, them, or Auto: the
 * better of you), and a third card shows your own attributes.
 */
export function StaffPanel({ staff, mine }: { staff: TeamStaff; mine: boolean }) {
  const { career, revision } = useCareer();
  const view = useApi(() => (mine ? api.manager(career.id) : Promise.resolve(null)), [career.id, revision, mine]);
  const v = view.data?.profile ? view.data : null;
  const duties = v?.duties ?? [];

  return (
    <Section title="Staff" right={v ? <Text fz="xs" c="dimmed">Auto: the better of you and them does the work</Text> : null}>
      <div className={classes.grid}>
        <Seat kind="coach" person={staff.coach} mine={mine} duties={duties.filter((d) => d.seat === "coach")} />
        <Seat kind="analyst" person={staff.analyst} mine={mine} duties={duties.filter((d) => d.seat === "analyst")} />
        {v && <You v={v} />}
      </div>
    </Section>
  );
}

function Seat({ kind, person, mine, duties }: { kind: "coach" | "analyst"; person: StaffRow | null; mine: boolean; duties: Duty[] }) {
  const { career } = useCareer();
  const title = STAFF_KIND_NAMES[kind];
  return (
    <div className={classes.card}>
      <div className={classes.head}>
        {person ? (
          <>
            <PlayerPhoto photo={person.photo} name={person.name} size={40} ring={kind === "analyst" ? "var(--teal)" : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text fw={800} truncate>
                <Link to={`/career/${career.id}/staff/${person.id}`} className="link">
                  {person.name}
                </Link>
              </Text>
              <Text fz="xs" c="dimmed">
                {title}
              </Text>
            </div>
            <Ovr value={person.overall} size="md" plain />
          </>
        ) : (
          <div>
            <Text fw={800}>No {title.toLowerCase()}</Text>
            <Text fz="xs" c="dimmed">
              {mine ? "You do that work yourself." : "The team works as if it had a weak one."}
            </Text>
          </div>
        )}
      </div>
      {duties.length > 0
        ? duties.map((d) => <DutyRow key={d.attribute} d={d} kind={kind} />)
        : person &&
          Object.entries(person.attributes).map(([a, value]) => (
            <AttrBar key={a} label={STAFF_ATTRIBUTES[a]?.name ?? a} value={value} hint={STAFF_ATTRIBUTES[a]?.hint} />
          ))}
    </div>
  );
}

function DutyRow({ d, kind }: { d: Duty; kind: "coach" | "analyst" }) {
  const { act, busy } = useCareer();
  const name = STAFF_ATTRIBUTES[d.attribute]?.name ?? d.attribute;
  const you = d.who === "manager";
  return (
    <div className={classes.duty}>
      <Tooltip label={STAFF_ATTRIBUTES[d.attribute]?.hint} multiline w={260}>
        <Text fz="sm" fw={600} truncate>
          {name}
        </Text>
      </Tooltip>
      <Tooltip label={`You ${d.mine}, ${d.staff?.name ?? "nobody"} ${d.staff_value ?? "–"}: ${you ? "you do it" : "they do it"}`}>
        <span className={classes.versus}>
          {you ? <b>{d.mine}</b> : d.mine}
          <Text span c="dimmed">
            {" · "}
          </Text>
          {you ? (d.staff_value ?? "–") : <b>{d.staff_value}</b>}
        </span>
      </Tooltip>
      <SegmentedControl
        size="xs"
        fullWidth
        disabled={busy}
        value={d.choice}
        onChange={(who) => act({ type: "set_duty", attribute: d.attribute, who: who as DutyChoice })}
        data={[
          { value: "auto", label: "Auto" },
          { value: "manager", label: "You" },
          { value: "staff", label: kind === "coach" ? "Coach" : "Analyst", disabled: !d.staff },
        ]}
      />
    </div>
  );
}

function You({ v }: { v: ManagerView }) {
  const { career } = useCareer();
  const own = v.attributes.filter((a) => !a.seat);
  const doing = v.duties.filter((d) => d.who === "manager").map((d) => STAFF_ATTRIBUTES[d.attribute]?.name ?? d.attribute);
  const initials = v.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={classes.card} data-you>
      <div className={classes.head}>
        <span className={classes.avatar}>{initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={800} truncate>
            <Link to={`/career/${career.id}/me`} className="link">
              {v.name}
            </Link>
          </Text>
          <Text fz="xs" c="dimmed">
            Head coach · {v.profile!.background_name}
          </Text>
        </div>
      </div>
      {own.map((a) => (
        <AttrBar key={a.id} label={a.name} value={Math.floor(v.profile!.attributes[a.id] ?? 0)} hint={`${a.text}. Yours alone.`} />
      ))}
      <Text fz="xs" c="dimmed">
        {doing.length ? `You also do: ${doing.join(", ")}.` : "Your staff do all of their work."}
      </Text>
    </div>
  );
}
