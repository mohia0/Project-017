"use client";

import React from 'react';
import { LayoutDashboard, Users, FileText, Calendar, SidebarOpen, SidebarClose, HelpCircle, PenTool, LayoutGrid, Zap, PieChart } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function LeftSystemMenu() {
    const { theme, isToolsMenuExpanded, toggleToolsMenu } = useUIStore();
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
        { href: '/proposals', icon: <FileText size={16} />, label: 'Proposals' },
        { href: '/clients', icon: <Users size={16} />, label: 'Clients' },
        { href: '/calendar', icon: <Calendar size={16} />, label: 'Calendar' },
        { href: '/tools', icon: <PenTool size={16} />, label: 'Tools' },
        { href: '/templates', icon: <LayoutGrid size={16} />, label: 'Templates' },
    ];

    return (
        <nav className={cn(
            "h-full flex flex-col py-4 border-r shrink-0 transition-all duration-300 ease-in-out",
            isToolsMenuExpanded ? "w-56" : "w-14 items-center",
            theme === 'dark' ? "bg-[#18181A] border-[#2A2A2A]" : "bg-[#f5f5f5] border-[#e2e2e2]"
        )}>
            {/* Top Workspace Icon/Avatar */}
            <div className={cn("mb-6 mt-1 flex", isToolsMenuExpanded ? "px-4 justify-start" : "justify-center")}>
                <div className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold text-[12px] shrink-0">
                    B
                </div>
                {isToolsMenuExpanded && (
                    <span className={cn("ml-3 font-semibold", theme === 'dark' ? "text-white" : "text-black")}>Brainia</span>
                )}
            </div>

            {/* Navigation Icons Stack */}
            <div className={cn("flex flex-col gap-2 flex-1", isToolsMenuExpanded ? "px-3" : "px-2")}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center p-2 rounded-lg transition-all group shrink-0",
                            (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href
                                ? (theme === 'dark' ? "bg-white text-black" : "bg-black text-white")
                                : (theme === 'dark' ? "text-[#888] hover:text-white hover:bg-[#2A2A2A]" : "text-[#777] hover:text-black hover:bg-[#eaeaea]"),
                            isToolsMenuExpanded ? "justify-start" : "justify-center"
                        )}
                    >
                        <div className="shrink-0">{item.icon}</div>
                        {isToolsMenuExpanded && (
                            <span className="font-medium text-[13px] ml-3 whitespace-nowrap">{item.label}</span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className={cn("flex flex-col gap-2 mt-auto", isToolsMenuExpanded ? "px-3" : "px-2")}>
                <button
                    onClick={toggleToolsMenu}
                    className={cn(
                        "flex items-center p-2 rounded-lg transition-all",
                        theme === 'dark' ? "text-[#888] hover:text-white hover:bg-[#2A2A2A]" : "text-[#777] hover:text-black hover:bg-[#eaeaea]",
                        isToolsMenuExpanded ? "justify-start" : "justify-center"
                    )}
                    title={isToolsMenuExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <div className="shrink-0">{isToolsMenuExpanded ? <SidebarClose size={16} /> : <SidebarOpen size={16} />}</div>
                    {isToolsMenuExpanded && (
                        <span className="font-medium text-[13px] ml-3 whitespace-nowrap">Collapse</span>
                    )}
                </button>
            </div>
        </nav>
    );
}
