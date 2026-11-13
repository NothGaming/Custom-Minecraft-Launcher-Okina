# Okina companion mod (hacks)

A Fabric mod for Minecraft 1.21.11 that comes with the launcher. Source: [`companion-mod/`](../companion-mod).

Hacks only turn on when **both** are true:

1. You launched with a profile that has `"hacks": true` (the built-in **2b2t** profile).
2. You're in singleplayer or on a server that profile allows (`2b2t.org`).

A profile with hacks must be locked to a server. While it's active, joining any other server is blocked
with a message telling you to switch profiles. In the normal profile the mod never runs any hacks.

## Controls

- **Right Shift**: open the Okina menu
- In the menu: click a module to turn it on/off, click **key** and press a key to bind it
  (Backspace clears the bind), use **< >** to change settings
- Bound keys toggle modules in-game and show ON/OFF above the hotbar
- Settings are saved per profile in `config/okina-companion.json`

## What's in it

### v0.1 (built, not yet compiled and tested)

| Module | What it does | Settings |
| --- | --- | --- |
| Menu | Right Shift menu with toggles, keybinds and settings | |
| Fullbright | See in the dark (client-side Night Vision) | |
| AutoTotem | Moves a totem into your offhand when one pops | delay |
| AutoEat | Eats the most filling food in your hotbar when hungry, skips bad foods and enchanted golden apples | hunger level |
| AutoReconnect | Countdown button on the Disconnected screen, rejoins the last server | delay |
| Server lock | Blocks joining servers the profile doesn't allow | |

### Next

| Module | What it does |
| --- | --- |
| HUD list | Shows active modules in the corner of the screen |
| ESP | Outlines players and mobs through walls |
| StorageESP | Highlights chests, shulkers, ender chests |
| Tracers | Lines pointing to nearby players |
| Freecam | Fly the camera around while your body stays still |
| NoFall | No fall damage |
| AutoArmor | Puts on the best armor in your inventory |
| ElytraFly | Easier elytra flight, tuned for 2b2t's anticheat |
| Flight | Creative-style flying, tuned for 2b2t's anticheat |

Movement hacks come last because 2b2t's anticheat checks movement; they need testing on the server.

## Building

You need Java 21 and Gradle (or IntelliJ IDEA, which can open the folder as a Gradle project).

```
cd companion-mod
gradle build
```

The jar ends up in `companion-mod/build/libs/okina-companion-0.1.0.jar`. Copy it to the launcher's
bundled mods folder as `okina-companion.jar`. By default that's `bundled-mods/` inside the launcher's
data folder; in a packaged app it should be `resources/mods/` (pass that path to `ProfileStore`).

To test in a dev client: `gradle runClient`. Put an `okina-profile.json` like this in `companion-mod/run/`
to turn hacks on:

```json
{ "profileId": "2b2t", "profileName": "2b2t (dev)", "hacks": true, "allowedServers": ["2b2t.org"] }
```
