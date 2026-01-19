import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mapea mensajes de error crudos (en inglés/JSON) a español amigable
export function getSpanishApiError(err: unknown, fallback = "Ocurrió un error"): string {
  // Extraer mensaje base
  let raw = "";
  if (err instanceof Error) raw = err.message || "";
  else if (typeof err === "string") raw = err;
  else if (err && typeof err === "object" && "message" in (err as any)) raw = String((err as any).message ?? "");

  // Si viene como JSON string, intentar parsear
  let key = raw;
  try {
    if (raw && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      key = String(parsed?.error ?? parsed?.message ?? raw);
    }
  } catch {
    // ignorar, usar raw
  }

  const k = String(key).trim().toLowerCase();

  // Mapeo conocido → español
  const dictionary: Record<string, string> = {
    "email already registered": "El email ya está registrado",
    "invalid credentials": "Credenciales inválidas",
    "missing fields": "Faltan campos requeridos",
    "missing required fields": "Faltan campos requeridos",
    "password too short": "La contraseña es demasiado corta",
  };

  // Coincidencia exacta
  if (dictionary[k]) return dictionary[k];

  // Mensajes tipo "http 400 on /..." → fallback específico si lo hay
  if (!k || /^http\s+\d+\b/.test(k)) return fallback;

  // Capitalizar primera letra y devolver sin JSON
  const pretty = k.replace(/^\s*"|"\s*$/g, "");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

let globalAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let audioUnlockAttached = false;

let globalAudioCtx: AudioContext | null = null;
let audioCtxUnlocked = false;

const NOTIFICATION_SOUND_SRC = "/new-notification-022-370046.mp3";
const NOTIFICATION_AUDIO_ELEMENT_ID = "__notification-audio";

// Evitar dobles disparos (varios listeners a la vez) que suenan "erráticos"
let lastSoundAtMs = 0;
const MIN_SOUND_INTERVAL_MS = 450;

function ensureAudioUnlocked() {
  if (typeof window === "undefined") return;
  if (audioUnlocked) return;
  if (audioUnlockAttached) return;
  audioUnlockAttached = true;
  const unlock = () => {
    try {
      // WebAudio unlock/resume (fallback when HTMLAudio is flaky)
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx && !globalAudioCtx) globalAudioCtx = new Ctx();
        if (globalAudioCtx && globalAudioCtx.state === "suspended") {
          globalAudioCtx.resume().catch(() => {});
        }
        if (globalAudioCtx && globalAudioCtx.state === "running") {
          audioCtxUnlocked = true;
        }
      } catch {}

      if (!globalAudio) {
        // Reutilizar un <audio> pre-creado por script beforeInteractive (producción)
        try {
          const existing = document.getElementById(
            NOTIFICATION_AUDIO_ELEMENT_ID
          ) as HTMLAudioElement | null;
          if (existing && String(existing.tagName).toLowerCase() === "audio") {
            globalAudio = existing;
          }
        } catch {}
      }

      if (!globalAudio) {
        // Prefer user-provided MP3 in /public; fallback to embedded WAV if it fails
        const el = document.createElement("audio");
        el.id = NOTIFICATION_AUDIO_ELEMENT_ID;
        el.src = NOTIFICATION_SOUND_SRC;
        el.preload = "auto";
        el.volume = 0.0;
        el.setAttribute("playsinline", "");
        el.style.display = "none";
        document.body.appendChild(el);
        globalAudio = el;
        // Prime once
        el.play().catch(() => {
          try {
            // Fallback to embedded beep if MP3 not available or blocked
            el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYQAAACAgICAgICAgP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA";
            el.play().catch(() => {});
          } catch {}
        });
        setTimeout(() => {
          try { el.pause(); el.volume = 1.0; } catch {}
        }, 200);
      }
      audioUnlocked = true;
    } catch {}
  };
  try {
    // Usar eventos más tempranos que click para no perder el primer gesto del usuario.
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
  } catch {}
}

function playBeepFallback() {
  try {
    if (typeof window === "undefined") return;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!globalAudioCtx) globalAudioCtx = new Ctx();
    const ctx = globalAudioCtx;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      // Si todavía está bloqueado, no forzamos: depende de gesto del usuario
      ctx.resume().catch(() => {});
    }
    if (ctx.state !== "running") return;
    audioCtxUnlocked = true;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    // Envelope corto para que sea suave
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.start(now);
    o.stop(now + 0.2);
  } catch {}
}

// Llamar esto al montar la app (antes del login/click) para que el primer click
// ya sirva para desbloquear el audio y luego suene en la primera notificación.
export function initNotificationSound() {
  try {
    ensureAudioUnlocked();
  } catch {}
}

export function playNotificationSound() {
  try {
    const nowMs = Date.now();
    if (nowMs - lastSoundAtMs < MIN_SOUND_INTERVAL_MS) return;
    lastSoundAtMs = nowMs;

    ensureAudioUnlocked();
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      const p = globalAudio.play();
      if (p && typeof p.catch === "function") {
        p.catch((e: any) => {
          // Autoplay puede estar bloqueado hasta interacción del usuario
          console.debug("Error playing sound (autoplay blocked?):", e);
          // Fallback a beep WebAudio si está disponible
          if (audioCtxUnlocked) playBeepFallback();
        });
      }
      return;
    }
    // Fallback: create local audio and try to play (may fail pre-unlock)
    const local = new Audio();
    local.src = NOTIFICATION_SOUND_SRC;
    local.volume = 1.0;
    const pr = local.play();
    if (pr && typeof pr.catch === "function") {
      pr.catch((e: any) => {
        console.debug("Error playing sound (autoplay blocked?):", e);
        try {
          local.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYQAAACAgICAgICAgP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA/wAAAP8AAP8A/wD/AP8A/wAA";
          local.play().catch(() => {});
        } catch {}
        // Fallback a beep WebAudio
        if (audioCtxUnlocked) playBeepFallback();
      });
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}

/**
 * Envía un mensaje al Service Worker para mostrar una notificación.
 * Útil cuando la app está en background y el WebSocket recibe un mensaje.
 */
export async function sendNotificationToServiceWorker(opts: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  chatId?: string | number;
  senderName?: string;
}): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator)) return false;
    
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg || !reg.active) return false;

    reg.active.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: {
        title: opts.title,
        body: opts.body || "",
        url: opts.url || "/chat",
        tag: opts.tag || "chat-notification",
        chatId: opts.chatId,
        senderName: opts.senderName,
      },
    });
    
    return true;
  } catch {
    return false;
  }
}

export async function showSystemNotification(opts: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  chatId?: string | number;
  senderName?: string;
}): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;

    const title = String(opts.title || "Notificación").trim() || "Notificación";
    const body = String(opts.body || "").trim();
    const url = String(opts.url || "/").trim() || "/";
    const tag = String(opts.tag || "academiax").trim() || "academiax";

    // Preferir SW: funciona mejor en PWA en background (cuando el navegador lo permite)
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, {
            body,
            tag,
            renotify: true,
            icon: "/favicon.png",
            badge: "/favicon.png",
            data: { 
              url,
              chatId: opts.chatId,
              senderName: opts.senderName,
            },
            vibrate: [200, 100, 200], // Patrón de vibración para móviles
          });
          return true;
        }
      }
    } catch {}

    // Fallback: Notification API directa (no siempre funciona en background)
    try {
      new Notification(title, {
        body,
        tag,
        data: { url },
        icon: "/favicon.png",
      } as any);
      return true;
    } catch {}

    return false;
  } catch {
    return false;
  }
}

// Enganchar el unlock lo antes posible, para no perder el primer click.
// (Este módulo se importa en muchos componentes client, así que suele ejecutarse temprano.)
try {
  if (typeof window !== "undefined") ensureAudioUnlocked();
} catch {}
