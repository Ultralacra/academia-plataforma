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

export async function fetchMetricsV2(params?: {
	fechaDesde?: DateLike;
	fechaHasta?: DateLike;
	coach?: string;
}): Promise<MetricsV2Envelope> {
	const defaults = getDefaultRange();
	let fechaDesde = normalizeInputDate(params?.fechaDesde) ?? defaults.fechaDesde;
	let fechaHasta = normalizeInputDate(params?.fechaHasta) ?? defaults.fechaHasta;

	// Guard: evitar rangos invertidos (ej. fechaDesde=2025-12-01, fechaHasta=2025-10-26)
	// ISO YYYY-MM-DD permite comparación lexicográfica.
	if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
		const tmp = fechaDesde;
		fechaDesde = fechaHasta;
		fechaHasta = tmp;
		// eslint-disable-next-line no-console
		console.warn("[metrics-v2] rango invertido; se intercambió", { fechaDesde, fechaHasta });
	}
	const coach = params?.coach;

	const qs = new URLSearchParams();
	if (fechaDesde) qs.set("fechaDesde", fechaDesde);
	if (fechaHasta) qs.set("fechaHasta", fechaHasta);
	if (coach) qs.set("coach", coach);

	const url = `/metrics/get/metrics-v2${qs.toString() ? `?${qs.toString()}` : ""}`;

	// Cache: si existe y no expiró, reutilizar la misma Promise
	const now = Date.now();
	const cached = METRICS_CACHE.get(url);
	if (cached && now - cached.ts < METRICS_TTL_MS) {
		return cached.promise;
	}

	const p = apiFetch<any>(url);
	METRICS_CACHE.set(url, { ts: now, promise: p });
	const json = await p;

	// Log con contexto para depuración inicial
	// Ej.: [metrics-v2] GET /metrics/get/metrics-v2?fechaDesde=YYYY-MM-01&fechaHasta=YYYY-MM-DD → { code, data, ... }
	try {
		// Evitar logging gigante: mostramos code y claves de data si existen
		const preview = {
			code: json?.code,
			status: json?.status,
			keys: json && typeof json === "object" && json.data ? Object.keys(json.data) : [],
		};
		// eslint-disable-next-line no-console
				/* console.log("[metrics-v2] GET", url, "→", preview); */
	} catch {
		// eslint-disable-next-line no-console
				/* console.log("[metrics-v2] GET", url, "(preview logging failed)"); */
	}

	return json as MetricsV2Envelope;
}

// Helper directo: hace la consulta con el rango por defecto y loguea
export async function logMetricsV2Now() {
	return fetchMetricsV2();
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
		const json = await fetchMetricsV2(params);
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
    const json = await fetchMetricsV2(params);
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

