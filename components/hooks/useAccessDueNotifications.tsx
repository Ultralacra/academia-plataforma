"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAllStudentsPaged, type StudentRow } from "@/app/admin/alumnos/api";
import { listMetadata, type MetadataRecord } from "@/lib/metadata";

export type AccessDueItem = {
  key: string;
  alumnoId: string;
  alumnoCodigo: string | null;
  alumnoNombre: string;
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

  const legacyMode = Boolean(metaVenceDay) && metaExtraParsed === null;

  if (legacyMode && metaVenceDay) {
    return addDays(toDayDate(metaVenceDay), membresiaDays);
  }

  const extraDaysFromMonths = extraMonths * 30;
  return addDays(baseEnd, extraDaysFromMonths + membresiaDays);
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
        listMetadata<any>(),
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
      const dueItems: AccessDueItem[] = [];

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
        if (daysLeft < 0 || daysLeft > daysWindow) continue;

        const alumnoCodigo = student?.code ? String(student.code).trim() : null;
        const alumnoNombre = String(student?.name ?? "").trim() || "Alumno";
        dueItems.push({
          key: alumnoCodigo || `id:${alumnoId}`,
          alumnoId,
          alumnoCodigo,
          alumnoNombre,
          fechaVence: toIsoDay(estimatedEnd),
          daysLeft,
        });
      }

      dueItems.sort((a, b) => a.daysLeft - b.daysLeft);
      setItems(dueItems);
      lastFetchRef.current = Date.now();
    } catch (e: any) {
      setItems([]);
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
    dueCount: items.length,
    loading,
    error,
    refresh,
  };
}
