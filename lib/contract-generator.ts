// lib/contract-generator.ts
// Generador de contratos Word (.docx) usando docxtemplater
// Toma un template y los datos del lead para generar el contrato completado

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const DOC_FONT = {
  ascii: "Arial",
  hAnsi: "Arial",
  cs: "Arial",
  eastAsia: "Arial",
} as const;

const DOC_COLOR = "000000" as const;

type TextRunInit = ConstructorParameters<typeof TextRun>[0];
type TextRunInitObject = Exclude<TextRunInit, string>;

function run(text: string, opts?: Partial<TextRunInitObject>): TextRun {
  return new TextRun({
    text,
    size: 22,
    color: DOC_COLOR,
    font: DOC_FONT,
    ...(opts ?? {}),
  });
}

// Tipos para los datos del contrato
export interface ContractData {
  // Datos personales del cliente
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  dni?: string; // Documento de identidad

  // Datos de empresa (si aplica)
  isCompany?: boolean;
  companyName?: string;
  companyTaxId?: string; // NIF/CIF/RUC
  companyAddress?: string;
  companyCity?: string;
  companyCountry?: string;

  // Tercero (si firma otra persona)
  thirdParty?: boolean;
  thirdPartyName?: string;
  thirdPartyEmail?: string;
  thirdPartyPhone?: string;

  // Datos del programa/producto
  program: string;
  programDuration?: string; // ej: "4 meses"
  programDurationNumber?: number; // ej: 4
  bonuses?: string[];
  bonusesText?: string;

  // Datos de pago
  paymentMode: string; // contado, cuotas, reserva
  paymentAmount: string; // monto total
  paymentAmountNumber?: number;
  paymentPaidAmount?: string;
  paymentPlatform?: string;
  paymentCurrency?: string;
  installmentsCount?: number;
  installmentAmount?: string;
  paymentInstallmentsSchedule?: Array<{
    amount?: string;
    dueDate?: string;
  }>;
  paymentCustomInstallments?: Array<{
    amount?: string;
    dueDate?: string;
  }>;
  reserveAmount?: string;
  reservePaidDate?: string;
  reserveRemainingDueDate?: string;
  nextChargeDate?: string;

  // Fechas
  contractDate: string; // Fecha del contrato (hoy)
  startDate?: string; // Fecha de inicio del programa
  startDay?: string;
  startMonth?: string;
  startYear?: string;
  endDate?: string; // Fecha de fin estimada

  // Datos del vendedor/closer
  closerName?: string;
  closerEmail?: string;

  // Notas adicionales
  notes?: string;

  // Firmantes extra (además del lead principal)
  extraSigners?: Array<{ name?: string; email?: string }>;
}

// Función para formatear fecha en español
function formatDateSpanish(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date();
    return formatDateToSpanish(now);
  }
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return formatDateToSpanish(d);
  } catch {
    return dateStr;
  }
}

function normalizeInstallmentItems(input: unknown) {
  if (!Array.isArray(input)) return [] as Array<{ amount?: string; dueDate?: string }>;
  return input.map((item: any) => ({
    amount: item?.amount != null ? String(item.amount) : "",
    dueDate: item?.dueDate ?? item?.due_date ?? "",
  }));
}

function formatDateToSpanish(d: Date): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

// Función para formatear monto con símbolo de moneda
function formatCurrency(amount?: string | number | null, currency = "USD"): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.]/g, "")) : amount;
  if (Number.isNaN(num)) return String(amount);
  
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    PEN: "S/",
    COP: "$",
    MXN: "$"
  };
  const symbol = symbols[currency] || "$";
  return `${symbol}${num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Función para convertir número a palabras en español
function numberToWords(num: number): string {
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const especiales: Record<number, string> = {
    11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
    16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
    21: "veintiuno", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
    25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve"
  };
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  if (num === 0) return "cero";
  if (num === 100) return "cien";
  if (num === 1000) return "mil";
  if (especiales[num]) return especiales[num];

  if (num < 10) return unidades[num];
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    if (u === 0) return decenas[d];
    return `${decenas[d]} y ${unidades[u]}`;
  }
  if (num < 1000) {
    const c = Math.floor(num / 100);
    const resto = num % 100;
    if (resto === 0) return centenas[c];
    return `${centenas[c]} ${numberToWords(resto)}`;
  }
  if (num < 10000) {
    const m = Math.floor(num / 1000);
    const resto = num % 1000;
    const milText = m === 1 ? "mil" : `${numberToWords(m)} mil`;
    if (resto === 0) return milText;
    return `${milText} ${numberToWords(resto)}`;
  }
  return num.toLocaleString("es-ES");
}

// Preparar datos para el template
export function prepareContractData(data: Partial<ContractData>): Record<string, string> {
  const paymentNum = parseFloat(String(data.paymentAmount || "0").replace(/[^0-9.]/g, ""));
  const paidNum = parseFloat(String(data.paymentPaidAmount || "0").replace(/[^0-9.]/g, ""));
  const installmentNum = parseFloat(String(data.installmentAmount || "0").replace(/[^0-9.]/g, ""));
  const reserveNum = parseFloat(String(data.reserveAmount || "0").replace(/[^0-9.]/g, ""));
  // Duración base (4 meses) + extensiones según bonos seleccionados
  const bonusNormalized = collectBonusCanonicalKeys(data.bonuses);
  const extensionMonths =
    (bonusNormalized.has("BONO_MESES_EXTRA_2") ? 2 : 0) +
    (bonusNormalized.has("BONO_MESES_EXTRA_1") ? 1 : 0);
  const baseDuration = data.programDurationNumber || 4;
  const durationNum = baseDuration + extensionMonths;
  const standardSchedule = normalizeInstallmentItems(data.paymentInstallmentsSchedule);
  const customSchedule = normalizeInstallmentItems(data.paymentCustomInstallments);

  const getScheduleItem = (index: number) => {
    const fromStandard = standardSchedule[index];
    if (fromStandard) return fromStandard;
    const fromCustom = customSchedule[index];
    if (fromCustom) return fromCustom;
    return { amount: "", dueDate: "" };
  };

  const cuota1 = getScheduleItem(0);
  const cuota2 = getScheduleItem(1);
  const cuota3 = getScheduleItem(2);

  // Bonuses como texto
  const bonusesText = Array.isArray(data.bonuses) && data.bonuses.length > 0
    ? data.bonuses.join(", ")
    : data.bonusesText || "—";

  // Modalidad de pago formateada (alineada a los códigos del CRM)
  const paymentModeText = (() => {
    const mode = String(data.paymentMode || "").toLowerCase();

    const parsedCount = (() => {
      const m = /(\d+)_cuotas/.exec(mode);
      if (m?.[1]) {
        const n = Number.parseInt(m[1], 10);
        if (Number.isFinite(n) && n > 0) return n;
      }
      if (mode.includes("excepcion_2_cuotas")) return 2;
      return undefined;
    })();

    const count =
      typeof data.installmentsCount === "number" &&
      Number.isFinite(data.installmentsCount) &&
      data.installmentsCount > 0
        ? data.installmentsCount
        : parsedCount ?? 3;

    const computedInstallmentAmount = (() => {
      if (data.installmentAmount !== undefined && String(data.installmentAmount).trim())
        return data.installmentAmount;
      // Fallback: si hay total y count, estimar monto por cuota
      if (Number.isFinite(paymentNum) && paymentNum > 0 && Number.isFinite(count) && count > 0)
        return paymentNum / count;
      return "";
    })();

    if (mode.includes("contado") || mode === "pago_total") return "PAGO ÚNICO";
    if (mode.includes("cuota") || mode.includes("excepcion")) {
      return `${count} cuotas de ${formatCurrency(computedInstallmentAmount, data.paymentCurrency)}`;
    }
    if (mode.includes("reserva")) return "RESERVA + SALDO";
    return data.paymentMode || "Por definir";
  })();

  // Extraer día, mes y año de la fecha de inicio
  let startDay = data.startDay || "____";
  let startMonth = data.startMonth || "_______________";
  let startYear = data.startYear || "2026";
  
  if (data.startDate && !data.startDay) {
    try {
      const d = new Date(data.startDate);
      if (!Number.isNaN(d.getTime())) {
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", 
                       "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        startDay = String(d.getDate());
        startMonth = months[d.getMonth()];
        startYear = String(d.getFullYear());
      }
    } catch {}
  }

  // Número a texto para duración
  const durationWords: Record<number, string> = {
    1: "un (1)", 2: "dos (2)", 3: "tres (3)", 4: "cuatro (4)", 
    5: "cinco (5)", 6: "seis (6)", 7: "siete (7)", 8: "ocho (8)",
    9: "nueve (9)", 10: "diez (10)", 11: "once (11)", 12: "doce (12)"
  };
  const durationText = durationWords[durationNum] || `${durationNum}`;

  const durationUnit = durationNum === 1 ? "mes" : "meses";
  const hasExplicitDurationNumber =
    (typeof data.programDurationNumber === "number" && Number.isFinite(data.programDurationNumber)) ||
    extensionMonths > 0;
  const durationProgram = hasExplicitDurationNumber
    ? `${durationText} ${durationUnit}`
    : data.programDuration || "cuatro (4) meses";

  return {
    // Datos personales
    NOMBRE_COMPLETO: data.fullName || "___________________________",
    EMAIL: data.email || "___________________________",
    TELEFONO: data.phone || "___________________________",
    DIRECCION: data.address || "___________________________",
    CIUDAD: data.city || "___________________________",
    PAIS: data.country || "___________________________",
    DNI: data.dni || "___________________________",

    // Datos empresa
    ES_EMPRESA: data.isCompany ? "Sí" : "No",
    NOMBRE_EMPRESA: data.companyName || "___________________________",
    NIF_EMPRESA: data.companyTaxId || "___________________________",
    DIRECCION_EMPRESA: data.companyAddress || "___________________________",
    CIUDAD_EMPRESA: data.companyCity || "___________________________",
    PAIS_EMPRESA: data.companyCountry || "___________________________",

    // Tercero
    ES_TERCERO: data.thirdParty ? "Sí" : "No",
    NOMBRE_TERCERO: data.thirdPartyName || "___________________________",
    EMAIL_TERCERO: data.thirdPartyEmail || "___________________________",
    TELEFONO_TERCERO: data.thirdPartyPhone || "___________________________",

    // Programa
    PROGRAMA: data.program || "HOTSELLING PRO",
    DURACION_PROGRAMA: durationProgram,
    DURACION_NUMERO: String(durationNum),
    DURACION_TEXTO: durationText,
    BONOS: bonusesText,

    // Pago
    MODALIDAD_PAGO: paymentModeText,
    MONTO_TOTAL: formatCurrency(data.paymentAmount, data.paymentCurrency),
    MONTO_TOTAL_NUMERO: paymentNum.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    MONTO_TOTAL_LETRAS: numberToWords(Math.floor(paymentNum)) + " dólares estadounidenses",
    MONTO_PAGADO: paidNum > 0 ? formatCurrency(data.paymentPaidAmount, data.paymentCurrency) : "___________________________",
    PLATAFORMA_PAGO: data.paymentPlatform || "Por definir",
    MONEDA: data.paymentCurrency || "USD",
    NUM_CUOTAS: String(data.installmentsCount || "—"),
    MONTO_CUOTA: formatCurrency(data.installmentAmount, data.paymentCurrency),
    MONTO_RESERVA: formatCurrency(data.reserveAmount, data.paymentCurrency),
    MONTO_CUOTA_1: formatCurrency(cuota1.amount || data.paymentPaidAmount || data.installmentAmount, data.paymentCurrency),
    MONTO_CUOTA_2: formatCurrency(cuota2.amount || data.installmentAmount, data.paymentCurrency),
    MONTO_CUOTA_3: formatCurrency(cuota3.amount || data.installmentAmount, data.paymentCurrency),
    FECHA_CUOTA_1: cuota1.dueDate ? formatDateSpanish(cuota1.dueDate) : (data.contractDate ? formatDateSpanish(data.contractDate) : "___________________________"),
    FECHA_CUOTA_2: cuota2.dueDate ? formatDateSpanish(cuota2.dueDate) : "___________________________",
    FECHA_CUOTA_3: cuota3.dueDate ? formatDateSpanish(cuota3.dueDate) : "___________________________",
    MONTO_EXCEPCION_CUOTA_1: formatCurrency(cuota1.amount || data.paymentPaidAmount, data.paymentCurrency),
    MONTO_EXCEPCION_CUOTA_2: formatCurrency(cuota2.amount || data.installmentAmount, data.paymentCurrency),
    FECHA_EXCEPCION_CUOTA_1: cuota1.dueDate ? formatDateSpanish(cuota1.dueDate) : (data.contractDate ? formatDateSpanish(data.contractDate) : "___________________________"),
    FECHA_EXCEPCION_CUOTA_2: cuota2.dueDate ? formatDateSpanish(cuota2.dueDate) : "___________________________",
    FECHA_RESERVA_PAGO: data.reservePaidDate ? formatDateSpanish(data.reservePaidDate) : "___________________________",
    FECHA_RESERVA_SALDO: data.reserveRemainingDueDate ? formatDateSpanish(data.reserveRemainingDueDate) : "___________________________",
    FECHA_PAGO_CONTADO: data.contractDate ? formatDateSpanish(data.contractDate) : "___________________________",
    FECHA_PROXIMO_COBRO: data.nextChargeDate ? formatDateSpanish(data.nextChargeDate) : "___________________________",

    // Fechas de inicio (separadas para el contrato)
    DIA_INICIO: startDay,
    MES_INICIO: startMonth,
    ANIO_INICIO: startYear,
    FECHA_INICIO: data.startDate ? formatDateSpanish(data.startDate) : "A definir tras confirmación de pago",
    FECHA_FIN: data.endDate ? formatDateSpanish(data.endDate) : "___________________________",

    // Fecha del contrato
    FECHA_CONTRATO: formatDateSpanish(data.contractDate),

    // Vendedor
    NOMBRE_CLOSER: data.closerName || "Equipo Hotselling",
    EMAIL_CLOSER: data.closerEmail || "soporte@hotselling.com",

    // Notas
    NOTAS: data.notes || "",

    // Firmantes extra serializados
    _EXTRA_SIGNERS_JSON: JSON.stringify(
      Array.isArray(data.extraSigners) ? data.extraSigners.filter((s) => s?.name && s?.email) : [],
    ),

    // Datos adicionales para el contrato (fecha actual)
    DIA: String(new Date().getDate()),
    MES: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][new Date().getMonth()],
    ANIO: String(new Date().getFullYear()),
  };
}

// Función principal para generar el contrato
export async function generateContract(
  templateBuffer: ArrayBuffer,
  data: Partial<ContractData>,
  filename = "contrato.docx"
): Promise<void> {
  try {
    // Cargar el template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" }
    });

    // Preparar y establecer los datos
    const templateData = prepareContractData(data);
    doc.setData(templateData);

    // Renderizar el documento
    doc.render();

    // Generar el archivo
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    // Descargar el archivo
    saveAs(out, filename);
  } catch (error: any) {
    console.error("Error generando contrato:", error);
    throw new Error(`Error al generar el contrato: ${error?.message || String(error)}`);
  }
}

function fillPlaceholders(input: string, values: Record<string, string>): string {
  return input.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key: string) => {
    const v = values[key];
    return typeof v === "string" ? v : "";
  });
}

type ContractBlock = Paragraph | Table;

type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

function underlineParagraph(
  text: string,
  opts?: {
    alignment?: Alignment;
    bold?: boolean;
    size?: number;
    spacingAfter?: number;
  },
): Paragraph {
  return new Paragraph({
    children: [run(text, { bold: opts?.bold, size: opts?.size })],
    alignment: opts?.alignment ?? AlignmentType.LEFT,
    border: {
      bottom: {
        color: DOC_COLOR,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { after: opts?.spacingAfter ?? 120 },
  });
}

function buildSignatureTable(
  values: Record<string, string>,
  signatureImageData?: Uint8Array | null,
): Table {
  const noCellBorders = {
    top: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
    bottom: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
    left: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
    right: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
  } as const;

  const fieldRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({
          borders: noCellBorders,
          width: { size: 40, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [run(label, { bold: true })],
              alignment: AlignmentType.LEFT,
              spacing: { after: 60 },
            }),
          ],
        }),
        new TableCell({
          borders: {
            ...noCellBorders,
            bottom: { color: DOC_COLOR, space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
          width: { size: 60, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [run(value)],
              alignment: AlignmentType.LEFT,
              spacing: { after: 60 },
            }),
          ],
        }),
      ],
    });

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      bottom: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      left: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      right: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      insideVertical: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
    },
    rows: [
      fieldRow("Correo Electrónico:", values.EMAIL ?? ""),
      fieldRow("Ciudad de Residencia:", values.CIUDAD ?? ""),
      fieldRow("País de Residencia:", values.PAIS ?? ""),
      fieldRow("Nro. de Telef.:", values.TELEFONO ?? ""),
    ],
  });

  // Parsear firmantes extra si los hay
  let extraSigners: Array<{ name?: string; email?: string }> = [];
  try {
    const parsed = JSON.parse(values._EXTRA_SIGNERS_JSON || "[]");
    if (Array.isArray(parsed)) extraSigners = parsed;
  } catch {}

  const mainSignatureRow = new TableRow({
    children: [
      new TableCell({
        borders: noCellBorders,
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({ children: [run("JAVIER MIRANDA", { bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [run("MHF GROUP LLC", { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
          ...(signatureImageData
            ? [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: signatureImageData,
                      transformation: {
                        width: 180,
                        height: 52,
                      },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
                }),
              ]
            : []),
        ],
      }),
      new TableCell({
        borders: noCellBorders,
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          underlineParagraph(values.NOMBRE_COMPLETO ?? "", { alignment: AlignmentType.CENTER, bold: true, spacingAfter: 60 }),
          new Paragraph({
            children: [run("(NOMBRE Y APELLIDO)", { size: 18, bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
          }),
          infoTable,
        ],
      }),
    ],
  });

  // Filas de firmantes extra
  const extraRows = extraSigners.map((signer) =>
    new TableRow({
      children: [
        new TableCell({
          borders: noCellBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ children: [], spacing: { before: 300 } }),
          ],
        }),
        new TableCell({
          borders: noCellBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ children: [], spacing: { before: 300 } }),
            underlineParagraph(signer.name || "", { alignment: AlignmentType.CENTER, bold: true, spacingAfter: 60 }),
            new Paragraph({
              children: [run("(FIRMANTE ADICIONAL)", { size: 18, bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
            }),
            new Paragraph({
              children: [run(signer.email || "")],
              alignment: AlignmentType.CENTER,
              spacing: { after: 160 },
            }),
          ],
        }),
      ],
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      bottom: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      left: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      right: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
      insideVertical: { style: BorderStyle.NONE, color: "FFFFFF", size: 0 },
    },
    rows: [mainSignatureRow, ...extraRows],
  });
}

function isAllCapsHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Heurística: títulos cortos en mayúsculas (permitimos tildes y signos)
  const letters = t.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
  return letters.length >= 6 && t === t.toUpperCase() && t.length <= 80;
}

function looksLikeClauseHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Ej: "PRIMERA. OBJETO." "SEGUNDA. ALCANCE DEL SERVICIO."
  return /^[A-ZÁÉÍÓÚÜÑ]+\.[\s\S]+$/.test(t) && t === t.toUpperCase();
}

function parseContractTextToParagraphs(
  contractText: string,
  values: Record<string, string>,
  signatureImageData?: Uint8Array | null,
): ContractBlock[] {
  const lines = contractText
    .split(/\r?\n/)
    .map((l) => fillPlaceholders(l, values).trimEnd());

  const paragraphs: ContractBlock[] = [];
  let buffer: string[] = [];
  let currentNumberDepth = 0;

  const INDENT_PER_LEVEL = 720; // 0.5" en twips
  const FIRST_LINE = 360; // 0.25"
  const HANGING = 360; // 0.25"

  const baseLeftIndent = () => Math.max(0, currentNumberDepth) * INDENT_PER_LEVEL;

  const makeBodyParagraph = (text: string) =>
    new Paragraph({
      children: [run(text)],
      alignment: AlignmentType.JUSTIFIED,
      indent: {
        left: baseLeftIndent(),
        firstLine: FIRST_LINE,
      },
      spacing: { after: 140 },
    });

  const makeListParagraph = (label: string, text: string, extraIndentLevels: number) => {
    const left = baseLeftIndent() + INDENT_PER_LEVEL * Math.max(1, extraIndentLevels);
    return new Paragraph({
      children: [
        ...(label ? [run(`${label} `, { bold: true })] : []),
        run(text),
      ],
      alignment: AlignmentType.JUSTIFIED,
      indent: {
        left,
        hanging: HANGING,
      },
      spacing: { after: 140 },
    });
  };

  const flushBuffer = () => {
    const text = buffer.join(" ").trim();
    buffer = [];
    if (!text) return;
    paragraphs.push(makeBodyParagraph(text));
  };

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      flushBuffer();
      continue;
    }

    // Si entramos a un encabezado “formal”, reseteamos profundidad numérica
    const resetNumberDepth = () => {
      currentNumberDepth = 0;
    };

    // Bloque de firmas: lo renderizamos como tabla para que quede organizado
    if (trimmed === "[[FIRMAS]]") {
      flushBuffer();
      resetNumberDepth();
      paragraphs.push(buildSignatureTable(values, signatureImageData));
      continue;
    }

    // Viñetas
    const bulletMatch = /^([●•\-])\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      flushBuffer();
      const bulletText = bulletMatch[2].trim();
      paragraphs.push(
        makeListParagraph("•", bulletText, 1),
      );
      continue;
    }

    // Título principal centrado
    if (trimmed.includes("CONTRATO") && trimmed === trimmed.toUpperCase()) {
      flushBuffer();
      resetNumberDepth();
      paragraphs.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),
      );
      continue;
    }

    // “CLÁUSULAS” centrado (caso pedido)
    if (trimmed.toUpperCase() === "CLÁUSULAS") {
      flushBuffer();
      resetNumberDepth();
      paragraphs.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 200 },
        }),
      );
      continue;
    }

    // Encabezados
    if (looksLikeClauseHeading(trimmed) || isAllCapsHeading(trimmed)) {
      flushBuffer();
      resetNumberDepth();
      paragraphs.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 140 },
        }),
      );
      continue;
    }

    // Sub-secciones tipo “5.1 ...” / “12.2 ...” / “3.4.\t...” con jerarquía
    const subsectionMatch =
      /^(\d+(?:\.\d+)+)\.(?:\s+|\t+)(.*)$/.exec(trimmed) ?? /^(\d+(?:\.\d+)+)\s+(.*)$/.exec(trimmed);
    if (subsectionMatch) {
      flushBuffer();
      const label = subsectionMatch[1];
      const rest = subsectionMatch[2].trim();
      currentNumberDepth = Math.max(0, label.split(".").length - 1);
      paragraphs.push(
        new Paragraph({
          children: [run(label, { bold: true }), run(` ${rest}`)],
          alignment: AlignmentType.LEFT,
          indent: { left: baseLeftIndent() },
          spacing: { before: 160, after: 100 },
        }),
      );
      continue;
    }

    // Enumeraciones simples (a), b), i., 1.
    const numberedMatch = /^(\d+)\.(?:\s+|\t+)(.*)$/.exec(trimmed);
    if (numberedMatch) {
      flushBuffer();
      paragraphs.push(makeListParagraph(`${numberedMatch[1]}.`, numberedMatch[2].trim(), 1));
      continue;
    }

    const letterMatch = /^([a-z])\)(?:\s+|\t+)(.*)$/i.exec(trimmed);
    if (letterMatch) {
      flushBuffer();
      paragraphs.push(makeListParagraph(`${letterMatch[1].toLowerCase()})`, letterMatch[2].trim(), 2));
      continue;
    }

    const romanMatch = /^([ivx]+)\.(?:\s+|\t+)(.*)$/i.exec(trimmed);
    if (romanMatch) {
      flushBuffer();
      paragraphs.push(makeListParagraph(`${romanMatch[1].toLowerCase()}.`, romanMatch[2].trim(), 2));
      continue;
    }

    // Texto normal: lo agregamos al buffer para unir líneas
    buffer.push(trimmed);
  }

  flushBuffer();
  return paragraphs;
}

export async function loadContractTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error cargando texto base del contrato: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Procesa bloques condicionales en el texto del contrato antes de parsear.
 *
 * Sintaxis soportada:
 *   [[IF:MODO==pago_total]]   → solo si paymentMode es pago_total / contado
 *   [[IF:MODO==3_cuotas]]     → solo si paymentMode es 3_cuotas
 *   [[IF:MODO==excepcion_2_cuotas]] → solo si paymentMode es excepcion_2_cuotas o 2_cuotas
 *   [[IF:TIENE_RESERVA]]      → solo si reserveAmount tiene valor
 *   [[IF:BONO:BONO_KEY]]      → solo si el array bonuses incluye la clave indicada
 *   [[ENDIF]]                 → cierre del bloque
 *
 * Además, tras procesar condicionales, reemplaza cada ocurrencia del token
 * [[CLAUSULA]] por el ordinal en letras correspondiente (DECIMA TERCERA,
 * DECIMA CUARTA, ...), comenzando en 13, para permitir que al incluir o
 * excluir cláusulas opcionales la numeración se ajuste automáticamente.
 */
const CLAUSULA_ORDINALS: string[] = [
  "DECIMA TERCERA",
  "DECIMA CUARTA",
  "DECIMA QUINTA",
  "DECIMA SEXTA",
  "DECIMA SEPTIMA",
  "DECIMA OCTAVA",
  "DECIMA NOVENA",
  "VIGESIMA",
  "VIGESIMA PRIMERA",
  "VIGESIMA SEGUNDA",
  "VIGESIMA TERCERA",
  "VIGESIMA CUARTA",
];

function normalizeBonoKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * Resuelve una entrada arbitraria (código remoto, nombre o clave canónica) a
 * una o más claves canónicas reconocidas por el template.
 *
 * El catálogo remoto puede usar códigos como "BONO2026-09" o nombres como
 * "Bono de Trafficker"; aquí mapeamos esas variantes a los identificadores
 * canónicos que usan los bloques condicionales del contrato.
 */
function resolveBonoCanonicalKeys(input: string): string[] {
  if (!input) return [];
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  const normalized = normalizeBonoKey(raw);
  const hit = new Set<string>();

  // Mapeo directo por código del catálogo remoto (codigo)
  const CODE_TO_KEY: Record<string, string> = {
    "BONO2026-09": "BONO_TRAFFICKER",
    "BONO2026-07": "BONO_IMPLEMENTACION_TECNICA",
    "BONO2026-01": "BONO_IMPLEMENTACION_TECNICA",
    "BONO2025-04": "BONO_MESES_EXTRA_1",
    "BONO2026-10": "BONO_MESES_EXTRA_1",
    "BONO2025-05": "BONO_MESES_EXTRA_2",
    "BONO2026-02": "BONO_KIT_CORPORATIVO",
    "BONO2025-03": "BONO_AUDITORIA_OFERTAS",
    "BONO2025-06": "BONO_DOS_SESIONES_JAVIER",
    "BONO2026-11": "BONO_DOS_SESIONES_JAVIER",
    "BONO2026-08": "BONO_EDICION_VSL",
    BONO_001: "BONO_1A1_COACH_COPY",
  };
  if (CODE_TO_KEY[upper]) hit.add(CODE_TO_KEY[upper]);

  // La clave pasada ya puede ser canónica
  hit.add(normalized);

  // Heurísticas por nombre (tolerante a acentos/espacios)
  const flat = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (flat.includes("trafficker")) hit.add("BONO_TRAFFICKER");
  if (flat.includes("implementacion tecnica") || flat.includes("implementation tecnica"))
    hit.add("BONO_IMPLEMENTACION_TECNICA");
  if (flat.includes("kit corporativo")) hit.add("BONO_KIT_CORPORATIVO");
  if (flat.includes("auditoria") && flat.includes("oferta")) hit.add("BONO_AUDITORIA_OFERTAS");
  if (flat.includes("edicion") && flat.includes("vsl")) hit.add("BONO_EDICION_VSL");
  if (flat.includes("sesiones") && flat.includes("javier")) hit.add("BONO_DOS_SESIONES_JAVIER");
  if (flat.includes("2 meses extra") || flat.includes("dos meses extra"))
    hit.add("BONO_MESES_EXTRA_2");
  if (flat.includes("1 mes extra") || flat.includes("un mes extra"))
    hit.add("BONO_MESES_EXTRA_1");

  return Array.from(hit).filter(Boolean);
}

function collectBonusCanonicalKeys(bonuses: unknown): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(bonuses)) return out;
  for (const b of bonuses) {
    if (typeof b !== "string") continue;
    for (const k of resolveBonoCanonicalKeys(b)) out.add(k);
  }
  return out;
}

/**
 * Descripción legible de las cláusulas o efectos que cada bono introduce en
 * el contrato. Se usa en la UI para mostrar, junto a cada bono seleccionado,
 * qué secciones del contrato se activarán.
 */
const BONO_CLAUSE_EFFECTS: Record<string, string[]> = {
  BONO_TRAFFICKER: [
    "Agrega bullet en 2.1 (trafficker interno)",
    "Agrega cláusula completa de SERVICIO DE MONTAJE DE CAMPAÑAS",
  ],
  BONO_IMPLEMENTACION_TECNICA: [
    "Agrega cláusula completa de SERVICIO DE IMPLEMENTACIÓN TÉCNICA",
  ],
  BONO_MESES_EXTRA_1: [
    "Extiende la duración del programa a 5 meses",
    "Agrega bullet en 2.1 (1 mes extra de accesos)",
  ],
  BONO_MESES_EXTRA_2: [
    "Extiende la duración del programa a 6 meses",
    "Agrega bullet en 2.1 (2 meses extra de accesos)",
  ],
  BONO_KIT_CORPORATIVO: ["No agrega cláusula al contrato (solo beneficio interno)"],
  BONO_AUDITORIA_OFERTAS: ["No agrega cláusula al contrato (solo beneficio interno)"],
  BONO_DOS_SESIONES_JAVIER: ["No agrega cláusula al contrato (solo beneficio interno)"],
  BONO_EDICION_VSL: ["No agrega cláusula al contrato (servicio bajo acuerdo aparte)"],
  BONO_1A1_COACH_COPY: ["No agrega cláusula al contrato (solo beneficio interno)"],
};

export function describeBonoContractEffects(bono: string): {
  canonicalKeys: string[];
  effects: string[];
} {
  const canonicalKeys = resolveBonoCanonicalKeys(bono);
  const effects: string[] = [];
  for (const key of canonicalKeys) {
    const items = BONO_CLAUSE_EFFECTS[key];
    if (items) effects.push(...items);
  }
  return { canonicalKeys, effects };
}

export function applyConditionalBlocks(text: string, data: Partial<ContractData>): string {
  const mode = String(data.paymentMode ?? "").toLowerCase().trim();
  const hasReserve = !!data.reserveAmount && String(data.reserveAmount).trim() !== "";
  const bonusesNormalized = collectBonusCanonicalKeys(data.bonuses);

  // Bloques [[IF:MODO==valor]] ... [[ENDIF]]
  text = text.replace(
    /\[\[IF:MODO==([^\]]+)\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?/g,
    (_, condition: string, content: string) => {
      const cond = condition.trim().toLowerCase();
      const matches =
        (cond === "pago_total" && (mode === "pago_total" || mode.includes("contado"))) ||
        (cond === "3_cuotas" && mode === "3_cuotas") ||
        (cond === "excepcion_2_cuotas" && (mode === "excepcion_2_cuotas" || mode === "2_cuotas"));
      return matches ? content : "";
    },
  );

  // Bloques [[IF:TIENE_RESERVA]] ... [[ENDIF]]
  text = text.replace(
    /\[\[IF:TIENE_RESERVA\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?/g,
    (_, content: string) => (hasReserve ? content : ""),
  );

  // Bloques [[IF:BONO:KEY]] ... [[ENDIF]]
  text = text.replace(
    /\[\[IF:BONO:([^\]]+)\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?/g,
    (_, condition: string, content: string) => {
      const key = normalizeBonoKey(condition);
      return bonusesNormalized.has(key) ? content : "";
    },
  );

  // Auto-numeración de cláusulas opcionales:
  //   [[CLAUSULA]]          → DECIMA TERCERA, DECIMA CUARTA, ... (anónima)
  //   [[CLAUSULA:NOMBRE]]   → también asigna un ordinal y registra la
  //                           referencia para poder citarla más adelante con
  //                           [[REF:NOMBRE]] (mayúsculas) o [[REF_LOW:NOMBRE]]
  //                           (minúsculas).
  let clausulaIndex = 0;
  const clausulaRefs: Record<string, string> = {};
  text = text.replace(/\[\[CLAUSULA(?::([A-Z0-9_]+))?\]\]/g, (_, name?: string) => {
    const ordinal =
      CLAUSULA_ORDINALS[clausulaIndex] ||
      `CLAUSULA ${clausulaIndex + 13}`;
    clausulaIndex += 1;
    if (name) clausulaRefs[name] = ordinal;
    return ordinal;
  });

  // Resolver referencias a cláusulas numeradas
  text = text.replace(/\[\[REF:([A-Z0-9_]+)\]\]/g, (match, name: string) => {
    return clausulaRefs[name] ?? match;
  });
  text = text.replace(/\[\[REF_LOW:([A-Z0-9_]+)\]\]/g, (match, name: string) => {
    const ordinal = clausulaRefs[name];
    return ordinal ? ordinal.toLowerCase() : match;
  });

  return text;
}

export async function generateContractFromText(
  contractText: string,
  data: Partial<ContractData>,
  filename = "contrato.docx",
): Promise<void> {
  const processedText = applyConditionalBlocks(contractText, data);
  const values = prepareContractData(data);
  let signatureImageData: Uint8Array | null = null;

  try {
    const response = await fetch("/firma_hotselling.png", {
      cache: "force-cache",
    });
    if (response.ok) {
      signatureImageData = new Uint8Array(await response.arrayBuffer());
    }
  } catch {}

  const children = parseContractTextToParagraphs(
    processedText,
    values,
    signatureImageData,
  );

  const doc = new DocxDocument({
    styles: {
      default: {
        document: {
          paragraph: {
            spacing: {
              line: 276, // ~1.15
            },
          },
          run: {
            font: DOC_FONT,
            color: DOC_COLOR,
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// Función para cargar el template desde una URL o archivo
export async function loadTemplateFromUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error cargando template: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

// Función para cargar template desde archivo seleccionado
export async function loadTemplateFromFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo"));
    reader.readAsArrayBuffer(file);
  });
}

// Mapear datos del lead del CRM a ContractData
export function mapLeadToContractData(lead: any, draft?: any): Partial<ContractData> {
  const d = draft || {};
  const sale = lead?.sale && typeof lead.sale === "object" ? lead.sale : {};
  const payment = sale?.payment && typeof sale.payment === "object"
    ? sale.payment
    : lead?.payment || {};
  const contract = sale?.contract && typeof sale.contract === "object"
    ? sale.contract
    : lead?.contract || {};
  const party = contract?.party || {};
  const company = contract?.company || {};
  const primaryPlan = Array.isArray(payment?.plans) ? payment.plans[0] : null;
  const paymentInstallments = payment?.installments || primaryPlan?.installments || {};
  const installmentsSchedule = normalizeInstallmentItems(
    d.paymentInstallmentsSchedule ||
      payment?.installments_schedule ||
      payment?.installments?.schedule ||
      primaryPlan?.installments?.schedule,
  );
  const customInstallments = normalizeInstallmentItems(
    d.paymentCustomInstallments ||
      payment?.custom_installments ||
      primaryPlan?.custom_installments,
  );
  const paymentReserve = payment?.reserve || {};
  const partyName =
    d.contractPartyName ||
    party?.name ||
    lead?.contract_party_name ||
    d.fullName ||
    lead?.name ||
    "";
  const partyEmail =
    d.contractPartyEmail || party?.email || d.email || lead?.email || "";
  const partyPhone =
    d.contractPartyPhone || party?.phone || d.phone || lead?.phone || "";

  // Determinar duración del programa
  const programName = d.program || lead?.program || "HOTSELLING PRO";
  const durationNumber = d.programDurationNumber || lead?.program_duration_number || inferProgramDurationNumber(programName);
  const resolvedInstallmentsCount = (() => {
    const candidates = [
      d.paymentInstallmentsCount,
      paymentInstallments?.count,
      primaryPlan?.installments?.count,
      installmentsSchedule.length || null,
      customInstallments.length || null,
    ];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 3;
  })();
  const resolvedInstallmentAmount =
    d.paymentInstallmentAmount ||
    paymentInstallments?.amount ||
    primaryPlan?.installments?.amount ||
    customInstallments?.[1]?.amount ||
    customInstallments?.[0]?.amount ||
    "";

  return {
    fullName: partyName,
    email: partyEmail,
    phone: partyPhone,
    address: d.contractPartyAddress || party?.address || lead?.contract_party_address || lead?.address || "",
    city: d.contractPartyCity || party?.city || lead?.contract_party_city || lead?.city || "",
    country: d.contractPartyCountry || party?.country || lead?.contract_party_country || lead?.country || "",
    dni: d.contractPartyDocumentId || d.dni || lead?.dni || lead?.contract_party_document_id || lead?.document_id || "",

    isCompany: d.contractIsCompany || contract?.isCompany || lead?.contract_is_company || false,
    companyName: d.contractCompanyName || company?.name || lead?.contract_company_name || "",
    companyTaxId: d.contractCompanyTaxId || company?.taxId || lead?.contract_company_tax_id || "",
    companyAddress: d.contractCompanyAddress || company?.address || lead?.contract_company_address || "",
    companyCity: d.contractCompanyCity || company?.city || lead?.contract_company_city || "",
    companyCountry: d.contractCompanyCountry || company?.country || lead?.contract_company_country || "",

    thirdParty: d.contractThirdParty || contract?.thirdParty || lead?.contract_third_party || false,

    program: d.program || sale?.program || lead?.program || "HOTSELLING PRO",
    programDuration: inferProgramDuration(programName),
    programDurationNumber: durationNumber,
    bonuses: d.bonuses || sale?.bonuses || lead?.bonuses || [],

    paymentMode:
      d.paymentMode ||
      payment?.mode ||
      payment?.plan_type ||
      primaryPlan?.type ||
      lead?.payment_mode ||
      "",
    paymentAmount:
      d.paymentAmount || payment?.amount || primaryPlan?.total || lead?.payment_amount || "",
    paymentPaidAmount:
      d.paymentPaidAmount || payment?.paid_amount || primaryPlan?.paid_amount || "",
    paymentPlatform: d.paymentPlatform || payment?.platform || lead?.payment_platform || "",
    paymentCurrency: "USD",
    installmentsCount: resolvedInstallmentsCount,
    installmentAmount: resolvedInstallmentAmount,
    paymentInstallmentsSchedule: installmentsSchedule,
    paymentCustomInstallments: customInstallments,
    reserveAmount:
      d.paymentReserveAmount ||
      payment?.reserveAmount ||
      paymentReserve?.amount ||
      lead?.payment_reserve_amount ||
      "",
    reservePaidDate: d.reservePaidDate || paymentReserve?.paid_date || "",
    reserveRemainingDueDate: d.reserveRemainingDueDate || paymentReserve?.remaining_due_date || "",
    nextChargeDate: d.nextChargeDate || payment?.nextChargeDate || lead?.next_charge_date || "",

    contractDate: new Date().toISOString(),
    startDate: d.startDate || lead?.start_date || lead?.program_start_date || "",
    closerName: lead?.closer?.name || lead?.closer_name || "",
    closerEmail: lead?.closer?.email || "",
    notes: d.notes || sale?.notes || lead?.sale_notes || "",

    // Firmantes extra
    extraSigners: (() => {
      const candidates = [
        d.contractParties,
        contract?.parties,
        lead?.contract_parties,
      ];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }
      return [];
    })(),
  };
}

function inferProgramDuration(program?: string): string {
  const p = String(program || "").toLowerCase();
  if (p.includes("pro")) return "cuatro (4) meses";
  if (p.includes("foundation")) return "dos (2) meses";
  return "cuatro (4) meses";
}

function inferProgramDurationNumber(program?: string): number {
  const p = String(program || "").toLowerCase();
  if (p.includes("pro")) return 4;
  if (p.includes("foundation")) return 2;
  return 4;
}
