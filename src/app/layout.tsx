import type { Metadata, Viewport } from 'next';
import { Mr_Dafoe } from 'next/font/google';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';
import { BrandingProvider } from '@/components/settings/BrandingProvider';
import { createSupabaseServer } from '@/lib/supabase/server';

const mrDafoe = Mr_Dafoe({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mr-dafoe',
  display: 'swap',
});

import { supabaseService } from '@/lib/supabase-service';

export async function generateMetadata(): Promise<Metadata> {
  let title = 'CRM 17';
  let description = 'A premium CRM solution for scaling operations.';
  let favicon = '/favicon.svg';

  /*
   * PHASE 3 - Caching Unblock:
   * Reading headers() forces the entire layout into Dynamic Rendering.
   * If you need custom domain metadata, consider using Middleware rewrites 
   * to a dynamic [domain] route instead of checking headers() at the root.
   */
  // try {
  //   const headersList = await headers();
  //   const host = headersList.get('host');
  //
  //   if (host) {
  //     // Find a matching custom domain
  //     const { data: domainData } = await supabaseService
  //       .from('workspace_domains')
  //       .select('workspace_id')
  //       .eq('domain', host)
  //       .single();
  // ... omitted for caching
  // } catch (error) {
  //   // Fallback
  // }

  return {
    title,
    description,
    icons: {
      icon: favicon,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: title,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en" className={mrDafoe.variable}>
      <body suppressHydrationWarning>
        <Providers session={session}>
          <BrandingProvider>
            <AppLayout>{children}</AppLayout>
          </BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}

