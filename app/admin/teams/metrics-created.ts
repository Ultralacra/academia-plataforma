"use client";

import type { TeamCreatedDetail } from "@/lib/data-service";

/* RNG determinístico para datos fake (tiempos/estatus) */
function rng(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967295;
  };
}

export type CreatedTeamMetric = {
  codigo_equipo: string;
  nombre_coach: string;
  puesto: string;
  area: string;
  tickets: number;
  avgResponse: number;   // minutos (fake)
  avgResolution: number; // minutos (fake)
  statusDist: Record<"Abiertos" | "Cerrados" | "En Proceso", number>;
};

export function buildCreatedMetrics(detail: TeamCreatedDetail): CreatedTeamMetric[] {
  const map = new Map<string, CreatedTeamMetric>();

  (detail.data ?? []).forEach((cliente) => {
    (cliente.equipos ?? []).forEach((eq) => {
      if (!map.has(eq.codigo_equipo)) {
        const r = rng(eq.codigo_equipo);
        map.set(eq.codigo_equipo, {
          codigo_equipo: eq.codigo_equipo,
          nombre_coach: eq.nombre_coach,
          puesto: eq.puesto,
          area: eq.area,
          tickets: 0,
          avgResponse: Math.floor(r() * 120) + 10,     // 10–130
          avgResolution: Math.floor(r() * 1440) + 60,  // 1h–24h
          statusDist: {
            Abiertos: Math.floor(r() * 10),
            Cerrados: Math.floor(r() * 10),
            "En Proceso": Math.floor(r() * 10),
          },
        });
      }
      const m = map.get(eq.codigo_equipo)!;
      m.tickets += cliente.cantidad_tickets;
    });
  });

  return Array.from(map.values());
}

/* Muestra local si la API viene vacía */
export function buildCreatedMetricsSample(): CreatedTeamMetric[] {
  const base = [
    ["ULyjkQ4jVUXGDNfNVzpg7","Vanessa","COACH TÉCNICO, SOPORTE","ATENCIÓN AL CLIENTE, TÉCNICO"],
    ["jFW3q4WtLGXwNDLGpNK3d","Klever","COACH TÉCNICO","TÉCNICO"],
    ["JJp8LyzRBJ9Fznew97cht","Matias","COACH COPY","COPY"],
    ["kWR7nZQe9eyDXVw9Vm2D4","Johan","COACH PAUTA","ADS"],
    ["mQ2dwRX3xMzV99e3nh9eb","Pedro","SOPORTE","ATENCIÓN AL CLIENTE"],
  ] as const;

  return base.map(([codigo_equipo, nombre_coach, puesto, area], idx) => {
    const r = rng(String(idx) + codigo_equipo);
    const tickets = 8 + Math.floor(r() * 35);
    const avgResponse = 10 + Math.floor(r() * 160);
    const avgResolution = avgResponse + 60 + Math.floor(r() * 900);
    const abiertos = Math.floor(r() * 10);
    const cerrados = Math.floor(r() * 10);
    const enProceso = Math.floor(r() * 10);
    return {
      codigo_equipo, nombre_coach, puesto, area, tickets,
      avgResponse, avgResolution,
      statusDist: { Abiertos: abiertos, Cerrados: cerrados, "En Proceso": enProceso },
    };
  });
}
