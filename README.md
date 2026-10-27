# Okina Launcher

A free, open-source desktop launcher for Minecraft: Java Edition, in the spirit of Feather and Badlion.
Sign in with your Microsoft account, pick a version or a CurseForge modpack, and press Play.

> **Status:** early development. Nothing is released yet.

## Planned features

- **Microsoft account login**: sign in with the account that owns Minecraft and stay signed in
- **One-click launch**: downloads the game, libraries and Java automatically
- **Instances**: separate installs per version or modpack, with Fabric support
- **CurseForge modpacks**: browse, install and update modpacks and mods from CurseForge
- **Okina companion mod**: in-game extras such as inventory sort buttons
- **Auto-updates**: the launcher keeps itself up to date

## Respecting mod authors

Okina does not rehost any mod files. Mods and modpacks are downloaded directly from CurseForge
through the official CurseForge API, and only when the author allows third-party distribution.
Each mod's name, author and CurseForge page are shown and linked in the launcher.

## Tech stack

- Electron + TypeScript + React (launcher)
- Fabric, Java 21 (companion mod)

## Roadmap

1. Launch vanilla Minecraft
2. Microsoft login
3. Instances and Fabric
4. CurseForge modpacks
5. Companion mod (in-game extras)
6. Auto-updates and first public release

## Disclaimer

Okina Launcher is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.
