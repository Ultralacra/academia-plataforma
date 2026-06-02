"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";

/**
 * Hook para persistir el historial del Super Agente ATC en `/api/metadata`
 * usando UN único registro por alumno (`entity = "super_atc_chat_history"`,
 * `entity_id = alumnoCode`). El registro se crea con POST la primera vez y
 * después se actualiza con PUT — nunca se crea un metadata por mensaje.
 */

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** ISO string */
  timestamp: string;
}

export interface PersistedContextInfo {
  ticketCount: number;
  weeklyTickets: number;
  signals: string[];
  hasHighRisk: boolean;
}

export interface AgenteAtcHistoryPayload {
  version: 1;
  alumnoCode: string;
  alumnoName?: string;
  messages: PersistedChatMessage[];
  contextInfo?: PersistedContextInfo | null;
  lastMode?: string;
  lastProvider?: string;
  updatedAt: string;
}

export const SUPER_ATC_HISTORY_ENTITY = "super_atc_chat_history";
/** Máximo de mensajes que se conservan en el registro. */
export const SUPER_ATC_HISTORY_MAX_MESSAGES = 200;

const SAVE_DEBOUNCE_MS = 800;

type SavePayload = Omit<AgenteAtcHistoryPayload, "version" | "updatedAt">;

export interface UseAgenteAtcHistoryResult {
  /** true mientras el primer load() está en curso */
  loading: boolean;
  /** true cuando ya se hidrató (o se confirmó que no hay historial) */
  loaded: boolean;
  /** Mensajes recuperados de metadata, vacío si no había. */
  initialMessages: PersistedChatMessage[];
  /** Último contextInfo persistido. */
  initialContextInfo: PersistedContextInfo | null;
  /** Programa un guardado debounced. */
  scheduleSave: (snapshot: SavePayload) => void;
  /** Limpia (resetea) el registro: deja messages=[] y borra contextInfo. */
  clear: () => Promise<void>;
}

export function useAgenteAtcHistory(
  alumnoCode: string,
): UseAgenteAtcHistoryResult {
  const [loading, setLoading] = useState<boolean>(!!alumnoCode);
  const [loaded, setLoaded] = useState<boolean>(!alumnoCode);
  const [initialMessages, setInitialMessages] = useState<PersistedChatMessage[]>(
    [],
  );
  const [initialContextInfo, setInitialContextInfo] =
    useState<PersistedContextInfo | null>(null);

  const metaIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingSnapshotRef = useRef<SavePayload | null>(null);

  // ── Cargar registro existente ──────────────────────────────────────────────
  useEffect(() => {
    if (!alumnoCode) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const token = getAuthToken();
        const url = `/api/metadata?entity=${encodeURIComponent(
          SUPER_ATC_HISTORY_ENTITY,
        )}&entity_id=${encodeURIComponent(alumnoCode)}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) {
            setLoaded(true);
            setLoading(false);
          }
          return;
        }
        const json = await res.json().catch(() => null);
        const items: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.items)
              ? json.items
              : json
                ? [json]
                : [];
        const found = items.find(
          (m: any) =>
            m?.entity === SUPER_ATC_HISTORY_ENTITY &&
            String(m?.entity_id ?? "") === String(alumnoCode),
        );
        if (!cancelled && found) {
          metaIdRef.current = String(found.id);
          const payload = (found.payload ?? {}) as Partial<AgenteAtcHistoryPayload>;
          const msgs = Array.isArray(payload.messages)
            ? (payload.messages as PersistedChatMessage[]).filter(
                (m) => m && typeof m.content === "string",
              )
            : [];
          setInitialMessages(msgs);
          setInitialContextInfo(
            (payload.contextInfo as PersistedContextInfo | null) ?? null,
          );
        }
      } catch (err) {
        console.error("[useAgenteAtcHistory] load failed", err);
      } finally {
        if (!cancelled) {
          setLoaded(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alumnoCode]);

  // ── Persistencia (POST inicial / PUT subsiguientes) ───────────────────────
  const persistNow = useCallback(
    async (snapshot: SavePayload) => {
      if (!alumnoCode) return;
      if (inFlightRef.current) {
        // Hay request en vuelo: encolar el último snapshot.
        pendingSnapshotRef.current = snapshot;
        return;
      }
      inFlightRef.current = true;
      try {
        const token = getAuthToken();
        const trimmedMessages = snapshot.messages.slice(
          -SUPER_ATC_HISTORY_MAX_MESSAGES,
        );
        const payload: AgenteAtcHistoryPayload = {
          version: 1,
          alumnoCode,
          alumnoName: snapshot.alumnoName,
          messages: trimmedMessages,
          contextInfo: snapshot.contextInfo ?? null,
          lastMode: snapshot.lastMode,
          lastProvider: snapshot.lastProvider,
          updatedAt: new Date().toISOString(),
        };

        if (metaIdRef.current) {
          const res = await fetch(
            `/api/metadata/${encodeURIComponent(metaIdRef.current)}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                entity: SUPER_ATC_HISTORY_ENTITY,
                entity_id: alumnoCode,
                payload,
              }),
            },
          );
          if (!res.ok) {
            console.error(
              "[useAgenteAtcHistory] PUT failed",
              res.status,
              await res.text().catch(() => ""),
            );
          }
        } else {
          const res = await fetch("/api/metadata", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              entity: SUPER_ATC_HISTORY_ENTITY,
              entity_id: alumnoCode,
              payload,
            }),
          });
          if (res.ok) {
            const json = await res.json().catch(() => null);
            const newId =
              (json && (json.id ?? json?.data?.id)) ?? null;
            if (newId != null) {
              metaIdRef.current = String(newId);
            }
          } else {
            console.error(
              "[useAgenteAtcHistory] POST failed",
              res.status,
              await res.text().catch(() => ""),
            );
          }
        }
      } catch (err) {
        console.error("[useAgenteAtcHistory] persist failed", err);
      } finally {
        inFlightRef.current = false;
        // Si llegó un snapshot mientras estaba en vuelo, dispararlo.
        const next = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        if (next) {
          void persistNow(next);
        }
      }
    },
    [alumnoCode],
  );

  const scheduleSave = useCallback(
    (snapshot: SavePayload) => {
      if (!alumnoCode) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistNow(snapshot);
      }, SAVE_DEBOUNCE_MS);
    },
    [alumnoCode, persistNow],
  );

  const clear = useCallback(async () => {
    if (!alumnoCode) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistNow({
      alumnoCode,
      messages: [],
      contextInfo: null,
    });
  }, [alumnoCode, persistNow]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    loading,
    loaded,
    initialMessages,
    initialContextInfo,
    scheduleSave,
    clear,
  };
}
