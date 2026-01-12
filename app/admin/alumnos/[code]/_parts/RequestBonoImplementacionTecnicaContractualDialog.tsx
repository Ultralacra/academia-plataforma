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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { createBonoSolicitud } from "@/app/admin/solicitud-bonos/api";

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

const PRODUCTO_TIPO = [
  { value: "pregrabado", label: "Pregrabado" },
  { value: "en_vivo", label: "En vivo" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentCode: string;
};

export default function RequestBonoImplementacionTecnicaContractualDialog({
  open,
  onOpenChange,
  studentCode,
}: Props) {
  const bonoCodigo = "BONO_IMPLEMENTACION_TECNICA_CONTRACTUAL" as const;
  const bonoNombre = "Bono de Implementación técnica contractual" as const;

  const [loading, setLoading] = React.useState(false);

  const [confirmPrerequisitos, setConfirmPrerequisitos] = React.useState(false);

  const [nombre, setNombre] = React.useState("");
  const [correoEntrega, setCorreoEntrega] = React.useState("");
  const [productoTipo, setProductoTipo] = React.useState<
    (typeof PRODUCTO_TIPO)[number]["value"]
  >(PRODUCTO_TIPO[0].value);

  const [credSysteme, setCredSysteme] = React.useState("");
  const [credHotmart, setCredHotmart] = React.useState("");
  const [credHostinger, setCredHostinger] = React.useState("");
  const [credVturb, setCredVturb] = React.useState("");
  const [credBunny, setCredBunny] = React.useState("");

  const [prodCarnada, setProdCarnada] = React.useState("");
  const [prodOto, setProdOto] = React.useState("");
  const [prodOrderBumps, setProdOrderBumps] = React.useState("");

  const [whatsappSoporte, setWhatsappSoporte] = React.useState("");
  const [linksGruposWhatsapp, setLinksGruposWhatsapp] = React.useState("");
  const [driveContenidoHotmart, setDriveContenidoHotmart] = React.useState("");
  const [driveBonoDisenoPregrabado, setDriveBonoDisenoPregrabado] =
    React.useState("");
  const [driveBonoDisenoEnVivo, setDriveBonoDisenoEnVivo] = React.useState("");

  const reset = React.useCallback(() => {
    setLoading(false);
    setConfirmPrerequisitos(false);

    setNombre("");
    setCorreoEntrega("");
    setProductoTipo(PRODUCTO_TIPO[0].value);

    setCredSysteme("");
    setCredHotmart("");
    setCredHostinger("");
    setCredVturb("");
    setCredBunny("");

    setProdCarnada("");
    setProdOto("");
    setProdOrderBumps("");

    setWhatsappSoporte("");
    setLinksGruposWhatsapp("");
    setDriveContenidoHotmart("");
    setDriveBonoDisenoPregrabado("");
    setDriveBonoDisenoEnVivo("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const canSubmit =
    Boolean(studentCode) &&
    confirmPrerequisitos &&
    nombre.trim().length > 0 &&
    correoEntrega.trim().length > 0 &&
    Boolean(productoTipo) &&
    credSysteme.trim().length > 0 &&
    credHotmart.trim().length > 0 &&
    credHostinger.trim().length > 0 &&
    credVturb.trim().length > 0 &&
    credBunny.trim().length > 0 &&
    prodCarnada.trim().length > 0 &&
    prodOto.trim().length > 0 &&
    prodOrderBumps.trim().length > 0 &&
    whatsappSoporte.trim().length > 0;

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
      "SOLICITUD DE MONTAJE DE EMBUDO (Bono de Implementación técnica contractual)",
      "",
      `Alumno código: ${studentCode}`,
      "",
      "PRE-REQUISITOS:",
      confirmPrerequisitos
        ? "- Confirmado por el alumno: accesos completos en Systeme, Hostinger, Hotmart, VTURB y Bunny."
        : "- NO confirmado",
      "",
      "DATOS:",
      `- Nombre: ${nombre.trim()}`,
      `- Correo entrega: ${correoEntrega.trim()}`,
      `- Producto: ${productoTipo === "en_vivo" ? "En vivo" : "Pregrabado"}`,
      "",
      "CREDENCIALES / ACCESOS:",
      `- Systeme.io: ${credSysteme.trim()}`,
      `- Hotmart: ${credHotmart.trim()}`,
      `- Hostinger: ${credHostinger.trim()}`,
      `- VTURB: ${credVturb.trim()}`,
      `- Bunny: ${credBunny.trim()}`,
      "",
      "PRODUCTOS:",
      `- Carnada (y si es en vivo: General/VIP): ${prodCarnada.trim()}`,
      `- OTO: ${prodOto.trim()}`,
      `- Order Bumps: ${prodOrderBumps.trim()}`,
      "",
      "WHATSAPP:",
      `- Número soporte: ${whatsappSoporte.trim()}`,
      linksGruposWhatsapp.trim()
        ? `- Grupos (General/VIP): ${linksGruposWhatsapp.trim()}`
        : "- Grupos (General/VIP): (no aplica / no informado)",
      "",
      "DRIVE / CONTENIDO:",
      driveContenidoHotmart.trim()
        ? `- Drive Hotmart (Carnada/OTO/OrderBumps): ${driveContenidoHotmart.trim()}`
        : "- Drive Hotmart: (no informado)",
      driveBonoDisenoPregrabado.trim()
        ? `- Drive Bono de diseño (Pregrabado): ${driveBonoDisenoPregrabado.trim()}`
        : "- Drive Bono de diseño (Pregrabado): (no informado)",
      driveBonoDisenoEnVivo.trim()
        ? `- Drive Bono de diseño (En vivo): ${driveBonoDisenoEnVivo.trim()}`
        : "- Drive Bono de diseño (En vivo): (no informado)",
    ].join("\n");

    const payload = {
      bonoCodigo,
      bonoNombre,
      studentCode,
      confirmPrerequisitos,
      nombre: nombre.trim(),
      correoEntrega: correoEntrega.trim(),
      productoTipo,
      credSysteme: credSysteme.trim(),
      credHotmart: credHotmart.trim(),
      credHostinger: credHostinger.trim(),
      credVturb: credVturb.trim(),
      credBunny: credBunny.trim(),
      prodCarnada: prodCarnada.trim(),
      prodOto: prodOto.trim(),
      prodOrderBumps: prodOrderBumps.trim(),
      whatsappSoporte: whatsappSoporte.trim(),
      linksGruposWhatsapp: linksGruposWhatsapp.trim(),
      driveContenidoHotmart: driveContenidoHotmart.trim(),
      driveBonoDisenoPregrabado: driveBonoDisenoPregrabado.trim(),
      driveBonoDisenoEnVivo: driveBonoDisenoEnVivo.trim(),
      descripcion,
    };

    setLoading(true);
    try {
      const res = await createBonoSolicitud(payload);
      toast({
        title: "Solicitud enviada",
        description: res?.message ?? "Solicitud de bono creada correctamente.",
      });
      onOpenChange(false);
      reset();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast({
        title: "No se pudo enviar",
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Solicitud de Montaje de Embudo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="rounded-md overflow-hidden border border-border bg-card">
            <img
              src={HEADER_IMAGE_URL}
              alt="Cabecera solicitud de montaje de embudo"
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground space-y-2">
            <div className="text-foreground font-medium">
              Hola Hotseller, al llenar este formulario estarás haciendo la
              solicitud formal del bono de Montaje de Embudo para tu negocio.
            </div>
            <div>
              Es necesario que vacíes toda la info para que podamos comenzar a
              montar tu embudo lo antes posible.
            </div>
            <div>Si tienes alguna duda por favor escríbenos al WhatsApp.</div>
          </div>

          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Pre-requisitos
            </div>
            <div className="text-sm text-muted-foreground">
              Para poder iniciar necesitamos saber que cumples con estos
              pre-requisitos. De no poseerlos solo sigue las instrucciones de
              los tutoriales adjuntos a cada uno.
            </div>
            <div className="text-sm text-muted-foreground">
              Recuerda darme ACCESO COMPLETO en Systeme, Hostinger, Hotmart,
              VTURB y Bunny.
            </div>
            <div className="space-y-2">
              <CheckItem>
                Creación de cuenta en Systeme. (si no la has hecho cliquea{" "}
                <Link
                  href="https://www.skool.com/hotselling-pro/about"
                  label="Tutorial Systeme"
                >
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Adquirir dominio en Hostinger. (si no la has hecho cliquea{" "}
                <Link
                  href="https://www.skool.com/hotselling-pro/about"
                  label="Tutorial Hostinger"
                >
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Adquirir cuenta en Hotmart. (si no tienes cuenta cliquea{" "}
                <Link
                  href="https://www.skool.com/hotselling-pro/about"
                  label="Tutorial Hotmart"
                >
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Adquirir cuenta en VTURB. (Adquiérela{" "}
                <Link href="https://app.vturb.com/" label="VTURB">
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Adquirir cuenta en Bunny. (si no tienes cuenta cliquea{" "}
                <Link
                  href="https://www.skool.com/hotselling-pro/about"
                  label="Tutorial Bunny"
                >
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Creación de carpeta en Drive para implementación técnica. (si no
                la has hecho cliquea{" "}
                <Link
                  href="https://www.loom.com/share/f18236f938614aaa8fb7569b106bf5c1?sid=405952dd-5f18-4413-aab4-2fd754c0b1f0"
                  label="Cómo crear carpeta Drive (implementación técnica)"
                >
                  aquí
                </Link>
                )
              </CheckItem>
              <CheckItem>
                Creación de carpeta en Drive para el Bono de diseño. (si no la
                has hecho cliquea{" "}
                <Link
                  href="https://www.loom.com/share/54208c8dd774454790b6e8ec50618595"
                  label="Material bono diseño (Drive)"
                >
                  aquí
                </Link>
                )
              </CheckItem>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <Checkbox
              checked={confirmPrerequisitos}
              onCheckedChange={(v) => setConfirmPrerequisitos(Boolean(v))}
            />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Confirmo que cumplo pre-requisitos
              </div>
              <div className="text-xs text-muted-foreground">
                (Incluye accesos completos y carpeta de Drive creada)
              </div>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Tu nombre *</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Correo de entrega *</Label>
              <Input
                type="email"
                value={correoEntrega}
                onChange={(e) => setCorreoEntrega(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select
                value={productoTipo}
                onValueChange={(v) => setProductoTipo(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTO_TIPO.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Credenciales Systeme.io *</Label>
              <div className="text-xs text-muted-foreground">
                (Si tu embudo es "En vivo", necesitas adquirir el plan básico de
                Systeme.io para poder trabajarlo, y las páginas ya deben tener
                el copy incluido para poder trabajarlas.)
              </div>
              <Textarea
                value={credSysteme}
                onChange={(e) => setCredSysteme(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Credenciales Hotmart *</Label>
              <Textarea
                value={credHotmart}
                onChange={(e) => setCredHotmart(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Credenciales Hostinger *</Label>
              <Textarea
                value={credHostinger}
                onChange={(e) => setCredHostinger(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Credenciales VTURB *</Label>
              <Textarea
                value={credVturb}
                onChange={(e) => setCredVturb(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Credenciales Bunny *</Label>
              <Textarea
                value={credBunny}
                onChange={(e) => setCredBunny(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>
                Nombre producto carnada *
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (si es en vivo: General y VIP)
                </span>
              </Label>
              <Input
                value={prodCarnada}
                onChange={(e) => setProdCarnada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre producto OTO *</Label>
              <Input
                value={prodOto}
                onChange={(e) => setProdOto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre producto Order Bumps *</Label>
              <Input
                value={prodOrderBumps}
                onChange={(e) => setProdOrderBumps(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Número Whatsapp soporte *</Label>
              <Input
                value={whatsappSoporte}
                onChange={(e) => setWhatsappSoporte(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Links grupos Whatsapp (General y VIP)</Label>
              <Textarea
                value={linksGruposWhatsapp}
                onChange={(e) => setLinksGruposWhatsapp(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Link Drive contenido para Hotmart
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (Carnada, OTO, Order bumps)
                </span>
              </Label>
              <div className="text-xs text-muted-foreground">
                Recuerda que los productos deben estar separados por carpetas y
                debidamente ordenados para su carga.
              </div>
              <Input
                value={driveContenidoHotmart}
                onChange={(e) => setDriveContenidoHotmart(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Bono de diseño — requisitos (versión pregrabado)
            </div>
            <div className="text-sm text-muted-foreground">
              Pega un (1) solo enlace de Google Drive que contenga una carpeta
              principal con tu nombre. Asegúrate de que el enlace tenga permisos
              de "Cualquier persona con el enlace puede ver".
            </div>
            <div className="space-y-2">
              <CheckItem>
                Tu paleta de colores (códigos HEX, ej: #FFFFFF).
              </CheckItem>
              <CheckItem>
                Tu logo en alta calidad (ideal fondo transparente).
              </CheckItem>
              <CheckItem>
                El copy final de tus páginas: Carnada, OTO (Oferta Única),
                Downsell y Gracias.
              </CheckItem>
              <CheckItem>Mockup (imagen visual) de tu Carnada.</CheckItem>
              <CheckItem>Mockup (imagen visual) de tu Downsell.</CheckItem>
              <CheckItem>
                Mínimo 12 capturas de testimonios (ideal 25).
              </CheckItem>
              <CheckItem>
                4 fotos tuyas en alta calidad para la página.
              </CheckItem>
              <CheckItem>
                Material visual de los Módulos de tu Carnada (guía de Canva).
              </CheckItem>
              <CheckItem>
                Material visual de los Bonos (guía de Canva).
              </CheckItem>
              <CheckItem>Mínimo 3 testimonios en video (ideal 6).</CheckItem>
            </div>
            <div className="text-xs text-muted-foreground">
              (Asegúrate de que todo esté en su versión final aprobado por tu
              coach de copy. ¡Gracias!)
            </div>

            <div className="space-y-2 pt-1">
              <Label>Enlace de Drive (Bono de diseño — Pregrabado)</Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveBonoDisenoPregrabado}
                onChange={(e) => setDriveBonoDisenoPregrabado(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Un (1) solo enlace, con permisos: "Cualquier persona con el
                enlace puede ver".
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Bono de diseño — requisitos (versión en vivo)
            </div>
            <div className="text-sm text-muted-foreground">
              Pega un (1) solo enlace de Google Drive que contenga una carpeta
              principal con tu nombre. Asegúrate de que el enlace tenga permisos
              de "Cualquier persona con el enlace puede ver".
            </div>
            <div className="space-y-2">
              <CheckItem>
                Tu paleta de colores (códigos HEX, ej: #FFFFFF).
              </CheckItem>
              <CheckItem>
                Tu logo en alta calidad (ideal fondo transparente).
              </CheckItem>
              <CheckItem>
                El copy final de tus páginas: Carnada, OTO (Oferta Única),
                Downsell y Gracias.
              </CheckItem>
              <CheckItem>
                Material visual de los Módulos de tu Carnada (guía de Canva).
              </CheckItem>
              <CheckItem>
                Material visual de los Bonos (guía de Canva).
              </CheckItem>
              <CheckItem>Mockup (imagen visual) de tu Carnada.</CheckItem>
              <CheckItem>
                Un mockup por cada uno de tus bonos (ej: si son 3 bonos, 3
                mockups).
              </CheckItem>
              <CheckItem>
                Fotos personales: 1 foto horizontal y 3 fotos verticales.
              </CheckItem>
              <CheckItem>
                Fotos de evolución y resultados (5 fotos según instrucción).
              </CheckItem>
              <CheckItem>
                Testimonios escritos: mínimo 13 capturas (ideal 20).
              </CheckItem>
              <CheckItem>
                Testimonios en video: mínimo 3 videos (ideal 6).
              </CheckItem>
            </div>
            <div className="text-xs text-muted-foreground">
              (Asegúrate de que todo esté en su versión final aprobado por tu
              coach de copy. ¡Gracias!)
            </div>

            <div className="space-y-2 pt-1">
              <Label>Enlace de Drive (Bono de diseño — En vivo)</Label>
              <Input
                placeholder="Pega aquí el enlace de Google Drive"
                value={driveBonoDisenoEnVivo}
                onChange={(e) => setDriveBonoDisenoEnVivo(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Un (1) solo enlace, con permisos: "Cualquier persona con el
                enlace puede ver".
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Si tienes alguna duda o pregunta, puedes contactarte conmigo
            mediante este link de Telegram:{" "}
            <Link href="https://t.me/+iZps2LEtorkyYWMx" label="Telegram">
              https://t.me/+iZps2LEtorkyYWMx
            </Link>
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
