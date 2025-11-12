"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { crmService } from "@/lib/crm-service";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FunnelMetrics,
  ChannelMetricsResult,
  TrendPoint,
  StageAgeStat,
  PipelineStageId,
} from "@/lib/crm-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ProspectCore } from "@/lib/crm-types";

export function MetricsTabs({ items }: { items?: ProspectCore[] }) {
  // Permite inyectar items desde el padre (metadata ya mapeada). Si no vienen, usa mock.
  const all = (
    items && items.length ? items : crmService.listProspects({}).items
  ) as ProspectCore[];
  const owners = Array.from(
    new Set(all.map((p) => p.ownerNombre).filter(Boolean))
  ) as string[];
  const [owner, setOwner] = React.useState<string>("all");
  const filtered =
    owner === "all" ? all : all.filter((p) => p.ownerNombre === owner);

  // Funnel
  const funnel: FunnelMetrics = React.useMemo(() => {
    const stages: PipelineStageId[] = [
      "nuevo",
      "contactado",
      "calificado",
      "propuesta",
      "ganado",
      "perdido",
    ];
    const counts: Record<PipelineStageId, number> = {
      nuevo: 0,
      contactado: 0,
      calificado: 0,
      propuesta: 0,
      ganado: 0,
      perdido: 0,
    };
    for (const p of filtered) counts[p.etapaPipeline]++;
    const total = filtered.length || 1;
    const percentages: Record<PipelineStageId, number> = {
      nuevo: counts.nuevo / total,
      contactado:
        (counts.contactado +
          counts.calificado +
          counts.propuesta +
          counts.ganado +
          counts.perdido) /
        total,
      calificado:
        (counts.calificado +
          counts.propuesta +
          counts.ganado +
          counts.perdido) /
        total,
      propuesta: (counts.propuesta + counts.ganado + counts.perdido) / total,
      ganado: counts.ganado / total,
      perdido: counts.perdido / total,
    };
    return { counts, percentages };
  }, [filtered]);

  // Channels
  const channels: ChannelMetricsResult = React.useMemo(() => {
    const map = new Map<
      string,
      {
        canal: string;
        total: number;
        contacted: number;
        qualified: number;
        won: number;
        lost: number;
      }
    >();
    for (const p of filtered) {
      const canal = p.canalFuente || "(Sin canal)";
      if (!map.has(canal))
        map.set(canal, {
          canal,
          total: 0,
          contacted: 0,
          qualified: 0,
          won: 0,
          lost: 0,
        });
      const row = map.get(canal)!;
      row.total++;
      if (p.etapaPipeline !== "nuevo") row.contacted++;
      if (p.etapaPipeline === "calificado" || p.etapaPipeline === "propuesta")
        row.qualified++;
      if (p.etapaPipeline === "ganado") row.won++;
      if (p.etapaPipeline === "perdido") row.lost++;
    }
    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      conversionRate: r.total ? r.won / r.total : 0,
    }));
    return { rows, totalCanales: rows.length };
  }, [filtered]);

  // Weekly trends
  const trends: TrendPoint[] = React.useMemo(() => {
    const weeks = 8;
    const start = new Date();
    start.setDate(start.getDate() - weeks * 7);
    const out: TrendPoint[] = [];
    for (let i = 0; i < weeks; i++) {
      const from = new Date(start);
      from.setDate(start.getDate() + i * 7);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      const label = `${from.getMonth() + 1}/${from.getDate()}`;
      const slice = filtered.filter(
        (p) => new Date(p.creadoAt) >= from && new Date(p.creadoAt) < to
      );
      let created = slice.length,
        contacted = 0,
        qualified = 0,
        won = 0,
        lost = 0;
      for (const p of slice) {
        if (p.etapaPipeline !== "nuevo") contacted++;
        if (p.etapaPipeline === "calificado" || p.etapaPipeline === "propuesta")
          qualified++;
        if (p.etapaPipeline === "ganado") won++;
        if (p.etapaPipeline === "perdido") lost++;
      }
      out.push({ date: label, created, contacted, qualified, won, lost });
    }
    return out;
  }, [filtered]);

  // Stage ages
  const ages: StageAgeStat[] = React.useMemo(() => {
    const now = Date.now();
    const stages: PipelineStageId[] = [
      "nuevo",
      "contactado",
      "calificado",
      "propuesta",
      "ganado",
      "perdido",
    ];
    const stats: StageAgeStat[] = [];
    for (const s of stages) {
      const inStage = filtered.filter((p) => p.etapaPipeline === s);
      const daysArr: number[] = [];
      for (const p of inStage) {
        let lastChange = new Date(p.creadoAt).getTime();
        const full = crmService.getProspect(p.id);
        const acts =
          full?.actividades?.filter((a) => a.tipo === "estado") || [];
        const match = [...acts]
          .reverse()
          .find((a) => (a.texto || "").includes(s));
        if (match) lastChange = new Date(match.createdAt).getTime();
        daysArr.push((now - lastChange) / (1000 * 60 * 60 * 24));
      }
      const avg = daysArr.length
        ? daysArr.reduce((a, b) => a + b, 0) / daysArr.length
        : 0;
      const max = daysArr.length ? Math.max(...daysArr) : 0;
      stats.push({ stage: s, avgDaysInStage: avg, maxDaysInStage: max });
    }
    return stats;
  }, [filtered]);

  const funnelData = [
    { name: "Nuevo", value: funnel.counts.nuevo },
    {
      name: "Contactado+",
      value:
        funnel.counts.contactado +
        funnel.counts.calificado +
        funnel.counts.propuesta +
        funnel.counts.ganado +
        funnel.counts.perdido,
    },
    {
      name: "Calificado+",
      value:
        funnel.counts.calificado +
        funnel.counts.propuesta +
        funnel.counts.ganado +
        funnel.counts.perdido,
    },
    {
      name: "Propuesta+",
      value:
        funnel.counts.propuesta + funnel.counts.ganado + funnel.counts.perdido,
    },
    { name: "Ganado", value: funnel.counts.ganado },
  ];

  const channelData = channels.rows.map((r) => ({
    name: r.canal,
    total: r.total,
    won: r.won,
    rate: Math.round(r.conversionRate * 100),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-2 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Ver métricas de:</span>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Embudo</div>
        <ChartContainer
          config={{ value: { label: "Prospectos", color: "#fb923c" } }}
        >
          <BarChart data={funnelData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="#fb923c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">
          Canales (total vs ganados)
        </div>
        <ChartContainer
          config={{
            total: { label: "Total", color: "#cbd5e1" },
            won: { label: "Ganados", color: "#10b981" },
          }}
        >
          <BarChart data={channelData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend
              content={({ payload, verticalAlign }) => (
                <ChartLegendContent
                  payload={payload}
                  verticalAlign={verticalAlign}
                />
              )}
            />
            <Bar dataKey="total" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="won" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Tendencia semanal</div>
        <ChartContainer
          config={{
            created: { label: "Creados", color: "#0ea5e9" },
            contacted: { label: "Contactados", color: "#22d3ee" },
            qualified: { label: "Calificados", color: "#f59e0b" },
            won: { label: "Ganados", color: "#10b981" },
          }}
        >
          <LineChart data={trends}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="created"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="contacted"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="qualified"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="won"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Edad por etapa (días)</div>
        <ChartContainer
          config={{
            avg: { label: "Promedio", color: "#6366f1" },
            max: { label: "Máximo", color: "#a78bfa" },
          }}
        >
          <BarChart
            data={ages.map((a) => ({
              name: a.stage,
              avg: Math.round(a.avgDaysInStage),
              max: Math.round(a.maxDaysInStage),
            }))}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend
              content={({ payload, verticalAlign }) => (
                <ChartLegendContent
                  payload={payload}
                  verticalAlign={verticalAlign}
                />
              )}
            />
            <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="max" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  );
}
