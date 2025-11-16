"use client";

import { useEffect, useState } from "react";
import Spinner from "./spinner";

export default function FullScreenLoader({
  message = "Verificando sesión...",
  delayMs = 180,
}: {
  message?: string;
  delayMs?: number;
}) {
  const [show, setShow] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 bg-gradient-to-b from-white to-slate-50">
      <div className="flex items-center justify-center">
        <Spinner size={28} thickness={2} className="text-blue-600" />
      </div>
      <div className="text-center animate-[fadeIn_.3s_ease]">
        <h3 className="text-sm font-medium text-slate-800">{message}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cargando datos de la sesión
        </p>
      </div>
    </div>
  );
}
