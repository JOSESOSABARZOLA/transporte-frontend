# 14 · Guía de Capacitación

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · actualizado el 19 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

---

## 1. Antes de convocar a nadie

Esta guía sirve **cuando el sistema tenga datos**. Una capacitación donde el ejercicio no se puede
terminar produce desconfianza en lugar de adopción, así que antes de cada sesión comprobamos los
requisitos en el ambiente donde se va a capacitar.

**Requisitos mínimos para capacitar:**

| # | Requisito | Dónde se comprueba |
|---|---|---|
| 1 | Los nueve formularios, con sus áreas admitidas | «Formularios del cuadro» y «Catálogos del cuadro» |
| 2 | Zonales, puntos, tipos de control e instituciones **de cada formulario** | «Catálogos del cuadro», eligiendo el formulario arriba |
| 3 | Maestro de personal cargado, **cada ficha con su jornada laboral** | «Personal y disponibilidad». Una ficha «⚠ Sin jornada» no se convoca |
| 4 | Conductores, vehículos y garajes, cada conductor con su jornada laboral | «Flota y garajes» o «Carga inicial» |
| 5 | Turnos de conductores del mes | «Turnos del mes» |
| 6 | Formato de orden de los tres departamentos | «Órdenes de servicio» › «Editar plantilla» |
| 7 | Una cuenta por participante, con su perfil | «Cuentas del cuadro» |
| 8 | Una jornada de prueba abierta | Diario. Se abre por la API; todavía no hay botón |

Con los ocho, la capacitación es viable. Sin el 2, el 3 o el 4 no se puede terminar un registro ni
una asignación.

> **Cambió desde agosto.** El criterio de prefijo por área (PV-27), que impedía registrar en cinco
> de los nueve formularios, está resuelto en el código para el 5, el 6 y el 8. Para el **7** el
> código todavía espera el criterio del negocio: si el formulario 7 de su ambiente tiene más de un
> prefijo sin área, no registrará. Compruébelo antes de la sesión del DMIT.

---

## 2. El mensaje que debe quedar

Antes de enseñar botones, conviene decir por qué existe el sistema. Dos frases:

> **El cuadro se hacía a mano y quien lo hacía se fue.**
> **El cuadro circulaba por WhatsApp y los intervenidos se anticipaban.**

Casi todo lo que el sistema hace —que cada departamento vea solo lo suyo, que la matriz sea de la
Dirección, que la orden tenga cuatro datos de la persona— se explica por la segunda frase. Si eso
se entiende, las restricciones dejan de parecer trabas.

---

## 2 bis. Lo que cambió en el ingreso · 19 de agosto de 2026

**Ya no se elige el perfil desde la pantalla.** Hasta el 18 de agosto había un selector en la barra
superior con siete perfiles de prueba; desapareció. Ahora se entra por el **portal institucional**
con el usuario y la contraseña de siempre.

Tres cosas que conviene decir en voz alta durante la capacitación, porque generan llamadas:

1. **Su perfil no lo elige usted.** Lo determina su cuenta institucional. Si ve menos opciones de
   las que espera, no es un fallo: es el perfil que tiene asignado.
2. **La sesión dura ocho horas.** Después vuelve al portal. No es un cierre inesperado.
3. **«Su usuario no está dado de alta» no es un error suyo.** Significa que el portal le reconoció
   pero el Cuadro de Colores todavía no le tiene registrado. Lo resuelve el administrador.

> **Para el instructor:** desde agosto el alta **sí tiene pantalla**: «Cuentas del cuadro» ›
> **«+ Nueva cuenta»**. Si en la sesión aparece alguien sin alta, el administrador puede darlo de
> alta en el momento.

---

## 2 ter. Lo que cambió de septiembre a noviembre de 2026

Quien ya recibió la capacitación de agosto necesita una sesión de actualización. Estos son los
cambios que más se notan:

| Para quién | Qué cambió |
|---|---|
| Todos | **Plantilla visual única** (24 de octubre): mismo encabezado, cabecera azul en las tablas y acciones con icono que dicen su nombre al pasar el ratón |
| Departamentos | Registro rediseñado: selector de formulario con buscador, **«Horario del operativo»**, ocupación del día («Ocupado» / «Se cruza»), notas en vez de un campo de texto |
| Departamentos | **Mis operativos por rango** de fechas y **«Ver detalle»** de solo lectura |
| DMIP · Inspecciones | **Patrulla 5/6** como un solo operativo, **personal por área** en pestañas y **formulario 8 por zonas** |
| DMIT · Instrucción | El **aporte** de personal se confirma con **«Guardar cambios»** |
| DAF | **«Planificar el día» en cuatro pasos**, compartir unidad, turnos del mes, flota con mantenimiento y ausencias, traslados entre zonales |
| Dirección | Solo ella emite; **un formato de orden por departamento**; «Reabrir cuadro»; «Emitir pendientes» |
| Administración | **Jornada laboral** en lugar del tipo de contrato (23 de octubre); Personal en dos pestañas; Catálogos por formulario; Ventanas y parámetros en pestañas con guardado único |
| Personal de campo | **Ya no entra al sistema** (10 de septiembre). «Mis órdenes» se retiró |

---

## 3. Plan por perfil

### 3.1. Departamentos de carga · 120 minutos

**Quién:** DMIP · Unidad de Operativos, DMIP · Inspecciones Técnicas y Generales, DMIT · Instrucción.

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Por qué existe el sistema. Qué reemplaza |
| 2 | 10 | Entrar por el **portal institucional**, elegir el rol «Transporte», leer el encabezado y la cuenta atrás de la ventana |
| 3 | 40 | **P-01 · Registro**, con ejercicio guiado: formulario, horario del operativo, personal, lugar, control, transporte, notas |
| 4 | 20 | **P-02 · Mis operativos**: rango de fechas, filtros, «Ver detalle», editar, eliminar, adicional |
| 5 | 15 | El formulario propio de cada departamento (ver abajo) y la **Jornada del Día** |
| 6 | 10 | Qué hace la DAF después, y por qué usted no ve el conductor |
| 7 | 15 | Preguntas |

**Ejercicio común:** registrar dos operativos en el mismo formulario, uno diurno y uno nocturno
(22H00 a 02H00); poner el horario del operativo y ver quién sale «Ocupado» o «Se cruza»; abrir
«▸ No disponibles» y **leer un motivo**; cambiar a otro formulario y volver para comprobar que la
captura sigue ahí; editar el horario del primero con «Guardar cambios»; eliminar el segundo.

**Ejercicio por departamento:**

| Departamento | Ejercicio |
|---|---|
| DMIP · Unidad de Operativos | Registrar en el 2 · PMO con «Solo dejar» y pedir **compartir unidad** con otro operativo del mismo punto; crear un **adicional** con la ventana cerrada |
| DMIP · Inspecciones | Registrar una **patrulla del 5** con un Inspector General y ver «Falta: Inspector Técnico · puede registrar igual»; registrar un **formulario 8 con dos zonas** y leer el resumen de identificadores; usar «Cambiar por…» en «Editar operativo» |
| DMIT · Instrucción | **Aportar** una persona a una patrulla del 6 con «Agregar personal» y «Guardar cambios»; registrar en el 7 o el 9 |

**Los cuatro puntos que más ahorran llamadas después:**

1. **Los avisos aparecen antes, no al guardar.** Si la ventana cerró, se dice arriba; y el pie dice
   qué falta desde el principio.
2. **Quien no puede salir aparece en «No disponibles», con su motivo.** Si alguien no aparece **en
   absoluto**, su área no participa en ese formulario. Un motivo nuevo desde octubre: **sin jornada
   laboral**, que se resuelve en Personal, no en el registro.
3. **Los campos calculados no se escriben.** El identificador y la semana los pone el sistema:
   ese era el error original.
4. **«Ver detalle» es solo mirar; «Editar» espera a «Guardar cambios».** Nada se guarda al
   instante, tampoco el personal.

### 3.2. DAF · 90 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Su papel en la jornada y su ventana (por omisión, 15H00–16H30) |
| 2 | 40 | **Planificar el día**: los cuatro pasos. «Asignar automáticamente», el cajón de candidatos, «Cambiar vehículo», «Compartir unidad», fin del día y hojas de ruta |
| 3 | 15 | **Turnos del mes**: asignar turnos, publicar el mes |
| 4 | 15 | **Flota y garajes** y **Traslados entre zonales**: mantenimiento, ausencias, baja con «Deshacer», aviso de impacto |
| 5 | 10 | Preguntas |

**Ejercicio:** confirmar los vehículos del paso 1; asignar automáticamente; resolver a mano un
pendiente y **leer el motivo** de un conductor que no puede («No llega (faltan 25 min)», ausente,
sin jornada); compartir unidad entre dos operativos del mismo punto; programar un mantenimiento y
ver que el vehículo deja de ofrecerse; emitir las hojas de ruta.

**Tres puntos:**

1. **Usted elige dos datos: conductor y vehículo.** No hay ningún control para el resto del
   operativo, y es a propósito.
2. **Se asigna por traslado, no por operativo.** Un «Dejar y retirar» son dos traslados y el
   conductor queda libre entre ellos.
3. **Una patrulla o un registro del 8 por zonas es una sola solicitud**, con un conductor y un
   vehículo para todo el registro.

### 3.3. Dirección · 60 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Qué ve la Dirección y **por qué nadie más lo ve** |
| 2 | 15 | **P-04 · Matriz**: banners, alertas, fila de evidencia, registros por zonas |
| 3 | 10 | Exportar, cerrar y **reabrir** el cuadro |
| 4 | 20 | **P-05 · Órdenes**: «Editar plantilla» por departamento, «Revisar y emitir», «Emitir pendientes», «Ver documento» |
| 5 | 5 | Preguntas |

**Ejercicio:** revisar la matriz del día; localizar un formulario sin carga y leer su evidencia;
intentar cerrar con un nocturno sin conductor y leer el rechazo; cerrar; completar el formato de un
departamento; emitir órdenes y **comprobar que ninguna hoja menciona a los demás** y que cada una
lleva «Formato: <departamento>».

**El punto central:** *el cierre habilita la emisión, y una orden emitida ya salió del sistema.* Por
eso la confirmación enumera lo que se firma.

### 3.4. Administrador · 120 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Qué administra y qué no; qué abre cada perfil de administración |
| 2 | 30 | **Personal y disponibilidad**: «Maestro de personal» (alta en dos pasos, edición, ausencias, baja) y «Cobertura por turnos» de Instrucción |
| 3 | 25 | **Catálogos del cuadro** por formulario y **Formularios del cuadro** |
| 4 | 25 | **Ventanas y parámetros**: Ventanas de carga · **Jornadas laborales** · Parámetros |
| 5 | 15 | Cuentas del cuadro y Permisos por rol |
| 6 | 15 | Preguntas |

**Ejercicio:** dar de alta un funcionario **con su jornada laboral** y comprobar que aparece en
P-01; dejar otro sin jornada y ver «⚠ Sin jornada» y su motivo en el registro; registrarle
vacaciones y comprobar que pasa a «No disponibles»; crear un punto en una zonal de un formulario y
comprobar que no aparece en los demás; cambiar dos parámetros y guardarlos juntos.

**Los cuatro puntos críticos:**

1. **La jornada laboral decide si alguien puede salir, y sin jornada no se convoca.** No es una
   etiqueta. Reemplazó al tipo de contrato el 23 de octubre de 2026.
2. **Cada formulario tiene su propia configuración**: zonales, puntos, tipos e instituciones. No
   hay copias entre formularios.
3. **Desactivar no es eliminar.** Lo desactivado se ve con el filtro «Inactivos» y se recupera con
   «Reactivar». «Eliminar» solo se ofrece si nunca se usó.
4. **Desactivar una ventana no la cierra: la abre las veinticuatro horas.**

### 3.5. Funcionario de campo · retirado

> **No hay sesión para este perfil.** Se retiró el 10 de septiembre de 2026: el personal de campo
> no entra al sistema y su orden de servicio se la entrega la Dirección por otro canal. Lo que sí
> conviene explicarle, en cualquier reunión, es que **su orden contiene solo su asignación** y que
> eso es deliberado.

---

## 4. Errores que conviene provocar en clase

Enseñar el sistema rechazando es más útil que enseñarlo aceptando: la mitad de las llamadas a
soporte son reglas funcionando bien.

| Provocar | Qué se aprende |
|---|---|
| Registrar con la ventana cerrada | El aviso aparece antes, no al guardar |
| Asignar a alguien que salió ayer en patrulla | El motivo se lee y no hay que llamar |
| Asignar a alguien de vacaciones o sin jornada laboral | La disponibilidad manda, y su motivo está en «No disponibles» |
| Agregar a alguien que «Se cruza» con otro operativo | El pie no deja registrar hasta cambiar el horario o quitarlo |
| Cerrar el cuadro con un nocturno sin conductor | El sistema nombra el operativo |
| Compartir unidad con más personas que asientos | «No caben a las 08:00…»: los asientos se cuentan por momento |
| Guardar parámetros con un valor fuera de rango | Ninguno se guarda y el error aparece bajo su fila |
| Dos personas editando el mismo operativo | El conflicto protege, no estorba |

---

## 5. Materiales

| Perfil | Documento |
|---|---|
| Todos | `01_Manual_Usuario.md` |
| Responsables de jornada | `02_Manual_Operativo.md` |
| Administrador | `03_Manual_Administrador.md` · `07_Manual_Configuracion.md` |
| Todos | `16_FAQ.md` |
| Formador | `17_KNOWN_ISSUES.md`, para no prometer lo que no hay |

---

## 6. Evaluación

| Perfil | Sabe usar el sistema si… |
|---|---|
| Carga | Registra un operativo completo en menos de cinco minutos y explica por qué alguien está en «No disponibles» |
| DAF | Completa los cuatro pasos de un día y explica por qué solo elige conductor y vehículo |
| Dirección | Cierra el cuadro, emite las órdenes y explica qué contiene una orden y qué no |
| Administrador | Da de alta un funcionario con su jornada laboral, le registra una ausencia y comprueba el efecto en P-01 |

---

## 7. Después de la capacitación

1. **Acompañamiento la primera semana**, en la franja de 14H00 a 16H30, que es cuando ocurre todo.
2. **Recoger las preguntas repetidas** e incorporarlas a `16_FAQ.md`.
3. **Vigilar la señal de adopción**: si alguien sigue mandando el cuadro por WhatsApp, el problema
   no es de capacitación sino de que el sistema le resulta más lento. Ahí conviene medir cuánto
   tarda de verdad un registro.
