"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "./login-form";
import type { UserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    // If not authenticated and we're not already on /login, redirect to it
    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) return <FullScreenLoader />;

  // While redirecting, render nothing (router.push already sent user to /login)
  if (!isAuthenticated) return null;

  // Enforzar roles si se especifican. Para estudiantes, redirigir a su panel en lugar de solo denegar.
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    if (user?.role === "student") {
      const myCode = (user as any)?.codigo || "RvA_5Qxoezfxlxxj";
      // Redirigir suavemente al panel de alumno
      if (pathname !== `/admin/alumnos/${myCode}`) {
        router.replace(`/admin/alumnos/${myCode}`);
      }
      return null;
    }
    if (user?.role === "equipo") {
      const myCode = (user as any)?.codigo || "";
      const target = myCode ? `/admin/teamsv2/${myCode}` : "/admin/teamsv2";
      if (pathname !== target) {
        router.replace(target);
      }
      return null;
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Acceso denegado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No tienes permisos para ver esta página.
          </p>
        </div>
      </div>
    );
  }

  // Regla adicional: si es estudiante, solo puede ver su propio detalle de alumno.
  // Si intenta entrar a otra ruta, redirigimos a su panel directo.
  if (user?.role === "student") {
    const p = String(pathname || "");
    const segments = p.split("/").filter(Boolean);
    // Esperamos /admin/alumnos/[code]
    const isAlumnoDetail =
      segments[0] === "admin" &&
      segments[1] === "alumnos" &&
      segments.length >= 3;
    const codeFromPath = isAlumnoDetail ? segments[2] : null;
    const myCode = (user as any)?.codigo || "RvA_5Qxoezfxlxxj";

    if (!isAlumnoDetail || !codeFromPath || codeFromPath !== myCode) {
      if (pathname !== `/admin/alumnos/${myCode}`) {
        router.replace(`/admin/alumnos/${myCode}`);
      }
      return null;
    }
  }

  // Regla adicional: si es equipo, puede ver cualquier detalle de equipo (no sólo el propio)
  if (user?.role === "equipo") {
    const p = String(pathname || "");
    const segments = p.split("/").filter(Boolean);
    // Permitir también páginas de tickets
    const isTicketsBoard =
      segments[0] === "admin" && segments[1] === "tickets-board";
    const isTickets = segments[0] === "admin" && segments[1] === "tickets";
    const isPayments = segments[0] === "admin" && segments[1] === "payments";
    const isBonos = segments[0] === "admin" && segments[1] === "bonos";
    const isCrm = segments[0] === "admin" && segments[1] === "crm";
    // Permitir métricas de equipos
    const isTeamsMetrics =
      segments[0] === "admin" &&
      segments[1] === "teams" &&
      segments.length === 2;
    // Permitir raíz de teamsv2 (listado)
    const isTeamsV2Root =
      segments[0] === "admin" &&
      segments[1] === "teamsv2" &&
      segments.length === 2;
    // Permitir sección de alumnos (lista y detalle)
    const isAlumnosPath = segments[0] === "admin" && segments[1] === "alumnos";
    // Permitir métricas de alumnos
    const isStudentsMetrics =
      segments[0] === "admin" &&
      segments[1] === "students" &&
      segments.length === 2;
    // Esperamos /admin/teamsv2/[code] como vista principal
    const isTeamDetail =
      segments[0] === "admin" &&
      segments[1] === "teamsv2" &&
      segments.length >= 3;
    const codeFromPath = isTeamDetail ? segments[2] : null;
    const myCode = (user as any)?.codigo || "";
    const target = myCode ? `/admin/teamsv2/${myCode}` : "/admin/teamsv2";

    if (
      !isTeamDetail &&
      !isTeamsV2Root &&
      !isAlumnosPath &&
      !isTicketsBoard &&
      !isTickets &&
      !isPayments &&
      !isBonos &&
      !isCrm &&
      !isTeamsMetrics &&
      !isStudentsMetrics
    ) {
      if (pathname !== target) {
        router.replace(target);
      }
      return null;
    }
  }

  return <>{children}</>;
}
