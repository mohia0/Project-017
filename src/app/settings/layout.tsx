"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
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
  const isEmailsPage = pathname === '/settings/emails';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Settings Header */}
      <div className="h-[60px] border-b shrink-0 flex items-center px-6 gap-3" 
           style={{ borderColor: isDark ? '#252525' : '#ebebeb' }}>
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        
        <main className={cn("flex-1 overflow-y-auto p-6 md:p-10", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
            <div className={cn("mx-auto pb-24", isEmailsPage ? "max-w-[1400px]" : "max-w-[720px]")}>
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}
