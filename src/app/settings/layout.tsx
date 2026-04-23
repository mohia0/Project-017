"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import SettingsSidebar, { ACCOUNT_LINKS, WORKSPACE_LINKS, FEATURES_LINKS } from '@/components/settings/SettingsSidebar';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const getPageTitle = (path: string) => {
    if (path.includes('/branding')) return 'Workspace Branding';
    if (path.includes('/profile')) return 'Public Profile';
    if (path.includes('/workspace')) return 'Workspace Settings';
    if (path.includes('/domains')) return 'Custom Domains';
    if (path.includes('/payments')) return 'Payment Methods';
    if (path.includes('/emails')) return 'Email Configuration';
    if (path.includes('/features/statuses')) return 'Feature Statuses';
    if (path.includes('/features/proposals')) return 'Proposal Settings';
    if (path.includes('/features/invoices')) return 'Invoice Settings';
    if (path.includes('/features/projects')) return 'Project Settings';
    if (path.includes('/settings/plutio')) return 'Plutio Integration';
    return '';
  };

  const pageTitle = getPageTitle(pathname);
  const allLinks = [...ACCOUNT_LINKS, ...WORKSPACE_LINKS, ...FEATURES_LINKS];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Settings Header */}
      <div className="h-[60px] border-b shrink-0 flex items-center" 
           style={{ borderColor: isDark ? '#252525' : '#ebebeb' }}>
        
        {/* Sidebar Header Part */}
        <div className={cn(
          "w-[220px] shrink-0 h-full hidden md:flex items-center px-4 border-r",
          isDark ? "border-[#252525]" : "border-[#ebebeb]"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight">Settings</h1>
          </div>
        </div>

        {/* Main Content Header Part (Mobile + Desktop Title) */}
        <div className="flex-1 px-6 md:px-8 flex items-center h-full">
          <div className="md:hidden flex items-center gap-3 mr-4">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
          </div>
          <h2 className="text-[17px] md:text-xl font-bold tracking-tight">{pageTitle || 'Settings'}</h2>
        </div>
      </div>

      {/* Mobile Settings Navigation (Horizontal Scroll) */}
      <div className={cn(
          "md:hidden flex overflow-x-auto hide-scrollbar px-4 py-3 shrink-0 border-b gap-2 z-10 shadow-sm",
          isDark ? "border-[#252525] bg-[#0d0d0d]" : "border-[#ebebeb] bg-white"
      )}>
          {allLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                  <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border",
                          isActive 
                              ? (isDark ? "bg-[#333] text-white border-[#444]" : "bg-black text-white border-black")
                              : (isDark ? "bg-transparent text-[#888] border-[#333] hover:text-white hover:bg-[#222]" : "bg-transparent text-[#666] border-[#ddd] hover:text-black hover:bg-[#f5f5f5]")
                      )}
                  >
                      <Icon size={12} strokeWidth={isActive ? 2.5 : 2} />
                      {link.name}
                  </Link>
              );
          })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-10", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
            <div className="mx-auto pb-24 max-w-[720px]">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}
