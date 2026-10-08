'use client';

import { ThemeToggle as ThemeTogglePrimitive } from '@bolder/ui';

import { useTheme } from '@/components/theme-provider';

/**
 * Connected theme toggle mounted in the app header.
 *
 * Uses the web-specific ThemeContext and renders the generic UI primitive.
 * Before hydration completes we render a generic label to avoid mismatching
 * the server-rendered light default; the button stays keyboard accessible.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();

  return (
    <ThemeTogglePrimitive
      theme={mounted ? resolvedTheme : 'light'}
      onToggle={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={mounted ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
    />
  );
}
