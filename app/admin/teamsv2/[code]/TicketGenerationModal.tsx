"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Spinner from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { TicketData } from "./chat-types";

export function TicketGenerationModal({
  open,
  onOpenChange,
  loading,
  error,
  data,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  data: TicketData | null;
  onConfirm: (data: TicketData) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Generar Ticket con IA</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <Spinner size={64} />
              <p className="ml-4 text-muted-foreground">
                Analizando conversación y generando ticket...
              </p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {data && (
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Sugerencia de Ticket
              </h3>
              <ScrollArea className="h-72 pr-4">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      data.parsed?.html ||
                      data.content ||
                      "No se pudo generar el contenido.",
                  }}
                />
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => data && onConfirm(data)}
            disabled={!data || loading}
          >
            Confirmar y Crear Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
