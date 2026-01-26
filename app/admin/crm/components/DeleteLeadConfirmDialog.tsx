"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { deleteLead } from "../api";

export function DeleteLeadConfirmDialog({
  open,
  onOpenChange,
  leadCodigo,
  leadName,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadCodigo: string;
  leadName?: string | null;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const confirm = async () => {
    if (!leadCodigo) return;
    setLoading(true);
    try {
      await deleteLead(leadCodigo);
      toast({ title: "Lead eliminado" });
      onOpenChange(false);
      onDeleted();
    } catch (e: any) {
      toast({
        title: "Error al eliminar",
        description: e?.message || "No se pudo eliminar el lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-0 bg-gradient-to-br from-white via-rose-50/70 to-slate-50/80 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará el lead
            {leadName ? (
              <>
                {" "}
                <span className="font-medium">{leadName}</span>
              </>
            ) : null}{" "}
            ({leadCodigo}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className="rounded-full border-slate-300 hover:bg-slate-100"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white shadow hover:from-rose-600 hover:to-red-600"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
