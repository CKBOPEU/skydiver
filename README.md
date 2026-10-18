# SkyDiver

SkyDiver is a complete browser arcade game built with JavaScript and Phaser 3 for Yandex Games. The player steers a wingsuit pilot through clouds, storms, and canyons while collecting coins, chaining near misses, using active abilities, and unlocking cosmetic suits.

## Live demo

[Play the public browser demo](https://skydiver-game.glad-hen-8100.chatgpt.site/). Yandex Games services such as ads, cloud saves, purchases, and leaderboards are replaced with safe local fallbacks outside the platform.

## Highlights

- Deterministic flight simulation with a fixed 120 Hz update step
- Keyboard, mouse, touch, and responsive mobile controls
- Three flight zones with moving hazards, wind, and readable safe routes
- Boost, temporary shield, slowdown, magnet, combo, and near-miss systems
- Cosmetic hangar, tasks, achievements, daily rewards, and two currencies
- Yandex Games SDK integration for lifecycle events, ads, cloud saves, payments, and leaderboards
- Offline runtime with bundled Phaser and locally licensed audio

## Run locally

Install Node.js, then run:

```bash
node tools/serve.cjs
```

Open `http://127.0.0.1:8765`.

Controls: mouse or `A`/`D` and arrow keys to steer, `Space` to boost, `Q` for slowdown, `E` for shield, and `Esc` or `P` to pause. On touch devices, drag horizontally inside the game area.

## Tests

```bash
node --test tests/*.test.cjs
```

The suite covers deterministic movement at different frame rates, collision and near-miss handling, route reachability, difficulty progression, long-session stability, pause behavior, economy, save migration, purchases, rewarded actions, audio startup, and release integrity.

## Build a Yandex Games package

```bash
node tools/package.cjs
```

This creates `release/SkyDiver-v2.zip` with only the runtime files required by the platform.

## Project structure

- `js/FlightCore.js` — platform-independent flight simulation
- `js/FlightArt.js` — generated textures, scenery, and Phaser effects
- `js/FlightUI.js` — responsive game interface
- `js/Game.js` — game lifecycle and system orchestration
- `js/YandexManager.js` — platform SDK, ads, saves, payments, and leaderboard integration
- `js/SaveManager.js` — local data and save migration
- `js/AudioManager.js` — music, effects, wind, and Web Audio fallback
- `tests/flight.test.cjs` — automated gameplay and release checks

## Third-party assets

Phaser is distributed under the MIT license; see `vendor/PHASER-LICENSE.md`. Audio sources and licenses are listed in `assets/audio/LICENSES.md`. The game graphics used at runtime are generated in code.

## Status

The browser game and its Yandex Games release package are complete and locally tested. Real advertising, purchases, cloud synchronization, and leaderboards require final verification inside the publisher dashboard.

## Author

Dmitry Kopytov — [Kopytovdv1999@gmail.com](mailto:Kopytovdv1999@gmail.com)
