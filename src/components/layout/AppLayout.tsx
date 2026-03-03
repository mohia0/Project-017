"use client";

import React from 'react';
import LeftSystemMenu from './LeftSystemMenu';
import RightToolsMenu from './RightToolsMenu';
import CreateEntryModal from '@/components/modals/CreateEntryModal';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useUIStore();
    return (
        <div className={cn(
            "flex h-screen w-full overflow-hidden transition-colors duration-300",
            theme === 'dark' ? "bg-[#121212] text-white" : "bg-[#fdfdfd] text-[#171717]"
        )}>
            {/* 2) LEFT SIDE – SYSTEM MENU BAR */}
            <LeftSystemMenu />

            {/* 3) CENTER – MAIN WORKSPACE */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden border-x transition-colors duration-300",
                theme === 'dark' ? "border-[#333] bg-[#0a0a0a]" : "border-[#e2e2e2]/40 bg-white"
            )}>
                {children}
            </main>

            {/* 1) RIGHT SIDE – TOOLS MENU BAR */}
            <RightToolsMenu />

            {/* Global Modals */}
            <CreateEntryModal />
        </div>
    );
}
