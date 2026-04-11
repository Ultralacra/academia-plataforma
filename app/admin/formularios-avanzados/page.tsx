"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, RefreshCw, Search } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { apiFetch, endpoints } from "@/lib/api-config";

type AdsFormRecord = Record<string, any>;

function extractForms(payload: any): AdsFormRecord[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.forms)) return payload.forms;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function pickText(record: AdsFormRecord, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "—";
}

function pickDate(record: AdsFormRecord, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return "—";
}

function getFormName(record: AdsFormRecord) {
  return pickText(record, [
    "tipo",
    "name",
    "nombre",
    "title",
    "form_name",
    "formName",
    "ads_name",
    "codigo",
  ]);
}

function getFormId(record: AdsFormRecord) {
  return pickText(record, ["id", "_id", "form_id", "formId", "codigo"]);
}

function getFormSource(record: AdsFormRecord) {
  return pickText(record, [
    "codigo_alumno",
    "cliente_id",
    "platform",
    "provider",
    "source",
    "origin",
  ]);
}

function getFormStatus(record: AdsFormRecord) {
  const raw = record?.status ?? record?.state ?? record?.estado;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof record?.inactivado === "number") {
    return Number(record.inactivado) === 1 ? "Inactivo" : "Activo";
  }
  if (typeof record?.is_active === "boolean") {
    return record.is_active ? "Activo" : "Inactivo";
  }
  if (typeof record?.active === "boolean") {
    return record.active ? "Activo" : "Inactivo";
  }
  return "Sin estado";
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized.includes("activo") || normalized.includes("active")) {
    return "default";
  }
  if (normalized.includes("inactivo") || normalized.includes("inactive")) {
    return "secondary";
  }
  if (normalized.includes("error")) {
    return "destructive";
  }
  return "outline";
}

function FormulariosAvanzadosContent() {
  const [forms, setForms] = useState<AdsFormRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const loadForms = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<any>(endpoints.adsForms.list, {
        method: "GET",
      });
      setForms(extractForms(response));
    } catch (error: any) {
      toast({
        title: "No se pudieron cargar los formularios",
        description: error?.message ?? "Error desconocido",
        variant: "destructive",
      });
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const filteredForms = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return forms;

    return forms.filter((record) => {
      const haystack = [
        getFormName(record),
        getFormId(record),
        getFormSource(record),
        getFormStatus(record),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [forms, query]);

  const activeCount = useMemo(
    () =>
      forms.filter((record) => {
        const status = getFormStatus(record).toLowerCase();
        return status.includes("activo") || status.includes("active");
      }).length,
    [forms],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formularios avanzados</h1>
          <p className="text-sm text-muted-foreground">
            Consulta inicial del CRUD conectada a `/v1/ads-forms/get/ads-forms`.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 bg-transparent"
          onClick={loadForms}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Recargar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total formularios</CardDescription>
            <CardTitle className="text-2xl">{forms.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-2xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resultados visibles</CardDescription>
            <CardTitle className="text-2xl">{filteredForms.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Listado de formularios
          </CardTitle>
          <CardDescription>
            Primer paso del módulo CRUD para revisar todos los formularios
            disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, ID, origen o estado"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando formularios...
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No hay formularios para mostrar con el filtro actual.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Alumno / Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((record, index) => {
                  const formId = `${getFormId(record)}-${index}`;
                  const status = getFormStatus(record);

                  return (
                    <TableRow key={formId}>
                      <TableCell className="font-medium whitespace-normal">
                        {getFormName(record)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {getFormId(record)}
                      </TableCell>
                      <TableCell>{getFormSource(record)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal">
                        {pickText(record, [
                          "observaciones",
                          "intervencion_sugerida",
                        ])}
                      </TableCell>
                      <TableCell>
                        {pickDate(record, [
                          "createdAt",
                          "created_at",
                          "fecha_creacion",
                        ])}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FormulariosAvanzadosPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <FormulariosAvanzadosContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
