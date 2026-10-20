# Guía de estilos · Texto y contraste

Módulo Transportes / Cuadro de Colores — `transporte-frontend`. Vigente desde el 2026-10-08.

Esta guía fija **cómo se pinta el texto**. El resto del sistema visual (paneles, tablas, botones,
distintivos) sigue en `docs/FASE5-diseno-interfaz.md` §2.2, que es el inventario de la regla 1 de
`CLAUDE.md`.

## Por qué existe

Las etiquetas de los campos («Personal asignado», «Zonales», «Punto de encuentro») y los
encabezados de las tablas («Identificador», «Horario») se veían transparentes. Había dos causas:

- **daisyUI 5** pinta `.label`, `.fieldset-legend` y el `thead` de `.table` al 60 % del color del
  texto. En el tema claro eso da **3,6:1**, por debajo del mínimo AA de 4,5:1.
- El código tenía **más de 240 grises sueltos** (`text-base-content/70`, `/60`, `/80`, `/40`,
  `opacity-55`, `opacity-60`), y cada pantalla resolvía el gris a su manera.

Ahora hay cuatro tokens, una sola corrección de daisyUI y una regla de lint que impide volver atrás.

## Los cuatro tokens

| Utilidad | Variable | Mezcla | Cuándo usarla |
|---|---|---|---|
| `text-app-strong` | `--app-text-strong` | 100 % | Títulos, valores de dato, encabezados de tabla |
| `text-app-label` | `--app-text-label` | 100 %, peso 600 | Etiquetas de campos y rótulos de filtros |
| `text-app-muted` | `--app-text-muted` | 78 % | Ayudas y pistas bajo los campos, textos secundarios, metadatos de tarjetas, contadores, estados vacíos («Sin …», «—»), filas inactivas |
| `text-app-disabled` | `--app-text-disabled` | 50 % | **Solo** controles deshabilitados |

- Los tokens viven en `src/styles/foundation/design-tokens.css`. Se derivan de
  `--color-base-content`, así que siguen al tema sin repetir colores (regla 2: los colores de
  daisyUI no se tocan).
- Las utilidades se declaran con `@utility` en `src/styles/ui/tipografia.css`. Funcionan con
  variantes (`hover:text-app-strong`, `md:text-app-muted`).
- Para el texto principal de un párrafo no hace falta ninguna: hereda `base-content`.

### Contraste medido

Texto `#26365f` (claro) y `#edf4ff` (oscuro) mezclado con el fondo, fórmula de luminancia
relativa de WCAG 2.x.

| Token | Claro `#ffffff` | Claro `#f1f3f6` | Oscuro `#0d1630` | Oscuro `#121f40` |
|---|---|---|---|---|
| strong / label | 11,83 : 1 | 10,64 : 1 | 16,16 : 1 | 14,65 : 1 |
| muted | 6,05 : 1 | 5,66 : 1 | 10,11 : 1 | 9,35 : 1 |
| disabled | 2,80 : 1 | 2,71 : 1 | 4,83 : 1 | 4,65 : 1 |

`disabled` es el único por debajo de 4,5:1 en claro. WCAG exime a los controles inactivos
(criterio 1.4.3), y por eso **no** se usa para texto que haya que leer: un motivo de
«no elegible», una fila inactiva o un estado vacío van en `text-app-muted`.

## La corrección de daisyUI

Vive en `src/styles/ui/tipografia.plugin.js` y se aplica una sola vez para toda la aplicación:

| Selector | Color | Tamaño y peso |
|---|---|---|
| `.label`, `.label-text`, `.fieldset-legend` | `--app-text-label` | 14 px, 600 |
| `.label-text-alt` | `--app-text-muted` | 12 px, 400 |
| `.table thead th`, `.table thead td`, `.app-data-table thead th` | `--app-text-strong` | 600 |

**Por qué un plugin y no una regla en la hoja.** daisyUI 5 emite estos componentes dentro de la
capa `utilities`, antes de las utilidades de Tailwind. La corrección tiene que quedar justo ahí:
después de daisyUI, para ganarle, y antes de `text-error`, para que el error de un campo
(`label-text-alt text-error`) siga en rojo. Una regla en la hoja cae al final de la capa —o fuera
de ella— y le ganaría a `text-error`. `addComponents` la deja en su sitio. Está comprobado sobre el
CSS compilado.

Dos consecuencias al escribir marcado:

- **El asterisco de requerido y el error del campo** llevan su propio `text-error` y se ven en rojo.
- **No añadas `font-medium` a una etiqueta.** El peso de las etiquetas es 600 para todas. Un rótulo
  pequeño en mayúsculas (el de «Fecha del cuadro», por ejemplo) no usa `label-text`: usa
  `text-app-label text-xs uppercase tracking-[0.12em]`.

## Lo que el lint prohíbe

`eslint.config.js` marca como **error**, en cualquier literal o plantilla de `src/**/*.{ts,tsx}`:

| Patrón | Qué usar en su lugar |
|---|---|
| `text-base-content/NN` | La utilidad del rol: casi siempre `text-app-muted` |
| `opacity-NN` (salvo `opacity-0` y `opacity-100`) | `text-app-muted` para texto secundario o filas inactivas; `text-app-disabled` para un control deshabilitado |
| `text-gray-*`, `text-slate-*` | Ninguno de los dos: rompen el tema oscuro |

- `opacity-0` y `opacity-100` se permiten porque son **transiciones** (el cajón del menú), no texto.
- La regla es `no-restricted-syntax` de ESLint, sin dependencias nuevas.
- Las hojas de `src/styles` no las recorre: allí la opacidad de una animación o de un icono
  decorativo es legítima. Para el **texto** de una hoja, use las variables `--app-text-*`.
- Si una prueba necesita comprobar la **ausencia** de una de esas clases, escriba el patrón como
  expresión regular (`/opacity-[0-9]/`), no como cadena: el lint revisa cadenas y plantillas.

## Cuerpo de tablas, acciones y descripciones

Ampliación del 2026-10-08. Todo vive en **sitios compartidos**: `ui/tipografia.plugin.js`,
`ui/page-header.css` y `foundation/design-tokens.css`. Ninguna pantalla lleva un caso propio.

| Elemento | Regla | Dónde |
|---|---|---|
| Texto de celda (`.table`, `.app-data-table`) | `--app-text-strong`, 13 px, aunque la tabla sea `table-sm`/`table-xs` | plugin, envuelta en `:where()` |
| Subtexto de celda (cargo, «Usuario · fecha»…) | `text-xs text-app-muted` en el marcado, 12 px: la celda le cede | marcado |
| Códigos en monospace (cédula, identificador, usuario de Auth) | Texto de celda, sin `text-xs`: pleno a 13 px | marcado |
| Rótulos pequeños en mayúsculas (filas de `thead`, «FECHA DEL CUADRO») | `text-app-label` | marcado |
| Acción de fila (`.btn-ghost` dentro de `tbody td`) | 13 px, 600, `--app-text-accion`, 32 px de alto por `--size` | plugin |
| Desactivar / Retirar (`text-error`) y Activar (`text-success`) en fila | `--app-text-peligro` / `--app-text-exito` | plugin, especificidad 0,3,0 |
| Botón deshabilitado, **en toda la aplicación** | `--app-text-disabled`, fondo `base-200`, borde de `base-content` al 22 % | plugin |
| Distintivo `badge-success` / `badge-warning` / `badge-error` | Relleno del color al 18 %, borde del color, texto al 40 % con `base-content` | plugin |
| Subtítulo bajo el H1 (`.page-heading-subtitle`) | `--app-text-muted`, 14 px. **Sin reglas por tema** | `page-header.css` |
| Ayuda bajo el encabezado de un panel y nota al pie de su tabla | `<p class="text-xs text-app-muted">` hijo directo de `.app-data-panel-body` sube a 13 px | plugin |

### Especificidad: por qué unas ceden y otras ganan

daisyUI, el plugin y las utilidades de Tailwind salen en **la misma capa** (`utilities`), y
Tailwind **intercala** las reglas del plugin con las utilidades. Así que el orden no basta: decide la
especificidad.

- **Ceden** ante una utilidad puesta en el elemento: la celda (`:where(...) tbody td`, 0,0,2) y la
  acción de fila (0,1,0, con las utilidades de color detrás).
- **Ganan a propósito**, y lo dice el comentario de cada una: la acción de peligro o de éxito (0,3,0,
  para cambiar `text-error` por su versión legible), la ayuda del panel (0,2,1, para pasar de
  `text-xs` a 13 px) y el deshabilitado (0,2,0 / 0,3,0, las mismas de daisyUI y después de él).
- Sin `!important` en ninguna.

### Contraste medido (WCAG 2.x)

Los tokens de acción se **derivan** de los colores del tema (regla 2: no se tocan): el color puro no
llegaba. `primary` da 4,29:1 sobre la fila rayada clara y 3,40:1 en oscuro; `error` en oscuro,
3,92:1; `success` en claro, 1,84:1.

| Token | Claro | #ffffff | #f1f3f6 | Oscuro | #0d1630 | #121f40 |
|---|---|---|---|---|---|---|
| `--app-text-accion` | primary 60 % + secondary | 6,76 | 6,08 | primary 60 % + blanco | 7,42 | 6,73 |
| `--app-text-peligro` | error | 5,62 | 5,06 | error 70 % + blanco | 6,27 | 5,69 |
| `--app-text-exito` | success 30 % + success-content | 6,52 | 5,87 | success | 9,72 | 8,81 |

Con el paso del cursor (`hover:bg-primary/5`) siguen por encima: acción 6,34 / 7,08; peligro
4,76 claro / 5,44 oscuro.

| Distintivo | Antes | Ahora claro | Ahora oscuro |
|---|---|---|---|
| `badge-success` | 9,6:1 sólido (texto oscuro sobre verde) — se volvió tenue por coherencia, no por contraste | 4,64 | 9,15 |
| `badge-warning` | 2,45:1 (blanco sobre naranja) | 5,42 | 8,87 |
| `badge-error` | 4,14:1 en oscuro | 7,69 | 7,93 |
| `badge-ghost` (código, fecha, semana, «N operativos») | sin cambio | 10,64 | 14,65 |

### Etiqueta de carga (2026-10-08)

«Carga baja / media / alta» se pinta **solo** con `components/common/EtiquetaCarga.tsx`: misma
estructura (`badge badge-sm whitespace-nowrap`) y solo cambia la variante (`VARIANTE_CARGA`:
`badge-success` / `badge-warning` / `badge-error`), con el relleno tenue de arriba para las tres. Los
puntos del botón «Ver reparto de carga» y la barra del reparto usan `TONO_CARGA` (el color de la
variante, el mismo del borde). «Sugerido» sigue en `badge-primary` sólido, para que no se lea como
un nivel de carga.

El deshabilitado se queda en 2,7–2,8:1 en claro (exento por WCAG 1.4.3, igual que
`text-app-disabled`); lo que se garantiza es que **se vea que hay un botón**: fondo y borde.

La prueba `styles/tipografia.spec.tsx` **recalcula** estos contrastes a partir de `index.css` y
`design-tokens.css`: si alguien cambia una mezcla y baja de 4,5:1, cae.

## Qué no se toca

- **Iconos decorativos, separadores y animaciones**: su opacidad es de diseño, no de lectura.
- **Los colores de marca** (`text-primary`, `text-error`, `text-warning`…): no son grises y tienen
  su propio contraste medido en `FASE5` §10.2. La excepción son las acciones de fila y los
  distintivos de aviso y error, que usan su versión derivada (sección anterior).
- **Los colores del banner de cada formulario**: los entrega el servidor (regla 3 de `CLAUDE.md`).
