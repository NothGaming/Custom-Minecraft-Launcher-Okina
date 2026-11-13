# Profiles

A profile is a launch setup: Minecraft version, mod loader, mods, an optional server and RAM.
Each profile has its own game folder, so mods from one profile never end up in another.

## Built-in profiles

| Profile | Version | Mods | Server |
| --- | --- | --- | --- |
| Default | 1.21.11, Fabric | none | none |
| 2b2t (anarchy) | 1.21.11, Fabric | Fabric API, Okina companion mod with hacks on | auto-joins `2b2t.org`, locked |

The 2b2t profile is for anarchy servers only. Hacks get you banned almost everywhere else,
which is why a profile with `"hacks": true` must lock itself to a server. The hacks themselves
are in the companion mod: see [okina-client.md](okina-client.md).

## Where things are stored

Inside the launcher's data folder (Electron's `app.getPath('userData')`):

```
profiles/
  default.json
  2b2t.json
  _selected.json        last selected profile
instances/
  default/              game folder for the Default profile
  2b2t/
    mods/
      fabric-api-0.141.3+1.21.11.jar
      okina-companion.jar
      .okina-mods.json  mods installed by the launcher (others are left alone)
    okina-profile.json  read by the Okina companion mod
```

## Profile file format

```json
{
  "id": "2b2t",
  "name": "2b2t (anarchy)",
  "minecraftVersion": "1.21.11",
  "loader": "fabric",
  "mods": [
    { "id": "fabric-api", "name": "Fabric API", "source": { "type": "modrinth", "project": "fabric-api" } },
    { "id": "okina-companion", "name": "Okina Companion", "source": { "type": "bundled", "fileName": "okina-companion.jar" } }
  ],
  "server": { "address": "2b2t.org", "autoJoin": true, "lock": true },
  "hacks": true,
  "memoryMb": 4096
}
```

Mod sources:

- `{ "type": "modrinth", "project": "sodium" }`: picks the newest Fabric build for the profile's version and checks its hash
- `{ "type": "bundled", "fileName": "okina-companion.jar" }`: a jar shipped with the launcher (copied from the bundled mods folder)
- `{ "type": "meteor" }`: Meteor Client from meteorclient.com (the official site; ignore look-alike sites offering `.exe` installers)
- `{ "type": "url", "url": "https://…", "fileName": "x.jar" }`: a direct link; an empty `url` skips the mod

If a `required` mod can't be downloaded, launching stops. Optional mods are skipped and the old file is kept.

## How it plugs into the launcher

Main process:

```ts
import { app } from 'electron';
import { ProfileStore, registerProfileIpc } from './profiles';

const store = new ProfileStore(app.getPath('userData'));
await store.init();
registerProfileIpc(store);
```

Preload:

```ts
import { exposeProfilesApi } from './profiles';
exposeProfilesApi();
```

Renderer:

```tsx
<ProfilePicker onReady={(launch) => startGame(launch)} />
```

`startGame` is the vanilla/Fabric launch step (roadmap steps 1 and 3). It should add
`launch.jvmArgs` and `launch.gameArgs` to the normal Minecraft command line. `gameArgs`
already holds `--gameDir` and, for 2b2t, `--quickPlayMultiplayer 2b2t.org`.

## Server lock

`--quickPlayMultiplayer` only auto-joins. The lock itself is in the companion mod: it reads
`okina-profile.json` and disconnects you from any server not in `allowedServers`.

## To check

- If 2b2t stops accepting 1.21.11, change `minecraftVersion` in the 2b2t profile and in
  `companion-mod/gradle.properties`.
- Meteor's endpoints (only used if you add a `meteor` mod to a profile) are in `src/main/profiles/modSync.ts`.
