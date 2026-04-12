"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  Loader2,
  Search,
  AlertCircle,
  FileText,
  RefreshCw,
} from "lucide-react";

import { apiFetch, API_HOST, buildUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { downloadClientContractBlob } from "@/app/admin/alumnos/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  ingreso: string;
  estado: string;
  etapa: string | null;
}

interface Contrato {
  id: string | number;
  source: "clientes_table" | "signatures_table" | string;
  title: string;
  status: string;
  is_complete: number;
  created_at: string | null;
  signed_at: string | null;
  filename: string;
}

const ESTADOS_CLIENTE: Record<string, string> = {
  ACTIVO: "bg-green-100 text-green-800",
  INACTIVO: "bg-gray-100 text-gray-800",
  PENDIENTE: "bg-yellow-100 text-yellow-800",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  signed: "Firmado",
  awaiting_signature: "Pendiente de firma",
  declined: "Rechazado",
  canceled: "Cancelado",
};

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  signed: "bg-emerald-100 text-emerald-800",
  awaiting_signature: "bg-amber-100 text-amber-800",
  declined: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-800",
};

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-ES");
}

function etapaClasses(etapa: string | null): string {
  const v = (etapa ?? "").toUpperCase();
  if (v.includes("COPY"))
    return "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300";
  if (v.includes("F1"))
    return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300";
  if (v.includes("F2"))
    return "bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300";
  if (v.includes("F3"))
    return "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300";
  if (v.includes("F4"))
    return "bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300";
  if (v.includes("F5"))
    return "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300";
  if (v.includes("ONBOARD"))
    return "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300";
  return "bg-muted text-muted-foreground";
}

export default function TodosLosContratosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterEtapa, setFilterEtapa] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    let result = clientes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) =>
        (c.nombre ?? "").toLowerCase().includes(term),
      );
    }
    if (filterEstado !== "todos")
      result = result.filter((c) => c.estado === filterEstado);
    if (filterEtapa !== "todos") {
      if (filterEtapa === "sin_etapa") result = result.filter((c) => !c.etapa);
      else result = result.filter((c) => c.etapa === filterEtapa);
    }
    setFilteredClientes(result);
  }, [searchTerm, filterEstado, filterEtapa, clientes]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ code: number; data: Cliente[] }>(
        "/client/get/clients-with-contract",
        { method: "GET" },
      );
      if (data.code === 200 && data.data) setClientes(data.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      toast({
        title: "Error",
        description: `No se pudieron cargar los contratos: ${msg}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openContratosModal = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setContratos([]);
    setModalOpen(true);
    setLoadingContratos(true);
    try {
      const data = await apiFetch<{ code: number; data: Contrato[] }>(
        `/client/get/contracts/${cliente.codigo}`,
        { method: "GET" },
      );
      if (data.code === 200 && data.data) setContratos(data.data);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los contratos del cliente",
        variant: "destructive",
      });
    } finally {
      setLoadingContratos(false);
    }
  };

  const handleDownload = async (cliente: Cliente, contrato: Contrato) => {
    try {
      if (contrato.source === "clientes_table") {
        // Contrato base subido en la ficha del alumno
        const { blob, filename } = await downloadClientContractBlob(
          cliente.codigo,
        );
        const url = URL.createObjectURL(blob);
        const ct = blob.type || "";
        if (ct.includes("pdf") || ct.startsWith("image/")) {
          window.open(url, "_blank");
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = filename || `contrato-${cliente.codigo}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        // Contrato de firma (DropboxSign / signatures_table)
        const token = getAuthToken();
        const url = buildUrl(
          `/leads/dropboxsign/documents/${encodeURIComponent(String(contrato.id))}/download`,
        );
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("No se pudo descargar");
        const blob = await res.blob();
        const disposition = res.headers.get("content-disposition") || "";
        const m = disposition.match(
          /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
        );
        const fname = m
          ? decodeURIComponent((m[1] || m[2] || "").trim())
          : contrato.filename;
        const blobUrl = URL.createObjectURL(blob);
        if (blob.type.includes("pdf")) {
          window.open(blobUrl, "_blank");
        } else {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo descargar el contrato",
        variant: "destructive",
      });
    }
  };

  const estadosUnicos = Array.from(
    new Set(clientes.map((c) => c.estado)),
  ).filter(Boolean);
  const etapasUnicas = Array.from(new Set(clientes.map((c) => c.etapa))).filter(
    Boolean,
  ) as string[];

  return (
    <ProtectedRoute allowedRoles={["admin", "sales"]}>
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Todos los contratos
            </h1>
            <p className="text-muted-foreground">
              Clientes con contratos en la plataforma
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-10 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estadosUnicos.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEtapa} onValueChange={setFilterEtapa}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las etapas</SelectItem>
                <SelectItem value="sin_etapa">Sin etapa</SelectItem>
                {etapasUnicas.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={loadClientes}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.length > 0 ? (
                    filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <Link
                            href={`/admin/alumnos/${cliente.codigo}`}
                            className="font-medium hover:underline"
                          >
                            {cliente.nombre}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ESTADOS_CLIENTE[cliente.estado] ??
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {cliente.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cliente.etapa ? (
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${etapaClasses(cliente.etapa)}`}
                            >
                              {cliente.etapa}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => openContratosModal(cliente)}
                            className="inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Ver contratos"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-muted-foreground">
                          {searchTerm ||
                          filterEstado !== "todos" ||
                          filterEtapa !== "todos"
                            ? "No se encontraron clientes con esos filtros"
                            : "No hay contratos disponibles"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredClientes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredClientes.length} de {clientes.length} clientes
            </div>
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratos de {selectedCliente?.nombre}
              </DialogTitle>
            </DialogHeader>
            {loadingContratos ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contratos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron contratos
              </p>
            ) : (
              <div className="space-y-3">
                {contratos.map((contrato) => (
                  <div
                    key={`${contrato.source}-${contrato.id}`}
                    className="flex items-start justify-between rounded-lg border p-4 gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-sm leading-snug">
                        {contrato.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            contrato.source === "clientes_table"
                              ? "bg-violet-100 text-violet-800"
                              : "bg-sky-100 text-sky-800"
                          }
                        >
                          {contrato.source === "clientes_table"
                            ? "Ficha del alumno"
                            : "Prospecto CRM"}
                        </Badge>
                        <Badge
                          className={
                            CONTRACT_STATUS_STYLES[contrato.status] ??
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {CONTRACT_STATUS_LABELS[contrato.status] ??
                            contrato.status}
                        </Badge>
                        {contrato.signed_at && (
                          <span className="text-xs text-muted-foreground">
                            Firmado: {formatDate(contrato.signed_at)}
                          </span>
                        )}
                        {contrato.created_at && (
                          <span className="text-xs text-muted-foreground">
                            Creado: {formatDate(contrato.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        selectedCliente &&
                        handleDownload(selectedCliente, contrato)
                      }
                      className="flex-shrink-0 inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Descargar contrato"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
