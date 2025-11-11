// lib/crm-metrics.ts
// Cálculo de métricas CRM a partir de crmService (mock local)

import { crmService, listActivities } from "./crm-service";
import type {
  CrmGlobalMetrics,
  PipelineStageId,
  SellerMetricsResult,
  FunnelMetrics,
  ChannelMetricsResult,
  TrendPoint,
  StageAgeStat,
  PaymentScheduleItem,
} from "./crm-types";

export function computeGlobalMetrics(): CrmGlobalMetrics {
  const { items } = crmService.listProspects({});
  const byStage: Record<PipelineStageId, number> = {
    nuevo: 0,
    contactado: 0,
    calificado: 0,
    propuesta: 0,
    ganado: 0,
    perdido: 0,
  };
  for (const p of items) {
    byStage[p.etapaPipeline] = (byStage[p.etapaPipeline] || 0) + 1;
  }
  const totalProspects = items.length;
  const won = byStage.ganado;
  const lost = byStage.perdido;
  const contacted =
    byStage.contactado + byStage.calificado + byStage.propuesta + won + lost;
  const conversionRate = totalProspects ? won / totalProspects : 0;
  return { totalProspects, byStage, won, lost, contacted, conversionRate };
}

export function computeSellerMetrics(): SellerMetricsResult {
  const { items } = crmService.listProspects({});
  const map = new Map<
    string,
    {
      ownerId: string | null;
      ownerNombre: string;
      total: number;
      contacted: number;
      qualified: number;
      won: number;
      lost: number;
    }
  >();
  for (const p of items) {
    const key = (p.ownerId || p.ownerNombre || "(Sin owner)") as string;
    if (!map.has(key))
      map.set(key, {
        ownerId: p.ownerId || null,
        ownerNombre: p.ownerNombre || "(Sin owner)",
        total: 0,
        contacted: 0,
        qualified: 0,
        won: 0,
        lost: 0,
      });
    const row = map.get(key)!;
    row.total += 1;
    if (p.etapaPipeline !== "nuevo") row.contacted += 1;
    if (p.etapaPipeline === "calificado" || p.etapaPipeline === "propuesta")
      row.qualified += 1;
    if (p.etapaPipeline === "ganado") row.won += 1;
    if (p.etapaPipeline === "perdido") row.lost += 1;
  }
  return { rows: Array.from(map.values()), totalOwners: map.size };
}

/* ========================= Métricas ampliadas ========================= */
export function computeFunnel(): FunnelMetrics {
  const gm = computeGlobalMetrics();
  const counts = gm.byStage;
  const total = gm.totalProspects || 1;
  const percentages = {
    nuevo: counts.nuevo / total,
    contactado: (counts.contactado + counts.calificado + counts.propuesta + counts.ganado + counts.perdido) / total,
    calificado: (counts.calificado + counts.propuesta + counts.ganado + counts.perdido) / total,
    propuesta: (counts.propuesta + counts.ganado + counts.perdido) / total,
    ganado: counts.ganado / total,
    perdido: counts.perdido / total,
  } as Record<PipelineStageId, number>;
  return { counts, percentages };
}

export function computeChannelMetrics(): ChannelMetricsResult {
  const { items } = crmService.listProspects({});
  const map = new Map<string, { canal: string; total: number; contacted: number; qualified: number; won: number; lost: number }>();
  for (const p of items) {
    const canal = p.canalFuente || "(Sin canal)";
    if (!map.has(canal)) map.set(canal, { canal, total: 0, contacted: 0, qualified: 0, won: 0, lost: 0 });
    const row = map.get(canal)!;
    row.total += 1;
    if (p.etapaPipeline !== 'nuevo') row.contacted += 1;
    if (p.etapaPipeline === 'calificado' || p.etapaPipeline === 'propuesta') row.qualified += 1;
    if (p.etapaPipeline === 'ganado') row.won += 1;
    if (p.etapaPipeline === 'perdido') row.lost += 1;
  }
  const rows = Array.from(map.values()).map(r => ({ ...r, conversionRate: r.total ? r.won / r.total : 0 }));
  return { rows, totalCanales: rows.length };
}

export function computeTrendsWeeks(weeks: number = 8): TrendPoint[] {
  const { items } = crmService.listProspects({});
  const out: TrendPoint[] = [];
  const start = new Date();
  start.setDate(start.getDate() - weeks * 7);
  for (let i = 0; i < weeks; i++) {
    const from = new Date(start);
    from.setDate(start.getDate() + i * 7);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    const label = `${from.getMonth() + 1}/${from.getDate()}`;
    const slice = items.filter(p => new Date(p.creadoAt) >= from && new Date(p.creadoAt) < to);
    const created = slice.length;
    let contacted = 0, qualified = 0, won = 0, lost = 0;
    for (const p of slice) {
      if (p.etapaPipeline !== 'nuevo') contacted++;
      if (p.etapaPipeline === 'calificado' || p.etapaPipeline === 'propuesta') qualified++;
      if (p.etapaPipeline === 'ganado') won++;
      if (p.etapaPipeline === 'perdido') lost++;
    }
    out.push({ date: label, created, contacted, qualified, won, lost });
  }
  return out;
}

export function computeStageAges(): StageAgeStat[] {
  const { items } = crmService.listProspects({});
  const stages: PipelineStageId[] = ["nuevo", "contactado", "calificado", "propuesta", "ganado", "perdido"];
  const now = Date.now();
  const stats: StageAgeStat[] = [];
  for (const s of stages) {
    const inStage = items.filter(p => p.etapaPipeline === s);
    const days: number[] = [];
    for (const p of inStage) {
      let lastChange = new Date(p.creadoAt).getTime();
      try {
        const acts = crmService.listActivities(p.id).filter(a => a.tipo === 'estado');
        const match = acts.reverse().find(a => (a.texto || '').includes(s));
        if (match) lastChange = new Date(match.createdAt).getTime();
      } catch {}
      const d = (now - lastChange) / (1000 * 60 * 60 * 24);
      days.push(d);
    }
    const avg = days.length ? days.reduce((a,b)=>a+b,0)/days.length : 0;
    const max = days.length ? Math.max(...days) : 0;
    stats.push({ stage: s, avgDaysInStage: avg, maxDaysInStage: max });
  }
  return stats;
}

/* ========================= Métricas de cobros ========================= */
export interface BillingMetrics {
  averageDelayDays: number; // promedio días en retraso de cuotas retrasadas
  recoveryRate: number; // pagos recuperados / pagos que alguna vez estuvieron en retraso
  frozenCount: number; // prospectos congelados
  definitiveDrops: number; // bajas definitivas
  activeWithSchedule: number; // prospectos con cronograma activo
}

export function computeBillingMetrics(): BillingMetrics {
  const { items } = crmService.listProspects({});
  let delaySum = 0;
  let delayCount = 0;
  let recovered = 0;
  let everDelayed = 0;
  let frozenCount = 0;
  let definitiveDrops = 0;
  let activeWithSchedule = 0;
  const now = Date.now();
  for (const p of items) {
    // estado venta
    if (p.etapaPipeline === 'ganado') {
      activeWithSchedule += 1;
    }
    // cargar storage completo para schedule (necesita venta estado extendido)
  }
  // Necesitamos acceder a schedule detallado -> obtener Prospect lleno
  for (const pCore of items) {
    const full = crmService.getProspect(pCore.id);
    if (!full) continue;
    if (full.venta.estado === 'congelado') frozenCount += 1;
    if (full.venta.estado === 'baja_definitiva') definitiveDrops += 1;
    if (full.paymentSchedule.length) activeWithSchedule += 0; // ya contado arriba por etapa ganado
    for (const ps of full.paymentSchedule) {
      if (ps.estado === 'retraso') {
        everDelayed += 1;
        const due = new Date(ps.dueAt).getTime();
        const diffDays = (now - due) / (1000*60*60*24);
        delaySum += diffDays;
        delayCount += 1;
      }
      if (ps.estado === 'pagado' && ps.pagadoAt) {
        const due = new Date(ps.dueAt).getTime();
        const paid = new Date(ps.pagadoAt).getTime();
        if (paid > due) {
          // pago recuperado después de mora
          recovered += 1;
        }
      }
    }
  }
  const averageDelayDays = delayCount ? delaySum / delayCount : 0;
  const recoveryRate = everDelayed ? recovered / everDelayed : 0;
  return { averageDelayDays, recoveryRate, frozenCount, definitiveDrops, activeWithSchedule };
}
