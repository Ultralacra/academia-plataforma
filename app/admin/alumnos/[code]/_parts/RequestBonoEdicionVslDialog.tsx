"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import * as alumnosApi from "@/app/admin/alumnos/api";
import { CheckCircle2, ExternalLink } from "lucide-react";

const HEADER_IMAGE_URL =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

function Link(
  props: React.PropsWithChildren<{ href: string; label?: string }>
) {
  const { href, children, label } = props;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:opacity-80"
      aria-label={label}
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

function CheckItem(props: React.PropsWithChildren) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
      <div className="text-sm text-muted-foreground">{props.children}</div>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentCode: string;
};

export default function RequestBonoEdicionVslDialog({
  open,
  onOpenChange,
  studentCode,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [tipoTicket, setTipoTicket] = React.useState<string>("");
  const [tipos, setTipos] = React.useState<alumnosApi.OpcionItem[]>([]);

  const [confirmPrerequisitos, setConfirmPrerequisitos] = React.useState(false);

  const [nombreCompleto, setNombreCompleto] = React.useState("");
  const [correoEntrega, setCorreoEntrega] = React.useState("");
  const [productoCarnada, setProductoCarnada] = React.useState("");

  const [linkGuionVsl, setLinkGuionVsl] = React.useState("");
  const [driveVideoBrutoYVariaciones, setDriveVideoBrutoYVariaciones] =
    React.useState("");
  const [driveTestimonios, setDriveTestimonios] = React.useState("");
  const [driveRecursos, setDriveRecursos] = React.useState("");
  const [driveIdentidadMarca, setDriveIdentidadMarca] = React.useState("");
  const [recomendaciones, setRecomendaciones] = React.useState("");

  const reset = React.useCallback(() => {
    setLoading(false);
    setConfirmPrerequisitos(false);

    setNombreCompleto("");
    setCorreoEntrega("");
    setProductoCarnada("");

    setLinkGuionVsl("");
    setDriveVideoBrutoYVariaciones("");
    setDriveTestimonios("");
    setDriveRecursos("");
    setDriveIdentidadMarca("");
    setRecomendaciones("");
  }, []);

  React.useEffect(() => {
    if (!open) return;

    reset();
    setTipoTicket("");
    setTipos([]);

    (async () => {
      try {
        const tiposRes = await alumnosApi.getOpciones("tipo_ticket");
        setTipos(tiposRes);

        const preferred =
          tiposRes.find((t) =>
            String(t.value || "")
              .toLowerCase()
              .includes("vsl")
          ) ??
          tiposRes.find((t) =>
            String(t.value || "")
              .toLowerCase()
              .includes("bono")
          ) ??
          tiposRes[0];

        if (preferred?.key) setTipoTicket(preferred.key);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "No se pudieron cargar tipos de ticket",
          description: e?.message ?? "Error desconocido",
          variant: "destructive",
        });
      }
    })();
  }, [open, reset]);

  const canSubmit =
    Boolean(studentCode) &&
    Boolean(tipoTicket) &&
    confirmPrerequisitos &&
    nombreCompleto.trim().length > 0 &&
    correoEntrega.trim().length > 0 &&
    productoCarnada.trim().length > 0 &&
    linkGuionVsl.trim().length > 0 &&
    driveVideoBrutoYVariaciones.trim().length > 0 &&
    driveTestimonios.trim().length > 0 &&
    driveRecursos.trim().length > 0 &&
    driveIdentidadMarca.trim().length > 0 &&
    recomendaciones.trim().length > 0;

  async function submit() {
    if (!canSubmit) {
      toast({
        title: "Completa el formulario",
        description:
          "Debes confirmar prerequisitos y completar los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    const descripcion = [
      "SOLICITUD DE EDICIÓN DE VSL (Bono de Edición de VSL)",
      "",
      `Alumno código: ${studentCode}`,
      "",
      "IMPORTANTE:",
      "- Aquí debes dejar todos los detalles de lo que te gustaría ver y tu estilo según tu marca.",
      "",
      "RECUERDA:",
      "- Esto es una edición funcional de acuerdo a requisitos mínimos con lo cual tu VSL podrá salir al mercado.",
      "",
      "PRE-REQUISITOS:",
      confirmPrerequisitos
        ? "- Confirmado por el alumno: guión aprobado por coach y VSL < 20 min (incluyendo testimonios según nicho)."
        : "- NO confirmado",
      "",
      "DATOS:",
      `- Nombre completo: ${nombreCompleto.trim()}`,
      `- Correo entrega: ${correoEntrega.trim()}`,
      `- Producto carnada: ${productoCarnada.trim()}`,
      "",
      "LINKS / DRIVES:",
      `- Guión VSL: ${linkGuionVsl.trim()}`,
      `- Drive video en bruto + 5 variaciones: ${driveVideoBrutoYVariaciones.trim()}`,
      `- Drive testimonios (recortados a 10s): ${driveTestimonios.trim()}`,
      `- Drive recursos (fotos/pantallazos): ${driveRecursos.trim()}`,
      `- Drive identidad de marca (paleta HEX + logo): ${driveIdentidadMarca.trim()}`,
      "",
      "RECOMENDACIONES / ACLARACIONES:",
      recomendaciones.trim(),
    ].join("\n");

    setLoading(true);
    try {
      await alumnosApi.createTicket({
        nombre: "Solicitud Bono Edición de VSL",
        id_alumno: studentCode,
        tipo: tipoTicket,
        descripcion,
      });

      toast({
        title: "Solicitud enviada",
        description: "Se creó el ticket de solicitud del bono.",
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "No se pudo enviar la solicitud",
        description: e?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (!loading ? onOpenChange(v) : null)}
    >
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => {
          // Evita que el foco inicial auto-scrollée el contenedor y “oculte” la cabecera.
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Solicitud de Edición de VSL</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="rounded-md overflow-hidden border border-border bg-card">
            <img
              src={HEADER_IMAGE_URL}
              alt="Cabecera solicitud de edición de VSL"
              className="w-full h-auto block"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground space-y-2">
            <div className="text-foreground font-medium">
              Hola Hotseller 👋🏻, al llenar este formulario estarás haciendo la
              solicitud formal del bono de Inserción de Editor para tu VSL. Es
              necesario que vacíes toda la información para que podamos iniciar
              con la edición lo antes posible.
            </div>
            <div>
              IMPORTANTE: Aquí deberás dejar todos los detalles que de lo que te
              gustaría ver, tu estilo según tu marca.
            </div>
            <div>
              RECUERDA: Esto es una edición funcional de acuerdo a los
              requisitos minímos con lo cual tu VSL podrá salir al mercado.
            </div>
            <div>*Si tienes alguna duda por favor escríbenos al WhatsApp</div>
          </div>

          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Pre-requisitos
            </div>
            <div className="text-sm text-muted-foreground">
              Para poder iniciar necesitamos saber que cumples con estos
              prerrequisitos:
            </div>
            <div className="space-y-2">
              <CheckItem>
                El guión del Copy de tu VSL debe estar aprobado por tu coach.
              </CheckItem>
              <CheckItem>
                Debiste medir el tiempo que te tomó el VSL con una grabación y
                asegurarte que sean menos de 20 minutos, ya que debes incluir
                los testimonios. Además, de que este tiempo dependerá de tu
                nicho.
              </CheckItem>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
              <Checkbox
                checked={confirmPrerequisitos}
                onCheckedChange={(v) => setConfirmPrerequisitos(Boolean(v))}
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  Confirmo que cumplo pre-requisitos
                </div>
                <div className="text-xs text-muted-foreground">
                  (Guión aprobado y VSL &lt; 20 min)
                </div>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Indica tu nombre completo</Label>
              <Input
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Indica tu correo electrónico al cuál hacer entrega formal del
                montaje de campañas
              </Label>
              <Input
                type="email"
                value={correoEntrega}
                onChange={(e) => setCorreoEntrega(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Indica el nombre de tu producto carnada</Label>
              <Input
                value={productoCarnada}
                onChange={(e) => setProductoCarnada(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Agrega aquí el link del GUIÓN de tu VSL.</Label>
              <Textarea
                value={linkGuionVsl}
                onChange={(e) => setLinkGuionVsl(e.target.value)}
                rows={3}
              />
              <div className="text-xs text-muted-foreground">
                Aseguráte de tenerlo en un documento aparte al de la tarea, de
                forma ordenada con cada una de sus partes. Adicional de indicar
                dónde va cada uno de los recursos que usarás según el guión.
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Agrega aquí el link a Drive con el vídeo en bruto de tu VSL y de
                tus 5 Variaciones.
              </Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveVideoBrutoYVariaciones}
                onChange={(e) => setDriveVideoBrutoYVariaciones(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Recuerda que todo debe estar debidamente ordenados para edición*
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Agrega aquí el link de Drive con tus TESTIMONIOS recortados en
                los 10 segundos que se usaran para el VSL.
              </Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveTestimonios}
                onChange={(e) => setDriveTestimonios(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Agrega aquí el link de Drive con
                <br />
                fotografías, pantallazos o recursos que respalden lo que
                comentas en tu VSL.
              </Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveRecursos}
                onChange={(e) => setDriveRecursos(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Asegúrate de dejar amplios recursos para aumentar el dinamismo
                de tu vsl.
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Agrega aquí el link de Drive con los detalles de tu identidad de
                marca:
              </Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveIdentidadMarca}
                onChange={(e) => setDriveIdentidadMarca(e.target.value)}
              />
              <div className="text-xs text-muted-foreground whitespace-pre-line">
                {
                  "🟡 Tu paleta de colores (especificando los códigos numerales HEX, ej: #FFFFFF).\n\n🟡 Tu Logo (de marca o de la carnada) en alta calidad y con fondo transparente si es posible."
                }
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Escribe aquí TODAS las recomendaciones o aclaraciones que
                debemos tener en cuenta para la edición de tu VSL.
              </Label>
              <Textarea
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                rows={5}
              />
              <div className="text-xs text-muted-foreground">
                Se lo más detallista que puedas.
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Si tienes alguna duda o pregunta, puedes contactarte conmigo
              mediante este link de Telegram:{" "}
              <Link href="https://t.me/+iZps2LEtorkyYWMx" label="Telegram">
                https://t.me/+iZps2LEtorkyYWMx
              </Link>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !canSubmit}>
            {loading ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
