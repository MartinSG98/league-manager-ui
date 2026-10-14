# League Manager UI

React client for League Manager, Football Manager for League of Legends esports. You take over a tier-one team from the 2026 season and keep its franchise player. The rest of your roster comes from a draft of every pro in the region. Then you run it season after season: three splits, First Stand, MSI and Worlds, a new patch every two weeks, champion select in every game your team plays, a weekly training plan, a board that judges you on the objectives you agreed, and a transfer window every off-season.

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

React 19, Vite 6, TypeScript and react-router. Components come from [Mantine](https://mantine.dev) 9, the same base as core-ui, with Tabler icons. Screen-specific visuals live in CSS Modules next to their screens.

The theme in `src/theme.ts` and `src/styles/global.css` is a dark esports-broadcast palette where every colour has one job:
- League's gold for what you can act on
- the club's own colour for who you are: your crest, your rows, the glow on the stage
- hextech teal for what your staff tell you
- green and orange only for what stands out against the rest
- the map's blue and red only for sides

Text is Barlow, and titles and big numbers are Barlow Condensed. Each screen has one stage for what it is about, cards for the jobs done there, and quiet rows for the rest. Detail sits behind a toggle or a hover instead of on the page. See [ADR 0009](docs/adr/0009-one-focus-per-screen.md).

## Art

| What | Where it comes from | Stored |
|---|---|---|
| Champion icons, loading-screen portraits, splashes | Data Dragon, patch 16.20.1 | `public/champions/`, by `npm run fetch:art` |
| Role icons | CommunityDragon | `public/roles/`, by `npm run fetch:art` |
| Team logos, league and event logos, player photos | lolesports.com, via URLs the API returns | not stored, loaded from Riot's CDN |

Both public folders are git-ignored, about 42 MB together. Champion art and role icons try their local copy, then the CDN; team logos and player photos come from the CDN alone. If an image cannot load, a fallback appears: the team tag on its colour, initials, or two letters for a champion. See [ADR 0006](docs/adr/0006-local-champion-art-and-esports-images.md).

## Champion select music

Champion select plays music from your own audio files. The game ships none: put the files in three git-ignored folders, named however you like (mp3, m4a, aac, ogg, oga, opus, webm, wav or flac). See [ADR 0011](docs/adr/0011-champion-select-music-from-your-own-files.md).

| Folder | Plays in |
|---|---|
| `public/music/splits/` | the regions' splits and playoffs |
| `public/music/international/` | First Stand, MSI and Worlds |
| `public/music/decider/` | game 5 of a best of five at 2-2, in any competition; while it is empty, the competition's own folder plays |

- **Choosing.** Each champion select picks a track at random from its folder, never the one that folder played last when there is a choice. A reload in the middle of a select keeps its track.
- **Playing.** The track fades in when the select starts and loops through the choice of set plays. It fades out when you press Play game.
- **Controls.** A pill in the bottom-left corner of champion select shows the track and mutes it or sets the volume. Outside the match screen a music button in the top bar does the same and counts the tracks in each folder. The browser remembers the volume and the mute, and a mute during a fade sticks. If the browser waits for a click before it plays sound, the pill shows a play button.
- **Files that cannot play.** A file the browser cannot play is skipped for the rest of the session, and another from the same folder plays. With no files the pill says "No music yet"; when none of the folder's files can play, "The music cannot play".
- **How the folders are read.** The dev server lists them at `/music/index.json` on every request, so new files play from the next champion select. `vite build` writes the list into the build.

## Screens

| Route | Screen |
|---|---|
| `/` | Title over a champion splash: start a career or continue a saved one |
| `/new` | Choose a league and a team, see the franchise player you keep and the 2026 roster you release |
| `/career/:id` | Manager's office: the next match on a stage (both teams, the analyst's read from the scouting report, your run through the competition), or the transfer window in the off-season; **This week**, the things that need you; the race around the playoff line; every match of the current round, with arrows to the others; storylines picked from the results |
| `/career/:id/draft` | Draft room: the team on the clock, pick order, the region's players and staff with photos and filters, your roster and budget, rivals |
| `/career/:id/me` | You, as Football Manager shows a manager: the profile and reputation (world and region stars), the nine attributes with who does each piece of the work, the record (series and games won, trophies, seasons), a reputation graph (the world in gold, and a line for each region, starting where you took a job there), a trophy cabinet, every season with each competition's record and finish, and every club with dates, each spell at a club counted on its own |
| `/career/:id/squad` | Starting five as portrait cards with each player's two best attributes and weak spot; a team profile of attributes, condition or contracts side by side, coloured only where a player stands two points above or below the five; chemistry, tactics, lineup; under them the staff: a card for each seat with its share of the work and who does it (you, them, or Auto: the better one), and a card with your own attributes |
| `/career/:id/team/:team` | Any other team's squad |
| `/career/:id/player/:player` | Profile with photo and real name and a verdict from your analyst (or the shortlist report); condition and development; transfer bid or transfer list and contract talks; attributes as a radar against the team's five; four key numbers for this season or 2026, the rest on request; champion pool split into signature champions and the ones strong on this patch |
| `/career/:id/players` | Scouting: every player by region and role (free agents or rookies only), and every assistant coach and analyst |
| `/career/:id/staff/:staff` | A coach or analyst: who they are, and talks to hire, extend or release them |
| `/career/:id/match` | Match day, full window: the tale of the tape, champion select, the game played back minute by minute, each game's result and the series |
| `/career/:id/matches/:match` | Series report: every game's picks, bans, scoreboard, gold graph and timeline |
| `/career/:id/schedule` | Your matches and results |
| `/career/:id/competitions` | The season as a strip of phases (splits and international events, winners' logos, the current one pulsing) with the chosen phase in detail: each league's winner and final, its top three and your place, or its holders and start; an event's champion, your status and next match, and its teams by region. Under it the season at a glance: a row per league, a column per split and event, with winners, leaders, and each league's teams and places at the events; a league opens its standings now, a cell that competition's |
| `/career/:id/competitions/:comp` | Standings, brackets, Swiss records and results; every team name opens the team's page. After a Swiss round is drawn, its pairings can come out of the pots one by one |
| `/career/:id/meta` | Champion tier list per role on the current patch and patch notes |
| `/career/:id/training` | Scrim load, team focus areas, set plays to drill, every player's condition and own training, the analyst's review |
| `/career/:id/transfers` | The transfer window: bids for your players, your bids, players who want to talk, your transfer list, every move, the shortlist, and the budget slider |
| `/career/:id/club` | Board confidence and job security, objectives, the board's reviews, the club's world and region stars and your reputation, the league by reputation, finances and the budget slider (salary budget against the bank, as in Football Manager) |
| `/career/:id/jobs` | Job center: head coach jobs at clubs that sacked their coach, with your manager reputation; each club links to its team page; apply, or take or decline an offer |
| `/career/:id/inbox` | News, scouting reports, analyst reviews, patch notes and previews, draft, contract and transfer messages, with the decisions they ask for |

The top bar shows:
- the date
- the season as a track of its splits and international events: where you finished, and how far the current one has run
- the payroll
- the board's mood
- the bank, but only while it is in debt
- the champion select music: on or off, the volume, and the tracks in each folder

The menu starts with Home, Me and Inbox, plus the draft room or match day when they apply. Then it groups Team (Squad, Training), Club (Transfers, Board & finances, Job center) and League (Schedule, Competitions, Scouting, Meta & patches).

The **Continue** button in the top bar always does the next sensible thing, and its second line says where that leads:
- While a decision blocks the career, it names it: Create your manager, Board meeting, or Choose a club, which brings the job offers back.
- During the draft, it opens the draft room.
- On match day, it goes to the stage.
- When a decision on a transfer is waiting, it takes you to the transfers screen.
- With unread mail, it opens the oldest unread message, one per press.
- Otherwise it moves the calendar one day, in the season and in the transfer window alike, as in Football Manager.

Three things block the career until you deal with them, so they open over every screen:
- **Create your manager.** Before anything else: in a new career right after the club is picked, and once in a career from before managers had attributes. Pick a name, a nationality and a background (each with its bonus, reputation and points), then spend the points on nine attributes with steppers, showing the background's bonus and the final value.
- **The board meeting** about the season's objectives, when a job starts and every off-season.
- **The job offers**, after a sacking.

Each job offer can open the club's team page first: the offers then fold into a bar at the bottom, and the bar or Continue brings them back.

A Swiss draw opens a prompt over every screen except the match screen. It can be closed: watch the teams come out of the pots, or skip it.

## The board and the club

At the meeting the board proposes a finish for each split and a target at Worlds. Each one can be accepted, lowered (4 percent less budget) or raised (4 percent more). Bonuses for going far at First Stand and MSI can come on top: paid if you earn them, nothing lost if you miss them. The club screen then tracks confidence, job security and every objective, with where the team stands in the split right now. Reputation shows as stars. A club has two ratings: world stars weigh its reputation by its league's strength, region stars measure it against the biggest club of its region. You are rated the same way, in your region and in the world: the club screen, the job center and Me show both, and the vacancies say how far each reaches. The sidebar, the club screen, every team page, the job offers and the vacancies show both club ratings; the meeting shows the region's, since the board ranks the club in its league; the job offers show both of yours, and judge clubs of your region by its stars and the rest by world stars.

## Training

The training screen is one weekly plan that stays until you change it:
- **Load.** Light, normal, heavy or intense, each with what it does to fatigue, sharpness and progress, and the load the coach advises for the next seven days.
- **Focus.** Up to two of five team areas, each with its level and what it changes in a game.
- **Set plays.** Nine plays to drill one at a time, with how far each is learned.
- **Players.** Each player's development, fatigue, sharpness, morale and condition, and what they work on alone: an attribute, a champion, or both.

The analyst's latest review sits next to it, with a button that puts the recommended areas into the plan.

## Transfers

In the off-season window a player under contract at another club has a **Buy** panel on their page. It shows their market value, what their club wants and whether they would come at all. A bid is agreed, countered or turned down at once; once the fee is agreed, the contract panel below opens personal terms, and the fee is paid when they sign. Your own players have a transfer-list switch. Bids for your players and players who ask to talk show up in the inbox and on the transfers screen, with the buttons to answer them.

## Draft room

The other teams pick one at a time, a second or two each, so you can watch the board fill up. **Pause** stops them and **Skip to my pick** makes every pick up to yours at once. Hovering a player in the pool shows their signature champions and the rest of their pool with mastery.

After the players come a round for an assistant coach and a round for an analyst. The **Coaches and analysts** tab lists them with their 2026 job, their attributes and their salary, and hovering a name shows what each attribute does.

## Match day

While a series is live, the match screen takes the whole window. The office's top bar and menu step aside for a slim bar with the competition and the game; **Office** goes back. In a series the score sits in each stage's own card: in place of the VS before the draft, between the bans in champion select, and under the clock during a game (as it stood before that game).

1. **The tale of the tape.** The two fives role by role:
   - overall and form, with a bar for the edge in each lane
   - each player's comfort champions, gold where both sides want the same one
   - the opponent's threat and weakest starter, marked
   - team strength and chemistry side by side

   Next to it is your analyst's read of the scouting report: the threat, the weak spot to attack, their plan, ban priorities and their last results. The full report is one click away. From here you can start champion select, let the assistant draft (auto draft, when you draft yourself), or simulate the whole series.
2. **Champion select.** The real tournament order of bans and picks, laid out like a broadcast. Each team's column fills with loading-screen art as champions lock in. Bans line up along the top, five slots a side, with the series score between them. Under fearless draft a strip below them shows every champion already played in the series, by game and by team.
   - **The clock.** Every ban and pick has 30 seconds. When yours runs out, the champion you selected locks in; if you selected none, the first suggestion does. The opponent takes 7 to 30 seconds per turn, like a real team, and **Skip to my turn** plays all of its turns up to yours.
   - **Players.** Hovering a player on either side shows their signature champions and the rest of their pool with mastery. Banned and picked champions are greyed out.
   - **Suggestions.** On your turn six suggestions fill a row above the grid. Each shows the three biggest parts of its value as bars from one zero, pluses to the right in green and minuses to the left in orange: comfort, patch, lane, combo, composition, off-role, or for a ban whether your own player could use it. Hovering one shows the full breakdown. For picks the reasons are the player's fit, what the composition still needs and the lane counter; for bans, the threat. A click takes one.
   - **The grid.** It badges every champion your players have high mastery on. Champions already played in the series are locked under fearless draft.
   - **Locking in.** The bar with the selected champion, its reasons, the role and **Lock in** stays in the same place on every turn.
   - **Arrows.** On your turn a green arrow in a champion's corner marks a good pick or ban, a red one a bad pick here. Two arrows mean very good or very bad. Hovering shows every reason with its value: the player's comfort, the patch, the lane against the enemy pick, what the composition needs, combos. Champions that fit none of your open roles are faded.
   - **Whoever drafts reads it.** The arrows, values and suggestions are the read of whoever drafts for you: your assistant coach, or you when you take drafting on in the Staff panel or have no coach ("Your read"). High drafting reads the draft as it is; lower drafting over- or underrates some kinds of reasons and may miss lane matchups or combos.
   - **Compositions.** Once the draft is done, each side's composition notes appear: power curve, champion combos, missing damage or frontline.
   - **Set play.** After the draft you call one of the set plays your team knows, or none. Each shows how likely it is to work with this composition against this opponent. The assistant's call is selected to begin with, and plays already run in the series are greyed out.
3. **The game.** A running game clock plays the game back:
   - **Scoreboard.** Kills, the clock, who leads in gold, and each side's towers, drakes by type, Herald, grubs and Baron.
   - **The latest moment.** A banner for the last key moment. When a fight gets a caster's call ("TRIPLE KILL for…"), the call is the headline and the fight's result sits under it.
   - **Gold difference.** A smooth line up to the current second, in the colour of the side ahead, over an area that fades towards even. A pulsing point at its end carries the lead ("+2.2k GAM"). Each minute's value is the lead once that minute is over, so it sits at the minute's end. The line's end, and the lead above the graph, follow the latest event, so neither shows a fight before it happens.
     - **Moments:** fights are dots on the line in the colour of the side they went to. Drakes, Soul, Elder, Baron, Herald, inhibitors and set plays are icons in a lane under it.
     - **Hover:** a minute shows its lead and what happened in it.
     - **Scale:** it covers only what has been played, at least 10k either way, so it gives nothing away.
   - **Set play.** A card for your set play shows whether it worked once it has had time to play out.
   - **Feed.** It lists the key moments, or everything on request.

   At 1× a 30-minute game takes about three and a half minutes. It can also run at 2×, 5× or 10×, or skip to the end. The series score stays hidden until the game is over.
4. **Result.** Victory or defeat with the kills, gold, towers, drakes and Baron, followed by:
   - up to three reasons the game went that way: the gold lead at 15 minutes, set plays, objectives, throws and teamfights
   - your five's champions, KDA, damage and ratings
   - the player of the game and the series score

   The full scoreboard of both teams is on request. Then the next game or the end of the series.

## Structure

```
src/
├── api/            client.ts (fetch wrapper) and types.ts (hand-kept copy of the API shapes)
├── state/          catalog and career contexts; the career context runs actions
├── pages/          title, new career, the AppShell with sidebar and top bar (collapsed on match day)
├── screens/        one per route inside a career
├── components/     Img (fallback chain), team logos, player photos, champion art, ratings, stars, match card,
│                   standings, Swiss stage and draw prompt, game report, gold graph, contract talks,
│                   transfer panel and offers, shortlist, board meeting, budget adjuster, job offers,
│                   create manager, staff panel and staff scouting, tactics, analyst review,
│                   season track, attribute radar, champion select music, game icons, head coach vacancies
├── lib/            formatting, art URLs, useApi, the game clock (useTimeline), turn clocks (useClock),
│                   team averages (squad.ts), the music's tracks and volume (music.ts)
├── theme.ts        Mantine theme
└── styles/         global.css: page background and the few colours Mantine has no slot for
scripts/fetch-art.mjs   champion and role art download
```

State is plain React. The career summary lives in one context and is replaced after every action. Each screen loads its own view and reloads when the career's revision changes. The Competitions screen fetches each competition it shows in detail once per action, keyed by its id, and the phase cards and the season table share it.

League Manager is a fan project. It is not affiliated with or endorsed by Riot Games. League of Legends and all related names are trademarks of Riot Games. Logos belong to their teams and leagues.
