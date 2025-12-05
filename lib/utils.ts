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

export function playNotificationSound() {
  try {
    // Always create a new instance to avoid state issues, for debugging
    const audio = new Audio("https://res.cloudinary.com/dzkq67qmu/video/upload/v1733326786/notification_sound_y8j3s9.mp3");
    audio.volume = 0.5;
    
    console.log("[Utils] Playing notification sound (new instance)...");
    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch((e) => {
        console.error("Error playing sound (autoplay blocked?):", e);
      });
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}
