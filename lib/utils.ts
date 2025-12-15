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

const NOTIFICATION_SOUND_SRC = "/new-notification-022-370046.mp3";

function ensureAudioUnlocked() {
  if (typeof window === "undefined") return;
  if (audioUnlocked) return;
  if (audioUnlockAttached) return;
  audioUnlockAttached = true;
  const unlock = () => {
    try {
      if (!globalAudio) {
        // Prefer user-provided MP3 in /public; fallback to embedded WAV if it fails
        const el = document.createElement("audio");
        el.src = NOTIFICATION_SOUND_SRC;
        el.preload = "auto";
        el.volume = 0.0;
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
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
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
    ensureAudioUnlocked();
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      const p = globalAudio.play();
      if (p && typeof p.catch === "function") {
        p.catch((e: any) => {
          // Autoplay puede estar bloqueado hasta interacción del usuario
          console.debug("Error playing sound (autoplay blocked?):", e);
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
      });
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}
