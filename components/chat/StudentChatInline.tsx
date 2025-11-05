"use client";

import React from "react";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { CHAT_HOST } from "@/lib/api-config";
import { dataService } from "@/lib/data-service";

// Ya no usamos un ID hardcodeado para "administración"; si no se especifica coachEquipoId,
// intentaremos resolver el primer coach asignado al alumno vía dataService.getClientCoaches(code).

export default function StudentChatInline({
  code,
  title = "Chat",
  subtitle,
  coachEquipoId,
  className = "h-full",
}: {
  code: string; // código/ID del alumno (id_cliente)
  title?: string;
  subtitle?: string;
  coachEquipoId?: string; // opcional: forzar id_equipo destino; por defecto ADMIN_COACH_ID
  className?: string;
}) {
  const room = React.useMemo(() => (code || "").trim().toLowerCase(), [code]);
  const SOCKET_URL = (CHAT_HOST || "").replace(/\/$/, "");
  const [resolvedEquipoId, setResolvedEquipoId] = React.useState<string | null>(
    coachEquipoId ? String(coachEquipoId) : null
  );

  // Resolver automáticamente el id_equipo del coach asignado al alumno (si no viene por props)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (coachEquipoId) return; // ya provisto por el padre
      const alumno = (code || "").trim();
      if (!alumno) return;
      try {
        const res = await dataService.getClientCoaches(alumno);
        if (!alive) return;
        const first =
          Array.isArray(res.coaches) && res.coaches.length > 0
            ? res.coaches[0]
            : null;
        const id = (first as any)?.id ?? (first as any)?.id_coach ?? null;
        if (id != null) setResolvedEquipoId(String(id));
        else setResolvedEquipoId(null);
      } catch {
        if (alive) setResolvedEquipoId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, coachEquipoId]);

  // Definimos participantes para que el servidor pueda hacer find-or-create del chat.
  const participants = React.useMemo(() => {
    const base = [{ participante_tipo: "cliente", id_cliente: String(code) }];
    if (resolvedEquipoId) {
      base.push({
        participante_tipo: "equipo",
        id_equipo: String(resolvedEquipoId),
      } as any);
    }
    return base as any[];
  }, [code, resolvedEquipoId]);

  return (
    <CoachChatInline
      room={room}
      role="alumno"
      title={title}
      subtitle={subtitle}
      variant="card"
      className={className}
      precreateOnParticipants
      socketio={{
        url: SOCKET_URL || undefined,
        idCliente: String(code),
        idEquipo: resolvedEquipoId ? String(resolvedEquipoId) : undefined,
        participants,
        // Solo creamos automáticamente si conocemos el id_equipo destino;
        // si no, intentaremos localizar una conversación existente por cliente.
        autoCreate: !!resolvedEquipoId,
        autoJoin: true,
      }}
      listParams={{ participante_tipo: "cliente", id_cliente: String(code) }}
    />
  );
}
