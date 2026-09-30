# M-22 · Pantalla P-01 · Registro de operativo

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P1 · Alta** · Dependencias M-14, M-15, M-21 y **D-01**
Desbloquea M-23 · Fecha: 2026-08-06

---

## 0. LA PRIMERA PANTALLA REAL

Es donde el sistema deja de ser una API y empieza a ser una herramienta. La meta declarada por el
Product Owner: **registrar un operativo en dos o tres minutos**.

Todo lo que sigue está subordinado a esa cifra — la disposición horizontal, el formulario que se
preselecciona solo, la tabla de resultado debajo, y sobre todo **no descubrir un bloqueo al
guardar**.

---

## 1. ARCHIVOS

Diez archivos nuevos, tres de prueba y dos modificados.

```
src/
├── components/cuadro/                       (nuevo)
│   ├── SelectorFormulario.tsx · CamposCalculados.tsx
│   ├── SelectorZonalPunto.tsx · SelectorPersonal.tsx
│   ├── FormularioOperativo.tsx · TablaOperativos.tsx · CeldaAlerta.tsx
│   └── registro.spec.tsx                    13 pruebas
├── pages/
│   └── CuadroRegistroPage.tsx               (nuevo)
├── config/
│   ├── routes.tsx             (modificado: la ruta real sustituye al marcador)
│   ├── validationSchemas.ts   (modificado: + esquemaOperativo)
│   └── validationSchemas.spec.ts            15 pruebas
├── components/forms/
│   ├── FormikField.tsx        (modificado: D-01)
│   └── FormikField.spec.tsx                 19 pruebas
├── pruebas/configuracion.ts                 (nuevo)
└── vitest.config.ts                         (nuevo)
```

**Dependencias instaladas, autorizadas por usted:** `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Todas de desarrollo: **no pesan
en el paquete de producción**. `npm test` y `npm run test:watch` quedan disponibles.

---

## 2. D-01 · LA REFACTORIZACIÓN, CON SU RED

`FormikField.tsx` tenía **seis componentes casi idénticos** —texto, número, correo, teléfono, fecha
y área de texto—: la misma etiqueta, el mismo asterisco, la misma lectura de `touched`/`errors` y el
mismo pie de error, copiados uno tras otro. Cambiar cómo se muestra un error exigía tocar seis
sitios y acertar en los seis.

Ahora hay **una envoltura** —`CampoEnvoltura`— y **un campo de texto parametrizado por su `type`**.
Los seis nombres exportados se conservan: son el contrato que heredarán las nueve pantallas.

Dos componentes **no** se unificaron, y conviene decir por qué:

- **`DateInput` convierte.** Acepta un `Date` y devuelve un `Date`, mientras el control nativo
  trabaja con texto. Meter esa conversión en el campo genérico obligaría a que los otros cuatro
  supieran de fechas.
- **`CheckboxInput` y `RatioInput` llevan la etiqueta a la derecha**, que es la disposición propia de
  una casilla. Forzarlos dentro de la envoltura produciría una etiqueta duplicada.

**19 pruebas** demuestran que cada componente sigue haciendo lo mismo — que era lo que había que
demostrar, no que el código quedara más corto. Se hizo ahora porque **todavía no tenía consumidores**:
después habrían sido nueve pantallas, y ya no sería una refactorización sino una migración.

---

## 3. NADA SE DESCUBRE AL GUARDAR

Tres cosas pueden impedir la captura, y **cada una se explica antes**, con su propio tono:

| Situación | Aviso |
|---|---|
| No hay jornada abierta | `alert-info`. No es un error: nadie abrió el cuadro del día |
| La ventana de carga venció (RN-56) | `alert-info` **con la hora de cierre**, campos deshabilitados |
| El cuadro está cerrado (RN-58) | `alert-warning`, desde `admiteEscritura` |

Capturar un operativo entero para recibir un `423` al guardar es exactamente lo que devuelve a la
gente al WhatsApp. `useVentanaCarga` **se reevalúa cada minuto**: quien escribe a las 14H59 ve el
bloqueo aparecer sin recargar la página.

Y en el otro sentido: **lo capturado nunca se pierde**. `conservaCaptura` es cierto en todos los
tratos de error, así que un `409` de las reglas de descanso muestra el motivo del servidor y deja el
formulario intacto.

---

## 4. LAS DECISIONES DE INTERFAZ

**El personal no elegible se muestra, deshabilitado y con su motivo.** Es la decisión más importante
de la pantalla. El servidor devuelve a cada persona con su veredicto —«BENAVIDES FERNANDO salió en
patrulla ayer»—, y esconder a los no elegibles convertiría una regla explicada en una desaparición
inexplicable. Quien arma el cuadro necesita saber **por qué** no puede contar con alguien; si no lo
sabe, llama por teléfono.

**El formulario compartido se muestra deshabilitado, no oculto.** En el formulario 6 el DMIT
participa con cupo de personal pero no registra operativos (PER-06). Aparece con el motivo en el
`title` y un distintivo «Solo personal».

> **Revertido el 2026-08-24, por decisión expresa.** Desde entonces el selector pinta **solo** los
> formularios de `acceso: ESCRITURA`; `COMPARTIDO` y `LECTURA` no se muestran. El motivo del cambio
> —una fila de botones apagados se lee como un fallo antes que como una explicación— y lo que se
> pierde con él están en **PV-40**, pendiente de ratificar. Lo de arriba es lo que se construyó en
> M-22 y se conserva como registro de por qué se hizo así entonces.

**Los campos calculados no son campos** (regla 5). Semana, orden de trabajo, fecha y estado son
`badge badge-ghost badge-sm`. Un `input` deshabilitado sugiere que alguien podría habilitarlo, y
además recibe foco: tabular por tres controles intocables es ruido. La prueba lo afirma contando que
**no hay ni un `input` ni un `tabindex`** en ese bloque.

**Ninguna información depende solo del color** (regla 6). `CeldaAlerta` lleva siempre el mensaje del
servidor —en el `title`, y como texto visible cuando la celda está vacía—; el estado del cuadro lleva
color **y** palabra.

---

## 5. LA CASCADA Y `ADICIONALES`

Elegir zonal **pide los puntos al servidor**, no filtra en memoria. RN-17 dice que el punto pertenece
a la zonal y al formulario, y esa correspondencia es la matriz que sigue pendiente de validación
(PV-01): filtrarla en el cliente exigiría tener la matriz completa, que es justo el dato que nadie ha
entregado.

Cambiar de zonal **invalida el punto elegido**: pertenecía a la anterior, y el servidor lo rechazaría
por INV-07.

`ADICIONALES` **no es una fila del catálogo** (INV-08). Es una opción del formulario, habilitada por
`permiteCapturaLibre`, y solo se ofrece donde el insumo aprobado la contempla — los formularios 2 y 8.

---

## 6. POR QUÉ ESTA TABLA NO USA `Table`

El plan advierte que al usar `Table` hay que memoizar `findRecordsFn` con `useCallback`. **Aquí no se
usa**, y por eso la advertencia no aplica todavía.

`Table` resuelve paginación, filtros por columna y acciones por fila contra un `findRecordsFn` que
consulta al servidor. `TablaOperativos` muestra **las filas que se acaban de registrar en esta
sesión**: están en memoria, son pocas y no se paginan. Montarlo pediría la lista al servidor en cada
cambio y pondría una fila de filtros sobre cuatro registros.

`Table` **sí** es lo correcto para P-02 «Mis operativos» (M-23), que consulta y pagina — y ahí sí
habrá que memoizar.

> **Y SIGUE SIENDO LO CORRECTO AUNQUE LA TABLA GANARA ACCIONES EL 2026-09-01.**
>
> Desde esa fecha cada fila ofrece **Editar** y **Eliminar**, para corregir sin cambiar de
> pantalla. Podría parecer que eso la acerca a P-02 y pide `Table`; no es así, y el motivo es el
> mismo de arriba: **siguen siendo las filas de la sesión, en memoria y pocas**. Lo que cambia es
> qué se puede hacer con ellas, no de dónde salen ni cuántas son.
>
> `TablaOperativos` ya admitía `acciones` como propiedad opcional desde M-23: no hizo falta tocar
> el componente, solo pasársela. Que la ausencia de esa propiedad fuera «lo que P-01 hacía» estaba
> escrito en `PLAN_DE_IMPLEMENTACION.md` §1801, y por eso el cambio cupo en la página.
>
> **La lista se empalma, no se recarga.** `PATCH` devuelve el operativo con su `version` nueva y se
> sustituye la fila; volver a consultar sería pedir al servidor lo que ya está en la mano, y dejar
> la fila vieja haría que el siguiente guardado mandara una versión caduca y recibiera un `409`.

> **Corrección posterior (2026-08-06, al implementar M-23).** El último párrafo era incorrecto: P-02
> **tampoco** usa `Table`. Filtrar con él exige que el servidor acepte esos filtros, y
> `GET /operativos` solo admite `fecha` y `formulario`; además sus acciones por fila abren modales
> del registro `ModalType`, cuando FASE5 §4.6 pide `ModalConfirmacion` directo. En su lugar,
> `TablaOperativos` pasó a servir a las dos pantallas mediante propiedades opcionales —tal como la
> lista de componentes del plan para M-23 ya decía: «`TablaOperativos` (reutilizado)»—. La
> memoización de `findRecordsFn` se traslada a **M-27**. Detalle en
> `M23_PANTALLA_MIS_OPERATIVOS.md` §2.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **3 archivos · 47 pruebas** |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · `CuadroRegistroPage` en su propio fragmento (177 kB) |

El fragmento separado confirma que la carga diferida de M-21 funciona: quien entra como DAF o
Director **no descarga esta pantalla**.

### 7.1. Los doce casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.** La
distinción se mantiene aunque incomode: un caso «implementado» no es un caso verificado.

| # | Caso | Estado |
|---|---|---|
| 1 | Perfil DMIP Operativos · el selector ofrece los suyos | ✅ propios habilitados, compartidos deshabilitados con su motivo |
| 2 | Elegir formulario · catálogos y barra de color | ⏳ la barra toma `colorFondo` del servidor; exige backend con catálogos |
| 3 | Elegir zonal · se piden sus puntos | ✅ la cascada avisa para que se consulten (RN-17) |
| 4 | Sin zonal · el punto invita a elegirla | ✅ desplegable deshabilitado y texto explicativo |
| 5 | `ADICIONALES` · aparece el texto libre | ✅ y solo donde `permiteCapturaLibre` |
| 6 | Horario nocturno con condicionante | ⏳ aviso presente en `CuadroRegistroPage`; sin prueba |
| 7 | Persona no elegible | ✅ motivo visible, botón deshabilitado, **captura conservada** |
| 8 | Registro correcto | ⏳ `ModalExito` + fila añadida + `resetForm` que conserva el formulario; exige backend |
| 9 | Ventana cerrada | ⏳ aviso con la hora y `bloqueado` propagado a todos los controles |
| 10 | Anchura 1440 px · cuatro columnas | ⏳ rejilla `xl:grid-cols-4`; **comprobación visual** |
| 11 | Anchura 375 px · apilado | ⏳ rejilla `grid-cols-1`; **comprobación visual** |
| 12 | Campos calculados fuera del tabulador | ✅ sin `input`, sin `select`, sin `tabindex` |

Además, el esquema de validación se afirma por separado: **VAL-01 a VAL-11 en quince pruebas**,
incluidas las dos que importan de verdad —que **22H00 a 02H00 se admite** (el cruce de medianoche no
es un error) y que **las reglas de descanso no están en el esquema**, porque dependen de datos que
el navegador no posee.

### 7.2. Qué queda pendiente de mirar

Los casos 10 y 11 son **maquetación en anchuras concretas**. Las clases están puestas y son las
inventariadas en FASE5 §2.2, pero afirmar «cuatro columnas sin desplazamiento a 1440 px» exige
abrirlo. Se declara pendiente en lugar de darlo por bueno.

Los casos 2, 6, 8 y 9 dependen del **camino completo contra el backend** —registrar de verdad desde
el navegador—, que exige una jornada abierta y catálogos sembrados. Los catálogos siguen sin
entregarse (PV-01, PV-25, PV-26); es la misma razón por la que las pruebas de integración del
backend crean los suyos.

---

## 8. PENDIENTE DE VALIDACIÓN

- **Comprobación visual de los casos 10 y 11**, y del recorrido completo en el navegador.
- **PV-01, PV-25 y PV-26** siguen bloqueando el uso con datos reales: sin catálogos sembrados, el
  selector de zonal y punto queda vacío por más que la pantalla funcione.
- **Una sola zonal por operativo en la interfaz.** El contrato admite varias (RN-19) y el servicio
  las envía como arreglo; la pantalla ofrece una. Ampliarlo es un cambio de control, no de contrato,
  y conviene confirmar con el Product Owner si la jornada repartida entre zonales es frecuente.
- **Advertencia de lint heredada** en `FilterByColumn.tsx`, anterior a estos módulos. Ahora que hay
  ejecutor de pruebas, corregirla con red es barato: se propone para M-23, que sí usa `Table`.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
