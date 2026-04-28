import type { Metadata, Viewport } from 'next';
import { Mr_Dafoe } from 'next/font/google';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';
import { GlobalImageErrorHandler } from '@/components/layout/GlobalImageErrorHandler';
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
  let title = 'AROOOXA';
  let description = 'A premium CRM solution for scaling operations.';
  let favicon = '/favicon.svg?v=aroooxa';

  try {
    const headersList = await headers();
    
    // Middleware injects this header when accessed via subdomain portal or custom domain
    const workspaceId = headersList.get('x-workspace-id');

    if (workspaceId) {
      // It's a workspace context (subdomain or custom domain).
      // We must not show the main aroooxa favicon to white-labeled workspaces.
      // Default to a transparent SVG, overridden if they uploaded a custom favicon.
      favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';

      // Fetch workspace name (for tab title) and branding (for favicon) in parallel
      const [workspaceRes, brandingRes] = await Promise.all([
        supabaseService
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single(),
        supabaseService
          .from('workspace_branding')
          .select('favicon_url')
          .eq('workspace_id', workspaceId)
          .single()
      ]);

      if (workspaceRes.data?.name) {
        title = workspaceRes.data.name;
        description = `${title} — Workspace`;
      }

      if (brandingRes.data?.favicon_url) {
        favicon = brandingRes.data.favicon_url;
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
            <GlobalImageErrorHandler />
            <AppLayout>{children}</AppLayout>
          </BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}

