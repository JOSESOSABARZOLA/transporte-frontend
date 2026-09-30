# 02 · Manual Operativo

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
El ciclo diario de la jornada · 7 de agosto de 2026

---

## 1. El día del cuadro, hora por hora

El sistema no es un repositorio: es un procedimiento con relojes. Estas son las horas que gobiernan
la jornada, todas evaluadas en **America/Guayaquil**.

| Hora | Quién | Qué ocurre |
|---|---|---|
| — | **Sistema** | **La jornada del día siguiente se abre sola** con el primer operativo que se registre |
| Hasta 15H00 | DMIP Operativos, DMIP Inspecciones, DMIT | Registran sus operativos |
| 15H00 | Sistema | Cierran las ventanas departamentales. El cuadro pasa a **En transporte** |
| 15H00 – 16H30 | DAF | Asigna conductor y placa |
| 16H30 | Sistema | Cierra la ventana de la DAF. El cuadro pasa a **Aprobado** |
| Después | Dirección | Revisa la matriz, exporta, cierra el cuadro |
| Tras el cierre | Dirección | Emite las órdenes de servicio |

Las horas **no están escritas en el código**: viven en parámetros y se cambian desde la pantalla
P-09 sin desplegar nada. Ver `07_Manual_Configuracion.md`.

> **La apertura dejó de ser una tarea de nadie el 11-AGO-2026.** Antes la hacía el administrador
> por API —no había pantalla— y hasta que la hiciera, los tres departamentos no podían registrar
> nada. Esa precondición no venía del negocio: `FASE2` §5.3 la declara disparador del proceso de
> registro pero **no define ningún proceso ni actor que la ejecute**. Ahora el primer operativo del
> día la abre, con su orden de trabajo `AMC-AAAA-MM-DD` derivada de la fecha.
>
> Sigue existiendo `POST /cuadros` para abrir jornadas por adelantado, y la **reapertura** de un
> cuadro cerrado continúa siendo exclusiva de la Dirección.

---

## 2. Los estados del cuadro

El estado no se elige: **lo deriva el sistema** de la hora y de las ventanas.

| Estado | Significado | Quién puede escribir |
|---|---|---|
| **Borrador** | Jornada abierta, ventanas departamentales activas | Los tres departamentos |
| **En transporte** | Venció la carga departamental | Solo la DAF, y solo dos campos |
| **Aprobado** | Venció también la ventana de la DAF | Nadie |
| **Cerrado** | La Dirección firmó la jornada | Nadie. Habilita la emisión de órdenes |

> Una jornada **cerrada** puede reabrirse, y solo la Dirección puede hacerlo. Cada reapertura queda
> contada y auditada: es una excepción con rastro, no un botón de uso corriente.

---

## 3. Quién hace qué

### 3.1. Departamentos de carga

Cada uno es dueño de sus formularios y **no ve los de los demás**. No es una comodidad de
interfaz: el servidor devuelve solo lo que corresponde al rol.

| Rol | Formularios propios |
|---|---|
| DMIP Operativos | 1 Fijos · 2 PMO · 3 Limpiaparabrisas · 4 Patrulla ECU Diurna |
| DMIP Inspecciones | 5 Patrulla Reacción Diurna · 6 Patrulla Reacción Nocturna · 8 Inspecciones |
| DMIT Instrucción | 7 Operativo DMIT · 9 Control AMC-CBQ |

**El formulario 6 es compartido.** El DMIT aporta **una persona** de Instrucción pero no registra
operativos en él. En su selector aparece deshabilitado con el motivo.

### 3.2. DAF

Escribe **dos campos** de los nueve formularios: conductor y placa. La restricción está construida
en cuatro niveles, no en uno: endpoints propios, un contrato de dos propiedades, una escritura
acotada en la base de datos, y una pantalla donde todo lo demás llega deshabilitado.

### 3.3. Dirección

Único perfil que ve el cuadro completo. Revisa, exporta, cierra y emite. **No registra ni edita
operativos.**

### 3.4. Administrador

Catálogos, personal, ventanas y parámetros. **No participa en la jornada**: su ventana está
desactivada a propósito, porque aplicar la restricción horaria a quien configura las ventanas
crearía un cepo del que no se sale desde la aplicación.

---

## 4. Las reglas que protegen a las personas

El sistema rechaza asignaciones que pondrían a alguien en riesgo. Estas reglas **no se pueden
saltar desde la interfaz** porque no viven en la interfaz.

| Regla | Qué impide | Parámetro |
|---|---|---|
| Patrulla consecutiva | Salir en patrulla dos días seguidos | `DIAS_DESCANSO_PATRULLA` = 1 |
| Jornada máxima | Acumular más horas de las permitidas en un día | `JORNADA_MAXIMA_HORAS` = 12 |
| Tope de salidas pesadas | Exceso de salidas nocturnas o de fin de semana | `TOPE_SALIDAS_PESADAS` = 3 |
| Solapamiento | Estar en dos operativos a la vez | — |
| Tipo de contrato | Contrato ocasional en turnos que no admite | — |
| Disponibilidad | Vacaciones, reposo médico, calamidad, permiso | — |

**Son patrulla los formularios 4, 5, 6 y 9.** El bloqueo es **cruzado**: quien salió en cualquiera
de ellos no puede salir en ninguno de los otros al día siguiente.

> **Quien no puede salir aparece en la lista, deshabilitado y con su motivo** —«ya está asignada
> al operativo OCF-001 de 08H00 A 14H30, que se cruza con este horario»—. Desde el **11-AGO-2026**:
> hasta entonces desaparecía sin explicación, que es lo contrario de lo que el análisis quiso.
> Era **PV-37** y **F-08**, ambos resueltos.
>
> Una excepción deliberada: si la persona está ausente, se dice **que no está disponible** y nunca
> la causa. Un reposo médico o una calamidad doméstica no se publican a quien arma el cuadro.

---

## 5. Las alertas del cuadro

Las alertas se calculan en el servidor y se pintan igual en todas las pantallas. Señalan lo que
falta, no lo que está mal.

| Situación | Dónde se ve |
|---|---|
| Operativo sin personal asignado | Celda de personal, en amarillo |
| Falta conductor | Celda de conductor |
| Falta placa | Celda de placa |
| **Nocturno con vehículo obligatorio sin conductor** | Celda con borde marcado. **Impide cerrar el cuadro** |
| Punto o tipo de control sin definir | Su celda |

---

## 6. Solicitudes de apoyo entre direcciones

Un departamento puede solicitar personal a otro. La solicitud se registra y aparece en la bandeja
de la dirección requerida.

> **El flujo está incompleto por decisión pendiente del negocio (PV-12).** Hoy la solicitud se
> registra y se muestra; **no hay aceptación, rechazo ni vencimiento**, y una solicitud equivocada
> no se puede corregir ni anular. Ver `17_KNOWN_ISSUES.md`.

---

## 7. Qué hacer cuando algo se atasca

| Situación | Causa habitual | Acción |
|---|---|---|
| «No hay jornada abierta» | Nadie abrió el cuadro del día | El administrador lo abre |
| «Su ventana cerró a las 15H00» | Pasó la hora | Esperar a mañana, o pedir a la Dirección que reabra |
| «Su perfil no tiene formularios asignados» | Falta la siembra de catálogos | Ver `10_Manual_Soporte.md` |
| El desplegable de puntos está vacío | Falta la matriz zonal ↔ punto (PV-01) | Cargarla desde P-08 |
| No aparece nadie en el selector de personal | El maestro de personal está vacío (PV-02) | Cargarlo desde P-07 |
| No se puede cerrar el cuadro | Hay un nocturno sin conductor | El mensaje nombra el operativo |
| No se puede registrar en los formularios 2, 5, 6, 7 u 8 | Falta el criterio de prefijo (PV-27) | Ver `17_KNOWN_ISSUES.md` |

---

## 8. Registro y trazabilidad

Toda escritura queda auditada con **quién, cuándo, qué entidad y qué cambió**. La traza se escribe
**dentro de la misma transacción** que el dato: no existe la posibilidad de un cambio guardado sin
su rastro.

Dos precisiones deliberadas:

- **El motivo de una ausencia no se copia a la auditoría.** Puede describir una condición de salud.
  Queda constancia de qué se registró, sobre quién y en qué fechas, que es lo que permite pedir
  cuentas.
- **El registro de actividad de las órdenes no incluye nombres.** Deja el identificador del
  operativo y cuántas se emitieron.

Cada petición lleva un **identificador de correlación** (`x-correlation-id`) que aparece en la
respuesta y en el registro del servidor. Es el dato que hay que dar a soporte.

> **No existe pantalla para consultar el historial de auditoría.** Vive en la tabla `t_auditoria` y
> se consulta por base de datos.
