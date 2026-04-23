import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'This route is disabled in production.' }, { status: 404 });
}
