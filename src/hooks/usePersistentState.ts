'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';

export function usePersistentState<T>(key: string, initialState: T) {
  const { activeWorkspaceId } = useUIStore();
  const storageKey = activeWorkspaceId ? `${activeWorkspaceId}_${key}` : key;

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialState;
    } catch (e) {
      console.error(`Error reading from localStorage key "${storageKey}":`, e);
      return initialState;
    }
  });

  // Hot swap data when crossing workspaces
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      setState(saved ? JSON.parse(saved) : initialState);
    } catch (e) {
      setState(initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error(`Error saving to localStorage key "${storageKey}":`, e);
    }
  }, [storageKey, state]);

  return [state, setState] as const;
}
