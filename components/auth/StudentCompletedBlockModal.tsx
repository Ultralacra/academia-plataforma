"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-config";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send?phone=573117280418&text=%F0%9F%91%8B%20Hola%2C%20soy%20estudiante%20de%20Hotselling%20Lite.%20Mi%20nombre%20es%20____%20y%20tengo%20una%20duda%3A%0A%0A";

export function StudentCompletedBlockModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isCompleted, setIsCompleted] = React.useState<boolean | null>(null);

  const role = String(user?.role || "").toLowerCase();
  const code = String((user as any)?.codigo || "").trim();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || role !== "student") {
      setIsCompleted(false);
      return;
    }
    if (!code) {
      setIsCompleted(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const json = await apiFetch<any>(
          `/client/get/cliente-estatus/${encodeURIComponent(code)}`,
          undefined,
          { background: true },
        );
        if (cancelled) return;

        const raw: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : Array.isArray(json?.data?.data)
              ? json.data.data
              : Array.isArray(json?.rows)
                ? json.rows
                : [];

        const sorted = [...raw].sort(
          (a, b) =>
            new Date(b.created_at || b.fecha || 0).getTime() -
            new Date(a.created_at || a.fecha || 0).getTime(),
        );

        const latest = sorted[0];
        const estadoId = String(
          latest?.estatus_id ?? latest?.estado_id ?? latest?.estado ?? latest?.status ?? "",
        ).toUpperCase();
        setIsCompleted(estadoId === "COMPLETADO");
      } catch {
        if (!cancelled) setIsCompleted(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, role, code]);

  if (!isAuthenticated || role !== "student") return null;
  if (!isCompleted) return null;

  return (
    <Dialog defaultOpen>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 grid place-items-center mb-5">
            <MessageSquare className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle>Programa completado</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Has finalizado tu programa. Para cualquier consulta o soporte,
              comunícate directamente con nuestro equipo de atención al cliente a
              través de WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            Contactar por WhatsApp
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
