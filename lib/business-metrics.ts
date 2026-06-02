import type { User } from "@/lib/auth";

export const BUSINESS_METRICS_ADMIN_ID = 926;
export const BUSINESS_METRICS_STORAGE_KEY = "business-metrics-admin:v2";

export type BusinessMonthRecord = {
  id: string;
  month: string;
  ads: number;
  closerCommissions: number;
  carlaBonus: number;
  /** Bonos (campo separado de Carla, editable manualmente). */
  bonos: number;
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
  /** Valores para campos personalizados (clave -> nÃºmero o texto). */
  extra?: Record<string, number | string>;
};

export type BusinessExpenseEntry = {
  id: string;
  month: string;
  scope: "operativo" | "ventas";
  category: string;
  amount: number;
  note?: string;
  /** Valores para campos personalizados (clave -> nÃºmero o texto). */
  extra?: Record<string, number | string>;
};

export type CustomFieldType = "number" | "currency" | "percent" | "text";
export type CustomFieldTarget = "record" | "expense";

export type CustomFieldDef = {
  key: string;
  label: string;
  type: CustomFieldType;
  target: CustomFieldTarget;
  /** Si true, se muestra como columna en la tabla del CRUD. */
  showInTable?: boolean;
};

export type CustomFormulaFormat = "number" | "currency" | "percent";

export type CustomFormulaDef = {
  key: string;
  label: string;
  /** ExpresiÃ³n libre: +, -, *, /, (), nombres de variables y nÃºmeros. */
  expression: string;
  format: CustomFormulaFormat;
  /** Si true se muestra como tarjeta en el overview. */
  showInOverview?: boolean;
};

export type BusinessMetricsState = {
  records: BusinessMonthRecord[];
  expenses: BusinessExpenseEntry[];
  /** Definiciones de campos extra para registros mensuales y partidas. */
  customFields?: CustomFieldDef[];
  /** Definiciones de KPIs personalizados. */
  customFormulas?: CustomFormulaDef[];
  /** Clave (vault) del mÃ³dulo, editable desde el panel auto-admin. */
  vaultPassword?: string;
  /** Etiquetas personalizadas de columnas de tablas (clave → texto). */
  columnLabels?: Record<string, string>;
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
      "(ingresos high ticket - pÃ©rdida por morosidad) / clientes high ticket",
  },
  {
    label: "Costo operativo por cliente",
    formula: "costo operativo mensual / alumnos activos",
  },
  {
    label: "Costo total por cliente",
    formula: "costo operativo por cliente * duraciÃ³n media en meses",
  },
  {
    label: "Margen operativo por cliente",
    formula: "ingreso por cliente - costo operativo por cliente",
  },
  {
    label: "LTGP Excel",
    formula:
      "rÃ©plica literal del Excel actual: igual al margen operativo por cliente",
  },
  {
    label: "LTGP proyectado",
    formula:
      "margen operativo por cliente * duraciÃ³n media en meses",
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
    formula: "CAC / (ingreso por cliente / duraciÃ³n media)",
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
    label: "RotaciÃ³n estructural",
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
  return (
    BUSINESS_METRICS_ALLOWED_IDS.has(String(user.id)) ||
    (!!user.codigo && BUSINESS_METRICS_ALLOWED_IDS.has(user.codigo))
  );
}

/**
 * IDs/códigos de los dueños del módulo "Rendimiento áreas".
 * Solo estos usuarios ven el ítem en el sidebar y pueden asignar
 * permisos de acceso al resto del equipo desde la pantalla.
 */
export const TEAM_PERFORMANCE_OWNER_IDS = new Set<string>([
  "jW1djJJnTqKI6sfM",
  "hQycZczVb77e9eLwJpxPJ",
  "TIn8eFkuYkaOi998",
]);

export function canAccessTeamPerformance(user?: User | null): boolean {
  if (!user) return false;
  return (
    TEAM_PERFORMANCE_OWNER_IDS.has(String(user.id)) ||
    (!!user.codigo && TEAM_PERFORMANCE_OWNER_IDS.has(user.codigo))
  );
}

export function buildBusinessSeedState(): BusinessMetricsState {
  const records: BusinessMonthRecord[] = [
    {
      id: "2025-09",
      month: "2025-09",
      ads: 84241.13,
      closerCommissions: 22553,
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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
      carlaBonus: 0,
      bonos: 0,
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

  // Partidas detalladas extraÃ­das directamente del Excel â€” Hoja 3 (Costo operativo)
  // scope "ventas" = Publicidad y Reembolso (en ROIC se contabilizan como Ventas/mkt)
  const expenses: BusinessExpenseEntry[] = [
    // â”€â”€ 2025-09 (sept/25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2025-09-op-1",  month: "2025-09", scope: "operativo", category: "Plataforma",          amount: 4258.98,   note: "" },
    { id: "2025-09-op-2",  month: "2025-09", scope: "operativo", category: "NÃ³mina Septiembre",   amount: 21075.30,  note: "" },
    { id: "2025-09-op-3",  month: "2025-09", scope: "operativo", category: "Freelancers",         amount: 2302,      note: "" },
    { id: "2025-09-op-4",  month: "2025-09", scope: "operativo", category: "BonificaciÃ³n",        amount: 860,       note: "" },
    { id: "2025-09-op-5",  month: "2025-09", scope: "operativo", category: "Otros gastos",        amount: 246.98,    note: "" },
    { id: "2025-09-op-6",  month: "2025-09", scope: "operativo", category: "Gastos Bancarios",    amount: 5,         note: "" },
    { id: "2025-09-vt-1",  month: "2025-09", scope: "ventas",    category: "Publicidad",          amount: 84241.13,  note: "ADS" },
    { id: "2025-09-vt-2",  month: "2025-09", scope: "ventas",    category: "Reembolso",           amount: 3500,      note: "" },
    // â”€â”€ 2025-10 (oct/25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2025-10-op-1",  month: "2025-10", scope: "operativo", category: "Plataforma",          amount: 3429.18,   note: "" },
    { id: "2025-10-op-2",  month: "2025-10", scope: "operativo", category: "NÃ³mina Octubre",      amount: 22133,     note: "" },
    { id: "2025-10-op-3",  month: "2025-10", scope: "operativo", category: "Freelancers",         amount: 530,       note: "" },
    { id: "2025-10-op-4",  month: "2025-10", scope: "operativo", category: "BonificaciÃ³n",        amount: 3943,      note: "" },
    { id: "2025-10-op-5",  month: "2025-10", scope: "operativo", category: "Otros gastos",        amount: 1298.66,   note: "" },
    { id: "2025-10-op-6",  month: "2025-10", scope: "operativo", category: "Gastos Bancarios",    amount: 11.13,     note: "" },
    { id: "2025-10-vt-1",  month: "2025-10", scope: "ventas",    category: "Publicidad",          amount: 56536.75,  note: "ADS" },
    // â”€â”€ 2025-11 (nov/25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2025-11-op-1",  month: "2025-11", scope: "operativo", category: "Plataforma",          amount: 3379.41,   note: "" },
    { id: "2025-11-op-2",  month: "2025-11", scope: "operativo", category: "NÃ³mina Noviembre",    amount: 19358,     note: "" },
    { id: "2025-11-op-3",  month: "2025-11", scope: "operativo", category: "Freelancers",         amount: 895,       note: "" },
    { id: "2025-11-op-4",  month: "2025-11", scope: "operativo", category: "BonificaciÃ³n",        amount: 3559.30,   note: "" },
    { id: "2025-11-op-5",  month: "2025-11", scope: "operativo", category: "ComisiÃ³n Rutsi",      amount: 1000,      note: "" },
    { id: "2025-11-op-6",  month: "2025-11", scope: "operativo", category: "JurÃ­dico",            amount: 119,       note: "" },
    { id: "2025-11-op-7",  month: "2025-11", scope: "operativo", category: "ComisiÃ³n Referidos",  amount: 870,       note: "" },
    { id: "2025-11-op-8",  month: "2025-11", scope: "operativo", category: "Gastos Bancarios",    amount: 6,         note: "" },
    { id: "2025-11-op-9",  month: "2025-11", scope: "operativo", category: "Premio Estudiantes",  amount: 200,       note: "" },
    { id: "2025-11-vt-1",  month: "2025-11", scope: "ventas",    category: "Publicidad",          amount: 74348.59,  note: "ADS" },
    // â”€â”€ 2025-12 (dic/25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2025-12-op-1",  month: "2025-12", scope: "operativo", category: "Plataforma",          amount: 3184.48,   note: "" },
    { id: "2025-12-op-2",  month: "2025-12", scope: "operativo", category: "NÃ³mina Diciembre",    amount: 18151,     note: "" },
    { id: "2025-12-op-3",  month: "2025-12", scope: "operativo", category: "Freelancers",         amount: 1207.71,   note: "" },
    { id: "2025-12-op-4",  month: "2025-12", scope: "operativo", category: "BonificaciÃ³n",        amount: 2089,      note: "" },
    { id: "2025-12-op-5",  month: "2025-12", scope: "operativo", category: "ComisiÃ³n Rutsi",      amount: 1000,      note: "" },
    { id: "2025-12-op-6",  month: "2025-12", scope: "operativo", category: "Otros gastos",        amount: 87.35,     note: "" },
    { id: "2025-12-op-7",  month: "2025-12", scope: "operativo", category: "JurÃ­dico",            amount: 250,       note: "" },
    { id: "2025-12-op-8",  month: "2025-12", scope: "operativo", category: "Gastos Bancarios",    amount: 273,       note: "" },
    { id: "2025-12-op-9",  month: "2025-12", scope: "operativo", category: "Premio Estudiantes",  amount: 604,       note: "" },
    { id: "2025-12-op-10", month: "2025-12", scope: "operativo", category: "Servicio Contable",   amount: 4650,      note: "" },
    { id: "2025-12-vt-1",  month: "2025-12", scope: "ventas",    category: "Publicidad",          amount: 40292.68,  note: "ADS" },
    // â”€â”€ 2026-01 (ene/26) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2026-01-op-1",  month: "2026-01", scope: "operativo", category: "Plataforma",          amount: 2833.69,   note: "" },
    { id: "2026-01-op-2",  month: "2026-01", scope: "operativo", category: "NÃ³mina Enero",        amount: 22878.67,  note: "" },
    { id: "2026-01-op-3",  month: "2026-01", scope: "operativo", category: "Freelancers",         amount: 2770.04,   note: "" },
    { id: "2026-01-op-4",  month: "2026-01", scope: "operativo", category: "BonificaciÃ³n",        amount: 4620,      note: "" },
    { id: "2026-01-op-5",  month: "2026-01", scope: "operativo", category: "ComisiÃ³n Rutsi",      amount: 1000,      note: "" },
    { id: "2026-01-op-6",  month: "2026-01", scope: "operativo", category: "Otros gastos",        amount: 435.20,    note: "" },
    { id: "2026-01-op-7",  month: "2026-01", scope: "operativo", category: "JurÃ­dico",            amount: 372,       note: "" },
    { id: "2026-01-op-8",  month: "2026-01", scope: "operativo", category: "Servicio Contable",   amount: 980,       note: "" },
    { id: "2026-01-op-9",  month: "2026-01", scope: "operativo", category: "Premio Estudiantes",  amount: 400,       note: "" },
    // â”€â”€ 2026-02 (feb/26) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2026-02-op-1",  month: "2026-02", scope: "operativo", category: "Plataforma",          amount: 2727.98,   note: "" },
    { id: "2026-02-op-2",  month: "2026-02", scope: "operativo", category: "NÃ³mina Febrero",      amount: 25760,     note: "" },
    { id: "2026-02-op-3",  month: "2026-02", scope: "operativo", category: "Freelancers",         amount: 2037,      note: "" },
    { id: "2026-02-op-4",  month: "2026-02", scope: "operativo", category: "BonificaciÃ³n",        amount: 2035.50,   note: "" },
    { id: "2026-02-op-5",  month: "2026-02", scope: "operativo", category: "ComisiÃ³n Rutsi",      amount: 902,       note: "" },
    { id: "2026-02-op-6",  month: "2026-02", scope: "operativo", category: "Otros gastos",        amount: 500,       note: "" },
    { id: "2026-02-op-7",  month: "2026-02", scope: "operativo", category: "JurÃ­dico",            amount: 593,       note: "" },
    { id: "2026-02-op-8",  month: "2026-02", scope: "operativo", category: "Servicio Contable",   amount: 400,       note: "" },
    { id: "2026-02-op-9",  month: "2026-02", scope: "operativo", category: "Premio Estudiantes",  amount: 805.50,    note: "" },
    // â”€â”€ 2026-03 (mar/26) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    { id: "2026-03-op-1",  month: "2026-03", scope: "operativo", category: "Plataforma",          amount: 4791.38,   note: "" },
    { id: "2026-03-op-2",  month: "2026-03", scope: "operativo", category: "NÃ³mina Marzo",        amount: 28794.50,  note: "" },
    { id: "2026-03-op-3",  month: "2026-03", scope: "operativo", category: "Freelancers",         amount: 3655,      note: "" },
    { id: "2026-03-op-4",  month: "2026-03", scope: "operativo", category: "BonificaciÃ³n",        amount: 3913,      note: "" },
    { id: "2026-03-op-5",  month: "2026-03", scope: "operativo", category: "ComisiÃ³n Rutsi",      amount: 1389,      note: "" },
    { id: "2026-03-op-6",  month: "2026-03", scope: "operativo", category: "Otros pagos nÃ³mina",  amount: 34,        note: "" },
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
    record.ads +
    record.closerCommissions +
    record.carlaBonus +
    (record.bonos || 0);
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

  const n = records.length;

  return {
    totalRevenue: divideSafe(totals.totalRevenue, n),
    totalAcquisitionCost: divideSafe(totals.totalAcquisitionCost, n),
    totalOperatingCost: divideSafe(totals.totalOperatingCost, n),
    totalRoicOperationalCost: divideSafe(totals.totalRoicOperationalCost, n),
    totalMarketingSalesCost: divideSafe(totals.totalMarketingSalesCost, n),
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
    totalSalesVelocity: divideSafe(totals.totalSalesVelocity, n),
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Capa "auto-admin": custom fields + custom formulas
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESERVED_RECORD_KEYS = new Set<string>([
  "id",
  "month",
  "ads",
  "closerCommissions",
  "carlaBonus",
  "bonos",
  "newClients",
  "highTicketRevenue",
  "delinquencyRate",
  "highTicketClients",
  "activeStudents",
  "durationMonths",
  "churnRate",
  "operatingCostMonthly",
  "roicOperationalCost",
  "marketingSalesCost",
  "notes",
  "extra",
]);

const RESERVED_EXPENSE_KEYS = new Set<string>([
  "id",
  "month",
  "scope",
  "category",
  "amount",
  "note",
  "extra",
]);

/** Normaliza un texto humano a una clave JS vÃ¡lida (camelCase bÃ¡sico). */
export function slugifyCustomKey(input: string): string {
  const trimmed = String(input || "").trim().toLowerCase();
  if (!trimmed) return "";
  const ascii = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 _-]+/g, " ")
    .trim();
  const parts = ascii.split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "";
  const [head, ...rest] = parts;
  let key = head + rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  if (/^[0-9]/.test(key)) key = `f_${key}`;
  return key;
}

/** Devuelve un mensaje de error si la clave colisiona con campos base o ya existe. */
export function validateCustomFieldKey(
  key: string,
  target: CustomFieldTarget,
  existing: CustomFieldDef[],
  ignoreKey?: string,
): string | null {
  if (!key) return "La clave es obligatoria.";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return "Clave invÃ¡lida: usa solo letras, nÃºmeros y _ (sin empezar por nÃºmero).";
  }
  const reserved = target === "record" ? RESERVED_RECORD_KEYS : RESERVED_EXPENSE_KEYS;
  if (reserved.has(key)) return "Clave reservada por el sistema.";
  const clash = existing.find(
    (f) => f.key === key && f.target === target && f.key !== ignoreKey,
  );
  if (clash) return "Ya existe un campo con esa clave para este destino.";
  return null;
}

/** Asegura que el estado tenga arrays vÃ¡lidos para campos/formulas personalizados. */
export function normalizeBusinessState(
  raw: Partial<BusinessMetricsState> | null | undefined,
): BusinessMetricsState {
  const seed = buildBusinessSeedState();
  const records = Array.isArray(raw?.records)
    ? sortBusinessRecords(
        (raw!.records as BusinessMonthRecord[]).map((r) => ({
          ...r,
          // Compatibilidad hacia atrÃ¡s: registros previos no tienen `bonos`.
          bonos: typeof r.bonos === "number" ? r.bonos : 0,
        })),
      )
    : seed.records;
  const expenses = Array.isArray(raw?.expenses)
    ? sortBusinessExpenses(raw!.expenses as BusinessExpenseEntry[])
    : seed.expenses;
  const customFields = Array.isArray(raw?.customFields)
    ? (raw!.customFields as CustomFieldDef[]).filter(
        (f) => f && typeof f.key === "string" && typeof f.label === "string",
      )
    : [];
  const customFormulas = Array.isArray(raw?.customFormulas)
    ? (raw!.customFormulas as CustomFormulaDef[]).filter(
        (f) =>
          f &&
          typeof f.key === "string" &&
          typeof f.label === "string" &&
          typeof f.expression === "string",
      )
    : [];
  const vaultPassword =
    typeof raw?.vaultPassword === "string" ? raw!.vaultPassword : undefined;
  const columnLabels =
    raw?.columnLabels && typeof raw.columnLabels === "object"
      ? Object.fromEntries(
          Object.entries(raw.columnLabels as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string",
          ),
        ) as Record<string, string>
      : {};
  return { records, expenses, customFields, customFormulas, vaultPassword, columnLabels };
}

// â€” Mini evaluador seguro de expresiones aritmÃ©ticas â€”
// Solo permite: nÃºmeros, identificadores [A-Za-z_][A-Za-z0-9_]*, + - * / ( ) , espacios.
// Soporta funciones bÃ¡sicas: min, max, abs, round, floor, ceil, sqrt, pow.
const FORMULA_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  pow: Math.pow,
};

type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" | "," };

function tokenizeFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if ("+-*/(),".includes(ch)) {
      tokens.push({ type: "op", value: ch as any });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < expr.length && /[0-9._]/.test(expr[j])) j++;
      const raw = expr.slice(i, j).replace(/_/g, "");
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`NÃºmero invÃ¡lido: ${raw}`);
      }
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      tokens.push({ type: "id", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`CarÃ¡cter no permitido en la fÃ³rmula: "${ch}"`);
  }
  return tokens;
}

function parseFormula(
  tokens: Token[],
  variables: Record<string, number>,
): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let value = parseTerm();
    while (pos < tokens.length) {
      const t = peek();
      if (t.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const rhs = parseTerm();
        value = t.value === "+" ? value + rhs : value - rhs;
      } else break;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (pos < tokens.length) {
      const t = peek();
      if (t.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const rhs = parseFactor();
        if (t.value === "*") value = value * rhs;
        else value = rhs === 0 ? 0 : value / rhs;
      } else break;
    }
    return value;
  }

  function parseFactor(): number {
    const t = consume();
    if (!t) throw new Error("ExpresiÃ³n incompleta.");
    if (t.type === "op" && t.value === "-") {
      return -parseFactor();
    }
    if (t.type === "op" && t.value === "+") {
      return parseFactor();
    }
    if (t.type === "num") return t.value;
    if (t.type === "op" && t.value === "(") {
      const v = parseExpression();
      const closing = consume();
      if (!closing || closing.type !== "op" || closing.value !== ")") {
        throw new Error("Falta cerrar parÃ©ntesis.");
      }
      return v;
    }
    if (t.type === "id") {
      // Â¿Llamada a funciÃ³n?
      if (peek() && peek().type === "op" && (peek() as any).value === "(") {
        consume(); // (
        const args: number[] = [];
        if (!(peek() && peek().type === "op" && (peek() as any).value === ")")) {
          args.push(parseExpression());
          while (peek() && peek().type === "op" && (peek() as any).value === ",") {
            consume();
            args.push(parseExpression());
          }
        }
        const close = consume();
        if (!close || close.type !== "op" || close.value !== ")") {
          throw new Error(`Falta cerrar ")" en funciÃ³n ${t.value}.`);
        }
        const fn = FORMULA_FUNCTIONS[t.value];
        if (!fn) throw new Error(`FunciÃ³n no soportada: ${t.value}.`);
        return fn(...args);
      }
      if (!(t.value in variables)) {
        throw new Error(`Variable no encontrada: ${t.value}`);
      }
      const v = variables[t.value];
      return Number.isFinite(v) ? v : 0;
    }
    throw new Error("Token inesperado en la fÃ³rmula.");
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error("Hay tokens extra al final de la fÃ³rmula.");
  }
  return result;
}

/**
 * Construye el diccionario de variables disponibles para un registro mensual:
 * todos los campos base + KPIs calculados + extras.
 */
export function buildFormulaVariables(
  record: BusinessMonthRecord,
): Record<string, number> {
  const kpis = calculateBusinessKpis(record);
  const vars: Record<string, number> = {
    ads: record.ads,
    closerCommissions: record.closerCommissions,
    carlaBonus: record.carlaBonus,
    bonos: record.bonos || 0,
    newClients: record.newClients,
    highTicketRevenue: record.highTicketRevenue,
    delinquencyRate: record.delinquencyRate,
    highTicketClients: record.highTicketClients,
    activeStudents: record.activeStudents,
    durationMonths: record.durationMonths,
    churnRate: record.churnRate,
    operatingCostMonthly: record.operatingCostMonthly,
    roicOperationalCost: record.roicOperationalCost,
    marketingSalesCost: record.marketingSalesCost,
    acquisitionCost: kpis.acquisitionCost,
    cac: kpis.cac,
    delinquencyLoss: kpis.delinquencyLoss,
    incomePerClient: kpis.incomePerClient,
    costPerClient: kpis.costPerClient,
    totalCostPerClient: kpis.totalCostPerClient,
    operatingMarginPerClient: kpis.operatingMarginPerClient,
    ltgpExcel: kpis.ltgpExcel,
    ltgpProjected: kpis.ltgpProjected,
    cacRatio: kpis.cacRatio,
    benefitPerClient: kpis.benefitPerClient,
    paybackMonths: kpis.paybackMonths,
    roic: kpis.roic,
    salesVelocity: kpis.salesVelocity,
    structuralChurn: kpis.structuralChurn,
    entryVsExit: kpis.entryVsExit,
    grossValueGenerated: kpis.grossValueGenerated,
    roicProfit: kpis.roicProfit,
  };
  if (record.extra) {
    for (const [k, v] of Object.entries(record.extra)) {
      const n = typeof v === "number" ? v : Number(v);
      vars[k] = Number.isFinite(n) ? n : 0;
    }
  }
  return vars;
}

export type FormulaEvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** EvalÃºa una expresiÃ³n contra un diccionario de variables. */
export function evaluateBusinessFormula(
  expression: string,
  variables: Record<string, number>,
): FormulaEvalResult {
  if (!expression || !expression.trim()) {
    return { ok: false, error: "ExpresiÃ³n vacÃ­a." };
  }
  try {
    const tokens = tokenizeFormula(expression);
    if (tokens.length === 0) return { ok: false, error: "ExpresiÃ³n vacÃ­a." };
    const value = parseFormula(tokens, variables);
    if (!Number.isFinite(value)) return { ok: true, value: 0 };
    return { ok: true, value };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || "FÃ³rmula invÃ¡lida") };
  }
}

/** EvalÃºa una fÃ³rmula promediada/sumada sobre una lista de registros. */
export function evaluateFormulaOverRecords(
  expression: string,
  records: BusinessMonthRecord[],
  mode: "sum" | "avg" = "sum",
): FormulaEvalResult {
  if (records.length === 0) return { ok: true, value: 0 };
  let total = 0;
  let count = 0;
  for (const record of records) {
    const r = evaluateBusinessFormula(expression, buildFormulaVariables(record));
    if (!r.ok) return r;
    total += r.value;
    count += 1;
  }
  return { ok: true, value: mode === "avg" ? total / Math.max(count, 1) : total };
}

