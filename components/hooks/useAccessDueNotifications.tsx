"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllStudentsPaged,
  getClienteEstatus,
  type StudentRow,
} from "@/app/admin/alumnos/api";
import { listMetadata, type MetadataRecord } from "@/lib/metadata";

export type AccessDueItem = {
  key: string;
  alumnoId: string;
  alumnoCodigo: string | null;
  alumnoNombre: string;
  alumnoEstado: string | null;
  stage: string | null;
  tag: string | null;
  fechaVence: string;
  daysLeft: number;
  venceTipo: string | null;
  hasMembresia: boolean;
  membresiaCount: number;
  inactivityDays: number | null;
};

function toDayDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseMaybeDate(raw?: string | null): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const v = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(v.getTime()) ? null : v;
  }

  const isoStart = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoStart) {
    const [, y, m, d] = isoStart;
    const v = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(v.getTime()) ? null : v;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function diffDays(a: Date, b: Date) {
  return Math.round(
    (toDayDate(b).getTime() - toDayDate(a).getTime()) / 86400000,
  );
}

function toIsoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function pickLatestByEntityId(records: MetadataRecord<any>[]) {
  const map = new Map<string, MetadataRecord<any>>();
  for (const rec of records) {
    const entityId = String(rec?.entity_id ?? "").trim();
    if (!entityId) continue;
    const prev = map.get(entityId);
    if (!prev) {
      map.set(entityId, rec);
      continue;
    }
    const prevT = new Date(prev.updated_at || prev.created_at || 0).getTime();
    const currT = new Date(rec.updated_at || rec.created_at || 0).getTime();
    if (currT >= prevT) map.set(entityId, rec);
  }
  return map;
}

function countActiveMembresias(records: MetadataRecord<any>[]) {
  return records.reduce((acc, rec: any) => {
    const payload = rec?.payload ?? {};
    const isAnulado = Boolean(payload?.anulado);
    if (isAnulado) return acc;
    return acc + 1;
  }, 0);
}

// Suma N meses calendario a una fecha (idéntico al perfil del alumno)
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

// Cálculo alineado con `app/admin/alumnos/[code]/StudentDetailContent.tsx`.
// Devuelve la fecha estimada de vencimiento usando exactamente la misma lógica
// que la vista de perfil del alumno para evitar discrepancias.
function computeEstimatedEnd(args: {
  startDay: Date;
  venceMeta: MetadataRecord<any> | null;
  membresiaRecords: MetadataRecord<any>[];
  pausedCalendarDaysTotal: number;
}) {
  const { startDay, venceMeta, membresiaRecords, pausedCalendarDaysTotal } =
    args;

  const payload = (venceMeta as any)?.payload ?? {};

  // Duración del programa en meses calendario (default 4)
  const programaMesesRaw = payload?.programa_meses;
  const programaMesesParsed = Number(programaMesesRaw);
  const programaMeses =
    Number.isFinite(programaMesesParsed) && programaMesesParsed >= 1
      ? Math.round(programaMesesParsed)
      : 4;

  // Fin del programa por meses calendario + pausas totales (días)
  const programEndCalendar = addMonthsCalendar(startDay, programaMeses);
  const baseEnd = addDays(programEndCalendar, pausedCalendarDaysTotal);

  // meses_extra (extensión clásica)
  const metaExtraRaw = payload?.meses_extra;
  const metaExtraParsed =
    metaExtraRaw === undefined || metaExtraRaw === null || metaExtraRaw === ""
      ? null
      : Number(metaExtraRaw);
  const normalizedExtraMonths =
    metaExtraParsed !== null && Number.isFinite(metaExtraParsed)
      ? Math.max(0, Math.round(metaExtraParsed))
      : 0;

  // Modo legacy: hay `vence_estimado` (fecha) pero no `meses_extra`.
  const metaVenceDay = parseMaybeDate(payload?.vence_estimado ?? null);
  const isLegacy = Boolean(metaVenceDay) && metaExtraParsed === null;

  const baseForEnd =
    isLegacy && metaVenceDay
      ? addDays(toDayDate(metaVenceDay), pausedCalendarDaysTotal)
      : baseEnd;

  const legacyComputedEnd = isLegacy
    ? baseForEnd
    : addDays(baseForEnd, normalizedExtraMonths * 30);

  // Candidato 2: extensiones por rango explícito (array `extensiones`)
  // Sumamos solo las pausas creadas DESPUÉS de la extensión (delta) usando
  // el snapshot `paused_calendar_days_at_creation`.
  const explicitExtensions: any[] = Array.isArray(payload?.extensiones)
    ? payload.extensiones
    : [];
  let rangeEndCandidate: Date | null = null;
  for (const ext of explicitExtensions) {
    const d = parseMaybeDate(ext?.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    const pausedAtCreationRaw = Number(ext?.paused_calendar_days_at_creation);
    const pausedAtCreation = Number.isFinite(pausedAtCreationRaw)
      ? pausedAtCreationRaw
      : null;
    const pauseDelta =
      pausedAtCreation !== null
        ? Math.max(0, pausedCalendarDaysTotal - pausedAtCreation)
        : 0;
    const effectiveEnd = pauseDelta > 0 ? addDays(day, pauseDelta) : day;
    if (
      !rangeEndCandidate ||
      effectiveEnd.getTime() > rangeEndCandidate.getTime()
    ) {
      rangeEndCandidate = effectiveEnd;
    }
  }

  // Candidato 3: membresías con `fecha_hasta` absoluta (no anuladas)
  let membershipEndCandidate: Date | null = null;
  for (const rec of membresiaRecords) {
    const recPayload = (rec as any)?.payload ?? {};
    const isAnulado = Boolean(recPayload?.anulado);
    if (isAnulado) continue;
    const d = parseMaybeDate(recPayload?.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    const pausedAtCreationRaw = Number(
      recPayload?.paused_calendar_days_at_creation,
    );
    const pausedAtCreation = Number.isFinite(pausedAtCreationRaw)
      ? pausedAtCreationRaw
      : null;
    const pauseDelta =
      pausedAtCreation !== null
        ? Math.max(0, pausedCalendarDaysTotal - pausedAtCreation)
        : 0;
    const effectiveEnd = pauseDelta > 0 ? addDays(day, pauseDelta) : day;
    if (
      !membershipEndCandidate ||
      effectiveEnd.getTime() > membershipEndCandidate.getTime()
    ) {
      membershipEndCandidate = effectiveEnd;
    }
  }

  // Resultado: el máximo entre todos los candidatos
  const candidates = [
    legacyComputedEnd,
    rangeEndCandidate,
    membershipEndCandidate,
  ].filter(Boolean) as Date[];
  return candidates.reduce(
    (acc, cur) => (cur.getTime() > acc.getTime() ? cur : acc),
    legacyComputedEnd,
  );
}

function daysBetweenInclusive(a: Date, b: Date) {
  const start = toDayDate(a);
  const end = toDayDate(b);
  if (end.getTime() < start.getTime()) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// Suma los días calendario totales de pausa (rangos fusionados).
// Convención (idéntica al perfil del alumno): la fecha "Hasta" es el día en
// que el alumno volvió, por lo que NO cuenta como pausado → exclusive end:
// días pausados = (Hasta - Desde) días calendario, es decir
// `daysBetweenInclusive(start, end) - 1`.
async function fetchPausedCalendarDays(alumnoCodigo: string): Promise<number> {
  try {
    const hist = await getClienteEstatus(alumnoCodigo);
    const ranges: Array<{ start: Date; end: Date }> = [];
    for (const h of hist || []) {
      const estado = String(h?.estado_id ?? "").toUpperCase();
      const isPaused = estado.includes("PAUSADO") || estado.includes("PAUSA");
      if (!isPaused) continue;
      const s = parseMaybeDate(h?.fecha_desde ?? null);
      const e = parseMaybeDate(h?.fecha_hasta ?? null);
      if (!s || !e) continue;
      ranges.push({ start: toDayDate(s), end: toDayDate(e) });
    }
    if (ranges.length === 0) return 0;
    ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{ start: Date; end: Date }> = [];
    const oneDay = 86400000;
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push({ start: r.start, end: r.end });
        continue;
      }
      if (r.start.getTime() <= last.end.getTime() + oneDay) {
        if (r.end.getTime() > last.end.getTime()) last.end = r.end;
      } else {
        merged.push({ start: r.start, end: r.end });
      }
    }
    let total = 0;
    for (const r of merged) {
      if (r.end.getTime() > r.start.getTime()) {
        total += Math.max(0, daysBetweenInclusive(r.start, r.end) - 1);
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onItemDone?: (result: R, completed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
        completed++;
        onItemDone?.(results[idx], completed, items.length);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

async function fetchAllStudents() {
  const pageSize = 1000;
  const first = await getAllStudentsPaged({ page: 1, pageSize });
  const all: StudentRow[] = Array.isArray(first.items) ? [...first.items] : [];

  const totalPages = Number(first.totalPages ?? 0);
  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page += 1) {
      const next = await getAllStudentsPaged({ page, pageSize });
      const rows = Array.isArray(next.items) ? next.items : [];
      all.push(...rows);
    }
    return all;
  }

  // Fallback si la API no informa totalPages
  let page = 2;
  while ((all.length === 0 || all.length % pageSize === 0) && page <= 50) {
    const next = await getAllStudentsPaged({ page, pageSize });
    const rows = Array.isArray(next.items) ? next.items : [];
    if (!rows.length) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
  }

  return all;
}

export function useAccessDueNotifications(opts: {
  enabled: boolean;
  daysWindow?: number;
}) {
  const daysWindow = typeof opts.daysWindow === "number" ? opts.daysWindow : 5;

  const [items, setItems] = useState<AccessDueItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<AccessDueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState<string | null>(null);

  const inflightRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  const fetchDue = useCallback(async () => {
    if (!opts.enabled) return;
    if (inflightRef.current) return;

    inflightRef.current = true;
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const [students, metadataRes] = await Promise.all([
        fetchAllStudents(),
        listMetadata<any>({ background: true }),
      ]);

      const metadataItems = Array.isArray(metadataRes?.items)
        ? metadataRes.items
        : [];

      const venceRecords = metadataItems.filter(
        (m: any) => m?.entity === "alumno_acceso_vence_estimado",
      );
      const membresiaRecords = metadataItems.filter(
        (m: any) => m?.entity === "alumno_acceso_extension_membresia",
      );

      const venceByEntityId = pickLatestByEntityId(venceRecords);
      const membresiaByEntityId = new Map<string, MetadataRecord<any>[]>();
      for (const rec of membresiaRecords) {
        const entityId = String(rec?.entity_id ?? "").trim();
        if (!entityId) continue;
        const arr = membresiaByEntityId.get(entityId) ?? [];
        arr.push(rec);
        membresiaByEntityId.set(entityId, arr);
      }

      const today = toDayDate(new Date());
      // Límite hacia atrás: 12 meses antes de hoy (para permitir filtrar por mes)
      const overdueLowerBound = toDayDate(
        new Date(today.getFullYear(), today.getMonth() - 12, today.getDate()),
      );
      // Ventana ampliada para considerar pausas que extienden la fecha real
      // (un alumno fuera del rango sin pausas puede entrar al sumarlas).
      const candidateLowerBound = toDayDate(
        new Date(today.getFullYear(), today.getMonth() - 18, today.getDate()),
      );
      const dueItems: AccessDueItem[] = [];
      const overdue: AccessDueItem[] = [];

      type Candidate = {
        alumnoId: string;
        alumnoCodigo: string | null;
        alumnoNombre: string;
        alumnoEstado: string | null;
        stage: string | null;
        tag: string | null;
        startDay: Date;
        venceMeta: MetadataRecord<any> | null;
        membresiaRecords: MetadataRecord<any>[];
        baseEstimatedEnd: Date;
        venceTipo: string | null;
        hasMembresia: boolean;
        membresiaCount: number;
        inactivityDays: number | null;
      };
      const candidates: Candidate[] = [];

      for (const student of students) {
        const alumnoId = String(student?.id ?? "").trim();
        if (!alumnoId) continue;

        const ingreso = parseMaybeDate(student?.joinDate ?? null);
        if (!ingreso) continue;

        const venceMeta = venceByEntityId.get(alumnoId) ?? null;
        const membresia = membresiaByEntityId.get(alumnoId) ?? [];

        const startDay = toDayDate(ingreso);
        // Pre-cálculo SIN pausas (sólo para prefiltrar candidatos).
        // El cálculo definitivo (con pausas reales) se hace en fase 2.
        const estimatedEnd = computeEstimatedEnd({
          startDay,
          venceMeta,
          membresiaRecords: membresia,
          pausedCalendarDaysTotal: 0,
        });

        const daysLeft = diffDays(today, estimatedEnd);
        const isDueSoon = daysLeft >= 0 && daysLeft <= daysWindow;
        // Para "vencido" sin pausas todavía, usamos ventana ampliada
        const isOverdueCandidate =
          daysLeft < 0 &&
          estimatedEnd.getTime() >= candidateLowerBound.getTime();
        if (!isDueSoon && !isOverdueCandidate) continue;

        const alumnoCodigo = student?.code ? String(student.code).trim() : null;
        const alumnoNombre = String(student?.name ?? "").trim() || "Alumno";
        const alumnoEstado =
          (student as any)?.state != null
            ? String((student as any).state).trim() || null
            : null;
        const stage =
          (student as any)?.stage != null
            ? String((student as any).stage).trim() || null
            : null;
        const membresiaCount = countActiveMembresias(membresia);
        const tag =
          (student as any)?.tag != null
            ? String((student as any).tag).trim() || null
            : null;
        const inactivityRaw = (student as any)?.inactivityDays;
        const inactivityDays =
          inactivityRaw === null || inactivityRaw === undefined
            ? null
            : Number.isFinite(Number(inactivityRaw))
              ? Number(inactivityRaw)
              : null;
        candidates.push({
          alumnoId,
          alumnoCodigo,
          alumnoNombre,
          alumnoEstado,
          stage,
          tag,
          startDay,
          venceMeta,
          membresiaRecords: membresia,
          baseEstimatedEnd: estimatedEnd,
          venceTipo: (venceMeta as any)?.payload?.vence_tipo ?? null,
          hasMembresia: membresiaCount > 0,
          membresiaCount,
          inactivityDays,
        });
      }

      // Segunda fase: por cada candidato, sumar días de pausa (cliente-estatus)
      // con concurrencia limitada para no saturar el backend.
      // Se actualiza el estado de forma progresiva cada BATCH_UPDATE candidatos.
      const BATCH_UPDATE = 5;
      const partialDue: AccessDueItem[] = [];
      const partialOverdue: AccessDueItem[] = [];

      const flushPartial = () => {
        const sortedDue = [...partialDue].sort((a, b) =>
          a.fechaVence.localeCompare(b.fechaVence),
        );
        const sortedOverdue = [...partialOverdue].sort((a, b) =>
          a.fechaVence.localeCompare(b.fechaVence),
        );
        setItems(sortedDue);
        setOverdueItems(sortedOverdue);
      };

      await mapWithConcurrency(
        candidates,
        4,
        async (c) => {
          const pausedCalendarDaysTotal = c.alumnoCodigo
            ? await fetchPausedCalendarDays(c.alumnoCodigo)
            : 0;
          // Recálculo definitivo con la misma lógica que el perfil del alumno
          // (incluye programa_meses, snapshots paused_at_creation, etc.)
          const adjustedEnd = computeEstimatedEnd({
            startDay: c.startDay,
            venceMeta: c.venceMeta,
            membresiaRecords: c.membresiaRecords,
            pausedCalendarDaysTotal,
          });
          const daysLeft = diffDays(today, adjustedEnd);
          return { c, adjustedEnd, daysLeft };
        },
        (result, completed, total) => {
          const { c, adjustedEnd, daysLeft } = result;
          const isDueSoon = daysLeft >= 0 && daysLeft <= daysWindow;
          const isOverdue =
            daysLeft < 0 &&
            adjustedEnd.getTime() >= overdueLowerBound.getTime();
          if (isDueSoon || isOverdue) {
            const item: AccessDueItem = {
              key: c.alumnoCodigo || `id:${c.alumnoId}`,
              alumnoId: c.alumnoId,
              alumnoCodigo: c.alumnoCodigo,
              alumnoNombre: c.alumnoNombre,
              alumnoEstado: c.alumnoEstado,
              stage: c.stage,
              tag: c.tag,
              fechaVence: toIsoDay(adjustedEnd),
              daysLeft,
              venceTipo: c.venceTipo,
              hasMembresia: c.hasMembresia,
              membresiaCount: c.membresiaCount,
              inactivityDays: c.inactivityDays,
            };
            if (isOverdue) partialOverdue.push(item);
            else partialDue.push(item);
          }
          setProgress(Math.round((completed / total) * 100));
          if (completed % BATCH_UPDATE === 0) flushPartial();
        },
      );

      // Flush final con orden definitivo
      dueItems.push(...partialDue);
      overdue.push(...partialOverdue);

      dueItems.sort((a, b) => a.fechaVence.localeCompare(b.fechaVence));
      // Vencimiento de menor a mayor (fecha más antigua primero)
      overdue.sort((a, b) => a.fechaVence.localeCompare(b.fechaVence));

      // Log: vencidos agrupados por mes (YYYY-MM), un console.log por mes
      if (overdue.length > 0) {
        const byMonth = new Map<string, AccessDueItem[]>();
        for (const it of overdue) {
          const ym = it.fechaVence.slice(0, 7); // YYYY-MM
          const arr = byMonth.get(ym) ?? [];
          arr.push(it);
          byMonth.set(ym, arr);
        }
        const sortedMonths = Array.from(byMonth.keys()).sort();
        // eslint-disable-next-line no-console
        console.log(
          `[AccessDue] Vencidos por mes — total: ${overdue.length} (${sortedMonths.length} meses)`,
        );
        for (const ym of sortedMonths) {
          const list = byMonth.get(ym) ?? [];
          const arr = list.map((it) => ({
            codigo: it.alumnoCodigo ?? "-",
            nombre: it.alumnoNombre,
            estado: it.alumnoEstado ?? "-",
            fechaVence: it.fechaVence,
            diasVencido: Math.abs(it.daysLeft),
          }));
          // eslint-disable-next-line no-console
          console.log(`[AccessDue] ${ym} (${list.length})`, arr);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("[AccessDue] Vencidos por mes — total: 0", []);
      }

      setItems(dueItems);
      setOverdueItems(overdue);
      setProgress(100);
      lastFetchRef.current = Date.now();
    } catch (e: any) {
      setItems([]);
      setOverdueItems([]);
      setProgress(0);
      setError(e?.message || "No se pudieron cargar accesos por vencer");
    } finally {
      inflightRef.current = false;
      setLoading(false);
    }
  }, [daysWindow, opts.enabled]);

  useEffect(() => {
    if (!opts.enabled) return;
    void fetchDue();
  }, [fetchDue, opts.enabled]);

  const refresh = useCallback(async () => {
    const ageMs = Date.now() - lastFetchRef.current;
    if (ageMs < 30_000) return;
    await fetchDue();
  }, [fetchDue]);

  return {
    items,
    overdueItems,
    dueCount: items.length,
    overdueCount: overdueItems.length,
    totalCount: items.length + overdueItems.length,
    loading,
    progress,
    error,
    refresh,
  };
}
