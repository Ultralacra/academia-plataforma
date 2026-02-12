"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Clock, Globe, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  createLeadFromForm,
  getCalendarAllAvailability,
  listLeadOrigins,
  type CalendarAllAvailabilityResponse,
  type LeadOrigin,
} from "@/app/admin/crm/api";

export interface BookingFormProps {
  eventTitle?: string;
  eventDuration?: number;
  eventDescription?: string;
  logoUrl?: string;
  avatarUrl?: string;

  // Si viene desde /booking/:event_codigo, asociamos el registro a esa campaña.
  campaignEventCodigo?: string;
}

export function BookingForm({
  eventTitle = "Sesión de Hotselling Lite BF",
  eventDuration = 45,
  eventDescription = "En la sesión podrás realizar todas las preguntas que desees y juntos determinaremos si este programa realmente aplica para ti.",
  logoUrl = "https://d3v0px0pttie1i.cloudfront.net/uploads/branding/logo/202214fc-22a0-4a5f-9dd3-02d885ee4f1a/45c39d8c.png",
  avatarUrl = "https://d3v0px0pttie1i.cloudfront.net/uploads/team/avatar/364502/91dd42a7.jpg",
  campaignEventCodigo,
}: BookingFormProps) {
  const [step, setStep] = useState<"calendar" | "details">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timezone, setTimezone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryFlag, setCountryFlag] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsappNumber: "",
    instagramUser: "",
    monthlyBudget: "",
    mainObstacle: "",
    commitment: "",
    inviteOthers: "no",
    confirmado: "",
    textMessages: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<
    null | "creating" | "finalizing"
  >(null);
  const { toast } = useToast();

  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [campaignDescription, setCampaignDescription] = useState<string | null>(
    null
  );
  const [campaignOrigenCodigo, setCampaignOrigenCodigo] = useState<
    string | null
  >(null);

  const [origins, setOrigins] = useState<LeadOrigin[] | null>(null);
  const [originsLoading, setOriginsLoading] = useState(false);

  const [calendarAvailability, setCalendarAvailability] =
    useState<CalendarAllAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const timeWindow = useState(() => ({ startHour: 6, endHour: 22 }))[0];

  useEffect(() => {
    let alive = true;
    setOriginsLoading(true);
    (async () => {
      try {
        const data = await listLeadOrigins();
        if (!alive) return;
        setOrigins(data);
      } catch {
        if (!alive) return;
        setOrigins([]);
      } finally {
        if (!alive) return;
        setOriginsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const eventCodigo = String(campaignEventCodigo || "").trim();
    if (!eventCodigo) {
      setCampaignName(null);
      setCampaignDescription(null);
      setCampaignOrigenCodigo(null);
      return;
    }

    (async () => {
      try {
        const origin = Array.isArray(origins)
          ? origins.find(
              (o: any) => String(o?.event_codigo || "").trim() === eventCodigo
            )
          : null;
        if (!alive) return;
        setCampaignName(String((origin as any)?.name || eventCodigo));
        setCampaignDescription(
          (origin as any)?.description
            ? String((origin as any).description)
            : null
        );
        setCampaignOrigenCodigo(
          (origin as any)?.codigo ? String((origin as any).codigo) : null
        );
      } catch {
        if (!alive) return;
        // No bloquear el formulario si no se puede cargar la campaña
        setCampaignName(eventCodigo);
        setCampaignDescription(null);
        setCampaignOrigenCodigo(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [campaignEventCodigo, origins]);

  useEffect(() => {
    let alive = true;
    const oc = String(campaignOrigenCodigo || "").trim();
    if (!oc) {
      setCalendarAvailability(null);
      return;
    }
    setAvailabilityLoading(true);
    (async () => {
      try {
        const data = await getCalendarAllAvailability(oc);
        if (!alive) return;
        setCalendarAvailability(data);
      } catch {
        if (!alive) return;
        setCalendarAvailability(null);
      } finally {
        if (!alive) return;
        setAvailabilityLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [campaignOrigenCodigo]);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
    const timezoneToCountryData: Record<
      string,
      { flag: string; code: string }
    > = {
      "America/Caracas": { flag: "🇻🇪", code: "+58" },
      "America/New_York": { flag: "🇺🇸", code: "+1" },
      "America/Los_Angeles": { flag: "🇺🇸", code: "+1" },
      "America/Chicago": { flag: "🇺🇸", code: "+1" },
      "America/Mexico_City": { flag: "🇲🇽", code: "+52" },
      "America/Bogota": { flag: "🇨🇴", code: "+57" },
      "America/Lima": { flag: "🇵🇪", code: "+51" },
      "America/Buenos_Aires": { flag: "🇦🇷", code: "+54" },
      "America/Santiago": { flag: "🇨🇱", code: "+56" },
      "America/Montevideo": { flag: "🇺🇾", code: "+598" },
      "Europe/Madrid": { flag: "🇪🇸", code: "+34" },
      "Europe/London": { flag: "🇬🇧", code: "+44" },
    };
    const countryData = timezoneToCountryData[detectedTimezone] || {
      flag: "🇪🇸",
      code: "+34",
    };
    setCountryFlag(countryData.flag);
    setCountryCode(countryData.code);
  }, []);

  const defaultTimeSlots = ["09:00", "10:00", "11:00", "12:00"];

  const toDateKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const parseHm = (hm: string) => {
    const [h, m] = String(hm).split(":");
    return {
      h: Math.max(0, Math.min(23, Number(h))),
      m: Math.max(0, Math.min(59, Number(m))),
    };
  };

  const isOverlapping = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart;

  const availabilityByDate = React.useMemo(() => {
    // Si no hay data usable, devolvemos null y el UI hace fallback
    // Manejamos ambos casos: objeto {success,data} o array directo (por unwrapData)
    const users = Array.isArray(calendarAvailability)
      ? (calendarAvailability as any)
      : calendarAvailability?.data;
    const usableUsers = Array.isArray(users)
      ? users.filter((u: any) => Array.isArray(u.events))
      : [];
    if (!usableUsers.length) return null;

    const eventsByUser = usableUsers.map((u) => {
      const events = (u.events || [])
        .map((ev) => ({
          start: new Date(ev.start),
          end: new Date(ev.end),
        }))
        .filter(
          (x) =>
            x.start instanceof Date &&
            x.end instanceof Date &&
            !Number.isNaN(x.start.getTime()) &&
            !Number.isNaN(x.end.getTime()) &&
            x.end.getTime() > x.start.getTime(),
        );
      return { events };
    });

    const map = new Map<string, string[]>();
    const now = new Date();

    // Generamos próximos 30 días como antes
    for (let i = 0; i < 30; i++) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + i);

      const key = toDateKeyLocal(day);
      const slots: string[] = [];

      for (let hour = timeWindow.startHour; hour <= timeWindow.endHour; hour++) {
        for (const minute of [0, 15, 30, 45]) {
          const start = new Date(day);
          start.setHours(hour, minute, 0, 0);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + eventDuration);

          // No permitir slots que terminan fuera de ventana
          const windowEnd = new Date(day);
          windowEnd.setHours(timeWindow.endHour + 1, 0, 0, 0);
          if (end > windowEnd) continue;

          // No mostrar horas pasadas (si es hoy)
          if (toDateKeyLocal(start) === toDateKeyLocal(now) && start <= now)
            continue;

          // Disponible si existe al menos 1 usuario sin solape con sus eventos
          const available = eventsByUser.some(({ events }) => {
            const conflict = events.some((ev) => isOverlapping(start, end, ev.start, ev.end));
            return !conflict;
          });
          if (!available) continue;

          const hm = `${String(start.getHours()).padStart(2, "0")}:${String(
            start.getMinutes(),
          ).padStart(2, "0")}`;
          slots.push(hm);
        }
      }

      map.set(key, slots);
    }

    return map;
  }, [calendarAvailability, eventDuration, timeWindow.endHour, timeWindow.startHour]);

  const getSlotsForDate = (d: Date | null) => {
    if (!d) return [] as string[];
    const key = toDateKeyLocal(d);
    const fromMap = availabilityByDate?.get(key);
    if (Array.isArray(fromMap)) return fromMap;
    // Fallback al comportamiento viejo
    return defaultTimeSlots;
  };

  const slotsForSelectedDate = getSlotsForDate(selectedDate);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };
  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const handleDateSelect = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    setSelectedDate(date);
    setSelectedTime(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación mínima
    if (!formData.name || !formData.email || !formData.whatsappNumber) return;
    const eventCodigo = String(campaignEventCodigo || "").trim();
    if (!eventCodigo) {
      toast({
        title: "Falta event_codigo",
        description: "Abre el formulario desde la URL /booking/:event_codigo.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitPhase("creating");
    const digits = (formData.whatsappNumber || "").replace(/\D+/g, "");
    const cc = (countryCode || "+").replace(/[^+\d]/g, "");
    const phone = digits.startsWith(cc.replace("+", ""))
      ? `+${digits}`
      : `${cc}${
          digits.startsWith("+") ? digits : digits ? ` ${digits}` : ""
        }`.replace(/\s+/g, "");

    try {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      const fecha = `${y}-${m}-${d}`;

      const rawBudget = String(formData.monthlyBudget || "");
      const parsedBudget = rawBudget
        ? Number(rawBudget.replace(/[^0-9.,-]/g, "").replace(/,/g, ""))
        : NaN;
      const meta_facturacion = Number.isFinite(parsedBudget)
        ? parsedBudget
        : null;

      // Para que el lead quede con los datos iniciales (no solo el "form"),
      // enviamos también los campos con los nombres de columnas del lead.
      const leadSelectedDateIso = (() => {
        try {
          return new Date(`${fecha}T00:00:00.000Z`).toISOString();
        } catch {
          return `${fecha}T00:00:00.000Z`;
        }
      })();

      const body = {
        origen: campaignOrigenCodigo || undefined,
        event_codigo: eventCodigo,
        fecha,
        hora: String(selectedTime),
        nombre: formData.name.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        necesita_consulta: String(formData.inviteOthers) === "yes",
        whatsapp: phone,
        instagram: String(formData.instagramUser || "").trim(),
        meta_facturacion,
        obstaculo: String(formData.mainObstacle || "").trim(),
        compromiso: String(formData.commitment) === "yes",
        confirmado:
          String(formData.confirmado || "")
            .trim()
            .toUpperCase() === "CONFIRMADO",
        enviar_mensajes: Boolean(String(formData.textMessages || "").trim()),

        // Duplicados para el lead (best-effort: el backend puede ignorarlos si no aplica)
        instagram_user: String(formData.instagramUser || "").trim() || null,
        monthly_budget: meta_facturacion,
        main_obstacle: String(formData.mainObstacle || "").trim() || null,
        commitment: String(formData.commitment) === "yes" ? 1 : 0,
        invite_others: String(formData.inviteOthers) === "yes" ? 1 : 0,
        confirmado:
          String(formData.confirmado || "")
            .trim()
            .toUpperCase() === "CONFIRMADO"
            ? 1
            : 0,
        text_messages: String(formData.textMessages || "").trim() || null,
        selected_date: leadSelectedDateIso,
        selected_time: String(selectedTime),
        origin_codigo: campaignOrigenCodigo || null,
        country_code: (countryCode || "").trim() || null,
        timezone: (timezone || "").trim() || null,
      };

      const saved = await createLeadFromForm(body);
      setSubmitPhase("finalizing");

      const leadCodigo =
        (saved as any)?.lead?.codigo ||
        (saved as any)?.form?.lead_codigo ||
        (saved as any)?.lead_codigo ||
        undefined;
      toast({
        title: "Registro creado",
        description: `OK${leadCodigo ? ` · Lead: ${String(leadCodigo)}` : ""}`,
      });
      // Opcional: reset y volver a calendario
      setFormData({
        name: "",
        email: "",
        whatsappNumber: "",
        instagramUser: "",
        monthlyBudget: "",
        mainObstacle: "",
        commitment: "",
        inviteOthers: "no",
        confirmado: "",
        textMessages: "",
      });
      setSelectedTime(null);
      setSelectedDate(null);
      setStep("calendar");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setSubmitPhase(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-sm overflow-hidden flex flex-col lg:flex-row">
        <div className="w-full lg:w-[340px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 sm:p-6 lg:flex-shrink-0">
          {step === "details" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("calendar")}
              className="mb-4 -ml-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Atrás
            </Button>
          )}
          <div className="space-y-4">
            <div className="w-full">
              <img
                src={logoUrl || "/placeholder.svg"}
                alt="Logo"
                className="w-full h-auto rounded-md"
              />
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={avatarUrl || "/placeholder.svg"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Hotselling Lite
                </p>
                <h1 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                  {campaignName || eventTitle}
                </h1>
              </div>
              {campaignDescription ? (
                <p className="text-sm text-gray-600 leading-snug">
                  {campaignDescription}
                </p>
              ) : (
                <p className="text-sm text-gray-600 leading-snug">
                  {eventDescription}
                </p>
              )}
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Clock className="w-4 h-4" />
                <span>{eventDuration} min</span>
              </div>
              {selectedDate && selectedTime && (
                <div className="text-sm text-gray-700 border-t pt-3 space-y-1">
                  <div className="font-medium">
                    {selectedDate.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <div>{selectedTime}</div>
                </div>
              )}
              <div className="space-y-2 text-sm border-t pt-3">
                <p className="text-gray-900 font-medium leading-snug">
                  ¡Este espacio está destinado a la pre-admisión a HOTSELLING
                  LITE!
                </p>
                <p className="text-gray-600 leading-relaxed text-xs">
                  {eventDescription}
                </p>
                <p className="text-gray-900 font-medium pt-2 text-xs">
                  Las horas se muestran en tu horario local.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {step === "calendar" ? (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Selecciona una fecha y hora
              </h2>
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="w-full md:w-[320px] md:flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousMonth}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-semibold text-base capitalize">
                      {monthNames[currentMonth.getMonth()]}{" "}
                      {currentMonth.getFullYear()}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextMonth}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {[
                      "DOM.",
                      "LUN.",
                      "MAR.",
                      "MIÉ.",
                      "JUE.",
                      "VIE.",
                      "SÁB.",
                    ].map((day) => (
                      <div
                        key={day}
                        className="text-center text-[11px] font-semibold text-gray-600 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {emptyDays.map((i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {days.map((day) => {
                      const date = new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth(),
                        day
                      );
                      const isSelected =
                        selectedDate?.toDateString() === date.toDateString();
                      const isPast =
                        date < new Date(new Date().setHours(0, 0, 0, 0));
                      const isDayAvailable = (() => {
                        if (!availabilityByDate) return true;
                        const key = toDateKeyLocal(date);
                        const slots = availabilityByDate.get(key) || [];
                        return Array.isArray(slots) && slots.length > 0;
                      })();
                      const disabled = isPast || !isDayAvailable;
                      return (
                        <button
                          key={day}
                          onClick={() => !disabled && handleDateSelect(day)}
                          disabled={disabled}
                          className={cn(
                            "aspect-square flex items-center justify-center rounded text-sm transition-colors font-normal",
                            disabled && "text-gray-300 cursor-not-allowed",
                            !disabled &&
                              !isSelected &&
                              "text-blue-600 hover:bg-blue-50",
                            isSelected && "bg-blue-600 text-white font-semibold"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">Zona horaria</span>
                    </div>
                    <button className="w-full text-left text-sm text-blue-600 hover:underline truncate">
                      {timezone.replace(/_/g, " ") || "Detectando..."}
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  {selectedDate ? (
                    <>
                      <h3 className="font-semibold mb-4 text-base capitalize">
                        {selectedDate.toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </h3>
                      {availabilityLoading ? (
                        <div className="text-sm text-gray-500 text-center py-10">
                          Cargando horarios disponibles...
                        </div>
                      ) : slotsForSelectedDate.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-10">
                          No hay horarios disponibles para este día.
                        </div>
                      ) : (() => {
                        const morning = slotsForSelectedDate.filter((t) => {
                          const h = Number(t.split(":")[0]);
                          return h >= 6 && h < 12;
                        });
                        const afternoon = slotsForSelectedDate.filter((t) => {
                          const h = Number(t.split(":")[0]);
                          return h >= 12 && h < 18;
                        });
                        const evening = slotsForSelectedDate.filter((t) => {
                          const h = Number(t.split(":")[0]);
                          return h >= 18;
                        });
                        const groups = [
                          { label: "Mañana", icon: <Sun className="w-4 h-4" />, slots: morning, color: "amber" },
                          { label: "Tarde", icon: <Sunset className="w-4 h-4" />, slots: afternoon, color: "orange" },
                          { label: "Noche", icon: <Moon className="w-4 h-4" />, slots: evening, color: "indigo" },
                        ].filter((g) => g.slots.length > 0);

                        return (
                          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                            {groups.map((group) => (
                              <div key={group.label}>
                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600">
                                  {group.icon}
                                  <span>{group.label}</span>
                                  <span className="text-xs text-gray-400">({group.slots.length})</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {group.slots.map((time) => (
                                    <button
                                      key={time}
                                      onClick={() => {
                                        setSelectedTime(time);
                                        setStep("details");
                                      }}
                                      className={cn(
                                        "py-2.5 px-2 text-center rounded-lg text-sm font-medium transition-all duration-150",
                                        "border hover:shadow-md hover:scale-[1.03] active:scale-95",
                                        selectedTime === time
                                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                          : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                                      )}
                                    >
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-12">
                      Selecciona una fecha para ver los horarios disponibles
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-5">
                Introduzca los detalles
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1.5 h-10"
                  />
                  <Button
                    variant="link"
                    className="mt-1 p-0 h-auto text-xs text-blue-600"
                  >
                    Añadir invitados
                  </Button>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium">
                    ¿Necesitas consultar con alguien para realizar inversiones
                    en tu negocio? <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    (De ser así, por favor invita a esa persona tocando el botón
                    de "añadir invitados" que está arriba).
                  </p>
                  <RadioGroup
                    value={formData.inviteOthers}
                    onValueChange={(value) =>
                      setFormData({ ...formData, inviteOthers: value })
                    }
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      <RadioGroupItem
                        value="no"
                        id="invite-no"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="invite-no"
                        className="font-normal text-sm leading-relaxed cursor-pointer"
                      >
                        No necesito a nadie para tomar decisiones.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem
                        value="yes"
                        id="invite-yes"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="invite-yes"
                        className="font-normal text-sm leading-relaxed cursor-pointer"
                      >
                        Necesito a mi socio o pareja para tomar decisiones de
                        inversión.
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-medium">
                    ¿Cuál es tu número de WhatsApp? (Solo lo utilizaremos para
                    confirmar tu sesión) <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                    Por favor revisa que esté bien escrito. Si el número es
                    inválido o no respondes, tendremos que CANCELAR la llamada.
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <div className="w-20 h-10 border rounded-md flex items-center justify-center gap-1 text-sm shrink-0 bg-gray-50">
                      <span className="text-base">{countryFlag}</span>
                    </div>
                    <Input
                      id="whatsapp"
                      required
                      value={formData.whatsappNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsappNumber: e.target.value,
                        })
                      }
                      placeholder="Número de teléfono"
                      className="flex-1 h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="instagram" className="text-sm font-medium">
                    ¿Cuál es tu usuario de Instagram? Ej: @javierquest (Si no
                    tienes responde "NT"){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="instagram"
                    required
                    value={formData.instagramUser}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagramUser: e.target.value,
                      })
                    }
                    placeholder="@usuario"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="budget" className="text-sm font-medium">
                    ¿Cuál es tu meta de facturación mensual en USD, de aquí a 6
                    meses? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="budget"
                    required
                    value={formData.monthlyBudget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyBudget: e.target.value,
                      })
                    }
                    placeholder="Ej: $10,000"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="obstacle" className="text-sm font-medium">
                    ¿Cuál crees que es tu mayor obstáculo para lograr tu meta de
                    facturación? (No lo pienses demasiado).{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="obstacle"
                    required
                    value={formData.mainObstacle}
                    onChange={(e) =>
                      setFormData({ ...formData, mainObstacle: e.target.value })
                    }
                    className="mt-1.5 min-h-20 resize-none"
                    placeholder="Escribe tu respuesta..."
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium">
                    ¿Te comprometes a asistir a tiempo y sin distracciones a la
                    sesión? <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    Si no puedes asistir por favor NO agendes, recuerda que solo
                    tienes una oportunidad para tomar esta llamada.
                  </p>
                  <RadioGroup
                    value={formData.commitment}
                    onValueChange={(value) =>
                      setFormData({ ...formData, commitment: value })
                    }
                    required
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      <RadioGroupItem
                        value="yes"
                        id="commit-yes"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="commit-yes"
                        className="font-normal leading-relaxed text-sm cursor-pointer"
                      >
                        Me comprometo a asistir a la sesión a tiempo. Estaré
                        atento/a a mi WhatsApp para confirmar mi sesión cuando
                        mi asesor asignado me escriba.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem
                        value="no"
                        id="commit-no"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="commit-no"
                        className="font-normal text-sm cursor-pointer"
                      >
                        No asistiré y dejaré esperando a mi asesor asignado.
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="confirmado" className="text-sm font-medium">
                    IMPORTANTE: Antes de tu agenda procederemos a contactarte y
                    hacerte 3 preguntas rápidas de pre-filtro, si estás de
                    acuerdo coloca "CONFIRMADO", de lo contrario tendremos que
                    CANCELAR TU CITA. <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmado"
                    required
                    value={formData.confirmado}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmado: e.target.value })
                    }
                    placeholder="Escribe CONFIRMADO"
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="textMessages" className="text-sm font-medium">
                    Enviar mensajes de texto a
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="w-20 h-10 border rounded-md flex items-center justify-center gap-1 text-sm shrink-0 bg-gray-50">
                      <span className="text-base">{countryFlag}</span>
                    </div>
                    <Input
                      id="textMessages"
                      value={formData.textMessages}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          textMessages: e.target.value,
                        })
                      }
                      placeholder="Número de teléfono"
                      className="flex-1 h-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Al continuar, confirma que ha leído y está de acuerdo con las
                  Condiciones de uso de Calendly y Aviso de privacidad.
                </p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-semibold shadow-sm"
                >
                  {submitting
                    ? submitPhase === "finalizing"
                      ? "Finalizando..."
                      : "Creando..."
                    : "Programar evento"}
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Será redirigido a un sitio externo.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
