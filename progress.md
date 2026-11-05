# Lone Wolf 1v1 — Telegram Mini App Game

> Living progress file. Any AI/dev resuming this project: read this first, then continue from "Next steps".

## Goal
Free Fire "Lone Wolf"-style 1v1 third-person shooter that runs inside a Telegram Mini App and can be launched
from Telegram groups with `/start` (or `/play`).

Rules implemented:
- 1v1, 5 rounds max, first to **3 round wins** wins the match.
- Each round both players get the **same single weapon** (random per round from the weapon pool).
- 200 HP, headshots deal bonus damage, no pickups/armor.
- Round timer 75s. If time runs out, higher HP % wins the round (tie = no point, round replays).
- Short freeze/countdown (3s) at round start, results screen between rounds.

## Tech stack
- Next.js 16 App Router (pnpm)
- three + @react-three/fiber + @react-three/drei (rendering)
- @react-three/rapier (physics: character capsule, colliders, raycast hit detection)
- zustand (game state store)
- Telegram WebApp JS SDK (loaded via `<Script>` in layout) + Bot API webhook route

## File map
- `app/page.tsx` — entry, renders `<GameRoot/>` (client only, dynamic import, ssr false)
- `components/game/game-root.tsx` — screens: menu / match / results
- `components/game/scene.tsx` — Canvas, lights, physics world
- `components/game/map/industrial-yard.tsx` — the single map ("Dockyard" style industrial compound)
- `components/game/player.tsx` — local player controller (TPS camera, movement, shooting)
- `components/game/bot.tsx` — AI opponent (until realtime multiplayer is added)
- `components/game/soldier-model.tsx` — procedural humanoid soldier model + animation
- `components/game/weapons.ts` — weapon definitions
- `components/game/store.ts` — zustand store: match/round state, HP, ammo
- `components/game/input.ts` — keyboard/mouse + touch input state
- `components/game/hud/*` — HUD, mobile controls, overlays
- `lib/telegram.ts` — Telegram WebApp helpers (ready/expand/fullscreen/haptics)
- `app/api/telegram/webhook/route.ts` — bot webhook: `/start` `/play` in groups -> game launch button
- `app/api/telegram/setup/route.ts` — one-time webhook registration helper
- `public/textures/*` — generated PBR-ish albedo textures (jpg)

## Env vars needed (set in v0 Vars / Vercel)
- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `TELEGRAM_WEBHOOK_SECRET` — any random string; used for webhook header check + setup route
- `TELEGRAM_BOT_USERNAME` — bot username without @
- `TELEGRAM_MINIAPP_SHORT_NAME` — short name of Mini App created via BotFather `/newapp` (direct link t.me/<bot>/<short>)
- `TELEGRAM_GAME_SHORT_NAME` — (optional) if you create an HTML5 Game via BotFather `/newgame`, bot uses `sendGame`
- `NEXT_PUBLIC_APP_URL` — (optional) public URL of deployed app (used for callback_game url)

## Status
- [x] Plan + progress file
- [x] Deps installed (three, r3f, drei, rapier 2.2 [rapier compat 0.19 -> use `hit.timeOfImpact`], zustand)
- [x] Textures generated (public/textures/*.jpg, 1024px mozjpeg)
- [x] Store / weapons / input (`store.ts`, `weapons.ts`, `runtime.ts`, `use-desktop-input.ts`)
- [x] Map (`map/industrial-yard.tsx`, point-symmetric cover so both spawns are fair)
- [x] Player controller + shooting (`player.tsx`)
- [x] Bot AI (`bot.tsx`: LOS raycast, strafe, obstacle feelers, reaction time, difficulty)
- [x] HUD + mobile controls + menus (`hud/*`)
- [x] Telegram SDK integration + bot webhook (`lib/telegram.ts`, `app/api/telegram/*`)
- [x] Typecheck passes (`npx tsc --noEmit`)
- [x] Browser verification: menu, countdown, HUD, map, bot pathing confirmed (dev debug: `window.__lw` = runtime)

## Telegram setup checklist (for the user)
1. @BotFather -> `/newbot` -> copy token into `TELEGRAM_BOT_TOKEN`; set `TELEGRAM_BOT_USERNAME`.
2. @BotFather -> `/newapp` (Mini App) -> pick bot, set URL to deployed app -> short name into `TELEGRAM_MINIAPP_SHORT_NAME`.
   (Alternative: `/newgame` -> short name into `TELEGRAM_GAME_SHORT_NAME` to use native `sendGame`.)
3. @BotFather -> `/setjoingroups` Enable; `/setprivacy` can stay Enabled (commands still reach the bot).
4. Set `TELEGRAM_WEBHOOK_SECRET`, deploy, then open `https://<domain>/api/telegram/setup?secret=<secret>` once.
5. In a group: add bot, send `/start` or `/play` -> tap "Play Lone Wolf".

## Known limitations / tuning ideas
- Opponent is an AI bot (no realtime PvP yet — see Next steps #1).
- Soldier + guns are procedural primitives; swap to GLB for AAA look (`useGLTF` + Mixamo anims).
- Round timer is frame-driven (dt clamped to 0.1s); fine on real devices.

## Next steps (after the above)
1. Realtime 1v1 multiplayer (replace bot): use a realtime transport (Supabase Realtime broadcast channels
   or PartyKit/Ably). Room id = Telegram `start_param` (group chat id + message id). Host-authoritative:
   each client sends {pos, rot, anim, shoot events} at 20Hz, host validates hits & owns round state.
2. Optional user-provided GLB models (character, gun, map) — drop into `public/models/` and swap in
   `soldier-model.tsx` / `industrial-yard.tsx` using `useGLTF`.
3. Leaderboard per group via Telegram `setGameScore` (only when using sendGame flow).
4. Sound effects (gunshots, footsteps, hit markers).

## Notes / decisions
- No websockets on Vercel serverless -> multiplayer needs a hosted realtime service (see next steps).
- Mobile-first controls: left joystick, right-side drag to look, fire/aim/jump/reload buttons.
- Desktop: click to lock pointer, WASD, mouse look, LMB fire, RMB aim, Space jump, R reload, Shift sprint.
