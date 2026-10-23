import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`
        bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800
        shadow-card ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

interface CardSectionProps {
  className?: string;
  children?: ReactNode;
}

export const CardHeader = ({ className = '', children }: CardSectionProps) => (
  <div className={`px-6 py-4 border-b border-surface-100 dark:border-surface-800 ${className}`}>
    {children}
  </div>
);

export const CardBody = ({ className = '', children }: CardSectionProps) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

export default Card;