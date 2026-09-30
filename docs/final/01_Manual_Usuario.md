# 01 · Manual de Usuario

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Versión 0.1.0 · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

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
| Dirección | `http://localhost:5180` (o la que indique su administrador) |
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
> Pídale al administrador que le dé de alta.

### Perfiles disponibles

| Perfil | Qué puede hacer |
|---|---|
| DMIP · Operativos | Registrar y editar operativos de los formularios 1, 2, 3 y 4 |
| DMIP · Inspecciones | Ídem, formularios 5, 6 y 8 |
| DMIT · Instrucción | Ídem, formularios 7 y 9, y aportar una persona al formulario 6 |
| DAF · Transportes | Asignar conductor y placa a los operativos de los nueve formularios |
| Dirección | Ver la matriz consolidada, exportarla, cerrar el cuadro y emitir órdenes |
| Administrador | Catálogos, personal, ventanas y parámetros |
| Funcionario de campo | Consultar sus propias órdenes de servicio |

> **El perfil «Funcionario de campo» todavía no se puede usar.** El sistema ya lo reconoce, pero
> **falta crear ese rol en el portal institucional**, así que quien recibe una orden de servicio no
> tiene todavía cómo entrar a consultarla. Está pedido al equipo de Auth central. Ver
> `17_KNOWN_ISSUES.md`, F-01.

---

## 3. Las doce pantallas

Cada perfil ve en el menú **solo lo que le corresponde**. Los ítems que no le corresponden
aparecen atenuados y no se pueden abrir: es deliberado, para que usted sepa que existen y que no
son suyos, en lugar de suponer que el sistema se equivocó.

| Pantalla | Ruta | Quién entra |
|---|---|---|
| Registro de operativo | `/home/cuadro/registro` | Los tres perfiles departamentales |
| Mis operativos | `/home/cuadro/mis-operativos` | Ídem |
| Asignación de transporte | `/home/cuadro/transporte` | DAF |
| Matriz Consolidada del Día | `/home/cuadro/matriz` | **Solo Dirección** |
| Órdenes de servicio | `/home/cuadro/ordenes` | **Solo Dirección** |
| Mis órdenes | `/home/mis-ordenes` | Funcionario |
| Personal y disponibilidad | `/home/administracion/personal` | Administrador |
| Catálogos del cuadro | `/home/administracion/catalogos-cuadro` | Administrador |
| Ventanas y parámetros | `/home/administracion/ventanas` | Administrador |
| Roles de Auth central | `/home/administracion/roles-auth` | Administrador |
| Cuentas del cuadro | `/home/administracion/usuarios` | Administrador |
| Conductores y vehículos | `/home/administracion/flota` | Administrador |

> Las seis de administración se describen en `03_Manual_Administrador.md`. Este manual cubre las
> seis del ciclo diario del cuadro.

---

## 4. P-01 · Registro de operativo

Es la pantalla donde pasa la mayor parte del trabajo. La meta declarada por el Product Owner es
**registrar un operativo en dos o tres minutos**.

### 4.1. Antes de empezar, el sistema le dice si puede

Arriba de todo verá el estado de la jornada. Hay tres situaciones que impiden capturar, y **cada
una se avisa antes**, nunca al guardar:

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| «No hay una jornada abierta para el …» | Nadie abrió el cuadro del día | Pedir al administrador que lo abra |
| «Su ventana cierra a las …» / ventana vencida | Su departamento ya no puede cargar hoy | Esperar a mañana |
| «El cuadro fue cerrado por la Dirección» | La jornada está firmada | Solicitar reapertura a la Dirección |

El aviso de ventana **se actualiza solo cada minuto**: si está escribiendo a las 14H59, verá
aparecer el bloqueo sin recargar la página.

### La cuenta atrás hasta el cierre

**Desde el 25-AGO-2026 la pantalla le dice cuánto le queda**, sin que tenga que mirar el
reloj. El aviso cambia de tono conforme se acerca la hora:

| Falta | Color | Verá |
|---|---|---|
| Más de una hora | **verde** | «Falta **02:20** para cerrar la ventana, está activa hasta las 15H00.» |
| Entre media hora y una hora | **amarillo** | «Falta **00:55**… No empiece un operativo que no vaya a terminar.» |
| **Media hora o menos** | **rojo** | «Falta **00:28**… Guarde lo que tenga capturado: después no podrá registrar ni editar.» |

Está en **Registro de operativo**, **Mis operativos** y **Asignación de transporte** — las
tres pantallas con ventana. Antes solo se avisaba **cuando ya había cerrado**, y entonces
ya era tarde: quien empezaba un operativo a las 14H55 lo descubría al guardar.

> **La cuenta atrás informa; quien decide es el servidor.** Si por lo que sea su reloj no
> coincide, el que manda es el sistema: el bloqueo llega cuando llega, diga lo que diga la
> cuenta.

### 4.2. Los pasos

1. **Elija el formulario.** Aparecen **solo aquellos en los que su departamento registra**.
   Desde el 24-AGO-2026 los demás no se muestran: ni los compartidos —donde usted aporta
   personal pero no registra sus operativos— ni los que su perfil solo puede consultar.
   Si no le aparece ninguno, la pantalla se lo dice con palabras.
2. **Compruebe los datos calculados.** Semana, fecha, orden de trabajo y estado se muestran como
   etiquetas grises. **No son campos**: los deriva el sistema y nadie los escribe. Es a propósito:
   el problema original era equivocarse en el año y en el secuencial al escribirlos a mano.
3. **Hora de inicio y hora de fin.** Se eligen de una lista, en intervalos de media hora.
   - Un horario que cruza la medianoche **es válido**: 22H00 a 02H00 es un operativo nocturno.
   - Debajo verá la duración calculada.
4. **Zonal y punto de encuentro.** Al elegir la zonal se consultan sus puntos. Cambiar de zonal
   borra el punto elegido, porque pertenecía a la anterior.
5. **Tipo de control** e **instituciones participantes** (al menos una).

   El campo de instituciones se escribe, no se despliega. Teclee parte del nombre y la lista se
   recorta; **las tildes no importan**, «secretaria» encuentra «Secretaría». Enter elige la
   resaltada, las flechas mueven, Esc cierra. Cada institución elegida queda como una etiqueta con
   su aspa, y **Retroceso con el campo vacío quita la última**. A partir de la quinta se resumen
   —«AMC, CACMQ +3»—; pulse el «+3» para verlas todas y poder quitar cualquiera.

6. **Personal.** Busque por apellido y agregue.

   > **Quien no puede salir aparece deshabilitado, con su motivo debajo del nombre** —«ya está
   > asignada al operativo OCF-001 de 08H00 A 14H30, que se cruza con este horario»—. Desde el
   > 11-AGO-2026, al resolverse PV-37.
   >
   > Si alguien no aparece **en absoluto**, es que su área no participa en ese formulario:
   > compruébelo en P-07. Y si el motivo dice solo que «no está disponible», es una ausencia
   > registrada: la causa no se publica.
7. **Observaciones**, si hacen falta.
8. **Registrar operativo.**

### 4.3. Qué pasa al guardar

- Aparece una confirmación con el identificador asignado —por ejemplo `OCF-003-07-AGO-2026`—.
- La fila se agrega a la tabla de abajo, para que vea el resultado sin cambiar de pantalla.

  > **Desde el 01-SEP-2026 puede corregirla ahí mismo.** Cada fila tiene **Editar** y
  > **Eliminar**: si se equivocó en la hora, no hace falta ir a «Mis operativos».
  >
  > **Eliminar borra de verdad** mientras nadie haya emitido todavía una orden de servicio
  > sobre ese operativo, que es lo normal recién registrado. El número vuelve a quedar
  > libre y lo tomará el siguiente que registre. Si ya hubiera órdenes emitidas, el
  > operativo se retira del cuadro pero se conserva, y el mensaje se lo dirá.
  >
  > **Esta tabla solo recuerda lo de esta sesión.** Si cierra la pestaña, la lista se vacía
  > —los operativos siguen registrados— y para corregirlos tendrá que ir a «Mis
  > operativos», que consulta la jornada entera.
  >
  > Los dos botones se apagan si su ventana de carga cerró o si la Dirección cerró el
  > cuadro, y le dicen cuál de las dos cosas ocurrió.

  > **Las columnas Conductor y Vehículo dicen qué esperar.** Desde el 24-AGO-2026: si su
  > formulario **no habilita vehículo** —1 · FIJOS, 3 · LIMPIA y 9 · CBQ, RN-41 y RN-42—
  > leerá **«Propios medios»** y **«No se activa»**. No falta nada y no hay nada que
  > esperar de la DAF: ese operativo no pasa por ella. En los demás formularios verá el
  > aviso de que la DAF todavía no ha asignado, que es lo normal al registrar.
- El formulario se limpia **salvo el formulario elegido**: quien registra suele encadenar varios
  del mismo.

**Si algo se rechaza, lo capturado no se pierde.** El motivo se muestra tal como lo redacta el
sistema y usted corrige solo lo que haga falta.

### 4.4. Lo que usted no completa

**Conductor y placa nacen vacíos y los llena la DAF**, en su propia pantalla y en su propia
ventana horaria. No es un campo que falte: es el reparto de responsabilidades del cuadro.

---

## 5. P-02 · Mis operativos

Para comprobar lo registrado, corregir y retirar.

> **Se abre en la jornada que usted está armando, que es la de mañana** (RN-01: el cuadro se
> elabora la víspera). Desde el **21-AGO-2026**. Antes abría en la fecha de hoy, y el operativo
> que acababa de registrar en P-01 **no aparecía**: el listado salía vacío y parecía que no se
> hubiera guardado.
>
> Para revisar una jornada ya ejecutada, retroceda con el selector de fecha. Sigue admitiendo
> cualquier día.

- **Filtros por columna.** Escriba en la caja de cualquier columna: identificador, formulario,
  horario, personal, punto o estado. Se busca **sin distinguir tildes ni mayúsculas**, así que
  «redrovan» encuentra «REDROVÁN».
- **Estado del transporte:** «Pendiente», «Asignado» o «Propios medios», siempre con la palabra
  además del color.
- **Editar** abre el mismo formulario del registro, con las mismas validaciones. El personal se
  guarda al instante; el resto, al pulsar «Guardar cambios».
- **Retirar** pide confirmación **nombrando el operativo**: identificador, punto, horario y
  formulario. No pregunta «¿está seguro?» en abstracto.

  > **El borrado es real y no se deshace.** El operativo desaparece de la base con su personal,
  > sus zonales y sus instituciones, y **su número queda libre para el siguiente registro**: si
  > elimina `OCECU-002`, el que registre después volverá a llamarse `OCECU-002`.
  >
  > **Excepción**: si ya se emitieron órdenes de servicio, el operativo **se conserva
  > desactivado** y el sistema se lo dice. Una orden ya entregada a un funcionario no puede
  > quedarse sin el operativo que la explica.
- Editar y retirar solo funcionan **mientras su ventana siga abierta y el cuadro no esté cerrado**.
  Fuera de eso los botones quedan deshabilitados con el motivo.

> El selector de fecha permite consultar días anteriores. En un cuadro pasado podrá mirar, no
> modificar.

### 5.1. «Adicional» · el operativo que surge el mismo día

> Disponible desde el **20 de agosto de 2026**, a pedido de la operación.

A veces hace falta una salida que no estaba en el cuadro: surge por urgencia y hay que hacerla
**hoy**, cuando la carga de su departamento ya cerró. Para eso está el botón **«Adicional»** de cada
fila.

- **Se cuelga de un operativo que ya existe.** Pulse «Adicional» en la fila del operativo del que
  nace. El formulario se abre con los datos de aquél ya copiados —zonal, punto, tipo,
  instituciones— y usted cambia lo que corresponda. **El personal no se copia**: cada persona tiene
  su propia comprobación de descanso, y hay que elegirla de la lista de esta hora.
- **Funciona con la ventana cerrada.** Es lo único del sistema que lo hace, y por eso el botón sigue
  activo cuando «Editar» y «Retirar» ya no lo están.

  > Cuando su ventana está cerrada, el formulario **se lo dice** antes de que empiece a capturar:
  > es una excepción y **queda registrada en la auditoría**, con la hora y con quién la usó. No es
  > una forma de saltarse el horario de carga; es la salida prevista para lo imprevisto.
- **Lleva su propia numeración.** Un adicional del PMO no se llama `OCPMO-007` sino `OCAPMO-001`:
  prefijo distinto y cuenta aparte. El primer adicional del día es el `001` aunque el formulario ya
  tenga seis operativos.
- **En la lista se ve de dónde salió.** Bajo su identificador aparece «Adicional de OCPMO-004», con
  palabras y no con un color. Y si busca `OCPMO-004` en el filtro, encontrará **el operativo y sus
  adicionales**.
- **Dos cosas que no puede hacer**, y el sistema se lo explica cuando ocurre:
  - **Colgar un adicional de otro adicional.** Cuélguelo del operativo original de la jornada.
  - **Retirar un operativo del que cuelga un adicional vigente.** Retire primero el adicional.
- **Si la Dirección ya cerró el cuadro, no se puede.** El botón queda deshabilitado. Cerrar el
  cuadro es distinto de que cierre su ventana: reabrirlo es decisión de la Dirección, y es quien
  debe saber que algo se sale de lo que ya aprobó. Comuníqueselo.

---

## 6. P-03 · Asignación de transporte · perfil DAF

Es la pantalla donde el diseño expresa una regla: **la DAF escribe exactamente dos campos** de
cada operativo —conductor y placa—. Todo lo demás llega deshabilitado, y los dos editables llevan
una etiqueta *Editable* junto a su rótulo.

1. La **bandeja** lista lo que falta por resolver, con **los nocturnos primero**: son los que
   impiden cerrar la jornada.

   > **No lista todos los operativos del día.** Solo los de formularios que habilitan vehículo:
   > **2 · PMO, 4 · ECU, 5 · REACD, 6 · REACN, 7 · DMIT y 8 · INSP**. Los formularios **1 · FIJOS,
   > 3 · LIMPIA y 9 · CBQ** operan por propios medios (RN-41, RN-42) y nunca llegan aquí. Una
   > jornada compuesta solo por ellos deja la bandeja vacía, y el mensaje lo explica.
2. Pulse **Asignar** en una fila. Se abre el panel con los datos del operativo, en solo lectura.
3. Elija el **conductor**. La **placa se completa sola** con su vehículo habitual, y puede
   cambiarla.
4. **Guardar asignación**. La fila sale de la bandeja y el contador baja.
5. Si el operativo se cubre sin vehículo, use **Marcar propios medios**: no pide conductor ni placa.

**Si el conductor no puede conducir**, el sistema lo explica —descanso insuficiente, jornada
acumulada— y **conserva lo que usted eligió**.

**El indicador de flota** compara lo declarado con lo que exige la jornada. Si se excede, avisa en
rojo **y no bloquea**: que falten vehículos es un hecho del día, no un error de captura.

### Horarios

| Momento | Qué ocurre |
|---|---|
| Antes de las 15H00 | La bandeja se ve, en solo lectura. «Aún no es su turno» |
| De 15H00 a 16H30 | Se puede asignar |
| Después de las 16H30 | Solo lectura. «La ventana ya cerró» |

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
- **Exportar PDF** descarga el documento formal, horizontal, con los banners y sin controles.
- **Cerrar cuadro** pide confirmación enumerando lo que se firma: cuántos operativos, cuántas
  alertas y cuántos formularios quedaron sin cargar. Si algún operativo nocturno sigue sin
  conductor, el sistema lo impide y lo nombra.

---

## 8. P-05 · Órdenes de servicio · solo Dirección

Una vez cerrado el cuadro, se emiten las órdenes.

> **Se abre en la jornada del día siguiente**, que es la que usted acaba de consolidar y
> cerrar. Desde el **21-AGO-2026**.
>
> **Para disponer un operativo adicional de urgencia, retroceda un día.** El adicional entra
> siempre en la jornada del operativo del que cuelga, no en la que muestre el selector: si lo
> crea sobre un operativo de mañana, será un adicional de mañana. Y una urgencia es de hoy.

1. Elija la fecha y localice el operativo.
2. **Revisar y emitir.** El botón queda deshabilitado **con la explicación** si el operativo no
   tiene personal o si el cuadro todavía no está cerrado.
3. Antes de emitir, la pantalla muestra **qué dirá cada hoja**.
4. Al confirmar se emite **una orden por cada funcionario asignado**.

**Cada hoja contiene cuatro datos y nada más**: horario, funcionario, conductor y placa. Ninguna
menciona a los demás funcionarios del operativo. Es la respuesta directa al problema que originó
el encargo.

Reemitir no borra lo anterior: la orden previa queda marcada como **Sustituida** y se conserva.

---

## 9. P-06 · Mis órdenes · funcionario de campo

Pensada para el teléfono. Cada orden es una tarjeta con sus cuatro datos y un botón para
descargar el PDF.

No hay ningún control para elegir de quién son las órdenes: **el sistema resuelve la identidad
por sí mismo**. No existe forma de consultar las de otra persona.

> Esta pantalla **todavía no funciona**, por dos motivos: el perfil de funcionario no está dado de
> alta en el servidor, y ninguna cuenta está enlazada a una ficha de personal. Ver
> `17_KNOWN_ISSUES.md`.

---

## 10. Cómo leer los mensajes del sistema

Los mensajes están escritos para usted, no para el técnico. Cuando algo se rechaza, el texto
nombra a la persona o el recurso implicado y el motivo.

| Color | Significado |
|---|---|
| Azul | Información. No hay nada que corregir |
| Amarillo | Advertencia. Puede continuar, pero conviene mirarlo |
| Rojo | La operación no se realizó. El texto dice por qué |

**Ninguna información depende solo del color.** En un sistema llamado *cuadro de colores* eso
exige atención deliberada: cada señal de color va acompañada de su equivalente en palabras.

Si aparece un mensaje genérico con un **código de seguimiento**, cópielo: identifica su petición
en el registro del servidor y permite a soporte encontrar exactamente qué ocurrió.
