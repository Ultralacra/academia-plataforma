"use client";
import React from "react";
import type { SellerMetricsResult } from "@/lib/crm-types";

export function SellerMetricsTable({ data }: { data: SellerMetricsResult }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-indigo-50/40 to-slate-50/70 shadow-sm overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-white/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="text-left px-4 py-3">Owner</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3">Contactados</th>
            <th className="text-right px-4 py-3">Calificados</th>
            <th className="text-right px-4 py-3">Ganados</th>
            <th className="text-right px-4 py-3">Perdidos</th>
            <th className="text-right px-4 py-3">Conv%</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => {
            const conv = r.total ? (r.won / r.total) * 100 : 0;
            return (
              <tr
                key={r.ownerNombre}
                className="border-t border-slate-200/50 bg-white/70 transition hover:bg-indigo-50/30"
              >
                <td className="px-4 py-3 font-medium text-slate-700">
                  {r.ownerNombre}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  {r.total}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {r.contacted}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {r.qualified}
                </td>
                <td className="px-4 py-3 text-right text-emerald-600">
                  {r.won}
                </td>
                <td className="px-4 py-3 text-right text-rose-600">{r.lost}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {conv.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
