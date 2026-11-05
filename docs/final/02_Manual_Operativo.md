# 02 · Manual Operativo

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
El ciclo diario de la jornada · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Estado: refleja la rama `base/cuadro-colores` (backend `24520af`, frontend `d13a5db`).

---

## 1. El día del cuadro, hora por hora

El sistema no es un repositorio: es un procedimiento con relojes. Estas son las horas que gobiernan
la jornada, todas evaluadas en **America/Guayaquil**. Las horas de la tabla son las de la
configuración inicial; cada ventana se cambia en «Ventanas y parámetros» sin desplegar nada.

| Momento | Quién | Qué ocurre |
|---|---|---|
| Al primer registro | **Sistema** | **La jornada se abre sola** con el primer operativo que se registre para esa fecha. Una fecha pasada no se abre |
| Hasta el cierre de su ventana (15H00) | DMIP Operativos, DMIP Inspecciones, DMIT Instrucción | Registran sus operativos en «Registro de operativo» y los corrigen en «Mis operativos» |
| Cierre del registro | Sistema | El cuadro pasa a **En transporte** |
| Ventana de la DAF (15H00 a 16H30) | DAF | Planifica el transporte en «Planificar el día» y emite las hojas de ruta |
| Cierre de la ventana DAF | Sistema | El cuadro pasa a **Aprobado** |
| Después | Dirección | Revisa la «Matriz Consolidada», exporta el PDF y pulsa «Cerrar cuadro» |
| Tras el cierre | Dirección | Emite las órdenes de servicio en «Órdenes de servicio» |

**La DAF abre cuando cierra el registro.** Si su hora de apertura coincide con el cierre de los
departamentos, la cabecera y el mensaje de ventana cerrada lo dicen así: «… cuando cierra el
registro de operativos» (RN-56). Es una explicación, no una validación: desde el 8 de octubre de
2026 cada ventana se parametriza por separado y el sistema no rechaza un horario por compararlo con
otra ventana.

> **La jornada se abre sola desde el 11-AGO-2026.** Antes la abría el administrador por API y, hasta
> que lo hiciera, nadie podía registrar. `POST /api/v1/cuadros` sigue existiendo para abrir una
> jornada por adelantado (permiso `cuadro:abrir`), sin pantalla.

### 1.1. Los tres tipos de ventana

Cambió el 7 de octubre de 2026. Cada ventana de carga tiene un **tipo**:

| Tipo | Qué significa |
|---|---|
| **Diario (todos los días)** | Aplica todos los días, incluidos fines de semana |
| **Solo días laborables** | Aplica de lunes a viernes; sábado y domingo no se carga. No hay calendario de feriados |
| **Sin restricción** | El rol carga a cualquier hora; no usa horas ni mensaje |

Los tipos heredados «Semanal» e «Intervalo» ya no se ofrecen; las ventanas que los tenían pasaron a
«Diario». El mensaje que ve el funcionario con la ventana cerrada usa los marcadores `{apertura}` y
`{cierre}`, de modo que no vuelve a desalinearse cuando se mueve la hora.

---

## 2. Los estados del cuadro

El estado no se elige: **lo deriva el sistema** de la hora y de las ventanas.

| Estado | Significado | Quién puede escribir |
|---|---|---|
| **Borrador** | Alguna ventana departamental sigue abierta | Los tres departamentos, cada uno en sus formularios |
| **En transporte** | Cerró la carga departamental y la ventana DAF está abierta | La DAF, y solo conductor y vehículo |
| **Aprobado** | Venció también la ventana de la DAF | Nadie, salvo el operativo **adicional** |
| **Cerrado** | La Dirección cerró la jornada | Nadie. Habilita la emisión de órdenes |

Una ventana **sin restricción** no retiene la jornada: si la DAF se dejara así, el cuadro seguiría
avanzando y la Dirección podría cerrarlo.

### 2.1. Qué impide cerrar

«Cerrar cuadro» pide confirmación («¿Cerrar el cuadro del día?», con el número de operativos,
alertas y formularios sin carga) y el servidor lo rechaza, nombrando los operativos, cuando:

- algún operativo con **condicionante nocturno** sigue sin conductor (INV-11);
- algún operativo de formulario compartido sigue **sin el personal que aporta el otro
  departamento**. Desde el 27 de octubre de 2026 se mide **por registro**: una patrulla 5/6 con su
  código de Instrucción (`INECU`) ya cuenta como completa.

Al cerrar, el sistema consolida el historial de la jornada, que alimenta las reglas de descanso del
día siguiente.

### 2.2. Reabrir

Desde el 8 de octubre de 2026 la Dirección tiene el botón **«Reabrir cuadro»** en la Matriz
Consolidada (permiso `cuadro:cerrar-reabrir`). La confirmación dice lo que hace y lo que no:

- el cuadro vuelve a **Aprobado** y se pueden registrar operativos adicionales;
- **no** abre la carga de los departamentos ni la de la DAF, que siguen sus ventanas;
- **no** anula las órdenes ya emitidas;
- el historial del día se descarta y se rehace al volver a cerrarlo (desde el 30 de octubre de 2026).

Cada reapertura queda contada (`cuad_reaperturas`) y auditada.

---

## 3. Quién hace qué

Quién abre cada pantalla lo decide un **permiso**, no el nombre del rol (RBAC, 16-SEP-2026). La
tabla describe los permisos de la siembra; el administrador general los cambia en «Permisos por
rol».

### 3.1. Departamentos de carga

| Rol | Formularios propios | También |
|---|---|---|
| DMIP Operativos | 1 Fijos · 2 PMO · 3 Limpiaparabrisas · 4 Patrulla ECU Diurna | — |
| DMIP Inspecciones | 5 Patrulla Reacción Diurna · 6 Patrulla Reacción Nocturna · 8 Inspecciones | — |
| DMIT Instrucción | 7 Operativo DMIT · 9 Control AMC-CBQ | **Aporta** personal de Instrucción al 4 y al 6 |

- **«Jornada del Día»** la abren los tres desde el 1 de septiembre de 2026, y desde el 15 de
  septiembre cada rol ve **solo sus formularios** (los que escribe o a los que aporta): DMIP
  Operativos 1–4; DMIP Inspecciones 5, 6 y 8; DMIT 4, 6, 7 y 9. El resto ni siquiera viaja.
- **El aporte del DMIT en la patrulla 6** crea su propio código (`INECU-…`) dentro del mismo
  registro. En las tablas se ve «Agregar personal» y «Ver detalle»; no puede eliminar la patrulla.
- **Una patrulla 5/6 o un registro por zonas del 8 es un solo operativo** en la interfaz: «Editar»,
  «Ver detalle» y «Eliminar» actúan sobre todos sus códigos a la vez («¿Eliminar el operativo
  completo?»).

### 3.2. DAF

Escribe **dos campos** de un operativo: conductor y vehículo (RN-40). La garantía sigue en cuatro
niveles: endpoints propios, `ActualizarTransporteDto` con dos propiedades, una escritura acotada en
la base y una interfaz sin ningún control de captura del operativo.

Desde el 8 de octubre de 2026 la DAF no asigna operativo por operativo en una bandeja: asigna
**por tramos** (dejar, retirar, completo) en «Planificar el día» (sección 4). Además administra
«Flota y garajes», «Turnos del mes» y «Traslados entre zonales» con el permiso `flota:administrar`.

### 3.3. Dirección

Único perfil que ve la Matriz Consolidada. Revisa, exporta el PDF, cierra y reabre el cuadro, y
**es el único que emite órdenes de servicio** (desde el 27 de octubre de 2026 lo exige el servidor:
cualquier otro rol recibe 403 «Solo la Dirección emite órdenes de servicio.»). No registra ni edita
operativos.

### 3.4. Administradores

Cuatro roles, ninguno participa en la jornada. El detalle está en `03_Manual_Administrador.md`.

| Rol | Qué administra |
|---|---|
| Administrador DMIP | Personal (sus áreas), catálogos, formularios, ventanas, jornadas laborales, parámetros, roles de Auth y cuentas |
| Administrador DMIT | Personal de Instrucción, su cobertura por turnos y los parámetros de turno de Instrucción |
| Administrador DAF | Flota y garajes, turnos de conductores, traslados y los parámetros `DAF_` |
| Administrador (general) | Todo lo anterior, más «Permisos por rol» y «Carga inicial» |

La ventana de carga de los administradores está desactivada a propósito: aplicar la restricción
horaria a quien configura las ventanas crearía un cepo del que no se sale desde la aplicación.

---

## 4. Planificar el día (DAF)

Rediseñada el 8 de octubre de 2026 como **flujo guiado en cuatro pasos**. El paso no se guarda: se
deriva del resumen de la jornada (`GET /transporte/jornada-daf/:fecha`), así que al volver a la
pantalla se abre donde corresponde.

| Paso | Título en pantalla | Qué hace la DAF |
|---|---|---|
| 1 · Preparar | «Preparar la jornada» | Revisa los requisitos, cada uno con su acción al lado (completar la ficha de un conductor, ir a los turnos, ver la matriz de traslados). Confirma **los vehículos que salen** («Confirmar N vehículos»); los que están en taller aparecen como «En taller: no sale» |
| 2 · Asignar | «Asignar conductores» | «Asignar automáticamente» ejecuta el optimizador sobre los pendientes; después se ajusta a mano desde el cajón de candidatos, con categoría y motivo de cada conductor, en línea de tiempo o en tabla |
| 3 · Fin del día | «Dónde se guarda cada vehículo» | El sistema sugiere el garaje autorizado más cercano a la zona del último operativo; con parqueadero, el **N.º de acta** es obligatorio |
| 4 · Emitir | «Emitir hojas de ruta» | Una hoja por conductor, con estado Pendiente, Emitida o «Pendiente (cambio posterior)» |

La ventana de la DAF no bloquea el paso 1: con la asignación aún cerrada, el aviso lo dice y el
resto se revisa en modo lectura.

### 4.1. Lo que conviene saber al asignar

- **La ocupación sale de los tramos.** Un operativo «Dejar y retirar» ocupa al conductor en sus dos
  traslados y lo deja libre entre medio (desde el 14 de octubre de 2026).
- **Cambiar vehículo.** En el cajón de candidatos se ofrece la flota activa del día; las placas que
  darían conflicto llegan apagadas con su motivo («en taller», «ocupada por …»). Se puede asignar
  sin vehículo, y el operativo sigue pendiente hasta tener placa.
- **Compartir unidad.** Quien registra deja la intención («Solicitar compartir unidad con X») y la
  DAF la ejecuta con «Compartir unidad». Los asientos se cuentan **por momento** (desde el 21 de
  octubre de 2026): a cada hora cuenta quién va a bordo. Si no caben, el motivo lo dice («No caben a
  las 08:00: la unidad llevaría 3 personas y el vehículo tiene 2 asientos.»).
- **Registro agrupado.** Desde el 4 de noviembre de 2026 una patrulla 5/6 (con el código del DMIT
  incluido) y un registro por zonas del 8 son **una sola solicitud** con un conductor y un vehículo.
  Si después cambian, el resumen avisa sin liberar la asignación: «No caben: el registro tiene N
  personas y la PLACA tiene M asientos.» o «El horario del registro ya no coincide con el transporte
  asignado.».
- **Vehículo de otra institución** y **Propios medios** no piden vehículo a la DAF. En la Matriz y
  la Jornada el conductor dice «Otra institución» o «Propios medios» y la placa «No se activa».
- **Cambiar el horario, la zonal o el tipo** de un operativo con transporte asignado lo libera: el
  registro lo confirma y la DAF ve «Transporte liberado».

---

## 5. Las reglas que protegen a las personas

El sistema rechaza asignaciones que pondrían a alguien en riesgo. Estas reglas **no se pueden
saltar desde la interfaz** porque no viven en la interfaz.

### 5.1. Personal del cuadro

| Regla | Qué impide | Parámetro |
|---|---|---|
| Patrulla consecutiva | Salir en patrulla dos días seguidos | `DIAS_DESCANSO_PATRULLA` = 1 |
| Jornada máxima | Acumular más horas de las permitidas en un día | `JORNADA_MAXIMA_HORAS` = 12 |
| Tope de salidas pesadas | Exceso de salidas nocturnas o de fin de semana | `TOPE_SALIDAS_PESADAS` = 3, `PERIODO_COMPUTO_SALIDAS` |
| Solapamiento | Estar en dos operativos a la vez, medido con el horario **de cada persona** | — |
| **Jornada laboral** | Convocar fuera de los días u horas de su jornada, o a quien no tiene jornada | Catálogo de jornadas |
| Disponibilidad | Vacaciones, permiso médico, calamidad doméstica, permiso, licencia, capacitación, comisión de servicios | — |
| Turno de Instrucción | Convocar a Instrucción fuera de su turno de cobertura o en descanso | Turnos de Instrucción |

> **Cambió el 23 de octubre de 2026: la jornada laboral reemplazó al tipo de contrato.**
> Nombramiento y Ocasional se dieron de baja. Cada ficha tiene una jornada del catálogo («Lunes a
> Viernes 8 horas», «Lunes a Domingo 24/7»…). **Sin jornada no se convoca**: el servidor responde
> «no tiene jornada laboral asignada…». La 24/7 sigue sujeta a ausencias, cruce de horario y
> descanso.

**Son patrulla los formularios 4, 5, 6 y 9.** El bloqueo es **cruzado**: quien salió en cualquiera
de ellos no puede salir en ninguno de los otros al día siguiente.

**La carga orienta, no bloquea.** Cada persona disponible muestra su carga de la semana (Baja, Media
o Alta, por número de operativos: `CARGA_OP_MEDIA` y `CARGA_OP_ALTA`, desde el 30 de octubre de
2026) y la ocupación del día («Ocupado 08H00–16H30» o «Se cruza 18H00–22H00»). Quien se cruza va al
final, no se sugiere y, si se elige, apaga el registro hasta corregir el horario.

### 5.2. Conductores

| Regla | Parámetro |
|---|---|
| Patrulla consecutiva y tope de salidas pesadas | Los mismos del personal |
| Jornada del conductor, medida del primer al último tramo | `DAF_MAX_JORNADA_HORAS` (aviso con `DAF_JORNADA_AVISO_HORAS`) |
| Solapamiento entre tramos y «no llega» por traslado | Matriz de traslados entre zonales |
| Jornada laboral, con tolerancia al fin | `MINUTOS_TOLERANCIA_FIN_CONDUCTOR` |
| Ausencia registrada en Flota | — |

> **Quien no puede salir aparece en la lista, deshabilitado y con su motivo.** Desde el
> 11-AGO-2026 (PV-37, F-08). Una excepción deliberada: si la persona está ausente, se dice **que no
> está disponible** y nunca la causa. Un permiso médico o una calamidad doméstica no se publican a
> quien arma el cuadro.

---

## 6. Las alertas del cuadro

Las alertas se calculan en el servidor y se pintan igual en todas las pantallas. Señalan lo que
falta, no lo que está mal.

| Código | Situación | Dónde se ve |
|---|---|---|
| ALV-01 | Operativo sin personal asignado | Celda de personal |
| ALV-02 | La DAF todavía no asignó conductor | Celda de conductor |
| ALV-03 | Falta la placa | Celda de placa |
| ALV-04 | **Nocturno sin conductor**. **Impide cerrar el cuadro** | Celda con borde marcado |
| ALV-06 | Punto o tipo de control capturado como adicional, fuera del catálogo | Su celda |
| ALV-07 | **Transporte liberado**: el registro cambió el tipo con la asignación hecha | Celda de conductor |

Las alertas de transporte no se calculan para «Propios medios» ni para «Vehículo de otra
institución», que no piden vehículo a la DAF.

**La composición de una patrulla se informa, no se alerta.** Quien registra ve una nota en
Observaciones con el área que falta; quien aporta (el DMIT) ve el pendiente en su jornada. Ninguna
de las dos bloquea el registro (PV-29).

---

## 7. Solicitudes de apoyo entre direcciones

El servidor registra solicitudes de personal a otra dirección (`POST /operativos/:id/apoyo`,
`GET /solicitudes-apoyo`). **Ninguna pantalla las ofrece**: se usan solo por API.

> **El flujo está incompleto por decisión pendiente del negocio (PV-12).** No hay aceptación,
> rechazo ni vencimiento, y una solicitud equivocada no se puede corregir ni anular. Ver
> `17_KNOWN_ISSUES.md`.

---

## 8. Qué hacer cuando algo se atasca

| Situación | Causa habitual | Acción |
|---|---|---|
| «La jornada del … ya pasó y no puede abrirse» | Se intentó registrar en una fecha pasada | Registrar en la fecha correcta |
| Mensaje de ventana cerrada | Pasó la hora del rol | Esperar a la próxima apertura, o un adicional si el formulario lo admite (PMO e Inspecciones) |
| «Su perfil no registra operativos en ningún formulario del cuadro.» | La cuenta no tiene un rol departamental | Revisar la cuenta en «Cuentas del cuadro» |
| «… tiene turno de descanso ese día en la cobertura por turnos de Instrucción…» | La persona de Instrucción descansa ese día | Cambiar el turno en «Cobertura por turnos» o elegir a otra persona |
| El desplegable de puntos está vacío | El formulario no tiene puntos en esa zonal | Cargarlos en «Catálogos del cuadro» (PV-01) |
| Una persona no aparece en el selector | No tiene ficha, está de baja o no tiene jornada laboral | «Personal y disponibilidad»; la ficha dice «⚠ Sin jornada» |
| Un conductor no se ofrece a la DAF | Sin jornada, ausente, de baja o fuera de turno | «Flota y garajes» y «Turnos del mes» |
| Un vehículo no se ofrece | Está en taller ese día o de baja | «Flota y garajes» › Vehículos, columna Disponibilidad |
| No se puede cerrar el cuadro | Nocturno sin conductor o aporte compartido pendiente | El mensaje nombra los operativos |
| «Revise los horarios» en el pie del registro | Una persona se cruza con otro operativo | Cambiar el horario o quitarla |
| No se puede registrar en el formulario 7 | Falta el criterio de prefijo (PV-27, abierto solo para el 7) | Ver `17_KNOWN_ISSUES.md` |

---

## 9. Registro y trazabilidad

Toda escritura queda auditada con **quién, cuándo, qué entidad y qué cambió**. La traza se escribe
**dentro de la misma transacción** que el dato: no existe la posibilidad de un cambio guardado sin
su rastro. También dejan traza las asignaciones del optimizador, el cambio de parámetros (uno por
clave) y la matriz de traslados (con su valor anterior).

Dos precisiones deliberadas:

- **El motivo de una ausencia no se copia a la auditoría**, ni de una persona ni de un conductor.
  Puede describir una condición de salud.
- **El registro de actividad de las órdenes no incluye nombres.** Deja el identificador del
  operativo y cuántas se emitieron.

Cada petición lleva un **identificador de correlación** (`x-correlation-id`) que aparece en la
respuesta y en el registro del servidor. Es el dato que hay que dar a soporte; los mensajes de error
lo muestran en «Ver detalle».

> **No existe pantalla para consultar el historial de auditoría.** Vive en la tabla `t_auditoria` y
> se consulta por base de datos.
