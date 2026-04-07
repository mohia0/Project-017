"use client";

import { MantineProvider, createTheme } from '@mantine/core';

const theme = createTheme({});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={theme}>
            {children}
        </MantineProvider>
    );
}
