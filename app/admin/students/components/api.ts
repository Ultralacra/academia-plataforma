// Cliente simple para consultar metrics v2 desde Students y loguear la respuesta
// Nota: usa apiFetch que ya gestiona el API_HOST y el token si existe en el cliente

import { apiFetch } from "@/lib/api-config";

// Cache simple en memoria para deduplicar y reducir llamadas repetidas
// Clave = ruta completa con query string normalizada
const METRICS_CACHE = new Map<string, { ts: number; promise: Promise<MetricsV2Envelope> }>();
const METRICS_TTL_MS = 30_000; // 30s de TTL (ajustable)

type DateLike = string | Date | undefined;

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function toYMD(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeInputDate(d?: DateLike): string | undefined {
	if (!d) return undefined;
	if (typeof d === "string") return d;
	return toYMD(d);
}

export function getDefaultRange() {
	const now = new Date();
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	return { fechaDesde: toYMD(first), fechaHasta: toYMD(now) };
}

export type MetricsV2Envelope = any; // Dejamos abierto mientras inspeccionamos el payload real

/**
 * @deprecated Este endpoint ya no se usa. Usar en su lugar:
 * - fetchMetricsRetention() para datos de retención y etapas
 * - fetchMetricsTasks() para datos de tareas
 */
export async function fetchMetricsV2(params?: {
	fechaDesde?: DateLike;
	fechaHasta?: DateLike;
	coach?: string;
}): Promise<MetricsV2Envelope> {
	// eslint-disable-next-line no-console
	console.error("[DEPRECATED] fetchMetricsV2 está deprecado. Usar fetchMetricsRetention() o fetchMetricsTasks()");
	throw new Error("fetchMetricsV2 está deprecado. Usar fetchMetricsRetention() o fetchMetricsTasks() en su lugar.");
}

/**
 * @deprecated Usar fetchMetricsV2 deprecado
 */
export async function logMetricsV2Now() {
	return fetchMetricsV2();
}

/* ======================
   Metrics Retention (v1)
   ====================== */

export type RetentionApiData = {
	clientes_etapas?: {
		total?: number;
		byEtapa?: Array<{ etapa_id: string; count: number }>;
		lastPerClient?: Array<{ etapa_id: string; count: number }>;
	};
	clientes_etapas_durations?: Array<{ etapa_id: string; count: number; avg_days: number }>;
	clientes_etapas_durations_detail?: any[];
	clientes_etapas_avg_permanencia?: {
		transition?: Array<{ from_etapa: string; to_etapa: string; count: number; avg_days: number }>;
	};
	retention?: {
		completado: number;
		abandonado: number;
		total: number;
		retention: number;
		permanencia: number;
	};
};

export async function fetchMetricsRetention(params?: {
	fechaDesde?: DateLike;
	fechaHasta?: DateLike;
}): Promise<{ code: number; status: string; data: RetentionApiData }> {
	const defaults = getDefaultRange();
	let fechaDesde = normalizeInputDate(params?.fechaDesde) ?? defaults.fechaDesde;
	let fechaHasta = normalizeInputDate(params?.fechaHasta) ?? defaults.fechaHasta;

	if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
		const tmp = fechaDesde;
		fechaDesde = fechaHasta;
		fechaHasta = tmp;
	}

	const qs = new URLSearchParams();
	if (fechaDesde) qs.set("fechaDesde", fechaDesde);
	if (fechaHasta) qs.set("fechaHasta", fechaHasta);

	const url = `/metrics/get/metrics-retention${qs.toString() ? `?${qs.toString()}` : ""}`;

	// Cache
	const now = Date.now();
	const cached = METRICS_CACHE.get(url);
	if (cached && now - cached.ts < METRICS_TTL_MS) {
		return cached.promise as any;
	}

	const p = apiFetch<any>(url);
	METRICS_CACHE.set(url, { ts: now, promise: p });
	return (await p) as any;
}

/* ======================
   Metrics Tasks (v1)
   ====================== */

export type SlowestResponseTicket = {
	ticket_id: number;
	codigo_alumno: string;
	nombre_alumno: string;
	asunto_ticket: string;
	tipo_ticket: string;
	estado_ticket: string;
	fecha_creacion: string;
	fecha_respuesta: string;
	minutos_respuesta: number;
	horas_respuesta: number;
	dias_respuesta: number;
};

export type TasksWindowSummary = {
	window?: number;
	avg_seconds: number | null;
	avg_human: string | null;
	alumnos: number;
};

export type TasksApiData = {
	slowestResponseTickets?: SlowestResponseTicket;
	ultimas_tareas_resumen?: Record<string, TasksWindowSummary>;
	ultimas_tareas_detalle?: any[];
	estados_resumen?: Record<string, TasksWindowSummary>;
	estados_detalle?: any[];
	// Alias para compatibilidad
	noTasksDetail?: any[];
	no_tasks_detail?: any[];
	tasksLastDetail?: any[];
	noTasksSummary?: any;
	no_tasks_summary?: any;
	tasksLastSummary?: any;
};

export async function fetchMetricsTasks(params?: {
	fechaDesde?: DateLike;
	fechaHasta?: DateLike;
	coach?: string;
}): Promise<{ code: number; status: string; data: TasksApiData }> {
	const defaults = getDefaultRange();
	let fechaDesde = normalizeInputDate(params?.fechaDesde) ?? defaults.fechaDesde;
	let fechaHasta = normalizeInputDate(params?.fechaHasta) ?? defaults.fechaHasta;

	if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
		const tmp = fechaDesde;
		fechaDesde = fechaHasta;
		fechaHasta = tmp;
	}
	const coach = params?.coach;

	const qs = new URLSearchParams();
	if (fechaDesde) qs.set("fechaDesde", fechaDesde);
	if (fechaHasta) qs.set("fechaHasta", fechaHasta);
	if (coach) qs.set("coach", coach);

	const url = `/metrics/get/metrics-tasks${qs.toString() ? `?${qs.toString()}` : ""}`;

	// Cache
	const now = Date.now();
	const cached = METRICS_CACHE.get(url);
	if (cached && now - cached.ts < METRICS_TTL_MS) {
		return cached.promise as any;
	}

	const p = apiFetch<any>(url);
	METRICS_CACHE.set(url, { ts: now, promise: p });
	return (await p) as any;
}

	/* ======================
		 No-tasks (última entrega)
		 ====================== */

	export type NoTasksDetailItem = {
		codigo: string;
		nombre: string;
		avg_seconds: number | null;
		avg_human?: string | null;
		task_count?: number | null;
	};

	export type NoTasksSummary = Record<
		string,
		{ avg_seconds: number | null; avg_human?: string | null; alumnos: number | null }
	>;

	function toDaySeconds(days: number) {
		return days * 24 * 60 * 60;
	}

	export async function fetchNoTasksMetricsV2(params?: {
		fechaDesde?: DateLike;
		fechaHasta?: DateLike;
		coach?: string;
	}): Promise<{ detail: NoTasksDetailItem[]; summary: NoTasksSummary }> {
		// Usar metrics-tasks en lugar de metrics-v2
		const json = await fetchMetricsTasks(params);
		const d = (json as any)?.data ?? {};

		// robusta: múltiples nombres posibles desde backend
		const detailRaw: any[] =
			(Array.isArray(d.ultimas_tareas_detalle) && d.ultimas_tareas_detalle) ||
			(Array.isArray(d.noTasksDetail) && d.noTasksDetail) ||
			(Array.isArray(d.no_tasks_detail) && d.no_tasks_detail) ||
			(Array.isArray(d.tasksLastDetail) && d.tasksLastDetail) ||
			[];

		const summaryRaw: any =
			d.ultimas_tareas_resumen || d.noTasksSummary || d.no_tasks_summary || d.tasksLastSummary || null;

		const detail: NoTasksDetailItem[] = detailRaw.map((r: any) => ({
			codigo: String(r.codigo ?? r.code ?? r.id_alumno ?? r.alumno ?? ""),
			nombre: String(r.nombre ?? r.name ?? r.alumno_nombre ?? ""),
			avg_seconds:
				r.avg_seconds != null
					? Number(r.avg_seconds)
					: r.seconds != null
					? Number(r.seconds)
					: null,
			avg_human: r.avg_human ?? r.human ?? null,
			task_count: r.task_count != null ? Number(r.task_count) : r.tasks != null ? Number(r.tasks) : null,
		}));

		// normalizar summary si existe
		let summary: NoTasksSummary = {};
		if (summaryRaw && typeof summaryRaw === "object") {
			Object.keys(summaryRaw).forEach((k) => {
				const v = summaryRaw[k];
				summary[k] = {
					avg_seconds:
						v?.avg_seconds != null
							? Number(v.avg_seconds)
							: v?.seconds != null
							? Number(v.seconds)
							: null,
					avg_human: v?.avg_human ?? v?.human ?? null,
					alumnos:
						v?.alumnos != null
							? Number(v.alumnos)
							: v?.students != null
							? Number(v.students)
							: null,
				};
			});
		}

		// (transiciones de fase: tipos y fetch están definidos a nivel de módulo)

		// fallback: si no viene summary, derivar por umbrales típicos {7,15,30,90}
		if (!summary || Object.keys(summary).length === 0) {
			const thresholds = [7, 15, 30, 90];
			const m: NoTasksSummary = {};
			thresholds.forEach((dys) => {
				const minS = toDaySeconds(dys);
				const bucket = detail.filter((it) => (it.avg_seconds ?? 0) >= minS);
				const avg =
					bucket.length > 0
						? Math.round(
								(bucket.reduce((a, c) => a + (c.avg_seconds || 0), 0) / bucket.length) * 100
							) / 100
						: null;
				m[String(dys)] = {
					avg_seconds: avg,
					avg_human: null,
					alumnos: bucket.length,
				};
			});
			summary = m;
		}

		return { detail, summary };
	}

/* ======================
	Transiciones de fase (clientes_etapas) — dinámico
   Definiciones a nivel de módulo
====================== */

export type StageId = string;
export type StageCounts = Record<StageId, number>;
export type StageItem = {
	code: string;
	name: string;
	etapa_id: StageId;
	date: string | null; // created_at
	prev_date?: string | null; // prev_created_at si viene
	days?: number | null;
};
export type StageItemsById = Record<StageId, StageItem[]>;
export type StageDurationsAvg = Record<StageId, { count: number; avg_days: number | null }>;
export type StageLabels = Record<StageId, string>;

function normalizeStageId(etapaId: any): StageId | null {
	const s = String(etapaId || "").trim();
	if (!s) return null;
	return s;
}

export async function fetchStageTransitionsV2(params?: {
    fechaDesde?: DateLike;
    fechaHasta?: DateLike;
    coach?: string;
}): Promise<{
    counts: StageCounts;
	items: StageItemsById;
    durationsAvg: StageDurationsAvg;
	labels: StageLabels;
}> {
    // Usar metrics-retention en lugar de metrics-v2
    const json = await fetchMetricsRetention(params);
    const d = (json as any)?.data ?? {};

    const byEtapa: any[] = Array.isArray(d?.clientes_etapas?.byEtapa)
        ? d.clientes_etapas.byEtapa
        : Array.isArray(d?.clientsByStage) // alias
        ? d.clientsByStage
        : [];

    const durations: any[] = Array.isArray(d?.clientes_etapas_durations)
        ? d.clientes_etapas_durations
        : Array.isArray(d?.clientsStagesDurations)
        ? d.clientsStagesDurations
        : [];

    const durationsDetail: any[] = Array.isArray(d?.clientes_etapas_durations_detail)
        ? d.clientes_etapas_durations_detail
        : Array.isArray(d?.clientsStagesDurationsDetail)
        ? d.clientsStagesDurationsDetail
        : [];

	const counts: StageCounts = {};
	const labels: StageLabels = {};
    byEtapa.forEach((r) => {
		const id = normalizeStageId(r.etapa_id ?? r.stage_id ?? r.etapa ?? r.stage);
		if (!id) return;
		const label = String(
			r.etapa_name ?? r.stage_name ?? r.name ?? r.etapa ?? r.stage ?? id
		);
		if (!(id in counts)) counts[id] = 0;
		labels[id] = labels[id] || label;
        const n = Number(r.count ?? r.cantidad ?? 0) || 0;
		counts[id] += n;
    });

	// Items agrupados por etapa (dinámico)
	const items: StageItemsById = {};
    durationsDetail.forEach((r) => {
		const id = normalizeStageId(r.etapa_id ?? r.stage_id ?? r.etapa ?? r.stage);
		if (!id) return;
		if (!items[id]) items[id] = [];
		items[id].push({
            code: String(r.codigo_cliente ?? r.alumno ?? r.codigo ?? r.id_alumno ?? ""),
            name: String(r.nombre ?? r.alumno_nombre ?? ""),
			etapa_id: String(r.etapa_id ?? r.etapa ?? id),
            date: r.created_at ?? r.fecha ?? null,
            prev_date: r.prev_created_at ?? r.prev_fecha ?? null,
            days: r.days != null ? Number(r.days) : null,
        });
    });

	// Promedios de días por etapa (dinámico)
	const durationsAvg: StageDurationsAvg = {};
    durations.forEach((r) => {
		const id = normalizeStageId(r.etapa_id ?? r.stage_id ?? r.etapa ?? r.stage);
		if (!id) return;
		durationsAvg[id] = {
            count: Number(r.count ?? r.cantidad ?? 0) || 0,
            avg_days: r.avg_days != null ? Number(r.avg_days) : null,
        };
    });

	return { counts, items, durationsAvg, labels };
}

