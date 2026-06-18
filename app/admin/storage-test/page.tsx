'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image as ImageIcon,
  X,
  Video,
  Clock,
  Download,
  FileText,
  Film,
  Headphones,
  Loader2,
  RefreshCw,
  Search,
  Zap,
  Play,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Users as UsersIcon,
  Building,
} from 'lucide-react';

// ─── Bunny Upload Section ────────────────────────────────────────────────────

function BunnyUploadSection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; path: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Solo puedes subir imágenes');
      return;
    }
    setFile(selectedFile);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Selecciona una imagen primero'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/bunny-test', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error al subir'); return; }
      setResult(data);
      toast.success('Imagen subida correctamente!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type.startsWith('image/')) {
      const input = document.getElementById('file-input') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      toast.error('Solo puedes subir imágenes');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Bunny Storage</h2>
        <p className="text-sm text-muted-foreground">Sube una imagen para verificar la conexión con Bunny CDN</p>
      </div>
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input id="file-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        {preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto" />
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); }}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Arrastra una imagen aquí o haz clic para seleccionar</p>
            <p className="text-sm opacity-70">PNG, JPG, GIF hasta 10MB</p>
          </div>
        )}
      </div>
      {file && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      )}
      <button onClick={handleUpload} disabled={!file || loading}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
        {loading ? 'Subiendo...' : 'Subir imagen a Bunny'}
      </button>
      {result && (
        <div className="p-4 border rounded-lg bg-muted">
          <h3 className="font-semibold mb-3">Resultado:</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Path:</p>
              <code className="text-xs bg-background px-2 py-1 rounded block">{result.path}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">URL pública:</p>
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{result.url}</a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
              <img src={result.url} alt="Uploaded" className="max-h-48 rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Zoom Section ────────────────────────────────────────────────────────────

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

interface ZoomRecording {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function getFileIcon(type: string) {
  if (type.includes('audio')) return Headphones;
  if (type.includes('video') || type.includes('mp4')) return Film;
  if (type.includes('transcript') || type.includes('vtt')) return FileText;
  if (type.includes('chat')) return MessageSquare;
  return Video;
}

interface UserWithRecordings {
  user_id: string;
  user_email: string;
  user_name: string;
  user_type: number;
  meetings_count: number;
  transcripts_count: number;
  meetings: ZoomRecording[];
  transcripts: any[];
}

function ZoomSection() {
  const [connected, setConnected] = useState(false);
  const [usersData, setUsersData] = useState<UserWithRecordings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<UserWithRecordings | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<ZoomRecording | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/zoom/recordings?pageSize=1');
      if (res.ok) { setConnected(true); loadData(); }
      else setConnected(false);
    } catch { setConnected(false); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(`/api/zoom/global-recordings?${params}`);
      if (!res.ok) throw new Error('Error loading data');
      const data = await res.json();
      setUsersData(data.users || []);
      setConnected(true);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { checkConnection(); }, []);

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar de Zoom?')) return;
    await fetch('/api/zoom/disconnect', { method: 'POST' });
    setConnected(false);
    setUsersData([]);
    setSelectedUser(null);
    toast.success('Zoom desconectado');
  };

  const filtered = usersData.filter((u) => {
    if (!searchText.trim()) return true;
    const s = searchText.toLowerCase();
    return u.user_email?.toLowerCase().includes(s) || u.user_name?.toLowerCase().includes(s);
  });

  const totalRecordings = usersData.reduce((a, u) => a + u.meetings_count, 0);
  const totalTranscripts = usersData.reduce((a, u) => a + u.transcripts_count, 0);

  // Vista detalle de usuario
  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <button onClick={() => { setSelectedUser(null); setSelectedRecording(null); }}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">← Volver</button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{selectedUser.user_name}</h2>
            <p className="text-sm text-slate-500">{selectedUser.user_email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <p className="text-xs font-semibold text-blue-600 uppercase">Grabaciones</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{selectedUser.meetings_count}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Transcripciones</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{selectedUser.transcripts_count}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-500" /> Grabaciones
          </h3>
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {selectedUser.meetings.map((rec) => (
              <div key={rec.id} onClick={() => setSelectedRecording(selectedRecording?.id === rec.id ? null : rec)}
                className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedRecording?.id === rec.id ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{rec.topic}</div>
                    <div className="text-sm text-slate-500 mt-1">{formatDate(rec.start_time)} · {formatDuration(rec.duration)} · {rec.recording_count} archivos</div>
                  </div>
                  <Play className={`h-5 w-5 ${selectedRecording?.id === rec.id ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                {selectedRecording?.id === rec.id && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {rec.recording_files.map((file) => {
                      const Icon = getFileIcon(file.recording_type);
                      const isTranscript = isTranscriptFile(file);
                      return (
                        <div key={file.id} className={`rounded-xl border p-3 ${isTranscript ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-4 w-4 ${isTranscript ? 'text-emerald-600' : 'text-blue-600'}`} />
                            <div className="text-xs font-medium text-slate-800 truncate">{file.recording_type?.replace(/_/g, ' ')}</div>
                          </div>
                          <div className="text-[10px] text-slate-400 mb-2">{file.file_type} · {formatFileSize(file.file_size)}</div>
                              <a href={zoomDownloadProxy(file.download_url, `${file.recording_type || 'file'}.${file.file_type?.toLowerCase() || 'bin'}`)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                            className={`flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg text-xs font-medium ${isTranscript ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                            {isTranscript ? <FileText className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                            {isTranscript ? 'Ver' : 'Descargar'}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista principal - lista de usuarios
  if (!connected) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-lg font-bold">Grabaciones</h2><p className="text-sm text-slate-500">Conecta tu cuenta Zoom para ver las grabaciones</p></div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Video className="h-16 w-16 text-slate-300" />
          <p className="text-sm text-slate-500">No hay conexión con Zoom</p>
          <a href="/api/zoom/auth?returnTo=/admin/storage-test"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Conectar con Zoom
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Grabaciones por Usuario</h2>
          <p className="text-sm text-slate-500 mt-1">Selecciona un usuario para ver sus grabaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
          </button>
          <button onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
            <X className="h-4 w-4" /> Desconectar
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase">Usuarios con grabaciones</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{usersData.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-white p-5">
          <p className="text-xs font-semibold text-violet-600 uppercase">Total grabaciones</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{totalRecordings}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Total transcripciones</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{totalTranscripts}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Desde:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Hasta:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={loadData} disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          Buscar
        </button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar usuario..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
          <Video className="h-20 w-20 text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-500">No hay grabaciones</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map((user) => (
            <div key={user.user_id} onClick={() => setSelectedUser(user)}
              className="px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{user.user_name}</div>
                <div className="text-sm text-slate-500">{user.user_email}</div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.meetings_count}</div>
                  <div className="text-xs text-slate-500">grabaciones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{user.transcripts_count}</div>
                  <div className="text-xs text-slate-500">transcripciones</div>
                </div>
              </div>
              <Play className="h-5 w-5 text-slate-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Zoom Transcripts Section ────────────────────────────────────────────────

interface TranscriptFile {
  id: string;
  meetingId: string;
  meetingTopic: string;
  recordingType: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  recordingStart: string;
  user_email?: string;
  user_name?: string;
}

function isTranscriptFile(file: { recording_type?: string; file_type?: string }): boolean {
  const rt = (file.recording_type || '').toLowerCase();
  const ft = (file.file_type || '').toUpperCase();
  return (
    rt.includes('transcript') ||
    rt === 'audio_transcript' ||
    ft === 'TRANSCRIPT' ||
    ft === 'CC' ||
    ft === 'VTT'
  );
}

function zoomDownloadProxy(downloadUrl: string, filename: string): string {
  const params = new URLSearchParams({ url: downloadUrl, filename });
  return `/api/zoom/download?${params}`;
}

function ZoomTranscriptsSection() {
  const [connected, setConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(0, 1); // 1 de enero del año actual
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [previewTranscript, setPreviewTranscript] = useState<TranscriptFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/zoom/recordings');
      if (res.ok) setConnected(true);
      else setConnected(false);
    } catch { setConnected(false); }
  }, []);

  const loadTranscripts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(`/api/zoom/global-recordings?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error loading transcripts');
      }
      const data = await res.json();
      const allTranscripts: TranscriptFile[] = [];
      for (const user of (data.users || [])) {
        for (const t of (user.transcripts || [])) {
          allTranscripts.push({
            id: t.id,
            meetingId: t.meeting_id,
            meetingTopic: t.meeting_topic,
            recordingType: t.recording_type,
            fileType: t.file_type,
            fileSize: t.file_size,
            downloadUrl: t.download_url,
            recordingStart: t.meeting_start,
            user_email: user.user_email,
            user_name: user.user_name,
          });
        }
      }
      setTranscripts(allTranscripts);
      setConnected(true);
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('tokens')) setConnected(false);
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar de Zoom? Se borrarán los tokens de acceso.')) return;
    try {
      await fetch('/api/zoom/disconnect', { method: 'POST' });
      setConnected(false);
      setTranscripts([]);
      setPreviewTranscript(null);
      toast.success('Zoom desconectado');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  const vttToTxt = (vtt: string): string => {
    return vtt
      .split('\n')
      .filter((line) => {
        if (line.startsWith('WEBVTT')) return false;
        if (line.startsWith('Kind:') || line.startsWith('Language:')) return false;
        if (/^\d+$/.test(line.trim())) return false;
        if (/^\d{2}:\d{2}:\d{2}/.test(line.trim())) return false;
        if (line.trim() === '') return false;
        return true;
      })
      .map((line) => line.replace(/<[^>]+>/g, '').trim())
      .filter((line) => line.length > 0)
      .join('\n');
  };

  const handlePreview = async (t: TranscriptFile) => {
    setPreviewTranscript(t);
    setPreviewContent(null);
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams({ url: t.downloadUrl, filename: `${t.meetingTopic || 'transcript'}.vtt` });
      const res = await fetch(`/api/zoom/download?${params}`);
      const text = await res.text();
      setPreviewContent(text);
    } catch {
      setPreviewContent('Error al cargar la transcripción');
    } finally { setLoadingPreview(false); }
  };

  const handleDownloadTxt = async (t: TranscriptFile) => {
    try {
      const params = new URLSearchParams({ url: t.downloadUrl, filename: `${t.meetingTopic || 'transcript'}.vtt` });
      const res = await fetch(`/api/zoom/download?${params}`);
      const vtt = await res.text();
      const txt = vttToTxt(vtt);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.meetingTopic || 'transcript'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Descargado como TXT');
    } catch {
      toast.error('Error al descargar');
    }
  };

  const filtered = transcripts.filter((t) => {
    if (!searchText.trim()) return true;
    const search = searchText.toLowerCase();
    return (
      t.meetingTopic?.toLowerCase().includes(search) ||
      t.user_email?.toLowerCase().includes(search) ||
      t.user_name?.toLowerCase().includes(search)
    );
  });

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold mb-1">Transcripciones Zoom</h2>
          <p className="text-sm text-muted-foreground">Conecta tu cuenta Zoom para ver las transcripciones</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <FileText className="h-16 w-16 text-emerald-500" />
          <p className="text-sm text-muted-foreground">No hay conexión con Zoom</p>
          <a href="/api/zoom/auth?returnTo=/admin/storage-test"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Conectar con Zoom
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold mb-1">Transcripciones Zoom</h2>
          <p className="text-sm text-muted-foreground">Archivos de transcripción VTT generados automáticamente por Zoom en la nube</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadTranscripts} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Cargar transcripciones
          </button>
          <button onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            <X className="h-4 w-4" /> Desconectar
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transcripciones</p>
            <FileText className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{transcripts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reuniones con transcripción</p>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{new Set(transcripts.map(t => t.meetingId)).size}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tamaño total</p>
            <Download className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatFileSize(transcripts.reduce((a, t) => a + t.fileSize, 0))}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900">Lista de Transcripciones ({filtered.length})</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Desde:</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Hasta:</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={loadTranscripts} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Buscar
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por tema o usuario..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{searchText ? 'No se encontraron transcripciones' : 'No hay transcripciones disponibles'}</p>
            <p className="text-xs text-slate-400 mt-1">Las transcripciones se generan automáticamente cuando Grabación en la nube está habilitada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Reunión</th>
                  <th className="px-4 py-3 text-left font-medium">Usuario</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Tamaño</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{t.meetingTopic}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{t.user_email || '-'}</div>
                      <div className="text-[10px] text-slate-400">{t.user_name || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{formatDate(t.recordingStart)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatFileSize(t.fileSize)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handlePreview(t)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                          Ver
                        </button>
                        <button onClick={() => handleDownloadTxt(t)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                          Descargar TXT
                        </button>
                        <a href={`/api/zoom/download?url=${encodeURIComponent(t.downloadUrl)}&filename=${encodeURIComponent(t.meetingTopic || 'transcript')}.vtt`}
                          className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors">
                          Descargar VTT
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewTranscript && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{previewTranscript.meetingTopic}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{formatDate(previewTranscript.recordingStart)} · {previewTranscript.fileType}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDownloadTxt(previewTranscript)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                Descargar TXT
              </button>
              <button onClick={() => setPreviewTranscript(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contenido VTT</h5>
            {loadingPreview ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
            ) : (
              <pre className="text-xs text-slate-700 max-h-96 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                {previewContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Zoom Users Section ──────────────────────────────────────────────────────

interface ZoomUserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  type: number;
  role_name: string;
  status: string;
  pmi: number;
  timezone: string;
  created_at: string;
  last_login_time: string;
  plan_type: string;
}

interface SubAccount {
  id: string;
  account_name: string;
  account_number: string;
  owner_email: string;
  subscription_type: number;
}

function ZoomUsersSection() {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<ZoomUserItem[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [viewType, setViewType] = useState<'users' | 'subaccounts'>('users');
  const [note, setNote] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ZoomUserItem | null>(null);
  const [userRecordings, setUserRecordings] = useState<ZoomRecording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<ZoomRecording | null>(null);
  const [userDateFrom, setUserDateFrom] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [userDateTo, setUserDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/zoom/recordings?pageSize=1');
      if (res.ok) {
        setConnected(true);
        loadUsers();
      } else {
        setConnected(false);
      }
    } catch { setConnected(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      if (viewType === 'subaccounts') {
        const res = await fetch('/api/zoom/users?type=subaccounts');
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error loading sub-accounts');
        }
        const data = await res.json();
        setSubAccounts(data.accounts || []);
        if (data.error) setNote(data.error);
      } else {
        const res = await fetch('/api/zoom/users?page_size=100');
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error loading users');
        }
        const data = await res.json();
        setUsers(data.users || []);
        if (data.note) setNote(data.note);
        if (data.error) setNote(data.error);
      }
      setConnected(true);
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('tokens')) setConnected(false);
    } finally { setLoading(false); }
  }, [viewType]);

  useEffect(() => { checkConnection(); }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchText.trim()) return true;
    const search = searchText.toLowerCase();
    return (
      u.email?.toLowerCase().includes(search) ||
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.display_name?.toLowerCase().includes(search)
    );
  });

  const filteredAccounts = subAccounts.filter((a) => {
    if (!searchText.trim()) return true;
    const search = searchText.toLowerCase();
    return (
      a.account_name?.toLowerCase().includes(search) ||
      a.owner_email?.toLowerCase().includes(search)
    );
  });

  const getUserTypeLabel = (type: number) => {
    switch (type) {
      case 1: return 'Admin';
      case 2: return 'Pro';
      case 3: return 'Basic';
      default: return `Tipo ${type}`;
    }
  };

  const handleSelectUser = async (user: ZoomUserItem, from?: string, to?: string) => {
    setSelectedUser(user);
    setUserRecordings([]);
    setSelectedRecording(null);
    setLoadingRecordings(true);
    try {
      const dateFrom = from || userDateFrom;
      const dateTo = to || userDateTo;
      const res = await fetch(`/api/zoom/recordings?userId=${user.id}&pageSize=100&from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setUserRecordings(data.meetings || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handleUserDateFilter = () => {
    if (selectedUser) {
      handleSelectUser(selectedUser, userDateFrom, userDateTo);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/zoom/disconnect', { method: 'POST' });
      setConnected(false);
      setUsers([]);
      setSubAccounts([]);
      setSelectedUser(null);
      toast.success('Zoom desconectado');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  // Vista detalle de usuario seleccionado
  if (selectedUser) {
    const allTranscripts: TranscriptFile[] = [];
    const audioRecordings: ZoomRecording[] = [];
    for (const meeting of userRecordings) {
      let hasTranscript = false;
      for (const file of meeting.recording_files || []) {
        if (isTranscriptFile(file)) {
          allTranscripts.push({
            id: file.id,
            meetingId: meeting.meeting_id,
            meetingTopic: meeting.topic,
            recordingType: file.recording_type,
            fileType: file.file_type,
            fileSize: file.file_size,
            downloadUrl: file.download_url,
            recordingStart: meeting.start_time,
          });
          hasTranscript = true;
        }
      }
      // Solo grabaciones con audio/video (no solo transcripciones)
      const hasMedia = (meeting.recording_files || []).some(f => {
        const ft = (f.file_type || '').toUpperCase();
        return ft === 'MP4' || ft === 'M4A';
      });
      if (hasMedia) audioRecordings.push(meeting);
    }

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap pb-4 border-b border-slate-200">
          <button onClick={() => { setSelectedUser(null); setUserRecordings([]); setSelectedRecording(null); }}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            ← Volver
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 truncate">{selectedUser.display_name || `${selectedUser.first_name} ${selectedUser.last_name}`}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{selectedUser.email}</p>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${selectedUser.type === 1 ? 'bg-red-100 text-red-700' : selectedUser.type === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
            {getUserTypeLabel(selectedUser.type)}
          </span>
        </div>

        {/* Filtros de fecha */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Desde:</label>
            <input type="date" value={userDateFrom} onChange={(e) => setUserDateFrom(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Hasta:</label>
            <input type="date" value={userDateTo} onChange={(e) => setUserDateTo(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleUserDateFilter} disabled={loadingRecordings}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loadingRecordings ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Buscar'}
          </button>
        </div>

        {loadingRecordings ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>
        ) : userRecordings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <Video className="h-20 w-20 text-slate-200 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-500">No se encontraron grabaciones</p>
            <p className="text-sm text-slate-400 mt-2">Intenta cambiar el rango de fechas</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Grabaciones</p>
                  <div className="h-11 w-11 rounded-xl bg-blue-100 grid place-items-center"><Video className="h-5 w-5 text-blue-600" /></div>
                </div>
                <p className="mt-3 text-4xl font-bold text-slate-900">{audioRecordings.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Transcripciones</p>
                  <div className="h-11 w-11 rounded-xl bg-emerald-100 grid place-items-center"><FileText className="h-5 w-5 text-emerald-600" /></div>
                </div>
                <p className="mt-3 text-4xl font-bold text-slate-900">{allTranscripts.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Duración total</p>
                  <div className="h-11 w-11 rounded-xl bg-violet-100 grid place-items-center"><Clock className="h-5 w-5 text-violet-600" /></div>
                </div>
                <p className="mt-3 text-4xl font-bold text-slate-900">{formatDuration(userRecordings.reduce((a, r) => a + (r.duration || 0), 0))}</p>
              </div>
            </div>

            {/* GRABACIONES */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-500" /> Grabaciones ({audioRecordings.length})
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                {audioRecordings.map((rec) => (
                  <div key={rec.id} onClick={() => setSelectedRecording(selectedRecording?.id === rec.id ? null : rec)}
                    className={`px-6 py-5 cursor-pointer transition-colors hover:bg-slate-50 ${selectedRecording?.id === rec.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-base truncate">{rec.topic}</div>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                          <span>{formatDate(rec.start_time)}</span>
                          <span className="text-slate-300">|</span>
                          <span>{formatDuration(rec.duration)}</span>
                          <span className="text-slate-300">|</span>
                          <span>{rec.recording_count} archivos</span>
                        </div>
                      </div>
                      <Play className={`h-5 w-5 transition-colors ${selectedRecording?.id === rec.id ? 'text-blue-500' : 'text-slate-400'}`} />
                    </div>

                    {selectedRecording?.id === rec.id && (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {rec.recording_files.map((file) => {
                          const Icon = getFileIcon(file.recording_type);
                          const isTranscript = isTranscriptFile(file);
                          return (
                            <div key={file.id} className={`rounded-xl border p-4 transition-colors ${isTranscript ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`h-10 w-10 rounded-xl grid place-items-center ${isTranscript ? 'bg-emerald-100' : 'bg-blue-50'}`}>
                                  <Icon className={`h-5 w-5 ${isTranscript ? 'text-emerald-600' : 'text-blue-600'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-slate-800 truncate">
                                    {file.recording_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </div>
                                  <div className="text-xs text-slate-400">{file.file_type} · {formatFileSize(file.file_size)}</div>
                                </div>
                              </div>
                          <a href={zoomDownloadProxy(file.download_url, `${file.recording_type || 'file'}.${file.file_type?.toLowerCase() || 'bin'}`)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isTranscript ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                                {isTranscript ? <FileText className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                {isTranscript ? 'Ver transcripción' : 'Descargar'}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSCRIPCIONES */}
            {allTranscripts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" /> Transcripciones ({allTranscripts.length})
                </h3>
                <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden divide-y divide-emerald-100">
                  {allTranscripts.map((t) => (
                    <div key={t.id} className="px-6 py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{t.meetingTopic}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                            <span>{formatDate(t.recordingStart)}</span>
                            <span className="text-slate-300">|</span>
                            <span>{t.fileType}</span>
                            <span className="text-slate-300">|</span>
                            <span>{formatFileSize(t.fileSize)}</span>
                          </div>
                        </div>
                        <a href={t.download_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                          <FileText className="h-4 w-4" /> Ver
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold mb-1">Usuarios y Cuentas Zoom</h2>
          <p className="text-sm text-muted-foreground">Conecta tu cuenta Zoom para ver los usuarios</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <UsersIcon className="h-16 w-16 text-violet-500" />
          <p className="text-sm text-muted-foreground">No hay conexión con Zoom</p>
          <a href="/api/zoom/auth?returnTo=/admin/storage-test"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Conectar con Zoom
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold mb-1">Usuarios y Cuentas Zoom</h2>
          <p className="text-sm text-muted-foreground">Lista de usuarios licenciados y sub-cuentas asociadas a tu cuenta</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Cargar
          </button>
          <button onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <X className="h-4 w-4" /> Desconectar
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Usuarios</p>
            <UsersIcon className="h-5 w-5 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sub-cuentas</p>
            <Building className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{subAccounts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Activos</p>
            <Zap className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.filter(u => u.status === 'active').length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => { setViewType('users'); setSearchText(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewType === 'users' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          Usuarios
        </button>
        <button onClick={() => { setViewType('subaccounts'); setSearchText(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewType === 'subaccounts' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          Sub-cuentas
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900">
            {viewType === 'users' ? 'Lista de Usuarios' : 'Lista de Sub-cuentas'}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={viewType === 'users' ? 'Buscar por nombre o email...' : 'Buscar por nombre o email...'}
              value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : viewType === 'users' ? (
          filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{searchText ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}</p>
              <p className="text-xs text-slate-400 mt-1">Se necesita el scope user:read:admin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Usuario</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Último login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} onClick={() => handleSelectUser(user)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{user.display_name || `${user.first_name} ${user.last_name}`}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.type === 1 ? 'bg-red-100 text-red-700' : user.type === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {getUserTypeLabel(user.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.status === 'active' ? 'Activo' : user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{user.last_login_time ? formatDate(user.last_login_time) : 'Nunca'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{searchText ? 'No se encontraron sub-cuentas' : 'No hay sub-cuentas disponibles'}</p>
              <p className="text-xs text-slate-400 mt-1">Solo cuentas maestro tienen sub-cuentas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Cuenta</th>
                    <th className="px-4 py-3 text-left font-medium">Propietario</th>
                    <th className="px-4 py-3 text-left font-medium">Número</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{account.account_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {account.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{account.owner_email}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{account.account_number}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {account.subscription_type === 1 ? 'Pro' : account.subscription_type === 2 ? 'Business' : `Tipo ${account.subscription_type}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function StorageTestPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-6 w-full">
          <Tabs defaultValue="zoom" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="zoom" className="flex items-center gap-2 text-sm font-semibold">
                <Video className="h-4 w-4" /> Grabaciones
              </TabsTrigger>
              <TabsTrigger value="transcripts" className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" /> Transcripciones
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 text-sm font-semibold">
                <UsersIcon className="h-4 w-4" /> Usuarios
              </TabsTrigger>
              <TabsTrigger value="bunny" className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="h-4 w-4" /> Bunny
              </TabsTrigger>
            </TabsList>
            <TabsContent value="zoom"><ZoomSection /></TabsContent>
            <TabsContent value="transcripts"><ZoomTranscriptsSection /></TabsContent>
            <TabsContent value="users"><ZoomUsersSection /></TabsContent>
            <TabsContent value="bunny"><BunnyUploadSection /></TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
