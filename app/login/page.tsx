"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/hooks/use-auth";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

function LoginPageContent() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = (() => {
    const value = searchParams.get("next");
    if (!value) return undefined;
    if (!value.startsWith("/")) return undefined;
    if (value.startsWith("//")) return undefined;
    return value;
  })();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
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
        case "equipo": {
          router.push("/admin/solicitud-bonos");
          break;
        }
        default:
          router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, user, router, redirectTo]);

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

export default function LoginPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <LoginPageContent />
    </Suspense>
  );
}
