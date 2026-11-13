import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { PreparedLaunch, Profile, SyncProgress } from '../main/profiles/types';

// Channel names are repeated here (not imported) so the preload bundle doesn't pull in main-process code.
const CHANNELS = {
  list: 'profiles:list',
  getSelected: 'profiles:get-selected',
  select: 'profiles:select',
  prepare: 'profiles:prepare',
  progress: 'profiles:progress',
} as const;

const profilesApi = {
  list: (): Promise<Profile[]> => ipcRenderer.invoke(CHANNELS.list),
  getSelected: (): Promise<string> => ipcRenderer.invoke(CHANNELS.getSelected),
  select: (id: string): Promise<void> => ipcRenderer.invoke(CHANNELS.select, id),
  prepare: (id: string): Promise<PreparedLaunch> => ipcRenderer.invoke(CHANNELS.prepare, id),
  /** Subscribe to download progress. Returns a function that unsubscribes. */
  onProgress: (callback: (event: SyncProgress) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, progress: SyncProgress) => callback(progress);
    ipcRenderer.on(CHANNELS.progress, listener);
    return () => ipcRenderer.removeListener(CHANNELS.progress, listener);
  },
};

export type ProfilesApi = typeof profilesApi;

/** Call from the main preload script. */
export function exposeProfilesApi(): void {
  contextBridge.exposeInMainWorld('okinaProfiles', profilesApi);
}
