import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, listUserRecordings } from "@/lib/zoom";

export const runtime = "nodejs";

function getDefaultFromDate(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().split("T")[0];
}

function getDefaultToDate(): string {
  return new Date().toISOString().split("T")[0];
}

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
        { error: `Error de autenticación: ${err.message}`, meetings: [] },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || getDefaultFromDate();
    const to = searchParams.get("to") || getDefaultToDate();
    const pageSize = searchParams.get("page_size")
      ? Number(searchParams.get("page_size"))
      : 50;
    const userId = searchParams.get("userId") || "me";

    const result = await listUserRecordings(accessToken, userId, {
      from,
      to,
      page_size: pageSize,
    });

    const response = NextResponse.json(result);
    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message, meetings: [] }, { status: 500 });
  }
}
