"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import StudentChatWidget from "@/components/chat/StudentChatWidget";

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userCode = String((user as any)?.codigo ?? "").trim();

  return (
    <>
      {children}
      {userCode && <StudentChatWidget initialCode={userCode} />}
    </>
  );
}
