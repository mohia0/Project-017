import type { Metadata, Viewport } from 'next';
import { Mr_Dafoe } from 'next/font/google';
import './globals.css';
import '@mantine/core/styles.css';
import AppLayout from '@/components/layout/AppLayout';
import { Providers } from '@/components/layout/Providers';
import { BrandingProvider } from '@/components/settings/BrandingProvider';

const mrDafoe = Mr_Dafoe({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mr-dafoe',
  display: 'swap',
});

import { headers } from 'next/headers';
import { supabaseService } from '@/lib/supabase-service';

export async function generateMetadata(): Promise<Metadata> {
  let title = 'CRM 17';
  let description = 'A premium CRM solution for scaling operations.';
  let favicon = '/favicon.svg';

  try {
    const headersList = await headers();
    const host = headersList.get('host');

    if (host) {
      // Find a matching custom domain
      const { data: domainData } = await supabaseService
        .from('workspace_domains')
        .select('workspace_id')
        .eq('domain', host)
        .single();

      if (domainData?.workspace_id) {
        // Fetch workspace name & description
        const { data: workspace } = await supabaseService
          .from('workspaces')
          .select('name, description')
          .eq('id', domainData.workspace_id)
          .single();

        if (workspace) {
          title = workspace.name || title;
          description = workspace.description || description;
          
          if (workspace.name) {
              title = `${workspace.name} Dashboard`;
          }
        }

        // Fetch workspace_branding for custom favicon
        const { data: branding } = await supabaseService
          .from('workspace_branding')
          .select('favicon_url')
          .eq('workspace_id', domainData.workspace_id)
          .single();

        if (branding?.favicon_url) {
          favicon = branding.favicon_url;
        }
      }
    }
  } catch (error) {
    // Graceful fallback to default CRM 17 metadata
  }

  return {
    title,
    description,
    icons: {
      icon: favicon,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mrDafoe.variable}>
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

