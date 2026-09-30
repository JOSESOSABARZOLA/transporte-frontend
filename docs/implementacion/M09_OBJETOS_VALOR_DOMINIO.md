# M-09 · Objetos de valor del dominio

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E4 · Bloque C · Prioridad P0 · Dependencias M-02 · Desbloquea M-12 y M-14
Fecha: 2026-08-05

---

## 0. POR QUÉ ESTE MÓDULO SE HACE ANTES QUE LAS POLÍTICAS

El plan lo marca como **el de mayor riesgo del sistema**, y no por su tamaño —cuatro archivos, sin
base de datos, sin endpoints— sino por lo que ocurre si falla:

> Un defecto aquí no produce un error de sistema: produce **un funcionario asignado a dieciséis
> horas**, o dos operativos que se cruzan sin que nadie lo advierta.

De ahí la regla que el plan impone y que se cumplió: `RangoHorario` se implementa **antes** que
cualquier política que lo use, y el módulo no se da por terminado sin que sus ocho pruebas pasen.

---

## 1. ARCHIVOS

Ocho, todos en la carpeta `domain/` del submódulo `operativos`. **No hay módulo de NestJS**: los
objetos de valor no se inyectan, se construyen. `operativos.module.ts` llega con M-14.

```
src/modules/operativos/domain/
├── rango-horario.ts               + .spec.ts   28 pruebas
├── identificador-operativo.ts     + .spec.ts   16 pruebas
├── estado-transporte.ts           + .spec.ts   14 pruebas
└── ubicacion-operativa.ts         + .spec.ts   13 pruebas
```

**Ningún archivo existente fue modificado.**

---

## 2. LA INDEPENDENCIA, COMPROBADA

El plan exige que estos objetos **no dependan de nada externo**: ni de Prisma, ni de NestJS, ni de
la configuración. Se cumple y se puede verificar:

```
$ grep "@prisma/client|@nestjs" src/modules/operativos/domain/*.ts
ninguna importación de framework
```

La única importación es `ValidacionError`, y merece explicación. Es TypeScript puro —extiende
`Error` y no arrastra ninguna dependencia—, y usarlo garantiza que una hora mal escrita llegue al
funcionario como un `400` con una frase que puede entender. La alternativa purista —lanzar un
`Error` genérico— habría obligado a M-14 a traducir cada caso, y un olvido allí convierte un dato
mal escrito en un `500`. Se eligió la dependencia inocua sobre la pureza teórica, y queda dicho.

Dos consecuencias más de esa independencia:

- **`EstadoTransporte` no importa el enumerado de Prisma.** Los tres nombres coinciden con
  `e_estado_transporte` y la conversión es directa, pero la dirección de la dependencia importa: el
  dominio no cambia porque cambie el motor.
- **La franja nocturna llega como parámetro.** La fijan `FRANJA_NOCTURNA_INICIO` y
  `FRANJA_NOCTURNA_FIN` de M-06, y quien construye el objeto los pasa. Si este archivo los leyera,
  el umbral volvería a ser una constante escondida, que es justo lo que M-06 existe para eliminar.

---

## 3. `RangoHorario` · LA DECISIÓN QUE ELIMINA EL RIESGO

Un horario que cruza la medianoche —22H00 a 02H00— tiene la hora de fin **menor** que la de inicio.
Comparar esas dos cadenas, o esos dos números, da resultados silenciosamente incorrectos. Ese es el
defecto que se repite en cada validación que lo intenta por su cuenta, y el análisis lo señaló como
*«la fuente de error más probable en todo el sistema»*.

La solución es descomponer el rango **una sola vez** en los intervalos que ocupa dentro de un día
ordinario:

```
08:00–16:30  →  [(480, 990)]
22:00–02:00  →  [(1320, 1440), (0, 120)]
```

A partir de ahí, **el solapamiento y la condición nocturna son la misma operación**: ¿se cortan dos
conjuntos de intervalos? Una sola aritmética, probada una vez, en lugar de dos razonamientos
parecidos escritos en sitios distintos. Es lo que reduce el riesgo, más que cualquier cantidad de
pruebas sobre dos implementaciones separadas.

### 3.1 Los intervalos son semiabiertos, y de ahí sale el caso 6

Un operativo de 08H00 a 12H00 y otro de 12H00 a 16H00 **no se solapan**. Terminar y empezar a la
misma hora es encadenar, no coincidir; tratarlo como solapamiento impediría la jornada partida que
el negocio sí practica. La misma decisión se aplica a la franja nocturna: 18H00–20H00 **no** es
nocturno, porque termina justo cuando la franja empieza.

### 3.2 Lo que se rechaza

| Situación | Motivo |
|---|---|
| `08:15` | RN-07: horas completas y medias horas, nada más. Lo respalda `ck_operativo_hora_inicio` |
| `24:00` | No existe |
| `08:00`–`08:00` | No se puede decidir entre «duración cero» y «veinticuatro horas», y ninguna de las dos es un operativo |
| Franja nocturna mal configurada | Sin ella, el operativo dejaría de ser nocturno **en silencio** y el condicionante de conductor no se aplicaría |

---

## 4. `IdentificadorOperativo` · EL FORMATO SALE DE LOS MOCKUPS

RN-10 dice que el formato es «prefijo, secuencial, día, mes y año», sin más precisión. La forma
concreta **no se supuso**: está en los mockups aprobados de FASE5.

```
FASE5 §5.3   ASIGNAR TRANSPORTE A  ICNECU-001-31-JUL-2026
FASE5 §5.4   Se quitará IG-002-31-JUL-2026
```

De ahí: `PREFIJO-NNN-DD-MES-AAAA`, con el secuencial a tres cifras y el mes en abreviatura
castellana de tres letras. La tarjeta móvil de §9.6 muestra `ICNECU-001-31-JUL-26` con el año
abreviado; se interpretó como una reducción de esa vista concreta, y el valor canónico —el que se
guarda y el que se imprime— lleva el año completo.

**Los meses son una tabla explícita, no `Intl`.** En español, `Intl` devuelve «ene.» con punto y
«sept» con cuatro letras, lo que rompería el formato. Un código impreso en una orden de servicio
tiene que ser siempre el mismo.

### Lo que este objeto NO hace

No decide el secuencial. RN-12 exige que se reinicie cada día y que dos registros simultáneos no
colisionen (VAL-32), y eso solo puede garantizarlo la base dentro de una transacción. Aquí se
compone lo que se recibe; obtenerlo es del repositorio de M-14.

---

## 5. `EstadoTransporte` · LA ALERTA SE DERIVA, NO SE GUARDA

Corrige el defecto HAL-01 del diseño preliminar: dos indicadores independientes —«transporte
asignado» y «propios medios»— admiten combinaciones sin significado. Tres estados excluyentes no.

| Desde | Hacia | ¿Se admite? |
|---|---|---|
| `PENDIENTE` | `ASIGNADO` · `PROPIOS_MEDIOS` | Sí |
| `ASIGNADO` | `PROPIOS_MEDIOS` | Sí, es una corrección de la DAF |
| `PROPIOS_MEDIOS` | `ASIGNADO` | Sí, la corrección inversa |
| Cualquiera | `PENDIENTE` | **No** |

**Por qué no se puede volver a `PENDIENTE`.** Ese estado significa «la DAF todavía no ha
intervenido». Volver a él sería afirmar algo que ya no es cierto: haría reaparecer la alerta
amarilla como si nadie hubiera revisado el operativo, y se perdería el hecho de que sí se revisó.
Una corrección se expresa cambiando entre las dos formas de haber decidido.

`requiereAtencion` **es** la alerta amarilla: se calcula del estado en lugar de mantenerse aparte.
Eso impide el defecto que hoy tiene el cuadro en Excel —alertas que sobreviven a la condición que
las originó— y es lo que pide RN-55.

---

## 6. `UbicacionOperativa` · LA DUALIDAD CATÁLOGO O CAPTURA LIBRE

Reúne las zonales y el punto de encuentro. Dos reglas que la base ya impone y que aquí se
comprueban **antes**, para que el funcionario reciba una frase en lugar de un error del motor:

- `ck_operativo_punto` exige **exactamente uno** de los dos puntos: el del catálogo o el capturado
  libremente. Ni los dos, ni ninguno.
- RN-19 admite varias zonales cuando la jornada se reparte, pero nunca ninguna.

Las zonales se normalizan —sin repeticiones y en orden estable— para que la comparación por valor
funcione: indicar `[3, 7]` o `[7, 3]` produce la misma ubicación.

FASE3 §OV-03 observa que esta dualidad aparece dos veces en el dominio —punto de encuentro y tipo
de control— y recomienda modelarla como un patrón consistente. Este objeto es la primera mitad;
`ClasificacionControl` seguirá la misma forma en M-14.

---

## 7. PRUEBAS

```
Test Suites: 21 passed, 21 total
Tests:       253 passed, 253 total
```

**71 nuevas.** Los trece casos del plan, y bastante más alrededor:

| # | Caso del plan | Resultado |
|---|---|---|
| 1 | Rango normal `08:00–16:30` | ✅ válido, 8,5 horas, no nocturno |
| 2 | Cruce de medianoche `22:00–02:00` | ✅ válido, 4 horas, nocturno |
| 3 | Solapamiento parcial | ✅ detectado |
| 4 | **Solapamiento con cruce** `22:00–02:00` con `01:00–05:00` | ✅ **detectado** |
| 5 | Contención `08:00–18:00` con `10:00–12:00` | ✅ detectado |
| 6 | **Adyacencia** `08:00–12:00` con `12:00–16:00` | ✅ **no se solapan** |
| 7 | Franja tocada parcialmente `19:00–21:00` | ✅ es nocturno |
| 8 | Franja contenida `21:00–23:00` | ✅ es nocturno |
| 9 | Hora `08:15` | ✅ rechazada |
| 10 | Identificador en dos fechas distintas | ✅ ambas empiezan en `001` |
| 11 | `ASIGNADO` a `PENDIENTE` | ✅ transición rechazada |
| 12 | Punto de catálogo y punto libre a la vez | ✅ rechazada |
| 13 | Sin ninguna zonal | ✅ rechazada |

Pruebas que no pide el plan y que conviene destacar:

- **El solapamiento es simétrico** en las veinticinco combinaciones de cinco rangos: `a.seSolapaCon(b)`
  y `b.seSolapaCon(a)` devuelven siempre lo mismo. Una asimetría aquí haría que el orden en que se
  consultan dos operativos cambiara el veredicto.
- **La duración nunca es negativa ni mayor de un día** en las veinte combinaciones de cinco horas.
  Es la propiedad que `ck_operativo_duracion` exige en la base.
- **Adyacencia sobre la medianoche**: `22:00–00:00` y `00:00–06:00` no se solapan.
- **La franja es un parámetro**: el mismo rango es nocturno o no según la franja que se le pase.
- **El objeto es inmutable**: transitar de estado devuelve otro y no altera el primero.
- **Una fecha imposible** —`31-FEB`— se rechaza en lugar de desbordarse al mes siguiente, que es lo
  que hace `Date` por omisión.

`npm run build` y `npm run lint:check` en 0. Las 34 pruebas de integración siguen pasando y el
contenedor se reconstruyó y quedó sano; este módulo no añade endpoints, de modo que la pila no
cambia de comportamiento.

---

## 8. PUNTO A CONFIRMAR CON EL NEGOCIO

**No es un bloqueante**, pero conviene dejarlo escrito.

Los mockups evidencian un solo mes: `JUL`. Las otras once abreviaturas se escribieron con la
convención castellana habitual —`ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC`—. La única que
admite discusión es **septiembre**, que en algunos usos se abrevia `SET`.

El identificador se imprime en las órdenes de servicio, así que basta una confirmación de la
Dirección para cerrarlo. Si la convención institucional fuera otra, el cambio es una línea de la
tabla `MESES`.

---

## 9. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-12 · Políticas de descanso** | `RangoHorario.seSolapaCon()` para RN-28 y `duracionHoras` para la jornada máxima |
| **M-14 · Registro de operativos** | Los cuatro. `IdentificadorOperativo` al guardar, `UbicacionOperativa` al validar, `EstadoTransporte` al nacer el operativo |
| **M-19 · Asignación de transporte** | `EstadoTransporte.transitarA()` |

---

## 10. CAMBIO DEL SEGUNDO CODE REVIEW · 2026-08-05

**La fecha del identificador era mutable.** `readonly fecha: Date` impide reasignar la referencia,
no mutar el objeto: `identificador.fecha.setFullYear(1999)` cambiaba un objeto de valor desde
fuera, y con él el código impreso en una orden de servicio ya emitida.

Ahora el constructor guarda una copia, el campo es privado y se accede por `fechaOperativa`, que
devuelve otra copia. Las 16 pruebas del identificador pasan sin cambios: ninguna usaba `fecha`
directamente. Ver `CODE_REVIEW.md` §12.3.

---

## 11. ESTADO

**M-09 terminado.** Compilación y lint en 0; **253 pruebas unitarias** en verde, 71 de ellas nuevas;
los trece casos del plan verificados, incluidos los ocho obligatorios de `RangoHorario`.

Ningún pendiente del negocio lo condiciona: los objetos de valor no dependen de datos maestros. El
único punto abierto —la abreviatura de septiembre— no impide su uso.

**A la espera de aprobación.**
