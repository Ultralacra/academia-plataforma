"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  CreditCard,
  Plus,
  Settings,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
  Eye,
  Upload,
  FileText,
  History,
  Clock,
  Split,
  Gift,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { getPayments, createManualPayment, type Payment } from "./api";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { BONOS_CONTRACTUALES, BONOS_EXTRA } from "@/lib/bonos";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PaymentConfig = {
  frequency: "mensual" | "trimestral" | "semanal" | "unico";
  startDate: string;
  amount: number;
  currency: string;
  dayOfMonth?: number; // Para mensual
  hasReservation?: boolean;
  reservationAmount?: number;
  reservationDate?: string;
  installments: {
    id: string;
    date: string;
    amount: number;
    type: "regular" | "extra" | "bono" | "reserva";
    concept?: string;
  }[];
};

type ChangeLog = {
  id: string;
  date: string;
  action: string;
  details: string;
};

export default function StudentPaymentsPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [logs, setLogs] = useState<ChangeLog[]>([]);

  // Modals
  const [configOpen, setConfigOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [addInstallmentOpen, setAddInstallmentOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Form states
  const [newPayment, setNewPayment] = useState({
    monto: "",
    moneda: "USD",
    fecha_pago: new Date().toISOString().split("T")[0],
    metodo_pago: "transferencia",
    referencia: "",
    observaciones: "",
    comprobante_url: "",
  });

  const [newInstallment, setNewInstallment] = useState<{
    type: "regular" | "extra" | "bono";
    amount: string;
    date: string;
    concept: string;
  }>({
    type: "extra",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    concept: "",
  });

  const [tempConfig, setTempConfig] = useState<PaymentConfig>({
    frequency: "mensual",
    startDate: new Date().toISOString().split("T")[0],
    amount: 0,
    currency: "USD",
    hasReservation: false,
    reservationAmount: 0,
    reservationDate: new Date().toISOString().split("T")[0],
    installments: [],
  });

  const [initialBonuses, setInitialBonuses] = useState<
    { name: string; amount: number }[]
  >([]);
  const [newBono, setNewBono] = useState({ name: "", amount: "" });
  const [bonoSelectValue, setBonoSelectValue] = useState("");

  // State for editing installments
  const [editingInstallments, setEditingInstallments] = useState<
    PaymentConfig["installments"]
  >([]);

  // Recalculate state
  const [recalcPopoverOpen, setRecalcPopoverOpen] = useState(false);
  const [recalcDate, setRecalcDate] = useState("");

  // Split state
  const [splitPopoverOpen, setSplitPopoverOpen] = useState<string | null>(null);
  const [splitData, setSplitData] = useState<{
    parts: number;
    dates: string[];
  }>({
    parts: 2,
    dates: [],
  });

  useEffect(() => {
    loadData();
    loadConfig();
    loadLogs();
  }, [code]);

  async function loadData() {
    setLoading(true);
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    const raw = localStorage.getItem(`mock-payments-${code}`);
    if (raw) {
      setPayments(JSON.parse(raw));
    } else {
      setPayments([]);
    }
    setLoading(false);
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(`payment-config-${code}`);
      if (raw) {
        setConfig(JSON.parse(raw));
      }
    } catch {}
  }

  function loadLogs() {
    try {
      const raw = localStorage.getItem(`payment-logs-${code}`);
      if (raw) {
        setLogs(JSON.parse(raw));
      }
    } catch {}
  }

  function saveConfig() {
    // Generate installments based on 4 months duration
    const installments: PaymentConfig["installments"] = [];
    const start = new Date(tempConfig.startDate);
    let totalAmount = tempConfig.amount;

    // Handle Reservation
    if (tempConfig.hasReservation && tempConfig.reservationAmount) {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        date: tempConfig.reservationDate || tempConfig.startDate,
        amount: tempConfig.reservationAmount,
        type: "reserva",
        concept: "Reserva / Matrícula",
      });
      totalAmount -= tempConfig.reservationAmount;
    }

    if (tempConfig.frequency === "unico") {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        date: tempConfig.startDate,
        amount: totalAmount,
        type: "regular" as const,
      });
    } else if (tempConfig.frequency === "mensual") {
      // 4 months = 4 payments
      const installmentAmount = totalAmount / 4;
      for (let i = 0; i < 4; i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          date: d.toISOString().split("T")[0],
          amount: installmentAmount,
          type: "regular" as const,
        });
      }
    } else if (tempConfig.frequency === "trimestral") {
      // 4 months duration. 2 payments (Month 0 and Month 3)
      const installmentAmount = totalAmount / 2;
      for (let i = 0; i < 2; i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i * 3);
        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          date: d.toISOString().split("T")[0],
          amount: installmentAmount,
          type: "regular" as const,
        });
      }
    } else if (tempConfig.frequency === "semanal") {
      // 4 months * 4 weeks = 16 weeks
      const installmentAmount = totalAmount / 16;
      for (let i = 0; i < 16; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        installments.push({
          id: Math.random().toString(36).substr(2, 9),
          date: d.toISOString().split("T")[0],
          amount: installmentAmount,
          type: "regular" as const,
        });
      }
    }

    // Add bonuses as installments
    initialBonuses.forEach((bono) => {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        date: tempConfig.startDate, // Default to start date
        amount: bono.amount,
        type: "bono" as const,
        concept: bono.name,
      });
    });

    // Recalculate total amount to include bonuses?
    // User said "monto base se debe dividir... ademas... agregar los bonos"
    // So the total config amount should probably reflect everything.
    const totalWithBonuses =
      tempConfig.amount + initialBonuses.reduce((sum, b) => sum + b.amount, 0);

    const newConfig = {
      ...tempConfig,
      amount: totalWithBonuses,
      installments,
    };
    localStorage.setItem(`payment-config-${code}`, JSON.stringify(newConfig));
    setConfig(newConfig);
    setConfigOpen(false);
    toast({ title: "Configuración guardada y cuotas generadas" });
  }

  function openRegisterModal() {
    // Find first unpaid installment
    const nextUnpaid = upcomingPayments.find((p) => p.status !== "paid");
    if (nextUnpaid) {
      setNewPayment({
        monto: String(nextUnpaid.amount),
        moneda: config?.currency || "USD",
        fecha_pago: format(nextUnpaid.date, "yyyy-MM-dd"),
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: `Pago cuota ${format(nextUnpaid.date, "dd/MM/yyyy")}`,
        comprobante_url: "",
      });
    } else {
      // Default empty
      setNewPayment({
        monto: "",
        moneda: config?.currency || "USD",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: "",
        comprobante_url: "",
      });
    }
    setRegisterOpen(true);
  }

  function handleValidatePayment(amount: number, date: Date) {
    setNewPayment({
      ...newPayment,
      monto: String(amount),
      fecha_pago: format(date, "yyyy-MM-dd"),
      observaciones: `Pago cuota ${format(date, "dd/MM/yyyy")}`,
      comprobante_url: "",
    });
    setRegisterOpen(true);
  }

  function handleSplitInstallment(originalId: string) {
    const originalIndex = editingInstallments.findIndex(
      (i) => i.id === originalId
    );
    if (originalIndex === -1) return;

    const original = editingInstallments[originalIndex];
    const parts = splitData.parts;

    if (parts < 2) {
      toast({
        title: "Error",
        description: "Debe dividir en al menos 2 partes",
        variant: "destructive",
      });
      return;
    }

    // Validate dates: "sin pasar la fecha de la cuota original"
    const originalDateObj = new Date(original.date);
    // Ensure we have enough dates, fill with original date if missing
    const datesToUse = [...splitData.dates];
    while (datesToUse.length < parts) {
      datesToUse.push(original.date);
    }

    for (const dStr of datesToUse) {
      if (new Date(dStr) > originalDateObj) {
        toast({
          title: "Fecha inválida",
          description:
            "Las fechas de las partes no pueden ser posteriores a la fecha original.",
          variant: "destructive",
        });
        return;
      }
    }

    const amountPerPart = original.amount / parts;
    const newInstallmentsToAdd = [];

    for (let i = 0; i < parts; i++) {
      newInstallmentsToAdd.push({
        ...original,
        id: i === 0 ? original.id : Math.random().toString(36).substr(2, 9),
        amount: amountPerPart,
        date: datesToUse[i],
        concept: `${original.concept || "Cuota"} (Parte ${i + 1}/${parts})`,
      });
    }

    const newInstallments = [...editingInstallments];
    newInstallments.splice(originalIndex, 1, ...newInstallmentsToAdd);

    setEditingInstallments(newInstallments);
    setSplitPopoverOpen(null);
    setSplitData({ parts: 2, dates: [] });
    toast({ title: "Cuota dividida exitosamente" });
  }

  function handleDateChange(index: number, newDate: string) {
    const newInst = [...editingInstallments];
    newInst[index].date = newDate;
    setEditingInstallments(newInst);
  }

  function handleRecalculateDates(startDate: string) {
    if (!startDate) return;

    const newInst = [...editingInstallments];

    // Find first unpaid installment
    const firstUnpaidIndex = newInst.findIndex((i) => !isInstallmentPaid(i));

    if (firstUnpaidIndex === -1) {
      toast({
        title: "No hay cuotas pendientes para recalcular",
        variant: "destructive",
      });
      return;
    }

    const oldDate = new Date(newInst[firstUnpaidIndex].date);
    const newStart = new Date(startDate);
    const diffTime = newStart.getTime() - oldDate.getTime();

    // Apply shift to all unpaid installments starting from the first one found
    for (let i = firstUnpaidIndex; i < newInst.length; i++) {
      if (!isInstallmentPaid(newInst[i])) {
        const current = new Date(newInst[i].date);
        const shifted = new Date(current.getTime() + diffTime);
        newInst[i].date = shifted.toISOString().split("T")[0];
      }
    }

    setEditingInstallments(newInst);
    setRecalcPopoverOpen(false);
    toast({ title: "Fechas recalculadas" });
  }

  function saveEditedPlan() {
    if (!config) return;

    // Generate logs
    const newLogs: ChangeLog[] = [];
    const now = new Date().toISOString();

    // Check for changes in existing installments
    config.installments.forEach((oldInst) => {
      const newInst = editingInstallments.find((i) => i.id === oldInst.id);
      if (newInst) {
        if (oldInst.date !== newInst.date) {
          newLogs.push({
            id: Math.random().toString(36),
            date: now,
            action: "Cambio de fecha",
            details: `Cuota ${new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: config.currency,
            }).format(oldInst.amount)}: Fecha cambiada de ${oldInst.date} a ${
              newInst.date
            }`,
          });
        }
        if (oldInst.amount !== newInst.amount) {
          newLogs.push({
            id: Math.random().toString(36),
            date: now,
            action: "Cambio de monto",
            details: `Cuota del ${oldInst.date}: Monto cambiado de ${oldInst.amount} a ${newInst.amount}`,
          });
        }
      } else {
        // Check if it was split (exists but with different ID? No, split keeps one ID and adds another)
        // If ID is gone, it was deleted.
      }
    });

    // Check for new installments (splits or adds)
    editingInstallments.forEach((newInst) => {
      const oldInst = config.installments.find((i) => i.id === newInst.id);
      if (!oldInst) {
        newLogs.push({
          id: Math.random().toString(36),
          date: now,
          action: "Cuota agregada/dividida",
          details: `Nueva cuota de ${newInst.amount} para el ${newInst.date}`,
        });
      }
    });

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(`payment-logs-${code}`, JSON.stringify(updatedLogs));

    // Recalculate total amount
    const newTotal = editingInstallments.reduce(
      (sum, inst) => sum + inst.amount,
      0
    );

    const newConfig = {
      ...config,
      amount: newTotal,
      installments: editingInstallments,
    };
    localStorage.setItem(`payment-config-${code}`, JSON.stringify(newConfig));
    setConfig(newConfig);
    setEditPlanOpen(false);
    toast({
      title: "Plan de pagos actualizado",
      description: `Nuevo total del programa: ${new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: config.currency,
      }).format(newTotal)}`,
    });
  }

  function handleAddInstallment() {
    setEditingInstallments([
      ...editingInstallments,
      {
        id: Math.random().toString(36).substr(2, 9),
        date: newInstallment.date,
        amount: Number(newInstallment.amount),
        type: newInstallment.type,
        concept: newInstallment.concept,
      },
    ]);
    setAddInstallmentOpen(false);
    // Reset form
    setNewInstallment({
      type: "extra",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      concept: "",
    });
  }

  function openEditPlan() {
    if (config) {
      setEditingInstallments([...config.installments]);
      setEditPlanOpen(true);
    }
  }

  async function handleRegisterPayment() {
    try {
      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newPay: Payment = {
        id: Math.random().toString(36),
        codigo_cliente: code,
        monto: Number(newPayment.monto),
        moneda: newPayment.moneda,
        fecha_pago: newPayment.fecha_pago,
        metodo_pago: newPayment.metodo_pago,
        referencia: newPayment.referencia,
        observaciones: newPayment.observaciones,
        comprobante_url: newPayment.comprobante_url,
        estado: "completed",
        created_at: new Date().toISOString(),
      };

      const updatedPayments = [...payments, newPay];
      setPayments(updatedPayments);
      localStorage.setItem(
        `mock-payments-${code}`,
        JSON.stringify(updatedPayments)
      );

      toast({
        title: "Pago registrado exitosamente",
        description: "El pago ha sido validado y registrado en el sistema.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setRegisterOpen(false);
      // Reset form
      setNewPayment({
        monto: config ? String(config.amount) : "",
        moneda: config ? config.currency : "USD",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        referencia: "",
        observaciones: "",
        comprobante_url: "",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al registrar pago", variant: "destructive" });
    }
  }

  // Helper to check if installment is paid (for edit modal)
  const isInstallmentPaid = (inst: any) => {
    const d = new Date(inst.date);
    return payments.some((p) => {
      const pDate = new Date(p.fecha_pago);
      const diff = Math.abs(pDate.getTime() - d.getTime());
      // Match if within 5 days and amount is similar (heuristic)
      return diff < 86400000 * 5 && Math.abs(Number(p.monto) - inst.amount) < 1;
    });
  };

  // Generar próximos pagos estimados
  const upcomingPayments = useMemo(() => {
    if (!config || !config.installments) return [];

    // Create a copy of payments to track usage
    // We need to track which payment IDs have been used
    const usedPaymentIds = new Set<string>();

    // Sort installments by date to match earliest first
    const sortedInstallments = [...config.installments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedInstallments.map((inst) => {
      const d = new Date(inst.date);
      const now = new Date();

      // Find a matching payment that hasn't been used yet
      const matchingPayment = payments.find((p) => {
        if (usedPaymentIds.has(String(p.id))) return false;

        const pDate = new Date(p.fecha_pago);
        const diff = Math.abs(pDate.getTime() - d.getTime());
        const amountMatch = Math.abs(Number(p.monto) - inst.amount) < 1; // Allow small float diff

        // Match if within 5 days AND amount matches
        return diff < 86400000 * 5 && amountMatch;
      });

      let isPaid = false;
      if (matchingPayment) {
        isPaid = true;
        usedPaymentIds.add(String(matchingPayment.id));
      }

      const daysDiff = differenceInDays(d, now);
      const isNearDue = !isPaid && daysDiff <= 5 && daysDiff >= 0;

      return {
        date: d,
        amount: inst.amount,
        type: inst.type || "regular",
        concept: inst.concept,
        status: isPaid ? "paid" : d < now ? "overdue" : "pending",
        isNearDue,
      };
    });
  }, [config, payments]);

  // Calculate totals
  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => p.estado === "completed" || p.estado === "aprobado")
      .reduce((sum, p) => sum + Number(p.monto), 0);
  }, [payments]);

  const remainingBalance = useMemo(() => {
    if (!config) return 0;
    return Math.max(0, config.amount - totalPaid);
  }, [config, totalPaid]);

  const bonuses = useMemo(() => {
    if (!config) return [];
    return config.installments.filter((i) => i.type === "bono");
  }, [config]);

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "equipo"]}>
      <DashboardLayout>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Seguimiento de pagos
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfigOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              {config ? "Configurar plan" : "Configuración inicial"}
            </Button>
            <Button onClick={openRegisterModal}>
              <Plus className="w-4 h-4 mr-2" /> Registrar pago
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Próximos pagos / Plan */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Plan de pagos
                  </div>
                  {config && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={openEditPlan}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!config ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <p>No hay configuración de pagos.</p>
                    <Button
                      variant="link"
                      onClick={() => setConfigOpen(true)}
                      className="mt-2"
                    >
                      Iniciar configuración
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frecuencia:</span>
                      <span className="capitalize font-medium">
                        {config.frequency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto base:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(config.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pagado:</span>
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Pendiente por pagar:
                      </span>
                      <span className="font-bold text-red-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: config.currency,
                          maximumFractionDigits: 0,
                        }).format(remainingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Inicio:</span>
                      <span>
                        {format(new Date(config.startDate), "dd MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium mb-3">
                        Próximos vencimientos
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {upcomingPayments.map((item, i) => {
                          const isNextToPay = !upcomingPayments
                            .slice(0, i)
                            .some((p) => p.status !== "paid");

                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2 rounded border text-sm ${
                                item.status === "paid"
                                  ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900"
                                  : item.status === "overdue"
                                  ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900"
                                  : item.isNearDue
                                  ? "bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900"
                                  : "bg-card"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {item.status === "paid" ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : item.status === "overdue" ? (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                ) : item.isNearDue ? (
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted" />
                                )}
                                <div className="flex flex-col">
                                  <span
                                    className={
                                      item.status === "paid"
                                        ? "text-muted-foreground line-through"
                                        : ""
                                    }
                                  >
                                    {format(item.date, "dd MMM yyyy", {
                                      locale: es,
                                    })}
                                  </span>
                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize font-medium text-primary">
                                      {item.concept || item.type}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {item.status === "paid"
                                        ? "Pagado"
                                        : item.status === "overdue"
                                        ? "Vencido"
                                        : item.isNearDue
                                        ? "Vence pronto"
                                        : "Pendiente"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="font-medium flex flex-col items-end gap-1">
                                <span>
                                  {new Intl.NumberFormat("es-CO", {
                                    style: "currency",
                                    currency: config.currency,
                                    maximumFractionDigits: 0,
                                  }).format(item.amount)}
                                </span>
                                {item.status !== "paid" && isNextToPay && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={() =>
                                      handleValidatePayment(
                                        item.amount,
                                        item.date
                                      )
                                    }
                                  >
                                    Validar
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Historial y Bonos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bonos Card */}
            {bonuses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-4 h-4" /> Bonos Incluidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonuses.map((bono, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {bono.concept}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Valorado en{" "}
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: config?.currency || "USD",
                              maximumFractionDigits: 0,
                            }).format(bono.amount)}
                          </span>
                        </div>
                        <Badge variant="secondary">Incluido</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Cargando pagos...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No hay pagos registrados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {p.fecha_pago
                              ? format(new Date(p.fecha_pago), "dd MMM yyyy", {
                                  locale: es,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {p.observaciones || "Pago registrado"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: p.moneda || "USD",
                              maximumFractionDigits: 0,
                            }).format(Number(p.monto))}
                          </TableCell>
                          <TableCell className="capitalize">
                            {p.metodo_pago}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                p.estado === "aprobado" ||
                                p.estado === "completed"
                                  ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
                              }
                            >
                              {p.estado === "completed" ||
                              p.estado === "aprobado"
                                ? "Completado"
                                : p.estado === "pending"
                                ? "Pendiente"
                                : p.estado || "Completado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(p);
                                setDetailModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Historial de Cambios (Logs) */}
        {logs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> Historial de cambios en el plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.details}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {format(new Date(log.date), "dd MMM yyyy HH:mm", {
                        locale: es,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal Configuración */}
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configuración de pagos</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select
                    value={tempConfig.frequency}
                    onValueChange={(v: any) =>
                      setTempConfig({ ...tempConfig, frequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="unico">Pago Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={tempConfig.startDate}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Total del Programa</Label>
                  <Input
                    type="number"
                    value={tempConfig.amount}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={tempConfig.currency}
                    onValueChange={(v) =>
                      setTempConfig({ ...tempConfig, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sección Reserva */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <Label>¿Llegó por reserva?</Label>
                    <p className="text-xs text-muted-foreground">
                      Si se activa, el monto de reserva se descontará del total
                      a dividir en cuotas.
                    </p>
                  </div>
                  <Switch
                    checked={tempConfig.hasReservation}
                    onCheckedChange={(c) =>
                      setTempConfig({ ...tempConfig, hasReservation: c })
                    }
                  />
                </div>
                {tempConfig.hasReservation && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Monto Reserva</Label>
                      <Input
                        type="number"
                        value={tempConfig.reservationAmount}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            reservationAmount: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de pago Reserva</Label>
                      <Input
                        type="date"
                        value={tempConfig.reservationDate}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            reservationDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección de Bonos Iniciales */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Bonos / Extras Iniciales</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newBono.name && newBono.amount) {
                        setInitialBonuses([
                          ...initialBonuses,
                          {
                            name: newBono.name,
                            amount: Number(newBono.amount),
                          },
                        ]);
                        setNewBono({ name: "", amount: "" });
                        setBonoSelectValue("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>
                <div className="flex gap-2 mb-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={bonoSelectValue}
                      onValueChange={(v) => {
                        setBonoSelectValue(v);
                        if (v !== "custom") {
                          setNewBono({ ...newBono, name: v });
                        } else {
                          setNewBono({ ...newBono, name: "" });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bono..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Contractuales</SelectLabel>
                          {BONOS_CONTRACTUALES.map((b) => (
                            <SelectItem key={b.key} value={b.title}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Extras</SelectLabel>
                          {BONOS_EXTRA.map((b) => (
                            <SelectItem key={b.key} value={b.title}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Otro</SelectLabel>
                          <SelectItem value="custom">
                            Otro (Escribir manual)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {bonoSelectValue === "custom" && (
                      <Input
                        placeholder="Nombre del bono"
                        value={newBono.name}
                        onChange={(e) =>
                          setNewBono({ ...newBono, name: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="Monto"
                    value={newBono.amount}
                    onChange={(e) =>
                      setNewBono({ ...newBono, amount: e.target.value })
                    }
                    className="w-[100px]"
                  />
                </div>
                {initialBonuses.length > 0 && (
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {initialBonuses.map((b, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm bg-muted p-2 rounded"
                      >
                        <span>{b.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: tempConfig.currency,
                            }).format(b.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => {
                              const newBonuses = [...initialBonuses];
                              newBonuses.splice(i, 1);
                              setInitialBonuses(newBonuses);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveConfig}>Guardar configuración</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Plan (Cuotas) */}
        <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar Plan de Pagos</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground">
                    Ajusta las fechas y montos de las cuotas generadas.
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Total calculado:{" "}
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: config?.currency || "USD",
                    }).format(
                      editingInstallments.reduce((sum, i) => sum + i.amount, 0)
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Popover
                    open={recalcPopoverOpen}
                    onOpenChange={setRecalcPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recalcular fechas
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 z-[9999]" align="end">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">
                            Recalcular desde
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Selecciona la nueva fecha para la primera cuota
                            pendiente.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={recalcDate}
                            onChange={(e) => setRecalcDate(e.target.value)}
                          />
                          <Button
                            onClick={() => handleRecalculateDates(recalcDate)}
                          >
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddInstallmentOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar cuota
                  </Button>
                </div>
              </div>

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingInstallments.map((inst, index) => {
                      const isPaid = isInstallmentPaid(inst);
                      return (
                        <TableRow
                          key={inst.id}
                          className={isPaid ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Select
                              value={inst.type || "regular"}
                              disabled={isPaid}
                              onValueChange={(v: any) => {
                                const newInst = [...editingInstallments];
                                newInst[index].type = v;
                                setEditingInstallments(newInst);
                              }}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="extra">Extra</SelectItem>
                                <SelectItem value="bono">Bono</SelectItem>
                                <SelectItem value="reserva">Reserva</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={inst.date}
                              disabled={isPaid}
                              onChange={(e) =>
                                handleDateChange(index, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={inst.amount}
                              disabled={isPaid}
                              onChange={(e) => {
                                const newInst = [...editingInstallments];
                                newInst[index].amount = Number(e.target.value);
                                setEditingInstallments(newInst);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {isPaid ? (
                              <Badge variant="secondary" className="text-xs">
                                Pagada
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Dividir cuota"
                                  onClick={() => {
                                    setSplitData({ parts: 2, dates: [] });
                                    setSplitPopoverOpen(inst.id);
                                  }}
                                >
                                  <Split className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    const newInst = editingInstallments.filter(
                                      (i) => i.id !== inst.id
                                    );
                                    setEditingInstallments(newInst);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPlanOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveEditedPlan}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Agregar Cuota Extra */}
        <Dialog open={addInstallmentOpen} onOpenChange={setAddInstallmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar nueva cuota</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de cuota</Label>
                <Select
                  value={newInstallment.type}
                  onValueChange={(v: any) =>
                    setNewInstallment({ ...newInstallment, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Cuota Regular</SelectItem>
                    <SelectItem value="extra">Cuota Extra</SelectItem>
                    <SelectItem value="bono">Bono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newInstallment.type === "bono" ? (
                <div className="space-y-2">
                  <Label>Seleccionar Bono</Label>
                  <Select
                    value={newInstallment.concept}
                    onValueChange={(v) =>
                      setNewInstallment({ ...newInstallment, concept: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar bono..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Contractuales</SelectLabel>
                        {BONOS_CONTRACTUALES.map((b) => (
                          <SelectItem key={b.key} value={b.title}>
                            {b.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Extras</SelectLabel>
                        {BONOS_EXTRA.map((b) => (
                          <SelectItem key={b.key} value={b.title}>
                            {b.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Concepto (Opcional)</Label>
                  <Input
                    value={newInstallment.concept}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        concept: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={newInstallment.date}
                  onChange={(e) =>
                    setNewInstallment({
                      ...newInstallment,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={newInstallment.amount}
                  onChange={(e) =>
                    setNewInstallment({
                      ...newInstallment,
                      amount: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddInstallmentOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddInstallment}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Pago */}
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Ingresa los detalles del pago recibido.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={newPayment.monto}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, monto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={newPayment.moneda}
                    onValueChange={(v) =>
                      setNewPayment({ ...newPayment, moneda: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input
                  type="date"
                  value={newPayment.fecha_pago}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, fecha_pago: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={newPayment.metodo_pago}
                  onValueChange={(v) =>
                    setNewPayment({ ...newPayment, metodo_pago: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia / Comprobante</Label>
                <Input
                  value={newPayment.referencia}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, referencia: e.target.value })
                  }
                  placeholder="Nro. de transacción"
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input
                  value={newPayment.observaciones}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      observaciones: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPayment}>Registrar Pago</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Dividir Cuota */}
        <Dialog
          open={!!splitPopoverOpen}
          onOpenChange={(open) => !open && setSplitPopoverOpen(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Dividir cuota</DialogTitle>
              <DialogDescription>
                Divide esta cuota en varias partes. El monto se dividirá
                equitativamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parts" className="text-right">
                  Cantidad de partes
                </Label>
                <Input
                  id="parts"
                  type="number"
                  min={2}
                  max={12}
                  className="col-span-3"
                  value={splitData.parts}
                  onChange={(e) =>
                    setSplitData({
                      ...splitData,
                      parts: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {Array.from({ length: splitData.parts }).map((_, i) => {
                  const originalInst = editingInstallments.find(
                    (inst) => inst.id === splitPopoverOpen
                  );
                  const amount = originalInst
                    ? originalInst.amount / splitData.parts
                    : 0;
                  // Default date is original date if not set
                  const date =
                    splitData.dates[i] ||
                    (originalInst ? originalInst.date : "");

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-2 gap-2 items-center border p-2 rounded"
                    >
                      <div className="text-sm">
                        <span className="font-medium">Parte {i + 1}</span>
                        <div className="text-muted-foreground">
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: config?.currency || "USD",
                          }).format(amount)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          Fecha límite
                        </Label>
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            const newDates = [...splitData.dates];
                            // Fill gaps if needed with original date
                            while (newDates.length < splitData.parts) {
                              newDates.push(originalInst?.date || "");
                            }
                            newDates[i] = e.target.value;
                            setSplitData({ ...splitData, dates: newDates });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSplitPopoverOpen(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  splitPopoverOpen && handleSplitInstallment(splitPopoverOpen)
                }
              >
                Confirmar división
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Detalle de Pago */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle del Pago</DialogTitle>
              <DialogDescription>
                Información completa de la transacción.
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Fecha y Hora
                    </Label>
                    <p className="font-medium">
                      {selectedPayment.created_at
                        ? format(
                            new Date(selectedPayment.created_at),
                            "dd MMM yyyy HH:mm:ss",
                            { locale: es }
                          )
                        : format(
                            new Date(selectedPayment.fecha_pago),
                            "dd MMM yyyy",
                            { locale: es }
                          )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Monto
                    </Label>
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: selectedPayment.moneda || "USD",
                      }).format(Number(selectedPayment.monto))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Método
                    </Label>
                    <p className="capitalize">{selectedPayment.metodo_pago}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Estado
                    </Label>
                    <Badge
                      variant="outline"
                      className={
                        selectedPayment.estado === "aprobado" ||
                        selectedPayment.estado === "completed"
                          ? "mt-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                          : "mt-1 bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
                      }
                    >
                      {selectedPayment.estado === "completed" ||
                      selectedPayment.estado === "aprobado"
                        ? "Completado"
                        : selectedPayment.estado === "pending"
                        ? "Pendiente"
                        : selectedPayment.estado || "Completado"}
                    </Badge>
                  </div>
                </div>

                {selectedPayment.referencia && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Referencia
                    </Label>
                    <p className="font-mono text-sm">
                      {selectedPayment.referencia}
                    </p>
                  </div>
                )}

                {selectedPayment.observaciones && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Observaciones
                    </Label>
                    <p className="text-sm">{selectedPayment.observaciones}</p>
                  </div>
                )}

                <div className="border-t pt-4 mt-2">
                  <Label className="mb-2 block">Comprobante de Pago</Label>
                  {selectedPayment.comprobante_url ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      {/* Mock image display */}
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <FileText className="w-8 h-8 mr-2" />
                        <span className="text-sm">Comprobante adjunto</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() =>
                          window.open(selectedPayment.comprobante_url, "_blank")
                        }
                      >
                        Ver original
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No hay comprobante adjunto
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Mock upload
                          const newUrl = "https://example.com/comprobante.jpg";
                          const updatedPayments = payments.map((p) =>
                            p.id === selectedPayment.id
                              ? { ...p, comprobante_url: newUrl }
                              : p
                          );
                          setPayments(updatedPayments);
                          setSelectedPayment({
                            ...selectedPayment,
                            comprobante_url: newUrl,
                          });
                          localStorage.setItem(
                            `mock-payments-${code}`,
                            JSON.stringify(updatedPayments)
                          );
                          toast({ title: "Comprobante subido exitosamente" });
                        }}
                      >
                        Subir foto del pago
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setDetailModalOpen(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
