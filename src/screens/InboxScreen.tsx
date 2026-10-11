import { useState } from "react";

import { cx, longDate } from "../lib/format";
import { useCareer } from "../state/career";

export function InboxScreen() {
  const { career, act, busy } = useCareer();
  const [openId, setOpenId] = useState<number | null>(career.inbox[0]?.id ?? null);
  const open = career.inbox.find((m) => m.id === openId) ?? null;

  function select(id: number, read: boolean) {
    setOpenId(id);
    if (!read) act({ type: "read_message", id });
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{career.unread} unread</div>
          <h1 className="screen-title">Inbox</h1>
        </div>
        <button className="btn btn-ghost" disabled={busy || career.unread === 0} onClick={() => act({ type: "read_message" })}>
          Mark all read
        </button>
      </div>
      <div className="grid-2">
        <section className="panel">
          {career.inbox.map((m) => (
            <button key={m.id} onClick={() => select(m.id, m.read)} className={cx("row")}
              style={{
                width: "100%", padding: "10px 16px", border: 0, borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left",
                background: m.id === openId ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "transparent",
              }}>
              <span className={cx("chip", !m.read && "chip-gold")}>{m.kind}</span>
              <span style={{ flex: 1, fontWeight: m.read ? 500 : 700 }}>{m.subject}</span>
              <span className="muted">{longDate(m.day)}</span>
            </button>
          ))}
          {career.inbox.length === 0 && <div className="empty">Nothing yet.</div>}
        </section>
        <section className="panel">
          {open ? (
            <div className="panel-body">
              <div className="eyebrow">{longDate(open.day)}</div>
              <h2 style={{ margin: "6px 0 14px", fontSize: 22 }}>{open.subject}</h2>
              <div style={{ whiteSpace: "pre-line", color: "var(--text-dim)", lineHeight: 1.6 }}>{open.body}</div>
            </div>
          ) : (
            <div className="empty">Pick a message.</div>
          )}
        </section>
      </div>
    </div>
  );
}
