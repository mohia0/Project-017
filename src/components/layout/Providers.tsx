"use client";

import { useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

const theme = createTheme({});

export function Providers({ children }: { children: React.ReactNode }) {
    const { theme: appTheme } = useUIStore();
    
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
