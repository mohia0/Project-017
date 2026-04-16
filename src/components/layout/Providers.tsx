"use client";

import { useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { ToastContainer } from '@/components/ui/ToastContainer';

const theme = createTheme({});

export function Providers({ children }: { children: React.ReactNode }) {
    const { theme: appTheme } = useUIStore();
    
    useEffect(() => {
        useAuthStore.getState().initialize();
    }, []);

    return (
        <MantineProvider theme={theme}>
            {children}
            <ToastContainer />
        </MantineProvider>
    );
}
