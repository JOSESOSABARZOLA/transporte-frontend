/*
  App: Cuadro de Colores
  Módulo: Cuadro de Colores
  Feature: Sistema visual
  Archivo: tipografia.plugin.js
  Responsabilidad: Corregir UNA vez el color de etiquetas y encabezados de daisyUI.
  Desarrollador: Jose Sosa
  Fecha: 2026-10-08

  POR QUÉ UN PLUGIN Y NO UNA REGLA EN LA HOJA. daisyUI 5 emite `.label` y el `thead` de
  `.table` como COMPONENTES dentro de la capa `utilities`, antes de las utilidades de
  Tailwind. La corrección tiene que quedar justo ahí: DESPUÉS de daisyUI (para ganarle) y
  ANTES de `text-error`, `text-xs`… (para que una utilidad puesta en el mismo elemento
  —«label-text-alt text-error», el error del campo— siga mandando). Una regla en la hoja
  cae al final de la capa y le ganaría a `text-error`; sin capa, también. `addComponents`
  es lo que la deja en su sitio. Sin dependencias: solo la API de plugins de Tailwind.
  Comprobado sobre el CSS compilado.
*/

/** @type {import('tailwindcss/plugin').PluginCreator} */
export default function tipografia({ addComponents }) {
  addComponents({
    // Etiquetas: color pleno, 14 px, 600 (daisyUI las deja al 60 %).
    ".label, .label-text, .fieldset-legend": {
      color: "var(--app-text-label)",
      "font-size": "0.875rem",
      "font-weight": "600",
    },
    // Texto de ayuda junto a la etiqueta: secundario, 12 px.
    ".label-text-alt": {
      color: "var(--app-text-muted)",
      "font-size": "0.75rem",
      "font-weight": "400",
    },
    // Encabezados de tabla: color pleno y 600.
    ".table thead th, .table thead td, .app-data-table thead th": {
      color: "var(--app-text-strong)",
      "font-weight": "600",
    },

    /*
      CUERPO DE TABLAS Y ACCIONES (2026-10-08). Aquí la ESPECIFICIDAD decide, no solo el
      orden: daisyUI y estas reglas viven en la misma capa que las utilidades. Por eso las
      reglas que deben CEDER ante una utilidad van envueltas en `:where()` (especificidad
      0,1,0 o menos) y las que deben GANARLE la suben a propósito, con el motivo al lado.
    */

    // Celda: color pleno y 13 px aunque la tabla sea `table-sm`/`table-xs` (daisyUI fija el
    // tamaño en el `<tr>` y la celda lo hereda). Especificidad 0,0,2: `text-xs` o
    // `text-app-muted` puestos en la propia celda o en su subtexto siguen mandando.
    ":where(.table, .app-data-table) tbody td": {
      color: "var(--app-text-strong)",
      "font-size": "0.8125rem",
    },

    // Acción de fila (Editar, Ver órdenes…): 13 px, 600, color de acción y 32 px de alto.
    // Por las variables de `.btn` (`--size`, `--fontsize`), así `btn-xs` no lo recorta.
    // Especificidad 0,1,0 y después de daisyUI: le gana a `.btn`; Tailwind intercala estas
    // reglas con las utilidades y las de color (`text-*`) salen después, así que mandan.
    ":where(.table, .app-data-table) :where(tbody td) .btn-ghost": {
      "--size": "2rem",
      "--fontsize": "0.8125rem",
      color: "var(--app-text-accion)",
      "font-weight": "600",
    },

    // Desactivar/Retirar (`text-error`) y Activar (`text-success`) en la fila: el color puro
    // no llega a 4,5:1 sobre la fila rayada (docs/estilos.md). Especificidad 0,3,0 A
    // PROPÓSITO, para ganarle a la utilidad con su versión derivada del mismo color; el
    // `:not()` deja que un botón deshabilitado siga leyéndose como deshabilitado.
    ":where(.table, .app-data-table) :where(tbody td) .btn-ghost.text-error:not(:disabled, [disabled], .btn-disabled)":
      {
        color: "var(--app-text-peligro)",
      },
    ":where(.table, .app-data-table) :where(tbody td) .btn-ghost.text-success:not(:disabled, [disabled], .btn-disabled)":
      {
        color: "var(--app-text-exito)",
      },

    /*
      BOTÓN DESHABILITADO, en toda la aplicación. daisyUI deja el texto al 20 % y el fondo
      al 10 %: sobre una fila rayada no se distingue que haya un botón. Texto con su token,
      fondo `base-200` y un borde visible. Mismas especificidades que daisyUI (0,2,0 color;
      0,3,0 fondo y borde) y después de él; el color, también por encima de la acción de fila.
    */
    // Solo el `disabled` NATIVO de los botones que aún no pasan por `<Boton>`.
    ".btn:is(:disabled, [disabled], .btn-disabled)": {
      "--btn-fg": "var(--app-text-disabled)",
      color: "var(--app-text-disabled)",
    },
    ".btn:is(:disabled, [disabled], .btn-disabled):not(.btn-link, .btn-ghost)": {
      "background-color": "var(--color-base-200)",
      "border-color": "color-mix(in srgb, var(--color-base-content) 22%, transparent)",
    },

    /*
      APAGADO CON MOTIVO (estándar de botones, 2026-10-15). `<Boton>` apaga con `aria-disabled`,
      nunca con `disabled`: daisyUI le quita el puntero a un `:disabled` y su `title` —el motivo—
      no se mostraba. Conserva su VARIANTE al 50 %, con el cursor «no permitido», y al pasar el
      mouse no cambia de color (no promete una acción que no hará). Especificidad 0,2,0 y después
      de daisyUI: le gana a su `:hover`.
    */
    '.btn[aria-disabled="true"]': {
      opacity: "0.5",
      cursor: "not-allowed",
    },
    '.btn[aria-disabled="true"]:hover': {
      "--btn-bg": "var(--btn-color, var(--color-base-200))",
    },
    '.btn-outline[aria-disabled="true"]:hover, .btn-ghost[aria-disabled="true"]:hover, .btn-link[aria-disabled="true"]:hover':
      {
        "--btn-bg": "#0000",
        "--btn-fg": "var(--btn-color, currentColor)",
      },

    /*
      DISTINTIVOS DE ÉXITO, AVISO Y ERROR. Blanco sobre `warning` da 2,45:1 en claro y blanco
      sobre `error` 4,14:1 en oscuro: los chips de la cabecera («N alertas», flota) no se
      leían. Relleno tenue, borde del color y texto mezclado con `base-content` (el manual
      prohíbe el rojo y los complementarios como fondo completo). Por variables de `.badge`,
      así que la caja no se mueve. Contrastes en docs/estilos.md.
      `badge-success` se sumó el 2026-10-08: «Carga baja» salía sólida junto a «Carga media» y
      «Carga alta» tenues. Los tres estados del semáforo llevan ahora el mismo tratamiento.
    */
    ".badge-success, .badge-warning, .badge-error": {
      "--badge-bg":
        "color-mix(in srgb, var(--badge-color) 18%, var(--color-base-100))",
      "--badge-fg":
        "color-mix(in srgb, var(--badge-color) 40%, var(--color-base-content))",
    },
    /*
      `badge-soft` se sumó el 2026-10-15 («Sin fechas», «Falta SOAT» de la flota): daisyUI pinta el
      texto con el color puro, y `warning` sobre su relleno tenue da 2,29:1 en claro. Con
      `--badge-fg` queda en 5,92:1 en claro y 10,56:1 en oscuro.
    */
    ".badge-outline:is(.badge-success, .badge-warning, .badge-error), .badge-dash:is(.badge-success, .badge-warning, .badge-error), .badge-soft:is(.badge-success, .badge-warning, .badge-error)":
      {
        color: "var(--badge-fg)",
      },

    /*
      INSIGNIA SUAVE (2026-10-13). Etiquetas de comportamiento de «Formularios del cuadro»: azul
      claro, texto azul oscuro, 11 px. Por variables de `.badge`, así la caja no se mueve.
    */
    ".app-insignia-suave": {
      "--badge-bg": "var(--app-insignia-suave-bg)",
      "--badge-fg": "var(--app-insignia-suave-fg)",
      "border-color": "transparent",
      "font-size": "0.6875rem",
      "font-weight": "600",
    },

    /*
      ETIQUETA DE TRANSPORTE (tabla única de operativos, 2026-10-13). UNA sola forma, con borde:
      los cuatro tipos que piden vehículo en azul claro (fondo y texto de la insignia suave, borde
      primario tenue) y «Propios medios» en gris, sin relleno. Antes eran tres rellenos sólidos
      distintos y uno con borde. La palabra va dentro (regla 6). Por variables de `.badge`.
    */
    ".app-etiqueta-transporte": {
      "--badge-bg": "var(--app-insignia-suave-bg)",
      "--badge-fg": "var(--app-insignia-suave-fg)",
      "border-color": "color-mix(in srgb, var(--color-primary) 40%, transparent)",
      "font-weight": "600",
    },
    ".app-etiqueta-transporte-neutra": {
      "--badge-bg": "transparent",
      "--badge-fg": "var(--app-text-muted)",
      "border-color": "color-mix(in srgb, var(--color-base-content) 28%, transparent)",
      "font-weight": "600",
    },

    /*
      INTERRUPTOR (2026-10-13). Sustituye al `toggle` de daisyUI en filas de configuración: 36×20,
      apagado relleno de gris con perilla blanca, encendido en primario. La FILA es un `<label>`
      que envuelve texto y control, así que todo el renglón alterna; el foco visible va en la fila
      (`:has(:focus-visible)`) para que se vea el renglón entero que se va a cambiar.
    */
    ".app-interruptor": {
      appearance: "none",
      position: "relative",
      "flex-shrink": "0",
      width: "2.25rem",
      height: "1.25rem",
      "border-radius": "9999px",
      "background-color": "var(--app-interruptor-apagado)",
      cursor: "pointer",
      transition: "background-color 150ms ease",
    },
    ".app-interruptor::before": {
      content: '""',
      position: "absolute",
      top: "0.125rem",
      left: "0.125rem",
      width: "1rem",
      height: "1rem",
      "border-radius": "9999px",
      "background-color": "#ffffff",
      "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.25)",
      transition: "transform 150ms ease",
    },
    ".app-interruptor:checked": {
      "background-color": "var(--color-primary)",
    },
    ".app-interruptor:checked::before": {
      transform: "translateX(1rem)",
    },
    ".app-interruptor:focus-visible": {
      outline: "none",
    },
    ".app-interruptor:disabled": {
      cursor: "not-allowed",
      opacity: "0.5",
    },
    // Sin animación si la persona la redujo. Anidada en el selector: `addComponents` no admite
    // un `@media` suelto en la raíz.
    ".app-interruptor, .app-interruptor::before": {
      "@media (prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
    ".app-interruptor-fila": {
      cursor: "pointer",
    },
    ".app-interruptor-fila:has(.app-interruptor:disabled)": {
      cursor: "not-allowed",
    },
    ".app-interruptor-fila:has(.app-interruptor:focus-visible)": {
      outline: "2px solid var(--color-primary)",
      "outline-offset": "2px",
    },

    /*
      ACCIONES DE LA FILA de Mis operativos (2026-10-13). Un grupo de ancho fijo, alineado a la
      derecha, con tres casilleros siempre en el mismo sitio —principal, «+ Adicional» y «⋮»—: las
      columnas no cambian de ancho de una fila a otra. Botones de 32 px, 13 px y seminegrita.
      `--btn-color` y no `--btn-bg`: así el hover de daisyUI sigue oscureciendo el fondo.
    */
    ".app-acciones-operativo": {
      display: "inline-flex",
      "justify-content": "flex-end",
      "align-items": "flex-start",
      gap: "0.25rem",
      width: "13.25rem",
    },
    ".app-acciones-operativo > .app-acciones-casillero": {
      display: "inline-flex",
      "justify-content": "flex-end",
      "flex-shrink": "0",
    },
    ".app-accion-secundaria": {
      "--btn-color": "var(--color-base-100)",
      "--btn-fg": "var(--app-text-strong)",
      "--btn-border": "color-mix(in srgb, var(--color-base-content) 28%, transparent)",
      "--btn-shadow": "none",
    },

    // Ayuda bajo el encabezado de un panel y nota al pie de su tabla: secundario a 13 px.
    // Especificidad 0,2,1 A PROPÓSITO: el marcado los escribe con `text-xs` (12 px).
    ".app-data-panel-body > p.text-app-muted": {
      "font-size": "0.8125rem",
      "line-height": "1.25rem",
    },
  });
}
