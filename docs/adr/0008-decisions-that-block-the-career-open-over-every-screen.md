# 0008. Decisions that block the career open over every screen

Date: 2026-10-12
Status: Accepted, amended by [0010](0010-creating-the-manager-blocks-the-career-first.md)

## Context

The backend now has two states in which a career cannot go on until the manager decides something:
- a board meeting about the season's objectives, when a job starts and every off-season
- a list of job offers after a sacking

During a meeting the draft and `advance` are refused, and while the manager has no club, every action but taking a job is refused.

Other decisions wait without blocking anything: bids for the manager's players and players who want to talk. They expire if nobody answers.

Players can be on any screen when one of these arrives, and the career context already reloads after every action.

## Decision

`CareerLayout` renders the meeting or the job offers as a modal over the current screen whenever the career summary says one is waiting. The modal cannot be closed, only answered. The **Continue** button names the decision instead of moving the calendar.

Decisions that do not block appear in three places, each with the buttons to answer it:
- the message that announced them, in the inbox
- the transfers screen
- a count on the Transfers item in the sidebar

**Continue** takes the manager to the transfers screen while one of them is open, rather than letting days pass over it by accident.

## Consequences

A blocking decision can never be missed or worked around by navigating away, and the client needs no routing logic for it. The draft room's AI timer keeps calling `draft_next` during a meeting; the backend treats that as a no-op, so nothing breaks. Decisions that do not block stay out of the way during a match but are one click from every screen.
