import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "edge";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sizeRaw = Number(searchParams.get("size") ?? 512);
  const size = clamp(Number.isFinite(sizeRaw) ? sizeRaw : 512, 32, 1024);

  // Genera un PNG válido sin depender de archivos binarios en /public.
  const element = React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #111827 0%, #000000 100%)",
        borderRadius: size >= 256 ? 96 : 64,
        color: "white",
        fontSize: Math.floor(size * 0.42),
        fontWeight: 800,
        letterSpacing: "-0.06em",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      },
    },
    "AX"
  );

  return new ImageResponse(element, { width: size, height: size });
}
