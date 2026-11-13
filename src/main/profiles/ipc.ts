import { ipcMain, type WebContents } from 'electron';
import { prepareLaunch } from './prepareLaunch';
import type { ProfileStore } from './profileStore';

/**
 * IPC channels for the profile system. Call registerProfileIpc(store) once in the
 * main process after store.init(). The preload script exposes them as window.okina.profiles.
 */
export const PROFILE_CHANNELS = {
  list: 'profiles:list',
  getSelected: 'profiles:get-selected',
  select: 'profiles:select',
  prepare: 'profiles:prepare',
  progress: 'profiles:progress',
} as const;

export function registerProfileIpc(store: ProfileStore): void {
  ipcMain.handle(PROFILE_CHANNELS.list, () => store.list());

  ipcMain.handle(PROFILE_CHANNELS.getSelected, () => store.getSelectedId());

  ipcMain.handle(PROFILE_CHANNELS.select, (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Profile id must be a string.');
    return store.select(id);
  });

  ipcMain.handle(PROFILE_CHANNELS.prepare, (event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Profile id must be a string.');
    const sender: WebContents = event.sender;
    return prepareLaunch(store, id, (progress) => {
      if (!sender.isDestroyed()) sender.send(PROFILE_CHANNELS.progress, progress);
    });
  });
}
