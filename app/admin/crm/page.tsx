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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { ReservationFormsManager } from "./components/ReservationFormsManager";
import { ProspectKanban } from "./components/ProspectKanban";
import { SchedulingWidget } from "./components/SchedulingWidget";
import { ProspectEditor } from "./components/ProspectEditor";
import { ProspectDetailDrawer } from "./components/ProspectDetailDrawer";
import { ProspectFilters } from "./components/ProspectFilters";
import { CrmTabsLayout } from "./components/TabsLayout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { crmService } from "@/lib/crm-service";
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
import { toast } from "@/components/ui/use-toast";
import { StageBadge } from "./components/StageBadge";

// Vista CRM: solo visual (sin llamadas a API). Basada en componentes existentes.
// Estructura: filtros + métricas + lista/kanban + drawer modal para detalle y crear prospecto.

function CrmContent() {
  type Prospect = {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    canal?: string;
    etapa: "Nuevo" | "Contactado" | "Calificado" | "Ganado" | "Perdido";
    owner?: string;
    pais?: string;
    ciudad?: string;
    tags?: string[];
    creado?: string;
    actualizado?: string;
    notas?: string;
  };

  const [rows, setRows] = useState<Prospect[]>([]);
  const reload = () => {
    const res = crmService.listProspects({});
    const mapped: Prospect[] = res.items.map((p: ProspectCore) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email || undefined,
      telefono: p.telefono || undefined,
      canal: p.canalFuente || undefined,
      etapa:
        p.etapaPipeline === "nuevo"
          ? "Nuevo"
          : p.etapaPipeline === "contactado"
          ? "Contactado"
          : p.etapaPipeline === "calificado" || p.etapaPipeline === "propuesta"
          ? "Calificado"
          : p.etapaPipeline === "ganado"
          ? "Ganado"
          : "Perdido",
      owner: p.ownerNombre || undefined,
      pais: p.pais || undefined,
      ciudad: p.ciudad || undefined,
      tags: p.tags || [],
      creado: p.creadoAt,
      actualizado: p.actualizadoAt,
      notas: p.notasResumen || undefined,
    }));
    setRows(mapped);
  };
  useEffect(() => {
    reload();
  }, []);

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("all");
  const [canalFiltro, setCanalFiltro] = useState<string>("all");
  const [ownerFiltro, setOwnerFiltro] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
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
        ? [p.nombre, p.email, p.telefono, p.owner]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q.toLowerCase()))
        : true;
      const byEtapa = etapaFiltro === "all" ? true : p.etapa === etapaFiltro;
      const byCanal = canalFiltro === "all" ? true : p.canal === canalFiltro;
      const byOwner = ownerFiltro === "all" ? true : p.owner === ownerFiltro;
      return hayQ && byEtapa && byCanal && byOwner;
    });
  }, [q, etapaFiltro, canalFiltro, ownerFiltro, rows]);

  const counts = useMemo(() => {
    const gm: CrmGlobalMetrics = computeGlobalMetrics();
    return {
      total: gm.totalProspects,
      byEtapa: {
        Nuevo: gm.byStage.nuevo,
        Contactado: gm.byStage.contactado,
        Calificado: gm.byStage.calificado + gm.byStage.propuesta,
        Ganado: gm.byStage.ganado,
        Perdido: gm.byStage.perdido,
      },
      conversionRate: gm.conversionRate,
    };
  }, [rows]);

  const sellerMetrics = useMemo<SellerMetricsResult>(() => {
    return computeSellerMetrics();
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
  const owners = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.owner).filter(Boolean))) as string[],
    [rows]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-br from-white via-orange-50/40 to-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-600" />
              CRM
            </h1>
            <p className="text-sm text-slate-600">
              Prospectos que luego serán alumnos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "lista" ? "default" : "outline"}
              size="sm"
              className={
                view === "lista"
                  ? "bg-orange-600 hover:bg-orange-700 text-white border-0"
                  : ""
              }
              onClick={() => setView("lista")}
            >
              Lista
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "outline"}
              size="sm"
              className={
                view === "kanban"
                  ? "bg-orange-600 hover:bg-orange-700 text-white border-0"
                  : ""
              }
              onClick={() => setView("kanban")}
            >
              Kanban
            </Button>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Cierre de venta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registrar cierre de venta</DialogTitle>
                </DialogHeader>
                <CrmCloseSaleForm
                  onDone={() => {
                    setOpenCreate(false);
                    reload();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      {/* Contenido en pestañas */}
      <div className="flex-1 overflow-hidden p-6 bg-gradient-to-b from-white to-slate-50">
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
              {view === "lista" ? (
                <div className="rounded-xl border bg-white">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-slate-500 border-b">
                    <div className="col-span-3">Prospecto</div>
                    <div className="col-span-2">Contacto</div>
                    <div className="col-span-2">Canal</div>
                    <div className="col-span-2">Etapa</div>
                    <div className="col-span-2">Owner</div>
                    <div className="col-span-1 text-right">Acciones</div>
                  </div>
                  <div>
                    {filtrados.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-orange-50/40"
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="font-medium truncate">{p.nombre}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {p.pais} {p.ciudad ? `· ${p.ciudad}` : ""}
                          </div>
                        </div>
                        <div className="col-span-2 min-w-0 text-sm">
                          <div className="truncate flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {p.email || "—"}
                          </div>
                          <div className="truncate flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {p.telefono || "—"}
                          </div>
                        </div>
                        <div className="col-span-2 text-sm">
                          {p.canal || "—"}
                        </div>
                        <div className="col-span-2">
                          <StageBadge stage={p.etapa} />
                        </div>
                        <div className="col-span-2 text-sm">
                          {p.owner || "—"}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDrawerId(p.id)}
                          >
                            Detalle
                          </Button>
                        </div>
                      </div>
                    ))}
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
                    ownerNombre: p.owner,
                    etapa: p.etapa,
                  }))}
                  onOpenDetail={(p) => setDrawerId(p.id)}
                  onMoved={() => reload()}
                />
              )}
            </div>
          }
          agenda={<SchedulingWidget />}
          forms={<ReservationFormsManager />}
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
              <MetricsOverview gm={computeGlobalMetrics()} />
              <SellerMetricsTable data={sellerMetrics} />
              <MetricsTabs />
            </div>
          }
        />
      </div>

      {/* Drawer de detalle */}
      <ProspectDetailDrawer
        open={!!drawerId}
        onOpenChange={(v) => !v && setDrawerId(null)}
        prospectId={drawerId || undefined}
        onSaved={() => reload()}
      />
    </div>
  );
}

export default function CrmPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <CrmContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Formulario cierre de venta
function CrmCloseSaleForm({ onDone }: { onDone: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [programa, setPrograma] = useState("");
  const [bonos, setBonos] = useState("");
  const [modalidad, setModalidad] = useState("contado");
  const [monto, setMonto] = useState(0);
  const [moneda, setMoneda] = useState("USD");
  const [plataforma, setPlataforma] = useState("");
  const [primeraCuota, setPrimeraCuota] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const base = crmService.createProspect({
        nombre,
        email,
        telefono,
        etapaPipeline: "nuevo",
      });
      crmService.updateProspect(base.id, {
        canalFuente: "Venta",
        notasResumen: "Cierre registrado",
      });
      const cuotas =
        modalidad === "cuotas" && primeraCuota
          ? [{ monto: monto, dueAt: new Date(primeraCuota).toISOString() }]
          : [];
      crmService.closeSale(base.id, {
        programa,
        modalidadPago: modalidad,
        montoTotal: monto,
        moneda,
        plataformaPago: plataforma,
        bonosOfrecidos: bonos
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        cuotas,
      });
      toast({ title: "Cierre registrado", description: nombre });
      onDone();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo registrar" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Nombre completo</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Correo</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Teléfono</Label>
        <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Programa adquirido</Label>
        <Input value={programa} onChange={(e) => setPrograma(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Bonos ofrecidos</Label>
        <Input
          value={bonos}
          onChange={(e) => setBonos(e.target.value)}
          placeholder="Separar por comas"
        />
      </div>
      <div className="space-y-2">
        <Label>Modalidad pago</Label>
        <Input
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          placeholder="contado | cuotas"
        />
      </div>
      <div className="space-y-2">
        <Label>Monto total</Label>
        <Input
          type="number"
          value={monto}
          onChange={(e) => setMonto(parseFloat(e.target.value || "0"))}
        />
      </div>
      <div className="space-y-2">
        <Label>Moneda</Label>
        <Input value={moneda} onChange={(e) => setMoneda(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Plataforma pago</Label>
        <Input
          value={plataforma}
          onChange={(e) => setPlataforma(e.target.value)}
          placeholder="Hotmart / PayPal"
        />
      </div>
      <div className="space-y-2">
        <Label>Fecha 1ra cuota (si aplica)</Label>
        <Input
          type="date"
          value={primeraCuota}
          onChange={(e) => setPrimeraCuota(e.target.value)}
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          onClick={submit}
          disabled={loading || !nombre || !programa || !plataforma}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar
        </Button>
      </div>
    </div>
  );
}
