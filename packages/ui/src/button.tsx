import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Visual style of the button.
   * @default 'primary'
   */
  variant?: ButtonVariant;
};

/**
 * Minimal shared button primitive.
 *
 * Styling comes from `.btn` / `.btn-primary` / `.btn-secondary` in `styles.css`,
 * which consumers import once (see `apps/web/src/components/ui/index.ts`).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', ...props },
  ref,
) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');

  return <button ref={ref} type={type} className={classes} {...props} />;
});

Button.displayName = 'Button';
