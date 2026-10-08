import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions', () => ({
  signOutAction: vi.fn(),
}));

import { FloatingToolbar } from './floating-toolbar';

describe('FloatingToolbar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders back, forward, and avatar with the user monogram', () => {
    render(<FloatingToolbar userName="Ada Lovelace" userRole="admin" />);

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Account menu: Ada Lovelace/i })).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('menu is closed by default', () => {
    render(<FloatingToolbar userName="Ada Lovelace" userRole="admin" />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Account menu/i }).getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('opens and closes the menu via the avatar toggle', () => {
    render(<FloatingToolbar userName="Ada Lovelace" userRole="tech_lead" />);

    const toggle = screen.getByRole('button', { name: /Account menu/i });
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside', () => {
    render(
      <div>
        <span data-testid="outside">outside</span>
        <FloatingToolbar userName="Ada Lovelace" userRole="admin" />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape', () => {
    render(<FloatingToolbar userName="Ada Lovelace" userRole="admin" />);

    fireEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('falls back to "User" when no name is provided', () => {
    render(<FloatingToolbar />);

    expect(screen.getByText('U')).toBeInTheDocument();
  });
});