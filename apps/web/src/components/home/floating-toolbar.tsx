'use client';

import { useEffect, useRef, useState } from 'react';

import { signOutAction } from '@/app/actions';
import { getRoleLabel } from '@/lib/utils';
import { IconButton } from '@bolder/ui';

import { ArrowLeftIcon, ArrowRightIcon } from '@/components/shell/icons';

export interface FloatingToolbarProps {
  userName?: string | null;
  userRole?: string | null;
}

function monogram(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Floating bottom-center toolbar pill (Anytype-styled).
 *
 * Back / forward drive the browser history. The avatar opens a small menu
 * with the user's name + role and a Sign-out button.
 */
export function FloatingToolbar({ userName, userRole }: FloatingToolbarProps) {
  const displayName = userName ?? 'User';
  const displayRole = getRoleLabel(userRole ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <nav className="floating-toolbar" aria-label="Quick actions">
      <IconButton
        aria-label="Go back"
        onClick={() => {
          if (typeof window !== 'undefined') window.history.back();
        }}
      >
        <ArrowLeftIcon />
      </IconButton>
      <IconButton
        aria-label="Go forward"
        onClick={() => {
          if (typeof window !== 'undefined') window.history.forward();
        }}
      >
        <ArrowRightIcon />
      </IconButton>

      <div className="toolbar-menu-wrapper" ref={menuRef}>
        <IconButton
          aria-label={`Account menu: ${displayName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="toolbar-avatar-button"
        >
          <span className="toolbar-avatar">{monogram(displayName)}</span>
        </IconButton>
        {menuOpen && (
          <div role="menu" className="toolbar-menu">
            <div className="toolbar-menu-header">
              <span className="toolbar-menu-name">{displayName}</span>
              <span className="toolbar-menu-role">{displayRole}</span>
            </div>
            <form action={signOutAction}>
              <button type="submit" role="menuitem" className="toolbar-menu-item">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}