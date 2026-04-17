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

  const allLinks = [...ACCOUNT_LINKS, ...WORKSPACE_LINKS, ...FEATURES_LINKS];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Settings Header */}
      <div className="h-[60px] border-b shrink-0 flex flex-col justify-center px-4" 
           style={{ borderColor: isDark ? '#252525' : '#ebebeb' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
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
