import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';
import { BrandingProvider } from '@/components/settings/BrandingProvider';

export const metadata: Metadata = {
  title: 'CRM 17',
  description: 'A premium CRM solution for scaling operations.',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141414' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <BrandingProvider>
            <AppLayout>{children}</AppLayout>
          </BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}

