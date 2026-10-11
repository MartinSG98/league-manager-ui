# 0003. Champion art from Data Dragon, no team logos

Date: 2026-10-11
Status: Superseded by [0006](0006-local-champion-art-and-esports-images.md)

## Context

Champion select and scoreboards are unreadable without champion portraits, and all 173 champions are in the game. Riftlike stored its art locally and kept it out of git.

## Decision

Portraits load straight from Riot's Data Dragon CDN, using the patch the backend reports and the Data Dragon id the backend uses as each champion's id. If an image fails, a letter fallback shows. Teams are shown as their tag on their own colour. Logos belong to the organisations and are not used.

## Consequences

There is nothing to download or set up, and the repo stays small. The client needs internet access for portraits, and a new champion appears as soon as the backend's patch includes it.
