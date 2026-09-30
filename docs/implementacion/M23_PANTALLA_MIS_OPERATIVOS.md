# M-23 · Pantalla P-02 · Mis operativos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P1 · Alta** · Dependencia M-22
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. LA PANTALLA DONDE SE CORRIGE

P-01 sirve para registrar deprisa. P-02 sirve para lo que viene después: comprobar lo que quedó
escrito, corregir la hora que se digitó mal y quitar el operativo que se suspendió.

> **DEJÓ DE SER EXCLUSIVA EL 2026-09-01, y conviene decir qué no cambia.**
>
> Desde esa fecha P-01 ofrece **editar y eliminar sobre la tabla «Registrados en esta sesión»**:
> quien acaba de teclear mal una hora la corrige ahí mismo, sin cambiar de pantalla. El wireframe
> de `FASE5` §4.1 ya lo dibujaba —`[✎] [🗑]`— desde el diseño; nunca se construyó ni se desmintió.
>
> **Lo que P-01 no hace, y P-02 sí:** solo alcanza lo que se registró **en esa sesión del
> navegador**. Cerrar la pestaña vacía esa lista —es memoria, no una consulta—, y con ella
> desaparece el camino de corrección. P-02 sigue siendo la pantalla que **consulta la jornada
> entera**, filtra, pagina, y desde la que se corrige lo de ayer, lo de otro turno y lo que
> registró un compañero del mismo departamento.
>
> Sigue siendo también la única con «Adicional»: P-01 no encadena adicionales.

Es también la pantalla que **delimita lo que cada departamento ve**. No por lo que muestra, sino por
lo que no: la Matriz Consolidada es exclusiva de la Dirección, y aquí se dice con todas sus letras
en lugar de dejar que quien la busca suponga una avería.

---

## 1. ARCHIVOS

Cuatro nuevos, dos de prueba y cinco modificados.

```
src/
├── pages/
│   └── MisOperativosPage.tsx                        (nuevo)
├── components/cuadro/
│   ├── PanelEdicionOperativo.tsx                    (nuevo)
│   ├── TablaOperativos.tsx      (modificado: columnas, filtros, acciones, vacío)
│   ├── FormularioOperativo.tsx  (modificado: valores iniciales y acción)
│   ├── SelectorZonalPunto.tsx   (modificado: toma OPCION_ADICIONALES de la utilidad)
│   └── misOperativos.spec.tsx                       12 pruebas
├── utils/
│   ├── listadoOperativos.util.ts                    (nuevo)
│   ├── valoresOperativo.util.ts                     (nuevo)
│   └── listadoOperativos.spec.ts                    14 pruebas
├── config/routes.tsx            (modificado: la ruta real sustituye al marcador)
└── pages/CuadroRegistroPage.tsx (modificado: nuevo origen de los mismos símbolos)
```

**Sin dependencias nuevas.** Todo se apoya en lo instalado.

---

## 2. LA CORRECCIÓN QUE DEBO A M-22

Al cerrar M-22 escribí que `Table` era lo correcto para esta pantalla. **No lo es**, y conviene
decir por qué antes de nada, porque la decisión gobierna medio módulo.

Al implementar contra el contrato real aparecieron tres desajustes:

1. **`Table` filtra y pagina contra el servidor** (`manualFiltering`, `manualPagination`), y
   `GET /operativos` **solo admite `fecha` y `formulario`**. Los demás filtros de columna viajarían
   y se ignorarían: una fila de filtros que no filtra es peor que no tenerla, porque quien la usa
   concluye que no hay resultados.
2. **Sus acciones por fila abren modales del registro `ModalType`**, y el diseño dice justo lo
   contrario para el retiro: `ModalConfirmacion` se emplea directamente, «tal como existe, sin
   modificaciones» (FASE5 §4.6, y el comentario de `interfaces/Modal.ts`).
3. **Trae dos botones fijos de exportación a CSV y PDF que no hacen nada.** Sacar el cuadro a un
   archivo no lo ha pedido nadie en esta pantalla, y en un sistema que nació de una filtración por
   WhatsApp no es un detalle que se deje pasar por venir de serie.

El plan, releído, ya decía lo mismo: su lista de componentes para M-23 nombra **`TablaOperativos`
(reutilizado)**, `CeldaAlerta` y `ModalConfirmacion`. No nombra `Table`.

`Table` sigue siendo lo correcto donde la consulta la resuelva de verdad el servidor —P-07, con
cincuenta y dos funcionarios y filtros propios—, y **allí sí habrá que memoizar `findRecordsFn`**.
La advertencia del plan no desaparece: se traslada a M-27.

> **Consecuencia sobre P-02 del `MODULE_REVIEW`.** Propuse corregir la advertencia de lint de
> `FilterByColumn` en este módulo «que sí usa `Table`». Como no lo usa, la premisa cayó: tocar un
> componente que M-23 no monta sería trabajo fuera del módulo. Queda para el primero que use
> `Table`. Es la única advertencia de lint del repositorio.

---

## 3. UNA TABLA, DOS PANTALLAS

`TablaOperativos` la comparten ahora P-01 y P-02, que miran lo mismo con distinto propósito: una
como resultado inmediato de lo que se acaba de registrar, otra como listado de la jornada.

Las diferencias viajan **como propiedades opcionales cuyo valor por defecto es lo que P-01 ya
hacía**: `columnas`, `filtros` + `onFiltroChange`, `acciones` y `mensajeVacio`. Duplicar el
componente habría sido más cómodo hoy y peor mañana: `CeldaAlerta` es la pieza que traduce el color
a texto (regla 6), y dos copias empiezan a diferir en cuanto se corrige una.

**Las columnas son datos, no marcado.** `COLUMNAS_SESION` y `COLUMNAS_LISTADO` son dos listas, y la
segunda es literalmente la del esquema de FASE5 §4.4. P-01 no lleva columna de estado **porque allí
siempre diría lo mismo**: RN-40 hace nacer nulos conductor y placa, así que un operativo recién
registrado solo puede estar «Pendiente». Una columna constante ocupa ancho y no informa.

---

## 4. SE FILTRA EXACTAMENTE LO QUE SE VE

`valorDeColumna` es la **única** fuente del texto de una celda: la usa la tabla para pintar y el
filtro para comparar. Si fueran dos funciones, bastaría retocar una para que escribir «REDROVÁN»
dejara de encontrar la fila donde el ojo lee «REDROVÁN», y ese desajuste es invisible hasta que
alguien se queja.

De ahí salen tres decisiones pequeñas y consecuentes:

- **Se compara sin tildes ni mayúsculas.** Los nombres del maestro llegan acentuados y quien busca
  escribe deprisa: sin normalizar, «redrovan» no encontraría «REDROVÁN» y el filtro parecería roto.
- **Se filtra por la palabra, no por el código.** El estado se busca escribiendo «asignado», no
  `PROPIOS_MEDIOS`. La prueba lo afirma en los dos sentidos.
- **El conductor no tiene filtro.** Su celda no muestra texto propio sino la alerta de RN-40, y
  filtrar por el texto de una alerta llevaría a buscar «falta» para encontrar los operativos sin
  conductor. Si ese corte hace falta es un filtro de estado, y conviene decidirlo con el Product
  Owner antes de inventarlo.

**El filtrado ocurre en memoria, y no por comodidad**: es que el servidor no ofrece esos filtros. Lo
que se filtra es la jornada del perfil —decenas de filas—, ya recortada por el servidor (PER-02).

> **Si la jornada superara las 200 filas, la pantalla lo dice.** 200 es el máximo de `PaginacionDto`.
> Ningún departamento se acerca, pero mostrar 200 de 340 con aspecto de listado completo sería
> mentir en silencio. Si `meta.total` supera lo recibido, aparece un aviso que pide paginar contra
> el servidor.

---

## 5. EDITAR CON EL MISMO FORMULARIO

El plan pide «las mismas validaciones de P-01 al editar», y la forma de garantizarlo es no tener un
segundo formulario. `FormularioOperativo` acepta ahora `valoresIniciales`, `textoAccion` y
`onCancelar`; sin ellos se comporta exactamente como en M-22.

También dejó de recibir el `Formulario` entero para recibir **solo su código**, que es lo único que
usaba. Con el objeto completo, P-02 habría tenido que fabricar un `Formulario` falso para editar,
cuando lo que tiene es el operativo.

**El personal se guarda al instante; el resto, al pulsar «Guardar cambios».** No es una
inconsistencia, son contratos distintos: `PATCH /operativos/:id` cambia horario, punto, tipo e
instituciones, mientras que el personal entra y sale por `POST` y `DELETE /operativos/:id/personal`
porque **cada asignación tiene su propio veredicto de descanso y puede fallar sola**. Al registrar no
existía todavía el operativo al que colgarlas, así que allí se difieren; aquí existe, y diferirlas
solo serviría para perderlas si alguien cierra la pantalla.

**El panel va arriba, no en un modal.** El formulario ocupa cuatro columnas a 1440 px; dentro de un
modal habría que estrecharlo a una, que es la disposición que el Product Owner descartó por lenta.

**Al abrir la edición se piden los puntos de su zonal.** Sin eso el desplegable nacería vacío y quien
entra a corregir el horario vería desaparecer el punto que ya tenía elegido, sin haberlo tocado.

---

## 6. LOS DOS VACÍOS NO DICEN LO MISMO

| Situación | Qué se lee |
|---|---|
| No hay operativos en la fecha | «No hay operativos registrados en esta fecha. Regístrelos desde *Registro de operativo*» |
| El filtro no encontró nada | «Ningún operativo coincide con el filtro», **con el botón de limpiarlo** |

Es la diferencia entre «no has hecho el trabajo» y «lo has hecho, pero estás mirando mal». Confundir
las dos hace que alguien registre dos veces el mismo operativo.

Y una tercera corrección que no se ve pero se nota: **si el filtro deja menos páginas de las que
había, la página actual se corrige sola**. Sin eso, quien filtra desde la página 3 se queda mirando
una tabla vacía existiendo resultados. Hay una prueba dedicada.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **5 archivos · 73 pruebas** (26 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** |

**El reparto de los fragmentos mejoró solo.** Al haber dos pantallas que comparten `date-fns`, Vite
lo extrajo a un fragmento común: `CuadroRegistroPage` pasó de 177 kB a **5,5 kB**, `MisOperativosPage`
pesa 10,2 kB y lo pesado quedó en un fragmento compartido de 174 kB que se descarga una sola vez.

### 7.1. Los seis casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Listado con perfil DMIP Inspecciones · solo sus formularios | ⏳ el recorte es del servidor (PER-02); **exige backend** |
| 2 | Retirar · confirmación con identificador, punto, horario y formulario | ✅ el texto se afirma carácter a carácter, y con punto adicional |
| 3 | Editar con la ventana cerrada · controles deshabilitados | ✅ los dos botones, con el motivo en el `title` |
| 4 | Filtro sin coincidencias | ✅ mensaje propio y botón de limpiar |
| 5 | Sin operativos | ✅ mensaje propio que remite a P-01 |
| 6 | Estado de transporte · texto además del color | ✅ los tres estados, y el distintivo acompaña a la palabra |

Además, las funciones puras del listado se afirman por separado: **14 pruebas** sobre el texto de
cada columna, el filtrado sin tildes, el filtro acumulado y los bordes de la paginación.

### 7.2. Qué queda pendiente de mirar

- **El caso 1 no se puede verificar sin backend**, y no debería verificarse de otra manera: lo que
  hay que comprobar es que el servidor recorta, no que la pantalla oculta. Una prueba de interfaz
  que pasara filas ajenas y comprobara que no se pintan estaría afirmando justo el diseño que este
  módulo rechaza.
- **El recorrido completo en el navegador** —editar de verdad, retirar de verdad— sigue exigiendo
  jornada abierta y catálogos sembrados: PV-01, PV-25 y PV-26.
- **Maquetación a 375 px y 1440 px.** La tabla va en `overflow-x-auto`, como pide FASE5 §8, pero
  afirmarlo exige abrirlo.

---

## 8. PENDIENTE DE VALIDACIÓN

- **El selector de fecha no estaba en el esquema, y se incluyó.** `GET /operativos` admite `fecha`, y
  sin un control que la mueva ese parámetro estaría muerto y la pantalla solo mostraría hoy. Con
  fecha pasada, el listado se consulta y las acciones se deshabilitan solas por RN-56 y RN-58.
  Conviene confirmar con el Product Owner que consultar días anteriores es deseable.
- **No se envía `formulario` al servidor.** La jornada del perfil se pide entera y el formulario se
  filtra en memoria, junto al resto de columnas. Es el mismo resultado sin un viaje de ida y vuelta,
  pero deja de usarse un parámetro que el contrato ofrece; si algún día un departamento supera las
  200 filas diarias, ese parámetro es parte de la solución.
- **PV-31 sigue abierto** y esta pantalla lo hereda: al editar, `zonalId` toma la primera zonal.
- **PV-01, PV-25 y PV-26** siguen bloqueando el uso con datos reales.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
