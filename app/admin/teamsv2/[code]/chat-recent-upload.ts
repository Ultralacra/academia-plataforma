import { Sender, Attachment } from "./chat-types";

// Persistencia de pistas de subidas recientes (para ubicar correctamente mensajes tras recargar)
type RecentUploadHint = { name: string; size: number; mime?: string; ts: number };
const recentUploadsKey = (role: Sender, chatId: string | number) =>
  `chatRecentUploads:${role}:${String(chatId)}`;

export function recordRecentUpload(role: Sender, chatId: string | number, f: File) {
  try {
    const key = recentUploadsKey(role, chatId);
    const raw = localStorage.getItem(key);
    const list: RecentUploadHint[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    list.push({ name: f.name, size: f.size, mime: f.type, ts: now });
    const twoDays = 48 * 60 * 60 * 1000;
    const filtered = list.filter((it) => now - (it?.ts || 0) < twoDays).slice(-30);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {}
}

export function hasRecentUploadMatch(
  role: Sender,
  chatId: string | number | null | undefined,
  atts?: Attachment[]
) {
  try {
    if (!chatId || !atts || atts.length === 0) return false;
    const key = recentUploadsKey(role as Sender, chatId as any);
    const raw = localStorage.getItem(key);
    const list: RecentUploadHint[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return false;
    const now = Date.now();
    const windowMs = 2 * 60 * 1000; // 2 minutos
    for (const a of atts) {
      for (const h of list) {
        if (now - (h?.ts || 0) > windowMs) continue;
        if (!a) continue;
        const nameOk = !!a.name && a.name === h.name;
        const sizeOk = typeof a.size === "number" && a.size === h.size;
        const mimeOk = !h?.mime || (a?.mime && a.mime === h.mime);
        if (nameOk && sizeOk && mimeOk) return true;
      }
    }
  } catch {}
  return false;
}

// Coincidencia laxa para adjuntos cuyo nombre puede cambiar en el servidor (p. ej. audio re-etiquetado)
export function hasRecentUploadLoose(
  role: Sender,
  chatId: string | number | null | undefined,
  atts?: Attachment[]
) {
  try {
    if (!chatId || !atts || atts.length === 0) return false;
    const key = recentUploadsKey(role as Sender, chatId as any);
    const raw = localStorage.getItem(key);
    const list: RecentUploadHint[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return false;
    const now = Date.now();
    const windowMs = 30 * 1000; // 30s
    const cat = (m?: string) => (m || '').split('/')[0];
    for (const a of atts) {
      const aCat = cat(a?.mime);
      for (const h of list) {
        if (now - (h?.ts || 0) > windowMs) continue;
        const hCat = cat(h?.mime);
        const sameCat = !h?.mime || !a?.mime ? true : aCat === hCat;
        const sameSize = typeof a.size === 'number' && a.size === h.size;
        if (sameCat && sameSize) return true;
      }
    }
  } catch {}
  return false;
}
