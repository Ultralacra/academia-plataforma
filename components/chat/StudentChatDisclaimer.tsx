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
  extensiones?: Array<{ fecha_hasta?: string | null }> | null;
};

type MembresiaMeta = {
  meses?: number | null;
  anulado?: boolean;
  fecha_hasta?: string | null;
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

function addMs(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
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
 * Replica la lógica de computeEstimatedEnd de useAccessDueNotifications:
 * toma el máximo entre vence_estimado+membresía, extensiones explícitas y
 * membresías con fecha_hasta. Misma lógica que /admin/accesos.
 */
function computeEstimatedEnd(
  venceMeta: VenceMeta | null,
  membresiaExts: MembresiaMeta[],
  joinDate?: string | null,
): Date | null {
  const PROGRAM_DAYS = 120;
  const metaVenceDay = parseDateOnly(venceMeta?.vence_estimado ?? null);
  const metaExtraRaw = venceMeta?.meses_extra;
  const metaExtraParsed =
    metaExtraRaw === undefined || metaExtraRaw === null
      ? null
      : Number(metaExtraRaw);

  const extraMonths =
    metaExtraParsed !== null && Number.isFinite(metaExtraParsed)
      ? Math.max(0, Math.round(metaExtraParsed))
      : 0;

  // Suma meses de membresía activas
  const membresiaMonths = membresiaExts.reduce((acc, m) => {
    if (m.anulado) return acc;
    const n = Number(m.meses ?? 0);
    return acc + (Number.isFinite(n) && n > 0 ? Math.max(0, Math.round(n)) : 0);
  }, 0);
  const membresiaMs = membresiaMonths * 30 * 86400000;

  // Modo legado: vence_estimado está seteado y meses_extra es null
  const legacyMode = Boolean(metaVenceDay) && metaExtraParsed === null;
  let baseCandidate: Date | null = null;

  if (legacyMode && metaVenceDay) {
    baseCandidate = addMs(metaVenceDay, membresiaMs);
  } else {
    const startDay = parseDateOnly(joinDate ?? null);
    if (startDay) {
      const baseEnd = addMs(toDayDate(startDay), PROGRAM_DAYS * 86400000);
      baseCandidate = addMs(baseEnd, extraMonths * 30 * 86400000 + membresiaMs);
    } else if (metaVenceDay) {
      // Fallback sin joinDate: usar vence_estimado + membresía
      baseCandidate = addMs(metaVenceDay, membresiaMs);
    }
  }

  // Candidato 2: extensiones por rango explícito
  let rangeEndCandidate: Date | null = null;
  for (const ext of venceMeta?.extensiones ?? []) {
    const d = parseDateOnly(ext?.fecha_hasta ?? null);
    if (!d) continue;
    if (!rangeEndCandidate || d.getTime() > rangeEndCandidate.getTime())
      rangeEndCandidate = d;
  }

  // Candidato 3: membresías con fecha_hasta explícita (no anuladas)
  let membershipEndCandidate: Date | null = null;
  for (const m of membresiaExts) {
    if (m.anulado) continue;
    const d = parseDateOnly(m.fecha_hasta ?? null);
    if (!d) continue;
    if (
      !membershipEndCandidate ||
      d.getTime() > membershipEndCandidate.getTime()
    )
      membershipEndCandidate = d;
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
                ? rawPayload.extensiones
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
              };
            })
          : [];

        const apiJoinDate =
          typeof json.joinDate === "string" && json.joinDate.trim()
            ? json.joinDate.trim()
            : null;

        setData({
          venceMeta,
          membresiaExts,
          studentInfo: studentInfo ?? null,
          apiJoinDate,
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

  // Calcular fecha igual que computeEstimatedEnd en useAccessDueNotifications
  const venceDate = computeEstimatedEnd(
    venceMeta,
    membresiaExts,
    resolvedJoinDate,
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
