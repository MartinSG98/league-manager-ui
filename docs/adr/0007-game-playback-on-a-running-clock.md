# 0007. Game playback on a running clock

Date: 2026-10-11
Status: Accepted. Supersedes [0004](0004-game-playback-on-a-timeline.md)

## Context

Playback in 0004 stepped from one event to the next, each held for a time based on the gap until the next event. At 1× a 30-minute game took under 20 seconds, and the manager could not follow it. A game has only 25 to 45 events, so stretching the beats to a few minutes would leave the screen still for several seconds at a time.

## Decision

`useGameClock` runs a game clock from 0 to the last event's time, at 9 game seconds per real second at 1×. A 30-minute game takes about three and a half minutes, a 22-minute one about two and a half, a 45-minute one about five. The speeds are 1×, 2×, 5× and 10×, and the chosen speed is remembered in the browser.

While the game plays:
- An event appears when the clock reaches its time.
- The clock ticks every tenth of a second.
- The gold graph follows the clock minute by minute.
- The kill score and objective counters follow the latest event.

The series score stays hidden until the end, and skipping jumps to the final scoreboard as before.

## Consequences

Playback looks live: the clock keeps moving between fights, and quiet stretches of the game feel quiet. The result is still fixed before playback starts, so speed, skipping or a reload never change it.
