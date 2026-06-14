import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunny } from '@/lib/bunny-storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const path = `uploads/${timestamp}_${filename}`;
    const url = await uploadToBunny(path, fileBuffer, file.type);

    return NextResponse.json({ success: true, url, path });
  } catch (error) {
    console.error('Bunny storage test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Bunny storage test endpoint ready',
  });
}