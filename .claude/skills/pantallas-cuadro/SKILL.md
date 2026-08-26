---
name: pantallas-cuadro
description: Convenciones de composición de las pantallas del Cuadro de Colores de la AMC. Úsala al crear o modificar páginas y componentes bajo components/cuadro/ y las páginas del módulo. Prohíbe introducir clases CSS nuevas, obliga a componer con el sistema visual existente y garantiza que ninguna información dependa solo del color.
---

# Pantallas — Cuadro de Colores AMC

## Principio rector

**No se introduce ni una sola clase nueva.** Todas las pantallas se componen con las clases,
componentes y variables de tema ya presentes en el proyecto.

Única excepción: los **nueve colores de banner**, que son datos institucionales entregados por
el backend y se aplican con `style` en línea sobre la fila de banner.

## Clases de composición verificadas

| Elemento | Clases exactas |
|---|---|
| Contenedor de página | `flex flex-col mx-auto w-full max-w-5/6` |
| Rejilla de página | `app-page-shell` |
| Antetítulo | `page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]` |
| Título | `page-heading-title` |
| Subtítulo | `page-heading-subtitle` |
| Panel | `app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]` |
| Cabecera de sección | `app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between` |
| Título de sección | `app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95` |
| Cuerpo del panel | `app-data-panel-body px-2 pb-4 pt-2 md:px-4` |
| Tabla | `table table-sm w-full text-sm` |
| Encabezado de tabla | `text-xs uppercase tracking-wider text-gray-500` |
| Filtro por columna | `input input-bordered input-xs w-full font-normal normal-case` |
| Fila con cursor | `hover:bg-info/10` · seleccionada `bg-primary/5` |
| Buscador | `input input-bordered input-sm w-full sm:max-w-md` |
| Botones | `btn btn-primary btn-sm` · `btn btn-ghost btn-sm` · `btn btn-ghost btn-xs` |
| Distintivo | `badge badge-primary badge-sm whitespace-nowrap` |
| Estado vacío | `p-4 text-center text-sm italic text-gray-500` |
| Cargando | `loading loading-spinner loading-lg text-primary` |
| Avisos | `alert alert-info` · `alert-warning` · `alert-error` · `alert-success` |

## Componentes reutilizados, nunca reescritos

`Table`, `FilterByColumn`, `RowActions`, `TextInput`, `SelectInput`, `TextAreaInput`, `Boton`,
`Alert`, `Loading`, `ModalConfirmacion`, `ModalExito`, `ModalContainer`, `Paginacion`,
`Collapse`, `Iconos`, `RutaProtegida`, `SelectorRolPruebas`.

## Reglas de composición

1. **Las pantallas se montan según el rol.** Un perfil no autorizado no tiene el componente en
   memoria. No se ocultan controles.
2. **Los campos calculados no son campos.** Semana, identificador y fecha van como
   `badge badge-ghost badge-sm`, nunca como `input` deshabilitado.
3. **Rejilla del formulario de registro**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
   Responde a la petición del Product Owner de que la captura se perciba corta: la meta declarada
   es registrar un operativo en dos o tres minutos.
4. **Los campos de la DAF**: todo deshabilitado salvo conductor y placa, marcados con
   `badge badge-accent badge-xs` con el texto «Editable».
5. **Validación con Formik y Yup** en `config/validationSchemas.ts`.
6. **Los mensajes de error del servidor se muestran tal cual.**

## Estados obligatorios por pantalla

Cargando inicial · Recarga silenciosa · Vacío · Vacío por filtro · Error de carga · Guardando ·
Éxito · Solo lectura. El detalle está en `docs/FASE5-diseno-interfaz.md` §8.

## Ninguna información depende solo del color

En un sistema llamado *cuadro de colores* esto exige atención deliberada.

| Señal de color | Equivalente textual obligatorio |
|---|---|
| Banner del formulario | Número y nombre en el texto del banner |
| Celda en amarillo | Texto «Pendiente» más `title` con el motivo |
| Alerta crítica | Motivo en el `title`, distinguible del informativo |
| Formulario sin carga | Frase explícita de información no ingresada |
| Estado del cuadro | Texto dentro del distintivo |
| Campo editable de la DAF | Distintivo con el texto «Editable» |
| Ventana abierta o cerrada | Texto con la hora de cierre o reapertura |

## Accesibilidad

- Jerarquía de encabezados correcta, uno por página.
- `aria-required`, `aria-invalid` y `aria-describedby` en campos con error.
- `role="alert"` en errores, `role="status"` en avisos informativos.
- `aria-label` descriptivo en botones de icono.
- No se anula el anillo de foco de daisyUI.
- Se evita `btn-xs` en vistas móviles por el tamaño de área táctil.
- Las tablas usan `<th scope>`; la fila de banner se marca como encabezado de grupo.

## Responsive

Móvil hasta 767 px, luego los puntos de Tailwind. Las tablas del cuadro tienen entre ocho y once
columnas: van dentro de `overflow-x-auto` y **no se convierten en tarjetas**, porque el proyecto
no usa ese patrón. La única pantalla pensada para móvil es *Mis órdenes*, cuyo destinatario es
el funcionario en territorio.

## Antes de dar por hecho

```bash
npm run lint && npm run build
```
