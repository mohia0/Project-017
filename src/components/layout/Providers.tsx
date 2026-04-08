"use client";

import { useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useAuthStore } from '@/store/useAuthStore';

const theme = createTheme({});

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        useAuthStore.getState().initialize();
    }, []);

    return (
        <MantineProvider theme={theme}>
            {children}
        </MantineProvider>
    );
}
