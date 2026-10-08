import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/actions', () => ({
  signOutAction: vi.fn(),
}));

window.matchMedia = vi.fn((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? false : false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

import { ThemeProvider } from '@/components/theme-provider';

import { AppShell } from './app-shell';

function renderWithProviders(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the sidebar expanded by default', () => {
    renderWithProviders(
      <AppShell user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }}>
        <main>Page content</main>
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'App navigation' })).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('collapses the sidebar when the toggle is clicked and persists it', () => {
    renderWithProviders(
      <AppShell user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }}>
        <main>Page content</main>
      </AppShell>,
    );

    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
  });

  it('reads the persisted collapse state from localStorage', () => {
    localStorage.setItem('sidebar-collapsed', 'true');

    renderWithProviders(
      <AppShell user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }}>
        <main>Page content</main>
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('round-trips the collapse: click → expand → click → collapse', () => {
    renderWithProviders(
      <AppShell user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }}>
        <main>Page content</main>
      </AppShell>,
    );

    const shell = document.querySelector('.app-shell');
    expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
  });
});
