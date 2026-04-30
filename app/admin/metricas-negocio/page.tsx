"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  BUSINESS_FORMULAS,
  BUSINESS_METRICS_STORAGE_KEY,
  buildBusinessSeedState,
  calculateBusinessKpis,
  calculateBusinessSummary,
  canAccessBusinessMetrics,
  sortBusinessExpenses,
  sortBusinessRecords,
  type BusinessExpenseEntry,
  type BusinessMetricsState,
  type BusinessMonthRecord,
} from "@/lib/business-metrics";
import {
  AlertTriangle,
  Activity,
  BarChart2,
  Calculator,
  Database,
  DollarSign,
  LineChart,
  Lock,
  Pencil,
  Plus,
  TrendingUp,
  Trash2,
} from "lucide-react";

const EMPTY_MONTH_FORM: BusinessMonthRecord = {
  id: "",
  month: "",
  ads: 0,
  closerCommissions: 0,
  carlaBonus: 0,
  newClients: 0,
  highTicketRevenue: 0,
  delinquencyRate: 0.1,
  highTicketClients: 0,
  activeStudents: 0,
  durationMonths: 4,
  churnRate: 0.25,
  operatingCostMonthly: 0,
  roicOperationalCost: 0,
  marketingSalesCost: 0,
  notes: "",
};

const EMPTY_EXPENSE_FORM: BusinessExpenseEntry = {
  id: "",
  month: "",
  scope: "operativo",
  category: "",
  amount: 0,
  note: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatMonthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function parseNumericInput(value: string) {
  const normalized = value.replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const BM_SESSION_KEY = "bm-vault-auth";
const BM_VAULT_PASSWORD = "JJWEPNTLDIJE";

function BusinessMetricsContent() {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<BusinessMetricsState>(
    buildBusinessSeedState,
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [monthForm, setMonthForm] =
    useState<BusinessMonthRecord>(EMPTY_MONTH_FORM);
  const [expenseForm, setExpenseForm] =
    useState<BusinessExpenseEntry>(EMPTY_EXPENSE_FORM);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [secondaryAuthed, setSecondaryAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(BM_SESSION_KEY) === "1") {
      setSecondaryAuthed(true);
    }
  }, []);

  const handleVaultLogin = () => {
    if (pwInput === BM_VAULT_PASSWORD) {
      sessionStorage.setItem(BM_SESSION_KEY, "1");
      setSecondaryAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BUSINESS_METRICS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BusinessMetricsState>;
        setState({
          records: Array.isArray(parsed.records)
            ? sortBusinessRecords(parsed.records as BusinessMonthRecord[])
            : buildBusinessSeedState().records,
          expenses: Array.isArray(parsed.expenses)
            ? sortBusinessExpenses(parsed.expenses as BusinessExpenseEntry[])
            : buildBusinessSeedState().expenses,
        });
      }
    } catch {
      setState(buildBusinessSeedState());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      BUSINESS_METRICS_STORAGE_KEY,
      JSON.stringify(state),
    );
  }, [hydrated, state]);

  const monthOptions = useMemo(
    () => sortBusinessRecords(state.records).map((record) => record.month),
    [state.records],
  );

  const visibleRecords = useMemo(() => {
    const sorted = sortBusinessRecords(state.records);
    if (selectedMonth === "all") return sorted;
    return sorted.filter((record) => record.month === selectedMonth);
  }, [selectedMonth, state.records]);

  const visibleExpenses = useMemo(() => {
    const sorted = sortBusinessExpenses(state.expenses);
    if (selectedMonth === "all") return sorted;
    return sorted.filter((expense) => expense.month === selectedMonth);
  }, [selectedMonth, state.expenses]);

  const derivedRows = useMemo(
    () =>
      visibleRecords.map((record) => ({
        record,
        kpis: calculateBusinessKpis(record),
      })),
    [visibleRecords],
  );

  const summary = useMemo(
    () => calculateBusinessSummary(visibleRecords),
    [visibleRecords],
  );

  const expenseTotalsByMonth = useMemo(() => {
    const map = new Map<string, { operativo: number; ventas: number }>();
    for (const expense of visibleExpenses) {
      const current = map.get(expense.month) ?? { operativo: 0, ventas: 0 };
      current[expense.scope] += expense.amount;
      map.set(expense.month, current);
    }
    return map;
  }, [visibleExpenses]);

  const activeStudentsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of state.records) {
      map.set(record.month, record.activeStudents);
    }
    return map;
  }, [state.records]);

  const resetMonthForm = () => {
    setMonthForm(EMPTY_MONTH_FORM);
    setEditingMonthId(null);
  };

  const resetExpenseForm = () => {
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setEditingExpenseId(null);
  };

  const upsertMonth = () => {
    if (!monthForm.month) return;
    const nextRecord: BusinessMonthRecord = {
      ...monthForm,
      id: editingMonthId || monthForm.month,
      notes: monthForm.notes?.trim() || "",
    };

    setState((current) => {
      const filtered = current.records.filter(
        (record) => record.id !== editingMonthId,
      );
      const deduped = filtered.filter(
        (record) => record.month !== nextRecord.month,
      );
      return {
        ...current,
        records: sortBusinessRecords([...deduped, nextRecord]),
      };
    });
    resetMonthForm();
  };

  const upsertExpense = () => {
    if (!expenseForm.month || !expenseForm.category.trim()) return;
    const nextExpense: BusinessExpenseEntry = {
      ...expenseForm,
      id:
        editingExpenseId ||
        `${expenseForm.month}-${expenseForm.scope}-${Date.now()}`,
      category: expenseForm.category.trim(),
      note: expenseForm.note?.trim() || "",
    };

    setState((current) => ({
      ...current,
      expenses: sortBusinessExpenses([
        ...current.expenses.filter(
          (expense) => expense.id !== editingExpenseId,
        ),
        nextExpense,
      ]),
    }));
    resetExpenseForm();
  };

  if (isLoading || !hydrated) {
    return null;
  }

  if (!canAccessBusinessMetrics(user)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Módulo confidencial
            </CardTitle>
            <CardDescription>
              Esta sección solo está habilitada para el usuario autorizado del
              área.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Si necesitas abrir acceso a más usuarios, conviene mover esta regla
            a backend y permisos finos.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {!secondaryAuthed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Acceso restringido
              </CardTitle>
              <CardDescription>
                Introduce tu clave para acceder al módulo de inteligencia de
                negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Clave de acceso</Label>
                <Input
                  type="password"
                  value={pwInput}
                  autoFocus
                  placeholder="••••••••••••"
                  onChange={(e) => {
                    setPwInput(e.target.value);
                    setPwError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVaultLogin();
                  }}
                />
                {pwError && (
                  <p className="text-sm text-destructive">
                    Clave incorrecta. Inténtalo de nuevo.
                  </p>
                )}
              </div>
              <Button className="w-full" onClick={handleVaultLogin}>
                Acceder
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inteligencia de negocio</h1>
            <p className="text-sm text-muted-foreground">
              Módulo confidencial con base inicial del Excel, CRUD operativo y
              KPIs recalculados en tiempo real.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Badge variant="secondary" className="justify-center">
              Confidencial
            </Badge>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-55">
                <SelectValue placeholder="Filtrar mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card>
            <CardHeader>
              <CardDescription>CAC ponderado</CardDescription>
              <CardTitle>{formatCurrency(summary.weightedCac)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Coste de adquisición medio ponderado sobre{" "}
              {summary.totalNewClients} altas.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ingreso medio por cliente</CardDescription>
              <CardTitle>
                {formatCurrency(summary.weightedIncomePerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ingreso neto tras morosidad sobre {summary.totalHighTicketClients}{" "}
              clientes HT.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>3. Costo operativo por cliente</CardDescription>
              <CardTitle>
                {formatCurrency(summary.weightedCostPerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Costo operativo mensual medio por alumno activo en el periodo
              filtrado.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>
                Costo operativo por cliente (4 meses)
              </CardDescription>
              <CardTitle>
                {formatCurrency(summary.weightedTotalCostPerClient)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Replica la hoja del Excel a duración media del cliente.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>ROIC medio</CardDescription>
              <CardTitle>{formatPercent(summary.weightedRoic)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Calculado con gastos ROIC y ventas/marketing del periodo filtrado.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Valor bruto generado</CardDescription>
              <CardTitle>
                {formatCurrency(summary.totalGrossValueGenerated)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Suma de clientes HT multiplicada por LTGP réplica Excel.
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" />
                Resumen ejecutivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Facturación HT</span>
                <span>{formatCurrency(summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Inversión adquisición
                </span>
                <span>{formatCurrency(summary.totalAcquisitionCost)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Costo operativo</span>
                <span>{formatCurrency(summary.totalOperatingCost)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Ventas + marketing
                </span>
                <span>{formatCurrency(summary.totalMarketingSalesCost)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  3. Costo operativo por cliente
                </span>
                <span>{formatCurrency(summary.weightedCostPerClient)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Costo operativo por cliente (4 meses)
                </span>
                <span>
                  {formatCurrency(summary.weightedTotalCostPerClient)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Payback medio</span>
                <span>{summary.weightedPaybackMonths.toFixed(2)} meses</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Entrada vs salida media
                </span>
                <span>{summary.avgEntryVsExit.toFixed(2)}x</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-4 w-4" />
                KPI avanzado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Margen medio / cliente
                </span>
                <span>{formatCurrency(summary.weightedMarginPerClient)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">LTGP Excel</span>
                <span>{formatCurrency(summary.weightedLtgpExcel)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">LTGP proyectado</span>
                <span>{formatCurrency(summary.weightedLtgpProjected)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Velocidad de ventas
                </span>
                <span>{formatCurrency(summary.totalSalesVelocity)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Alumnos activos</span>
                <span>{summary.totalActiveStudents}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Clientes HT</span>
                <span>{summary.totalHighTicketClients}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Persistencia actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Los cambios de este módulo quedan guardados en el navegador
                actual para iterar rápido sobre la base del Excel.
              </p>
              <p>Registros mensuales: {state.records.length}</p>
              <p>Partidas de gasto: {state.expenses.length}</p>
              <Button
                variant="outline"
                onClick={() => setState(buildBusinessSeedState())}
              >
                Restaurar base inicial
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Vista general</TabsTrigger>
            <TabsTrigger value="adquisicion">1-2. CAC e Ingresos</TabsTrigger>
            <TabsTrigger value="costos-op">3. Costo operativo</TabsTrigger>
            <TabsTrigger value="rentabilidad">4-8. Rentabilidad</TabsTrigger>
            <TabsTrigger value="roic-detail">9. ROIC detalle</TabsTrigger>
            <TabsTrigger value="dinamica">10-13. Dinámica</TabsTrigger>
            <TabsTrigger value="months">CRUD mensual</TabsTrigger>
            <TabsTrigger value="expenses">Partidas</TabsTrigger>
            <TabsTrigger value="formulas">Fórmulas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>KPIs por mes</CardTitle>
                <CardDescription>
                  Réplica de las pestañas del Excel con una capa adicional de
                  LTGP proyectado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>CAC</TableHead>
                      <TableHead>Ingreso / cliente</TableHead>
                      <TableHead>3. Costo operativo por cliente</TableHead>
                      <TableHead>
                        Costo operativo por cliente (4 meses)
                      </TableHead>
                      <TableHead>Margen op.</TableHead>
                      <TableHead>LTGP Excel</TableHead>
                      <TableHead>LTGP proyectado</TableHead>
                      <TableHead>Payback</TableHead>
                      <TableHead>ROIC</TableHead>
                      <TableHead>Valor bruto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.totalCostPerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.operatingMarginPerClient)}
                        </TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.ltgpProjected)}
                        </TableCell>
                        <TableCell>{kpis.paybackMonths.toFixed(2)} m</TableCell>
                        <TableCell>{formatPercent(kpis.roic)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.grossValueGenerated)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Control de coherencia</CardTitle>
                <CardDescription>
                  Compara la suma de partidas manuales contra los totales
                  declarados en el maestro mensual.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Operativo maestro</TableHead>
                      <TableHead>Operativo partidas</TableHead>
                      <TableHead>Ventas maestro</TableHead>
                      <TableHead>Ventas partidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecords.map((record) => {
                      const totals = expenseTotalsByMonth.get(record.month) ?? {
                        operativo: 0,
                        ventas: 0,
                      };
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {formatMonthLabel(record.month)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(record.roicOperationalCost)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(totals.operativo)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(record.marketingSalesCost)}
                          </TableCell>
                          <TableCell>{formatCurrency(totals.ventas)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="months" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingMonthId ? "Editar mes" : "Nuevo mes"}
                </CardTitle>
                <CardDescription>
                  Este maestro alimenta todos los KPIs: adquisición, ingresos,
                  churn, costos y ROIC.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Input
                    type="month"
                    value={monthForm.month}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        month: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>ADS</Label>
                  <Input
                    type="number"
                    value={monthForm.ads}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        ads: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comisiones closer</Label>
                  <Input
                    type="number"
                    value={monthForm.closerCommissions}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        closerCommissions: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carla + bonos</Label>
                  <Input
                    type="number"
                    value={monthForm.carlaBonus}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        carlaBonus: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nuevos clientes</Label>
                  <Input
                    type="number"
                    value={monthForm.newClients}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        newClients: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ingresos high ticket</Label>
                  <Input
                    type="number"
                    value={monthForm.highTicketRevenue}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        highTicketRevenue: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Morosidad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={monthForm.delinquencyRate}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        delinquencyRate: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clientes HT</Label>
                  <Input
                    type="number"
                    value={monthForm.highTicketClients}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        highTicketClients: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alumnos activos</Label>
                  <Input
                    type="number"
                    value={monthForm.activeStudents}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        activeStudents: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración media</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={monthForm.durationMonths}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        durationMonths: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Churn estructural</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={monthForm.churnRate}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        churnRate: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo operativo mensual</Label>
                  <Input
                    type="number"
                    value={monthForm.operatingCostMonthly}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        operatingCostMonthly: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gasto operativo ROIC</Label>
                  <Input
                    type="number"
                    value={monthForm.roicOperationalCost}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        roicOperationalCost: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ventas + marketing</Label>
                  <Input
                    type="number"
                    value={monthForm.marketingSalesCost}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        marketingSalesCost: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2 xl:col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={monthForm.notes ?? ""}
                    onChange={(e) =>
                      setMonthForm((current) => ({
                        ...current,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
                  <Button onClick={upsertMonth}>
                    {editingMonthId ? "Guardar cambios" : "Agregar mes"}
                  </Button>
                  <Button variant="outline" onClick={resetMonthForm}>
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base mensual</CardTitle>
                <CardDescription>
                  CRUD principal. Desde aquí salen todos los cálculos del panel
                  superior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>ADS</TableHead>
                      <TableHead>Revenue HT</TableHead>
                      <TableHead>Nuevos</TableHead>
                      <TableHead>Activos</TableHead>
                      <TableHead>Costo op.</TableHead>
                      <TableHead>ROIC op.</TableHead>
                      <TableHead>Ventas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortBusinessRecords(state.records).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(record.ads)}</TableCell>
                        <TableCell>
                          {formatCurrency(record.highTicketRevenue)}
                        </TableCell>
                        <TableCell>{record.newClients}</TableCell>
                        <TableCell>{record.activeStudents}</TableCell>
                        <TableCell>
                          {formatCurrency(record.operatingCostMonthly)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(record.roicOperationalCost)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(record.marketingSalesCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMonthForm(record);
                                setEditingMonthId(record.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  records: current.records.filter(
                                    (item) => item.id !== record.id,
                                  ),
                                  expenses: current.expenses.filter(
                                    (expense) => expense.month !== record.month,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingExpenseId ? "Editar partida" : "Nueva partida"}
                </CardTitle>
                <CardDescription>
                  Desglose manual para enriquecer el análisis. Sirve para
                  auditoría y control de origen del gasto.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Input
                    type="month"
                    value={expenseForm.month}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        month: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={expenseForm.scope}
                    onValueChange={(value: "operativo" | "ventas") =>
                      setExpenseForm((current) => ({
                        ...current,
                        scope: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operativo">Operativo</SelectItem>
                      <SelectItem value="ventas">Ventas / marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        amount: parseNumericInput(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 xl:col-span-5">
                  <Label>Nota</Label>
                  <Textarea
                    value={expenseForm.note ?? ""}
                    onChange={(e) =>
                      setExpenseForm((current) => ({
                        ...current,
                        note: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2 xl:col-span-5">
                  <Button onClick={upsertExpense}>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingExpenseId ? "Guardar partida" : "Agregar partida"}
                  </Button>
                  <Button variant="outline" onClick={resetExpenseForm}>
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de partidas</CardTitle>
                <CardDescription>
                  Puedes cargar el gasto con el nivel de detalle que necesites y
                  seguir manteniendo el maestro mensual arriba.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatMonthLabel(expense.month)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              expense.scope === "operativo"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {expense.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="max-w-65 truncate">
                          {expense.note || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpenseForm(expense);
                                setEditingExpenseId(expense.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  expenses: current.expenses.filter(
                                    (item) => item.id !== expense.id,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adquisicion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 1 — CAC (Costo de adquisición de cliente)
                </CardTitle>
                <CardDescription>
                  CAC = (ADS + Comisiones closers + Carla/bonos) ÷ Nuevos
                  clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>ADS</TableHead>
                      <TableHead>Comisiones closers</TableHead>
                      <TableHead>Carla + bonos</TableHead>
                      <TableHead>Total adquisición</TableHead>
                      <TableHead>Nuevos clientes</TableHead>
                      <TableHead>CAC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(record.ads)}</TableCell>
                        <TableCell>
                          {formatCurrency(record.closerCommissions)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(record.carlaBonus)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.acquisitionCost)}
                        </TableCell>
                        <TableCell>{record.newClients}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.cac)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 2 — Ingreso por cliente
                </CardTitle>
                <CardDescription>
                  Ingreso por cliente = (Ingresos HT − pérdida por morosidad) ÷
                  Clientes HT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Ingresos HT</TableHead>
                      <TableHead>% Morosidad</TableHead>
                      <TableHead>Pérdida morosidad</TableHead>
                      <TableHead>Clientes HT</TableHead>
                      <TableHead>Ingreso por cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          {formatCurrency(record.highTicketRevenue)}
                        </TableCell>
                        <TableCell>
                          {formatPercent(record.delinquencyRate)}
                        </TableCell>
                        <TableCell className="text-destructive">
                          {formatCurrency(kpis.delinquencyLoss)}
                        </TableCell>
                        <TableCell>{record.highTicketClients}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costos-op" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Hoja 3 — Costo operativo por cliente
                </CardTitle>
                <CardDescription>
                  Costo por cliente = Costos operativos mensuales ÷ Alumnos
                  activos. Costo total = costo mensual × duración (4 meses).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Costos mensuales</TableHead>
                      <TableHead>Alumnos activos</TableHead>
                      <TableHead>Clientes HT (nuevos)</TableHead>
                      <TableHead>Costo / cliente (mensual)</TableHead>
                      <TableHead>Costo total / cliente (4 meses)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          {formatCurrency(record.operatingCostMonthly)}
                        </TableCell>
                        <TableCell>{record.activeStudents}</TableCell>
                        <TableCell>{record.highTicketClients}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.totalCostPerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Desglose de partidas por mes — Hoja 3 (columnas M:O)
                </CardTitle>
                <CardDescription>
                  Cada línea de gasto con su importe, los alumnos activos del
                  mes y lo que representa individualmente por cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Partida</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Alumnos activos</TableHead>
                      <TableHead>Costo / cliente</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses.map((expense) => {
                      const students =
                        activeStudentsByMonth.get(expense.month) ?? 0;
                      const costPerClient =
                        students > 0 ? expense.amount / students : 0;
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {formatMonthLabel(expense.month)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                expense.scope === "operativo"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {expense.scope}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.category}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>{students}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(costPerClient)}
                          </TableCell>
                          <TableCell className="max-w-52 truncate text-muted-foreground">
                            {expense.note || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rentabilidad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hojas 4 y 5 — Margen operativo y LTGP
                </CardTitle>
                <CardDescription>
                  Margen op. = Ingreso/cliente − Costo op./cliente (Hoja 4).
                  LTGP = Margen op. por cliente (Hoja 5, réplica Excel). LTGP
                  proyectado = Margen × duración.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Ingreso / cliente</TableHead>
                      <TableHead>Costo op. / cliente</TableHead>
                      <TableHead>Margen op. / cliente (H4)</TableHead>
                      <TableHead>LTGP Excel (H5)</TableHead>
                      <TableHead>LTGP proyectado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(kpis.costPerClient)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.operatingMarginPerClient)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(kpis.ltgpExcel)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.ltgpProjected)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 6 — CAC Ratio (Relación LTGP / CAC)
                </CardTitle>
                <CardDescription>
                  CAC Ratio = LTGP ÷ CAC. Un ratio &gt; 3 indica rentabilidad
                  saludable por cliente adquirido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>LTGP</TableHead>
                      <TableHead>CAC</TableHead>
                      <TableHead>CAC Ratio (LTGP ÷ CAC)</TableHead>
                      <TableHead>Evaluación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell className="font-bold">
                          {kpis.cacRatio.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              kpis.cacRatio >= 3
                                ? "default"
                                : kpis.cacRatio >= 1
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {kpis.cacRatio >= 3
                              ? "Saludable"
                              : kpis.cacRatio >= 1
                                ? "Ajustado"
                                : "Por debajo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 7 — Beneficio por cliente
                </CardTitle>
                <CardDescription>
                  Beneficio por cliente = LTGP − CAC. Representa el beneficio
                  neto generado por cada cliente tras recuperar el coste de
                  adquisición.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>LTGP</TableHead>
                      <TableHead>CAC</TableHead>
                      <TableHead>Beneficio por cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell
                          className={`font-bold ${kpis.benefitPerClient >= 0 ? "" : "text-destructive"}`}
                        >
                          {formatCurrency(kpis.benefitPerClient)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  Hoja 8 — Periodo de recuperación (Payback)
                </CardTitle>
                <CardDescription>
                  Payback = CAC ÷ (Ingreso por cliente ÷ Duración). Indica en
                  cuántos meses se recupera el coste de adquisición.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>CAC</TableHead>
                      <TableHead>Ingreso / cliente real</TableHead>
                      <TableHead>Ing. ÷ Duración (mensual)</TableHead>
                      <TableHead>Payback en meses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{formatCurrency(kpis.cac)}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            kpis.incomePerClient / record.durationMonths,
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {kpis.paybackMonths.toFixed(2)} meses
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roic-detail" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hoja 9 — ROIC (Retorno sobre la inversión operativa)
                </CardTitle>
                <CardDescription>
                  ROIC = Profit ÷ (Gasto operativo + Ventas/mkt). Profit =
                  Ingresos HT − Gasto op. − Gasto ventas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Ingresos HT</TableHead>
                      <TableHead>Gastos operativos</TableHead>
                      <TableHead>Costos ventas/mkt</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>ROIC</TableHead>
                      <TableHead>Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>
                          {formatCurrency(record.highTicketRevenue)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(record.roicOperationalCost)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(record.marketingSalesCost)}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${kpis.roicProfit >= 0 ? "" : "text-destructive"}`}
                        >
                          {formatCurrency(kpis.roicProfit)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatPercent(kpis.roic)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Por cada €1 invertido, generas €
                          {Math.max(0, kpis.roic).toFixed(2)} adicional
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Desglose de partidas ventas/mkt (Hoja 9 — columnas K:N)
                </CardTitle>
                <CardDescription>
                  Partidas de tipo &quot;ventas&quot; cargadas en la pestaña
                  Partidas. Equivalen a la columna &quot;Ventas&quot; del SUMIFS
                  de la hoja 9.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleExpenses
                      .filter((e) => e.scope === "ventas")
                      .map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {formatMonthLabel(expense.month)}
                          </TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="max-w-60 truncate text-muted-foreground">
                            {expense.note || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dinamica" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Hoja 10 — Velocidad de ventas
                </CardTitle>
                <CardDescription>
                  Velocidad de ventas = Clientes mensuales × Ingreso por
                  cliente. Mide el volumen de valor generado por las ventas en
                  el mes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Clientes mensuales</TableHead>
                      <TableHead>Ingreso / cliente</TableHead>
                      <TableHead>Velocidad de ventas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{record.newClients}</TableCell>
                        <TableCell>
                          {formatCurrency(kpis.incomePerClient)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.salesVelocity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Hoja 11 — Rotación estructural
                </CardTitle>
                <CardDescription>
                  Rotación estructural = Clientes activos × Churn. Estima
                  cuántos clientes salen mensualmente del sistema de forma
                  natural.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Clientes activos</TableHead>
                      <TableHead>Churn estructural</TableHead>
                      <TableHead>Clientes que rotan (salidas)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{record.activeStudents}</TableCell>
                        <TableCell>{formatPercent(record.churnRate)}</TableCell>
                        <TableCell className="font-bold">
                          {kpis.structuralChurn.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Hoja 12 — Relación entrada vs salida
                </CardTitle>
                <CardDescription>
                  Entrada vs salida = Ventas ÷ Rotación estructural. Si es &gt;
                  1, el negocio crece. Si es &lt; 1, pierde base.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Ventas (entradas)</TableHead>
                      <TableHead>Rotación estructural (salidas)</TableHead>
                      <TableHead>Entrada vs salida</TableHead>
                      <TableHead>Tendencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{record.newClients}</TableCell>
                        <TableCell>{kpis.structuralChurn.toFixed(1)}</TableCell>
                        <TableCell className="font-bold">
                          {kpis.entryVsExit.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              kpis.entryVsExit >= 1.2
                                ? "default"
                                : kpis.entryVsExit >= 1
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {kpis.entryVsExit >= 1.2
                              ? "Crecimiento"
                              : kpis.entryVsExit >= 1
                                ? "Estable"
                                : "Decrecimiento"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hoja 13 — Valor bruto generado por mes
                </CardTitle>
                <CardDescription>
                  Valor bruto = Clientes HT × LTGP. Representa el valor total
                  que se genera en el mes a lo largo de toda la vida de los
                  clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Clientes HT</TableHead>
                      <TableHead>LTGP</TableHead>
                      <TableHead>Valor bruto generado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derivedRows.map(({ record, kpis }) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatMonthLabel(record.month)}</TableCell>
                        <TableCell>{record.highTicketClients}</TableCell>
                        <TableCell>{formatCurrency(kpis.ltgpExcel)}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(kpis.grossValueGenerated)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mapa de fórmulas</CardTitle>
                <CardDescription>
                  Traducción directa del Excel y capa mejorada con LTGP
                  proyectado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {BUSINESS_FORMULAS.map((item, index) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {item.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.formula}
                        </p>
                      </div>
                    </div>
                    {index < BUSINESS_FORMULAS.length - 1 ? (
                      <Separator />
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function BusinessMetricsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <BusinessMetricsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
