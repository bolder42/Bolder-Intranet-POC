import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Optional label rendered above the input. */
  label?: string | undefined;
  /** Optional error message. When present the input gets the error styling. */
  error?: string | undefined;
};

/**
 * Minimal labeled input primitive with inline error state.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;
  const classes = ['input', error ? 'input-error' : undefined, className].filter(Boolean).join(' ');

  return (
    <div className="input-field">
      {label ? (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={classes}
        aria-invalid={error ? true : undefined}
        // Browser extensions (password managers, autofill) commonly inject a
        // "show password" button or background styles INSIDE the input element.
        // That is invalid HTML and trips React's hydration check; we know the
        // injected subtree is benign, so we opt out of the warning here.
        suppressHydrationWarning
        {...props}
      />
      {error ? <span className="input-message">{error}</span> : null}
    </div>
  );
});

Input.displayName = 'Input';
