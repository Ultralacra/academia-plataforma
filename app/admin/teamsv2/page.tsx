"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { dataService, type TeamWithCounts } from "@/lib/data-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  RefreshCw,
  ArrowUpDown,
  Download,
  Clipboard,
} from "lucide-react";
import Link from "next/link";
import { CoachStudentsModal } from "./coach-students-modal";
import { toast } from "@/components/ui/use-toast";
import * as teamsApi from "@/app/admin/teamsv2/api";
import { getOptions, type OpcionItem } from "@/app/admin/opciones/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getSpanishApiError } from "@/lib/utils";

/* =======================
   Helpers
======================= */
type SortKey =
  | "nombre"
  | "puesto"
  | "area"
  | "ticketsCount"
  | "nAlumnos"
  | "created_at";
type SortDir = "asc" | "desc";

// Valores sentinela para "Todos"
const ALL_PUESTO = "__ALL_PUESTO__";
const ALL_AREA = "__ALL_AREA__";

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getPuestoColorClass(puesto?: string | null) {
  if (!puesto) return "bg-gray-400";
  const key = String(puesto).toLowerCase();
  if (key.includes("coach") || key.includes("trainer"))
    return "bg-sky-100 text-sky-800";
  if (key.includes("soporte") || key.includes("support"))
    return "bg-emerald-100 text-emerald-800";
  if (key.includes("admin")) return "bg-violet-100 text-violet-800";
  if (key.includes("ventas") || key.includes("sales"))
    return "bg-rose-100 text-rose-800";
  // fallback: light palette
  const colors = [
    "bg-indigo-100 text-indigo-800",
    "bg-amber-100 text-amber-800",
    "bg-sky-100 text-sky-800",
    "bg-emerald-100 text-emerald-800",
    "bg-rose-100 text-rose-800",
  ];
  let h = 0;
  for (let i = 0; i < puesto.length; i++)
    h = (h * 31 + puesto.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function toCsv(rows: TeamWithCounts[]) {
  const header = [
    "id",
    "codigo",
    "nombre",
    "puesto",
    "area",
    "tickets",
    "alumnos",
    "created_at",
  ];
  const body = rows.map((r) => [
    r.id,
    r.codigo,
    `"${(r.nombre ?? "").replace(/"/g, '""')}"`,
    `"${(r.puesto ?? "").replace(/"/g, '""')}"`,
    `"${(r.area ?? "").replace(/"/g, '""')}"`,
    r.ticketsCount ?? "",
    r.nAlumnos ?? "",
    r.created_at ?? "",
  ]);
  return [header.join(","), ...body.map((r) => r.join(","))].join("\n");
}

/* =======================
   Page
======================= */
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function TeamsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query state (URL)
  const [q, setQ] = useState<string>(searchParams.get("q") ?? "");
  const [page, setPage] = useState<number>(
    Number(searchParams.get("page") ?? 1)
  );
  const [pageSize, setPageSize] = useState<number>(12);

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<TeamWithCounts[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Para construir opciones de selects (toda la data)
  const [optLoading, setOptLoading] = useState<boolean>(true);
  const [optionRows, setOptionRows] = useState<TeamWithCounts[]>([]);

  // Filtros controlados ("": todos)
  const [puesto, setPuesto] = useState<string>(""); // "" = todos
  const [area, setArea] = useState<string>(""); // "" = todos

  // Valores para Select (no pueden ser "")
  const puestoSelectValue = puesto === "" ? ALL_PUESTO : puesto;
  const areaSelectValue = area === "" ? ALL_AREA : area;

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 1) Estado arriba del componente:
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [currentCoach, setCurrentCoach] = useState<{
    code: string | null;
    name?: string | null;
  }>({ code: null, name: null });

  // Create coach dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  // use sentinel value for "none" to avoid empty-string Select.Item error
  const NONE = "__NONE__";
  const [createPuesto, setCreatePuesto] = useState(NONE);
  const [createArea, setCreateArea] = useState(NONE);
  // Opciones desde API de opciones (devuelven opcion_key/opcion_value)
  const [puestoApiOptions, setPuestoApiOptions] = useState<OpcionItem[]>([]);
  const [areaApiOptions, setAreaApiOptions] = useState<OpcionItem[]>([]);
  const [optsLoading, setOptsLoading] = useState(false);

  // Sync URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    q ? sp.set("q", q) : sp.delete("q");
    sp.set("page", String(page));
    router.replace(`?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  // Fetch tabla paginada
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dataService.getTeamsV2({ page, pageSize, search: q });
      setRows(res.data as TeamWithCounts[]);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar equipos");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch para opciones (toda la data)
  const fetchOptionsData = async () => {
    try {
      setOptLoading(true);
      const res = await dataService.getTeamsV2({
        page: 1,
        pageSize: 10000,
        search: "",
      });
      setOptionRows(res.data as TeamWithCounts[]);
    } finally {
      setOptLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

  useEffect(() => {
    fetchOptionsData();
  }, []);

  // Cargar opciones 'puesto' y 'area' cuando se abre el modal de creación
  useEffect(() => {
    let mounted = true;
    if (!createOpen)
      return () => {
        mounted = false;
      };
    (async () => {
      try {
        setOptsLoading(true);
        const [puestosRes, areasRes] = await Promise.all([
          getOptions("puesto"),
          getOptions("area"),
        ]);
        if (!mounted) return;
        setPuestoApiOptions(Array.isArray(puestosRes) ? puestosRes : []);
        setAreaApiOptions(Array.isArray(areasRes) ? areasRes : []);
      } catch (e) {
        // ignore, fallback will be used
      } finally {
        if (mounted) setOptsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [createOpen]);

  // Opciones desde todo el dataset
  const puestoOptions = useMemo(() => {
    const set = new Set<string>();
    optionRows.forEach((r) => {
      const v = (r.puesto ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [optionRows]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    optionRows.forEach((r) => {
      const v = (r.area ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [optionRows]);

  // Filtros + sort en la página actual
  const filteredSorted = useMemo(() => {
    const base = rows.filter((r) => {
      const okPuesto = puesto ? (r.puesto ?? "") === puesto : true;
      const okArea = area ? (r.area ?? "") === area : true;
      return okPuesto && okArea;
    });
    const sorted = [...base].sort((a, b) => {
      const A = a[sortKey] as any;
      const B = b[sortKey] as any;

      if (A == null && B == null) return 0;
      if (A == null) return sortDir === "asc" ? -1 : 1;
      if (B == null) return sortDir === "asc" ? 1 : -1;

      if (sortKey === "ticketsCount" || sortKey === "nAlumnos") {
        const x = Number(A ?? 0) - Number(B ?? 0);
        return sortDir === "asc" ? x : -x;
      }
      if (sortKey === "created_at") {
        const x = new Date(A).getTime() - new Date(B).getTime();
        return sortDir === "asc" ? x : -x;
      }
      const x = String(A).localeCompare(String(B));
      return sortDir === "asc" ? x : -x;
    });
    return sorted;
  }, [rows, puesto, area, sortKey, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setPuesto("");
    setArea("");
    setPage(1);
  }

  function exportCsv() {
    const csv = toCsv(filteredSorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equipos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo", "coach"]}>
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-lg bg-neutral-100">
              <Users className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Equipo</h1>
              <p className="text-xs text-neutral-500">
                Coachs, soporte y áreas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              Nuevo coach
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Filtros */}
        <Card className="border-neutral-200/70">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Búsqueda */}
              <div className="relative md:max-w-md w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre o código…"
                  className="pl-8"
                />
              </div>

              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Select Puesto (sin value="") */}
                <Select
                  value={puestoSelectValue}
                  onValueChange={(val) => {
                    setPuesto(val === ALL_PUESTO ? "" : val);
                    setPage(1);
                  }}
                  disabled={optLoading}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filtrar por puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PUESTO}>
                      Todos los puestos
                    </SelectItem>
                    {puestoOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Select Área (sin value="") */}
                <Select
                  value={areaSelectValue}
                  onValueChange={(val) => {
                    setArea(val === ALL_AREA ? "" : val);
                    setPage(1);
                  }}
                  disabled={optLoading}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filtrar por área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_AREA}>Todas las áreas</SelectItem>
                    {areaOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 12, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/pág
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <div className="mt-4 rounded-sm border-2 bg-white">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">
                    <button
                      className="inline-flex items-center gap-1 text-left font-medium"
                      onClick={() => toggleSort("nombre")}
                    >
                      Nombre / Código{" "}
                      <ArrowUpDown className="h-4 w-4 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[18%]">
                    <button
                      className="inline-flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("puesto")}
                    >
                      Puesto <ArrowUpDown className="h-4 w-4 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[18%]">
                    <button
                      className="inline-flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("area")}
                    >
                      Área <ArrowUpDown className="h-4 w-4 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <button
                      className="inline-flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("nAlumnos")}
                    >
                      Alumnos <ArrowUpDown className="h-4 w-4 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <button
                      className="inline-flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("created_at")}
                    >
                      Creado <ArrowUpDown className="h-4 w-4 opacity-60" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={5}>
                        <div className="h-6 animate-pulse rounded bg-neutral-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-red-600">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-neutral-500">
                      Sin resultados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSorted.map((t) => (
                    <TableRow key={t.id} className="hover:bg-neutral-50/60">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 grid place-items-center rounded-md bg-neutral-100">
                            <Users className="h-4 w-4 text-neutral-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-900">
                              <Link
                                href={`/admin/teamsv2/${encodeURIComponent(
                                  String(t.codigo ?? "")
                                )}`}
                                className="hover:underline"
                              >
                                {t.nombre || "—"}
                              </Link>
                            </div>
                            <div className="truncate text-xs text-neutral-500 flex items-center gap-2">
                              <Link
                                href={`/admin/teamsv2/${encodeURIComponent(
                                  String(t.codigo ?? "")
                                )}`}
                                className="font-mono hover:underline"
                              >
                                {t.codigo}
                              </Link>
                              <button
                                type="button"
                                title="Copiar código"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      String(t.codigo ?? "")
                                    );
                                    toast({ title: "Código copiado" });
                                  } catch {
                                    toast({ title: "No se pudo copiar" });
                                  }
                                }}
                                className="ml-2 inline-flex items-center justify-center p-1 rounded text-neutral-500 hover:text-neutral-700"
                              >
                                <Clipboard className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        {t.puesto ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-md ${getPuestoColorClass(
                              t.puesto
                            )}`}
                          >
                            {t.puesto}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        {t.area ? (
                          <span className="text-sm">{t.area}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge
                          variant="secondary"
                          className="bg-neutral-100 text-neutral-800"
                        >
                          {t.nAlumnos ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle text-sm text-neutral-600">
                        {formatDate(t.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} — {total} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
        <CoachStudentsModal
          open={studentsOpen}
          onOpenChange={setStudentsOpen}
          coachCode={currentCoach.code}
          coachName={currentCoach.name}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo coach</DialogTitle>
            </DialogHeader>

            <div className="grid gap-2 py-2">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={createNombre}
                  onChange={(e) => setCreateNombre(e.target.value)}
                  placeholder="Nombre"
                />
              </div>

              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="ContraseñaSegura123!"
                />
              </div>

              <div>
                <Label className="text-xs">Puesto</Label>
                <select
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  value={createPuesto}
                  onChange={(e) => setCreatePuesto(e.target.value)}
                  disabled={optsLoading}
                >
                  <option value={NONE}>-- Ninguno --</option>
                  {puestoApiOptions.length > 0
                    ? puestoApiOptions.map((o) => (
                        <option key={o.opcion_key} value={o.opcion_key}>
                          {o.opcion_value}
                        </option>
                      ))
                    : puestoOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Área</Label>
                <select
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  value={createArea}
                  onChange={(e) => setCreateArea(e.target.value)}
                  disabled={optsLoading}
                >
                  <option value={NONE}>-- Ninguno --</option>
                  {areaApiOptions.length > 0
                    ? areaApiOptions.map((o) => (
                        <option key={o.opcion_key} value={o.opcion_key}>
                          {o.opcion_value}
                        </option>
                      ))
                    : areaOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={creating}
                  onClick={async () => {
                    if (!createNombre.trim()) {
                      toast({ title: "El nombre es requerido" });
                      return;
                    }
                    if (!createEmail.trim()) {
                      toast({ title: "El email es requerido" });
                      return;
                    }
                    if (!createPassword.trim()) {
                      toast({ title: "La contraseña es requerida" });
                      return;
                    }
                    try {
                      setCreating(true);
                      const payload: teamsApi.CreateCoachPayload = {
                        name: createNombre.trim(),
                        email: createEmail.trim(),
                        password: createPassword,
                        role: "manager",
                        tipo: "equipo",
                        puesto:
                          createPuesto === NONE ? undefined : createPuesto,
                        area: createArea === NONE ? undefined : createArea,
                      };
                      const resp = await teamsApi.createCoach(payload);
                      toast({ title: "Coach creado correctamente" });
                      setCreateOpen(false);
                      setCreateNombre("");
                      setCreateEmail("");
                      setCreatePassword("");
                      setCreatePuesto(NONE);
                      setCreateArea(NONE);
                      await fetchData();
                    } catch (err: any) {
                      toast({
                        title: getSpanishApiError(err, "Error al crear coach"),
                      });
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  Crear
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
