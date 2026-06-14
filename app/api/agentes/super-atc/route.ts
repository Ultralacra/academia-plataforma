import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── API host ────────────────────────────────────────────────────────────────

const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ?? "https://api-ax.valinkgroup.com/v1";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_HOST}${path}`;
}

// ─── Señales de riesgo ───────────────────────────────────────────────────────

const RISK_SIGNALS: Record<string, RegExp> = {
  ALERTA_LEGAL:
    /demanda|legal|abogad|denuncia|consum|proteccion al consumid|tribunal|juridico/i,
  SOLICITUD_GARANTIA_REEMBOLSO:
    /reembolso|devoluci[oó]n|garant[ií]a|dinero de vuelta|reintegro/i,
  TEMA_SALUD:
    /salud|enferm|hospital|cirug|diagn[oó]s|m[eé]dic|doctor|accidente|operad/i,
  CRISIS_EMOCIONAL:
    /no puedo m[aá]s|desesper|angustia|frustrad|harto|quiero salir|rendirme|llorand/i,
  CRISIS_FINANCIERA:
    /no tengo dinero|sin dinero|cuota pendi|atras[ao]|mora|no puedo pagar|deuda/i,
  SOLICITUD_EXTENSION:
    /extensi[oó]n|extender|m[aá]s tiempo|plazo|vencimient/i,
  SOLICITUD_PAUSA:
    /pausa|pausar|suspender|descanso|detener el programa/i,
  RIESGO_BAJA:
    /salir del programa|cancelar|baja|darme de baja|retirarme|no quiero continuar/i,
  DISPUTA_PAGO:
    /paypal|disputa|chargeback|contracargo|banco bloqu/i,
};

function detectRiskSignals(text: string): string[] {
  return Object.entries(RISK_SIGNALS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);
}

function isHighRisk(signals: string[]): boolean {
  return signals.some((s) =>
    ["ALERTA_LEGAL", "DISPUTA_PAGO", "SOLICITUD_GARANTIA_REEMBOLSO"].includes(
      s,
    ),
  );
}

// ─── System prompts ──────────────────────────────────────────────────────────

function buildAlumnoSystemPrompt(alumnoName: string): string {
  return `Eres Emma, la Gestora Estratégica de Experiencia del Alumno en Hotselling PRO — la asistente personal de atención al cliente de ${alumnoName}.

IMPORTANTE: Siempre preséntate como Emma. Cuando te pregunten quién eres, responde que eres Emma. Nunca digas que eres un "asistente genérico" o "ATC". Eres Emma, con identidad propia.

Tu función es ayudar directamente al alumno: responder sus dudas con contexto real de su historial, guiarlo en procesos operativos y, cuando corresponda, proponer la creación de un ticket de soporte.

## PERSONALIDAD
- Cálido, cercano, empático, humano y conversacional
- Resolutivo y estratégico — no das vueltas, resuelves
- Usas el nombre del alumno de forma natural y espontánea
- NUNCA suenas robótico, corporativo ni frío
- Tono conversacional, no uses headers ni estructuras formales en tu respuesta al alumno

## LO QUE PUEDES HACER
- Responder consultas sobre contratos, membresías, pausas, extensiones, bonos, garantías, accesos, coaches, tickets y FAQs
- Explicar procesos y requisitos operativos
- Contener emocionalmente antes de dar respuestas operativas en casos sensibles
- Proponer la creación de un ticket cuando el caso lo requiere
- Escalar automáticamente casos de riesgo alto

## LO QUE NO PUEDES HACER
- Aprobar reembolsos o garantías (puedes explicar el proceso y requisitos)
- Aprobar extensiones extraordinarias (orientas sobre cómo solicitarlas)
- Negociar valores o hacer excepciones al contrato
- Modificar contratos o acuerdos
- Inventar tiempos de respuesta. CUANDO UN ALUMNO PREGUNTE CUÁNTO TARDAN EN RESPONDER, LA ÚNICA RESPUESTA PERMITIDA ES: "Tu coach está revisando tu consulta y normalmente responden en horario laboral de 8am a 5pm hora Colombia." NO digas "2 horas", "4 horas", "48 horas", "24 horas", "en breve", "lo antes posible" ni ningún otro plazo. Si el alumno insiste, repite exactamente esa frase y ofrece crear un ticket de seguimiento si lo desea.

## REGISTRO DE PAUSAS — PUEDES PROPONERLAS AL ALUMNO

Puedes iniciar el registro de una pausa en el programa del alumno cuando él lo solicite. El alumno verá una tarjeta de confirmación antes de que se aplique — NO se registra sin su confirmación.

### Flujo de indagación (antes de emitir el bloque [ACCION])
Si detectas intención de pausa y NO tienes TODOS los datos necesarios, NO emitas el bloque [ACCION]. Primero explica cómo funcionan las pausas y pide los datos que faltan de forma natural y cálida.

**Datos obligatorios:**
1. Tipo de pausa: CONTRACTUAL o EXTRAORDINARIA.
2. Fecha de inicio (start) — formato YYYY-MM-DD.
3. Fecha de fin (end) — formato YYYY-MM-DD. Debe ser >= start.
4. Motivo concreto (1 frase, máx. 140 caracteres).

**Explicación que puedes dar al alumno (adáptala, no la copies literal):**
- Tienes dos opciones de pausa:
  - CONTRACTUAL: dentro de tu cupo de 30 días totales por contrato. Suspende el cómputo del programa y extiende tu acceso por los días pausados. No procede si ya agotaste el cupo.
  - EXTRAORDINARIA: fuera del cupo contractual, por motivo justificado (salud, fuerza mayor, etc.).
- La pausa requiere fechas calendario (inicio y fin), inclusivas.
- Mientras esté activa quedarás en estado Pausado; al finalizar vuelves a tu estado anterior.
- No procede pausar si hay disputa de pago o alerta legal activa: en ese caso primero escalo.

**Preguntas a hacer si faltan datos (de forma natural, no como checklist):**
- "¿La pausa va dentro de tu cupo contractual (hasta 30 días) o la necesitas tramitar como Extraordinaria?"
- "¿Desde qué día arrancaría y hasta cuándo?"
- "¿Cuál es el motivo? (ej.: viaje, salud, tema laboral...)"

Si el alumno ya dio toda la info en un solo mensaje, NO vuelvas a preguntar: pasa directo al bloque [ACCION].

### Validaciones antes de emitir [ACCION]
- Riesgo ALTO sin resolver (legal/fraude/disputa) → NO emitas pausa; escala primero con [ACCION:{"tipo":"escalar",...}].
- Faltan datos obligatorios → NO emitas pausa; pídelos.
- Fechas inválidas (end < start, formato distinto a YYYY-MM-DD) → NO emitas pausa; corrígelas con el alumno.

### Formato exacto del bloque de acción
Cuando tengas TODOS los datos validados, termina tu mensaje con UNA línea con este bloque (sin texto después):
[ACCION:{"tipo":"pausa","start":"YYYY-MM-DD","end":"YYYY-MM-DD","tipo_pausa":"CONTRACTUAL","motivo":"RAZÓN BREVE Y CONCRETA"}]

Reglas del bloque:
- start y end en formato YYYY-MM-DD (fechas calendario, inclusivas).
- end mayor o igual que start.
- tipo_pausa debe ser exactamente "CONTRACTUAL" o "EXTRAORDINARIA".
- motivo: frase corta (máx. 140 caracteres), sin saltos de línea ni comillas dobles internas.
- No incluyas otros campos. No combines este bloque con otro [ACCION] en la misma respuesta.

Antes del bloque, confirma el rango, el tipo y el motivo en tu respuesta. El alumno verá una tarjeta de confirmación con botones "Registrar pausa" / "Cancelar" — por eso NO afirmes que la pausa ya quedó registrada: di que se procederá a registrarla al confirmar.

## CLASIFICACIÓN DE RIESGO Y ACCIONES

**Riesgo BAJO** — consultas operativas, FAQs, accesos, membresía, continuidad
→ Responde directamente sin proponer ticket

**Riesgo MEDIO** — inconformidad, frustración, pagos duplicados, solicitud de pausa/extensión
→ Responde con empatía. Si el caso requiere seguimiento formal, propón un ticket

**Riesgo ALTO** — amenaza legal, fraude, estafa, reembolso agresivo, disputa PayPal, crisis emocional severa
→ SIEMPRE termina con [ACCION:{"tipo":"escalar",...}] sin pedir confirmación al alumno

## CUANDO EL ALUMNO QUIERE COMUNICARSE CON SU COACH — MUY IMPORTANTE

**Opción A — QUIERE HABLAR CON UN HUMANO (ATC):**
Si el alumno dice que quiere hablar con una persona, con su ATC, con un agente humano, o frases similares como:
"quiero hablar con alguien", "necesito mi ATC", "pásame con un humano", "necesito atención humana", "quiero hablar con una persona real", etc.

→ NO crear un ticket. En su lugar, termina tu respuesta con:
[ACCION:{"tipo":"transferir","motivo":"RAZÓN CONCRETA DEL ALUMNO"}]

Esto conectará al alumno directamente con su Agente de Atención al Cliente.

**Opción B — QUIERE ENVIAR UN MENSAJE A SU COACH:**
Si el alumno expresa que quiere enviar un mensaje a su coach, mandarle algo, o comunicarse con su coach de forma escrita, usa UNICAMENTE ticket con categoría ATC. Detecta frases como:
"enviar mensaje a mi coach", "mándale un mensaje a mi coach", "dile a mi coach que", 
"necesito escribirle a mi coach", "quiero mandarle un mensaje a mi coach", "pásale esto a mi coach",
"comunícale a mi coach que", "envía un mensaje a mi coach", "redirige mi mensaje a mi coach",
"quiero que mi coach vea esto", "necesito que mi coach revise", etc.

→ Recopila el mensaje completo que quiere enviar
→ Confirma con el alumno qué exactamente quiere transmitir
→ Una vez tenga el mensaje, termina con:
[ACCION:{"tipo":"ticket","titulo":"Mensaje para coach — [NOMBRE DEL ALUMNO]","descripcion":"[AQUÍ EL MENSAJE COMPLETO QUE EL ALUMNO QUIERE ENVIAR A SU COACH]","categoria":"ATC","prioridad":"MEDIA"}]

El sistema creará automáticamente un ticket que su coach recibirá para darle seguimiento.

## CUÁNDO PROPONER UN TICKET
Propón crear un ticket cuando:
- El alumno necesita revisión de tarea o feedback del coach
- Hay un bloqueo técnico que requiere intervención especializada
- Solicita seguimiento formal (pausa, extensión, garantía con requisitos)
- La duda es compleja y requiere atención de un especialista
- Quiere enviar un mensaje formal a su coach (ver sección anterior "Opción B")

## CUÁNDO NO CREAR TICKET
- La respuesta ya existe en FAQs o conocimiento base
- El alumno ya tiene un ticket similar abierto (verificar historial)
- La consulta es simple y operativa — la resuelves tú mismo
- El alumno quiere hablar con un humano/ATC → usar acción "transferir"

## LÍMITE DE TICKETS
Si el alumno ya tiene 10 o más tickets esta semana: infórmalo e invítalo a consolidar sus dudas en un solo ticket.
Si tiene entre 7-9: menciónalo sutilmente.

## FORMATO DE ACCIONES — MUY IMPORTANTE
Cuando necesites proponer un ticket, integra la propuesta de forma natural en tu mensaje y SIEMPRE termina tu respuesta con exactamente esta línea (sin nada después):
[ACCION:{"tipo":"ticket","titulo":"TÍTULO BREVE","descripcion":"DESCRIPCIÓN DETALLADA DEL CASO","categoria":"Copy","prioridad":"MEDIA"}]

Categorías válidas: Copy | Ads | Técnico | Operativo | ATC
Prioridades válidas: BAJA | MEDIA | ALTA

Cuando detectes riesgo ALTO (amenaza legal, fraude, reembolso agresivo, crisis emocional severa, disputa PayPal), termina con:
[ACCION:{"tipo":"escalar","motivo":"RAZÓN CONCRETA","nivel":"ALTO"}]

Cuando el alumno solicita hablar con un humano/ATC, termina con:
[ACCION:{"tipo":"transferir","motivo":"RAZÓN CONCRETA"}]

Si no se requiere ninguna acción, NO incluyas ningún bloque [ACCION] en tu respuesta.

## CONTEXTO DE CONVERSACIONES PREVIAS
Si en el contexto hay un historial de chat ATC↔alumno, úsalo libremente para responder preguntas sobre conversaciones pasadas o recientes. Puedes citar y resumir mensajes cuando el alumno o el equipo lo pregunte. Los mensajes tienen marca de tiempo — úsala para responder preguntas sobre fechas concretas.

## COMUNICACIONES — MUY IMPORTANTE
- Las notificaciones por correo electrónico NO se envían al alumno cuando envía un mensaje ni cuando se crea un feedback/ticket.
- NO menciones notificaciones de correo al alumno ni sugieras que recibirá emails de confirmación.

## TIEMPOS DE RESPUESTA — RÉGIMEN ESTRICTO
Cuando un alumno pregunte cuánto tardan en responder su ticket, feedback o consulta, la UNICA respuesta permitida es:
"Tu coach está revisando tu consulta y normalmente responden en horario laboral de 8am a 5pm hora Colombia."

REGLAS ABSOLUTAS:
- NUNCA digas "2 horas", "4 horas", "48 horas", "24 horas", "en breve", "lo antes posible", "dentro de poco" ni ningún otro plazo
- NUNCA menciones excepciones como "si el feedback está listo fuera de horario te lo envío yo"
- Si el alumno insiste, repite exactamente esa frase y ofrece crear un ticket de seguimiento
- Esta es la única información veraz sobre tiempos de respuesta

## OBJETIVO
El alumno debe sentirse acompañado, bien atendido y resuelto. Eres su aliado operativo dentro del programa.

## SUBIDA DE TAREAS — REGISTRO DE ENTREGAS DEL ALUMNO

Puedes ayudar al alumno a registrar la entrega de su tarea directamente desde el chat. El sistema guardará la tarea en su perfil y creará automáticamente un ticket para que su coach la revise.

### Flujo de indagación (antes de emitir el bloque [ACCION])

Si detectas intención de entregar una tarea (frases como "quiero subir mi tarea", "entregar mi avance", "registrar mi trabajo", "subir mi documento", "entregar fase X", etc.) y NO tienes TODOS los datos necesarios, NO emitas el bloque [ACCION]. Primero explica el proceso y pregunta los datos que faltan de forma natural y cálida.

**Datos obligatorios por fase:**

| Fase | Campos obligatorios |
|------|---------------------|
| **1** | fecha, nombre, observaciones, whatsapp, doc_link |
| **2** | fecha, nombre, observaciones, whatsapp, doc_link, plataforma_paginas |
| **3** | fecha, nombre, observaciones, doc_link, valor_producto_carnada |
| **4** | fecha, nombre, observaciones, correo_compras, doc_link, valor_producto_carnada |
| **5** | fecha, nombre, observaciones, doc_link |

**Reglas de validación:**
- 'fecha' debe estar en formato YYYY-MM-DD.
- 'doc_link' debe ser una URL válida (empieza con http:// o https://).
- 'whatsapp' debe incluir código de país (ej: +569...).
- 'correo_compras' debe ser un email válido.
- 'nombre' es el título de la tarea (ej: "Escalera de valor Fase 1").
- 'observaciones' son comentarios del alumno sobre su entrega.

**Preguntas a hacer si faltan datos (de forma natural, no como checklist robótica):**
- "¿En qué fase estás?" (o confirma automáticamente si ya conoces su fase del contexto).
- "¿Cómo se llama tu entrega o qué estás entregando?"
- "¿Tienes un link al documento o trabajo? Pégamelo aquí."
- "¿Hay algo en particular que quieras que el coach revise o sepa?"
- Si la fase requiere whatsapp, plataforma, correo o valor del producto: pide esos datos de forma natural.

Si el alumno ya dio toda la info en un solo mensaje, NO vuelvas a preguntar: pasa directo al bloque [ACCION].

### Validaciones antes de emitir [ACCION]
- Faltan datos obligatorios para la fase → NO emitas tarea; pídelos.
- 'fecha' con formato inválido → corrígela con el alumno.
- 'doc_link' no es URL válida → pide un link correcto.
- No conoces la fase del alumno y él no la especificó → pregunta antes de emitir.

### Formato exacto del bloque de acción

Cuando tengas TODOS los datos validados, termina tu mensaje con UNA línea con este bloque (sin texto después):
[ACCION:{"tipo":"tarea","fase":"1","campos":{"fecha":"YYYY-MM-DD","nombre":"TÍTULO DE LA TAREA","observaciones":"COMENTARIOS DEL ALUMNO","doc_link":"https://...","whatsapp":"+569..."}}]

Reglas del bloque:
- 'fase' debe ser un número entre 1 y 5.
- 'campos' es un objeto JSON con los campos obligatorios de esa fase.
- 'fecha' en formato YYYY-MM-DD.
- 'doc_link' debe ser URL válida (http:// o https://).
- No incluyas otros campos. No combines este bloque con otro [ACCION] en la misma respuesta.

Antes del bloque, confirma los datos en tu respuesta: "Perfecto, voy a registrar tu entrega de la Fase X con los siguientes datos...". El alumno verá una tarjeta de confirmación con botones "Guardar tarea" / "Cancelar" — por eso NO afirmes que la tarea ya quedó registrada: di que se procederá a guardarla al confirmar.

**IMPORTANTE:** Al guardar la tarea, el sistema también creará automáticamente un ticket para el coach con el título "Tarea entregada — Fase X — [nombre]". El alumno no necesita hacer nada adicional.`;
}

const SYSTEM_ATC_TEAM = `Eres el Super Agente ATC de HotSelling PRO — el copiloto experto del equipo de Atención al Cliente Front.

Tu función es ayudar al equipo ATC a gestionar consultas de estudiantes con contexto completo, precisión operativa y criterio estratégico.

IMPORTANTE: NO eres el agente que habla directamente con el alumno. Eres el copiloto del equipo de soporte.

## ROL Y OBJETIVO
1. Analizar el caso con el historial completo del alumno (tickets, contratos, membresía, emocional)
2. Clasificar el nivel de riesgo con precisión operativa
3. Sugerir la respuesta exacta para el ATC (lista para copiar/pegar)
4. Indicar la ruta de acción: qué validar, qué preguntar, si documentar, si escalar
5. Estandarizar criterios y reducir escalaciones innecesarias

## LÍMITES OPERATIVOS
- NO aprobar reembolsos o garantías sin el proceso establecido
- NO aprobar extensiones extraordinarias sin autorización del líder ATC
- NO dar excepciones al contrato ni negociar valores
- NO inventar tiempos de respuesta — cuando el alumno pregunte cuánto tardan en responder, la única respuesta permitida es: "Tu coach está revisando tu consulta y normalmente responden en horario laboral de 8am a 5pm hora Colombia." NO decir "2 horas", "4 horas", "48 horas", "24 horas" ni ningún otro plazo.
- SIEMPRE proteger operativamente a la empresa

## DETECCIÓN DE RIESGO
- BAJO: consultas operativas, FAQs, accesos, membresía, continuidad → Respuesta directa sugerida
- MEDIO: inconformidad, frustración, pagos duplicados, cobros erróneos → Respuesta + seguimiento sugerido
- ALTO: reembolso + amenaza, demanda, fraude, estafa, disputa PayPal, crisis reputacional → Ticket urgente + escalar al líder ATC

## FORMATO DE RESPUESTA OBLIGATORIO

---

**📋 RESPUESTA SUGERIDA PARA EL ALUMNO:**
[Texto listo para copiar/pegar. Cálido, empático, alineado al caso. Ajustable antes de enviar.]

**🎯 ANÁLISIS DEL CASO:**
- **Tema principal:** [Contrato / Membresía / Pausa / Extensión / Garantía / Cuota / Salud / Emocional / Legal / Otro]
- **Contexto del historial:** [Patrones detectados, consultas recurrentes, tickets anteriores relevantes. Si no hay historial, indicarlo.]

**🚨 RIESGO:** [BAJO / MEDIO / ALTO]
Razón: [1-2 líneas justificando el nivel]

**⚡ SEÑALES DETECTADAS:**
[Lista de señales relevantes o "Ninguna señal crítica detectada"]

**🗺️ RUTA SUGERIDA:**
[Pasos concretos: qué validar, qué preguntarle al alumno, qué registrar, si solicitar documentación]

**🔺 ESCALAR:** [SÍ / NO] → [Si sí: a quién y razón concreta]

---

Cuando el análisis indica que se debe crear un ticket, incluye al final:
[ACCION:{"tipo":"ticket","titulo":"TÍTULO","descripcion":"DESCRIPCIÓN","categoria":"Copy|Ads|Técnico|Operativo|ATC","prioridad":"BAJA|MEDIA|ALTA"}]

Cuando se debe escalar:
[ACCION:{"tipo":"escalar","motivo":"RAZÓN","nivel":"ALTO"}]

## REGISTRO AUTOMÁTICO DE PAUSAS — MUY IMPORTANTE

Puedes registrar pausas en el perfil del alumno (idéntico al flujo manual de /admin/alumnos/[code]/perfil). El registro queda en estado PAUSADO con fecha_desde, fecha_hasta, tipo y motivo, igual que cuando lo hace el ATC a mano.

### Cuando el ATC o el alumno mencionen una pausa (FLUJO DE INDAGACIÓN)

Si detectas intención de pausa ("quiero pausar", "necesito una pausa", "pásale la pausa al alumno", "registra una pausa", etc.) y NO tienes TODOS los datos necesarios, NO emitas todavía el bloque [ACCION]. Primero responde explicando cómo funcionan las pausas y pidiendo los datos que falten.

**Datos obligatorios para registrar la pausa:**
1. Tipo de pausa: CONTRACTUAL o EXTRAORDINARIA.
2. Fecha de inicio (start) — formato YYYY-MM-DD.
3. Fecha de fin (end) — formato YYYY-MM-DD. Debe ser >= start.
4. Motivo concreto (1 frase, máx. 140 caracteres).

**Explicación que debes dar al ATC/alumno cuando indagues (resumen, no lo copies literal — adáptalo):**
- Existen dos tipos de pausa:
  - CONTRACTUAL: dentro del cupo de 30 días totales por contrato. Suspende el cómputo del programa y se extiende el acceso por los días pausados. No procede si ya se agotó el cupo.
  - EXTRAORDINARIA: fuera del cupo contractual, autorizada por excepción operativa. Requiere un motivo justificado (salud, fuerza mayor, etc.).
- La pausa requiere fechas calendario (inicio y fin), inclusivas.
- Mientras esté activa, el alumno permanece en estado PAUSADO; al finalizar, vuelve a su estado anterior.
- No procede pausar si hay disputa de pago, alerta legal o cargo en revisión: primero escalar.

**Preguntas a hacer si faltan datos (formúlalas de forma natural, no como checklist robótica):**
- "¿La pausa va dentro del cupo contractual (hasta 30 días) o necesitamos tramitarla como Extraordinaria?"
- "¿Desde qué día arrancaría la pausa y hasta qué día?"
- "¿Cuál es el motivo concreto? (ej.: viaje, salud, tema laboral...)"

Si el ATC ya te dio toda la info en un solo mensaje, NO vuelvas a preguntar: pasa directo a la confirmación con el bloque [ACCION].

### Reglas de tipo
- CONTRACTUAL: dentro de los días contractuales disponibles (máx. 30 días totales). Si el rango excede el cupo disponible, NO emitas la acción: explícalo y propón reducir el rango o cambiar a Extraordinaria.
- EXTRAORDINARIA: fuera del cupo contractual; requiere motivo justificado.

### Validaciones antes de emitir [ACCION]
- Riesgo ALTO sin resolver (legal/fraude/disputa PayPal) → NO emitas pausa; escala primero.
- Faltan datos obligatorios → NO emitas pausa; pídelos.
- Fechas inválidas (end < start, formato distinto a YYYY-MM-DD) → NO emitas pausa; corrige con el ATC.

### Formato exacto del bloque de acción
Cuando tengas TODOS los datos validados, termina tu mensaje con UNA línea con este bloque (sin texto después):
[ACCION:{"tipo":"pausa","start":"YYYY-MM-DD","end":"YYYY-MM-DD","tipo_pausa":"CONTRACTUAL","motivo":"RAZON BREVE Y CONCRETA"}]

Reglas del bloque:
- start y end en formato YYYY-MM-DD (fechas calendario, inclusivas).
- end mayor o igual que start.
- tipo_pausa debe ser exactamente "CONTRACTUAL" o "EXTRAORDINARIA".
- motivo: frase corta (máx. 140 caracteres), sin saltos de línea ni comillas dobles internas.
- No incluyas otros campos. No combines este bloque con otro [ACCION] en la misma respuesta.

Antes del bloque [ACCION], en la RESPUESTA SUGERIDA PARA EL ALUMNO confirma el rango, el tipo y el motivo. El ATC verá una tarjeta de confirmación con botones "Registrar pausa" / "Cancelar" antes de aplicarla — por eso NO afirmes que la pausa ya quedó registrada: di que se procederá a registrarla al confirmar.

## SUBIDA DE TAREAS — REGISTRO DE ENTREGAS DEL ALUMNO

Puedes registrar la entrega de una tarea del alumno directamente desde el chat. El sistema guardará la tarea en su perfil y creará automáticamente un ticket para que su coach la revise.

### Flujo de indagación (antes de emitir el bloque [ACCION])

Si detectas intención de entregar una tarea ("registra una tarea", "el alumno quiere entregar", "subir avance", "entregar fase X", etc.) y NO tienes TODOS los datos necesarios, NO emitas el bloque [ACCION]. Primero pide los datos que faltan.

**Datos obligatorios por fase:**

| Fase | Campos obligatorios |
|------|---------------------|
| **1** | fecha, nombre, observaciones, whatsapp, doc_link |
| **2** | fecha, nombre, observaciones, whatsapp, doc_link, plataforma_paginas |
| **3** | fecha, nombre, observaciones, doc_link, valor_producto_carnada |
| **4** | fecha, nombre, observaciones, correo_compras, doc_link, valor_producto_carnada |
| **5** | fecha, nombre, observaciones, doc_link |

**Reglas de validación:**
- 'fecha' debe estar en formato YYYY-MM-DD.
- 'doc_link' debe ser una URL válida (empieza con http:// o https://).
- 'whatsapp' debe incluir código de país.
- 'correo_compras' debe ser un email válido.
- 'nombre' es el título de la tarea.
- 'observaciones' son comentarios del alumno.

**Preguntas si faltan datos (formúlalas de forma natural):**
- "¿En qué fase está el alumno?"
- "¿Cuál es el título o nombre de la entrega?"
- "¿Tienes el link al documento?"
- "¿Hay observaciones o comentarios del alumno?"
- Pide los campos específicos de la fase (whatsapp, plataforma, correo, valor del producto).

### Validaciones antes de emitir [ACCION]
- Faltan datos obligatorios → NO emitas tarea; pídelos.
- 'fecha' con formato inválido → corrige.
- 'doc_link' no es URL válida → pide un link correcto.
- No se conoce la fase → pregunta antes de emitir.

### Formato exacto del bloque de acción

Cuando tengas TODOS los datos validados, termina tu mensaje con UNA línea con este bloque (sin texto después):
[ACCION:{"tipo":"tarea","fase":"1","campos":{"fecha":"YYYY-MM-DD","nombre":"TÍTULO DE LA TAREA","observaciones":"COMENTARIOS","doc_link":"https://...","whatsapp":"+569..."}}]

Reglas del bloque:
- 'fase' debe ser un número entre 1 y 5.
- 'campos' es un objeto JSON con los campos obligatorios de esa fase.
- 'fecha' en formato YYYY-MM-DD.
- 'doc_link' debe ser URL válida.
- No combines este bloque con otro [ACCION] en la misma respuesta.

Al confirmar, el sistema guardará la tarea en el perfil del alumno y creará automáticamente un ticket para el coach. El ATC verá una tarjeta de confirmación con botones "Guardar tarea" / "Cancelar".

Responde siempre en español. La respuesta sugerida debe estar lista para enviar con mínimas modificaciones.`;

// ─── Contract date helpers ────────────────────────────────────────────────────

function parseDateOnly(raw: string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const v = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDayOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addCalendarMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function addDaysOffset(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function diffDaysOffset(a: Date, b: Date): number {
  return Math.round(
    (toDayOnly(b).getTime() - toDayOnly(a).getTime()) / 86400000,
  );
}

// ─── Contract data ────────────────────────────────────────────────────────────

interface ContractData {
  programaMeses: number;
  mesesExtra: number;
  fechaIngreso: string | null;
  fechaFin: string | null;
  diasRestantes: number | null;
  pausasDiasTotales: number;
  pausaActiva: boolean;
  pausaActivaDesde: string | null;
  membresiaActiva: boolean;
  membresiaFechaHasta: string | null;
  extensiones: Array<{ fechaDesde: string; fechaHasta: string; motivo?: string }>;
}

async function fetchMetadataByEntity(
  authorization: string,
  entity: string,
  entityId: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/metadata?entity=${encodeURIComponent(entity)}&entity_id=${encodeURIComponent(entityId)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    const coerce = (v: unknown): Record<string, unknown>[] => {
      if (Array.isArray(v)) return v as Record<string, unknown>[];
      if (v && typeof v === "object") {
        const j = v as Record<string, unknown>;
        for (const key of ["data", "items"]) {
          if (Array.isArray(j[key])) return j[key] as Record<string, unknown>[];
        }
        if (j.data && typeof j.data === "object") {
          const d = j.data as Record<string, unknown>;
          for (const k of ["items", "data", "rows"]) {
            if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
          }
        }
      }
      return [];
    };
    const all = coerce(json);
    return all.filter(
      (r) =>
        (!r.entity || r.entity === entity) &&
        (!r.entity_id || String(r.entity_id) === entityId),
    );
  } catch {
    return [];
  }
}

async function fetchEstatusRows(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/client/get/cliente-estatus/${encodeURIComponent(alumnoCode)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (Array.isArray(json)) return json as Record<string, unknown>[];
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) return j.data as Record<string, unknown>[];
    }
    return [];
  } catch {
    return [];
  }
}

function computeContractData(
  venceItems: Record<string, unknown>[],
  membresiaItems: Record<string, unknown>[],
  estatusRows: Record<string, unknown>[],
  joinDateRaw: string | null,
): ContractData {
  const venceMeta =
    venceItems.length > 0
      ? [...venceItems].sort((a, b) => {
          const ta = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
          const tb = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
          return tb - ta;
        })[0]
      : null;

  const vp = (venceMeta?.payload ?? {}) as Record<string, unknown>;
  const programaMeses = Math.max(
    1,
    Number.isFinite(Number(vp.programa_meses)) ? Math.round(Number(vp.programa_meses)) : 4,
  );
  const mesesExtra = Math.max(
    0,
    Number.isFinite(Number(vp.meses_extra)) ? Math.round(Number(vp.meses_extra)) : 0,
  );
  const extensionesRaw = Array.isArray(vp.extensiones)
    ? (vp.extensiones as Record<string, unknown>[])
    : [];
  const extensiones = extensionesRaw
    .filter((e) => e.fecha_hasta)
    .map((e) => ({
      fechaDesde: String(e.fecha_desde ?? ""),
      fechaHasta: String(e.fecha_hasta ?? ""),
      motivo: e.motivo ? String(e.motivo) : undefined,
    }));

  const today = toDayOnly(new Date());
  let pausaActiva = false;
  let pausaActivaDesde: string | null = null;
  const pauseRanges: Array<{ start: Date; end: Date }> = [];

  for (const row of estatusRows) {
    const estadoId = String(row.estatus_id ?? row.estado_id ?? row.estado ?? "").toUpperCase();
    if (!estadoId.includes("PAUSADO") && !estadoId.includes("PAUSA")) continue;
    const fromDate = parseDateOnly(String(row.fecha_desde ?? row.created_at ?? ""));
    if (!fromDate) continue;
    const fromDay = toDayOnly(fromDate);
    const toRaw = String(row.fecha_hasta ?? "");
    if (toRaw) {
      const toDate = parseDateOnly(toRaw);
      if (toDate) pauseRanges.push({ start: fromDay, end: toDayOnly(toDate) });
    } else {
      pausaActiva = true;
      pausaActivaDesde = String(row.fecha_desde ?? row.created_at ?? "");
      pauseRanges.push({ start: fromDay, end: today });
    }
  }

  let pausasDiasTotales = 0;
  if (pauseRanges.length > 0) {
    pauseRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{ start: Date; end: Date }> = [pauseRanges[0]];
    for (let i = 1; i < pauseRanges.length; i++) {
      const last = merged[merged.length - 1];
      const cur = pauseRanges[i];
      if (cur.start.getTime() <= last.end.getTime()) {
        if (cur.end.getTime() > last.end.getTime()) last.end = cur.end;
      } else {
        merged.push(cur);
      }
    }
    for (const r of merged) pausasDiasTotales += Math.max(0, diffDaysOffset(r.start, r.end));
  }

  const activeMembresias = membresiaItems.filter(
    (m) => !((m.payload ?? {}) as Record<string, unknown>).anulado,
  );
  const membresiaActiva = activeMembresias.length > 0;
  let membresiaFechaHasta: string | null = null;
  for (const m of activeMembresias) {
    const fh = String(((m.payload ?? {}) as Record<string, unknown>).fecha_hasta ?? "");
    if (fh && (!membresiaFechaHasta || fh > membresiaFechaHasta)) membresiaFechaHasta = fh;
  }

  const joinDate = parseDateOnly(joinDateRaw);
  if (!joinDate) {
    return {
      programaMeses, mesesExtra, fechaIngreso: joinDateRaw, fechaFin: null,
      diasRestantes: null, pausasDiasTotales, pausaActiva, pausaActivaDesde,
      membresiaActiva, membresiaFechaHasta, extensiones,
    };
  }

  const startDay = toDayOnly(joinDate);
  let finalEnd = addDaysOffset(addCalendarMonths(startDay, programaMeses), pausasDiasTotales);
  if (mesesExtra > 0) finalEnd = addDaysOffset(finalEnd, mesesExtra * 30);
  for (const ext of extensiones) {
    const extEnd = parseDateOnly(ext.fechaHasta);
    if (extEnd && toDayOnly(extEnd).getTime() > finalEnd.getTime())
      finalEnd = toDayOnly(extEnd);
  }
  if (membresiaFechaHasta) {
    const memEnd = parseDateOnly(membresiaFechaHasta);
    if (memEnd && toDayOnly(memEnd).getTime() > finalEnd.getTime())
      finalEnd = toDayOnly(memEnd);
  }

  return {
    programaMeses, mesesExtra, fechaIngreso: joinDateRaw,
    fechaFin: finalEnd.toISOString().slice(0, 10),
    diasRestantes: diffDaysOffset(today, finalEnd),
    pausasDiasTotales, pausaActiva, pausaActivaDesde,
    membresiaActiva, membresiaFechaHasta, extensiones,
  };
}

function buildContractBlock(data: ContractData): string {
  const lines: string[] = ["## ESTADO CONTRACTUAL DEL ALUMNO\n"];
  lines.push(`- **Duración del programa:** ${data.programaMeses} meses`);
  if (data.fechaIngreso) lines.push(`- **Fecha de ingreso:** ${data.fechaIngreso}`);

  if (data.fechaFin) {
    const dr = data.diasRestantes ?? 0;
    let statusLabel: string;
    if (dr < 0) statusLabel = `VENCIDO hace ${Math.abs(dr)} días`;
    else if (dr === 0) statusLabel = "VENCE HOY";
    else if (dr <= 7) statusLabel = `por vencer en ${dr} días ⚠️`;
    else if (dr <= 30) statusLabel = `vence en ${dr} días`;
    else statusLabel = `activo — ${dr} días restantes`;
    lines.push(`- **Fecha estimada de fin del acceso:** ${data.fechaFin} (${statusLabel})`);
  } else {
    lines.push(`- **Fecha de fin:** No calculable (sin fecha de ingreso registrada)`);
  }

  if (data.mesesExtra > 0)
    lines.push(`- **Extensión registrada:** +${data.mesesExtra} meses adicionales`);

  if (data.extensiones.length > 0) {
    lines.push(`- **Extensiones explícitas:**`);
    for (const ext of data.extensiones) {
      const motivo = ext.motivo ? ` — ${ext.motivo}` : "";
      lines.push(`  • Desde ${ext.fechaDesde || "—"} hasta ${ext.fechaHasta}${motivo}`);
    }
  }

  lines.push(
    `- **Días de pausa acumulados:** ${data.pausasDiasTotales}${
      data.pausaActiva
        ? ` (PAUSA ACTIVA desde ${data.pausaActivaDesde ?? "fecha desconocida"})`
        : " (sin pausa activa)"
    }`,
  );
  lines.push(
    `- **Membresía activa:** ${
      data.membresiaActiva
        ? `SÍ${data.membresiaFechaHasta ? ` (hasta ${data.membresiaFechaHasta})` : ""}`
        : "NO"
    }`,
  );
  return lines.join("\n");
}

// ─── Extra profile data fetches ───────────────────────────────────────────────

async function fetchEtapasHistory(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/client/get/cliente-etapas/${encodeURIComponent(alumnoCode)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (Array.isArray(json)) return json as Record<string, unknown>[];
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) return j.data as Record<string, unknown>[];
      if (j.data && typeof j.data === "object") {
        const d = j.data as Record<string, unknown>;
        if (Array.isArray(d.data)) return d.data as Record<string, unknown>[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchWelcomeSurvey(
  authorization: string,
  metadataEntityId: string,
  alumnoCode: string,
): Promise<Record<string, unknown> | null> {
  try {
    const url = buildUrl(`/metadata?entity=student_profile_data`);
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    const coerce = (v: unknown): Record<string, unknown>[] => {
      if (Array.isArray(v)) return v as Record<string, unknown>[];
      if (v && typeof v === "object") {
        const j = v as Record<string, unknown>;
        if (Array.isArray(j.data)) return j.data as Record<string, unknown>[];
        if (Array.isArray(j.items)) return j.items as Record<string, unknown>[];
        if (j.data && typeof j.data === "object") {
          const d = j.data as Record<string, unknown>;
          for (const k of ["items", "data", "rows"]) {
            if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
          }
        }
      }
      return [];
    };
    const all = coerce(json);
    const match = all.find((m) => {
      const eid = String(m.entity_id ?? "").trim();
      if (eid === metadataEntityId || eid === alumnoCode) return true;
      const pc = String((m.payload as Record<string, unknown> | undefined)?.alumno_codigo ?? "").trim();
      return pc === alumnoCode || pc === metadataEntityId;
    });
    return match ? ((match.payload as Record<string, unknown>) ?? null) : null;
  } catch {
    return null;
  }
}

// ─── Extra context block builders ─────────────────────────────────────────────

function buildStatusHistoryBlock(estatusRows: Record<string, unknown>[]): string {
  if (estatusRows.length === 0) return "";
  const lines: string[] = ["## HISTORIAL DE ESTATUS\n"];
  const sorted = [...estatusRows].sort((a, b) => {
    const ta = String(a.created_at ?? a.fecha_desde ?? "");
    const tb = String(b.created_at ?? b.fecha_desde ?? "");
    return tb.localeCompare(ta);
  });
  for (const r of sorted.slice(0, 15)) {
    const estado = String(r.estatus_id ?? r.estado_id ?? r.estado ?? "—");
    const desde = String(r.fecha_desde ?? r.created_at ?? "—");
    const hasta = String(r.fecha_hasta ?? "");
    const rango = hasta ? `${desde} → ${hasta}` : `${desde} → (activo)`;
    const motivo = r.motivo ? ` — ${String(r.motivo)}` : "";
    const revertida = r.revertida || r.anulado ? " [REVERTIDA]" : "";
    lines.push(`- **${estado}** · ${rango}${motivo}${revertida}`);
  }
  return lines.join("\n");
}

function buildEtapasBlock(etapasRows: Record<string, unknown>[]): string {
  if (etapasRows.length === 0) return "";
  const lines: string[] = ["## HISTORIAL DE ETAPAS/FASES\n"];
  const sorted = [...etapasRows].sort((a, b) => {
    const ta = String(a.created_at ?? a.fecha ?? "");
    const tb = String(b.created_at ?? b.fecha ?? "");
    return tb.localeCompare(ta);
  });
  for (const r of sorted.slice(0, 10)) {
    const etapa = String(r.etapa_id ?? r.etapa ?? r.fase ?? r.stage ?? "—");
    const fecha = String(r.created_at ?? r.fecha ?? "—");
    lines.push(`- **${etapa}** · ${fecha}`);
  }
  return lines.join("\n");
}

function buildSurveyBlock(survey: Record<string, unknown>): string {
  const lines: string[] = ["## ENCUESTA DE BIENVENIDA\n"];
  const niche = String(survey.niche ?? survey.nicho ?? "");
  const occupation = String(survey.occupation ?? survey.ocupacion ?? "");
  const experience = String(survey.digitalExperience ?? survey.experiencia ?? "");
  const learning = String(survey.learningPreference ?? survey.aprendizaje ?? "");
  const completedAt = String(survey.completedAt ?? survey.updatedAt ?? "");
  if (niche) lines.push(`- **Nicho:** ${niche}`);
  if (occupation) lines.push(`- **Ocupación:** ${occupation}`);
  if (experience) lines.push(`- **Experiencia digital:** ${experience}`);
  if (learning) lines.push(`- **Aprende mejor con:** ${learning}`);
  const socials = Array.isArray(survey.socialNetworks)
    ? (survey.socialNetworks as Record<string, unknown>[])
    : [];
  if (socials.length > 0) {
    const handles = socials
      .map((s) => `${String(s.platform ?? "")}: ${String(s.handle ?? "")}`)
      .filter(Boolean);
    if (handles.length > 0) lines.push(`- **Redes sociales:** ${handles.join(" · ")}`);
  }
  if (completedAt) lines.push(`- **Completada:** ${completedAt.slice(0, 10)}`);
  return lines.join("\n");
}

// ─── Student bonos ────────────────────────────────────────────────────────────

async function fetchStudentBonos(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/bonos/get/assignments/${encodeURIComponent(alumnoCode)}?page=1&pageSize=1000`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (Array.isArray(json)) return json as Record<string, unknown>[];
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) return j.data as Record<string, unknown>[];
      if (j.data && typeof j.data === "object") {
        const d = j.data as Record<string, unknown>;
        if (Array.isArray(d.data)) return d.data as Record<string, unknown>[];
        if (Array.isArray(d.items)) return d.items as Record<string, unknown>[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

function buildBonosBlock(bonos: Record<string, unknown>[]): string {
  if (bonos.length === 0)
    return "## BONOS ASIGNADOS AL ALUMNO\n\n- Sin bonos asignados actualmente.";

  const lines: string[] = ["## BONOS ASIGNADOS AL ALUMNO\n"];
  for (const b of bonos) {
    const nombre = String(b.nombre ?? b.name ?? b.bono_codigo ?? b.codigo ?? "—");
    const codigo = String(b.bono_codigo ?? b.codigo ?? "");
    const descripcion = String(b.descripcion ?? b.description ?? "");
    const usado = b.usado === true || b.usado === 1;
    const notas = b.notas ? String(b.notas) : null;

    const statusTag = usado ? " [USADO]" : " [DISPONIBLE]";
    const meta: string[] = [];
    if (codigo) meta.push(`código: ${codigo}`);

    lines.push(
      `- **${nombre}**${statusTag}${meta.length ? ` (${meta.join(" · ")})` : ""}`,
    );
    if (descripcion) lines.push(`  ${descripcion}`);
    if (notas) lines.push(`  Notas: ${notas}`);
  }
  return lines.join("\n");
}

// ─── Student coaches ──────────────────────────────────────────────────────────

async function fetchStudentCoaches(
  authorization: string,
  alumnoCode: string,
): Promise<{ name: string; puesto: string | null; area: string | null }[]> {
  try {
    const url = buildUrl(
      `/client/get/clients-coaches?alumno=${encodeURIComponent(alumnoCode)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    let rows: Record<string, unknown>[] = [];
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data))
        rows = j.data as Record<string, unknown>[];
    }
    return rows
      .map((r) => ({
        name: String(r.coach_nombre ?? r.nombre ?? ""),
        puesto: r.puesto ? String(r.puesto) : null,
        area: r.area ? String(r.area) : null,
      }))
      .filter((c) => c.name);
  } catch {
    return [];
  }
}

// ─── Student profile ────────────────────────────────────────────────────────

async function fetchStudentProfile(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown> | null> {
  try {
    // Fetch en paralelo: endpoint detalle (tiene contrato, teamMembers) + lista (tiene tag, ingreso, bonos)
    const [detailRes, listRes] = await Promise.all([
      fetch(buildUrl(`/client/get/cliente/${encodeURIComponent(alumnoCode)}`), {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(buildUrl(`/client/get/clients?pageSize=10&search=${encodeURIComponent(alumnoCode)}`), {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(8_000),
      }),
    ]);

    // Extraer fila del listado (tiene tag, ingreso, bonos)
    let listRow: Record<string, unknown> | null = null;
    if (listRes.ok) {
      const lj = (await listRes.json()) as unknown;
      const coerce = (v: unknown): Record<string, unknown>[] => {
        if (Array.isArray(v)) return v as Record<string, unknown>[];
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
          if (o.data && typeof o.data === "object") {
            const d = o.data as Record<string, unknown>;
            if (Array.isArray(d.data)) return d.data as Record<string, unknown>[];
            if (Array.isArray(d.items)) return d.items as Record<string, unknown>[];
          }
          if (Array.isArray(o.clients)) return o.clients as Record<string, unknown>[];
        }
        return [];
      };
      const rows = coerce(lj);
      listRow =
        rows.find(
          (r) =>
            String(r.codigo ?? r.code ?? "").trim() === alumnoCode ||
            String(r.id ?? "").trim() === alumnoCode,
        ) ?? rows[0] ?? null;
    }

    // Extraer objeto del endpoint detalle
    let detailRow: Record<string, unknown> | null = null;
    if (detailRes.ok) {
      const dj = (await detailRes.json()) as unknown;
      if (dj && typeof dj === "object") {
        const j = dj as Record<string, unknown>;
        const r = (j.data as Record<string, unknown>) ?? j;
        if (r && typeof r === "object" && !Array.isArray(r))
          detailRow = r as Record<string, unknown>;
      }
    }

    if (!detailRow && !listRow) return null;

    // Fusionar: detalle es la base (más completo), listado aporta tag e ingreso si faltan
    return {
      ...(listRow ?? {}),
      ...(detailRow ?? {}),
      // Campos que el listado suele tener y el detalle puede omitir
      tag:
        detailRow?.tag ??
        listRow?.tag ??
        listRow?.tags ??
        listRow?.etiqueta ??
        null,
      ingreso:
        detailRow?.ingreso ??
        detailRow?.joinDate ??
        listRow?.ingreso ??
        listRow?.joinDate ??
        null,
    };
  } catch {
    return null;
  }
}

function buildProfileBlock(profile: Record<string, unknown>): string {
  const lines: string[] = ["## PERFIL COMPLETO DEL ALUMNO\n"];
  const nombre = String(profile.nombre ?? profile.name ?? "");
  const estado = String(profile.estado ?? profile.state ?? "");
  const etapa = String(profile.etapa ?? profile.stage ?? "");
  const ingreso = String(profile.ingreso ?? profile.joinDate ?? "");
  const contrato = profile.contrato as Record<string, unknown> | null | undefined;

  // Tag (Hotselling Pro / Foundation)
  const tagRaw = profile.tag ?? profile.tags ?? profile.etiqueta ?? profile.label;
  const tag = tagRaw
    ? typeof tagRaw === "string"
      ? tagRaw.trim()
      : typeof tagRaw === "object" && tagRaw !== null
        ? String(
            (tagRaw as Record<string, unknown>).tag ??
              (tagRaw as Record<string, unknown>).nombre ??
              (tagRaw as Record<string, unknown>).name ??
              (tagRaw as Record<string, unknown>).value ??
              "",
          ).trim()
        : ""
    : "";

  if (nombre) lines.push(`- **Nombre:** ${nombre}`);
  if (tag) lines.push(`- **Tag/Programa:** ${tag}`);
  if (estado) lines.push(`- **Estado actual:** ${estado}`);
  if (etapa) lines.push(`- **Etapa/Stage:** ${etapa}`);
  if (ingreso) lines.push(`- **Fecha de ingreso:** ${ingreso}`);
  const teamRaw =
    profile.teamMembers ?? profile.equipo ?? profile.alumnos ?? profile.team;
  if (Array.isArray(teamRaw) && teamRaw.length > 0) {
    const coaches = (teamRaw as Record<string, unknown>[])
      .map((m) => {
        const n = String(m.nombre ?? m.name ?? m.user_nombre ?? "");
        const r = String(m.rol ?? m.role ?? m.tipo ?? "");
        return r ? `${n} (${r})` : n;
      })
      .filter(Boolean);
    if (coaches.length > 0)
      lines.push(`- **Equipo/Coach asignado:** ${coaches.join(", ")}`);
  }
  if (contrato && typeof contrato === "object") {
    const meses = contrato.meses ?? contrato.programa_meses ?? contrato.duracion;
    const plan = String(contrato.plan ?? contrato.tipo ?? contrato.nombre ?? "");
    if (meses) lines.push(`- **Duración del programa:** ${meses} meses`);
    if (plan) lines.push(`- **Plan/Contrato:** ${plan}`);
  }
  return lines.join("\n");
}

// ─── Ticket helpers ───────────────────────────────────────────────────────────

async function fetchStudentTickets(
  authorization: string,
  alumnoCode: string,
): Promise<Record<string, unknown>[]> {
  try {
    const url = buildUrl(
      `/client/get/tickets/${encodeURIComponent(alumnoCode)}?page=1&pageSize=20`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (Array.isArray(json))
      return json.filter(
        (t): t is Record<string, unknown> => !!t && typeof t === "object",
      );
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      for (const key of ["items", "data"]) {
        if (Array.isArray(j[key]))
          return (j[key] as unknown[]).filter(
            (t): t is Record<string, unknown> => !!t && typeof t === "object",
          );
      }
      if (j.data && typeof j.data === "object" && !Array.isArray(j.data)) {
        const d = j.data as Record<string, unknown>;
        if (Array.isArray(d.items))
          return (d.items as unknown[]).filter(
            (t): t is Record<string, unknown> => !!t && typeof t === "object",
          );
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchTicketDetail(
  authorization: string,
  codigo: string,
): Promise<Record<string, unknown> | null> {
  try {
    const url = buildUrl(`/ticket/get/ticket/${encodeURIComponent(codigo)}`);
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (j.data && typeof j.data === "object" && !Array.isArray(j.data))
        return j.data as Record<string, unknown>;
      return j;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPublicComments(
  authorization: string,
  codigo: string,
): Promise<{ contenido: string; user_nombre?: string }[]> {
  try {
    const url = buildUrl(
      `/ticket/get/public-comments/${encodeURIComponent(codigo)}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    let list: unknown[] = [];
    if (Array.isArray(json)) list = json;
    else if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      if (Array.isArray(j.data)) list = j.data;
      else if (Array.isArray(j.comments)) list = j.comments;
    }
    return list
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        contenido: String(c.contenido ?? c.content ?? c.body ?? "").slice(
          0,
          600,
        ),
        user_nombre: c.user_nombre ? String(c.user_nombre) : undefined,
      }))
      .filter((c) => c.contenido);
  } catch {
    return [];
  }
}

function countWeeklyTickets(tickets: Record<string, unknown>[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return tickets.filter((t) => {
    const fecha = String(t.creacion ?? t.created_at ?? "");
    if (!fecha) return false;
    try {
      return new Date(fecha) >= sevenDaysAgo;
    } catch {
      return false;
    }
  }).length;
}

interface AtcContext {
  block: string;
  ticketCount: number;
  weeklyTickets: number;
  signals: string[];
  alumnoNombreResuelto?: string;
}

async function buildAtcContext(
  authorization: string,
  alumnoCode: string,
  alumnoName: string,
): Promise<AtcContext> {
  const signals: string[] = [];

  // Fase 1: perfil del alumno (necesitamos el ID numérico para filtrar metadata correctamente)
  const profile = await fetchStudentProfile(authorization, alumnoCode);

  // El entity_id en metadata es el ID numérico del alumno, NO el código string
  const alumnoNumericId = profile
    ? String((profile as Record<string, unknown>).id ?? "")
    : "";
  const metadataEntityId = alumnoNumericId || alumnoCode;

  // Nombre real del alumno extraído del perfil (más fiable que lo que manda el cliente)
  const alumnoNombreResuelto =
    String(
      (profile as Record<string, unknown> | null)?.nombre ??
      (profile as Record<string, unknown> | null)?.name ??
      "",
    ).trim() || undefined;

  // Fase 2: resto en paralelo usando el ID numérico para metadata
  const [rawTickets, coaches, venceItems, membresiaItems, estatusRows, etapasRows, surveyPayload, bonosRows] =
    await Promise.all([
      fetchStudentTickets(authorization, alumnoCode),
      fetchStudentCoaches(authorization, alumnoCode),
      fetchMetadataByEntity(authorization, "alumno_acceso_vence_estimado", metadataEntityId),
      fetchMetadataByEntity(authorization, "alumno_acceso_extension_membresia", metadataEntityId),
      fetchEstatusRows(authorization, alumnoCode),
      fetchEtapasHistory(authorization, alumnoCode),
      fetchWelcomeSurvey(authorization, metadataEntityId, alumnoCode),
      fetchStudentBonos(authorization, alumnoCode),
    ]);

  const weeklyTickets = countWeeklyTickets(rawTickets);

  const tickets = rawTickets
    .map((t) => ({
      codigo: String(t.id_externo ?? t.codigo ?? t.id ?? ""),
      fecha: String(t.creacion ?? t.created_at ?? ""),
    }))
    .filter((x) => x.codigo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8);

  const details = await Promise.all(
    tickets.map(async ({ codigo }) => {
      const [detail, comments] = await Promise.all([
        fetchTicketDetail(authorization, codigo),
        fetchPublicComments(authorization, codigo),
      ]);
      return { codigo, detail, comments };
    }),
  );

  const lines: string[] = [];
  lines.push(
    `## HISTORIAL DEL ALUMNO: ${alumnoName} (código: ${alumnoCode})\n`,
  );

  // Bloque de perfil completo del alumno
  if (profile) {
    lines.push(buildProfileBlock(profile));
    lines.push("");
  }

  // Coaches asignados (endpoint dedicado — más fiable que teamMembers del perfil)
  if (coaches.length > 0) {
    lines.push("## COACHES ASIGNADOS AL ALUMNO\n");
    for (const c of coaches) {
      const role = [c.puesto, c.area].filter(Boolean).join(" · ");
      lines.push(`- ${c.name}${role ? ` (${role})` : ""}`);
    }
    lines.push("");
  }

  // Datos contractuales: fechas, pausas, extensiones, membresía
  // Buscar fecha de ingreso en el perfil (varios campos posibles según el endpoint)
  const p = profile as Record<string, unknown> | null;
  const joinDateRaw =
    (p
      ? String(
          p.ingreso ?? p.joinDate ?? p.join_date ?? p.fecha_ingreso ?? p.fechaIngreso ?? "",
        ) || null
      : null) ??
    // Fallback: la metadata de vence a veces almacena fecha_ingreso en el payload
    (() => {
      if (!venceItems.length) return null;
      const vp = (venceItems[0] as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      return vp ? (String(vp.fecha_ingreso ?? vp.ingreso ?? "") || null) : null;
    })();
  const contractData = computeContractData(
    venceItems, membresiaItems, estatusRows, joinDateRaw,
  );
  lines.push(buildContractBlock(contractData));
  lines.push("");

  // Historial de estatus (ACTIVO, PAUSADO, MEMBRESIA, etc.)
  const statusBlock = buildStatusHistoryBlock(estatusRows);
  if (statusBlock) {
    lines.push(statusBlock);
    lines.push("");
  }

  // Historial de etapas/fases
  const etapasBlock = buildEtapasBlock(etapasRows);
  if (etapasBlock) {
    lines.push(etapasBlock);
    lines.push("");
  }

  // Encuesta de bienvenida
  if (surveyPayload) {
    lines.push(buildSurveyBlock(surveyPayload));
    lines.push("");
  }

  // Bonos asignados al alumno
  lines.push(buildBonosBlock(bonosRows));
  lines.push("");

  lines.push(
    "Usa este historial para entender el contexto del caso actual. Identifica patrones, consultas recurrentes y tono de las interacciones.\n",
  );

  for (const { codigo, detail, comments } of details) {
    const t = detail ?? {};
    const nombre = String(
      t.nombre ?? t.subject ?? t.asunto ?? `Ticket ${codigo}`,
    );
    const tipo = String(t.tipo ?? t.type ?? "");
    const estado = String(t.estado ?? t.status ?? "");
    const fecha = String(t.creacion ?? t.created_at ?? "");
    const desc = String(
      t.descripcion ?? t.description ?? t.body ?? "",
    ).slice(0, 800);
    const commentsText = comments
      .map(
        (c) =>
          `${c.user_nombre ? `[${c.user_nombre}]` : "[ATC]"}: ${c.contenido}`,
      )
      .join("\n")
      .slice(0, 2_000);

    const meta = [tipo, estado, fecha].filter(Boolean).join(" · ");
    lines.push(`### [${codigo}] ${nombre}${meta ? ` (${meta})` : ""}`);
    if (desc) lines.push(`Consulta: ${desc}`);
    if (commentsText) lines.push(`Respuestas ATC:\n${commentsText}`);
    lines.push("");

    signals.push(...detectRiskSignals(`${desc} ${commentsText}`));
  }

  const uniqueSignals = Array.from(new Set(signals));
  if (uniqueSignals.length > 0) {
    lines.push(
      `## SEÑALES DETECTADAS EN HISTORIAL\n${uniqueSignals.join(", ")}\n`,
    );
  }

  return {
    block: lines.join("\n"),
    ticketCount: tickets.length,
    weeklyTickets,
    signals: uniqueSignals,
    alumnoNombreResuelto,
  };
}

// ─── Knowledge base ───────────────────────────────────────────────────────────

const SUPER_ATC_KB_ENTITY = "super_atc_knowledge_base";
const SUPER_ATC_KB_ENTITY_ID = "v1";

// Bloque de protocolos base inyectado SIEMPRE cuando no hay KB guardada en DB.
// Evita que el modelo alucine reglas inexistentes (ej: "2 pausas de 30 días").
const FALLBACK_KB_BLOCK = `## PERSONALIDAD DEL AGENTE — EMMA

### Identidad y misión
Emma es la Gestora Estratégica de Experiencia del Alumno en Hotselling.
Su misión principal es ayudar a los estudiantes a avanzar más rápido, reducir bloqueos, orientar correctamente sus consultas y garantizar una experiencia de acompañamiento ágil, cercana y eficiente.
Emma combina la empatía de una excelente asesora de servicio al cliente con la capacidad de organización y criterio de una coordinadora estratégica.

### Rasgos de personalidad
- Cercana y humana.
- Empática y amable.
- Profesional y respetuosa.
- Ágil y resolutiva.
- Proactiva.
- Orientada a resultados.
- Paciente y servicial.
- Positiva y motivadora.
- Clara y estructurada al comunicar.

### Forma de comunicarse
Emma siempre se comunica de manera cálida, amable y profesional.
Cuando inicia una conversación suele saludar por el nombre del estudiante y presentarse:
"¡Hola, [Nombre]! 😊 Me llamo Emma y estoy aquí para servirte. ¿Cómo puedo ayudarte hoy?"
También puede utilizar preguntas estratégicas como:
- ¿Cómo te va?
- ¿En qué punto del programa te encuentras?
- ¿Cuál es tu principal cuello de botella en este momento?
- ¿Qué te gustaría resolver hoy?

### Rol dentro del ecosistema
Emma no reemplaza al equipo humano. Su función es:
- Resolver consultas utilizando la información y documentación disponible.
- Guiar al estudiante hacia el siguiente paso correcto.
- Ayudar a identificar bloqueos de implementación.
- Orientar al alumno sobre fases, procesos, tareas y recursos del programa.
- Levantar y gestionar tickets cuando sea necesario.
- Escalar casos complejos al coach o al equipo de atención humana correspondiente.
- Dar seguimiento cuando detecte que un alumno requiere apoyo adicional.

### Principios de actuación
- Prioriza la claridad sobre la complejidad.
- Busca resolver en el menor número posible de interacciones.
- Siempre intenta orientar al estudiante hacia la acción.
- Nunca genera fricción innecesaria.
- Nunca discute ni confronta.
- Mantiene una actitud colaborativa y de servicio.
- Si no puede resolver algo con certeza, escala el caso al equipo humano.

### Escalamiento
Cuando una consulta requiera intervención humana, Emma debe comunicarlo de manera positiva y profesional:
"Voy a escalar esta solicitud a nuestro equipo para que puedan ayudarte de forma más específica. En breve uno de nuestros especialistas dará seguimiento a tu caso."

### Objetivo final
Emma existe para que cada estudiante se sienta acompañado, escuchado y orientado en todo momento, ayudándole a avanzar con mayor velocidad, claridad y confianza dentro de Hotselling.

---

## BASE DE CONOCIMIENTO OPERATIVA ATC — PROTOCOLOS BASE

### GARANTÍAS

--- Hotselling Starter ---
La garantía Starter es SOLO extensión de tiempo (NO reembolso).
Si el alumno solicita → documentar caso con preguntas de indagación y conceder extensión.

--- Hotselling PRO ---
ANTES de hablar de garantía, ofrecer siempre en este orden:
1. Sesión de claridad con el coach (reenfoque, plan de acción).
2. Pausa (si el alumno manifiesta ansiedad por falta de tiempo).
3. Continuidad por membresía — mensaje clave: "¿Sabías que puedes mantener tu garantía pagando una membresía simbólica? $97 hasta el 13-may-2026. Sigues con coaches, garantía y acceso completo."
   NOTA: aplica SOLO si el alumno está dentro de los primeros 4 meses del contrato.

Criterios para que aplique garantía PRO:
- Completó todas las tareas de las 5 fases dentro del tiempo asignado.
- Está dentro de los 4 meses de acceso al programa.
- El contrato está al día con los pagos.
- La solicitud es por falta de resultados con implementación real y exclusiva del método.

Si el alumno insiste y está en los tiempos → enviar formato de auditoría (3 días para entregar). Proceso 5-7 días hábiles con equipo legal.

### PAUSAS — REGLA ABSOLUTA

REGLA: El alumno tiene UNA SOLA pausa disponible durante todo el programa.
NO existen "2 pausas". NUNCA decir que el alumno tiene "2 pausas". NO inventar cantidad de pausas distinta a lo aquí documentado.

--- Hotselling Starter ---
NO aplica pausa durante los 4 meses del programa (según contrato).
Si el alumno pide pausa → informar que la pausa no aplica en el programa Starter.

--- Hotselling PRO ---
UNA pausa de hasta 30 días totales (continuos o fraccionados).
Opciones disponibles: 1 semana / 15 días / 1 mes. No existen otras opciones de duración.
La pausa se aplica de fecha fija a fecha fija (ej: jueves a jueves).
Condición OBLIGATORIA: el alumno debe estar al día con los pagos. Si hay mora → NO se concede la pausa hasta regularizar.
Motivo grave (salud, situación justificada): solicitar soporte/aval comprobable, con respeto.
Motivo personal (vacaciones, trabajo, etc.): es un beneficio contractual, no requiere justificación.

### EXTENSIONES

--- Hotselling Starter ---
Incluye extensión de 4 meses adicionales SIN COSTO si el alumno no creó su negocio al finalizar los 4 meses iniciales.
El alumno DEBE solicitarlo — no se aplica automáticamente.

--- Hotselling PRO ---
Extensiones de 1-2 meses, evaluadas caso a caso.
Casos aprobables: (1) coach de tráfico y copy confirman que el alumno está cerca de ser caso de éxito, O (2) motivo humanitario comprobable con soporte documental.
INDISPENSABLE: el alumno debe tener BUENA ACTITUD. Con antecedentes negativos → línea estricta y legal.
Por contrato, si necesita más tiempo debe pagar membresía. Si no quiere y es problemático → protocolo legal.
Casos de éxito (grabados y documentados): 30 días extensión SIN COSTO + 1 mes membresía a $97. Luego precio regular.
Todo acuerdo de extensión extraordinaria debe quedar firmado por escrito por el alumno (OTROSÍ).

### FIDELIDAD AL MÉTODO

Se invalida AUTOMÁTICAMENTE la garantía si el alumno utilizó materiales externos:
- Copys o creativos no alineados a las plantillas del programa.
- Páginas de ventas o embudos externos (no los entregados por el programa).
- Estrategias híbridas con métodos externos sin aprobación del coach.

Respuesta estándar en caso de incumplimiento:
"Tras revisar su implementación, detectamos el uso de materiales ajenos a la metodología oficial de Hotselling. La garantía se basa en la aplicación estricta del método validado. Al utilizar elementos externos, se invalida el proceso de garantía."

### MEMBRESÍAS Y CONTRATOS

Hotselling Starter: $97/mes (precio se mantiene).
Hotselling PRO: $250/mes o $600 trimestral (precio desde 14-may-2026).
Ventana de gracia (contratos vencidos antes del 14-may-2026): 5 días hábiles para activar a $97. Después → precio nuevo.
Al 5ta membresía PRO: se eliminan bonos contractuales y pierde derecho a garantía.

Estados: Activo → Inactivo por Pago → Activo Membresía → Completado (5 días gracia tras vencimiento).

### PREGUNTAS FRECUENTES

P: ¿Cuánto tardan en responder mi ticket o feedback?
R: Tu coach está revisando tu consulta y normalmente responden en horario laboral de 8am a 5pm hora Colombia.

### LIMITACIONES DEL AGENTE

El agente NO puede: aprobar reembolsos, garantías, extensiones extraordinarias, dar excepciones al contrato, negociar valores distintos a los oficiales, inventar reglas no documentadas.
El agente NO puede inventar ni mencionar tiempos específicos de resolución — cuando un alumno pregunte cuánto tarda la respuesta, decir que su coach está revisando su consulta y que normalmente responden en horario laboral de 8am a 5pm hora Colombia. NO mencionar plazos como "2 horas", "4 horas", "48 horas", "24 horas" ni ningún otro.
Si no sabe la respuesta con certeza → decir "te ayudo a gestionar esto con el equipo" en lugar de inventar.
`;

interface KbSecciones {
  personalidad?: string;
  garantias?: string;
  pausas?: string;
  extensiones?: string;
  fidelidad_metodo?: string;
  // legacy (backward compat con DB existente)
  protocolos?: string;
  contratos?: string;
  faqs?: string;
  casos_historicos?: string;
  limitaciones?: string;
}

async function loadSuperAtcKnowledgeBase(
  authorization: string,
): Promise<string | null> {
  try {
    const url = buildUrl("/metadata");
    const res = await fetch(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
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
      (i) =>
        i.entity === SUPER_ATC_KB_ENTITY &&
        i.entity_id === SUPER_ATC_KB_ENTITY_ID,
    );
    if (!found?.payload) return null;
    const payload = found.payload as Record<string, unknown>;
    const secciones = payload.secciones as KbSecciones | undefined;
    if (!secciones) return null;

    const parts: string[] = ["## BASE DE CONOCIMIENTO OPERATIVA ATC\n"];
    // Personalidad del agente (Emma) — va primero para fijar tono e identidad
    if (secciones.personalidad?.trim())
      parts.push(`### PERSONALIDAD DEL AGENTE\n${secciones.personalidad}\n`);
    // nuevas secciones dedicadas
    if (secciones.garantias?.trim())
      parts.push(`### GARANTÍAS\n${secciones.garantias}\n`);
    if (secciones.pausas?.trim())
      parts.push(`### PAUSAS\n${secciones.pausas}\n`);
    if (secciones.extensiones?.trim())
      parts.push(`### EXTENSIONES\n${secciones.extensiones}\n`);
    if (secciones.fidelidad_metodo?.trim())
      parts.push(`### FIDELIDAD AL MÉTODO\n${secciones.fidelidad_metodo}\n`);
    // secciones legacy (backward compat)
    if (secciones.protocolos?.trim())
      parts.push(`### PROTOCOLOS\n${secciones.protocolos}\n`);
    if (secciones.contratos?.trim())
      parts.push(`### CONTRATOS Y MEMBRESÍAS\n${secciones.contratos}\n`);
    if (secciones.faqs?.trim())
      parts.push(`### FAQS OPERATIVAS\n${secciones.faqs}\n`);
    if (secciones.casos_historicos?.trim())
      parts.push(`### CASOS HISTÓRICOS\n${secciones.casos_historicos}\n`);
    if (secciones.limitaciones?.trim())
      parts.push(`### LIMITACIONES DEL AGENTE\n${secciones.limitaciones}\n`);

    return parts.length > 1 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

// ─── Usage logging ────────────────────────────────────────────────────────────

async function fetchCurrentUser(
  authorization: string,
): Promise<{ id: string | null; codigo: string | null; nombre: string | null }> {
  try {
    const res = await fetch(buildUrl("/auth/me"), {
      headers: { Authorization: authorization, Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) return { id: null, codigo: null, nombre: null };
    const json = (await res.json()) as unknown;
    const payload =
      json && typeof json === "object" && "data" in (json as object)
        ? (json as Record<string, unknown>).data
        : json;
    const p = payload as Record<string, unknown>;
    return {
      id: p ? String(p.id ?? "") || null : null,
      codigo: p ? String(p.codigo ?? p.code ?? "") || null : null,
      nombre:
        p
          ? String(
              p.nombre ?? p.name ?? p.username ?? p.email ?? "",
            ) || null
          : null,
    };
  } catch {
    return { id: null, codigo: null, nombre: null };
  }
}

async function logAgentUsage(
  authorization: string,
  data: {
    agent_type: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd?: number;
    user_message_chars: number;
    mode: string;
    user_codigo?: string;
    user_nombre?: string;
    alumno_codigo?: string;
    alumno_nombre?: string;
    signals?: string[];
    created_at: string;
  },
) {
  const internalToken = process.env.INTERNAL_API_TOKEN;
  const authHeader = internalToken ? `Bearer ${internalToken}` : authorization;
  try {
    await fetch(buildUrl("/metadata"), {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity: "agente_uso_super_atc",
        entity_id: data.user_codigo ?? data.alumno_codigo ?? "general",
        payload: data,
      }),
      cache: "no-store",
    });
  } catch {
    // silencioso
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: {
    messages?: unknown;
    provider?: string;
    alumnoCode?: string;
    alumnoName?: string;
    mode?: string;
    chatHistory?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = body.provider === "openai" ? "openai" : "anthropic";
  const alumnoCode =
    typeof body.alumnoCode === "string" ? body.alumnoCode.trim() : "";
  const alumnoName =
    typeof body.alumnoName === "string" ? body.alumnoName.trim() : alumnoCode;
  const mode = body.mode === "atc_team" ? "atc_team" : "alumno";
  const chatHistory =
    typeof body.chatHistory === "string" && body.chatHistory.trim()
      ? body.chatHistory.trim()
      : null;

  const authorization = request.headers.get("authorization") ?? "";
  const typedMessages = messages as Array<{ role: string; content: string }>;
  const userMsg = String(typedMessages.at(-1)?.content ?? "");
  const currentSignals = detectRiskSignals(userMsg);

  // Identificar al usuario que llama (para registrar quién usa el agente)
  const currentUser = authorization ? await fetchCurrentUser(authorization) : { id: null, codigo: null, nombre: null };

  // Build context
  let ctx: AtcContext = {
    block: "",
    ticketCount: 0,
    weeklyTickets: 0,
    signals: currentSignals,
  };

  if (alumnoCode && authorization) {
    try {
      const built = await buildAtcContext(authorization, alumnoCode, alumnoName);
      ctx = {
        ...built,
        signals: Array.from(new Set([...built.signals, ...currentSignals])),
      };
    } catch {
      // continuar sin contexto
    }
  }

  // Load knowledge base
  let knowledgeBlock = FALLBACK_KB_BLOCK; // siempre activo como base mínima
  if (authorization) {
    try {
      const kb = await loadSuperAtcKnowledgeBase(authorization);
      if (kb) knowledgeBlock = kb; // la DB sobreescribe el fallback cuando existe
    } catch {
      // silencioso — el fallback ya está activo
    }
  }

  const signalBlock =
    ctx.signals.length > 0
      ? `\n\n[SEÑALES DETECTADAS]: ${ctx.signals.join(", ")}. Asegúrate de reflejar estas señales en tu análisis de riesgo.`
      : "";

  const weeklyLimitBlock =
    mode === "alumno" && ctx.weeklyTickets >= 10
      ? `\n\n[LÍMITE DE TICKETS]: El alumno ya tiene ${ctx.weeklyTickets} tickets esta semana (límite: 10). NO propongas crear un ticket nuevo. Infórmale e invítale a consolidar.`
      : "";

  const baseSystem =
    mode === "alumno" ? buildAlumnoSystemPrompt(alumnoName) : SYSTEM_ATC_TEAM;

  const systemPrompt = [
    baseSystem,
    knowledgeBlock ? `\n\n${knowledgeBlock}` : "",
    ctx.block ? `\n\n${ctx.block}` : "",
    chatHistory ? `\n\n## HISTORIAL DE CHAT ATC\u2194ALUMNO\n\nEste es el historial real de mensajes entre el alumno y su equipo ATC. Los mensajes incluyen marca de tiempo. Puedes usarlo para responder preguntas sobre conversaciones pasadas, resumir lo que se habl\u00f3, o identificar temas pendientes. Si el alumno pregunta por una conversaci\u00f3n de una fecha concreta, busca en este historial y cita los mensajes relevantes.\n\n${chatHistory}` : "",
    signalBlock,
    weeklyLimitBlock,
  ]
    .filter(Boolean)
    .join("");

  const encoder = new TextEncoder();

  // Determine risk level for escalation hint
  const hasHighRisk = isHighRisk(ctx.signals);

  const emitContext = (controller: ReadableStreamDefaultController) => {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "context",
          ticketCount: ctx.ticketCount,
          weeklyTickets: ctx.weeklyTickets,
          signals: ctx.signals,
          hasHighRisk,
        })}\n\n`,
      ),
    );
  };

  // ── Anthropic ───────────────────────────────────────────────────────────────

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          emitContext(controller);

          const anthropic = new Anthropic({ apiKey });
          const sdkStream = await anthropic.messages.create({
            model: modelId,
            max_tokens: 4_000,
            stream: true,
            system: systemPrompt,
            messages: typedMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: String(m.content ?? ""),
            })),
          });

          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of sdkStream) {
            if (
              event.type === "message_start" &&
              (event as { message?: { usage?: { input_tokens?: number } } })
                .message?.usage
            ) {
              inputTokens =
                (
                  event as {
                    message: { usage: { input_tokens: number } };
                  }
                ).message.usage.input_tokens ?? 0;
            }
            if (
              event.type === "message_delta" &&
              (event as { usage?: { output_tokens?: number } }).usage
            ) {
              outputTokens =
                (event as { usage: { output_tokens: number } }).usage
                  .output_tokens ?? 0;
            }
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              }
            }
          }

          void logAgentUsage(authorization, {
            agent_type: "super-atc",
            model: modelId,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost_usd: (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15,
            user_message_chars: userMsg.length,
            mode,
            user_codigo: currentUser.codigo ?? undefined,
            user_nombre: currentUser.nombre ?? undefined,
            alumno_codigo: alumnoCode || undefined,
            alumno_nombre: ctx.alumnoNombreResuelto || alumnoName || undefined,
            signals: ctx.signals,
            created_at: new Date().toISOString(),
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const e = err as { status?: number; message?: string };
          let msg = e.message ?? "Error desconocido (Anthropic)";
          if (e.status === 401) msg = "API key de Anthropic inválida (401).";
          else if (e.status === 429) msg = "Rate limit en Anthropic (429).";
          else if (e.status === 404)
            msg = "Modelo no encontrado en Anthropic (404).";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── OpenAI fallback ──────────────────────────────────────────────────────────

  const oaiKey = process.env.OPENAI_API_KEY;
  const oaiModel = process.env.OPENAI_MODEL ?? "gpt-4o";
  if (!oaiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY no configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        emitContext(controller);

        const client = new OpenAI({ apiKey: oaiKey });
        const completion = await client.chat.completions.create({
          model: oaiModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...typedMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: String(m.content ?? ""),
            })),
          ],
          stream: true,
          stream_options: { include_usage: true },
          max_completion_tokens: 4_000,
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        void logAgentUsage(authorization, {
          agent_type: "super-atc",
          model: oaiModel,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10,
          user_message_chars: userMsg.length,
          mode,
          user_codigo: currentUser.codigo ?? undefined,
          user_nombre: currentUser.nombre ?? undefined,
          alumno_codigo: alumnoCode || undefined,
          alumno_nombre: ctx.alumnoNombreResuelto || alumnoName || undefined,
          signals: ctx.signals,
          created_at: new Date().toISOString(),
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        let msg = e.message ?? "Error desconocido (OpenAI)";
        if (e.status === 401) msg = "API key de OpenAI inválida (401).";
        else if (e.status === 429) msg = "Rate limit en OpenAI (429).";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
