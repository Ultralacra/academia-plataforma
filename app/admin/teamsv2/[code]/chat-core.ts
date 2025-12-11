// Núcleo de helpers simples sin estado

export const getEmitter = (obj: any) =>
  obj?.id_chat_participante_emisor ?? obj?.emisor ?? obj?.id_emisor ?? null;

export const normalizeDateStr = (v: any): string | undefined => {
  if (!v) return undefined;
  const s = String(v);
  if (s.includes("T")) return s;
  if (s.includes(" ")) return s.replace(" ", "T");
  return s;
};

export const nowLocalIso = (): string => {
  const d = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  // Incluye offset para evitar ambigüedad (si mandamos un ISO sin zona,
  // algunos backends lo interpretan como UTC y al recargar se ve una hora distinta).
  const tzOffsetMinutes = -d.getTimezoneOffset();
  const sign = tzOffsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffsetMinutes);
  const hh = pad2(Math.floor(abs / 60));
  const mm = pad2(abs % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(
    d.getSeconds()
  )}${sign}${hh}:${mm}`;
};

export const formatLocalTime = (
  v: any,
  opts?: { withSeconds?: boolean }
): string => {
  const withSeconds = opts?.withSeconds ?? true;
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const normalized = normalizeDateStr(raw) ?? raw;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  });
};

export const formatBackendLocalLabel = (
  v: any,
  opts?: { showDate?: boolean; showTime?: boolean }
): string => {
  const showDate = opts?.showDate ?? true;
  const showTime = opts?.showTime ?? true;
  const raw = String(v ?? "").trim();
  if (!raw) return "";

  const normalized = normalizeDateStr(raw) ?? raw;
  // Parse por texto: NO usar Date() para evitar cambios de zona horaria.
  // Acepta: YYYY-MM-DDTHH:mm[:ss][.ms][Z|±HH:MM]
  const m = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!m) return raw;

  const dd = m[3];
  const mm = m[2];
  const hh = m[4];
  const min = m[5];

  if (showDate && showTime) return `${dd}/${mm} ${hh}:${min}`;
  if (showDate) return `${dd}/${mm}`;
  if (showTime) return `${hh}:${min}`;
  return raw;
};

export const normalizeTipo = (
  v: any
): "cliente" | "equipo" | "admin" | "" => {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (["cliente", "alumno", "student"].includes(s)) return "cliente";
  if (["equipo", "coach", "entrenador"].includes(s)) return "equipo";
  if (["admin", "administrador"].includes(s)) return "admin";
  return "";
};
