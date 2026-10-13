import { useEffect, useSyncExternalStore } from 'react';
import { api } from '../api/client';

// Tiny shared store so the Sidebar and the Settings page always show the same
// system name, and renaming it in Settings updates the sidebar immediately.
let state = { name: 'TMC-Care', version: '1.0.0', loaded: false };
let loading = false;
const listeners = new Set();

function emit(next) {
  state = { ...state, ...next };
  document.title = state.name;
  listeners.forEach((l) => l());
}

export function loadSystemInfo() {
  if (loading || state.loaded) return;
  loading = true;
  api.get('/system')
    .then((data) => emit({ ...data, loaded: true }))
    .catch(() => {})
    .finally(() => { loading = false; });
}

export async function saveSystemName(name) {
  const data = await api.put('/system', { name });
  emit({ ...data, loaded: true });
  return data;
}

export function useSystemInfo() {
  const info = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );
  useEffect(() => { loadSystemInfo(); }, []);
  return info;
}
