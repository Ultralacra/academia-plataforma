"use client";
import React from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CloseSaleForm } from "../components/CloseSaleForm2";
import { SalesPersonalMetrics } from "../components/SalesPersonalMetrics";

export default function SalesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Cierre de venta</h1>
            <p className="text-sm text-slate-600">
              Registra una venta con los datos obligatorios. El registro se
              almacena en /v1/metadata con entidad "sale" y estado inicial
              "payment_verification_pending".
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <CloseSaleForm />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Mis métricas de cierres</h2>
            <p className="text-sm text-slate-600 mb-2">
              Resumen personal basado en ventas donde eres el closer.
            </p>
            <SalesPersonalMetrics />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
