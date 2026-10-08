import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from './theme-provider';

const matchMediaMocks = new Map<string, MediaQueryListEvent['matches']>();

function setMatchMedia(query: string, matches: boolean) {
  matchMediaMocks.set(query, matches);
}

function mockMatchMedia() {
  return vi.fn((query: string) => ({
    matches: matchMediaMocks.get(query) ?? false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function installMatchMediaMock() {
  window.matchMedia = mockMatchMedia() as unknown as typeof window.matchMedia;
}

function TestConsumer() {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="mounted">{mounted ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        Go dark
      </button>
      <button type="button" onClick={() => setTheme('light')}>
        Go light
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        Go system
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    matchMediaMocks.clear();
    setMatchMedia('(prefers-color-scheme: dark)', false);
    installMatchMediaMock();
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('defaults to system and resolves to light when OS prefers light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(screen.getByTestId('mounted').textContent).toBe('yes');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system to dark when OS prefers dark', () => {
    setMatchMedia('(prefers-color-scheme: dark)', true);
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reads the stored preference and applies it', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists explicit theme changes to localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Go dark' }).click();
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      screen.getByRole('button', { name: 'Go light' }).click();
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system against the OS when switching back to system', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved').textContent).toBe('dark');

    act(() => {
      screen.getByRole('button', { name: 'Go system' }).click();
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
