# 0005. Mantine and a broadcast look

Date: 2026-10-11
Status: Accepted, supersedes [0002](0002-a-manager-game-layout.md)

## Context

The first client kept riftlike's hand-written CSS and Hextech tokens. A manager game needs much more from its components than riftlike did:
- searchable selects and segmented controls
- sticky-header tables in scroll areas
- tooltips on every attribute and accordions for rival rosters
- number inputs for contract talks and notifications for refused actions

The user's own component library, core-ui, is built on Mantine. As of today, though, it has:
- five light-theme components and no dark scheme
- a private GitHub Packages distribution, and the token on this machine cannot read packages

The game was also meant to stop looking like riftlike and to show logos, photos and champion art everywhere.

## Decision

The client uses Mantine 9, the same base as core-ui, directly, on React 19. `src/theme.ts` defines a dark broadcast palette:
- League's gold as the primary colour
- hextech teal as the second accent
- a custom dark scale and the map's blue and red for sides

The type is Barlow Condensed for display and Inter for everything else. Screen-specific visuals stay in CSS Modules: splash-art heroes, the champion-select pick columns, the bracket. The manager layout from 0002 stays in its new form, as Mantine's AppShell: a sidebar, a top bar with one Continue button, and dense tables.

## Consequences

Screens are built from Mantine components and are much shorter. Refused actions show as notifications instead of a banner. Moving to core-ui later is a theme and import change rather than a rewrite, once core-ui has a dark scheme and the package can be installed here. Mantine adds about 200 kB to the bundle, which is fine for a desktop game.
