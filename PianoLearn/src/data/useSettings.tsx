/**
 * Settings as React state, shared app-wide. Loaded once at startup; every
 * change applies immediately and is written through to the database.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSetting, type Settings } from './settings';

interface SettingsContextValue {
  settings: Settings;
  /** False until the saved settings have been read; before that `settings` are the defaults. */
  loaded: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    saveSetting(key, value).catch(() => {});
  }, []);

  const value = useMemo(() => ({ settings, loaded, set }), [settings, loaded, set]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
