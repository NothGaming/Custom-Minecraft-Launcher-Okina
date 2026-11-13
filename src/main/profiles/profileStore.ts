import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BUILT_IN_PROFILES } from './defaults';
import type { Profile } from './types';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isValidProfileId(id: string): boolean {
  return ID_PATTERN.test(id);
}

/**
 * Stores profiles as JSON files:
 *
 *   <dataDir>/profiles/<id>.json     one file per profile
 *   <dataDir>/profiles/_selected.json   { "selected": "<id>" }
 *   <dataDir>/instances/<id>/        game folder per profile
 */
export class ProfileStore {
  readonly profilesDir: string;
  readonly instancesDir: string;
  private readonly selectedFile: string;

  /**
   * @param dataDir      launcher data folder (app.getPath('userData'))
   * @param bundledModsDir folder with jars shipped with the launcher, e.g. okina-companion.jar
   *                     (in a packaged app: path.join(process.resourcesPath, 'mods'))
   */
  constructor(dataDir: string, readonly bundledModsDir: string = path.join(dataDir, 'bundled-mods')) {
    this.profilesDir = path.join(dataDir, 'profiles');
    this.instancesDir = path.join(dataDir, 'instances');
    this.selectedFile = path.join(this.profilesDir, '_selected.json');
  }

  /** Creates folders and writes any missing built-in profile. Call once at startup. */
  async init(): Promise<void> {
    await fs.mkdir(this.profilesDir, { recursive: true });
    await fs.mkdir(this.instancesDir, { recursive: true });
    for (const profile of BUILT_IN_PROFILES) {
      const file = this.fileFor(profile.id);
      if (!(await exists(file))) await writeJson(file, profile);
    }
  }

  async list(): Promise<Profile[]> {
    const entries = await fs.readdir(this.profilesDir);
    const profiles: Profile[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json') || entry.startsWith('_')) continue;
      try {
        profiles.push(validateProfile(await readJson(path.join(this.profilesDir, entry))));
      } catch (err) {
        console.warn(`[profiles] skipping ${entry}: ${(err as Error).message}`);
      }
    }
    // Built-ins first, in their defined order, then the rest by name.
    const order = BUILT_IN_PROFILES.map((p) => p.id);
    return profiles.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.name.localeCompare(b.name);
    });
  }

  async get(id: string): Promise<Profile> {
    if (!isValidProfileId(id)) throw new Error(`Invalid profile id: ${id}`);
    return validateProfile(await readJson(this.fileFor(id)));
  }

  async save(profile: Profile): Promise<void> {
    await writeJson(this.fileFor(validateProfile(profile).id), profile);
  }

  async delete(id: string): Promise<void> {
    const profile = await this.get(id);
    if (profile.builtIn) throw new Error('Built-in profiles cannot be deleted.');
    await fs.rm(this.fileFor(id));
    if ((await this.getSelectedId()) === id) await this.select('default');
  }

  async getSelectedId(): Promise<string> {
    try {
      const { selected } = (await readJson(this.selectedFile)) as { selected?: string };
      if (selected && isValidProfileId(selected) && (await exists(this.fileFor(selected)))) {
        return selected;
      }
    } catch {
      // no selection saved yet
    }
    return 'default';
  }

  async select(id: string): Promise<void> {
    await this.get(id); // throws if it doesn't exist
    await writeJson(this.selectedFile, { selected: id });
  }

  gameDirFor(id: string): string {
    if (!isValidProfileId(id)) throw new Error(`Invalid profile id: ${id}`);
    return path.join(this.instancesDir, id);
  }

  private fileFor(id: string): string {
    if (!isValidProfileId(id)) throw new Error(`Invalid profile id: ${id}`);
    return path.join(this.profilesDir, `${id}.json`);
  }
}

/** Checks the shape of a profile loaded from disk. Throws with a readable message. */
export function validateProfile(value: unknown): Profile {
  const p = value as Profile;
  if (!p || typeof p !== 'object') throw new Error('not an object');
  if (typeof p.id !== 'string' || !isValidProfileId(p.id)) throw new Error('bad "id"');
  if (typeof p.name !== 'string' || !p.name.trim()) throw new Error('missing "name"');
  if (typeof p.minecraftVersion !== 'string' || !p.minecraftVersion) {
    throw new Error('missing "minecraftVersion"');
  }
  if (p.loader !== 'vanilla' && p.loader !== 'fabric') throw new Error('"loader" must be vanilla or fabric');
  if (!Array.isArray(p.mods)) throw new Error('"mods" must be a list');
  if (p.loader === 'vanilla' && p.mods.length > 0) throw new Error('vanilla profiles cannot have mods');
  const ids = new Set<string>();
  for (const mod of p.mods) {
    if (!mod || typeof mod.id !== 'string' || !isValidProfileId(mod.id)) throw new Error('bad mod "id"');
    if (ids.has(mod.id)) throw new Error(`duplicate mod id "${mod.id}"`);
    ids.add(mod.id);
    const t = mod.source?.type;
    if (t !== 'modrinth' && t !== 'meteor' && t !== 'url' && t !== 'bundled') {
      throw new Error(`mod "${mod.id}": unknown source`);
    }
    if ((t === 'url' || t === 'bundled') && !/^[\w.-]+\.jar$/.test(mod.source.fileName)) {
      throw new Error(`mod "${mod.id}": fileName must end in .jar`);
    }
  }
  if (p.hacks !== undefined && typeof p.hacks !== 'boolean') throw new Error('"hacks" must be true or false');
  if (p.hacks && !p.server?.lock) throw new Error('profiles with hacks must lock to a server');
  if (typeof p.memoryMb !== 'number' || p.memoryMb < 512) throw new Error('"memoryMb" must be at least 512');
  if (p.server && (typeof p.server.address !== 'string' || !p.server.address)) {
    throw new Error('server needs an "address"');
  }
  return p;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

/** Writes to a temp file first so a crash never leaves half a profile. */
async function writeJson(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}
