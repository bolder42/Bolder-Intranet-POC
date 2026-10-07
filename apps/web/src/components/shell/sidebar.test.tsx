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
  it('renders the primary nav links', () => {
    render(<Sidebar user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }} />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/app');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/app/projects',
    );
  });

  it('shows the user name, role badge, and sign-out control', () => {
    render(<Sidebar user={{ name: 'Ada Lovelace', email: 'ada@example.com', role: 'tech_lead' }} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to the email when no name is present', () => {
    render(<Sidebar user={{ email: 'ada@example.com', role: 'dev' }} />);

    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Dev')).toBeInTheDocument();
  });
});