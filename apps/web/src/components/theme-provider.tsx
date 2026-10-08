'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's explicit preference, or 'system' when following OS. */
  theme: ThemeMode;
  /** The currently applied theme after resolving 'system'. */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference explicitly. */
  setTheme: (theme: ThemeMode) => void;
  /** True once the client has hydrated and read the stored preference. */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage may be disabled in private/sandboxed browsing.
  }
  return 'system';
}

export interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Minimal theme provider that mirrors the standard next-themes contract:
 * - persists the preference to localStorage as 'theme'
 * - resolves 'system' against prefers-color-scheme
 * - keeps <html data-theme="..."> in sync.
 *
 * The initial data-theme is set by a blocking inline script in the root layout
 * so the page never flashes on first paint. Components that render differently
 * per theme should read `mounted` and avoid mismatching the server render.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    setThemeState(mode);
    setResolvedTheme(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    applyTheme(readStoredTheme());

    const listener = (event: MediaQueryListEvent) => {
      const currentMode = readStoredTheme();
      if (currentMode === 'system') {
        applyTheme('system');
      } else if (event.matches && currentMode === 'light') {
        // If the user flips OS theme while on an explicit choice, stay explicit.
        // We only re-apply system when stored === 'system'.
      }
    };

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [applyTheme]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      try {
        localStorage.setItem('theme', mode);
      } catch {
        // Ignore storage errors.
      }
      applyTheme(mode);
    },
    [applyTheme],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, mounted }),
    [theme, resolvedTheme, setTheme, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
