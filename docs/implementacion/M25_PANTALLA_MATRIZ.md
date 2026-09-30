# M-25 · Pantalla P-04 · Matriz Consolidada del Día

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P1 · Alta** · Dependencias M-19, M-21
Desbloquea M-26 · Fecha: 2026-08-06

---

## 0. LA PANTALLA QUE ORIGINÓ EL ENCARGO, VISTA DEL REVÉS

El cuadro completo circulaba por WhatsApp y los intervenidos se anticipaban al operativo. La vista
consolidada existe —hace falta para dirigir—, pero **solo para la Dirección** (RN-48). Ningún perfil
departamental monta este componente, y tampoco la DAF, que ve los nueve formularios pero únicamente
para asignar transporte.

La protección es doble y ninguna sustituye a la otra: `RutaProtegida` impide entrar por URL y
`@Roles(DIRECTOR)` sobre `/matriz` impide obtener los datos. Si alguna vez discrepan, manda el
servidor.

---

## 1. ARCHIVOS

Seis nuevos, dos de prueba y dos modificados.

```
src/
├── pages/
│   └── MatrizConsolidadaPage.tsx                    (nuevo)
├── components/matriz/                               (nuevo)
│   ├── TablaMatriz.tsx · BannerFormulario.tsx
│   ├── FilaSinInformacion.tsx · FiltroFormulario.tsx
│   └── matriz.spec.tsx                              13 pruebas
├── utils/
│   ├── banner.util.ts                               (nuevo)
│   └── banner.spec.ts                                5 pruebas
├── interfaces/Alerta.ts     (modificado: la celda crítica usa `ring`, no `border`)
└── config/routes.tsx        (modificado: la ruta real sustituye al marcador)
```

**Sin dependencias nuevas.** `react-pdf` **no se usó**: el PDF lo genera el servidor con PDFKit
desde M-19 y aquí solo se descarga. Montar un visor en el navegador significaría rehacer el
documento por segunda vez, con otra librería y otro resultado.

---

## 2. UNA SOLA TABLA, CON LOS BANNERS COMO FILAS

Así lo dibujan FASE5 §4.3 y §5.3, y la alternativa —nueve tablas, una por formulario— parece más
ordenada y es peor: cada tabla calcularía sus anchos de columna por su cuenta y las once columnas
quedarían desalineadas entre secciones.

La matriz es **un documento**, y en un documento las columnas se leen en vertical de arriba abajo.
Con nueve tablas, comparar el horario del formulario 1 con el del 6 obligaría a medir con el dedo.

Cada sección aporta su banner (`<td colSpan={11}>`), su fila de evidencia si la tiene, y sus filas.

---

## 3. EL COLOR VIENE DEL SERVIDOR · Y UNA CONSECUENCIA DE PV-25

El fondo del banner se aplica con `style` en línea, tal como llega. No existe —ni debe existir— una
clase por formulario: son nueve colores del Excel aprobado, es decir un **dato institucional**, y
tenerlos en la hoja de estilos significaría que cambiar uno exige desplegar la interfaz.

Pero el caso 9 pide que **todas las combinaciones sean legibles**, y ahí apareció un problema real.

El texto sobre el banner necesita un color, y hay nueve fondos distintos que nadie ha comprobado uno
por uno (PV-23). Fijar blanco dejaría ilegible cualquier banner claro; fijar negro, cualquiera
oscuro. Así que `colorDeTextoSobre` elige entre blanco y negro **por luminancia relativa WCAG**, no
por gusto. El fondo sigue siendo íntegramente del servidor; lo único que se decide aquí es el primer
plano, y se decide para que se lea.

> **`colorAcento` sería el campo correcto para esto.** Un «color complementario del banner» —así lo
> define FASE4— es exactamente la decisión que esta función está tomando por su cuenta. Pero
> **PV-25 sigue abierto** y la columna lleva un valor de relleno declarado como tal en M-07: usarlo
> pintaría texto negro sobre fondo negro. Cuando la DNP entregue los nueve acentos, esta función
> debería ceder el paso. **Es la primera consecuencia concreta que PV-25 tiene en pantalla.**

La luminancia no es el promedio de los tres canales, y hay una prueba que lo fija: el ojo percibe el
verde mucho más que el azul, y promediar declararía legible un texto blanco sobre el verde
institucional.

---

## 4. NINGUNA INFORMACIÓN DEPENDE SOLO DEL COLOR

En un sistema llamado *cuadro de colores* la regla 6 exige atención deliberada. Las trece pruebas de
interfaz comprueban lo mismo desde ángulos distintos:

| Señal cromática | Su equivalente textual |
|---|---|
| Banner del formulario | Número, nombre, responsable, conteo **y `colorNombre`** —«azul», «verde»—, que es como el Excel llama a ese color |
| Celda en `bg-warning/25` | El mensaje del servidor, en el `title` y visible cuando la celda está vacía |
| Celda crítica | Su propio motivo en el `title`, distinto del de la pendiente normal |
| Estado del transporte | El distintivo lleva la palabra: «Pendiente», «Asignado», «Propios medios» |
| Leyenda al pie | Traduce a palabras qué significa cada marca |

### La celda crítica pasó de `border` a `ring`

`claseDeAlerta` devolvía `border border-error`; FASE5 §5.3 especifica
`ring-1 ring-error ring-inset`. **La diferencia no es estética en una tabla**: un borde ocupa
espacio y desplaza el contenido de las celdas vecinas, de modo que la fila con alerta crítica queda
un píxel desalineada respecto de las demás. `ring` se dibuja por encima y no mueve nada.

Es un cambio en un archivo de M-21 que afecta también a P-01 y P-02, y se hizo aquí porque el caso 5
de **este** módulo es precisamente «alerta crítica con borde distintivo»: era el momento de mirarlo
contra la especificación. La prueba afirma las dos cosas —que lleva `ring` y que **no** lleva
`border`—.

---

## 5. LA FILA DE EVIDENCIA NO ES UN ESTADO VACÍO

RN-53 y RN-54. La diferencia es de fondo: un estado vacío dice «aquí no hay nada»; esta fila dice
**quién no cargó y hasta cuándo tuvo para hacerlo**.

El cuadro es el documento con el que la Dirección responde por la jornada, y un formulario ausente
sin explicación se lee como un fallo del sistema en lugar de como lo que es: un departamento que no
entregó a tiempo. El texto lo redacta el servidor y se muestra tal cual (regla 7): está escrito para
constar en un documento, no para consolar a nadie.

**Solo aparece cuando la ventana venció.** El servidor únicamente envía `evidencia` si el formulario
quedó vacío *y* su plazo pasó: mientras la ventana sigue abierta, que aún no haya operativos no
significa nada. Y arriba, un `alert-warning` resume cuántos formularios faltaron, para que no haya
que recorrer las nueve secciones buscándolos.

---

## 6. CERRAR EL CUADRO

Es irreversible en la práctica aunque exista `reabrir`: el cierre habilita la emisión de órdenes de
servicio, y una orden emitida ya salió del sistema.

Por eso pasa por `ModalConfirmacion`, y por eso el aviso **enumera lo que se está firmando**: la
orden de trabajo, cuántos operativos, cuántas alertas y cuántos formularios quedaron sin carga.
«¿Está seguro?» a secas obliga a cerrar el modal para ir a contarlo.

El `409` se muestra tal cual: nombra el operativo nocturno que sigue sin conductor, que es
exactamente lo que hay que resolver antes de volver a intentarlo.

---

## 7. LO QUE NO ESTÁ, Y POR QUÉ

**No hay columna de acciones.** El esquema de FASE5 §4.3 dibuja un botón de emitir orden por fila,
pero `POST /operativos/:id/ordenes-servicio` es el contrato de **M-26** y el plan no lo lista entre
los endpoints de este módulo. Se deja el hueco para P-05 en lugar de adelantarlo. Hay una prueba que
afirma que la tabla no tiene ningún botón, para que el día que se agregue sea una decisión y no un
descuido.

**No se usó `react-pdf`.** Ver §1.

---

## 8. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **9 archivos · 120 pruebas** (18 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · `MatrizConsolidadaPage` en su fragmento (9,65 kB) |

### 8.1. Los nueve casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Acceso con perfil departamental · redirige | ⏳ `RutaProtegida` más `@Roles(DIRECTOR)`; **exige navegador y backend** |
| 2 | Los nueve banners · color, número y nombre | ✅ el color en línea, el texto, el responsable y `colorNombre` |
| 3 | Formulario sin carga · fila de evidencia | ✅ con departamento y hora de cierre; y sin evidencia no se inventa |
| 4 | Celdas pendientes · amarillo más texto y `title` | ✅ |
| 5 | Alerta crítica · borde distintivo más motivo | ✅ y se afirma que usa `ring` y **no** `border` |
| 6 | Exportar · documento horizontal, sin controles | ⏳ el PDF lo genera M-19; aquí se descarga. **Exige backend** |
| 7 | Cerrar el cuadro · estado a `Cerrado` | ⏳ implementado con confirmación enumerada; **exige backend** |
| 8 | Anchura 375 px · desplazamiento dentro del contenedor | ✅ el envoltorio `overflow-x-auto`; el aspecto, pendiente de mirar |
| 9 | Tema oscuro · combinaciones legibles | ✅ **la elección** del texto por luminancia; que **se vea** bien, pendiente |

### 8.2. Qué queda pendiente de mirar

- **Los casos 1, 6 y 7 exigen backend con datos.** El primero además exige navegador: comprobar una
  redirección montando el componente sería probar el simulacro.
- **Los casos 8 y 9 están verificados a medias, y así se declaran.** Que la tabla vaya envuelta en
  `overflow-x-auto` y que el texto se elija por luminancia son afirmaciones comprobables; que a
  375 px se lea cómodo y que los nueve banners queden legibles en tema oscuro **exige abrirlo**. Es
  la mitad que una prueba automática no puede cubrir, no un caso aprobado.
- **PV-23** —contraste de los nueve banners, sin medir— sigue abierto, y esta pantalla es donde se
  nota: `colorDeTextoSobre` garantiza que el texto contraste con su fondo, no que el fondo sea un
  color acertado.

---

## 9. PENDIENTE DE VALIDACIÓN

- **PV-25 tiene ahora una consecuencia visible.** Ver §3: el color del texto del banner lo está
  decidiendo una función de contraste porque `colorAcento` lleva relleno. Cuando la DNP lo entregue,
  conviene decidir si el acento manda sobre el cálculo.
- **PV-23** · verificación de contraste de los nueve banners, incluido el tema oscuro.
- **PV-01, PV-25 y PV-26** siguen bloqueando el uso con datos reales.
- **El selector de fecha** se incluyó por el mismo motivo que en P-02 (PV-32): sin él, el parámetro
  `fecha` de `GET /matriz/:fecha` solo apuntaría a hoy, y la Dirección revisa y firma cuadros de días
  anteriores.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
