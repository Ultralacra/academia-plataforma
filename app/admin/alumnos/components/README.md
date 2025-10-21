# Componentes de `app/admin/alumnos/components`

Esta carpeta actúa como una capa de organización y entrada para los componentes relacionados con la ficha de alumno. No mueve ni cambia los componentes originales; crea wrappers y un layout composable para facilitar la lectura y futuras refactorizaciones.

Estructura propuesta

- `index.ts` - Barrel que reexporta los componentes principales desde `../[code]/_parts` y otros lugares relevantes.
- `StudentDetailLayout.tsx` - Un pequeño layout wrapper que arma la ficha del alumno (cabecera, métricas, tickets, chat, coaches) usando los componentes existentes. Es un punto único de entrada que facilita entender la composición de la ficha.

Objetivo

- Mejorar descubribilidad y organización sin romper importaciones existentes.
- Permitir migraciones y renombrados por fases.

Cómo usar

- Desde cualquier parte puedes importar:
  ```ts
  import { StudentDetailLayout } from "@/app/admin/alumnos/components";
  ```
  o
  ```ts
  import { TicketsPanel, ChatPanel } from "@/app/admin/alumnos/components";
  ```

Siguientes pasos

- Si te parece bien, puedo:
  - Reemplazar importaciones en `page.tsx` y `StudentDetailContent.tsx` para usar estos wrappers.
  - Mover/renombrar archivos físicamente y actualizar imports en bloque (más riesgoso pero más limpio).
  - Añadir prop-types/Typescript types a los wrappers si quieres seguridad de tipos.
