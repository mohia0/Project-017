'use client';

import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialState: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialState;
    } catch (e) {
      console.error(`Error reading from localStorage key "${key}":`, e);
      return initialState;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error(`Error saving to localStorage key "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState] as const;
}
