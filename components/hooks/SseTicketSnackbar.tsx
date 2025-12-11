"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSseNotifications } from "@/components/hooks/useSseNotifications";

export function SseTicketSnackbar() {
  const { toast } = useToast();
  const { lastReceived } = useSseNotifications();
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!lastReceived) return;

    const id = String(lastReceived.id ?? "");
    if (!id) return;
    if (processedIdsRef.current.has(id)) return;
    processedIdsRef.current.add(id);

    const type = String(lastReceived.type || "");
    if (type !== "ticket.created") return;

    const raw = lastReceived.raw as any;
    const ticket = raw?.payload?.ticket ?? raw?.ticket ?? {};
    const nombre = ticket?.nombre ? String(ticket.nombre) : "";

    toast({
      title: "Nuevo ticket creado",
      description: nombre ? nombre : "Se creó un nuevo ticket",
    });
  }, [lastReceived, toast]);

  return null;
}
