import * as React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

function join(base: string, className?: string): string {
  return [base, className].filter(Boolean).join(' ');
}

/** Container primitive used to group related content. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={join('card', className)} {...props} />;
});
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={join('card-header', className)} {...props} />;
  },
);
CardHeader.displayName = 'CardHeader';

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  function CardBody({ className, ...props }, ref) {
    return <div ref={ref} className={join('card-body', className)} {...props} />;
  },
);
CardBody.displayName = 'CardBody';

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={join('card-footer', className)} {...props} />;
  },
);
CardFooter.displayName = 'CardFooter';
