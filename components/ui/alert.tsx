'use client';

import { clsx } from 'clsx';

type AlertProps = {
  variant?: 'info' | 'success' | 'error';
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

const variantStyle: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  return (
    <div
      className={clsx(
        'rounded-md border px-4 py-3 text-sm shadow-sm',
        variantStyle[variant],
        className,
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}
