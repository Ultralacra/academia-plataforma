// utils/students-utils.ts
export function uniq(arr: (string | null | undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[]));
}
export function toDateKey(yyyyMmDd: string | null | undefined) {
  return yyyyMmDd || "—";
}

const dtDateTime = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dtDateOnly = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const cleanMonthDots = (s: string) => s.replaceAll(".", "");

export function formatDateSmart(value?: string | null) {
  if (!value) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return cleanMonthDots(dtDateTime.format(d));
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return cleanMonthDots(dtDateOnly.format(d));
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return cleanMonthDots(dtDateTime.format(d));
  return value;
}
