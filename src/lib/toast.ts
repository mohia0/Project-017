import { useToastStore, ToastType } from '@/store/useToastStore';

export const appToast = {
  success: (title: string, description?: string) => {
    return useToastStore.getState().addToast({
      type: 'success',
      title,
      description,
      duration: 3000,
    });
  },
  
  error: (title: string, description?: string) => {
    return useToastStore.getState().addToast({
      type: 'error',
      title,
      description,
      duration: 5000,
    });
  },
  
  info: (title: string, description?: string) => {
    return useToastStore.getState().addToast({
      type: 'info',
      title,
      description,
      duration: 4000,
    });
  },
  
  warning: (title: string, description?: string) => {
    return useToastStore.getState().addToast({
      type: 'warning',
      title,
      description,
      duration: 4500,
    });
  },
  
  promise: async <T>(
    promise: Promise<T>, 
    messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => {
    const id = useToastStore.getState().addToast({
      type: 'info',
      title: messages.loading,
      duration: 0, // Stay until resolved
    });

    try {
      const result = await promise;
      const successTitle = typeof messages.success === 'function' ? messages.success(result) : messages.success;
      useToastStore.getState().updateToast(id, {
        type: 'success',
        title: successTitle,
        duration: 3000,
      });
      return result;
    } catch (err) {
      const errorTitle = typeof messages.error === 'function' ? messages.error(err) : messages.error;
      useToastStore.getState().updateToast(id, {
        type: 'error',
        title: errorTitle,
        duration: 5000,
      });
      throw err;
    }
  },

  dismiss: (id?: string) => {
    if (id) {
      useToastStore.getState().removeToast(id);
    }
  },

  update: (id: string, updates: any) => {
    // Basic mapping for backward compatibility with 'description' and 'title'
    const mapped: any = {};
    if (updates.description) mapped.description = updates.description;
    if (updates.title) mapped.title = updates.title;
    if (updates.type) mapped.type = updates.type;
    useToastStore.getState().updateToast(id, mapped);
  },

  message: (title: string, options?: any) => {
    return useToastStore.getState().addToast({
      type: options?.type || 'info',
      title,
      description: options?.description,
      duration: options?.duration || 4000,
    });
  }
};
