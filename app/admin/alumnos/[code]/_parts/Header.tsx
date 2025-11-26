"use client";

import { TicketIcon, Trash2, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  STATUS_CLASSES,
  type StatusSint,
  getOptionBadgeClass,
} from "./detail-utils";
import { Button } from "@/components/ui/button";
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

export default function Header({
  name,
  code,
  apiStage,
  apiState,
  status,
  ticketsCount,
  canDelete,
  onDelete,
  hideCodeAndTickets,
}: {
  name: string;
  code: string;
  apiStage?: string;
  apiState?: string;
  status: StatusSint;
  ticketsCount?: number;
  canDelete?: boolean;
  onDelete?: () => void | Promise<void>;
  hideCodeAndTickets?: boolean;
}) {
  // Nota: el conteo real de tickets se muestra desde el padre para evitar fetch doble.
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-black/5 dark:from-blue-500/20 dark:to-indigo-500/20 dark:ring-white/10">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            {name}
          </h1>
          {code && !hideCodeAndTickets && (
            <div className="mt-1.5 flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {code}
                    </code>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Código del alumno
                  </TooltipContent>
                </Tooltip>
                {typeof ticketsCount === "number" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <TicketIcon className="h-3.5 w-3.5" />
                        {ticketsCount}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Tickets totales</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
              {/* Etapa API ocultada */}
            </div>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Vista detallada con métricas en tiempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* El padre puede inyectar un badge con el total de tickets aquí */}
        {/* Mostrar el estado crudo si se pasó como prop; si no, mostrar el status sintético.
            Si ninguno existe, dejar vacío (no mostrar badge). */}
        {((apiState && String(apiState)) ||
          (typeof apiStage === "string" && apiStage) ||
          status) && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getOptionBadgeClass(
              apiState ? "estado" : apiStage ? "etapa" : "status_sint",
              (apiState && String(apiState)) ||
                (apiStage && String(apiStage)) ||
                status
            )}`}
          >
            {(apiState && String(apiState)) ||
              (apiStage && String(apiStage)) ||
              status.replace("_", " ")}
          </span>
        )}
        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-7 px-2">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar alumno</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará el alumno
                  <span className="font-medium"> {name}</span> (código {code}).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete?.()}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </div>
  );
}
