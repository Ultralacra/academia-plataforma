import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, downloadRecordingFile } from '@/lib/zoom';
import { uploadToBunny } from '@/lib/bunny-storage';

interface SyncFile {
  download_url: string;
  recording_type: string;
  file_type: string;
  meeting_topic: string;
  meeting_start: string;
  meeting_id: string;
  file_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coachName, files } = body;

    if (!coachName || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Faltan coachName o files' },
        { status: 400 }
      );
    }

    const tokenResult = await getAccessToken(request);
    const accessToken = tokenResult.accessToken;

    const folderName = coachName
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s@._-]/g, '_')
      .trim();

    const uploaded: Array<{ fileName: string; path: string; url: string }> = [];
    const errors: string[] = [];

    for (const file of files as SyncFile[]) {
      const ft = (file.file_type || '').toUpperCase();
      const rt = (file.recording_type || '').toLowerCase();

      const isMedia = ft === 'MP4' || ft === 'M4A';
      const isTranscript =
        ft === 'VTT' ||
        ft === 'TRANSCRIPT' ||
        ft === 'CC' ||
        rt.includes('transcript');
      const isChat = ft === 'CHAT' || rt === 'chat_file';

      if (!isMedia && !isTranscript && !isChat) continue;

      try {
        const arrayBuffer = await downloadRecordingFile(
          file.download_url,
          accessToken
        );

        const dateStr = file.meeting_start
          ? new Date(file.meeting_start).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const safeTopic = (file.meeting_topic || 'meeting')
          .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s_-]/g, '_')
          .trim();

        const ext = isChat
          ? 'txt'
          : ft === 'TRANSCRIPT' || rt.includes('transcript')
          ? 'vtt'
          : file.file_type?.toLowerCase() || 'bin';

        const fileName = `${dateStr}_${safeTopic}_${file.recording_type || 'file'}.${ext}`;
        const path = `uploads/${folderName}/${dateStr}/${fileName}`;

        const contentType =
          ext === 'mp4'
            ? 'video/mp4'
            : ext === 'm4a'
            ? 'audio/mp4'
            : ext === 'vtt'
            ? 'text/vtt'
            : ext === 'txt'
            ? 'text/plain'
            : 'application/octet-stream';

        const url = await uploadToBunny(
          path,
          Buffer.from(arrayBuffer),
          contentType
        );

        uploaded.push({ fileName, path, url });
      } catch (err: any) {
        errors.push(`Error subiendo ${file.recording_type}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sincronización completada: ${uploaded.length} archivos subidos`,
    });
  } catch (error) {
    console.error('[bunny-manage/sync] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
