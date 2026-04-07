"use client";

import React from 'react';
import LeftSystemMenu from './LeftSystemMenu';
import RightToolsMenu from './RightToolsMenu';
import RightPanel from './RightPanel';
import CreateEntryModal from '@/components/modals/CreateEntryModal';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <div className={cn(
            "flex h-screen w-full overflow-hidden p-2.5 gap-2.5",
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f1f1f9] text-[#111]"
        )}>
            {/* LEFT — compact icon sidebar */}
            <LeftSystemMenu />

            {/* CENTER — main workspace */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden rounded-2xl transition-colors duration-300 min-w-0",
                isDark ? "bg-[#141414]" : "bg-white border border-[#d2d2eb]"
            )}>
                {children}
            </main>

            {/* RIGHT SIDEBAR UNIT */}
            <div className="flex shrink-0 gap-0 overflow-hidden">
                <RightPanel />
                <RightToolsMenu />
            </div>

            {/* Global Modals */}
            <CreateEntryModal />
        </div>
    );
}
