import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "../api/client";
import type { Catalog, CatalogTeam, Champion, LeagueInfo } from "../api/types";
import { OfflineScreen } from "../components/OfflineScreen";
import { Loading } from "../components/Ui";

interface CatalogContextValue extends Catalog {
  champion: Record<string, Champion>;
  league: Record<string, LeagueInfo>;
  /** Tier-one teams by id. */
  team: Record<string, CatalogTeam>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api
      .catalog()
      .then(setCatalog)
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  const value = useMemo(
    () =>
      catalog
        ? {
            ...catalog,
            champion: Object.fromEntries(catalog.champions.map((c) => [c.id, c])),
            league: Object.fromEntries(catalog.leagues.map((l) => [l.id, l])),
            team: Object.fromEntries(catalog.teams.map((t) => [t.id, t])),
          }
        : null,
    [catalog],
  );

  if (failed) return <OfflineScreen onRetry={load} />;
  if (!value) return <Loading text="Loading the 2026 season…" />;
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog outside CatalogProvider");
  return value;
}
