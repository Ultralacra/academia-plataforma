import { NextRequest, NextResponse } from 'next/server';
import { buildUrl, endpoints } from '@/lib/api-config';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';

    const res = await fetch(buildUrl(endpoints.coachClient.list), {
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];

    const map = new Map<string, { id: any; name: string; puesto: string | null; area: string | null }>();
    rows.forEach((r: any) => {
      const name = (r.coach_nombre ?? '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: r.id_coach ?? r.id ?? null,
          name,
          puesto: r.puesto ?? null,
          area: r.area ?? null,
        });
      }
    });

    const coaches = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, coaches });
  } catch (error) {
    console.error('[coaches] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
