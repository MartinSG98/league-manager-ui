# 0011. Champion select music from your own files

Date: 2026-10-14
Status: Accepted

## Context

Champion select should sound like a broadcast: one of the scene's champion select tracks for the splits, another set for First Stand, MSI and Worlds, and one track for a deciding game 5. That music is copyrighted. The repo cannot ship it, and the game should not download it.

## Decision

The player supplies the files. They go in three git-ignored folders, `public/music/splits`, `international` and `decider`, named however the player likes. A Vite plugin in `vite.config.ts` lists the folders at `/music/index.json`. The dev server reads them on every request, and `vite build` writes the list into the build. `src/lib/music.ts` chooses a track per champion select and keeps the volume, and `ChampSelectMusic` plays it from the start of the select until **Play game**.

## Consequences

Nothing copyrighted is in the repo, and new files play from the next champion select without a restart. A clone without files shows "No music yet" in champion select and works the same otherwise. The client never knows the tracks in advance, so a file the browser cannot play is found only when it fails. It is then skipped for another from the same folder.
