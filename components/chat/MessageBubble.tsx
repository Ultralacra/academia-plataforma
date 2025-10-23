"use client";

import React from "react";
import { CheckCheck, Check } from "lucide-react";

export type ChatSender = "admin" | "alumno" | "coach";

export type ChatAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  data_base64: string;
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
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-1`}>
      <div
        onClick={() => selectMode && onToggleSelect?.()}
        style={
          selectMode
            ? {
                outline: selected ? "2px solid #0ea5e9" : "1px dashed #94a3b8",
              }
            : undefined
        }
        className={`relative max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
          mine
            ? "bg-[#d9fdd3] text-gray-900 rounded-br-none"
            : "bg-white text-gray-900 rounded-bl-none"
        }`}
      >
        {!mine && (
          <div className="text-xs font-semibold text-[#075e54] mb-0.5">
            {msg.sender.charAt(0).toUpperCase() + msg.sender.slice(1)}
          </div>
        )}
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
              const url = `data:${a.mime};base64,${a.data_base64}`;
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
                    {selectMode ? (
                      <video
                        src={url}
                        className="max-h-40 w-full"
                        onClick={() => onToggleSelectAttachment(a.id)}
                      />
                    ) : (
                      <video src={url} controls className="max-h-40 w-full" />
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
            {new Date(msg.at).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {mine &&
            (msg.read ? (
              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
            ) : msg.delivered ? (
              <CheckCheck className="w-4 h-4 text-gray-500" />
            ) : (
              <Check className="w-4 h-4 text-gray-500" />
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
