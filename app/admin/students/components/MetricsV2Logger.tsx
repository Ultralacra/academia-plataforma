"use client";

import { useEffect } from "react";
import { fetchMetricsV2, getDefaultRange } from "./api";

/**
 * Componente sin UI que, al montarse, realiza la consulta a metrics v2
 * e imprime en consola la URL consultada y la respuesta completa.
 */
export default function MetricsV2Logger() {
  useEffect(() => {
    const { fechaDesde, fechaHasta } = getDefaultRange();
    const qs = new URLSearchParams();
    if (fechaDesde) qs.set("fechaDesde", fechaDesde);
    if (fechaHasta) qs.set("fechaHasta", fechaHasta);
    const url = `/metrics/get/metrics-v2${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    // Imprimir la consulta
    // eslint-disable-next-line no-console
        /* console.log("[metrics-v2] Request:", url); */

    fetchMetricsV2({ fechaDesde, fechaHasta })
      .then((json) => {
        // Imprimir respuesta completa
        // eslint-disable-next-line no-console
                /* console.log("[metrics-v2] Response:", json); */
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[metrics-v2] Error:", err);
      });
  }, []);

  return null;
}
