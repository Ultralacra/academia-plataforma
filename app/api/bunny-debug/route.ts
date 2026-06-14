import { NextResponse } from 'next/server';

export async function GET() {
  const zone = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
  const key = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY;
  const cdn = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;

  return NextResponse.json({
    zone: zone ? `✓ ${zone}` : '✗ NO DEFINIDA',
    key: key ? `✓ ${key.substring(0, 8)}...${key.substring(key.length - 8)}` : '✗ NO DEFINIDA',
    cdn: cdn ? `✓ ${cdn}` : '✗ NO DEFINIDA',
    authHeader: key && zone
      ? `Basic ${Buffer.from(`${zone}:${key}`).toString('base64').substring(0, 20)}...`
      : '✗ NO SE PUEDE GENERAR',
  });
}