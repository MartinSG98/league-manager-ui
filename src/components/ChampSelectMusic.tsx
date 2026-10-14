import { ActionIcon, Group, Paper, Popover, Slider, Stack, Text, Tooltip } from "@mantine/core";
import { IconMusic, IconMusicOff, IconPlayerPlayFilled, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import type { MatchSummary } from "../api/types";
import { chooseTrack, musicFiles, setMusic, trackTitle, trackUrl, useMusic, type MusicPool, type Track } from "../lib/music";

/** Moves the volume to `to` over `ms`, on a timer so it finishes in a background tab too. */
function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void): () => void {
  const from = el.volume;
  const start = Date.now();
  const id = window.setInterval(() => {
    const k = Math.min(1, (Date.now() - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) {
      window.clearInterval(id);
      done?.();
    }
  }, 40);
  return () => window.clearInterval(id);
}

/**
 * The music of a champion select: a track for the competition (see lib/music), faded in when the
 * select starts and out when it ends, looping until then. A small control in the corner mutes it,
 * sets the volume and, when the browser blocks sound until a click, starts it.
 */
export function ChampSelectMusic({ match, game, active }: { match: MatchSummary; game: number; active: boolean }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [missing, setMissing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const { volume, muted } = useMusic();
  const audio = useRef<HTMLAudioElement | null>(null);
  const level = useRef(muted ? 0 : volume);
  level.current = muted ? 0 : volume;
  // The live view comes back as a new object after every move: the match is followed by its id.
  const current = useRef(match);
  current.current = match;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void musicFiles().then((files) => {
      if (cancelled) return;
      const t = chooseTrack(files, current.current, game);
      setTrack(t);
      setMissing(t === null);
    });
    return () => {
      cancelled = true;
    };
  }, [active, match.id, game]);

  const key = track ? trackUrl(track) : null;
  useEffect(() => {
    if (!active || !key) return;
    const el = new Audio(key);
    el.loop = true;
    el.volume = 0;
    audio.current = el;
    let stopFade = () => {};
    el.play()
      .then(() => {
        setBlocked(false);
        stopFade = fade(el, level.current, 1500);
      })
      .catch(() => setBlocked(true));
    return () => {
      stopFade();
      audio.current = null;
      fade(el, 0, 1200, () => {
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
    };
  }, [active, key]);

  useEffect(() => {
    if (audio.current && !audio.current.paused) audio.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  if (!active) return null;
  if (missing)
    return (
      <Paper withBorder radius="xl" px="sm" py={4} style={corner}>
        <Tooltip label="Add audio files to public/music/splits, public/music/international and public/music/decider" multiline w={260}>
          <Group gap={6} wrap="nowrap">
            <IconMusic size={14} color="var(--text-4)" />
            <Text fz="xs" c="dimmed">
              No music yet
            </Text>
          </Group>
        </Tooltip>
      </Paper>
    );
  if (!track) return null;

  function start() {
    const el = audio.current;
    if (!el) return;
    void el.play().then(() => {
      setBlocked(false);
      fade(el, level.current, 800);
    });
  }

  return (
    <Paper withBorder radius="xl" px="sm" py={4} style={corner}>
      <Group gap={8} wrap="nowrap">
        {blocked ? (
          <Tooltip label="The browser waits for a click before it plays sound">
            <ActionIcon size="sm" variant="filled" color="gold" onClick={start} aria-label="Play the music">
              <IconPlayerPlayFilled size={12} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setMusic({ muted: !muted })} aria-label={muted ? "Unmute the music" : "Mute the music"}>
            {muted ? <IconVolumeOff size={15} /> : <IconVolume size={15} />}
          </ActionIcon>
        )}
        <Text fz="xs" c={muted ? "dimmed" : "gray.3"} fw={600} maw={220} truncate title={track.file}>
          {trackTitle(track)}
        </Text>
        <VolumeSlider w={80} />
      </Group>
    </Paper>
  );
}

const corner = { position: "fixed", left: 16, bottom: 16, zIndex: 150, background: "rgba(11, 17, 28, 0.92)" } as const;

function VolumeSlider({ w }: { w: number }) {
  const { volume, muted } = useMusic();
  return (
    <Slider
      w={w}
      size="xs"
      color="gold"
      min={0}
      max={1}
      step={0.05}
      value={muted ? 0 : volume}
      label={(v) => `${Math.round(v * 100)}%`}
      onChange={(v) => setMusic(v > 0 ? { volume: v, muted: false } : { muted: true })}
    />
  );
}

const POOL_NAMES: Record<MusicPool, string> = { splits: "splits and playoffs", international: "First Stand, MSI, Worlds", decider: "game 5 at 2–2" };

/** The music control in the top bar: on or off and how loud, with how many tracks each folder holds. */
export function MusicControl() {
  const { volume, muted } = useMusic();
  const [files, setFiles] = useState<Partial<Record<MusicPool, string[]>> | null>(null);
  return (
    <Popover position="bottom-end" shadow="md" width={280} onOpen={() => void musicFiles().then(setFiles)}>
      <Popover.Target>
        <ActionIcon size="lg" variant="subtle" color={muted ? "gray" : "gold"} aria-label="Champion select music" title="Champion select music">
          {muted || volume === 0 ? <IconMusicOff size={20} /> : <IconMusic size={20} />}
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={700} fz="sm">
              Champion select music
            </Text>
            <ActionIcon variant="subtle" color="gray" onClick={() => setMusic({ muted: !muted })} aria-label={muted ? "Unmute the music" : "Mute the music"}>
              {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
            </ActionIcon>
          </Group>
          <VolumeSlider w={248} />
          {files && (
            <Stack gap={2}>
              {(Object.keys(POOL_NAMES) as MusicPool[]).map((pool) => (
                <Text key={pool} fz="xs" c={files[pool]?.length ? "gray.4" : "dimmed"}>
                  {files[pool]?.length ?? 0} {files[pool]?.length === 1 ? "track" : "tracks"} · {POOL_NAMES[pool]}
                </Text>
              ))}
              <Text fz={11} c="dimmed" mt={4}>
                Files go in public/music/splits, international and decider.
              </Text>
            </Stack>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
