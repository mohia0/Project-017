"use client";

import { useEffect, useState } from 'react';
import { ListViewSkeleton } from '@/components/ui/ListViewSkeleton';
import { getThemeFromStorage } from '@/hooks/useThemeFromStorage';

interface PageLoadingSkeletonProps {
    pageTitle: string;
    view?: 'table' | 'cards';
}

/**
 * Client-side loading skeleton that reads the persisted theme from localStorage
 * before the Zustand store hydrates — prevents the light-mode flash in dark mode.
 */
export function PageLoadingSkeleton({ pageTitle, view = 'table' }: PageLoadingSkeletonProps) {
    // Read from localStorage synchronously on first render (client only)
    const [isDark, setIsDark] = useState(() => {
        // useState initializer runs only on the client, before first paint
        return getThemeFromStorage() === 'dark';
    });

    // Sync with store once it hydrates (covers edge cases)
    useEffect(() => {
        setIsDark(getThemeFromStorage() === 'dark');
    }, []);

    return (
        <ListViewSkeleton
            pageTitle={pageTitle}
            view={view}
            isDark={isDark}
        />
    );
}
