type KvRow = {
  metrica: string;
  valor: string | number;
};

type DistRow = {
  etiqueta: string;
  cantidad: number;
  porcentaje: string;
};

type MonthRow = {
  mes: string;
  activos: number;
  tickets: number;
};

type StageRow = {
  fase: string;
  alumnosActivos: number;
};

type FilterRow = {
  filtro: string;
  valor: string | number;
};

export type ExportMetricasNuevaPayload = {
  fileName: string;
  resumen: KvRow[];
  filtros: FilterRow[];
  meses: MonthRow[];
  fases: StageRow[];
  topAlumnos: DistRow[];
  topInformantes: DistRow[];
  estados: DistRow[];
  tipos: DistRow[];
};

const COLORS = {
  title: "FF0F3D5E",
  section: "FF1E5B8C",
  header: "FFEAF2FB",
  alt: "FFF8FBFF",
  textLight: "FFFFFFFF",
  textDark: "FF102A43",
  border: "FFB8C5D6",
};

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

function styleHeaderRow(row: any) {
  row.eachCell((cell: any) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.header },
    };
    cell.font = { bold: true, color: { argb: COLORS.textDark } };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  });
}

function styleBodyRow(row: any, alternate: boolean) {
  row.eachCell((cell: any) => {
    if (alternate) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.alt },
      };
    }
    cell.font = { color: { argb: COLORS.textDark } };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  });
}

function sectionTitle(ws: any, row: number, title: string) {
  ws.mergeCells(`A${row}:F${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = title;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.section },
  };
  cell.font = { bold: true, size: 12, color: { argb: COLORS.textLight } };
  ws.getRow(row).height = 22;
}

export async function exportMetricasNuevaExcel(payload: ExportMetricasNuevaPayload) {
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
    { width: 32 },
    { width: 16 },
    { width: 16 },
    { width: 32 },
    { width: 16 },
    { width: 16 },
  ];

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "Metrica Nueva - Dashboard";
  ws.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.title },
  };
  ws.getCell("A1").font = { size: 16, bold: true, color: { argb: COLORS.textLight } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `Generado: ${new Date().toLocaleString("es-ES")}`;
  ws.getCell("A2").font = { size: 10, color: { argb: "FF486581" } };

  let row = 4;
  sectionTitle(ws, row, "Resumen y filtros");
  row += 1;

  styleHeaderRow(ws.addRow(["Metrica", "Valor", "", "Filtro", "Valor", ""]));

  const maxInfo = Math.max(payload.resumen.length, payload.filtros.length);
  for (let i = 0; i < maxInfo; i += 1) {
    const m = payload.resumen[i];
    const f = payload.filtros[i];
    styleBodyRow(
      ws.addRow([
        m?.metrica ?? "",
        m?.valor ?? "",
        "",
        f?.filtro ?? "",
        f?.valor ?? "",
        "",
      ]),
      i % 2 === 1,
    );
  }

  row = ws.lastRow.number + 2;
  sectionTitle(ws, row, "Meses activos y fases");
  row += 1;

  styleHeaderRow(ws.addRow(["Mes", "Activos", "Tickets", "Fase", "Activos", ""]));
  const maxMF = Math.max(payload.meses.length, payload.fases.length);
  for (let i = 0; i < maxMF; i += 1) {
    const m = payload.meses[i];
    const f = payload.fases[i];
    styleBodyRow(
      ws.addRow([
        m?.mes ?? "",
        m?.activos ?? "",
        m?.tickets ?? "",
        f?.fase ?? "",
        f?.alumnosActivos ?? "",
        "",
      ]),
      i % 2 === 1,
    );
  }

  row = ws.lastRow.number + 2;
  sectionTitle(ws, row, "Top y distribuciones");
  row += 1;
  styleHeaderRow(
    ws.addRow([
      "Top alumnos",
      "Cantidad",
      "%",
      "Top informantes",
      "Cantidad",
      "%",
    ]),
  );

  const maxTop = Math.max(payload.topAlumnos.length, payload.topInformantes.length);
  for (let i = 0; i < maxTop; i += 1) {
    const a = payload.topAlumnos[i];
    const inf = payload.topInformantes[i];
    styleBodyRow(
      ws.addRow([
        a?.etiqueta ?? "",
        a?.cantidad ?? "",
        a?.porcentaje ?? "",
        inf?.etiqueta ?? "",
        inf?.cantidad ?? "",
        inf?.porcentaje ?? "",
      ]),
      i % 2 === 1,
    );
  }

  row = ws.lastRow.number + 2;
  sectionTitle(ws, row, "Estados acumulado y tipos acumulado");
  row += 1;
  styleHeaderRow(
    ws.addRow([
      "Estado",
      "Cantidad",
      "%",
      "Tipo",
      "Cantidad",
      "%",
    ]),
  );

  const maxET = Math.max(payload.estados.length, payload.tipos.length);
  for (let i = 0; i < maxET; i += 1) {
    const e = payload.estados[i];
    const t = payload.tipos[i];
    styleBodyRow(
      ws.addRow([
        e?.etiqueta ?? "",
        e?.cantidad ?? "",
        e?.porcentaje ?? "",
        t?.etiqueta ?? "",
        t?.cantidad ?? "",
        t?.porcentaje ?? "",
      ]),
      i % 2 === 1,
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, payload.fileName);
}
