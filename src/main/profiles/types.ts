/**
 * Profile system types.
 *
 * A profile is a named launch setup: Minecraft version, mod loader, mod list,
 * an optional target server and memory. Every profile gets its own game folder
 * (instances/<profileId>), so mods from one profile never leak into another.
 */

/** Where a mod's jar comes from. */
export type ModSource =
  /** A project on Modrinth, by slug or id. The matching version is picked automatically. */
  | { type: 'modrinth'; project: string }
  /** Meteor Client, from the official site meteorclient.com. */
  | { type: 'meteor' }
  /** A direct download link. Leave `url` empty to skip the mod until it is filled in. */
  | { type: 'url'; url: string; fileName: string };

export interface ProfileMod {
  /** Stable id used to track the installed file, e.g. "meteor-client". */
  id: string;
  /** Name shown in the launcher. */
  name: string;
  source: ModSource;
  /** If true, launching stops when this mod can't be downloaded. Default: true. */
  required?: boolean;
}

export interface ProfileServer {
  /** Server address, e.g. "2b2t.org". */
  address: string;
  /** Join this server straight from the launcher (uses --quickPlayMultiplayer). */
  autoJoin: boolean;
  /**
   * Only allow this server while the profile is active.
   * The launcher writes the rule to okina-profile.json in the game folder;
   * the Okina companion mod enforces it in-game.
   */
  lock: boolean;
}

export interface Profile {
  /** Lowercase letters, numbers and dashes only. Also the folder name. */
  id: string;
  name: string;
  /** Minecraft version, e.g. "1.21.11". */
  minecraftVersion: string;
  loader: 'vanilla' | 'fabric';
  mods: ProfileMod[];
  server?: ProfileServer;
  /** Max RAM for the game in MB. */
  memoryMb: number;
  /** Shown as a warning badge in the UI (used for the 2b2t profile). */
  warning?: string;
  /** Built-in profiles are recreated if deleted. */
  builtIn?: boolean;
}

/** What the launch step needs from a prepared profile. */
export interface PreparedLaunch {
  profileId: string;
  minecraftVersion: string;
  loader: Profile['loader'];
  gameDir: string;
  /** Extra JVM args, e.g. -Xmx. */
  jvmArgs: string[];
  /** Extra game args, e.g. --gameDir, --quickPlayMultiplayer. */
  gameArgs: string[];
  /** Mods that were skipped (optional mods that failed or have no URL yet). */
  skippedMods: { id: string; reason: string }[];
}

/** Progress events sent to the UI while mods download. */
export type SyncProgress =
  | { kind: 'checking'; modId: string; modName: string }
  | { kind: 'downloading'; modId: string; modName: string; fileName: string }
  | { kind: 'up-to-date'; modId: string; modName: string }
  | { kind: 'skipped'; modId: string; modName: string; reason: string }
  | { kind: 'removed'; fileName: string };
