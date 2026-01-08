// lib/public-app-origin.ts

function normalizeOrigin(value: string) {
  return String(value || "").trim().replace(/\/$/, "");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Origen público para links (ej: formulario /booking/...)
 *
 * - En desarrollo (localhost/127.0.0.1) usa window.location.origin.
 * - En prod, usa NEXT_PUBLIC_APP_ORIGIN (o NEXT_PUBLIC_SITE_URL) si existe.
 * - Si no hay env, cae a https://academia.valinkgroup.com.
 */
export function getPublicAppOrigin() {
  const env =
    process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "";

  if (typeof window !== "undefined") {
    const origin = window.location?.origin;
    const hostname = window.location?.hostname || "";
    if (origin && isLocalHostname(hostname)) {
      return normalizeOrigin(origin);
    }
    if (origin && !env.trim()) {
      return normalizeOrigin(origin);
    }
  }

  if (env && env.trim()) return normalizeOrigin(env);
  return "https://academia.valinkgroup.com";
}
