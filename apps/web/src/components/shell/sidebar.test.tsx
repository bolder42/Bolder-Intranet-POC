import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  it('renders the dashboard link as active', () => {
    render(<Sidebar user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }} />);

    const dashboard = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboard).toHaveAttribute('href', '/app');
    expect(dashboard).toHaveAttribute('aria-current', 'page');
  });

  it('shows the workspace name and role', () => {
    render(<Sidebar user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'tech_lead' }} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
  });

  it('renders project navigation and the sign-out control', () => {
    render(<Sidebar user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'dev' }} />);

    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/app/projects',
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to the email when no name is present', () => {
    render(<Sidebar user={{ email: 'ada@example.com', role: 'dev' }} />);

    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Dev')).toBeInTheDocument();
  });
});
