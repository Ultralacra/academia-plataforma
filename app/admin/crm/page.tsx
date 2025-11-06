"use client";

import { useMemo, useState } from "react";
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
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Vista CRM: solo visual (sin llamadas a API). Basada en componentes existentes.
// Estructura: filtros + métricas + lista/kanban + drawer modal para detalle y crear prospecto.

function CrmContent() {
  type Prospect = {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    canal?: string; // Ej: Facebook, Landing, Referido
    etapa: "Nuevo" | "Contactado" | "Calificado" | "Ganado" | "Perdido";
    owner?: string; // Coach o asesor
    pais?: string;
    ciudad?: string;
    tags?: string[];
    creado?: string; // ISO date
    actualizado?: string; // ISO date
    notas?: string;
    links?: string[];
  };

  const sample: Prospect[] = [
    {
      id: "p1",
      nombre: "Juan Pérez",
      email: "juan@example.com",
      telefono: "+51 999 111 222",
      canal: "Facebook",
      etapa: "Nuevo",
      owner: "Coach A",
      pais: "Perú",
      ciudad: "Lima",
      tags: ["FB-ads", "Prospecto"],
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      notas: "Interesado en plan Premium. Llamar por la tarde.",
      links: ["https://facebook.com/juan", "www.linkedin.com/in/juan"],
    },
    {
      id: "p2",
      nombre: "María López",
      email: "maria@example.com",
      telefono: "+57 300 123 4567",
      canal: "Landing",
      etapa: "Contactado",
      owner: "Coach B",
      pais: "Colombia",
      ciudad: "Medellín",
      tags: ["landing", "email"],
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      notas: "Pidió información de becas.",
      links: ["https://maria.blog", "example.com/form"],
    },
  ];

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("");
  const [canalFiltro, setCanalFiltro] = useState<string>("");
  const [ownerFiltro, setOwnerFiltro] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState<Prospect | null>(null);

  const etapas: Prospect["etapa"][] = [
    "Nuevo",
    "Contactado",
    "Calificado",
    "Ganado",
    "Perdido",
  ];

  const filtrados = useMemo(() => {
    return sample.filter((p) => {
      const hayQ = q.trim()
        ? [p.nombre, p.email, p.telefono, p.owner]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q.toLowerCase()))
        : true;
      const byEtapa = etapaFiltro ? p.etapa === etapaFiltro : true;
      const byCanal = canalFiltro ? p.canal === canalFiltro : true;
      const byOwner = ownerFiltro ? p.owner === ownerFiltro : true;
      return hayQ && byEtapa && byCanal && byOwner;
    });
  }, [q, etapaFiltro, canalFiltro, ownerFiltro]);

  const counts = useMemo(() => {
    const total = sample.length;
    const byEtapa: Record<string, number> = {};
    etapas.forEach(
      (e) => (byEtapa[e] = sample.filter((p) => p.etapa === e).length)
    );
    return { total, byEtapa };
  }, []);

  const normalizeUrl = (s?: string) => {
    const str = String(s || "").trim();
    if (!str) return "";
    return str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
            <p className="text-sm text-slate-600">
              Prospectos que luego serán alumnos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "lista" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("lista")}
            >
              Lista
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              Kanban
            </Button>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo prospecto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo prospecto</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input placeholder="Nombre completo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="correo@dominio.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input placeholder="+51..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Input placeholder="Facebook, Landing, Referido..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Input placeholder="Coach/asesor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input placeholder="País / Ciudad" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      placeholder="Comentarios y próximos pasos..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardar (demo)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Buscar nombre/email/teléfono..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Input
            className="h-10"
            placeholder="Filtrar por etapa"
            value={etapaFiltro}
            onChange={(e) => setEtapaFiltro(e.target.value)}
          />
          <Input
            className="h-10"
            placeholder="Filtrar por canal"
            value={canalFiltro}
            onChange={(e) => setCanalFiltro(e.target.value)}
          />
          <Input
            className="h-10"
            placeholder="Filtrar por owner"
            value={ownerFiltro}
            onChange={(e) => setOwnerFiltro(e.target.value)}
          />
        </div>

        {/* KPIs rápidos */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-2xl font-semibold">{counts.total}</div>
          </Card>
          {etapas.map((e) => (
            <Card key={e} className="p-4">
              <div className="text-xs text-slate-500">{e}</div>
              <div className="text-xl font-semibold">{counts.byEtapa[e]}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
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
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-slate-50"
                >
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium truncate">{p.nombre}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.pais} {p.ciudad ? `· ${p.ciudad}` : ""}
                    </div>
                    {p.tags?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.tags.slice(0, 4).map((t, i) => (
                          <Badge
                            key={`${t}-${i}`}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
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
                  <div className="col-span-2 text-sm">{p.canal || "—"}</div>
                  <div className="col-span-2">
                    <Badge variant="outline">{p.etapa}</Badge>
                  </div>
                  <div className="col-span-2 text-sm">{p.owner || "—"}</div>
                  <div className="col-span-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenDetail(p)}
                    >
                      Detalle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {etapas.map((col) => {
              const items = filtrados.filter((p) => p.etapa === col);
              return (
                <div
                  key={col}
                  className="flex flex-col rounded-xl border bg-white min-h-[300px]"
                >
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-medium">
                        {col}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {items.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 p-3">
                    {items.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4
                            className="flex-1 text-sm font-medium text-slate-900 line-clamp-2"
                            title={p.nombre}
                          >
                            {p.nombre}
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setOpenDetail(p)}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{p.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">
                              {p.telefono || "—"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                              {p.canal || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalle modal */}
      <Dialog
        open={!!openDetail}
        onOpenChange={(v) => !v && setOpenDetail(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de prospecto</DialogTitle>
          </DialogHeader>
          {openDetail && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-base font-semibold">
                  {openDetail.nombre}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {openDetail.email || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {openDetail.telefono || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-slate-400" />
                    {openDetail.canal || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    {openDetail.owner || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {openDetail.pais || "—"}
                    {openDetail.ciudad ? ` · ${openDetail.ciudad}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Creado:{" "}
                    {openDetail.creado
                      ? new Date(openDetail.creado).toLocaleString("es-ES")
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm font-medium">Notas</div>
                <div className="whitespace-pre-wrap text-sm text-slate-800 mt-1">
                  {openDetail.notas || "—"}
                </div>
              </div>
              {openDetail.links?.length ? (
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-sm font-medium">Links</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {openDetail.links.map((u, i) => (
                      <a
                        key={i}
                        href={normalizeUrl(u)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 underline break-all text-sm"
                      >
                        {u}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetail(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
