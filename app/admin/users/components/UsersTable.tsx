"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SysUser } from "../api";
import Link from "next/link";

function roleBadgeCls(role?: string) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "bg-purple-100 text-purple-800 border-purple-200";
  if (r === "equipo") return "bg-blue-100 text-blue-800 border-blue-200";
  if (r === "alumno")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function UsersTable({
  rows,
  loading,
}: {
  rows: SysUser[];
  loading?: boolean;
}) {
  const empty = !loading && (!rows || rows.length === 0);
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  return (
    <div className="overflow-auto rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="whitespace-nowrap">Nombre</TableHead>
            <TableHead className="whitespace-nowrap">Email</TableHead>
            <TableHead className="whitespace-nowrap">Código</TableHead>
            <TableHead className="whitespace-nowrap">Rol</TableHead>
            <TableHead className="whitespace-nowrap">Tipo</TableHead>
            <TableHead className="whitespace-nowrap">Creado</TableHead>
            <TableHead className="whitespace-nowrap">Actualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">
                Cargando usuarios…
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            safeRows.map((r) => (
              <TableRow
                key={r.id}
                className="odd:bg-muted/10 hover:bg-muted/50"
              >
                <TableCell
                  className="max-w-[260px] truncate"
                  title={r.name || undefined}
                >
                  {r.codigo ? (
                    <Link
                      href={`/admin/users/${encodeURIComponent(r.codigo)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.name || "—"}
                    </Link>
                  ) : (
                    r.name || "—"
                  )}
                </TableCell>
                <TableCell
                  className="max-w-[260px] truncate"
                  title={r.email || undefined}
                >
                  {r.email || "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.codigo || "—"}
                </TableCell>
                <TableCell>
                  <Badge className={roleBadgeCls(r.role)}>
                    {r.role || "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                    {r.tipo || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          {empty && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">
                Sin resultados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
