import type {
  Action, ActionResult, CareerView, Catalog, CompetitionRow, CompetitionView, DraftView, GameView, LiveView,
  MatchSummary, MatchView, MetaView, NegotiationView, PlayerDetail, PlayerRow, Role, SaveRow, SquadView, TeamPreview,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8020";

export class ApiError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // body was not JSON, keep the status text
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const career = (id: string) => `/api/careers/${id}`;

export const api = {
  catalog: () => request<Catalog>("/api/catalog"),
  teamPreview: (team: string) => request<TeamPreview>(`/api/catalog/teams/${team}`),

  saves: (limit = 12) => request<SaveRow[]>(`/api/careers?limit=${limit}`),
  createCareer: (manager: string, team: string) =>
    request<CareerView>("/api/careers", json("POST", { manager, team })),
  deleteCareer: (id: string) => request<void>(career(id), { method: "DELETE" }),
  career: (id: string) => request<CareerView>(career(id)),
  act: (id: string, action: Action) => request<ActionResult>(`${career(id)}/actions`, json("POST", action)),

  draft: (id: string) => request<DraftView>(`${career(id)}/draft`),
  squad: (id: string, team?: string) => request<SquadView>(`${career(id)}/squad${team ? `?team=${team}` : ""}`),
  players: (id: string, query: { region?: string; freeAgents?: boolean; role?: Role; limit?: number }) => {
    const params = new URLSearchParams();
    if (query.region) params.set("region", query.region);
    if (query.freeAgents) params.set("free_agents", "true");
    if (query.role) params.set("role", query.role);
    params.set("limit", String(query.limit ?? 300));
    return request<PlayerRow[]>(`${career(id)}/players?${params}`);
  },
  player: (id: string, player: string) => request<PlayerDetail>(`${career(id)}/players/${player}`),
  competitions: (id: string) => request<CompetitionRow[]>(`${career(id)}/competitions`),
  competition: (id: string, comp: string) => request<CompetitionView>(`${career(id)}/competitions/${comp}`),
  schedule: (id: string, team?: string) =>
    request<MatchSummary[]>(`${career(id)}/schedule${team ? `?team=${team}` : ""}`),
  match: (id: string, match: string) => request<MatchView>(`${career(id)}/matches/${match}`),
  game: (id: string, match: string, game: number) =>
    request<GameView>(`${career(id)}/matches/${match}/games/${game}`),
  live: (id: string) => request<LiveView | null>(`${career(id)}/live`),
  meta: (id: string) => request<MetaView>(`${career(id)}/meta`),
  negotiation: (id: string, player: string) => request<NegotiationView>(`${career(id)}/negotiate/${player}`),
};
