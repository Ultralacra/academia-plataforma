"use client";

import { apiFetch, toQuery } from "@/lib/api-config";

export type SysUser = {
  id: number;
  codigo: string | null;
  name: string | null;
  email: string | null;
  role: "admin" | "equipo" | "alumno" | string;
  tipo: "equipo" | "cliente" | string | null; // origen o tipo de cuenta
  created_at: string | null;
  updated_at: string | null;
};

export type UsersEnvelope = {
  code: number;
  status: string;
  data: SysUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function fetchUsers({
  page = 1,
  pageSize = 25,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<UsersEnvelope> {
  const qs = toQuery({ page, pageSize, search });
  // Nota: API_HOST ya incluye /v1, por eso el path es "/users" y no "/v1/users"
  const res = await apiFetch<UsersEnvelope>(`/users${qs}`);
  // Normalizamos tipos mínimos
  const data = Array.isArray(res?.data) ? res.data : [];
  return {
    code: res?.code ?? 200,
    status: res?.status ?? "success",
    data,
    total: Number((res as any)?.total ?? data.length) || 0,
    page: Number((res as any)?.page ?? page) || 1,
    pageSize: Number((res as any)?.pageSize ?? pageSize) || 25,
    totalPages: Number((res as any)?.totalPages ?? 1) || 1,
  };
}

export type UserEnvelope = {
  code: number;
  status: string;
  data: SysUser;
};

export async function fetchUser(codigo: string): Promise<SysUser | null> {
  if (!codigo) return null;
  const res = await apiFetch<UserEnvelope>(`/users/${encodeURIComponent(codigo)}`);
  return (res as any)?.data ?? null;
}

export type UpdateUserPayload = Partial<{
  name: string;
  email: string;
  password: string;
  role: string;
}>;

export async function updateUser(
  codigo: string,
  payload: UpdateUserPayload
): Promise<UserEnvelope> {
  const res = await apiFetch<UserEnvelope>(`/users/${encodeURIComponent(codigo)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res;
}
