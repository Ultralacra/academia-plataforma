import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/zoom";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    let accessToken: string;
    let setCookieHeader: string | undefined;

    try {
      const tokenResult = await getAccessToken(req);
      accessToken = tokenResult.accessToken;
      setCookieHeader = tokenResult.setCookieHeader;
    } catch (err: any) {
      return NextResponse.json(
        { error: `Error de autenticación: ${err.message}`, users: [] },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

    // 1. Obtener todos los usuarios
    const usersRes = await fetch("https://api.zoom.us/v2/users?page_size=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!usersRes.ok) throw new Error("Error listing users");
    const usersData = await usersRes.json();
    const users = usersData.users || [];

    // 2. Para cada usuario, obtener sus grabaciones
    const usersWithRecordings = [];

    for (const user of users) {
      try {
        const recRes = await fetch(
          `https://api.zoom.us/v2/users/${user.id}/recordings?from=${from}&to=${to}&page_size=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!recRes.ok) continue;
        const recData = await recRes.json();
        const meetings = recData.meetings || [];

        if (meetings.length > 0) {
          // Extraer transcripciones
          const transcripts: any[] = [];
          for (const meeting of meetings) {
            for (const file of meeting.recording_files || []) {
              const rt = (file.recording_type || "").toLowerCase();
              const ft = (file.file_type || "").toUpperCase();
              if (rt.includes("transcript") || rt === "audio_transcript" || ft === "TRANSCRIPT" || ft === "CC" || ft === "VTT") {
                transcripts.push({
                  id: file.id,
                  meeting_id: meeting.meeting_id,
                  meeting_topic: meeting.topic,
                  meeting_start: meeting.start_time,
                  recording_type: file.recording_type,
                  file_type: file.file_type,
                  file_size: file.file_size,
                  download_url: file.download_url,
                });
              }
            }
          }

          usersWithRecordings.push({
            user_id: user.id,
            user_email: user.email,
            user_name: user.display_name || `${user.first_name} ${user.last_name}`,
            user_type: user.type,
            meetings_count: meetings.length,
            transcripts_count: transcripts.length,
            meetings: meetings,
            transcripts: transcripts,
          });
        }
      } catch {
        // Skip user on error
      }
    }

    // Ordenar por cantidad de grabaciones descendente
    usersWithRecordings.sort((a, b) => b.meetings_count - a.meetings_count);

    const response = NextResponse.json({ users: usersWithRecordings });
    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message, users: [] }, { status: 500 });
  }
}
