"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, UserSquare2, Building2, Palette, Globe, CreditCard, Mail, Tag, FileText, Receipt, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

const ACCOUNT_LINKS = [
    { name: 'Profile', href: '/settings/profile', icon: User },
    { name: 'Contact', href: '/settings/contact', icon: UserSquare2 },
];

const WORKSPACE_LINKS = [
    { name: 'Workspace', href: '/settings/workspace', icon: Building2 },
    { name: 'Branding', href: '/settings/branding', icon: Palette },
    { name: 'Domains', href: '/settings/domains', icon: Globe },
    { name: 'Payments', href: '/settings/payments', icon: CreditCard },
    { name: 'Emails', href: '/settings/emails', icon: Mail },
];

const FEATURES_LINKS = [
    { name: 'Statuses', href: '/settings/features/statuses', icon: Tag },
    { name: 'Proposals', href: '/settings/features/proposals', icon: FileText },
    { name: 'Invoices', href: '/settings/features/invoices', icon: Receipt },
    { name: 'Projects', href: '/settings/features/projects', icon: FolderKanban },
];

export default function SettingsSidebar() {
    const pathname = usePathname();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <aside className={cn(
            "w-[220px] shrink-0 h-full overflow-y-auto hidden md:block border-r",
            isDark ? "border-[#222]" : "border-[#e8e8e8]"
        )}>
            <div className="flex flex-col gap-6 p-4">
                
                <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-[#888] uppercase mb-2 px-3">
                        Account
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        {ACCOUNT_LINKS.map(link => {
                            const isActive = pathname.startsWith(link.href);
                            const Icon = link.icon;
                            // Make active items stand out depending on theme
                            const activeClasses = isDark 
                                ? "bg-[#252525] text-white font-medium" 
                                : "bg-[#ebebeb] text-black font-semibold";
                            const inactiveClasses = isDark
                                ? "text-white/60 hover:text-white hover:bg-[#1a1a1a]"
                                : "text-[#555] hover:text-black hover:bg-[#f5f5f5]";

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                                        isActive ? activeClasses : inactiveClasses
                                    )}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-[#888] uppercase mb-2 px-3">
                        Workspace
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        {WORKSPACE_LINKS.map(link => {
                            const isActive = pathname.startsWith(link.href);
                            const Icon = link.icon;
                            
                            const activeClasses = isDark 
                                ? "bg-[#252525] text-white font-medium" 
                                : "bg-[#ebebeb] text-black font-semibold";
                            const inactiveClasses = isDark
                                ? "text-white/60 hover:text-white hover:bg-[#1a1a1a]"
                                : "text-[#555] hover:text-black hover:bg-[#f5f5f5]";

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                                        isActive ? activeClasses : inactiveClasses
                                    )}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-[#888] uppercase mb-2 px-3">
                        Features
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        {FEATURES_LINKS.map(link => {
                            const isActive = pathname.startsWith(link.href);
                            const Icon = link.icon;

                            const activeClasses = isDark
                                ? "bg-[#252525] text-white font-medium"
                                : "bg-[#ebebeb] text-black font-semibold";
                            const inactiveClasses = isDark
                                ? "text-white/60 hover:text-white hover:bg-[#1a1a1a]"
                                : "text-[#555] hover:text-black hover:bg-[#f5f5f5]";

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                                        isActive ? activeClasses : inactiveClasses
                                    )}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

            </div>
        </aside>
    );
}
