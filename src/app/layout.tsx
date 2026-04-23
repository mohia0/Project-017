import type { Metadata, Viewport } from 'next';
import { Mr_Dafoe } from 'next/font/google';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';
import { BrandingProvider } from '@/components/settings/BrandingProvider';
import { createSupabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase-service';
import { headers } from 'next/headers';

const mrDafoe = Mr_Dafoe({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mr-dafoe',
  display: 'swap',
});


export async function generateMetadata(): Promise<Metadata> {
  let title = 'CRM 17';
  let description = 'A premium CRM solution for scaling operations.';
  let favicon = '/favicon.svg';

  try {
    const headersList = await headers();
    const host = headersList.get('host') ?? '';

    // Strip port for local dev (e.g. "localhost:3000" → "localhost:3000" is kept, but
    // we only match real custom domains registered in workspace_domains).
    if (host && !host.startsWith('localhost') && !host.includes('127.0.0.1')) {
      // Look up whether this host is a registered custom domain
      const { data: domainData } = await supabaseService
        .from('workspace_domains')
        .select('workspace_id')
        .eq('domain', host)
        .eq('status', 'active')
        .single();

      if (domainData?.workspace_id) {
        const workspaceId = domainData.workspace_id;

        // Fetch workspace name for the tab title
        const { data: workspaceData } = await supabaseService
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single();

        if (workspaceData?.name) {
          title = workspaceData.name;
          description = `${workspaceData.name} — Workspace`;
        }

        // Fetch favicon from branding
        const { data: brandingData } = await supabaseService
          .from('workspace_branding')
          .select('favicon_url')
          .eq('workspace_id', workspaceId)
          .single();

        if (brandingData?.favicon_url) {
          favicon = brandingData.favicon_url;
        }
      }
    }
  } catch {
    // Fallback to defaults — never let a metadata error break the page
  }

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

