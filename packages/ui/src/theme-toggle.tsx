import * as React from 'react';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Current resolved theme. The icon and label switch accordingly. */
  theme: 'light' | 'dark';
  /** Called when the user presses the toggle. */
  onToggle: () => void;
}

const MoonIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const SunIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="M19.07 4.93l-1.41 1.41" />
  </svg>
);

/**
 * Presentational two-state theme toggle.
 *
 * The parent owns the theme value and persistence; this component only
 * renders the right icon and hit target.
 */
export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  function ThemeToggle({ theme, onToggle, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={['icon-button', className].filter(Boolean).join(' ')}
        onClick={onToggle}
        {...props}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  },
);
ThemeToggle.displayName = 'ThemeToggle';
