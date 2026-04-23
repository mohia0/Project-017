"use client";

import { useEffect, useRef } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

const theme = createTheme({});

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
    const { theme: appTheme } = useUIStore();
    const isHydrated = useRef(false);

    // Synchronous hydration to prevent initial flicker 
    if (!isHydrated.current) {
        useAuthStore.getState().hydrate(session);
        isHydrated.current = true;
    }
    
    useEffect(() => {
        useAuthStore.getState().initialize();
    }, []);

    return (
        <MantineProvider theme={theme}>
            {children}
            <GooeyToaster position="top-center" theme={appTheme === 'dark' ? 'dark' : 'light'} />
        </MantineProvider>
    );
}
