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
import ChatRealtime from "@/components/chat/ChatRealtime";

export default function StudentCoachChatPanel({
  code,
  studentName,
  fullHeight,
}: {
  code: string;
  studentName?: string | null;
  fullHeight?: boolean;
}) {
  // Room base para token; no se usa en socketio directamente, pero mantiene consistencia
  const room = useMemo(() => `student:${(code || "").toLowerCase()}`, [code]);

  // Catálogo de coaches
  const [teams, setTeams] = useState<TeamWithCounts[]>([]);
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

  // Selección de destino (coach)
  const [targetCoachId, setTargetCoachId] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState<string>(
    studentName || "Conversación"
  );
  const [targetSubtitle, setTargetSubtitle] = useState<string | undefined>(
    undefined
  );

  // Cargar coaches
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await dataService.getTeamsV2({ page: 1, pageSize: 500 });
        if (!alive) return;
        setTeams(res.data || []);
      } catch {
        setTeams([]);
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
    return teams
      .filter((t) => (filterArea ? t.area === filterArea : true))
      .filter((t) => (filterPuesto ? t.puesto === filterPuesto : true))
      .filter((t) =>
        q
          ? [t.nombre, t.codigo, t.puesto, t.area]
              .map((x) => String(x ?? "").toLowerCase())
              .some((s) => s.includes(q))
          : true
      );
  }, [teams, searchText, filterArea, filterPuesto]);

  // Construir participantes cuando hay un coach seleccionado
  const participants = useMemo(() => {
    if (!targetCoachId) return undefined;
    const eqRaw = String(targetCoachId);
    const eqNum = Number(eqRaw);
    const idEquipoVal = Number.isFinite(eqNum) ? eqNum : eqRaw;
    return [
      { participante_tipo: "cliente", id_cliente: String(code) },
      { participante_tipo: "equipo", id_equipo: idEquipoVal as any },
    ];
  }, [code, targetCoachId]);

  // Forzar remount del chat cuando cambiamos de destino o abrimos por chatId (esto dispara la lógica de find-or-create/join interna)
  const chatKey = useMemo(() => {
    if (selectedChatId != null) return `cid:${String(selectedChatId)}`;
    if (targetCoachId) return `coach:${String(targetCoachId)}`;
    return `idle:${code}`;
  }, [selectedChatId, targetCoachId, code]);

  useEffect(() => {
    if (!targetCoachId) {
      setTargetTitle(studentName || "Conversación");
      setTargetSubtitle(undefined);
      return;
    }
    const t = teams.find(
      (x) =>
        String(x.id) === String(targetCoachId) ||
        String(x.codigo) === String(targetCoachId)
    );
    setTargetTitle(t?.nombre || String(targetCoachId));
    setTargetSubtitle(
      [t?.puesto, t?.area].filter(Boolean).join(" · ") || "Coach"
    );
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

  // listParams para listar conversaciones del alumno por cliente
  const listParams = useMemo(() => {
    if (targetCoachId) {
      return { participante_tipo: "equipo", id_equipo: String(targetCoachId) };
    }
    return { participante_tipo: "cliente", id_cliente: String(code) };
  }, [code, targetCoachId]);

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
          El alumno puede chatear con cualquier coach
        </p>
      </div>
      <div className={fullHeight ? "p-3 flex-1" : "p-3 h-[620px]"}>
        <div className="grid grid-cols-12 gap-3 h-full">
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-600">Área</Label>
                <Select
                  value={filterArea ?? undefined}
                  onValueChange={(v) => setFilterArea(v === "all" ? null : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {areaOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-600">Cargo</Label>
                <Select
                  value={filterPuesto ?? undefined}
                  onValueChange={(v) => setFilterPuesto(v === "all" ? null : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {puestoOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coaches */}
            <div className="min-h-0">
              <div className="text-sm font-semibold mb-2">Coaches</div>
              <ul className="space-y-1 text-sm max-h-[28vh] overflow-auto pr-1">
                {filteredCoaches.map((t) => {
                  const selected = String(targetCoachId ?? "") === String(t.id);
                  const subtitle = [t.puesto, t.area]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={String(t.id)}>
                      <button
                        className={`w-full text-left rounded hover:bg-gray-50 ${
                          selected ? "bg-sky-50" : ""
                        }`}
                        title={subtitle}
                        onClick={() => {
                          setTargetCoachId(String(t.id));
                          setSelectedChatId(null);
                          setCurrentOpenChatId(null);
                        }}
                      >
                        <div className="flex items-center gap-3 px-2 py-2">
                          <div className="h-9 w-9 rounded-full bg-neutral-200 text-neutral-700 grid place-items-center font-semibold">
                            {initialFromText(t.nombre || t.codigo)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {t.nombre}
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
                  const title = coach?.id_equipo
                    ? `Coach ${coach.id_equipo}`
                    : `Chat ${id}`;
                  const lastObj =
                    it?.last_message ?? it?.ultimo_mensaje ?? null;
                  const last = (
                    lastObj?.contenido ??
                    lastObj?.text ??
                    it?.last?.text ??
                    ""
                  ).toString();
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
                  return (
                    <li key={String(id)}>
                      <button
                        className={`w-full text-left rounded hover:bg-gray-50 ${
                          count > 0 && !isOpen ? "bg-emerald-50" : ""
                        }`}
                        onClick={() => {
                          setTargetCoachId(null);
                          setTargetTitle(studentName || "Conversación");
                          setTargetSubtitle(undefined);
                          setSelectedChatId(id);
                          setCurrentOpenChatId(id ?? null);
                          if (id != null) {
                            try {
                              const k = `chatUnreadById:alumno:${String(id)}`;
                              localStorage.setItem(k, "0");
                            } catch {}
                          }
                        }}
                        title={String(last || "")}
                      >
                        <div className="flex items-center gap-3 px-2 py-2">
                          <div className="h-9 w-9 rounded-full bg-neutral-200 text-neutral-700 grid place-items-center font-semibold">
                            {initialFromText(title)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate font-medium">
                                {title}
                              </span>
                              <span className="text-[11px] text-neutral-500 flex-shrink-0">
                                {formatListTime(lastAt)}
                              </span>
                            </div>
                            {last && (
                              <div className="text-[11px] text-neutral-600 truncate">
                                {last}
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
          <div className="col-span-9 h-full min-h-[540px] overflow-hidden">
            <ChatRealtime
              key={chatKey}
              room={room}
              role="alumno"
              title={targetTitle}
              subtitle={targetSubtitle}
              variant="card"
              className="h-full min-h-[540px] rounded-lg shadow-sm overflow-hidden"
              transport="socketio"
              socketio={{
                url: "https://v001.onrender.com",
                tokenEndpoint: "https://v001.onrender.com/v1/auth/token",
                tokenId: `cliente:${String(code)}`,
                idCliente: String(code),
                participants: participants,
                autoCreate: true,
                autoJoin: !!selectedChatId,
                chatId: selectedChatId ?? undefined,
              }}
              onConnectionChange={setConnected}
              requestListSignal={listSignal}
              listOnConnect={false}
              listParams={listParams}
              onChatsList={(list) =>
                setStudentChats(Array.isArray(list) ? list : [])
              }
              onChatInfo={(info) => {
                setCurrentOpenChatId(info?.chatId ?? null);
                if (info?.chatId != null) {
                  try {
                    const k = `chatUnreadById:alumno:${String(info.chatId)}`;
                    localStorage.setItem(k, "0");
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
