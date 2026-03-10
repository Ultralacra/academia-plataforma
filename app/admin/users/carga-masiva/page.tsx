"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { Eye, Loader2, UserPlus2 } from "lucide-react";
import {
  assignBonoToAlumno,
  createStudent,
  getAllBonos,
  updateClientTag,
  type Bono,
} from "@/app/admin/alumnos/api";
import { createPaymentPlan } from "@/app/admin/alumnos/[code]/pagos/payments-plan.api";

type Cuota = {
  numero: number;
  monto: number | null;
  fechaPago: string;
  estadoPago: string;
};

type UserDraft = {
  uid: string;
  nombre: string;
  fechaRegistro: string;
  email: string;
  password: string;
  estado: string;
  tags: string[];
  bonos: string[];
  planNombre: string;
  cuotas: Cuota[];
  reservaMonto: number | null;
  reservaEstado: string;
  montoTotal: number | null;
  rawData: Record<string, string>;
};

type ProcessResult = {
  codigo: string;
  nombre: string;
  email: string;
  password: string;
  planCreado: boolean;
};

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRowKeys(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = v;
  }
  return out;
}

function firstValue(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const v = row[alias];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v)
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function generatePasswordLikeQYGEXKHREHIT() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += letters[Math.floor(Math.random() * letters.length)];
  }
  return out;
}

function normalizeText(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDateToIso(raw: string): string | null {
  const v = String(raw || "").trim();
  if (!v) return null;
  if (/^d\/mm\/yyyy$/i.test(v)) return null;

  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
  }

  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${v}T12:00:00.000Z`;

  return null;
}

function parseDateParts(
  raw: string,
): { year: number; month: number; day: number } | null {
  const v = String(raw || "").trim();
  if (!v || /^d\/mm\/yyyy$/i.test(v)) return null;

  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  return null;
}

function compareDateOnly(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function todayDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function computeAutoCuotaStatus(cuota: Cuota): string {
  const base = mapCuotaStatus(cuota.estadoPago);
  if (base === "pagada") return "pagada";

  const date = parseDateParts(cuota.fechaPago);
  if (!date) return "pendiente";

  const cmp = compareDateOnly(date, todayDateParts());
  if (cmp < 0) return "moroso";
  if (cmp === 0) return "en_proceso";
  return "pendiente";
}

function mapStatusLabel(status: string): string {
  if (status === "pagada") return "Pagada";
  if (status === "moroso") return "Moroso";
  if (status === "en_proceso") return "En proceso";
  if (status === "no_aplica") return "No aplica";
  if (status === "listo") return "Listo";
  return "Pendiente";
}

function computeAutoGeneralStatus(cuotas: Cuota[]): string {
  if (cuotas.length === 0) return "pendiente";
  const auto = cuotas.map(computeAutoCuotaStatus);
  if (auto.every((s) => s === "pagada")) return "listo";
  if (auto.some((s) => s === "moroso")) return "moroso";
  if (auto.some((s) => s === "en_proceso")) return "en_proceso";
  return "pendiente";
}

function mapGeneralStatus(raw: string): string {
  const s = normalizeText(raw);
  if (s.includes("listo")) return "listo";
  if (s.includes("en proceso")) return "en_proceso";
  if (s.includes("moros")) return "moroso";
  if (s.includes("reembols")) return "reembolsado";
  if (s.includes("no aplica") || s === "n/a" || s === "na") return "no_aplica";
  return "pendiente";
}

function mapCuotaStatus(raw: string): string {
  const s = normalizeText(raw);
  if (s.includes("pagad")) return "pagada";
  if (s.includes("moros")) return "moroso";
  if (s.includes("en proceso")) return "en_proceso";
  if (s.includes("no aplica") || s === "n/a" || s === "na") return "no_aplica";
  return "pendiente";
}

function isCuotaValidForCreation(c: Cuota): boolean {
  if (c.monto === null || Number(c.monto) <= 0) return false;
  if (!parseDateToIso(c.fechaPago)) return false;
  const raw = normalizeText(c.estadoPago);
  if (raw === "n/a" || raw === "na" || raw.includes("no aplica")) return false;
  return true;
}

function inferTipoPago(
  planNombre: string,
  reservaMonto: number | null,
  cuotas: Cuota[],
) {
  const p = normalizeText(planNombre);
  if ((reservaMonto ?? 0) > 0 || p.includes("reserva")) return "reserva";
  if (cuotas.length <= 1 || p.includes("pago unico") || p.includes("contado"))
    return "contado";
  if (cuotas.length === 2 && p.includes("excepcion"))
    return "excepcion_2_cuotas";
  return "cuotas";
}

function isTraffickerBonoText(value: string): boolean {
  const normalized = normalizeText(value)
    .replace(/\bde\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.includes("trafficker") || normalized.includes("traficker");
}

function resolveBonoCode(rawBono: string, catalog: Bono[]): string | null {
  const q = normalizeText(rawBono);
  if (!q || q === "na" || q === "n/a") return null;

  const exactCode = catalog.find((b) => normalizeText(b.codigo) === q);
  if (exactCode?.codigo) return exactCode.codigo;

  const exactName = catalog.find((b) => normalizeText(b.nombre) === q);
  if (exactName?.codigo) return exactName.codigo;

  const partial = catalog.find((b) => {
    const bn = normalizeText(b.nombre);
    return bn.includes(q) || q.includes(bn);
  });
  if (partial?.codigo) return partial.codigo;

  if (isTraffickerBonoText(rawBono)) {
    const trafficker = catalog.find((b) => {
      const byName = normalizeText(b.nombre);
      const byCode = normalizeText(b.codigo);
      return (
        byName.includes("trafficker") ||
        byName.includes("traficker") ||
        byCode.includes("trafficker")
      );
    });
    if (trafficker?.codigo) return trafficker.codigo;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseCuotasCount(v: unknown): number {
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const normalized = normalizeText(raw);
  if (normalized.includes("pago unico") || normalized.includes("contado")) {
    return 1;
  }
  const numeric = Number(raw.replace(/[^\d]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const match = raw.match(/(\d+)\s*cuot/i);
  if (match) return Number(match[1]) || 0;
  return 0;
}

function isPlaceholderCuota(c: Cuota): boolean {
  const dateRaw = String(c.fechaPago || "")
    .trim()
    .toLowerCase();
  const statusRaw = normalizeText(c.estadoPago || "");
  const dateIsPlaceholder = !dateRaw || dateRaw === "d/mm/yyyy";
  const statusIsPlaceholder =
    !statusRaw ||
    statusRaw === "n/a" ||
    statusRaw === "na" ||
    statusRaw.includes("no aplica");
  return c.monto === null && dateIsPlaceholder && statusIsPlaceholder;
}

function extractPrimaryEmail(v: unknown): string {
  const raw = String(v ?? "");
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  if (!match || match.length === 0) return "";
  return String(match[0]).trim().toLowerCase();
}

function formatTodayDmy(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function splitList(v: unknown) {
  return String(v ?? "")
    .split(/[|,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (!inQuotes && ch === "\r") continue;
    field += ch;
  }

  row.push(field);
  rows.push(row);

  const header = rows.shift() || [];
  return rows
    .filter((r) => r.some((c) => String(c || "").trim().length > 0))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < header.length; i++) {
        obj[header[i] || `col_${i + 1}`] = r[i] ?? "";
      }
      return obj;
    });
}

function cleanCellText(raw: string) {
  return raw
    .replace(/\u200b/g, "")
    .replace(/â€‹/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtmlTableRows(html: string): Record<string, unknown>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return [];

  const normalizedRows = rows
    .map((tr) => {
      const cells = Array.from(tr.querySelectorAll("th, td"));
      const values = cells.map((cell) => cleanCellText(cell.textContent || ""));
      if (values.length > 1 && /^\d+$/.test(values[0])) {
        return values.slice(1);
      }
      return values;
    })
    .filter((cells) => cells.some((c) => c.length > 0));

  const headerRow =
    normalizedRows.find(
      (cells) =>
        cells.some((c) => /nombre\s*y\s*apellidos/i.test(c)) &&
        cells.some((c) => /correo|email|mail/i.test(c)),
    ) || [];

  const rawHeader =
    headerRow.length > 0
      ? headerRow.map((h, i) => h || `col_${i + 1}`)
      : normalizedRows[0].map((_, i) => `col_${i + 1}`);

  const seenHeaderCount = new Map<string, number>();
  const header = rawHeader.map((h, i) => {
    let base = normalizeKey(h);
    if (!base || base === "f") base = i === 0 ? "fecha" : `col_${i + 1}`;

    const nextCount = (seenHeaderCount.get(base) || 0) + 1;
    seenHeaderCount.set(base, nextCount);

    if (nextCount === 1) return base;
    return `${base}_${nextCount}`;
  });

  const startIndex =
    headerRow.length > 0 ? normalizedRows.indexOf(headerRow) + 1 : 1;

  return normalizedRows
    .slice(startIndex)
    .map((cells) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < header.length; i++) {
        obj[header[i]] = cells[i] ?? "";
      }
      return obj;
    })
    .filter((r) => {
      const text = Object.values(r)
        .map((x) => String(x ?? "").trim())
        .join(" ")
        .toLowerCase();
      if (!text) return false;
      if (text.includes("nombre y apellidos") && text.includes("d/mm/yyyy"))
        return false;
      return true;
    })
    .filter((r) => Object.values(r).some((v) => String(v || "").trim() !== ""));
}

function normalizeRawRows(rawRows: Record<string, unknown>[]): UserDraft[] {
  return rawRows
    .map((raw, idx) => {
      const row = normalizeRowKeys(raw);

      const rawData = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, String(v ?? "").trim()]),
      );

      const fechaRegistro = String(
        firstValue(row, ["fecha", "fecha_ingreso", "created_at"]),
      ).trim();

      const nombre = String(
        firstValue(row, [
          "nombre",
          "name",
          "full_name",
          "nombre_completo",
          "nombre_y_apellidos",
        ]),
      ).trim();
      const email = extractPrimaryEmail(
        firstValue(row, ["correo", "email", "mail", "correo_electronico"]),
      );
      const passwordValue = String(
        firstValue(row, ["password", "contrasena", "clave"]),
      ).trim();
      const password = /^[A-Z]{12}$/.test(passwordValue)
        ? passwordValue
        : generatePasswordLikeQYGEXKHREHIT();

      const estado = String(
        firstValue(row, [
          "estado",
          "status",
          "estatus_general",
          "estatus",
          "estado_general",
          "estado_pago",
          "pago",
        ]) || "pendiente",
      ).trim();
      const planNombre = String(
        firstValue(row, [
          "plan",
          "plan_nombre",
          "plan_pago",
          "payment_plan",
          "nro_cuotas",
          "tipo_plan",
        ]) || "Hotselling Foundation",
      ).trim();

      const reservaRaw = firstValue(row, ["reserva", "monto_reserva"]);
      const reservaMonto = toNumber(reservaRaw);
      const reservaEstado =
        String(
          firstValue(row, ["estado_reserva", "reserva_estado"]) || "",
        ).trim() || (reservaMonto !== null ? "Con reserva" : "No aplica");

      const totalCuotas = parseCuotasCount(
        firstValue(row, [
          "cuotas",
          "cantidad_cuotas",
          "numero_cuotas",
          "nro_cuotas",
          "plan",
        ]),
      );
      const montoTotal = toNumber(
        firstValue(row, [
          "monto_total",
          "total",
          "monto_del_contrato",
          "monto_contrato",
          "valor_contrato",
          "total_a_pagar",
          "importe_total",
          "pago_total",
          "monto_a_pagar",
          "monto_pagado",
          "total_usd",
          "valor_curso",
          "monto",
        ]),
      );
      const montoCuotaDirecto = toNumber(
        firstValue(row, [
          "monto_cuota",
          "cuota_monto",
          "valor_cuota",
          "cobro_cuota_1",
        ]),
      );
      const isSinglePaymentPlan = (() => {
        const p = normalizeText(planNombre);
        return p.includes("pago unico") || p.includes("contado");
      })();

      const cuotasByColumnsMap = new Map<number, Cuota>();
      let maxCuotaIndexFromAmounts = 0;
      for (const [k, v] of Object.entries(row)) {
        const amountMatch =
          k.match(/^(?:monto_)?(?:cobro_)?cuota_?(\d+)$/) ||
          k.match(/^cuota_?(\d+)_?(?:monto|valor)$/);
        if (amountMatch) {
          const n = Number(amountMatch[1]);
          if (n > maxCuotaIndexFromAmounts) maxCuotaIndexFromAmounts = n;
          const current = cuotasByColumnsMap.get(n) || {
            numero: n,
            monto: null,
            fechaPago: "",
            estadoPago: "",
          };
          current.monto = toNumber(v);
          cuotasByColumnsMap.set(n, current);
          continue;
        }

        const fechaMatch =
          k.match(/^fecha_?(?:cobro_?)?cuota_?(\d+)$/) ||
          k.match(/^cuota_?(\d+)_?fecha/) ||
          k.match(/^vencimiento_?cuota_?(\d+)$/) ||
          k.match(/^fecha_de_cobro(?:_(\d+))?$/);
        if (fechaMatch) {
          const n = Number(fechaMatch[1] || 1);
          const current = cuotasByColumnsMap.get(n) || {
            numero: n,
            monto: null,
            fechaPago: "",
            estadoPago: "",
          };
          current.fechaPago = String(v ?? "").trim();
          cuotasByColumnsMap.set(n, current);
          continue;
        }

        const estadoMatch =
          k.match(/^(?:estado|pago)_?(?:cuota_?)?(\d+)$/) ||
          k.match(/^cuota_?(\d+)_?(?:estado|pago)$/) ||
          k.match(/^estatus(?:_(\d+))?$/);
        if (estadoMatch) {
          const n = Number(estadoMatch[1] || 1);
          const current = cuotasByColumnsMap.get(n) || {
            numero: n,
            monto: null,
            fechaPago: "",
            estadoPago: "",
          };
          current.estadoPago = String(v ?? "").trim();
          cuotasByColumnsMap.set(n, current);
        }
      }

      const maxExpectedCuotas = Math.max(totalCuotas, maxCuotaIndexFromAmounts);
      const cuotasByColumns = Array.from(cuotasByColumnsMap.values()).filter(
        (c) => {
          const hasAnyData = c.monto !== null || c.fechaPago || c.estadoPago;
          if (!hasAnyData) return false;
          if (maxExpectedCuotas > 0 && c.numero > maxExpectedCuotas)
            return false;
          if (isPlaceholderCuota(c)) return false;
          return true;
        },
      );
      cuotasByColumns.sort((a, b) => a.numero - b.numero);

      let cuotas: Cuota[] = cuotasByColumns;
      if (cuotas.length === 0 && totalCuotas > 0) {
        const fallback =
          montoCuotaDirecto ?? (montoTotal ? montoTotal / totalCuotas : null);
        cuotas = Array.from({ length: totalCuotas }, (_, i) => ({
          numero: i + 1,
          monto: fallback,
          fechaPago: "",
          estadoPago: "",
        }));
      }

      if (isSinglePaymentPlan) {
        const firstExisting = cuotas[0];
        const fallbackFromCuotas =
          cuotas.map((c) => c.monto).find((m) => m !== null && Number(m) > 0) ??
          null;
        const montoSingle =
          montoTotal ??
          montoCuotaDirecto ??
          firstExisting?.monto ??
          fallbackFromCuotas;
        const fechaSingle =
          firstExisting?.fechaPago &&
          !/^d\/mm\/yyyy$/i.test(String(firstExisting.fechaPago).trim())
            ? firstExisting.fechaPago
            : formatTodayDmy();
        const estadoSingle =
          normalizeText(firstExisting?.estadoPago || "") === "n/a" ||
          normalizeText(firstExisting?.estadoPago || "") === "na" ||
          normalizeText(firstExisting?.estadoPago || "").includes("no aplica")
            ? "pendiente"
            : firstExisting?.estadoPago || "pendiente";

        cuotas = [
          {
            numero: 1,
            monto: montoSingle,
            fechaPago: fechaSingle,
            estadoPago: estadoSingle,
          },
        ];
      }

      const tags = ["Hotselling Foundation"];

      const bonos = splitList(
        firstValue(row, ["bonos", "bono", "bonificaciones"]),
      ).filter((b) => !/^na$/i.test(b));

      return {
        uid: `row-${idx + 1}`,
        nombre,
        fechaRegistro,
        email,
        password,
        estado,
        tags,
        bonos,
        planNombre,
        cuotas,
        reservaMonto,
        reservaEstado,
        montoTotal,
        rawData,
      } satisfies UserDraft;
    })
    .filter((u) => u.nombre || u.email)
    .filter((u) => u.email.includes("@"));
}

function BulkUsersContent() {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserDraft[]>([]);
  const [openSim, setOpenSim] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [runningUserId, setRunningUserId] = useState<string | null>(null);
  const [doneByUserId, setDoneByUserId] = useState<Record<string, boolean>>({});
  const [planUser, setPlanUser] = useState<UserDraft | null>(null);
  const [activeUserOnlyId, setActiveUserOnlyId] = useState<string | null>(null);
  const [bonosCatalog, setBonosCatalog] = useState<Bono[]>([]);

  const totalCuotas = useMemo(
    () => users.reduce((acc, u) => acc + u.cuotas.length, 0),
    [users],
  );

  const totalBonos = useMemo(
    () => users.reduce((acc, u) => acc + u.bonos.length, 0),
    [users],
  );

  const parseFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let rows: Record<string, unknown>[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const buff = await file.arrayBuffer();
        const wb = XLSX.read(buff, { type: "array" });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        rows = (
          XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<
            string,
            unknown
          >[]
        ).map((r) => ({ ...r }));
      } else {
        const text = await file.text();
        rows = parseCsv(text);
      }

      const parsedUsers = normalizeRawRows(rows);
      setUsers(parsedUsers);
      setFileName(file.name);

      if (parsedUsers.length === 0) {
        setError(
          "No se detectaron usuarios válidos. Revisa columnas como nombre, correo/email, plan, cuotas, bonos y tags.",
        );
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo leer el archivo.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const importFromCobrosHtml = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/Cobros%20HF.html", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`No se pudo leer Cobros HF.html (HTTP ${res.status})`);
      }

      const html = await res.text();
      const tableRows = parseHtmlTableRows(html);
      const parsedUsers = normalizeRawRows(tableRows);

      setUsers(parsedUsers);
      setFileName("Cobros HF.html (auto)");

      if (parsedUsers.length === 0) {
        setError(
          "No se pudieron mapear usuarios desde Cobros HF.html. Si quieres, ajusto el mapeo a la estructura exacta de tu tabla.",
        );
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo importar desde Cobros HF.html");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void importFromCobrosHtml();
  }, []);

  const appendLog = (line: string) => {
    setSimLogs((prev) => [...prev, line]);
  };

  const ensureBonosCatalog = async () => {
    if (bonosCatalog.length > 0) return bonosCatalog;
    const all = await getAllBonos({
      page: 1,
      pageSize: 500,
      includeInactivos: false,
    });
    setBonosCatalog(all);
    return all;
  };

  const runUserCreationProcess = async (
    user: UserDraft,
    index: number,
    total: number,
  ): Promise<ProcessResult> => {
    const head = `[${index + 1}/${total}] ${user.email || user.nombre || user.uid}`;
    const validCuotas = user.cuotas.filter(isCuotaValidForCreation);
    const tipoPago = inferTipoPago(
      user.planNombre,
      user.reservaMonto,
      validCuotas,
    );
    const autoGeneralStatus = computeAutoGeneralStatus(validCuotas);

    appendLog(`• ${head} · Preparando creación`);
    const created = await createStudent({
      name: user.nombre,
      email: user.email,
      password: user.password,
    });
    const alumnoCodigo = String(created.codigo || created.id || "").trim();
    if (!alumnoCodigo) {
      throw new Error("No se obtuvo código/id del alumno creado");
    }
    appendLog(`✅ ${head} · Usuario creado (${alumnoCodigo})`);
    await sleep(180);

    await updateClientTag(alumnoCodigo, "Hotselling Foundation");
    appendLog(`✅ ${head} · Tag asignado (endpoint cliente)`);
    await sleep(160);

    appendLog(`• ${head} · Estado general calculado: ${autoGeneralStatus}`);

    if (user.bonos.length > 0) {
      const catalog = await ensureBonosCatalog();
      const assignedBonusCodes = new Set<string>();
      for (const bonoRaw of user.bonos) {
        const bonoCode = resolveBonoCode(bonoRaw, catalog);
        if (!bonoCode) {
          appendLog(`• ${head} · Bono omitido (no encontrado): ${bonoRaw}`);
          continue;
        }
        if (assignedBonusCodes.has(bonoCode)) {
          appendLog(
            `• ${head} · Bono omitido (duplicado): ${bonoRaw} -> ${bonoCode}`,
          );
          continue;
        }
        await assignBonoToAlumno({
          bono_codigo: bonoCode,
          alumno_codigo: alumnoCodigo,
          cantidad: 1,
          fecha_vencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          notas: "Asignación automática carga masiva HF",
        });
        assignedBonusCodes.add(bonoCode);
        appendLog(`✅ ${head} · Bono asignado (${bonoCode})`);
        await sleep(140);
      }
    } else {
      appendLog(`• ${head} · Sin bonos para asignar`);
    }

    const details = validCuotas
      .map((c) => {
        const fechaIso = parseDateToIso(c.fechaPago);
        if (!fechaIso || c.monto === null) return null;
        return {
          monto: Number(c.monto),
          moneda: "USD",
          cuota_codigo: `CUOTA_${String(c.numero).padStart(3, "0")}`,
          estatus: computeAutoCuotaStatus(c),
          fecha_pago: fechaIso,
          metodo: "transfer",
          referencia: "",
          concepto: `Cuota ${c.numero}`,
          notas: "Creación automática carga masiva HF",
        };
      })
      .filter(Boolean) as Array<{
      monto: number;
      moneda: string;
      cuota_codigo: string;
      estatus: string;
      fecha_pago: string;
      metodo: string;
      referencia: string;
      concepto: string;
      notas: string;
    }>;

    if (details.length === 0) {
      appendLog(`• ${head} · Plan omitido: sin cuotas válidas`);
      appendLog(`• ${head} · Proceso finalizado sin plan de pagos`);
      return {
        codigo: alumnoCodigo,
        nombre: user.nombre,
        email: user.email,
        password: user.password,
        planCreado: false,
      };
    }

    await createPaymentPlan({
      cliente_codigo: alumnoCodigo,
      monto:
        user.montoTotal ??
        details.reduce((sum, d) => sum + Number(d.monto || 0), 0),
      moneda: "USD",
      monto_reserva: user.reservaMonto ?? undefined,
      nro_cuotas: details.length,
      estatus: autoGeneralStatus,
      fecha_pago: details[0]?.fecha_pago || new Date().toISOString(),
      metodo: "transfer",
      tipo_pago: tipoPago,
      referencia: "",
      concepto: `Plan ${user.planNombre || "Hotselling Foundation"}`,
      notas: "Generado por carga masiva de usuarios",
      details,
    });
    appendLog(`✅ ${head} · Plan de pagos creado (${details.length} cuotas)`);
    await sleep(140);
    appendLog(`• ${head} · Proceso finalizado`);

    return {
      codigo: alumnoCodigo,
      nombre: user.nombre,
      email: user.email,
      password: user.password,
      planCreado: true,
    };
  };

  const runOneUser = async (user: UserDraft, index: number) => {
    setActiveUserOnlyId(user.uid);
    setOpenSim(true);
    setOpenConfirm(false);
    setSimLogs([]);
    setRunningUserId(user.uid);
    try {
      const result = await runUserCreationProcess(user, index, users.length);
      setDoneByUserId((prev) => ({ ...prev, [user.uid]: true }));
      appendLog(
        `✅ REGISTRO EXITOSO · ${result.email} · contraseña: ${result.password}`,
      );
      toast({
        title: "Proceso completado",
        description: `${user.nombre || user.email} creado y configurado correctamente.`,
      });
    } catch (e: any) {
      appendLog(
        `❌ [${index + 1}/${users.length}] ${user.email || user.nombre || user.uid} · Error: ${
          e?.message || "fallo inesperado"
        }`,
      );
      toast({
        title: "Error en proceso",
        description: e?.message || "No se pudo completar el proceso",
        variant: "destructive",
      });
    } finally {
      setRunningUserId(null);
    }
  };

  const runSimulation = async () => {
    setSimRunning(true);
    setSimLogs([]);
    setRunningUserId("__bulk__");
    const targetUsers = modalUsers;
    const successResults: ProcessResult[] = [];

    try {
      for (let i = 0; i < targetUsers.length; i++) {
        const user = targetUsers[i];
        const originalIndex = users.findIndex((u) => u.uid === user.uid);
        const idx = originalIndex >= 0 ? originalIndex : i;
        try {
          const result = await runUserCreationProcess(
            user,
            idx,
            targetUsers.length,
          );
          setDoneByUserId((prev) => ({ ...prev, [user.uid]: true }));
          successResults.push(result);
        } catch (e: any) {
          appendLog(
            `❌ [${i + 1}/${targetUsers.length}] ${user.email || user.nombre || user.uid} · Error: ${
              e?.message || "fallo inesperado"
            }`,
          );
        }
      }

      setOpenConfirm(false);
      if (successResults.length > 0) {
        appendLog("• Resumen final de registros exitosos:");
        for (const r of successResults) {
          appendLog(
            `✅ REGISTRO EXITOSO · ${r.email} · contraseña: ${r.password} · código: ${r.codigo}`,
          );
        }
      }
      toast({
        title: "Proceso completado",
        description: `Se procesaron ${targetUsers.length} usuarios en orden.`,
      });
    } finally {
      setSimRunning(false);
      setRunningUserId(null);
    }
  };

  const modalUsers = useMemo(() => {
    if (!activeUserOnlyId) return users;
    const selected = users.find((u) => u.uid === activeUserOnlyId);
    return selected ? [selected] : [];
  }, [activeUserOnlyId, users]);

  const summaryLines = useMemo(
    () => simLogs.filter((line) => line.includes("✅ REGISTRO EXITOSO")),
    [simLogs],
  );

  const copySummary = async () => {
    if (summaryLines.length === 0) {
      toast({
        title: "Sin resumen para copiar",
        description:
          "Ejecuta primero el proceso para generar registros exitosos.",
      });
      return;
    }

    const text = summaryLines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Resumen copiado",
        description: "Se copió el bloque de credenciales al portapapeles.",
      });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador bloqueó el portapapeles. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Carga masiva de usuarios HF</h1>
        <p className="text-sm text-muted-foreground">
          Proceso real secuencial: creación de usuario, tag, bonos y plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documento de nuevos usuarios</CardTitle>
          <CardDescription>
            Carga un archivo CSV o Excel con columnas de usuario, plan de pagos,
            cuotas, bonos y tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="max-w-md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void parseFile(file);
              }}
            />
            <Button
              variant="outline"
              onClick={() => void importFromCobrosHtml()}
              disabled={loading}
            >
              Importar desde Cobros HF.html
            </Button>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </div>

          {fileName ? (
            <div className="text-xs text-muted-foreground">
              Archivo: {fileName}
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Usuarios: {users.length}</Badge>
            <Badge variant="secondary">Cuotas: {totalCuotas}</Badge>
            <Badge variant="secondary">Bonos: {totalBonos}</Badge>
          </div>

          <Dialog
            open={openSim}
            onOpenChange={(v) => {
              setOpenSim(v);
              if (!v) {
                setOpenConfirm(false);
                setSimLogs([]);
                setActiveUserOnlyId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                disabled={users.length === 0}
                className="gap-2"
                onClick={() => {
                  setActiveUserOnlyId(null);
                  setOpenConfirm(false);
                  setSimLogs([]);
                }}
              >
                <UserPlus2 className="h-4 w-4" /> Crear usuarios (proceso real)
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Confirmación de proceso</DialogTitle>
                <DialogDescription>
                  Se ejecutará por usuario, en orden: creación, tag, bonos y
                  plan de pagos (solo cuotas válidas).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 overflow-y-auto pr-1">
                {modalUsers.map((u) => (
                  <div key={u.uid} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">
                      {u.nombre || "(sin nombre)"}
                    </div>
                    <div className="text-muted-foreground">
                      {u.email || "(sin email)"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">Estado: {u.estado}</Badge>
                      <Badge variant="outline">Plan: {u.planNombre}</Badge>
                      <Badge variant="outline">Cuotas: {u.cuotas.length}</Badge>
                      <Badge variant="outline">Tags: {u.tags.length}</Badge>
                      <Badge variant="outline">Bonos: {u.bonos.length}</Badge>
                    </div>
                  </div>
                ))}

                {simLogs.length > 0 ? (
                  <div className="rounded-md border p-3 bg-muted/20">
                    <div className="font-medium text-sm mb-2">
                      Bitácora del proceso
                    </div>
                    <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                      {simLogs.map((line, i) => (
                        <div
                          key={`${line}-${i}`}
                          className={
                            line.includes("✅")
                              ? "text-green-600"
                              : line.includes("❌")
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenSim(false)}
                  disabled={simRunning}
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void copySummary()}
                  disabled={simRunning || summaryLines.length === 0}
                >
                  Copiar resumen
                </Button>
                <Button
                  onClick={() => setOpenConfirm(true)}
                  disabled={simRunning || modalUsers.length === 0}
                >
                  {simRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Iniciar proceso
                </Button>
              </DialogFooter>

              <AlertDialog
                open={openConfirm}
                onOpenChange={(v) => setOpenConfirm(v)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Ejecutar proceso real?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se procesarán {modalUsers.length} usuarios con endpoints
                      reales en orden secuencial.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={simRunning}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={simRunning || modalUsers.length === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        void runSimulation();
                      }}
                    >
                      Confirmar proceso
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista previa de usuarios</CardTitle>
          <CardDescription>
            Resultado normalizado antes de crear usuarios reales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cuotas</TableHead>
                  <TableHead>Bonos</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-sm text-muted-foreground"
                    >
                      Sin usuarios cargados.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u, idx) => (
                    <TableRow key={u.uid} className="odd:bg-muted/10">
                      <TableCell>{u.nombre || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>{u.estado || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{u.planNombre || "—"}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setPlanUser(u)}
                            title="Ver detalle del plan"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{u.cuotas.length}</TableCell>
                      <TableCell>{u.bonos.join(", ") || "—"}</TableCell>
                      <TableCell>{u.tags.join(", ") || "—"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={doneByUserId[u.uid] ? "outline" : "default"}
                          disabled={
                            Boolean(runningUserId) && runningUserId !== u.uid
                          }
                          onClick={() => void runOneUser(u, idx)}
                        >
                          {runningUserId === u.uid ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {doneByUserId[u.uid] ? "Creado" : "Crear y generar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(planUser)}
        onOpenChange={(open) => {
          if (!open) setPlanUser(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalle de plan de pagos</DialogTitle>
            <DialogDescription>
              {planUser?.nombre || "—"} · {planUser?.email || "—"}
            </DialogDescription>
          </DialogHeader>

          {planUser ? (
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Fecha registro</div>
                  <div>{planUser.fechaRegistro || "—"}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Estado general</div>
                  <div>{planUser.estado || "—"}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Plan</div>
                  <div>{planUser.planNombre || "—"}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Monto total</div>
                  <div>{planUser.montoTotal ?? "—"}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Reserva</div>
                  <div>{planUser.reservaMonto ?? "—"}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Estado reserva</div>
                  <div>{planUser.reservaEstado || "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Cuotas</div>
                <div className="overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha pago</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planUser.cuotas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-sm text-muted-foreground"
                          >
                            Sin cuotas detectadas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        planUser.cuotas.map((c) => (
                          <TableRow key={`${planUser.uid}-cuota-${c.numero}`}>
                            <TableCell>{c.numero}</TableCell>
                            <TableCell>{c.monto ?? "—"}</TableCell>
                            <TableCell>{c.fechaPago || "—"}</TableCell>
                            <TableCell>
                              {mapStatusLabel(computeAutoCuotaStatus(c))}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">
                  Todas las columnas del documento
                </div>
                <div className="overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Columna</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(planUser.rawData).map(([key, value]) => (
                        <TableRow key={`${planUser.uid}-${key}`}>
                          <TableCell className="font-mono text-xs">
                            {key}
                          </TableCell>
                          <TableCell>{value || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanUser(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Columnas sugeridas</CardTitle>
          <CardDescription>
            Usa estos nombres para mejorar el mapeo automático.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          nombre, email, password, estado, plan, cuotas, monto_total,
          monto_cuota, cuota_1, cuota_2, bonos, tags
        </CardContent>
      </Card>
    </div>
  );
}

export default function CargaMasivaUsersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="p-4 text-sm text-muted-foreground">
          Esta función fue deshabilitada. Redirigiendo...
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
