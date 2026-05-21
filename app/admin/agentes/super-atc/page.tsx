"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Target,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Textarea } from "@/components/ui/textarea";
import { getAuthToken } from "@/lib/auth";
import { AgenteAtcChat } from "@/components/chat/AgenteAtcChat";
import { type AIProvider } from "@/components/chat/AgenteAtcChat";
import { AI_PROVIDER_KEY } from "@/app/admin/agentes/page";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";
const KB_ENTITY = "super_atc_knowledge_base";
const KB_ENTITY_ID = "v1";

type Tab = "kb" | "test";

// ─── KB Types ─────────────────────────────────────────────────────────────────

interface KbSecciones {
  garantias: string;
  pausas: string;
  extensiones: string;
  fidelidad_metodo: string;
  contratos: string;
  faqs: string;
  casos_historicos: string;
  limitaciones: string;
}

const KB_DEFAULTS: KbSecciones = {
  garantias: `=== GARANTÍA — Hotselling PRO ===
Antes de abordar la garantía, ofrecer siempre en este orden:
1. Sesión de claridad con el coach (reenfoque, plan de acción)
2. Pausa (si el alumno manifiesta ansiedad por falta de tiempo)
3. Continuidad por membresía
   Mensaje clave: "¿Sabías que puedes mantener tu garantía pagando una membresía simbólica? $97 hasta el 13-may-2026, luego $250/mes. Sigues con coaches, garantía y acceso completo."
   NOTA: aplica SOLO si el alumno está dentro de los primeros 4 meses del contrato.

Criterios para que aplique la garantía PRO:
- Completó todas las tareas de las 5 fases dentro del tiempo asignado
- Está dentro de los 4 meses de acceso al programa
- El contrato está al día con los pagos
- La solicitud es por falta de resultados con implementación real del método

Proceso de indagación:
1. Abordaje empático: "Queremos entender más tu solicitud para ofrecerte la mejor solución."
2. Indagar: "¿Cómo te fue con las tareas? ¿Pudiste implementar las estrategias?"
3. Revisar fases: "¿Pudiste completar todas las fases o hubo alguna con dificultades?"
4. Ofrecer membresía PRIMERO antes de indagar motivo (si está dentro de los 4 meses)
5. Sesión de claridad: "¿Has considerado una sesión con tus coaches para analizar tu caso?"
6. Confirmar pagos al día

Si el alumno insiste y está en los tiempos → enviar formato de auditoría (plazo: 3 días para completarlo).

PROCESO DE AUDITORÍA:
- El alumno solicita el reembolso por compromiso mutuo
- Se verifica que esté dentro de los tiempos contractuales
- Se responde por correo con el formato de auditoría (3 días hábiles para completarlo)
- Una vez recibido: se crea carpeta con toda la recopilación del caso (contrato, solicitud, formato, feedback y contexto de coaches)
- Duración del proceso: 5-7 días hábiles
- Respuesta final: de la mano del equipo legal
- Si se niega y el alumno pide reconsideración → equipo operaciones + ATC + legal → propuesta comercial o cierre definitivo

=== GARANTÍA — Hotselling Starter ===
La garantía Starter es SOLO extensión de tiempo (NO reembolso monetario).
Si el alumno solicita → enviar correo, documentar caso con preguntas de indagación para entender el motivo y conceder la extensión.`,

  pausas: `=== PAUSAS — REGLA ABSOLUTA ===
El alumno tiene UNA SOLA pausa disponible durante todo el programa.
NO existen "2 pausas". NUNCA decir "tienes derecho a 2 pausas". NO inventar cantidad distinta.

--- Hotselling Starter ---
NO aplica pausa durante los 4 meses del programa (según contrato).
Si el alumno pide pausa → informar que la pausa no aplica en el programa Starter.

--- Hotselling PRO ---
UNA pausa de hasta 30 días totales (continuos o fraccionados).
Opciones disponibles: 1 semana / 15 días / 1 mes. No existen otras opciones de duración.
La pausa se aplica de fecha fija a fecha fija (ej: jueves a jueves).
Condición OBLIGATORIA: el alumno debe estar al día con los pagos.
Si hay mora → NO se concede la pausa hasta regularizar.
Motivo grave (salud, situación justificada): solicitar soporte/aval comprobable, con respeto.
Motivo personal (vacaciones, trabajo, etc.): es un beneficio contractual, no requiere justificación.

Proceso de indagación:
1. "Lamentamos que estés pasando por esto. Queremos ayudarte de la mejor manera."
2. "¿Podrías contarnos un poco más sobre la razón por la que necesitas pausar?"
3. Verificar internamente si está al día con pagos (sin decirle que tiene mora aún)
4. Si hay mora → informar que para activar la pausa primero debe regularizar los pagos
5. Si no hay mora → confirmar fechas de inicio y fin de la pausa`,

  extensiones: `=== EXTENSIONES — Hotselling Starter ===
Incluye extensión de 4 meses adicionales SIN COSTO si el alumno no creó su negocio al finalizar los 4 meses del programa.
El alumno DEBE solicitarlo — no se aplica automáticamente.

=== EXTENSIONES — Hotselling PRO ===
Extensiones de 1-2 meses, evaluadas caso a caso.

Casos que se pueden aprobar:
1. Coach de tráfico y copy confirman que el alumno está en periodo de trascendencia/ventas (cerca de ser caso de éxito)
2. El alumno presentó motivo humanitario comprobable con soporte documental (enfermedad, etc.)

IMPORTANTE E INDISPENSABLE: el alumno debe tener BUENA ACTITUD.
Si tiene antecedentes con coaches, quejas o conflictos → abordar por línea estricta y legal.
Por contrato, si necesita más tiempo debe pagar membresía.
Si no quiere pagar membresía y es problemático → protocolo legal.

Casos de éxito (grabados y documentados): 30 días extensión SIN COSTO + 1 mes membresía a $97. Luego precio regular.
Prospectos de caso de éxito: extensión extraordinaria sin costo (tiempo coordinado con coach). Tras grabación → mes extra + membresía $97.

NOTA: Los 4 meses extra SOLO aplican posterior a reembolso por compromiso mutuo con informe final post-auditoría favorable al alumno.
Las extensiones ordinarias son de 1-2 meses.
Todo acuerdo de extensión extraordinaria debe quedar documentado por escrito firmado por el alumno (OTROSÍ).

Proceso de indagación:
1. "Queremos ofrecerte una solución que se ajuste a tu situación."
2. "¿Cuáles son las razones por las que necesitas más tiempo?"
3. "¿Has completado todas las fases o hay alguna pendiente?"
4. ¿Es prospecto a caso de éxito? Confirmar con coach de tráfico y copy.
5. Confirmar pagos al día`,

  fidelidad_metodo: `=== CONDICIÓN OBLIGATORIA — FIDELIDAD AL MÉTODO HOTSELLING ===

Se invalida AUTOMÁTICAMENTE la garantía si el alumno utilizó materiales externos:
- Copys o creativos externos (textos/anuncios que no sigan las plantillas del programa)
- Páginas de ventas o embudos externos (no los entregados por el programa)
- Estrategias híbridas con métodos externos sin aprobación del coach

Justificación: el programa garantiza una ruta probada. El uso de materiales externos altera las variables de medición, impidiendo que los coaches puedan diagnosticar el error.

Acción del equipo ATC antes de escalar:
- Verificar en X Academy Space o en las entregas del alumno si el material utilizado es el oficial.

Respuesta estándar en caso de incumplimiento:
"Tras revisar su implementación, detectamos el uso de materiales (copys/páginas) ajenos a la metodología oficial de Hotselling. Le recordamos que nuestra garantía se basa en la aplicación estricta del método validado. Al utilizar elementos externos no sugeridos por el programa, se invalida el proceso de garantía. Le invitamos a ajustar su estrategia a los materiales del programa para obtener el soporte adecuado."

Indicadores para escalar a Líder ATC / Comercial / Legal:
- Solicitudes de pausa fuera de condiciones o con pagos pendientes
- Alumno con bajo compromiso o sin tareas clave completadas
- Decisiones con riesgo legal o comercial significativo`,

  contratos: `=== ESTADOS OPERATIVOS DE ALUMNOS ===

1. ACTIVO
   - Contrato vigente dentro de los tiempos del programa (4-6 meses)
   - Acceso completo: tickets, chat, soporte, Space
   - Automático al activar contrato, se mantiene hasta fecha de vencimiento

2. INACTIVO POR PAGO
   - Alumno con mora, cuotas vencidas o incumplimiento de pago
   - Restricciones: sin tickets, sin chat, sin soporte (solo visualización básica)
   - Activación MANUAL por equipo ATC/Admin
   - Salida: cuando confirma pago → vuelve a Activo o pasa a Membresía

3. ACTIVO MEMBRESÍA
   - Contrato principal vencido, continúa pagando membresía
   - Acceso completo: tickets, chat, soporte, Space
   - Duración: 30 días por membresía activa
   - Activación MANUAL tras validar pago de membresía
   - Al cumplir 30 días → 5 días de gracia → si no renueva → Completado
   - ATENCIÓN: al registrarse la 5ta membresía, se eliminan bonos contractuales y pierde derecho a garantía

4. COMPLETADO
   - Contrato/membresía finalizado y superó periodo de gracia (5 días)
   - Sin tickets, sin chat, sin soporte
   - Automático: 5 días después del vencimiento contractual o de membresía

=== LINEAMIENTO MEMBRESÍAS ===

Hotselling Starter: $97/mes (precio se mantiene)
Hotselling PRO — Nuevo precio: $250/mes o $600 trimestral

Reglas por caso:
- Contratos por vencer (válido para contratos vencidos antes del 14-may-2026): ventana 5 días hábiles para activar membresía a $97. Tras esos 5 días → precio nuevo.
- Contratos por vencer desde 14-may-2026 en adelante: membresía a $250/mes o $600 trimestral.
- Casos de éxito (grabados): 30 días extensión sin costo + 1 mes membresía a $97. Luego precio regular.
- Prospectos de caso de éxito: extensión extraordinaria sin costo. Tras grabación: mes extra + membresía $97.
- Alumnos vencidos con 10+ días de inactividad: retirar accesos Space/Skool. Si retoman → precio nuevo $250/$600.
- Alumnos en Fase 5 con contrato por vencer/vencido: indagar primero si es prospecto o caso de éxito ANTES de comunicar precio nuevo.

=== MENSAJES SUGERIDOS POR ESCENARIO ===

--- CASO 1: Contrato PRO por vencer (0-7 días), contratos vencidos ANTES del 14-may-2026 ---
Ventana: 5 días hábiles para activar membresía a $97. Pasados esos 5 días → precio nuevo.
Mensaje: "Hola [Nombre], te escribo porque la fecha de vencimiento de tu contrato está cerca y quería escribirte personalmente para que no pierdas continuidad en tu proceso. Durante estos días tienes una ventana de 5 días hábiles donde aún puedes activar tu membresía con el valor anterior de $97, como parte de esta transición. Después de ese tiempo, la membresía pasa al nuevo valor. Si sientes que este es el momento para seguir avanzando, este sería el mejor punto para hacerlo. Quedo atento para orientarte en los siguientes pasos. Un abrazo."

--- CASO 2: Contrato PRO por vencer desde el 14-may-2026 en adelante ---
Mensaje: "Hola [Nombre], te escribo porque la fecha de vencimiento de tu contrato está cerca y quería darte seguimiento para que puedas organizar bien tu proceso. Contarte que el valor de la membresía de continuidad de Hotselling ha sido actualizada, y a partir de ahora el valor es de $250 mensual o $600 trimestral. Esto responde a una evolución en todo lo que estamos construyendo a nivel de soporte, estructura y acompañamiento. Mi recomendación es que lo tengas en el radar desde ya, para que tomes la decisión con claridad cuando llegue el momento. Cualquier duda, estoy aquí para servirte. Un abrazo."

--- CASO 3: Caso de éxito (grabado y documentado) ---
Beneficio: 30 días extensión sin costo + 1 mes membresía a $97. Luego precio regular.
Mensaje: "Hola [Nombre], primero felicitarte nuevamente por lo que lograste dentro de Hotselling, es un orgullo para nosotros. Queremos acompañarte un poco más, por eso te vamos a brindar 30 días adicionales sin costo, y además podrás tomar 1 mes de membresía al valor anterior de $97. Una vez finalice este beneficio y si decides continuar, ya entrarías al nuevo esquema de membresía. Para avanzar con los 30 días de extensión, te estaremos haciendo llegar un acuerdo para que puedas firmar y continuar con tu progreso. Quedo atento si surgen dudas. Un abrazo."

--- CASO 4: Prospecto a caso de éxito ---
Beneficio: extensión extraordinaria sin costo (tiempo coordinado con coach). Tras grabación → mes extra + membresía $97.
Mensaje: "Hola [Nombre], he estado revisando tu proceso y noté que estás en un punto importante. En Hotselling queremos darte el espacio necesario para que puedas lograr esa trascendencia, así que vamos a acompañarte con una extensión extraordinaria sin costo, alineado con lo que necesites ejecutar. La idea es que puedas avanzar con foco y completar este proceso. Una vez logremos consolidar tu caso, revisamos juntos los siguientes pasos. Te estaremos enviando un acuerdo que necesitamos firmes para continuar con tu progreso. Vamos con todo."

--- CASO 5: Alumno vencido con 10+ días de inactividad ---
Acción: retirar accesos Space/Skool. Si retoman → precio nuevo $250/$600.
Mensaje (automatizar por correo): "Hola [Nombre], vimos que llevas un tiempo sin actividad en el programa y por eso tus accesos fueron cerrados. Si en algún momento decides retomar tu proceso, estaremos felices de acompañarte nuevamente. Actualmente, la membresía de continuidad tiene un valor de $250 mensual o $600 trimestral. Si sientes que es tu momento de seguir escalando, contáctanos."

--- CASO 6: Alumno vencido pero sigue activo aprovechando el servicio ---
Acción: notificar, dar 5 días de gracia. Si no paga → retirar accesos Space/Skool.
Mensaje: "Hola [Nombre], espero te encuentres muy bien. Quería escribirte porque notamos que tu contrato ya finalizó, sin embargo vemos que sigues activo dentro del proceso y esto habla muy bien de tu compromiso. Para que puedas continuar con acceso completo al acompañamiento, es necesario activar la membresía. Puedes acceder en dos opciones: $250 mensual o $600 trimestral. Tienes 5 días para realizarlo y así mantener la continuidad sin interrupciones. Avísame cómo deseas avanzar y con gusto te oriento. Un abrazo."

--- CASO 7: Alumno en Fase 5 con contrato por vencer o vencido ---
Acción: indagar PRIMERO si es prospecto a caso de éxito o ya es caso de éxito. NUNCA comunicar precio antes de saber dónde está.
Mensaje: "Hola [Nombre], te escribo porque me gustaría entender en qué punto estás dentro de Hotselling y cómo ha sido tu experiencia. ¿Cómo vas con tus resultados actualmente? ¿Ya estás generando ventas o estás cerca de lograrlo? La idea es revisar contigo si estamos frente a tu pronta trascendencia y definir desde ahí el siguiente paso. Estaré muy atento a ti." (Dependiendo de la respuesta, abordar conforme a criterios siempre de la mano del Líder de Área).`,

  faqs: `=== CLASIFICACIÓN DE RIESGO — GUÍA PARA EL AGENTE ===

RIESGO BAJO — respuesta automática directa:
- Consultas operativas: accesos, membresía, continuidad, contratos, fechas de vencimiento
- FAQs sobre pausas, extensiones, bonos, fases
- Estado del proceso, coaches asignados, tickets
Acción: proporcionar respuesta clara e informativa

RIESGO MEDIO — respuesta empática + seguimiento:
- Inconformidad, ansiedad o frustración con el proceso
- Pagos duplicados → escalar a Líder ATC
- Cobros automáticos por error → escalar a Líder ATC
- Casos de salud o situaciones personales complejas
Acción: respuesta empática + crear ticket si aplica + sugerir seguimiento

RIESGO ALTO — ESCALAMIENTO OBLIGATORIO — crear ticket urgente + notificar Líder ATC:
- Reembolso acompañado de amenaza
- Solicitudes extraordinarias fuera de protocolo
- Disputa PayPal o cargos revertidos
- Acusaciones, amenaza legal, mención de abogado o demanda
- Fraude, estafa
- Crisis reputacional (redes sociales, reseñas negativas como amenaza)
- Crisis emocional severa
Acción: crear ticket urgente automáticamente + escalar a Líder ATC para canalizar al departamento correspondiente

PALABRAS CLAVE QUE ACTIVAN ESCALAMIENTO AUTOMÁTICO:
PayPal, disputa, demanda, abogado, fraude, estafa, amenaza, acusación, legal, tribunal, denuncia, reputación, prensa, crisis

=== LÍMITE DE TICKETS POR ALUMNO ===
Máximo 10 tickets por semana por alumno.
- Informar al alumno cuántos tickets le quedan si está cerca del límite
- Bloquear creación de tickets si supera el límite semanal
- Sugerir consolidar varias dudas en un solo ticket

=== MATRIZ DE DECISIÓN ===
Contrato vencido → explicar continuidad por membresía → NO escalar
Solicitud garantía → explicar proceso y requisitos → SÍ escalar si insiste Y aplica en tiempos y forma
Reembolso emocional → contener, ser empático → SÍ escalar a Líder ATC
Pausa por salud → revisar días disponibles, verificar pagos → escalar solo si es complejo
Membresía → explicar opciones y precios → NO escalar
PayPal / disputa / cargo revertido → congelar accesos + crear ticket urgente → SÍ escalar OBLIGATORIO
Crisis emocional → contener → SÍ escalar si es severa
Solicitud extensión → evaluar criterios (actitud, pagos, trascendencia) → escalar a Líder si es extraordinaria
Bonos → verificar estado contractual y membresías activas → escalar si hay duda
Amenaza legal → NO responder de fondo → crear ticket urgente → escalar OBLIGATORIO a legal

=== FLUJO CO-PRODUCTORES ===

FASE 0 — IDENTIFICACIÓN
- ATC debe marcar si el alumno es Emprendedor o Co-productor
- Si es co-productor → flujo especial

FASE 1 — FUNDACIÓN (obligatoria)
- Debe completar MÓDULO DE COPRODUCCIÓN antes de avanzar
- Debe salir con: experto definido, nicho definido, oferta clara, estrategia base
- Si NO completa → no puede avanzar ni alegar garantía después

FASE 2 — COMPROMISO ESTRUCTURAL
- Regla de oro: 1 experto + 1 nicho + 1 embudo
- Si cambia experto, nicho o trabaja con varios clientes → ALERTA: reinicia proceso, pierde elegibilidad de garantía

FASE 3 — EJECUCIÓN
- Debe avanzar por fases, entregar tareas, iterar estrategia, ejecutar campañas
- Error crítico: "No avancé porque buscaba experto" → INVALIDA proceso

FASE 4 — IMPLEMENTACIÓN REAL
- Demostrar: ecosistema creado, campañas activas, iteraciones realizadas
- Sin implementación real → NO hay garantía

FASE 5 — PRE-GARANTÍA (filtro obligatorio)
Checklist: (1) Completó módulo coproducción, (2) Trabajó con 1 solo experto, (3) Mantuvo 1 solo nicho, (4) Completó fases, (5) Ejecutó campañas, (6) Iteró estrategia.
Si falla 1 → NO escala a garantía → redirigir a extensión, reenfoque o sesión de claridad.

FASE 6 — GARANTÍA
Solo si todo lo anterior cumplido: solicitud → formulario auditoría → validación técnica → decisión.

Semáforo:
VERDE: ejecutó todo → sí aplica garantía → escalar a auditoría
AMARILLO: ejecución incompleta → sesión de claridad, extensión, reenfoque
ROJO: proceso inválido (cambió experto/nicho, no completó módulo) → bloquear escalamiento

=== PREGUNTAS FRECUENTES ===

P: ¿Puedo pausar mi programa?
R (PRO): Sí, tienes UNA pausa de hasta 30 días (continuos o fraccionados). Opciones: 1 semana, 15 días o 1 mes. Solo si estás al día con los pagos. Si hay mora, primero regularizar.
R (Starter): No, la pausa no aplica en el programa Starter.

P: ¿Qué pasa cuando vence mi contrato?
R: Tienes 5 días de gracia. Si adquieres membresía dentro de ese plazo puedes continuar. Si no, tu estado pasa a Completado y se retiran accesos.

P: ¿Cuánto cuesta la membresía?
R (Starter): $97/mes. R (PRO): $250/mes o $600 trimestral (desde 14-may-2026).

P: ¿Tengo garantía?
R: Aplica si: completaste las 5 fases dentro del tiempo del contrato, estás al día con pagos, y usaste únicamente materiales del programa.

P: ¿Cómo solicito una extensión?
R: Debes estar al día con pagos y demostrar compromiso. Extensiones de 1-2 meses según caso. Si eres prospecto a caso de éxito o tienes motivo humanitario comprobable, se evalúa sin costo.

P: ¿Qué es la membresía y qué incluye?
R: La membresía es la continuidad del programa una vez que vence el contrato original. Incluye acceso a la plataforma, soporte ATC, acceso a coaches y seguimiento. Sin membresía activa, los accesos se retiran.

P: ¿Cuándo pierdo el derecho a la garantía?
R: Pierdes el derecho si: usaste materiales externos al programa, cambiaste de experto o nicho durante el proceso, no completaste todas las fases, no estás al día con los pagos, o ya activaste tu 5ta membresía. Cualquiera de estas condiciones invalida la solicitud.`,

  casos_historicos: "",

  limitaciones: `El agente NO puede:
- Aprobar reembolsos (solo el líder ATC tras proceso de auditoría)
- Aprobar garantías (solo el líder ATC tras auditoría completa)
- Dar excepciones no contempladas en los protocolos
- Negociar valores o precios distintos a los oficiales documentados
- Aprobar extensiones extraordinarias sin autorización del líder ATC
- Aprobar pausas sin verificar que el alumno esté al día con los pagos
- Contradecir protocolos operativos o contractuales
- Modificar contratos ni addendums (OTROSÍ)
- Confirmar que un alumno aplica a garantía sin revisar el checklist de 6 puntos completo
- Prometer membresía a precio anterior fuera de la ventana de gracia de 5 días
- Inventar beneficios, reglas o plazos no documentados en esta base de conocimiento
- Responder de fondo ante amenazas legales, demandas o menciones de fraude/estafa (solo escalar)
- Reactivar accesos sin validación manual de pago por el equipo ATC/Admin
- Aprobar bonos sin verificar que el alumno no haya activado su 5ta membresía
- Confirmar que el alumno perdió la garantía sin revisar si usó materiales externos
- Decir que el alumno tiene 2 pausas — SIEMPRE es UNA SOLA pausa disponible
- Prometer resoluciones en plazos distintos a los oficiales (auditoría: 5-7 días hábiles)
- Tomar decisiones autónomas en casos con riesgo legal, comercial o reputacional

El agente SIEMPRE debe:
- Priorizar el contrato y los protocolos documentados
- Proteger operativamente a la empresa
- Mantener tono humano, cercano, cálido y profesional
- Contener emocionalmente antes de escalar
- Intentar resolver antes de escalar
- Reconocer cuándo es necesario escalar y hacerlo sin demora
- Ante cualquier duda sobre si escalar o no → ESCALAR`,
};

const KB_SECTIONS: {
  key: keyof KbSecciones;
  label: string;
  icon: React.FC<{ className?: string }>;
  placeholder: string;
  description: string;
}[] = [
  {
    key: "garantias",
    label: "Garantías",
    icon: ShieldCheck,
    description: "Protocolo completo de solicitud de garantía PRO y Starter",
    placeholder:
      "=== GARANTÍA — Hotselling PRO ===\nAntes de abordar la garantía, ofrecer siempre:\n1. Sesión de claridad con el coach...",
  },
  {
    key: "pausas",
    label: "Pausas",
    icon: Clock,
    description: "Criterios, duración y condiciones de pausa por programa",
    placeholder:
      "=== PAUSAS ===\n--- Starter: NO aplica ---\n--- PRO: UNA pausa de hasta 30 días ---\nOpciones: 1 semana / 15 días / 1 mes...",
  },
  {
    key: "extensiones",
    label: "Extensiones",
    icon: Timer,
    description: "Extensiones contractuales y extraordinarias por programa",
    placeholder:
      "=== EXTENSIONES — Starter ===\n4 meses adicionales sin costo...\n=== EXTENSIONES — PRO ===\n1-2 meses según caso...",
  },
  {
    key: "fidelidad_metodo",
    label: "Fidelidad al Método",
    icon: Target,
    description:
      "Condición obligatoria para garantía — materiales externos invalidan el proceso",
    placeholder:
      "Se invalida la garantía si el alumno usó:\n- Copys o creativos externos...",
  },
  {
    key: "contratos",
    label: "Membresías y Contratos",
    icon: FileText,
    description: "Estados operativos, precios de membresía y reglas por caso",
    placeholder:
      "=== ESTADOS OPERATIVOS ===\n1. ACTIVO\n2. INACTIVO POR PAGO\n3. ACTIVO MEMBRESÍA\n4. COMPLETADO\n\n=== MEMBRESÍAS ===\nStarter: $97/mes...",
  },
  {
    key: "faqs",
    label: "FAQs y Co-productores",
    icon: BookOpen,
    description: "Preguntas frecuentes y flujo especial de co-productores",
    placeholder:
      "P: ¿Puedo pausar?\nR (PRO): Sí, UNA pausa de hasta 30 días...\n\n=== FLUJO CO-PRODUCTORES ===\nFASE 0 — Identificación...",
  },
  {
    key: "casos_historicos",
    label: "Casos Históricos",
    icon: Database,
    description: "Crisis resueltas, inconformidades y escalaciones exitosas",
    placeholder:
      "Caso: Alumna con crisis financiera — Resuelta\nContexto: ...\nResolución: ...\nAprendizaje: ...",
  },
  {
    key: "limitaciones",
    label: "Limitaciones del Agente",
    icon: Zap,
    description: "Lo que el agente NO puede hacer — protección operativa",
    placeholder:
      "El agente NO puede:\n- Aprobar reembolsos\n- Aprobar garantías sin auditoría...",
  },
];

// ─── Test Tab ─────────────────────────────────────────────────────────────────

function TestAlumnoTab({ provider }: { provider: AIProvider }) {
  const [students, setStudents] = useState<{ code: string; name: string }[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{
    code: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = getAuthToken();
        const res = await fetch(
          `${API_HOST}/client/get/clients?pageSize=1000`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, unknown>;
        let rows: Record<string, unknown>[] = [];
        if (Array.isArray(json.data)) {
          rows = json.data as Record<string, unknown>[];
        } else {
          const payload =
            (json.clients as Record<string, unknown>) ??
            (json.getClients as Record<string, unknown>);
          if (payload && Array.isArray(payload.data))
            rows = payload.data as Record<string, unknown>[];
        }
        setStudents(
          rows
            .map((r) => ({
              code: String(r.codigo ?? r.code ?? r.id ?? ""),
              name: String(r.nombre ?? r.name ?? ""),
            }))
            .filter((s) => s.code && s.name),
        );
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 150);

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 18rem)" }}>
      {/* Panel izquierdo: selector de alumno */}
      <div className="flex w-72 shrink-0 flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 space-y-0.5 overflow-y-auto rounded-xl border border-border bg-card p-1">
            {filtered.map((s) => (
              <button
                key={s.code}
                onClick={() => setSelected(s)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected?.code === s.code
                    ? "bg-teal-600 text-white"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <p className="truncate font-medium">{s.name}</p>
                <p
                  className={`truncate font-mono text-xs ${
                    selected?.code === s.code
                      ? "text-teal-100"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.code}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin resultados
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {students.length} alumnos cargados
        </p>
      </div>

      {/* Panel derecho: chat */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border">
        {selected ? (
          <AgenteAtcChat
            key={selected.code}
            alumnoCode={selected.code}
            alumnoName={selected.name}
            mode="atc_team"
            provider={provider}
            className="h-full"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Users className="h-12 w-12 opacity-20" />
            <p className="text-sm">
              Selecciona un alumno para probar el agente
            </p>
            <p className="text-xs opacity-60">
              El chat tendrá contexto completo del alumno seleccionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KB Editor Tab ────────────────────────────────────────────────────────────

function KbEditorTab() {
  const [secciones, setSecciones] = useState<KbSecciones>(KB_DEFAULTS);
  const [saving, setSaving] = useState<keyof KbSecciones | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saved, setSaved] = useState<
    Partial<Record<keyof KbSecciones, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [metadataId, setMetadataId] = useState<string | null>(null);

  async function apiFetch(path: string, options?: RequestInit) {
    const token = getAuthToken();
    const url = path.startsWith("http") ? path : `${API_HOST}${path}`;
    return fetch(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  const loadKb = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/metadata");
      if (!res.ok) return;
      const json = (await res.json()) as unknown;
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(json)) items = json as Record<string, unknown>[];
      else if (json && typeof json === "object") {
        const j = json as Record<string, unknown>;
        if (Array.isArray(j.data)) items = j.data as Record<string, unknown>[];
        else if (j.data && typeof j.data === "object") {
          const d = j.data as Record<string, unknown>;
          if (Array.isArray(d.items))
            items = d.items as Record<string, unknown>[];
        }
      }
      const found = items.find(
        (i) => i.entity === KB_ENTITY && i.entity_id === KB_ENTITY_ID,
      );
      if (found) {
        setMetadataId(String(found.id ?? ""));
        const payload = found.payload as Record<string, unknown> | undefined;
        if (payload?.secciones && typeof payload.secciones === "object") {
          const s = payload.secciones as Partial<KbSecciones>;
          setSecciones((prev) => ({ ...prev, ...s }));
        }
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadKb();
  }, [loadKb]);

  async function saveSection(key: keyof KbSecciones) {
    setSaving(key);
    try {
      const payload = { secciones };
      let res: Response;
      if (metadataId) {
        res = await apiFetch(`/metadata/${metadataId}`, {
          method: "PUT",
          body: JSON.stringify({ payload }),
        });
      } else {
        res = await apiFetch("/metadata", {
          method: "POST",
          body: JSON.stringify({
            entity: KB_ENTITY,
            entity_id: KB_ENTITY_ID,
            payload,
          }),
        });
        if (res.ok) {
          const json = (await res.clone().json()) as unknown;
          if (json && typeof json === "object") {
            const j = json as Record<string, unknown>;
            const id = (j.data as Record<string, unknown>)?.id ?? j.id;
            if (id) setMetadataId(String(id));
          }
        }
      }
      if (res.ok) {
        setSaved((prev) => ({
          ...prev,
          [key]: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
      }
    } catch {
      // silencioso
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    try {
      const payload = { secciones };
      let res: Response;
      if (metadataId) {
        res = await apiFetch(`/metadata/${metadataId}`, {
          method: "PUT",
          body: JSON.stringify({ payload }),
        });
      } else {
        res = await apiFetch("/metadata", {
          method: "POST",
          body: JSON.stringify({
            entity: KB_ENTITY,
            entity_id: KB_ENTITY_ID,
            payload,
          }),
        });
        if (res.ok) {
          const json = (await res.clone().json()) as unknown;
          if (json && typeof json === "object") {
            const j = json as Record<string, unknown>;
            const id = (j.data as Record<string, unknown>)?.id ?? j.id;
            if (id) setMetadataId(String(id));
          }
        }
      }
      if (res.ok) {
        const ts = new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const allSaved = Object.fromEntries(
          KB_SECTIONS.map(({ key }) => [key, ts]),
        ) as Partial<Record<keyof KbSecciones, string>>;
        setSaved(allSaved);
      }
    } catch {
      // silencioso
    } finally {
      setSavingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20">
        <div className="space-y-1">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Esta base de conocimiento se inyecta automáticamente en el contexto
            del agente en cada consulta.{" "}
            {!metadataId && (
              <span className="font-semibold">
                Aún no está guardada en la base de datos — guarda todo para
                activarla.
              </span>
            )}
          </p>
          {metadataId && (
            <p className="font-mono text-xs text-amber-700/70 dark:text-amber-400/60">
              Metadata ID:{" "}
              <span className="select-all font-semibold text-amber-800 dark:text-amber-300">
                {metadataId}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => void saveAll()}
          disabled={savingAll}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {savingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Guardar todo
        </button>
      </div>

      {KB_SECTIONS.map(
        ({ key, label, icon: Icon, placeholder, description }) => (
          <div
            key={key}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saved[key] && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Guardado {saved[key]}
                  </span>
                )}
                <button
                  onClick={() => void saveSection(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving === key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
            <div className="p-4">
              <Textarea
                value={secciones[key]}
                onChange={(e) =>
                  setSecciones((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                rows={8}
                className="font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function SuperAtcContent() {
  const [activeTab, setActiveTab] = useState<Tab>("kb");
  const [provider] = useState<AIProvider>("anthropic");

  useEffect(() => {
    // Forzar siempre anthropic — OpenAI deshabilitado por control de costes
    localStorage.setItem(AI_PROVIDER_KEY, "anthropic");
  }, []);

  const tabs: {
    id: Tab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: "kb", label: "Base de Conocimiento", icon: Database },
    { id: "test", label: "Probar Agente", icon: Users },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/agentes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Agentes
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-linear-to-br from-teal-50/80 via-emerald-50/40 to-teal-50/80 p-6 shadow-sm dark:border-teal-800/40 dark:from-teal-900/20 dark:via-emerald-900/10 dark:to-teal-900/20">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-teal-400 to-emerald-500 text-white shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Super Agente ATC
                </h1>
                <p className="text-sm text-muted-foreground">
                  Copiloto del equipo ATC + asistente autónomo para alumnos
                </p>
              </div>
            </div>

            {/* Modelo IA — solo Claude */}
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Modelo IA
              </span>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1">
                <span className="flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#c96442] to-[#a8522e] px-3 py-1.5 text-xs font-semibold text-white shadow">
                  Anthropic · Claude
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "kb" && <KbEditorTab />}
        {activeTab === "test" && <TestAlumnoTab provider={provider} />}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SuperAtcPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <SuperAtcContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
