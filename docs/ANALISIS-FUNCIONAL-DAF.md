# ANÁLISIS FUNCIONAL DAF — PLANIFICACIÓN, LOGÍSTICA Y ASIGNACIÓN DE TRANSPORTE

**Módulo Transportes / Cuadro de Colores Operativo · Agencia Metropolitana de Control**
28 de agosto de 2026 · Levantamiento con DAF – Planificación de Transporte

> **Documento de análisis. No contiene implementación y no se ha modificado ningún archivo
> del proyecto.**

**Convención de evidencia.** `[C]` confirmado · `[I]` inferencia · `[P]` propuesta ·
`[V]` pendiente de validación.

---

## 1. Resumen ejecutivo

El levantamiento arroja **una conclusión que cambia el alcance del módulo de transporte**, y
no es un ajuste de pantalla.

**El sistema modela la asignación como un atributo del operativo. DAF planifica la jornada
de un conductor.** No son la misma cosa vista desde dos lados: son dos objetos distintos. El
sistema pregunta «¿quién lleva este operativo?»; DAF resuelve «¿cómo encajo 12 operativos
simultáneos en 34 conductores y 25 vehículos, respetando dónde termina cada uno, dónde vive
cada conductor y dónde debe quedar cada vehículo?».

La analista lo dijo con esas palabras: *«ahorita está de uno a uno… pero en la realidad así
no funciona, porque hay varios operativos por cubrir»* `[C]`.

### Los cinco hallazgos que deciden el rediseño

| # | Hallazgo | Evidencia |
|---|---|---|
| **1** | **El 38 % de las asignaciones reales encadenan más de un operativo en el mismo turno de un conductor.** De 422 celdas de actividad con horario, 263 llevan un rango, **106 llevan dos y 53 llevan tres o más**; el máximo observado es **5 rangos en una celda** | Excel, conteo exhaustivo del mes `[C]` |
| **2** | **No existe ningún identificador de operativo en el instrumento de DAF.** Cero coincidencias de `OCF-…`, `ID33`, o cualquier secuencial. El vínculo Cuadro → asignación **vive solo en la memoria de la planificadora** | Excel, búsqueda exhaustiva `[C]` |
| **3** | **El sistema no valida la doble asignación de vehículo.** Sí valida la del conductor (VAL-21, con solapamiento horario real). La misma placa puede asignarse a N operativos simultáneos sin aviso | Código `[C]` |
| **4** | **Tres dimensiones que gobiernan la decisión real no existen en ninguna capa**: dónde queda el vehículo al terminar, dónde vive el conductor, y el tiempo de traslado entre el fin de un operativo y el inicio del siguiente | Código + documentación `[C]` |
| **5** | **~12 % de la demanda de transporte no proviene del Cuadro de Colores** (trabajo comunitario, Secretaría General, Comunicación Social, traslados RRHH, supervisión, ir al taller). El indicador de capacidad de flota, que solo cuenta operativos del cuadro, **subestima estructuralmente la demanda** | Excel + código `[C]` |

### Y dos hallazgos que no esperaba encontrar

**A · El catálogo de flota que PV-03 lleva meses esperando ya existe, en producción, en otro
sistema de la AMC.** El sistema de órdenes de movilización (`vehiculos-sigoc.quito.gob.ec`)
tiene **32 vehículos reales con sus placas municipales** —`PMA3368`, `PMA7056`, `PMA7058`…—
**que son exactamente las mismas placas del Excel de DAF**, y ~94 conductores. Además los
expone como catálogo del Auth central: `GET /catalogos/scope/vehiculos/vehiculos` y
`/conductores` `[C]`. Hoy `t_conductor` y `t_vehiculo` de nuestro módulo tienen **0
registros** y la DAF no puede asignar nada. Ver §26bis.

**B · La declaración de capacidad de flota no tiene pantalla.**
`PUT /transporte/capacidad/:fecha` existe en el servidor y ningún componente lo invoca. En
consecuencia RN-46 —la única regla de negocio propia de la capacidad— **nunca se dispara en
producción** `[C]`.

---

## 2. Objetivo

Reconstruir el proceso real de planificación logística de DAF, contrastarlo con lo
implementado, y producir la base para actualizar documentación, requerimientos, reglas,
modelo de datos y pantallas. **No se implementa nada en esta etapa.**

## 3. Alcance

Incluye: recepción de operativos, planificación de conductores y vehículos, disponibilidad,
mantenimiento, encadenamiento, custodia del vehículo, y la relación con la orden de servicio.

Excluye: la orden de **movilización** (EXC-01, sistema legado .NET) y el salvoconducto
nocturno (EXC-02, portal externo) — ambos fuera de alcance por FASE2 §2.2 `[C]`.

## 4. Fuentes analizadas

| Fuente | Estado | Limitación |
|---|---|---|
| `Transcripcion_Reunion_DAF.txt` | Analizada íntegra | **Truncada a los primeros 30 minutos.** Termina cuando quedan en consultar a Juan Carlos. La aprobación y la consolidación apenas aparecen |
| `HORARIO AGOSTO.xlsx` | Analizado exhaustivo: 32 hojas, 393 filas de asignación, 639 celdas de actividad | Es agosto de 2026, un solo mes |
| `CUADRO_DE_COLORES.xlsx` | Analizado. Está en `insumos/fuentes-originales/`. **Hoja1 es la versión antigua que se retira; Hoja2 es la nueva y es la que rige** | El análisis usa la Hoja2. Ver §7.0 |
| Documentación del proyecto | 40 archivos de `docs/` | — |
| Código backend y frontend | Módulo `transporte` completo | — |
| Sistema de órdenes de movilización | `Documents/vehiculos` | Ver §26 |

---

## 5. Proceso AS-IS

Reconstruido de la transcripción y verificado contra el Excel. **El flujo hipotético del
encargo no coincide con el real**: no hay una fase de «consolidación» ni una de «aprobación»
identificable, y la planificación no parte del operativo sino del conductor.

```
  DMIP / DMIT arman el cuadro          DAF, en paralelo, arma SU matriz
  y lo entregan por zona y horario     de conductores del día
             │                                      │
             └──────────────┬───────────────────────┘
                            ▼
      1 · Saca los conductores ACTIVOS del día (hoja maestra del mes)
      2 · Los dispone como filas, día y noche, con su sector de vivienda
      3 · Lee el cuadro POR ZONA Y HORARIO, no por operativo
      4 · «Va jalando y asignando»: mete cada operativo en un hueco libre
           de un conductor, comprobando mentalmente:
             · que no se cruce con lo que ya tiene
             · que el operativo anterior TERMINE donde el siguiente EMPIEZA
             · el tiempo de traslado entre ambos
             · si el funcionario es el mismo que en el operativo previo
      5 · Anota dónde debe quedar el vehículo al terminar (columna COORDINACIÓN)
      6 · Marca el CAMBIO DE CUSTODIO si el vehículo pasa de un conductor a otro
      7 · Si no alcanza: activa conductores libres
      8 · Si aun así no alcanza: PIDE A DMIP/DMIT QUE PRIORICEN, o que
           dos operativos compartan vehículo
      9 · Imprime su matriz y RECOPIA los nombres de conductor al cuadro de ellos
```

**El paso 9 es digitación duplicada pura** `[C]`: *«me imprimo esta y comienzo a completarles
las de ellos… voy copiando los nombres del conductor hasta que queda la matriz lista»*.

### Lo que el flujo hipotético del encargo daba por hecho y no existe

| Etapa supuesta | Realidad |
|---|---|
| CONSOLIDACIÓN | No aparece. La matriz de DAF y el cuadro se sincronizan copiando a mano `[C]` |
| APROBACIÓN | **Ninguna mención en los 30 minutos disponibles** `[V]` |
| VALIDACIÓN DE CONFLICTOS | Existe, pero es mental. No hay artefacto que la registre `[C]` |
| ORDEN DE SERVICIO | DAF no la emite ni la ve. Es de la Dirección `[C]` |

---

## 6. Análisis de HORARIO AGOSTO.xlsx

### 6.1 Estructura

**32 hojas**: una maestra (`AGOSTO`) y 31 diarias (`1 AGOSTO` … `31 AGOSTO`).

**Hoja maestra — rol mensual de conductores.** 34 conductores.

| Columna | Contenido | Clasificación |
|---|---|---|
| N° | Correlativo | DATO DE CONTROL |
| SECTOR DONDE VIVE | NORTE · SUR · CENTRO · VALLE | **DATO MAESTRO** — gobierna la asignación geográfica |
| NOMBRES | Nombre completo | DATO MAESTRO |
| 29 columnas de fecha | `OPERATIVODÍA` · `OPERATIVONOCHE` · `LIBRE` · `VACACIONES` | **DATO DE DISPONIBILIDAD** |
| OPERATIVO DIA / NOCHE / LIBRE / DÍAS TRABAJADOS | Conteos | DATO CALCULADO |

**Hoja diaria — dos bloques en paralelo:** turno día (columnas B–G) y turno noche (H–K).

| Columna | Campo | Clasificación | Automatizable |
|---|---|---|---|
| B / H | CONDUCTOR | DATO MAESTRO | Catálogo existente |
| C / I | DOMICILIO (sector) | **DATO MAESTRO AUSENTE del sistema** | Sí, campo nuevo |
| D / J | PLACA VEHICULO | DATO DE ASIGNACIÓN | Existe |
| E / K | **ACTIVIDAD** | **DATO DE ASIGNACIÓN — texto libre multilínea** | Ver 6.2 |
| F | COORDINACIÓN | **DATO DE ASIGNACIÓN AUSENTE** — dónde dejar el vehículo | Sí, catálogo + campo |
| G | CAMBIO DE CUSTODIO | **DATO DE CONTROL AUSENTE** | Sí, derivable |

**Pie de la hoja diaria**: vehículos **no asignados a operativos**, con su ubicación de
reposo (MATRIZ, ELOY ALFARO) o su estado (`TALLER`, `SUPERVISOR`); las jornadas estándar
(`DIA 08H00 - 16H30`, `NOCHE 17H30 A 02H00`, `CUMPLIR CON LAS 8 HORAS LABORABLES`); y el
total: **`25 VEHICULOS`** `[C]`.

### 6.2 La celda ACTIVIDAD es el corazón del problema

Empaqueta en texto libre lo que el modelo debería separar:

```
EUGENIO ESPEJO          ← zonal (no el operativo: no hay identificador)
12H00 A 14H00           ← operativo 1
17H00 A 18H30           ← operativo 2
18H00 A 19H30           ← operativo 3
20H00 A 22H00           ← operativo 4
23H00 A 01H00           ← operativo 5
TRASLADO RRHH 15H00 -   ← actividad ajena al Cuadro
```

| Medición sobre el mes completo | Valor |
|---|---|
| Celdas de actividad con contenido | 639 |
| Con **un** rango horario | 263 |
| Con **dos** | **106** |
| Con **tres o más** | **53** |
| Máximo en una celda | **5 rangos + 1 actividad extra** |
| Con patrón `INICIO/FIN` (PMO) | 59 |
| Filas con `CAMBIO DE CUSTODIO` | 61 |
| Filas donde la misma placa sirve día **y** noche | 42 |

### 6.3 Calidad de datos — lo que NO debe trasladarse tal cual

`[C]` Todo verificado en el archivo:

- **Ortografía libre en la ubicación del vehículo**: `CALDERON` / `CALDERÓN` / `LA CALDERON`,
  `ELOY ALFARO` / `LA ELOY ALFARO`, `LOS CHILLOS` / `LLOS CHILLOS` / `LALOS CHILLOS` /
  `L.OS CHILLOS`, `PARQUEADERO SEGURO` / `PARQUEADERO AUTORIZADO` / `PARQUEADERO AUUTORIZADO`.
  → **debe ser catálogo**, no texto.
- **Formato de placa inconsistente**: `PMA 7056` y `PMA7056` conviven. Y aparece `PMA701`,
  de tres dígitos, cuando el resto tiene cuatro. → **normalización y validación de formato**.
- **La hoja maestra no tiene el 9 ni el 10 de agosto** —29 columnas para 31 días— aunque sus
  hojas diarias sí existen. → **error de integridad hoy invisible**.
- **Nombre de hoja con errata**: `6 AGOSOT`.
- **Horario imposible**: `LOS CHILLOS 08H00-16H32`.
- **Columnas mal usadas**: texto de COORDINACIÓN aparece dentro de celdas de ACTIVIDAD en 29
  casos.
- **23 placas distintas usadas** frente a las **25** declaradas en el pie.
- Tokens inconsistentes: `OPERATIVODÍA` (dato) vs `OPERATIVO DIA` (cabecera).

### 6.4 Dos conceptos de estacionamiento, no uno

`PARQUEADERO SEGURO` y `PARQUEADERO AUTORIZADO` se usan sistemáticamente como cosas
distintas. La transcripción los distingue `[C]`: hay conductores **con** parqueadero
autorizado que se llevan el vehículo a casa, y conductores **sin** él que deben dejarlo en
una zonal. **Es un atributo del conductor, no del vehículo** `[I]`.

Zonales de reposo observadas: **MATRIZ, ELOY ALFARO, CALDERÓN, QUITUMBE, LOS CHILLOS** — cinco.
La transcripción menciona **cuatro** (*«Eloy Alfaro, Matriz, Calderón y Quitumbe»*).
**Contradicción a resolver** `[V]`.

---

## 7. Cuadro de Colores → Operativo → DAF

### 7.0 Las dos hojas del libro: la vigente es la Hoja2

`CUADRO_DE_COLORES.xlsx` tiene dos hojas, y **no son dos versiones en disputa: son el antes y
el después** `[C`, confirmado por el equipo el 2026-08-28`]`.

| | **Hoja1 — versión ANTIGUA** | **Hoja2 — versión NUEVA, la que rige** |
|---|---|---|
| Estado | **Se retira.** Es el instrumento de junio, con datos reales | **Vigente.** Es la especificación que sustituye a la anterior |
| Columna 3 | `PUNTO DE INTERVENCIÓN` | — |
| Ubicación | `PUNTO DE ENCUENTRO` + `ADMINISTRACIÓN ZONAL` / `ZONA DE CONTROL` según la sección | `ZONAL` + `PUNTO DE ENCUENTRO` |
| Personal y teléfono | Dos columnas | Una: `PERSONAL ASIGNADO / TELÉFONO` |
| Placa | No aparece | `PLACA DEL VEHÍCULO` |
| Extra | `HORARIO DE ALMUERZO` | — |

**La documentación del proyecto transcribió la Hoja2, es decir la correcta.** `FASE2` §16.1 no
tiene ningún error en este punto, y **`PUNTO DE INTERVENCIÓN` y `HORARIO DE ALMUERZO` no son
requisitos**: pertenecen al instrumento que se está reemplazando.

> **Corrección.** Una versión anterior de este documento afirmaba lo contrario —que
> `PUNTO DE INTERVENCIÓN` era un dato necesario que faltaba en el sistema—. Era un error de
> lectura: se tomó la Hoja1 por el instrumento vigente. La afirmación se retira.

### 7.0.1 Pero la necesidad geográfica de DAF sigue en pie

Que `PUNTO DE INTERVENCIÓN` se retire **no elimina el problema**, porque el problema no venía
del Excel sino de la transcripción, y ahí está intacto `[C]`:

> *«el EQ8 empieza aquí, si como termina en el Eloy Alfaro, tiene que venir hasta acá en
> matriz a encontrarse; recién aquí he perdido una hora y no puedo dar ese carro»*

DAF encadena vehículos razonando sobre **dónde termina** un operativo. La versión nueva
aporta `ZONAL` y `PUNTO DE ENCUENTRO`, que dicen **dónde empieza**. No hay ningún campo que
diga dónde acaba.

Tres lecturas posibles, y **hay que preguntarlo** (Q-16):

1. Para operativos fijos, empieza y termina en el mismo sitio → el punto de encuentro basta.
2. Para patrullas y recorridos —Chocó Andino, PMO— no coinciden, y la zonal es demasiado
   gruesa para calcular un traslado.
3. El dato existe pero vive en otra parte —el tipo de control, la observación— y no está
   estructurado.



### 7.0.2 La Hoja2 ya está implementada — verificado columna por columna

El equipo confirma que la versión nueva **ya está construida** en el sistema. Lo comprobé
contra `FilaMatrizDto` y `FilaJornadaDto` `[C]`:

| Hoja2 · columna | Campo del sistema | Estado |
|---|---|---|
| ID OPERATIVO | `identificador` | ✅ |
| HORARIO | `horario` | ✅ |
| **PERSONAL ASIGNADO / TELÉFONO** | `personal[].nombre` + `.telefono` | ✅ **desde el 2026-08-27** |
| ZONAL | `zonales[]` | ✅ |
| PUNTO DE ENCUENTRO | `puntoEncuentro` / `puntoLibre` | ✅ |
| TIPO DE CONTROL | `tipoControl` / `tipoLibre` | ✅ |
| INSTITUCIONES PARTICIPANTES | `instituciones[]` | ✅ |
| **CONDUCTOR / TELÉFONO** | `conductor: string` — **solo el nombre** | ❌ **falta el teléfono** |
| PLACA DEL VEHÍCULO | `placa` | ✅ |

**Ocho de nueve completas.** La que falta es la columna 8, y es **el caso simétrico exacto**
del que se cerró el 27-AGO para el personal: la especificación dice
`CONDUCTOR / TELÉFONO` y el cuadro entrega únicamente `nombreCompleto`.

**El dato ya existe y ya viaja a otro sitio**: `Conductor.telefono` está en el modelo y llega
a la orden de servicio, que lo imprime bajo el nombre (RN-50). Lo que no hace es llegar al
cuadro. Es el mismo cambio de forma que el del personal: añadir el campo al mapeo de
`matriz.dto.ts` y `jornada.dto.ts`, y pintarlo bajo el nombre del conductor.

**Por qué importa y no es cosmético.** HU-07 justifica el teléfono en el cuadro con un caso
real —*«me han llamado un domingo por un operativo que no era el mío»*—; para el conductor
el argumento es el mismo y más inmediato: quien está en el punto de encuentro y no ve
llegar el vehículo necesita poder llamarlo sin pasar por DAF.

### 7.1 Matriz de datos

| Dato del operativo | Utilizado por DAF | Solo lectura | Impacta la asignación | Observación |
|---|---|---|---|---|
| Identificador | **Debería, hoy no** | Sí | — | **No existe en el instrumento de DAF** `[C]` |
| Horario | **Sí, crítico** | Sí | **Sí** | Es el eje de todo el encadenamiento |
| Zonal | **Sí, crítico** | Sí | **Sí** | DAF lee por zona, no por formulario `[C]` |
| Punto de encuentro | **Sí, crítico** | Sí | **Sí** | Determina si el vehículo puede encadenarse `[C]` |
| **Personal asignado (nominal)** | **Sí, crítico** | Sí | **Sí** | Ver abajo. **Hoy no lo recibe** |
| Nº de personas | Sí | Sí | `[V]` | El sistema lo envía como conteo. Sin capacidad de vehículo no se puede usar |
| Formulario | Sí | Sí | Sí | Decide si habilita vehículo |
| Tipo de control | No | — | No | — |
| Instituciones | No | — | No | — |
| Observaciones | `[V]` | — | — | — |
| Conductor / Placa | **Los escribe DAF** | No | — | Únicos dos campos editables (RN-38) |

### El dato que falta y que ella pidió expresamente

*«no sé si también salgan los funcionarios que van a estar en esos horarios… porque qué tal
si yo no veo el funcionario y solo veo horarios y digo bueno, vas a ser de diez a veintiuno
horas, pero no veo el funcionario que él ya tiene acá más turnos»* `[C]`.

**Motivo**: si el mismo funcionario cubre operativos consecutivos, **debe llevarlo el mismo
conductor**, porque no tiene sentido que se baje de un vehículo y se suba a otro. Ella lo
llama *«de ley por ley tengo que poner el mismo conductor»* `[C]`.

**Conflicto directo con el diseño de seguridad**: `PendienteResponseDto` omite el personal
nominal **a propósito**, y la DAF está excluida de la ampliación del maestro de personal del
27-AGO (FASE4 §seguridad) `[C]`. Es una decisión que hay que reabrir con el PO. Ver §17.

---

## 8. Necesidades de DAF

| ID | Necesidad | Tipo | Prioridad |
|---|---|---|---|
| N-01 | Ver los operativos **agrupados por zonal y horario**, no como lista plana | `[C]` | Alta |
| N-02 | Ver la **jornada de cada conductor como una línea de tiempo** con sus huecos libres | `[C]` | Alta |
| N-03 | Encadenar varios operativos a un mismo conductor dentro del turno | `[C]` | Alta |
| N-04 | Saber **qué funcionario** va en cada operativo, para no partir su traslado | `[C]` | Alta |
| N-05 | Registrar **dónde debe quedar el vehículo** al terminar | `[C]` | Alta |
| N-06 | Que el sistema avise de cruce de horario de conductor **y de vehículo** | `[C]` | Alta |
| N-07 | Que avise cuando dos operativos encadenados estén **demasiado lejos** | `[C]` | Media |
| N-08 | Registrar mantenimiento del vehículo y que quede excluido ese día | `[C]` | Alta |
| N-09 | Marcar el **cambio de custodia** entre conductor de día y de noche | `[C]` | Media |
| N-10 | Activar conductores libres cuando la demanda lo exija | `[C]` | Media |
| N-11 | Pedir **priorización** a DMIP/DMIT cuando se agota la flota | `[C]` | Media |
| N-12 | Declarar que dos operativos **comparten vehículo** | `[C]` | Media |
| N-13 | No volver a copiar a mano los nombres al cuadro de ellos | `[C]` | Alta |
| N-14 | Que el conductor que se lleva el vehículo a casa **lo conserve al día siguiente** | `[C]` | Media |

---

## 9. Problemas actuales

| ID | Problema | Causa | Consecuencia | Prioridad |
|---|---|---|---|---|
| P-01 | La planificación vive en un Excel paralelo que nadie más ve | El sistema no modela la jornada del conductor | Doble digitación; el cuadro y la matriz pueden divergir | **ALTA** |
| P-02 | No hay trazabilidad operativo ↔ asignación | El Excel no lleva identificadores | Imposible auditar por qué un operativo se quedó sin carro | **ALTA** |
| P-03 | El mismo vehículo puede asignarse dos veces sin aviso | Falta la validación | Un operativo sale sin vehículo el día de la ejecución | **ALTA** |
| P-04 | La capacidad de flota no se puede declarar | No hay pantalla | RN-46 nunca se dispara | **ALTA** |
| P-05 | La DAF no puede ver la flota completa | `GET /administracion/vehiculos` es solo del Administrador | Un vehículo sin conductor habitual es inasignable | **ALTA** (PV-33) |
| P-06 | El mantenimiento solo se registra por SQL | No hay pantalla ni endpoint | El vehículo en taller puede asignarse | **ALTA** (PV-03) |
| P-07 | No se puede reasignar ni desasignar desde la interfaz | La bandeja solo lista `PENDIENTE` | Un error de asignación solo se corrige en base | **ALTA** |
| P-08 | Los conductores encadenan turnos sin control real de descanso | La regla existe pero el criterio es humano | *«trabajan de ocho a una de la mañana y el siguiente día otra vez de ocho a una»* | **ALTA** |
| P-09 | Toda la lógica de encadenamiento es conocimiento tácito | Ver §10 | Riesgo de continuidad operativa | **ALTA** |
| P-10 | La demanda real excede lo que el sistema cuenta | 12 % de actividades ajenas al cuadro | El indicador de capacidad miente por defecto | **MEDIA** |
| P-11 | Ubicaciones y placas sin normalizar | Texto libre | Impide cualquier automatización | **MEDIA** |
| P-12 | Un operativo nocturno del formulario 9 bloquea el cierre | PV-04, contradicción de la fuente | Sin salida por la aplicación | **ALTA** |

---

## 10. Dependencia del conocimiento tácito

Es el riesgo estructural del proceso, y el propio proyecto ya lo sufrió una vez: la persona
que consolidaba el cuadro **renunció durante el levantamiento, sin traspaso**.

### Qué sabe la planificadora que no está escrito en ninguna parte

| Conocimiento | Cita | ¿Convertible? |
|---|---|---|
| Qué placa condujo cada conductor **ayer** | *«si es que él estuvo el anterior día, las 7895 hasta la madrugada… tendría que dejarle con la misma 7895»* | **DATO** — histórico de asignación |
| Qué conductores tienen parqueadero autorizado | *«él no tiene parqueadero seguro… él vive a 2 cuadritas de Quitumbe»* | **DATO** — atributo del conductor |
| Dónde vive cada conductor | Columna DOMICILIO | **DATO** — ya está en el Excel |
| Cuánto se tarda de un punto a otro | *«llega a carretera 100, tipo 6 y media»* (Chocó Andino: 1 h 30 de retorno) | **REGLA + DATO** `[V]` matriz de tiempos |
| Qué operativos son del mismo funcionario | *«es la misma persona… de ley tengo que poner el mismo conductor»* | **REGLA** — derivable del cuadro |
| Qué vehículos están en taller | Mensaje suelto + celda amarilla | **DATO** — mantenimiento |
| Qué conductor es de nombramiento y no puede pasar de 4½ h | *«según su contrato»* | **DATO** — tipo de contrato del conductor |
| Cuándo activar a los libres | Juicio | **DECISIÓN HUMANA** |
| A quién pedir que priorice, y qué sacrificar | Juicio, negociado con DMIP/DMIT | **DECISIÓN HUMANA** |

### El reparto que propongo

- **Debe ser dato**: domicilio del conductor, parqueadero autorizado, tipo de contrato,
  historial de vehículo por conductor, estado de mantenimiento, ubicación de reposo.
- **Debe ser regla**: no cruzar horarios (conductor **y** vehículo), mismo funcionario →
  mismo conductor, continuidad del vehículo que se lleva a casa, descanso mínimo entre turnos.
- **Debe ser control (aviso, no bloqueo)**: distancia entre operativos encadenados, exceso de
  demanda sobre capacidad, jornada acumulada.
- **Debe seguir siendo humano**: activar libres, negociar la priorización, decidir el
  vehículo compartido, y **la asignación final**. `[P]` **El sistema no debe asignar
  automáticamente**: la evidencia muestra un problema de optimización con restricciones
  blandas que la planificadora resuelve negociando. Debe proponer y avisar, no decidir.

---

## 11. Vehículos — qué necesita DAF frente a lo que existe

`t_vehiculo` tiene **cuatro columnas**: id, placa, descripción, activo `[C]`.

| Dato | ¿Lo necesita DAF? | Evidencia | Existe |
|---|---|---|---|
| Placa | Sí | Excel | **Sí** |
| Estado (activo/baja) | Sí | — | **Sí** |
| **Ubicación actual / de reposo** | **Sí, crítico** | Columna COORDINACIÓN, 393 filas | **No** |
| **En mantenimiento, con fecha y taller** | **Sí, crítico** | `CITA AMBACAR 08H00`, `TALLER SINIESTRO` | Solo como fila de `t_disponibilidad`, sin taller ni hora |
| **Asignación vigente (a qué operativos)** | **Sí** | *«ese carro no se le ocupe ese día»* | **No consultable por DAF** |
| Conductor que lo tuvo ayer | Sí | *«tendría que dejarle con la misma 7895»* | Derivable del histórico, **no expuesto** |
| Tipo / capacidad de pasajeros | `[V]` | No aparece en la evidencia | **No** |
| Marca, modelo | `[V]` | Solo `AMBACAR` como taller | Cabe en `descripcion` |
| Combustible | **No** en el sistema | Vales de $10 y $20, control aparte de DAF `[C]` | **No, y no debería** `[P]` |
| Kilometraje | No | Mencionado solo como argumento de ahorro | **No** |

## 12. Conductores

`t_conductor`: cédula, nombre, teléfono, licencia, vehículo habitual, activo `[C]`.

| Dato | Necesario | Clasificación | Existe |
|---|---|---|---|
| Nombre, cédula, teléfono | Sí | MAESTRA | **Sí** |
| Licencia | `[V]` nunca se compara con nada | MAESTRA | Sí, sin uso |
| **Sector donde vive** | **Sí, crítico** | **MAESTRA** | **No** |
| **Parqueadero autorizado (sí/no)** | **Sí** | **MAESTRA** | **No** |
| **Tipo de contrato** | **Sí** — limita la jornada | **MAESTRA** | **No** (sí existe para funcionarios) |
| Estado del día: día / noche / libre / vacaciones | **Sí, crítico** | **DISPONIBILIDAD** | Solo ausencias; **no hay turno** |
| Asignaciones del día | Sí | ASIGNACIÓN | Sí, vía operativos |
| Historial de jornadas | Sí | HISTORIAL | **No existe** para conductores |
| Vehículo habitual | Sí | MAESTRA | Sí |

**Ausencia estructural** `[C]`: no hay proyección de carga de conductores equivalente a
`t_historial_jornada`. Por eso **dos de las seis reglas de descanso del conductor no se
pueden aplicar** — tipo de contrato y tope de salidas pesadas.

## 13. Disponibilidad

Hay **tres** conceptos distintos que hoy se mezclan en una sola tabla o no existen:

| Concepto | Qué es | Hoy |
|---|---|---|
| **Ausencia** | Vacaciones, reposo, permiso | `t_disponibilidad` `[C]` |
| **Turno** | Día / noche / libre, programado el mes anterior | **No existe.** Es la hoja maestra del Excel |
| **Mantenimiento** | El vehículo se para, con fecha y taller | Valor de enum, sin gestión `[C]` |

Quién administra cada uno `[C]` / `[V]`:

| Estado | Lo declara | Hoy |
|---|---|---|
| Turno mensual del conductor | **El jefe de DAF** (*«quien crea es nuestro jefe el Javi»*) | Excel externo |
| Vacaciones y permisos | Talento Humano / DAF `[V]` | Excel de DAF |
| Mantenimiento | Taller, avisado por mensaje `[C]` | Mensaje suelto |
| Activación de un libre | La planificadora | Verbal |

## 14. Logística — las cuatro restricciones reales

Ninguna está modelada `[C]`:

1. **Temporal**: no cruzar horarios. *Única implementada, y solo para conductor.*
2. **Geográfica**: el operativo anterior debe terminar donde el siguiente empieza, o cerca.
   *«el EQ8 empieza aquí, si termina en el Eloy Alfaro tiene que venir hasta acá a matriz…
   he perdido una hora y no puedo dar ese carro»*.
3. **De custodia**: el vehículo debe quedar en una zonal concreta, o en casa del conductor si
   tiene parqueadero autorizado; y al día siguiente ese conductor debe recibir **el mismo**.
4. **De persona**: si el funcionario es el mismo en operativos consecutivos, el conductor
   debe ser el mismo.

## 15. Asignación de transporte — la funcionalidad actual

| Aspecto | Estado |
|---|---|
| Contrato | `{conductorId, vehiculoId}`, **dos campos, blindado en cuatro niveles** `[C]` |
| Bandeja | Solo operativos `PENDIENTE`; nocturnos primero |
| Filtros | **Un buscador de texto libre.** Sin filtro por zonal, formulario ni nocturno |
| Vehículos ofrecidos | **Solo los habituales de conductores disponibles** (PV-33) |
| Validaciones al asignar | Ventana, política de vehículo, conductor activo, vehículo sin ausencia, **elegibilidad del conductor** |
| Reasignar / desasignar | **No existe camino en la interfaz** |
| Capacidad de flota | Indicador presente; **la declaración no tiene pantalla** |

**Veredicto** `[P]`: **MODIFICAR, no reemplazar.** El contrato de dos campos y su blindaje
son una decisión de seguridad correcta y bien construida (PER-04, RN-38) que debe
conservarse. Lo que falta no es cambiar la asignación: es **añadir la vista de planificación
que hoy vive en el Excel**, y las validaciones y datos que la sostienen.

## 16. Operativos conjuntos

`[V]` **La evidencia disponible es insuficiente.** En los 30 minutos aparecen dos cosas
distintas que el encargo llama igual:

- **Apoyo entre zonas**: *«el EIQ1 va a brindar apoyo en el Eloy Alfaro… ya sé que aquí no
  tengo que dar carro»*. Un operativo absorbe personal de otro y **comparte vehículo**.
- **Vehículo compartido por acuerdo**: dos operativos distintos, misma hora, distinto lugar,
  que aceptan compartir. *«ellos me dicen: no es un macrooperativo, entonces prioricen»*.

No hay evidencia sobre quién lo solicita, quién lo aprueba ni cuándo se consolida. **Debe
levantarse en la segunda reunión.** El sistema sí tiene `SolicitudApoyo` (RF-060 a RF-063),
pero no está verificado que sea lo mismo.

## 17. Seguridad y visibilidad

| Rol | Consultar | Crear | Modificar | Restringido |
|---|---|---|---|---|
| **DAF** | Los nueve formularios, **sin personal nominal** | No | **Solo conductor y placa** | Matriz consolidada, maestro de personal, órdenes |
| DMIP / DMIT | Sus formularios (+ los nueve en lectura, DMIT) | Sus operativos | Su personal | Lo ajeno |
| Director | Todo | No | No | — |
| Administrador | Catálogos, personal, flota | Sí | Sí | — |

### El conflicto que hay que resolver

DAF **necesita ver qué funcionario va en cada operativo** (§7) y hoy está deliberadamente
excluida de ese dato. Tres salidas `[P]`:

1. Exponer solo **un identificador estable y anónimo** del funcionario, suficiente para
   detectar «es el mismo», sin nombre. **Preserva el aislamiento.**
2. Exponer el nombre a DAF, ampliando PER-04. Cambia la postura de seguridad.
3. Que el sistema **derive la regla** y avise «este operativo lleva al mismo funcionario que
   el de las 20H00», sin mostrar quién. **Es la que recomiendo**: resuelve la necesidad sin
   ceder el dato.

---

## 18. Proceso TO-BE

```
CUADRO DE COLORES (DMIP/DMIT cierran su ventana)
        │
        ▼
BANDEJA DE PLANIFICACIÓN DAF  ──  agrupada por ZONAL y HORARIO
        │                          + demanda ajena al cuadro
        ▼
TABLERO DE JORNADA DEL CONDUCTOR  ──  una fila por conductor activo,
        │                              línea de tiempo con huecos libres
        │   al arrastrar un operativo, el sistema comprueba y AVISA:
        │     · cruce de horario del conductor        (bloquea)
        │     · cruce de horario del vehículo         (bloquea)  ← nuevo
        │     · distancia entre operativos encadenados (avisa)   ← nuevo
        │     · jornada acumulada y descanso           (avisa)
        │     · mismo funcionario en el anterior       (avisa)   ← nuevo
        │     · vehículo en mantenimiento              (bloquea)
        ▼
DESTINO DEL VEHÍCULO  ──  catálogo de zonales + parqueadero autorizado
        │
        ▼
EL CUADRO SE ACTUALIZA SOLO  ──  sin recopiar nombres
        │
        ▼
ORDEN DE SERVICIO (Dirección) — sin cambios
```

**Lo que NO debe hacerse** `[P]`: convertir el Excel en una pantalla. El Excel es una
herramienta de trabajo de una persona; el sistema tiene que modelar **el proceso**:
disponibilidad, encadenamiento y custodia como conceptos propios.

---

## 19. Reglas de negocio propuestas

Solo las sustentadas. Ninguna inventada.

| ID | Regla | Condición | Resultado | Fuente | Estado |
|---|---|---|---|---|---|
| RN-DAF-01 | Un vehículo no puede estar en dos operativos con horarios cruzados | Solapamiento de rango | Rechazo | Transcripción + ausencia en código | **CONFIRMADO** |
| RN-DAF-02 | Si el mismo funcionario cubre operativos consecutivos, debe llevarlo el mismo conductor | Mismo funcionario, horarios contiguos | Aviso `[V]` o rechazo | *«de ley por ley»* | **CONFIRMADO** |
| RN-DAF-03 | El vehículo debe tener destino declarado al terminar la jornada | Fin del último operativo | Campo obligatorio | *«si no se les pone dónde dejar el vehículo se vuelve un despelote»* | **CONFIRMADO** |
| RN-DAF-04 | El conductor con parqueadero autorizado conserva el mismo vehículo al día siguiente | Se llevó el vehículo | Propuesta al planificar | *«tendría que dejarle con la misma 7895»* | **CONFIRMADO** |
| RN-DAF-05 | Un vehículo en mantenimiento no se asigna ese día | Cita o taller vigente | Exclusión | *«ese carro se para totalmente»* | **CONFIRMADO** |
| RN-DAF-06 | El conductor de nombramiento no excede su jornada contractual | Tipo de contrato | Aviso | *«trabajó solo hasta las 4 y media según su contrato»* | **CONFIRMADO** |
| RN-DAF-07 | Dos operativos simultáneos pueden compartir vehículo si ambos lo aceptan | Acuerdo con DMIP/DMIT | Excepción registrada | *«sí, que compartan carro»* | **CONFIRMADO**, mecanismo `[V]` |
| RN-DAF-08 | Cuando la demanda supera la flota, DAF solicita priorización | Capacidad agotada | Solicitud a los departamentos | *«por favor prioricen»* | **CONFIRMADO**, canal `[V]` |
| RN-DAF-09 | El encadenamiento debe respetar el tiempo de traslado entre puntos | Fin en A, inicio en B | **Aviso**, no bloqueo | Chocó Andino, 1 h 30 | **CONFIRMADO**, umbral `[V]` |

## 20. Requerimientos funcionales

Solo los sustentados, en formato abreviado por espacio. El detalle completo (precondiciones,
entradas, validaciones) se redacta tras la segunda reunión.

| ID | Requerimiento | Actor | Regla | Fase |
|---|---|---|---|---|
| RF-DAF-001 | Presentar los operativos agrupados por zonal y horario | DAF | N-01 | **MVP** |
| RF-DAF-002 | Mostrar la jornada de cada conductor activo como línea de tiempo con huecos | DAF | N-02 | **MVP** |
| RF-DAF-003 | Permitir asignar un conductor a varios operativos del día | DAF | N-03 | **MVP** |
| RF-DAF-004 | Impedir asignar un vehículo con horario cruzado | DAF | RN-DAF-01 | **MVP** |
| RF-DAF-005 | Registrar el destino del vehículo al terminar | DAF | RN-DAF-03 | **MVP** |
| RF-DAF-006 | Registrar y consultar el mantenimiento de un vehículo | DAF / Admin | RN-DAF-05 | **MVP** |
| RF-DAF-007 | Permitir a DAF consultar la flota completa | DAF | PV-33 | **MVP** |
| RF-DAF-008 | Ofrecer pantalla para declarar la capacidad de flota | DAF | RF-057 | **MVP** |
| RF-DAF-009 | Permitir reasignar y desasignar transporte | DAF | P-07 | **MVP** |
| RF-DAF-010 | Registrar el turno mensual de los conductores | Jefe DAF | §13 | FASE 2 |
| RF-DAF-011 | Avisar cuando dos operativos encadenados estén lejos | DAF | RN-DAF-09 | FASE 2 |
| RF-DAF-012 | Avisar cuando el operativo siguiente lleve el mismo funcionario | DAF | RN-DAF-02 | FASE 2 |
| RF-DAF-013 | Proponer el mismo vehículo al conductor que lo custodió | DAF | RN-DAF-04 | FASE 2 |
| RF-DAF-014 | Registrar actividades de transporte ajenas al Cuadro | DAF | Hallazgo 5 | FASE 2 |
| RF-DAF-015 | Declarar vehículo compartido entre dos operativos | DAF | RN-DAF-07 | FASE 3 |
| RF-DAF-016 | Solicitar priorización a los departamentos | DAF | RN-DAF-08 | FASE 3 |

## 21. Historias de usuario

**HU-DAF-01 · Encadenar operativos en la jornada de un conductor**
> Como **analista de transporte de DAF**, quiero ver la jornada de cada conductor con sus
> huecos libres, para meter en ellos los operativos que faltan por cubrir.

- CA-01 · La pantalla lista los conductores **activos ese día**, día y noche por separado.
- CA-02 · Cada conductor muestra sus asignaciones ya hechas, en orden y con su horario.
- CA-03 · Al asignar un operativo que **cruza** con otro del mismo conductor, se rechaza y se
  nombra el operativo en conflicto.
- CA-04 · Al asignar un operativo que cruza con otro **del mismo vehículo**, se rechaza igual.
- CA-05 · La jornada acumulada se muestra y avisa al superar el umbral, sin bloquear.

**HU-DAF-02 · Destino del vehículo**
> Como analista, quiero indicar dónde debe quedar cada vehículo al terminar, para que al día
> siguiente esté donde corresponde.

- CA-01 · El destino se elige de un **catálogo** de zonales, no se escribe.
- CA-02 · Si el conductor tiene parqueadero autorizado, se ofrece «domicilio» como destino.
- CA-03 · El destino aparece en la asignación del día siguiente como punto de partida.

**HU-DAF-03 · Vehículo en mantenimiento**
> Como analista, quiero marcar un vehículo como en mantenimiento, para que nadie lo asigne
> ese día.

- CA-01 · Se registra con fecha, hora, taller y motivo.
- CA-02 · El vehículo **desaparece** de las opciones de asignación en ese rango.
- CA-03 · Si ya estaba asignado, el sistema lo señala y pide reasignar.

**HU-DAF-04 · Escenario «no alcanza»**
> Como analista, quiero ver cuándo la demanda supera mi flota, para pedir priorización a
> tiempo.

- CA-01 · La pantalla compara demanda contra capacidad declarada.
- CA-02 · La demanda incluye **las actividades ajenas al Cuadro**.
- CA-03 · El aviso no bloquea la asignación (RN-46).

## 22. Estados

`[P]` Propuesta mínima. **No se asumen estados**: los actuales son tres y no cubren la
reasignación ni la cancelación.

| Estado | Quién modifica | Transiciones | Restricción |
|---|---|---|---|
| `PENDIENTE` | — (nace así) | → ASIGNADO, → PROPIOS_MEDIOS | RN-40 |
| `ASIGNADO` | DAF | → PENDIENTE (desasignar) `[P]`, → ASIGNADO (reasignar) `[P]` | Hoy sin camino en la interfaz |
| `PROPIOS_MEDIOS` | DAF | → PENDIENTE `[P]` | No permitido en nocturno con condicionante |

`[V]` **Falta decidir** si hace falta un estado para «vehículo compartido» y otro para
«pendiente de priorización».

## 23. Validaciones y conflictos

| Conflicto | ¿Confirmado? | ¿Existe hoy? | Acción |
|---|---|---|---|
| Mismo conductor, horarios cruzados | **Sí** | **Sí** (VAL-21) | Mantener |
| **Mismo vehículo, horarios cruzados** | **Sí** | **NO** | **Crear — MVP** |
| Vehículo en mantenimiento | **Sí** | Parcial (lee, no se registra) | Completar |
| Conductor no disponible | **Sí** | Sí (VAL-19) | Mantener |
| Jornada máxima del conductor | Sí | Sí (VAL-22) | Mantener |
| Patrulla consecutiva | Sí | Sí (VAL-20) | Mantener |
| **Distancia entre operativos encadenados** | **Sí** | **NO** | **Crear — aviso, Fase 2** |
| **Mismo funcionario, conductor distinto** | **Sí** | **NO** | **Crear — Fase 2** |
| Capacidad de pasajeros del vehículo | `[V]` | No | No hacer sin evidencia |
| Licencia incompatible con el vehículo | `[V]` | No | No hacer sin evidencia |
| Operativo cancelado o con horario cambiado | `[V]` | No | **Preguntar** |

## 24. Trazabilidad

```
CUADRO DE COLORES → OPERATIVO (identificador) → ASIGNACIÓN → CONDUCTOR
                                                     │           VEHÍCULO
                                                     │           DESTINO
                                                     ▼
                                            ORDEN DE SERVICIO
```

**Hoy la cadena se rompe entre OPERATIVO y ASIGNACIÓN**, porque el instrumento de DAF no
lleva el identificador. Lo que hay que conservar `[P]`: identificador del operativo,
conductor, vehículo, destino, momento de la asignación y **quién la hizo**.

`[V]` **Sin evidencia sobre qué ocurre cuando el operativo cambia** de horario o ubicación
después de asignado. Es la pregunta Q-10 y Q-11.

## 25. Modelo conceptual

Entidades **nuevas** que la evidencia sostiene:

| Entidad | Propósito | Datos | Sustento |
|---|---|---|---|
| **UbicacionFlota** | Catálogo de zonales donde reposa un vehículo | nombre, activo | 393 filas del Excel `[C]` |
| **MantenimientoVehiculo** | El vehículo se para | vehículo, desde, hasta, taller, motivo | `CITA AMBACAR 08H00` `[C]` |
| **TurnoConductor** | Programación mensual | conductor, fecha, turno (día/noche/libre/vacaciones) | Hoja maestra `[C]` |
| **DestinoVehiculo** | Dónde queda al terminar | operativo o jornada, ubicación, ¿domicilio? | Columna COORDINACIÓN `[C]` |

Entidades **a extender**:

| Entidad | Campos nuevos | Sustento |
|---|---|---|
| `Conductor` | sector de vivienda, parqueadero autorizado, tipo de contrato | Excel + transcripción `[C]` |
| `Vehiculo` | — `[V]` capacidad y tipo solo si la segunda reunión los sustenta | — |

`[V]` **No propongo** una entidad «Planificación» ni «OperativoConjunto**: la evidencia no
alcanza para definirlas.

## 26. Pantallas propuestas

| Pantalla | Objetivo | Actor | Estado |
|---|---|---|---|
| **Tablero de jornada** (nueva) | Ver y encadenar la jornada de cada conductor | DAF | **MVP** |
| Asignación de transporte (P-03) | Se mantiene como vista por operativo | DAF | **Modificar**: filtros por zonal, reasignación |
| **Declaración de capacidad** (nueva) | Declarar vehículos y conductores hábiles | DAF | **MVP** — hoy no existe |
| **Mantenimiento de vehículos** (nueva) | Registrar paradas | DAF / Admin | **MVP** |
| **Turnos de conductores** (nueva) | Cargar el rol mensual | Jefe DAF | Fase 2 |
| Administración de flota (P-12) | Catálogo | Admin | Mantener; añadir campos nuevos |

## 26bis. El sistema de órdenes de movilización — `vehiculos-sigoc`

La analista lo señaló como posible solución: *«si él ya tiene esta organización, yo quizás
podría reutilizar eso»*. **Lo analicé. Está en producción y tiene lo que a nosotros nos
falta, pero no es el tablero que ella describió.**

### Qué es

NestJS 11 + Prisma 7 + PostgreSQL 18 + React 19, de **Juan C. Estevez**, desplegado en
`https://vehiculos-sigoc.quito.gob.ec`. Mismo Auth central, misma red Docker `amc`, mismo
fileserver institucional. Base de datos **propia y aislada**: la integración sería por HTTP.

### Lo que ya resuelve, y nosotros no

| Capacidad | `vehiculos-sigoc` | Nuestro módulo |
|---|---|---|
| **Catálogo de flota con datos reales** | **32 vehículos con placa, marca, modelo, VIN, motor, cilindraje, kilometraje** | **0 registros** (PV-03) |
| **Catálogo de conductores** | ~94, resueltos contra el Auth | **0 registros** |
| **Conflicto de vehículo** | **Sí**, con solapamiento real | **No existe** |
| Conflicto de conductor | Sí | Sí |
| **Conflicto dentro del lote** que se está planificando | **Sí**, O(n²) antes de tocar la base | No aplica |
| **Advertencias con confirmación explícita y auditada** | **Sí** — `conflictosAceptados` en JSONB | No |
| Orden de movilización con firma electrónica y envío por correo | Sí | Fuera de alcance (EXC-01) |
| Endpoint de disponibilidad reutilizable | **`GET /approvals/availability`** | — |

**El patrón de advertencias merece copiarse tal cual** `[P]`: el sistema no prohíbe, enumera
los conflictos, exige confirmación explícita y **guarda cuáles se aceptaron**. Es exactamente
lo que DAF necesita —restricciones blandas que ella negocia— y encaja con RN-46
(«advierte, sin bloquear»).

### Lo que NO tiene, y la analista recordaba que sí

| Recuerdo de la reunión | Realidad `[C]` |
|---|---|
| *«era como un tipo tetris… yo iba jalando»* | **No hay arrastrar y soltar.** Son selects y modales. Cero ocurrencias de `drag`/`drop`/`kanban` en todo el frontend |
| *«tomara en cuenta la ruta distante»* | **No existe.** Sin distancias, coordenadas ni tiempos de traslado. Lo más parecido es el aviso `zonales_multiples`: «La orden incluye operativos de varias zonales», que es dispersión **administrativa**, no física |

Tampoco tiene: mantenimiento, turnos, jornada, descanso, ni validación de licencia caducada
—aunque guarda la fecha—.

### Y lo que le falta para nuestro caso

Su modelo es **una orden = un vehículo + un conductor + un rango**. Es el mismo 1:1 que ya
tenemos. **No modela la jornada encadenada del conductor**, que es el hallazgo central de
este levantamiento. Reutilizarlo resolvería el catálogo y las validaciones; **no resolvería
el problema de fondo**.

### Tres caminos `[P]`

| Camino | Qué implica | Riesgo |
|---|---|---|
| **A · Consumir su catálogo** vía `GET /catalogos/scope/vehiculos/{vehiculos,conductores}` del Auth | Cierra PV-03 **sin capturar nada a mano**. Es el camino más corto a tener datos reales | Dependencia dura del Auth en el camino caliente. Hay que acordar quién es dueño del dato |
| **B · Copiar el patrón de validación** de conflictos y advertencias aceptadas | Cierra el hueco de la doble asignación de vehículo con un diseño ya probado en producción | Ninguno relevante. **Recomendado** |
| **C · Integrar los dos sistemas** | Ambicioso: una orden de movilización por cada asignación del cuadro | Alcance grande, y EXC-01 declara la orden de movilización **fuera de alcance** |

**Recomiendo A + B ahora, y llevar C a la mesa con Juan Carlos y el PO**, que es justo la
reunión que la analista quedó en pedir.

### Dos advertencias

- **`users_pending.md` tiene 33 conductores con cédula, nombre y teléfono reales versionados
  en Git** `[C]`. Es el mismo patrón del `.env` con secretos que ya reportamos. Conviene
  avisar a ese equipo.
- Ese repositorio contiene además **una copia de `CUADRO DE COLORES.xlsx`** en `config/docs/`.
  Los dos equipos están trabajando sobre el mismo insumo sin saberlo `[C]`.

## 27. Excel frente a sistema

| Información del Excel | ¿Existe? | Necesaria | Automatizable | Acción | Prioridad |
|---|---|---|---|---|---|
| Conductor | Sí | Sí | — | Mantener | — |
| Placa | Sí | Sí | — | Mantener | — |
| **Sector donde vive** | **No** | Sí | Sí | **Campo nuevo** | Alta |
| **Actividad con varios horarios** | Parcial | Sí | Sí | **Descomponer en asignaciones** | Alta |
| **Coordinación (destino)** | **No** | Sí | Sí | **Catálogo + campo** | Alta |
| **Cambio de custodio** | **No** | Sí | **Derivable** | Calculado | Media |
| Turno mensual | **No** | Sí | Sí | Entidad nueva | Media |
| Vehículos en taller | Parcial | Sí | Sí | Entidad nueva | Alta |
| Vehículos sin asignar y su ubicación | **No** | Sí | **Derivable** | Calculado | Media |
| Jornadas estándar (08H00-16H30…) | No | `[V]` | — | **Preguntar** | — |
| Vales de combustible | **No** | **No** `[P]` | — | **No trasladar** | — |

## 28. Sistema actual frente a necesidad de DAF

| Funcionalidad actual | Necesidad | Diferencia | Acción |
|---|---|---|---|
| Bandeja por operativo | Tablero por conductor | **Distinto objeto** | **NUEVA** |
| Contrato de dos campos | Igual | Ninguna | **MANTENER** |
| Validación de conductor | Igual | Ninguna | **MANTENER** |
| — | Validación de vehículo | **Falta** | **NUEVA** |
| Vehículos habituales | Flota completa | Falta | **MODIFICAR** |
| Indicador de capacidad | Igual | **Falta la declaración** | **MODIFICAR** |
| Mantenimiento por SQL | Con pantalla | Falta | **NUEVA** |
| Sin reasignación | Con reasignación | Falta | **MODIFICAR** |

## 29-31. MVP y fases

**MVP** — resuelve P-01 a P-07: tablero de jornada, validación de vehículo, destino del
vehículo, mantenimiento, flota completa para DAF, declaración de capacidad, reasignación.

**Fase 2** — turnos mensuales, aviso de distancia, aviso de mismo funcionario, continuidad
del vehículo, actividades ajenas al Cuadro.

**Fase 3** — vehículo compartido, solicitud de priorización, integración con órdenes de
movilización (§32).

---

## 32. Preguntas para la segunda reunión

| ID | Pregunta | Por qué | Prioridad |
|---|---|---|---|
| Q-01 | ¿Cuáles son **todas** las zonales donde puede quedar un vehículo? El Excel muestra cinco; usted mencionó cuatro | Define el catálogo | **CRÍTICA** |
| Q-02 | ¿Qué conductores tienen parqueadero autorizado, y quién lo decide? | Campo maestro y RN-DAF-04 | **CRÍTICA** |
| Q-03 | ¿Cuánto tiempo de traslado considera aceptable entre dos operativos encadenados? | Umbral de RN-DAF-09 | **CRÍTICA** |
| Q-16 | **¿Dónde TERMINA un operativo?** La versión nueva del cuadro da zonal y punto de encuentro, que dicen dónde empieza. Usted encadena razonando sobre dónde acaba | Sin esto no hay encadenamiento geográfico posible. Ver §7.0.1 | **CRÍTICA** |
| Q-04 | ¿Quién informa que un vehículo entra a taller, y por qué canal? ¿Y cuando sale? | Diseño del mantenimiento | **CRÍTICA** |
| Q-05 | ¿Le basta con saber que «es el mismo funcionario», o necesita el nombre? | Decide el conflicto de §17 | **CRÍTICA** |
| Q-06 | ¿Qué pasa si un operativo cambia de horario o de punto después de asignado? | Trazabilidad, §24 | **CRÍTICA** |
| Q-07 | ¿Quién aprueba la planificación final, y en qué momento deja de ser editable? | No hay evidencia | **CRÍTICA** |
| Q-08 | Las actividades ajenas al cuadro (trabajo comunitario, Secretaría General, traslados) — ¿deben entrar al sistema? | 12 % de la demanda | **IMPORTANTE** |
| Q-09 | ¿Existe regla escrita de descanso mínimo entre turnos de conductor? | Hoy es juicio | **IMPORTANTE** |
| Q-10 | ¿Puede un vehículo servir dos operativos simultáneos, y quién lo autoriza? | RN-DAF-07 | **IMPORTANTE** |
| Q-11 | ¿Qué vehículos pueden usarse para cada tipo de operativo? ¿Importa el tipo o la capacidad? | Decide si `Vehiculo` crece | **IMPORTANTE** |
| Q-12 | ¿Cómo se solicita y aprueba hoy un operativo conjunto? | §16 sin evidencia | **IMPORTANTE** |
| Q-13 | ¿El control de combustible debe entrar al sistema? | Hoy es proceso aparte | **DESEABLE** |
| Q-14 | ¿Las jornadas estándar (08H00-16H30 / 17H30-02H00) son fijas o cambian? | Modelo de turnos | **DESEABLE** |
| Q-15 | Formulario 9 (AMC-CBQ): ¿lleva vehículo o no? Hoy bloquea el cierre de la jornada | PV-04, bloqueante | **CRÍTICA** |

## 33. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | **Continuidad**: una sola persona sabe encadenar la jornada | **Crítico** — ya ocurrió con quien consolidaba el cuadro | Convertir a datos y reglas lo del §10 |
| R-02 | El sistema se diseña sobre el 1:1 y no se adopta | Alto | Modelar la jornada del conductor |
| R-03 | Automatizar la asignación sin entender los criterios | Alto | El sistema propone y avisa; **no decide** |
| R-04 | Trasladar el Excel tal cual, con su texto libre | Medio | Catálogos y normalización |
| R-05 | La evidencia está incompleta (media reunión, sin el Cuadro) | Medio | Segunda reunión, §32 |
| R-06 | PV-03 sigue abierto: `t_conductor` y `t_vehiculo` con **0 registros** | **Crítico** — DAF no puede asignar nada hoy | Pedir el catálogo a DAF |
| R-07 | El formulario 9 bloquea el cierre de jornada | Alto | Q-15, es un `UPDATE` |

## 34. Recomendaciones

1. **PV-03 puede cerrarse esta semana, y no capturando datos a mano.** El catálogo de flota
   existe en producción en `vehiculos-sigoc`, con las **mismas placas** que usa DAF, y el
   Auth central ya lo expone como catálogo. Es el desbloqueo de mayor impacto y menor coste
   del proyecto: hoy la DAF **no puede asignar absolutamente nada** porque las tablas están
   vacías. **Primera acción: reunión con Juan Carlos y el PO para acordar quién es dueño del
   dato.**
2. **No confundir el arreglo con el rediseño.** Hay seis huecos que se cierran en días
   —validación de vehículo, pantalla de capacidad, flota visible para DAF, mantenimiento,
   reasignación, y el catálogo del punto 1— y **un rediseño real**, el tablero de jornada,
   que exige la segunda reunión. No mezclarlos en un mismo entregable.
3. **Copiar el patrón de advertencias de `vehiculos-sigoc`**: enumerar conflictos, exigir
   confirmación explícita y **guardar cuáles se aceptaron**. Encaja con RN-46 y con la forma
   real de trabajar de DAF, que negocia restricciones en vez de obedecerlas.
4. **Cerrar la novena columna del cuadro**: el teléfono del conductor (§7.0.2). Es el
   mismo cambio que se hizo para el personal, el dato ya existe, y deja la Hoja2
   implementada al 100 %.
5. **Resolver PV-04 antes de cualquier otra cosa**: hoy un operativo nocturno de CBQ deja la
   jornada sin poder cerrarse y no hay salida por la aplicación. Es un `UPDATE` de una fila,
   pero es decisión del negocio.
6. **Llevar a la segunda reunión las 16 preguntas del §32**, y en particular **Q-05**, que
   decide si se rompe o se preserva el aislamiento del personal frente a la DAF. Es la única
   que cambia una postura de seguridad, y hay una tercera salida que no obliga a elegir
   (§17, opción 3).
7. **Advertir a los dos equipos de dos fugas de datos personales en repositorios**: los 33
   conductores de `users_pending.md`, y —de nuestro lado— el `.env` versionado que ya
   reportamos.

---

> **Nota de método.** Este documento distingue en cada afirmación entre lo confirmado, lo
> inferido, lo propuesto y lo pendiente. Las cifras del §6 salen de contar el libro
> completo, no de una muestra. Donde la evidencia no alcanza —aprobación, operativos
> conjuntos, capacidad de los vehículos— **no se ha completado con criterio propio**, y esa
> es la razón de que el §32 tenga quince preguntas.
