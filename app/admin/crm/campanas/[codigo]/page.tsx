"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getLeadOrigin, type LeadOrigin } from "@/app/admin/crm/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy } from "lucide-react";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

function fmtDate(iso: unknown) {
  const s = typeof iso === "string" ? iso : "";
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return s;
  }
}

function fmtDateTime(iso: unknown) {
  const s = typeof iso === "string" ? iso : "";
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

export default function CampanaDetailPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = String(params?.codigo ?? "");

  const [loading, setLoading] = React.useState(true);
  const [item, setItem] = React.useState<LeadOrigin | null>(null);

  const formUrl = React.useMemo(() => {
    const eventCodigo = String((item as any)?.event_codigo || "").trim();
    const fallbackCodigo = String(item?.codigo || codigo || "").trim();
    const code = eventCodigo || fallbackCodigo;
    if (!code) return "";
    const origin = getPublicAppOrigin();
    return `${origin}/booking/${encodeURIComponent(code)}`;
  }, [codigo, item?.codigo, (item as any)?.event_codigo]);

  const load = React.useCallback(async () => {
    if (!codigo) return;

    setLoading(true);
    try {
      const data = await getLeadOrigin(codigo);
      setItem(data ?? null);
    } catch (err: any) {
      setItem(null);
      toast({
        title: "Error",
        description: err?.message || "No se pudo cargar la campaña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedRoute allowedRoles={["admin" as const, "equipo" as const]}>
      <DashboardLayout>
        <div className="h-full flex flex-col">
          <div className="border-b bg-white px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {item?.name || "Campaña"}
                  </h1>
                </div>
                <div className="text-sm text-muted-foreground">
                  Detalle de /v1/leads/origins/:codigo
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/admin/crm">Volver al CRM</Link>
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-white">
            <Card className="p-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Cargando...</div>
              ) : !item ? (
                <div className="text-sm text-muted-foreground">
                  No se encontró la campaña.
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label>URL del formulario público</Label>
                    <div className="flex items-center gap-2">
                      <Input value={formUrl} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          try {
                            if (!formUrl) return;
                            await navigator.clipboard.writeText(formUrl);
                            toast({ title: "Copiado" });
                          } catch {
                            toast({
                              title: "No se pudo copiar",
                              description: "Copia el link manualmente.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!formUrl}
                        aria-label="Copiar URL del formulario"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>Event código (event_codigo)</Label>
                      <div className="text-sm font-medium">
                        {(item as any).event_codigo || "—"}
                      </div>
                    </div>

                    <div className="grid gap-1 sm:col-span-2">
                      <Label>Descripción</Label>
                      <div className="text-sm">{item.description || "—"}</div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Inicio (start_date)</Label>
                      <div className="text-sm">
                        {fmtDate((item as any).start_date)}
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Fin (end_date)</Label>
                      <div className="text-sm">
                        {fmtDate((item as any).end_date)}
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Creado</Label>
                      <div className="text-sm">
                        {fmtDateTime((item as any).created_at)}
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Actualizado</Label>
                      <div className="text-sm">
                        {fmtDateTime((item as any).updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
