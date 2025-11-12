"use client";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { listMetadata, getMetadata, type MetadataRecord } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function MetadataPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <MetadataContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function MetadataContent() {
  const [items, setItems] = useState<MetadataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<MetadataRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listMetadata();
      setItems(res.items || []);
    } catch (e) {
      console.warn("Error listMetadata", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((m) => {
    if (!q.trim()) return true;
    return [m.id, m.entity, m.entity_id, JSON.stringify(m.payload)].some((v) =>
      String(v).toLowerCase().includes(q.toLowerCase())
    );
  });

  const openDetail = async (id: string | number) => {
    setLoadingDetail(true);
    try {
      const full = await getMetadata(id);
      setDetail(full);
    } catch (e) {
      console.warn("Error getMetadata", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Metadata registros</h1>
          <p className="text-sm text-slate-600">
            Entradas capturadas vía /v1/metadata
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-64"
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Recargar"
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="rounded-lg border divide-y">
          <div className="grid grid-cols-12 text-xs font-medium text-slate-600 bg-slate-50 border-b px-4 py-2">
            <div className="col-span-2">ID</div>
            <div className="col-span-2">Entidad</div>
            <div className="col-span-2">Entity ID</div>
            <div className="col-span-4">Resumen payload</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-center text-slate-500">
              Sin registros
            </div>
          ) : (
            filtered.map((m) => (
              <div
                key={String(m.id)}
                className="grid grid-cols-12 px-4 py-3 text-xs hover:bg-indigo-50/40 transition-colors"
              >
                <div className="col-span-2 truncate" title={String(m.id)}>
                  {String(m.id)}
                </div>
                <div className="col-span-2 truncate" title={m.entity}>
                  {m.entity}
                </div>
                <div className="col-span-2 truncate" title={m.entity_id}>
                  {m.entity_id}
                </div>
                <div
                  className="col-span-4 truncate"
                  title={JSON.stringify(m.payload)}
                >
                  {typeof m.payload === "object"
                    ? JSON.stringify(m.payload).slice(0, 60)
                    : String(m.payload)}
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(m.id)}
                  >
                    Detalle
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle metadata</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : detail ? (
            <pre className="text-xs bg-slate-950 text-slate-100 p-4 rounded-md overflow-x-auto max-h-[60vh]">
              {JSON.stringify(detail, null, 2)}
            </pre>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
