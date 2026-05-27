"use client";

import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "already" | "error";

const CONSENT_ITEMS = [
  "El agente utiliza inteligencia artificial y actualmente se encuentra en fase experimental y de optimización.",
  "Algunas respuestas, automatizaciones, clasificaciones o acciones generadas por el agente podrían contener errores, imprecisiones, omisiones o inconsistencias operativas.",
  "El agente constituye una herramienta complementaria de apoyo al área de Atención al Cliente (ATC) y no reemplaza completamente el soporte humano ni modifica el alcance contractual del programa Hotselling PRO.",
  "El sistema podrá facilitar el levantamiento de tickets y el escalamiento a atención humana cuando el caso lo requiera.",
  "Mi participación tiene como finalidad colaborar activamente en la validación y mejora de la experiencia antes de su lanzamiento general.",
  "Me comprometo a proporcionar feedback honesto, respetuoso y colaborativo a través de los formularios y canales definidos por el equipo.",
  "No debo ingresar contraseñas, accesos privados, información financiera sensible, datos médicos, secretos empresariales ni datos de terceros sin autorización.",
  "Autorizo el tratamiento de la información compartida durante el piloto, incluyendo preguntas, tickets, registros de uso, métricas de interacción, feedback y respuestas generadas, con fines de mejora operativa, análisis interno y optimización del sistema.",
  "Reconozco que las respuestas generadas por inteligencia artificial deben ser verificadas y que MHF GROUP LLC no garantiza exactitud absoluta, continuidad ininterrumpida ni resultados específicos derivados del uso del agente durante esta fase piloto.",
];

const VOLUNTEER_BULLETS = [
  "Resolver dudas operativas frecuentes",
  "Solicitar ayuda de manera más rápida",
  "Levantar tickets de soporte directamente desde el agente",
  "Escalar conversaciones a un humano cuando sea necesario",
  "Facilitar la gestión y seguimiento de solicitudes dentro del ecosistema Hotselling",
];

const COMMITMENT_BULLETS = [
  "Utilizar activamente el agente",
  "Probar diferentes tipos de solicitudes y preguntas",
  "Reportar errores, fricciones o respuestas confusas",
  "Compartir sugerencias de mejora",
  "Completar el formulario de feedback que te enviaremos durante y al finalizar la prueba",
];

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function ConsentimientoPilotoPage() {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [checked, setChecked] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !isEmail(email.trim())) {
      setErrorMsg("Ingresa un email válido.");
      return;
    }
    if (!checked) {
      setErrorMsg("Debes leer y aceptar los términos para continuar.");
      return;
    }
    setErrorMsg("");
    setFormState("loading");

    try {
      const res = await fetch("/api/piloto-ia/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nombre: nombre.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Error al registrar tu aceptación.");
      }

      setFormState(data.already ? "already" : "success");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Ocurrió un error. Intenta nuevamente.");
      setFormState("error");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-zinc-900 text-white">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-600 shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-white"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">
              Hotselling PRO
            </p>
            <p className="text-zinc-400 text-xs">
              Piloto Privado · Agente IA de Soporte ATC
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        {/* ── Confirmation / success states ───────────────────────── */}
        {(formState === "success" || formState === "already") && (
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="bg-emerald-500 h-2 w-full" />
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              {formState === "already" ? (
                <>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Ya tienes tu participación confirmada
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Tu email <strong>{email}</strong> ya estaba registrado en el
                    piloto. ¡Gracias por tu entusiasmo!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    ¡Participación confirmada!
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Hemos registrado tu consentimiento. El equipo Hotselling
                    habilitará tu acceso al piloto en breve. ¡Gracias por
                    ayudarnos a mejorar!
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Main card (shown while idle / loading / error) ────── */}
        {formState !== "success" && formState !== "already" && (
          <>
            {/* Intro */}
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <div className="bg-violet-600 h-1.5 w-full" />
              <div className="p-6 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
                    Piloto privado en curso
                  </span>
                </div>

                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  Confirmación de Voluntariado
                  <br />
                  <span className="text-violet-600">
                    Agente IA de Soporte ATC
                  </span>
                </h1>

                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Durante los próximos <strong>5 días</strong> tendrás acceso
                  anticipado a esta nueva herramienta, diseñada para ayudarte a:
                </p>

                <ul className="space-y-2">
                  {VOLUNTEER_BULLETS.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-2.5 w-2.5 text-violet-600 dark:text-violet-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    ⚠️ Importante
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Este agente se encuentra actualmente en fase de prueba y
                    optimización, por lo que algunas respuestas,
                    automatizaciones o flujos podrían presentar errores.{" "}
                    <strong>Tu participación y feedback serán clave</strong>{" "}
                    para mejorar la experiencia antes del lanzamiento oficial.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                    ¿Qué necesitaremos de ti?
                  </p>
                  <ul className="space-y-1.5">
                    {COMMITMENT_BULLETS.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400"
                      >
                        <span className="mt-0.5 text-violet-500">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Disclaimer del Agente ── */}
            <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                ⚠️ Disclaimer — Agente en piloto privado
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Este Agente IA de Soporte ATC se encuentra actualmente en fase
                de prueba y optimización. Algunas respuestas o automatizaciones
                pueden contener errores o inconsistencias. Si lo necesitas,
                puedes solicitar escalamiento a un agente humano directamente
                desde la conversación. Tu feedback durante esta prueba será
                fundamental para ayudarnos a mejorar la experiencia antes del
                lanzamiento oficial.
              </p>
            </div>

            {/* ── Términos del consentimiento informado ── */}
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setTermsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left group"
              >
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Consentimiento Informado — Prueba Piloto Agente IA ATC
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${termsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {termsOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-4 leading-relaxed">
                    Al aceptar, declaras que participas voluntariamente en la
                    prueba piloto del Agente IA de Soporte ATC de Hotselling PRO
                    durante un período de cinco (5) días, y que entiendes y
                    aceptas todos los puntos descritos a continuación:
                  </p>
                  <ol className="space-y-3">
                    {CONSENT_ITEMS.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {item}
                        </p>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 leading-relaxed border-t border-zinc-100 dark:border-zinc-800">
                    Al aceptar este consentimiento, manifiestas tu aceptación
                    expresa e informada para participar en la prueba piloto del
                    Agente IA de Soporte ATC. · MHF GROUP LLC
                  </p>
                </div>
              )}
            </div>

            {/* ── Acceptance form ─────────────────────────────────────── */}
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base mb-1">
                  Confirmar mi participación
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ingresa tu email y acepta los términos para activar tu acceso
                  al piloto.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="nombre"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Nombre (opcional)
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                    />
                    <div className="h-4 w-4 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 peer-checked:bg-violet-600 peer-checked:border-violet-600 transition flex items-center justify-center">
                      {checked && (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                    He leído el consentimiento informado y acepto los términos
                    de participación en el piloto privado del Agente IA de
                    Soporte ATC de Hotselling PRO.
                  </span>
                </label>

                {(formState === "error" || errorMsg) && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-xs text-red-700 dark:text-red-400">
                    {errorMsg || "Ocurrió un error. Intenta nuevamente."}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formState === "loading"}
                  className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {formState === "loading" ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Registrando...
                    </>
                  ) : (
                    "Confirmar mi participación →"
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="max-w-2xl mx-auto px-5 py-8 text-center">
        <p className="text-xs text-zinc-400">
          © Hotselling · MHF GROUP LLC · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
