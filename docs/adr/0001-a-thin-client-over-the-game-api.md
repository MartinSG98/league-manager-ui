# 0001. A thin client over the game API

Date: 2026-10-11
Status: Accepted

## Context

The backend owns every rule: who can be drafted, what a champion is worth to a player, brackets, contracts. A manager game has many screens that each show a different slice of one career.

## Decision

The client keeps no game logic and no state library, the same approach as riftlike.

- **The career context.** It holds the career summary and an `act()` function that posts an action and swaps in the summary that comes back. It also bumps a revision number.
- **The screens.** Each screen loads its own view through `useApi`, which reloads when the revision changes and keeps the old data on screen while it does.
- **The response types.** They are hand-written in `src/api/types.ts` and keep the backend's snake_case names.

## Consequences

There is nothing to keep in sync except the types. After an action, every screen on view refetches, which costs a request but never shows stale numbers. Things the UI needs that are rule-shaped, such as why a draft pick is not allowed or the assistant's suggestions, come ready-made from the API.
