# League Manager UI

React client for League Manager, Football Manager for League of Legends esports. Take over a tier-one team from the 2026 season, keep its franchise player, draft the rest of your roster from every pro in the region, then run the whole season: three splits, First Stand, MSI and Worlds, a new patch every two weeks, and champion select in every game your team plays.

This repo only draws what the API returns. The game engine, all rules and the saved careers live in [league-manager-backend](https://github.com/MartinSG98/league-manager-backend), which has to run for the client to work.

UI decisions are recorded in [docs/adr](docs/adr/README.md).

## Running locally

Requires Node 20 or newer and the backend running on port 8020.

```bash
npm install
npm run dev
```

The client starts on http://localhost:5190. It talks to the API at `VITE_API_URL`, which defaults to `http://127.0.0.1:8020`. Copy `.env.example` to `.env` to change that. If the backend is not running, the client shows a screen that says so with a retry button.

`npm run build` type-checks and builds to `dist/`.

## Screens

| Route | Screen |
|---|---|
| `/` | Title: start a career or continue a saved one |
| `/new` | Choose a region and a team, see the franchise player you keep and the 2026 roster you release |
| `/career/:id` | Manager's office: next match, inbox, the current table, team strength and finances |
| `/career/:id/draft` | Draft room: pick order, the region's player pool with filters, your roster and budget, rival rosters |
| `/career/:id/squad` | Starting five, attributes, form and morale, chemistry and its reasons, tactics, lineup |
| `/career/:id/team/:team` | Any other team's squad |
| `/career/:id/player/:player` | Attributes, 2026 stats, champion pool with mastery and meta, season stats, contract talks |
| `/career/:id/players` | Scouting: every player by region and role, free agents |
| `/career/:id/match` | Match day: lineups, champion select, the game played back minute by minute, the series result |
| `/career/:id/matches/:match` | Series report: every game's picks, bans, scoreboard, gold graph and timeline |
| `/career/:id/schedule` | Your matches and results |
| `/career/:id/competitions` | Every competition of the season |
| `/career/:id/competitions/:comp` | Standings, brackets, Swiss records and results |
| `/career/:id/meta` | Champion tiers per role on the current patch and patch notes |
| `/career/:id/inbox` | News, patch notes, draft and contract messages |

The **Continue** button in the top bar always does the next sensible thing:
- In the draft, it opens the draft room.
- On match day, it goes to the stage.
- In the season, it simulates until your next match.
- After Worlds, it starts the next season.

## Match day

1. **Lineup.** Both lineups with form and signature champions, team strength and chemistry. You can start champion select, let the assistant draft, or simulate the whole series.
2. **Champion select.** The real tournament order of bans and picks. On your turn the assistant lists its best options with their reasons: the player's fit on the champion, what the composition still needs and the lane counter for picks, and the threat for bans. The grid badges every champion your players have high mastery on. Champions already played in the series are locked under fearless draft.
3. **The game.** The timeline plays back with a clock, kills, towers, drakes, Barons and a live gold graph, at 1×, 2× or 4×, or skip to the end. The series score stays hidden until the game is over.
4. **Result.** Scoreboard with KDA, CS, damage and ratings, the MVP, then the next game or the end of the series.

## Data and art

Champion portraits load from Riot's Data Dragon CDN for the patch the backend reports. Team badges use each team's tag and colour, and team logos are not used. Player data comes from the backend, which builds it from gol.gg.

## Structure

```
src/
├── api/            client.ts (fetch wrapper) and types.ts (hand-kept copy of the API shapes)
├── state/          catalog and career contexts; the career context runs actions
├── pages/          title, new career, the career layout with sidebar and top bar
├── screens/        one per route inside a career
├── components/     badges, champion icons, ratings, match cards, standings, game report, gold graph
├── lib/            formatting, Data Dragon URLs, useApi, useTimeline
└── styles/         tokens.css (the palette) and global.css
```

State is plain React. The career summary lives in one context and is replaced after every action. Each screen loads its own view and reloads when the career's revision changes.

League Manager is a fan project. It is not affiliated with or endorsed by Riot Games. League of Legends and all related names are trademarks of Riot Games.
