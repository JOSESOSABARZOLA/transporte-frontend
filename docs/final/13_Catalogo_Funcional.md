# 13 · Catálogo Funcional

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Qué hace el sistema, funcionalidad por funcionalidad · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Estado: refleja la rama `base/cuadro-colores` (backend `24520af`, frontend `d13a5db`). El
> servidor expone 215 manejadores de ruta sobre 55 modelos y 105 migraciones; las pruebas suman
> 2420 unitarias en el backend (151 suites) y 2081 en el frontend (140 archivos).

---

## Cómo leer este catálogo

| Marca | Significado |
|---|---|
| ✅ | Implementado y verificado |
| ⚠️ | Implementado con una limitación conocida |
| ⏳ | Implementado pero **sin datos** para usarlo |
| ❌ | No implementado |

Las pantallas se nombran con su código (P-01 Registro, P-02 Mis operativos, P-03 Planificar el día,
P-04 Matriz, P-05 Órdenes, P-07 Personal, P-08 Catálogos, P-09 Ventanas y parámetros, P-10 Roles de
Auth, P-11 Cuentas, P-12 Flota y garajes, P-13 Jornada del Día, P-36 Permisos, P-37 Formularios,
M-38 Turnos de conductores, M-39 Carga inicial) o con su título cuando no lo tienen.

---

## 1. Jornada · el cuadro diario

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 1.1 | Abrir la jornada con el primer operativo registrado | ✅ | Automático desde el 11-AGO-2026. Una fecha pasada no se abre |
| 1.2 | Abrir una jornada por adelantado | ⚠️ | `POST /cuadros`, permiso `cuadro:abrir`. **Sin pantalla** |
| 1.3 | Consultar el estado de la jornada | ✅ | Encabezado de las pantallas del cuadro |
| 1.4 | Derivar el estado desde las ventanas | ✅ | Automático. Una ventana sin restricción no retiene |
| 1.5 | Ventanas de tipo diario, laborable o sin restricción | ✅ | P-09, desde el 07-OCT-2026 |
| 1.6 | Apertura de la DAF explicada tras el cierre del registro | ✅ | «… cuando cierra el registro de operativos» (RN-56) |
| 1.7 | Cerrar el cuadro | ✅ | P-04, con confirmación |
| 1.8 | Impedir el cierre con nocturnos sin conductor | ✅ | El mensaje nombra el operativo |
| 1.9 | Impedir el cierre con aporte compartido pendiente | ✅ | Medido **por registro** desde el 27-OCT-2026 |
| 1.10 | Reabrir el cuadro | ✅ | P-04, «Reabrir cuadro», solo Dirección. **Con pantalla desde el 08-OCT-2026** |
| 1.11 | Contar las reaperturas y rehacer el historial al volver a cerrar | ✅ | Desde el 30-OCT-2026 |

**Estados:** Borrador → En transporte → Aprobado → Cerrado; la reapertura vuelve a Aprobado. La
orden de trabajo **la genera el sistema** con el formato `AMC-AAAA-MM-DD` (PV-28).

---

## 2. Registro de operativos

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 2.1 | Ofrecer solo los formularios del rol | ✅ | P-01, selector con búsqueda, «N hoy» y recientes |
| 2.2 | Ofrecer los compartidos como «Aporta personal» | ✅ | P-01 |
| 2.3 | Generar identificador y secuencial diario | ⚠️ | PV-27 sigue abierto **solo para el formulario 7** |
| 2.4 | Horario por persona en medias horas, con «Horario del operativo» | ✅ | El operativo deriva su ventana del personal (RN-66) |
| 2.5 | Admitir el cruce de medianoche | ✅ | 22H00 a 02H00 es válido |
| 2.6 | Cascada formulario → zonal → punto | ⚠️ | Funciona con los puntos cargados; la matriz institucional sigue pendiente (PV-01) |
| 2.7 | Varias zonales por operativo | ✅ | Desde el 18-SEP-2026 (antes PV-31) |
| 2.8 | Tipo de control «OTRO» en captura libre | ✅ | Todos los formularios desde el 24-SEP-2026 |
| 2.9 | Registrar un punto de encuentro nuevo al crear el operativo | ✅ | Formularios 1 a 4 |
| 2.10 | Instituciones participantes | ✅ | Al menos una |
| 2.11 | Asignar personal con su veredicto y su motivo | ⚠️ | Funciona; el maestro sigue cargándose (PV-02) |
| 2.12 | Ocupación del día y cruces que impiden guardar | ✅ | «Ocupado …» / «Se cruza …», desde el 31-OCT-2026 |
| 2.13 | Carga de la semana y reparto de carga | ✅ | Baja/Media/Alta por operativos. Orienta, no bloquea |
| 2.14 | Personal por área, sin «Todas» | ✅ | Formularios con General y Técnico admitidos (5, 6), desde el 04-NOV-2026 |
| 2.15 | Registro por zonas del formulario 8 | ✅ | Una persona, varias zonas, cantidad por zona |
| 2.16 | Una persona y un tipo de personal por operativo | ✅ | Formulario 8, por configuración |
| 2.17 | Patrulla 5/6 como un solo operativo | ✅ | El aporte del DMIT crea su código (`INECU`) en el mismo registro |
| 2.18 | Trámites de Inspección por inspector | ✅ | Depende de que la API de Inspección responda |
| 2.19 | Transporte requerido en seis tipos | ✅ | Incluye «Vehículo de otra institución» (23-OCT-2026). Macrooperativo solo con «Completo» |
| 2.20 | Solicitar compartir unidad | ✅ | Sugerencia por mismo punto y horario, solo del propio ámbito (RN-48) |
| 2.21 | Observaciones como notas con autor y fecha | ✅ | Bitácora: se agregan, no se editan una vez guardadas |
| 2.22 | Editar en cajón; personal con «Guardar cambios» | ✅ | Todo o nada (`PUT …/personal/lote`) |
| 2.23 | Ver detalle en solo lectura | ✅ | Desde el 27-OCT-2026 |
| 2.24 | Retirar un operativo o un registro completo | ✅ | Borrado real sin órdenes; baja lógica con ellas (PV-10) |
| 2.25 | Operativo adicional fuera de la ventana | ✅ | Formularios 2 y 8. El cuadro cerrado sí lo bloquea |
| 2.26 | Mis operativos por rango de fechas | ✅ | P-02, hasta `MIS_OPERATIVOS_RANGO_MAX_DIAS` |
| 2.27 | Conservar la captura por formulario y fecha | ✅ | En la pestaña; se borra al cerrar sesión |
| 2.28 | Bloqueo optimista | ✅ | Columna `version` |
| 2.29 | Campos calculados como distintivos | ✅ | Fuera del tabulador |

---

## 3. Reglas que protegen a las personas

| # | Regla | Estado | Parámetro o fuente |
|---|---|---|---|
| 3.1 | Patrulla consecutiva (RN-24) | ✅ | `DIAS_DESCANSO_PATRULLA` |
| 3.2 | Tope de salidas pesadas (RN-25) | ✅ | `TOPE_SALIDAS_PESADAS`, `PERIODO_COMPUTO_SALIDAS` |
| 3.3 | Jornada laboral (RN-26, RN-33) | ⏳ | Catálogo de jornadas. **La migración no asignó ninguna**: sin jornada no se convoca a nadie |
| 3.4 | Jornada máxima del personal (RN-36) | ✅ | `JORNADA_MAXIMA_HORAS` |
| 3.5 | Solapamiento horario por persona | ✅ | RN-28, sobre el turno de cada persona |
| 3.6 | Disponibilidad vigente | ✅ | Siete situaciones de ausencia |
| 3.7 | Turno de cobertura de Instrucción | ✅ | Turnos publicados y `HORA_TURNO_*` |
| 3.8 | Área admitida por formulario | ✅ | P-08 |
| 3.9 | Cupo del rol compartido (PER-06) | ⚠️ | En la patrulla 6 el aporte crea su propio código y el cupo no acota (PV-09) |
| 3.10 | Composición de patrulla (RN-31, RN-32) | ⚠️ | **Se informa, no bloquea** (PV-29). Medida por registro desde el 22-OCT-2026 |
| 3.11 | Reglas del conductor por tramos | ✅ | Solapamiento, «no llega», jornada como lapso (`DAF_MAX_JORNADA_HORAS`), jornada laboral y ausencia |
| 3.12 | Índice de fatiga y equidad | ✅ | Orientativo; parámetros de «Carga y fatiga» |

> **Cambió el 23-OCT-2026.** La regla 3.3 era «Tipo de contrato y turno». Nombramiento y Ocasional
> se dieron de baja y los reemplaza la jornada laboral. Se marca ⏳ porque depende de que cada ficha
> y cada conductor tengan su jornada asignada.

**Son patrulla los formularios 4, 5, 6 y 9.** El bloqueo es **cruzado** entre ellos.

---

## 4. Transporte · DAF

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 4.1 | «Planificar el día» en cuatro pasos | ✅ | P-03, desde el 08-OCT-2026. El paso se deriva del resumen |
| 4.2 | Requisitos del día con su acción | ✅ | Paso 1 |
| 4.3 | Declarar los vehículos que salen | ✅ | Paso 1, «Confirmar N vehículos». **Antes sin pantalla** (F-06) |
| 4.4 | Asignar automáticamente | ✅ | Paso 2, optimizador con traza por asignación |
| 4.5 | Candidatos con categoría y motivo | ✅ | Cajón de candidatos |
| 4.6 | La DAF solo escribe conductor y vehículo (RN-40) | ✅ | Asignación por tramos |
| 4.7 | Elegir cualquier placa activa del día | ✅ | «Cambiar vehículo», desde el 15-OCT-2026 (antes PV-33) |
| 4.8 | Asignar sin vehículo | ✅ | El operativo sigue pendiente hasta tener placa |
| 4.9 | Compartir unidad con asientos por momento | ✅ | Desde el 21-OCT-2026 |
| 4.10 | Registro agrupado como una sola solicitud | ✅ | Patrulla 5/6 y registro por zonas, desde el 04-NOV-2026 |
| 4.11 | Horas libres de los conductores | ✅ | `DAF_HUECO_MINIMO_MIN` |
| 4.12 | Propios medios y vehículo de otra institución | ✅ | No piden vehículo a la DAF |
| 4.13 | Liberar el transporte al cambiar tipo, horario o zonal | ✅ | Aviso «Transporte liberado» |
| 4.14 | Fin del día: garaje sugerido y acta | ✅ | Paso 3 |
| 4.15 | Hojas de ruta por conductor | ✅ | Paso 4, JSON y PDF |
| 4.16 | Solo lectura fuera de la ventana | ✅ | Distingue «aún no» de «ya no» |

---

## 5. Matriz consolidada

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 5.1 | Los formularios en una tabla | ✅ | P-04, solo Dirección |
| 5.2 | Banner con el color del servidor | ✅ | Más número, nombre y nombre del color |
| 5.3 | Fila de evidencia del formulario sin carga | ✅ | Con responsable y hora de cierre |
| 5.4 | Celdas con alerta y su motivo | ✅ | Texto además del color |
| 5.5 | Alerta crítica distinguible | ✅ | Borde que no desalinea la fila |
| 5.6 | Filtro por formulario | ✅ | En memoria |
| 5.7 | Exportar a PDF horizontal | ✅ | Con logotipo desde el 25-AGO-2026 (PV-30 cerrado) |
| 5.8 | Indicadores de cabecera | ✅ | Operativos, alertas, flota, estado |
| 5.9 | Registro por zonas en dos niveles | ✅ | Pantalla y PDF, desde el 30-OCT-2026 |
| 5.10 | Notas del operativo y solicitud de compartir | ✅ | Pantalla y PDF |

---

## 6. Jornada del Día

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 6.1 | Jornada para los tres departamentales | ✅ | P-13. Cada rol ve **solo sus formularios** desde el 15-SEP-2026 |
| 6.2 | Gestionar personal donde el formulario lo concede | ✅ | Con «Guardar cambios» desde el 28-OCT-2026 |
| 6.3 | Aviso de personal pendiente, una vez por registro | ✅ | Para quien aporta |

---

## 7. Órdenes de servicio

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 7.1 | Emitir una orden por persona | ✅ | P-05. **Solo la Dirección**, exigido por el servidor desde el 27-OCT-2026 |
| 7.2 | Dato aislado de cuatro campos | ✅ | INV-24 |
| 7.3 | Un formato por departamento | ✅ | «Editar plantilla», tres pestañas, con vista previa |
| 7.4 | Memorando PDF con membrete y visor | ✅ | Visor con zoom, miniaturas y pantalla completa |
| 7.5 | Firma electrónica del memorando | ⚠️ | Certificado `.p12` por entorno; sin configurar no firma |
| 7.6 | Tabla de control sin NUT y cargo de la ficha | ✅ | Desde el 08-OCT-2026 |
| 7.7 | Emitir los pendientes y reintentar los que fallan | ✅ | «Emitir pendientes (N)» y «Reintentar» |
| 7.8 | Bloquear la emisión sin personal | ✅ | El servidor lo rechaza |
| 7.9 | Bloquear la emisión con el cuadro abierto | ⚠️ | **Regla solo de interfaz** (PV-34) |
| 7.10 | Reemitir conservando la anterior | ✅ | Queda «Sustituida» |
| 7.11 | Avisar a quien no tiene formato | ✅ | No recibe orden y la emisión lo dice |
| 7.12 | Consulta de las órdenes propias por el funcionario | ❌ | Retirada el 10-SEP-2026 con el rol `FUNCIONARIO`. El endpoint `mias` sigue sin pantalla |
| 7.13 | Entrega por otro canal | ❌ | Sin definir (PV-07) |

---

## 8. Administración

### 8.1. Personal · P-07

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.1.1 | Listar con filtros por área, jornada y estado | ✅ | Acotado por dirección en el servidor |
| 8.1.2 | Alta desde el directorio de Auth, en dos pasos | ✅ | Correo institucional desde Auth |
| 8.1.3 | Registro manual sin Auth | ✅ | «¿No aparece? Registro manual» |
| 8.1.4 | Edición sin cambiar la cédula | ✅ | |
| 8.1.5 | Desactivar con motivo y reactivar | ✅ | |
| 8.1.6 | Registrar y quitar ausencias | ✅ | Siete situaciones; las pasadas no se quitan |
| 8.1.7 | Estado de ausencia en el maestro | ✅ | Una consulta para todo el maestro (antes PV-35) |
| 8.1.8 | Cobertura por turnos de Instrucción | ✅ | Pestaña «Cobertura por turnos», publicar y exportar |
| 8.1.9 | Jornada laboral en la ficha | ✅ | Desde el 23-OCT-2026 |
| 8.1.10 | Pantalla con las ausencias de toda la institución | ❌ | El servidor las entrega; ninguna pantalla las lista juntas |

### 8.2. Catálogos · P-08

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.2.1 | Configuración propia por formulario | ✅ | Desde el 13-OCT-2026, sin copias |
| 8.2.2 | Áreas de personal admitidas | ✅ | Único sitio donde se editan |
| 8.2.3 | Zonales con su zona de la ciudad, en acordeón | ✅ | Es donde se carga PV-01 |
| 8.2.4 | Alta y edición con aviso de duplicado | ✅ | Puntos, tipos de control e instituciones |
| 8.2.5 | Desactivar y **reactivar** | ✅ | Antes no había reactivación (PV-36) |
| 8.2.6 | Eliminar solo lo que nunca se usó | ✅ | Apagado con el motivo si está en uso |
| 8.2.7 | Limpieza de datos heredados | ✅ | Script `limpieza-catalogos`, sin pantalla |

### 8.3. Formularios · P-37

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.3.1 | Crear, editar y dar de baja formularios | ✅ | Desde el 29-SEP-2026; número de 1 a 99 |
| 8.3.2 | Número y código fijos al editar; prefijo único | ✅ | Repetidos avisados en vivo |
| 8.3.3 | Paleta de 24 colores | ✅ | Un color repetido avisa, no bloquea |
| 8.3.4 | Comportamiento por banderas | ✅ | Patrulla, nocturno, captura libre, una persona por operativo… |

### 8.4. Ventanas y parámetros · P-09

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.4.1 | Seis ventanas con su estado en vivo | ✅ | Pestaña «Ventanas de carga» |
| 8.4.2 | Editar tipo, horas y mensaje con marcadores | ✅ | Cada ventana por separado desde el 08-OCT-2026 |
| 8.4.3 | Aviso de hora inconsistente y mensaje sugerido | ✅ | |
| 8.4.4 | Catálogo de jornadas laborales | ✅ | Pestaña «Jornadas laborales» |
| 8.4.5 | Parámetros por secciones, con valor de siembra | ✅ | «↺ Restaurar a …» |
| 8.4.6 | Guardar varios parámetros a la vez, todo o nada | ✅ | Desde el 23-OCT-2026 |
| 8.4.7 | Ver quién modificó cada parámetro, por nombre | ✅ | |
| 8.4.8 | Alcance por administrador | ✅ | DMIT, solo turnos de Instrucción; DAF, solo `DAF_` |
| 8.4.9 | Historial completo de auditoría | ❌ | Sin pantalla |

### 8.5. Flota y garajes · P-12

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.5.1 | Conductores, vehículos y garajes: alta, edición, baja y reactivación | ✅ | Tres pestañas |
| 8.5.2 | Indicadores clicables | ✅ | Cinco, con su filtro |
| 8.5.3 | Documentos por vencer y kilometraje inusual | ✅ | `DAF_DIAS_AVISO_VENCIMIENTO`, `DAF_KM_MAXIMO` |
| 8.5.4 | Programar mantenimiento, con calendario semanal | ✅ | Desde el 20-OCT-2026, dentro de Vehículos |
| 8.5.5 | Ausencias de los conductores | ✅ | Desde el 16-OCT-2026 |
| 8.5.6 | Baja con fecha, autor y «Deshacer» | ✅ | Desde el 20-OCT-2026 |
| 8.5.7 | Vehículo habitual por conductor | ⚠️ | Se cambia, pero no se puede vaciar |

### 8.6. Turnos, traslados y carga inicial

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.6.1 | Turnos de conductores con propuesta y publicación | ✅ | M-38 |
| 8.6.2 | Matriz de traslados con verificación de impacto | ✅ | «Traslados entre zonales»; cargada la del DMQ |
| 8.6.3 | Carga inicial desde Excel | ✅ | M-39, solo Administrador |

### 8.7. Cuentas, roles y permisos

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 8.7.1 | Alta de cuentas desde el directorio, con roles obligatorios | ✅ | P-11 |
| 8.7.2 | Enlazar la cuenta con la ficha de personal | ✅ | P-11, por cédula. **Antes sin vía** |
| 8.7.3 | Roles de Auth central | ✅ | P-10 |
| 8.7.4 | Editar la matriz rol ↔ permiso sin desplegar | ✅ | P-36, desde el 16-SEP-2026 |

---

## 9. Solicitudes de apoyo

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 9.1 | Registrar una solicitud | ⚠️ | Solo API; **ninguna pantalla** |
| 9.2 | Consultar las de un operativo | ⚠️ | Ídem |
| 9.3 | Bandeja de la dirección requerida | ⚠️ | Ídem |
| 9.4 | Aceptar, rechazar o vencer | ❌ | **Sin definir (PV-12)** |
| 9.5 | Corregir o anular una solicitud | ❌ | Ídem |
| 9.6 | Notificar | ❌ | Ídem |

> **Corregido el 5-NOV-2026.** Este bloque marcaba 8.1 a 8.3 como verificados. Los endpoints
> existen, pero el frontend nunca tuvo pantalla para ellos.

---

## 10. Transversal

| # | Funcionalidad | Estado | Dónde |
|---|---|---|---|
| 10.1 | Autorización en cadena de cuatro guardas | ✅ | Identidad → permiso → formulario → ventana |
| 10.2 | Permisos atómicos (RBAC) | ✅ | Desde el 16-SEP-2026; la interfaz se monta por permiso |
| 10.3 | Ingreso con **Auth central**, cookie `HttpOnly` | ✅ | El JWT no llega nunca al navegador |
| 10.4 | Regreso del portal · `/auth/callback` y canje | ✅ | El código es de un solo uso |
| 10.5 | Cierre de sesión y expiración | ✅ | La sesión caduca con la de Auth |
| 10.6 | Resolución de los roles contra `t_usuario` | ✅ | Varios roles por cuenta; vale la unión |
| 10.7 | Comprobar que el código se emitió **para este módulo** | ❌ | Se comprueba solo si el token declara `subsystemId`, y el de Auth no lo trae. Depende de un tercero |
| 10.8 | Auditoría de toda escritura | ✅ | Dentro de la transacción |
| 10.9 | Correlación de peticiones | ✅ | `x-correlation-id`, expuesto al navegador |
| 10.10 | Registro estructurado en JSON | ✅ | |
| 10.11 | Mensajes estándar redactados para el funcionario | ✅ | `MensajeModal`, avisos breves y avisos en línea, desde el 16-OCT-2026 |
| 10.12 | Carga diferida por pantalla | ✅ | |
| 10.13 | Tema claro y oscuro | ⚠️ | Tokens de texto y contraste desde el 08-OCT-2026; sin medición formal (PV-23) |
| 10.14 | Endurecimiento de arranque | ✅ | `helmet`, CORS sin reflejo, validación de entorno, `TRUST_PROXY` |

> **Retiradas.** La identidad provisional por cabecera `x-usuario-prueba` (18-AGO-2026) y el ingreso
> del funcionario de campo, P-06 (10-SEP-2026): el rol `FUNCIONARIO` dejó de ser asignable y sus
> órdenes se generan desde P-05.

---

## 11. Resumen

**158 funcionalidades**, contadas sobre las filas de este documento:

| Estado | Cantidad |
|---|---|
| ✅ Implementado y verificado | 136 |
| ⚠️ Con limitación conocida | 13 |
| ⏳ Sin datos para usarlo | 1 |
| ❌ No implementado | 8 |

**De los 8 no implementados, la mayoría depende de una decisión del negocio o de un tercero**: tres
son de PV-12 (solicitudes de apoyo), uno de PV-07 (entrega de órdenes), uno de Auth central (10.7)
y uno se retiró por decisión del negocio (7.12, consulta del funcionario). Los otros dos son
pantallas no pedidas: el listado global de ausencias y el historial de auditoría. El detalle en
`17_KNOWN_ISSUES.md`.

> **Actualizado el 5-NOV-2026.** El catálogo se rehízo sobre el código de la rama
> `base/cuadro-colores`. Entraron los bloques de Transporte DAF, Jornada del Día, Formularios,
> Flota y garajes, Turnos, Traslados y Permisos; el registro pasó de 15 a 29 filas por el registro
> por zonas, la patrulla como un operativo, compartir unidad y las notas. Cambiaron de estado, entre
> otras: la reapertura del cuadro (pantalla), la capacidad de flota (paso 1 de «Planificar el día»),
> la elección de placa (PV-33), las varias zonales (PV-31), el logotipo del PDF (PV-30), la
> reactivación de catálogos (PV-36), el enlace cuenta ↔ ficha y el estado de ausencia del maestro
> (PV-35). La regla de tipo de contrato pasó a jornada laboral (⏳), y las solicitudes de apoyo
> pasaron de verificadas a «solo API».

> **Actualizado el 19-AGO-2026.** El bloque transversal pasó de diez filas a catorce con el ingreso
> por Auth central. El recuento de entonces fue 102 · 72 · 16 · 2 · 12.
