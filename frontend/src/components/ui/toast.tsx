"use client"

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onClose: (id: string) => void;
}

export function Toast({
  id,
  title,
  description,
  type = 'default',
  visible,
  onClose,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsExiting(true);
    }
  }, [visible]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400';
      case 'warning':
        return 'bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-400';
      case 'info':
        return 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400';
      default:
        return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-in-out',
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        'pointer-events-auto flex w-full max-w-md rounded-lg border p-4 shadow-lg',
        getTypeStyles()
      )}
      role="alert"
    >
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <p className="font-medium">{title}</p>
          <button
            type="button"
            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={handleClose}
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
        </div>
        {description && (
          <p className="mt-1 text-sm opacity-90">{description}</p>
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2 sm:top-6 sm:right-6">
      {children}
    </div>
  );
}
