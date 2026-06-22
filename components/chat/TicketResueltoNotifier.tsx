"use client";

import { toast } from "@/hooks/use-toast";
import {
  playNotificationSound,
  showSystemNotification,
} from "@/lib/utils";

export interface EmmaMensajeData {
  id: string;
  content: string;
  feedbackLink: string;
  feedbackUrl: string;
}

type EmmaListener = (data: EmmaMensajeData) => void;
const listeners = new Set<EmmaListener>();

export function onTicketResuelto(fn: EmmaListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitirTicketResuelto(data: EmmaMensajeData, ticketId: string) {
  playNotificationSound();

  showSystemNotification({
    title: "¡Feedback de tu coach listo!",
    body: "Tu coach ya revisó tu consulta. Revisa el feedback en Emma.",
    url: `/alumno/agente`,
    tag: `emma-resuelto-${ticketId}`,
  });

  toast({
    title: "¡Feedback de tu coach listo! 😊",
    description: data.content,
  });

  for (const fn of listeners) {
    try {
      fn(data);
    } catch {
      // ignorar
    }
  }
}
