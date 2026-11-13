import { useEffect, useState } from 'react';
import type { PreparedLaunch, Profile, SyncProgress } from '../../main/profiles/types';
import type { ProfilesApi } from '../../preload/profiles';

declare global {
  interface Window {
    okinaProfiles: ProfilesApi;
  }
}

interface Props {
  /** Called once the selected profile's mods are ready. Hook this up to the actual game launch. */
  onReady: (launch: PreparedLaunch) => void;
}

/** Profile dropdown + Play button. Sits next to/replaces the main Play button. */
export function ProfilePicker({ onReady }: Props) {
  const api = window.okinaProfiles;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState('default');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.list(), api.getSelected()])
      .then(([list, selected]) => {
        setProfiles(list);
        setSelectedId(selected);
      })
      .catch((err: Error) => setError(err.message));
  }, [api]);

  useEffect(() => api.onProgress((event) => setStatus(describe(event))), [api]);

  const selected = profiles.find((p) => p.id === selectedId);

  async function choose(id: string) {
    setSelectedId(id);
    setError('');
    try {
      await api.select(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function play() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setStatus('Getting ready…');
    try {
      const launch = await api.prepare(selected.id);
      setStatus(
        launch.skippedMods.length
          ? `Skipped: ${launch.skippedMods.map((m) => `${m.id} (${m.reason})`).join(', ')}`
          : '',
      );
      onReady(launch);
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-picker">
      <label className="profile-picker__label" htmlFor="okina-profile">
        Profile
      </label>
      <select
        id="okina-profile"
        className="profile-picker__select"
        value={selectedId}
        disabled={busy}
        onChange={(e) => choose(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.minecraftVersion}
          </option>
        ))}
      </select>

      {selected && (
        <p className="profile-picker__details">
          {selected.loader === 'fabric' ? 'Fabric' : 'Vanilla'}
          {selected.mods.length > 0 && ` · ${selected.mods.map((m) => m.name).join(', ')}`}
          {selected.server?.autoJoin && ` · joins ${selected.server.address}`}
        </p>
      )}

      {selected?.warning && <p className="profile-picker__warning">⚠ {selected.warning}</p>}

      <button className="profile-picker__play" disabled={busy || !selected} onClick={play}>
        {busy ? 'Preparing…' : 'Play'}
      </button>

      {status && <p className="profile-picker__status">{status}</p>}
      {error && <p className="profile-picker__error">{error}</p>}
    </div>
  );
}

function describe(event: SyncProgress): string {
  switch (event.kind) {
    case 'checking':
      return `Checking ${event.modName}…`;
    case 'downloading':
      return `Downloading ${event.modName}…`;
    case 'up-to-date':
      return `${event.modName} is up to date`;
    case 'skipped':
      return `Skipped ${event.modName}: ${event.reason}`;
    case 'removed':
      return `Removed ${event.fileName}`;
  }
}
