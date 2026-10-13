# 0009. One focus per screen

Date: 2026-10-13
Status: Accepted, amends the type and colour roles of [0005](0005-mantine-and-a-broadcast-look.md)

## Context

Every panel was the same Mantine card under an 11-pixel gold label, and most screens showed everything they had at once:
- a sixteen-column squad table that repeated the starter cards above it
- all fifteen 2026 statistics on the player page
- two lineup cards and the whole scouting report before the draft
- a suggestions panel in champion select with room for three
- emoji in the play-by-play, and a bare Victory badge after a game

The rating bands made a strong team's numbers all the same green, so the colour said nothing. The user liked the look, but felt that something was missing and that there was too much data.

## Decision

- **Three surfaces.** A stage, one per screen, for what the screen is about: the next match, the player, the result. Cards for the jobs done there, titled in the display face (`Section`). Quiet rows for the rest.
- **One job per colour.**
  - gold for what you can act on
  - the club's colour (`--team`, set by `CareerLayout`) for who you are
  - hextech teal for what your staff tell you
  - green and orange only for what stands out
  - blue and red only for map sides
- **A number earns colour against its context.** In a squad, an attribute is coloured only when it is two points above or below the starting five's average. Absolute bands stay where quality is mixed, as in scouting.
- **Details on demand.** The summary comes first, the rest behind a toggle or a hover: the full stats, the full scouting report, the coach's breakdown of a suggestion, the full game report.
- **What needs the manager is a list.** Home's "This week" lists bids, reports, scrim load, debt and contracts. The second line of **Continue** says where it leads. Bank and patch leave the top bar unless the bank is in debt.
- **Match day takes the window.** While a series is live, AppShell's header and navbar collapse on `/match` and the match screen draws its own bar.
- **One type family.** Barlow for text, Barlow Condensed for titles and big numbers.
- **The client derives, the API stays.** The agenda, storylines, player verdicts, contested comfort picks and post-game reasons are derived from data the views already return. No endpoint was added.

## Consequences

Screens say what matters first, and the data that left them is one click away.

The client makes a few more requests:
- Home also loads the schedule and the training view.
- The top bar loads the competition list on every screen.
- Each finished competition's final placement is fetched once per session for the season track.

The verdicts and post-game reasons are client heuristics. If the backend learns to explain its own results, the text should come from there instead.
