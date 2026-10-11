# 0002. A manager-game layout

Date: 2026-10-11
Status: Accepted

## Context

Riftlike is a single run seen one step at a time. League Manager is a career with a dozen places to look at any moment: the squad, the table, the inbox, the meta, other teams.

## Decision

The layout follows Football Manager:
- **Sidebar.** A fixed sidebar with the club, the sections, and badges for unread mail, your pick and match day.
- **Top bar.** It shows the date, patch, payroll and bank, and one Continue button that always does the next sensible thing.
- **Screens.** They are dense tables and panels rather than cards.

The Hextech palette and fonts carry over from riftlike's `tokens.css`, with tokens added for map sides and rating bands.

## Consequences

Most screens are a table plus a side panel, built from a few shared classes (`panel`, `table`, `chip`, `tabs`) in `global.css`, with CSS Modules for screen-specific layout. The layout collapses to one column on narrow screens, but the game is made for a desktop window.
