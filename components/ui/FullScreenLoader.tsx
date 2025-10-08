"use client";

import CircularProgress from "./CircularProgress";

export default function FullScreenLoader({
  message = "Verificando sesión...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_top,theme(colors.slate.100),white)] p-4">
      <div className="flex items-center justify-center">
        <CircularProgress
          value={60}
          size={96}
          strokeWidth={8}
          showLabel={false}
        />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">{message}</h3>
        <p className="text-sm text-muted-foreground">
          Cargando datos de la sesión...
        </p>
      </div>
    </div>
  );
}
