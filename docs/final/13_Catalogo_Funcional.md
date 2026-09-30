# 13 · Catálogo Funcional

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Qué hace el sistema, funcionalidad por funcionalidad · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## Cómo leer este catálogo

| Marca | Significado |
|---|---|
| ✅ | Implementado y verificado |
| ⚠️ | Implementado con una limitación conocida |
| ⏳ | Implementado pero **sin datos** para usarlo |
| ❌ | No implementado |

---

## 1. Jornada · el cuadro diario

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 1.1 | Abrir la jornada de una fecha | ⚠️ | API. **Sin pantalla** |
| 1.2 | Consultar el estado de la jornada | ✅ | Cabecera de todas las pantallas |
| 1.3 | Derivar el estado desde las ventanas | ✅ | Automático |
| 1.4 | Cerrar el cuadro | ✅ | P-04 |
| 1.5 | Impedir el cierre con nocturnos sin conductor | ✅ | P-04, mensaje que nombra el operativo |
| 1.6 | Reabrir el cuadro | ⚠️ | API. Solo Dirección. **Sin pantalla** |
| 1.7 | Contar las reaperturas | ✅ | Como evidencia |

**Estados:** Borrador → En transporte → Aprobado → Cerrado.
La orden de trabajo **la genera el sistema** con el formato `AMC-AAAA-MM-DD` (PV-28, resuelto el
07-AGO-2026). Solo expone el día en la matriz consolidada; no participa en ninguna regla.

---

## 2. Registro de operativos

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 2.1 | Ofrecer solo los formularios del rol | ✅ | P-01 |
| 2.2 | Mostrar los compartidos deshabilitados con su motivo | ✅ | P-01 |
| 2.3 | Generar identificador y secuencial diario | ⚠️ | Falla en 5 de 9 formularios (PV-27) |
| 2.4 | Horario en intervalos de media hora | ✅ | P-01 |
| 2.5 | Admitir el cruce de medianoche | ✅ | 22H00 a 02H00 es válido |
| 2.6 | Cascada formulario → zonal → punto | ⚠️ | Funciona. **Solo con los puntos ya cargados**: el catálogo institucional sigue pendiente (PV-01) |
| 2.7 | Captura libre `ADICIONALES` | ✅ | Solo formularios 2 y 8 |
| 2.8 | Varias zonales por operativo | ⚠️ | El contrato las admite; **la interfaz ofrece una** (PV-31) |
| 2.9 | Instituciones participantes | ✅ | Al menos una |
| 2.10 | Asignar personal con su veredicto | ⚠️ | Funciona. La base de personal apenas empezó a cargarse (PV-02) |
| 2.11 | Mostrar al no elegible con su motivo | ✅ | **Resuelto el 11-AGO-2026.** Llegan todos con `elegible` y `motivo` (PV-37, F-08). La causa de una ausencia no se publica |
| 2.12 | Editar un operativo | ✅ | P-02, mismas validaciones |
| 2.13 | Retirar un operativo | ✅ | **Borrado real si no tiene órdenes emitidas**; si las tiene, baja lógica (PV-10) |
| 2.14 | Bloqueo optimista | ✅ | Columna `version` |
| 2.15 | Campos calculados como distintivos | ✅ | Fuera del tabulador |

---

## 3. Reglas que protegen a las personas

| # | Regla | Estado | Parámetro |
|---|---|---|---|
| 3.1 | Patrulla consecutiva (RN-24) | ✅ | `DIAS_DESCANSO_PATRULLA` |
| 3.2 | Tope de salidas pesadas (RN-25) | ✅ | `TOPE_SALIDAS_PESADAS`, `PERIODO_COMPUTO_SALIDAS` |
| 3.3 | Tipo de contrato y turno (RN-26) | ⚠️ | Sin masa crítica de personal para ejercitarlo (PV-02) |
| 3.4 | Jornada máxima (RN-36) | ✅ | `JORNADA_MAXIMA_HORAS` |
| 3.5 | Solapamiento horario | ✅ | — |
| 3.6 | Disponibilidad vigente | ✅ | Vacaciones, reposo, calamidad, permiso |
| 3.7 | Descanso del conductor | ✅ | Solapamiento y jornada |
| 3.8 | Área admitida por formulario | ✅ | — |
| 3.9 | Cupo del rol compartido (PER-06) | ⚠️ | Una persona, provisional (PV-09) |
| 3.10 | Composición de patrulla (RN-31, RN-32) | ⚠️ | **Se informa, no bloquea** (PV-29) |

**Son patrulla los formularios 4, 5, 6 y 9**, decidido por el Product Owner el 07-AGO-2026. El
bloqueo es **cruzado** entre ellos.

---

## 4. Asignación de transporte

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 4.1 | Bandeja de pendientes, nocturnos primero | ✅ | P-03 |
| 4.2 | Panel con solo dos campos editables | ✅ | P-03 |
| 4.3 | Proponer la placa del vehículo habitual | ✅ | P-03 |
| 4.4 | Elegir un vehículo distinto | ⚠️ | **Solo los que son habituales de alguien** (PV-33) |
| 4.5 | Presentar el rechazo por descanso | ✅ | Conserva la selección |
| 4.6 | Marcar propios medios | ✅ | Sin asignar vehículo |
| 4.7 | Indicador de flota | ✅ | Avisa, **no bloquea** |
| 4.8 | Declarar la capacidad de flota | ❌ | El endpoint existe; **ninguna pantalla lo ofrece** |
| 4.9 | Solo lectura fuera de la ventana | ✅ | Distingue «aún no» de «ya no» |

---

## 5. Matriz consolidada

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 5.1 | Los nueve formularios en una tabla | ✅ | P-04, solo Dirección |
| 5.2 | Banner con el color del servidor | ✅ | Más número, nombre y nombre del color |
| 5.3 | Fila de evidencia del formulario sin carga | ✅ | Con responsable y hora de cierre |
| 5.4 | Celdas con alerta y su motivo | ✅ | Texto además del color |
| 5.5 | Alerta crítica distinguible | ✅ | `ring`, que no desalinea la fila |
| 5.6 | Filtro por formulario | ✅ | En memoria |
| 5.7 | Exportar a PDF horizontal | ⚠️ | **Sin logotipo** (PV-30) |
| 5.8 | Indicadores de cabecera | ✅ | Operativos, alertas, flota, estado |

---

## 6. Órdenes de servicio

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 6.1 | Emitir una orden por funcionario | ✅ | P-05, solo Dirección |
| 6.2 | Dato aislado de cuatro campos | ✅ | INV-24 |
| 6.3 | Vista previa antes de emitir | ✅ | Muestra qué dirá cada hoja |
| 6.4 | Bloquear la emisión sin personal | ✅ | Con la explicación en el `title` |
| 6.5 | Bloquear la emisión con el cuadro abierto | ⚠️ | **Regla solo de interfaz** (PV-34) |
| 6.6 | Reemitir conservando la anterior | ✅ | Queda «Sustituida» |
| 6.7 | Consultar las órdenes propias | ⏳ | **No funciona**: falta el enlace usuario ↔ ficha |
| 6.8 | Descargar el PDF de una orden propia | ⏳ | Ídem |
| 6.9 | Entrega por otro canal | ❌ | Sin definir (PV-07) |

---

## 7. Administración

### 7.1. Personal · P-07

| # | Funcionalidad | Estado |
|---|---|---|
| 7.1.1 | Listar con filtros por área, contrato y estado | ✅ |
| 7.1.2 | Alta de funcionario | ✅ |
| 7.1.3 | Edición (sin cambiar la cédula) | ✅ |
| 7.1.4 | Baja lógica con confirmación | ✅ |
| 7.1.5 | Registrar y retirar ausencias | ✅ |
| 7.1.6 | Distintivo de ausencia vigente | ⚠️ | Consulta por página (PV-35) |
| 7.1.7 | Listado global de ausencias | ❌ | El contrato las entrega por persona |
| 7.1.8 | Enlazar usuario con ficha | ❌ | **Bloquea P-06** |

### 7.2. Catálogos · P-08

| # | Funcionalidad | Estado |
|---|---|---|
| 7.2.1 | Administrar por formulario | ✅ |
| 7.2.2 | Alta de punto con su zonal | ✅ **Es donde se carga PV-01** |
| 7.2.3 | Alta de tipo de control e institución | ✅ |
| 7.2.4 | Edición | ✅ |
| 7.2.5 | Desactivación con aviso de usos históricos | ✅ |
| 7.2.6 | **Reactivación** | ❌ | No hay `GET` de administración (PV-36) |
| 7.2.7 | Re-delimitar un valor a otro formulario | ❌ | El contrato no lo admite |

### 7.3. Ventanas y parámetros · P-09

| # | Funcionalidad | Estado |
|---|---|---|
| 7.3.1 | Ver las seis ventanas con su horario | ✅ |
| 7.3.2 | Editar horario, mensaje y estado | ✅ |
| 7.3.3 | Advertencias del servidor al guardar | ✅ |
| 7.3.4 | Ver los ocho parámetros con su rango | ✅ |
| 7.3.5 | Editar en línea con validación previa | ✅ |
| 7.3.6 | Ver la última modificación | ✅ |
| 7.3.7 | Historial completo de auditoría | ❌ | Sin pantalla |

### 7.4. Flota

| # | Funcionalidad | Estado |
|---|---|---|
| 7.4.1 | CRUD de conductores y vehículos | ✅ | **P-12** desde el 20-AGO-2026. Sin reactivación: la baja no se deshace |
| 7.4.2 | Vehículo habitual por conductor | ✅ | De ahí sale la propuesta de placa |

---

## 8. Solicitudes de apoyo

| # | Funcionalidad | Estado |
|---|---|---|
| 8.1 | Registrar una solicitud | ✅ |
| 8.2 | Consultar las de un operativo | ✅ |
| 8.3 | Bandeja de la dirección requerida | ✅ |
| 8.4 | Aceptar, rechazar o vencer | ❌ | **Sin definir (PV-12)** |
| 8.5 | Corregir o anular una solicitud | ❌ | Ídem |
| 8.6 | Notificar | ❌ | Ídem |

---

## 9. Transversal

| # | Funcionalidad | Estado |
|---|---|---|
| 9.1 | Autorización en cadena de cuatro guardas | ✅ | No cambió al llegar Auth: no sabe de dónde sale la identidad |
| 9.2 | Ingreso con **Auth central**, cookie `HttpOnly` | ✅ | El JWT no llega nunca al navegador |
| 9.3 | Regreso del portal · `/auth/callback` y canje | ✅ | El código es de un solo uso |
| 9.4 | Cierre de sesión, y expiración a las 8 h | ✅ | Borra la cookie y sale al portal |
| 9.5 | Resolución del rol contra `t_usuario` | ✅ | Con pantalla de alta desde el 19-AGO-2026: Administración → Cuentas del cuadro |
| 9.6 | Ingreso del funcionario de campo · P-06 | ❌ | **Falta el rol `Transporte - Funcionario` en Auth.** Depende de un tercero |
| 9.7 | Comprobar que el código se emitió **para este módulo** | ❌ | El token de Auth no trae `subsystemId`. Depende de un tercero |
| 9.8 | Auditoría de toda escritura | ✅ | Dentro de la transacción |
| 9.9 | Correlación de peticiones | ✅ | `x-correlation-id`, y **expuesto al navegador** desde el 18-AGO |
| 9.10 | Registro estructurado en JSON | ✅ | |
| 9.11 | Mensajes redactados para el funcionario | ✅ | El ingreso distingue «no está dado de alta» de «fue desactivado» |
| 9.12 | Navegación por rol con ítems atenuados | ✅ | El marco entero exige sesión: sin ella no se pinta ni la barra lateral |
| 9.13 | Carga diferida por pantalla | ✅ | |
| 9.14 | Tema claro y oscuro | ⚠️ | Implementado; **contraste sin verificar** (PV-23) |

> **Retirada el 18-AGO-2026:** la identidad provisional por cabecera `x-usuario-prueba`, que era la
> antigua 9.3. Permitía que **cualquiera se declarara `DIRECTOR`** enviando un número y viera la
> matriz consolidada entera.

---

## 10. Resumen

**102 funcionalidades**, contadas sobre las filas de este documento:

| Estado | Cantidad |
|---|---|
| ✅ Implementado y verificado | 72 |
| ⚠️ Con limitación conocida | 16 |
| ⏳ Sin datos para usarlo | 2 |
| ❌ No implementado | 12 |

**De los 12 no implementados, la mayoría depende de una decisión del negocio o de un tercero**,
no de trabajo de desarrollo. Dos son de Auth central —9.6 y 9.7—. El detalle en
`17_KNOWN_ISSUES.md`.

> **Actualizado el 19-AGO-2026.** El bloque 9 pasó de diez filas a catorce con el ingreso por Auth
> central: se retiró la identidad provisional y se desglosaron canje, cierre de sesión, resolución
> del rol y las dos comprobaciones que siguen dependiendo de Auth.
>
> **El recuento se rehízo contando las filas, no ajustando el anterior**, y al hacerlo apareció que
> el de agosto tampoco cuadraba: decía 98 filas cuando eran 98 más las que se añadieron, y **12 no
> implementados cuando eran 11**. Hoy son 102 · 72 · 16 · 2 · 12, medidos sobre el documento.

> **Actualizado el 07-AGO-2026.** Cinco filas cambiaron de estado ese día: 2.6, 2.10 y 3.3 pasaron
> de «sin datos» a «con limitación», porque la carga de puntos y de personal empezó; 2.11 pasó de
> «verificado» a **no implementado**, al comprobarse que el endpoint esconde a quien no puede salir
> en lugar de explicarlo (PV-37); y 2.13 cambió de contenido con la nueva baja (PV-10).
>
> El recuento anterior —58 / 16 / 7 / 13— no cuadraba con las filas del propio documento. Se
> recontó una a una.
