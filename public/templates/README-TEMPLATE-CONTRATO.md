# Cómo crear el Template del Contrato

## Instrucciones

1. Abre tu documento de contrato original en **Microsoft Word**
2. En cada campo que debe ser variable (los marcados en amarillo), reemplázalo por el **placeholder** correspondiente de la tabla de abajo
3. Los placeholders deben ir **entre dobles llaves**: `{{NOMBRE_COMPLETO}}`
4. Guarda el documento como `.docx` (formato Word moderno)
5. Sube el archivo a esta carpeta: `public/templates/contrato-hotselling-pro.docx`

## Placeholders Disponibles

### Datos del Cliente

| Placeholder           | Descripción                 | Ejemplo           |
| --------------------- | --------------------------- | ----------------- |
| `{{NOMBRE_COMPLETO}}` | Nombre completo del cliente | Juan Pérez García |
| `{{EMAIL}}`           | Correo electrónico          | cliente@email.com |
| `{{TELEFONO}}`        | Teléfono de contacto        | +34 612 345 678   |
| `{{DIRECCION}}`       | Dirección del cliente       | Calle Mayor 123   |
| `{{CIUDAD}}`          | Ciudad                      | Madrid            |
| `{{PAIS}}`            | País                        | España            |
| `{{DNI}}`             | Documento de identidad      | 12345678A         |

### Datos de Empresa (si aplica)

| Placeholder             | Descripción           | Ejemplo           |
| ----------------------- | --------------------- | ----------------- |
| `{{ES_EMPRESA}}`        | ¿Es empresa?          | Sí / No           |
| `{{NOMBRE_EMPRESA}}`    | Razón social          | Mi Empresa S.L.   |
| `{{NIF_EMPRESA}}`       | NIF/CIF de la empresa | B12345678         |
| `{{DIRECCION_EMPRESA}}` | Dirección fiscal      | Av. Principal 456 |
| `{{CIUDAD_EMPRESA}}`    | Ciudad de la empresa  | Barcelona         |
| `{{PAIS_EMPRESA}}`      | País de la empresa    | España            |

### Tercero (si firma otra persona)

| Placeholder            | Descripción          |
| ---------------------- | -------------------- |
| `{{ES_TERCERO}}`       | ¿Firma un tercero?   |
| `{{NOMBRE_TERCERO}}`   | Nombre del tercero   |
| `{{EMAIL_TERCERO}}`    | Email del tercero    |
| `{{TELEFONO_TERCERO}}` | Teléfono del tercero |

### Programa/Producto

| Placeholder             | Descripción         | Ejemplo                |
| ----------------------- | ------------------- | ---------------------- |
| `{{PROGRAMA}}`          | Nombre del programa | HOTSELLING PRO         |
| `{{DURACION_PROGRAMA}}` | Duración            | 4 meses                |
| `{{BONOS}}`             | Bonos incluidos     | Bono A, Bono B, Bono C |

### Datos de Pago

| Placeholder               | Descripción             | Ejemplo                                       |
| ------------------------- | ----------------------- | --------------------------------------------- |
| `{{MODALIDAD_PAGO}}`      | Tipo de pago            | Pago único (contado)                          |
| `{{MONTO_TOTAL}}`         | Monto total formateado  | $2,497.00                                     |
| `{{MONTO_TOTAL_LETRAS}}`  | Monto en palabras       | dos mil cuatrocientos noventa y siete dólares |
| `{{PLATAFORMA_PAGO}}`     | Plataforma de pago      | Stripe / PayPal                               |
| `{{MONEDA}}`              | Moneda                  | USD                                           |
| `{{NUM_CUOTAS}}`          | Número de cuotas        | 3                                             |
| `{{MONTO_CUOTA}}`         | Monto de cada cuota     | $832.33                                       |
| `{{MONTO_RESERVA}}`       | Monto de reserva        | $500.00                                       |
| `{{FECHA_PROXIMO_COBRO}}` | Fecha del próximo cobro | 15 de febrero de 2026                         |

### Fechas

| Placeholder          | Descripción                  | Ejemplo              |
| -------------------- | ---------------------------- | -------------------- |
| `{{FECHA_CONTRATO}}` | Fecha del contrato           | 27 de enero de 2026  |
| `{{FECHA_INICIO}}`   | Fecha de inicio del programa | 1 de febrero de 2026 |
| `{{FECHA_FIN}}`      | Fecha estimada de fin        | 31 de mayo de 2026   |
| `{{DIA}}`            | Día actual (número)          | 27                   |
| `{{MES}}`            | Mes actual (texto)           | enero                |
| `{{ANIO}}`           | Año actual                   | 2026                 |

### Vendedor/Closer

| Placeholder         | Descripción         |
| ------------------- | ------------------- |
| `{{NOMBRE_CLOSER}}` | Nombre del vendedor |
| `{{EMAIL_CLOSER}}`  | Email del vendedor  |

### Otros

| Placeholder | Descripción       |
| ----------- | ----------------- |
| `{{NOTAS}}` | Notas adicionales |

## Ejemplo de uso en el documento

En tu documento Word, donde antes tenías texto fijo como:

```
Yo, [NOMBRE DEL CLIENTE], con email [EMAIL] y teléfono [TELÉFONO]...
```

Debe quedar así:

```
Yo, {{NOMBRE_COMPLETO}}, con email {{EMAIL}} y teléfono {{TELEFONO}}...
```

## Campos vacíos

Si un campo no tiene valor, aparecerá una línea de subrayado: `___________________________`

Esto permite que el documento sea editable y se puedan completar los campos manualmente si es necesario.

## Uso en el CRM

1. Ve al detalle del lead
2. Pestaña "Venta"
3. Haz clic en "Generar Contrato"
4. Revisa la vista previa de los datos
5. Haz clic en "Descargar Contrato"
6. El documento Word se descarga automáticamente con todos los datos completados
7. El documento es **completamente editable** en Word

## Template personalizado

Si tienes varios tipos de contrato, puedes:

1. Marcar la opción "Usar template personalizado"
2. Subir tu propio archivo .docx con los placeholders
3. El sistema usará ese template en lugar del predeterminado
