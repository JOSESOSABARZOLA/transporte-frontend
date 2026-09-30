# M-29 · Pantalla P-09 · Ventanas y parámetros

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P2 · Media** · Dependencias M-06, M-08, M-21
**Última de las nueve pantallas** · Fecha: 2026-08-06

---

## 0. LA PANTALLA QUE HACE QUE PV-06 DEJE DE BLOQUEAR

Los ocho parámetros de política llevan valores provisionales desde M-06 porque las fuentes se
contradicen. El caso más claro es `HORA_CIERRE_DEPARTAMENTAL`: **14H00 en una sesión y 15H00 en
otra, del mismo interlocutor**. Mientras eso no se resuelva, el sistema funciona con un supuesto
documentado.

A partir de aquí, resolverlo **no exige desplegar código**. Es el caso 1 del plan, y es la razón por
la que estos valores viven en una tabla y no en constantes: el día que el Product Owner diga cuál de
las dos horas es la buena, alguien lo escribe aquí y rige desde ese momento.

Lo mismo vale para los umbrales de descanso. Cambiar `JORNADA_MAXIMA_HORAS` altera de inmediato a
quién ofrece el sistema al armar el cuadro, sin tocar `elegibilidad.service` ni volver a compilar.

---

## 1. ARCHIVOS

Seis nuevos, uno de prueba, uno modificado y **uno retirado**.

```
src/
├── pages/
│   ├── AdminVentanasPage.tsx                        (nuevo)
│   └── PantallaPendiente.tsx                        (RETIRADO · ver §6)
├── components/administracion/                       (nuevo)
│   ├── TablaParametros.tsx · TablaVentanas.tsx
│   ├── ModalVentana.tsx
│   └── administracion.spec.tsx                      24 pruebas
├── interfaces/Administracion.ts                     (nuevo)
├── services/administracion.service.ts               (nuevo)
├── utils/parametro.util.ts                          (nuevo)
└── config/routes.tsx        (modificado: la última ruta real, y se retira el marcador)
```

**Sin dependencias nuevas.**

---

## 2. UNA COMPROBACIÓN QUE NO DUPLICA NINGUNA REGLA

El plan pide algo que en otros módulos rechacé explícitamente: «el valor se valida contra su rango
**antes de enviarlo** y también en el servidor». En M-27 dejé el dígito verificador de la cédula al
servidor precisamente para no tener dos implementaciones de la misma norma. ¿Por qué aquí sí?

**Porque el rango viaja con el valor.** `minimo`, `maximo`, `unidad` y `tipo` llegan en la misma
respuesta que `valor`. Lo que se comprueba en el navegador **es el rango que el propio servidor
acaba de declarar para ese parámetro**, no una copia escrita a mano. Si mañana el rango cambia en la
base, esta función cambia con él sin tocar una línea.

Allí la norma vivía en el código del servidor y copiarla habría creado dos verdades; aquí la norma
es un dato y el cliente la aplica. No es la misma situación aunque se parezca.

Hay una prueba que lo fija: con otro `minimo` y otro `maximo`, el mensaje de rechazo cambia solo.

---

## 3. ESTE COMPONENTE NO CONOCE NINGÚN PARÁMETRO EN CONCRETO

No hay un caso para `JORNADA_MAXIMA_HORAS` y otro para `HORA_CIERRE_DEPARTAMENTAL`. La clave, la
descripción, la unidad y los extremos llegan en la respuesta, y la fila se dibuja con ellos: **el
día que se agregue un noveno parámetro aparecerá aquí solo**, con su rango y su explicación.

Es lo que convierte a P-09 en una pantalla de configuración y no en ocho formularios disfrazados de
tabla.

**El rango se muestra siempre, no solo al equivocarse** (caso 4). Quien va a cambiar un umbral
necesita saber qué puede poner *antes* de intentarlo; un rango que solo aparece en el mensaje de
error obliga a fallar para aprenderlo.

**El estado de edición vive en la fila, no en la tabla.** Con un mapa de claves a valores en el
componente padre, escribir en un parámetro volvería a dibujar los ocho y el cursor de los demás
campos saltaría al final en cada tecla.

---

## 4. «SIN RESTRICCIÓN» NO ES «SIN DATOS»

Es la decisión de interfaz del panel de ventanas. Una hora de apertura nula, o una ventana
desactivada, **no está incompleta**: dice que ese rol no tiene esa restricción.

Es lo único que las fuentes permiten afirmar de los departamentos, cuyo horario define solo el
cierre; y la Dirección y la Administración quedaron inactivas a propósito, porque ninguna fuente
define su ventana. Escribir «—» en esas celdas las haría parecer datos que alguien olvidó cargar, y
el siguiente administrador «los completaría» cerrando una ventana que nadie pidió cerrar.

Por eso `horarioDeVentana` redacta la frase completa: «Hasta 15:00, sin hora de apertura», «Sin
restricción horaria», «De lunes 08:00 a viernes 17:00».

**No hay botón de agregar ni de eliminar**, y no falta ninguno: hay una ventana por rol y el
contrato no expone `POST` ni `DELETE`. Borrar una **abriría** la carga de ese rol las veinticuatro
horas, porque el evaluador trata la ausencia como «sin restricción». Desactivar dice lo mismo de
forma explícita y deja rastro en la auditoría.

**El modal muestra lo que leerá el funcionario.** `mensajeCierre` no es un texto técnico: es lo que
aparece en P-01 a las 15H01 y lo único que le dice a alguien cuándo puede volver a intentarlo. Por
eso el servidor exige diez caracteres como mínimo, y por eso el campo lleva su explicación debajo.

**La hora vacía se envía como `null`, no se omite.** En este contrato son cosas distintas: lo que no
viene no se toca, y lo que viene nulo se limpia. Omitir el campo al borrarlo dejaría la hora
anterior intacta y el administrador creería haberla quitado.

---

## 5. LO QUE EL SERVIDOR ACEPTA Y ADVIERTE

`PUT /administracion/ventanas/:rol` devuelve la ventana guardada **y un arreglo de advertencias**: el
servidor puede aceptar un cambio y avisar de que deja la jornada sin margen —por ejemplo, una hora de
cierre departamental que no deja tiempo a la DAF antes del límite del cuadro—.

Se muestran en un `alert-warning` sobre los dos paneles y **no impiden nada**. Es el mismo criterio
que la capacidad de flota en M-24: un hecho de la configuración no es un error de captura.

---

## 6. SE RETIRÓ EL MARCADOR DE M-21

M-21 dejó las nueve rutas declaradas con un `PantallaPendiente` temporal, y escribió que *«cada
módulo de M-22 a M-29 sustituye una referencia»*. **M-29 es la última**: con esta pantalla,
`CONSTRUIDAS` cubre las nueve rutas y el respaldo ya no puede dibujarse nunca.

Un respaldo que no puede ejecutarse es código muerto, así que se retiró el componente y su
referencia. El mecanismo estaba pensado para terminar aquí.

Y de paso se cerró la puerta que dejaba abierta: `CONSTRUIDAS` pasó de `Record<string, ReactNode>` a
`Record<Ruta, ReactNode>`, con `Ruta` derivada de la propia lista de pantallas. **Si alguna de las
nueve faltara, TypeScript lo diría.** Con un índice de cadena la ausencia habría compilado y se
habría visto al abrir la ruta, en el navegador y con suerte.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **13 archivos · 195 pruebas** (24 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · las nueve pantallas en nueve fragmentos |

### 7.1. Los cinco casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | `HORA_CIERRE_DEPARTAMENTAL` a 14H00 · sin desplegar código | ✅ el valor se admite y se envía; **que la ventana cierre a las 14H00 exige backend** |
| 2 | `JORNADA_MAXIMA_HORAS` a 30 · rechazado con el rango | ✅ el rechazo nombra el máximo **y su unidad**, antes de enviar |
| 3 | `JORNADA_MAXIMA_HORAS` a 8 · aceptado | ✅ y los dos extremos entran; la elegibilidad cambia en el servidor |
| 4 | Visualización · unidad, mínimo, máximo y descripción | ✅ los cuatro, y el rango **visible desde el principio** |
| 5 | Auditoría · autor y momento | ✅ la última modificación en la fila; **la traza completa la escribe el servidor** |

### 7.2. Qué queda pendiente de mirar

- **El efecto de los casos 1 y 3 es del servidor.** Que cambiar la hora de cierre mueva de verdad la
  ventana, y que bajar la jornada máxima altere a quién ofrece P-01, lo deciden
  `VentanaCargaEvaluador` y `ElegibilidadService`. Comprobarlo desde la interfaz sería probar el
  simulacro; lo que aquí se afirma es que el valor llega correcto y que el rechazo llega explicado.
- **El caso 5 se muestra a medias, y así se declara.** La fila dice quién y cuándo fue la última
  modificación —que es lo que responde a «¿quién cambió esto?» sin abrir la base—, pero **el
  historial completo no tiene pantalla**: vive en `t_auditoria`. Si la Dirección espera consultarlo,
  falta una pantalla que el plan no contempla.
- **Maquetación** a 375 px: las dos tablas van en `overflow-x-auto` y el modal es `max-w-lg` con
  desplazamiento propio, pero afirmarlo exige abrirlo.

---

## 8. PENDIENTE DE VALIDACIÓN

- **PV-06 · los ocho parámetros siguen con valores provisionales**, pero **ya no bloquean un
  despliegue**: se corrigen desde esta pantalla. Lo que falta es la decisión, no la herramienta. El
  más urgente sigue siendo `HORA_CIERRE_DEPARTAMENTAL`, con dos horas distintas en las fuentes.
- **La zona horaria no se edita.** `zonaHoraria` se muestra pero el `ActualizarVentanaDto` no la
  acepta, y con razón: cambiarla movería todas las ventanas a la vez. Si alguna vez hiciera falta
  —una unidad en otra provincia—, es una decisión de alcance, no un campo que agregar.
- **No hay pantalla para el historial de auditoría.** Ver §7.2.
- **La DAF no declara su capacidad de flota desde ninguna pantalla.** Se detectó al cerrar M-24:
  `PUT /transporte/capacidad/:fecha` existe y el servicio lo consume, pero ni P-03 ni P-09 lo
  ofrecen. P-09 sería su sitio natural si se decide que la declaración es configuración; P-03 lo
  sería si se decide que es parte de la jornada. **Sigue sin decidirse.**

---

## 9. CON ESTO SE CIERRA EL BLOQUE G

Las nueve pantallas están construidas: P-01 a P-09, cada una en su fragmento, con **195 pruebas**
sobre el conjunto. Lo que queda del plan es M-30, que es despliegue e identidad real.

Conviene decir en qué estado se entregan: **funcionan, y ninguna se ha ejercitado contra datos
reales**. Los cinco bloqueantes del proyecto —PV-01, PV-02, PV-03, PV-25 y PV-26— siguen abiertos, y
mientras lo estén el sistema se puede recorrer pero no usar. Lo que este bloque aporta es que ya no
falta software para empezar: falta el dato.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
