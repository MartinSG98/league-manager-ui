// Hand-kept copy of the backend's response shapes (app/game/views.py and the routers).
// Field names stay snake_case so they match the JSON as it arrives.

export type Role = "TOP" | "JNG" | "MID" | "BOT" | "SUP";
export type Side = "blue" | "red";
export type Phase = "draft" | "season" | "offseason";
export type Focus = "early" | "mid" | "late";

export interface TeamRef {
  id: string;
  name: string;
  tag: string;
  color: string;
  league: string;
  region: string;
  logo: string | null;
}

// ---------- catalog ----------

export interface CatalogPlayer {
  id: string;
  name: string;
  role: Role;
  country: string | null;
  league: string;
  overall: number;
  potential: number;
  salary: number;
  signatures: string[];
  games: number;
  photo: string | null;
  real_name: string | null;
}

export interface CatalogTeam {
  id: string;
  name: string;
  tag: string;
  league: string;
  region: string;
  color: string;
  logo: string | null;
  prestige: number;
  rank: number;
  wins: number;
  losses: number;
  franchise: CatalogPlayer | null;
}

export interface TeamPreview extends CatalogTeam {
  roster_2026: (CatalogPlayer & { starter: boolean })[];
  pool_size: number;
  pool_by_role: Record<Role, number>;
}

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  focus: Focus;
  damage: "AD" | "AP" | "MX";
  cls: string;
}

export interface Region {
  id: string;
  name: string;
  league: string;
}

export interface LeagueInfo {
  id: string;
  name: string;
  full_name: string;
  region: string;
  tier: number;
  logo: string | null;
  players: number;
}

export interface Catalog {
  patch: string;
  regions: Region[];
  leagues: LeagueInfo[];
  teams: CatalogTeam[];
  event_logos: Record<string, string>;
  champions: Champion[];
}

// ---------- players ----------

export interface PlayerRow {
  id: string;
  name: string;
  real_name: string | null;
  photo: string | null;
  role: Role;
  country: string | null;
  league: string;
  origin: { id: string; name: string; tag: string; logo: string | null } | null;
  team: string | null;
  overall: number;
  potential: number;
  salary: number;
  contract_until: number | null;
  reputation: number;
  experience: number;
  signatures: string[];
  form: number;
  morale: number;
  fatigue: number;
}

export interface PoolChampion {
  champion: string;
  games: number;
  winrate: number | null;
  mastery: number;
  meta: number;
}

export interface PlayerSeason {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs_per_min: number;
  rating: number | null;
  mvps: number;
  champions: [string, number][];
}

export interface PlayerDetail extends PlayerRow {
  attributes: Record<string, number>;
  aggression: number;
  leadership: number;
  languages: string[];
  stats_2026: Record<string, number | string | null>;
  games_2026: number;
  pool: PoolChampion[];
  season: PlayerSeason;
}

// ---------- career ----------

export interface InboxMessage {
  id: number;
  day: string;
  kind: "news" | "draft" | "match" | "patch" | "board" | "contract" | "finance";
  subject: string;
  body: string;
  read: boolean;
}

export interface MatchSummary {
  id: string;
  competition: string;
  competition_name: string;
  competition_logo: string | null;
  stage: string;
  label: string;
  day: string;
  home: TeamRef | null;
  away: TeamRef | null;
  best_of: number;
  fearless: boolean;
  score: [number, number];
  winner: string | null;
  games: number;
}

export interface LiveSummary {
  match: string;
  game: number;
  phase: LivePhase;
  our_side: Side;
}

export interface CareerView {
  id: string;
  manager: string;
  season: number;
  day: string;
  phase: Phase;
  patch: string;
  team: TeamRef;
  league: string;
  league_logo: string | null;
  region: string;
  budget: number;
  payroll: number;
  cash: number;
  next_match: MatchSummary | null;
  live: LiveSummary | null;
  draft: { on_the_clock: string | null; my_turn: boolean; round: number; number: number; total: number } | null;
  unread: number;
  inbox: InboxMessage[];
  season_over: boolean;
}

export interface SaveRow {
  id: string;
  manager: string;
  team: TeamRef;
  season: number;
  day: string;
  phase: Phase;
  updated_at: string;
}

export interface ActionResult {
  career: CareerView;
  games: { match: string; game: number }[];
}

// ---------- draft ----------

export interface PoolPlayer extends PlayerRow {
  problem: string | null;
  languages: string[];
}

export interface DraftTeam {
  team: TeamRef;
  roster: PlayerRow[];
  lineup: Partial<Record<Role, string>>;
  budget: number;
  payroll: number;
  open_roles: Role[];
  franchise: string | null;
}

export interface DraftView {
  league: string;
  round: number;
  number: number;
  total: number;
  required_rounds: number;
  optional_rounds: number;
  done: boolean;
  on_the_clock: string | null;
  my_turn: boolean;
  sequence: string[];
  picks: { number: number; round: number; team: string; salary: number; player: PlayerRow | null }[];
  teams: DraftTeam[];
  pool: PoolPlayer[];
  me: { budget: number; payroll: number; left: number; open_roles: Role[]; reserve: number; can_pass: boolean };
}

// ---------- squad ----------

export interface Tactics {
  style: "early" | "balanced" | "scaling";
  lane: "top" | "mid" | "bot";
  objectives: "dragons" | "balanced" | "barons";
}

export interface Chemistry {
  score: number;
  reasons: string[];
}

export interface SquadView {
  team: TeamRef;
  is_mine: boolean;
  lineup: Partial<Record<Role, string>>;
  players: PlayerDetail[];
  chemistry: Chemistry;
  strength: number;
  tactics: Tactics;
  budget: number;
  payroll: number;
  cash: number;
  prestige: number;
  franchise: string | null;
}

// ---------- competitions ----------

export interface CompetitionRow {
  id: string;
  name: string;
  short: string;
  kind: "league" | "international";
  league: string | null;
  logo: string | null;
  split: number | null;
  status: "upcoming" | "running" | "finished";
  start: string;
  end: string;
  winner: TeamRef | null;
  mine: boolean;
}

export interface StandingRow {
  team: TeamRef;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  played: number;
}

export interface StageView {
  id: string;
  name: string;
  kind: "round_robin" | "single_elim" | "swiss";
  finished: boolean;
  best_of: number;
  advance: number;
  tables: { name: string | null; rows: StandingRow[] }[];
  matches: MatchSummary[];
}

export interface CompetitionView {
  id: string;
  name: string;
  short: string;
  kind: "league" | "international";
  status: "upcoming" | "running" | "finished";
  league: string | null;
  logo: string | null;
  start: string;
  end: string;
  prize_pool: number;
  entrants: TeamRef[];
  placements: TeamRef[];
  stages: StageView[];
}

// ---------- games ----------

export interface PlayerLine {
  player: string;
  name: string;
  photo: string | null;
  team: string;
  role: Role;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  rating: number;
}

export interface GameRecord {
  number: number;
  blue: string;
  red: string;
  winner: string;
  duration: number;
  kills: [number, number];
  gold: [number, number];
  towers: [number, number];
  dragons: [number, number];
  barons: [number, number];
  blue_picks: Partial<Record<Role, string>>;
  red_picks: Partial<Record<Role, string>>;
  blue_bans: string[];
  red_bans: string[];
  players: PlayerLine[];
  mvp: string | null;
  detailed: boolean;
}

export interface MatchView extends MatchSummary {
  game_list: GameRecord[];
}

export interface TimelineEvent {
  t: number;
  kind: string;
  side: Side | null;
  text: string;
  score: [number, number];
  gold: number;
}

export interface GameView {
  game: GameRecord;
  timeline: { events: TimelineEvent[]; gold: number[] } | null;
}

// ---------- live series ----------

export type LivePhase = "lineup" | "draft" | "ready" | "result";

export interface SideView {
  team: TeamRef;
  lineup: (PlayerRow & { slot: Role })[];
  chemistry: Chemistry;
  strength: number;
  tactics: Tactics;
}

export interface Suggestion {
  champion: string;
  score: number;
  role?: Role;
  player?: string;
  power?: number;
  need?: number;
  counter?: number;
  threat?: number;
}

export interface LiveView {
  match: MatchView;
  game: number;
  phase: LivePhase;
  our_side: Side;
  blue: SideView;
  red: SideView;
  select: {
    step: number;
    turn: { side: Side; kind: "ban" | "pick" } | null;
    order: { side: Side; kind: "ban" | "pick" }[];
    blue_bans: string[];
    red_bans: string[];
    blue_picks: Partial<Record<Role, string>>;
    red_picks: Partial<Record<Role, string>>;
    locked: string[];
  };
  suggestions: Suggestion[];
  compositions: Record<Side, { value: number; notes: string[] } | null>;
  bench: PlayerRow[];
  mastery: Record<string, Record<string, number>>;
}

// ---------- meta ----------

export interface PatchNote {
  version: string;
  day: string;
  headline: string;
  changes: { champion: string; delta: number; note: string }[];
}

export interface MetaView {
  version: string;
  next_patch: string | null;
  games: number;
  champions: {
    champion: string;
    name: string;
    roles: Role[];
    power: number;
    tier: "S" | "A" | "B" | "C" | "D";
    picks: number;
    bans: number;
  }[];
  history: PatchNote[];
}

// ---------- contracts ----------

export interface NegotiationView {
  player: string;
  kind: "sign" | "extend";
  asking: number;
  years: number;
  hint: string;
  problem: string | null;
  budget_room: number;
  rounds_left: number;
  counter: number | null;
  counter_years: number | null;
  message: string;
  roles_needed: Role[];
}

// ---------- actions ----------

export type Action =
  | { type: "draft_pick"; player: string }
  | { type: "draft_pass" }
  | { type: "draft_auto" }
  | { type: "draft_sim" }
  | { type: "advance" }
  | { type: "set_lineup"; lineup: Record<Role, string> }
  | { type: "set_tactics"; tactics: Tactics }
  | { type: "start_champ_select" }
  | { type: "ban"; champion: string }
  | { type: "pick"; champion: string; role: Role }
  | { type: "auto_select" }
  | { type: "play_game" }
  | { type: "next_game" }
  | { type: "sim_series" }
  | { type: "read_message"; id?: number }
  | { type: "offer"; player: string; salary: number; years: number }
  | { type: "accept_counter"; player: string }
  | { type: "release"; player: string }
  | { type: "next_season" };
