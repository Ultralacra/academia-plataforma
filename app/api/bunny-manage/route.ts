import { NextRequest, NextResponse } from 'next/server';
import { listBunnyDirectory, uploadToBunny } from '@/lib/bunny-storage';

export async function GET() {
  try {
    const items = await listBunnyDirectory('uploads/');
    const folders = items.filter((item: any) => item.IsDirectory);
    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error('[bunny-manage] list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, coachName } = body;

    if (action === 'create-folder' && coachName) {
      const folderName = coachName
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s@._-]/g, '_')
        .trim();
      const path = `uploads/${folderName}/.keep`;
      await uploadToBunny(path, Buffer.from(''), 'text/plain');
      return NextResponse.json({
        success: true,
        folderName,
        message: `Carpeta "${folderName}" creada en Bunny`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[bunny-manage] action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
