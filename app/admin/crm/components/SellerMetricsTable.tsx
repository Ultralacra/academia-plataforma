"use client";
import React from "react";
import type { SellerMetricsResult } from "@/lib/crm-types";

export function SellerMetricsTable({ data }: { data: SellerMetricsResult }) {
  return (
    <div className="rounded-lg border bg-white overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b">
            <th className="text-left px-3 py-2">Owner</th>
            <th className="text-right px-3 py-2">Total</th>
            <th className="text-right px-3 py-2">Contactados</th>
            <th className="text-right px-3 py-2">Calificados</th>
            <th className="text-right px-3 py-2">Ganados</th>
            <th className="text-right px-3 py-2">Perdidos</th>
            <th className="text-right px-3 py-2">Conv%</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => {
            const conv = r.total ? (r.won / r.total) * 100 : 0;
            return (
              <tr key={r.ownerNombre} className="border-b last:border-0">
                <td className="px-3 py-2">{r.ownerNombre}</td>
                <td className="px-3 py-2 text-right font-medium">{r.total}</td>
                <td className="px-3 py-2 text-right">{r.contacted}</td>
                <td className="px-3 py-2 text-right">{r.qualified}</td>
                <td className="px-3 py-2 text-right text-emerald-600">
                  {r.won}
                </td>
                <td className="px-3 py-2 text-right text-rose-600">{r.lost}</td>
                <td className="px-3 py-2 text-right">{conv.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
