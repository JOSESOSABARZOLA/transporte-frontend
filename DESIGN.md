---
name: Cuadro de Colores Operativo
description: Herramienta operativa institucional de la AMC — densa, sobria, contra reloj.
colors:
  primary: "#1b77bb"
  secondary: "#20347d"
  accent: "#3744d0"
  neutral: "#72b9e7"
  success: "#6ed0bd"
  info: "#8fa1ff"
  warning: "#f48a42"
  error: "#cb1f03"
  base-100: "#ffffff"
  base-200: "#f1f3f6"
  base-300: "#d6deef"
  base-content: "#26365f"
typography:
  display:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.34rem + 0.55vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.16em"
  body:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  dato:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  md: "0.375rem"
  fila: "0.28rem"
  none: "0"
spacing:
  celda-y: "0.4724rem"
  panel-x: "1.5rem"
  panel-y: "1rem"
  pagina: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.base-100}"
    rounded: "{rounded.md}"
    padding: "0 0.9rem"
    height: "2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.base-content}"
    rounded: "{rounded.md}"
    padding: "0 0.9rem"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.base-content}"
    rounded: "{rounded.md}"
    padding: "0 0.9rem"
    height: "2rem"
  input:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
    rounded: "{rounded.md}"
    height: "2rem"
  badge-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.base-100}"
    rounded: "{rounded.md}"
    padding: "0 0.5rem"
---

# Design System: Cuadro de Colores Operativo

## Overview

**Creative North Star: "El parte de servicio"**

Este sistema no es un panel de analítica ni un producto de consumo: es un **parte de
servicio** — el documento operativo que un funcionario llena decenas de veces al día,
contra una ventana que cierra a hora fija. Todo lo visual se subordina a esa escena: la
información gana siempre al adorno, la densidad es una virtud, y la repetición manda
sobre la primera impresión. La marca vive en la precisión de los detalles —el peso
exacto, el anillo de foco, el motivo escrito junto a lo deshabilitado—, no en gestos
expresivos.

La identidad cromática pertenece a la Alcaldía de Quito (manual *Nueva Imagen 2025*):
azul marino de Estado como estructura, azul institucional como acción, y una regla de
hierro sobre los colores intensos. Los nueve colores de los formularios **son datos del
negocio entregados por el servidor**, no decisiones de esta capa: el sistema visual
existe para sostenerlos legiblemente, no para competir con ellos.

Los controles son **sobrios y precisos** (confirmado 2026-09-03): responden sin llamar la
atención — 140 ms de transición, 1 px de hundimiento al pulsar, jerarquía que se lee sin
leer el texto. Rechazos confirmados: color decorativo, formas orgánicas, degradados como
recurso expresivo, y cualquier información que dependa solo del color.

**Key Characteristics:**
- Denso e institucional: optimizado para el operador que repite, no para el visitante.
- Cajas rectas, un solo radio (0.375rem), bordes de 1 px que sí se ven.
- Dos temas completos (claro y oscuro) con contraste **medido**, nunca estimado.
- Toda señal cromática lleva equivalente textual — en un sistema llamado *cuadro de colores*.
- El peso máximo real es 600: la negrita se construye con tamaño, espaciado y contraste.

## Colors

Paleta institucional de la Alcaldía de Quito: azules como estructura, complementarios
solo como acentos. El tema vive en `src/index.css` y **no se modifica sin autorización**.

### Primary
- **Azul institucional** (#1b77bb): la acción. Botones primarios, encabezados de sección,
  enlaces activos. Es el color que dice «esto se puede hacer».
- **Azul-violeta de acción** (#3744d0, `accent`): la acción destacada y el **anillo de
  foco en tema claro** (7,24:1 sobre blanco). El manual lo señala como primario de
  acción; el tema lo asigna a `accent` — punto abierto de la Dirección, se usa como está.

### Secondary
- **Azul marino de Estado** (#20347d): fondos principales, barra lateral, cabecera
  institucional de los modales, y el **velo de modal** (compuesto al 62 % con
  transparencia). Es la estructura, nunca la acción.

### Tertiary
- **Celeste institucional** (#72b9e7, `neutral`): acentos suaves, fila activa de la barra
  lateral, y el **anillo de foco en tema oscuro** (8,35:1 sobre #0d1630 — el violeta ahí
  se queda en 2,47:1 y no se usa).

### Neutral
- **Papel** (#ffffff / oscuro #0d1630): superficie de panel.
- **Fondo de aplicación** (#f1f3f6 / #121f40): el gris azulado sobre el que flotan los paneles.
- **Borde y separador** (#d6deef / #233766): base de todo trazo de 1 px.
- **Tinta** (#26365f / #edf4ff): texto. Los matices se derivan con `color-mix`, nunca con
  un hex nuevo a mano.

### Semánticos
Éxito #6ed0bd · Info #8fa1ff · Advertencia #f48a42 · Error #cb1f03 (oscuro: #ea3446).
En avisos y distintivos van **con relleno tenue y borde del color**, jamás a sangre.

### Named Rules
**La regla del rojo.** El rojo y los complementarios nunca son fondos completos: solo
acentos, bordes, textos o barras. `alert-warning` a sangre daba 2,45:1 y por eso existe.

**La regla del banner.** Los nueve colores de formulario los entrega el backend y se
aplican con `style` en línea; el texto encima se elige entre blanco y negro **por
luminancia** (`banner.util.ts`). Es el único hexadecimal admitido en el código, y no lo
define el frontend.

**La regla del color-mix.** Un matiz nuevo se compone desde los tokens
(`color-mix(in srgb, var(--color-…) N%, …)`); escribir un hex a mano es romper la marca.

## Typography

**Display/Body Font:** Montserrat (con pila de sistema como respaldo) — la tipografía
oficial del manual, servida **localmente** (`public/fuentes/`): la aplicación corre en
intranet y con CDN la marca desaparecería.

**Dato Font:** monoespaciada del sistema — cédulas, placas, identificadores, cuenta atrás.

**Character:** institucional sin rigidez; los rótulos en versalitas con tracking abierto
(0.16–0.18em) hacen el trabajo ceremonial, y el cuerpo se queda pequeño y quieto para que
las tablas respiren.

### Hierarchy
- **Display** (600, clamp 24→28 px, 1.15, −0.015em): título de página. Crece con la
  ventana y se queda en 24 px bajo ~1000 px para no partirse en tres líneas.
- **Title** (600, 14 px, tracking 0.16em, MAYÚSCULAS): encabezado de sección
  (`app-section-heading`) y antetítulo de página (kicker, tracking 0.18em).
- **Body** (400, 14 px, 1.5): texto corriente y celdas. `text-xs` (12 px) para
  encabezados de tabla y metadatos.
- **Label** (600, 12 px, 0.08em): encabezados de tabla en versalitas, distintivos.
- **Dato** (mono, 12 px, 600): identidad y códigos — cédula, placa, identificador de
  operativo. Siempre mono para que se comparen en columna.

### Named Rules
**La regla del 600.** Montserrat se declara `font-weight: 400 600`: pedir 700
(`font-bold`) produce **negrita sintética** de trazo sucio. Los títulos se marcan con 600
real más tamaño, tracking y contraste. (Única excepción legítima: texto en `font-mono`,
cuya pila de sistema sí trae 700 real.)

**La regla de la versalita.** Lo que rotula va en MAYÚSCULAS con tracking abierto; lo que
se lee corrido, nunca. Un párrafo en versalitas es un error, no un énfasis.

## Layout

Armazón de **altura fija**: `app-shell-frame` mide 100dvh y clipa; **lo único que se
desplaza es `<main>`** (`body:has(.app-shell-frame){overflow:hidden}` garantiza una sola
barra). Barra lateral de 16.375rem en azul marino, colapsable; barra superior de 4rem.

El contenido vive en `app-page-shell`: rejilla de una columna, `gap` 1.5rem, **tope de
110rem** (1760 px) centrado — cubre un monitor de 1920 y pone medida de lectura en uno
ultraancho. La verificación de diseño se hace a **1440 px**.

Densidad: las celdas de tabla usan `--app-table-row-padding-y: 0.4724rem` — la densidad
de fila **es maqueta** y no se retoca por estética. Paneles con cabecera `px-6 py-4` y
cuerpo `px-2 pb-4 pt-2 md:px-4`. Tarjetas en rejilla 1/2/3 columnas
(`md:grid-cols-2 xl:grid-cols-3`). Bajo 768 px las acciones de cabecera pasan de la
derecha a apiladas; todo contenido ancho hace scroll en su propio `overflow-x-auto`,
nunca el cuerpo de la página.

## Elevation & Depth

**La sombra es atmósfera, no jerarquía** (confirmado 2026-09-03). Su único trabajo es
separar el panel del fondo texturado institucional; la importancia jamás se comunica con
elevación. Superficies planas de marca —cajas rectas— con sombras amplias, suaves y
teñidas del azul marino, nunca negras.

### Shadow Vocabulary
- **Superficie** (`0 18px 42px rgba(32,52,125,0.11)`): paneles en reposo.
- **Panel de datos** (`0 24px 50px rgba(32,52,125,0.15)`): el panel principal de cada pantalla.
- **Desplegable y modal** (`0 26px 56px rgba(32,52,125,0.18)`): lo que flota sobre la página.
- **Control** (`0 1px 2px` al 12 % → hover `0 3px 8px` al 18 %): botones de color; la
  sombra aparece al apuntar y desaparece al pulsar.
- En tema oscuro todas se recomponen sobre `rgb(2 8 24)` — una sombra negra genérica no
  se ve sobre azul marino.

### Named Rules
**La regla del hundimiento.** Al pulsar, el control baja 1 px y pierde la sombra. Es la
única «elevación» narrativa admitida, y dura lo que dura el clic.

## Shapes

Cajas rectas por manual: **un solo radio de trabajo, 0.375rem** (`rounded-md`), en
paneles, tarjetas, botones, campos y modales. Radios menores en la barra lateral (fila
0.28rem, acento activo 0.12–0.14rem). `rounded-full` solo en avatar y puntos de estado.
Bordes de **1 px siempre visibles** — el borde por omisión de daisyUI era demasiado tenue
y se refuerza con `color-mix` hacia la tinta (82 % base-300 + 18 % base-content). Sin
formas orgánicas, sin píldoras en botones, sin esquinas mixtas.

## Components

Carácter transversal: **sobrios y precisos**. Transición única de `140ms
cubic-bezier(0.32, 0.72, 0, 1)` sobre color, borde, sombra y transform — nunca
`transition-all`. Todo se apaga bajo `prefers-reduced-motion`.

### Buttons
- **Shape:** recto (0.375rem), altura 2rem (`btn-sm` es la talla de trabajo), peso 600.
- **Primario** (`btn btn-primary btn-sm`): azul institucional, sombra de control que
  crece al hover.
- **Secundario** (`btn btn-outline btn-sm`): contorno afirmado (borde reforzado), se
  colorea al apuntar.
- **Terciario** (`btn btn-ghost btn-sm`): sin caja hasta el hover (relleno primary al
  10 %; en acciones destructivas, error al 10 % con `text-error`).
- **Pulsación:** `translateY(1px)` + sombra fuera. **Deshabilitado:** opacidad 0.55 +
  `cursor: not-allowed` — se lee «no ahora», no «roto», y siempre con su motivo cerca.
- **Foco:** anillo de 2 px con offset 2 px — accent en claro, celeste en oscuro. Solo
  `:focus-visible`.

### Badges / Distintivos
- 600 de peso, tracking 0.02em, `badge-sm`. Campos calculados van en `badge badge-ghost
  badge-sm` — **nunca** un input deshabilitado. Los semánticos con relleno tenue y borde.
  El rótulo del banner lleva el color del servidor y texto por luminancia.

### Cards / Containers
- Panel: `app-modules-panel app-data-panel` — borde 1 px, sombra de superficie, cabecera
  con título en versalitas y línea inferior. Tarjeta interna: mismo radio, `p-3`/`p-4`.

### Inputs / Fields
- Borde visible en reposo, que se acerca al primario al hover; foco = borde accent +
  anillo. **Error:** borde error + fondo error al 4 % — además del mensaje, nunca en vez
  de él. **Deshabilitado/readonly:** fondo base-200 al 70 % — se distingue de un campo
  vacío. Marcador de posición al 58 % de la tinta (3,45:1 medido).
- Para elegir varios de un catálogo: `SelectorTokens`, nunca `<select multiple>`.

### Tables
- Encabezado en franja (base-200 al 60 %) con versalitas 12 px; separador de filas al
  62 % del borde; hover de fila `bg-info/10`; fila seleccionada `bg-primary/5`. Ancho
  siempre dentro de `overflow-x-auto` propio.

### Modals (signature)
- **Marco institucional:** con título, la tarjeta es azul marino con antetítulo en
  versalitas y el contenido embutido en una tarjeta blanca — el patrón que hermana los
  módulos de SIGOC. Velo = azul marino al 62 % (no negro). **Entrada:** aparece subiendo
  8 px en 160 ms; con movimiento reducido, aparece quieta. Escape cierra, el clic en el
  velo **no** (protege lo capturado); trampa de foco y scroll bloqueado.

### Iconos
- FontAwesome `free-solid` únicamente, por `Iconos.tsx` (único importador). Caja
  `app-icono` de 1em centrada al eje óptico. El icono **acompaña, nunca sustituye** al
  texto; sin color ni tamaño propios; el nombre es un tipo (`NombreIcono`), no una cadena.

## Do's and Don'ts

### Do:
- **Do** componer solo con el inventario de `docs/FASE5-diseno-interfaz.md` §2.2 — es la
  fuente de verdad de la regla 1; una clase nueva se decide, no se supone.
- **Do** derivar matices con `color-mix` desde los tokens del tema.
- **Do** medir el contraste de todo color nuevo: 4,5:1 texto, 3:1 indicadores — en los
  **dos** temas.
- **Do** dar a todo control `:focus-visible` con el anillo del sistema (accent claro /
  celeste oscuro).
- **Do** mostrar lo no disponible **apagado y con el motivo en palabras**.
- **Do** poner los datos de identidad (cédula, placa, código) en mono 12 px.

### Don't:
- **Don't** escribir hexadecimales a mano — el único admitido es el color de banner que
  entrega el servidor.
- **Don't** usar `font-bold` (700) en Montserrat: es negrita sintética. Tope 600.
- **Don't** usar el rojo o los complementarios como fondo completo.
- **Don't** comunicar nada solo con color — equivalente textual siempre.
- **Don't** tocar el tema de daisyUI en `src/index.css` ni la densidad de fila
  (`--app-table-row-padding-y`).
- **Don't** usar `transition-all` ni animar el cambio de tema (`[data-cambiando-tema]`
  lo suspende un fotograma, y es deliberado).
- **Don't** poner `text-white` fijo sobre un banner: el texto lo decide la luminancia.
