/**
 * Almacén en memoria para suscripciones Push.
 * NOTA: En producción, esto debería persistirse en una base de datos (Redis, PostgreSQL, etc.)
 * 
 * Este almacén en memoria funciona bien para desarrollo y testing,
 * pero las suscripciones se pierden cuando se reinicia el servidor.
 */

export interface PushSubscription {
  /** Topic al que está suscrito (e.g., "chat:all" o código de alumno) */
  topic: string;
  /** Endpoint del push service del navegador */
  endpoint: string;
  /** Claves de encriptación */
  keys: {
    p256dh: string;
    auth: string;
  };
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Map de suscripciones: endpoint -> PushSubscription
 * Usamos endpoint como key porque es único por dispositivo/navegador.
 */
export const pushSubscriptions = new Map<string, PushSubscription>();

/**
 * Obtiene todas las suscripciones para un topic específico.
 */
export function getSubscriptionsByTopic(topic: string): PushSubscription[] {
  const normalizedTopic = topic.toLowerCase();
  const result: PushSubscription[] = [];
  
  for (const sub of pushSubscriptions.values()) {
    if (sub.topic === normalizedTopic) {
      result.push(sub);
    }
  }
  
  return result;
}

/**
 * Obtiene todas las suscripciones (para broadcast a todos).
 */
export function getAllSubscriptions(): PushSubscription[] {
  return Array.from(pushSubscriptions.values());
}

/**
 * Elimina suscripciones que ya no son válidas (errores 410 Gone, etc.)
 */
export function removeInvalidSubscription(endpoint: string): void {
  pushSubscriptions.delete(endpoint);
  console.log(`[Push Store] Removed invalid subscription: ${endpoint.slice(0, 50)}...`);
}
