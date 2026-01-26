"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  ExternalLink,
  MessageSquare,
  CalendarClock,
  Gift,
  GraduationCap,
  BarChart3,
  CreditCard,
  ThumbsUp,
  ClipboardList,
} from "lucide-react";

function StaticCard({ title, href }: { title: string; href: string }) {
  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/60 hover:to-accent/30 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-end gap-2">
        <Button asChild className="w-full" variant="outline">
          <a href={href} target="_blank" rel="noreferrer">
            Abrir <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function InternalCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description?: string;
  href: string;
  icon: any;
}) {
  return (
    <Card className="border-border bg-gradient-to-br from-card to-card/60 hover:to-accent/30 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 w-7 h-7">
            <Icon className="w-4 h-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="secondary">
          <Link href={href}>Entrar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentInicioPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "");
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  return (
    <ProtectedRoute allowedRoles={["admin", "coach", "student", "equipo"]}>
      <DashboardLayout>
        <div className="rounded-2xl border border-border bg-gradient-to-r from-blue-500/10 via-transparent to-indigo-500/10 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-300" />{" "}
              Inicio
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Accesos rápidos del alumno
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Para alumnos: Mi perfil de primero */}
          {isStudent && (
            <InternalCard
              title="Mi perfil"
              description="Datos y progreso del alumno"
              href={`/admin/alumnos/${code}/perfil`}
              icon={GraduationCap}
            />
          )}

          <StaticCard
            title="Notion de la academia"
            href="https://www.notion.so/x-academy/HOTSELLING-LITE-af0d3555dc5b4b0c935e22129ebc878b?p=931dd222189342a9ae6a6ee1befd1ee1&pm=s"
          />

          <StaticCard
            title="Skool"
            href="https://www.skool.com/hotselling-lite-4832"
          />

          <InternalCard
            title="Chat soporte"
            description="Habla con Atención al Cliente"
            href={`/admin/alumnos/${code}/chat`}
            icon={MessageSquare}
          />

          <InternalCard
            title="Feedback"
            description={isStudent ? "Ver feedback" : "Ver tickets y estado"}
            href={`/admin/alumnos/${code}/feedback`}
            icon={ThumbsUp}
          />

          {/* Colocar Mis tareas al final */}
          <InternalCard
            title="Mis tareas"
            description="Ver tus tareas y si están resueltas"
            href={`/admin/alumnos/${code}/tareas`}
            icon={ClipboardList}
          />

          {/* Ocultar Sesiones para alumnos */}
          {!isStudent && (
            <InternalCard
              title="Sesiones"
              description="Gestiona y solicita sesiones"
              href={`/admin/alumnos/${code}/sesiones`}
              icon={CalendarClock}
            />
          )}

          <InternalCard
            title="Bonos"
            description={
              isStudent ? "Ver mis bonos" : "Bonos asignados y extra"
            }
            href={`/admin/alumnos/${code}/bonos`}
            icon={Gift}
          />

          {/* Para no alumnos: Mi perfil en su posición original */}
          {!isStudent && (
            <InternalCard
              title="Mi perfil"
              description="Datos y progreso del alumno"
              href={`/admin/alumnos/${code}/perfil`}
              icon={GraduationCap}
            />
          )}

          {/* Ocultar Métricas ADS para alumnos */}
          {!isStudent && (
            <InternalCard
              title="Métricas ADS"
              description="Rendimiento de campañas"
              href={`/admin/alumnos/${code}/ads`}
              icon={BarChart3}
            />
          )}

          {/* Ocultar Seguimiento de pagos para alumnos */}
          {!isStudent && (
            <InternalCard
              title="Seguimiento de pagos"
              description="Historial y estado de pagos"
              href={`/admin/alumnos/${code}/pagos`}
              icon={CreditCard}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
