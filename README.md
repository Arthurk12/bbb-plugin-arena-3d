# bbb-plugin-arena-3d

BigBlueButton plugin (BBB 4.0, plugin SDK `^1.0.0-beta.1`): a retro first-person arena shooter, in the spirit
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
- **Single bundle:** three.js and the game ship in the plugin's only JS file, since BBB loads
  just the manifest's entrypoint. The game code runs only when the arena is shown.

## Gameplay

- One level, *Rooftop Rumble*: a walled yard with a central tower, four buildings with stairs,
  two high ledges reached by jump pads, cover, and a slime pit that hurts.
- Four hitscan weapons: the **Blaster** (precise, double damage on headshots), the
  **Shotgun** (nine pellets, short range), the **SMG** (automatic: hold to fire, light
  damage) and the **Sniper** (slow, kills with one headshot, optical scope).
- Where a shot lands matters: the body has four zones (head, torso, arms, legs) that follow the
  avatar as it is drawn, turning with the player and lifting the arms with the aim. Each weapon
  multiplies its damage by zone, and loses damage with distance:

  | Weapon | Damage (torso) | Head | Arms / legs | Full damage up to | Weakest (at) |
  |---|---|---|---|---|---|
  | Blaster | 22 | ×2 | ×0.75 | 40 m | 70% (100 m) |
  | Shotgun | 9 per pellet, 9 pellets | ×1.25 | ×0.8 | 8 m | 30% (30 m) |
  | SMG | 8 | ×1.5 | ×0.75 | 15 m | 50% (45 m) |
  | Sniper | 70 | ×2 | ×0.6 | any distance | — |

- The hit marker tells what you hit: red and larger for the head, grey and smaller for arms and
  legs. The kill feed shows the weapon of each frag and marks headshots with ◎.
- Switching weapons lowers the gun in hand and raises the next one in about a quarter of a
  second; you can't shoot meanwhile. Everyone else sees the gun you hold.
- **Sniper scope:** hold the right mouse button. The view zooms in (75° to 20°), the gun leaves
  the screen, you walk, and the mouse turns slower with the zoom. Fully zoomed in, shots go
  exactly where the crosshairs are; from the hip they spread.
- **Ammo:** every gun has a magazine and a reserve; each shot spends one round (a shotgun shell
  counts once). R reloads, and an empty magazine reloads by itself while there is reserve; the
  gun dips while reloading and can't shoot, and switching weapons cancels it. Amber **ammo
  boxes** on the yard floor top up every reserve; like the health kits, each player sees and
  takes their own, and they come back after 20 seconds.

  | Weapon | Magazine | Reserve (start / max) | Reload | Ammo box adds |
  |---|---|---|---|---|
  | Blaster | 12 | 36 / 72 | 1.1 s | 24 |
  | Shotgun | 6 | 12 / 24 | 1.8 s | 8 |
  | SMG | 30 | 60 / 150 | 1.6 s | 60 |
  | Sniper | 5 | 5 / 15 | 2.2 s | 5 |

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
| Right click (hold) | Sniper scope |
| Space | Jump |
| Shift | Walk (slower) |
| 1–4, Q, mouse wheel | Switch weapon |
| R | Reload |
| Tab (hold) | Scoreboard |
| M | Sound on/off |
| Esc | Release the mouse |

Keys only reach the game while the mouse is captured, so typing in the chat never moves you.

## Multiplayer

The match itself is a plugin data channel; the game traffic goes through the arena relay, a small
WebSocket service next to BBB (see [Relay](#relay)).

| Channel | Written by | Content |
|---|---|---|
| `match` | moderators | `{ active, round }`: a single entry, replaced on a new round and on stop; a new match deletes it and pushes a new one |

- **Rooms:** each round of a match is a room on the relay. Opening the arena joins it; hiding the
  arena or closing the tab leaves it. Scores belong to the room and outlive players who leave.
- **Sending:** each player sends its pose at most 20 times a second, only when it moved (2 cm or
  0.02 rad), and once a second while idle.
- **Drawing others:** the relay sends snapshots at 20 Hz; remote players are drawn 100 ms behind
  the relay's clock and blended between snapshots.
- **Hits:** the relay decides. A shot carries the time of what the shooter saw; the relay rewinds
  the targets to that moment (at most 200 ms back, and only if that time agrees with the
  shooter's measured latency, aim included), regenerates the pellets from the shot's seed, and
  checks walls, cooldown, who was alive and which body zone each pellet met. You can still be hit just after ducking behind a wall, but by at
  most 0.2 s of movement.
- **Trust:** identity comes from BBB's session check in nginx, never from a message. Damage,
  kills, scores and ammo cannot be forged: the relay counts every round, refuses a shot with an
  empty magazine or during a reload, and gives an ammo box only to a player it sees by it
  (health kits are still the client's word). Positions are still reported by each client and
  only checked for speed, so a modified client can still see through walls or aim for you; the
  relay also takes its word that a sniper shot went through the scope.

## Settings

All optional:

| Setting | Type | Default | Meaning |
|---|---|---|---|
| `debug` | boolean | `false` | Debug-level logs |
| `maxPlayers` | int (2–64) | `16` | Players drawn at once, yourself included; the nearest ones win |
| `renderScale` | float (0.25–1) | `0.75` | Fraction of the screen resolution the game renders at (pixelated upscale); lower is faster |
| `relayUrl` | string | empty | WebSocket URL of the relay; empty means `wss://<the BBB server serving the plugin>/arena-relay` |

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
        relayUrl: ''
```

## Relay

The arena needs its relay (`relay/`): without it the game shows "Can't reach the arena server".
It is a small Node service, authoritative for hits, health, deaths and scores, that runs next to
BBB on loopback, behind nginx `auth_request` like `/bbb-webrtc-sfu`:

```nginx
location /arena-relay {
    auth_request /bigbluebutton/connection/checkAuthorization;
    auth_request_set $auth_status $upstream_status;
    auth_request_set $user_id $sent_http_user_id;
    auth_request_set $meeting_id $sent_http_meeting_id;
    auth_request_set $user_name $sent_http_user_name;
    proxy_pass http://127.0.0.1:8099;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header User-Id $user_id;
    proxy_set_header Meeting-Id $meeting_id;
    proxy_set_header User-Name $user_name;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
}
```

nginx always overwrites the identity headers, so a client cannot choose who it is. Build and run
it with `npm run build-relay` and `npm run start-relay`; it listens on `RELAY_HOST` (default
`127.0.0.1`) and `RELAY_PORT` (default `8099`), and `GET /healthz` answers `ok`.

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
  protocol/     messages and limits shared with the relay
  relay-client/ WebSocket connection to the relay, clock sync, snapshot interpolation
  net/          limits shared with the relay (coordinates, health, ids)
  game/         three.js game, no React: engine, level, player physics, weapons, combat,
                remote avatars, effects and audio, input
  settings/  session/  store/  users/  commons/
relay/src/       the relay service (Node, WebSocket)
tests/unit/     vitest: relay, relay client, physics, weapons, combat, level, match, settings
```

## Usage logs

`plg_started` when someone opens the arena, `plg_stopped` when it closes for them.
