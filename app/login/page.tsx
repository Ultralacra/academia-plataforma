"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/hooks/use-auth";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

export default function LoginPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Si ya está autenticado, redirigir según rol
      switch (user.role) {
        case "admin":
          router.push("/admin/students");
          break;
        case "coach":
          // Ruta existente y útil para coaches
          router.push("/admin/teamsv2");
          break;
        case "student": {
          const code = (user as any)?.codigo || "RvA_5Qxoezfxlxxj";
          router.push(`/admin/alumnos/${code}`);
          break;
        }
        default:
          router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <FullScreenLoader />;

  if (isAuthenticated)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-medium">Ya estás conectado</h1>
          <p className="text-sm text-muted-foreground mt-2">Redirigiendo...</p>
          <div className="mt-4">
            <FullScreenLoader />
          </div>
        </div>
      </div>
    );

  return <LoginForm />;
}
