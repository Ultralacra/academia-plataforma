import { Attachment } from "./chat-types";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];
const VIDEO_EXT = ["mp4", "webm", "ogg", "mov", "mkv", "avi"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "aac", "webm"];
const PDF_EXT = ["pdf"];

export function guessMimeFromName(name?: string): string | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  const ext = lower.split(".").pop() || "";
  if (IMAGE_EXT.includes(ext)) return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (VIDEO_EXT.includes(ext)) return `video/${ext}`;
  if (AUDIO_EXT.includes(ext)) return `audio/${ext}`;
  if (PDF_EXT.includes(ext)) return "application/pdf";
  return undefined;
}

export function resolveMime(urlOrName?: string, fallback?: string): string | undefined {
  if (!urlOrName) return fallback;
  try {
    const u = new URL(urlOrName, typeof window !== "undefined" ? window.location.href : "http://local");
    const pathname = u.pathname || "";
    const ext = pathname.split(".").pop() || "";
    const guessed = guessMimeFromName(ext ? `a.${ext}` : urlOrName);
    return guessed || fallback;
  } catch {
    // Not a URL; treat as name
    const guessed = guessMimeFromName(urlOrName);
    return guessed || fallback;
  }
}

// Base64 quick sniffing for common formats
function guessMimeFromBase64Prefix(b64?: string): string | undefined {
  if (!b64) return undefined;
  const s = b64.slice(0, 16);
  if (s.startsWith('/9j/')) return 'image/jpeg'; // JPEG
  if (s.startsWith('iVBORw0KGgo')) return 'image/png'; // PNG
  if (s.startsWith('R0lGODdh') || s.startsWith('R0lGODlh')) return 'image/gif'; // GIF
  if (s.startsWith('UklGR')) return 'image/webp'; // WebP (RIFF)
  if (s.startsWith('JVBER')) return 'application/pdf'; // PDF
  if (s.startsWith('SUQz')) return 'audio/mpeg'; // MP3 (ID3)
  if (s.startsWith('T2dn')) return 'audio/ogg'; // OGG
  return undefined;
}

// Resolve MIME specifically for Attachment objects (prefiere mime válido, luego nombre, luego base64)
export function resolveAttachmentMime(a: Attachment): string {
  const m = (a?.mime || '').toLowerCase();
  if (m && m !== 'application/octet-stream') return a.mime;
  const byName = guessMimeFromName(a?.name);
  if (byName) return byName;
  const byB64 = guessMimeFromBase64Prefix(a?.data_base64);
  if (byB64) return byB64;
  return a?.mime || 'application/octet-stream';
}

// Build a usable URL (prefiere url de servidor, si no data URL con base64)
export function getAttachmentUrl(a: Attachment): string {
  if (a?.url) return a.url;
  if (a?.data_base64) return `data:${resolveAttachmentMime(a)};base64,${a.data_base64}`;
  return "";
}

export function isImage(m?: string) {
  return !!m && m.startsWith("image/");
}
export function isVideo(m?: string) {
  return !!m && m.startsWith("video/");
}
export function isAudio(m?: string) {
  return !!m && m.startsWith("audio/");
}

export function smallPreviewSize(mime?: string) {
  if (!mime) return { w: 180, h: 180 };
  if (isImage(mime)) return { w: 140, h: 140 };
  if (isVideo(mime)) return { w: 160, h: 120 };
  if (isAudio(mime)) return { w: 336, h: 50 };
  return { w: 200, h: 60 };
}

export function buildAttachmentUrl(host: string | undefined, path?: string) {
  if (!path) return undefined;
  if (!host) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${host.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
