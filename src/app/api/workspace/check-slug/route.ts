import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'Slug contains invalid characters' }, { status: 400 });

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/workspaces?slug=eq.${slug}&select=id`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
        }
      }
    );
    const data = await res.json();
    return NextResponse.json({ available: data?.length === 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
