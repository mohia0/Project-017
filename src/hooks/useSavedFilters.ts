'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { SavedFilter, FilterRow } from '@/lib/filterUtils';

export function useSavedFilters(toolKey: string) {
  const { activeWorkspaceId } = useUIStore();
  const { toolSettings, fetchToolSettings, updateToolSettings, hasFetched } = useSettingsStore();

  // Load from DB when workspace or tool change
  useEffect(() => {
    if (activeWorkspaceId && !hasFetched[`toolSettings_${toolKey}`]) {
      fetchToolSettings(activeWorkspaceId, toolKey);
    }
  }, [activeWorkspaceId, toolKey, fetchToolSettings, hasFetched]);

  // The ground truth for filters is now in toolSettings[toolKey]
  const currentSettings = toolSettings[toolKey] || {};
  const saved: SavedFilter[] = currentSettings.savedFilters || [];

  // Migration logic: Push local data to DB if local has data and DB is empty
  useEffect(() => {
    if (typeof window === 'undefined' || !activeWorkspaceId) return;
    if (hasFetched[`toolSettings_${toolKey}`] && saved.length === 0) {
      const localKey = `${activeWorkspaceId}_${toolKey}_saved_filters`;
      const legacyKey = `${toolKey}_saved_filters`;
      
      const localRaw = localStorage.getItem(localKey) || localStorage.getItem(legacyKey);
      if (localRaw) {
        try {
          const localParsed = JSON.parse(localRaw);
          if (Array.isArray(localParsed) && localParsed.length > 0) {
            updateToolSettings(activeWorkspaceId, toolKey, {
              ...currentSettings,
              savedFilters: localParsed
            });
            // Clear local to avoid redundant migrations
            localStorage.removeItem(localKey);
            localStorage.removeItem(legacyKey);
          }
        } catch (e) {}
      }
    }
  }, [activeWorkspaceId, toolKey, hasFetched, saved.length, updateToolSettings, currentSettings]);

  const save = useCallback((name: string, rows: FilterRow[]) => {
    if (!activeWorkspaceId) return;
    
    const entry: SavedFilter = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      rows,
    };
    
    const nextSaved = [...saved, entry];
    updateToolSettings(activeWorkspaceId, toolKey, {
      ...currentSettings,
      savedFilters: nextSaved
    });
    
    return entry;
  }, [activeWorkspaceId, toolKey, saved, currentSettings, updateToolSettings]);

  const remove = useCallback((id: string) => {
    if (!activeWorkspaceId) return;
    
    const nextSaved = saved.filter(f => f.id !== id);
    updateToolSettings(activeWorkspaceId, toolKey, {
      ...currentSettings,
      savedFilters: nextSaved
    });
  }, [activeWorkspaceId, toolKey, saved, currentSettings, updateToolSettings]);

  const update = useCallback((id: string, rows: FilterRow[]) => {
    if (!activeWorkspaceId) return;
    
    const nextSaved = saved.map(f => f.id === id ? { ...f, rows } : f);
    updateToolSettings(activeWorkspaceId, toolKey, {
      ...currentSettings,
      savedFilters: nextSaved
    });
  }, [activeWorkspaceId, toolKey, saved, currentSettings, updateToolSettings]);

  return { saved, save, remove, update };
}
