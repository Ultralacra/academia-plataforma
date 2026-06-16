import { NextResponse } from "next/server";
import { getZoomAuthUrl } from "@/lib/zoom";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("returnTo") || "/admin/storage-test";

    const authUrl = getZoomAuthUrl(returnTo);

    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[zoom-auth]", err);
    return NextResponse.json(
      { error: "Failed to generate Zoom auth URL" },
      { status: 500 },
    );
  }
}
