import type { User } from "@/lib/auth";

export const BUSINESS_METRICS_ADMIN_ID = 926;
export const BUSINESS_METRICS_STORAGE_KEY = "business-metrics-admin:v2";

export type BusinessMonthRecord = {
  id: string;
  month: string;
  ads: number;
  closerCommissions: number;
  carlaBonus: number;
  newClients: number;
  highTicketRevenue: number;
  delinquencyRate: number;
  highTicketClients: number;
  activeStudents: number;
  durationMonths: number;
  churnRate: number;
  operatingCostMonthly: number;
  roicOperationalCost: number;
  marketingSalesCost: number;
  notes?: string;
};

export type BusinessExpenseEntry = {
  id: string;
  month: string;
  scope: "operativo" | "ventas";
  category: string;
  amount: number;
  note?: string;
};

export type BusinessMetricsState = {
  records: BusinessMonthRecord[];
  expenses: BusinessExpenseEntry[];
};

export type BusinessKpiRow = {
  acquisitionCost: number;
  cac: number;
  delinquencyLoss: number;
  incomePerClient: number;
  costPerClient: number;
  totalCostPerClient: number;
  operatingMarginPerClient: number;
  ltgpExcel: number;
  ltgpProjected: number;
  cacRatio: number;
  benefitPerClient: number;
  paybackMonths: number;
  roic: number;
  salesVelocity: number;
  structuralChurn: number;
  entryVsExit: number;
  grossValueGenerated: number;
  roicProfit: number;
};

export type BusinessSummary = {
  totalRevenue: number;
  totalAcquisitionCost: number;
  totalOperatingCost: number;
  totalRoicOperationalCost: number;
  totalMarketingSalesCost: number;
  totalNewClients: number;
  totalHighTicketClients: number;
  totalActiveStudents: number;
  weightedCac: number;
  weightedIncomePerClient: number;
  weightedCostPerClient: number;
  weightedTotalCostPerClient: number;
  weightedMarginPerClient: number;
  weightedLtgpExcel: number;
  weightedLtgpProjected: number;
  weightedPaybackMonths: number;
  weightedRoic: number;
  totalSalesVelocity: number;
  totalGrossValueGenerated: number;
  avgEntryVsExit: number;
};

export const BUSINESS_FORMULAS = [
  {
    label: "CAC",
    formula:
      "(ADS + comisiones closer + Carla/bonos) / nuevos clientes",
  },
  {
    label: "Ingreso por cliente",
    formula:
      "(ingresos high ticket - pérdida por morosidad) / clientes high ticket",
  },
  {
    label: "Costo operativo por cliente",
    formula: "costo operativo mensual / alumnos activos",
  },
  {
    label: "Costo total por cliente",
    formula: "costo operativo por cliente * duración media en meses",
  },
  {
    label: "Margen operativo por cliente",
    formula: "ingreso por cliente - costo operativo por cliente",
  },
  {
    label: "LTGP Excel",
    formula:
      "réplica literal del Excel actual: igual al margen operativo por cliente",
  },
  {
    label: "LTGP proyectado",
    formula:
      "margen operativo por cliente * duración media en meses",
  },
  {
    label: "CAC Ratio",
    formula: "LTGP Excel / CAC",
  },
  {
    label: "Beneficio por cliente",
    formula: "LTGP Excel - CAC",
  },
  {
    label: "Payback",
    formula: "CAC / (ingreso por cliente / duración media)",
  },
  {
    label: "ROIC",
    formula:
      "(ingresos - gasto operativo ROIC - ventas/marketing) / (gasto operativo ROIC + ventas/marketing)",
  },
  {
    label: "Velocidad de ventas",
    formula: "nuevos clientes * ingreso por cliente",
  },
  {
    label: "Rotación estructural",
    formula: "alumnos activos * churn estructural",
  },
  {
    label: "Entrada vs salida",
    formula: "nuevos clientes / churn estructural",
  },
  {
    label: "Valor bruto generado",
    formula: "clientes high ticket * LTGP Excel",
  },
];

const BUSINESS_METRICS_ALLOWED_IDS = new Set([
  String(BUSINESS_METRICS_ADMIN_ID),
  "ms-lS5SmhBbr4F6X",
  "BwbQgKI-6sCMRAYm",
  "hQycZczVb77e9eLwJpxPJ",
]);

export function canAccessBusinessMetrics(user?: User | null): boolean {
  if (!user) return false;
  return BUSINESS_METRICS_ALLOWED_IDS.has(String(user.id));
}

export function buildBusinessSeedState(): BusinessMetricsState {
  const records: BusinessMonthRecord[] = [
    {
      id: "2025-09",
      month: "2025-09",
      ads: 84241.13,
      closerCommissions: 22553,
      carlaBonus: 2472,
      newClients: 66,
      highTicketRevenue: 252465.06,
      delinquencyRate: 0.1,
      highTicketClients: 66,
      activeStudents: 230,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 116489.39,
      roicOperationalCost: 116489.39,
      marketingSalesCost: 86715.13,
      notes: "Base semilla importada del Excel.",
    },
    {
      id: "2025-10",
      month: "2025-10",
      ads: 56536.75,
      closerCommissions: 20276,
      carlaBonus: 4251,
      newClients: 71,
      highTicketRevenue: 192644.81,
      delinquencyRate: 0.1,
      highTicketClients: 71,
      activeStudents: 230,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 87881.72,
      roicOperationalCost: 87881.72,
      marketingSalesCost: 60789.75,
    },
    {
      id: "2025-11",
      month: "2025-11",
      ads: 74348.59,
      closerCommissions: 13798,
      carlaBonus: 3202,
      newClients: 49,
      highTicketRevenue: 232879.69,
      delinquencyRate: 0.1,
      highTicketClients: 49,
      activeStudents: 230,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 103735.3,
      roicOperationalCost: 103735.3,
      marketingSalesCost: 77552.59,
    },
    {
      id: "2025-12",
      month: "2025-12",
      ads: 84241.13,
      closerCommissions: 15173,
      carlaBonus: 3608,
      newClients: 50,
      highTicketRevenue: 160371.18,
      delinquencyRate: 0.1,
      highTicketClients: 50,
      activeStudents: 230,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 71789.22,
      roicOperationalCost: 71789.22,
      marketingSalesCost: 43900.68,
    },
    {
      id: "2026-01",
      month: "2026-01",
      ads: 90644.21,
      closerCommissions: 14953,
      carlaBonus: 3620,
      newClients: 66,
      highTicketRevenue: 190559.29,
      delinquencyRate: 0.1,
      highTicketClients: 66,
      activeStudents: 209,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 36289.6,
      roicOperationalCost: 38804.45,
      marketingSalesCost: 109217.21,
    },
    {
      id: "2026-02",
      month: "2026-02",
      ads: 63529.07,
      closerCommissions: 16707.5,
      carlaBonus: 2235,
      newClients: 71,
      highTicketRevenue: 191026.32,
      delinquencyRate: 0.1,
      highTicketClients: 71,
      activeStudents: 247,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 35760.98,
      roicOperationalCost: 40857.98,
      marketingSalesCost: 82471.57,
    },
    {
      id: "2026-03",
      month: "2026-03",
      ads: 44632.66,
      closerCommissions: 13805,
      carlaBonus: 3463,
      newClients: 49,
      highTicketRevenue: 165442.1,
      delinquencyRate: 0.1,
      highTicketClients: 49,
      activeStudents: 234,
      durationMonths: 4,
      churnRate: 0.25,
      operatingCostMonthly: 49388.77,
      roicOperationalCost: 97821.89,
      marketingSalesCost: 17268,
    },
  ];

  // Partidas detalladas extraídas directamente del Excel — Hoja 3 (Costo operativo)
  // scope "ventas" = Publicidad y Reembolso (en ROIC se contabilizan como Ventas/mkt)
  const expenses: BusinessExpenseEntry[] = [
    // ── 2025-09 (sept/25) ──────────────────────────────────────────
    { id: "2025-09-op-1",  month: "2025-09", scope: "operativo", category: "Plataforma",          amount: 4258.98,   note: "" },
    { id: "2025-09-op-2",  month: "2025-09", scope: "operativo", category: "Nómina Septiembre",   amount: 21075.30,  note: "" },
    { id: "2025-09-op-3",  month: "2025-09", scope: "operativo", category: "Freelancers",         amount: 2302,      note: "" },
    { id: "2025-09-op-4",  month: "2025-09", scope: "operativo", category: "Bonificación",        amount: 860,       note: "" },
    { id: "2025-09-op-5",  month: "2025-09", scope: "operativo", category: "Otros gastos",        amount: 246.98,    note: "" },
    { id: "2025-09-op-6",  month: "2025-09", scope: "operativo", category: "Gastos Bancarios",    amount: 5,         note: "" },
    { id: "2025-09-vt-1",  month: "2025-09", scope: "ventas",    category: "Publicidad",          amount: 84241.13,  note: "ADS" },
    { id: "2025-09-vt-2",  month: "2025-09", scope: "ventas",    category: "Reembolso",           amount: 3500,      note: "" },
    // ── 2025-10 (oct/25) ───────────────────────────────────────────
    { id: "2025-10-op-1",  month: "2025-10", scope: "operativo", category: "Plataforma",          amount: 3429.18,   note: "" },
    { id: "2025-10-op-2",  month: "2025-10", scope: "operativo", category: "Nómina Octubre",      amount: 22133,     note: "" },
    { id: "2025-10-op-3",  month: "2025-10", scope: "operativo", category: "Freelancers",         amount: 530,       note: "" },
    { id: "2025-10-op-4",  month: "2025-10", scope: "operativo", category: "Bonificación",        amount: 3943,      note: "" },
    { id: "2025-10-op-5",  month: "2025-10", scope: "operativo", category: "Otros gastos",        amount: 1298.66,   note: "" },
    { id: "2025-10-op-6",  month: "2025-10", scope: "operativo", category: "Gastos Bancarios",    amount: 11.13,     note: "" },
    { id: "2025-10-vt-1",  month: "2025-10", scope: "ventas",    category: "Publicidad",          amount: 56536.75,  note: "ADS" },
    // ── 2025-11 (nov/25) ───────────────────────────────────────────
    { id: "2025-11-op-1",  month: "2025-11", scope: "operativo", category: "Plataforma",          amount: 3379.41,   note: "" },
    { id: "2025-11-op-2",  month: "2025-11", scope: "operativo", category: "Nómina Noviembre",    amount: 19358,     note: "" },
    { id: "2025-11-op-3",  month: "2025-11", scope: "operativo", category: "Freelancers",         amount: 895,       note: "" },
    { id: "2025-11-op-4",  month: "2025-11", scope: "operativo", category: "Bonificación",        amount: 3559.30,   note: "" },
    { id: "2025-11-op-5",  month: "2025-11", scope: "operativo", category: "Comisión Rutsi",      amount: 1000,      note: "" },
    { id: "2025-11-op-6",  month: "2025-11", scope: "operativo", category: "Jurídico",            amount: 119,       note: "" },
    { id: "2025-11-op-7",  month: "2025-11", scope: "operativo", category: "Comisión Referidos",  amount: 870,       note: "" },
    { id: "2025-11-op-8",  month: "2025-11", scope: "operativo", category: "Gastos Bancarios",    amount: 6,         note: "" },
    { id: "2025-11-op-9",  month: "2025-11", scope: "operativo", category: "Premio Estudiantes",  amount: 200,       note: "" },
    { id: "2025-11-vt-1",  month: "2025-11", scope: "ventas",    category: "Publicidad",          amount: 74348.59,  note: "ADS" },
    // ── 2025-12 (dic/25) ───────────────────────────────────────────
    { id: "2025-12-op-1",  month: "2025-12", scope: "operativo", category: "Plataforma",          amount: 3184.48,   note: "" },
    { id: "2025-12-op-2",  month: "2025-12", scope: "operativo", category: "Nómina Diciembre",    amount: 18151,     note: "" },
    { id: "2025-12-op-3",  month: "2025-12", scope: "operativo", category: "Freelancers",         amount: 1207.71,   note: "" },
    { id: "2025-12-op-4",  month: "2025-12", scope: "operativo", category: "Bonificación",        amount: 2089,      note: "" },
    { id: "2025-12-op-5",  month: "2025-12", scope: "operativo", category: "Comisión Rutsi",      amount: 1000,      note: "" },
    { id: "2025-12-op-6",  month: "2025-12", scope: "operativo", category: "Otros gastos",        amount: 87.35,     note: "" },
    { id: "2025-12-op-7",  month: "2025-12", scope: "operativo", category: "Jurídico",            amount: 250,       note: "" },
    { id: "2025-12-op-8",  month: "2025-12", scope: "operativo", category: "Gastos Bancarios",    amount: 273,       note: "" },
    { id: "2025-12-op-9",  month: "2025-12", scope: "operativo", category: "Premio Estudiantes",  amount: 604,       note: "" },
    { id: "2025-12-op-10", month: "2025-12", scope: "operativo", category: "Servicio Contable",   amount: 4650,      note: "" },
    { id: "2025-12-vt-1",  month: "2025-12", scope: "ventas",    category: "Publicidad",          amount: 40292.68,  note: "ADS" },
    // ── 2026-01 (ene/26) ───────────────────────────────────────────
    { id: "2026-01-op-1",  month: "2026-01", scope: "operativo", category: "Plataforma",          amount: 2833.69,   note: "" },
    { id: "2026-01-op-2",  month: "2026-01", scope: "operativo", category: "Nómina Enero",        amount: 22878.67,  note: "" },
    { id: "2026-01-op-3",  month: "2026-01", scope: "operativo", category: "Freelancers",         amount: 2770.04,   note: "" },
    { id: "2026-01-op-4",  month: "2026-01", scope: "operativo", category: "Bonificación",        amount: 4620,      note: "" },
    { id: "2026-01-op-5",  month: "2026-01", scope: "operativo", category: "Comisión Rutsi",      amount: 1000,      note: "" },
    { id: "2026-01-op-6",  month: "2026-01", scope: "operativo", category: "Otros gastos",        amount: 435.20,    note: "" },
    { id: "2026-01-op-7",  month: "2026-01", scope: "operativo", category: "Jurídico",            amount: 372,       note: "" },
    { id: "2026-01-op-8",  month: "2026-01", scope: "operativo", category: "Servicio Contable",   amount: 980,       note: "" },
    { id: "2026-01-op-9",  month: "2026-01", scope: "operativo", category: "Premio Estudiantes",  amount: 400,       note: "" },
    // ── 2026-02 (feb/26) ───────────────────────────────────────────
    { id: "2026-02-op-1",  month: "2026-02", scope: "operativo", category: "Plataforma",          amount: 2727.98,   note: "" },
    { id: "2026-02-op-2",  month: "2026-02", scope: "operativo", category: "Nómina Febrero",      amount: 25760,     note: "" },
    { id: "2026-02-op-3",  month: "2026-02", scope: "operativo", category: "Freelancers",         amount: 2037,      note: "" },
    { id: "2026-02-op-4",  month: "2026-02", scope: "operativo", category: "Bonificación",        amount: 2035.50,   note: "" },
    { id: "2026-02-op-5",  month: "2026-02", scope: "operativo", category: "Comisión Rutsi",      amount: 902,       note: "" },
    { id: "2026-02-op-6",  month: "2026-02", scope: "operativo", category: "Otros gastos",        amount: 500,       note: "" },
    { id: "2026-02-op-7",  month: "2026-02", scope: "operativo", category: "Jurídico",            amount: 593,       note: "" },
    { id: "2026-02-op-8",  month: "2026-02", scope: "operativo", category: "Servicio Contable",   amount: 400,       note: "" },
    { id: "2026-02-op-9",  month: "2026-02", scope: "operativo", category: "Premio Estudiantes",  amount: 805.50,    note: "" },
    // ── 2026-03 (mar/26) ───────────────────────────────────────────
    { id: "2026-03-op-1",  month: "2026-03", scope: "operativo", category: "Plataforma",          amount: 4791.38,   note: "" },
    { id: "2026-03-op-2",  month: "2026-03", scope: "operativo", category: "Nómina Marzo",        amount: 28794.50,  note: "" },
    { id: "2026-03-op-3",  month: "2026-03", scope: "operativo", category: "Freelancers",         amount: 3655,      note: "" },
    { id: "2026-03-op-4",  month: "2026-03", scope: "operativo", category: "Bonificación",        amount: 3913,      note: "" },
    { id: "2026-03-op-5",  month: "2026-03", scope: "operativo", category: "Comisión Rutsi",      amount: 1389,      note: "" },
    { id: "2026-03-op-6",  month: "2026-03", scope: "operativo", category: "Otros pagos nómina",  amount: 34,        note: "" },
    { id: "2026-03-op-7",  month: "2026-03", scope: "operativo", category: "Servicios varios",    amount: 4757,      note: "Servicio cyberseguridad" },
    { id: "2026-03-op-8",  month: "2026-03", scope: "operativo", category: "Otros gastos",        amount: 483.89,    note: "" },
    { id: "2026-03-op-9",  month: "2026-03", scope: "operativo", category: "Servicio Contable",   amount: 1369,      note: "+cierre de Orbe" },
    { id: "2026-03-op-10", month: "2026-03", scope: "operativo", category: "Premio Estudiantes",  amount: 202,       note: "" },
  ];

  return { records, expenses };
}

function divideSafe(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

export function calculateBusinessKpis(record: BusinessMonthRecord): BusinessKpiRow {
  const acquisitionCost =
    record.ads + record.closerCommissions + record.carlaBonus;
  const cac = divideSafe(acquisitionCost, record.newClients);
  const delinquencyLoss = record.highTicketRevenue * record.delinquencyRate;
  const incomePerClient = divideSafe(
    record.highTicketRevenue - delinquencyLoss,
    record.highTicketClients,
  );
  const costPerClient = divideSafe(
    record.operatingCostMonthly,
    record.activeStudents,
  );
  const totalCostPerClient = costPerClient * record.durationMonths;
  const operatingMarginPerClient = incomePerClient - costPerClient;
  const ltgpExcel = operatingMarginPerClient;
  const ltgpProjected = operatingMarginPerClient * record.durationMonths;
  const cacRatio = divideSafe(ltgpExcel, cac);
  const benefitPerClient = ltgpExcel - cac;
  const paybackMonths = divideSafe(
    cac,
    divideSafe(incomePerClient, record.durationMonths),
  );
  const roicProfit =
    record.highTicketRevenue -
    record.roicOperationalCost -
    record.marketingSalesCost;
  const roic = divideSafe(
    roicProfit,
    record.roicOperationalCost + record.marketingSalesCost,
  );
  const salesVelocity = record.newClients * incomePerClient;
  const structuralChurn = record.activeStudents * record.churnRate;
  const entryVsExit = divideSafe(record.newClients, structuralChurn);
  const grossValueGenerated = record.highTicketClients * ltgpExcel;

  return {
    acquisitionCost,
    cac,
    delinquencyLoss,
    incomePerClient,
    costPerClient,
    totalCostPerClient,
    operatingMarginPerClient,
    ltgpExcel,
    ltgpProjected,
    cacRatio,
    benefitPerClient,
    paybackMonths,
    roic,
    salesVelocity,
    structuralChurn,
    entryVsExit,
    grossValueGenerated,
    roicProfit,
  };
}

export function calculateBusinessSummary(
  records: BusinessMonthRecord[],
): BusinessSummary {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      totalAcquisitionCost: 0,
      totalOperatingCost: 0,
      totalRoicOperationalCost: 0,
      totalMarketingSalesCost: 0,
      totalNewClients: 0,
      totalHighTicketClients: 0,
      totalActiveStudents: 0,
      weightedCac: 0,
      weightedIncomePerClient: 0,
      weightedCostPerClient: 0,
      weightedTotalCostPerClient: 0,
      weightedMarginPerClient: 0,
      weightedLtgpExcel: 0,
      weightedLtgpProjected: 0,
      weightedPaybackMonths: 0,
      weightedRoic: 0,
      totalSalesVelocity: 0,
      totalGrossValueGenerated: 0,
      avgEntryVsExit: 0,
    };
  }

  const totals = records.reduce(
    (acc, record) => {
      const kpis = calculateBusinessKpis(record);
      acc.totalRevenue += record.highTicketRevenue;
      acc.totalAcquisitionCost += kpis.acquisitionCost;
      acc.totalOperatingCost += record.operatingCostMonthly;
      acc.totalRoicOperationalCost += record.roicOperationalCost;
      acc.totalMarketingSalesCost += record.marketingSalesCost;
      acc.totalNewClients += record.newClients;
      acc.totalHighTicketClients += record.highTicketClients;
      acc.totalActiveStudents += record.activeStudents;
      acc.totalSalesVelocity += kpis.salesVelocity;
      acc.totalGrossValueGenerated += kpis.grossValueGenerated;
      acc.weightedIncomePerClient += kpis.incomePerClient * record.highTicketClients;
      acc.weightedCostPerClient += kpis.costPerClient * record.activeStudents;
      acc.weightedTotalCostPerClient +=
        kpis.totalCostPerClient * record.highTicketClients;
      acc.weightedMarginPerClient +=
        kpis.operatingMarginPerClient * record.highTicketClients;
      acc.weightedLtgpExcel += kpis.ltgpExcel * record.highTicketClients;
      acc.weightedLtgpProjected += kpis.ltgpProjected * record.highTicketClients;
      acc.weightedPaybackMonths += kpis.paybackMonths * record.newClients;
      acc.weightedRoic += kpis.roic;
      acc.avgEntryVsExit += kpis.entryVsExit;
      return acc;
    },
    {
      totalRevenue: 0,
      totalAcquisitionCost: 0,
      totalOperatingCost: 0,
      totalRoicOperationalCost: 0,
      totalMarketingSalesCost: 0,
      totalNewClients: 0,
      totalHighTicketClients: 0,
      totalActiveStudents: 0,
      totalSalesVelocity: 0,
      totalGrossValueGenerated: 0,
      weightedIncomePerClient: 0,
      weightedCostPerClient: 0,
      weightedTotalCostPerClient: 0,
      weightedMarginPerClient: 0,
      weightedLtgpExcel: 0,
      weightedLtgpProjected: 0,
      weightedPaybackMonths: 0,
      weightedRoic: 0,
      avgEntryVsExit: 0,
    },
  );

  return {
    totalRevenue: totals.totalRevenue,
    totalAcquisitionCost: totals.totalAcquisitionCost,
    totalOperatingCost: totals.totalOperatingCost,
    totalRoicOperationalCost: totals.totalRoicOperationalCost,
    totalMarketingSalesCost: totals.totalMarketingSalesCost,
    totalNewClients: totals.totalNewClients,
    totalHighTicketClients: totals.totalHighTicketClients,
    totalActiveStudents: totals.totalActiveStudents,
    weightedCac: divideSafe(totals.totalAcquisitionCost, totals.totalNewClients),
    weightedIncomePerClient: divideSafe(
      totals.weightedIncomePerClient,
      totals.totalHighTicketClients,
    ),
    weightedCostPerClient: divideSafe(
      totals.weightedCostPerClient,
      totals.totalActiveStudents,
    ),
    weightedTotalCostPerClient: divideSafe(
      totals.weightedTotalCostPerClient,
      totals.totalHighTicketClients,
    ),
    weightedMarginPerClient: divideSafe(
      totals.weightedMarginPerClient,
      totals.totalHighTicketClients,
    ),
    weightedLtgpExcel: divideSafe(
      totals.weightedLtgpExcel,
      totals.totalHighTicketClients,
    ),
    weightedLtgpProjected: divideSafe(
      totals.weightedLtgpProjected,
      totals.totalHighTicketClients,
    ),
    weightedPaybackMonths: divideSafe(
      totals.weightedPaybackMonths,
      totals.totalNewClients,
    ),
    weightedRoic: divideSafe(totals.weightedRoic, records.length),
    totalSalesVelocity: totals.totalSalesVelocity,
    totalGrossValueGenerated: totals.totalGrossValueGenerated,
    avgEntryVsExit: divideSafe(totals.avgEntryVsExit, records.length),
  };
}

export function sortBusinessRecords(records: BusinessMonthRecord[]) {
  return [...records].sort((a, b) => a.month.localeCompare(b.month));
}

export function sortBusinessExpenses(expenses: BusinessExpenseEntry[]) {
  return [...expenses].sort((a, b) => {
    const monthCompare = a.month.localeCompare(b.month);
    if (monthCompare !== 0) return monthCompare;
    return a.category.localeCompare(b.category);
  });
}