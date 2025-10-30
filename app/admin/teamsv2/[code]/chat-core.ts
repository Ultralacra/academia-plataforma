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
