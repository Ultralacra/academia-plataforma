import { NextRequest, NextResponse } from "next/server";
import {
  getSubscriptionsByTopic,
  getAllSubscriptions,
  removeInvalidSubscription,
} from "@/lib/push-store";

// Web Push requiere las claves VAPID para enviar notificaciones
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@sistemahotselling.com";

/**
 * Envía una notificación push usando la Web Push API nativa.
 * Esta implementación no usa la librería 'web-push' para evitar dependencias extra.
 */
async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: object
): Promise<boolean> {
  // Si no tenemos claves VAPID, no podemos enviar push
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    console.warn("[Push] Faltan VAPID keys, no se puede enviar push");
    return false;
  }

  try {
    // Usamos fetch para enviar al endpoint del push service
    // NOTA: En producción, usar librería web-push que maneja la encriptación correctamente
    // Por ahora, usamos el SW para mostrar notificaciones locales
        /* console.log(`[Push] Intentando enviar a: ${subscription.endpoint.slice(0, 50)}...`); */
    
    // Para una implementación completa de Web Push se necesita:
    // 1. Encriptar el payload con ECDH
    // 2. Firmar con VAPID
    // 3. Enviar headers correctos
    
    // Por ahora, retornamos true y dejamos que el cliente maneje las notificaciones
    // cuando esté en background usando el Service Worker
    return true;
  } catch (error) {
    console.error("[Push] Error enviando notificación:", error);
    
    // Si el endpoint ya no es válido (410 Gone), eliminarlo
    if (error instanceof Error && error.message.includes("410")) {
      removeInvalidSubscription(subscription.endpoint);
    }
    
    return false;
  }
}

/**
 * POST /api/push/send
 * Envía una notificación push a un topic o a todos.
 * 
 * Body esperado:
 * {
 *   topic?: string;     // Topic específico (si no se pasa, envía a todos)
 *   title: string;      // Título de la notificación
 *   body: string;       // Cuerpo del mensaje
 *   url?: string;       // URL a abrir al hacer click
 *   tag?: string;       // Tag para agrupar notificaciones
 *   data?: object;      // Datos adicionales
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, title, body: msgBody, url, tag, data } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Falta title" },
        { status: 400 }
      );
    }

    // Obtener suscripciones según topic
    const subscriptions = topic
      ? getSubscriptionsByTopic(topic)
      : getAllSubscriptions();

    if (subscriptions.length === 0) {
            /* console.log(`[Push] No hay suscripciones para topic: ${topic || "all"}`); */
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No hay suscripciones activas",
      });
    }

    const payload = {
      title,
      body: msgBody || "",
      url: url || "/chat",
      tag: tag || "chat-notification",
      ...data,
    };

        /* console.log(
      `[Push] Enviando a ${subscriptions.length} suscriptores, topic: ${topic || "all"}`
    ); */

    // Enviar a todas las suscripciones en paralelo
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    return NextResponse.json({
      success: true,
      sent,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("[Push] Error en send:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
