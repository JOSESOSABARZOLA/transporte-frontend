# Sistema de interfaz — Cuadro de Colores AMC

Decisiones **medidas contra el código** el 2026-08-21, no propuestas. Sirven para no volver a
auditar desde cero y, sobre todo, para **no aplanar lo que está decidido**.

> **Este archivo no manda sobre la marca.** El color, la tipografía y el estilo los fija el
> manual *Nueva Imagen 2025* de la Alcaldía de Quito, recogido en la skill `diseno-sigoc`. El
> inventario de clases permitidas es `docs/FASE5-diseno-interfaz.md` §2.2, que es la fuente de
> verdad de la regla 1 de `CLAUDE.md` —«no se introducen clases nuevas»—. Aquí solo se anota
> **cómo se aplican**, y por qué.

---

## Dirección

Herramienta operativa institucional, densa, para funcionarios que arman un cuadro contra reloj
antes de las 15H00. **No es un panel de analítica ni un producto de consumo.** Se parece más a
un parte de servicio que a un dashboard: la pantalla existe para que alguien registre un
operativo en dos o tres minutos y para que la Dirección vea de un vistazo qué falta.

La consecuencia práctica: **la información gana siempre al adorno**. Cero color decorativo,
cajas rectas.

> ## ⚠️ Corrección del 2026-08-24 · aquí decía «cero degradados», y era falso
>
> Esa frase se escribió el 21-AGO midiendo **las clases de los `.tsx`**, donde en efecto no hay
> ninguno. Pero las hojas de `src/styles/` tenían **24 degradados**, y uno de ellos vestía la
> cabecera de todos los paneles de las doce pantallas. Auditar una capa y concluir sobre las dos
> es el error, y conviene que quede escrito.
>
> **RECTIFICACIÓN, mismo día.** Aquí se dijo que la cabecera se había aplanado y que eso
> subía su contraste de 4.77:1 a 11.36:1. **Falso, y revertido.** El degradado está
> *declarado* en `panels-theme.css` pero **nunca se pinta**:
> `administration-theme-light.css` —importado después y con más especificidad— ya fija
> `.app-modules-panel > .app-section-header { background: #20347d; background-image: none }`,
> y las **19** cabeceras del proyecto cuelgan de un `app-modules-panel`. Ya era plana, y ya
> daba 11.36:1. El error fue leer la hoja y no el CSS construido; **para juzgar qué se pinta,
> mirar `dist/assets/*.css`, no las fuentes.**
>
> **Lo que sigue siendo cierto:** hay 24 degradados declarados, y son de dos clases:
>
> | Clase | Qué son | Criterio |
> |---|---|---|
> | Velos de baja opacidad | `rgba(114,185,231,.10) → rgba(143,161,255,.08)` y similares | **Se quedan.** El prototipo aprobado por el Product Owner tiene tres degradados y los tres son de esta clase |
> | Fondos de componente entre **dos colores distintos** | barra lateral, ventana de perfil, botones de administración | **Pendientes.** Son la misma deriva, en sitios menos visibles |
>
> **No fue una cuestión de gusto, y esto es lo que lo decide:** el degradado iba de `#20347d` a
> `#1b77bb`, así que el mismo texto blanco tenía **11.36:1 a la izquierda y 4.77:1 a la derecha**
> de la misma cabecera. Con `text-sm` en versalita y `tracking-[0.18em]`, ese extremo estaba al
> filo. En plano, **11.36:1 en todo el ancho**.
>
> Y hay una segunda deriva medida el mismo día, **sin corregir**: las hojas escriben **hex a
> mano** —`#1b77bb`, `#20347d`…— en lugar de las variables del tema, y con ellos **catorce tonos
> que no están en la paleta institucional** (`#166ca7`, `#5a6d99`, `#a51902`…). El manual dice
> «no escribas valores hexadecimales a mano». Hay **373 `!important`** en `src/styles/`, que es
> el síntoma de fondo: esas hojas pelean con daisyUI en vez de configurarlo.

---

## Profundidad — una sola estrategia, con una costura conocida

**Borde de 1 px + sombra baja y difusa.** No hay tintes de superficie ni capas apiladas.

| Nivel | Clase exacta | Dónde |
|---|---|---|
| Barra superior | `shadow-[0_8px_24px_rgba(15,23,42,0.10)]` | `Navbar` |
| Panel de datos | `shadow-[0_12px_32px_rgba(15,23,42,0.12)]` | las 19 páginas y paneles |
| Desplegable | `shadow-[0_20px_45px_rgba(15,23,42,0.20)]` | `SubMenuDropdown` |
| Modal | `shadow-2xl` | los nueve modales |

La escala propia sube 8 → 12 → 20 px de desplazamiento con opacidad creciente, y es coherente.
**La costura: los modales usan el preajuste de Tailwind y se salen de esa escala.** Está
identificado y no corregido; si algún día se unifica, el valor que les corresponde es una
sombra propia por encima de la del desplegable.

Superficies: **un solo tono**, `bg-base-100` sobre `bg-base-200`. La barra lateral comparte
fondo con el lienzo y se separa con borde, no con color.

---

## Radio — uno solo, 6 px

`rounded-md` en los **36** sitios con esquina redondeada. Nada de escala por tamaño: la regla
de marca pide **cajas rectas**, y el 20-AGO los paneles bajaron de 24 px a 6 px para cumplirla.
El 21-AGO se completó en modales, barra superior, barra lateral y tarjetas de orden, que se
habían quedado atrás.

Excepciones legítimas: `rounded-full` (3) en los círculos de icono de los modales de
confirmación y éxito, y `rounded-box` (2) del propio daisyUI.

---

## Texto — dos niveles de color, el resto por peso

| Nivel | Clase | Uso |
|---|---|---|
| Principal | heredado, o `text-base-content` | cuerpo, títulos de modal, color base de contenedores |
| Secundario | `text-base-content/70` (86 usos) | encabezados de tabla, estados vacíos, metadatos, texto de apoyo |

**No hay un tercer nivel de color, y no debe añadirse a la ligera.** Se calculó: al 60 % el
contraste cae a **3.62:1 sobre fondo claro** y no cumple AA. Al 70 % pasa en las cuatro
combinaciones (4.78 · 4.53 claro · 8.34 · 7.79 oscuro). Si hace falta más jerarquía, se saca
**del peso y del tamaño**, no de bajar la opacidad.

> **Ni un gris de Tailwind.** `text-gray-*` salió de la interfaz el 21-AGO: no está en la paleta
> institucional y sobre el tema oscuro daba 3.70:1. Si reaparece, es una regresión.

Pesos en uso: `font-normal` · `font-medium` · `font-semibold` · `font-bold`, y son el
instrumento principal de jerarquía junto al tamaño.

### El cambio de tema no se anima — 26-AGO

`ThemeProvider` marca `<html data-cambiando-tema>`, cambia `data-theme`, **fuerza un
recálculo** y suelta la marca en el fotograma siguiente. Bajo ese atributo,
`design-tokens.css` pone `transition: none !important` a todo.

**Por qué.** Los fondos cambian de golpe —`data-theme` no se anima— mientras que dieciocho
selectores animan `color` durante 180 ms. En ese lapso convive el fondo nuevo con el color
de texto viejo. Medido, muestreando cada 20 ms:

| | claro | t0 | t20 | t40 | t180 |
|---|---|---|---|---|---|
| Botón secundario, **antes** | 11,83 | **1,60** | 5,47 | 11,25 | 17,10 |
| Botón secundario, **ahora** | 11,83 | 17,10 | 17,10 | 17,10 | 17,10 |

> **`void raiz.offsetHeight` no sobra.** Sin esa lectura el navegador junta los tres
> cambios en un solo recálculo, cuando el atributo ya no está, y **anima igual**. Se
> comprobó: la regla estaba en el CSS compilado y el botón seguía cayendo a 1,60.

Las transiciones **no se retiran**, se suspenden: en hover y foco hacen su trabajo.

### El texto sobre el banner se calcula, nunca se fija — 26-AGO

Regla 3 de `CLAUDE.md`. `colorDeTextoSobre()` de `banner.util.ts` elige blanco o negro por
luminancia. Lo usan `BannerFormulario`, `PanelEdicionOperativo` y `PanelAdicionalOperativo`.

**Los dos paneles llevaban `text-white` fijo**, y **los nueve `colorFondo` del Excel son
pastel**: el rótulo era ilegible en los nueve, en los dos temas.

| | peor de los nueve |
|---|---|
| `text-white` fijo | **1,22:1** — formulario 2 · PMO |
| `colorDeTextoSobre()` | **11,28:1** |

> **Ni un `text-white` sobre un color que venga del servidor.** Si reaparece, es una
> regresión. El mismo criterio retiró el `text-white` de `ModalExito`, que pisaba el
> `--color-success-content` que daisyUI ya resuelve y dejaba 1,84:1.

---

## Densidad — dos, y la diferencia está decidida

**No unificar.** Se comprobó el 21-AGO que no es deriva:

| Contexto | Celdas | Cuerpo del panel |
|---|---|---|
| Tablas operativas de 8–11 columnas —operativos, matriz, bandeja de transporte— | `px-2 py-1` | `flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4` |
| Maestros y catálogos —personal, flota, usuarios, roles, directorio— | `px-3 py-1` | igual que el anterior |
| Paneles cuyo cuerpo es un **formulario** | — | `flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6` |

La regla que los separa: **tabla estrecha para que quepan las columnas, formulario ancho para
que respiren los campos.** El estado vacío de cada tabla lleva el `px-` de sus propias celdas.

Base de espaciado: múltiplos de 4 px, vía la escala de Tailwind.

### Ancho de página — 110rem, y diverge de Instrucción a propósito

`.app-page-shell` en `src/styles/ui/page-header.css`. Es el **único** tope de ancho que
actúa sobre el contenido: comprobado sobre las doce pantallas y sobre todo `src/styles/`.

| | |
|---|---|
| Antes del 26-AGO | `max-width: 80rem` — 1280 px |
| Desde el 26-AGO | `max-width: 110rem` — 1760 px |

**El tope solo aprieta por encima de 1824 px de ventana** —eran 1606 px con el valor
anterior—, porque el espacio disponible es la ventana menos la barra lateral (`16.375rem`)
y el relleno del `<main>` (`lg:px-8`). En un monitor de 1920 el `80rem` dejaba **157 px
muertos a cada lado**, y con la barra plegada, 288.

> ⚠️ **DIVERGE DE LA PLANTILLA HEREDADA, Y NO ES DERIVA.** `page-header.css` era **byte a
> byte idéntico** al de `instruccion-frontend` —lo son otras 15 hojas de `src/styles/`— y
> el `80rem` está además en el prototipo aprobado por el Product Owner.
>
> Si algún día se vuelven a alinear las hojas con Instrucción, **esta línea es la que hay
> que conservar**. El comentario del propio CSS lleva la fecha y el motivo.

**Ensanchar no añadió columnas**, y conviene no esperarlo: ninguna rejilla del proyecto
declara `2xl:`, y los puntos de ruptura de Tailwind miden la ventana y no el contenedor. A
1920 ya regía `xl` con cuatro columnas; lo que cambió es que **cada una pasó de ~296 px a
~377 px**.

---

## Controles

| Elemento | Clases | Nota |
|---|---|---|
| Acción principal de panel | `btn btn-primary btn-sm` | 11 usos |
| Acción secundaria | `btn btn-ghost btn-sm` · `btn btn-outline btn-sm` | |
| Acción de fila | `btn btn-ghost btn-xs` | 27 usos, el más frecuente |
| Acción principal de **formulario de página** | `btn btn-primary` (tamaño por omisión) | **Deliberado**: `FormularioOperativo` usa el par entero sin tamaño. Un formulario de página pesa más que un modal |
| Dato calculado | `badge badge-ghost badge-sm` | 38 usos. Regla 5 de `CLAUDE.md`: semana, identificador y fecha **no son campos** |
| Campo editable de la DAF | `badge badge-accent badge-xs` | Regla 9, con el texto «Editable» |

---

## Ventanas modales — `components/common/MarcoModal.tsx`

**Una sola pieza posee el velo, la tarjeta y el comportamiento.** Las nueve ventanas la
componen; ninguna vuelve a escribir el velo a mano.

| Propiedad | Qué hace |
|---|---|
| `etiqueta` | Nombre accesible. **Obligatorio**: antes dos ventanas no lo llevaban |
| `ancho` | `sm` avisos · `lg` formulario corriente · `2xl` formulario ancho. No hay más |
| `deAviso` | Tarjeta centrada y sin desplazamiento, para confirmación y éxito |
| `onCerrar` | Qué hace Escape. **Se omite mientras se guarda**, para no interrumpir una escritura en curso |

Tarjeta: `rounded-md border border-base-300 bg-base-100 p-6 shadow-2xl`. El borde lo tenían
solo las dos de aviso; ahora lo llevan las nueve, que es lo que define el canto sobre el velo
en tema oscuro.

**Lo que la pieza garantiza, y ninguna de las nueve tenía:** cierre con Escape, foco que entra
al abrir, **trampa de foco** —el tabulador da la vuelta dentro—, foco devuelto al cerrar y
bloqueo del desplazamiento de la página de detrás. Sin la trampa, tabular desde el último
campo llevaba a los controles que quedan **bajo el velo**: invisibles, pero enfocables.

> **El clic en el velo no cierra, y es una decisión.** Siete de las nueve son formularios con
> datos capturados, y el proyecto protege lo capturado hasta en el tratamiento del 409. Un clic
> fuera es casi siempre accidental; Escape es deliberado y equivale a «Cancelar». Lo fija una
> prueba, para que no se «complete» por costumbre.

Doce pruebas en `marcoModal.spec.tsx`, con teclado y foco real. Quitar la trampa derriba dos.

---

## Avisos y distintivos — 24-AGO

**El manual prohíbe estos colores como fondos completos, y así los teníamos.** *Nueva Imagen
2025*: «No usar el rojo ni los complementarios como fondos completos. Solo acentos, cajas
pequeñas, textos o barras». Los complementarios son el lila, el verde menta y el naranja —es
decir `info`, `success` y `warning`—, y con el rojo son exactamente los cuatro `alert` y los
cuatro `badge` de estado, que daisyUI pintaba **a sangre**.

Pasan a **relleno tenue + borde del color + texto legible**, en `ui/avisos-y-distintivos.css`.

**Y había un fallo de contraste real:** `--color-warning-content` es blanco sobre `#f48a42`,
**2.45:1**. Lo lleva el aviso de ALV-04 —«sin conductor la jornada no se puede cerrar»— y el
distintivo «Sin ficha: no puede ser convocado». Ahora **5.99:1**.

| | Antes | Ahora |
|---|---|---|
| `alert-warning` | 2.45:1 | **5.99:1** |
| `alert-error` | 5.62:1 a sangre | **6.11:1** en caja |
| `badge-warning` | 2.45:1 | **5.78:1** |

No se inventó nada: **es lo que ya hacía el prototipo aprobado** (líneas 190-228). Al construir
se heredaron las hojas del armazón pero **no las de componente**, y daisyUI ocupó su lugar. Tres
mejoras sobre él, todas medidas: sus dos hexadecimales a mano se derivan ahora con `color-mix`,
y sus dos rojos —4.04:1 en oscuro, 4.78:1 en claro— dejan de estar al filo.

> **No se toca `badge-primary` ni `badge-accent`.** El manual solo prohíbe el rojo y los
> complementarios; los azules institucionales son «fondos principales». Y **no se toca una sola
> propiedad de caja**: `.alert` y `.badge` de daisyUI ya traen borde, así que basta recolorearlo.
> El layout no se mueve.

**Barra de acento, desde el 25-AGO.** Se pidió que los avisos se vieran más, y la misma frase
del manual que prohíbe los fondos completos admite «acentos, cajas pequeñas, textos o
**barras**». El `alert` lleva ahora **4 px de borde izquierdo en el color puro**, y el relleno
sube unos puntos: `info` 16→22 %, `success` 22→30 %, `warning` 15→24 %, `error` 10→16 %.

Los ocho pares se volvieron a medir con el tinte nuevo y **siguen cumpliendo AA**: claro
11.10 · 10.44 · 5.55 · 5.49, oscuro 10.73 · 8.13 · 7.74 · 5.53.

> **Ese es el margen que queda.** El siguiente escalón —relleno a sangre— **no está
> disponible**: es exactamente lo que el manual prohíbe. Si hiciera falta más presencia, sale
> del tamaño y del peso del texto, no de subir más el tinte.

---

## Agrupar en lugar de repetir — P-08, 24-AGO

Un catálogo con **dos coordenadas** no se lista en plano. Los puntos de encuentro tenían una
columna «Zonal» que repetía el mismo nombre en cada fila —34 puntos en 10 zonales, en el
formulario 7— y la respuesta a «¿qué ofrece esta zonal?» exigía leerlas todas.

**Una tarjeta por zonal, el nombre dicho una vez, y sus puntos dentro.** La composición no es
nueva: es la de `TarjetaOrden` en P-06, con `p-3` por ir dentro de un panel, sobre la rejilla
`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3` que esa pantalla estrenó.

Tres cosas que van con el patrón y no son adorno:

1. **Lo que falta se nombra.** Una zonal sin puntos no aparecía por ninguna parte, y es justo
   la que hay que rellenar (PV-01). Va al pie, con palabras, y su botón abre el alta situada
   en ella. Agrupar oculta lo vacío si no se dice.
2. **Nada queda fuera del grupo.** Un punto cuya zonal no esté en el catálogo cae en «Sin
   zonal reconocida». Agrupar por una clave ajena sin caso de escape pierde filas en silencio.
3. **El buscador filtra por las dos coordenadas**, con `normalizar` de `texto.util`. Si lo
   escrito es el nombre de la zonal, se muestra la zonal entera.

El marco compartido —panel, título, recuento, «Agregar»— vive en `PanelCatalogo`, para que
partir la tabla no devuelva el hallazgo D-01.

---

## Datos que se leen como código

El proyecto los monoespacia, y desde el 21-AGO **de forma consistente**:

| Clase | Qué |
|---|---|
| `font-mono text-xs font-semibold` | Identificador de operativo y código de orden |
| `font-mono text-xs` | Cédula, usuario |
| `font-mono font-medium` | Placa, en las tablas de flota |

**Pendiente conocido:** la placa de `TablaMatriz` sigue proporcional. Vive dentro de
`CeldaAlerta`, que detecta la celda vacía comparando `children === ""`; envolverla en un
`<span>` rompería ese aviso textual, que es regla 6. El arreglo correcto es dar `className` a
`CeldaAlerta`.

---

## Accesibilidad — lo que ya está fijado con pruebas

- **La etiqueta nombra al campo.** `CampoEnvoltura` lleva `htmlFor`, el control lleva `id`,
  `aria-required`, `aria-invalid` y `aria-describedby`. Hasta el 21-AGO la etiqueta estaba
  suelta y **ningún campo del sistema tenía nombre accesible**. Lo protegen 12 pruebas en
  `FormikField.spec.tsx` que consultan **solo por etiqueta**: una consulta por marcador de
  posición volvería a pasar con el defecto puesto.
- **El asterisco de obligatorio va `aria-hidden`.** Lo obligatorio viaja en `aria-required`.
- **`role="alert"` es para errores; `role="status"` para lo descriptivo.** Un aviso que aparece
  al cargar o al abrir un modal no interrumpe al lector de pantalla. 37 y 9 usos.
- **Ninguna información depende solo del color.** Es la regla 6, y en un sistema llamado
  *cuadro de colores* exige atención deliberada: toda señal cromática lleva texto equivalente.

---

## Lo que NO hay que «arreglar»

Cada uno de estos se auditó y se dejó como está, con motivo:

1. **Las dos densidades de tabla.** Ver arriba.
2. **El botón sin tamaño de `FormularioOperativo`.** El par completo es coherente.
3. **Los siete `text-base-content` a plena intensidad.** Son títulos de modal y color base de
   contenedores, no un nivel de texto suelto.
4. **`components/tabla/Table.tsx`, `FilterByColumn.tsx` y `RowActions.tsx` son código muerto** —
   cero importadores— mientras `CLAUDE.md` regla 2, la skill `pantallas-cuadro` y FASE5 §2.3
   ordenan reutilizarlos. **Las trece tablas están hechas a mano.** De ahí sale la única
   divergencia de encabezado del sistema: `Table` usa `tracking-[0.16em]` a plena intensidad y
   las trece reales `tracking-wider` al 70 %. **Decisión pendiente del equipo**: adoptarlos o
   retirarlos. Migrar trece tablas cambia el layout.

---

## Antes de dar por hecho

```bash
npm run lint && npm run build && npm test
```

Y el aviso de `react-hooks/exhaustive-deps` en `FilterByColumn.tsx` es **preexistente y de
código muerto**: no es una regresión nueva.
