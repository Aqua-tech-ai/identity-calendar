'use client';

import { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
};

const baseClass =
  'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'border-transparent bg-primary text-white focus:ring-primary',
  secondary: 'border-slate-300 bg-white text-slate-700 focus:ring-slate-400',
  ghost: 'border-transparent bg-transparent text-primary hover:bg-slate-100 focus:ring-primary',
  danger: 'border-transparent bg-danger text-white focus:ring-danger',
};

export function Button({
  className,
  variant = 'primary',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(baseClass, variantClass[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  );
}
