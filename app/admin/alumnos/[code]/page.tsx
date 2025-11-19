"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function StudentDefaultRedirectPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params?.code ?? "");

  useEffect(() => {
    if (code)
      router.replace(`/admin/alumnos/${encodeURIComponent(code)}/inicio`);
  }, [code, router]);

  return null;
}
