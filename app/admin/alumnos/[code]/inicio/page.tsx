"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  ArrowRight,
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
    <Card className="group h-full border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          Recurso externo de la academia
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild className="w-full justify-between" variant="outline">
          <a href={href} target="_blank" rel="noreferrer">
            Abrir recurso
            <ExternalLink className="w-4 h-4 ml-2 opacity-80 transition-opacity group-hover:opacity-100" />
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
    <Card className="group h-full border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-primary/10 text-primary">
            <Icon className="w-4 h-4" />
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={href}>
            Entrar
            <ArrowRight className="w-4 h-4 ml-2 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
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
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 text-primary w-8 h-8">
                  <Home className="w-4 h-4" />
                </span>
                Inicio
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Accesos rápidos y herramientas del perfil del alumno
              </p>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              {isStudent ? "Vista alumno" : "Vista staff"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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

          <InternalCard
            title="Seguimiento de pagos"
            description={
              isStudent
                ? "Ver estado y fechas de tus pagos"
                : "Historial y estado de pagos"
            }
            href={`/admin/alumnos/${code}/pagos`}
            icon={CreditCard}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
