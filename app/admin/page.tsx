"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
/* import { MetricsCards } from "@/components/admin/metrics-cards";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { RecentActivity } from "@/components/admin/recent-activity";
import { dataService, type PlatformMetrics } from "@/lib/data-service"; */
import {
  RefreshCw,
  Users,
  BookOpen,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      const platformMetrics = dataService.getMetrics();
      setMetrics(platformMetrics);
      setIsLoading(false);
    }, 500);
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona tu academia desde un solo lugar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMetrics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Metrics Cards */}
      {/*   <MetricsCards metrics={metrics} /> */}

      {/* Charts and Activity */}
      {/*    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart />
        <RecentActivity />
      </div>
 */}
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/students")}
        >
          <Users className="h-6 w-6" />
          <span>Gestionar Estudiantes</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/coaches")}
        >
          <BookOpen className="h-6 w-6" />
          <span>Gestionar Coaches</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/payments")}
        >
          <CreditCard className="h-6 w-6" />
          <span>Pagos y Facturación</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col space-y-2 bg-transparent"
          onClick={() => router.push("/admin/tickets")}
        >
          <MessageSquare className="h-6 w-6" />
          <span>Tickets de Soporte</span>
        </Button>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold text-lg mb-4">
            Retención de Estudiantes
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Tasa de abandono
              </span>
              <span className="font-medium text-destructive">
                {metrics.churnRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-destructive h-2 rounded-full"
                style={{ width: `${Math.min(metrics.churnRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold text-lg mb-4">Eficiencia de Soporte</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Tiempo promedio de resolución
              </span>
              <span className="font-medium">
                {metrics.averageResolutionTime.toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Tickets resueltos
              </span>
              <span className="font-medium text-primary">
                {metrics.ticketsResolved}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold text-lg mb-4">Rendimiento Académico</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Progreso promedio
              </span>
              <span className="font-medium text-primary">
                {metrics.averageProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${metrics.averageProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
