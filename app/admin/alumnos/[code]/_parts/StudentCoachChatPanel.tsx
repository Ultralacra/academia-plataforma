"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RotateCw, Search, Loader2 } from "lucide-react";
import { dataService, type TeamWithCounts } from "@/lib/data-service";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { CHAT_HOST } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-config";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { StudentChatNotifier } from "@/components/chat/StudentChatNotifier";
import { StudentChatSkeleton } from "./StudentChatSkeleton";

export default function StudentCoachChatPanel({
  code,
  studentName,
  fullHeight,
}: {
  code: string;
  studentName?: string | null;
  fullHeight?: boolean;
}) {
  const CUSTOMER_CARE_AREA = "ATENCION AL CLIENTE";
  const norm = (s?: string | null) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  const hasCustomerCare = (area?: string | null) => {
    const n = norm(area).replace(/_/g, " "); // Normalizar guiones bajos a espacios
    return n.includes("ATENCION AL CLIENTE") || n.includes("SOPORTE");
  };
  const isVSLCoach = (r: any) => {
    const area = norm(r?.area ?? r?.coach_area ?? "").replace(/_/g, " ");
    const puesto = norm(r?.puesto ?? r?.coach_puesto ?? "").replace(/_/g, " ");
    const nombre = norm(r?.nombre ?? r?.coach_nombre ?? r?.name ?? "");
    return (
      area.includes("VSL") || puesto.includes("VSL") || nombre.includes("VSL")
    );
  };
  // Room base para token; no se usa en socketio directamente, pero mantiene consistencia
  const room = useMemo(() => `student:${(code || "").toLowerCase()}`, [code]);

  // Pestañas: AC (Atención al Cliente) y VSL
  const [channel, setChannel] = useState<"ac" | "vsl">("ac");

  // Catálogo de coaches
  const [teams, setTeams] = useState<TeamWithCounts[]>([]);
  const [teamsAll, setTeamsAll] = useState<TeamWithCounts[]>([]);
  const [teamsGlobal, setTeamsGlobal] = useState<TeamWithCounts[]>([]);
  const [coachRowsRaw, setCoachRowsRaw] = useState<any[]>([]);
  const [teamsVSL, setTeamsVSL] = useState<TeamWithCounts[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterPuesto, setFilterPuesto] = useState<string | null>(null);

  // Conexión/socket y chats
  const [connected, setConnected] = useState(false);
  const [listSignal, setListSignal] = useState(0);
  const [studentChats, setStudentChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(
    null,
  );
  const [currentOpenChatId, setCurrentOpenChatId] = useState<
    string | number | null
  >(null);
  // Bump para re-render cuando cambien contadores de no leídos
  const [unreadBump, setUnreadBump] = useState<number>(0);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true);
  const [isChangingChannel, setIsChangingChannel] = useState(false);

  const noCustomerCareCoaches = useMemo(() => {
    return !isLoadingCoaches && (teams?.length ?? 0) === 0;
  }, [isLoadingCoaches, teams]);

  // Si no hay coaches de Atención al Cliente, evitamos que el input del chat quede enfocado.
  useEffect(() => {
    if (!noCustomerCareCoaches) return;
    try {
      const el = document.activeElement as any;
      el?.blur?.();
    } catch {}
  }, [noCustomerCareCoaches]);

  const manualSelectionRef = useRef(false);

  // Selección de destino (coach)
  const [targetCoachId, setTargetCoachId] = useState<string | null>(null);

  const isChatOpen = !!selectedChatId || !!targetCoachId;

  const handleBack = () => {
    setSelectedChatId(null);
    setTargetCoachId(null);
    setCurrentOpenChatId(null);
    manualSelectionRef.current = true;
  };

  const selectedCoach = useMemo(() => {
    if (!targetCoachId) return null;
    return (
      teams.find(
        (x) =>
          String(x.id) === String(targetCoachId) ||
          String(x.codigo) === String(targetCoachId),
      ) || null
    );
  }, [teams, targetCoachId]);

  // Cargar coaches ASIGNADOS al alumno y limitar a Atención al Cliente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          code,
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        const rows: any[] = Array.isArray(j?.data) ? j.data : [];
        setCoachRowsRaw(rows);
        const asignados = rows.map((r) => {
          const codigoEq =
            r.codigo_equipo ??
            r.codigo_coach ??
            r.coach_codigo ??
            r.coach_code ??
            r.coachCodigo ??
            r.coachCode ??
            r.codigoCoach ??
            r.codigoEquipo ??
            r.equipo_codigo ??
            null;
          const idEq =
            r.id_equipo ??
            r.id_coach ??
            r.coach_id ??
            r.equipo_id ??
            r.id_relacion ??
            r.id ??
            null;
          return {
            id: idEq ?? codigoEq ?? r.id ?? null,
            codigo: codigoEq ?? null,
            nombre: r.coach_nombre ?? r.name ?? "",
            area: r.area ?? null,
            puesto: r.puesto ?? null,
          } as unknown as TeamWithCounts;
        });

        // LOG DETALLADO: TODOS LOS COACHES ASIGNADOS
        /* console.log("═══════════════════════════════════════════════════════"); */
        /* console.log("🔍 [CHAT ALUMNO] COACHES ASIGNADOS AL ALUMNO"); */
        /* console.log("═══════════════════════════════════════════════════════"); */
        /* console.log(`📋 Alumno: ${code} (${studentName || "Sin nombre"})`); */
        /* console.log(`📊 Total coaches asignados: ${asignados.length}`); */
        /* console.log(""); */
        /* console.log("👥 LISTA COMPLETA DE COACHES:"); */
        asignados.forEach((c, idx) => {
          const esAC = hasCustomerCare((c as any).area);
          /* console.log(`  ${idx + 1}. ${esAC ? "✅" : "❌"} Coach:`); */
          /* console.log(`     ID: ${c.id}`); */
          /* console.log(`     Código: ${c.codigo}`); */
          /* console.log(`     Nombre: ${c.nombre || "N/A"}`); */
          /* console.log(`     Área: ${(c as any).area || "N/A"}`); */
          /* console.log(`     Puesto: ${c.puesto || "N/A"}`); */
          /* console.log(
            `     ${
              esAC
                ? "👉 ES ATENCIÓN AL CLIENTE / SOPORTE"
                : "No es Atención al Cliente"
            }`
          ); */
          /* console.log(""); */
        });
        /* console.log("═══════════════════════════════════════════════════════"); */

        // Guardar catálogo completo para resolver nombres en títulos/logs
        setTeamsAll(asignados);

        // Filtrar solo Atención al Cliente para la lista de coaches (UI)
        // IMPORTANTE: Priorizar estricta coincidencia con ATENCION AL CLIENTE (o con guiones bajos)
        let onlyCustomerCare = asignados.filter((t) =>
          hasCustomerCare((t as any).area),
        );

        // Filtrar coaches VSL
        const onlyVSL = asignados.filter((t) => isVSLCoach(t));

        /* console.log("🎯 COACHES DE ATENCIÓN AL CLIENTE FILTRADOS:"); */
        /* console.log(`   Total encontrados: ${onlyCustomerCare.length}`); */
        if (onlyCustomerCare.length > 0) {
          onlyCustomerCare.forEach((c, idx) => {
            /* console.log(
              `   ${idx + 1}. ${c.nombre} (${c.codigo}) - Área: ${
                (c as any).area
              }`
            ); */
          });
        } else {
          /* console.log("   ⚠️ NO SE ENCONTRARON COACHES DE ATENCIÓN AL CLIENTE"); */
        }
        /* console.log("🎯 COACHES VSL FILTRADOS:"); */
        /* console.log(`   Total encontrados: ${onlyVSL.length}`); */
        if (onlyVSL.length > 0) {
          onlyVSL.forEach((c, idx) => {
            /* console.log(
              `   ${idx + 1}. ${c.nombre} (${c.codigo}) - Área: ${
                (c as any).area
              } - Puesto: ${c.puesto}`
            ); */
          });
        } else {
          /* console.log("   ⚠️ NO SE ENCONTRARON COACHES VSL"); */
        }
        /* console.log("═══════════════════════════════════════════════════════"); */

        // Fallback: si no hay nadie con area "Atención al Cliente", buscar por nombre o puesto que contenga "Soporte" o "Atención"
        if (onlyCustomerCare.length === 0) {
          onlyCustomerCare = asignados.filter(
            (t) =>
              norm(t.nombre).includes("SOPORTE") ||
              norm(t.nombre).includes("ATENCION") ||
              norm(t.puesto).includes("ATENCION") ||
              norm(t.puesto).includes("SOPORTE"),
          );
        }

        // Fallback final: si sigue vacío, NO mostrar todos los asignados para evitar chats con coaches personales incorrectos.
        // El alumno solo debe hablar con soporte aquí.
        if (onlyCustomerCare.length === 0 && asignados.length > 0) {
          // Intentar una última búsqueda laxa en el array completo
          const lax = asignados.filter((t) => {
            const s = norm(JSON.stringify(t));
            return (
              s.includes("ATENCION") ||
              s.includes("SOPORTE") ||
              s.includes("CLIENTE")
            );
          });
          if (lax.length > 0) onlyCustomerCare = lax;
          // Si aún así no hay nada, dejamos vacío o el primero SOLO si es explícitamente seguro (aquí preferimos vacío para no errar)
        }

        setTeams(onlyCustomerCare);
        setTeamsVSL(onlyVSL);

        // Determinar canal inicial: preferir AC si existe, sino VSL
        const initialChannel: "ac" | "vsl" =
          onlyCustomerCare.length > 0
            ? "ac"
            : onlyVSL.length > 0
              ? "vsl"
              : "ac";
        setChannel(initialChannel);

        // Preseleccionar el primero disponible del canal inicial si no hay destino actual
        const initialList =
          initialChannel === "ac" ? onlyCustomerCare : onlyVSL;
        if (!targetCoachId && initialList.length > 0) {
          try {
            const pick = initialList[0] as any;
            const firstCode = pick?.id ?? pick?.codigo ?? null; // Preferir ID
            if (firstCode != null) {
              setTargetCoachId(String(firstCode));
              /* console.log("✅ COACH SELECCIONADO AUTOMÁTICAMENTE:"); */
              /* console.log(`   Nombre: ${pick?.nombre}`); */
              /* console.log(`   Código: ${pick?.codigo}`); */
              /* console.log(`   ID: ${pick?.id}`); */
              /* console.log(`   Área: ${pick?.area}`); */
              /* console.log(`   Puesto: ${pick?.puesto}`); */
              /* console.log(`   Canal: ${initialChannel.toUpperCase()}`); */
              /* console.log(
                "═══════════════════════════════════════════════════════"
              ); */
            }
          } catch {}
        } else if (initialList.length === 0) {
          /* console.log(
            "⚠️ NO SE PUDO PRESELECCIONAR COACH: No hay coaches disponibles"
          ); */
          /* console.log(
            "═══════════════════════════════════════════════════════"
          ); */
        }
      } catch {
        setTeams([]);
      } finally {
        setIsLoadingCoaches(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  // Catálogo global de equipos (fallback para resolver nombres/códigos)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await dataService.getTeamsV2({ page: 1, pageSize: 2000 });
        if (!alive) return;
        const arr = Array.isArray(res?.data) ? res.data : [];
        setTeamsGlobal(arr);
      } catch (e) {
        try {
          /* console.log(
            "[StudentCoachChatPanel] No se pudo cargar teamsGlobal",
            e
          ); */
        } catch {}
        setTeamsGlobal([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => t.area && set.add(String(t.area)));
    return Array.from(set.values()).sort();
  }, [teams]);
  const puestoOptions = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => t.puesto && set.add(String(t.puesto)));
    return Array.from(set.values()).sort();
  }, [teams]);

  // Determinar si mostrar pestañas (solo si hay VSL Y AC o solo VSL)
  const hasACCoaches = teams.length > 0;
  const hasVSLCoaches = teamsVSL.length > 0;
  const showTabs = hasACCoaches && hasVSLCoaches;

  // Coaches activos según el canal seleccionado
  const activeCoaches = useMemo(() => {
    return channel === "vsl" ? teamsVSL : teams;
  }, [channel, teams, teamsVSL]);

  // Handler para cambio de canal
  const handleChannelChange = (newChannel: "ac" | "vsl") => {
    // Mostrar skeleton mientras cambia
    setIsChangingChannel(true);

    setChannel(newChannel);
    setSelectedChatId(null);
    setCurrentOpenChatId(null);
    manualSelectionRef.current = false;

    // Limpiar lista de chats para que se recargue con el nuevo filtro
    setStudentChats([]);

    // Preseleccionar el primer coach del nuevo canal
    // El título se calcula automáticamente via computedTitle/computedSubtitle
    const list = newChannel === "vsl" ? teamsVSL : teams;
    if (list.length > 0) {
      const pick = list[0] as any;
      const firstCode = pick?.id ?? pick?.codigo ?? null;
      if (firstCode != null) {
        setTargetCoachId(String(firstCode));
      }
    } else {
      setTargetCoachId(null);
    }

    // Forzar refresh de la lista de conversaciones con el nuevo filtro
    setListSignal((n) => n + 1);

    // Ocultar skeleton después de un breve momento
    setTimeout(() => {
      setIsChangingChannel(false);
    }, 300);
  };
  const filteredCoaches = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    // Usar activeCoaches según el canal seleccionado
    return activeCoaches
      .filter((t) => (filterArea ? t.area === filterArea : true))
      .filter((t) => (filterPuesto ? t.puesto === filterPuesto : true))
      .filter((t) =>
        q
          ? [t.nombre, t.codigo, t.puesto, t.area]
              .map((x) => String(x ?? "").toLowerCase())
              .some((s) => s.includes(q))
          : true,
      );
  }, [activeCoaches, searchText, filterArea, filterPuesto]);

  // Resolver ID del equipo para el coach seleccionado (preferir ID numérico para matching con backend)
  const resolvedEquipoCode = useMemo(() => {
    if (!targetCoachId) return null;
    const v = String(targetCoachId).trim();

    // Intentar encontrar el objeto completo en los catálogos (incluir teamsVSL)
    const catalogs = [teamsAll, teams, teamsVSL, teamsGlobal];
    for (const list of catalogs) {
      try {
        const arr = Array.isArray(list) ? list : [];
        const match = arr.find((x: any) => {
          const ids = [x?.id, x?.codigo, x?.code]
            .map((n) => (n == null ? null : String(n)))
            .filter(Boolean);
          return ids.includes(v);
        });
        if (match) {
          const m = match as any;
          // Preferir ID numérico si existe
          if (m.id) return String(m.id);
          if (m.id_equipo) return String(m.id_equipo);
          // Fallback a código
          return m.codigo || m.code || v;
        }
      } catch {}
    }

    return v;
  }, [targetCoachId, teamsAll, teams, teamsGlobal]);

  // Construir participantes cuando hay un coach seleccionado
  const participants = useMemo(() => {
    if (!targetCoachId) return undefined;
    const idEquipoVal = resolvedEquipoCode ? String(resolvedEquipoCode) : null;
    const arr: any[] = [
      { participante_tipo: "cliente", id_cliente: String(code) },
    ];
    // Incluir siempre el equipo si se pudo resolver algún código/ID (permitir numéricos también)
    if (idEquipoVal)
      arr.push({ participante_tipo: "equipo", id_equipo: idEquipoVal });
    try {
      /* console.log("[StudentCoachChatPanel] participants", arr, {
        targetCoachId,
        resolvedEquipoCode: idEquipoVal,
      }); */
    } catch {}
    return arr as any[];
  }, [code, targetCoachId, resolvedEquipoCode]);

  // Forzar remount del chat cuando cambiamos de destino o abrimos por chatId (esto dispara la lógica de find-or-create/join interna)
  // Incluir el canal para asegurar conversaciones separadas entre AC y VSL
  const chatKey = useMemo(() => {
    if (selectedChatId != null)
      return `cid:${String(selectedChatId)}:${channel}`;
    if (targetCoachId) return `coach:${String(targetCoachId)}:${channel}`;
    return `idle:${code}:${channel}`;
  }, [selectedChatId, targetCoachId, code, channel]);

  // Calcular título y subtítulo como memo (más estable que useEffect)
  const { computedTitle, computedSubtitle } = useMemo(() => {
    if (!targetCoachId) {
      return {
        computedTitle: channel === "vsl" ? "Coach VSL" : "Soporte",
        computedSubtitle:
          channel === "vsl" ? "Video Sales Letter" : "Atención al Cliente",
      };
    }
    // Buscar en el catálogo correcto según el canal, con fallback a teamsAll
    const searchList = channel === "vsl" ? teamsVSL : teams;
    const t =
      searchList.find(
        (x) =>
          String(x.id) === String(targetCoachId) ||
          String(x.codigo) === String(targetCoachId),
      ) ||
      teamsAll.find(
        (x) =>
          String(x.id) === String(targetCoachId) ||
          String(x.codigo) === String(targetCoachId),
      );
    return {
      computedTitle: t?.nombre || (channel === "vsl" ? "Coach VSL" : "Soporte"),
      computedSubtitle:
        t?.puesto ||
        (channel === "vsl" ? "Video Sales Letter" : "Atención al Cliente"),
    };
  }, [targetCoachId, teams, teamsVSL, channel]);

  // Al conectar, refrescar listado de mis chats (como alumno)
  useEffect(() => {
    if (connected) setListSignal((n) => n + 1);
  }, [connected]);

  // Escuchar eventos globales de refresco desde ChatRealtime (mensajes de otros chats)
  useEffect(() => {
    let lastAt = 0;
    const onRefresh = () => {
      const now = Date.now();
      if (now - lastAt < 800) return; // anti-ruido
      lastAt = now;
      setListSignal((n) => n + 1);
    };
    try {
      window.addEventListener("chat:list-refresh", onRefresh as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener("chat:list-refresh", onRefresh as any);
      } catch {}
    };
  }, []);

  // Escuchar actualizaciones de contadores no leídos (misma pestaña y otras)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("chatUnreadById:alumno:")) {
        setUnreadBump((n) => n + 1);
      }
    };
    const onUnreadEvent = (e: any) => {
      try {
        if (e?.detail?.role === "alumno") setUnreadBump((n) => n + 1);
      } catch {}
    };
    try {
      window.addEventListener("storage", onStorage);
      window.addEventListener(
        "chat:unread-count-updated",
        onUnreadEvent as any,
      );
    } catch {}
    return () => {
      try {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(
          "chat:unread-count-updated",
          onUnreadEvent as any,
        );
      } catch {}
    };
  }, []);

  // listParams para listar conversaciones del alumno: SIEMPRE por cliente (código del alumno)
  const listParams = useMemo(() => {
    return { participante_tipo: "cliente", id_cliente: String(code) };
  }, [code]);

  // Log en consola: equipos asignados al alumno (y los de Atención al Cliente)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          code,
        )}`;
        const j = await apiFetch<any>(url);
        if (!alive) return;
        const rows: any[] = Array.isArray(j?.data) ? j.data : [];
        const asignados = rows.map((r) => ({
          id: r.id_coach ?? r.id ?? r.id_relacion ?? null,
          nombre: r.coach_nombre ?? r.name ?? "",
          area: r.area ?? null,
          puesto: r.puesto ?? null,
          codigo: r.codigo_coach ?? r.codigo_equipo ?? r.codigo ?? r.id ?? null,
        }));
        const atencion = asignados.filter(
          (a) => String(a.area || "").toUpperCase() === CUSTOMER_CARE_AREA,
        );
        // Logs claros para depuración
        /* console.log("[Chat alumno] Equipos asignados:", {
          alumno: code,
          total: asignados.length,
          asignados,
        }); */
        /* console.log("[Chat alumno] Atención al Cliente:", {
          alumno: code,
          total: atencion.length,
          atencion,
        }); */
      } catch (e) {
        /* console.log("[Chat alumno] No se pudo obtener equipos del alumno", e); */
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);
  // Log de depuración: qué enviamos para listar
  useEffect(() => {
    try {
      /* console.log("[StudentCoachChatPanel] listParams =>", listParams, {
        connected,
        listSignal,
      }); */
    } catch {}
  }, [listParams, connected, listSignal]);

  function initialFromText(s?: string) {
    const t = (s || "").trim();
    return t ? t.slice(0, 1).toUpperCase() : "?";
  }

  const formatLocalTimeLabel = (v: any): string => {
    const raw = String(v ?? "").trim();
    if (!raw) return "";
    const normalized =
      raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
    const m = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
    );
    if (!m) return raw;
    const dd = m[3];
    const mm = m[2];
    const hh = m[4];
    const min = m[5];
    return `${dd}/${mm} ${hh}:${min}`;
  };
  const getItemTimestamp = (it: any): number => {
    try {
      const fields = [
        it?.last_message?.fecha_envio,
        it?.last_message_at,
        it?.fecha_ultimo_mensaje,
        it?.updated_at,
        it?.fecha_actualizacion,
        it?.created_at,
        it?.fecha_creacion,
      ];
      for (const f of fields) {
        const t = Date.parse(String(f || ""));
        if (!isNaN(t)) return t;
      }
      const idNum = Number(it?.id_chat ?? it?.id ?? 0);
      return isNaN(idNum) ? 0 : idNum;
    } catch {
      return 0;
    }
  };

  // Render
  const showInitialSkeleton = isLoadingCoaches || isLoadingChats;

  return (
    <>
      {showInitialSkeleton && <StudentChatSkeleton />}
      <div
        className={`rounded-xl border border-border bg-card overflow-hidden ${
          fullHeight ? "h-full flex flex-col" : ""
        } ${showInitialSkeleton ? "hidden" : ""}`}
      >
        {/* <StudentChatNotifier studentCode={code} /> */}
        <div className="px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Chat del alumno
            </h3>
            {showTabs && (
              <Tabs
                value={channel}
                onValueChange={(v) => handleChannelChange(v as "ac" | "vsl")}
              >
                <TabsList className="h-7">
                  <TabsTrigger value="ac" className="text-xs px-3 py-1">
                    Soporte
                  </TabsTrigger>
                  <TabsTrigger value="vsl" className="text-xs px-3 py-1">
                    VSL
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          {selectedCoach && (
            <div className="mt-1">
              <Badge
                variant="secondary"
                className="h-5 px-2 text-[10px] font-medium bg-muted text-muted-foreground border-border"
                title={
                  channel === "vsl"
                    ? "Coach VSL"
                    : "Soporte · Atención al Cliente"
                }
              >
                {channel === "vsl" ? "Coach VSL" : "Soporte X Academy"}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ·{" "}
                  {channel === "vsl"
                    ? "Video Sales Letter"
                    : "Atención al Cliente"}
                </span>
              </Badge>
            </div>
          )}
        </div>
        <div
          className={`${
            fullHeight ? "p-3 flex-1 min-h-0" : "p-3 h-[620px] min-h-0"
          } relative`}
        >
          <div className="flex flex-col md:grid md:grid-cols-12 gap-3 h-full min-h-0">
            {/* Sidebar: filtros + coaches + mis conversaciones */}
            <div
              className={`
              w-full md:col-span-3
              overflow-auto border border-border rounded p-3 bg-card space-y-3
              shrink-0
              max-h-[180px] md:max-h-full md:h-full
              ${isChatOpen ? "hidden" : "block"}
            `}
            >
              {/* Buscador */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar coach por nombre, código, área, cargo…"
                    className="pl-9 bg-background border-border"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  title="Limpiar filtros"
                  onClick={() => {
                    setSearchText("");
                    setFilterArea(null);
                    setFilterPuesto(null);
                  }}
                >
                  ✕
                </Button>
              </div>
              {/* Filtros simplificados: área según canal */}
              <div className="text-[11px] text-muted-foreground">
                Área: {channel === "vsl" ? "VSL" : "Atención al Cliente"}
              </div>

              {/* Coaches */}
              <div className="min-h-0">
                <div className="text-sm font-semibold mb-2 text-foreground">
                  Coaches
                </div>
                <ul className="space-y-1 text-sm max-h-[28vh] overflow-auto pr-1">
                  {filteredCoaches.map((t) => {
                    const selected =
                      String(targetCoachId ?? "") ===
                      String((t as any).id ?? (t as any).codigo);
                    const subtitle =
                      t.puesto ||
                      (channel === "vsl"
                        ? "VSL"
                        : "SOPORTE · ATENCIÓN AL CLIENTE");
                    const brandAvatarSrc =
                      "https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg";
                    return (
                      <li key={String(t.id)}>
                        <button
                          className={`w-full text-left rounded hover:bg-muted/50 ${
                            selected ? "bg-primary/10" : ""
                          }`}
                          title={subtitle}
                          onClick={() => {
                            manualSelectionRef.current = true;
                            // Preferir ID para evitar duplicados
                            const nextCode = t.id ?? (t as any).codigo;
                            setTargetCoachId(String(nextCode));
                            setSelectedChatId(null);
                            setCurrentOpenChatId(null);
                          }}
                        >
                          <div className="flex items-center gap-3 px-2 py-2">
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={brandAvatarSrc}
                                alt={t.nombre || "Soporte"}
                              />
                              <AvatarFallback>
                                {initialFromText(t.nombre || "S")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-foreground">
                                {t.nombre || "Soporte"}
                              </div>
                              {subtitle && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Mis conversaciones como alumno */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-foreground">
                    Mis conversaciones
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    title={connected ? "Actualizar" : "Conectando..."}
                    onClick={() => setListSignal((n) => n + 1)}
                    disabled={!connected}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <ul className="space-y-1 text-sm max-h-[24vh] overflow-auto pr-1">
                  {studentChats.length === 0 && (
                    <li className="text-xs text-muted-foreground">
                      Sin conversaciones
                    </li>
                  )}
                  {studentChats.map((it) => {
                    const id = it?.id_chat ?? it?.id;
                    // etiqueta: mostrar nombre del coach cuando exista
                    const parts = it?.participants || it?.participantes || [];
                    const coach = parts.find(
                      (p: any) =>
                        String((p?.participante_tipo || "").toLowerCase()) ===
                        "equipo",
                    );
                    // Intentar identificar al coach por catálogo (id o código)
                    const coachInfo =
                      (teamsAll.length ? teamsAll : teams).find(
                        (t) =>
                          String(t.id) === String(coach?.id_equipo ?? "") ||
                          String(t.codigo) === String(coach?.id_equipo ?? ""),
                      ) ||
                      teamsGlobal.find(
                        (t) =>
                          String(t.id) === String(coach?.id_equipo ?? "") ||
                          String(t.codigo) === String(coach?.id_equipo ?? ""),
                      );
                    const title = coachInfo?.nombre || "Soporte";
                    const lastObj =
                      it?.last_message ?? it?.ultimo_mensaje ?? null;
                    const last = (
                      lastObj?.contenido ??
                      lastObj?.text ??
                      it?.last?.text ??
                      ""
                    ).toString();
                    const areaPuesto =
                      coachInfo?.puesto || "Atención al Cliente";
                    const countKey = `chatUnreadById:alumno:${String(
                      id ?? "",
                    )}`;
                    const storedCount = parseInt(
                      (typeof window !== "undefined" &&
                        window.localStorage.getItem(countKey)) ||
                        "0",
                      10,
                    );
                    const count = isNaN(storedCount) ? 0 : storedCount;
                    const isOpen =
                      id != null &&
                      String(currentOpenChatId ?? "") === String(id);
                    const lastAt = getItemTimestamp(it);
                    const lastAtLabel = formatLocalTimeLabel(
                      lastObj?.fecha_envio_local ??
                        lastObj?.fecha_envio ??
                        it?.last_message_at ??
                        it?.fecha_ultimo_mensaje ??
                        it?.updated_at ??
                        it?.fecha_actualizacion ??
                        "",
                    );
                    const brandAvatarSrc =
                      "https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg";
                    return (
                      <li key={String(id)}>
                        <button
                          className={`w-full text-left rounded hover:bg-muted/50 ${
                            count > 0 && !isOpen ? "bg-emerald-900/20" : ""
                          }`}
                          onClick={() => {
                            try {
                              /* console.log(
                                "[StudentCoachChatPanel] click chat",
                                {
                                  id,
                                }
                              ); */
                            } catch {}
                            manualSelectionRef.current = true;
                            setTargetCoachId(null);
                            setSelectedChatId(id);
                            setCurrentOpenChatId(id ?? null);
                            if (id != null) {
                              try {
                                const k = `chatUnreadById:alumno:${String(id)}`;
                                localStorage.setItem(k, "0");
                                window.dispatchEvent(
                                  new CustomEvent("chat:unread-count-updated", {
                                    detail: {
                                      chatId: id,
                                      role: "alumno",
                                      count: 0,
                                    },
                                  }),
                                );
                              } catch {}
                            }
                          }}
                          title={String(last || "")}
                        >
                          <div className="flex items-center gap-3 px-2 py-2">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={brandAvatarSrc} alt={title} />
                              <AvatarFallback>
                                {initialFromText(title)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate font-medium text-foreground">
                                  {title}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                  {lastAtLabel}
                                </span>
                              </div>
                              {(areaPuesto || last) && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {areaPuesto || last}
                                </div>
                              )}
                            </div>
                            {count > 0 && (
                              <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white text-[10px] grid place-items-center px-1">
                                {count}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Panel de chat */}
            <div
              className={`
              h-full flex-col min-h-0 flex-1
              ${
                isChatOpen
                  ? "flex md:col-span-12"
                  : "hidden md:flex md:col-span-9"
              }
              w-full
            `}
            >
              {/** Resolvedor de nombres para logs legibles */}
              {(() => {
                return null; // placeholder para mantener orden visual
              })()}
              <div className="relative flex flex-col flex-1 min-h-0">
                {/* Skeleton mientras cambia de canal */}
                {isChangingChannel && (
                  <div className="absolute inset-0 z-10 bg-card flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                      <div className="w-32 h-4 bg-muted animate-pulse rounded" />
                      <div className="w-24 h-3 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                )}
                <div
                  className={
                    noCustomerCareCoaches
                      ? "flex flex-col flex-1 min-h-0 pointer-events-none select-none blur-[2px] opacity-60"
                      : "flex flex-col flex-1 min-h-0"
                  }
                >
                  <CoachChatInline
                    key={chatKey}
                    room={room}
                    role="alumno"
                    title={computedTitle}
                    subtitle={computedSubtitle}
                    variant="card"
                    className="flex-1 min-h-0 rounded-lg shadow-sm overflow-hidden"
                    precreateOnParticipants={false}
                    onBack={isChatOpen ? handleBack : undefined}
                    resolveName={(tipo, id) => {
                      const sid = String(id ?? "");
                      if (tipo === "cliente") {
                        if (sid === String(code)) return studentName || sid;
                        return sid;
                      }
                      if (tipo === "equipo") {
                        // Intentar resolver nombre real del coach
                        const t = (teamsAll.length ? teamsAll : teams).find(
                          (x) =>
                            String(x.id) === sid || String(x.codigo) === sid,
                        );
                        if (t?.nombre) return t.nombre;
                        return "Soporte";
                      }
                      return sid;
                    }}
                    socketio={{
                      url: (CHAT_HOST || "").replace(/\/$/, ""),
                      idCliente: String(code),
                      idEquipo: resolvedEquipoCode
                        ? String(resolvedEquipoCode)
                        : undefined,
                      participants: participants,
                      // No crear automáticamente: solo al enviar o adjuntar desde el alumno
                      autoCreate: false,
                      autoJoin: !!selectedChatId,
                      chatId: selectedChatId ?? undefined,
                    }}
                    onConnectionChange={setConnected}
                    requestListSignal={listSignal}
                    listParams={listParams}
                    onChatsList={(list) => {
                      const arr = Array.isArray(list) ? list : [];

                      // FILTRO: Solo mostrar conversaciones según el canal activo (AC o VSL)
                      /* console.log(
                        "═══════════════════════════════════════════════════════"
                      ); */
                      /* console.log(
                        `🔍 [CHAT ALUMNO] FILTRANDO CONVERSACIONES PARA CANAL: ${channel.toUpperCase()}`
                      ); */
                      /* console.log(
                        "═══════════════════════════════════════════════════════"
                      ); */
                      /* console.log(
                        `📋 Total conversaciones recibidas: ${arr.length}`
                      ); */

                      const filtered = arr.filter((chat: any) => {
                        const parts =
                          chat.participants || chat.participantes || [];
                        const coachP = parts.find(
                          (p: any) =>
                            String(
                              (p?.participante_tipo || "").toLowerCase(),
                            ) === "equipo",
                        );
                        if (!coachP) {
                          /* console.log(
                            `❌ Chat ${
                              chat.id_chat || chat.id
                            }: Sin participante equipo`
                          ); */
                          return false;
                        }
                        const sid = String(coachP.id_equipo || "");

                        // Solo mostrar conversaciones con coaches ASIGNADOS al alumno (teamsAll).
                        // No usar teamsGlobal aquí para evitar mostrar chats con coaches anteriores
                        // que ya fueron desasignados pero cuya conversación aún existe.
                        const t = teamsAll.find(
                          (x) =>
                            String(x.id) === sid || String(x.codigo) === sid,
                        );

                        if (!t) {
                          /* console.log(
                            `❌ Chat ${
                              chat.id_chat || chat.id
                            }: Coach ${sid} no identificado`
                          ); */
                          return false; // Coach no asignado al alumno → ocultar
                        }

                        // Filtrar según el canal activo
                        const isVSL = isVSLCoach(t);
                        const isAC = hasCustomerCare(t.area);

                        if (channel === "vsl") {
                          /* console.log(
                            `${isVSL ? "✅" : "❌"} Chat ${
                              chat.id_chat || chat.id
                            }: Coach ${t.nombre} (${sid}) - Área: ${t.area} ${
                              isVSL ? "👉 ES VSL" : ""
                            }`
                          ); */
                          return isVSL;
                        } else {
                          /* console.log(
                            `${isAC ? "✅" : "❌"} Chat ${
                              chat.id_chat || chat.id
                            }: Coach ${t.nombre} (${sid}) - Área: ${t.area} ${
                              isAC ? "👉 ES ATENCIÓN AL CLIENTE" : ""
                            }`
                          ); */
                          return isAC;
                        }
                      });

                      /* console.log(""); */
                      /* console.log(
                        `✅ Conversaciones de ${channel === "vsl" ? "VSL" : "Atención al Cliente"}: ${filtered.length}`
                      ); */
                      if (filtered.length > 0) {
                        /* console.log("📋 Lista de chats válidos:"); */
                        filtered.forEach((c: any, idx: number) => {
                          const chatId = c.id_chat || c.id;
                          const parts = c.participants || c.participantes || [];
                          const coachP = parts.find(
                            (p: any) => p?.participante_tipo === "equipo",
                          );
                          const sid = String(coachP?.id_equipo || "");
                          const t = teamsAll.find(
                            (x) =>
                              String(x.id) === sid || String(x.codigo) === sid,
                          );
                          /* console.log(
                            `   ${idx + 1}. Chat ID: ${chatId} - Coach: ${
                              t?.nombre
                            } (${t?.codigo}) - Canal: ${channel.toUpperCase()}`
                          ); */
                        });
                      }
                      /* console.log(
                        "═══════════════════════════════════════════════════════"
                      ); */
                      try {
                        /* console.log("[StudentCoachChatPanel] onChatsList", {
                          channel,
                          original: arr.length,
                          filtered: filtered.length,
                          sample: filtered.slice(0, 5).map((it: any) => ({
                            id: it?.id_chat ?? it?.id,
                            last:
                              it?.last_message?.contenido ??
                              it?.ultimo_mensaje?.contenido ??
                              it?.last?.text ??
                              null,
                          })),
                        }); */
                      } catch {}

                      setStudentChats(filtered);
                      setIsLoadingChats(false);

                      // Auto-load existing chat if available and not manually navigating
                      if (
                        filtered.length > 0 &&
                        !selectedChatId &&
                        !manualSelectionRef.current
                      ) {
                        // Si ya hay un targetCoachId preseleccionado, priorizar el chat
                        // con ese coach específico en vez del más reciente cualquiera.
                        const findChatForCoach = (coachId: string | null) => {
                          if (!coachId) return null;
                          return (
                            filtered.find((chat: any) => {
                              const pts =
                                chat.participants || chat.participantes || [];
                              const cp = pts.find(
                                (p: any) => p?.participante_tipo === "equipo",
                              );
                              const eqId = String(cp?.id_equipo || "");
                              return (
                                eqId === coachId ||
                                teamsAll.some(
                                  (x) =>
                                    (String(x.id) === coachId ||
                                      String(x.codigo) === coachId) &&
                                    (String(x.id) === eqId ||
                                      String(x.codigo) === eqId),
                                )
                              );
                            }) || null
                          );
                        };
                        const preferred =
                          findChatForCoach(targetCoachId) || filtered[0];
                        const id = preferred.id_chat ?? preferred.id;
                        if (id) {
                          const parts =
                            preferred.participants ||
                            preferred.participantes ||
                            [];
                          const coachP = parts.find(
                            (p: any) => p?.participante_tipo === "equipo",
                          );
                          const sid = String(coachP?.id_equipo || "");
                          // Fijar targetCoachId al coach del chat auto-cargado
                          // para que computedTitle muestre su nombre real.
                          const t = teamsAll.find(
                            (x) =>
                              String(x.id) === sid || String(x.codigo) === sid,
                          );

                          setSelectedChatId(id);
                          if (t) {
                            setTargetCoachId(String(t.id ?? (t as any).codigo));
                          }
                        }
                      }
                    }}
                    onChatInfo={(info) => {
                      setCurrentOpenChatId(info?.chatId ?? null);
                      try {
                        /* console.log("[StudentCoachChatPanel] onChatInfo", {
                          chatId: info?.chatId ?? null,
                          myParticipantId: info?.myParticipantId ?? null,
                          participants: Array.isArray(info?.participants)
                            ? info?.participants?.map((p: any) => ({
                                tipo: p?.participante_tipo,
                                id_equipo: p?.id_equipo,
                                id_cliente: p?.id_cliente,
                                id_admin: p?.id_admin,
                                id_chat_participante: p?.id_chat_participante,
                              }))
                            : info?.participants,
                        }); */
                      } catch {}
                      // Si abrimos por chatId (no por coach seleccionado), intenta fijar encabezado con nombre del coach y su área/puesto
                      try {
                        if (Array.isArray(info?.participants)) {
                          const coachP = (info?.participants as any[]).find(
                            (p: any) =>
                              String(
                                (p?.participante_tipo || "").toLowerCase(),
                              ) === "equipo",
                          );
                          const sid = coachP?.id_equipo
                            ? String(coachP.id_equipo)
                            : null;
                          if (sid) {
                            // Buscar solo en coaches asignados al alumno
                            const t = teamsAll.find(
                              (x) =>
                                String((x as any).codigo) === sid ||
                                String(x.id) === sid,
                            );
                            // Actualizar targetCoachId si encontramos al coach en asignados
                            // para que computedTitle muestre el nombre correcto
                            if (t && !targetCoachId) {
                              setTargetCoachId(
                                String(t.id ?? (t as any).codigo),
                              );
                            }
                          }
                        }
                      } catch {}
                      if (info?.chatId != null) {
                        try {
                          const k = `chatUnreadById:alumno:${String(
                            info.chatId,
                          )}`;
                          localStorage.setItem(k, "0");
                          window.dispatchEvent(
                            new CustomEvent("chat:unread-count-updated", {
                              detail: {
                                chatId: info.chatId,
                                role: "alumno",
                                count: 0,
                              },
                            }),
                          );
                        } catch {}
                      }
                    }}
                  />
                </div>

                {noCustomerCareCoaches && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                    <div className="w-full max-w-md rounded-xl border bg-white/95 backdrop-blur shadow-lg">
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">
                              Estamos asignando tu coach de soporte
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Aún no tienes coaches de Atención al Cliente
                              asignados. Cuando estén disponibles, podrás
                              escribir por aquí.
                            </div>
                          </div>
                          <Badge variant="outline">Soporte</Badge>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Asignando…
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsLoadingCoaches(true);
                              // dispara recarga de coaches reasignando el efecto por `code`
                              // (best-effort: reusar el mismo code)
                              setTimeout(() => setIsLoadingCoaches(false), 50);
                              window.location.reload();
                            }}
                          >
                            Reintentar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
