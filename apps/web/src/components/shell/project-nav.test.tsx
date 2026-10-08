import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathname,
}));

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

import { ProjectNav } from './project-nav';

describe('ProjectNav', () => {
  beforeEach(() => {
    mocks.usePathname.mockReset();
  });

  it('marks the tab matching the current path as active', () => {
    mocks.usePathname.mockReturnValue('/app/projects/p1/wiki');

    render(<ProjectNav projectId="p1" />);

    expect(screen.getByRole('link', { name: 'Wiki' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tasks' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Schedule' })).not.toHaveAttribute('aria-current');
  });

  it('does not mark any tab active on the project overview', () => {
    mocks.usePathname.mockReturnValue('/app/projects/p1');

    render(<ProjectNav projectId="p1" />);

    expect(screen.getByRole('link', { name: 'Tasks' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Wiki' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Schedule' })).not.toHaveAttribute('aria-current');
  });

  it('builds links scoped to the project id', () => {
    mocks.usePathname.mockReturnValue('/app/projects/p1/tasks');

    render(<ProjectNav projectId="p1" />);

    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute(
      'href',
      '/app/projects/p1/tasks',
    );
  });
});