# bbb-plugin-arena-3d

BigBlueButton plugin (BBB 4.0, SDK `0.1.26`): a retro first-person arena shooter, in the spirit
of the 90s Build-engine games, played by everyone in the session. A moderator starts a match;
the arena replaces the presentation in everyone's media area, and each participant sees and
shoots the others in real time.

Everything is original and generated in code: the level is data, textures are painted on a
canvas, characters are built from boxes and sounds are synthesized with Web Audio. The plugin
downloads no assets and uses no third-party game content.

## How it works

- **Apps gallery → Arena 3D**
  - Moderators get a modal to **start a match**, start a **new round** (every score back to
    zero) or **stop the match**.
  - While a match runs, other participants get an entry that brings the arena back if they hid it.
- **Media area:** while a match runs, the arena replaces the presentation for everyone. Each
  person can switch back with the media-area option **Show presentation** / **Show Arena 3D**.
  That choice is stored per browser, per match.
- **Lazy download:** three.js and the game are a separate chunk (~600 KB), downloaded only when
  the arena is shown. The always-loaded bundle holds only the plugin wiring.

## Gameplay

- One level, *Rooftop Rumble*: a walled yard with a central tower, four buildings with stairs,
  two high ledges reached by jump pads, cover, and a slime pit that hurts.
- Two hitscan weapons: the **Blaster** (precise, double damage on headshots) and the
  **Shotgun** (nine pellets, short range).
- 100 health; health kits on the map (local to each player: each one sees and takes their own).
- Dying shows who fragged you and respawns you after 3 seconds at the spawn point farthest from
  everyone, with 1.5 s of protection.
- Falling out of the map or dying in the slime counts as a death, not as anyone's frag.

### Controls

Click the arena to capture the mouse, then:

| Input | Action |
|---|---|
| W A S D / arrow keys | Move |
| Mouse | Aim |
| Left click | Shoot |
| Space | Jump |
| Shift | Walk (slower) |
| 1 / 2, Q, mouse wheel | Switch weapon |
| Tab (hold) | Scoreboard |
| M | Sound on/off |
| Esc | Release the mouse |

Keys only reach the game while the mouse is captured, so typing in the chat never moves you.

## Multiplayer

All traffic goes through two plugin data channels; there is no game server.

| Channel | Written by | Content |
|---|---|---|
| `match` | moderators | `{ active, round }`: one entry per match, replaced on a new round |
| `players` | everyone (one entry each, replaced) | position, aim, health, weapon, shot and hit counters, deaths and who caused them, recent hits |

- **Sending:** each player replaces its own entry at most every 250 ms, only when something
  changed (moves under 3 cm are ignored), plus an 8 s heartbeat while in the arena.
- **Drawing others:** remote players are drawn 600 ms in the past and blended between updates
  (data channels reach clients through a Hasura live query refetched every ~333 ms). Players not
  heard from for 25 s, who hid the arena, or who left the meeting are not drawn.
- **Hits:** the shooter decides what it hit, against the players as drawn on its screen, and
  lists the hit (target, damage, a sequence number) in its own entry for 3 s. The target applies
  each hit once. This favours the shooter, as most casual shooters do; with ~1 s of end-to-end
  delay, you can occasionally be hit just after ducking behind a wall.
- **Score:** each victim records who fragged it (`kb`) in its own entry, so every client computes
  the same scoreboard, and a reload keeps your score for the round.
- **Trust:** like any client-authoritative game, a modified client can lie about hits. Payloads
  from other clients are validated (types, ranges, sizes), and identity always comes from the
  data-channel entry's creator, never from the payload.

## Settings

All optional:

| Setting | Type | Default | Meaning |
|---|---|---|---|
| `debug` | boolean | `false` | Debug-level logs |
| `maxPlayers` | int (2–64) | `16` | Players drawn at once, yourself included; the nearest ones win |
| `renderScale` | float (0.25–1) | `0.75` | Fraction of the screen resolution the game renders at (pixelated upscale); lower is faster |

```yaml
# /etc/bigbluebutton/bbb-html5.yml
public:
  plugins:
    - name: BbbPluginArena3d
      url: https://host/plugins/bbb-plugin-arena-3d/manifest.json
      settings:
        debug: false
        maxPlayers: 16
        renderScale: 0.75
```

## Development

Node 24 (see `.nvmrc`).

```bash
npm install
npm start               # dev server on :4701, serves /manifest.json
npm run build-bundle    # production build in dist/
npm run typecheck
npm run lint
npm run test:unit
npm audit --omit=dev
```

Point a meeting at the manifest with `pluginManifests=[{"url": "https://<host>/manifest.json"}]`.
BBB 4.0 only accepts https manifest URLs on a public host (or under the server's `/plugins/`), so
for a remote server expose the dev server through ngrok.

### Layout

```
src/
  components/   React: plugin wiring (main), moderator modal, arena host (lazy), HUD, scoreboard
  match/        the `match` data channel
  net/          the `players` data channel and the game net (throttling, interpolation, events)
  game/         three.js game, no React: engine, level, player physics, weapons, combat,
                remote avatars, effects and audio, input
  settings/  session/  store/  users/  commons/
tests/unit/     vitest: net, physics, weapons, combat, level, match, settings
```

## Usage logs

`plg_started` when someone opens the arena, `plg_stopped` when it closes for them.
