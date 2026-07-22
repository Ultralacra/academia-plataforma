"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import {
  getAllStudentsPaged,
  getAllCoachesFromTeams,
  getCoachStudentsByCoachId,
  type StudentRow,
} from "../alumnos/api"
import {
  getPayments as getPaymentsGlobal,
  getPaymentCuotas,
  type PaymentCuotaRow,
} from "../payments/api"
import { getAuthToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api-config"
import {
  Search,
  Loader2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  Ban,
  UserX,
  HelpCircle,
  FileText,
  CheckSquare,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { getOpciones, type OpcionItem } from "../alumnos/api"
import { buildUrl } from "@/lib/api-config"

/* ============== Tipos ============== */

type MembresiaMeta = {
  id: string
  alumnoCodigo: string
  numeroMembresia: number
  meses: number
  fechaDesde: string | null
  fechaHasta: string | null
  anulado: boolean
  created_at: string | null
}

type VenceMeta = {
  id: string
  alumnoCodigo: string
  programaMeses: number
  mesesExtra: number
  venceEstimado: string | null
  extensiones: Array<{ fecha_desde: string | null; fecha_hasta: string | null }>
}

type StatusSuggestion =
  | "ACTIVO"
  | "VENCIMIENTO_CONTRATO"
  | "VENCIMIENTO_MEMBRESIA"
  | "PAUSA"
  | "INACTIVO_POR_PAGO"
  | "FINALIZADO"
  | "REVISION_MANUAL"

type EnrichedRow = {
  code: string
  name: string
  state: string | null
  stage: string | null
  tag: string | null
  joinDate: string | null
  team: string[]
  hasContract: boolean
  inactivityDays: number | null
  lastActivity: string | null

  // Payments
  cuotasTotal: number
  cuotasPagadas: number
  cuotasPendientes: number
  cuotasVencidas: number
  cuotasEnProceso: number
  daysOverdue: number | null
  nextDueDate: string | null
  nextDueAmount: number | null

  // Contract + Membership
  contractEndDate: string | null
  daysSinceContractEnd: number | null
  hasActiveMembership: boolean
  currentMembresiaNumero: number | null
  membresiaEndDate: string | null
  daysSinceMembresiaEnd: number | null

  // Pause
  isPaused: boolean
  pausedDays: number

  // Suggested
  suggestedStatus: StatusSuggestion
  suggestionReason: string
}

/* ============== Helpers ============== */

function normalizeTagKey(tag?: string | null) {
  return String(tag ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function canonicalTagLabel(tag?: string | null) {
  const normalized = normalizeTagKey(tag)
  if (!normalized) return tag ?? null
  if (normalized === "hotselling foundation") return "Hotselling Starter"
  return String(tag ?? "").trim()
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (dateOnly) {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return isNaN(d.getTime()) ? null : d
    }
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toDayDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diffDays(a: Date, b: Date) {
  return Math.round(
    (toDayDate(b).getTime() - toDayDate(a).getTime()) / 86400000,
  )
}

function daysBetween(a: string, b: string): number {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return 0
  return diffDays(da, db)
}

function daysSince(d: string | null): number | null {
  if (!d) return null
  const date = parseDate(d)
  if (!date) return null
  return Math.max(0, diffDays(date, new Date()))
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  const date = parseDate(d)
  if (!date) return null
  return Math.max(0, -diffDays(date, new Date()))
}

function addMonths(d: Date, n: number) {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

function fmt(iso?: string | null) {
  if (!iso) return "—"
  const d = parseDate(iso)
  if (!d) return "—"
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/* ============== Sugerencia de estado ============== */

function suggestStatus(row: EnrichedRow): {
  status: StatusSuggestion
  reason: string
} {
  const today = new Date()

  // 1. Pausa activa
  if (row.isPaused) {
    return { status: "PAUSA", reason: "Alumno en pausa activa" }
  }

  // 2. Finalizado por inactividad
  if ((row.inactivityDays ?? 0) >= 60) {
    return {
      status: "FINALIZADO",
      reason: `Inactividad de ${row.inactivityDays} días`,
    }
  }

  // 3. Finalizado por estado actual COMPLETADO
  if ((row.state || "").toUpperCase() === "COMPLETADO") {
    return { status: "FINALIZADO", reason: "Estado actual: COMPLETADO" }
  }

  // 4. Tiene membresía activa
  if (row.hasActiveMembership && row.membresiaEndDate) {
    const daysSinceEnd = daysSince(row.membresiaEndDate)

    if (daysSinceEnd !== null && daysSinceEnd > 5) {
      return {
        status: "FINALIZADO",
        reason: `Membresía #${row.currentMembresiaNumero} vencida hace ${daysSinceEnd} días (más de 5 de gracia)`,
      }
    }

    if (daysSinceEnd !== null && daysSinceEnd > 0 && daysSinceEnd <= 5) {
      return {
        status: "VENCIMIENTO_MEMBRESIA",
        reason: `Membresía #${row.currentMembresiaNumero} vencida (${daysSinceEnd} días en gracia)`,
      }
    }

    // Membresía vigente
    return {
      status: "ACTIVO",
      reason: `Membresía #${row.currentMembresiaNumero} activa hasta ${fmt(row.membresiaEndDate)}`,
    }
  }

  // 5. Estado actual MEMBRESIA pero sin membresía activa detectada
  if ((row.state || "").toUpperCase().includes("MEMBRE")) {
    return {
      status: "VENCIMIENTO_MEMBRESIA",
      reason: "Estado MEMBRESIA pero sin membresía activa registrada",
    }
  }

  // 6. Inactivo por pago con mora
  if ((row.state || "").toUpperCase().includes("INACTIVO") && (row.daysOverdue ?? 0) > 5) {
    return {
      status: "INACTIVO_POR_PAGO",
      reason: `Cuotas vencidas hace ${row.daysOverdue} días`,
    }
  }

  // 7. Contrato vencido
  if (row.contractEndDate) {
    const daysSinceEnd = daysSince(row.contractEndDate)

    if (daysSinceEnd !== null && daysSinceEnd > 5) {
      return {
        status: "FINALIZADO",
        reason: `Contrato vencido hace ${daysSinceEnd} días sin membresía`,
      }
    }

    if (daysSinceEnd !== null && daysSinceEnd > 0 && daysSinceEnd <= 5) {
      return {
        status: "VENCIMIENTO_CONTRATO",
        reason: `Contrato vencido (${daysSinceEnd} días en gracia para adquirir membresía)`,
      }
    }
  }

  // 8. Cuotas vencidas sin ser INACTIVO
  if ((row.daysOverdue ?? 0) > 0) {
    if ((row.daysOverdue ?? 0) > 5) {
      return {
        status: "INACTIVO_POR_PAGO",
        reason: `${row.daysOverdue} días de mora en cuotas`,
      }
    }
    return {
      status: "ACTIVO",
      reason: `${row.daysOverdue} días de mora (dentro de gracia de 5 días)`,
    }
  }

  // 9. Activo por defecto
  return {
    status: "ACTIVO",
    reason: "Contrato vigente y al día en pagos",
  }
}

/* ============== Badge clases ============== */

const STATUS_BADGE: Record<StatusSuggestion, string> = {
  ACTIVO: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/40",
  VENCIMIENTO_CONTRATO: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:ring-orange-500/40",
  VENCIMIENTO_MEMBRESIA: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/40",
  PAUSA: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/40",
  INACTIVO_POR_PAGO: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-500/40",
  FINALIZADO: "bg-slate-100 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700",
  REVISION_MANUAL: "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:ring-purple-500/40",
}

const STATE_ICON: Record<StatusSuggestion, React.ReactNode> = {
  ACTIVO: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  VENCIMIENTO_CONTRATO: <Clock className="h-3.5 w-3.5 text-orange-500" />,
  VENCIMIENTO_MEMBRESIA: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  PAUSA: <Pause className="h-3.5 w-3.5 text-blue-500" />,
  INACTIVO_POR_PAGO: <Ban className="h-3.5 w-3.5 text-rose-500" />,
  FINALIZADO: <UserX className="h-3.5 w-3.5 text-slate-500" />,
  REVISION_MANUAL: <HelpCircle className="h-3.5 w-3.5 text-purple-500" />,
}

const CURRENT_STATE_BADGE: Record<string, string> = {
  ACTIVO: STATUS_BADGE.ACTIVO,
  MEMBRESIA: STATUS_BADGE.ACTIVO,
  INACTIVO_POR_PAGO: STATUS_BADGE.INACTIVO_POR_PAGO,
  PAUSADO: STATUS_BADGE.PAUSA,
  COMPLETADO: STATUS_BADGE.FINALIZADO,
}

/* ============== Componente principal ============== */

export default function MigracionEstatusContent() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState("")
  const [rows, setRows] = useState<EnrichedRow[]>([])
  const [search, setSearch] = useState("")
  const [filterCurrentState, setFilterCurrentState] = useState<string[]>([])
  const [filterSuggestedStatus, setFilterSuggestedStatus] = useState<string[]>([])

  // Bulk selection
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkEstados, setBulkEstados] = useState<OpcionItem[]>([])
  const [bulkEstadoKey, setBulkEstadoKey] = useState<string>("")
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number; errors: number }>({ completed: 0, total: 0, errors: 0 })

  const loadData = async () => {
    setLoading(true)
    try {
      // 1) Students
      setProgress("Cargando alumnos…")
      const PAGE_SIZE = 1000
      let students: StudentRow[] = []
      let page = 1
      let keep = true
      while (keep) {
        const res = await getAllStudentsPaged({ page, pageSize: PAGE_SIZE })
        students = students.concat(res.items ?? [])
        if (res.totalPages != null) keep = page < res.totalPages
        else keep = (res.items ?? []).length >= PAGE_SIZE
        page++
      }

      // 2) Payments (plans)
      setProgress("Cargando planes de pago…")
      const paymentsByCode: Record<string, any[]> = {}
      try {
        let pPage = 1
        let pKeep = true
        while (pKeep) {
          const env = await getPaymentsGlobal({ page: pPage, pageSize: 1000 })
          const list: any[] = Array.isArray(env?.data) ? env.data : []
          for (const p of list) {
            const cc = String(p?.cliente_codigo ?? "").trim()
            if (!cc) continue
            ;(paymentsByCode[cc] ||= []).push(p)
          }
          if (env.totalPages != null) pKeep = pPage < env.totalPages
          else pKeep = list.length >= 1000
          pPage++
        }
      } catch {}

      // 3) Cuotas
      setProgress("Cargando cuotas…")
      const cuotasByCode: Record<string, PaymentCuotaRow[]> = {}
      try {
        let cPage = 1
        let cKeep = true
        while (cKeep) {
          const env = await getPaymentCuotas({
            fechaDesde: "2020-01-01",
            fechaHasta: "2099-12-31",
            page: cPage,
            pageSize: 1000,
          })
          const list: PaymentCuotaRow[] = Array.isArray(env?.data)
            ? env.data
            : []
          for (const c of list) {
            const cc = String(c?.cliente_codigo ?? "").trim()
            if (!cc) continue
            ;(cuotasByCode[cc] ||= []).push(c)
          }
          if (env.totalPages != null) cKeep = cPage < env.totalPages
          else cKeep = list.length >= 1000
          cPage++
        }
      } catch {}

      // 4) Contract codes
      setProgress("Cargando contratos…")
      let contractCodes = new Set<string>()
      try {
        const json = await apiFetch<any>(
          "/client/get/clients-with-contract",
          undefined,
          { background: true },
        )
        const data: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : []
        for (const r of data) {
          const code = String(r?.codigo ?? r?.code ?? "").trim()
          if (code) contractCodes.add(code)
        }
      } catch {}

      // 5) Equipos
      setProgress("Cargando equipos asignados…")
      const teamsByCode: Record<string, string[]> = {}
      try {
        const allCoaches = await getAllCoachesFromTeams()
        for (const cTeam of allCoaches) {
          const coachKey =
            (cTeam.codigo && String(cTeam.codigo).trim()) ||
            String(cTeam.id ?? "").trim()
          if (!coachKey) continue
          try {
            const list = await getCoachStudentsByCoachId(coachKey)
            for (const r of list) {
              const ac = String(r.alumno ?? "").trim()
              if (!ac) continue
              if (!teamsByCode[ac]) teamsByCode[ac] = []
              if (cTeam.name && !teamsByCode[ac].includes(cTeam.name)) {
                teamsByCode[ac].push(cTeam.name)
              }
            }
          } catch {}
        }
      } catch {}

      // 6) Membership metadata
      setProgress("Cargando membresías…")
      let membresiasByCode: Record<string, MembresiaMeta[]> = {}
      try {
        const token = getAuthToken()
        const res = await fetch(
          `/api/metadata?entity=alumno_acceso_extension_membresia`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
        const json = await res.json()
        const rawList: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : []
        for (const m of rawList) {
          const p = m?.payload ?? m
          const code = String(
            p?.alumno_codigo ?? m?.entity_id ?? "",
          ).trim()
          if (!code) continue
          const meta: MembresiaMeta = {
            id: String(m?.id ?? ""),
            alumnoCodigo: code,
            numeroMembresia: Number(p?.numero_membresia) || 0,
            meses: Number(p?.meses ?? p?.meses_extra ?? 0),
            fechaDesde: p?.fecha_desde ?? null,
            fechaHasta: p?.fecha_hasta ?? null,
            anulado: Boolean(p?.anulado),
            created_at: m?.created_at ?? p?.created_at ?? null,
          }
          ;(membresiasByCode[code] ||= []).push(meta)
        }
      } catch {}

      // 7) Vencimiento metadata
      setProgress("Cargando vencimientos…")
      let venceMetasByCode: Record<string, VenceMeta> = {}
      try {
        const token = getAuthToken()
        const res = await fetch(
          `/api/metadata?entity=alumno_acceso_vence_estimado`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
        const json = await res.json()
        const rawList: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : []
        for (const m of rawList) {
          const p = m?.payload ?? m
          const code = String(
            p?.alumno_codigo ?? m?.entity_id ?? "",
          ).trim()
          if (!code) continue
          venceMetasByCode[code] = {
            id: String(m?.id ?? ""),
            alumnoCodigo: code,
            programaMeses: Number(p?.programa_meses) || 4,
            mesesExtra: Number(p?.meses_extra) || 0,
            venceEstimado: p?.vence_estimado ?? null,
            extensiones: Array.isArray(p?.extensiones) ? p.extensiones : [],
          }
        }
      } catch {}

      // 8) Enrich rows
      setProgress("Procesando datos…")
      const enriched: EnrichedRow[] = []

      for (const s of students) {
        const code = String(s.code || s.id || "").trim()
        if (!code) continue

        const cuotas = cuotasByCode[code] || []
        const payments = paymentsByCode[code] || []
        const membresias = (membresiasByCode[code] || []).sort(
          (a, b) => b.numeroMembresia - a.numeroMembresia,
        )
        const venceMeta = venceMetasByCode[code]

        // Payment metrics
        let cuotasTot = 0
        let cuotasPag = 0
        let cuotasPen = 0
        let cuotasVen = 0
        let cuotasProc = 0
        let maxOverdueDays = 0
        let nextDue: string | null = null
        let nextAmount: number | null = null

        for (const c of cuotas) {
          cuotasTot++
          const est = String(c.estatus ?? "").toLowerCase().trim()
          if (est.includes("pagad") || est === "listo") cuotasPag++
          else if (est.includes("pendien") || est === "pending") {
            cuotasPen++
            const dueDate = c.fecha_pago
            if (dueDate) {
              const over = daysSince(dueDate) ?? 0
              if (over > maxOverdueDays) maxOverdueDays = over
              if (!nextDue || dueDate < nextDue) {
                nextDue = dueDate
                nextAmount = c.monto
              }
            }
          } else if (est.includes("venc") || est.includes("moro")) {
            cuotasVen++
            const dueDate = c.fecha_pago
            if (dueDate) {
              const over = daysSince(dueDate) ?? 0
              if (over > maxOverdueDays) maxOverdueDays = over
            }
          } else if (est.includes("proce") || est.includes("progr")) {
            cuotasProc++
          }
        }

        // Contract end (computed first so extensions can affect membership end date)
        const joinD = parseDate(s.joinDate)
        let contractEnd: Date | null = null
        if (joinD) {
          const progMonths = venceMeta?.programaMeses ?? 4
          contractEnd = addMonths(joinD, progMonths)

          // Add extra months
          const extraMonths = venceMeta?.mesesExtra ?? 0
          if (extraMonths > 0) contractEnd = addMonths(contractEnd, extraMonths)

          // Use venceEstimado if available
          if (venceMeta?.venceEstimado) {
            const ve = parseDate(venceMeta.venceEstimado)
            if (ve) contractEnd = ve
          }

          // Add extension days
          if (venceMeta?.extensiones) {
            for (const ext of venceMeta.extensiones) {
              const extEnd = parseDate(ext.fecha_hasta)
              if (extEnd && extEnd > contractEnd) contractEnd = extEnd
            }
          }
        }

        // Membership
        const activeMembresias = membresias.filter((m) => !m.anulado)
        const currentMembresia = activeMembresias[0] || null

        // Effective membership end: max of membership fechaHasta and contractEnd (which includes extensions)
        let effectiveMembresiaEnd: string | null = currentMembresia?.fechaHasta ?? null
        if (currentMembresia && contractEnd && currentMembresia.fechaHasta) {
          const memDate = parseDate(currentMembresia.fechaHasta)
          if (memDate && contractEnd > memDate) {
            effectiveMembresiaEnd = contractEnd.toISOString().slice(0, 10)
          }
        }

        const hasActiveMembership = currentMembresia
          ? (daysSince(effectiveMembresiaEnd) ?? 0) <= 0
          : false

        const isPaused = (s.state || "")
          .toUpperCase()
          .includes("PAUS")

        const row: EnrichedRow = {
          code,
          name: String(s.name || "-").trim(),
          state: s.state || null,
          stage: s.stage || null,
          tag: s.tag || null,
          joinDate: s.joinDate || null,
          team: teamsByCode[code] || [],
          hasContract: contractCodes.has(code),
          inactivityDays: s.inactivityDays ?? null,
          lastActivity: s.lastActivity || null,

          cuotasTotal: cuotasTot,
          cuotasPagadas: cuotasPag,
          cuotasPendientes: cuotasPen,
          cuotasVencidas: cuotasVen,
          cuotasEnProceso: cuotasProc,
          daysOverdue: maxOverdueDays > 0 ? maxOverdueDays : null,
          nextDueDate: nextDue,
          nextDueAmount: nextAmount,

          contractEndDate: contractEnd ? contractEnd.toISOString().slice(0, 10) : null,
          daysSinceContractEnd: contractEnd ? daysSince(contractEnd.toISOString().slice(0, 10)) : null,
          hasActiveMembership,
          currentMembresiaNumero: currentMembresia?.numeroMembresia ?? null,
          membresiaEndDate: effectiveMembresiaEnd,
          daysSinceMembresiaEnd: effectiveMembresiaEnd
            ? daysSince(effectiveMembresiaEnd)
            : null,

          isPaused,
          pausedDays: 0,

          suggestedStatus: "ACTIVO",
          suggestionReason: "",
        }

        const suggestion = suggestStatus(row)
        row.suggestedStatus = suggestion.status
        row.suggestionReason = suggestion.reason

        enriched.push(row)
      }

      setRows(enriched)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fetch estados when bulk dialog opens
  const bulkFetchKeyRef = useRef(0)
  useEffect(() => {
    if (!bulkDialogOpen) return
    const key = ++bulkFetchKeyRef.current
    ;(async () => {
      try {
        const all = await getOpciones("estado_cliente")
        const filtered = all.filter(
          (o) =>
            !o.value.toUpperCase().includes("PAUSADO") &&
            !o.value.toUpperCase().includes("PAUSA"),
        )
        if (key === bulkFetchKeyRef.current) setBulkEstados(filtered)
      } catch {}
    })()
  }, [bulkDialogOpen])

  /* ============== Filters ============== */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q) {
        const name = String(r.name).toLowerCase()
        const code = String(r.code).toLowerCase()
        if (!name.includes(q) && !code.includes(q)) return false
      }
      if (filterCurrentState.length > 0) {
        const st = String(r.state ?? "").toUpperCase()
        if (!filterCurrentState.some((f) => st.includes(f))) return false
      }
      if (filterSuggestedStatus.length > 0) {
        if (!filterSuggestedStatus.includes(r.suggestedStatus)) return false
      }
      return true
    })
  }, [rows, search, filterCurrentState, filterSuggestedStatus])

  const toggleSelectItem = (code: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedKeys.size === filtered.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(filtered.map((r) => r.code)))
    }
  }

  const clearSelection = () => setSelectedKeys(new Set())

  /* ============== KPIs ============== */

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      counts[r.suggestedStatus] = (counts[r.suggestedStatus] || 0) + 1
    }
    return counts
  }, [rows])

  const currentStateOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      const st = String(r.state ?? "").toUpperCase()
      if (st) set.add(st)
    }
    return Array.from(set).sort()
  }, [rows])

  const suggestedOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      counts[r.suggestedStatus] = (counts[r.suggestedStatus] || 0) + 1
    }
    const labels: Record<string, string> = {
      ACTIVO: "Activo",
      VENCIMIENTO_CONTRATO: "Venc. Contrato",
      VENCIMIENTO_MEMBRESIA: "Venc. Membresía",
      PAUSA: "Pausa",
      INACTIVO_POR_PAGO: "Inactivo x Pago",
      FINALIZADO: "Finalizado",
      REVISION_MANUAL: "Revisión Manual",
    }
    return Object.entries(counts).map(([key, count]) => ({
      key,
      label: labels[key] || key,
      count,
    }))
  }, [rows])

  /* ============== Export ============== */

  function exportCSV() {
    const headers = [
      "Código",
      "Nombre",
      "Estado Actual",
      "Etapa",
      "Tag",
      "Contrato",
      "Fin Contrato",
      "Días Venc Contrato",
      "# Membresía",
      "Venc Membresía",
      "Días Venc Memb",
      "Cuotas Tot",
      "Cuotas Pag",
      "Cuotas Pend",
      "Cuotas Ven",
      "Días Mora",
      "Próx Venc",
      "Días Inact",
      "Equipo",
      "Estado Sugerido",
      "Motivo",
    ]
    const lines = [headers.join(",")]
    for (const r of filtered) {
      lines.push(
        [
          r.code,
          `"${r.name}"`,
          r.state ?? "",
          r.stage ?? "",
          canonicalTagLabel(r.tag) ?? "",
          r.hasContract ? "Sí" : "No",
          fmt(r.contractEndDate),
          r.daysSinceContractEnd ?? "",
          r.currentMembresiaNumero ?? "",
          fmt(r.membresiaEndDate),
          r.daysSinceMembresiaEnd ?? "",
          r.cuotasTotal,
          r.cuotasPagadas,
          r.cuotasPendientes,
          r.cuotasVencidas,
          r.daysOverdue ?? "",
          fmt(r.nextDueDate),
          r.inactivityDays ?? "",
          r.team.join(" | "),
          r.suggestedStatus,
          `"${r.suggestionReason}"`,
        ].join(","),
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `migracion-estatus-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ============== Render ============== */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{progress || "Cargando datos…"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Migración de Estados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} alumnos cargados — Estado nuevo sugerido según reglas de migración
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <Loader2 className="h-4 w-4 mr-2" />
            Recargar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {(
          [
            ["ACTIVO", "Activo", "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"],
            ["VENCIMIENTO_CONTRATO", "Venc. Contrato", "border-orange-200 bg-orange-50 dark:bg-orange-950/20"],
            ["VENCIMIENTO_MEMBRESIA", "Venc. Membresía", "border-amber-200 bg-amber-50 dark:bg-amber-950/20"],
            ["PAUSA", "Pausa", "border-blue-200 bg-blue-50 dark:bg-blue-950/20"],
            ["INACTIVO_POR_PAGO", "Inactivo x Pago", "border-rose-200 bg-rose-50 dark:bg-rose-950/20"],
            ["FINALIZADO", "Finalizado", "border-slate-200 bg-slate-50 dark:bg-slate-800/30"],
            ["REVISION_MANUAL", "Revisión Manual", "border-purple-200 bg-purple-50 dark:bg-purple-950/20"],
          ] as const
        ).map(([key, label, cls]) => {
          const active = filterSuggestedStatus.includes(key)
          const count = kpis[key] || 0
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${cls} ${active ? "ring-2 ring-primary" : ""}`}
              onClick={() =>
                setFilterSuggestedStatus((prev) =>
                  active
                    ? prev.filter((f) => f !== key)
                    : [key],
                )
              }
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                {STATE_ICON[key as StatusSuggestion]}
                {label}
              </p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Buscar por nombre o código…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Estado actual:</span>
          {currentStateOptions.map((st) => {
            const active = filterCurrentState.includes(st)
            return (
              <Badge
                key={st}
                variant={active ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() =>
                  setFilterCurrentState((prev) =>
                    active
                      ? prev.filter((f) => f !== st)
                      : [...prev, st],
                  )
                }
              >
                {st}
              </Badge>
            )
          })}
          {filterCurrentState.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => setFilterCurrentState([])}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Suggested status quick filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Estado sugerido:</span>
        <Select
          value={filterSuggestedStatus.length === 1 ? filterSuggestedStatus[0] : "todos"}
          onValueChange={(v) => {
            if (v === "todos") setFilterSuggestedStatus([])
            else setFilterSuggestedStatus([v])
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Todos los estados sugeridos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados sugeridos</SelectItem>
            {suggestedOptions.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                <span className="flex items-center justify-between gap-4 w-full">
                  <span>{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.count}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suggested status filter badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Estado sugerido:</span>
        {(
          [
            ["ACTIVO", "Activo"],
            ["VENCIMIENTO_CONTRATO", "Venc. Contrato"],
            ["VENCIMIENTO_MEMBRESIA", "Venc. Membresía"],
            ["PAUSA", "Pausa"],
            ["INACTIVO_POR_PAGO", "Inactivo x Pago"],
            ["FINALIZADO", "Finalizado"],
            ["REVISION_MANUAL", "Revisión Manual"],
          ] as const
        ).map(([key, label]) => {
          const active = filterSuggestedStatus.includes(key)
          return (
            <Badge
              key={key}
              variant={active ? "default" : "outline"}
              className={`cursor-pointer text-xs ${active ? "" : STATUS_BADGE[key as StatusSuggestion]}`}
              onClick={() =>
                setFilterSuggestedStatus((prev) =>
                  active
                    ? prev.filter((f) => f !== key)
                    : [...prev, key],
                )
              }
            >
              {STATE_ICON[key as StatusSuggestion]}
              <span className="ml-1">{label}</span>
            </Badge>
          )
        })}
        {filterSuggestedStatus.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => setFilterSuggestedStatus([])}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Detail breakdown when filtered by suggested status */}
      {filterSuggestedStatus.length > 0 && (() => {
        const dist: Record<string, { count: number; withContract: number; withMembresia: number; totalOverdue: number }> = {}
        for (const r of filtered) {
          const cur = String(r.state ?? "SIN_ESTADO").toUpperCase()
          if (!dist[cur]) dist[cur] = { count: 0, withContract: 0, withMembresia: 0, totalOverdue: 0 }
          dist[cur].count++
          if (r.hasContract) dist[cur].withContract++
          if (r.hasActiveMembership || r.currentMembresiaNumero) dist[cur].withMembresia++
          dist[cur].totalOverdue += r.daysOverdue ?? 0
        }
        return (
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Desglose por estado actual de los {filtered.length} alumnos filtrados:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dist).sort((a, b) => b[1].count - a[1].count).map(([cur, info]) => (
                <div key={cur} className="rounded-lg border bg-card px-3 py-2 text-xs">
                  <span className="font-medium">{cur}</span>
                  <span className="text-muted-foreground ml-1">×{info.count}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {info.withContract > 0 && <span className="mr-2">📄 {info.withContract} contratos</span>}
                    {info.withMembresia > 0 && <span className="mr-2">🔄 {info.withMembresia} membresías</span>}
                    {info.totalOverdue > 0 && <span>⏰ {info.totalOverdue}d mora acum</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Bulk action bar */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            {selectedKeys.size > 0
              ? `${selectedKeys.size} de ${filtered.length} seleccionados`
              : "Seleccionar todos"}
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => {
                setBulkEstadoKey("")
                setBulkProgress({ completed: 0, total: 0, errors: 0 })
                setBulkDialogOpen(true)
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Cambiar estatus
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSelection}
            >
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedKeys.size === filtered.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Estado Actual</th>
              <th className="px-3 py-2 font-medium">Etapa</th>
              <th className="px-3 py-2 font-medium">Contrato</th>
              <th className="px-3 py-2 font-medium">Fin Contrato</th>
              <th className="px-3 py-2 font-medium">Membresía</th>
              <th className="px-3 py-2 font-medium">Venc Memb</th>
              <th className="px-3 py-2 font-medium">Cuotas</th>
              <th className="px-3 py-2 font-medium">Mora</th>
              <th className="px-3 py-2 font-medium">Inact</th>
              <th className="px-3 py-2 font-medium">Estado Sugerido</th>
              <th className="px-3 py-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isChecked = selectedKeys.has(r.code)
              return (
              <tr
                key={r.code}
                className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isChecked ? "bg-primary/5" : ""}`}
              >
                <td className="px-3 py-2 w-10">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleSelectItem(r.code)}
                    aria-label={`Seleccionar ${r.name || r.code}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={r.name}>
                  {r.name}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      CURRENT_STATE_BADGE[String(r.state ?? "").toUpperCase()] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {r.state ?? "—"}
                  </Badge>
                </td>
                <td className="px-3 py-2">{r.stage ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.hasContract ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <FileText className="h-3.5 w-3.5" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={r.daysSinceContractEnd && r.daysSinceContractEnd > 0 ? "text-orange-600 font-medium" : ""}>
                          {fmt(r.contractEndDate)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.daysSinceContractEnd !== null
                          ? `${r.daysSinceContractEnd} días desde vencimiento`
                          : "Sin fecha de fin"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.currentMembresiaNumero ? (
                    <span className="inline-flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        #{r.currentMembresiaNumero}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.membresiaEndDate ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span
                            className={
                              r.daysSinceMembresiaEnd && r.daysSinceMembresiaEnd > 0
                                ? "text-amber-600 font-medium"
                                : ""
                            }
                          >
                            {fmt(r.membresiaEndDate)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {r.daysSinceMembresiaEnd !== null
                            ? `${r.daysSinceMembresiaEnd} días desde vencimiento`
                            : "Vigente"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <span className="text-emerald-600 font-medium">{r.cuotasPagadas}</span>
                  <span className="text-muted-foreground">/{r.cuotasTotal}</span>
                  {(r.cuotasPendientes > 0 || r.cuotasVencidas > 0) && (
                    <span className="ml-1">
                      {r.cuotasPendientes > 0 && (
                        <span className="text-amber-600"> P{r.cuotasPendientes}</span>
                      )}
                      {r.cuotasVencidas > 0 && (
                        <span className="text-rose-600"> V{r.cuotasVencidas}</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.daysOverdue ? (
                    <span className="text-rose-600 font-medium">{r.daysOverdue}d</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.inactivityDays ? (
                    <span className={r.inactivityDays >= 60 ? "text-rose-600 font-medium" : "text-muted-foreground"}>
                      {r.inactivityDays}d
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={STATUS_BADGE[r.suggestedStatus]}>
                          <span className="mr-1">{STATE_ICON[r.suggestedStatus]}</span>
                          {r.suggestedStatus === "VENCIMIENTO_CONTRATO"
                            ? "Venc. Contrato"
                            : r.suggestedStatus === "VENCIMIENTO_MEMBRESIA"
                              ? "Venc. Membresía"
                              : r.suggestedStatus === "INACTIVO_POR_PAGO"
                                ? "Inactivo x Pago"
                                : r.suggestedStatus === "REVISION_MANUAL"
                                  ? "Revisión"
                                  : r.suggestedStatus}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="text-xs">{r.suggestionReason}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={r.suggestionReason}>
                  {r.suggestionReason}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No se encontraron alumnos con los filtros seleccionados.
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {rows.length} alumnos
      </p>

      {/* ── Bulk status change dialog ── */}
      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          if (!open && !bulkSaving) {
            setBulkDialogOpen(false)
            setBulkEstados([])
            setBulkEstadoKey("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" /> Cambiar estatus masivo
            </DialogTitle>
            <DialogDescription>
              {selectedKeys.size} alumno{selectedKeys.size !== 1 ? "s" : ""} seleccionado{selectedKeys.size !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {bulkSaving ? (
              /* Progreso */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Actualizando estatus...
                  </span>
                  <span className="font-medium tabular-nums">
                    {bulkProgress.completed + bulkProgress.errors} / {bulkProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        bulkProgress.total > 0
                          ? Math.round(
                              ((bulkProgress.completed + bulkProgress.errors) /
                                bulkProgress.total) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {bulkProgress.completed} exitosos
                  </span>
                  {bulkProgress.errors > 0 && (
                    <span className="text-destructive">
                      {bulkProgress.errors} errores
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {bulkEstados.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Cargando estatus...</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Nuevo estatus
                    </label>
                    <Select value={bulkEstadoKey} onValueChange={setBulkEstadoKey}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un estatus" />
                      </SelectTrigger>
                      <SelectContent>
                        {bulkEstados.map((o) => (
                          <SelectItem key={o.id} value={o.key}>
                            {o.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setBulkDialogOpen(false)
                setBulkEstados([])
                setBulkEstadoKey("")
              }}
              disabled={bulkSaving}
            >
              {bulkSaving ? "Procesando..." : "Cancelar"}
            </Button>
            {!bulkSaving && (
              <Button
                onClick={async () => {
                  if (!bulkEstadoKey || bulkSaving) return
                  const codes = Array.from(selectedKeys).filter(Boolean)
                  if (codes.length === 0) {
                    toast({
                      title: "Sin códigos",
                      description: "Ninguno de los seleccionados tiene código de alumno",
                    })
                    return
                  }
                  setBulkSaving(true)
                  setBulkProgress({ completed: 0, total: codes.length, errors: 0 })
                  const token = getAuthToken()
                  let completed = 0
                  let errors = 0
                  const CONCURRENCY = 4
                  const updateOne = async (code: string) => {
                    try {
                      const fd = new FormData()
                      fd.set("estado", bulkEstadoKey)
                      const url = buildUrl(`/client/update/client/${encodeURIComponent(code)}`)
                      const res = await fetch(url, {
                        method: "PUT",
                        body: fd,
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                      })
                      if (!res.ok) throw new Error(await res.text())
                      return true
                    } catch {
                      return false
                    }
                  }
                  const results: boolean[] = []
                  let idx = 0
                  while (idx < codes.length) {
                    const batch = codes.slice(idx, idx + CONCURRENCY)
                    const batchResults = await Promise.all(batch.map((c) => updateOne(c)))
                    for (const ok of batchResults) {
                      if (ok) completed++
                      else errors++
                    }
                    results.push(...batchResults)
                    setBulkProgress({ completed, total: codes.length, errors })
                    idx += CONCURRENCY
                  }
                  const okCount = results.filter(Boolean).length
                  const errCount = results.filter((r) => !r).length
                  toast({
                    title: "Actualización masiva completada",
                    description: `${okCount} de ${codes.length} actualizado${okCount !== 1 ? "s" : ""} correctamente${errCount > 0 ? `. ${errCount} error${errCount !== 1 ? "es" : ""}.` : "."}`,
                  })
                  setBulkSaving(false)
                  setBulkDialogOpen(false)
                  setBulkEstados([])
                  setBulkEstadoKey("")
                  clearSelection()
                  loadData()
                }}
                disabled={!bulkEstadoKey}
              >
                Cambiar estatus a {selectedKeys.size} alumno{selectedKeys.size !== 1 ? "s" : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
