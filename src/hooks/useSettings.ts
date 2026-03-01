import { useLocalStorage } from './useLocalStorage';
import { Settings } from '@/utils/types';
import { useEffect } from 'react';

const defaultSettings: Settings = {
  darkMode: false,
  defaultSets: 3,
  defaultUnit: 'lbs',
  defaultRestTime: 2,
  confirmOnFinish: true,
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>('w8ly-settings', defaultSettings);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, setSettings, updateSetting };
}
