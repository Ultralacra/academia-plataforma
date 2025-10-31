"use client";

import { apiFetch, toQuery } from "@/lib/api-config";

export type Role = {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RolesEnvelope = {
  code: number;
  status: string;
  data: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type RoleEnvelope = {
  code: number;
  status: string;
  data: Role;
};

export async function fetchRoles(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const { page = 1, pageSize = 25, search = "" } = params;
  const qs = toQuery({ page, pageSize, search });
  // API_HOST incluye /v1, por eso el path es "/access/roles"
  return apiFetch<RolesEnvelope>(`/access/roles${qs}`);
}

export async function fetchRole(id: number | string) {
  return apiFetch<RoleEnvelope>(`/access/roles/${encodeURIComponent(String(id))}`);
}

export async function createRole(payload: { name: string; description?: string | null }) {
  return apiFetch<RoleEnvelope>(`/access/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRole(id: number | string, payload: { name?: string; description?: string | null }) {
  return apiFetch<RoleEnvelope>(`/access/roles/${encodeURIComponent(String(id))}` ,{
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
