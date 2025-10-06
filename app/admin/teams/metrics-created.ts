// Type definitions for created team metrics
export type CreatedTeamMetric = {
  codigo_equipo: string
  nombre_coach: string
  puesto: string
  area: string
  tickets: number
  avgResponse: number
  avgResolution: number
  statusDist: {
    Abiertos: number
    Cerrados: number
    "En Proceso": number
  }
  /** NUEVO: tickets provenientes de prodByCoachV2 (mapeo por coach) */
  ticketsV2?: number
}
