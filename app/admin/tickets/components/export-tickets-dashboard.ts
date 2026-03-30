export type DashboardKvRow = {
  metrica: string;
  valor: string | number;
};

export type DashboardDistRow = {
  etiqueta: string;
  cantidad: number;
  porcentaje: string;
};

export type DashboardDateRow = {
  fecha: string;
  tickets: number;
};

export type DashboardFilterRow = {
  filtro: string;
  valor: string | number;
};

export type DashboardExportPayload = {
  summaryRows: DashboardKvRow[];
  estadoRows: DashboardDistRow[];
  tipoRows: DashboardDistRow[];
  topAlumnosRows: DashboardDistRow[];
  topInformantesRows: DashboardDistRow[];
  diaRows: DashboardDateRow[];
  filterRows: DashboardFilterRow[];
  fileName: string;
};

const COLORS = {
  bgTitle: "FF0B3C5D",
  bgSection: "FF1D4E89",
  bgHeader: "FFE8F1FB",
  bgAlt: "FFF7FAFF",
  textTitle: "FFFFFFFF",
  textDark: "FF102A43",
  border: "FFB8C5D6",
};

function styleTableHeader(row: any) {
  row.eachCell((cell: any) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.bgHeader },
    };
    cell.font = { bold: true, color: { argb: COLORS.textDark } };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

function styleTableBody(row: any, alternate: boolean) {
  row.eachCell((cell: any) => {
    cell.fill = alternate
      ? {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.bgAlt },
        }
      : undefined;
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.font = { color: { argb: COLORS.textDark } };
  });
}

function writeSectionTitle(ws: any, rowNumber: number, title: string) {
  ws.mergeCells(`A${rowNumber}:F${rowNumber}`);
  const cell = ws.getCell(`A${rowNumber}`);
  cell.value = title;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.bgSection },
  };
  cell.font = { bold: true, color: { argb: COLORS.textTitle }, size: 12 };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(rowNumber).height = 22;
}

function downloadBuffer(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportTicketsDashboardExcel(payload: DashboardExportPayload) {
  const exceljsModule: any = await import("exceljs");
  const ExcelJS = exceljsModule?.default ?? exceljsModule;

  if (!ExcelJS?.Workbook) {
    throw new Error("No se pudo inicializar ExcelJS");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Academia Plataforma";
  wb.created = new Date();

  const ws = wb.addWorksheet("Dashboard", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 30 },
    { width: 16 },
    { width: 16 },
  ];

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "Dashboard de tickets";
  ws.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.bgTitle },
  };
  ws.getCell("A1").font = { size: 16, bold: true, color: { argb: COLORS.textTitle } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `Generado: ${new Date().toLocaleString("es-ES")}`;
  ws.getCell("A2").font = { size: 10, color: { argb: "FF486581" } };
  ws.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };

  let row = 4;
  writeSectionTitle(ws, row, "Resumen general");
  row += 1;

  const summaryHeader = ws.addRow(["Metrica", "Valor", "", "Filtro", "Valor", ""]);
  styleTableHeader(summaryHeader);
  const maxSummary = Math.max(payload.summaryRows.length, payload.filterRows.length);

  for (let i = 0; i < maxSummary; i += 1) {
    const s = payload.summaryRows[i];
    const f = payload.filterRows[i];
    const dataRow = ws.addRow([
      s?.metrica ?? "",
      s?.valor ?? "",
      "",
      f?.filtro ?? "",
      f?.valor ?? "",
      "",
    ]);
    styleTableBody(dataRow, i % 2 === 1);
  }

  row = ws.lastRow.number + 2;
  writeSectionTitle(ws, row, "Top y distribuciones");
  row += 1;

  const topHeader = ws.addRow([
    "Top alumnos",
    "Cantidad",
    "%",
    "Top informantes",
    "Cantidad",
    "%",
  ]);
  styleTableHeader(topHeader);

  const maxTop = Math.max(payload.topAlumnosRows.length, payload.topInformantesRows.length);
  for (let i = 0; i < maxTop; i += 1) {
    const a = payload.topAlumnosRows[i];
    const inf = payload.topInformantesRows[i];
    const dataRow = ws.addRow([
      a?.etiqueta ?? "",
      a?.cantidad ?? "",
      a?.porcentaje ?? "",
      inf?.etiqueta ?? "",
      inf?.cantidad ?? "",
      inf?.porcentaje ?? "",
    ]);
    styleTableBody(dataRow, i % 2 === 1);
  }

  row = ws.lastRow.number + 2;
  writeSectionTitle(ws, row, "Estados acumulado y tipos acumulado");
  row += 1;

  const distHeader = ws.addRow([
    "Estados acumulado",
    "Cantidad",
    "%",
    "Tipos acumulado",
    "Cantidad",
    "%",
  ]);
  styleTableHeader(distHeader);

  const maxDist = Math.max(payload.estadoRows.length, payload.tipoRows.length);
  for (let i = 0; i < maxDist; i += 1) {
    const e = payload.estadoRows[i];
    const t = payload.tipoRows[i];
    const dataRow = ws.addRow([
      e?.etiqueta ?? "",
      e?.cantidad ?? "",
      e?.porcentaje ?? "",
      t?.etiqueta ?? "",
      t?.cantidad ?? "",
      t?.porcentaje ?? "",
    ]);
    styleTableBody(dataRow, i % 2 === 1);
  }

  row = ws.lastRow.number + 2;
  writeSectionTitle(ws, row, "Serie diaria");
  row += 1;

  const dayHeader = ws.addRow(["Fecha", "Tickets", "", "", "", ""]);
  styleTableHeader(dayHeader);

  payload.diaRows.forEach((d, idx) => {
    const dataRow = ws.addRow([d.fecha, d.tickets, "", "", "", ""]);
    styleTableBody(dataRow, idx % 2 === 1);
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBuffer(buf as ArrayBuffer, payload.fileName);
}
