'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  duration?: number;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

interface ToastState extends ToastProps {
  id: string;
  visible: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Remove toast after it expires
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    toasts.forEach((toast) => {
      if (toast.visible) {
        const timer = setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) =>
              t.id === toast.id ? { ...t, visible: false } : t
            )
          );
        }, toast.duration || 3000);

        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);

  // Remove invisible toasts after animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.visible));
    }, 300);

    return () => clearTimeout(timer);
  }, [toasts]);

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id, visible: true }]);
  };

  return { toast };
}

export default useToast; 