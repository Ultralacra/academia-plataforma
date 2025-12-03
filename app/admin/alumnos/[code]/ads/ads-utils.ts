export function toNum(v?: string | number | null) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}
export function fmtNum(n?: string | number | null, digits?: number) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: typeof digits === "number" ? digits : 0,
  }).format(v);
}
export function fmtMoney(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
export function fmtPct(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  const pct = v <= 5 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

export function toPercentNoSymbol(x?: string | number | null): string {
  const v = toNum(x);
  if (v == null) return "";
  // Heurística: si es <= 5, asumimos que es un ratio (ej. 1.5 = 150%).
  const pct = v <= 5 ? v * 100 : v;
  const s = pct.toFixed(1);
  return /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
}
export function toPercentNoSymbolNoScale(x?: string | number | null): string {
  const v = toNum(x);
  if (v == null) return "";
  const s = Number(v).toFixed(2);
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
export function sanitizePercentInput(s: string): string {
  try {
    const t = s.replace(/%/g, "").trim();
    const norm = t.replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
    const parts = norm.split(".");
    if (parts.length <= 2) return norm;
    return parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
  } catch {
    return s;
  }
}

export function toNumOrNull(s?: string): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function fmtPercentNoScale(n?: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const s = v.toFixed(2);
  return `${s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
}
export function pctOf(
  part?: string | number | null,
  total?: string | number | null
): string {
  const p = toNum(part as any);
  const t = toNum(total as any);
  if (p == null || !t || t <= 0) return "—";
  return fmtPercentNoScale((p / t) * 100);
}
