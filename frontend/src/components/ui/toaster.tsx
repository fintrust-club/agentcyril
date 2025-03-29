"use client"

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { useToast as useToastStore } from '@/components/ui/use-toast';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  visible: boolean;
}

export function Toaster() {
  const [isMounted, setIsMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (!isMounted) return null;

  return createPortal(
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type}
          visible={toast.visible}
          onClose={handleClose}
        />
      ))}
    </ToastContainer>,
    document.body
  );
}
