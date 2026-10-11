# 0006. Local champion art, esports images from Riot's CDN

Date: 2026-10-11
Status: Accepted, supersedes [0003](0003-champion-art-from-data-dragon.md)

## Context

0003 loaded champion icons straight from Data Dragon and showed teams as tags. Since then:
- the backend serves logos for every team and league, plus player photos (backend ADR 0009)
- the redesign uses three kinds of champion art: square icons, tall loading-screen portraits in champion select, and wide splashes behind heroes and cards

Riftlike keeps all of its champion art locally. A local copy loads fast and works offline, while depending on it alone would break a fresh clone.

## Decision

Champion art lives in `public/champions/{icons,loading,splash}` and the five role icons in `public/roles`. `npm run fetch:art` downloads them from Data Dragon and CommunityDragon: 524 files, about 42 MB. Both folders are git-ignored, because the art belongs to Riot and anyone can fetch it.

`<Img>` takes a list of sources and moves down it on error. Champion art tries the local file first and the CDN second. Logos and photos come from the URLs the API returns, which point at Riot's esports CDN. At about 600 kB per photo, they are not worth copying.

Every image has a text fallback: the tag on the team colour, initials on a photo circle, or two letters on a champion square.

## Consequences

With the art downloaded, champion select and the splash heroes load instantly. Without it, everything still works from the CDN. Moving to a new patch means rerunning `npm run fetch:art` with that patch. Logos and photos need internet access and follow whatever Riot's CDN serves.
