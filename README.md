# League Manager UI

React client for League Manager, Football Manager for League of Legends esports. You take over a tier-one team from the 2026 season and keep its franchise player. The rest of your roster comes from a draft of every pro in the region. Then you run the whole season: three splits, First Stand, MSI and Worlds, a new patch every two weeks, and champion select in every game your team plays.

This repo only draws what the API returns. The game engine, all rules and the saved careers live in [league-manager-backend](https://github.com/MartinSG98/league-manager-backend), which has to run for the client to work.

UI decisions are recorded in [docs/adr](docs/adr/README.md).

## Running locally

Requires Node 20 or newer and the backend running on port 8020.

```bash
npm install
npm run fetch:art   # champion art and role icons into public/, once per patch
npm run dev
```

The client starts on http://localhost:5190. It talks to the API at `VITE_API_URL`, which defaults to `http://127.0.0.1:8020`. Copy `.env.example` to `.env` to change that. If the backend is not running, the client says so and offers a retry.

`npm run build` type-checks and builds to `dist/`.

## Look and stack

React 19, Vite 6, TypeScript and react-router. Components come from [Mantine](https://mantine.dev) 9, the same base as core-ui, with Tabler icons. The theme in `src/theme.ts` is a dark esports-broadcast palette: League's gold for actions and titles, hextech teal as the second accent, and the map's blue and red for sides. Headings use Barlow Condensed and text uses Inter. Screen-specific visuals live in CSS Modules next to their screens.

## Art

| What | Where it comes from | Stored |
|---|---|---|
| Champion icons, loading-screen portraits, splashes | Data Dragon, patch 16.20.1 | `public/champions/`, by `npm run fetch:art` |
| Role icons | CommunityDragon | `public/roles/`, by `npm run fetch:art` |
| Team logos, league and event logos, player photos | lolesports.com, via URLs the API returns | not stored, loaded from Riot's CDN |

Both public folders are git-ignored, about 42 MB together. Every image tries its local copy, then the CDN. If both fail, a fallback appears: the team tag on its colour, initials, or two letters for a champion. See [ADR 0006](docs/adr/0006-local-champion-art-and-esports-images.md).

## Screens

| Route | Screen |
|---|---|
| `/` | Title over a champion splash: start a career or continue a saved one |
| `/new` | Choose a league and a team, see the franchise player you keep and the 2026 roster you release |
| `/career/:id` | Manager's office: next match, the current table, your five, inbox |
| `/career/:id/draft` | Draft room: the team on the clock, pick order, the region's players and staff with photos and filters, your roster and budget, rivals |
| `/career/:id/squad` | Starting five as portrait cards, attributes, form and morale, chemistry, staff, tactics, lineup |
| `/career/:id/team/:team` | Any other team's squad |
| `/career/:id/player/:player` | Profile with photo and real name, contract talks, attributes, champion pool with mastery and meta, stats |
| `/career/:id/players` | Scouting: every player by region and role, free agents |
| `/career/:id/match` | Match day: lineups, champion select, the game played back minute by minute, the series result |
| `/career/:id/matches/:match` | Series report: every game's picks, bans, scoreboard, gold graph and timeline |
| `/career/:id/schedule` | Your matches and results |
| `/career/:id/competitions` | Every competition of the season by split |
| `/career/:id/competitions/:comp` | Standings, brackets, Swiss records and results |
| `/career/:id/meta` | Champion tier list per role on the current patch and patch notes |
| `/career/:id/inbox` | News, scouting reports, patch notes and previews, draft and contract messages |

The **Continue** button in the top bar always does the next sensible thing:
- During the draft, it opens the draft room.
- On match day, it goes to the stage.
- During the season, it simulates until your next match.
- After Worlds, it starts the next season.

## Draft room

The other teams pick one at a time, a second or two each, so you can watch the board fill up. **Pause** stops them and **Skip to my pick** makes every pick up to yours at once. Hovering a player in the pool shows their signature champions and the rest of their pool with mastery.

After the players come a round for an assistant coach and a round for an analyst. The **Coaches and analysts** tab lists them with their 2026 job, their attributes and their salary, and hovering a name shows what each attribute does.

## Match day

1. **Lineup.** Both fives with photos, form and signature champions, plus team strength and chemistry, and your analyst's scouting report on the opponent. From here you can start champion select, let the assistant draft, or simulate the whole series.
2. **Champion select.** The real tournament order of bans and picks, laid out like a broadcast. Each team's column fills with loading-screen art as champions lock in, and bans line up along the top.
   - **The clock.** Every ban and pick has 30 seconds. When yours runs out, the champion you selected locks in; if you selected none, the assistant's first choice does. The opponent takes two to five seconds per turn, and **Skip to my turn** plays all of its turns up to yours.
   - **Players.** Hovering a player on either side shows their signature champions and the rest of their pool with mastery. Banned and picked champions are greyed out.
   - **The assistant.** On your turn it lists its best options with their reasons: for picks, the player's fit, what the composition still needs and the lane counter; for bans, the threat.
   - **The grid.** It badges every champion your players have high mastery on. Champions already played in the series are locked under fearless draft.
   - **Arrows.** On your turn a green arrow in a champion's corner marks a good pick or ban, a red one a bad pick here. Two arrows mean very good or very bad. Hovering shows every reason with its value: the player's comfort, the patch, the lane against the enemy pick, what the composition needs, combos. Champions that fit none of your open roles are faded.
   - **Your coach's read.** The arrows, values and suggestions are your assistant coach's read of the draft. A coach with high drafting reads it as it is; a weaker one over- or underrates some kinds of reasons and may miss lane matchups or combos.
   - **Compositions.** Once the draft is done, each side's composition notes appear: power curve, champion combos, missing damage or frontline.
3. **The game.** A running game clock plays the game back with kills, towers, drakes, Barons and a live gold graph. At 1× a 30-minute game takes about three and a half minutes. It can also run at 2×, 5× or 10×, or skip to the end. The series score stays hidden until the game is over.
4. **Result.** A scoreboard with champion icons, photos, KDA, CS, damage and ratings, plus the MVP. Then the next game or the end of the series.

## Structure

```
src/
├── api/            client.ts (fetch wrapper) and types.ts (hand-kept copy of the API shapes)
├── state/          catalog and career contexts; the career context runs actions
├── pages/          title, new career, the AppShell with sidebar and top bar
├── screens/        one per route inside a career
├── components/     Img (fallback chain), team logos, player photos, champion art, ratings, match card,
│                   standings, game report, gold graph, contract talks
├── lib/            formatting, art URLs, useApi, the game clock (useTimeline), turn clocks (useClock)
├── theme.ts        Mantine theme
└── styles/         global.css: page background and the few colours Mantine has no slot for
scripts/fetch-art.mjs   champion and role art download
```

State is plain React. The career summary lives in one context and is replaced after every action. Each screen loads its own view and reloads when the career's revision changes.

League Manager is a fan project. It is not affiliated with or endorsed by Riot Games. League of Legends and all related names are trademarks of Riot Games. Logos belong to their teams and leagues.
