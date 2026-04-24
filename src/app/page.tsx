"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuStore } from '@/store/useMenuStore';
import { AppLoader } from '@/components/ui/AppLoader';

/**
 * Root page (/) - Dynamic Landing Page
 * Instead of hardcoding Proposals or Dashboard, this component 
 * redirects the user to the first visible page in their sidebar menu.
 */
export default function Home() {
    const router = useRouter();
    const { navItems, hasFetched } = useMenuStore();

    useEffect(() => {
        // Once the menu has been fetched (or loaded with defaults), 
        // redirect to the first available page.
        if (hasFetched && navItems.length > 0) {
            const firstVisibleItem = navItems.find(item => !item.isHidden) || navItems[0];
            if (firstVisibleItem) {
                router.replace(firstVisibleItem.href);
            }
        }
    }, [navItems, hasFetched, router]);

    return (
        <div className="flex-1 flex items-center justify-center p-20">
            <AppLoader size="lg" />
        </div>
    );
}
