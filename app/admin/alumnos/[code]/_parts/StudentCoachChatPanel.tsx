"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { RotateCw, Search } from "lucide-react";
import { dataService, type TeamWithCounts } from "@/lib/data-service";
import CoachChatInline from "@/app/admin/teamsv2/[code]/CoachChatInline";
import { CHAT_HOST } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-config";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const hasCustomerCare = (area?: string | null) =>
    norm(area).includes(CUSTOMER_CARE_AREA);
  // Room base para token; no se usa en socketio directamente, pero mantiene consistencia
  const room = useMemo(() => `student:${(code || "").toLowerCase()}`, [code]);

  // Catálogo de coaches
  const [teams, setTeams] = useState<TeamWithCounts[]>([]);
  const [teamsAll, setTeamsAll] = useState<TeamWithCounts[]>([]);
  const [teamsGlobal, setTeamsGlobal] = useState<TeamWithCounts[]>([]);
  const [coachRowsRaw, setCoachRowsRaw] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterPuesto, setFilterPuesto] = useState<string | null>(null);

  // Conexión/socket y chats
  const [connected, setConnected] = useState(false);
  const [listSignal, setListSignal] = useState(0);
  const [studentChats, setStudentChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(
    null
  );
  const [currentOpenChatId, setCurrentOpenChatId] = useState<
    string | number | null
  >(null);
  // Bump para re-render cuando cambien contadores de no leídos
  const [unreadBump, setUnreadBump] = useState<number>(0);

  // Selección de destino (coach)
  const [targetCoachId, setTargetCoachId] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState<string>(
    studentName || "Conversación"
  );
  const [targetSubtitle, setTargetSubtitle] = useState<string | undefined>(
    undefined
  );
  const selectedCoach = useMemo(() => {
    if (!targetCoachId) return null;
    return (
      teams.find(
        (x) =>
          String(x.id) === String(targetCoachId) ||
          String(x.codigo) === String(targetCoachId)
      ) || null
    );
  }, [teams, targetCoachId]);

  // Cargar coaches ASIGNADOS al alumno y limitar a Atención al Cliente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/client/get/clients-coaches?alumno=${encodeURIComponent(
          code
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
        // Guardar catálogo completo para resolver nombres en títulos/logs
        setTeamsAll(asignados);
        // Filtrar solo Atención al Cliente para la lista de coaches (UI)
        const onlyCustomerCare = asignados.filter((t) =>
          hasCustomerCare((t as any).area)
        );
        setTeams(onlyCustomerCare);
        // Preseleccionar el primero disponible si no hay destino actual:
        // 1) Preferir Atención al Cliente; 2) si no hay, cualquier asignado.
        if (!targetCoachId) {
          try {
            const pick = (onlyCustomerCare[0] as any) || (asignados[0] as any);
            const firstCode = pick?.codigo ?? pick?.id ?? null;
            if (firstCode != null) setTargetCoachId(String(firstCode));
          } catch {}
        }
      } catch {
        setTeams([]);
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
          console.log(
            "[StudentCoachChatPanel] No se pudo cargar teamsGlobal",
            e
          );
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

  const filteredCoaches = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (
      teams
        // Asegurar que solo mostramos Atención al Cliente (ya filtrado al cargar)
        .filter((t) => hasCustomerCare(t.area))
        .filter((t) => (filterArea ? t.area === filterArea : true))
        .filter((t) => (filterPuesto ? t.puesto === filterPuesto : true))
        .filter((t) =>
          q
            ? [t.nombre, t.codigo, t.puesto, t.area]
                .map((x) => String(x ?? "").toLowerCase())
                .some((s) => s.includes(q))
            : true
        )
    );
  }, [teams, searchText, filterArea, filterPuesto]);

  // Resolver código del equipo para el coach seleccionado.
  const resolvedEquipoCode = useMemo(() => {
    if (!targetCoachId) return null;
    const v = String(targetCoachId).trim();
    const looksLikeCode = /[a-zA-Z]/.test(v) || v.includes("-");
    if (looksLikeCode) return v;

    const studentCodeStr = String(code ?? "");
    const pickFirstString = (...vals: any[]) => {
      for (const val of vals) {
        if (val == null) continue;
        const s = String(val).trim();
        if (!s) continue;
        if (s === studentCodeStr) continue;
        if (/[a-zA-Z]/.test(s) || s.includes("-")) return s;
      }
      return null;
    };

    try {
      const rows = Array.isArray(coachRowsRaw) ? coachRowsRaw : [];
      for (const r of rows) {
        const ids = [
          r?.id,
          r?.id_coach,
          r?.id_equipo,
          r?.id_relacion,
          r?.coach_id,
          r?.equipo_id,
        ]
          .map((x: any) => (x == null ? null : String(x)))
          .filter(Boolean);
        if (!ids.includes(v)) continue;
        const code = pickFirstString(
          r?.codigo_equipo,
          r?.codigo_coach,
          r?.coach_codigo,
          r?.coach_code,
          r?.equipo_codigo,
          r?.codigoEquipo,
          r?.codigoCoach
        );
        if (code) return code;
      }
    } catch {}

    const catalogs = [teamsAll, teams, teamsGlobal];
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
          const code = pickFirstString(
            match?.codigo,
            match?.code,
            match?.codigo_equipo,
            match?.codigoCoach,
            match?.codigo_coach
          );
          if (code) return code;
        }
      } catch {}
    }

    return v;
  }, [targetCoachId, coachRowsRaw, teamsAll, teams, teamsGlobal]);

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
      console.log("[StudentCoachChatPanel] participants", arr, {
        targetCoachId,
        resolvedEquipoCode: idEquipoVal,
      });
    } catch {}
    return arr as any[];
  }, [code, targetCoachId, resolvedEquipoCode]);

  // Forzar remount del chat cuando cambiamos de destino o abrimos por chatId (esto dispara la lógica de find-or-create/join interna)
  const chatKey = useMemo(() => {
    if (selectedChatId != null) return `cid:${String(selectedChatId)}`;
    if (targetCoachId) return `coach:${String(targetCoachId)}`;
    return `idle:${code}`;
  }, [selectedChatId, targetCoachId, code]);

  useEffect(() => {
    if (!targetCoachId) {
      setTargetTitle("Soporte X Academy");
      setTargetSubtitle("Atención al Cliente");
      return;
    }
    const t = teams.find(
      (x) =>
        String(x.id) === String(targetCoachId) ||
        String(x.codigo) === String(targetCoachId)
    );
    setTargetTitle("Soporte X Academy");
    setTargetSubtitle("Atención al Cliente");
  }, [targetCoachId, teams, studentName]);

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
        onUnreadEvent as any
      );
    } catch {}
    return () => {
      try {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(
          "chat:unread-count-updated",
          onUnreadEvent as any
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
          code
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
          (a) => String(a.area || "").toUpperCase() === CUSTOMER_CARE_AREA
        );
        // Logs claros para depuración
        console.log("[Chat alumno] Equipos asignados:", {
          alumno: code,
          total: asignados.length,
          asignados,
        });
        console.log("[Chat alumno] Atención al Cliente:", {
          alumno: code,
          total: atencion.length,
          atencion,
        });
      } catch (e) {
        console.log("[Chat alumno] No se pudo obtener equipos del alumno", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);
  // Log de depuración: qué enviamos para listar
  useEffect(() => {
    try {
      console.log("[StudentCoachChatPanel] listParams =>", listParams, {
        connected,
        listSignal,
      });
    } catch {}
  }, [listParams, connected, listSignal]);

  function initialFromText(s?: string) {
    const t = (s || "").trim();
    return t ? t.slice(0, 1).toUpperCase() : "?";
  }

  const formatListTime = (ms: number): string => {
    if (!ms || isNaN(ms)) return "";
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${
        fullHeight ? "h-full flex flex-col" : ""
      }`}
    >
      <div className="px-4 py-3 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-900">Chat del alumno</h3>
        <p className="text-xs text-gray-500">
          El alumno chatea solo con sus coaches asignados de Atención al Cliente
        </p>
        {selectedCoach && (
          <div className="mt-1">
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium bg-gray-100 text-gray-700 border-gray-200"
              title="Soporte · Atención al Cliente"
            >
              Soporte X Academy
              <span className="ml-1 text-[10px] text-gray-500">
                · Atención al Cliente
              </span>
            </Badge>
          </div>
        )}
      </div>
      <div
        className={fullHeight ? "p-3 flex-1 min-h-0" : "p-3 h-[620px] min-h-0"}
      >
        <div className="grid grid-cols-12 gap-3 h-full min-h-0">
          {/* Sidebar: filtros + coaches + mis conversaciones */}
          <div className="col-span-3 overflow-auto border rounded p-3 bg-white space-y-3">
            {/* Buscador */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar coach por nombre, código, área, cargo…"
                  className="pl-9"
                />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
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
            {/* Filtros simplificados: área fija Atención al Cliente, dejamos solo búsqueda */}
            <div className="text-[11px] text-neutral-500">
              Área: Atención al Cliente
            </div>

            {/* Coaches */}
            <div className="min-h-0">
              <div className="text-sm font-semibold mb-2">Coaches</div>
              <ul className="space-y-1 text-sm max-h-[28vh] overflow-auto pr-1">
                {filteredCoaches.map((t) => {
                  const selected =
                    String(targetCoachId ?? "") ===
                    String((t as any).codigo ?? t.id);
                  const subtitle = "SOPORTE · ATENCIÓN AL CLIENTE";
                  const brandAvatarSrc =
                    "https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg";
                  return (
                    <li key={String(t.id)}>
                      <button
                        className={`w-full text-left rounded hover:bg-gray-50 ${
                          selected ? "bg-sky-50" : ""
                        }`}
                        title={subtitle}
                        onClick={() => {
                          const nextCode = (t as any).codigo ?? t.id;
                          setTargetCoachId(String(nextCode));
                          setSelectedChatId(null);
                          setCurrentOpenChatId(null);
                        }}
                      >
                        <div className="flex items-center gap-3 px-2 py-2">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={brandAvatarSrc}
                              alt="Soporte X Academy"
                            />
                            <AvatarFallback>
                              {initialFromText("Soporte X Academy")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              Soporte X Academy
                            </div>
                            {subtitle && (
                              <div className="text-[11px] text-neutral-500 truncate">
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
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Mis conversaciones</div>
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
                  <li className="text-xs text-gray-500">Sin conversaciones</li>
                )}
                {studentChats.map((it) => {
                  const id = it?.id_chat ?? it?.id;
                  // etiqueta: mostrar nombre del coach cuando exista
                  const parts = it?.participants || it?.participantes || [];
                  const coach = parts.find(
                    (p: any) =>
                      String((p?.participante_tipo || "").toLowerCase()) ===
                      "equipo"
                  );
                  // Intentar identificar al coach por catálogo (id o código)
                  const coachInfo =
                    (teamsAll.length ? teamsAll : teams).find(
                      (t) =>
                        String(t.id) === String(coach?.id_equipo ?? "") ||
                        String(t.codigo) === String(coach?.id_equipo ?? "")
                    ) ||
                    teamsGlobal.find(
                      (t) =>
                        String(t.id) === String(coach?.id_equipo ?? "") ||
                        String(t.codigo) === String(coach?.id_equipo ?? "")
                    );
                  const title = "Soporte X Academy";
                  const lastObj =
                    it?.last_message ?? it?.ultimo_mensaje ?? null;
                  const last = (
                    lastObj?.contenido ??
                    lastObj?.text ??
                    it?.last?.text ??
                    ""
                  ).toString();
                  const areaPuesto = "Atención al Cliente";
                  const countKey = `chatUnreadById:alumno:${String(id ?? "")}`;
                  const storedCount = parseInt(
                    (typeof window !== "undefined" &&
                      window.localStorage.getItem(countKey)) ||
                      "0",
                    10
                  );
                  const count = isNaN(storedCount) ? 0 : storedCount;
                  const isOpen =
                    id != null &&
                    String(currentOpenChatId ?? "") === String(id);
                  const lastAt = getItemTimestamp(it);
                  const brandAvatarSrc =
                    "https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg";
                  return (
                    <li key={String(id)}>
                      <button
                        className={`w-full text-left rounded hover:bg-gray-50 ${
                          count > 0 && !isOpen ? "bg-emerald-50" : ""
                        }`}
                        onClick={() => {
                          try {
                            console.log("[StudentCoachChatPanel] click chat", {
                              id,
                            });
                          } catch {}
                          setTargetCoachId(null);
                          setTargetTitle(studentName || "Conversación");
                          setTargetSubtitle(undefined);
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
                                })
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
                              <span className="truncate font-medium">
                                {title}
                              </span>
                              <span className="text-[11px] text-neutral-500 flex-shrink-0">
                                {formatListTime(lastAt)}
                              </span>
                            </div>
                            {(areaPuesto || last) && (
                              <div className="text-[11px] text-neutral-600 truncate">
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
          <div className="col-span-9 h-full flex flex-col min-h-0">
            {/** Resolvedor de nombres para logs legibles */}
            {(() => {
              return null; // placeholder para mantener orden visual
            })()}
            <CoachChatInline
              key={chatKey}
              room={room}
              role="alumno"
              title={targetTitle}
              subtitle={targetSubtitle}
              variant="card"
              className="flex-1 min-h-0 rounded-lg shadow-sm overflow-hidden"
              precreateOnParticipants
              resolveName={(tipo, id) => {
                const sid = String(id ?? "");
                if (tipo === "cliente") {
                  if (sid === String(code)) return studentName || sid;
                  return sid;
                }
                if (tipo === "equipo") {
                  // Mostrar siempre el contacto como "Soporte X Academy" en la vista del admin
                  return "Soporte X Academy";
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
                // Permitir creación automática siempre que tengamos algún código/ID de coach
                autoCreate: !!resolvedEquipoCode,
                autoJoin: !!selectedChatId,
                chatId: selectedChatId ?? undefined,
              }}
              onConnectionChange={setConnected}
              requestListSignal={listSignal}
              listParams={listParams}
              onChatsList={(list) => {
                const arr = Array.isArray(list) ? list : [];
                try {
                  console.log("[StudentCoachChatPanel] onChatsList", {
                    count: arr.length,
                    sample: arr.slice(0, 5).map((it: any) => ({
                      id: it?.id_chat ?? it?.id,
                      last:
                        it?.last_message?.contenido ??
                        it?.ultimo_mensaje?.contenido ??
                        it?.last?.text ??
                        null,
                    })),
                  });
                } catch {}
                setStudentChats(arr);
              }}
              onChatInfo={(info) => {
                setCurrentOpenChatId(info?.chatId ?? null);
                try {
                  console.log("[StudentCoachChatPanel] onChatInfo", {
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
                  });
                } catch {}
                // Si abrimos por chatId (no por coach seleccionado), intenta fijar encabezado con nombre del coach y su área/puesto
                try {
                  if (!targetCoachId && Array.isArray(info?.participants)) {
                    const coachP = (info?.participants as any[]).find(
                      (p: any) =>
                        String((p?.participante_tipo || "").toLowerCase()) ===
                        "equipo"
                    );
                    const sid = coachP?.id_equipo
                      ? String(coachP.id_equipo)
                      : null;
                    if (sid) {
                      const t = (teamsAll.length ? teamsAll : teams).find(
                        (x) =>
                          String((x as any).codigo) === sid ||
                          String(x.id) === sid
                      );
                      const tg =
                        t ||
                        teamsGlobal.find(
                          (x) =>
                            String((x as any).codigo) === sid ||
                            String(x.id) === sid
                        );
                      setTargetTitle("Soporte X Academy");
                      setTargetSubtitle("Atención al Cliente");
                    }
                  }
                } catch {}
                if (info?.chatId != null) {
                  try {
                    const k = `chatUnreadById:alumno:${String(info.chatId)}`;
                    localStorage.setItem(k, "0");
                    window.dispatchEvent(
                      new CustomEvent("chat:unread-count-updated", {
                        detail: {
                          chatId: info.chatId,
                          role: "alumno",
                          count: 0,
                        },
                      })
                    );
                  } catch {}
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
