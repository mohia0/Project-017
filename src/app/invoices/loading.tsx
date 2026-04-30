import { ListViewSkeleton } from '@/components/ui/ListViewSkeleton';
import React from 'react';

export default function Loading() {
    // Determine if it's mobile or desktop layout here if possible, 
    // but the component itself handles responsive UI gracefully.
    // For a generic server-rendered boundary before hydration,
    // we just return the generic skeleton container.
    return <ListViewSkeleton isDark={true} />; // or determine from cookies/headers if possible, but default to dark for flash prevention
}
