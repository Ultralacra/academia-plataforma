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

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Acceso Denegado
          </h1>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
