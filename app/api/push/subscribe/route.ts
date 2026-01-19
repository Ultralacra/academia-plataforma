import { NextRequest, NextResponse } from "next/server";
import { pushSubscriptions, PushSubscription } from "@/lib/push-store";

/**
 * POST /api/push/subscribe
 * Registra una suscripción push para un tema (topic).
 * 
 * Body esperado:
 * {
 *   topic: string;         // e.g., "chat:all" o un código de alumno
 *   subscription: PushSubscriptionJSON; // del navegador
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, subscription } = body;

    if (!topic || !subscription) {
      return NextResponse.json(
        { success: false, error: "Faltan topic o subscription" },
        { status: 400 }
      );
    }

    // Validar que subscription tenga los campos necesarios
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: "Subscription inválida" },
        { status: 400 }
      );
    }

    // Guardar/actualizar suscripción
    const sub: PushSubscription = {
      topic: String(topic).toLowerCase(),
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      createdAt: new Date().toISOString(),
    };

    pushSubscriptions.set(subscription.endpoint, sub);

    console.log(
      `[Push] Suscripción registrada: topic=${sub.topic}, endpoint=${sub.endpoint.slice(0, 50)}...`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Error en subscribe:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Elimina una suscripción push.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Falta endpoint" },
        { status: 400 }
      );
    }

    pushSubscriptions.delete(endpoint);
    console.log(`[Push] Suscripción eliminada: ${endpoint.slice(0, 50)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Error en unsubscribe:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
