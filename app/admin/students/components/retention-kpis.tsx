"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, DoorOpen, Target, CalendarClock, Users } from "lucide-react";
import GenericListModal, { type ListRow } from "./GenericListModal";
import {
  fetchMetricsRetention,
  getDefaultRange,
  type RetentionApiData,
} from "./api";

function Stat({
  icon,
  title,
  value,
  subtitle,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string;
  onClick?: () => void;
}) {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border p-4 bg-${accent}-50/40 border-${accent}-200/70 ${
        onClick ? "w-full text-left hover:bg-muted/20 transition-colors" : ""
      }`}
      title={onClick ? "Ver alumnos" : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full grid place-items-center bg-${accent}-100 text-${accent}-700`}
          >
            {icon}
          </div>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <span className={`h-2 w-2 rounded-full bg-${accent}-400`} />
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {subtitle ? (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      ) : null}
    </Wrapper>
  );
}

export default function RetentionKPIs({
  fechaDesde,
  fechaHasta,
  coach,
  abandonosPorInactividad,
}: {
  fechaDesde?: string;
  fechaHasta?: string;
  coach?: string;
  abandonosPorInactividad?: {
    thresholdDays: number;
    count: number;
    names: string[];
    rows?: ListRow[];
  };
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RetentionApiData | null>(null);

  const [listOpen, setListOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listRows, setListRows] = useState<ListRow[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const range = getDefaultRange();
        const res = await fetchMetricsRetention({
          fechaDesde: fechaDesde ?? range.fechaDesde,
          fechaHasta: fechaHasta ?? range.fechaHasta,
          coach,
        });
        if (!ignore) setData(res?.data ?? null);
      } catch (e) {
        console.error("[retention-kpis] error", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fechaDesde, fechaHasta, coach]);

  const retention = data?.retention;
  const completed = retention?.completado ?? 0;
  const abandonsApi = retention?.abandonado ?? 0;
  const retentionPct = retention?.retention ?? 0;
  const avgStay = retention?.permanencia ?? 0;
  const total = retention?.total ?? 0;

  const openNames = (title: string, names?: string[]) => {
    const rows: ListRow[] = (Array.isArray(names) ? names : [])
      .filter(Boolean)
      .map((n) => ({ name: String(n) }));
    setListTitle(title);
    setListRows(rows);
    setListOpen(true);
  };

  const openRows = (title: string, rows?: ListRow[]) => {
    setListTitle(title);
    setListRows(Array.isArray(rows) ? rows : []);
    setListOpen(true);
  };

  const totalNames: string[] =
    (retention as any)?.nombres?.total ||
    (data as any)?.retention_names?.total ||
    (Array.isArray((data as any)?.clientesRetentionDetail)
      ? (data as any).clientesRetentionDetail
          .map((x: any) => x?.nombre)
          .filter(Boolean)
      : []);

  const completedNames: string[] =
    (retention as any)?.nombres?.completado ||
    (data as any)?.retention_names?.completado ||
    [];

  const abandonedNamesApi: string[] =
    (retention as any)?.nombres?.abandonado ||
    (data as any)?.retention_names?.abandonado ||
    [];

  const abandonedNames: string[] = abandonosPorInactividad?.names?.length
    ? abandonosPorInactividad.names
    : abandonedNamesApi;

  const abandons = abandonosPorInactividad?.count ?? abandonsApi;

  const abandonedRows: ListRow[] = abandonosPorInactividad?.rows?.length
    ? abandonosPorInactividad.rows
    : abandonedNames.map((n) => ({ name: String(n) }));

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">Retención y permanencia</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[110px] rounded-2xl border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Stat
              icon={<Users className="h-4 w-4" />}
              title="Total clientes"
              value={total}
              subtitle="En el rango seleccionado"
              accent="indigo"
              onClick={
                totalNames.length
                  ? () =>
                      openNames(
                        `Retención — Total clientes (${totalNames.length})`,
                        totalNames,
                      )
                  : undefined
              }
            />
            <Stat
              icon={<Trophy className="h-4 w-4" />}
              title="Completados"
              value={completed}
              subtitle="Casos de éxito"
              accent="emerald"
              onClick={
                completedNames.length
                  ? () =>
                      openNames(
                        `Retención — Completados (${completedNames.length})`,
                        completedNames,
                      )
                  : undefined
              }
            />
            <Stat
              icon={<DoorOpen className="h-4 w-4" />}
              title="Abandonos"
              value={abandons}
              subtitle={
                abandonosPorInactividad
                  ? `Inactividad ≥ ${abandonosPorInactividad.thresholdDays} días`
                  : "Salidas antes de completar"
              }
              accent="rose"
              onClick={
                abandonedRows.length
                  ? () =>
                      openRows(
                        `Retención — Abandonos (${abandonedRows.length})`,
                        abandonedRows,
                      )
                  : undefined
              }
            />
            <Stat
              icon={<Target className="h-4 w-4" />}
              title="Retención"
              value={`${retentionPct}%`}
              subtitle="Completados / (Comp. + Aband.)"
              accent="sky"
            />
            <Stat
              icon={<CalendarClock className="h-4 w-4" />}
              title="Permanencia prom."
              value={`${avgStay.toFixed(2)} d`}
              subtitle="Días en el programa"
              accent="amber"
            />
          </div>
        )}

        <GenericListModal
          open={listOpen}
          onOpenChange={setListOpen}
          title={listTitle}
          rows={listRows}
          hideCode
        />
      </CardContent>
    </Card>
  );
}
