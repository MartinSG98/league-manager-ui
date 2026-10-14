import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const MUSIC = fileURLToPath(new URL("./public/music/", import.meta.url));
const POOLS = ["splits", "international", "decider"];
const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|webm|wav|flac)$/i;

function musicList(): Record<string, string[]> {
  return Object.fromEntries(
    POOLS.map((pool) => {
      const dir = MUSIC + pool;
      return [pool, existsSync(dir) ? readdirSync(dir).filter((f) => AUDIO.test(f)).sort() : []];
    }),
  );
}

/**
 * Champion select music: whatever audio files sit in public/music/splits, international and
 * decider, listed at /music/index.json (see src/lib/music.ts). Read on every request, so files
 * dropped in while the game runs play from the next champion select.
 */
function music(): Plugin {
  return {
    name: "champ-select-music",
    configureServer(server) {
      server.middlewares.use("/music/index.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(musicList()));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "music/index.json", source: JSON.stringify(musicList()) });
    },
  };
}

export default defineConfig({
  plugins: [react(), music()],
  server: { port: 5190, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the game, so they get their own cacheable chunks.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mantine: ["@mantine/core", "@mantine/hooks", "@mantine/notifications"],
          icons: ["@tabler/icons-react"],
        },
      },
    },
  },
});
