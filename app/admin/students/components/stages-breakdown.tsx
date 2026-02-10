"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, UserCheck } from "lucide-react";
import GenericListModal, { type ListRow } from "./GenericListModal";
import {
  fetchMetricsRetention,
  getDefaultRange,
  type RetentionApiData,
} from "./api";

// Labels legibles para las etapas
const STAGE_LABELS: Record<string, string> = {
  F1: "Fase 1",
  F2: "Fase 2",
  F3: "Fase 3",
  F4: "Fase 4",
  F5: "Fase 5",
  F2_PAGINAS: "F2 Páginas",
  F2_VSL: "F2 VSL",
  F2_EMBUDO: "F2 Embudo",
  F2_GRABACION: "F2 Grabación",
};

const STAGE_COLORS: Record<string, string> = {
  F1: "bg-violet-100 text-violet-700",
  F2: "bg-blue-100 text-blue-700",
  F3: "bg-emerald-100 text-emerald-700",
  F4: "bg-amber-100 text-amber-700",
  F5: "bg-rose-100 text-rose-700",
  F2_PAGINAS: "bg-sky-100 text-sky-700",
  F2_VSL: "bg-indigo-100 text-indigo-700",
  F2_EMBUDO: "bg-cyan-100 text-cyan-700",
  F2_GRABACION: "bg-pink-100 text-pink-700",
};

function getLabel(id: string) {
  return STAGE_LABELS[id] ?? id;
}

function getColor(id: string) {
  return STAGE_COLORS[id] ?? "bg-gray-100 text-gray-700";
}

export default function StagesBreakdown({
  fechaDesde,
  fechaHasta,
}: {
  fechaDesde?: string;
  fechaHasta?: string;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RetentionApiData | null>(null);

  const [listOpen, setListOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listRows, setListRows] = useState<ListRow[]>([]);
  const [listHideDetail, setListHideDetail] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const range = getDefaultRange();
        const res = await fetchMetricsRetention({
          fechaDesde: fechaDesde ?? range.fechaDesde,
          fechaHasta: fechaHasta ?? range.fechaHasta,
        });
        if (!ignore) setData(res?.data ?? null);
      } catch (e) {
        console.error("[stages-breakdown] error", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fechaDesde, fechaHasta]);

  const byEtapa = data?.clientes_etapas?.byEtapa ?? [];
  const lastPerClient = data?.clientes_etapas?.lastPerClient ?? [];
  const totalClients = data?.clientes_etapas?.total ?? 0;
  const transitions = data?.clientes_etapas_avg_permanencia?.transition ?? [];

  // Ordenar por count descendente
  const sortedByEtapa = [...byEtapa].sort((a, b) => b.count - a.count);
  const sortedLastPerClient = [...lastPerClient].sort(
    (a, b) => b.count - a.count,
  );
  const sortedTransitions = [...transitions].sort((a, b) => b.count - a.count);

  const openNames = (
    title: string,
    names?: string[],
    opts?: { hideDetail?: boolean },
  ) => {
    const rows: ListRow[] = (Array.isArray(names) ? names : [])
      .filter(Boolean)
      .map((n) => ({ name: String(n) }));
    setListTitle(title);
    setListRows(rows);
    setListHideDetail(Boolean(opts?.hideDetail));
    setListOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Clientes por etapa (byEtapa) */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Registros por etapa</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Total de registros: {totalClients}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : sortedByEtapa.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin datos
              </p>
            ) : (
              <div className="space-y-2">
                {sortedByEtapa.map((item) => (
                  <button
                    key={item.etapa_id}
                    type="button"
                    onClick={() =>
                      openNames(
                        `Registros por etapa — ${getLabel(item.etapa_id)} (${item.count})`,
                        (item as any)?.nombres,
                        { hideDetail: false },
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    title="Ver alumnos"
                  >
                    <Badge
                      variant="secondary"
                      className={getColor(item.etapa_id)}
                    >
                      {getLabel(item.etapa_id)}
                    </Badge>
                    <span className="font-semibold tabular-nums">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Última etapa por cliente (lastPerClient) */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">
                Última etapa por cliente
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Etapa actual de cada cliente
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : sortedLastPerClient.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin datos
              </p>
            ) : (
              <div className="space-y-2">
                {sortedLastPerClient.map((item) => (
                  <button
                    key={item.etapa_id}
                    type="button"
                    onClick={() =>
                      openNames(
                        `Última etapa por cliente — ${getLabel(item.etapa_id)} (${item.count})`,
                        (item as any)?.nombres,
                        { hideDetail: false },
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    title="Ver alumnos"
                  >
                    <Badge
                      variant="secondary"
                      className={getColor(item.etapa_id)}
                    >
                      {getLabel(item.etapa_id)}
                    </Badge>
                    <span className="font-semibold tabular-nums">
                      {item.count} clientes
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transiciones de etapa */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">
                Transiciones entre etapas
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Flujo de clientes entre fases
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : sortedTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin transiciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {sortedTransitions.map((t, idx) => (
                  <button
                    key={`${t.from_etapa}-${t.to_etapa}-${idx}`}
                    type="button"
                    onClick={() =>
                      openNames(
                        `Transiciones — ${getLabel(t.from_etapa)} → ${getLabel(t.to_etapa)} (${t.count})`,
                        (t as any)?.nombres,
                        { hideDetail: true },
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    title="Ver alumnos"
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <Badge
                        variant="secondary"
                        className={getColor(t.from_etapa)}
                      >
                        {getLabel(t.from_etapa)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        variant="secondary"
                        className={getColor(t.to_etapa)}
                      >
                        {getLabel(t.to_etapa)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums">
                        {t.count}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({t.avg_days}d)
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GenericListModal
        open={listOpen}
        onOpenChange={setListOpen}
        title={listTitle}
        rows={listRows}
        hideCode
        hideDetail={listHideDetail}
      />
    </>
  );
}
