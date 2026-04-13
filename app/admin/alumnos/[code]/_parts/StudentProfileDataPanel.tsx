"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface SocialNetwork {
  platform: string;
  handle: string;
}

interface ProfilePayload {
  niche?: string;
  socialNetworks?: SocialNetwork[];
  occupation?: string;
  digitalExperience?: string;
  learningPreference?: string;
  completedAt?: string;
  updatedAt?: string;
  version?: number;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  experto: "Experto",
};

const LEARNING_LABELS: Record<string, { label: string; emoji: string }> = {
  video: { label: "Video", emoji: "🎬" },
  audio: { label: "Audio", emoji: "🎧" },
  texto: { label: "Texto", emoji: "📖" },
};

export default function StudentProfileDataPanel({
  studentCode,
}: {
  studentCode: string;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfilePayload | null>(null);

  useEffect(() => {
    if (!studentCode) return;
    let cancelled = false;

    (async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(
          `/api/alumnos/${encodeURIComponent(studentCode)}/metadata/profile`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setData(json?.item?.payload ?? null);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentCode]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.completedAt) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Encuesta de Bienvenida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El alumno aún no ha completado la encuesta de bienvenida.
          </p>
        </CardContent>
      </Card>
    );
  }

  const learning = data.learningPreference
    ? LEARNING_LABELS[data.learningPreference]
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Encuesta de Bienvenida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Nicho" value={data.niche} />
        <Row label="Ocupación" value={data.occupation} />
        <Row
          label="Experiencia digital"
          value={
            data.digitalExperience
              ? (EXPERIENCE_LABELS[data.digitalExperience] ??
                data.digitalExperience)
              : undefined
          }
        />
        {learning && (
          <Row
            label="Aprende mejor con"
            value={`${learning.emoji} ${learning.label}`}
          />
        )}

        {data.socialNetworks && data.socialNetworks.length > 0 && (
          <div>
            <span className="text-muted-foreground">Redes sociales:</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.socialNetworks.map((sn, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {sn.platform}: {sn.handle}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.completedAt && (
          <div className="pt-1 text-xs text-muted-foreground">
            Completado:{" "}
            {new Date(data.completedAt).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}
