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

  // Política temporal: todos los usuarios autenticados pueden acceder a todas las vistas.
  // Ignoramos la verificación de allowedRoles para evitar estados de "Acceso Denegado".
  // if (allowedRoles && !hasAnyRole(allowedRoles)) { ... }

  return <>{children}</>;
}
