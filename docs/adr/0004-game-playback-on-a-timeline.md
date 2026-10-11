# 0004. Game playback on a timeline

Date: 2026-10-11
Status: Superseded by [0007](0007-game-playback-on-a-running-clock.md)

## Context

The backend simulates a whole game the moment the manager presses play and returns a list of timed events and a gold difference for every minute. Showing only the final scoreboard would waste the most exciting part of the game.

## Decision

`useTimeline` plays the events one after another, the same idea as riftlike's playback. Each event stays on screen for roughly as long as the game time until the next event, within limits, at 1×, 2× or 4×.

While the game plays:
- The clock, the kill score, objective counters and the gold graph follow the current event.
- The series score at the top hides the result of the game being played.
- A skip button jumps to the final scoreboard.

## Consequences

The result is fixed before playback starts, so speeding up, skipping or reloading never changes it. A typical game plays back in about a minute at 1×.
