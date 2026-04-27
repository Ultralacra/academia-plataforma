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
  fechaVence: string;
  daysLeft: number;
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

function sumMembresiaMonths(records: MetadataRecord<any>[]) {
  return records.reduce((acc, rec: any) => {
    const payload = rec?.payload ?? {};
    const rawMonths = payload?.meses ?? payload?.meses_extra ?? 0;
    const n = Number(rawMonths);
    const isAnulado = Boolean(payload?.anulado);
    if (!Number.isFinite(n) || n <= 0 || isAnulado) return acc;
    return acc + Math.max(0, Math.round(n));
  }, 0);
}

function computeEstimatedEnd(args: {
  startDay: Date;
  venceMeta: MetadataRecord<any> | null;
  membresiaRecords: MetadataRecord<any>[];
}) {
  const { startDay, venceMeta, membresiaRecords } = args;

  const PROGRAM_DAYS = 120;
  const baseEnd = addDays(startDay, PROGRAM_DAYS);

  const payload = (venceMeta as any)?.payload ?? {};
  const metaExtraRaw = payload?.meses_extra;
  const metaExtraParsed =
    metaExtraRaw === undefined || metaExtraRaw === null || metaExtraRaw === ""
      ? null
      : Number(metaExtraRaw);

  const extraMonths =
    metaExtraParsed !== null && Number.isFinite(metaExtraParsed)
      ? Math.max(0, Math.round(metaExtraParsed))
      : 0;

  const metaVenceDay = parseMaybeDate(payload?.vence_estimado ?? null);
  const membresiaDays = sumMembresiaMonths(membresiaRecords) * 30;

  // Candidato 1: cálculo base (legacy o normal)
  const legacyMode = Boolean(metaVenceDay) && metaExtraParsed === null;
  const baseCandidate =
    legacyMode && metaVenceDay
      ? addDays(toDayDate(metaVenceDay), membresiaDays)
      : addDays(baseEnd, extraMonths * 30 + membresiaDays);

  // Candidato 2: extensiones por rango explícito (array `extensiones` en el payload)
  // Tomamos la fecha_hasta máxima
  const explicitExtensions: any[] = Array.isArray(payload?.extensiones)
    ? payload.extensiones
    : [];
  let rangeEndCandidate: Date | null = null;
  for (const ext of explicitExtensions) {
    const d = parseMaybeDate(ext?.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    if (!rangeEndCandidate || day.getTime() > rangeEndCandidate.getTime()) {
      rangeEndCandidate = day;
    }
  }

  // Candidato 3: membresías con fecha_hasta explícita (no anuladas)
  let membershipEndCandidate: Date | null = null;
  for (const rec of membresiaRecords) {
    const recPayload = (rec as any)?.payload ?? {};
    const isAnulado = Boolean(recPayload?.anulado);
    if (isAnulado) continue;
    const d = parseMaybeDate(recPayload?.fecha_hasta ?? null);
    if (!d) continue;
    const day = toDayDate(d);
    if (
      !membershipEndCandidate ||
      day.getTime() > membershipEndCandidate.getTime()
    ) {
      membershipEndCandidate = day;
    }
  }

  // Resultado: el máximo entre todos los candidatos
  const candidates = [
    baseCandidate,
    rangeEndCandidate,
    membershipEndCandidate,
  ].filter(Boolean) as Date[];
  return candidates.reduce(
    (acc, cur) => (cur.getTime() > acc.getTime() ? cur : acc),
    baseCandidate,
  );
}

function daysBetweenInclusive(a: Date, b: Date) {
  const start = toDayDate(a);
  const end = toDayDate(b);
  if (end.getTime() < start.getTime()) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// Suma los días calendario totales de pausa (rangos fusionados)
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
    for (const r of merged) total += daysBetweenInclusive(r.start, r.end);
    return total;
  } catch {
    return 0;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
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
  const [error, setError] = useState<string | null>(null);

  const inflightRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  const fetchDue = useCallback(async () => {
    if (!opts.enabled) return;
    if (inflightRef.current) return;

    inflightRef.current = true;
    setLoading(true);
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
        baseEstimatedEnd: Date;
      };
      const candidates: Candidate[] = [];

      for (const student of students) {
        const alumnoId = String(student?.id ?? "").trim();
        if (!alumnoId) continue;

        const ingreso = parseMaybeDate(student?.joinDate ?? null);
        if (!ingreso) continue;

        const venceMeta = venceByEntityId.get(alumnoId) ?? null;
        const membresia = membresiaByEntityId.get(alumnoId) ?? [];

        const estimatedEnd = computeEstimatedEnd({
          startDay: toDayDate(ingreso),
          venceMeta,
          membresiaRecords: membresia,
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
        candidates.push({
          alumnoId,
          alumnoCodigo,
          alumnoNombre,
          alumnoEstado,
          baseEstimatedEnd: estimatedEnd,
        });
      }

      // Segunda fase: por cada candidato, sumar días de pausa (cliente-estatus)
      // con concurrencia limitada para no saturar el backend.
      const enriched = await mapWithConcurrency(candidates, 4, async (c) => {
        const pausedDays = c.alumnoCodigo
          ? await fetchPausedCalendarDays(c.alumnoCodigo)
          : 0;
        const adjustedEnd = addDays(c.baseEstimatedEnd, pausedDays);
        const daysLeft = diffDays(today, adjustedEnd);
        return { c, adjustedEnd, daysLeft };
      });

      for (const e of enriched) {
        const { c, adjustedEnd, daysLeft } = e;
        const isDueSoon = daysLeft >= 0 && daysLeft <= daysWindow;
        const isOverdue =
          daysLeft < 0 && adjustedEnd.getTime() >= overdueLowerBound.getTime();
        if (!isDueSoon && !isOverdue) continue;
        const item: AccessDueItem = {
          key: c.alumnoCodigo || `id:${c.alumnoId}`,
          alumnoId: c.alumnoId,
          alumnoCodigo: c.alumnoCodigo,
          alumnoNombre: c.alumnoNombre,
          alumnoEstado: c.alumnoEstado,
          fechaVence: toIsoDay(adjustedEnd),
          daysLeft,
        };
        if (isOverdue) overdue.push(item);
        else dueItems.push(item);
      }

      dueItems.sort((a, b) => a.fechaVence.localeCompare(b.fechaVence));
      // Vencimiento de menor a mayor (fecha más antigua primero)
      overdue.sort((a, b) => a.fechaVence.localeCompare(b.fechaVence));
      // Debug: imprimir en consola ambas listas (solo nombre, estado y días)
      const formatDue = (it: AccessDueItem) => ({
        nombre: it.alumnoNombre,
        estado: it.alumnoEstado,
        diasRestantes: it.daysLeft,
      });
      const formatOverdue = (it: AccessDueItem) => ({
        nombre: it.alumnoNombre,
        estado: it.alumnoEstado,
        diasVencidos: Math.abs(it.daysLeft),
        fechaVence: it.fechaVence,
      });
      // eslint-disable-next-line no-console
      console.log(
        "[AccessDue] Por vencer (≤" + daysWindow + "d):",
        dueItems.map(formatDue),
      );
      // eslint-disable-next-line no-console
      console.log(
        "[AccessDue] Vencidos (mes en curso):",
        overdue.map(formatOverdue),
      );
      setItems(dueItems);
      setOverdueItems(overdue);
      lastFetchRef.current = Date.now();
    } catch (e: any) {
      setItems([]);
      setOverdueItems([]);
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
    error,
    refresh,
  };
}
