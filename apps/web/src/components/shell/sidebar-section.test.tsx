import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarSection } from './sidebar-section';

describe('SidebarSection', () => {
  it('renders expanded by default and shows children', () => {
    render(
      <SidebarSection title="Projects">
        <span>child-row</span>
      </SidebarSection>,
    );

    expect(screen.getByRole('button', { name: /Projects/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('child-row')).toBeInTheDocument();
    expect(screen.getByText('Projects').parentElement?.querySelector('.sidebar-chevron')).toHaveClass(
      'expanded',
    );
  });

  it('collapses and expands when the title is clicked, toggling chevron class and children', () => {
    render(
      <SidebarSection title="Recent">
        <span>child-row</span>
      </SidebarSection>,
    );

    const toggle = screen.getByRole('button', { name: /Recent/i });
    const chevron = screen.getByText('Recent').parentElement?.querySelector('.sidebar-chevron');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(chevron).not.toHaveClass('expanded');
    expect(screen.queryByText('child-row')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(chevron).toHaveClass('expanded');
    expect(screen.getByText('child-row')).toBeInTheDocument();
  });

  it('honors defaultExpanded=false', () => {
    render(
      <SidebarSection title="Sets" defaultExpanded={false}>
        <span>child-row</span>
      </SidebarSection>,
    );

    expect(screen.getByRole('button', { name: /Sets/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('child-row')).not.toBeInTheDocument();
  });
});