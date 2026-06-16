'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface VTTLine {
  start: string;
  end: string;
  text: string;
}

function parseVTT(content: string): VTTLine[] {
  const lines = content.split('\n');
  const result: VTTLine[] = [];
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim());
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        text += (text ? ' ' : '') + lines[i].trim();
        i++;
      }
      if (text) {
        result.push({ start, end, text });
      }
    } else {
      i++;
    }
  }
  return result;
}

function formatVTTTime(time: string): string {
  // Convert 00:00:00.000 to 0:00
  const parts = time.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0]);
    const m = parts[1];
    const s = parts[2].split('.')[0];
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }
  return time;
}

interface VTTViewerProps {
  url: string;
  onClose: () => void;
}

export function VTTViewer({ url, onClose }: VTTViewerProps) {
  const [lines, setLines] = useState<VTTLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(content => {
        setLines(parseVTT(content));
        setLoading(false);
      })
      .catch(err => {
        setError('Error al cargar la transcripción');
        setLoading(false);
      });
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Transcripción</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : lines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No se encontró contenido</div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap mt-0.5">
                    {formatVTTTime(line.start)}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
