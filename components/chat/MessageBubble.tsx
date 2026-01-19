"use client";

import React from "react";
import { CheckCheck, Check, Loader2 } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

export type ChatSender = "admin" | "alumno" | "coach";

export type ChatAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  data_base64: string;
  url?: string;
  created_at?: string;
};

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  at: string;
  attachments?: ChatAttachment[];
  status?: string;
  delivered?: boolean;
  read?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function MessageBubble({
  msg,
  mine,
  selectMode,
  selected,
  onToggleSelect,
  selectedAttachmentIds,
  onToggleSelectAttachment,
}: {
  msg: ChatMessage;
  mine: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  selectedAttachmentIds: Set<string>;
  onToggleSelectAttachment: (id: string) => void;
}) {
  const normalizeTipo = (v: any) => {
    const s = String(v || "")
      .trim()
      .toLowerCase();
    if (["cliente", "alumno", "student"].includes(s)) return "alumno";
    if (["equipo", "coach", "entrenador"].includes(s)) return "coach";
    if (["admin", "administrador", "usuario"].includes(s)) return "admin";
    return s || "alumno";
  };
  const normalized = normalizeTipo(msg.sender);
  const senderLabel =
    String(msg.sender || normalized || "")
      .charAt(0)
      .toUpperCase() + String(msg.sender || normalized || "").slice(1);
  const roleBadge =
    normalized === "coach"
      ? "Coach"
      : normalized === "alumno"
        ? "Alumno"
        : "Admin";
  const roleBadgeCls =
    normalized === "coach"
      ? "bg-indigo-100 text-indigo-800"
      : normalized === "alumno"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-gray-100 text-gray-800";

  const avatarBgCls =
    normalized === "coach"
      ? "bg-indigo-500"
      : normalized === "alumno"
        ? "bg-emerald-500"
        : "bg-gray-500";

  return (
    <div
      className={`flex ${mine ? "justify-end" : "justify-start"} mb-1 items-end gap-2`}
    >
      {/* Avatar a la izquierda para mensajes de otros */}
      {!mine && (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBgCls}`}
        >
          {senderLabel.charAt(0).toUpperCase()}
        </div>
      )}
      <div
        onClick={() => selectMode && onToggleSelect?.()}
        style={
          selectMode
            ? {
                outline: selected ? "2px solid #0ea5e9" : "1px dashed #94a3b8",
              }
            : undefined
        }
        className={`relative max-w-[90%] sm:max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
          mine
            ? "bg-[#d9fdd3] text-gray-900 rounded-br-none"
            : "bg-white text-gray-900 rounded-bl-none"
        }`}
      >
        <div
          className={`${mine ? "flex justify-end" : "flex"} items-center gap-2 mb-0.5`}
        >
          <div
            className={`text-xs font-semibold text-[#075e54] ${mine ? "order-2" : ""}`}
          >
            {senderLabel}
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${roleBadgeCls} ${mine ? "order-1" : ""}`}
            aria-label={`rol-${normalized}`}
          >
            {roleBadge}
          </span>
        </div>
        {msg.text && (
          <div
            className="text-sm whitespace-pre-wrap break-words leading-relaxed pb-2"
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {msg.text}
          </div>
        )}

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {msg.attachments.map((a) => {
              const dataUrl = a.data_base64
                ? `data:${a.mime};base64,${a.data_base64}`
                : "";
              const url = a.url || dataUrl;
              const selected = selectedAttachmentIds.has(a.id);
              const commonWrapCls = `relative group rounded-md overflow-hidden ${
                selectMode && selected ? "ring-2 ring-sky-500" : ""
              }`;
              const overlay = selectMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelectAttachment(a.id);
                  }}
                  className={`absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs ${
                    selected ? "bg-sky-600" : "bg-black/50"
                  }`}
                  title={selected ? "Quitar" : "Seleccionar"}
                >
                  {selected ? "✓" : "+"}
                </button>
              ) : null;

              if ((a.mime || "").startsWith("image/")) {
                return (
                  <div key={a.id} className={commonWrapCls}>
                    {overlay}
                    {selectMode ? (
                      <img
                        src={url || "/placeholder.svg"}
                        alt={a.name}
                        className="max-h-40 w-full object-cover"
                        onClick={() => onToggleSelectAttachment(a.id)}
                      />
                    ) : (
                      <a href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={a.name}
                          className="max-h-40 w-full object-cover"
                        />
                      </a>
                    )}
                  </div>
                );
              }
              if ((a.mime || "").startsWith("video/")) {
                return (
                  <div key={a.id} className={commonWrapCls}>
                    {overlay}
                    <VideoPlayer
                      src={url}
                      className="max-h-40 w-full"
                      selectMode={selectMode}
                      onSelect={() => onToggleSelectAttachment(a.id)}
                    />
                    {mine && !msg.delivered && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                );
              }
              if ((a.mime || "").startsWith("audio/")) {
                return (
                  <div key={a.id} className={commonWrapCls}>
                    {overlay}
                    <audio src={url} controls className="w-full" />
                  </div>
                );
              }
              return (
                <div key={a.id} className={`${commonWrapCls} p-2 bg-white`}>
                  {overlay}
                  {selectMode ? (
                    <div
                      className="text-xs underline break-all cursor-pointer"
                      onClick={() => onToggleSelectAttachment(a.id)}
                      title={a.name}
                    >
                      {a.name}
                    </div>
                  ) : (
                    <a
                      href={url}
                      download={a.name}
                      className="text-xs underline break-all block"
                      title={a.name}
                    >
                      {a.name}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 select-none justify-end">
          <span>
            {new Date(msg.at).toLocaleString("es-ES", {
              timeZone: "UTC",
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
          {mine &&
            (!msg.delivered ? (
              <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
            ) : msg.read ? (
              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
            ) : (
              <CheckCheck className="w-4 h-4 text-gray-500" />
            ))}
          {msg.status && (
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full font-semibold text-white ${
                msg.status === "EN_CURSO"
                  ? "bg-yellow-500"
                  : msg.status === "COMPLETADO"
                    ? "bg-emerald-600"
                    : msg.status === "ABANDONO"
                      ? "bg-red-600"
                      : msg.status === "PAUSA"
                        ? "bg-gray-500"
                        : "bg-sky-600"
              }`}
            >
              {String(msg.status).replace("_", " ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
