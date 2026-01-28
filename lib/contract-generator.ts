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
  paymentPlatform?: string;
  paymentCurrency?: string;
  installmentsCount?: number;
  installmentAmount?: string;
  reserveAmount?: string;
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
  const installmentNum = parseFloat(String(data.installmentAmount || "0").replace(/[^0-9.]/g, ""));
  const reserveNum = parseFloat(String(data.reserveAmount || "0").replace(/[^0-9.]/g, ""));
  const durationNum = data.programDurationNumber || 4;

  // Bonuses como texto
  const bonusesText = Array.isArray(data.bonuses) && data.bonuses.length > 0
    ? data.bonuses.join(", ")
    : data.bonusesText || "—";

  // Modalidad de pago formateada
  const paymentModeText = (() => {
    const mode = String(data.paymentMode || "").toLowerCase();
    if (mode.includes("contado") || mode === "pago_total") return "Pago único (contado)";
    if (mode.includes("cuota")) {
      const count = data.installmentsCount || 3;
      return `${count} cuotas de ${formatCurrency(data.installmentAmount, data.paymentCurrency)}`;
    }
    if (mode.includes("reserva")) return `Reserva + saldo`;
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
    DURACION_PROGRAMA: data.programDuration || "cuatro (4) meses",
    DURACION_NUMERO: String(durationNum),
    DURACION_TEXTO: durationText,
    BONOS: bonusesText,

    // Pago
    MODALIDAD_PAGO: paymentModeText,
    MONTO_TOTAL: formatCurrency(data.paymentAmount, data.paymentCurrency),
    MONTO_TOTAL_NUMERO: paymentNum.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    MONTO_TOTAL_LETRAS: numberToWords(Math.floor(paymentNum)) + " dólares estadounidenses",
    PLATAFORMA_PAGO: data.paymentPlatform || "Por definir",
    MONEDA: data.paymentCurrency || "USD",
    NUM_CUOTAS: String(data.installmentsCount || "—"),
    MONTO_CUOTA: formatCurrency(data.installmentAmount, data.paymentCurrency),
    MONTO_RESERVA: formatCurrency(data.reserveAmount, data.paymentCurrency),
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

function buildSignatureTable(values: Record<string, string>): Table {
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
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noCellBorders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [run("JAVIER MIRANDA", { bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [run("MHF GROUP LLC", { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
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
      }),
    ],
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
      spacing: { after: 180 },
    });

  const makeListParagraph = (label: string, text: string, extraIndentLevels: number) => {
    const left = baseLeftIndent() + INDENT_PER_LEVEL * Math.max(1, extraIndentLevels);
    return new Paragraph({
      children: [run(label ? `${label} ` : ""), run(text)],
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
      paragraphs.push(buildSignatureTable(values));
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
          alignment: AlignmentType.JUSTIFIED,
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
          children: [run(`${label} ${rest}`, { bold: true })],
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: baseLeftIndent() },
          spacing: { before: 160, after: 120 },
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

export async function generateContractFromText(
  contractText: string,
  data: Partial<ContractData>,
  filename = "contrato.docx",
): Promise<void> {
  const values = prepareContractData(data);
  const children = parseContractTextToParagraphs(contractText, values);

  const doc = new DocxDocument({
    styles: {
      default: {
        document: {
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
        properties: {},
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
  const payment = lead?.payment || {};
  const contract = lead?.contract || {};
  const party = contract?.party || {};
  const company = contract?.company || {};

  // Determinar duración del programa
  const programName = d.program || lead?.program || "HOTSELLING PRO";
  const durationNumber = d.programDurationNumber || lead?.program_duration_number || inferProgramDurationNumber(programName);

  return {
    fullName: d.fullName || lead?.name || "",
    email: d.email || lead?.email || "",
    phone: d.phone || lead?.phone || "",
    address: d.contractPartyAddress || party?.address || lead?.contract_party_address || "",
    city: d.contractPartyCity || party?.city || lead?.contract_party_city || "",
    country: d.contractPartyCountry || party?.country || lead?.contract_party_country || "",
    dni: d.dni || lead?.dni || lead?.document_id || "",

    isCompany: d.contractIsCompany || contract?.isCompany || lead?.contract_is_company || false,
    companyName: d.contractCompanyName || company?.name || lead?.contract_company_name || "",
    companyTaxId: d.contractCompanyTaxId || company?.taxId || lead?.contract_company_tax_id || "",
    companyAddress: d.contractCompanyAddress || company?.address || lead?.contract_company_address || "",
    companyCity: d.contractCompanyCity || company?.city || lead?.contract_company_city || "",
    companyCountry: d.contractCompanyCountry || company?.country || lead?.contract_company_country || "",

    thirdParty: d.contractThirdParty || contract?.thirdParty || lead?.contract_third_party || false,

    program: programName,
    programDuration: inferProgramDuration(programName),
    programDurationNumber: durationNumber,
    bonuses: d.bonuses || lead?.bonuses || [],

    paymentMode: d.paymentMode || payment?.mode || lead?.payment_mode || "",
    paymentAmount: d.paymentAmount || payment?.amount || lead?.payment_amount || "",
    paymentPlatform: d.paymentPlatform || payment?.platform || lead?.payment_platform || "",
    paymentCurrency: "USD",
    installmentsCount: d.paymentInstallmentsCount || payment?.installments?.count || 3,
    installmentAmount: d.paymentInstallmentAmount || payment?.installments?.amount || "",
    reserveAmount: d.paymentReserveAmount || payment?.reserveAmount || lead?.payment_reserve_amount || "",
    nextChargeDate: d.nextChargeDate || payment?.nextChargeDate || lead?.next_charge_date || "",

    contractDate: new Date().toISOString(),
    startDate: d.startDate || lead?.start_date || lead?.program_start_date || "",
    closerName: lead?.closer?.name || lead?.closer_name || "",
    notes: d.notes || lead?.sale_notes || "",
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
