# 17 · Problemas conocidos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
13 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

Lo que no funciona, por qué, y de quién depende. Hasta el 19 de agosto lo verificamos contra el
sistema en marcha; la revisión del 5 de noviembre la hicimos contra el código de
`base/cuadro-colores` (backend `24520af`, frontend `d13a5db`) y las guías de los paquetes de QA.

---

## Lo que cambió entre el 19 de agosto y el 5 de noviembre de 2026

La versión **1.1.0** se instaló en producción el **21-OCT-2026**, detrás del Gateway con HTTPS, y QA
preproducción pasó a un servidor nuevo detrás del mismo Gateway. Desde entonces se armaron seis
paquetes de actualización para QA (22-OCT, 23-OCT, 23-OCT «b», 26-OCT, 29-OCT y 4-NOV).

### Lo que el código ya resolvió

| Entrada | Estado | Cómo lo comprobamos |
|---|---|---|
| **F-01** · el rol «Funcionario» no existe en Auth | ✅ **Cerrada por retiro.** `FUNCIONARIO` se retiró el 10-SEP: el personal de campo ya no inicia sesión y P-06 desapareció | `common/roles/catalogo-roles.ts` lo marca «rol retirado» y no asignable |
| **F-03** · cinco formularios sin prefijo predeterminado | ⬇️ **Reducida a uno.** El 8, el 5 y el 6 eligen prefijo por el área del personal; el 2 usa `OCPMO`. Queda el **7** | Comentario PV-27 de `generador-identificador.service.ts`. No lo contrastamos con la base |
| **F-04** · la DAF no puede listar la flota | ✅ **Resuelta el 15-OCT.** «Cambiar vehículo» evalúa cada placa activa del día | `POST /transporte/evaluar/vehiculos` |
| **F-06** · la capacidad no se declara desde ninguna pantalla | ✅ **Resuelta.** P-15 el 31-AGO; desde el 8-OCT, paso 1 de «Planificar el día» | `GET`/`PUT /transporte/vehiculos-jornada/:fecha` |
| **F-07** · un catálogo desactivado no se puede reactivar | ✅ **Resuelta el 12-OCT.** Catálogos tiene filtro Activos \| Inactivos \| Todos y «Reactivar» | `GET /administracion/catalogos/:codigo/zonales` y siguientes |
| **L-03** · una zonal por operativo | ✅ **Resuelta el 21-SEP.** El operativo lleva `zonalesIds` | `operativo.dto.ts`, `valoresOperativo.util.ts` |
| **L-04 / L-05** · ausencias por página, sin listado global | ✅ **Resueltas el 8-OCT.** Una consulta para todo el maestro | `GET /administracion/personal/ausencias` |
| **L-06 / PV-30** · el PDF no lleva logotipo | ✅ **Resuelta el 25-AGO.** `src/assets/logo-amc.png` pesa 103 kB y lo usan la matriz y el memorando | `identidad-institucional.ts`, `exportador-matriz.ts`, `motor-documento.ts` |
| **L-07** · un catálogo no se re-delimita a otro formulario | ⚪ **Obsoleta.** Desde el 13-OCT cada formulario tiene su configuración propia y no hay copias | `t_zonal_formulario` |
| **L-10** · sin pantalla para reabrir la jornada | ✅ **Resuelta el 8-OCT.** «Reabrir cuadro» en la Matriz | `cuadroDiario.service.ts` → `POST /cuadros/:fecha/reabrir` |
| **L-16** · sin HTTPS | ✅ **Resuelta en QA y producción** por el Gateway desde el 21-OCT. En local sigue sin TLS | Guías `PASOS-*.md` del 21-OCT |
| **D-02** · `Table` genérico sin consumidores | ✅ **Retirado el 15-OCT** | `components/tabla/` ya no existe |
| **D-03 / D-04** · `pdf-lib`, `pdfmake` y `react-pdf` sin usar | ✅ **Ya se usan.** `pdf-lib` y `pdfmake` en el memorando, la firma y la hoja de ruta; `react-pdf` en el visor de órdenes | `import` en `documentos/` y `transporte/`; `components/ordenes/` |
| **D-05** · variables `PG*` en el `.env.example` del frontend | ✅ **Retiradas** | El archivo solo declara `VITE_*` |
| **D-09** · la jornada del nombramiento se cita y no se aplica | ✅ **Cerrada.** El 22-SEP se aplicó entera; el 23-OCT la jornada laboral reemplazó al nombramiento | `admiteJornada`, `talento-operativo/domain/jornada-laboral.ts` |

### Lo que empeoró o sigue igual

| Entrada | Estado |
|---|---|
| **D-08** · specs con errores de tipo | ⚠️ **Creció**: de 5 archivos a **17** y **71 errores** (`npx tsc --noEmit -p tsconfig.json`, 5-NOV). 5 de los 17 son suites de integración; no comprobamos si coinciden con las que fallan en D-10 |
| **F-05** · la solicitud de apoyo no tiene flujo | Sin cambios: `solicitudes-apoyo.controller.ts` solo tiene un `POST` y dos `GET` |
| **L-01** · emitir órdenes con el cuadro abierto | Sin cambios comprobados: `orden-servicio.service.ts` exige personal y rol `DIRECTOR`, pero no encontramos la comprobación del estado del cuadro |
| **D-06 / D-07** · documentación duplicada | Cambió de forma: ver D-13 |

### Lo que abrimos hoy

| # | Qué | Marca |
|---|---|---|
| **F-09** | COMPARTIDO entre dos «completo» no compara el punto | 🟠 |
| **F-10** | Datos sospechosos en los catálogos | 🟡 |
| **F-11** | Tras la migración de jornada laboral nadie tiene jornada | 🟠 |
| **D-10** | 8 suites de integración con fixtures desactualizados | ⚪ |
| **D-11** | Paquetes de QA marcados «ENSAYO» | ⚪ |
| **D-12** | Tramos heredados en los códigos que no representan al registro | 🟡 |
| **D-13** | Los contratos de API solo existen en el respaldo | ⚪ |

El detalle de cada una está en su sección, más abajo.

---

## Lo que cambió entre el 17 y el 19 de agosto · la integración con Auth central

**Cayó el único bloqueante de software.** `B-01` —no había identidad real— está resuelto: el ingreso
con Auth central funciona de punta a punta, con cookie `HttpOnly`.

| Entrada | Estado |
|---|---|
| **B-01** · no hay identidad real | ✅ **Resuelto.** Ya no queda ningún 🔴 de software |
| **F-01** · el perfil «Funcionario» no existe | ⬇️ **Reducido.** Resuelto en el servidor; **falta el rol en Auth**, y eso no es nuestro |
| **F-02** · ninguna cuenta enlazada a una ficha | ⬇️ **Reducido.** `t_usuario` se puebla por semilla; sigue sin haber **pantalla** de administración |

**Y aparecieron tres defectos que ninguna prueba anterior podía ver**, porque solo se manifiestan en
un navegador. Los tres están corregidos, y los dos primeros con prueba de regresión:

| Defecto | Alcance real |
|---|---|
| `crypto.randomUUID` no existe fuera de **contexto seguro** | Corre en el interceptor de **cada** petición: sobre HTTP en una IP **caía la aplicación entera** |
| Había que pulsar el rol **dos veces** para entrar | `user` y `estado` se movían por separado en el provider de sesión |
| 409 al registrar la ruta del módulo en Auth | El puerto 5176 lo tenía «Admin Core»; el frontend se movió al **5180** |

> **Lo que los tres tienen en común, y es lo aprovechable:** `curl` comprueba que el servidor
> responde, pero **no ejecuta JavaScript, no mantiene estado entre páginas y no distingue contexto
> seguro**. Un flujo que vive en el navegador tiene que verificarse en un navegador. Detalle en
> `PLAN_INTEGRACION_AUTH.md` §13.

---

## Lo que cambió entre el 11 y el 13 de agosto

Tres jornadas de uso real sobre el sistema desplegado. **Cuatro entradas de este documento
dejaron de estar abiertas** y una limitación se redujo:

| Entrada | Estado |
|---|---|
| **F-08 / PV-37** · quien no puede salir desaparece de la lista | ✅ **Resuelto.** Llegan todos con su veredicto y su motivo |
| **L-10** · sin pantalla para abrir la jornada | ⬇️ **Reducido.** El primer registro del día la abre solo; solo la reapertura sigue siendo por API |
| **I-11** · `ADICIONALES` ofrecido donde ningún catálogo lo prevé | ✅ **Resuelto en el modelo**, no solo en la pantalla |
| **D-08** · specs con errores de tipo | ⚠️ **Creció** de cuatro archivos a cinco |

Se corrigieron además tres defectos que solo el uso real destapa: el registro apuntaba a la
jornada equivocada —pedía la de hoy cuando el cuadro es del día siguiente—, cinco campos del
formulario detenían el envío **sin decir por qué**, y un operativo cuyo personal era rechazado
quedaba creado y vacío en el cuadro.

El detalle, en `18_CHANGELOG_FINAL.md`.

---

## Lo que se corrigió el 7 de agosto, en uso real

El día que empezaron a cargarse datos reales aparecieron seis defectos que ninguna prueba había
detectado. **Ya no están abiertos**; se listan porque explican por qué varias entradas de este
documento cambiaron de estado, y porque comparten una causa que conviene no repetir.

| # | Qué pasaba | Causa |
|---|---|---|
| 1 | Los nueve formularios salían **deshabilitados** en P-01 | El frontend comparaba `acceso === "DUENO"`, valor que el servidor no envía |
| 2 | P-01 **reventaba** al buscar personal | `PersonaElegible` declaraba campos que el servidor no envía |
| 3 | **Ningún catálogo se podía dar de alta** en P-08 | `Formulario` no traía `id`: faltaba en el DTO del servidor |
| 4 | El aviso de operativo nocturno **nunca se mostró** | `condicionanteNoct` frente a `condicionanteNocturno` |
| 5 | Una persona quedaba **atrapada** por un operativo retirado | Cuatro consultas no filtraban `oper_activo` |
| 6 | El campo de instituciones **no se podía usar con comodidad** | `<select multiple>` de 6 rem con nombres largos |

**Los cuatro primeros son el mismo defecto**: interfaces del frontend escritas en M-21 **sin
consumidor**, adivinando la forma de la respuesta, y objetos de prueba construidos con
`as unknown as`, que apaga al compilador. Ninguna prueba podía detectarlos porque repetían el
mismo valor inventado que el código. Corregido en los dos sentidos: los objetos de prueba se
construyen completos y sin conversión, de modo que **un campo de más o de menos rompe la
compilación**.

Quedan sin contrastar contra su DTO las interfaces `Documento.ts`, `CuadroDiario.ts` y `Alerta.ts`.
Es lectura comparada, no desarrollo, y conviene hacerla antes de la siguiente jornada de pruebas.

---

## Clasificación

| Marca | Significado |
|---|---|
| 🔴 | Impide usar el sistema |
| 🟠 | Impide usar una funcionalidad concreta |
| 🟡 | Limitación con rodeo posible |
| ⚪ | Deuda técnica sin efecto para el usuario |

---

## 🔴 Bloqueantes

### ~~B-01 · No hay identidad real · E12~~ · ✅ **RESUELTO del 17 al 19 de agosto de 2026**

**Lo que pasaba.** Con `MODO_IDENTIDAD_PROVISIONAL=false` toda petición recibía 401; con `true`,
**cualquiera podía hacerse pasar por quien quisiera** enviando un número en la cabecera
`x-usuario-prueba`. Era el único bloqueante de software para producción.

**Cómo se resolvió.** Ingreso con **Auth central**, patrón de **cookie `HttpOnly`** como CORE: el
JWT no llega nunca al navegador, lo canjea el backend contra `GET /auth/exchange` y lo guarda en su
propia cookie. Los tres archivos provisionales desaparecieron; **no queda más de una forma de
autenticarse**.

**Lo que desbloqueó el diseño.** La columna `usua_identificador_ad` ya existía, así que no hizo
falta inventar traducción de permisos: **Auth dice QUIÉN es, este módulo decide QUÉ ROL tiene.**

**Lo que quedó abierto, y no es nuestro** —pasa a 🟠, ver F-01:

| | Qué falta | Efecto |
|---|---|---|
| 🟠 | El rol `Transporte - Funcionario` no existe en Auth | **P-06 inaccesible** |
| 🟠 | El canje no devuelve `roles`, el token no lleva `subsystemId` | No se puede comprobar que un código se emitió **para este módulo** |

**Y un riesgo nuevo que conviene registrar:** el secreto de Auth es **HS256 compartido por todo el
ecosistema**, así que cualquier módulo integrado puede firmar tokens válidos para los demás.
Plantear RS256 con clave pública antes de producción. Detalle en `PLAN_INTEGRACION_AUTH.md`.

**Un segundo riesgo, aceptado a conciencia el 21-AGO-2026.** Desde esa fecha el backend
**conserva el token de Auth** dentro de su propio token de sesión, porque el directorio de
personal de P-07 lo necesita y **Auth no tiene token de servicio ni clave de API**: la
credencial de quien pregunta es la única que existe. Antes se descartaba en cuanto se validaba.

| | Qué implica | Qué lo contiene |
|---|---|---|
| 🟠 | Quien obtenga la cookie de sesión obtiene **una credencial de Auth**, no solo una de este módulo | La cookie es `HttpOnly` y el navegador no puede leerla; el token propio va firmado, **no cifrado** |
| 🟠 | La superficie de exposición deja de ser este módulo y pasa a ser todo lo que Auth abre | La sesión ya caducaba con la de Auth; la CSP `connect-src 'self'` impide sacarla desde el navegador |

**Lo correcto sería un token de servicio de Auth con permiso de solo lectura sobre `/users`.**
Se pide a ese equipo. Mientras no exista, esta es la única forma de leer el directorio, y queda
escrita aquí para que sea una decisión y no un descubrimiento.

**Ampliado el 07-OCT-2026: el token también se reenvía a Inspección.** Para ofrecer en el registro
los trámites asignados a cada inspector, el backend llama a `GET {INSPECCION_API_URL}/operativos?fecha=`
con el mismo Bearer. Inspección es de la misma familia SIGOC: valida el JWT con el secreto compartido
de Auth y luego `/auth/session/validate`, sin token de servicio propio. Lo que lo contiene: la llamada
es de servidor a servidor (nunca desde el navegador), el token no se escribe en la bitácora ni se
devuelve, la caché de la consulta usa su SHA-256 y no el token, y la respuesta se recorta a las
personas que el rol puede asignar (mismo criterio que H-01).

**Y un tercero, que no es nuestro:** `GET /users` de Auth **no comprueba rol**. Cualquier sesión
válida de cualquier subsistema puede listar al personal de la institución con su cédula y su
correo. Nuestro endpoint sí exige `ADMINISTRADOR_DMIP`; el de Auth se reporta a ese equipo.

---

### B-02 · Faltan tres catálogos maestros

**La carga empezó el 07-AGO-2026.** Estado medido contra la base en marcha ese día:

| Pendiente | Qué falta | Filas hoy | Responsable |
|---|---|---|---|
| **PV-01** | Matriz zonal ↔ punto de encuentro | `t_punto_encuentro`: **5** — carga iniciada desde P-08 | Product Owner |
| **PV-02** | Base de personal con tipo de contrato | `t_funcionario`: **1** — carga iniciada desde P-07. **Desbloqueado el 21-AGO**: ver abajo | Product Owner |
| **PV-03** | Conductores y vehículos | `t_conductor` y `t_vehiculo`: **0**. **La DAF sigue sin poder asignar** | DAF |

Ya no son tres tablas vacías, pero **tampoco son todavía los catálogos institucionales**: lo
cargado son las primeras filas de prueba del administrador. Hasta que el Product Owner entregue la
matriz completa, la cascada de P-01 solo ofrece los puntos que alguien haya dado de alta a mano.

> Hasta el 07-AGO **PV-01 estaba bloqueado dos veces**: faltaba el dato y, además, P-08 no podía
> darlo de alta porque el frontend enviaba `formularioIds: [undefined]` (I-03d). Lo segundo se
> corrigió; lo primero sigue siendo del negocio.

**La semilla no los inventa a propósito**: completarlos con valores razonables destruiría el
trabajo de distinguir lo acordado de lo supuesto.

> **PV-02 dejó de exigir teclear el 21-AGO-2026.** P-07 tiene una vista nueva, «Directorio de
> Auth», que lista a las personas **activas en Auth central** con su correo, dependencia, roles y
> tipo de inspector, marca quién no tiene ficha —**y por tanto no puede ser convocado**— y crea la
> que falte precargando cédula y nombre. La institución ya tenía esos datos en otro sistema.
>
> **Lo que Auth no sabe sigue siendo del Product Owner: el tipo de contrato.** No existe en Auth
> —comprobado en su código fuente—, y es el dato del que dependen RN-26 y RN-33. Se captura al
> crear cada ficha. También faltan el área y el cargo.
>
> Así que PV-02 pasa de «hay que cargar el maestro entero a mano» a «hay que decidir el contrato
> de cada persona». Sigue siendo del negocio, pero es una decisión por persona y no una captura.

---

## 🟠 Funcionalidades bloqueadas

### ~~F-01 · El rol «Funcionario de campo» no existe **en Auth central**~~ · ✅ **CERRADA POR RETIRO el 10 de septiembre de 2026**

> El negocio decidió que el personal de campo no inicie sesión: sus órdenes las emite la Dirección y
> se entregan por otro canal. `FUNCIONARIO` quedó en el enumerado, sin accesos y fuera de los roles
> asignables (`NO_ASIGNABLES` en `common/roles/catalogo-roles.ts`), y P-06 «Mis órdenes» se retiró.
> Ya no hace falta crear el rol en Auth. Lo que sigue es la historia de la entrada.

**Resuelto de nuestro lado el 17-AGO.** `FUNCIONARIO` se agregó al enumerado `RolDepartamental`, y
**exigió migración** aunque parezca una línea: es un enumerado de PostgreSQL. El backend lo acepta y
P-06 funciona.

**Lo que sigue faltando está en Auth.** El negocio creó los seis roles de Transporte —53 a 58, con
su correspondencia registrada en `prisma/insumos/usuarios-cuadro.json`— pero **no el séptimo**. Sin
un rol de Transporte que elegir, el funcionario de campo **no puede seleccionar el módulo en el
portal**, así que no llega nunca al Cuadro de Colores.

**Efecto.** **P-06 «Mis órdenes» sigue inaccesible**, ahora por un motivo distinto y anterior: no
por el servidor, sino por el ingreso.

**De quién depende.** Del equipo de Auth central. Es crear un rol y asignarlo.

---

### F-02 · Ninguna cuenta está enlazada a una ficha de personal

**Resuelto en parte el 17-AGO.** `t_usuario` ya no está vacía: se puebla por semilla desde
`prisma/insumos/usuarios-cuadro.json`, con la correspondencia entre los seis roles de Auth y
`RolDepartamental`. Y `usua_identificador_ad` lleva ahora **índice único**, porque dos filas con el
mismo usuario de Auth harían la resolución no determinista.

**Cerrado el 19-AGO-2026.** Ya hay pantalla: **Administración → Cuentas del cuadro**. Resuelve la
ficha **por cédula** —que era donde se fallaba— y avisa de las cuentas que no pueden entrar por
faltarles el usuario de Auth. Lo que sigue siendo cierto, y la pantalla lo dice:

> **Y el 01-SEP-2026 se cerró el hueco que quedaba abierto detrás.** El usuario de Auth se
> tecleaba, y **el servidor nunca lo contrasta contra Auth**: solo comprueba que no lo ocupe otra
> cuenta local. Un `username` mal escrito producía una cuenta que se guardaba sin ninguna
> advertencia y que **no podía entrar** —justo el síntoma que este mismo apartado describe—, con
> el agravante de que el aviso «no puede entrar» apuntaba a la falta del dato, no a que estuviera
> equivocado.
>
> Desde esa fecha el alta empieza eligiendo del directorio de Auth, así que el usuario **viene de
> Auth** en lugar del teclado. Sigue sin comprobarse contra Auth al guardar —eso no cambió— pero
> ya no hay forma de introducirlo a mano salvo por la salida «Registrar a mano», que existe
> justamente para cuando Auth no responde.

> **Quien no tenga fila en `t_usuario` no entra**, aunque Auth lo autentique correctamente. El
> sistema lo distingue del caso «sesión inválida» —responde `403`, no `401`, con un mensaje escrito
> para el funcionario— pero el efecto para esa persona es el mismo: no puede trabajar hasta que
> alguien la dé de alta a mano.

---

### F-03 · No se puede registrar en cinco de los nueve formularios · PV-27 · ⬇️ **reducida al formulario 7**

> **Al 5-NOV-2026.** El 8 (`IG`/`IT`), el 5 (`IGECU`/`ITECU`) y el 6 (`IGNECU`/`ITNECU`/`INECU`)
> eligen el prefijo por el **área del personal** desde el 8 y 9 de septiembre; el 2 usa `OCPMO` como
> predeterminado. Según el comentario PV-27 de `generador-identificador.service.ts`, el **7** sigue
> sin `areaAplica` ni predeterminado, y registrar en él se detiene con el aviso. No lo contrastamos
> con la base desplegada.

**Comprobado:** los formularios **2, 5, 6, 7 y 8** tienen varios prefijos de identificador y
**ninguno marcado como predeterminado**, porque falta el criterio de selección por área.

Al registrar, el sistema se detiene nombrando el formulario. Los formularios **1, 3, 4 y 9**
funcionan.

**Por qué no se resolvió.** Marcar uno al azar produciría un código institucional que **no
significa lo que aparenta**, y ese código va en la matriz y en las órdenes.

**De quién depende.** Product Owner.

---

### ~~F-04 · La DAF no puede listar la flota · PV-33~~ · ✅ **RESUELTA el 15 de octubre de 2026**

> En el cajón de candidatos de «Planificar el día», «Cambiar vehículo» pide
> `POST /transporte/evaluar/vehiculos` y ofrece **toda la flota activa del día**, con las placas que
> darían 409 deshabilitadas y su motivo. Un vehículo sin conductor habitual ya se puede asignar.

`PATCH /transporte/operativos/:id` exige `vehiculoId`, pero el único endpoint que enumera vehículos
—`GET /administracion/vehiculos`— es del `ADMINISTRADOR_DMIP`.

**Efecto.** P-03 compone el desplegable con los **vehículos habituales de los conductores
disponibles**. Un vehículo que no sea habitual de nadie **no se puede asignar**.

**Arreglo.** Tres salidas, todas decisiones ajenas al frontend: abrir el endpoint a la DAF —cambia
el alcance del rol que la pantalla existe para acotar—; crear `GET /transporte/vehiculos`; o
confirmar que en la AMC todo vehículo tiene conductor habitual.

---

### F-05 · La solicitud de apoyo no tiene flujo · PV-12

Se registra en `SOLICITADA` y aparece en la bandeja de la dirección requerida. **No hay aceptación,
rechazo ni vencimiento**, y una solicitud equivocada **no se puede corregir ni anular**, porque
toda actualización con sentido es una transición de estado.

**De quién depende.** Product Owner.

---

### ~~F-06 · La capacidad de flota no se declara desde ninguna pantalla~~ · ✅ **RESUELTA**

> P-15 «Capacidad de flota» la declaró desde el 31-AGO. Desde el 8-OCT es el paso 1 de «Planificar
> el día» («vehículos que salen», `GET`/`PUT /transporte/vehiculos-jornada/:fecha`) y la ruta
> `/cuadro/capacidad` redirige ahí.

`PUT /transporte/capacidad/:fecha` existe y el servicio del frontend lo consume, pero **ni P-03 ni
P-09 lo ofrecen**.

**Efecto.** El indicador de flota dice «Flota sin declarar» y no hay forma de declararla salvo por
API.

**Decisión pendiente.** P-09 sería su sitio si la declaración es configuración; P-03 si es parte de
la jornada.

---

### ~~F-07 · Un catálogo desactivado no se puede reactivar · PV-36~~ · ✅ **RESUELTA en octubre de 2026**

> «Catálogos del cuadro» lee por las rutas de administración del formulario
> (`/administracion/catalogos/:codigo/…`), que incluyen los inactivos; la barra filtra Activos |
> Inactivos | Todos y la fila ofrece «Reactivar».

`AdministracionCatalogosController` expone **nueve operaciones de escritura y ningún `GET`**. P-08
lee por el endpoint operativo, que filtra `activo: true`.

**Efecto.** El valor desaparece y **no vuelve**, aunque el `PUT` acepte `activo: true`. La
confirmación de baja lo advierte.

**Arreglo.** Un `GET` de administración con `incluirInactivos`, y `activo` en las tres respuestas.

---

### ~~F-08 · Quien no puede salir desaparece de la lista de personal · PV-37~~

> ## ✅ RESUELTO · 2026-08-11
>
> `GET /personal/elegible` devuelve **todos** los candidatos del formulario, cada uno con
> `elegible` y, si no lo es, el `motivo` redactado. La pantalla muestra a los rechazados
> deshabilitados y con su explicación, en lugar de esconderlos.
>
> **El motivo de una ausencia se dice sin su causa.** Las reglas de descanso explican su rechazo
> entero —«ya está asignada al operativo OCF-001 de 08H00 A 14H30, que se cruza con este
> horario»— porque son hechos operativos del cuadro. Una ausencia, no: `ausentesEntre` entrega
> solo identificadores a propósito, para no publicar que alguien está de reposo médico o de
> calamidad doméstica. Se informa **que no está disponible**, nunca por qué.
>
> Internamente el servicio pasó de `filtrarElegibles` —que devolvía identificadores y descartaba
> el motivo— a `verificarVarios`, que ya lo conservaba. Sigue siendo **una consulta de
> antecedentes para todo el grupo**, no una por persona. `filtrarElegibles` se retiró al quedarse
> sin consumidores.

El problema que resolvía: quien armaba el cuadro veía una lista más corta **sin saber por qué
faltaba alguien**, y el motivo solo aparecía al intentar asignar a esa persona —cosa imposible,
porque no estaba en la lista—. Es lo que el análisis quiso evitar: una persona que desaparece sin
explicación obliga a levantar el teléfono, que es el canal que este sistema existe para reemplazar.

> Entre el 07 y el 11 de agosto la pantalla ofrecía «lo que el servidor ofrece» —solo los aptos—
> porque el endpoint no daba más. Antes del 07 **aparentaba** mostrar veredictos, sobre campos que
> el servidor nunca envió: `nombre` llegaba `undefined` y P-01 se rompía al escribir en la
> búsqueda. Ver `DOCUMENTACION_INCONSISTENCIAS.md`.

---

### F-09 · COMPARTIDO entre dos «completo» no compara el punto · abierta el 5-NOV-2026

**Lo que pasa.** Dos operativos del mismo tipo de traslado se comparten si coinciden en hora y están
en la **misma zonal o el mismo sector** (`mismaZonaOSector`, `transporte/application/politicas/compartir-tramo.ts`).
El punto de encuentro solo lo mira la clase CONTENIDO (`mismoSitio`), que exige misma zonal y, si los
dos lo traen, el mismo punto. Dos «completo» caen en COMPARTIDO, así que la regla no mira el punto.

**Efecto.** Una unidad que acompaña un operativo todo el día no se mueve de su punto, pero el sistema
le ofrece otro «completo» de la misma zonal en un punto distinto. Con la zonal **DMQ**, que es la
ciudad entera, la coincidencia es casi segura.

**Lo que hay.** Una propuesta: que entre dos «completo» rija el mismo criterio estricto de
`mismoSitio`. **Pendiente de decisión del negocio**; no la implementamos.

---

### F-10 · Datos sospechosos en los catálogos · abierta el 5-NOV-2026

Detectamos el punto **«PMO Centro Histórico»** colgado de la zonal **Calderón**, al norte de la
ciudad y lejos del centro. El punto lo sembró la migración
`20260902160000_la_matriz_de_puntos_de_encuentro` para el formulario 2; la zonal a la que quedó
asociado no consta en ese archivo, así que la asociación salió de la carga posterior.

**Efecto.** El traslado se calcula por la zonal, no por el punto: un operativo en ese punto se
planifica como si estuviera en Calderón.

**Qué hacer.** Revisar con el Product Owner la matriz zonal ↔ punto de cada formulario. El script
`limpieza-catalogos` no lo detecta: corrige formato y duplicados, no la geografía. No lo verificamos
contra la base de producción.

---

### F-11 · Tras la migración de jornada laboral nadie tiene jornada · abierta el 23-OCT-2026

`20261023100000_jornada_laboral` retira el tipo de contrato y siembra dos jornadas, pero **no asigna
ninguna**. Hasta que el administrador ponga una a cada ficha de personal (Personal y disponibilidad)
y a cada conductor (Flota y garajes), nadie se puede convocar: el servidor responde
`JORNADA_NO_ADMITE_TURNO` para el personal y `SIN_JORNADA` para el conductor, y las dos pantallas
dicen «⚠ Sin jornada».

**Es irreversible.** Volver atrás exige restaurar el respaldo previo. Las guías de QA del 23-OCT
guardan además un CSV con el contrato que tenía cada persona, para ayudar a asignar.

**De quién depende.** Del negocio: decidir quién asigna las jornadas y cuándo, en cada ambiente donde
se aplique la migración. En producción, que arrancó con la base vacía el 21-OCT, aplica en cuanto se
actualice a una versión posterior a la 1.1.0.

---

## 🟡 Limitaciones

| # | Limitación | Efecto | Pendiente |
|---|---|---|---|
| L-01 | La emisión de órdenes con el cuadro abierto **solo la bloquea la interfaz** | Una petición directa la esquiva. **Una regla que vive solo en el cliente no es una regla** | PV-34 |
| L-02 | La composición de patrulla se **informa, no bloquea** | RN-31 y RN-32 no impiden nada | PV-29 |
| ~~L-03~~ | ~~Una zonal por operativo en la interfaz~~ | **CERRADA el 21-SEP-2026**: `zonalesIds` | — |
| ~~L-04~~ | ~~Las ausencias se consultan **por página**~~ | **CERRADA el 8-OCT-2026**: `GET /administracion/personal/ausencias`, una consulta | — |
| ~~L-05~~ | ~~No hay listado global de ausencias~~ | **CERRADA el 8-OCT-2026**: la misma consulta | — |
| ~~L-06~~ | ~~El PDF **no lleva logotipo**~~ | **CERRADA el 25-AGO-2026**: `logo-amc.png` | — |
| ~~L-07~~ | ~~Un catálogo **no se puede re-delimitar** a otro formulario~~ | **OBSOLETA el 13-OCT-2026**: cada formulario tiene su configuración propia | — |
| L-08 | El cupo del rol compartido es **una persona**, provisional | Formulario 6 | PV-09 |
| L-09 | Los ocho parámetros llevan **valores provisionales** | El más urgente: la hora de cierre, con dos valores en las fuentes | PV-06 |
| ~~L-10~~ | ~~Sin pantalla para **reabrir** la jornada~~ | **CERRADA el 8-OCT-2026**: «Reabrir cuadro» en la Matriz. Abrirla la hace el primer registro del día | — |
| ~~L-11~~ | ~~Sin pantalla para **conductores y vehículos**~~ | **CERRADA el 20-AGO-2026** · P-12 | — |
| L-12 | Sin pantalla del **historial de auditoría** | Vive en `t_auditoria` | — |
| L-13 | Sin purga de auditoría e histórico | Crecen sin límite | PV-18 |
| L-14 | Sin política de respaldo | El volumen contiene todo | PV-19 |
| L-15 | **Contraste de los nueve banners sin verificar** | El texto contrasta por construcción; los fondos no se han medido | PV-23 |
| ~~L-16~~ | ~~Sin HTTPS~~ | **CERRADA en QA y producción el 21-OCT-2026**: TLS y HSTS los pone el Gateway. En local sigue sin TLS | — |

---

## ~~🟠 El logotipo institucional · PV-30~~ · ✅ **RESUELTO el 25 de agosto de 2026**

> El píxel de 70 bytes se reemplazó: hoy `transporte-backend/src/assets/` solo contiene
> `logo-amc.png`, de 103 kB, y lo cargan `identidad-institucional.ts`, `exportador-matriz.ts` y
> `motor-documento.ts`. La matriz y el memorando imprimen el membrete. Se conserva el texto de abajo
> como historia.

Merecía su propia entrada porque **era peor que una ausencia**.

`transporte-backend/src/assets/LogoAmc.jpeg` **existe** desde la línea base. Pero son **70 bytes:
un PNG transparente de 1×1 con extensión `.jpeg`**. El logotipo real vive en el frontend y pesa
98 kB.

**Hay un archivo con el nombre correcto y la ruta correcta que no es lo que aparenta.** Conectarlo
sin abrirlo publicaría un documento oficial con un píxel invisible donde va el membrete.

Hoy la matriz imprime la identificación institucional **en texto**.

---

## ⚪ Deuda técnica

| # | Qué | Dónde |
|---|---|---|
| D-01 | Advertencia de lint por dependencias de `useEffect` | `components/tabla/FilterByColumn.tsx`. **Única del repositorio** |
| ~~D-02~~ | ~~`Table` genérico sin consumidores~~ | **CERRADA el 15-OCT-2026**: `components/tabla/` se retiró |
| ~~D-03~~ | ~~`pdf-lib` y `pdfmake` instalados y sin usar~~ | **CERRADA**: los dos se importan en `documentos/` (memorando, firma) y `transporte/` (hoja de ruta, turnos) |
| ~~D-04~~ | ~~`react-pdf` instalado y sin usar~~ | **CERRADA el 22-SEP-2026**: es el visor de las órdenes |
| ~~D-05~~ | ~~Variables `PG*` en el `.env.example` del frontend~~ | **CERRADA**: solo quedan las `VITE_*` |
| D-06 | `docs/` duplicado | Cambió de forma el 5-NOV: el backend ya no versiona `docs/` (ver D-13). Quedan dos copias de `IMPLEMENTATION_GUIDE.md`, en `docs/implementacion/` de la raíz y en `transporte-frontend/docs/implementacion/`, y no coinciden |
| D-07 | `PENDIENTES-VALIDACION.md` con **dos versiones** | Las mismas dos carpetas: 666 líneas en la raíz y 657 en el frontend |
| D-08 | **Diecisiete** archivos de spec con **71** errores de tipo | `npx tsc --noEmit -p tsconfig.json` en el backend, 5-NOV-2026. No afectan al `build`, que los excluye. Eran cinco el 19-AGO. Los que más acumulan: `operativos.service.spec.ts` (36) y `test/operativos.integracion-spec.ts` (8) |
| ~~D-09~~ | ~~La jornada del `NOMBRAMIENTO` se cita pero no se aplica~~ | **CERRADA**: aplicada entera el 22-SEP-2026 y reemplazada por la jornada laboral el 23-OCT-2026 |
| D-10 | **8 suites de integración fallan** por fixtures desactualizados | Ver la sección siguiente |
| D-11 | Paquetes de QA marcados **«ENSAYO»** | Ver la sección siguiente |
| D-12 | Tramos heredados en los códigos que no representan al registro | Ver la sección siguiente |
| D-13 | Los contratos de API **solo existen en el respaldo** | Ver la sección siguiente |

### D-10 · Ocho suites de integración con fixtures desactualizados

`test/` tiene 22 suites. La última, `registro-agrupado-patrulla.integracion-spec.ts`, pasa **7/7**.
En la corrida completa **8 suites fallan** por fixtures desactualizados: datos de prueba que no
siguieron a los cambios de modelo de octubre (id de registro obligatorio, jornada laboral en lugar
del contrato, una persona por operativo en el 8, registro agrupado para la DAF). **No verificamos
una regresión detrás**, pero tampoco la descartamos suite por suite, y este documento no lista
cuáles son las ocho.

**Qué hacer.** Actualizar los fixtures antes del próximo paquete, empezando por las cinco suites que
además tienen errores de tipo (D-08). Mientras tanto, una suite roja de integración no distingue un
defecto de un dato viejo, que es justamente lo que esa red tiene que distinguir.

### D-11 · Paquetes de QA marcados «ENSAYO»

`scripts/empaquetar.sh` marca «ENSAYO» todo paquete que no sale de `main`. Los del 29-OCT y el 4-NOV
lo están: el del 4-NOV salió de `base/cuadro-colores` y el del 29-OCT de dos ramas de trabajo
(`feat/ventanas-parametros-rediseno` y `feat/plantilla-visual`, según su guía), hoy integradas en
`base/cuadro-colores`. Las instalaciones del 21-OCT sí salieron de `main`.

**Qué implica.** Si `main` avanza por avance rápido a los commits del paquete (`24520af` y
`d13a5db`), el paquete corresponde exactamente a `main`. Si el merge crea otros commits, hay que
volver a empaquetar desde `main` antes de llevarlo a producción.

### D-12 · Tramos heredados en los registros agrupados

Desde la 1.1.6 la patrulla 5/6 tiene un solo conductor para todo el registro. Las patrullas
asignadas antes conservan tramos en los códigos que ya no representan al registro.

```bash
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js                         # reporte
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js --aplicar --usuario=<id> # borra los sin conductor
```

Los tramos **con conductor** no se tocan: quedan en el reporte para que la DAF los reasigne a mano.
En QA hay que correr el reporte tras aplicar el paquete del 4-NOV; no conocemos su resultado.

### D-13 · Los contratos de API solo existen en el respaldo

Los dos `CLAUDE.md` citan diecisiete contratos `transporte-backend/docs/CONTRATO-*.md`, entre ellos
`CONTRATO-planificar-dia.md`, que es el contrato de «Planificar el día». El `.gitignore` del backend ignora `docs/*` salvo las fases y la guía,
y en la copia de trabajo de `docs/` solo está `CONTRATO-personal-por-lote.md`, también ignorado. Los
otros dieciséis existen únicamente en la carpeta `transporte-backend-respaldo/docs/`. Ninguno de
los diecisiete está versionado.

**Qué hacer.** Decidir si los contratos se versionan (agregar `!docs/CONTRATO-*.md` al `.gitignore`
y copiarlos) o si se citan desde otro sitio. Detalle en `DOCUMENTACION_INCONSISTENCIAS.md`, I-17.

---

## Qué hacer primero

### Al 5 de noviembre de 2026

| # | Acción | Desbloquea | Quién |
|---|---|---|---|
| 1 | **F-11** · asignar la jornada laboral a cada persona y conductor | Convocar a alguien en cualquier ambiente donde corra la migración del 23-OCT | Negocio, con el administrador |
| 2 | **D-11** · llevar `24520af` y `d13a5db` a `main` por avance rápido, o reempaquetar desde `main` | Que el paquete del 4-NOV pueda ir a producción | Desarrollo |
| 3 | **D-10** · actualizar los fixtures de las 8 suites de integración | Que la integración vuelva a ser una señal | Desarrollo |
| 4 | **D-12** · correr el reporte de tramos heredados en QA | Que la DAF no vea conductores sueltos en códigos que no representan | Desarrollo y DAF |
| 5 | **F-09** · decidir si dos «completo» exigen el mismo punto | Que no se ofrezca compartir entre puntos distintos de la misma zonal | Negocio |
| 6 | **F-10** · revisar la matriz zonal ↔ punto | Traslados calculados con la zonal correcta | Product Owner |
| 7 | **D-13** · versionar los contratos de API | Que la documentación citada exista en el repositorio | Desarrollo |
| 8 | **F-03** · criterio de prefijo del formulario 7 | Registrar en el 7 | Product Owner |

### Al 19 de agosto de 2026

Ordenado por lo que desbloquea:

| # | Acción | Desbloquea | Quién |
|---|---|---|---|
| 1 | **PV-27** · criterio de prefijo por área | Registrar en 5 de 9 formularios | Product Owner |
| 2 | **PV-01** · matriz zonal ↔ punto | La cascada de P-01, con eso el registro completo | Product Owner |
| 3 | **PV-02** · tipo de contrato de cada persona | Asignación de personal y las reglas de descanso. El resto de la ficha ya lo trae Auth desde el 21-AGO | Product Owner |
| 4 | **PV-03** · conductores y vehículos | P-03 completa | DAF |
| 5 | **F-01 + F-02** · perfil de funcionario y enlace de usuario | P-06 | Desarrollo |
| 6 | **PV-06** · confirmar los ocho parámetros | Certeza operativa | Dirección |
| 7 | **PV-34** · si la emisión de órdenes exige el cuadro cerrado | Que la regla viva en el servidor y no solo en la pantalla | Product Owner |
| 8 | **B-01** · identidad real | **La puesta en producción** | Tercero |

**Los cuatro primeros no son trabajo de desarrollo.** Son datos y decisiones. El software para
recibirlos está construido y probado.

**F-08 salió de esta lista el 2026-08-11**, resuelto. Ocupaba la quinta posición por lo que se vio
el 07-AGO: en cuanto hubo personal cargado, la primera pregunta fue por qué faltaba gente en la
lista. Con el veredicto por persona, esa pregunta se responde en la propia pantalla.

**F-01 y F-02 pasan a ser la primera acción de desarrollo.** Son dos cambios pequeños —agregar el
perfil `FUNCIONARIO` y poblar el enlace usuario–personal— y entre los dos sostienen una pantalla
entera, P-06, que hoy no funciona para nadie.
