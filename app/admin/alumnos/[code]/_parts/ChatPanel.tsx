"use client";

import React from "react";
import StudentCoachChatPanel from "./StudentCoachChatPanel";

export default function ChatPanel({
  code,
  studentName,
  fullHeight,
}: {
  code: string;
  studentName?: string | null;
  fullHeight?: boolean;
}) {
  return (
    <StudentCoachChatPanel
      code={code}
      studentName={studentName}
      fullHeight={fullHeight}
    />
  );
}
