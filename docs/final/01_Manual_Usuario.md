# 01 · Manual de Usuario

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Versión 0.1.0 · 7 de agosto de 2026 · actualizado el 19 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> **Qué cambió en esta revisión.** El manual describe el sistema tal como está el 5 de noviembre
> de 2026. Desde septiembre cambiaron, entre otras cosas: la pantalla de la DAF («Planificar el
> día», en cuatro pasos), el registro del operativo (horario del operativo, personal por área,
> patrulla y formulario 8 por zonas), «Mis operativos» (rango de fechas y «Ver detalle»), las
> órdenes de servicio (solo la Dirección, un formato por departamento) y la jornada laboral, que
> reemplazó al tipo de contrato el 23 de octubre de 2026. «Mis órdenes» y el perfil de
> funcionario de campo se retiraron el 10 de septiembre de 2026.

---

## 1. Para qué sirve este sistema

El **Cuadro de Colores** es el compilado diario de los operativos que la AMC ejecutará al día
siguiente. No es una herramienta de planificación: cada dirección planifica en sus propios
instrumentos y aquí se consolida **qué personal se moviliza, a qué punto y con qué vehículo**.

Nació de dos problemas concretos:

1. Una sola persona consolidaba todo a mano y dejó el cargo sin traspaso.
2. El cuadro circulaba por WhatsApp y los intervenidos se anticipaban al operativo.

De ahí sus dos decisiones de fondo: **nueve formularios independientes**, uno por departamento, y
**órdenes de servicio individuales** que entregan a cada funcionario únicamente su propia
asignación.

---

## 2. Cómo entrar

| Dato | Valor |
|---|---|
| Dirección | La que le indique su administrador para su ambiente (pruebas o producción) |
| Autenticación | **Portal institucional de Auth**, con su usuario y contraseña de siempre |

**Usted no escribe su clave en este sistema.** Al abrir la dirección, el Cuadro de Colores le envía
al portal institucional; allí se identifica, elige el rol **«Transporte»** y el portal le devuelve
ya dentro. Si ya tenía la sesión abierta, entra directamente.

### Paso a paso, la primera vez

1. Abra la dirección. Verá la pantalla del portal institucional.
2. Escriba su usuario y contraseña.
3. Si tiene varios roles, aparece **«Seleccione un rol»**. Elija el que empieza por **«Transporte»**.
4. Entra al Cuadro de Colores, y el menú de la izquierda muestra **solo lo que su perfil puede usar**.

**La sesión dura ocho horas.** Pasado ese tiempo, o si cierra sesión, vuelve al portal.

> **Su perfil no lo elige usted.** Lo determina el sistema a partir de su cuenta institucional. Si
> ve menos opciones de las que espera, no es un fallo de la pantalla: es el perfil que tiene
> asignado. Hable con el administrador.

> **Si al entrar le dice que su usuario no está dado de alta**, es exactamente eso: el portal le
> reconoció, pero **el Cuadro de Colores todavía no le tiene registrado**. No es un error suyo.
> Pídale al administrador que le dé de alta en «Cuentas del cuadro».

### Perfiles disponibles

Los nombres son los que muestra el sistema. Una persona puede tener **varios perfiles** a la vez y
ve la unión de lo que cada uno abre.

| Perfil | Qué puede hacer |
|---|---|
| DMIP · Unidad de Operativos | Registrar y editar operativos de los formularios 1, 2, 3 y 4 |
| DMIP · Inspecciones Técnicas y Generales | Ídem, formularios 5, 6 y 8 |
| DMIT · Instrucción | Ídem, formularios 7 y 9, y **aportar personal** de Instrucción a los formularios 4 y 6 |
| DAF · Transportes | Planificar el día: asignar conductor y vehículo; turnos, flota y traslados |
| Dirección | Ver la matriz consolidada, exportarla, cerrar y reabrir el cuadro, y emitir órdenes |
| Administración · DMIP | Catálogos, formularios, personal, ventanas, parámetros, jornadas laborales y cuentas |
| Administración · DMIT | Personal y disponibilidad, solo de Instrucción, su cobertura por turnos y los parámetros de turno |
| Administración · DAF | Flota y garajes, turnos de conductores, traslados entre zonales y los parámetros de la DAF |
| Administración del sistema | Todo lo anterior de administración, más «Permisos por rol» y «Carga inicial» |

> **Cambió el 10 de septiembre de 2026: ya no existe el perfil «Funcionario de campo».** El
> personal de campo no entra al sistema. Sus órdenes de servicio las emite la Dirección y se le
> entregan por otro canal. La pantalla «Mis órdenes» se retiró con él (ver §9).

> **Desde el 16 de septiembre de 2026 lo que abre cada perfil es un permiso**, y el administrador
> del sistema puede cambiarlo en «Permisos por rol» sin esperar una nueva versión. La tabla de
> arriba describe lo que tiene cada perfil hoy.

---

<a id="3-las-doce-pantallas"></a>

## 3. Las pantallas

El menú tiene tres grupos. Cada perfil ve **solo lo que le corresponde**. Los ítems que no le
corresponden aparecen atenuados y no se pueden abrir: es deliberado, para que usted sepa que existen
y que no son suyos, en lugar de suponer que el sistema se equivocó.

**Cuadro de Colores**

| Pantalla | Ruta | Quién entra |
|---|---|---|
| Registro de operativo | `/home/cuadro/registro` | Los tres perfiles departamentales |
| Mis operativos | `/home/cuadro/mis-operativos` | Ídem |
| Jornada del Día | `/home/cuadro/jornada` | Ídem, cada uno con **sus** formularios |
| Matriz Consolidada | `/home/cuadro/matriz` | **Solo Dirección** |
| Órdenes de servicio | `/home/cuadro/ordenes` | **Solo Dirección** |

**Transporte · DAF**

| Pantalla | Ruta | Quién entra |
|---|---|---|
| Planificar el día | `/home/cuadro/transporte` | DAF |
| Turnos del mes | `/home/administracion/turnos-conductores` | DAF, Administración · DAF y del sistema |
| Flota y garajes | `/home/administracion/flota` | Ídem |
| Traslados entre zonales | `/home/administracion/traslados` | Ídem |

**Administración**

| Pantalla | Ruta | Quién entra |
|---|---|---|
| Personal y disponibilidad | `/home/administracion/personal` | Administración · DMIP, · DMIT y del sistema |
| Catálogos del cuadro | `/home/administracion/catalogos-cuadro` | Administración · DMIP y del sistema |
| Formularios del cuadro | `/home/administracion/formularios-cuadro` | Ídem |
| Ventanas y parámetros | `/home/administracion/ventanas` | Según la pestaña (ver `03_Manual_Administrador.md`) |
| Roles de Auth central | `/home/administracion/roles-auth` | Administración · DMIP y del sistema |
| Cuentas del cuadro | `/home/administracion/usuarios` | Ídem |
| Permisos por rol | `/home/administracion/permisos` | Administración del sistema |
| Carga inicial | `/home/administracion/carga-inicial` | Administración del sistema |

> Las pantallas de administración se describen en `03_Manual_Administrador.md`. Este manual cubre
> el ciclo diario del cuadro (§4 a §8) y, en resumen, las tres pantallas de apoyo de la DAF (§6.1).

> **Direcciones antiguas.** «Jornada de los conductores» y «Capacidad de flota» llevan ahora a
> «Planificar el día», y «Mantenimiento de vehículos» lleva a «Flota y garajes», pestaña
> Vehículos, en el calendario semanal. Un enlace guardado sigue funcionando.

### Lo que comparten todas las pantallas

Desde el 24 de octubre de 2026 todas siguen la misma plantilla:

- **Encabezado**: el módulo arriba, el título, el chip **«Perfil: …»** con su rol de la sesión y,
  cuando aplica, la fecha escrita en palabras («Sábado 24 de octubre de 2026») y los selectores a
  la derecha.
- **Panel de la tabla**: cabecera azul con el título o las pestañas, una barra blanca de filtros
  y, al pie, «Mostrando X–Y de Z».
- **Acciones de fila**: en las tablas con muchas columnas son botones de icono. **Pase el ratón o
  el foco por encima** y aparece su nombre; si están apagados, el motivo.
- **Formularios en un cajón lateral** que se abre a la derecha, con el estado en el pie («Sin
  cambios pendientes», «Cambios sin guardar», «Falta: …», «Listo para guardar»). Si cierra con
  cambios, pregunta **«¿Descartar cambios?»**.
- **Los horarios** se escriben en una línea: «08H00 a 16H30».

---

## 4. P-01 · Registro de operativo

Es la pantalla donde pasa la mayor parte del trabajo. La meta declarada por el Product Owner es
**registrar un operativo en dos o tres minutos**.

### 4.1. Antes de empezar, el sistema le dice si puede

Arriba de todo verá el estado de la jornada. Hay tres situaciones que impiden capturar, y **cada
una se avisa antes**, nunca al guardar:

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| «Sin jornada abierta» | Nadie abrió el cuadro del día | Pedir al administrador que lo abra |
| «Su ventana cierra a las …» / ventana vencida | Su departamento ya no puede cargar hoy | Esperar a mañana, o usar «Adicional» (§5.1) si es una urgencia |
| «El cuadro del … fue cerrado por la Dirección» | La jornada está firmada | Solicitar reapertura a la Dirección |

El aviso de ventana **se actualiza solo cada minuto**: si está escribiendo a las 14H59, verá
aparecer el bloqueo sin recargar la página. La hora de cierre la fija el administrador en
«Ventanas y parámetros»; la que trae el sistema es las **15H00**.

### La cuenta atrás hasta el cierre

**Desde el 25-AGO-2026 la pantalla le dice cuánto le queda**, sin que tenga que mirar el
reloj. El aviso cambia de tono conforme se acerca la hora:

| Falta | Color | Verá |
|---|---|---|
| Más de una hora | **verde** | «Falta **02:20** para cerrar la ventana, está activa hasta las 15H00.» |
| Entre media hora y una hora | **amarillo** | «Falta **00:55**… No empiece un operativo que no vaya a terminar.» |
| **Media hora o menos** | **rojo** | «Falta **00:28**… Guarde lo que tenga capturado: después no podrá registrar ni editar.» |

Está en **Registro de operativo** y **Mis operativos**. En «Planificar el día» la DAF ve su propio
aviso de ventana (§6).

> **La cuenta atrás informa; quien decide es el servidor.** Si por lo que sea su reloj no
> coincide, el que manda es el sistema: el bloqueo llega cuando llega, diga lo que diga la
> cuenta.

### 4.2. Los pasos

> **Cambió el 16 de octubre de 2026.** El registro se rediseñó: un selector de formulario con
> buscador, el personal a la izquierda y el lugar, el control y el transporte a la derecha, y un
> pie que dice en palabras qué falta. El 31 de octubre se sumó el «Horario del operativo».

1. **Elija el formulario** en la barra azul **«FORMULARIO»**. Al abrirla verá un buscador (por
   número, nombre o código, sin importar tildes), los formularios agrupados por departamento y, en
   cada uno, cuántos operativos lleva hoy («3 hoy»). A la derecha, **RECIENTES**: los tres últimos
   que usó. Aparecen **solo los formularios en los que su departamento registra** y, marcados
   «Aporta personal», aquellos a los que solo aporta gente. Debajo de la barra, una línea de ayuda
   resume lo que pide ese formulario (vehículo siempre requerido, condicionante nocturno…).

   > **Cambiar de formulario no borra nada.** Cada formulario y cada fecha guardan su propia
   > captura: si deja el 2 a medias, va al 4 y vuelve, encuentra el 2 como lo dejó. La captura
   > también sobrevive si sale a otra pantalla y vuelve. Se vacía al pulsar «Limpiar», al
   > registrar con éxito o al cerrar sesión.
2. **Compruebe los datos calculados.** Semana, fecha, orden de trabajo y estado se muestran como
   etiquetas grises. **No son campos**: los deriva el sistema y nadie los escribe. Es a propósito:
   el problema original era equivocarse en el año y en el secuencial al escribirlos a mano.
3. **Personal y horario.** Es la tarjeta de la izquierda.
   - **«Horario del operativo \*»**: inicio y fin, de una lista en intervalos de media hora. Quien
     agregue lo hereda, y puede cambiar el de una persona en su línea. Si después cambia el horario
     general, el sistema pregunta **«¿Aplicar el nuevo horario?»** a quienes tenían el anterior.
     Un horario que cruza la medianoche **es válido** (22H00 a 02H00) y se marca «Termina al día
     siguiente».
   - **DISPONIBLES**: tarjetas con nombre, «Cargo · N op. esta semana» y la etiqueta **«Carga
     baja / media / alta»**, que cuenta operativos de la semana. «Sugerido» marca a quien lleva
     menos que su parte. Pulse **«+ Agregar»** en la tarjeta; **«Completar con N de menor carga»**
     agrega hasta cuatro de una vez.
   - Con el horario puesto, cada tarjeta dice si esa persona ya tiene algo ese día: **«Ocupado
     08H00–16H30»** (ámbar, no se cruza) o **«Se cruza 18H00–22H00»** (rojo). Pulse la etiqueta y
     verá en qué operativo está. Quien se cruza va al final de la lista.
   - **SELECCIONADOS**: cada persona con su horario y su «✕» para quitarla. Si se cruza, lo dice
     debajo de ella y el pie no deja registrar hasta que cambie el horario o la quite.
   - **«▸ No disponibles (N)»**, plegado al final: quien no puede salir, **con su motivo** —ausencia,
     sin jornada laboral, descanso tras patrulla, tope de salidas— y «+ Agregar» apagado.
   - **«Ver reparto de carga»**, junto al título, muestra cómo va repartido el trabajo.

   > Si alguien no aparece **en absoluto**, ni en «No disponibles», es que su área no participa en
   > ese formulario. Y si el motivo dice solo que «no está disponible», es una ausencia
   > registrada: la causa no se publica.

   > **Personal por área (desde el 4 de noviembre de 2026).** En los formularios que admiten
   > Inspector General e Inspector Técnico —hoy el 5 y el 6— la lista va en **pestañas por área**,
   > con el número de candidatos, General primero. No hay pestaña «Todas».
4. **Lugar.** Elija una o varias **zonales** y el **punto de encuentro**. Al quitar la zonal del
   punto elegido, el punto se limpia.
5. **Control.** **Instituciones** participantes (al menos una) y **tipo de control**.

   El campo de instituciones se escribe, no se despliega. Teclee parte del nombre y la lista se
   recorta; **las tildes no importan**, «secretaria» encuentra «Secretaría». Enter elige la
   resaltada, las flechas mueven, Esc cierra. Cada institución elegida queda como una etiqueta con
   su aspa, y **Retroceso con el campo vacío quita la última**. A partir de la quinta se resumen
   —«AMC, CACMQ +3»—; pulse el «+3» para verlas todas y poder quitar cualquiera.

   En los formularios que lo permiten, el tipo de control admite escribir uno que no está en la
   lista: aparece como «OTRO · …».
6. **Transporte requerido.** Seis opciones; la marcada «(sugerido)» es la que propone el formulario:

   | Opción | Qué pide a la DAF |
   |---|---|
   | Completo | El vehículo se queda con el equipo durante todo el operativo |
   | Solo dejar | Dejar al equipo en el punto al inicio; regresa por su cuenta |
   | Solo retirar | Recoger al equipo al terminar; llega por su cuenta |
   | Dejar y retirar | Dejar al inicio y recoger al final; entre medio el conductor queda libre |
   | Propios medios | Nada: no se solicita vehículo |
   | Vehículo de otra institución | Nada: el personal va en el vehículo de otra institución (desde el 22 de octubre de 2026) |

   - **«Requiere vehículo exclusivo (macrooperativo)»** solo aparece con «Completo».
   - **Compartir unidad.** Si otro operativo de su departamento va al mismo punto y horario, aparece
     el aviso «Se detectó la solicitud X… ¿Desea solicitar esta movilización en la misma unidad?» y
     una casilla **«Solicitar compartir unidad con X»**. Es una petición: la DAF decide. Si no la
     marca, también decide la DAF.
7. **Observaciones**, si hacen falta. Son **notas**: escriba y pulse **«Agregar»** (o Enter). Cada
   nota muestra autor, fecha y hora; antes de registrar puede corregirla o quitarla. Si deja una
   nota escrita sin pulsar «Agregar», se suma sola al registrar y el aviso se lo dice.
8. **Revise el pie y pulse «Registrar operativo».** El pie dice desde el principio qué falta
   —«Falta: personal, zonal, punto de encuentro…»—, en rojo si intentó registrar, y **«Listo para
   registrar · N efectivos · <transporte>»** en verde cuando está completo. **«Limpiar»** vacía la
   captura de este formulario y pregunta antes.

### 4.3. Qué pasa al guardar

- Un aviso breve, abajo a la derecha, confirma el identificador asignado —por ejemplo
  `OCF-003-07-AGO-2026`—.
- La fila aparece en la tabla de abajo, resaltada.

  > **La tabla trae la jornada entera del formulario**, no solo lo de esta sesión: la pide al
  > servidor. Si el formulario lo comparten dos departamentos (el 4), verá también filas ajenas,
  > con «Editar» apagado y el motivo.

- **Cada fila tiene cuatro acciones con icono** (pase el ratón para ver el nombre):

  | Icono | Acción | Qué hace |
  |---|---|---|
  | ✎ | Editar | Abre el cajón **«Editar operativo»**. Los cambios, también los del personal, esperan a **«Guardar cambios»** |
  | + | Agregar adicional | Ver §5.1 |
  | 👁 | Ver detalle | La ficha del operativo **en solo lectura** (§5) |
  | 🗑 | Eliminar | Pregunta antes y retira el operativo (§5) |

  Con la ventana cerrada o el cuadro cerrado, la fila solo ofrece «Ver detalle» (y «Agregar
  adicional» si el cuadro sigue abierto).

- **Columnas Conductor y Vehículo.** Si eligió «Propios medios» —o el formulario no habilita
  vehículo: **1 · FIJOS, 3 · LIMPIA y 9 · CBQ**— leerá **«Propios medios»** y **«No se activa»**.
  Con «Vehículo de otra institución» leerá **«Otra institución»**. En los dos casos no hay nada que
  esperar de la DAF. En los demás verá que la DAF todavía no asigna, que es lo normal al registrar.
- **Columna Observaciones.** Cada nota es una tarjeta con su autor y hora; la petición de compartir
  unidad va aparte, como «↗ Comparte con <identificador>».

**Si algo se rechaza, lo capturado no se pierde.** El motivo se muestra tal como lo redacta el
sistema: bajo la persona si es de una persona, o en un mensaje con «Ver detalle» si es de la
operación. Usted corrige solo lo que haga falta.

### 4.4. Lo que usted no completa

**Conductor y vehículo nacen vacíos y los llena la DAF**, en su propia pantalla y en su propia
ventana horaria. No es un campo que falte: es el reparto de responsabilidades del cuadro.

### 4.5. Formularios con forma propia

Tres formularios no se registran como los demás. **Lo decide la configuración del formulario**, no
su número, así que si el administrador cambia esa configuración, cambia la pantalla.

**Patrulla · formularios 5 y 6** (DMIP · Inspecciones).

- Cada persona recibe **su propio código** según su área: `IGECU`/`ITECU` en el 5, `IGNECU`/`ITNECU`
  en el 6. En las listas toda la patrulla se ve como **un solo operativo**.
- Si falta un área de inspección, el pie dice «Falta: Inspector Técnico · puede registrar igual».
  **No bloquea.**
- En el 6, **DMIT · Instrucción aporta** su persona después, con «Agregar personal» (§5.2), y recibe
  su propio código `INECU`.
- **«Editar»** abre «Editar operativo» con toda la patrulla. Para cambiar a una persona por otra de
  la misma área use **«Cambiar por…»**: conserva el código.
- **«Eliminar»** retira la patrulla completa y lo dice antes: «¿Eliminar el operativo completo?»,
  con la lista de códigos y personas. Para quitar a una sola persona, use «Editar operativo».

**Formulario 8 · Inspecciones Técnicas y Generales, por zonas** (desde el 28 de octubre de 2026).

- **Una persona y un tipo de personal por operativo.** Primero elija **«1 · Tipo de personal \*»**
  (Inspector General o Técnico) y después la persona. Con alguien elegido, las demás tarjetas dicen
  «Reemplazar».
- La columna derecha cambia por **«3 · Zonas»**. Cada zona lleva zonal, punto, **cantidad** de
  controles, instituciones y tipo de control. La Zona 1 toma la zonal de la persona en el Maestro,
  marcada «Principal para transporte».
- **«Agregar zona»** copia instituciones y tipo de control de la anterior.
- El resumen anuncia los códigos antes de registrar: «Se generarán 14 identificadores: La Delicia
  13 (IG-030 a IG-042) · Calderón 1 (IG-043).».
- En las listas el registro es un bloque: lo común una vez y cada zona con su rango. Editar,
  Ver detalle y Eliminar actúan sobre **el registro completo**.

**Formulario 4 · ECU.** Lo registra DMIP · Unidad de Operativos y DMIT · Instrucción aporta personal
(§5.2).

---

## 5. P-02 · Mis operativos

Para comprobar lo registrado, corregir y retirar.

> **Cambió el 13 de octubre de 2026: consulta un rango de fechas.** Arriba hay **«Desde»** y
> **«Hasta»** y los atajos **Hoy · Ayer · Esta semana · Últimos 7 días · Este mes**. El rango máximo
> lo fija el sistema (hoy, 31 días). Se abre en la jornada que usted está armando, que es la de
> mañana (RN-01: el cuadro se elabora la víspera).

- **Filtros por columna.** Escriba en la caja de cualquier columna: identificador, formulario,
  horario, personal, punto, estado u observaciones. Se busca **sin distinguir tildes ni
  mayúsculas**, así que «redrovan» encuentra «REDROVÁN».
- **Formulario**: un punto de su color y «N · CÓDIGO»; el nombre completo, al pasar el ratón.
- **Estado del transporte:** «Pendiente», «Asignado», «Propios medios» u «Otra institución»,
  siempre con la palabra además del color.
- **Acciones**: las mismas cuatro de §4.3. En los registros agrupados (patrulla, formulario 8)
  van **una sola vez**, en la celda «Todo el operativo».

**«Ver detalle» es solo mirar** (desde el 27 de octubre de 2026). Abre la ficha del operativo
—«Detalle del operativo»— con un resumen (Horario · Lugar · Personal), cada persona con su
teléfono y horario, Lugar y control, Transporte y Observaciones. Si el transporte falta, lo dice:
«Transporte pendiente: la DAF todavía no asigna conductor ni vehículo.». Al pie, quién lo registró
y cuándo. Si usted puede editarlo, la ficha ofrece «Editar».

**«Editar»** abre el cajón «Editar operativo» con las mismas validaciones del registro. **Todo
cambio espera a «Guardar cambios»**, también el personal. Si el operativo ya tiene transporte y
usted cambia un horario o una zonal, el cajón avisa: «Este cambio puede dejar el transporte
pendiente de reasignación por la DAF».

**«Eliminar»** pide confirmación **nombrando el operativo** —«Se quitará el operativo y su
personal quedará libre. Esta acción no se puede deshacer.»—.

> **El borrado es real y no se deshace.** El operativo desaparece de la base con su personal,
> sus zonales y sus instituciones, y **su número queda libre para el siguiente registro**: si
> elimina `OCECU-002`, el que registre después volverá a llamarse `OCECU-002`.
>
> **Excepción**: si ya se emitieron órdenes de servicio, el operativo **se conserva
> desactivado** y el sistema se lo dice. Una orden ya entregada a un funcionario no puede
> quedarse sin el operativo que la explica.

Editar y eliminar solo funcionan **mientras su ventana siga abierta y el cuadro no esté cerrado**.
Fuera de eso la fila ofrece «Ver detalle», y los demás botones quedan apagados con el motivo.

### 5.1. «Adicional» · el operativo que surge el mismo día

> Disponible desde el **20 de agosto de 2026**, a pedido de la operación.

A veces hace falta una salida que no estaba en el cuadro: surge por urgencia y hay que hacerla
**hoy**, cuando la carga de su departamento ya cerró. Para eso está el botón **«Agregar
adicional»** (+) de cada fila, en Registro y en Mis operativos.

- **Se cuelga de un operativo que ya existe.** El cajón se abre con los datos de aquél ya copiados
  —zonal, punto, tipo, instituciones— y usted cambia lo que corresponda. Se confirma con
  **«Registrar adicional»**.
- **Funciona con la ventana cerrada.** Es lo único del sistema que lo hace, y por eso el botón sigue
  activo cuando «Editar» y «Eliminar» ya no lo están.

  > Cuando su ventana está cerrada, el cajón **se lo dice** antes de que empiece a capturar:
  > es una excepción y **queda registrada en la auditoría**, con la hora y con quién la usó. No es
  > una forma de saltarse el horario de carga; es la salida prevista para lo imprevisto.
- **Solo en los formularios que lo admiten**: hoy el **2 · PMO** (`OCAPMO`) y el **8 · INSP**
  (`IGA`/`ITA`, según el área de la persona). En los demás el botón aparece apagado con su motivo.
- **Lleva su propia numeración.** Un adicional del PMO no se llama `OCPMO-007` sino `OCAPMO-001`:
  prefijo distinto y cuenta aparte.
- **En la lista se ve de dónde salió.** Bajo su identificador aparece «Adicional de OCPMO-004», con
  palabras y no con un color. Y si busca `OCPMO-004` en el filtro, encontrará **el operativo y sus
  adicionales**.
- **Hereda el transporte.** Si el original ya tenía conductor, el adicional nace con él cuando las
  reglas lo permiten; si no, nace pendiente para la DAF.
- **Dos cosas que no puede hacer**, y el sistema se lo explica cuando ocurre:
  - **Colgar un adicional de otro adicional.** Cuélguelo del operativo original de la jornada.
  - **Eliminar un operativo del que cuelga un adicional vigente.** Elimine primero el adicional.
- **Si la Dirección ya cerró el cuadro, no se puede.** El botón queda deshabilitado. Cerrar el
  cuadro es distinto de que cierre su ventana: reabrirlo es decisión de la Dirección. Comuníqueselo.

### 5.2. Aportar personal a un operativo ajeno · DMIT · Instrucción

En los formularios **4 y 6**, Instrucción no registra el operativo: **aporta** su persona. La fila
le ofrece **«Agregar personal»** (y «Ver detalle»), no «Editar» ni «Eliminar».

1. Pulse «Agregar personal». Se abre el cajón **«Personal del operativo»**.
2. La gente del departamento dueño aparece con «Del dueño del formulario · lectura»: no la puede
   tocar. Usted solo ve candidatos de Instrucción.
3. Agregue a su persona; queda marcada «Nuevo». En la patrulla verá «Nuevo código INECU… al guardar».
4. El pie cuenta lo pendiente («1 cambio sin guardar · +1 persona»). Pulse **«Guardar cambios»**.

> **Cambió el 28 de octubre de 2026.** Antes cada persona se guardaba al instante. Ahora el cambio
> espera a «Guardar cambios» y se guarda todo junto o nada: si el servidor rechaza a alguien, el
> motivo aparece bajo esa persona y lo demás queda como estaba.

---

## 5 bis. P-13 · Jornada del Día · departamentos

La vista del día **de sus formularios**, con el diseño de la matriz. La abren los tres perfiles
departamentales.

- **Cada departamento ve solo sus formularios** (desde el 15 de septiembre de 2026): DMIP · Unidad
  de Operativos el 1, 2, 3 y 4; DMIP · Inspecciones el 5, 6 y 8; DMIT · Instrucción el 4, 6, 7 y 9.
  Los demás no aparecen.
- Donde su departamento aporta personal, la fila ofrece editar **solo el personal**, en el mismo
  cajón de §5.2 y con «Guardar cambios». El resto es consulta.
- Si a un registro le falta el aporte de otro departamento, lo dice como nota en Observaciones.
- **No exporta ni cierra.** Eso es de la Dirección, en la Matriz.

---

<a id="6-p-03--asignación-de-transporte--perfil-daf"></a>

## 6. P-03 · Planificar el día · perfil DAF

> **Cambió el 8 de octubre de 2026.** La antigua «Asignación de transporte» (bandeja y panel de
> dos campos) se reemplazó por un **flujo guiado en cuatro pasos**. La DAF ya no asigna por
> operativo sino **por traslado**: un «Dejar y retirar» son dos traslados, y entre ellos el
> conductor queda libre para otra cosa.

**La regla de fondo no cambió: la DAF escribe exactamente dos datos**, conductor y vehículo. No hay
ningún control para el resto del operativo.

Arriba, un indicador de pasos: **1 Preparar · 2 Asignar · 3 Fin del día · 4 Emitir**. El paso en
que se abre lo calcula el sistema con lo que ya está hecho; puede volver a uno anterior con el
indicador o con **«← Volver»**. Bajo el encabezado, un aviso dice cuándo abre la asignación.

### Paso 1 · Preparar la jornada

«Revise que todo esté listo. Cada punto pendiente tiene su acción al lado.»

- Los requisitos del día, cada uno con su botón (completar la ficha de un conductor, ir a los
  turnos…).
- **Los vehículos que salen**: confirme o corrija la lista. Los que están en taller dicen «En
  taller: no sale».
- Cuando todo está bien: **«Confirmar y continuar →»**.

### Paso 2 · Asignar conductores

«El sistema reparte los operativos y usted ajusta lo que haga falta.»

1. Pulse **«Asignar automáticamente»**. El sistema propone conductor y vehículo para lo pendiente
   y usted confirma.
2. Revise el progreso («Operativos cubiertos») y la columna **«Sin conductor»**.
3. Para resolver uno a mano, pulse **«Asignar conductor»**. Se abre un cajón con los **conductores
   sugeridos**, cada uno con su categoría y, si no puede, su **motivo** («No llega (faltan 25
   min)», ausente, en taller, sin jornada laboral…). Su «Asignar» queda apagado con ese motivo.
4. **«Cambiar vehículo»** ofrece la flota del día: las placas que no sirven van apagadas con su
   motivo («— en taller», «— ocupada por …»). También se puede asignar «Sin vehículo»; el operativo
   sigue pendiente hasta tener placa.
5. **«Compartir unidad»**: el cajón lista los operativos ya asignados con los que puede viajar,
   el pedido por quien registró primero y los asientos por momento («Al dejar (08:00): 3 de 3 · Al
   retirar (16:00): 3 de 3»). Si no caben, lo dice.

La vista puede ser la **línea de tiempo** de los conductores («Vista de los conductores») o una
tabla.

> **Lo que no llega a la DAF.** Los operativos en «Propios medios» o en «Vehículo de otra
> institución», y los formularios que no habilitan vehículo (**1 · FIJOS, 3 · LIMPIA y 9 · CBQ**).

> **Un registro agrupado es UNA solicitud** (desde el 4 de noviembre de 2026). La patrulla 5/6
> —con el código que aporta Instrucción— y el registro por zonas del 8 llegan como una sola
> tarjeta, con sus identificadores («IGECU-001 · ITECU-001»), todas sus personas y «También
> atiende» en el 8. Se asigna un conductor y un vehículo para todo el registro. Si el registro
> tiene más personas que asientos, o su horario cambió después de asignar, la tarjeta lo avisa.

### Paso 3 · Fin del día

«Elija dónde se guarda cada vehículo y escriba las actas.» El sistema sugiere el garaje; si el
vehículo queda en un parqueadero, el **N.º de acta** es obligatorio.

### Paso 4 · Emitir hojas de ruta

«Revise el resumen y emita una hoja por conductor. Es el insumo de la orden de movilización.»

- Cada hoja de ruta tiene estado **Pendiente**, **Emitida** o **«Pendiente (cambio posterior)»**,
  si algo cambió después de emitirla.
- **«Emitir todas las hojas de ruta»** las emite de una vez.
- La hoja lista cada traslado con su tipo, la columna **Personal** (cuántas personas lleva) y el
  operativo.

> La orden de movilización oficial y su número se emiten en el sistema de órdenes de movilización,
> no aquí.

### Horarios

| Momento | Qué ocurre |
|---|---|
| Antes de que abra la ventana | Se ve todo en solo lectura. «Todo listo. La asignación todavía no abre: puede revisar en modo lectura.» |
| Con la ventana abierta | Se puede asignar |
| Después del cierre | Solo lectura |

La ventana de la DAF la fija el administrador; la que trae el sistema es **de 15H00 a 16H30**.

### 6.1. Las otras pantallas de la DAF

Las tres están en el grupo **Transporte · DAF** del menú.

| Pantalla | Para qué |
|---|---|
| **Turnos del mes** | El turno de cada conductor, día por día. La asignación lo lee. Un clic cambia el turno de una celda (D → N → — → vacía) con «Deshacer»; **«Asignar turnos del mes»** aplica un horario a varias personas; **«Publicar mes»** lo deja vigente |
| **Flota y garajes** | Pestañas **Conductores · Vehículos · Garajes autorizados** e indicadores (activos, **En taller hoy**, documentos por vencer, sin conductor habitual). En Vehículos, **«Programar mantenimiento»** (🔧) y la vista **Calendario semanal**. En Conductores, **«Ausencias»** (📅). «Dar de baja» se puede **deshacer** desde el aviso |
| **Traslados entre zonales** | Los minutos que toma ir de una zonal a otra. Antes de guardar, el sistema avisa qué asignaciones dejarían de llegar («Advertencia de impacto») y usted elige «Cancelar» o «Guardar igual» |

> **Una ausencia o un mantenimiento no retiran lo ya asignado.** El sistema avisa qué traslados
> quedan afectados y se reasignan en «Planificar el día».

---

## 7. P-04 · Matriz Consolidada del Día · solo Dirección

La vista completa de la jornada: los nueve formularios, cada uno con su banner de color
institucional, su responsable y sus operativos.

> **Se abre en la jornada del día siguiente**, que es la que se está consolidando, desde el
> **21-AGO-2026**. Para revisar o firmar un cuadro anterior, retroceda con el selector.

- **Las celdas amarillas** señalan asignación logística pendiente. **Siempre llevan el motivo**
  en el texto emergente, y como texto visible si la celda está vacía.
- **El borde marcado** señala algo más grave: un vehículo obligatorio sin conductor, que impide
  cerrar la jornada.
- **Un formulario que nadie cargó** deja una fila de constancia con el departamento responsable y
  la hora en que venció su plazo. No es un hueco: es evidencia.
- **Los registros agrupados** (patrulla, formulario 8 por zonas) se ven como un bloque: lo común
  una vez y cada zona con su rango de códigos y «Zona principal».
- **Transporte sin DAF**: «Propios medios» o «Otra institución» en el conductor y «No se activa» en
  la placa.
- **Exportar PDF** descarga el documento formal, horizontal, con los banners y sin controles.
- **Cerrar cuadro** pregunta «¿Cerrar el cuadro del día?» enumerando lo que se firma: cuántos
  operativos, cuántas alertas y cuántos formularios quedaron sin cargar. Si algún operativo
  nocturno sigue sin conductor, el sistema lo impide y lo nombra. Cerrado, ofrece **«Ver órdenes»**.
- **Reabrir cuadro** (desde el 8 de octubre de 2026): «Devuelve el cuadro a Aprobado para
  corregirlo.». Pregunta antes.

---

## 8. P-05 · Órdenes de servicio · solo Dirección

Una vez cerrado el cuadro, se emiten las órdenes.

> **Cambió el 27 de octubre de 2026: solo la Dirección emite.** La pantalla no aparece en el menú
> de ningún otro perfil, y el servidor rechaza a cualquier otro rol con «Solo la Dirección emite
> órdenes de servicio.».

> **Se abre en la jornada del día siguiente**, que es la que usted acaba de consolidar y
> cerrar. Desde el **21-AGO-2026**.
>
> **Para disponer un operativo adicional de urgencia, retroceda un día.** El adicional entra
> siempre en la jornada del operativo del que cuelga, no en la que muestre el selector: si lo
> crea sobre un operativo de mañana, será un adicional de mañana. Y una urgencia es de hoy.

1. Elija la fecha y localice el operativo en «Operativos de la jornada».
2. **«Revisar y emitir»**. El botón queda deshabilitado **con la explicación** si el operativo no
   tiene personal o si el cuadro todavía no está cerrado («Disponible cuando el cuadro esté
   cerrado.»).
3. Antes de emitir, la pantalla muestra **qué dirá cada hoja**.
4. Al confirmar («¿Emitir las órdenes de servicio?» · «Sí, emitir») se emite **una orden por cada
   funcionario asignado**.

**«Emitir pendientes (N)»** emite de una vez las de todos los operativos que aún no tienen orden.
Si alguna falla, se lista como no generada y se puede reenviar.

**Los datos de la persona en cada orden son cuatro y nada más**: horario, funcionario, conductor y
placa. Ninguna menciona a los demás funcionarios del operativo. Es la respuesta directa al
problema que originó el encargo.

### El documento y su formato

- La orden es un **memorando en PDF**. **«Ver documento»** lo abre en un cajón con **«Imprimir»** y
  **«Descargar PDF»**. Si es un borrador con datos por completar, el cajón dice cuáles y quién los
  completa.
- **«Editar plantilla»** tiene **tres pestañas**, una por departamento: **DMIT · Instrucción**,
  **DMIP · Unidad de Operativos** y **DMIP · Inspecciones Técnicas y Generales**. Cada una con sus
  datos generales, su tabla de control, sus apartados y su versión. Se guarda con «Guardar
  plantilla».
- **La orden sale con el formato del área de la persona**, no del formulario. La tarjeta lo dice
  bajo el número: «Formato: DMIT · Instrucción».
- **Si un departamento no tiene formato**, sus personas no reciben orden y la emisión lo avisa:
  «No hay formato de orden para <departamento>. Configúrelo en Editar plantilla.». Las demás sí se
  emiten.

**Reemitir no borra lo anterior** («Reemitir órdenes»): se genera una versión nueva y la previa
queda marcada como **Sustituida** y se conserva. Las órdenes que emitió otro Director solo las
reemite él.

---

<a id="9-p-06--mis-órdenes--funcionario-de-campo"></a>

## 9. P-06 · Mis órdenes · retirada

> **Se retiró el 10 de septiembre de 2026**, junto con el perfil «Funcionario de campo». El
> personal de campo no inicia sesión en el Cuadro de Colores: la Dirección emite sus órdenes desde
> P-05 y se le entregan por otro canal.

Lo que sigue vigente de su diseño está en la orden misma: **cada hoja contiene solo la asignación
de esa persona**, y no hay forma de ver la de otra.

---

## 10. Cómo leer los mensajes del sistema

Los mensajes están escritos para usted, no para el técnico. Cuando algo se rechaza, el texto
nombra a la persona o el recurso implicado y el motivo.

| Color | Significado |
|---|---|
| Azul | Información. No hay nada que corregir |
| Amarillo | Advertencia. Puede continuar, pero conviene mirarlo |
| Rojo | La operación no se realizó. El texto dice por qué |
| Verde | Hecho |

Los mensajes llegan de tres maneras:

| Forma | Cuándo |
|---|---|
| **Aviso breve**, abajo a la derecha | Lo rutinario: guardado, creado, reactivado. Dura unos segundos. Algunos traen «Deshacer» |
| **Ventana de mensaje** en el centro | Confirmar algo con consecuencias («¿Cerrar el cuadro del día?»), un error de una acción o un hito (cuadro cerrado, órdenes emitidas). Las que borran algo confirman con un botón rojo y el foco empieza en el botón seguro |
| **Aviso dentro de la página** | El contexto: la ventana de carga, una pantalla que no cargó (con «Reintentar») |

**Ninguna información depende solo del color.** En un sistema llamado *cuadro de colores* eso
exige atención deliberada: cada señal de color va acompañada de su equivalente en palabras.

Si un error trae **«Ver detalle»**, ahí está el **código de seguimiento**. Cópielo: identifica su
petición en el registro del servidor y permite a soporte encontrar exactamente qué ocurrió.
