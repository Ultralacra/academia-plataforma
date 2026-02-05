"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getPaymentPlansByClienteCodigo,
  getPaymentPlanByCodigo,
} from "../pagos/payments-plan.api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type PaymentInstallment = {
  codigo: string;
  cuota_codigo: string;
  monto: number;
  moneda: string;
  estatus: string;
  fecha_pago: string;
  concepto?: string;
};

type PaymentPlanDetail = {
  codigo: string;
  monto: number;
  moneda: string;
  programa?: string;
  tipo_pago?: string;
  metodo?: string;
  created_at?: string;
  cuotas: PaymentInstallment[];
};

type PaymentSummary = {
  totalCuotas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  montoTotalPendiente: number;
  montoTotalPagado: number;
  montoTotal: number;
  moneda: string;
  proximaCuota: PaymentInstallment | null;
  cuotasProximas: PaymentInstallment[];
  planDetail: PaymentPlanDetail | null;
};

export default function PaymentSummaryCard({ code }: { code: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!code) return;
    loadPaymentSummary();
  }, [code]);

  async function loadPaymentSummary() {
    setLoading(true);
    setError(null);
    try {
      // 1) Listar planes por cliente_codigo
      const list = await getPaymentPlansByClienteCodigo(code, {
        page: 1,
        pageSize: 100,
        search: "",
      });
      const plans = Array.isArray(list) ? list : (list as any)?.data;
      const planRow = Array.isArray(plans)
        ? (plans.find(
            (p: any) =>
              String(p?.cliente_codigo ?? "").toLowerCase() ===
              code.toLowerCase(),
          ) ?? plans[0])
        : null;

      const planCodigo = String(planRow?.codigo ?? "").trim();
      if (!planCodigo) {
        setSummary(null);
        setLoading(false);
        return;
      }

      // 2) Consultar detalle del plan
      const rawDetail = await getPaymentPlanByCodigo(planCodigo);
      const plan = (rawDetail as any)?.data ?? rawDetail;

      // Extraer detalles/cuotas
      const detalles: any[] = Array.isArray(plan?.detalles)
        ? plan.detalles
        : Array.isArray(plan?.details)
          ? plan.details
          : [];

      const isPaidStatus = (s: any) => {
        const v = String(s ?? "").toLowerCase();
        return ["pagado", "paid", "completed", "listo", "aprobado"].includes(v);
      };

      const moneda = plan?.moneda ?? "USD";
      const pagadas = detalles.filter((d) => isPaidStatus(d?.estatus));
      const pendientes = detalles.filter((d) => !isPaidStatus(d?.estatus));

      // Ordenar todas las cuotas por fecha
      const allSorted = [...detalles].sort((a, b) => {
        const dateA = new Date(a?.fecha_pago ?? "9999-12-31").getTime();
        const dateB = new Date(b?.fecha_pago ?? "9999-12-31").getTime();
        return dateA - dateB;
      });

      const sortedPendientes = [...pendientes].sort((a, b) => {
        const dateA = new Date(a?.fecha_pago ?? "9999-12-31").getTime();
        const dateB = new Date(b?.fecha_pago ?? "9999-12-31").getTime();
        return dateA - dateB;
      });

      const montoTotalPendiente = pendientes.reduce((acc, d) => {
        return acc + (Number(d?.monto) || 0);
      }, 0);

      const montoTotalPagado = pagadas.reduce((acc, d) => {
        return acc + (Number(d?.monto) || 0);
      }, 0);

      const montoTotal =
        Number(plan?.monto) || montoTotalPagado + montoTotalPendiente;

      const mapInstallment = (d: any): PaymentInstallment => ({
        codigo: d?.codigo ?? "",
        cuota_codigo: d?.cuota_codigo ?? "",
        monto: Number(d?.monto) || 0,
        moneda: d?.moneda ?? moneda,
        estatus: d?.estatus ?? "pendiente",
        fecha_pago: d?.fecha_pago ?? "",
        concepto: d?.concepto ?? d?.notas ?? "",
      });

      setSummary({
        totalCuotas: detalles.length,
        cuotasPagadas: pagadas.length,
        cuotasPendientes: pendientes.length,
        montoTotalPendiente,
        montoTotalPagado,
        montoTotal,
        moneda,
        proximaCuota: sortedPendientes[0]
          ? mapInstallment(sortedPendientes[0])
          : null,
        cuotasProximas: sortedPendientes.slice(0, 3).map(mapInstallment),
        planDetail: {
          codigo: planCodigo,
          monto: montoTotal,
          moneda,
          programa: plan?.concepto ?? plan?.programa ?? planRow?.concepto ?? "",
          tipo_pago: plan?.tipo_pago ?? plan?.modalidad ?? "",
          metodo: plan?.metodo ?? "",
          created_at: plan?.created_at ?? planRow?.created_at ?? "",
          cuotas: allSorted.map(mapInstallment),
        },
      });
    } catch (e) {
      console.error("Error cargando resumen de pagos", e);
      setError("Error al cargar datos de pago");
      setSummary(null);
    }
    setLoading(false);
  }

  function formatDate(iso: string) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso.slice(0, 10);
      return format(d, "d MMM yyyy", { locale: es });
    } catch {
      return iso.slice(0, 10);
    }
  }

  function formatMoney(amount: number, currency: string) {
    return `${currency} ${amount.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function isPaidStatus(s: string) {
    const v = String(s ?? "").toLowerCase();
    return ["pagado", "paid", "completed", "listo", "aprobado"].includes(v);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Cargando pagos...
          </span>
        </div>
      </div>
    );
  }

  if (error || !summary || summary.totalCuotas === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cuotas</span>
          </div>
          <span className="text-xs text-muted-foreground">Sin plan</span>
        </div>
      </div>
    );
  }

  const allPaid = summary.cuotasPendientes === 0;
  const nextCuota = summary.cuotasProximas[0];

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cuotas</span>
            <span className="text-xs text-muted-foreground">
              {summary.cuotasPagadas}/{summary.totalCuotas}
            </span>
          </div>
          {allPaid ? (
            <Badge
              variant="default"
              className="bg-green-600 hover:bg-green-600 h-5 text-[10px]"
            >
              Completo
            </Badge>
          ) : (
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {formatMoney(summary.montoTotalPendiente, summary.moneda)}
            </span>
          )}
        </div>
        {!allPaid && nextCuota && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Próxima: {formatDate(nextCuota.fecha_pago)}</span>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="hover:underline text-primary"
            >
              Ver más
            </button>
          </div>
        )}
        {allPaid && (
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs hover:underline text-primary"
            >
              Ver historial
            </button>
          </div>
        )}
      </div>

      {/* Modal de detalle de pagos */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan de Pagos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen del plan */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <div className="text-xs text-muted-foreground">Monto total</div>
                <div className="text-lg font-semibold">
                  {formatMoney(summary.montoTotal, summary.moneda)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cuotas</div>
                <div className="text-lg font-semibold">
                  {summary.cuotasPagadas}/{summary.totalCuotas}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pagado</div>
                <div className="font-medium text-green-600">
                  {formatMoney(summary.montoTotalPagado, summary.moneda)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pendiente</div>
                <div className="font-medium text-amber-600">
                  {formatMoney(summary.montoTotalPendiente, summary.moneda)}
                </div>
              </div>
            </div>

            {summary.planDetail?.programa && (
              <div className="text-sm">
                <span className="text-muted-foreground">Programa: </span>
                <span className="font-medium">
                  {summary.planDetail.programa}
                </span>
              </div>
            )}

            <Separator />

            {/* Lista de cuotas */}
            <div>
              <h4 className="text-sm font-medium mb-2">Detalle de cuotas</h4>
              <ScrollArea className="h-[250px] pr-2">
                <div className="space-y-2">
                  {summary.planDetail?.cuotas.map((cuota, idx) => {
                    const paid = isPaidStatus(cuota.estatus);
                    return (
                      <div
                        key={cuota.codigo || idx}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          paid
                            ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {paid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {cuota.cuota_codigo || `Cuota ${idx + 1}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(cuota.fecha_pago)}
                            </div>
                            {cuota.concepto && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {cuota.concepto}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${paid ? "text-green-600" : ""}`}
                          >
                            {formatMoney(cuota.monto, cuota.moneda)}
                          </div>
                          <Badge
                            variant={paid ? "default" : "secondary"}
                            className={`h-5 text-[10px] mt-1 ${paid ? "bg-green-600" : ""}`}
                          >
                            {paid ? "Pagado" : "Pendiente"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {summary.planDetail?.created_at && (
              <div className="text-xs text-muted-foreground text-center">
                Plan creado: {formatDate(summary.planDetail.created_at)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
