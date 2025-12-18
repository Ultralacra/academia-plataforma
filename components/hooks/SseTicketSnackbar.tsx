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

  function parsePayload(raw: any): any | null {
    try {
      const p = raw?.payload ?? raw?.raw?.payload;
      if (!p) return null;
      if (typeof p === "string") {
        const s = p.trim();
        if (!s) return null;
        return JSON.parse(s);
      }
      if (typeof p === "object") return p;
    } catch {}
    return null;
  }

  function titleForType(type: string): string {
    if (type === "ticket.created") return "Ticket creado";
    if (type === "ticket.updated") return "Ticket actualizado";
    if (type === "ticket.reassigned") return "Ticket reasignado";
    if (type === "ticket.files.added") return "Archivos agregados";
    return "Notificación";
  }

  function normalizeAssignedTo(v: any): string[] {
    try {
      const arr = Array.isArray(v) ? v : v ? [v] : [];
      return arr
        .map((x) => {
          if (x == null) return "";
          if (typeof x === "string") return x.trim();
          // por si el backend entrega objetos en el futuro
          const maybeCode = (x as any)?.codigo_equipo ?? (x as any)?.codigo;
          return String(maybeCode ?? "").trim();
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

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
    const titleRaw = String(lastReceived.title || "").trim();

    const rawEnvelope = lastReceived.raw as any;
    const rawInner = (rawEnvelope?.raw ?? rawEnvelope) as any;
    const payloadObj = parsePayload(rawInner) ?? parsePayload(rawEnvelope);
    const ticket =
      payloadObj?.ticket ?? rawInner?.ticket ?? rawEnvelope?.ticket ?? {};
    const nombre = ticket?.nombre ? String(ticket.nombre) : "";
    const codigo = (() => {
      const v =
        ticket?.codigo ??
        payloadObj?.codigo ??
        payloadObj?.ticket?.codigo ??
        rawInner?.codigo ??
        rawEnvelope?.codigo;
      const s = String(v ?? "").trim();
      return s || "";
    })();

    const assignedTo = normalizeAssignedTo(payloadObj?.assigned_to);

    const actorName = (() => {
      const v =
        payloadObj?.actor_name ??
        payloadObj?.actorName ??
        rawInner?.actor_name ??
        rawInner?.actorName ??
        rawEnvelope?.actor_name ??
        rawEnvelope?.actorName;
      const s = String(v ?? "").trim();
      return s || "";
    })();

    const title =
      titleRaw && titleRaw.toLowerCase() !== "notificación"
        ? titleRaw
        : titleForType(type);

    // Sonido por cada evento nuevo (si el navegador lo permite)
    try {
      playNotificationSound();
    } catch {}

    // Refrescar listados de tickets en la UI cuando el backend emite cambios.
    try {
      if (typeof window !== "undefined") {
        const shouldRefresh = [
          "ticket.created",
          "ticket.updated",
          "ticket.reassigned",
          "ticket.files.added",
        ].includes(type);
        if (shouldRefresh) {
          window.dispatchEvent(
            new CustomEvent("tickets:refresh", {
              detail: {
                type,
                codigo,
                notificationId: id,
                at: lastReceived.at,
              },
            })
          );
        }
      }
    } catch {}

    const baseDescription = (() => {
      if (type === "ticket.created") {
        return nombre ? nombre : "Se creó un nuevo ticket";
      }
      if (type === "ticket.files.added") {
        const nRaw = payloadObj?.archivosRegistrados;
        const n = Number(nRaw);
        const nLabel = Number.isFinite(n) && n > 0 ? n : 0;
        const filesText =
          nLabel === 1
            ? "1 archivo agregado"
            : nLabel > 1
            ? `${nLabel} archivos agregados`
            : "Archivos agregados";
        const ticketLabel = nombre
          ? nombre
          : codigo
          ? `Ticket ${codigo}`
          : "Ticket";
        return `${ticketLabel} · ${filesText}`;
      }
      if (type === "ticket.reassigned") {
        const who =
          assignedTo.length > 0
            ? assignedTo.length === 1
              ? `Asignado a: ${assignedTo[0]}`
              : `Asignado a: ${assignedTo.join(", ")}`
            : "Reasignado";
        const ticketLabel = nombre
          ? nombre
          : codigo
          ? `Ticket ${codigo}`
          : "Ticket";
        return `${ticketLabel} · ${who}`;
      }
      // updated y otros
      if (nombre) return nombre;
      if (codigo) return `Ticket ${codigo}`;
      return "";
    })();

    const description = (() => {
      const parts: string[] = [];
      if (baseDescription) parts.push(baseDescription);
      if (actorName) parts.push(`Por: ${actorName}`);
      return parts.join(" · ");
    })();

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
