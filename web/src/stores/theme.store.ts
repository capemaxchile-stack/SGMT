import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ColorPreset = 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';

export interface TerminologyConfig {
  locationSingular: string;
  locationPlural: string;
  itemSingular: string;
  itemPlural: string;
  assetSingular: string;
  assetPlural: string;
}

export const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  locationSingular: 'Faena',
  locationPlural: 'Faenas',
  itemSingular: 'Repuesto',
  itemPlural: 'Repuestos',
  assetSingular: 'Maquinaria',
  assetPlural: 'Maquinarias',
};

export const COLOR_PALETTES: Record<
  ColorPreset,
  {
    name: string;
    primary: string;
    ring: string;
    scale: Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;
  }
> = {
  blue: {
    name: 'Azul Corporativo',
    primary: '#2563eb',
    ring: '#3b82f6',
    scale: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  emerald: {
    name: 'Verde Esmeralda',
    primary: '#059669',
    ring: '#10b981',
    scale: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  amber: {
    name: 'Ámbar Industrial',
    primary: '#d97706',
    ring: '#f59e0b',
    scale: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
  },
  indigo: {
    name: 'Índigo Ejecutivo',
    primary: '#4f46e5',
    ring: '#6366f1',
    scale: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
  },
  rose: {
    name: 'Rojo Rubí',
    primary: '#e11d48',
    ring: '#f43f5e',
    scale: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
    },
  },
  slate: {
    name: 'Pizarra Sobrio',
    primary: '#334155',
    ring: '#64748b',
    scale: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
};

interface ThemeState {
  theme: Theme;
  colorPreset: ColorPreset;
  copilotEnabled: boolean;
  terminology: TerminologyConfig;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setColorPreset: (preset: ColorPreset) => void;
  setCopilotEnabled: (enabled: boolean) => void;
  setTerminology: (terms: Partial<TerminologyConfig>) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      colorPreset: 'blue',
      copilotEnabled: true,
      terminology: { ...DEFAULT_TERMINOLOGY },
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: nextTheme });
        applyTheme(nextTheme);
      },
      setColorPreset: (preset) => {
        set({ colorPreset: preset });
        applyColorPresetToDOM(preset);
      },
      setCopilotEnabled: (enabled) => {
        set({ copilotEnabled: enabled });
      },
      setTerminology: (terms) => {
        set((state) => ({
          terminology: {
            ...state.terminology,
            ...terms,
          },
        }));
      },
    }),
    {
      name: 'sgmt-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyColorPresetToDOM(state.colorPreset || 'blue');
        }
      },
    },
  ),
);

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function applyColorPresetToDOM(preset: ColorPreset) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const palette = COLOR_PALETTES[preset] || COLOR_PALETTES.blue;

  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-ring', palette.ring);
  (Object.keys(palette.scale) as unknown as Array<keyof typeof palette.scale>).forEach((shade) => {
    root.style.setProperty(`--color-primary-${shade}`, palette.scale[shade]);
  });
}

// Immediate initial execution
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('sgmt-theme-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.theme) {
        applyTheme(parsed.state.theme);
      }
      if (parsed?.state?.colorPreset) {
        applyColorPresetToDOM(parsed.state.colorPreset);
      }
    }
  } catch {}
}
