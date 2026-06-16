import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getZoomUser } from "@/lib/zoom";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/admin/storage-test";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/storage-test?error=${encodeURIComponent(error)}`, req.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/storage-test?error=no_code", req.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Intentar obtener info del usuario (opcional, puede fallar por scopes)
    let user: { id?: string; email?: string; display_name?: string } = {};
    try {
      user = await getZoomUser(tokens.access_token);
    } catch {
      console.log("[zoom-callback] No se pudo obtener info del usuario (scope user:read no configurado)");
    }

    const cookieData = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      user: {
        id: user.id || "unknown",
        email: user.email || "unknown",
        display_name: user.display_name || "Zoom User",
      },
    });

    const response = NextResponse.redirect(new URL(state, req.url));
    response.cookies.set("zoom_tokens", cookieData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[zoom-callback]", err);
    return NextResponse.redirect(
      new URL(
        `/admin/storage-test?error=${encodeURIComponent(String(err))}`,
        req.url,
      ),
    );
  }
}
