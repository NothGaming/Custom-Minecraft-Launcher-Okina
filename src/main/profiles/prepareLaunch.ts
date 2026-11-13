import { promises as fs } from 'node:fs';
import path from 'node:path';
import { syncMods } from './modSync';
import type { ProfileStore } from './profileStore';
import type { PreparedLaunch, Profile, SyncProgress } from './types';

/**
 * Gets a profile ready to launch:
 *  1. creates its game folder (instances/<id>)
 *  2. downloads / updates / removes its mods
 *  3. writes okina-profile.json (read by the Okina companion mod, e.g. for the server lock)
 *  4. returns the extra JVM and game arguments for the launch step
 *
 * The launch step (vanilla + Fabric) is separate; it should take these args and
 * add them to the normal Minecraft command line.
 */
export async function prepareLaunch(
  store: ProfileStore,
  profileId: string,
  onProgress?: (event: SyncProgress) => void,
): Promise<PreparedLaunch> {
  const profile = await store.get(profileId);
  const gameDir = store.gameDirFor(profile.id);
  await fs.mkdir(gameDir, { recursive: true });

  const { skippedMods } = profile.loader === 'fabric' && profile.mods.length > 0
    ? await syncMods(profile, gameDir, onProgress, store.bundledModsDir)
    : { skippedMods: [] };

  await writeProfileInfo(profile, gameDir);

  return {
    profileId: profile.id,
    minecraftVersion: profile.minecraftVersion,
    loader: profile.loader,
    gameDir,
    jvmArgs: buildJvmArgs(profile),
    gameArgs: buildGameArgs(profile, gameDir),
    skippedMods,
  };
}

export function buildJvmArgs(profile: Profile): string[] {
  const maxMb = Math.round(profile.memoryMb);
  const minMb = Math.min(1024, maxMb);
  return [`-Xmx${maxMb}M`, `-Xms${minMb}M`];
}

export function buildGameArgs(profile: Profile, gameDir: string): string[] {
  const args = ['--gameDir', gameDir];
  if (profile.server?.autoJoin) {
    // Supported since Minecraft 1.20. Joins the server right after the game loads.
    args.push('--quickPlayMultiplayer', profile.server.address);
  }
  return args;
}

/** Info for the in-game companion mod. */
async function writeProfileInfo(profile: Profile, gameDir: string): Promise<void> {
  const info = {
    profileId: profile.id,
    profileName: profile.name,
    hacks: profile.hacks === true,
    allowedServers: profile.server?.lock ? [profile.server.address] : null,
  };
  await fs.writeFile(path.join(gameDir, 'okina-profile.json'), JSON.stringify(info, null, 2) + '\n', 'utf8');
}
