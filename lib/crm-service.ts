// lib/crm-service.ts
// Servicio front (mock localStorage) para el CRM.
// Cuando exista backend real, reemplazar implementaciones api* por fetch hacia endpoints.

import {
  type Prospect,
  type ProspectCore,
  type ProspectActivity,
  type ListProspectsParams,
  type ListProspectsResult,
  type PipelineStageId,
  type VentaEstadoId,
  type PaymentScheduleItem,
  type AutomationEvent,
  DEFAULT_PIPELINE,
  nowIso,
  generateId,
} from "./crm-types";

/* ========================================================================
   Persistencia Mock (localStorage) — Namespaces
======================================================================== */
const NS = {
  prospects: "crm:prospects", // ProspectCore[] con campos venta / schedule mínimos
  activities: "crm:activities", // ProspectActivity[]
  automations: "crm:automations", // AutomationEvent[]
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}
function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/* ========================================================================
   Modelo interno minimal
======================================================================== */
interface ProspectStorage extends ProspectCore {
  venta: Prospect["venta"];
  paymentSchedule: PaymentScheduleItem[];
}

/* ========================================================================
   Seeds iniciales (si no existe nada)
======================================================================== */
function ensureSeed() {
  const existing = lsGet<ProspectStorage[]>(NS.prospects, []);
  if (existing.length > 0) return;
  const now = nowIso();
  const base: ProspectStorage[] = [
    {
      id: generateId("p"),
      nombre: "Juan Pérez",
      email: "juan@example.com",
      telefono: "+51 999 111 222",
      canalFuente: "Facebook Ads",
      etapaPipeline: "nuevo",
      ownerId: "u1",
      ownerNombre: "Closer A",
      pais: "Perú",
      ciudad: "Lima",
      tags: ["FB", "Premium"],
      score: 72,
      notasResumen: "Interesado en plan premium. Llamar tarde.",
      creadoAt: now,
      actualizadoAt: now,
      nextActionAt: now,
      origenCampaignId: null,
      convertedStudentId: null,
      fechaConversion: null,
      venta: {
        estado: "pendiente_verificacion",
        programa: "Programa X",
        modalidadPago: "cuotas",
        montoTotal: 1500,
        moneda: "USD",
        plataformaPago: "Hotmart",
        bonosOfrecidos: ["Sesión 1-1"],
        contratoNombre: null,
        contratoEnlace: null,
        contratoFirmadoAt: null,
        accesoActivadoAt: null,
        accesoProvisionalExpiraAt: null,
        cierreOperativoAt: null,
      },
      paymentSchedule: [],
    },
    {
      id: generateId("p"),
      nombre: "María López",
      email: "maria@example.com",
      telefono: "+57 300 123 4567",
      canalFuente: "Landing",
      etapaPipeline: "contactado",
      ownerId: "u2",
      ownerNombre: "Closer B",
      pais: "Colombia",
      ciudad: "Medellín",
      tags: ["Landing"],
      score: 55,
      notasResumen: "Pidió info de becas.",
      creadoAt: now,
      actualizadoAt: now,
      nextActionAt: null,
      origenCampaignId: null,
      convertedStudentId: null,
      fechaConversion: null,
      venta: {
        estado: "pago_por_confirmar",
        programa: "Programa X",
        modalidadPago: "contado",
        montoTotal: 900,
        moneda: "USD",
        plataformaPago: "PayPal",
        bonosOfrecidos: [],
        contratoNombre: null,
        contratoEnlace: null,
        contratoFirmadoAt: null,
        accesoActivadoAt: null,
        accesoProvisionalExpiraAt: null,
        cierreOperativoAt: null,
      },
      paymentSchedule: [],
    },
  ];
  lsSet(NS.prospects, base);
  lsSet(NS.activities, [] as ProspectActivity[]);
  lsSet(NS.automations, [] as AutomationEvent[]);
}

/* ========================================================================
   Queries básicas
======================================================================== */
export function listProspects(params: ListProspectsParams = {}): ListProspectsResult {
  ensureSeed();
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  let items = stored as ProspectStorage[];

  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.telefono || "").toLowerCase().includes(q)
    );
  }
  if (params.etapa) items = items.filter((p) => p.etapaPipeline === params.etapa);
  if (params.ownerId) items = items.filter((p) => p.ownerId === params.ownerId);
  if (params.canal) items = items.filter((p) => p.canalFuente === params.canal);
  if (params.estadoVenta) items = items.filter((p) => p.venta.estado === params.estadoVenta);
  if (params.desde)
    items = items.filter((p) => p.creadoAt >= params.desde!);
  if (params.hasta)
    items = items.filter((p) => p.creadoAt <= params.hasta!);

  // Orden simple: más reciente primero
  items = [...items].sort((a, b) => b.creadoAt.localeCompare(a.creadoAt));

  const lite: ProspectCore[] = items.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    telefono: p.telefono,
    canalFuente: p.canalFuente,
    etapaPipeline: p.etapaPipeline,
    ownerId: p.ownerId,
    ownerNombre: p.ownerNombre,
    pais: p.pais,
    ciudad: p.ciudad,
    tags: p.tags,
    score: p.score,
    notasResumen: p.notasResumen,
    creadoAt: p.creadoAt,
    actualizadoAt: p.actualizadoAt,
    nextActionAt: p.nextActionAt,
    origenCampaignId: p.origenCampaignId,
    convertedStudentId: p.convertedStudentId,
    fechaConversion: p.fechaConversion,
  }));

  return { items: lite, total: lite.length };
}

export function getProspect(id: string): Prospect | null {
  ensureSeed();
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const base = stored.find((p) => p.id === id);
  if (!base) return null;
  const acts = lsGet<ProspectActivity[]>(NS.activities, []).filter((a) => a.prospectId === id);
  return { ...base, actividades: acts };
}

/* ========================================================================
   Mutaciones
======================================================================== */
export function createProspect(data: Partial<ProspectCore> & { nombre: string }): ProspectCore {
  ensureSeed();
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const now = nowIso();
  const newItem: ProspectStorage = {
    id: generateId("p"),
    nombre: data.nombre,
    email: data.email || null,
    telefono: data.telefono || null,
    canalFuente: data.canalFuente || null,
    etapaPipeline: data.etapaPipeline || "nuevo",
    ownerId: data.ownerId || null,
    ownerNombre: data.ownerNombre || null,
    pais: data.pais || null,
    ciudad: data.ciudad || null,
    tags: data.tags || [],
    score: data.score ?? null,
    notasResumen: data.notasResumen || null,
    creadoAt: now,
    actualizadoAt: now,
    nextActionAt: data.nextActionAt || null,
    origenCampaignId: data.origenCampaignId || null,
    convertedStudentId: null,
    fechaConversion: null,
    venta: {
      estado: "pendiente_verificacion",
      programa: null,
      modalidadPago: null,
      montoTotal: null,
      moneda: null,
      plataformaPago: null,
      bonosOfrecidos: [],
      contratoNombre: null,
      contratoEnlace: null,
      contratoFirmadoAt: null,
      accesoActivadoAt: null,
      accesoProvisionalExpiraAt: null,
      cierreOperativoAt: null,
    },
    paymentSchedule: [],
  };
  stored.push(newItem);
  lsSet(NS.prospects, stored);
  logAutomation("registro_inicial", newItem.id, { etapa: newItem.etapaPipeline });
  return {
    id: newItem.id,
    nombre: newItem.nombre,
    email: newItem.email,
    telefono: newItem.telefono,
    canalFuente: newItem.canalFuente,
    etapaPipeline: newItem.etapaPipeline,
    ownerId: newItem.ownerId,
    ownerNombre: newItem.ownerNombre,
    pais: newItem.pais,
    ciudad: newItem.ciudad,
    tags: newItem.tags,
    score: newItem.score,
    notasResumen: newItem.notasResumen,
    creadoAt: newItem.creadoAt,
    actualizadoAt: newItem.actualizadoAt,
    nextActionAt: newItem.nextActionAt,
    origenCampaignId: newItem.origenCampaignId,
    convertedStudentId: null,
    fechaConversion: null,
  };
}

export function updateProspect(id: string, partial: Partial<ProspectCore>): ProspectCore | null {
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const current = stored[idx];
  const updated: ProspectStorage = {
    ...current,
    ...partial,
    actualizadoAt: nowIso(),
  };
  stored[idx] = updated;
  lsSet(NS.prospects, stored);
  return {
    id: updated.id,
    nombre: updated.nombre,
    email: updated.email,
    telefono: updated.telefono,
    canalFuente: updated.canalFuente,
    etapaPipeline: updated.etapaPipeline,
    ownerId: updated.ownerId,
    ownerNombre: updated.ownerNombre,
    pais: updated.pais,
    ciudad: updated.ciudad,
    tags: updated.tags,
    score: updated.score,
    notasResumen: updated.notasResumen,
    creadoAt: updated.creadoAt,
    actualizadoAt: updated.actualizadoAt,
    nextActionAt: updated.nextActionAt,
    origenCampaignId: updated.origenCampaignId,
    convertedStudentId: updated.convertedStudentId,
    fechaConversion: updated.fechaConversion,
  };
}

export function updateProspectStage(id: string, newStage: PipelineStageId): ProspectCore | null {
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  stored[idx].etapaPipeline = newStage;
  stored[idx].actualizadoAt = nowIso();
  lsSet(NS.prospects, stored);
  logActivity(id, {
    tipo: "estado",
    texto: `Cambio de etapa a ${newStage}`,
  });
  return updateProspect(id, {}); // devuelve core actualizado
}

export function convertProspect(id: string, studentId?: string): ProspectCore | null {
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const now = nowIso();
  stored[idx].convertedStudentId = studentId || generateId("stu");
  stored[idx].fechaConversion = now;
  stored[idx].etapaPipeline = "ganado";
  stored[idx].actualizadoAt = now;
  lsSet(NS.prospects, stored);
  logActivity(id, { tipo: "estado", texto: "Prospecto convertido a alumno" });
  logAutomation("activacion_accesos", id, { provisional: false });
  return updateProspect(id, {});
}

/* ========================================================================
   Flujo de venta / pago / contrato / accesos (mock)
   Cada función actualiza el estado de venta y registra actividades + triggers.
======================================================================== */

function saveProspects(list: ProspectStorage[]) {
  lsSet(NS.prospects, list);
}

function findProspectIndex(id: string): [ProspectStorage[] , number] {
  const stored = lsGet<ProspectStorage[]>(NS.prospects, []);
  const idx = stored.findIndex(p => p.id === id);
  return [stored, idx];
}

export function closeSale(id: string, data: {
  programa: string;
  modalidadPago: string; // contado | cuotas
  montoTotal: number;
  moneda?: string;
  plataformaPago: string;
  bonosOfrecidos?: string[];
  cuotas?: { monto: number; dueAt: string }[]; // si modalidad es cuotas
}) : ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.programa = data.programa;
  p.venta.modalidadPago = data.modalidadPago;
  p.venta.montoTotal = data.montoTotal;
  p.venta.moneda = data.moneda || 'USD';
  p.venta.plataformaPago = data.plataformaPago;
  p.venta.bonosOfrecidos = data.bonosOfrecidos || [];
  p.venta.estado = 'pendiente_verificacion';
  p.actualizadoAt = nowIso();
  // programar cuotas si aplica
  if (data.modalidadPago === 'cuotas' && data.cuotas?.length) {
    p.paymentSchedule = data.cuotas.map((c, i) => ({
      id: generateId('pay'),
      tipo: 'cuota',
      numero: i + 1,
      monto: c.monto,
      moneda: p.venta.moneda,
      dueAt: c.dueAt,
      estado: 'pendiente',
    }));
  }
  saveProspects(stored);
  logAutomation('registro_inicial', id, { venta: true });
  logActivity(id, { tipo: 'estado', texto: 'Venta registrada (pendiente de verificación)' });
  return updateProspect(id, {});
}

export function verifyPayment(id: string, confirmado: boolean): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = confirmado ? 'pago_confirmado' : 'pago_por_confirmar';
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('validacion_pago', id, { confirmado });
  logActivity(id, { tipo: 'estado', texto: confirmado ? 'Pago confirmado' : 'Pago por confirmar' });
  return updateProspect(id, {});
}

export function sendContract(id: string, enlace: string, contratoNombre?: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = 'contrato_enviado';
  p.venta.contratoEnlace = enlace;
  p.venta.contratoNombre = contratoNombre || p.nombre;
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('envio_contrato', id, { enlace });
  logActivity(id, { tipo: 'contrato', texto: 'Contrato enviado para firma' });
  return updateProspect(id, {});
}

export function markContractSigned(id: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = 'contrato_firmado';
  p.venta.contratoFirmadoAt = nowIso();
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('firma_contrato', id, {});
  logActivity(id, { tipo: 'contrato', texto: 'Contrato firmado' });
  return updateProspect(id, {});
}

export function activateAccess(id: string, provisional: boolean = false): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = provisional ? 'acceso_provisional' : 'acceso_activo';
  p.venta.accesoActivadoAt = nowIso();
  if (provisional) {
    const exp = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 días
    p.venta.accesoProvisionalExpiraAt = exp.toISOString();
  }
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('activacion_accesos', id, { provisional });
  logActivity(id, { tipo: 'acceso', texto: provisional ? 'Acceso provisional activado' : 'Acceso completo activado' });
  return updateProspect(id, {});
}

export function schedulePayments(id: string, cuotas: { monto: number; dueAt: string }[]): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.paymentSchedule = cuotas.map((c, i) => ({
    id: generateId('pay'),
    tipo: 'cuota',
    numero: i + 1,
    monto: c.monto,
    moneda: p.venta.moneda,
    dueAt: c.dueAt,
    estado: 'pendiente',
  }));
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logActivity(id, { tipo: 'pago', texto: 'Cronograma de pagos actualizado' });
  return updateProspect(id, {});
}

export function setPaymentPaid(prospectId: string, paymentId: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(prospectId);
  if (idx === -1) return null;
  const p = stored[idx];
  const pay = p.paymentSchedule.find(ps => ps.id === paymentId);
  if (!pay) return null;
  pay.estado = 'pagado';
  pay.pagadoAt = nowIso();
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logActivity(prospectId, { tipo: 'pago', texto: `Pago de cuota ${pay.numero} confirmado` });
  return updateProspect(prospectId, {});
}

export function processPaymentReminder(prospectId: string, paymentId: string, fase: 'preventivo' | 'vencido' | 'mora' ) {
  logAutomation('recordatorio_pago', prospectId, { paymentId, fase });
  logActivity(prospectId, { tipo: 'pago', texto: `Recordatorio de pago (${fase})` });
}

export function freezeAccess(id: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = 'congelado';
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('congelamiento_accesos', id, {});
  logActivity(id, { tipo: 'acceso', texto: 'Accesos congelados por mora' });
  return updateProspect(id, {});
}

export function markDefinitiveDrop(id: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = 'baja_definitiva';
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('baja_definitiva', id, {});
  logActivity(id, { tipo: 'estado', texto: 'Baja definitiva' });
  return updateProspect(id, {});
}

export function finalizeOperationalClosure(id: string): ProspectCore | null {
  const [stored, idx] = findProspectIndex(id);
  if (idx === -1) return null;
  const p = stored[idx];
  p.venta.estado = 'cierre_operativo';
  p.venta.cierreOperativoAt = nowIso();
  p.actualizadoAt = nowIso();
  saveProspects(stored);
  logAutomation('cierre_operativo', id, {});
  logActivity(id, { tipo: 'estado', texto: 'Cierre operativo completado' });
  return updateProspect(id, {});
}

/* ========================================================================
   Actividades
======================================================================== */
export function listActivities(prospectId: string): ProspectActivity[] {
  ensureSeed();
  return lsGet<ProspectActivity[]>(NS.activities, []).filter(
    (a) => a.prospectId === prospectId
  );
}

export function addActivity(
  prospectId: string,
  data: Partial<ProspectActivity> & { tipo: ProspectActivity["tipo"] }
): ProspectActivity {
  const acts = lsGet<ProspectActivity[]>(NS.activities, []);
  const act: ProspectActivity = {
    id: generateId("act"),
    prospectId,
    tipo: data.tipo,
    texto: data.texto || null,
    metadata: data.metadata || null,
    createdAt: nowIso(),
    createdBy: data.createdBy || null,
    createdByNombre: data.createdByNombre || null,
    dueAt: data.dueAt || null,
    completedAt: data.completedAt || null,
  };
  acts.push(act);
  lsSet(NS.activities, acts);
  return act;
}

function logActivity(prospectId: string, data: { tipo: ProspectActivity["tipo"]; texto?: string }) {
  addActivity(prospectId, { tipo: data.tipo, texto: data.texto });
}

/* ========================================================================
   Automatizaciones (registro simple)
======================================================================== */
export function listAutomations(prospectId?: string): AutomationEvent[] {
  return lsGet<AutomationEvent[]>(NS.automations, []).filter((e) =>
    prospectId ? e.prospectId === prospectId : true
  );
}

export function logAutomation(
  trigger: AutomationEvent["trigger"],
  prospectId: string,
  payload?: Record<string, any>
) {
  const evs = lsGet<AutomationEvent[]>(NS.automations, []);
  evs.push({
    id: generateId("auto"),
    trigger,
    prospectId,
    createdAt: nowIso(),
    payload: payload || null,
  });
  lsSet(NS.automations, evs);
}

/* ========================================================================
   Export público
======================================================================== */
export const crmService = {
  // Prospects
  listProspects,
  getProspect,
  createProspect,
  updateProspect,
  updateProspectStage,
  convertProspect,
  closeSale,
  verifyPayment,
  sendContract,
  markContractSigned,
  activateAccess,
  schedulePayments,
  setPaymentPaid,
  processPaymentReminder,
  freezeAccess,
  markDefinitiveDrop,
  finalizeOperationalClosure,

  // Activities
  listActivities,
  addActivity,

  // Automations
  listAutomations,
  logAutomation,
};
