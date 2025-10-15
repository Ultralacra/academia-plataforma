"use client";

import type React from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();

  // Botón interno que accede al contexto del Sidebar ya dentro del Provider
  const MenuToggleButton = () => {
    const { toggleSidebar } = useSidebar();
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSidebar}
        className="gap-2"
      >
        <Menu className="h-4 w-4" />
        <span>Menú</span>
      </Button>
    );
  };
  return (
    <SidebarProvider>
      {/* Contenedor raíz sin scroll horizontal */}
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="flex flex-wrap items-center gap-3 justify-between p-3 sm:p-4 border-b bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <MenuToggleButton />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <User className="h-4 w-4" />
                <span className="truncate max-w-[40vw] sm:max-w-[200px]">
                  {user?.name}
                </span>
                <span className="hidden sm:inline text-muted-foreground">
                  ({user?.role})
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Salir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se cerrará tu sesión actual. Necesitarás iniciar sesión
                      otra vez para continuar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={logout}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-y-auto min-h-0 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
