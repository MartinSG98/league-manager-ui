# 0010. Creating the manager blocks the career first

Date: 2026-10-14
Status: Accepted. Amends [0008](0008-decisions-that-block-the-career-open-over-every-screen.md)

## Context

The backend now makes the manager a person, created once after the club is picked: a background, a nationality and points spread over nine attributes. Until the manager exists the draft, `advance`, the board meeting, bids, offers and the next season are refused. A career from before this change opens with no manager and must create one before anything else.

0008 covers two blocking decisions, the board meeting and the job offers. This is a third, and it comes before both.

## Decision

`CareerLayout` shows `CreateManager` as a modal over every screen while the career summary's `profile` is `null`. Like the other two, it cannot be closed, only answered. The meeting and the job offers wait behind it. **Continue** says "Create your manager" and does nothing else until it is done.

A server from before managers sends no `profile` at all (undefined, not null), so the client does not block it.

## Consequences

A new career and an old save reach the same screen the same way: nothing can be done until the manager exists, and nothing extra is needed in the title or new-career pages. The modal shows each background's bonus, reputation and points as the server computes them, so the client keeps no rules of its own.
