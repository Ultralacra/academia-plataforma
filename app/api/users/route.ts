import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = cookies().get("token")?.value;
  if (!token) {
    return NextResponse.json({ status: "error", message: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "50";
  const search = searchParams.get("search") || "";

  const url = buildUrl(`/users?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}&search=${encodeURIComponent(search)}`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json(parsed, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e?.message ?? "Error consultando usuarios" }, { status: 500 });
  }
}
