"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  Users,
  UserPlus,
  Calendar,
  Tags,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  X,
  Loader2,
  List,
  LayoutGrid,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProspectKanban } from "./components/ProspectKanban";
import { ProspectEditor } from "./components/ProspectEditor";
// Detalle por modal deshabilitado; ahora usamos una vista dedicada /admin/crm/booking/[id]
import { ProspectFilters } from "./components/ProspectFilters";
import { CrmTabsLayout } from "./components/TabsLayout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type {
  ProspectCore,
  CrmGlobalMetrics,
  SellerMetricsResult,
} from "@/lib/crm-types";
import { computeGlobalMetrics, computeSellerMetrics } from "@/lib/crm-metrics";
import { MetricsOverview } from "./components/MetricsOverview";
import { SellerMetricsTable } from "./components/SellerMetricsTable";
import { MetricsTabs } from "./components/MetricsTabs";
import { crmAutomations } from "@/lib/crm-service";
import { listLeads, updateLead, type Lead } from "./api";
import { toast } from "@/components/ui/use-toast";
import { StageBadge } from "./components/StageBadge";
import { CloseSaleForm } from "./components/CloseSaleForm2";
import { SalesPersonalMetrics } from "./components/SalesPersonalMetrics";
import { useRouter } from "next/navigation";
import { CreateLeadDialog } from "./components/CreateLeadDialog";
import { DeleteLeadConfirmDialog } from "./components/DeleteLeadConfirmDialog";
import { EventsOriginsManager } from "./components/EventsOriginsManager";

function CrmContent() {
  const router = useRouter();
  type Prospect = {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    canal?: string;
    etapa: "Nuevo" | "Contactado" | "Calificado" | "Ganado" | "Perdido";
    pais?: string;
    ciudad?: string;
    tags?: string[];
    creado?: string;
    actualizado?: string;
    notas?: string;
    remote?: boolean; // viene de API real (metadata)
    saleStatus?: string;
  };

  const [rows, setRows] = useState<Prospect[]>([]);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);

  const mapLeadStatusToEtapa = (status?: string) => {
    const s = (status || "new").toLowerCase();
    if (s === "new") return "Nuevo";
    if (s === "contacted") return "Contactado";
    if (s === "qualified") return "Calificado";
    if (s === "won") return "Ganado";
    if (s === "lost") return "Perdido";
    return "Nuevo";
  };

  const mapEtapaToLeadStatus = (etapa?: string) => {
    const e = String(etapa || "").toLowerCase();
    if (e === "nuevo") return "new";
    if (e === "contactado") return "contacted";
    if (e === "calificado") return "qualified";
    if (e === "ganado") return "won";
    if (e === "perdido") return "lost";
    return "new";
  };

  // Eliminado: ya no usamos submissions locales vía localStorage.

  const reload = async () => {
    // Cargar leads desde /v1/leads
    try {
      const { items } = await listLeads({ page: 1, pageSize: 500 });
      const mapped: Prospect[] = items.map((l: Lead) => ({
        id: l.codigo,
        nombre: l.name,
        email: l.email || undefined,
        telefono: l.phone || undefined,
        canal: l.source || undefined,
        etapa: mapLeadStatusToEtapa(l.status),
        creado: l.created_at || undefined,
        actualizado: l.updated_at || undefined,
        remote: true,
        saleStatus: undefined,
      }));
      setRows(mapped);
      return;
    } catch (e) {
      console.warn("listLeads falló, mostrando lista vacía", e);
      setRows([]);
      toast({
        title: "Error cargando leads",
        description: "El endpoint /v1/leads falló.",
        variant: "destructive",
      });
      return;
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("all");
  const [canalFiltro, setCanalFiltro] = useState<string>("all");
  // Owner eliminado de la tabla; mantenemos estado por compatibilidad UI pero podría retirarse luego.
  const [ownerFiltro, setOwnerFiltro] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  // Drawer eliminado en favor de ruta dedicada
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  const etapas: Prospect["etapa"][] = [
    "Nuevo",
    "Contactado",
    "Calificado",
    "Ganado",
    "Perdido",
  ];

  const filtrados = useMemo(() => {
    return rows.filter((p) => {
      const hayQ = q.trim()
        ? [p.nombre, p.email, p.telefono]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q.toLowerCase()))
        : true;
      const byEtapa = etapaFiltro === "all" ? true : p.etapa === etapaFiltro;
      const byCanal = canalFiltro === "all" ? true : p.canal === canalFiltro;
      return hayQ && byEtapa && byCanal; // Owner filtrado removido
    });
  }, [q, etapaFiltro, canalFiltro, ownerFiltro, rows]);

  // Métricas desde rows (metadata) en vez de mock
  const gmFromRows = useMemo<CrmGlobalMetrics>(() => {
    const byStage = {
      nuevo: 0,
      contactado: 0,
      calificado: 0,
      propuesta: 0,
      ganado: 0,
      perdido: 0,
    } as CrmGlobalMetrics["byStage"];
    for (const r of rows) {
      const etapa = r.etapa;
      if (etapa === "Nuevo") byStage.nuevo++;
      else if (etapa === "Contactado") byStage.contactado++;
      else if (etapa === "Calificado") byStage.calificado++;
      else if (etapa === "Ganado") byStage.ganado++;
      else if (etapa === "Perdido") byStage.perdido++;
    }
    const totalProspects = rows.length;
    const won = byStage.ganado;
    const lost = byStage.perdido;
    const contacted =
      byStage.contactado + byStage.calificado + byStage.propuesta + won + lost;
    const conversionRate = totalProspects ? won / totalProspects : 0;
    return { totalProspects, byStage, won, lost, contacted, conversionRate };
  }, [rows]);

  const sellerMetrics = useMemo<SellerMetricsResult>(() => {
    const map = new Map<
      string,
      {
        ownerId: string | null;
        ownerNombre: string;
        total: number;
        contacted: number;
        qualified: number;
        won: number;
        lost: number;
      }
    >();
    for (const r of rows) {
      const key = "(Sin owner)";
      if (!map.has(key))
        map.set(key, {
          ownerId: null,
          ownerNombre: key,
          total: 0,
          contacted: 0,
          qualified: 0,
          won: 0,
          lost: 0,
        });
      const row = map.get(key)!;
      row.total++;
      if (r.etapa !== "Nuevo") row.contacted++;
      if (r.etapa === "Calificado") row.qualified++;
      if (r.etapa === "Ganado") row.won++;
      if (r.etapa === "Perdido") row.lost++;
    }
    return { rows: Array.from(map.values()), totalOwners: map.size };
  }, [rows]);

  const normalizeUrl = (s?: string) => {
    const str = String(s || "").trim();
    if (!str) return "";
    return str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  };

  const canales = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.canal).filter(Boolean))) as string[],
    [rows]
  );
  const owners: string[] = []; // Owner eliminado

  const saleStatusClass = (s?: string) => {
    const v = String(s || "").toLowerCase();
    if (["active", "contract_signed", "payment_confirmed"].includes(v))
      return "bg-emerald-100 text-emerald-700";
    if (
      [
        "contract_sent",
        "payment_verification_pending",
        "active_provisional",
      ].includes(v)
    )
      return "bg-amber-100 text-amber-700";
    if (["operational_closure", "cancelled", "lost"].includes(v))
      return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-600" />{" "}
              CRM
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CreateLeadDialog onCreated={reload} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-white">
        <CrmTabsLayout
          value={activeTab}
          onValueChange={setActiveTab}
          pipeline={
            <div className="flex flex-col gap-4 h-full">
              <ProspectFilters
                q={q}
                setQ={setQ}
                etapa={etapaFiltro}
                setEtapa={setEtapaFiltro}
                canal={canalFiltro}
                setCanal={setCanalFiltro}
                owner={ownerFiltro}
                setOwner={setOwnerFiltro}
                etapas={etapas}
                canales={canales}
                owners={owners}
                onClear={() => {
                  setQ("");
                  setEtapaFiltro("all");
                  setCanalFiltro("all");
                  setOwnerFiltro("all");
                }}
              />
              {/* Toggle de vista compacto con iconos, arriba a la derecha */}
              <div className="flex items-center justify-end -mt-2">
                <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setView("lista")}
                    className={`px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 ${
                      view === "lista"
                        ? "bg-indigo-600 text-white hover:bg-indigo-600"
                        : ""
                    }`}
                    title="Vista de lista"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("kanban")}
                    className={`px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 border-l border-slate-200 ${
                      view === "kanban"
                        ? "bg-indigo-600 text-white hover:bg-indigo-600"
                        : ""
                    }`}
                    title="Vista Kanban"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {view === "lista" ? (
                <div className="rounded-xl border bg-white">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-slate-600 border-b bg-slate-50/50">
                    <div className="col-span-3">Prospecto</div>
                    <div className="col-span-2">Contacto</div>
                    <div className="col-span-2">Canal</div>
                    <div className="col-span-2">Etapa</div>
                    <div className="col-span-1">Venta</div>
                    <div className="col-span-2 text-right">Acción</div>
                  </div>
                  <div>
                    {filtrados.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No hay leads para mostrar
                      </div>
                    ) : (
                      filtrados.map((p) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-indigo-50/40 transition-colors"
                        >
                          <div className="col-span-3 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium truncate text-slate-800"
                                title={p.nombre}
                              >
                                {p.nombre}
                              </span>
                              {p.remote && (
                                <span
                                  className="inline-flex items-center rounded-md bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium"
                                  title="Lead remoto API"
                                >
                                  API
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.pais || ""} {p.ciudad ? `· ${p.ciudad}` : ""}
                            </div>
                          </div>
                          <div className="col-span-2 min-w-0 text-xs">
                            <div className="truncate flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{p.email || "—"}</span>
                            </div>
                            <div className="truncate flex items-center gap-1 mt-0.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">
                                {p.telefono || "—"}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2 text-xs flex items-center">
                            {p.canal || (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <select
                              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none"
                              value={p.etapa}
                              disabled={stageUpdatingId === p.id}
                              onChange={async (e) => {
                                const nextEtapa = e.target.value;
                                const prevEtapa = p.etapa;
                                setStageUpdatingId(p.id);
                                // Optimista: reflejar cambio sin recargar
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.id === p.id
                                      ? { ...r, etapa: nextEtapa as any }
                                      : r
                                  )
                                );
                                try {
                                  await updateLead(p.id, {
                                    status: mapEtapaToLeadStatus(nextEtapa),
                                  });
                                  toast({
                                    title: "Etapa actualizada",
                                    description: `${p.nombre} → ${nextEtapa}`,
                                  });
                                } catch (err) {
                                  // rollback
                                  setRows((prev) =>
                                    prev.map((r) =>
                                      r.id === p.id
                                        ? { ...r, etapa: prevEtapa as any }
                                        : r
                                    )
                                  );
                                  toast({
                                    title: "Error",
                                    description:
                                      "No se pudo actualizar la etapa",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setStageUpdatingId(null);
                                }
                              }}
                              title="Cambiar etapa"
                            >
                              {etapas.map((e) => (
                                <option key={e} value={e}>
                                  {e}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1 flex items-center">
                            {p.saleStatus ? (
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${saleStatusClass(
                                  p.saleStatus
                                )}`}
                                title={p.saleStatus}
                              >
                                {p.saleStatus}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/crm/booking/${encodeURIComponent(
                                  p.id
                                )}`}
                                aria-label={`Ver detalle de ${p.nombre}`}
                                title="Ver detalle"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                aria-label={`Eliminar lead ${p.nombre}`}
                                title="Eliminar lead"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: p.id,
                                    nombre: p.nombre,
                                  })
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <ProspectKanban
                  items={filtrados.map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    email: p.email,
                    telefono: p.telefono,
                    canalFuente: p.canal,
                    ownerNombre: undefined,
                    etapa: p.etapa,
                    saleStatus: p.saleStatus,
                  }))}
                  onOpenDetail={(p) =>
                    router.push(
                      `/admin/crm/booking/${encodeURIComponent(p.id)}`
                    )
                  }
                  onMoved={() => reload()}
                  onStageChange={async (id, newStage) => {
                    // Mapear la etapa del Kanban (pipeline) al status del lead
                    const statusMap: Record<string, string> = {
                      nuevo: "new",
                      contactado: "contacted",
                      calificado: "qualified",
                      ganado: "won",
                      perdido: "lost",
                    };
                    const newStatus = statusMap[newStage] || "new";
                    try {
                      const row = rows.find((r) => r.id === id);
                      await updateLead(id, { status: newStatus });
                      toast({
                        title: "Etapa actualizada",
                        description: `${row?.nombre || id} → ${newStage}`,
                      });
                      reload();
                    } catch {
                      toast({
                        title: "Error",
                        description: "No se pudo actualizar la etapa",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}
            </div>
          }
          metrics={
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Panel de métricas</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    crmAutomations.runAutomationsDaily();
                    reload();
                  }}
                >
                  Ejecutar automatizaciones
                </Button>
              </div>
              <MetricsOverview gm={gmFromRows} />
              <SellerMetricsTable data={sellerMetrics} />
              <MetricsTabs
                items={rows.map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  email: p.email || null,
                  telefono: p.telefono || null,
                  canalFuente: p.canal || null,
                  etapaPipeline:
                    p.etapa === "Nuevo"
                      ? "nuevo"
                      : p.etapa === "Contactado"
                      ? "contactado"
                      : p.etapa === "Calificado"
                      ? "calificado"
                      : p.etapa === "Ganado"
                      ? "ganado"
                      : "perdido",
                  ownerId: null,
                  ownerNombre: "(Sin owner)",
                  pais: null,
                  ciudad: null,
                  tags: [],
                  score: null,
                  notasResumen: null,
                  creadoAt: p.creado || new Date().toISOString(),
                  actualizadoAt:
                    p.actualizado || p.creado || new Date().toISOString(),
                  nextActionAt: null,
                  origenCampaignId: null,
                  convertedStudentId: null,
                  fechaConversion: null,
                }))}
              />
              <SalesPersonalMetrics />
            </div>
          }
          campanas={
            <div className="h-full">
              <EventsOriginsManager />
            </div>
          }
        />
      </div>

      {/* Drawer deshabilitado */}

      <DeleteLeadConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        leadCodigo={deleteTarget?.id || ""}
        leadName={deleteTarget?.nombre || ""}
        onDeleted={reload}
      />
    </div>
  );
}

export default function CrmPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <CrmContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
