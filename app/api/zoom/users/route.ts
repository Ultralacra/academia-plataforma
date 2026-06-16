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

    // Listar usuarios
    const { searchParams } = new URL(req.url);
    const pageSize = searchParams.get("page_size") || "100";
    const nextPageToken = searchParams.get("next_page_token") || undefined;

    const query = new URLSearchParams({ page_size: pageSize });
    if (nextPageToken) query.set("next_page_token", nextPageToken);

    const res = await fetch(`https://api.zoom.us/v2/users?${query.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ 
        error: `Zoom API error: ${res.status} ${err}`,
        users: [] 
      }, { status: res.status });
    }

    const result = await res.json();
    const response = NextResponse.json(result);
    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message, users: [] }, { status: 500 });
  }
}
