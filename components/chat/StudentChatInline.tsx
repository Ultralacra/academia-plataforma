"use client";

import React from "react";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { CHAT_HOST } from "@/lib/api-config";
import { dataService } from "@/lib/data-service";
import { apiFetch } from "@/lib/api-config";

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
  const [resolvedEquipoName, setResolvedEquipoName] = React.useState<
    string | null
  >(null);
  const [alumnoName, setAlumnoName] = React.useState<string | null>(null);
  const [coachMap, setCoachMap] = React.useState<
    Record<
      string,
      { name: string; area?: string | null; puesto?: string | null }
    >
  >({});

  // Si no viene por props, intentamos deducir el CÓDIGO del equipo asignado (preferencia: Atención al Cliente)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (coachEquipoId) return; // ya provisto por el padre
      const alumno = (code || "").trim();
      if (!alumno) return;
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          alumno
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        const rows: any[] = Array.isArray(j?.data) ? j.data : [];
        // Construir catálogo de coaches por múltiples claves (código e ids)
        const map: Record<
          string,
          { name: string; area?: string | null; puesto?: string | null }
        > = {};
        for (const r of rows) {
          const name = r.coach_nombre ?? r.name ?? null;
          if (!name) continue;
          const entry = {
            name: String(name),
            area: r.area ?? null,
            puesto: r.puesto ?? null,
          };
          const keys = [
            r.codigo_equipo,
            r.codigo_coach,
            r.codigo,
            r.id,
            r.id_coach,
            r.id_equipo,
            r.id_relacion,
          ]
            .map((x: any) => (x == null ? null : String(x)))
            .filter(Boolean);
          for (const k of keys) map[k!] = entry;
        }
        setCoachMap(map);
        const norm = (s?: string | null) =>
          String(s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
        const isAC = (area?: string | null) =>
          norm(area).includes("ATENCION AL CLIENTE");
        const assigned = rows
          .map((r) => ({
            codigo: r.codigo_equipo ?? r.codigo_coach ?? r.codigo ?? null,
            area: r.area ?? null,
            nombre: r.coach_nombre ?? r.name ?? null,
          }))
          .filter((x) => x.codigo);
        const preferred = assigned.find((x) => isAC(x.area)) || assigned[0];
        const codeEquipo = preferred?.codigo ? String(preferred.codigo) : null;
        try {
          console.log("[StudentChatInline] resolvedEquipo (codigo)", {
            alumno,
            codeEquipo,
            preferred,
          });
        } catch {}
        setResolvedEquipoId(codeEquipo);
        try {
          const alumNom = rows?.[0]?.alumno_nombre
            ? String(rows[0].alumno_nombre)
            : null;
          setAlumnoName(alumNom);
        } catch {}
        try {
          const eqName = preferred?.nombre
            ? String(preferred.nombre)
            : codeEquipo && map[codeEquipo]?.name
            ? String(map[codeEquipo].name)
            : null;
          setResolvedEquipoName(eqName);
        } catch {}
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
    try {
      console.log("[StudentChatInline] participants", base);
    } catch {}
    return base as any[];
  }, [code, resolvedEquipoId]);

  const resolveName = React.useCallback(
    (tipo: "equipo" | "cliente" | "admin", id: string) => {
      const sid = String(id ?? "");
      if (tipo === "cliente") {
        if (sid === String(code)) return alumnoName || sid;
        return sid;
      }
      if (tipo === "equipo") {
        if (sid === String(resolvedEquipoId)) return resolvedEquipoName || sid;
        const found = coachMap[sid];
        if (found?.name) return found.name;
        return sid;
      }
      return sid;
    },
    [code, alumnoName, resolvedEquipoId, resolvedEquipoName, coachMap]
  );

  return (
    <CoachChatInline
      room={room}
      role="alumno"
      title={title}
      subtitle={subtitle}
      variant="card"
      className={className}
      precreateOnParticipants
      resolveName={resolveName}
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
