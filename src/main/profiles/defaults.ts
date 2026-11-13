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
 * 2b2t profile: Fabric + Meteor Client + Baritone, auto-joins 2b2t.org.
 *
 * 2b2t runs ViaVersion, so newer clients can usually join. The Minecraft version
 * here must match the Meteor build: Meteor only publishes builds for the newest
 * Minecraft version (older ones are on meteorclient.com/archive).
 */
export const TWO_B_TWO_T_PROFILE: Profile = {
  id: '2b2t',
  name: '2b2t (anarchy)',
  minecraftVersion: '1.21.11',
  loader: 'fabric',
  mods: [
    {
      id: 'meteor-client',
      name: 'Meteor Client',
      source: { type: 'meteor' },
      required: true,
    },
    {
      id: 'baritone',
      name: 'Baritone',
      // Meteor's site offers a Baritone build for the same version.
      // Paste its direct download link here to have the launcher fetch it.
      source: { type: 'url', url: '', fileName: 'baritone.jar' },
      required: false,
    },
  ],
  server: {
    address: '2b2t.org',
    autoJoin: true,
    lock: true,
  },
  memoryMb: 4096,
  warning:
    'Hack mods. Only for anarchy servers like 2b2t. Using them on other servers will get you banned.',
  builtIn: true,
};

export const BUILT_IN_PROFILES: Profile[] = [DEFAULT_PROFILE, TWO_B_TWO_T_PROFILE];
