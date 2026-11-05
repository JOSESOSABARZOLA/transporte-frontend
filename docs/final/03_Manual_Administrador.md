# 03 · Manual del Administrador

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Perfiles de administración · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Estado: refleja la rama `base/cuadro-colores` (backend `24520af`, frontend `d13a5db`).

---

## 1. Qué se administra y quién lo administra

Hasta septiembre había un solo perfil, `ADMINISTRADOR_DMIP`. Hoy son cuatro, y quién abre cada
pantalla lo decide un **permiso** (RBAC, 16-SEP-2026), no el nombre del rol. La tabla muestra los
permisos de la siembra; el administrador general puede cambiarlos en «Permisos por rol».

| Pantalla | Ruta | Permiso | Roles en la siembra |
|---|---|---|---|
| P-07 · Personal y disponibilidad | `/administracion/personal` | `personal:administrar` | Adm. DMIP (sus áreas), Adm. DMIT (Instrucción), Administrador |
| P-08 · Catálogos del cuadro | `/administracion/catalogos-cuadro` | `catalogos:administrar` | Adm. DMIP, Administrador |
| P-37 · Formularios del cuadro | `/administracion/formularios-cuadro` | `catalogos:administrar` | Adm. DMIP, Administrador |
| P-09 · Ventanas y parámetros | `/administracion/ventanas` | `ventanas:administrar`, `jornadas:administrar` o `parametros:administrar` | Cada pestaña con el suyo (ver §4) |
| P-10 · Roles de Auth central | `/administracion/roles-auth` | `roles-auth:administrar` | Adm. DMIP, Administrador |
| P-11 · Cuentas del cuadro | `/administracion/usuarios` | `usuarios:administrar` | Adm. DMIP, Administrador |
| P-36 · Permisos por rol | `/administracion/permisos` | `permisos:administrar` | Administrador |
| P-12 · Flota y garajes | `/administracion/flota` | `flota:administrar` | Adm. DAF, DAF, Administrador |
| M-38 · Turnos de conductores | `/administracion/turnos-conductores` | `flota:administrar` | Ídem |
| Traslados entre zonales | `/administracion/traslados` | `flota:administrar` | Ídem |
| M-39 · Carga inicial | `/administracion/carga-inicial` | `carga-inicial:administrar` | Administrador |

En el menú, Flota, Turnos y Traslados aparecen bajo **«Transporte · DAF»**; el resto, bajo
**«Administración»**.

**Ningún administrador registra operativos ni cierra el cuadro**, y sus ventanas de carga están
desactivadas a propósito: aplicar la restricción horaria a quien configura las ventanas crearía un
cepo del que no se sale desde la aplicación.

---

## 2. La jornada se abre sola

Cambió el 11 de agosto de 2026. **El primer operativo que se registra para una fecha abre su
jornada**; ya no hay que abrirla de antemano. Una fecha pasada no se abre («La jornada del … ya pasó
y no puede abrirse»).

- La semana, el año y **la orden de trabajo** se derivan de la fecha. La orden tiene el formato
  **`AMC-AAAA-MM-DD`** y su único uso es exponer el día en la matriz (PV-28).
- Para abrir una jornada por adelantado sigue `POST /api/v1/cuadros` con `{ "fecha": "AAAA-MM-DD" }`
  (permiso `cuadro:abrir`: Adm. DMIP y Administrador). **No tiene pantalla.** Enviar `ordenTrabajo`
  se rechaza con `400 CAMPOS_NO_PERMITIDOS`.
- **Cerrar y reabrir** son de la Dirección, desde la Matriz Consolidada. Ver
  `02_Manual_Operativo.md` §2.

---

## 3. P-07 · Personal y disponibilidad

**Es la única pantalla del sistema que muestra cédulas y teléfonos.** El resto trabaja con nombre y
área: el contrato que consumen las demás pantallas no incluye esos campos.

Cada administrador ve **solo sus áreas**, y lo acota el servidor: el DMIP ve «Unidad de Operativos»,
«Inspector General - DMIP» e «Inspector Técnico - DMIP»; el DMIT, «Personal de Instrucción».

### 3.1. Dos pestañas

Desde el 24 de octubre de 2026 la pantalla tiene **«Maestro de personal»** y **«Cobertura por
turnos»** (`?tab=maestro|cobertura`). La segunda solo aparece a quien gestiona Instrucción.

**Maestro de personal.** Búsqueda por cédula, nombre o cargo; filtros por área y por jornada
laboral; Activos (por omisión) | Inactivos | Todos; 10 filas por página. La columna Estado dice si
la persona está ausente («Ausente dd/mm–dd/mm») y sale de **una sola consulta**
(`GET /administracion/personal/ausencias`), no de una por fila. Acciones de la fila: Editar · Ver
turnos (solo Instrucción) · Ausencias · Desactivar / Reactivar.

**Cobertura por turnos.** La matriz mensual de turnos de Instrucción (Diurno, Nocturno, Descanso).
El clic cambia el turno en orden D → N → — → vacía, con «Deshacer»; Mayús+clic o arrastrar marcan un
rango. «Asignar turnos a esta persona» abre el cajón de asignación con los patrones rápidos, «Seguir
el ciclo de <mes anterior>» o «Personalizado». «Publicar mes» deja la versión que lee el registro y
habilita «Exportar». Las ausencias se ven con 🔒 y se editan en el cajón de Ausencias.

> **El turno de Instrucción decide la elegibilidad.** Con turno de descanso, o con un horario que no
> cae en su turno, el registro rechaza a la persona y lo dice. Las horas de cada turno son
> parámetros del Administrador DMIT (`HORA_TURNO_DIURNO_*`, `HORA_TURNO_NOCTURNO_*`).

### 3.2. Alta en dos pasos, desde el directorio de Auth

**«+ Nuevo funcionario»** abre un cajón con dos pasos:

1. **Elija a la persona.** El directorio lista a quienes están **activos** en Auth central. Por
   omisión oculta a quien ya tiene ficha vigente («Mostrar quienes ya tienen ficha» los trae); las
   bajas se ven pero no se eligen. Se busca por cédula, nombre o correo y se filtra por dependencia.
   Doble clic avanza.
2. **Complete la ficha.** Llega con cédula, apellidos y nombres de Auth, y el correo institucional
   lo toma el servidor de Auth.

**Si Auth no responde, o la persona no está allí, use «¿No aparece? Registro manual»**: abre la
ficha en blanco y no pasa por Auth en ningún momento.

> **Auth guarda el nombre en un solo campo.** Apellidos y nombres se separan suponiendo que los dos
> primeros son los apellidos. Con «DE LA TORRE PEREZ JUAN» sale mal: **revíselo**. Los dos campos
> son editables.

### 3.3. La ficha

| Campo | Nota |
|---|---|
| Cédula | Diez dígitos; desde el 28 de septiembre de 2026 se valida **solo el formato**. Si ya existe, el servidor dice a nombre de quién está. **No se edita después** |
| Apellidos · Nombres | Obligatorios |
| **Jornada laboral** | Obligatoria para que se la convoque: «Define en qué días y horas se la puede convocar. Sin jornada no se la convoca.» |
| Área | Obligatoria; solo las áreas que usted gestiona |
| Zonal | Opcional, para todas las áreas desde el 8 de octubre de 2026. Propone la zonal del operativo al asignarla |
| Cargo | Opcional |
| Correo institucional · Correo personal | Opcionales; el institucional llega de Auth en el alta desde el directorio |
| Teléfono | Opcional; debe empezar por `09` |

> **Cambió el 23 de octubre de 2026: «Tipo de contrato» ya no existe.** Lo reemplazó la **jornada
> laboral**, un catálogo que se administra en «Ventanas y parámetros › Jornadas laborales». La
> migración no asignó jornada a nadie: hay que asignarla ficha por ficha. La fila sin jornada lo
> dice con «⚠ Sin jornada».

### 3.4. Ausencias

Situaciones registrables: **Vacaciones, Permiso médico, Licencia, Capacitación, Comisión de
servicios, Calamidad doméstica y Permiso** (este último se conserva por los registros existentes).

- El cajón dice en vivo cuántos días se bloquean («✓ Se bloquearán N días (dd/mm al dd/mm)»).
- **No se pueden solapar** dos periodos de la misma persona (409 `AUSENCIA_SOLAPADA`) ni registrar
  una ausencia ya pasada (409 `AUSENCIA_PASADA`).
- Los periodos se leen como En curso, Próxima o Pasada; los pasados dicen «Historial» y no se
  quitan.
- La ausencia **no retira** a la persona de los operativos donde ya figura: el cajón lo avisa.
- El **motivo** es opcional, solo se ve aquí y no pasa a la auditoría.

### 3.5. Desactivar y reactivar

**La baja es lógica: la ficha no se borra.** «Desactivar» pide un motivo (Fin de contrato,
Renuncia, Traslado u Otro). «Reactivar» la devuelve «con su historial intacto». Las dos se
confirman.

### 3.6. Lo que esta pantalla no hace

- **No administra nada de Auth central**: ni cuentas, ni roles, ni correos, ni dependencias.
- **No crea la cuenta de acceso.** Tener **ficha** deja que a la persona se la convoque; tener
  **cuenta** deja que entre al sistema. La cuenta se crea en «Cuentas del cuadro», donde se indica
  la cédula de enlace con la ficha.

---

## 4. P-09 · Ventanas y parámetros

Desde el 24 de octubre de 2026 son **tres pestañas**, cada una con su permiso y recordada en
`?tab=`. Quien solo tiene una (el Administrador DAF ve solo Parámetros) no ve pestañas.

| Pestaña | Permiso | Roles en la siembra |
|---|---|---|
| Ventanas de carga | `ventanas:administrar` | Adm. DMIP, Administrador |
| Jornadas laborales | `jornadas:administrar` | Adm. DMIP, Administrador |
| Parámetros | `parametros:administrar` | Adm. DMIP, Adm. DMIT, Adm. DAF y Administrador, cada uno con su alcance |

### 4.1. Ventanas de carga

Seis ventanas, una por rol. **No se crean ni se eliminan.** La tabla muestra el estado **en vivo**
(abierta hasta…, cerrada hasta…) y una barra de 24 horas.

| Rol | Configuración inicial |
|---|---|
| DMIP Operativos · DMIP Inspecciones · DMIT Instrucción | Cierran a las 15H00 |
| DAF | 15H00 a 16H30 |
| Dirección · Administración | **Sin restricción** |

«Editar ventana de carga» abre un cajón con:

- **Tipo de ventana**: «Diario (todos los días)», «Solo días laborables» o «Sin restricción»
  (desde el 7 de octubre de 2026).
- **Horas** de apertura y cierre. La apertura vacía significa «desde las 00H00»; el cierre debe ser
  posterior a la apertura.
- **«Mensaje que verá el funcionario»**, con vista previa. Admite `{apertura}` y `{cierre}`, que se
  reemplazan por las horas reales. Si el texto lleva una hora fija que no coincide con el horario,
  la pantalla avisa y ofrece «Usar mensaje sugerido».
- **«Ventana vigente»**: desactivarla equivale a «Sin restricción».

> **Cambió el 8 de octubre de 2026: cada ventana se parametriza sola.** Al guardar ya no se compara
> con otras ventanas ni con `HORA_LIMITE_CUADRO`, y no hay advertencias cruzadas (RN-56/RN-57). La
> coherencia la aplica el sistema en ejecución: la DAF abre cuando cierra el registro, y la pantalla
> lo explica en la fila de la DAF.

**Eliminar una ventana la abriría, no la cerraría**: el sistema trata la ausencia de ventana como
«sin restricción». Por eso no hay borrado y se usa el tipo «Sin restricción», que lo dice de forma
explícita y deja rastro.

### 4.2. Jornadas laborales

El catálogo que reemplazó al tipo de contrato (23 de octubre de 2026). Cada jornada tiene **nombre**,
**días** (lunes a domingo) y un horario **Desde / Hasta** opcional: sin horario vale cualquier hora
de esos días.

- La siembra trae dos: «Lunes a Viernes 8 horas» (lunes a viernes, 08:00 a 16:00) y «Lunes a
  Domingo 24/7».
- «+ Nueva jornada» está en la cabecera. Cada fila dice cuántas fichas la usan («N fichas de
  personal →» abre Personal filtrado por esa jornada).
- **No se borra: se desactiva**, y quien la tiene la conserva.
- A los **conductores** se les suma `MINUTOS_TOLERANCIA_FIN_CONDUCTOR` (30): con la jornada de
  lunes a viernes pueden terminar hasta las 16:30.

### 4.3. Parámetros

Los parámetros se agrupan en secciones —Cuadro de colores · Jornada y descanso; Carga y fatiga;
Franjas y turnos del personal; y cinco de Transporte DAF (tramos, traslados, turnos del mes, flota,
optimizador)—, con buscador y filtros. El catálogo de la pantalla describe **54 claves**; una clave
que no esté en él aparece en «Otros».

Cada fila muestra su valor, su estado y quién la modificó por última vez, por **nombre**:

- **«Modificado»** cuando difiere del valor de siembra, con **«↺ Restaurar a <valor>»**;
- **«Sin configurar»** cuando la clave existe sin valor;
- **«Sin guardar»** mientras el cambio está en el borrador.

> **Cambió el 23 de octubre de 2026: se guarda todo junto.** No hay «Guardar» por fila. Los cambios
> se acumulan y la barra inferior fija («Cambios sin guardar», «Descartar», «Guardar cambios») los
> envía en un solo `PUT /parametros`, tras confirmar el resumen. **Se guardan todos o ninguno**: si
> uno no es admisible, el motivo aparece bajo su fila y nada se escribe.

**Cada administrador ve lo suyo.** El Administrador DMIT, solo los turnos y avisos de la cobertura
de Instrucción; el Administrador DAF, solo las claves `DAF_`; el DMIP y el general, todo menos los
turnos de Instrucción.

Los siete umbrales originales del cuadro siguen vigentes:

| Clave | Valor inicial | Qué gobierna |
|---|---|---|
| `JORNADA_MAXIMA_HORAS` | 12 | Horas máximas por persona y día (personal del cuadro) |
| `TOPE_SALIDAS_PESADAS` | 3 | Nocturnas o de fin de semana por período |
| `PERIODO_COMPUTO_SALIDAS` | MENSUAL | Sobre qué período se cuentan |
| `HORA_LIMITE_CUADRO` | 16:30 | Hora a la que el cuadro debe estar listo |
| `FRANJA_NOCTURNA_INICIO` | 20:00 | Inicio de la franja nocturna |
| `FRANJA_NOCTURNA_FIN` | 05:00 | Fin de la franja nocturna |
| `DIAS_DESCANSO_PATRULLA` | 1 | Días sin patrulla tras salir en patrulla |

> **Cada valor rige desde que se guarda, sin desplegar código.** Los valores iniciales siguen
> siendo provisionales y los fija la Dirección (PV-06). La hora de cierre de cada departamento no es
> un parámetro: vive en su ventana desde el 25 de agosto de 2026.

**La zona horaria** se muestra pero no se edita: cambiarla movería todas las ventanas a la vez.

---

## 5. P-08 · Catálogos del cuadro

Administra, **formulario por formulario**, lo que ofrece el registro de operativos.

> **Cambió el 13 de octubre de 2026: cada formulario tiene su configuración propia.** Zonales,
> puntos, tipos de control e instituciones son del formulario elegido; no hay copias entre
> formularios. Las rutas cuelgan del formulario (`/administracion/catalogos/:codigo/…`).

### 5.1. Cómo funciona

1. Elija el formulario en el selector bajo el título (con su color y número). Al cambiarlo se
   recarga todo y se limpia la búsqueda.
2. A su derecha están las **«ÁREAS DE PERSONAL ADMITIDAS»**; «Cambiar» las despliega. **Es el único
   sitio donde se editan** las áreas de un formulario; de ellas depende a quién ofrece el registro.
3. Tres pestañas: **«Puntos de encuentro y zonales»**, **«Tipos de control»** e **«Instituciones
   participantes»**, con buscador y Todos | Activos | Inactivos.
4. Alta y edición en un cajón: «+ Nueva zonal», «+ Nuevo punto de encuentro», «+ Nuevo tipo de
   control», «+ Nueva institución». Un nombre repetido se avisa mientras se escribe.

### 5.2. Zonales y puntos

Las zonales se leen en **acordeón**, con sus puntos dentro («Expandir todo» / «Contraer todo»). Una
zonal nueva elige su **zona de la ciudad**; cuando el formulario ya tiene una por cada zona, la
pantalla lo dice. El buscador filtra por zonal o por punto, sin tildes.

Una zonal sin puntos no produce ningún error: el día del registro no ofrece ningún punto. Por eso
conviene revisar que cada zonal tenga los suyos mientras se completa la matriz zonal ↔ punto
(PV-01).

### 5.3. Desactivar, reactivar y eliminar

| Acción | Cuándo | Efecto |
|---|---|---|
| **Desactivar** | Un valor que ya no se ofrece | Deja de aparecer en el registro; los operativos que lo usaron se siguen leyendo |
| **Reactivar** | Un valor desactivado | Vuelve a ofrecerse |
| **Eliminar** | **Solo si nunca se usó** | Se borra definitivamente. Si está en uso, el botón llega apagado con el motivo del servidor |

> Hasta septiembre desactivar era irreversible desde la interfaz (PV-36). Hoy el filtro Inactivos y
> «Reactivar» lo resuelven.

### 5.4. Zonas de la ciudad

Desde el 5 de noviembre de 2026 las zonas de la ciudad —la lista de la que salen las zonales de cada
formulario, la ficha de personal, la flota y la matriz de traslados— se administran en
**Administración › Zonas de la ciudad**, con el mismo permiso que Catálogos.

| Acción | Cuándo | Efecto |
|---|---|---|
| **+ Nueva zona** | Una zona que aún no existe, como «Matriz» | Nombre, sector (Norte, Centro, Sur o Valle) y orden. El código se genera solo |
| **Editar** | Corregir el nombre, el sector o el orden | Cambiar el sector cambia el tiempo de traslado por defecto; la pantalla avisa cuántos traslados afecta |
| **Desactivar** | Una zona que ya no se ofrece | Solo cuando ningún formulario la tiene activa: antes se desactiva su zonal en Catálogos |
| **Eliminar** | Solo si nunca se usó | Se borra con sus tiempos de traslado |

El DMQ es todo el distrito y no se modifica. Una zona nueva no aparece sola en los formularios:
después de crearla se agrega en cada uno desde Catálogos, en «+ Nueva zonal».

---

## 6. P-37 · Formularios del cuadro

Llegó el 29 de septiembre de 2026 y se rediseñó el 13 de octubre. Crea, edita y da de baja
formularios sin tocar la base. Tabla con buscador y Vigentes | Inactivos | Todos.

El cajón tiene cinco secciones:

| Sección | Qué se fija |
|---|---|
| Identificación | Número (1 a 99), código, prefijo del identificador y nombre en mayúsculas. **Al editar, número y código quedan fijos.** Número, código y prefijo no se pueden repetir entre formularios |
| Color en el cuadro | Una de las **24 muestras** de la paleta. Un color ya usado avisa, no bloquea |
| Responsable y transporte | Departamento dueño, política de vehículo (No aplica · Condicional · Siempre requiere vehículo) y transporte por defecto al registrar |
| Áreas de personal | Solo lectura, con enlace a Catálogos |
| Comportamiento al registrar | Patrulla, condicionante nocturno, varios tipos de control, captura libre de punto o tipo, punto manual, filtro por rol, un operativo por persona, cantidad por persona, una sola área |

Un formulario nuevo nace **sin áreas**: hasta que se le asignen en Catálogos, el registro no ofrece
personal.

---

## 7. Cuentas, roles de Auth y permisos

### 7.1. P-11 · Cuentas del cuadro

**«+ Nueva cuenta» abre el directorio de Auth central**, el mismo del alta de personal. Se elige a
la persona y su usuario de Auth, su correo y su nombre llegan al formulario. Solo quedan los roles,
que nacen vacíos y son obligatorios. Si Auth no responde, **«¿No aparece? Registro manual»**.

> **Por qué importa que el usuario no se teclee.** `usua_identificador_ad` es la llave con la que se
> canjea la sesión y el sistema no la comprueba contra Auth al guardar: escrito mal, la cuenta se
> crea sin aviso y esa persona no puede entrar. La pantalla avisa si hay una cuenta activa sin
> usuario de Auth.

La **cédula de enlace** une la cuenta con la ficha de personal (`t_usuario.func_id`). Desactivar una
cuenta la conserva: «La cuenta se conserva y puede volver a activarse.».

### 7.2. P-10 · Roles de Auth central

Dice qué rol de Auth abre qué rol del cuadro. «+ Nuevo rol» y «Desactivar» (reversible). Sin su
fila aquí, un rol del cuadro se puede asignar en Cuentas pero nadie lo recibe desde el portal.

### 7.3. P-36 · Permisos por rol

Desde el 16 de septiembre de 2026. Matriz rol ↔ permiso (`modulo:accion`): marcar, desmarcar y
guardar cambia el acceso **sin desplegar** y rige en la siguiente petición. Solo la abre quien tiene
`permisos:administrar` (el Administrador general).

Dos reglas siguen en el código y no se cambian aquí: **solo la Dirección emite órdenes de servicio**,
aunque otro rol reciba `ordenes:gestionar`, y la ventana de carga sigue siendo por rol.

---

## 8. P-12 · Flota y garajes

Rediseñada el 14 de octubre de 2026 y ajustada el 20. **Cinco indicadores** clicables —Conductores
activos, Vehículos activos, En taller hoy, Documentos por vencer y Sin conductor habitual— y **tres
pestañas**: Conductores (por omisión) · Vehículos · Garajes autorizados. El filtro arranca en
Activos.

### 8.1. Vehículos

| Campo | Nota |
|---|---|
| Placa | Formato AAA-999 o AAA-9999, exigido al crear o al cambiarla. Se normaliza: `PMA3370`, `pma-3370` y `PMA 3370` son `PMA-3370` |
| Tipo · Descripción | La descripción distingue dos placas parecidas |
| Asientos | Los usa la DAF al compartir unidad |
| Kilometraje | Tope `DAF_KM_MAXIMO`; un valor inusual se marca con «Revisar» |
| Matrícula vence · SOAT vence | Alimentan «Documentos por vencer» (`DAF_DIAS_AVISO_VENCIMIENTO`) |

La pestaña tiene **Lista** y **Calendario semanal** y una columna **Disponibilidad** («Disponible» o
«En taller hasta …»).

**«Programar mantenimiento»** (permiso `flota:mantenimiento`) abre un cajón con Desde, Hasta y
Motivo, una cita opcional en el taller y las paradas ya programadas. Una parada que se cruza con
otra se rechaza. Si hay traslados ya asignados en ese rango, se avisa antes de guardar: **la parada
no los retira**, se reasignan en «Planificar el día».

> Desde el 20 de octubre de 2026 la página «Mantenimiento de vehículos» ya no existe; su dirección
> lleva al calendario de la pestaña Vehículos.

### 8.2. Conductores

| Campo | Nota |
|---|---|
| Cédula | Diez dígitos. No se edita después |
| Apellidos y nombres · Teléfono | |
| Vehículo habitual | Propone la placa en «Planificar el día». **Se puede cambiar por otro, pero no vaciar**: el contrato del servidor no lo admite |
| Tipo de licencia | |
| Sector donde vive | Norte, Sur, Centro o Valle |
| **Jornada laboral** | Sin ella no se le asigna transporte (`SIN_JORNADA`); la fila dice «⚠ Sin jornada» |
| Patrón de rotación | Se arma con el constructor de patrones; alimenta la propuesta de turnos |
| Parqueadero | «Tiene parqueadero autorizado», con N.º de acta y vigencia (desde, hasta) |

**Ausencias de los conductores** (desde el 16 de octubre de 2026, permiso `flota:ausencias`): el
botón de la fila abre el mismo cajón que en Personal, con las mismas situaciones y reglas. Los
tramos que el conductor ya tiene en el rango se avisan; la ausencia no los retira.

### 8.3. Garajes autorizados

Dónde puede quedar un vehículo al terminar la jornada: nombre y zonal. «Planificar el día» sugiere
el más cercano a la zona del último operativo.

### 8.4. Dar de baja y reactivar

La baja es **lógica** y desde el 20 de octubre de 2026 guarda **cuándo y quién** (se ven en el
tooltip de «De baja»). Se pregunta «¿Dar de baja PMA-7056?» y decide el servidor: la rechaza, con el
motivo, si quedan traslados por terminar, un mantenimiento abierto, tareas del conductor o un
vehículo que duerme en ese garaje. Hecha, el aviso ofrece **«Deshacer»**, y **«Reactivar»** está en
la fila.

> Hasta el 20 de octubre la baja de flota no se podía deshacer desde la pantalla. Ya no es así.

---

## 9. Lo demás de la DAF

### 9.1. M-38 · Turnos de conductores

La misma matriz que la cobertura de Instrucción, con los turnos **Día, Noche, ECU noche, Libre y
Administrativo**. Propios de la DAF: «Generar propuesta del mes» (con los patrones de cada conductor
y los mínimos `DAF_MIN_CONDUCTORES_DIA` / `DAF_MIN_CONDUCTORES_NOCHE`), «Copiar mes anterior»,
«Publicar mes» y «Exportar Excel» / «Exportar PDF» de lo publicado. «Planificar el día» lee estos
turnos.

### 9.2. Traslados entre zonales

Una matriz de **minutos de traslado** entre zonales, dirigida. Lo que no se llena usa la regla
general: misma zona `TRASLADO_MISMA_ZONA_MIN`, mismo sector `TRASLADO_MISMO_SECTOR_MIN`, otro sector
`TRASLADO_OTRO_SECTOR_MIN`. Desde el 21 de octubre de 2026 está cargada la matriz validada del DMQ
que entregó la DAF (90 pares).

- Cada celda dice si es propia o de la regla general, con escala de color y el rango en palabras;
  «Restablecer a la regla general» la devuelve.
- **Antes de guardar se verifica el impacto**: si alguna asignación, desde hoy y por 60 días,
  dejaría de llegar, sale «Advertencia de impacto» con la lista y [Cancelar] / [Guardar igual].
  Guardar no retira nada.
- Salir con cambios sin guardar pregunta antes.

### 9.3. M-39 · Carga inicial

Solo del Administrador general y **de un solo uso**: sube desde un `.xlsx` conductores, vehículos,
garajes y turnos del mes. Tres pasos: elegir qué y el archivo, «Previsualizar» (el servidor valida
fila por fila sin escribir) y «Aplicar N filas válidas».

---

## 10. Lista de comprobación de puesta en marcha

| # | Tarea | Pantalla o vía | Estado |
|---|---|---|---|
| 1 | Catálogos base y los nueve formularios | `npx prisma migrate deploy` | ✅ Viven en las migraciones desde el 19-AGO-2026; 104 migraciones a la fecha |
| 2 | Áreas admitidas de cada formulario | P-08 | Revisar en cada formulario |
| 3 | Matriz zonal ↔ punto por formulario | P-08 | ⏳ **PV-01** |
| 4 | Maestro de personal | P-07 | ⏳ **PV-02** |
| 5 | **Jornada laboral de cada ficha y cada conductor** | P-07 y P-12 | ⏳ **Nueva desde el 23-OCT-2026**: la migración no asignó ninguna y sin ella no se convoca |
| 6 | Conductores, vehículos y garajes | P-12 o M-39 | ⏳ **PV-03**: la vía existe; faltan los datos de la DAF |
| 7 | Turnos de conductores y cobertura de Instrucción del mes | M-38 y P-07 › Cobertura | Mensual |
| 8 | Matriz de traslados entre zonales | Traslados | ✅ Cargada la del DMQ (21-OCT-2026) |
| 9 | Confirmar los parámetros | P-09 › Parámetros | ⏳ **PV-06** |
| 10 | Criterio de prefijo del formulario 7 | — | ⏳ **PV-27**, abierto solo para el 7 |
| 11 | Formato de orden de cada departamento | «Órdenes de servicio» › «Editar plantilla» (Dirección) | Una vez por departamento |
| 12 | Cuentas con su cédula de enlace | P-11 | Por persona |
