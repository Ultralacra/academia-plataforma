"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  MessageSquare,
  Users,
  LayoutGrid,
  BarChart3,
  FolderKanban,
} from "lucide-react";

function QuickLink({
  href,
  title,
  desc,
  icon: Icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: any;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{title}</span>
            </CardTitle>
          </div>
          <CardDescription className="text-xs">{desc}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Encabezado simple para usuario final */}
      <div>
        <h1 className="text-2xl font-bold">Panel principal</h1>
        <p className="text-muted-foreground">
          Selecciona un módulo para comenzar o utiliza los enlaces rápidos para
          acceder a las secciones más importantes.
        </p>
      </div>

      {/* Enlaces rápidos (módulos) */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <QuickLink
            href="/admin/students"
            title="Alumnos"
            desc="Gestión y seguimiento de alumnos"
            icon={Users}
          />
          <QuickLink
            href="/admin/teams"
            title="Equipos"
            desc="Métricas y distribución por coach"
            icon={LayoutGrid}
          />
          <QuickLink
            href="/admin/tickets"
            title="Tickets"
            desc="Listado y métricas de tickets"
            icon={BarChart3}
          />
          <QuickLink
            href="/admin/tickets-board"
            title="Kanban"
            desc="Flujo operativo de tickets"
            icon={FolderKanban}
          />
          <QuickLink
            href="/chat"
            title="Chat"
            desc="Centro de conversaciones"
            icon={MessageSquare}
          />
        </div>
      </section>
      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/chat")}>
          Ir al chat
        </Button>
        <Button onClick={() => router.push("/admin/tickets-board")}>
          Abrir Kanban
        </Button>
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
