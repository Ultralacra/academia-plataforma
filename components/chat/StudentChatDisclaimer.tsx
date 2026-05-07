"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import {
  AlertTriangle,
  Calendar,
  Crown,
  KeyRound,
  Loader2,
  Tag,
  User,
} from "lucide-react";

// ─── tipos ────────────────────────────────────────────────────────────────────

type VenceMeta = {
  vence_estimado?: string | null;
  vence_tipo?: string | null;
  programa_meses?: number | null;
  meses_extra?: number | null;
  /** Extensiones por rango explícito (array del payload) */
  extensiones?: Array<{
    fecha_hasta?: string | null;
    paused_calendar_days_at_creation?: number | null;
  }> | null;
};

type MembresiaMeta = {
  meses?: number | null;
  anulado?: boolean;
  fecha_hasta?: string | null;
  paused_calendar_days_at_creation?: number | null;
};

type StudentInfo = {
  name?: string | null;
  state?: string | null;
  stage?: string | null;
  tag?: string | null;
  joinDate?: string | null;
  inactivityDays?: number | null;
  lastActivity?: string | null;
};

type DisclaimerData = {
  venceMeta: VenceMeta | null;
  membresiaExts: MembresiaMeta[];
  studentInfo: StudentInfo | null;
  /** joinDate devuelto por la API (más fiable que el del padre) */
  apiJoinDate: string | null;
  /** Días de pausa totales (mismos que el perfil del alumno). */
  pausedCalendarDaysTotal: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseDateOnly(raw?: string | null): Date | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function toDayDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Suma N meses calendario a una fecha (idéntico al perfil del alumno).
function addMonthsCalendar(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDayOfTarget = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  d.setDate(Math.min(targetDay, lastDayOfTarget));
  return d;
}

function diffDays(a: Date, b: Date) {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Replica EXACTAMENTE la lógica del perfil del alumno
 * (`/admin/alumnos/[code]/perfil`) y de `/admin/accesos`:
 * - programa en meses CALENDARIO (default 4)
 * - suma de pausas TOTAL (días calendario, exclusive end)
 * - extensiones y membresías con `paused_calendar_days_at_creation`
 *   para no doblar el conteo de pausas
 */
function computeEstimatedEnd(
  venceMeta: VenceMeta | null,
  membresiaExts: MembresiaMeta[],
  joinDate: string | null | undefined,
  pausedCalendarDaysTotal: number,
): Date | null {
  const startDay = parseDateOnly(joinDate ?? null);

  const programaMesesRaw = venceMeta?.programa_meses;
  const programaMesesParsed = Number(programaMesesRaw);
  const programaMeses =
    Number.isFinite(programaMesesParsed) && programaMesesParsed >= 1
      ? Math.round(programaMesesParsed)
      : 4;

  const metaExtraRaw = venceMeta?.meses_extra;
  const metaExtraParsed =
    metaExtraRaw === undefined || metaExtraRaw === null
      ? null
      : Number(metaExtraRaw);
  const extraMonths =
    metaExtraParsed !== null && Number.isFinite(metaExtraParsed)
      ? Math.max(0, Math.round(metaExtraParsed))
      : 0;

  const metaVenceDay = parseDateOnly(venceMeta?.vence_estimado ?? null);
  const isLegacy = Boolean(metaVenceDay) && metaExtraParsed === null;

  // Candidato base
  let baseCandidate: Date | null = null;
  if (startDay) {
    const programEndCalendar = addMonthsCalendar(
      toDayDate(startDay),
      programaMeses,
    );
    const baseEnd = addDays(programEndCalendar, pausedCalendarDaysTotal);
    if (isLegacy && metaVenceDay) {
      baseCandidate = addDays(toDayDate(metaVenceDay), pausedCalendarDaysTotal);
    } else {
      baseCandidate = addDays(baseEnd, extraMonths * 30);
    }
  } else if (metaVenceDay) {
    // Fallback sin joinDate
    baseCandidate = addDays(toDayDate(metaVenceDay), pausedCalendarDaysTotal);
  }

  // Candidato 2: extensiones por rango explícito (con snapshot de pausas)
  let rangeEndCandidate: Date | null = null;
  for (const ext of venceMeta?.extensiones ?? []) {
    const d = parseDateOnly(ext?.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    const snapRaw = Number(ext?.paused_calendar_days_at_creation);
    const snap = Number.isFinite(snapRaw) ? snapRaw : null;
    const pauseDelta =
      snap !== null ? Math.max(0, pausedCalendarDaysTotal - snap) : 0;
    const effectiveEnd = pauseDelta > 0 ? addDays(day, pauseDelta) : day;
    if (
      !rangeEndCandidate ||
      effectiveEnd.getTime() > rangeEndCandidate.getTime()
    ) {
      rangeEndCandidate = effectiveEnd;
    }
  }

  // Candidato 3: membresías con fecha_hasta absoluta (con snapshot)
  let membershipEndCandidate: Date | null = null;
  for (const m of membresiaExts) {
    if (m.anulado) continue;
    const d = parseDateOnly(m.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    const snapRaw = Number(m?.paused_calendar_days_at_creation);
    const snap = Number.isFinite(snapRaw) ? snapRaw : null;
    const pauseDelta =
      snap !== null ? Math.max(0, pausedCalendarDaysTotal - snap) : 0;
    const effectiveEnd = pauseDelta > 0 ? addDays(day, pauseDelta) : day;
    if (
      !membershipEndCandidate ||
      effectiveEnd.getTime() > membershipEndCandidate.getTime()
    ) {
      membershipEndCandidate = effectiveEnd;
    }
  }

  const candidates = [
    baseCandidate,
    rangeEndCandidate,
    membershipEndCandidate,
  ].filter(Boolean) as Date[];

  if (candidates.length === 0) return null;

  return candidates.reduce(
    (acc, cur) => (cur.getTime() > acc.getTime() ? cur : acc),
    candidates[0],
  );
}

function countActiveMembresias(exts: MembresiaMeta[]) {
  // Igual que en /admin/accesos: contar todos los no-anulados sin importar meses
  return exts.filter((m) => !m.anulado).length;
}

// ─── colores urgencia ──────────────────────────────────────────────────────────

function urgencyClasses(daysLeft: number | null): {
  border: string;
  bg: string;
  text: string;
  badge: string;
} {
  if (daysLeft === null)
    return {
      border: "border-slate-200",
      bg: "bg-slate-50/80",
      text: "text-slate-600",
      badge: "bg-slate-100 text-slate-600",
    };
  if (daysLeft < 0)
    return {
      border: "border-red-300",
      bg: "bg-red-50/80",
      text: "text-red-600",
      badge: "bg-red-100 text-red-700",
    };
  if (daysLeft <= 7)
    return {
      border: "border-orange-300",
      bg: "bg-orange-50/80",
      text: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
    };
  if (daysLeft <= 15)
    return {
      border: "border-yellow-300",
      bg: "bg-yellow-50/80",
      text: "text-yellow-700",
      badge: "bg-yellow-100 text-yellow-700",
    };
  return {
    border: "border-emerald-200",
    bg: "bg-emerald-50/80",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  };
}

function formatDaysLabel(daysLeft: number) {
  if (daysLeft < 0)
    return `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  return `Vence en ${daysLeft} días`;
}

// ─── componente principal ──────────────────────────────────────────────────────

interface Props {
  /** ID numérico/string del alumno. Si es null, no carga nada. */
  alumnoId: string | number | null | undefined;
  /** Código del alumno (para que la API pueda buscar joinDate en paralelo) */
  alumnoCode?: string | null;
  /** Info básica del alumno (nombre, estado, fase, tag, inactividad) */
  studentInfo?: StudentInfo | null;
}

export default function StudentChatDisclaimer({
  alumnoId,
  alumnoCode,
  studentInfo,
}: Props) {
  const [data, setData] = useState<DisclaimerData | null>(null);
  const [loading, setLoading] = useState(false);
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = alumnoId != null ? String(alumnoId).trim() : "";
    if (!id || id === prevIdRef.current) return;
    prevIdRef.current = id;
    setData(null);
    setLoading(true);

    (async () => {
      try {
        const token = getAuthToken();
        const codeParam = alumnoCode
          ? `&alumnoCode=${encodeURIComponent(alumnoCode)}`
          : "";
        const res = await fetch(
          `/api/alumnos/${encodeURIComponent(id)}/metadata/vence?${codeParam}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
          },
        );
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (!json) return;
        const rawPayload = json.venceMeta?.payload ?? null;
        const venceMeta: VenceMeta | null = rawPayload
          ? {
              vence_estimado: rawPayload.vence_estimado ?? null,
              vence_tipo: rawPayload.vence_tipo ?? null,
              programa_meses: rawPayload.programa_meses ?? null,
              meses_extra: rawPayload.meses_extra ?? null,
              extensiones: Array.isArray(rawPayload.extensiones)
                ? rawPayload.extensiones.map((e: any) => ({
                    fecha_hasta: e?.fecha_hasta ?? null,
                    paused_calendar_days_at_creation:
                      e?.paused_calendar_days_at_creation ?? null,
                  }))
                : [],
            }
          : null;

        const membresiaExts: MembresiaMeta[] = Array.isArray(json.membresiaExts)
          ? json.membresiaExts.map((m: any) => {
              const p = m.payload ?? m;
              return {
                meses: p.meses ?? p.meses_extra ?? null,
                anulado: Boolean(p.anulado),
                fecha_hasta: p.fecha_hasta ?? null,
                paused_calendar_days_at_creation:
                  p.paused_calendar_days_at_creation ?? null,
              };
            })
          : [];

        const apiJoinDate =
          typeof json.joinDate === "string" && json.joinDate.trim()
            ? json.joinDate.trim()
            : null;

        const pausedRaw = Number(json.pausedCalendarDaysTotal);
        const pausedCalendarDaysTotal =
          Number.isFinite(pausedRaw) && pausedRaw > 0
            ? Math.round(pausedRaw)
            : 0;

        setData({
          venceMeta,
          membresiaExts,
          studentInfo: studentInfo ?? null,
          apiJoinDate,
          pausedCalendarDaysTotal,
        });
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    })();
    // studentInfo se toma sólo en el primer load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId, alumnoCode]);

  // Actualizar studentInfo si cambia sin cambiar alumnoId
  useEffect(() => {
    if (!studentInfo) return;
    setData((prev) => (prev ? { ...prev, studentInfo } : prev));
  }, [studentInfo]);

  if (!alumnoId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando info del alumno…
      </div>
    );
  }

  if (!data) return null;

  const { venceMeta, membresiaExts } = data;
  const info = data.studentInfo ?? studentInfo ?? null;
  const resolvedJoinDate = data.apiJoinDate ?? info?.joinDate ?? null;

  // Calcular fecha igual que el perfil del alumno (con pausas y snapshots).
  const venceDate = computeEstimatedEnd(
    venceMeta,
    membresiaExts,
    resolvedJoinDate,
    data.pausedCalendarDaysTotal,
  );
  const today = toDayDate(new Date());
  const daysLeft = venceDate ? diffDays(today, venceDate) : null;
  const membresiaCount = countActiveMembresias(membresiaExts);
  const hasMembresia = membresiaCount > 0;

  const clr = urgencyClasses(daysLeft);

  return (
    <div
      className={`border-b ${clr.border} ${clr.bg} px-4 py-2.5 text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5`}
    >
      {/* Estado + fase */}
      {(info?.state || info?.stage) && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3 text-slate-400 shrink-0" />
          {[info.state, info.stage].filter(Boolean).join(" · ")}
        </span>
      )}

      {/* Tag */}
      {info?.tag && (
        <span className="flex items-center gap-1">
          <Tag className="h-3 w-3 text-slate-400 shrink-0" />
          <span className={`rounded px-1.5 py-0.5 font-medium ${clr.badge}`}>
            {info.tag}
          </span>
        </span>
      )}

      {/* Programa */}
      {venceMeta?.programa_meses != null && (
        <span className="flex items-center gap-1 text-slate-600">
          <KeyRound className="h-3 w-3 text-slate-400 shrink-0" />
          Programa {venceMeta.programa_meses} mes
          {venceMeta.programa_meses !== 1 ? "es" : ""}
          {(venceMeta.meses_extra ?? 0) > 0
            ? ` +${venceMeta.meses_extra} ext.`
            : ""}
        </span>
      )}

      {/* Tipo de vencimiento */}
      {venceMeta?.vence_tipo && (
        <span className="flex items-center gap-1 text-slate-600 capitalize">
          <KeyRound className="h-3 w-3 text-slate-400 shrink-0" />
          {venceMeta.vence_tipo}
        </span>
      )}

      {/* Membresía */}
      {hasMembresia && (
        <span className="flex items-center gap-1 font-medium text-indigo-700">
          <Crown className="h-3 w-3 shrink-0" />
          Membresía ({membresiaCount})
        </span>
      )}

      {/* Fecha de vence + días */}
      {venceDate ? (
        <span className={`flex items-center gap-1 font-semibold ${clr.text}`}>
          <Calendar className="h-3 w-3 shrink-0" />
          {fmtDate(venceDate)}
          {daysLeft !== null && (
            <span className={`ml-1 rounded px-1.5 py-0.5 ${clr.badge}`}>
              {formatDaysLabel(daysLeft)}
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-slate-400">
          <Calendar className="h-3 w-3 shrink-0" />
          Sin fecha de vencimiento
        </span>
      )}

      {/* Inactividad */}
      {info?.inactivityDays != null && info.inactivityDays > 0 && (
        <span
          className={`flex items-center gap-1 font-medium ${
            info.inactivityDays >= 14
              ? "text-red-500"
              : info.inactivityDays >= 7
                ? "text-amber-500"
                : "text-slate-500"
          }`}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {info.inactivityDays === 1
            ? "1 día inactivo"
            : `${info.inactivityDays} días inactivo`}
        </span>
      )}
    </div>
  );
}
