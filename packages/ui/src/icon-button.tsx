import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for the icon-only button. */
  'aria-label': string;
  children: React.ReactNode;
}

/**
 * Compact icon button used inside toolbars and other chrome.
 * Relies on `.icon-button` styles from `@bolder/ui/styles.css`.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, className, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={['icon-button', className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
