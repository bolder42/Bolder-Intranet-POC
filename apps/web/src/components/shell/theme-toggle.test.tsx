import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/theme-provider';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('is keyboard accessible and has a descriptive label', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });
  });

  it('toggles the resolved theme when clicked', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button');

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });
  });
});
