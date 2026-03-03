"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Play, Square, DollarSign, Eye, Settings, HelpCircle, Printer, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RightToolsMenu() {
    const { theme, toggleTheme, setCreateModalOpen } = useUIStore();

    return (
        <nav
            className={cn(
                "h-full w-12 flex flex-col justify-between shrink-0 ease-in-out border-l py-4",
                theme === 'dark' ? "bg-[#18181A] border-[#2A2A2A]" : "bg-[#f5f5f5] border-[#e2e2e2]"
            )}
        >
            {/* Top Stack */}
            <div className="flex flex-col items-center gap-3">
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                        "p-1.5 rounded-lg text-[#111] bg-[#4ade80] hover:bg-[#34d399] transition-all",
                        "shadow-[0_2px_10px_rgba(74,222,128,0.2)] hover:shadow-[0_4px_15px_rgba(74,222,128,0.4)]"
                    )}
                >
                    <Plus size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* Bottom Stack */}
            <div className="flex flex-col items-center gap-4">
                <ToolItem icon={<DollarSign size={15} />} theme={theme} />
                <ToolItem icon={<Eye size={15} />} theme={theme} />
                <ToolItem icon={<Settings size={15} />} theme={theme} />
                <ToolItem icon={<HelpCircle size={15} />} theme={theme} />
                <ToolItem icon={<Printer size={15} />} theme={theme} />
                <div className={cn("w-6 h-[1px]", theme === 'dark' ? "bg-[#333]" : "bg-[#ddd]")} />
                <button
                    onClick={toggleTheme}
                    className={cn(
                        "p-2 rounded transition-all",
                        theme === 'dark' ? "text-amber-500 hover:bg-[#2A2A2A]" : "text-amber-500 hover:bg-[#eaeaea]"
                    )}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                </button>
                <ToolItem icon={<LogOut size={15} />} theme={theme} />
            </div>
        </nav>
    );
}

function ToolItem({ icon, theme }: { icon: React.ReactNode, theme: 'light' | 'dark' }) {
    return (
        <button
            className={cn(
                "p-2 rounded transition-all",
                theme === 'dark' ? "text-[#888] hover:text-white hover:bg-[#2A2A2A]" : "text-[#777] hover:text-black hover:bg-[#eaeaea]"
            )}
        >
            {icon}
        </button>
    );
}
