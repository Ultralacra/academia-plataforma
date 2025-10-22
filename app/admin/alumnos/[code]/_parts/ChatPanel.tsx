"use client";

import React from "react";
import StudentChatMinimal from "@/components/chat/StudentChatMinimal";

export default function ChatPanel({
  code,
  studentName,
}: {
  code: string;
  studentName?: string | null;
}) {
  const room = (code || "").toLowerCase();
  const subtitle = studentName ? `${studentName} • ${code}` : code;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-900">Chat</h3>
        <p className="text-xs text-gray-500">Conversación con el alumno</p>
      </div>
      <div className="h-[520px]">
        <StudentChatMinimal
          room={room}
          role="admin"
          title={studentName || "Alumno"}
          subtitle={subtitle}
          className="h-full"
        />
      </div>
    </div>
  );
}
