"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { type MetadataRecord } from "@/lib/metadata";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { isoDay, parseMaybe } from "./detail-utils";

function normPhaseId(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function isFase5(etapaId: unknown) {
  const n = normPhaseId(etapaId);
  if (n === "F5" || n === "FASE5") return true;
  if (n.startsWith("F5") && n.length > 2 && !/\d/.test(n[2])) return true;
  if (n.startsWith("FASE5") && n.length > 5 && !/\d/.test(n[5])) return true;
  return false;
}

async function fetchFase5StartDateISO(
  studentCode: string,
): Promise<string | null> {
  try {
    const histUrl = `/client/get/cliente-etapas/${encodeURIComponent(
      studentCode,
    )}`;
    const jh = await apiFetch<any>(histUrl);
    const rows = Array.isArray(jh?.data) ? jh.data : [];

    const dates = rows
      .filter((r: any) =>
        isFase5(r?.etapa_id ?? r?.etapa ?? r?.fase ?? r?.stage),
      )
      .map((r: any) => parseMaybe(r?.created_at ?? r?.fecha ?? r?.createdAt))
      .filter((d: Date | null): d is Date => Boolean(d))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    return dates[0] ? isoDay(dates[0]) : null;
  } catch {
    return null;
  }
}

// Utilidades numéricas para formato en vista previa del formulario ADS
function toNum(v?: string | number | null) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}
function fmtNum(n?: string | number | null, digits?: number) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: typeof digits === "number" ? digits : 0,
  }).format(v);
}
function fmtMoney(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}
function fmtPct(n?: string | number | null) {
  const v = toNum(n);
  if (v == null) return "—";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

export default function AdsMetricsForm({
  studentCode,
  studentName,
  readOnly,
}: {
  studentCode: string;
  studentName?: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const isReadOnly = Boolean(readOnly);

  type Metrics = {
    fecha_inicio?: string;
    fecha_asignacion?: string;
    fecha_fin?: string;
    inversion?: string;
    facturacion?: string;
    roas?: string;
    alcance?: string;
    clics?: string;
    visitas?: string;
    pagos?: string;
    carga_pagina?: string;
    eff_ads?: string;
    eff_pago?: string;
    eff_compra?: string;
    compra_carnada?: string;
    compra_bump1?: string;
    compra_bump2?: string;
    compra_oto1?: string;
    compra_oto2?: string;
    compra_downsell?: string;
    pauta_activa?: boolean;
    requiere_interv?: boolean;
    fase?: string;
    subfase?: string;
    subfase_color?: string;
    fase_data?: Record<string, { obs?: string; interv_sugerida?: string }>;
    coach_copy?: string;
    coach_plat?: string;
    obs?: string;
    interv_sugerida?: string;
    auto_roas?: boolean;
    auto_eff?: boolean;
    adjuntos?: Array<{
      id: string;
      kind: "link" | "file";
      name: string;
      url?: string;
      type?: string;
      size?: number;
    }>;
  };

  const [data, setData] = useState<Metrics>({
    auto_roas: true,
    auto_eff: true,
    pauta_activa: false,
    requiere_interv: false,
    adjuntos: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const saveTimerRef = useRef<number | null>(null);
  const didInitRef = useRef<boolean>(false);

  const [assignedCoaches, setAssignedCoaches] = useState<
    Array<{ name: string; area?: string | null; puesto?: string | null }>
  >([]);
  const [studentInfo, setStudentInfo] = useState<{
    id: string | number | null;
    code: string;
    name: string;
  } | null>(null);

  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [matchedMetadata, setMatchedMetadata] =
    useState<MetadataRecord<any> | null>(null);
  const [matchedMetadataCount, setMatchedMetadataCount] = useState<number>(0);

  function applyMetadataToForm(record: MetadataRecord<any> | null) {
    if (!record) return;
    const p = (record as any)?.payload;
    if (!p || typeof p !== "object") return;
    setData((prev) => ({ ...prev, ...(p as any) }));
  }

  const norm = (v: unknown) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toUpperCase();

  const coachCopyAssigned = useMemo(() => {
    return assignedCoaches.find((c) => norm(c.area).includes("COPY")) || null;
  }, [assignedCoaches]);

  const coachAdsAssigned = useMemo(() => {
    return (
      assignedCoaches.find(
        (c) => norm(c.area) === "TECNICO" && norm(c.puesto) === "COACH_TECNICO",
      ) || null
    );
  }, [assignedCoaches]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          studentCode,
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        const rows: any[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
            ? j
            : [];
        const mapped = rows
          .map((r) => {
            const name = String(
              r?.coach_nombre ?? r?.name ?? r?.nombre ?? "",
            ).trim();
            if (!name) return null;
            return {
              name,
              area: r?.area ?? null,
              puesto: r?.puesto ?? null,
            };
          })
          .filter(Boolean) as Array<{
          name: string;
          area?: string | null;
          puesto?: string | null;
        }>;
        const uniqByName = Array.from(
          new Map(mapped.map((c) => [c.name, c])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name, "es"));
        setAssignedCoaches(uniqByName);
      } catch {
        if (!alive) return;
        setAssignedCoaches([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentCode]);

  // Resolver id/nombre del alumno para poder guardar en metadata
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients?page=1&search=${encodeURIComponent(
          studentCode,
        )}`;
        const json = await apiFetch<any>(url);
        const rows: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.clients?.data)
            ? json.clients.data
            : Array.isArray(json?.getClients?.data)
              ? json.getClients.data
              : Array.isArray(json)
                ? json
                : [];

        const found =
          rows.find(
            (r) =>
              String(r.codigo ?? r.code ?? "").toLowerCase() ===
              studentCode.toLowerCase(),
          ) ||
          rows[0] ||
          null;

        if (!alive) return;

        const id =
          found?.id ??
          found?.alumno_id ??
          found?.client_id ??
          found?.cliente_id ??
          null;
        const name = String(found?.nombre ?? found?.name ?? "").trim();
        setStudentInfo({
          id: id != null ? id : null,
          code: studentCode,
          name,
        });
      } catch {
        if (!alive) return;
        setStudentInfo({ id: null, code: studentCode, name: "" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentCode]);

  function normalizeId(v: unknown) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    // algunos ids vienen como numero o string
    const n = Number(s);
    if (Number.isFinite(n) && String(n) === s) return String(n);
    return s;
  }

  function isDeletedPayload(p: any) {
    return Boolean(p?.deleted);
  }

  function pickBestMetadataForStudent(
    items: MetadataRecord<any>[],
    opts: {
      studentCode: string;
      alumnoId: string | number | null;
      entity: string;
      tag: string;
    },
  ) {
    const alumnoIdStr = normalizeId(opts.alumnoId);
    const candidateEntityIds = Array.from(
      new Set(
        [alumnoIdStr, normalizeId(opts.studentCode)].filter(
          Boolean,
        ) as string[],
      ),
    );

    const matches = items
      .filter((m) => !isDeletedPayload((m as any)?.payload))
      .filter((m) => {
        const entity = String((m as any)?.entity ?? "").trim();
        const entityId = normalizeId((m as any)?.entity_id);
        const payload = (m as any)?.payload ?? {};

        const entityMatches =
          entity === opts.entity || String(payload?._tag ?? "") === opts.tag;
        if (!entityMatches) return false;

        const idMatches = entityId && candidateEntityIds.includes(entityId);
        const payloadAlumnoId = normalizeId(payload?.alumno_id);
        const payloadAlumnoCodigo = String(payload?.alumno_codigo ?? "").trim();
        const payloadMatches =
          (alumnoIdStr && payloadAlumnoId === alumnoIdStr) ||
          (payloadAlumnoCodigo &&
            payloadAlumnoCodigo.toLowerCase() ===
              opts.studentCode.toLowerCase());

        return Boolean(idMatches || payloadMatches);
      });

    // elegir la más reciente: preferimos id numérico más alto; si no, por created_at
    const best = [...matches].sort((a, b) => {
      const aId = Number((a as any)?.id);
      const bId = Number((b as any)?.id);
      const aHasNum = Number.isFinite(aId);
      const bHasNum = Number.isFinite(bId);
      if (aHasNum && bHasNum) return bId - aId;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      const aT = Date.parse(String((a as any)?.created_at ?? "")) || 0;
      const bT = Date.parse(String((b as any)?.created_at ?? "")) || 0;
      return bT - aT;
    })[0] as MetadataRecord<any> | undefined;

    return { best: best ?? null, count: matches.length };
  }

  async function reloadStudentMetadata() {
    const alumnoId = studentInfo?.id ?? null;
    setMetadataLoading(true);
    try {
      const idForRoute = String(alumnoId ?? studentCode);
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata?entity=${encodeURIComponent(
          "ads_metrics",
        )}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => null)) as any;
      const items = Array.isArray(json?.items) ? json.items : [];
      const { best, count } = pickBestMetadataForStudent(items, {
        studentCode,
        alumnoId,
        entity: "ads_metrics",
        tag: "admin_alumnos_ads_metrics",
      });
      setMatchedMetadata(best);
      setMatchedMetadataCount(count);
      if (best) applyMetadataToForm(best);
            /* console.log(
        "[ADS][metadata] list -> total:",
        items.length,
        "matches:",
        count,
        "best:",
        best,
      ); */
    } catch (e) {
      console.warn("[ADS][metadata] no se pudo listar metadata:", e);
      setMatchedMetadata(null);
      setMatchedMetadataCount(0);
    } finally {
      setMetadataLoading(false);
    }
  }

  async function handleGuardarMetadata() {
    if (isReadOnly) return;
    const alumnoId = studentInfo?.id ?? null;
    const alumnoNombre =
      String(studentName || studentInfo?.name || "").trim() || studentCode;

    const creadoPorId = (user as any)?.id ?? null;
    const creadoPorCodigo =
      (user as any)?.codigo ??
      (user as any)?.code ??
      (user as any)?.user_code ??
      null;
    const creadoPorNombre =
      (user as any)?.nombre ??
      (user as any)?.name ??
      (user as any)?.email ??
      null;

    const payload = {
      ...data,
      alumno_id: alumnoId,
      alumno_codigo: studentCode,
      alumno_nombre: alumnoNombre,
      // Se mantiene el esquema del detalle; si ya existe, estos campos se
      // preservan desde el detalle (para no cambiar el creador original).
      creado_por_id: creadoPorId,
      creado_por_codigo: creadoPorCodigo,
      creado_por_nombre: creadoPorNombre,
      _tag: "admin_alumnos_ads_metrics",
      _view: "/admin/alumnos/[code]/ads",
      _saved_at: new Date().toISOString(),
    };

    const body = {
      entity: "ads_metrics",
      entity_id: String(alumnoId ?? studentCode),
      payload,
    };

    setMetadataSaving(true);
    try {
      // 1) Listar SOLO lo del alumno (proxy interno) y filtrar el mejor registro
      const idForRoute = String(alumnoId ?? studentCode);
      const token = getAuthToken();
      const res = await fetch(
        `/api/alumnos/${encodeURIComponent(idForRoute)}/metadata?entity=${encodeURIComponent(
          body.entity,
        )}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const listJson = (await res.json().catch(() => null)) as any;
      const items = Array.isArray(listJson?.items) ? listJson.items : [];
      const { best, count } = pickBestMetadataForStudent(items, {
        studentCode,
        alumnoId,
        entity: body.entity,
        tag: "admin_alumnos_ads_metrics",
      });

      if (best?.id != null) {
        // Ya existe: actualizar (PUT) y luego consultar por id
                /* console.log(
          "[ADS][metadata] ya existe para este alumno, actualizando por id:",
          best.id,
        ); */

        // Preservamos creado_por_* si ya existe, para no modificar creador.
        const existingPayload = (best as any)?.payload ?? {};
        const mergedPayload = {
          ...existingPayload,
          ...payload,
          creado_por_id:
            existingPayload?.creado_por_id ?? payload.creado_por_id,
          creado_por_codigo:
            existingPayload?.creado_por_codigo ?? payload.creado_por_codigo,
          creado_por_nombre:
            existingPayload?.creado_por_nombre ?? payload.creado_por_nombre,
        };

        const updateBody = {
          id: (best as any)?.id,
          entity: (best as any)?.entity,
          entity_id: (best as any)?.entity_id,
          payload: mergedPayload,
        };

                /* console.log("[ADS][metadata] update body ->", updateBody); */

        const updateRes = await fetch(
          `/api/metadata/${encodeURIComponent(String(best.id))}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(updateBody),
          },
        );
        if (!updateRes.ok) {
          const txt = await updateRes.text().catch(() => "");
          throw new Error(txt || `HTTP ${updateRes.status}`);
        }

        const updatedLocal: MetadataRecord<any> = {
          ...(best as any),
          payload: mergedPayload,
          updated_at: new Date().toISOString(),
        };
        setMatchedMetadata(updatedLocal);
        setMatchedMetadataCount(count || 1);
        applyMetadataToForm(updatedLocal);
                /* console.log("[ADS][metadata] updated local ->", updatedLocal); */
        toast({ title: "Guardado", description: "Métricas ADS actualizadas" });
        return;
      }

      // 2) Crear metadata SOLO para este alumno
            /* console.log("[ADS][metadata] create body ->", body); */
      const createRes = await fetch("/api/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!createRes.ok) {
        const txt = await createRes.text().catch(() => "");
        throw new Error(txt || `HTTP ${createRes.status}`);
      }
      const createdJson = (await createRes.json().catch(() => null)) as any;
      const createdId = createdJson?.id ?? null;
      const createdLocal: MetadataRecord<any> = {
        id: createdId ?? `tmp_${Date.now()}`,
        entity: body.entity,
        entity_id: body.entity_id,
        payload: body.payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMatchedMetadata(createdLocal);
      setMatchedMetadataCount(1);
      applyMetadataToForm(createdLocal);
            /* console.log("[ADS][metadata] created local ->", createdLocal); */
      toast({ title: "Guardado", description: "Métricas ADS guardadas" });
    } catch (e: unknown) {
      console.error("[ADS][metadata] error guardando/consultando:", e);
      try {
        const desc = e instanceof Error ? e.message : String(e ?? "Error");
        toast({
          title: "Error",
          description: desc,
          variant: "destructive",
        });
      } catch {}
    } finally {
      setMetadataSaving(false);
    }
  }

  // Cargar metadata del alumno al montar (lista completa + filtro local)
  useEffect(() => {
    if (!studentCode) return;
    reloadStudentMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode, studentInfo?.id]);

  useEffect(() => {
    // Persistir automáticamente el coach de COPY y el de ADS dentro de la métrica
    // (así queda guardado en localStorage como antes)
    const nextCopy = coachCopyAssigned?.name || "";
    const nextAds = coachAdsAssigned?.name || "";
    setData((prev) => {
      if (
        (prev.coach_copy || "") === nextCopy &&
        (prev.coach_plat || "") === nextAds
      )
        return prev;
      return {
        ...prev,
        coach_copy: nextCopy,
        coach_plat: nextAds,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachCopyAssigned?.name, coachAdsAssigned?.name]);

  function toNumOrNull(s?: string): number | null {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function fmtPercentNoScale(n?: number | null): string {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    const v = Number(n);
    const s = v.toFixed(2);
    return `${s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
  }
  function pctOf(
    part?: string | number | null,
    total?: string | number | null,
  ): string {
    const p = toNum(part as any);
    const t = toNum(total as any);
    if (p == null || !t || t <= 0) return "—";
    return fmtPercentNoScale((p / t) * 100);
  }

  // Cargar métrica existente por estudiante
  useEffect(() => {
    if (isReadOnly) {
      setLoading(false);
      didInitRef.current = true;
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const fase5Start = await fetchFase5StartDateISO(studentCode);
        const key = `ads-metrics:${studentCode}`;
        const raw =
          !isReadOnly && typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
        if (!mounted) return;

        let maybeForm: any = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            maybeForm = parsed?.form ?? parsed;

            // Migration: if obs/interv exists but no fase_data, move them
            if (
              (maybeForm?.obs || maybeForm?.interv_sugerida) &&
              !maybeForm?.fase_data
            ) {
              const p = maybeForm?.fase || "sin-fase";
              maybeForm.fase_data = {
                [p]: {
                  obs: maybeForm.obs,
                  interv_sugerida: maybeForm.interv_sugerida,
                },
              };
            }
          } catch {
            maybeForm = null;
          }
        }

        setData((prev) => {
          const merged = { ...prev, ...(maybeForm ?? {}) } as Metrics;
          // Regla: fecha_inicio debe ser la fecha de entrada a Fase 5 si existe.
          if (fase5Start) merged.fecha_inicio = fase5Start;
          return merged;
        });
      } catch (e) {
        console.error("ADS metrics local load error", e);
      } finally {
        if (mounted) setLoading(false);
        didInitRef.current = true;
      }
    })();
    return () => {
      mounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [studentCode, isReadOnly]);

  // Autosave con debounce al cambiar datos
  useEffect(() => {
    if (isReadOnly) return;
    if (!didInitRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        const key = `ads-metrics:${studentCode}`;
        const payload = {
          savedAt: new Date().toISOString(),
          form: data,
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(payload));
        }
      } catch (e) {
        console.error("ADS metrics local save error", e);
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [JSON.stringify(data), studentCode, isReadOnly]);

  function persist(next: Metrics) {
    if (isReadOnly) return;
    setData(next);
  }

  // Derivados automáticos
  const roasCalc = useMemo(() => {
    const inv = toNum(data.inversion);
    const fac = toNum(data.facturacion);
    if (inv && inv > 0 && fac != null) return (fac / inv).toFixed(2);
    return undefined;
  }, [data.inversion, data.facturacion]);
  const effAdsCalc = useMemo(() => {
    const c = toNum(data.clics);
    const a = toNum(data.alcance);
    if (c != null && a && a > 0) return c / a;
    return undefined;
  }, [data.clics, data.alcance]);
  const effPagoCalc = useMemo(() => {
    const p = toNum(data.pagos);
    const v = toNum(data.visitas);
    if (p != null && v && v > 0) return p / v;
    return undefined;
  }, [data.pagos, data.visitas]);
  const effCompraCalc = useMemo(() => {
    const comp = toNum(data.compra_carnada);
    const v = toNum(data.visitas);
    if (comp != null && v && v > 0) return comp / v;
    return undefined;
  }, [data.compra_carnada, data.visitas]);

  const view = {
    roas: data.auto_roas ? (roasCalc ?? data.roas) : data.roas,
    eff_ads: data.auto_eff ? (effAdsCalc ?? data.eff_ads) : data.eff_ads,
    eff_pago: data.auto_eff ? (effPagoCalc ?? data.eff_pago) : data.eff_pago,
    eff_compra: data.auto_eff
      ? (effCompraCalc ?? data.eff_compra)
      : data.eff_compra,
  } as const;

  function onChange<K extends keyof Metrics>(k: K, v: Metrics[K]) {
    persist({ ...data, [k]: v });
  }

  // Nota: se removió la caja de “Notas y adjuntos” en esta vista.

  // Auto-calcular "Carga de página (%)" = visitas/clics*100
  useEffect(() => {
    const v = toNum(data.visitas);
    const c = toNum(data.clics);
    let calc = "0";
    if (c && c > 0 && v != null) {
      const pct = (v / c) * 100;
      const s = pct.toFixed(1);
      calc = /\.0$/.test(s) ? s.replace(/\.0$/, "") : s;
    }
    if ((data.carga_pagina || "0") !== calc) {
      setData((prev) => ({ ...prev, carga_pagina: calc }));
    }
  }, [data.visitas, data.clics]);

  // Debug: log inputs y resultados con etiquetas idénticas a la UI
  useEffect(() => {
    try {
      const alcanceN = toNum(data.alcance) ?? null;
      const clicsN = toNum(data.clics) ?? null;
      const visitasN = toNum(data.visitas) ?? null;
      const pagosN = toNum(data.pagos) ?? null;
            /* console.log(
        "[ADS] Embudo → Alcance:",
        alcanceN,
        "Clics:",
        clicsN,
        "Visitas:",
        visitasN,
        "Pagos iniciados:",
        pagosN,
      ); */

      const effAdsRatio = effAdsCalc != null ? Number(effAdsCalc) : null;
      const effPagoRatio = effPagoCalc != null ? Number(effPagoCalc) : null;
      const effCompraRatio =
        effCompraCalc != null ? Number(effCompraCalc) : null;
      const effAdsPct = effAdsRatio != null ? effAdsRatio * 100 : null;
      const effPagoPct = effPagoRatio != null ? effPagoRatio * 100 : null;
      const effCompraPct = effCompraRatio != null ? effCompraRatio * 100 : null;
            /* console.log(
        "[ADS] Efectividades (ratio) → Ads (clics/alcance):",
        effAdsRatio,
        "Pago iniciado (pagos/visitas):",
        effPagoRatio,
        "Compra (carnada/visitas):",
        effCompraRatio,
      ); */
            /* console.log(
        "[ADS] Efectividades (%) → Ads (clics/alcance):",
        effAdsPct != null ? `${effAdsPct.toFixed(1)}%` : null,
        "Pago iniciado (pagos/visitas):",
        effPagoPct != null ? `${effPagoPct.toFixed(1)}%` : null,
        "Compra (carnada/visitas):",
        effCompraPct != null ? `${effCompraPct.toFixed(1)}%` : null,
      ); */

      const dispEffAds = fmtRatioToPercent(view.eff_ads);
      const dispEffPago = fmtRatioToPercent(view.eff_pago);
      const dispEffCompra = fmtRatioToPercent(view.eff_compra);
            /* console.log(
        "[ADS] UI → Ads (clics/alcance):",
        `${dispEffAds}%`,
        "Pago iniciado (pagos/visitas):",
        `${dispEffPago}%`,
        "Compra (carnada/visitas):",
        `${dispEffCompra}%`,
      ); */
    } catch (e) {
      console.warn("[ADS] Log error", e);
    }
  }, [
    data.alcance,
    data.clics,
    data.visitas,
    data.pagos,
    effAdsCalc,
    effPagoCalc,
    effCompraCalc,
    data.auto_eff,
  ]);

  // Helpers de presentación para porcentajes
  function fmtRatioToPercent(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    return (v * 100).toFixed(1).replace(/\.0$/, "");
  }
  function fmtManualPercent(x?: string | number | null): string {
    const v = toNum(x);
    if (v == null) return "";
    return v.toFixed(1).replace(/\.0$/, "");
  }
  function sanitizePercentInput(s: string): string {
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {isReadOnly
              ? "Solo lectura"
              : loading
                ? "Cargando métricas…"
                : saving
                  ? "Guardando…"
                  : "Cambios guardados"}
          </div>
          <div className="flex items-center gap-2">
            {metadataLoading ? (
              <Badge variant="secondary">metadata…</Badge>
            ) : matchedMetadata?.id != null ? (
              <Badge variant="secondary">
                metadata #{String(matchedMetadata.id)}
                {matchedMetadataCount > 1
                  ? ` (+${matchedMetadataCount - 1})`
                  : ""}
              </Badge>
            ) : (
              <Badge variant="outline">sin metadata</Badge>
            )}
            {!isReadOnly ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGuardarMetadata}
                disabled={loading || metadataSaving}
              >
                Guardar
              </Button>
            ) : null}
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Métricas ADS {studentName ? `— ${studentName}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset disabled={isReadOnly} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={data.fecha_inicio || ""}
                    onChange={(e) => onChange("fecha_inicio", e.target.value)}
                  />
                </div>
                {/* Comentado: Fecha asignación y Fecha fin ocultas temporalmente
              <div className="space-y-1.5">
                <Label>Fecha asignación</Label>
                <Input
                  type="date"
                  value={data.fecha_asignacion || ""}
                  onChange={(e) => onChange("fecha_asignacion", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={data.fecha_fin || ""}
                  onChange={(e) => onChange("fecha_fin", e.target.value)}
                />
              </div>
              */}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Rendimiento</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Inversión (USD)</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.inversion || ""}
                        onChange={(e) => onChange("inversion", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Facturación (USD)</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.facturacion || ""}
                        onChange={(e) =>
                          onChange("facturacion", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label>ROAS</Label>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Auto</span>
                          <Switch
                            checked={!!data.auto_roas}
                            onCheckedChange={(v) => onChange("auto_roas", v)}
                          />
                        </div>
                      </div>
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        disabled={data.auto_roas}
                        value={
                          data.auto_roas ? view.roas || "" : data.roas || ""
                        }
                        onChange={(e) => onChange("roas", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Embudo</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Alcance</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.alcance || ""}
                        onChange={(e) => onChange("alcance", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Clics</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.clics || ""}
                        onChange={(e) => onChange("clics", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Visitas</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.visitas || ""}
                        onChange={(e) => onChange("visitas", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pagos iniciados</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.pagos || ""}
                        onChange={(e) => onChange("pagos", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Efectividades (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label>Carga de página (visitas/clics)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled
                        value={`${data.carga_pagina || "0"}%`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ads (clics/alcance)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0.0"
                        disabled
                        value={
                          view.eff_ads != null
                            ? `${(Number(view.eff_ads) * 100).toFixed(1)}%`
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pago iniciado (pagos/visitas)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled={data.auto_eff}
                        value={`${
                          data.auto_eff
                            ? fmtRatioToPercent(view.eff_pago)
                            : fmtManualPercent(data.eff_pago)
                        }%`}
                        onChange={(e) =>
                          onChange(
                            "eff_pago",
                            sanitizePercentInput(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Compra (carnada/visitas)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0%"
                        disabled={data.auto_eff}
                        value={`${
                          data.auto_eff
                            ? fmtRatioToPercent(view.eff_compra)
                            : fmtManualPercent(data.eff_compra)
                        }%`}
                        onChange={(e) =>
                          onChange(
                            "eff_compra",
                            sanitizePercentInput(e.target.value),
                          )
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Compras</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Carnada</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_carnada || ""}
                        onChange={(e) =>
                          onChange("compra_carnada", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bump 1</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_bump1 || ""}
                        onChange={(e) =>
                          onChange("compra_bump1", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Efectividad:{" "}
                        {pctOf(data.compra_bump1, data.compra_carnada)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bump 2</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_bump2 || ""}
                        onChange={(e) =>
                          onChange("compra_bump2", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Efectividad:{" "}
                        {pctOf(data.compra_bump2, data.compra_carnada)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>OTO 1</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_oto1 || ""}
                        onChange={(e) =>
                          onChange("compra_oto1", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Efectividad:{" "}
                        {pctOf(data.compra_oto1, data.compra_carnada)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>OTO 2</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_oto2 || ""}
                        onChange={(e) =>
                          onChange("compra_oto2", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Efectividad:{" "}
                        {pctOf(data.compra_oto2, data.compra_carnada)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Downsell</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={data.compra_downsell || ""}
                        onChange={(e) =>
                          onChange("compra_downsell", e.target.value)
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Efectividad:{" "}
                        {pctOf(data.compra_downsell, data.compra_carnada)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Estado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pauta activa</Label>
                      <Switch
                        checked={!!data.pauta_activa}
                        onCheckedChange={(v) => onChange("pauta_activa", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>¿Requiere intervención?</Label>
                      <Switch
                        checked={!!data.requiere_interv}
                        onCheckedChange={(v) => onChange("requiere_interv", v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fase</Label>
                      <select
                        value={data.fase ? data.fase : "sin-fase"}
                        onChange={(e) =>
                          onChange(
                            "fase",
                            e.target.value === "sin-fase" ? "" : e.target.value,
                          )
                        }
                        className="w-full h-9 rounded-md border px-3 text-sm"
                      >
                        <option value="sin-fase">Sin fase</option>
                        <option value="Fase de testeo">Fase de testeo</option>
                        <option value="Fase de optimización">
                          Fase de optimización
                        </option>
                        <option value="Fase de Escala">Fase de Escala</option>
                      </select>
                      <div className="mt-2">
                        <Label>Subfase</Label>
                        <select
                          value={data.subfase ? data.subfase : "sin-subfase"}
                          onChange={(e) =>
                            onChange(
                              "subfase",
                              e.target.value === "sin-subfase"
                                ? ""
                                : e.target.value,
                            )
                          }
                          className="w-full h-9 rounded-md border px-3 text-sm"
                        >
                          <option value="sin-subfase">Sin subfase</option>
                          <option value="Copy/Ads">Copy/Ads</option>
                          <option value="Copy/VSL">Copy/VSL</option>
                          <option value="Copy/Página">Copy/Página</option>
                          <option value="Copy/Oferta">Copy/Oferta</option>
                          <option value="Técnica">Técnica</option>
                          <option value="Ads">Ads</option>
                        </select>
                        <div className="mt-2">
                          <Label>Trascendencia</Label>
                          <select
                            value={data.subfase_color || ""}
                            onChange={(e) =>
                              onChange("subfase_color", e.target.value)
                            }
                            className="w-full h-9 rounded-md border px-3 text-sm"
                          >
                            <option value="No aplica">No aplica</option>
                            <option value="Por definir">Por definir</option>
                            <option value="Realizado">Realizado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Coaches</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label>Coach de Copy</Label>
                      <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {coachCopyAssigned?.name || "—"}
                        </span>
                        {coachCopyAssigned?.area ? (
                          <Badge variant="secondary">
                            {String(coachCopyAssigned.area)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Coach Técnico</Label>
                      <div className="min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {coachAdsAssigned?.name || "—"}
                        </span>
                        {coachAdsAssigned?.area ? (
                          <Badge variant="secondary">
                            {String(coachAdsAssigned.area)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground">
                Rendimiento
              </div>
              <div>
                ROAS: <b>{view.roas ?? "—"}</b>
              </div>
              <div>
                Inversión: <b>{fmtMoney(data.inversion)}</b>
              </div>
              <div>
                Facturación: <b>{fmtMoney(data.facturacion)}</b>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">Embudo</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    Alcance: <b>{fmtNum(data.alcance)}</b>
                  </div>
                  <div>
                    Clics: <b>{fmtNum(data.clics)}</b>
                  </div>
                  <div>
                    Visitas: <b>{fmtNum(data.visitas)}</b>
                  </div>
                  <div>
                    Pagos: <b>{fmtNum(data.pagos)}</b>
                  </div>
                  <div className="col-span-2">
                    Carga pág: <b>{fmtPct(data.carga_pagina)}</b>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">
                  Efectividades
                </div>
                <div>
                  Ads: <b>{fmtPct(view.eff_ads)}</b>{" "}
                  <span className="text-[10px] text-muted-foreground">
                    ({view.eff_ads})
                  </span>
                </div>
                <div>
                  Pago iniciado: <b>{fmtPct(view.eff_pago)}</b>
                </div>
                <div>
                  Compra: <b>{fmtPct(view.eff_compra)}</b>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Compras
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["Carnada", data.compra_carnada],
                      ["B1", data.compra_bump1],
                      ["B2", data.compra_bump2],
                      ["O1", data.compra_oto1],
                      ["O2", data.compra_oto2],
                      ["Dn", data.compra_downsell],
                    ] as const
                  )
                    .filter(([, v]) => toNum(v) && toNum(v)! > 0)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded bg-muted px-2 py-1 text-xs"
                      >
                        {k}: {fmtNum(v)}
                      </span>
                    ))}
                  {!toNum(data.compra_carnada) &&
                    !toNum(data.compra_bump1) &&
                    !toNum(data.compra_bump2) &&
                    !toNum(data.compra_oto1) &&
                    !toNum(data.compra_oto2) &&
                    !toNum(data.compra_downsell) && (
                      <span className="text-sm text-muted-foreground">
                        Sin registros
                      </span>
                    )}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Estado y fase
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                      data.pauta_activa ? "border-border" : "border-border"
                    }`}
                  >
                    {data.pauta_activa ? "Pauta activa" : "Pauta inactiva"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      data.requiere_interv
                        ? "bg-rose-900/20 text-rose-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {data.requiere_interv
                      ? "Requiere intervención"
                      : "Sin intervención"}
                  </span>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-border">
                    {data.fase || "Sin fase"}
                  </span>
                  {data.subfase ? (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-background">
                      {data.subfase}
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground mb-2">
                  Coaches
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <div>
                    Copy: <b>{data.coach_copy || "—"}</b>
                  </div>
                  <div>
                    Técnico: <b>{data.coach_plat || "—"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              {isReadOnly
                ? "Datos cargados desde metadata del alumno."
                : "Guardado local automáticamente. “Guardar” crea la metadata del alumno si no existe; si ya existe, la actualiza (PUT /metadata/:id) y luego la vuelve a consultar por id."}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
