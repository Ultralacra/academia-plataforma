"use client";

import React from "react";
import CoachChatInline from "@/components/chat/StudentChatFriendly";
import { CHAT_HOST } from "@/lib/api-config";
import { dataService } from "@/lib/data-service";
import { apiFetch } from "@/lib/api-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    coachIdFromProps ? String(coachIdFromProps) : null,
  );
  const [resolvedEquipoName, setResolvedEquipoName] = React.useState<
    string | null
  >(null);

  const [resolvedEquipoIdAC, setResolvedEquipoIdAC] = React.useState<
    string | null
  >(null);
  const [resolvedEquipoNameAC, setResolvedEquipoNameAC] = React.useState<
    string | null
  >(null);
  const [resolvedEquipoIdVSL, setResolvedEquipoIdVSL] = React.useState<
    string | null
  >(null);
  const [resolvedEquipoNameVSL, setResolvedEquipoNameVSL] = React.useState<
    string | null
  >(null);

  const [channel, setChannel] = React.useState<"ac" | "vsl">("ac");
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
          alumno,
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
        // Normaliza: quita acentos, pasa a mayúsculas, reemplaza _ y - por espacio
        const norm = (s?: string | null) =>
          String(s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[_-]/g, " ")
            .toUpperCase();

        const isAC = (area?: string | null) => {
          const n = norm(area);
          return (
            n.includes("ATENCION AL CLIENTE") ||
            n.includes("ATENCION CLIENTE") ||
            n.includes("SOPORTE")
          );
        };

        const isVSL = (r: any) => {
          const area = norm(r?.area ?? r?.coach_area ?? null);
          const puesto = norm(r?.puesto ?? r?.coach_puesto ?? null);
          const nombre = norm(r?.coach_nombre ?? r?.name ?? null);
          const match =
            area.includes("VSL") ||
            puesto.includes("VSL") ||
            nombre.includes("VSL");
          return match;
        };
        const assigned = rows
          .map((r) => ({
            codigo: r.codigo_equipo ?? r.codigo_coach ?? r.codigo ?? null,
            area: r.area ?? null,
            nombre: r.coach_nombre ?? r.name ?? null,
            raw: r,
          }))
          .filter((x) => x.codigo);
        const preferredAC = assigned.find((x) => isAC(x.area)) || null;
        const preferredVSL = assigned.find((x) => isVSL(x.raw)) || null;

        const codeEquipoAC = preferredAC?.codigo
          ? String(preferredAC.codigo)
          : null;
        const codeEquipoVSL = preferredVSL?.codigo
          ? String(preferredVSL.codigo)
          : null;

        // Elegir cuál será el chat activo por defecto.
        const nextChannel: "ac" | "vsl" = codeEquipoAC
          ? "ac"
          : codeEquipoVSL
            ? "vsl"
            : "ac";

        // LOG CRÍTICO: Mostrar proceso de resolución del coach
                /* console.log("═══════════════════════════════════════════"); */
                /* console.log(
          "🔎 [CHAT ALUMNO / StudentChatInline] RESOLUCIÓN DE COACHES",
        ); */
                /* console.log("═══════════════════════════════════════════"); */
                /* console.log("👤 Alumno:", alumno); */
                /* console.log("📊 Coaches asignados encontrados:", assigned.length); */
        assigned.forEach((a, i) => {
                    /* console.log(
            `  ${i + 1}. ${a.nombre || "(sin nombre)"} [${a.codigo}]`,
            {
              area: a.area || "(sin área)",
              raw_puesto: a.raw?.puesto ?? "(sin puesto)",
              es_atencion_cliente: isAC(a.area) ? "✅ SÍ" : "❌ NO",
              es_vsl: isVSL(a.raw) ? "✅ SÍ" : "❌ NO",
            },
          ); */
        });
                /* console.log("⭐ Coach AC seleccionado:", {
          codigo: codeEquipoAC || "(NINGUNO)",
          nombre: preferredAC?.nombre || "(sin nombre)",
          area: preferredAC?.area || "(sin área)",
          es_atencion_cliente:
            preferredAC?.area && isAC(preferredAC.area) ? "✅ SÍ" : "❌ NO",
        }); */
                /* console.log("⭐ Coach VSL seleccionado:", {
          codigo: codeEquipoVSL || "(NINGUNO)",
          nombre: preferredVSL?.nombre || "(sin nombre)",
          area: preferredVSL?.area || "(sin área)",
          es_vsl: preferredVSL ? "✅ SÍ" : "❌ NO",
        }); */
                /* console.log("🏁 Canal inicial:", nextChannel); */
                /* console.log("═══════════════════════════════════════════"); */

        setResolvedEquipoIdAC(codeEquipoAC);
        setResolvedEquipoIdVSL(codeEquipoVSL);

        const anyCoach = !!(codeEquipoAC || codeEquipoVSL);
        setCoachResolution(anyCoach ? "ready" : "missing");
        setChannel(nextChannel);
        setResolvedEquipoId(
          nextChannel === "ac" ? codeEquipoAC : codeEquipoVSL,
        );
        try {
          const alumNom = rows?.[0]?.alumno_nombre
            ? String(rows[0].alumno_nombre)
            : null;
          setAlumnoName(alumNom);
        } catch {}
        try {
          const eqNameAC = preferredAC?.nombre
            ? String(preferredAC.nombre)
            : codeEquipoAC && map[codeEquipoAC]?.name
              ? String(map[codeEquipoAC].name)
              : null;
          const eqNameVSL = preferredVSL?.nombre
            ? String(preferredVSL.nombre)
            : codeEquipoVSL && map[codeEquipoVSL]?.name
              ? String(map[codeEquipoVSL].name)
              : null;

          setResolvedEquipoNameAC(eqNameAC);
          setResolvedEquipoNameVSL(eqNameVSL);
          setResolvedEquipoName(nextChannel === "ac" ? eqNameAC : eqNameVSL);
        } catch {}
      } catch {
        if (alive) {
          setResolvedEquipoId(null);
          setResolvedEquipoName(null);
          setResolvedEquipoIdAC(null);
          setResolvedEquipoNameAC(null);
          setResolvedEquipoIdVSL(null);
          setResolvedEquipoNameVSL(null);
          setCoachResolution("missing");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, coachIdFromProps]);

  // Mantener resolvedEquipoId/resolvedEquipoName sincronizados con la pestaña activa.
  React.useEffect(() => {
    if (coachIdFromProps) return;
    const nextId = channel === "ac" ? resolvedEquipoIdAC : resolvedEquipoIdVSL;
    const nextName =
      channel === "ac" ? resolvedEquipoNameAC : resolvedEquipoNameVSL;
    setResolvedEquipoId(nextId || null);
    setResolvedEquipoName(nextName || null);
  }, [
    channel,
    resolvedEquipoIdAC,
    resolvedEquipoIdVSL,
    resolvedEquipoNameAC,
    resolvedEquipoNameVSL,
    coachIdFromProps,
  ]);

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
        /* console.log("═══════════════════════════════════════════"); */
        /* console.log("🔍 [CHAT ALUMNO] CONFIGURACIÓN DE PARTICIPANTES"); */
        /* console.log("═══════════════════════════════════════════"); */
        /* console.log("📋 Alumno (cliente):", {
      codigo: code,
      nombre: alumnoName || "(sin nombre)",
    }); */
        /* console.log("👥 Destinatario (equipo):", {
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
    }); */
        /* console.log("📝 Participantes enviados al servidor:", base); */
        /* console.log("═══════════════════════════════════════════"); */

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
    [code, alumnoName, resolvedEquipoId, resolvedEquipoName, coachMap],
  );

  const hasVslTab = React.useMemo(() => {
    if (coachIdFromProps) return false;
    if (!resolvedEquipoIdVSL) return false;
    if (
      resolvedEquipoIdVSL &&
      resolvedEquipoIdAC &&
      resolvedEquipoIdVSL === resolvedEquipoIdAC
    )
      return false;
    return true;
  }, [coachIdFromProps, resolvedEquipoIdVSL, resolvedEquipoIdAC]);

  const hasAcTab = React.useMemo(() => {
    if (coachIdFromProps) return true;
    return !!resolvedEquipoIdAC;
  }, [coachIdFromProps, resolvedEquipoIdAC]);

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
                No tienes un coach asignado (Atención al Cliente o VSL). Habla
                con un administrador para que te asignen uno y puedas usar el
                chat.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="h-full flex flex-col min-h-0">
          {!coachIdFromProps && hasVslTab && (
            <div className="px-1 pb-2">
              <Tabs value={channel} onValueChange={(v) => setChannel(v as any)}>
                <TabsList>
                  {hasAcTab && (
                    <TabsTrigger value="ac">Atención al cliente</TabsTrigger>
                  )}
                  <TabsTrigger value="vsl">VSL</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <CoachChatInline
              key={`${channel}:${resolvedEquipoId ?? "none"}`}
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
                idEquipo: resolvedEquipoId
                  ? String(resolvedEquipoId)
                  : undefined,
                myUserCode: String(code),
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
          </div>
        </div>
      )}
    </div>
  );
}
