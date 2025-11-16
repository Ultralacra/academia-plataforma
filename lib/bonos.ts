export type BonoItem = { key: string; title: string; description: string };

export const BONOS_CONTRACTUALES: BonoItem[] = [
  {
    key: "BONO_TRAFFICKER",
    title: "Bono de Trafficker",
    description:
      "Lo solicita el alumno al llegar a la FASE III (módulo en Skool). Consiste en que el trafficker (Johan) realice el montaje de campañas. Se toma una sola vez dentro de la vigencia del contrato y cuenta con condiciones y garantía.",
  },
  {
    key: "BONO_KIT_CORPORATIVO",
    title: "Bono de Kit Corporativo",
    description:
      "Se libera al habilitar accesos al cliente. Brinda herramientas y contactos para escalar su negocio.",
  },
  {
    key: "BONO_AUDITORIA_OFERTAS",
    title: "Bono de Auditoría de Ofertas con Javier Quest",
    description:
      "Asesoría del ecosistema del alumno de la mano de Javier. Para acceder debe agendar una cita (módulo en Skool).",
  },
  {
    key: "BONO_MESES_EXTRA_1",
    title: "Bono de 1 mes extra",
    description: "Extiende la duración del programa de 4 a 5 meses en total.",
  },
  {
    key: "BONO_MESES_EXTRA_2",
    title: "Bono de 2 meses extra",
    description: "Extiende la duración del programa de 4 a 6 meses en total.",
  },
  {
    key: "BONO_DOS_SESIONES_JAVIER",
    title: "Dos (2) sesiones en vivo con Javier",
    description: "Participación en sesiones grupales cada 15 días.",
  },
];

export const BONOS_EXTRA: BonoItem[] = [
  {
    key: "BONO_EDICION_VSL",
    title: "Bono de Edición de VSL",
    description:
      "Servicio que puede solicitarse fuera de las cláusulas contractuales. Requiere pago, formulario y acuerdo mutuo.",
  },
  {
    key: "BONO_IMPLEMENTACION_TECNICA",
    title: "Bono de Implementación técnica",
    description:
      "Servicio adicional bajo pago y acuerdo, con formulario y alcance definido.",
  },
];

export const BONOS_BY_KEY: Record<string, BonoItem> = Object.fromEntries(
  [...BONOS_CONTRACTUALES, ...BONOS_EXTRA].map((b) => [b.key, b])
);

export function bonoLabel(key: string): string {
  return BONOS_BY_KEY[key]?.title || key;
}
