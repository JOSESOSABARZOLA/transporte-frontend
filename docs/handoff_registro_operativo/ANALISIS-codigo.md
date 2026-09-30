# Análisis del código — SIGOC / Cuadro de Colores

Repositorio leído: **JOSESOSABARZOLA/transporte-frontend@main**, `src/` (205 archivos).
Fecha: 2026-08-26.

Leído a fondo: `CuadroRegistroPage` y todo el árbol de P-01, `SelectorTokens`,
`SelectorPersonal`, `FormularioOperativo`, `CamposCalculados`, `Iconos`, `Boton`,
`horario.util`, `texto.util`, `navigation.ts`, `index.css`, `tipografia.css`.
Las otras once pantallas se revisaron por lo transversal (iconos, accesibilidad, clases),
no campo por campo.

---

## 0. Primero, lo que ya está bien hecho

Esto importa porque **buena parte de mi handoff anterior ya estaba implementada** y proponerla
otra vez habría sido ruido:

- **La rejilla de cuatro columnas ya existe** y el reparto por punto de ruptura está resuelto y
  documentado (`FormularioOperativo.tsx`): horario · zonal · punto · tipo, personal a fila
  completa, instituciones y observaciones a dos columnas cada una.
- **El horario ya es un rango en una sola celda**, con `aria-label` por cada select y **un solo
  renglón de error** para los dos. Es exactamente la decisión correcta y está argumentada.
- **Instituciones ya usa `SelectorTokens`**, con `etiquetaCorta`/`etiquetaLarga` declaradas fuera
  del componente, resumen `+N` abrible y teclado completo (flechas, Enter, Escape, Backspace).
- **El no elegible ya se muestra con su motivo** del servidor, tal cual (PV-37).
- **Los campos calculados ya son distintivos** en `CamposCalculados.tsx`, y el estado lleva texto
  además de color.
- **Montserrat es local** (`public/fuentes/`), coherente con la CSP. El tema de `index.css`
  reproduce la paleta del manual sin desviaciones.

El diagnóstico de «ocupa demasiado alto» y «la lista de personal es incómoda` **no es un problema
de rejilla**: está concentrado en un solo componente, `SelectorPersonal.tsx`.

---

## 1. Defectos con nombre y archivo

### D-1 · `SelectorPersonal` no compara sin tildes — y el proyecto ya tiene la utilidad
**`src/components/cuadro/SelectorPersonal.tsx`**, filtro `visibles`:

```ts
const texto = busqueda.trim().toLowerCase();
… nombreDePersona(persona).toLowerCase().includes(texto)
```

`texto.util.ts` existe precisamente para esto y su cabecera lo dice con el ejemplo exacto:
«sin esto, "redrovan" no encontraría "REDROVÁN" y el filtro parecería roto». `SelectorTokens`
—el hermano, en el mismo formulario— **sí** importa `normalizar`. Aquí no.
Dos controles contiguos con dos comportamientos de búsqueda distintos.

**Además filtra solo por nombre**, aunque cada fila muestra área y cargo, y el placeholder dice
«Buscar por apellido…». El operador no puede escribir «operativos» ni «supervisor».

**Corrección:** importar `normalizar` y buscar sobre `nombre + área + cargo`; placeholder
«Buscar por apellido, unidad o cargo…».

### D-2 · La bandeja de asignados no tiene tope — esta es la causa del alto
Mismo archivo:

```tsx
{agregadas.length > 0 && (
  <div className="flex flex-wrap gap-2">   ← sin max-h, sin resumen
    …<span className="badge badge-primary gap-2">{persona.nombre}{persona.telefono}…
```

Cada distintivo lleva **nombre completo y teléfono**. Con más de 30 asignados —el caso real
declarado— son treinta distintivos anchos que empujan hacia abajo todo lo que sigue, incluido el
botón de registrar. `SelectorTokens` resolvió esto mismo con `TOPE_VISIBLE = 4` y «+N» abrible;
`SelectorPersonal` no tiene equivalente.

**Corrección:** contenedor de alto acotado con desplazamiento propio, o el mismo patrón de resumen
`+N` de `SelectorTokens`. Y **el teléfono fuera del distintivo**: es dato de consulta (RN-34),
no de identificación; su sitio es el `title`, no el ancho de la fila.

### D-3 · La lista de candidatos es una ventana de tres filas para cuarenta personas
`max-h-48` (192 px) **en una sola columna**, con filas de dos a tres renglones porque el motivo
del servidor es una frase larga. Para asignar 30+ efectivos hay que desplazar decenas de veces
dentro de una caja de 192 px.

**Corrección**, y es el corazón del rediseño:
1. Columnas: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` dentro del contenedor desplazable (el
   personal ya ocupa la fila entera, así que el ancho está disponible).
2. Filtro por área en una fila de distintivos, con su conteo.
3. Botón «Asignar visibles (n)».
4. `Enter` en el buscador asigna el primer visible **elegible**. El patrón de teclado ya está
   escrito en `SelectorTokens.alTeclear` — se replica, no se inventa; y con `preventDefault`,
   porque sin él Enter envía el formulario a medio capturar (`SelectorTokens` ya lo advierte).
5. Contador «n asignados» y «quitar todos» en la etiqueta del campo, con `aria-live="polite"`.

### D-4 · El cruce de medianoche está calculado y **no se muestra**
`horario.util.ts` exporta `cruzaMedianoche`, y su cabecera dice que `RangoHorario` es «el archivo
de mayor riesgo del sistema: un defecto en el cruce de medianoche no produce un error visible,
produce un funcionario asignado a dieciséis horas seguidas».

`FormularioOperativo.tsx` importa `duracionEnHoras` y `horasSeleccionables`. **`cruzaMedianoche`
no se usa en ninguna pantalla.** Quien captura `22:00 → 06:00` ve «Duración: 8 h» y ninguna señal
de que el operativo termina al día siguiente.

**Corrección:** añadirlo al texto de duración — «Duración 8 h · termina al día siguiente». Es
información, no error: el cruce se admite y hay prueba que lo protege.

### D-5 · La duración no es un distintivo, y su propia regla 5 lo pide
`<span className="mt-1 text-xs text-base-content/70">Duración: {duracion} h</span>`

Es un campo calculado, igual que la semana y el identificador que `CamposCalculados.tsx` sí pinta
como `badge badge-ghost badge-sm`. Dos tratamientos para la misma clase de dato, en la misma
pantalla.

Y `duracionEnHoras` devuelve decimal: con `08:00 → 15:30` el texto dice **«Duración: 7.5 h»**.
El sistema escribe horarios como `08H00 A 15H30`; «7.5 h» no es de esa familia. Mejor «7 h 30».

### D-6 · `Iconos.tsx`: el defecto de la cabecera de CLAUDE.md sigue vivo, y confirmado
`Navbar.tsx` líneas **123, 132 y 141** piden `nombre="temaClaro"` y `nombre="temaOscuro"`.
`iconoMap` **no tiene ninguno de los dos** → caen en `sinIcono` = `faCircleQuestion`:
**el interruptor de tema pinta un signo de interrogación en tres sitios.**

La causa es de tipos, exactamente como el propio CLAUDE.md anticipa:

```ts
const iconoMap: Record<string, IconDefinition> = { … }   // ← debería ser Record<NombreIcono, …>
type Props = { nombre: string | undefined; … }           // ← debería ser NombreIcono
```

Con `string` y el respaldo `?? iconoMap["sinIcono"]`, **ninguna errata llega al compilador**.

Y hay más en el mismo archivo:
- De los 25 nombres, **20 son residuo del módulo de Instrucción** —`expediente`, `dictamen`,
  `providencia`, `escritos`, `recepcion`, `notificacion`, `acto_inicio`, `apertura`,
  `enviarExpediente`, `enviarParaDictamen`, `revisaradjuntos`, `lineaDeTiempo`, `devolver`,
  `rechazar`…— contra el aviso de la primera página de CLAUDE.md. **Faltan** los del cuadro:
  `retirar`, `adicional`, `matriz`, `buscar`, `quitar`.
- Queda un comentario muerto: `// const nombreIcono = nombre || "sinIcono";` (regla 3: cero código
  sin usar).

### D-7 · Doce entradas del menú con el mismo icono
`navigation.ts`: **12 de 13** ítems usan `icon: "documentacion"` (`faFolderOpen`); solo
`cuadro-matriz` usa `estadisticas`. Su propia regla lo llama por su nombre: «un icono repetido
no informa».

**Recomendación:** quitar `icon` del menú y dejar solo texto. Es lo más coherente con
`diseno-sigoc` («minimalismo, menos elementos») y con la regla «el icono acompaña, nunca
sustituye»: doce carpetas idénticas no acompañan a nada. Si se prefiere conservarlos, cada ítem
necesita el suyo — y entonces son doce iconos nuevos que decidir.

### D-8 · Los botones de solo icono se quedan sin nombre accesible
`Boton.tsx` pasa `title={label}` al `<button>` y `Iconos` no aporta texto. Cuando `texto` viene
vacío, el botón **no tiene nombre accesible**: `title` no es un sustituto fiable y su propia
skill exige «`aria-label` descriptivo en botones de icono».
La regla 13 prohíbe `aria-label` **en el icono** —correcto, FontAwesome ya pone `aria-hidden`—;
el sitio del nombre es el **botón**.

**Corrección:** `aria-label={label}` en el `<button>` cuando no hay `texto`.

### D-9 · `btn-xs` en móvil, contra su propia regla
La `×` de los distintivos usa `btn btn-ghost btn-xs` en `SelectorPersonal` **y** en
`SelectorTokens`. La skill `pantallas-cuadro` dice «se evita `btn-xs` en vistas móviles por el
tamaño de área táctil». Con 30 distintivos, treinta objetivos de ~16 px.

### D-10 · Los errores del formulario no están vinculados al campo
En `FormularioOperativo.tsx` los mensajes se pintan como `label-text-alt text-error`, sin
`role="alert"`, sin `aria-invalid` y sin `aria-describedby`. La skill los declara obligatorios.
El select sí recibe `select-error`, que es señal **solo de color** (regla 6).

### D-11 · Falta el resumen de «qué falta» antes de enviar
El pie es `flex justify-end gap-2` con Cancelar y Registrar. Con siete campos repartidos en
cuatro columnas, el operador que pulsa Registrar tiene que buscar visualmente cuál falló.
Un renglón en `role="status"` a la izquierda del botón —«Falta horario, zonal, punto de
encuentro»— y **foco al primer campo inválido** al fallar el envío.

---

## 2. Un hallazgo de gobierno, no de código

**`docs/` no existe en el repositorio.**

CLAUDE.md §8 cita `docs/FASE5-diseno-interfaz.md`, `docs/IMPLEMENTATION_GUIDE.md`,
`docs/FASE2-documentacion-funcional.md`, `docs/FASE4-arquitectura-tecnica.md` y
`docs/PROTOTIPO-sigoc-cuadro-colores.html`; `navigation.ts` cita FASE5 §3.2; la regla 1 declara
vinculante el **inventario de clases de FASE5 §2.2**, y la skill `pantallas-cuadro` remite a
§8 y §10.3.

Nada de eso está en el árbol. Lo que hay es `.interface-design/system.md`.

Consecuencia práctica: **la regla 1 no se puede verificar**. Ni yo, ni Claude Code, ni un
desarrollador nuevo puede saber si `sticky bottom-0`, `progress` o `grid-cols-3` están en el
inventario permitido. En la práctica se acaba decidiendo por costumbre, que es lo contrario de lo
que la regla busca.

Dos salidas: subir `docs/` al repositorio, o mover el inventario §2.2 a
`.claude/skills/pantallas-cuadro/SKILL.md`, que sí está versionado y es donde Claude lo va a leer.
**Hasta que eso se resuelva, no introduzcas clases nuevas en P-01** — y por eso el pie de acción
fijo del rediseño queda pendiente, no descartado.

---

## 3. Plan de trabajo, en orden de valor

Cada tanda cierra con `npm test && npm run lint && npm run build`.

**Tanda 1 · `SelectorPersonal` (D-1, D-2, D-3, D-9)** — es el 80 % del problema del usuario y
toca un solo archivo. Sin clases nuevas: `grid`, `max-h-*`, `overflow-y-auto`, `badge` y `btn`
ya se usan en ese mismo componente.
Pruebas nuevas, en la línea de «se prueban decisiones»: que «redrovan» encuentre «REDROVÁN»; que
`Enter` asigne al primer **elegible** y nunca a un no elegible; que «Asignar visibles» no
duplique.

**Tanda 2 · Horario (D-4, D-5)** — usar `cruzaMedianoche`, duración como
`badge badge-ghost badge-sm` y en formato «7 h 30». Una prueba: el cruce informa y no invalida.

**Tanda 3 · `Iconos.tsx` (D-6, D-7, D-8)** — es cirugía de tipos:
1. `export type NombreIcono = "menu" | "subMenu" | "notificaciones" | "temaClaro" | "temaOscuro" | …`
2. `const iconoMap: Record<NombreIcono, IconDefinition>` y `nombre: NombreIcono`.
3. Añadir `temaClaro` / `temaOscuro` (p. ej. `faSun` / `faMoon`), y los nombres del cuadro.
4. Borrar los 20 residuos de Instrucción y el comentario muerto.
5. `aria-label` en `Boton` cuando no hay texto.
6. Decidir el menú: sin iconos, o uno por ítem.

El compilador dirá **todos** los sitios que hay que tocar, y ahí está el valor: hoy no dice
ninguno. Aviso de CLAUDE.md que sigue en pie: tocarlo mueve la barra lateral y el panel de perfil,
así que va en su propio commit y se mira en las doce pantallas.

**Tanda 4 · Accesibilidad del formulario (D-10, D-11)** — `aria-invalid`,
`aria-describedby`, `role="alert"`, resumen de faltantes en `role="status"` y foco al primer
campo inválido.

**Tanda 5 · Gobierno** — resolver dónde vive el inventario §2.2 y, con eso decidido, el pie de
acción fijo.

---

## 4. Lo que no revisé
Las otras once pantallas campo por campo, los servicios, y el uso de `Table` contra el servidor
en cada listado. Si quieres ese pase, el orden que propondría por volumen y riesgo es
`MisOperativosPage` (37 KB), `OrdenesServicioPage` (29 KB) y `AdminPersonalPage` (25 KB).
