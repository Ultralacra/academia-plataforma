"use client";

import { User } from "lucide-react";
import { STATUS_CLASSES, type StatusSint } from "./detail-utils";

export default function Header({
  name,
  code,
  apiState,
  apiStage,
  status,
}: {
  name: string;
  code: string;
  apiState?: string;
  apiStage?: string;
  status: StatusSint;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-black/5 dark:from-blue-950/30 dark:to-indigo-950/30 dark:ring-white/10">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            {name}
          </h1>
          {code && (
            <div className="mt-1.5 flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {code}
              </code>
              {apiStage && (
                <span className="text-xs text-muted-foreground">
                  Etapa API: {apiStage}
                </span>
              )}
            </div>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Vista detallada con métricas en tiempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
        >
          {status.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
