"use client";

// Helper para escapar HTML
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convierte un markdown simple a HTML seguro básico
export function simpleMarkdownToHtml(md: string): string {
  try {
    let html = escapeHtml(md);
    // Negritas **texto**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Quitar separadores '---' de frontmatter si vienen al inicio
    html = html.replace(/^---\s*\n/, "");
    // Saltos de línea dobles -> párrafos
    html = html
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    return html;
  } catch {
    return escapeHtml(md).replace(/\n/g, "<br/>");
  }
}

// Parsea el contenido de IA a un objeto estructurado
export function parseAiContent(md: string): {
  titulo?: string;
  descripcion?: string;
  prioridad?: string;
  categoria?: string;
  html?: string;
} {
  try {
    const clean = md.replace(/^---\s*\n/, "");
    const out: any = {};
    const lines = clean.split(/\n/);
    for (const ln of lines) {
      const m = ln.match(/^\*\*(.+?):\*\*\s*(.+)$/);
      if (m) {
        const key = m[1].trim().toLowerCase();
        const val = m[2].trim();
        if (key === "título" || key === "titulo") out.titulo = val;
        if (key === "descripción" || key === "descripcion") out.descripcion = val;
        if (key === "prioridad") out.prioridad = val;
        if (key === "categoría" || key === "categoria") out.categoria = val;
      }
    }
    out.html = simpleMarkdownToHtml(md);
    return out;
  } catch {
    return { html: simpleMarkdownToHtml(md) };
  }
}

// Formatea bytes a un string legible
export const formatBytes = (bytes?: number): string => {
  try {
    const b = typeof bytes === "number" && isFinite(bytes) ? bytes : 0;
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  } catch {
    return String(bytes ?? "-");
  }
};

// Formatea un string de fecha ISO a hora local
export const formatTime = (iso: string | undefined): string => {
  try {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};
