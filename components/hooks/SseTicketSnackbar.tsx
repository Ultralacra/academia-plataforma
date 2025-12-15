"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSseNotifications } from "@/components/hooks/useSseNotifications";
import { initNotificationSound, playNotificationSound } from "@/lib/utils";

export function SseTicketSnackbar() {
  const { toast } = useToast();
  const { lastReceived } = useSseNotifications();
  const processedIdsRef = useRef<Set<string>>(new Set());
  const lastToastIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  // Preparar el unlock de audio lo antes posible (antes del click de login)
  useEffect(() => {
    try {
      initNotificationSound();
    } catch {}
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    if (typeof window === "undefined") return;
    try {
      lastToastIdRef.current =
        window.sessionStorage.getItem("sse:lastToastId") || null;
    } catch {}
  }, []);

  useEffect(() => {
    if (!lastReceived) return;

    const id = String(lastReceived.id ?? "");
    if (!id) return;

    // Evitar re-mostrar notificaciones antiguas al recargar.
    // Si el backend usa ids incrementales, ignoramos ids <= al último mostrado.
    try {
      const prev = lastToastIdRef.current;
      if (prev) {
        const currN = Number(id);
        const prevN = Number(prev);
        const currIsNum = Number.isFinite(currN) && String(currN) === id;
        const prevIsNum = Number.isFinite(prevN) && String(prevN) === prev;
        if (currIsNum && prevIsNum && currN <= prevN) return;
        if (!currIsNum && id === prev) return;
      }
    } catch {}

    if (processedIdsRef.current.has(id)) return;
    processedIdsRef.current.add(id);

    // Mantener el set acotado
    if (processedIdsRef.current.size > 500) {
      processedIdsRef.current = new Set(
        Array.from(processedIdsRef.current).slice(-250)
      );
    }

    const type = String(lastReceived.type || "");
    const title = String(lastReceived.title || "Notificación");

    const raw = lastReceived.raw as any;
    const ticket = raw?.payload?.ticket ?? raw?.ticket ?? {};
    const nombre = ticket?.nombre ? String(ticket.nombre) : "";
    const codigo = ticket?.codigo ? String(ticket.codigo) : "";

    // Sonido por cada evento nuevo (si el navegador lo permite)
    try {
      playNotificationSound();
    } catch {}

    const description =
      type === "ticket.created"
        ? nombre
          ? nombre
          : "Se creó un nuevo ticket"
        : nombre
        ? nombre
        : codigo
        ? `Ticket ${codigo}`
        : "";

    toast({
      title,
      description,
    });

    // Persistir el último id mostrado para que un reload no lo re-dispare
    try {
      lastToastIdRef.current = id;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sse:lastToastId", id);
      }
    } catch {}
  }, [lastReceived, toast]);

  return null;
}
