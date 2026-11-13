import type { Profile } from './types';

/**
 * Built-in profiles. They are written to disk on first start and recreated if
 * deleted. The user can still edit them (version, RAM, mods) in the profile files.
 */

export const DEFAULT_PROFILE: Profile = {
  id: 'default',
  name: 'Default',
  minecraftVersion: '1.21.11',
  loader: 'fabric',
  mods: [],
  memoryMb: 4096,
  builtIn: true,
};

/**
 * 2b2t profile: Fabric + the Okina companion mod with hacks turned on.
 * Locked to 2b2t.org, so the hacks can't be used on other servers by accident.
 *
 * 2b2t runs ViaVersion, so newer clients can usually join. The companion mod
 * is built for 1.21.11; keep this version in sync with companion-mod/gradle.properties.
 */
export const TWO_B_TWO_T_PROFILE: Profile = {
  id: '2b2t',
  name: '2b2t (anarchy)',
  minecraftVersion: '1.21.11',
  loader: 'fabric',
  mods: [
    {
      id: 'fabric-api',
      name: 'Fabric API',
      source: { type: 'modrinth', project: 'fabric-api' },
      required: true,
    },
    {
      id: 'okina-companion',
      name: 'Okina Companion',
      source: { type: 'bundled', fileName: 'okina-companion.jar' },
      required: true,
    },
  ],
  server: {
    address: '2b2t.org',
    autoJoin: true,
    lock: true,
  },
  hacks: true,
  memoryMb: 4096,
  warning:
    'Hacks on. Only for anarchy servers like 2b2t. Using them on other servers will get you banned.',
  builtIn: true,
};

export const BUILT_IN_PROFILES: Profile[] = [DEFAULT_PROFILE, TWO_B_TWO_T_PROFILE];
