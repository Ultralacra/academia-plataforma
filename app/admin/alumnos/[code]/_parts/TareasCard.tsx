"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import ObservacionesSection from "@/app/admin/tickets-board/ObservacionesSection";

export default function TareasCard({
  alumnoId,
  canEdit = false,
}: {
  alumnoId: string;
  canEdit?: boolean;
}) {
  const { user } = useAuth();

  const coachId = useMemo(() => {
    const v =
      (user as any)?.id ??
      (user as any)?.codigo ??
      (user as any)?.code ??
      (user as any)?.user_id ??
      null;
    return v != null ? String(v) : "";
  }, [user]);

  const effectiveCanEdit = Boolean(canEdit && coachId);
  const ticketCodeForCreate = `perfil:${String(alumnoId)}`;

  return (
    <ObservacionesSection
      // En el perfil mostramos todas las tareas/observaciones del alumno,
      // sin filtrar por ticket_codigo (para incluir tareas de tickets y del perfil).
      ticketCode={undefined}
      // Al crear desde el perfil, guardamos con un ticket_codigo virtual y estable.
      ticketCodeForCreate={ticketCodeForCreate}
      alumnoId={String(alumnoId)}
      coachId={coachId}
      canEdit={effectiveCanEdit}
    />
  );
}
