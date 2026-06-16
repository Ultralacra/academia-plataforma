import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/zoom";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "transcript.txt";

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let accessToken: string;
    let setCookieHeader: string | undefined;

    try {
      const tokenResult = await getAccessToken(req);
      accessToken = tokenResult.accessToken;
      setCookieHeader = tokenResult.setCookieHeader;
    } catch (err: any) {
      return NextResponse.json(
        { error: `Error de autenticación: ${err.message}` },
        { status: 401 },
      );
    }

    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "follow",
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Zoom download failed: ${res.status} ${err}` },
        { status: res.status },
      );
    }

    const content = await res.text();

    const response = new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
