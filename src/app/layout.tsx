import type { Metadata } from 'next';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';

export const metadata: Metadata = {
  title: 'Minimal CRM',
  description: 'Scalable CRM operations system',
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
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}

