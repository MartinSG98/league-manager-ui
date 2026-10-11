import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError } from "../api/client";
import type { Action, ActionResult, CareerView } from "../api/types";

interface CareerContextValue {
  career: CareerView;
  /** Bumps after every action, screens reload their data when it changes. */
  revision: number;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  act: (action: Action) => Promise<ActionResult | null>;
}

const CareerContext = createContext<CareerContextValue | null>(null);

export function CareerProvider({ id, children }: { id: string; children: ReactNode }) {
  const [career, setCareer] = useState<CareerView | null>(null);
  const [missing, setMissing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCareer(null);
    api
      .career(id)
      .then(setCareer)
      .catch(() => setMissing(true));
  }, [id]);

  const act = useCallback(
    async (action: Action) => {
      setBusy(true);
      setError(null);
      try {
        const result = await api.act(id, action);
        setCareer(result.career);
        setRevision((r) => r + 1);
        return result;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "The server did not answer");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [id],
  );

  if (missing) return <div className="page center muted">This career does not exist any more.</div>;
  if (!career) return <div className="page center muted">Loading your career…</div>;

  return (
    <CareerContext.Provider value={{ career, revision, busy, error, clearError: () => setError(null), act }}>
      {children}
    </CareerContext.Provider>
  );
}

export function useCareer(): CareerContextValue {
  const value = useContext(CareerContext);
  if (!value) throw new Error("useCareer outside CareerProvider");
  return value;
}
