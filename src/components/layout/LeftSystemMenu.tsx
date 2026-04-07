"use client";

import React from 'react';
import { LayoutGrid, Users, FileText, Receipt, Folder, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUIStore } from '@/store/useUIStore';

const navItems = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/clients', icon: Users, label: 'Contacts' },
    { href: '/proposals', icon: FileText, label: 'Proposals' },
    { href: '/invoices', icon: Receipt, label: 'Invoices' },
    { href: '/files', icon: Folder, label: 'File Manager' },
];

export default function LeftSystemMenu() {
    const pathname = usePathname();
    const { isLeftMenuExpanded, toggleLeftMenu } = useUIStore();

    return (
        <nav className={cn(
            "h-full flex flex-col items-center shrink-0 transition-all duration-300 rounded-2xl z-10",
            "bg-[#1c1c1e] text-white",
            isLeftMenuExpanded ? "w-[160px] px-2" : "w-[44px]"
        )}>

            {/* Workspace logo — just a letter badge, same size/radius as icon buttons */}
            <div className="flex items-center justify-center pt-3 pb-2 w-full shrink-0">
                <div className="w-8 h-8 rounded-[10px] bg-[#2c2c2e] flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-semibold text-white/70 select-none">M</span>
                </div>
            </div>

            <div className="w-full px-2 border-b border-white/5 mb-2" />

            {/* Nav icons */}
            <div className="flex flex-col items-center gap-1 py-2 flex-1 w-full">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={cn(
                                "w-full h-8 rounded-[10px] flex items-center transition-colors relative",
                                isLeftMenuExpanded ? "justify-start gap-3 px-2.5" : "justify-center",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-[#6b6b6b] hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={16} strokeWidth={1.75} className="shrink-0" />
                            {isLeftMenuExpanded && (
                                <span className="text-[13px] font-medium whitespace-nowrap">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Collapse / expand toggle */}
            <div className="flex flex-col items-center pb-3 w-full">
                <div className="w-full px-2 border-t border-white/5 mb-2" />
                <button
                    onClick={toggleLeftMenu}
                    title={isLeftMenuExpanded ? "Collapse" : "Expand"}
                    className="w-full h-8 rounded-[10px] flex items-center justify-center transition-colors text-[#4a4a4a] hover:text-white hover:bg-white/5"
                >
                    {isLeftMenuExpanded
                        ? <ChevronLeft size={14} strokeWidth={2} />
                        : <ChevronRight size={14} strokeWidth={2} />}
                </button>
            </div>
        </nav>
    );
}
