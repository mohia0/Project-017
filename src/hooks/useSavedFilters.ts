'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SavedFilter, FilterRow } from '@/lib/filterUtils';

export function useSavedFilters(toolKey: string) {
  const storageKey = `${toolKey}_saved_filters`;

  const [saved, setSaved] = useState<SavedFilter[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever saved list changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(saved));
  }, [saved, storageKey]);

  const save = useCallback((name: string, rows: FilterRow[]) => {
    const entry: SavedFilter = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      rows,
    };
    setSaved(prev => [...prev, entry]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    setSaved(prev => prev.filter(f => f.id !== id));
  }, []);

  const update = useCallback((id: string, rows: FilterRow[]) => {
    setSaved(prev => prev.map(f => f.id === id ? { ...f, rows } : f));
  }, []);

  return { saved, save, remove, update };
}
