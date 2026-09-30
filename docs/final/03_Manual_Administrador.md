# 03 · Manual del Administrador

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Perfil `ADMINISTRADOR_DMIP` · 7 de agosto de 2026

---

## 1. Qué administra este perfil

Siete cosas, y ninguna de ellas es la jornada:

| Ámbito | Pantalla | Efecto |
|---|---|---|
| Personal y ausencias | P-07 | Quién puede ser convocado |
| Catálogos por formulario | P-08 | Qué opciones existen al registrar |
| Ventanas de carga | P-09 | A qué hora deja de cargar cada departamento |
| Parámetros de política | P-09 | Con qué umbrales se decide si alguien puede salir |
| Roles de Auth central | P-10 | Qué rol de Auth abre qué perfil del cuadro |
| Cuentas del cuadro | P-11 | Quién entra, y con qué rol |
| **Conductores y vehículos** | **P-12** | **Qué flota puede asignar la DAF** · desde el 20-AGO-2026 |

**El administrador no registra operativos ni cierra el cuadro.** Y su ventana de carga está
desactivada a propósito: aplicar la restricción horaria a quien configura las ventanas crearía un
cepo del que no se sale desde la aplicación.

> ### Dar de alta una cuenta · desde el 01-SEP-2026
>
> **«Nueva cuenta» abre el directorio de Auth central**, igual que «Nuevo funcionario» en P-07.
> Se busca a la persona, se pulsa **«Crear cuenta»** y su **usuario de Auth**, su correo y su
> nombre llegan al formulario ya escritos. Solo queda elegir los roles.
>
> **Por qué importa que el usuario no se teclee.** `usua_identificador_ad` es el nombre de usuario
> de Auth y es la llave con la que se canjea la sesión. El sistema **no lo comprueba contra Auth**
> al guardar: si se escribe mal, la cuenta se crea sin ningún aviso y esa persona **no puede
> entrar**, y el problema aparece días después sin pista de dónde está. Eligiendo del directorio,
> ese error deja de ser posible.
>
> **La ventana avisa de quién ya tiene cuenta**, y nace filtrando a quien no la tiene. Tener
> **ficha** de personal y tener **cuenta** son cosas distintas: la ficha deja que a esa persona se
> la convoque a un operativo; la cuenta, que entre al sistema. Hay quien tiene una y no la otra.
>
> **Y si Auth no responde**, la ventana lo dice y deja **«Registrar a mano»**: el alta de cuentas
> no toca Auth por ningún lado, así que nunca depende de que conteste.
>
> **Los roles ya no vienen propuestos.** Antes toda cuenta nueva nacía marcando «DMIP Operativos»
> por ser el primero de la lista, acertara o no. Ahora la lista nace vacía y no se puede guardar
> sin elegir al menos uno.

---

## 2. Abrir la jornada

El cuadro de cada día lo abre el administrador. Sin él, todas las pantallas de captura dicen «no
hay una jornada abierta».

- Endpoint: `POST /api/v1/cuadros`, con **una sola propiedad**:

```json
{ "fecha": "2026-08-07" }
```

- La semana, el año y **la orden de trabajo** se derivan de la fecha; no se digitan.
- La orden de trabajo se genera con el formato **`AMC-AAAA-MM-DD`** — por ejemplo
  `AMC-2026-08-07`— y su único uso es exponer el día en la matriz consolidada (PV-28, resuelto el
  07-AGO-2026).
- **Enviar `ordenTrabajo` se rechaza** con `400 CAMPOS_NO_PERMITIDOS`: la genera el sistema, y dos
  códigos distintos para el mismo día no pueden convivir.

> **No existe una pantalla para abrir la jornada.** El plan no la contempla y no se construyó. Hoy
> se abre por API. Ver `17_KNOWN_ISSUES.md`.

---

## 3. P-07 · Personal y disponibilidad

**Es la única pantalla del sistema que muestra cédulas y teléfonos.** El resto trabaja con nombre y
área: el contrato que consumen las demás pantallas ni siquiera incluye esos campos, y esa ausencia
—no una comprobación— es lo que impide que se filtren por descuido.

### 3.1. El alta empieza en el directorio de Auth central

**Desde el 2026-08-24, «Nuevo funcionario» abre el directorio de Auth**, no una ficha en blanco.
Antes eran dos vistas conmutables y la pestaña se retiró: Auth central es la base de usuarios de
la institución, así que dar de alta a alguien empieza por encontrarlo allí.

El recorrido son dos pasos:

1. **Elija a la persona.** La ventana lista a quienes están **activos** en Auth, con su correo,
   dependencia, roles y tipo de inspector. Nace filtrando a **quienes todavía no tienen ficha**,
   que es a lo que se viene; quite la casilla para ver a todos. Se busca por cédula, nombre,
   correo o dependencia, y **las tildes no importan**.
2. **Complete la ficha.** Llega con la cédula y el nombre de Auth. **«Cancelar» devuelve al
   directorio**, no al maestro: si se equivocó de persona, elija otra.

> **La ventana no consulta a Auth cada vez.** La primera vez que la abre puede tardar unos
> segundos; después se conserva lo consultado, y **«Actualizar»** es lo que vuelve a preguntar.

**Si Auth no responde, o la persona no está allí, use «Crear Funcionario Operativo»**: abre la ficha en
blanco y no pasa por Auth en ningún momento. El botón está siempre, también —y sobre todo— cuando
el directorio aparece caído. Es el caso de quien no tiene cuenta en Auth, y el de quien la tiene
**sin cédula registrada**.

La columna que importa es **Ficha**:

| Lo que dice la fila | Qué significa |
|---|---|
| **Sin ficha: no puede ser convocado** | Esa persona existe en Auth pero **no se ofrece en ningún desplegable de personal**. No produce ningún error: sencillamente no aparece el día que la buscan |
| **Con ficha** | Ya está en el maestro y se puede convocar |
| **Ficha dada de baja** | Estuvo en el maestro y salió. Su historial se conserva |
| **Sin cédula en Auth** | No se le puede crear la ficha desde aquí: la cédula es la llave con la que se enlazan cuenta y ficha. Se corrige **en Auth**, no en esta pantalla |

**«Crear ficha»** abre el mismo formulario del alta, ya con la cédula y el nombre. Dos
advertencias, y las dos están escritas en el propio formulario:

1. **Auth guarda el nombre en un solo campo.** Apellidos y nombres se separan suponiendo que
   los dos primeros son los apellidos. Con «DE LA TORRE PEREZ JUAN» sale mal: **revíselo**.
   Los dos campos son editables.
2. **Auth no sabe el área, el tipo de contrato ni el teléfono.** Los tres se completan aquí,
   y del contrato depende quién puede salir de noche o en fin de semana.

**Esta ventana no modifica nada de Auth.** El correo, la dependencia, los roles y el tipo de
inspector se muestran en vivo: si están mal, se corrigen en Auth. Si Auth no responde, la
ventana lo dice y **el maestro sigue administrándose igual**, por «Crear Funcionario Operativo».

> **Los roles que verá son de toda la Agencia**, no solo del Cuadro de Colores: Auth los entrega
> como `(Subsistema) Rol` y aquí no se filtran. Ver «(Instrucción) Inspector» en alguien es
> normal, y ayuda a reconocer a la persona.

### 3.2. Alta de un funcionario

Datos obligatorios: **cédula, apellidos, nombres, área, tipo de contrato y dirección**.

| Campo | Nota |
|---|---|
| Cédula | Diez dígitos. El dígito verificador lo comprueba el servidor |
| Área | General · Técnico · Instrucción · Operativos · CCF |
| **Tipo de contrato** | **Nombramiento u Ocasional.** De él depende si la persona puede salir de noche o en fin de semana (RN-26) |
| Dirección | DMIP Operativos · DMIP Inspecciones · DMIT Instrucción · DAF |

> **El tipo de contrato no es una etiqueta administrativa.** Elegirlo mal no produce un dato feo:
> produce a alguien convocado a un operativo nocturno que no le corresponde. El formulario lo
> explica debajo del campo.

Si la cédula ya existe, el sistema **dice a nombre de quién está** y sugiere reactivar la ficha en
lugar de crear otra. Al editar, **la cédula no se puede cambiar**: es la identidad de la persona y
el único dato con el que se detecta un reingreso.

### 3.3. Ausencias

Situaciones registrables: **Vacaciones, Reposo médico, Calamidad doméstica, Permiso**.

- El rango admite un solo día (`desde` = `hasta`).
- **No se pueden solapar** dos periodos de la misma persona; el servidor lo rechaza.
- Para devolver a alguien al servicio se **retira** el periodo, no se registra «disponible».
- El **motivo es opcional** y solo se ve en esta pantalla: puede describir una condición de salud.
  Aparece en el texto emergente del distintivo, no impreso en la fila.

Mientras un periodo esté vigente, la persona **deja de ofrecerse** en los desplegables de personal.

### 3.4. Baja de un funcionario

**La baja es lógica: la ficha no se borra.** El histórico de quién salió en cada operativo depende
de ella, y la rotación del personal es mensual: quien sale hoy puede reingresar el mes que viene
con su historial intacto. La base de datos tampoco permitiría el borrado.

La confirmación lo advierte, y el mensaje posterior dice **cuántos operativos conserva la ficha**.

### 3.5. Lo que esta pantalla no hace

- **No consulta las ausencias de toda la institución.** El contrato las entrega por funcionario;
  la pantalla pide las de las filas visibles y muestra el detalle de la persona elegida (PV-35).
- **No enlaza la cuenta de usuario con la ficha de personal.** Ese enlace existe en la base
  (`t_usuario.func_id`) y **P-06 depende de él por completo**. El directorio de §3.1 **no lo
  escribe**: cruza Auth con las fichas por cédula solo para mostrar quién tiene ficha y quién
  no. El enlace se administra en **«Cuentas del cuadro»**, indicando la cédula.
- **No administra nada de Auth central.** Ni da de alta cuentas, ni cambia roles, ni corrige
  correos ni dependencias. Todo eso se hace en el portal de Auth.

---

## 4. P-08 · Catálogos del cuadro

Administra, **formulario por formulario**, los tres catálogos que alimentan el registro de
operativos: puntos de encuentro, tipos de control e instituciones participantes.

> **Es la pantalla donde se carga la matriz zonal ↔ punto (PV-01)**, el primero de los bloqueantes
> del proyecto. Cada punto se da de alta dentro de **una zonal y un formulario**, que son las dos
> coordenadas que necesita el filtrado en cascada de P-01.

### 4.1. Cómo funciona

1. Elija el formulario en el desplegable. Aparecen los nueve: el administrador los ve todos.
2. Los tres catálogos de abajo son **los de ese formulario**.
3. **Agregar** crea el valor y lo vincula al formulario que está administrando.
4. **Editar** corrige el nombre, o la zonal en el caso de un punto.
5. **Desactivar** lo retira de la oferta.

### 4.2. Los puntos de encuentro se leen por zonal

Desde el **2026-08-24** los puntos no se listan en plano: hay **una tarjeta por zonal**, con el
nombre de la zonal dicho una sola vez y sus puntos dentro. El formulario 7 tiene 34 puntos
repartidos en 10 zonales, y en una lista corrida había que leerlos todos para saber qué ofrece
una de ellas.

**El buscador filtra por punto o por zonal.** Escribiendo el nombre de una zonal se muestra esa
zonal entera; escribiendo el de un punto, solo ese. No hace falta escribir tildes.

**Al pie se nombran las zonales que todavía no tienen ningún punto**, que son las que hay que
rellenar mientras la matriz zonal ↔ punto siga cargándose a mano (PV-01). Una zonal vacía no
produce ningún error: simplemente, el día del registro no ofrece ningún punto en P-01. Desde ese
mismo pie, **«Agregar a …» abre el alta ya situada en esa zonal**.

### 4.3. Dos cosas que conviene saber antes de pulsar

**El botón dice «Desactivar» y no «Eliminar» porque es lo que hace.** Un valor usado en cuadros
anteriores debe seguir existiendo para que esos operativos se puedan leer. El mensaje posterior
dice cuántos operativos lo usan.

**Desactivar es irreversible desde la interfaz.** El valor desaparece de la lista y no vuelve a
aparecer, porque la pantalla lee por el mismo camino que el registro de operativos, que solo
devuelve lo vigente. Reactivarlo hoy exige base de datos. La confirmación lo advierte.

### 4.4. Nombres repetidos

El nombre de un punto debe ser único **dentro de su zonal**. Si se repite, el sistema lo rechaza
nombrando el punto que ya existe, y usted corrige esa palabra sin perder lo escrito.

---

## 5. P-09 · Ventanas y parámetros

### 5.1. Ventanas de carga

Seis ventanas, una por rol. **No se crean ni se eliminan**: hay exactamente una por rol y son las
seis del cuadro.

| Rol | Configuración inicial |
|---|---|
| DMIP Operativos | Cierra 15H00 |
| DMIP Inspecciones | Cierra 15H00 |
| DMIT Instrucción | Cierra 15H00 |
| DAF | 15H00 a 16H30 |
| Dirección | **Sin restricción** (desactivada) |
| Administrador | **Sin restricción** (desactivada) |

> **«Sin restricción» no es «sin datos».** Una hora de apertura vacía significa que no hay
> restricción de apertura —es lo único que las fuentes permiten afirmar de los departamentos, que
> solo definen la hora de cierre—. Dirección y Administración quedaron desactivadas a propósito.
> No las «complete»: cerraría una ventana que nadie pidió cerrar.

**Eliminar una ventana la abriría, no la cerraría**: el sistema trata la ausencia de ventana como
«sin restricción horaria». Por eso el contrato no tiene borrado y en su lugar se desactiva, que
dice lo mismo de forma explícita y deja rastro.

**El mensaje de cierre no es un texto técnico.** Es lo que el funcionario lee en su pantalla a las
15H01, y lo único que le dice cuándo puede volver a intentarlo. El sistema exige al menos diez
caracteres por ese motivo.

Al guardar, el servidor puede **aceptar el cambio y advertir**: por ejemplo, si deja a la DAF sin
margen antes del límite del cuadro. La advertencia se muestra y no impide nada.

### 5.2. Los ocho parámetros de política

Cada fila muestra **su clave, su descripción, su unidad, su rango admisible y quién lo modificó por
última vez**. Se editan en línea.

| Clave | Valor | Rango | Qué gobierna |
|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | 12 | 8 a 16 horas | Horas máximas por persona y día |
| `TOPE_SALIDAS_PESADAS` | 3 | 1 a 6 salidas | Nocturnas o de fin de semana por período |
| `PERIODO_COMPUTO_SALIDAS` | MENSUAL | Semanal · Quincenal · Mensual | Sobre qué período se cuentan |
| `HORA_LIMITE_CUADRO` | 16:30 | HH:MM | Hora a la que el cuadro debe estar listo |
| `FRANJA_NOCTURNA_INICIO` | 20:00 | HH:MM | Inicio de la franja que activa el condicionante |
| `FRANJA_NOCTURNA_FIN` | 05:00 | HH:MM | Fin de la franja nocturna |
| `DIAS_DESCANSO_PATRULLA` | 1 | 1 a 3 días | Días sin patrulla tras salir en patrulla |

**El rango se muestra siempre, no solo al equivocarse.** Y el valor se comprueba antes de enviarlo:
si escribe 30 en la jornada máxima, el sistema lo rechaza indicando el máximo y su unidad, sin
gastar un viaje al servidor.

> **Cada valor rige desde que se guarda, sin desplegar código.** Cambiar un umbral de descanso
> altera de inmediato a quién ofrece el sistema al armar el cuadro. Los siete valores iniciales son
> provisionales y los fija la Dirección (PV-06).

> **La hora de cierre de cada departamento no está en esta tabla, y desde el 2026-08-25 no está
> en ningún parámetro.** Se administra **arriba, en el panel de ventanas**, una fila por rol. Hasta
> esa fecha el mismo dato estaba escrito en los dos sitios y solo mandaba la ventana: quien cambiaba
> la hora ahí veía un aviso pidiendo que cambiara también el parámetro, y si no lo hacía, esta
> tabla decía 15H00 mientras el sistema cerraba a las 16H00.
>
> Se retiró el parámetro, no la hora. Y es lo que pide RF-059 —«parametrizar las ventanas de carga
> **por rol**»—: un valor único no podía decir que la DAF cierra a las 16H30 y los tres
> departamentos a las 15H00. Sigue pendiente **qué hora** ponerles (PV-06): las fuentes indican
> 14H00 en una sesión y 15H00 en otra, del mismo interlocutor.

### 5.3. Lo que P-09 no administra

- **La zona horaria** se muestra pero no se edita. Cambiarla movería todas las ventanas a la vez.
- **La declaración de capacidad de flota** (`PUT /transporte/capacidad/:fecha`) existe en el
  servidor y **ninguna pantalla la ofrece**. Ver `17_KNOWN_ISSUES.md`.

---

## 6. P-12 · Conductores y vehículos

> **Hasta el 20-AGO-2026 esto se administraba solo por API**, y era la limitación L-11: los ocho
> endpoints existían desde M-17 y no había pantalla. Mientras tanto **RF-056, de prioridad Alta**,
> exigía poder administrarlos. Con la flota vacía —0 conductores, 0 vehículos— la DAF no podía
> asignar transporte a ningún operativo, que es el bloqueante **PV-03**.

Una sola pantalla, `/administracion/flota`, con **dos paneles**.

### 6.1. Los vehículos van primero, y el orden importa

El panel de vehículos está arriba porque **no se puede asignar un vehículo habitual a un conductor
si el vehículo no existe todavía**. Cargue primero la flota y después las personas.

| Campo | Obligatorio | Nota |
|---|---|---|
| Placa | **Sí** | Hasta 10 caracteres. **No se valida contra un patrón**: ninguna fuente define el formato, y la flota incluye motocicletas y placas institucionales |
| Descripción | No | Es lo que distingue dos placas parecidas cuando la DAF asigna con prisa |

**La placa sí se puede corregir** al editar, a diferencia de la cédula de un conductor: una placa
mal digitada es un error de captura y el vehículo sigue siendo el mismo.

### 6.2. Conductores

| Campo | Obligatorio | Nota |
|---|---|---|
| Cédula | **Sí** | Diez dígitos. **Llave natural: no se edita después** |
| Nombre completo | **Sí** | |
| Teléfono · Tipo de licencia | No | |
| **Vehículo habitual** | No, **pero conviene** | Ver abajo |

**El vehículo habitual es el campo que más consecuencias tiene.** De él sale la placa que P-03
propone al elegir al conductor (RF-032), y además es **la única vía por la que la DAF llega a
conocer un vehículo**: su desplegable se compone con los habituales de los conductores disponibles,
así que un vehículo que no sea habitual de nadie **no se puede asignar** (PV-33).

Dejarlo vacío no da ningún error al guardar: el problema aparece el día del operativo. Por eso la
pantalla lo señala en la fila —«Sin vehículo: la DAF no podrá proponerle placa»— y cuenta en la
cabecera cuántos conductores activos están así.

> **Se puede cambiar por otro, pero no dejarlo sin asignar.** El contrato del servidor no admite
> vaciar el campo. Es una limitación heredada.

### 6.3. La baja no se puede deshacer

La baja es **lógica**: el registro se conserva en los operativos donde ya figura y deja de
ofrecerse a la DAF. El servidor responde con el recuento de operativos históricos y lo explica.

> **Pero no hay «Reactivar».** `ActualizarConductorDto` y `ActualizarVehiculoDto` no admiten el
> campo `activo`, a diferencia del contrato de personal, así que una baja por error solo se corrige
> tocando la base. La confirmación lo advierte antes de aceptar. **Léala.**

### 6.4. Lo que esta pantalla NO resuelve

- **PV-33 sigue abierto.** La DAF sigue sin poder listar la flota; lo único que se consigue aquí es
  que todo vehículo tenga conductor habitual, que es el rodeo que hoy la sostiene.
- **La capacidad de flota** (`PUT /transporte/capacidad/:fecha`) sigue sin pantalla. Ver F-06.

---

## 7. Lista de comprobación de puesta en marcha

| # | Tarea | Pantalla o vía | Estado |
|---|---|---|---|
| 1 | Cargar catálogos base y los nueve formularios | `npx prisma migrate deploy` | ✅ hecho. **Desde el 19-AGO-2026 ya no hay semilla**: viven en la migración `20260819210000` |
| 2 | Cargar la matriz zonal ↔ punto | P-08 | ⏳ **PV-01** |
| 3 | Cargar el maestro de personal | P-07 | ⏳ **PV-02** |
| 4 | Cargar conductores y vehículos | **P-12** | ⏳ **PV-03** · la vía ya existe desde el 20-AGO-2026; faltan los datos, que tiene la DAF |
| 5 | Confirmar los ocho parámetros | P-09 | ⏳ **PV-06** |
| 6 | Definir el criterio de prefijo por área | — | ⏳ **PV-27** |
| 7 | Enlazar usuarios con fichas de personal | — | ⏳ sin vía |
| 8 | Abrir la jornada del día | API | Diario |
