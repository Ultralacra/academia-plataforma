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

export type Permission = {
  name: string;
  description?: string | null;
};

function normalizePermissionsResponse(raw: any): Permission[] {
  const candidates = [
    raw?.data,
    raw?.permissions,
    raw?.data?.permissions,
    raw?.result,
    raw,
  ];

  const list = candidates.find((entry) => Array.isArray(entry));
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any): Permission | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name } : null;
      }

      if (!item || typeof item !== "object") return null;

      const name = String(item.name ?? item.permission ?? item.code ?? "").trim();
      if (!name) return null;

      const descriptionRaw = item.description ?? item.label ?? item.detail;
      return {
        name,
        description:
          descriptionRaw === undefined || descriptionRaw === null
            ? null
            : String(descriptionRaw),
      };
    })
    .filter((item): item is Permission => Boolean(item));
}

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

export async function fetchPermissionsList(): Promise<Permission[]> {
  const res = await apiFetch<any>(`/access/roles/permissions/list`);
  return normalizePermissionsResponse(res);
}

export async function fetchRolePermissions(roleId: number | string): Promise<Permission[]> {
  const safeRoleId = encodeURIComponent(String(roleId).trim());
  const res = await apiFetch<any>(`/access/roles/${safeRoleId}/permissions`);
  return normalizePermissionsResponse(res);
}

export async function assignPermissionToRole(
  roleId: number | string,
  permission: string
): Promise<any> {
  const safeRoleId = encodeURIComponent(String(roleId).trim());
  return apiFetch<any>(`/access/roles/${safeRoleId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permission }),
  });
}

export async function unassignPermissionFromRole(
  roleId: number | string,
  permission: string
): Promise<any> {
  const safeRoleId = encodeURIComponent(String(roleId).trim());
  const safePermission = encodeURIComponent(permission.trim());
  return apiFetch<any>(`/access/roles/${safeRoleId}/permissions/${safePermission}`, {
    method: "DELETE",
  });
}
