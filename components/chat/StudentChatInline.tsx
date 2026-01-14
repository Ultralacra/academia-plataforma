"use client";

import React from "react";
import CoachChatInline from "@/components/chat/StudentChatFriendly";
import { CHAT_HOST } from "@/lib/api-config";
import { dataService } from "@/lib/data-service";
import { apiFetch } from "@/lib/api-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const coachIdFromProps = React.useMemo(() => {
    const v = (coachEquipoId || "").trim();
    return v ? v : null;
  }, [coachEquipoId]);

  const [coachResolution, setCoachResolution] = React.useState<
    "loading" | "ready" | "missing"
  >(coachIdFromProps ? "ready" : "loading");
  const [resolvedEquipoId, setResolvedEquipoId] = React.useState<string | null>(
    coachIdFromProps ? String(coachIdFromProps) : null
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
      if (coachIdFromProps) return; // ya provisto por el padre
      const alumno = (code || "").trim();
      if (!alumno) return;
      setCoachResolution("loading");
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

        // LOG CRÍTICO: Mostrar proceso de resolución del coach
        console.log("═══════════════════════════════════════════");
        console.log("🔎 [CHAT ALUMNO] RESOLUCIÓN DE COACH");
        console.log("═══════════════════════════════════════════");
        console.log("👤 Alumno:", alumno);
        console.log("📊 Coaches asignados encontrados:", assigned.length);
        assigned.forEach((a, i) => {
          console.log(
            `  ${i + 1}. ${a.nombre || "(sin nombre)"} [${a.codigo}]`,
            {
              area: a.area || "(sin área)",
              es_atencion_cliente: isAC(a.area) ? "✅ SÍ" : "❌ NO",
            }
          );
        });
        console.log("⭐ Coach seleccionado:", {
          codigo: codeEquipo || "(NINGUNO)",
          nombre: preferred?.nombre || "(sin nombre)",
          area: preferred?.area || "(sin área)",
          es_atencion_cliente:
            preferred?.area && isAC(preferred.area) ? "✅ SÍ" : "❌ NO",
          criterio:
            preferred?.area && isAC(preferred.area)
              ? "Área = Atención al Cliente"
              : "Primer coach disponible (fallback)",
        });
        console.log("═══════════════════════════════════════════");

        setResolvedEquipoId(codeEquipo);
        setCoachResolution(codeEquipo ? "ready" : "missing");
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
        if (alive) {
          setResolvedEquipoId(null);
          setResolvedEquipoName(null);
          setCoachResolution("missing");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, coachIdFromProps]);

  // Definimos participantes para que el servidor pueda hacer find-or-create del chat.
  const participants = React.useMemo(() => {
    const base = [{ participante_tipo: "cliente", id_cliente: String(code) }];
    if (resolvedEquipoId) {
      base.push({
        participante_tipo: "equipo",
        id_equipo: String(resolvedEquipoId),
      } as any);
    }

    // LOG CRÍTICO: Imprimir con quién está intentando chatear el alumno
    console.log("═══════════════════════════════════════════");
    console.log("🔍 [CHAT ALUMNO] CONFIGURACIÓN DE PARTICIPANTES");
    console.log("═══════════════════════════════════════════");
    console.log("📋 Alumno (cliente):", {
      codigo: code,
      nombre: alumnoName || "(sin nombre)",
    });
    console.log("👥 Destinatario (equipo):", {
      codigo_equipo: resolvedEquipoId || "(NO RESUELTO)",
      nombre_equipo: resolvedEquipoName || "(sin nombre)",
      area:
        resolvedEquipoId && coachMap[resolvedEquipoId]?.area
          ? coachMap[resolvedEquipoId].area
          : "(sin área)",
      puesto:
        resolvedEquipoId && coachMap[resolvedEquipoId]?.puesto
          ? coachMap[resolvedEquipoId].puesto
          : "(sin puesto)",
    });
    console.log("📝 Participantes enviados al servidor:", base);
    console.log("═══════════════════════════════════════════");

    return base as any[];
  }, [code, resolvedEquipoId, alumnoName, resolvedEquipoName, coachMap]);

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
    <div className={className}>
      {coachResolution === "missing" ? (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Chat bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertTitle>No tienes coach asignado</AlertTitle>
              <AlertDescription>
                No tienes un coach de Atención al Cliente asignado. Habla con un
                administrador para que te asignen uno y puedas usar el chat.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <CoachChatInline
          room={room}
          role="alumno"
          title={title}
          subtitle={subtitle}
          variant="card"
          className="h-full"
          // Activar precreateOnParticipants para que el alumno intente localizar
          // y unirse automáticamente a la conversación existente al cargar.
          precreateOnParticipants={true}
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
          listParams={{
            participante_tipo: "cliente",
            id_cliente: String(code),
          }}
        />
      )}
    </div>
  );
}
