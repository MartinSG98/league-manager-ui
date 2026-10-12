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
  /** The face of their team: renews automatically and cannot be released. */
  franchise: boolean;
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
  /** 0-100, kept up by scrims; under 40 the player is complacent. */
  sharpness: number;
  /** Burned out, Exhausted, Tired, Complacent, Sharp, Unsettled. */
  status: string[];
  /** One of the rookie classes the game made up, from the first off-season on. */
  rookie: boolean;
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

export interface PlayerTraining {
  attribute: string | null;
  champion: string | null;
}

/** Buying or selling this player, from the manager's side. */
export interface PlayerMarket {
  window_open: boolean;
  value: number;
  /** What their club wants; null for your own player or one not for sale. */
  asking: number | null;
  interest: "keen" | "open" | "reluctant" | "refuses";
  interest_text: string;
  listed: boolean;
  bid_problem: string | null;
  bid: TransferOffer | null;
  promise: number | null;
  unsettled: boolean;
}

export interface PlayerDetail extends PlayerRow {
  training: PlayerTraining;
  /** Thriving, Developing, Slow, Stagnating, Burned out or Not assessed. */
  development: string;
  market: PlayerMarket;
  shortlist: ShortlistEntry | null;
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
  kind:
    | "news" | "draft" | "match" | "patch" | "board" | "contract" | "finance" | "scouting" | "staff" | "transfer" | "player"
    | "training" | "draw";
  subject: string;
  body: string;
  read: boolean;
  report: ScoutingReport | ReviewReport | PlayerReport | null;
  /** A bid for one of your players that this message is about. */
  offer: number | null;
  /** A talk a player asked for. */
  conversation: number | null;
  /** A Swiss draw: the competition and the round drawn. */
  competition: string | null;
  round: number | null;
}

/** A Swiss round drawn and not played yet, while its message is unread. */
export interface PendingDraw {
  message: number;
  competition: string;
  name: string;
  round: number;
}

/** The analyst's read of the team's recent games, with the areas to work on. */
export interface ReviewReport {
  kind: "review";
  team: string;
  games: number;
  analyst: string | null;
  skill: number;
  recommend: string[];
  areas: { area: string; label: string; line: string; score: number; level: number }[];
}

export function isReview(report: InboxMessage["report"]): report is ReviewReport {
  return !!report && (report as ReviewReport).kind === "review";
}

export function isPlayerReport(report: InboxMessage["report"]): report is PlayerReport {
  return !!report && (report as PlayerReport).kind === "player";
}

export type ReportGrade = "A+" | "A" | "B" | "C" | "D";

/** The analyst's report on a shortlisted player. */
export interface PlayerReport {
  kind: "player";
  /** How many reports there have been on this player, this one included. */
  number: number;
  day: string;
  player: string;
  name: string;
  photo: string | null;
  role: Role;
  team: string | null;
  analyst: string | null;
  confidence: "high" | "fair" | "rough";
  overall: number;
  /** The range the analyst puts the player's real potential in. */
  potential: [number, number];
  peaked: boolean;
  strengths: string[];
  weaknesses: string[];
  champions: [string, number][];
  form: { games: number; wins: number; kda: number; rating: number } | null;
  fit: string;
  starter: { id: string; name: string; overall: number } | null;
  interest: "keen" | "open" | "reluctant" | "refuses";
  interest_text: string;
  contract: { until: number; salary: number } | null;
  value: number;
  asking: number | null;
  wage: number;
  grade: ReportGrade;
  verdict: string;
  notes: string[];
}

export interface ShortlistEntry {
  added: string;
  /** When the analyst's next report lands; null when nobody is watching. */
  due: string | null;
  reports: number;
  report: PlayerReport | null;
}

export interface ShortlistRow extends PlayerRow {
  shortlist: ShortlistEntry;
  value: number;
  asking: number | null;
  interest: PlayerReport["interest"];
}

/** The analyst's report on the next opponent. What is filled in depends on `level` (1-4). */
export interface ScoutingReport {
  match: string;
  opponent: string;
  level: number;
  analyst: string | null;
  competition: string;
  label: string;
  best_of: number;
  form: { won: boolean; against: string; score: string }[];
  players: {
    id: string;
    name: string;
    role: Role;
    photo: string | null;
    overall: number;
    form: number;
    signatures: string[];
    /** Level 2+: champion and games this season. */
    recent?: [string, number][];
  }[];
  plan?: Tactics;
  bans?: string[];
  threat?: { id: string; name: string; why: string };
  weaknesses?: string[];
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
  /** Double elimination only: which bracket the match is in, and its column. */
  bracket: "upper" | "lower" | "final" | null;
  round: number;
  /** Swiss only: the wins and losses of the pool the match was drawn from. */
  pool?: [number, number];
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
  staff: TeamStaff;
  unread: number;
  inbox: InboxMessage[];
  season_over: boolean;
  draw: PendingDraw | null;
  /** The players on the shortlist. */
  shortlist: string[];
  board: {
    confidence: number;
    security: string;
    warned: boolean;
    meeting: boolean;
    sacked: boolean;
    season: number;
    objectives: { id: string; text: string; status: ObjectiveStatus; result: string }[];
    bonuses: BoardBonus[];
  };
  reputation: Reputation;
  /** Clubs that want you, after a sacking. */
  job_offers: JobOffer[];
  /** The transfer window, while it is open. */
  window: { open: boolean; closes: string; free_agency: string } | null;
  pending: { offers: number; talks: number };
}

export type ObjectiveStatus = "pending" | "met" | "failed";

/** Rewarded but not demanded: qualifying for First Stand or MSI, or a deep run there. */
export interface BoardBonus {
  id: string;
  text: string;
  status: "pending" | "earned" | "missed";
  confidence: number;
  /** Thousands of USD the sponsors pay into the bank. */
  payment: number;
}

export interface Reputation {
  team: number;
  team_stars: number;
  manager: number;
  manager_stars: number;
}

export interface JobOffer {
  team: TeamRef;
  stars: number;
  budget: number;
  strength: number;
  league_name: string;
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

// ---------- staff ----------

export type StaffKind = "coach" | "analyst";

export interface StaffRow {
  id: string;
  name: string;
  real_name: string | null;
  kind: StaffKind;
  /** The job they held in 2026, or "Free agent" for generated staff. */
  position: string;
  country: string | null;
  photo: string | null;
  generated: boolean;
  region: string;
  origin: { id: string; name: string; tag: string; logo: string | null } | null;
  team: string | null;
  /** 1-20: development, drafting, motivation, teaching for a coach; scouting, meta for an analyst. */
  attributes: Record<string, number>;
  overall: number;
  salary: number;
  contract_until: number | null;
}

export interface StaffPoolRow extends StaffRow {
  problem: string | null;
}

export interface TeamStaff {
  coach: StaffRow | null;
  analyst: StaffRow | null;
}

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
  coach: StaffRow | null;
  analyst: StaffRow | null;
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
  /** What the current round is for. */
  round_kind: "player" | StaffKind;
  staff_rounds: StaffKind[];
  picks: { number: number; round: number; team: string; salary: number; player: PlayerRow | null; staff: StaffRow | null }[];
  teams: DraftTeam[];
  pool: PoolPlayer[];
  staff_pool: StaffPoolRow[];
  me: {
    budget: number;
    payroll: number;
    left: number;
    open_roles: Role[];
    staff_needed: StaffKind[];
    reserve: number;
    can_pass: boolean;
  };
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
  stars: number;
  /** Team areas, 1-20. */
  skills: Record<string, number>;
  /** Your players on the transfer list. */
  listed: string[];
  franchise: string | null;
  staff: TeamStaff;
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
  kind: "round_robin" | "single_elim" | "double_elim" | "swiss";
  finished: boolean;
  best_of: number;
  advance: number;
  tables: { name: string | null; rows: StandingRow[] }[];
  matches: MatchSummary[];
  /** Swiss only: wins to go through, and defeats to go out. */
  swiss_wins: number | null;
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
  gold15: number;
  leads: [number, number];
  fights: [number, number];
  throws: [number, number];
  /** Team id to the set play it ran. */
  plays: Record<string, string>;
  play_results: Record<string, boolean>;
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

/** One reason a champion is a good or bad choice, in the units of the score it adds to. */
export interface ChoiceNote {
  kind: string;
  text: string;
  value: number;
}

export interface BoardChoice {
  role: Role | null;
  score: number | null;
  /** -2..2: the arrow on the champion in the grid. */
  verdict: number;
  notes: ChoiceNote[];
}

export interface BoardEntry extends BoardChoice {
  /** False when the champion plays none of our open roles (pick) or nobody left on their side plays it (ban). */
  fits: boolean;
  /** A flex pick scored in its other open roles. */
  others: Partial<Record<Role, BoardChoice>>;
}

export interface Board {
  kind: "ban" | "pick" | null;
  champions: Record<string, BoardEntry>;
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
  /** Every available champion scored for our current ban or pick; null on the opponent's turn. */
  board: Board | null;
  /** The manager's assistant coach, whose read the board and suggestions are. */
  coach: { name: string; drafting: number } | null;
  scouting: ScoutingReport | null;
  compositions: Record<Side, { value: number; notes: string[] } | null>;
  bench: PlayerRow[];
  mastery: Record<string, Record<string, number>>;
  /** After champion select: the set plays you can call. */
  plays: PlayChoice | null;
}

export interface PlayChoice {
  chosen: string | null;
  options: {
    id: string;
    name: string;
    phase: string;
    minute: number;
    effect: string;
    text: string;
    learned: number;
    used: boolean;
    chance: number;
    fit: number;
  }[];
  used: string[];
  opponent_used: string[];
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
  interest: PlayerMarket["interest"];
  interest_text: string;
}

// ---------- training ----------

export type Load = "light" | "normal" | "heavy" | "intense";

export interface TrainingPlayer extends PlayerRow {
  starter: boolean;
  training: PlayerTraining;
  development: string;
  quality: number | null;
  burnout: number;
  attributes: Record<string, number>;
  learning: { champion: string; mastery: number } | null;
}

export interface SetPlayInfo {
  id: string;
  name: string;
  phase: string;
  minute: number;
  weeks: number;
  area: string;
  area_label: string;
  style: "early" | "scaling" | "any";
  text: string;
  effect: string;
  learned: number;
}

export interface TrainingView {
  load: Load;
  recommended: Load;
  advice: string;
  loads: { id: Load; name: string; text: string; fatigue: number; sharpness: number; gain: number }[];
  focus: string[];
  areas: { id: string; label: string; effect: string; level: number }[];
  drilling: string | null;
  plays: SetPlayInfo[];
  usable_from: number;
  players: TrainingPlayer[];
  attributes: string[];
  review: (ReviewReport & { day: string; subject: string }) | null;
  coach: { name: string; attributes: Record<string, number> } | null;
  thresholds: { burnout: number; complacent: number; champion_cap: number };
}

// ---------- the board ----------

export interface BoardObjective {
  id: string;
  kind: "split" | "worlds";
  split: number | null;
  text: string;
  status: ObjectiveStatus;
  result: string;
  target: number;
  proposed: number;
  progress: string | null;
  /** During a meeting: what asking for less (-1), accepting (0) or promising more (1) means. */
  options?: { stance: number; text: string; budget: number; possible: boolean }[];
}

export interface BoardView {
  season: number;
  confidence: number;
  security: string;
  warned: boolean;
  meeting: boolean;
  sacked: boolean;
  joined: string | null;
  objectives: BoardObjective[];
  bonuses: BoardBonus[];
  history: string[];
  reputation: Reputation & { prestige: number };
  finances: { budget: number; payroll: number; cash: number; sponsors_per_week: number; budget_step: number };
  league_reputation: { team: TeamRef; reputation: number; stars: number }[];
  job_offers: JobOffer[];
  star_reach: number;
  thresholds: { warning: number; safe: number };
}

// ---------- transfers ----------

export type OfferStatus = "open" | "agreed" | "completed" | "rejected" | "withdrawn" | "expired" | "collapsed";

export interface TransferOffer {
  id: number;
  player: string;
  buyer: string;
  seller: string;
  fee: number;
  day: string;
  expires: string;
  status: OfferStatus;
  counter: number | null;
  rounds: number;
  note: string;
}

export interface TransferOfferRow extends TransferOffer {
  player_row: PlayerRow;
  buyer_team: TeamRef;
  seller_team: TeamRef;
  value: number;
}

export type TalkChoice = "vital" | "promise" | "final";

export interface ConversationRow {
  id: number;
  player: string;
  topic: "rejected_bid" | "broken_promise";
  team: string | null;
  day: string;
  expires: string;
  resolved: boolean;
  outcome: string;
  player_row: PlayerRow;
  team_ref: TeamRef | null;
  choices: Partial<Record<TalkChoice, string>>;
}

export interface TransfersView {
  open: boolean;
  closes: string | null;
  free_agency: string | null;
  cash: number;
  budget: number;
  room: number;
  incoming: TransferOfferRow[];
  outgoing: TransferOfferRow[];
  listed: PlayerRow[];
  moves: { day: string; player: string; from: string | null; to: string; fee: number; player_row: PlayerRow; from_team: TeamRef | null; to_team: TeamRef }[];
  conversations: ConversationRow[];
}

// ---------- actions ----------

export type Action =
  | { type: "draft_pick"; player: string }
  | { type: "draft_staff"; staff: string }
  | { type: "draft_pass" }
  | { type: "draft_auto" }
  | { type: "draft_sim" }
  | { type: "draft_next"; until_mine?: boolean }
  | { type: "advance" }
  | { type: "set_lineup"; lineup: Record<Role, string> }
  | { type: "set_tactics"; tactics: Tactics }
  | { type: "start_champ_select" }
  | { type: "ban"; champion: string }
  | { type: "pick"; champion: string; role: Role }
  | { type: "auto_select" }
  | { type: "opponent_turn"; until_mine?: boolean }
  | { type: "play_game" }
  | { type: "next_game" }
  | { type: "sim_series" }
  | { type: "read_message"; id?: number }
  | { type: "offer"; player: string; salary: number; years: number }
  | { type: "accept_counter"; player: string }
  | { type: "release"; player: string }
  | { type: "next_season" }
  | { type: "board_meeting"; stances: Record<string, number> }
  | { type: "accept_job"; team: string }
  | { type: "set_training"; load?: Load; focus?: string[]; play?: string; clear_play?: boolean }
  | { type: "set_player_training"; player: string; attribute: string | null; champion: string | null }
  | { type: "set_play"; play: string | null }
  | { type: "transfer_bid"; player: string; fee: number }
  | { type: "withdraw_bid"; offer: number }
  | { type: "respond_offer"; offer: number; response: "accept" | "reject" | "negotiate" }
  | { type: "transfer_list"; player: string; listed: boolean }
  | { type: "shortlist"; player: string; on: boolean }
  | { type: "scout_player"; player: string }
  | { type: "talk"; conversation: number; choice: TalkChoice };
