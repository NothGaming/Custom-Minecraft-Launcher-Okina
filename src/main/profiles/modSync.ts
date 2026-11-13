import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Profile, ProfileMod, SyncProgress } from './types';

/**
 * Downloads the mods a profile needs into <gameDir>/mods and removes mods that
 * were installed by the launcher but are no longer in the profile.
 *
 * Files the user dropped into the mods folder themselves are never touched:
 * only files listed in .okina-mods.json (written by this module) are managed.
 */

const USER_AGENT = 'NothGaming/okina-launcher (github.com/NothGaming/Custom-Minecraft-Launcher-Okina)';
const MODRINTH_API = 'https://api.modrinth.com/v2';

/**
 * Meteor Client's official site. Only ever download Meteor from here:
 * look-alike sites that hand out ".exe installers" are not official.
 * If Meteor changes these endpoints, update them here.
 */
const METEOR_STATS_URL = 'https://meteorclient.com/api/stats';
const METEOR_DOWNLOAD_URL = 'https://meteorclient.com/api/download';

const MANIFEST_NAME = '.okina-mods.json';

interface ManifestEntry {
  /** File name inside the mods folder. */
  fileName: string;
  /** Version marker used to decide whether to re-download (Modrinth version id, Meteor build, or URL). */
  version: string;
}
type Manifest = Record<string, ManifestEntry>;

/** A resolved download: what file to fetch and how to check it. */
interface Resolved {
  url: string;
  /** Set for bundled mods: copy this file instead of downloading. */
  localPath?: string;
  fileName: string;
  version: string;
  sha512?: string;
}

export interface SyncResult {
  skippedMods: { id: string; reason: string }[];
}

export async function syncMods(
  profile: Profile,
  gameDir: string,
  onProgress: (event: SyncProgress) => void = () => {},
  bundledModsDir?: string,
): Promise<SyncResult> {
  const modsDir = path.join(gameDir, 'mods');
  await fs.mkdir(modsDir, { recursive: true });

  const manifestPath = path.join(modsDir, MANIFEST_NAME);
  const oldManifest = await readManifest(manifestPath);
  const newManifest: Manifest = {};
  const skippedMods: SyncResult['skippedMods'] = [];

  for (const mod of profile.mods) {
    const required = mod.required !== false;
    onProgress({ kind: 'checking', modId: mod.id, modName: mod.name });

    let resolved: Resolved | null;
    try {
      resolved = await resolveMod(mod, profile.minecraftVersion, bundledModsDir);
    } catch (err) {
      const reason = (err as Error).message;
      if (required) throw new Error(`${mod.name}: ${reason}`);
      // Keep the old file if one exists, so a site being down doesn't remove a working mod.
      if (oldManifest[mod.id]) newManifest[mod.id] = oldManifest[mod.id];
      skippedMods.push({ id: mod.id, reason });
      onProgress({ kind: 'skipped', modId: mod.id, modName: mod.name, reason });
      continue;
    }

    if (!resolved) {
      const reason = 'no download link set in the profile';
      skippedMods.push({ id: mod.id, reason });
      onProgress({ kind: 'skipped', modId: mod.id, modName: mod.name, reason });
      continue;
    }

    const previous = oldManifest[mod.id];
    const target = path.join(modsDir, resolved.fileName);
    if (previous && previous.version === resolved.version && previous.fileName === resolved.fileName && (await exists(target))) {
      newManifest[mod.id] = previous;
      onProgress({ kind: 'up-to-date', modId: mod.id, modName: mod.name });
      continue;
    }

    onProgress({ kind: 'downloading', modId: mod.id, modName: mod.name, fileName: resolved.fileName });
    try {
      await download(resolved, target);
    } catch (err) {
      const reason = (err as Error).message;
      if (required) throw new Error(`${mod.name}: ${reason}`);
      if (previous) newManifest[mod.id] = previous;
      skippedMods.push({ id: mod.id, reason });
      onProgress({ kind: 'skipped', modId: mod.id, modName: mod.name, reason });
      continue;
    }
    newManifest[mod.id] = { fileName: resolved.fileName, version: resolved.version };

    // Remove the old file if the name changed (e.g. a new version).
    if (previous && previous.fileName !== resolved.fileName) {
      await removeModFile(modsDir, previous.fileName, onProgress);
    }
  }

  // Remove mods the launcher installed earlier that are no longer in the profile.
  const keptFiles = new Set(Object.values(newManifest).map((e) => e.fileName));
  for (const [id, entry] of Object.entries(oldManifest)) {
    if (!newManifest[id] && !keptFiles.has(entry.fileName)) {
      await removeModFile(modsDir, entry.fileName, onProgress);
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(newManifest, null, 2) + '\n', 'utf8');
  return { skippedMods };
}

async function resolveMod(mod: ProfileMod, mcVersion: string, bundledModsDir?: string): Promise<Resolved | null> {
  const source = mod.source;
  switch (source.type) {
    case 'modrinth':
      return resolveModrinth(source.project, mcVersion);
    case 'meteor':
      return resolveMeteor(mcVersion);
    case 'url':
      if (!source.url) return null;
      if (!source.url.startsWith('https://')) throw new Error('download link must start with https://');
      return { url: source.url, fileName: source.fileName, version: source.url };
    case 'bundled': {
      if (!bundledModsDir) throw new Error('no bundled mods folder configured');
      const localPath = path.join(bundledModsDir, safeFileName(source.fileName));
      const stat = await fs.stat(localPath).catch(() => null);
      if (!stat) throw new Error(`${source.fileName} is missing from ${bundledModsDir} (build the companion mod first)`);
      return {
        url: '',
        localPath,
        fileName: safeFileName(source.fileName),
        version: `${stat.size}-${stat.mtimeMs}`,
      };
    }
  }
}

async function resolveModrinth(project: string, mcVersion: string): Promise<Resolved> {
  const query = new URLSearchParams({
    loaders: JSON.stringify(['fabric']),
    game_versions: JSON.stringify([mcVersion]),
  });
  const versions = (await getJson(
    `${MODRINTH_API}/project/${encodeURIComponent(project)}/version?${query}`,
  )) as ModrinthVersion[];

  // Prefer releases, newest first (Modrinth already sorts newest first).
  const pick = versions.find((v) => v.version_type === 'release') ?? versions[0];
  if (!pick) throw new Error(`no Fabric build for Minecraft ${mcVersion} on Modrinth`);
  const file = pick.files.find((f) => f.primary) ?? pick.files[0];
  if (!file) throw new Error('Modrinth version has no files');

  return {
    url: file.url,
    fileName: safeFileName(file.filename),
    version: pick.id,
    sha512: file.hashes.sha512,
  };
}

interface ModrinthVersion {
  id: string;
  version_type: 'release' | 'beta' | 'alpha';
  files: { url: string; filename: string; primary: boolean; hashes: { sha512?: string } }[];
}

async function resolveMeteor(mcVersion: string): Promise<Resolved> {
  const stats = (await getJson(METEOR_STATS_URL)) as Record<string, unknown>;
  // Field names as returned by Meteor's stats endpoint.
  const meteorMc = String(stats.mc_version ?? stats.mcVersion ?? '');
  const build = String(stats.devBuild ?? stats.version ?? '');

  if (meteorMc && meteorMc !== mcVersion) {
    throw new Error(
      `the latest Meteor build is for Minecraft ${meteorMc}, but this profile uses ${mcVersion}. ` +
        `Change the profile's version to ${meteorMc}, or get an older Meteor from meteorclient.com/archive.`,
    );
  }

  return {
    url: METEOR_DOWNLOAD_URL,
    fileName: safeFileName(`meteor-client-${mcVersion}${build ? `-${build}` : ''}.jar`),
    version: `${meteorMc}-${build}`,
  };
}

async function download(resolved: Resolved, target: string): Promise<void> {
  let data: Buffer;
  if (resolved.localPath) {
    data = await fs.readFile(resolved.localPath);
  } else {
    const res = await fetch(resolved.url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
    if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
    data = Buffer.from(await res.arrayBuffer());
  }

  // A jar is a zip file, which always starts with "PK".
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) {
    throw new Error('downloaded file is not a .jar');
  }
  if (resolved.sha512) {
    const actual = createHash('sha512').update(data).digest('hex');
    if (actual !== resolved.sha512) throw new Error('file is corrupted (hash mismatch)');
  }

  const tmp = `${target}.part`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, target);
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`request to ${new URL(url).host} failed (HTTP ${res.status})`);
  return res.json();
}

async function readManifest(file: string): Promise<Manifest> {
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8')) as Manifest;
    // Drop entries with unsafe names instead of trusting them.
    for (const [id, entry] of Object.entries(data)) {
      if (!entry || typeof entry.fileName !== 'string' || entry.fileName !== safeFileName(entry.fileName)) {
        delete data[id];
      }
    }
    return data;
  } catch {
    return {};
  }
}

async function removeModFile(modsDir: string, fileName: string, onProgress: (e: SyncProgress) => void) {
  try {
    await fs.rm(path.join(modsDir, safeFileName(fileName)));
    onProgress({ kind: 'removed', fileName });
  } catch {
    // already gone
  }
}

/** Keeps a file name inside the mods folder (no slashes, no "..") and makes sure it ends in .jar. */
function safeFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.+-]/g, '_');
  if (!base || base.startsWith('.')) throw new Error(`unsafe file name: ${name}`);
  return base.endsWith('.jar') ? base : `${base}.jar`;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
