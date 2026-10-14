import { notifications } from "@mantine/notifications";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { api, ApiError } from "../api/client";
import type { Action, ActionResult, CareerView } from "../api/types";
import { OfflineScreen } from "../components/OfflineScreen";
import { Empty, Loading } from "../components/Ui";

interface CareerContextValue {
  career: CareerView;
  /** Bumps after every action, screens reload their data when it changes. */
  revision: number;
  busy: boolean;
  /**
   * Run an action. Actions run one after another, never side by side, so a timer moving the AI
   * and a click can not overwrite each other's save. A quiet action (an AI step on a timer) does
   * not mark the career busy, so buttons do not flicker while the other teams pick.
   */
  act: (action: Action, options?: { quiet?: boolean }) => Promise<ActionResult | null>;
}

const CareerContext = createContext<CareerContextValue | null>(null);
const OFFLINE = "server-offline";

export function CareerProvider({ id, children }: { id: string; children: ReactNode }) {
  const [career, setCareer] = useState<CareerView | null>(null);
  // Why the career did not load: no such save, a server that is not running, or an error from it.
  const [failure, setFailure] = useState<{ kind: "missing" | "offline" | "error"; message?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const load = useCallback(() => {
    setCareer(null);
    setFailure(null);
    api
      .career(id)
      .then(setCareer)
      .catch((err) => {
        if (!(err instanceof ApiError)) setFailure({ kind: "offline" });
        else setFailure(err.status === 404 ? { kind: "missing" } : { kind: "error", message: err.message });
      });
  }, [id]);

  useEffect(load, [load]);

  const act = useCallback(
    (action: Action, options: { quiet?: boolean } = {}) => {
      const run = async () => {
        if (!options.quiet) setBusy(true);
        try {
          const result = await api.act(id, action);
          setCareer(result.career);
          setRevision((r) => r + 1);
          notifications.hide(OFFLINE);
          return result;
        } catch (err) {
          if (err instanceof ApiError) {
            notifications.show({ color: "red", title: "Not now", message: err.message });
          } else {
            // One message for a server that is down, however many clock-driven actions fail against it.
            notifications.hide(OFFLINE);
            notifications.show({
              id: OFFLINE,
              color: "red",
              title: "No connection to the game server",
              message: "Nothing was saved. Check that the backend is running on port 8020, then try again.",
              autoClose: false,
            });
          }
          return null;
        } finally {
          if (!options.quiet) setBusy(false);
        }
      };
      const next = queue.current.then(run);
      queue.current = next;
      return next;
    },
    [id],
  );

  if (failure?.kind === "missing") return <Empty>This career does not exist any more.</Empty>;
  if (failure?.kind === "offline") return <OfflineScreen onRetry={load} />;
  if (failure?.kind === "error") return <Empty>The server could not open this career: {failure.message}</Empty>;
  if (!career) return <Loading text="Loading your career…" />;

  return <CareerContext.Provider value={{ career, revision, busy, act }}>{children}</CareerContext.Provider>;
}

export function useCareer(): CareerContextValue {
  const value = useContext(CareerContext);
  if (!value) throw new Error("useCareer outside CareerProvider");
  return value;
}
