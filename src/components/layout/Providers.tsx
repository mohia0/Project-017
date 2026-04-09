"use client";

import { useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useAuthStore } from '@/store/useAuthStore';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

const theme = createTheme({});

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        useAuthStore.getState().initialize();
    }, []);

    return (
        <MantineProvider theme={theme}>
            {children}
            <GooeyToaster
                position="bottom-right"
                toastOptions={{
                    duration: 3500,
                    style: {
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '13px',
                    },
                }}
            />
        </MantineProvider>
    );
}
