"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { listMetadata, type MetadataRecord } from "@/lib/metadata";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";

/* ─── Mapa de entidades conocidas → módulo ───────────────────── */
const MODULE_MAP: Record<string, { label: string; url?: string }> = {
  ads_metrics: { label: "Métricas de Publicidad", url: "/admin/alumnos" },
  agente_uso_soporte_atc: {
    label: "Agente IA – Soporte ATC",
    url: "/admin/agentes",
  },
  agente_uso_alumno: { label: "Agente IA – Alumno", url: "/admin/agentes" },
  agente_uso_coach: { label: "Agente IA – Coach", url: "/admin/agentes" },
  business_metrics_state: {
    label: "Métricas de Negocio",
    url: "/admin/metricas-negocio",
  },
  nota_interna_etiqueta: {
    label: "Etiquetas Notas Tickets",
    url: "/admin/tickets-board/notas-internas",
  },
  coach_transfer_audit: {
    label: "Auditoría Transferencia Coach",
    url: "/admin/teamsv2",
  },
  crm_lead_detail: { label: "Detalle Lead CRM", url: "/admin/crm" },
  sale: { label: "Cierre de Venta CRM", url: "/admin/crm" },
  alumno_acceso_extension_membresia: {
    label: "Extensión Acceso Membresía",
    url: "/admin/alumnos",
  },
  alumno_acceso_vence_estimado: {
    label: "Vencimiento Estimado Acceso",
    url: "/admin/alumnos",
  },
  plantillas_mails: {
    label: "Plantillas de Mails",
    url: "/admin/plantillas-mails",
  },
  mensajes_seguimiento: {
    label: "Mensajes de Seguimiento",
    url: "/admin/mensajes-seguimiento",
  },
  preguntas_frecuentes: {
    label: "Preguntas Frecuentes",
    url: "/admin/preguntas-frecuentes",
  },
  plantillas_contratos: {
    label: "Plantillas de Contratos",
    url: "/admin/plantillas-contratos",
  },
  student_extra_docs: {
    label: "Documentos Extra Alumno",
    url: "/admin/alumnos",
  },
  student_profile_data: {
    label: "Perfil / Encuesta Alumno",
    url: "/admin/alumnos",
  },
  soporte_atc_knowledge_base: {
    label: "Base Conocimiento Agente ATC",
    url: "/admin/agentes",
  },
};

function moduleLabel(entity: string) {
  return MODULE_MAP[entity]?.label ?? entity;
}

function moduleUrl(entity: string) {
  return MODULE_MAP[entity]?.url;
}

function formatDateShort(d?: string | null) {
  if (!d) return "-";
  const p = new Date(d);
  if (Number.isNaN(p.getTime())) return "-";
  return p.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateFull(d?: string | null) {
  if (!d) return "-";
  const p = new Date(d);
  if (Number.isNaN(p.getTime())) return "-";
  return p.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function payloadPreview(payload: unknown, maxLen = 90): string {
  if (payload === null || payload === undefined) return "-";
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

/**
 * Extrae pistas de origen desde el payload para identificar
 * qué módulo/vista creó el registro (útil para entity=null).
 */
function payloadSourceHints(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];
  const p = payload as Record<string, unknown>;
  const hints: string[] = [];

  const str = (v: unknown) => (v != null ? String(v).trim() : "");

  const view = str(p._view);
  if (view) hints.push(`📍 ${view}`);

  const tag = str(p._tag);
  if (tag && tag !== view) hints.push(`🏷 ${tag}`);

  const source = str(p.source ?? p.module ?? p.tipo ?? p.type);
  if (source) hints.push(`🔖 ${source}`);

  const alumno = str(p.alumno_codigo ?? p.alumno_id ?? p.student_code);
  if (alumno) hints.push(`👤 ${alumno}`);

  const ticket = str(p.ticket_codigo ?? p.ticket_id);
  if (ticket) hints.push(`🎫 ${ticket}`);

  return hints;
}

const DETAIL_PAGE_SIZE = 25;

/* ─── Visor JSON con colores de sintaxis ─────────────────────── */
function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const indent = depth * 16;

  if (value === null)
    return <span className="text-rose-400">null</span>;
  if (typeof value === "boolean")
    return (
      <span className="text-orange-400 font-semibold">
        {value ? "true" : "false"}
      </span>
    );
  if (typeof value === "number")
    return <span className="text-amber-500">{value}</span>;
  if (typeof value === "string")
    return (
      <span className="text-emerald-500">
        &quot;{value}&quot;
      </span>
    );

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">[]</span>;
    return (
      <span>
        <span className="text-slate-400">[</span>
        {value.map((item, i) => (
          <div key={i} style={{ paddingLeft: indent + 16 }}>
            <JsonNode value={item} depth={depth + 1} />
            {i < value.length - 1 && (
              <span className="text-slate-400">,</span>
            )}
          </div>
        ))}
        <div style={{ paddingLeft: indent }}>
          <span className="text-slate-400">]</span>
        </div>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0)
      return <span className="text-slate-400">{"{}"}</span>;
    return (
      <span>
        <span className="text-slate-400">{"{"}}</span>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ paddingLeft: indent + 16 }}>
            <span className="text-indigo-400 font-medium">&quot;{k}&quot;</span>
            <span className="text-slate-400">: </span>
            <JsonNode value={v} depth={depth + 1} />
            {i < entries.length - 1 && (
              <span className="text-slate-400">,</span>
            )}
          </div>
        ))}
        <div style={{ paddingLeft: indent }}>
          <span className="text-slate-400">{"}"}"</span>
        </div>
      </span>
    );
  }

  return <span className="text-slate-300">{String(value)}</span>;
}

interface EntityGroup {
  entity: string;
  count: number;
  lastDate: string | null;
  records: MetadataRecord[];
}

/* ─── Contenido ──────────────────────────────────────────────── */
function MetadataAnalyticsContent() {
  const [allRecords, setAllRecords] = useState<MetadataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMetadata();
      setAllRecords(res.items ?? []);
      setLoadedAt(new Date());
    } catch {
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setDetailPage(1);
    setExpandedRecordId(null);
  }, [selectedEntity]);

  /* Agrupar por entidad, ordenar por count desc */
  const groups = useMemo<EntityGroup[]>(() => {
    const map = new Map<string, MetadataRecord[]>();
    for (const r of allRecords) {
      const key = String(r.entity ?? "sin_entidad");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .map(([entity, records]) => {
        const lastDate =
          records
            .map((r) => r.created_at ?? r.updated_at ?? null)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null;
        return { entity, count: records.length, lastDate, records };
      })
      .sort((a, b) => b.count - a.count);
  }, [allRecords]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.entity.toLowerCase().includes(q) ||
        moduleLabel(g.entity).toLowerCase().includes(q),
    );
  }, [groups, search]);

  const totalRecords = allRecords.length;
  const totalEntities = groups.length;
  const topEntity = groups[0];
  const lastRecord = allRecords
    .map((r) => r.created_at ?? r.updated_at ?? "")
    .filter(Boolean)
    .sort()
    .at(-1);

  const selectedGroup = groups.find((g) => g.entity === selectedEntity);
  const detailRecords = selectedGroup?.records ?? [];
  const totalDetailPages = Math.max(
    1,
    Math.ceil(detailRecords.length / DETAIL_PAGE_SIZE),
  );
  const pagedDetailRecords = detailRecords.slice(
    (detailPage - 1) * DETAIL_PAGE_SIZE,
    detailPage * DETAIL_PAGE_SIZE,
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-600" />
            Monitor Metadata API
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Uso del endpoint <code className="text-xs">/v1/metadata</code> por
            módulo — solo lectura.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loadedAt && (
            <span>
              Actualizado:{" "}
              {loadedAt.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5">Recargar</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-indigo-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total registros
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-indigo-700">
              {loading ? "…" : totalRecords.toLocaleString("es-ES")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Entidades únicas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-violet-700">
              {loading ? "…" : totalEntities}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mayor uso
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading || !topEntity ? (
              <p className="text-sm text-slate-400">…</p>
            ) : (
              <>
                <p
                  className="text-base font-bold text-amber-700 truncate"
                  title={moduleLabel(topEntity.entity)}
                >
                  {moduleLabel(topEntity.entity)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {topEntity.count.toLocaleString("es-ES")} registros
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Último registro
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm font-semibold text-emerald-700">
              {loading ? "…" : formatDateShort(lastRecord)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla + panel detalle */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_460px]">
        {/* Tabla de entidades */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Uso por entidad
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar…"
                  className="h-8 pl-8 text-xs w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Spinner className="h-5 w-5" />
                Cargando registros…
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Sin resultados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[2fr_3fr_80px_72px_110px] gap-2 border-b bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <div>Entidad</div>
                  <div>Módulo</div>
                  <div className="text-right">Registros</div>
                  <div className="text-right">% Total</div>
                  <div className="text-right">Último</div>
                </div>
                {filteredGroups.map((g, idx) => {
                  const pct =
                    totalRecords > 0
                      ? ((g.count / totalRecords) * 100).toFixed(1)
                      : "0";
                  const isSelected = selectedEntity === g.entity;
                  const url = moduleUrl(g.entity);
                  return (
                    <button
                      key={g.entity}
                      type="button"
                      onClick={() =>
                        setSelectedEntity((prev) =>
                          prev === g.entity ? null : g.entity,
                        )
                      }
                      className={[
                        "grid w-full grid-cols-[2fr_3fr_80px_72px_110px] gap-2 border-b px-4 py-2.5 text-left text-xs transition-colors last:border-0",
                        isSelected
                          ? "bg-indigo-50 border-l-2 border-l-indigo-400"
                          : idx % 2 === 0
                            ? "bg-white hover:bg-slate-50"
                            : "bg-slate-50/50 hover:bg-slate-100/60",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={[
                            "shrink-0 inline-block h-2 w-2 rounded-full",
                            isSelected ? "bg-indigo-500" : "bg-slate-300",
                          ].join(" ")}
                        />
                        <code
                          className="truncate text-[10px] text-slate-600"
                          title={g.entity}
                        >
                          {g.entity}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate font-medium text-slate-800">
                          {moduleLabel(g.entity)}
                        </span>
                        {url && (
                          <Link
                            href={url}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-slate-400 hover:text-indigo-600"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <div className="text-right font-bold text-indigo-700">
                        {g.count.toLocaleString("es-ES")}
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {pct}%
                        </Badge>
                      </div>
                      <div className="text-right text-slate-500">
                        {formatDateShort(g.lastDate)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel detalle de entidad seleccionada */}
        {selectedEntity && selectedGroup ? (
          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="truncate">
                      {moduleLabel(selectedEntity)}
                    </span>
                  </CardTitle>
                  <code className="text-[10px] text-slate-500 mt-0.5 block truncate">
                    {selectedEntity}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedGroup.count.toLocaleString("es-ES")} registros
                    totales
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => setSelectedEntity(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pagedDetailRecords.map((r) => {
                  const isExpanded = expandedRecordId === String(r.id);
                  return (
                    <div key={String(r.id)} className="px-4 py-3">
                      {/* Cabecera del registro */}
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() =>
                          setExpandedRecordId((prev) =>
                            prev === String(r.id) ? null : String(r.id),
                          )
                        }
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-slate-400">
                              #{String(r.id)}
                            </span>
                            <span className="text-xs font-medium text-slate-700 truncate">
                              {r.entity_id || "-"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateFull(r.created_at ?? r.updated_at)}
                          </div>
                          {/* Pistas de origen desde el payload */}
                          {payloadSourceHints(r.payload).map((hint) => (
                            <span
                              key={hint}
                              className="inline-block rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-700 mr-1"
                            >
                              {hint}
                            </span>
                          ))}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        )}
                      </button>

                      {/* Payload expandido */}
                      {isExpanded && (
                        <div className="mt-2 rounded-md bg-slate-950 px-4 py-3 text-xs leading-5 overflow-x-auto">
                          <JsonNode value={r.payload} />
                        </div>
                      )}

                      {/* Preview cuando está colapsado */}
                      {!isExpanded && (
                        <p
                          className="mt-1 truncate text-[10px] text-slate-400"
                          title={
                            typeof r.payload === "object"
                              ? JSON.stringify(r.payload)
                              : String(r.payload)
                          }
                        >
                          {payloadPreview(r.payload, 70)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {totalDetailPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-[11px] text-slate-500">
                    Pág. {detailPage} / {totalDetailPages} (
                    {detailRecords.length.toLocaleString("es-ES")} registros)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={detailPage <= 1}
                      onClick={() => setDetailPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={detailPage >= totalDetailPages}
                      onClick={() => setDetailPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="hidden xl:flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 min-h-40">
            Selecciona una entidad para ver sus registros
          </div>
        )}
      </div>
    </div>
  );
}

export default function MetadataAnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <MetadataAnalyticsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
