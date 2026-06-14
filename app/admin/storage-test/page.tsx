'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

function StorageTestContent() {
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
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecciona una imagen primero');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bunny-test', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al subir');
        return;
      }

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
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    } else {
      toast.error('Solo puedes subir imágenes');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Prueba de Bunny Storage</h1>
      <p className="text-muted-foreground mb-6">
        Sube una imagen para verificar la conexión con Bunny CDN
      </p>

      <div
        className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 rounded-lg mx-auto"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
            >
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
        <div className="mt-4 flex items-center gap-3 p-3 bg-muted rounded-lg">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-6 w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
      >
        {loading ? 'Subiendo...' : 'Subir imagen a Bunny'}
      </button>

      {result && (
        <div className="mt-6 p-4 border rounded-lg bg-muted">
          <h2 className="font-semibold mb-3">Resultado:</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Path:</p>
              <code className="text-xs bg-background px-2 py-1 rounded block">{result.path}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">URL pública:</p>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {result.url}
              </a>
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

export default function StorageTestPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <StorageTestContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}