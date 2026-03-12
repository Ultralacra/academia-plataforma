# CRM comercial: requerimientos para backend

## Objetivo

Este documento define la estructura mínima necesaria para soportar un CRM comercial orientado a seguimiento, recuperación y reactivación de leads. El objetivo es reducir la carga operativa del closer y dejar trazabilidad completa de tareas, interacciones y automatizaciones.

## Pipeline principal

Estados canónicos:

- agendado
- confirmado
- no_show
- llamada_realizada
- decision
- seguimiento
- recuperacion
- lead_dormido
- cerrado_ganado
- cerrado_perdido

Notas:

- Este pipeline debe convivir con el estado legacy actual hasta migración completa.
- Los estados de detalle como objeción, no responde o esperando aprobación no deben reemplazar al pipeline principal.

## Lead

Campos mínimos:

- codigo
- name
- email
- phone
- whatsapp
- owner_codigo
- source
- source_entity
- source_entity_id
- booking_date
- booking_time
- pipeline_status
- customer_type
- product_presented
- objection_type
- objection_detail
- lost_reason
- won_recovered
- lead_disposition
- conversation_status
- last_interaction_at
- last_interaction_channel
- next_contact_at
- next_task_due_at
- followup_started_at
- recovery_started_at
- sleeping_started_at
- protocol_name
- protocol_step
- protocol_paused
- last_template_sent_name
- last_resource_sent_name
- created_at
- updated_at

Validaciones mínimas:

- seguimiento requiere objection_type y next_contact_at.
- recuperacion requiere recovery_started_at.
- cerrado_ganado requiere customer_type y product_presented.
- cerrado_perdido requiere lost_reason.

## Task

Propósito: representar acciones operativas programadas o manuales del closer.

Campos:

- id
- lead_codigo
- type
- title
- description
- channel
- template_id
- resource_id
- protocol_name
- protocol_step
- due_at
- scheduled_for
- status
- completed_at
- skipped_at
- owner_codigo
- automation_run_id
- created_at
- updated_at
- metadata_json

Tipos sugeridos:

- pre_call_reminder
- welcome_message
- post_call_message
- followup_message
- resource_send
- recovery_message
- reactivation_message
- manual_call
- manual_whatsapp

Estados sugeridos:

- pending
- completed
- skipped
- cancelled
- overdue

## Interaction

Propósito: registrar toda interacción comercial relevante.

Campos:

- id
- lead_codigo
- task_id
- happened_at
- channel
- direction
- type
- summary
- content_preview
- template_id
- resource_id
- created_by
- external_message_id
- metadata_json

Canales sugeridos:

- whatsapp
- llamada
- instagram
- email
- otro

Tipos sugeridos:

- note
- whatsapp_message
- phone_call
- template_sent
- resource_sent
- status_change
- no_response_marked

## AutomationRun

Propósito: dejar trazabilidad de qué automatización corrió, cuándo y sobre qué lead.

Campos:

- id
- lead_codigo
- trigger_type
- trigger_reference
- protocol_name
- action_type
- action_payload_json
- dedupe_key
- status
- result_message
- executed_at
- created_at

## Template

Campos:

- id
- code
- name
- category
- channel
- stage_scope
- protocol_name
- protocol_step
- body
- variables_json
- active
- created_at
- updated_at

Categorías mínimas:

- pre_call
- followup
- recovery
- reactivation

## Resource

Campos:

- id
- code
- name
- category
- description
- url
- stage_scope
- objection_scope
- active
- created_at
- updated_at

Categorías mínimas:

- testimonios
- casos_exito
- video_programa
- video_inversion
- contrato
- terminos

## Automatizaciones requeridas

### 1. Creación de lead

Trigger:

- booking o Calendly crea agenda.

Acciones:

- crear lead
- asignar closer
- pipeline_status = agendado
- crear task de bienvenida
- crear recordatorios pre llamada

### 2. Recordatorios pre llamada

Triggers por fecha de llamada:

- 24h antes
- 12h antes
- 1h antes

Acciones:

- crear task
- opcional: enviar plantilla

### 3. Seguimiento

Trigger:

- llamada finalizada sin cierre

Acciones:

- guardar objection_type
- pipeline_status = seguimiento
- crear tasks día 0, 1, 2, 4, 6 y 7

### 4. Recuperación

Trigger:

- sin respuesta al agotarse seguimiento

Acciones:

- pipeline_status = recuperacion
- crear tasks día 10, 14, 21 y 30

### 5. Reactivación

Trigger:

- recuperación agotada sin respuesta

Acciones:

- pipeline_status = lead_dormido
- crear tasks a 60 y 90 días

### 6. Conversación activa

Trigger:

- closer marca decision

Acciones:

- pausar protocolo
- actualizar last_interaction_at
- cancelar o suspender tasks automáticas activas

### 7. Regla de inactividad

Trigger:

- 48 horas sin interacción

Acciones:

- si estaba en decision, mover a seguimiento
- activar protocolo correspondiente

## Endpoints sugeridos

Lead:

- GET /v1/leads/:codigo
- PUT /v1/leads/:codigo
- POST /v1/leads/:codigo/assign

Tasks:

- GET /v1/leads/:codigo/tasks
- POST /v1/leads/:codigo/tasks
- PATCH /v1/tasks/:id

Interactions:

- GET /v1/leads/:codigo/interactions
- POST /v1/leads/:codigo/interactions

Templates:

- GET /v1/crm/templates

Resources:

- GET /v1/crm/resources

Automations:

- POST /v1/crm/automations/run
- POST /v1/crm/automations/run/:codigo

## Métricas mínimas

- leads_agendados
- leads_en_seguimiento
- leads_en_recuperacion
- leads_dormidos
- tareas_pendientes
- leads_sin_actividad
- show_rate
- tasa_cierre
- ventas_recuperadas
- tasa_recuperacion
- ejecucion_protocolo
- tiempo_promedio_recuperacion
- tiempo_decision
- recuperacion_por_objecion

## Compatibilidad con el front actual

El front actual ya envía snapshots completos del lead. Los nuevos campos pueden ser aceptados inicialmente como propiedades adicionales del lead hasta que existan entidades separadas para tasks, interactions, templates y resources.
