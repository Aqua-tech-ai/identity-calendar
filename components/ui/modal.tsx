'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-lg">
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          onClick={onClose}
        >
          ×
        </button>
        {title && <div className="border-b px-6 py-4 text-lg font-semibold">{title}</div>}
        <div className={clsx('px-6 py-4', !title && 'pt-6')}>{children}</div>
        {footer && <div className="border-t px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
