import type { ReactNode } from 'react';
import { goeyToast } from 'goey-toast';

export const appToast = {
  success: (title: string, description?: ReactNode, options?: any) => {
    return goeyToast.success(title, { description, ...options });
  },
  
  error: (title: string, description?: ReactNode, options?: any) => {
    return goeyToast.error(title, { description, ...options });
  },
  
  info: (title: string, description?: ReactNode, options?: any) => {
    return goeyToast.info(title, { description, ...options });
  },
  
  warning: (title: string, description?: ReactNode, options?: any) => {
    return goeyToast.warning(title, { description, ...options });
  },

  
  promise: async <T>(
    promise: Promise<T>, 
    messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => {
    const p = goeyToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
    return promise;
  },

  dismiss: (id?: string | number) => {
    goeyToast.dismiss(id);
  },

  update: (id: string | number, updates: { description?: ReactNode; title?: string; type?: any; duration?: number; [key: string]: any }) => {
    goeyToast.update(id, {
      title: updates.title,
      description: updates.description,
      type: updates.type,
      duration: updates.duration,
    } as any);
  },

  message: (title: string, options?: any) => {
    if (options?.type && ['success', 'error', 'warning', 'info'].includes(options.type)) {
      return (goeyToast as any)[options.type](title, {
        description: options?.description,
        duration: options?.duration,
      });
    }
    return goeyToast(title, {
      description: options?.description,
      duration: options?.duration,
    });
  }
};
