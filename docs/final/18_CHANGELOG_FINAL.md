# 18 · Registro de cambios final

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Versión 0.6.6 · 26 de agosto de 2026

> **Este documento sustituye a un `CHANGELOG.md` que nunca existió.** No hay ninguno en los dos
> repositorios; la historia del proyecto vive en los treinta informes de módulo `M01`…`M30`, en
> `PLAN_DE_IMPLEMENTACION.md` y en el historial de git. Aquí se consolida.

---

## Resumen

| Dato | Valor |
|---|---|
| Módulos planificados | **30** |
| Módulos implementados | **30**, **E12 incluida**: ya no queda ninguna etapa pendiente de desarrollo |
| Pruebas | **738** unitarias · **283** de integración · **258** de interfaz |
| Tablas | 27 · 11 enumerados · 24 `CHECK` · **8** índices parciales |
| Migraciones | **11** |
| Endpoints | **67** (64 + los tres de sesión) |
| Pantallas | 9 |

*Recuentos del 19 de agosto de 2026, ejecutados.*

> **Al 20 de agosto de 2026** esos números se movieron: **29 tablas**, **25 `CHECK`**, **11 índices
> parciales** y **16 migraciones** —comprobado con `npm run prisma:verificar`—, **68 endpoints** y
> **12 pantallas**. Las pruebas son **785** unitarias de backend, **283** de integración y **323**
> de interfaz, las tres tandas ejecutadas.

> **Al 21 de agosto de 2026**, con las tres tandas ejecutadas de nuevo: **820** pruebas unitarias
> de backend, **283** de integración y **362** de interfaz. Los manejadores de ruta son **78**
> —`grep -rhoE "@(Get|Post|Put|Patch|Delete)\(" src --include=*.controller.ts | wc -l`—, y las
> pantallas siguen siendo **12**: el directorio de Auth es una vista dentro de P-07, no una
> pantalla nueva.
>
> **El salto de endpoints no lo produce solo este cambio.** Recoge también el operativo adicional
> y el ajuste de la ventana por rol, que **todavía no tienen entrada propia en este registro**.

---

## 0.7.0 · 1 de septiembre de 2026 · **el alta de cuentas empieza en Auth, y ningún rol queda escrito en el navegador**

Dos cambios que viajaron juntos porque tocan la misma pantalla.

### 1 · P-11 «Cuentas del cuadro» elige del directorio

Hasta hoy se tecleaban a mano el correo, el nombre y el **usuario de Auth**. Ese último es la
llave del canje —`usua_identificador_ad` **es** el `username` de Auth— y el servidor **nunca lo
contrasta contra Auth**: solo comprueba que no lo ocupe otra cuenta local.

Escribirlo mal producía una cuenta que se guardaba sin problema y **no podía entrar**, y el fallo
aparecía días después sin ninguna pista de dónde estaba. Elegir del directorio cierra ese hueco por
construcción: el usuario ya no se teclea, viene de Auth.

Es el mismo recorrido que P-07 hace con las fichas desde el 24-AGO, **con la misma ventana**. Se
generalizó en lugar de duplicarse: `PropositoDirectorio` cambia el vocabulario —qué se busca, cómo
se rotula, qué impide crear— y no el comportamiento. Dos copias habrían divergido al primer
arreglo, y esa ventana ya llevaba dos rondas de mejoras.

**El directorio dice ahora quién ya tiene cuenta.** No es lo mismo que quién tiene ficha, aunque
las dos suenen a «lo que ya tiene aquí»: la ficha deja **convocar a un operativo**, la cuenta deja
**entrar al sistema**. Hay gente con una y no la otra en los dos sentidos. Se cruza por el usuario
de Auth y no por la cédula, porque una cuenta puede no tener ficha.

Con ello se releyó la regla del DTO del directorio —«se entrega lo que P-07 pinta, ni un campo
más»—: lo que prohíbe es arrastrar el contrato de Auth entero, y `cuenta` no viene de Auth, es
nuestro. Sigue sin haber ni un campo que nadie muestre.

### 2 · El catálogo de roles lo sirve el servidor

`GET /administracion/roles` publica qué roles hay, cómo se llaman y cuáles se pueden asignar.

**Había tres copias del mismo mapa de nombres**, y ninguna era la fuente: una en
`documentos/reglas-matriz.ts` para el PDF, otra en `operativos/solicitud-apoyo.service.ts` para sus
mensajes, y la del frontend en `utils/parametro.util.ts`, de la que salía además el desplegable de
P-11 y de «Roles de Auth central».

Ya se habían separado una vez. Al ampliar el enumerado esa misma mañana, el compilador obligó a
completar la de `solicitud-apoyo` —tipada por el enumerado— pero **no** la de `reglas-matriz`, que
era `Record<string, string>` con `?? rol` de respaldo: sin completarla a mano, la matriz habría
impreso `ADMINISTRADOR_DMIP` en crudo **dentro de un documento oficial** y nada habría fallado.

Ahora la fuente es `common/roles/catalogo-roles.ts`, tipada `Record<RolDepartamental, string>`.

**No se unificaron las tres, sino dos**, y consta por qué: `solicitud-apoyo` no tiene un mapa de
rótulos sino de **frases** —«la Unidad de Operativos de la DMIP»— que van dentro de un mensaje.
Con los rótulos del catálogo esa frase quedaría «se solicita a DMIP · Unidad de Operativos», que se
lee como una etiqueta pegada en mitad de un texto. Unificar dos cosas que no son la misma por
parecerse es como se degradan los textos que este proyecto escribe para el funcionario.

### 3 · Y desaparecieron los tres roles que quedaban escritos

| Dónde | Qué hacía |
|---|---|
| `ModalUsuario` | Toda cuenta nueva nacía proponiendo `DMIP_OPERATIVOS` |
| `ModalRolAuth` | Toda correspondencia nueva nacía apuntando a `DMIP_OPERATIVOS` |
| `parametro.util.ts` | El mapa de nombres y la lista del desplegable |

Los dos primeros nacen ahora **vacíos**: `puedeGuardar` ya exigía al menos un rol, así que no hubo
que sustituir el valor por otro. Quien administra **elige**, que es de lo que trata la pantalla.

Una correspondencia de Auth mal apuntada no falla al guardarse: falla el día que alguien entra con
ese rol y recibe un perfil que no le toca.

### 4 · Lo que cambia en pantalla

Los roles se muestran ahora **con el nombre del organigrama** —«DMIP · Unidad de Operativos»— y no
con el rótulo corto que tenía el navegador. Es el mismo que imprime la matriz consolidada: hay un
solo nombre por rol en todo el sistema.

---

## 0.6.9 · 1 de septiembre de 2026 · **la jornada del día, para los tres departamentos**

P-13 «Jornada del Día» era del DMIT desde el 26-AGO. Quien registra en P-01 necesita ver dónde
encaja lo suyo en el día, así que la abren ahora **los tres roles departamentales**.

Es una ampliación de PER-02 —«la matriz no se renderiza para perfiles departamentales»— y esa
regla no es una cautela genérica: **es el requisito que originó el encargo**. El cuadro circulaba
por WhatsApp y los intervenidos se anticipaban al operativo.

### 1 · Lo que se recortó al ampliarla

**En una sección que el rol solo lee, el personal no viaja.** Se ve la rejilla del día —qué
formularios se cargaron, con qué horario, en qué zonal y en qué punto— y **no se ve quién va** en
el operativo ajeno.

La regla sale de `t_formulario_rol` y no de una lista de roles: participo, veo; solo leo, no. Por
eso se aplica igual a los tres **sin que ningún rol aparezca escrito en el código**.

**Alcanza también al DMIT**, que con ello pierde el teléfono ajeno que ganó el 27-AGO —añadido
entonces «para que no viera una columna vacía en las secciones ajenas»—. Esa columna vacía pasó a
ser justamente lo que se quiere. Se prefirió una regla que se explica en una frase a una que
dependiera de qué rol pregunta, porque lo segundo vuelve a meter un rol dentro de un `if`.

### 2 · El recorte va en el servicio, no en el DTO

`sinPersonalAjeno`, en `jornada.service.ts`, es el último punto donde el personal ajeno existe. Es
el mismo criterio que `funcionarios.repository` dejó escrito para la cédula y el teléfono: **si el
dato no sale de ahí, un descuido futuro en el mapeo no puede publicarlo**.

### 3 · La celda vacía se explica

Una celda en blanco diría «ese operativo no tiene gente asignada», que es falso y además
preocupante: quien lo leyera podría avisar de una falta que no existe. Dice **«No se publica»**
(regla 6). Donde el rol sí participa, el vacío sigue significando que falta gente, y ALV-01 se
emite por eso.

### 4 · Lo que no cambió

**Sin exportación y sin cierre**, igual que el 26-AGO: el PDF de la jornada es RN-47 y es de la
Dirección. **La DAF y la Dirección siguen fuera** de esta ruta — la Dirección tiene `/matriz`, con
el documento completo.

**Sigue viajando el volumen ajeno**: el número de operativos por formulario y los totales del día.
Se ve la forma del día, no las personas. Queda anotado en `FASE2` §4.4 por si el negocio decide
que eso también sobra.

### 5 · Y una decisión que este cambio tomó porque estaba pedida

La cabecera de `jornada.controller.ts` decía: «los otros dos roles departamentales no lo pidieron:
**abrirles esta ruta es un cambio de una línea, y conviene que sea una decisión y no una
inercia**». Lo fue.

---

## 0.6.14 · 2 de septiembre de 2026 · **el personal pasa a ser obligatorio, y las dos acciones de lista se juntan**

### 1 · «Personal asignado» es obligatorio

Lo pidió el negocio, y **es lo que `FASE5` §7 especificaba desde el diseño**: «Personal · al
menos una persona · al enviar · `alert alert-error` sobre el bloque». La regla 14 de `CLAUDE.md`
decía exactamente lo contrario —«el personal asignado **no** es obligatorio»— y lo construido
siguió a la regla, no al wireframe. Se resolvió a favor de FASE5 y queda anotado en
`DOCUMENTACION_INCONSISTENCIAS.md`.

**No se valida en Yup, y no puede.** El personal **no es un campo de Formik**: vive en un estado
de la página y, al editar, en el propio operativo. Meterlo en Formik para validarlo allí obligaría
a reescribir el camino de asignación inmediata de P-02 y del modo aporte. Lo comprueba `validate`
de `<Formik>`, que sí lo alcanza; Formik lo trata como cualquier otro error y no llama al envío.

Se comporta como el resto del formulario: **se pulsa, no sale, y se dice por qué**. El botón no se
apaga, el resumen añade «Falta personal asignado» y el motivo aparece sobre el bloque.

**En modo aporte no aplica**: allí no hay botón de guardar —cada persona se escribe en su clic— y
exigir una lista ya guardada bloquearía un envío que no existe.

**El servidor sigue aceptándolo sin personal.** La obligatoriedad es del formulario. Solo hay
**un** operativo activo sin personal en toda la base y está en un cuadro cerrado, así que el
cambio no deja nada bloqueado.

### 2 · «Quitar todos» baja junto a «Asignar visibles»

Las dos acciones que operan sobre la lista entera estaban a dos alturas distintas de la pantalla
—una junto al rótulo del bloque, la otra en la fila de filtros—, así que decidir entre asignar de
golpe o vaciar de golpe obligaba a recorrerla con la vista. Ahora van en pareja, y **con su
conteo**: «Asignar visibles (12)» frente a «Quitar todos (30)» dice de un vistazo qué hace cada
uno. El contador de la bandeja no se mueve: no es una acción, es el estado.

**Y la fila de filtros ahora se pinta también con la lista de candidatos vacía**, si hay gente
asignada. Su condición miraba solo a los disponibles: al asignar a todos, la fila desaparecía —y
con ella se habría ido «Quitar todos» al bajarlo ahí, justo en el caso en que más falta hace, que
es haber asignado de más con «Asignar visibles».

---

## 0.6.13 · 1 de septiembre de 2026, tarde · **el maestro de personal se reparte por áreas**

El negocio lo fijó así para P-07:

| Rol | Áreas que ve y da de alta |
|---|---|
| `ADMINISTRADOR_DMIP` | Unidad de Operativos · Inspector General · Inspector Técnico |
| `ADMINISTRADOR_DMIT` | **Personal de Instrucción, y solo él** |

### No hizo falta ningún concepto nuevo

Esas cuatro etiquetas son **áreas**, y cada área pertenece a una dirección desde que existe
`ROL_DEL_AREA`. La regla pedida es, palabra por palabra, «cada administrador alcanza las áreas de
las direcciones que administra» — que es lo que `direccionesAlAlcance` ya resolvía contra
`t_rol_direccion`.

**Por eso la migración solo borra dos filas.** Lo que sobraba era el reparto, no el código: el
DMIP tenía Instrucción y DAF desde esa misma mañana, cuando P-07 era de un solo rol y había que
evitar que alguna dirección quedara sin administrador. Hoy Instrucción es del DMIT y la DAF del
`ADMINISTRADOR_DAF`, que la recibió con las pantallas de flota.

```
ADMINISTRADOR_DMIP  administra DMIP_OPERATIVOS, DMIP_INSPECCIONES
ADMINISTRADOR_DMIT  administra DMIT_INSTRUCTOR
ADMINISTRADOR_DAF   administra DAF
```

### P-07 vuelve a abrirse a dos roles, y es el tercer movimiento del día

Por la mañana admitía a los tres roles departamentales; luego pasó a `ADMINISTRADOR_DMIP` a
secas; ahora entra `ADMINISTRADOR_DMIT`. **Las tres veces fueron decisiones**, y las tres las
señaló el mismo cable trampa —la lista de «roles de administración sin accesos»—, que obligó a
dejar cada una escrita en lugar de que un decorador se moviera en silencio.

**Abrir la ruta no enseña el personal de nadie.** Quién entra lo dice el `@Roles`; qué ve cada uno
lo decide el alcance por dirección, fila por fila, en el listado, en la ficha por identificador,
en el alta, en la edición y en la baja.

### El formulario ofrece solo las áreas alcanzables

Endpoint nuevo `GET /administracion/personal/areas`. No es una comprobación de permiso —ésa es del
servidor— sino **no ofrecer un camino que va a cerrarse**: elegir un área ajena sería un 403 al
pulsar Guardar, sin explicación en el formulario. Es el pendiente que quedó anotado esa misma
mañana al retirar el campo «Dirección»: *«el día que se abra a los otros administradores habrá que
ofrecer solo las áreas de lo que cada uno alcanza»*.

Se pregunta al servidor y no se deduce en el navegador, por lo mismo que las direcciones: la
correspondencia área → dirección y el reparto viven los dos allí.

### Comprobado contra el servidor

```
ADMINISTRADOR_DMIP  /areas -> OPERATIVOS, TECNICO, GENERAL   · 5 fichas, ninguna de Instrucción
ADMINISTRADOR_DMIT  /areas -> INSTRUCCION                    · 1 ficha, la de Instrucción
ADMINISTRADOR_DAF   /areas -> 403                            · no entra en P-07
```

`ADMINISTRADOR_DAF` queda fuera a propósito: la DAF tiene gente pero no tiene área, así que no hay
ficha suya que crear desde ahí.

---

## 0.6.12 · 1 de septiembre de 2026, tarde · **la ficha de personal guarda el correo**

P-07 tenía un solo canal de contacto —el teléfono, RN-34— y el correo institucional existía en
Auth central sin conservarse aquí: quien miraba una ficha no tenía forma de escribirle a esa
persona. Se añade `func_correo`, opcional, y aparece en el formulario y en la tabla.

### Cuatro decisiones

| | |
|---|---|
| **Es opcional, como el teléfono** | El maestro se administra el día que la persona entra, no el día que Sistemas le crea la cuenta. Exigirlo bloquearía el alta |
| **Sin índice único** | La identidad de la ficha es la cédula. Un único sobre el correo añadiría un modo de fallo —un buzón compartido por una unidad— sin añadir garantía |
| **160 caracteres**, los de `usua_correo` | Los dos guardan la misma clase de dato y salen del mismo sitio; que uno admitiera más produciría un correo válido como cuenta e inválido como ficha |
| **Se guarda en minúsculas** | En un correo la caja no significa nada. Guardarlo tal como se teclee dejaría dos escrituras del mismo buzón que no se parecen |

### Se precarga desde Auth, y es el único dato nuevo que puede precargarse

El directorio ya entregaba el correo y se descartaba. Ahora llega escrito en el paso 2, editable
como la cédula y el nombre. **El área, el contrato y el teléfono siguen en blanco**: Auth no los
conoce, y proponerlos con un valor «razonable» invita a no mirarlos — el del contrato decide si
esa persona puede salir de noche (RN-26).

La prueba que fija la forma de la precarga **cayó al añadirlo**, que es justo para lo que está:
obligó a que la ampliación fuera deliberada en lugar de colarse.

### Lo que no cambia, y consta

- **La orden de servicio sigue teniendo cuatro campos** (INV-24, RN-50). El correo no entra ahí.
- **No sale en la consulta de personal elegible.** Mismo criterio que el teléfono: quien arma el
  cuadro elige personas, no las contacta. Un campo que no existe en ese contrato no se filtra por
  descuido en una pantalla nueva.
- **La auditoría registra que cambió, nunca su valor.** Se suma a `func_cedula` y `func_telefono`
  en la lista de datos personales que la traza no copia.

### Dónde se valida, y dónde no

`esCorreoValido` vive en `reglas-personal.ts`, con la cédula y el teléfono. Es **deliberadamente
holgada**: no exige el dominio institucional —la AMC trabaja con personal de otras instituciones—
ni intenta una expresión de RFC 5322. Solo atrapa el dedazo evidente, como un teléfono pegado en
el campo equivocado. El navegador no valida el formato: dos definiciones de «correo válido»
acabarían discrepando, y la que rechazaría primero sería la que nadie recuerda que existe.

---

## 0.6.11 · 1 de septiembre de 2026, tarde · **la flota pasa a su administrador, y P-03 vuelve a funcionar**

### 1 · Las dos pantallas de la flota son de `ADMINISTRADOR_DAF`, y de nadie más

«Conductores y vehículos» y «Mantenimiento de vehículos» pasan al administrador de Vehículos.
Es el **primer trabajo real del reparto de la administración**: los tres administradores se
crearon esa mañana y dos quedaron sin ningún acceso.

Salen los dos roles que las tenían, y no es lo mismo perder cada uno:

| Rol | Antes | Ahora |
|---|---|---|
| `ADMINISTRADOR_DMIP` | Administraba la flota entera | Nada. La flota dejó de ser suya |
| `DAF` (operativo) | Podía **parar un vehículo** desde mantenimiento | Lo pide al administrador |
| `ADMINISTRADOR_DAF` | Nada | Las dos pantallas |

**La DAF sigue viendo el vehículo parado.** RN-DAF-05 no cambia y el estado viaja en
`GET /transporte/vehiculos`, que es otro controlador: lo que se cerró es el camino de
escritura, no el dato.

**Y el catálogo de zonales se lee, aunque no se administre.** `GET /administracion/ubicaciones-flota`
lleva ahora su propio `@Roles` con la DAF dentro: es de donde P-03 saca el desplegable para
declarar dónde queda cada vehículo (RN-DAF-03). Crear y desactivar zonales siguen siendo del
administrador.

### 2 · Un 403 que dejaba P-03 en blanco, y llevaba ahí desde el 31-AGO

**P-03 estaba rota para la DAF y nadie lo había visto.** El catálogo de zonales colgaba de un
controlador `@Roles(ADMINISTRADOR_DMIP)`, así que la DAF recibía **403** al abrir la pantalla; y
como P-03 pide sus cuatro catálogos en un `Promise.all`, el rechazo de uno vaciaba los cuatro:
**conductores, vehículos, zonales y destinos**. La pantalla de asignación de transporte se abría
completamente vacía, sin ningún mensaje.

Se descubrió comprobando los permisos contra el servidor en marcha antes de tocarlos, no con las
pruebas: es un cruce entre dos controladores que ninguna suite miraba. Queda arreglado.

**El mismo tipo de cruce apareció una segunda vez, ya dentro de este cambio.** La pantalla de
mantenimiento saca su lista de vehículos de `GET /transporte/vehiculos`, que es de otro
controlador y no admitía a `ADMINISTRADOR_DAF`: se le habría abierto vacía. También detectado
contra el servidor.

### 3 · Lo que hace falta para poder usarlo

**Nadie tiene el rol `ADMINISTRADOR_DAF` todavía.** Hasta que una cuenta lo reciba en «Cuentas del
cuadro», esas dos pantallas no las abre nadie. No es un fallo de la ruta: el rol está creado y sin
asignar.

---

## 0.6.10 · 1 de septiembre de 2026, tarde · **dos avisos que faltaban y un campo que sobraba**

### 1 · Asignar personal ahora lo dice

Sobre un operativo que ya existe cada persona es un `POST` inmediato, y **el fallo hablaba
mientras el acierto callaba**: la única señal de éxito era que el nombre apareciera en la
bandeja, donde aparecería igual si la petición se hubiera perdido. Importa por quién lo usa: el
departamento que **aporta** abre esa pantalla para poner a una persona en un operativo que no es
suyo, y se va sin tener dónde volver a comprobarlo.

Ahora un `alert alert-success` junto al selector, con el nombre dentro: «Se agregó a YUNDA
JESSICA al operativo OCECU-001-02-SEP-2026». En **P-01 modo aporte** y en **P-13**, que son las
dos pantallas donde se asigna sobre lo existente. Va con `role="status"` y no `role="alert"`:
confirmar no interrumpe.

### 2 · Cambiar de formulario ya no arrastra la tabla anterior

Entre el clic en una pestaña y la respuesta del servidor, la tabla de P-01 conservaba las filas
del formulario anterior: se leía «2 · PMO» sobre una fila `OCF-…`. Ahora cambiar de formulario la
vacía; **recargarla no** —ocurre en cada persona que se asigna, y vaciar ahí la haría parpadear—.

### 3 · El campo «Dirección» del formulario de ficha

Se retiró de «Nuevo funcionario». **La columna `func_direccion` sigue existiendo y sigue
gobernando PER-09**: de ella dependen qué fichas ve cada departamento, quién les registra
ausencias y quién puede retirarlas. Lo que se quitó es preguntarla: **la deduce el servidor del
área**, con el mismo `ROL_DEL_AREA` que ya declaraba a qué departamento pertenece cada área.

**Era un campo que pedía dos veces el mismo hecho y admitía que las dos respuestas se
contradijeran.** Nada impedía guardar a alguien del área `OPERATIVOS` con dirección
`DMIT_INSTRUCTOR`: esa ficha quedaba en un maestro que no le correspondía, invisible para quien
tenía que administrarla. Y el contrato aceptaba **cualquier** valor del enumerado, incluidos
`DIRECTOR` y los tres administradores, que no son direcciones con personal.

Encima ofrecía nombres de **rol** —«DMIP Operativos»— bajo una etiqueta que decía «Dirección»,
así que quien lo leía entendía que le estaba dando un acceso al sistema al funcionario, que es
justo lo que no hacía.

| | Antes | Ahora |
|---|---|---|
| Quién la elige | Quien da el alta, en un desplegable | El servidor, desde el área |
| Mover a alguien de departamento | Cambiarle la dirección | Cambiarle el **área** |
| Comprobación de alcance | `exigirEnSuAlcance` sobre lo enviado | La misma, sobre lo deducido |
| Ficha con dirección `DAF` | Se podía crear | **No, desde la pantalla** |

**Lo que se pierde, y consta:** la DAF tiene gente y no tiene área, así que no hay área de la que
deducirla. Ese personal nunca fue convocable a un operativo —los formularios admiten gente por
área y ninguna es suya— y las fichas DAF existentes siguen intactas.

**Un defecto que estuvo a punto de salir.** Al quitar el campo, el esquema de validación seguía
exigiendo `direccion`: con eso **ninguna ficha se podía guardar**, y el mensaje habría señalado
un campo que ya no se pinta. Lo detectó la prueba nueva «y tampoco la manda al guardar».

---

## 0.6.9 · 1 de septiembre de 2026, tarde · **un solo formulario, una sola lista, y P-13 en lectura**

Tres cambios pedidos juntos, y **dos de ellos corrigen lo entregado esa misma mañana**.

### 1 · Se corrige en el formulario de captura, no en un panel aparte

La versión 0.6.8 puso «Editar» en cada fila, y abría `PanelEdicionOperativo` **debajo de la
tabla**. Nunca fueron dos formularios distintos —el panel siempre envolvió a
`FormularioOperativo`—, pero en pantalla había dos, y corregir una hora obligaba a bajar hasta el
final de la página y volver. Ahora el operativo se carga **en el formulario de arriba**.

**El precio, y cómo se paga.** La cabecera de P-01 promete «LO CAPTURADO NUNCA SE PIERDE», y con
dos formularios se cumplía sola: el de captura seguía montado. Con uno, los valores del operativo
caen sobre los mismos campos. El borrador se aparta al entrar —leyendo la referencia de Formik— y
vuelve **al cancelar y al guardar**. Dos pruebas lo fijan, una por camino.

Y `resetForm()` sin argumentos quedó prohibido en esta pantalla: repone `initialValues`, que
mientras hay borrador **es el borrador**, así que al registrar el formulario se habría rellenado
solo con lo que acababa de enviarse.

### 2 · La tabla trae la jornada, no la sesión

«Registrados en esta sesión» era literal: nacía vacía y solo crecía con lo que se creaba en esa
pestaña. Recargar la página lo borraba, y quien volvía tras el almuerzo registraba sin ver qué
llevaba ya el día. **La pregunta estaba planteada en el plan de la 0.6.8** —«¿memoria de la
sesión, o que sobreviva a una recarga?»— y quedó sin responder. El negocio la resolvió a favor de
lo segundo.

Se pide con la llamada que el modo aporte ya usaba, sin condicionarla: `GET /operativos` por
**código** de formulario, con PER-02 aplicado en el servidor. Desaparece una de las dos listas que
convivían.

**Y por eso los botones dejaron de ser incondicionales.** Mientras la tabla solo tuvo lo recién
creado por quien miraba, todas sus filas eran suyas. Ahora el **formulario 4 tiene dos
departamentos que registran**, así que aparecen filas ajenas que `exigirPropiedad` rechazaría con
un 403 que antes no podía ocurrir. Se apagan con su motivo —nombrando al departamento al que hay
que pedirlo— usando `accesoOperativo.util.ts`, la misma utilidad de P-02.

### 3 · P-13 se abre en lectura, que era la mitad que faltaba

La decisión de la mañana decía, textual: «abrirla **solo en lectura** y sin el personal ajeno». Se
implementó el recorte del personal y **no la lectura**. La tabla ofrecía la acción donde
`acceso !== "LECTURA"`, y los dos departamentos recién admitidos tienen ESCRITURA en sus propios
formularios: podían asignar personal desde P-13.

**No fue una fuga ni una escalada.** Ya podían hacerlo desde P-01 y P-02, que son sus pantallas;
lo que sobraba era un segundo camino que nadie decidió abrir. PER-02 estuvo intacto en todo
momento: sobre lo ajeno el acceso es `LECTURA` y el personal no viaja.

**Se cerró con datos, no con un `if`.** La instrucción nombraba un rol y la regla permanente del
proyecto prohíbe que ningún rol esté quemado en código. Ambas se cumplen con la columna
`frol_edita_desde_jornada` de `t_formulario_rol`: `acceso` dice qué autoridad tiene el rol sobre el
formulario, y esa columna dice si **P-13** es el sitio donde la ejerce.

La siembra está escrita por la relación y no por el nombre —la reciben las filas de quien
**aporta** en algún formulario, que es la situación para la que P-13 se construyó— y la migración
se niega a aplicarse si nadie quedara con la acción o si la recibiera quien no aporta.

| Formulario | Rol | Acceso | ¿Asigna desde P-13? |
|---|---|---|---|
| 1, 2, 3 | DMIP Operativos | ESCRITURA | **No** |
| 4 · ECU | DMIP Operativos | ESCRITURA | **No** |
| 4 · ECU | DMIT Instrucción | APORTA | **Sí** |
| 5, 8 | DMIP Inspecciones | ESCRITURA | **No** |
| 6 · REACN | DMIP Inspecciones | ESCRITURA | **No** |
| 6 · REACN | DMIT Instrucción | APORTA | **Sí** |
| 7, 9 | DMIT Instrucción | ESCRITURA | **Sí** |

**DMIT no pierde nada**, que es lo que el negocio confirmó al aprobar el cambio. Se descartó
derivarlo de `acceso === 'APORTA'` —que no habría costado migración— justamente porque le habría
quitado la acción en el 7 y el 9.

### 4 · Lo que queda pendiente de decidir

Quitar el botón **oculta el camino, no cierra la puerta**: `PATCH /operativos/:id/personal` sigue
aceptando la petición de esos roles sobre sus propios operativos, porque **debe** —es la misma
llamada que usan P-01 y P-02—. Se tomó como restricción **de pantalla** y no de permiso, con la
alternativa sobre la mesa: distinguir el origen de la petición exigiría un dato que hoy no viaja y
rompería P-01 y P-02 si se distinguiera mal.

---

## 0.6.8 · 1 de septiembre de 2026 · **se corrige donde se registra**

La tabla «Registrados en esta sesión» de P-01 era de solo lectura. Quien digitaba mal una hora
tenía que ir a P-02 a arreglarla, y P-02 consulta el servidor, filtra y pagina: mucho rodeo para
deshacer un error de hace diez segundos.

Cada fila ofrece ahora **Editar** y **Eliminar**.

### 1 · Estaba dibujado desde el diseño, y nadie lo miraba

`FASE5` §4.1 dibuja esa fila terminando en `[✎] [🗑]` (línea 257). El prototipo, el plan, los
informes M-22 y M-23 y el manual describen la tabla como resultado de solo lectura y sitúan la
corrección en P-02. **Nadie escribió nunca que P-01 no debiera corregir**: la separación se
argumentaba por propósito —«registrar deprisa» frente a «la pantalla donde se corrige»—, no por
prohibición.

Y `DOCUMENTACION_INCONSISTENCIAS.md` I-06, que existe justamente para listar los esquemas de FASE5
que dibujan lo que no hay, **enumera tres casos y no incluía éste**. No fue una decisión revocada:
fue un dibujo que nadie vigilaba. El episodio queda anotado allí, porque la lección es sobre la
lista, no sobre P-01.

### 2 · Cero servidor

`PATCH /operativos/:id` y `DELETE /operativos/:id?version=` existen desde M-11 con las cuatro
guardas, `@Roles(...ROLES_DE_CARGA)` y `exigirPropiedad` —*«cada departamento edita y retira lo que
él creó»*—. En P-01 quien mira acaba de crearlos, así que la propiedad está garantizada por
construcción y no hace falta ni calcularla ni pintar un motivo de solo lectura, al revés que en
P-02.

No hubo migraciones, ni endpoints, ni componentes nuevos: `TablaOperativos` ya admitía `acciones`
como propiedad opcional desde M-23.

### 3 · La lista se empalma, no se recarga

`registrados` es memoria de la sesión. `PATCH` devuelve el operativo ya actualizado **con su
`version` nueva** y se sustituye la fila. Dejar la vieja no se habría notado en pantalla —el
identificador no cambia— pero **el segundo guardado habría mandado una versión caduca y recibido un
409**. Hay una prueba que pide dos ediciones seguidas justamente por eso.

### 4 · Lo que no se tocó

**La captura en curso no se desmonta al abrir la corrección.** La cabecera de P-01 promete que «lo
capturado nunca se pierde», y en modo aporte la pantalla sí desmonta el formulario; hacerlo aquí
habría tirado el trabajo de quien tuviera media captura escrita. Hay una prueba que lo fija.

**No se añadió «Adicional».** No se pidió, y un adicional no engendra adicionales: sigue siendo de
P-02.

**PV-10 no cambia.** Recién registrado y sin órdenes, eliminar **borra de verdad** y el secuencial
vuelve a quedar libre — que es exactamente lo que necesita quien va a registrarlo otra vez bien.

---

## 0.6.7 · 1 de septiembre de 2026 · **la administración se reparte en tres direcciones**

Había un único `ADMINISTRADOR` que lo abría todo: catálogos, ventanas, parámetros, cuentas,
personal y flota. El negocio lo divide por dirección.

| Rol | Accesos |
|---|---|
| `ADMINISTRADOR_DMIP` | **Todo lo que tenía `ADMINISTRADOR`.** Es quien administra hoy |
| `ADMINISTRADOR_DMIT` | Ninguno todavía |
| `ADMINISTRADOR_DAF` | Ninguno todavía |
| `ADMINISTRADOR` | **Ninguno.** Vaciado, conservado, no reasignable |

**Los dos vacíos se crean ahora aunque no abran nada.** El enumerado es la parte cara del
cambio —`e_rol_departamental` es un tipo de PostgreSQL y ampliarlo exige migración— y
añadirlos hoy evita repetirla el día que se les dé trabajo.

### 1 · Dos migraciones, y no se pueden fusionar

`ALTER TYPE … ADD VALUE` **no admite usar el valor nuevo en la misma transacción que lo
añade**, y Prisma envuelve cada migración en una. Por eso el enumerado va en
`20260901090000` y el traspaso de las cuentas en `20260901091000`. Fusionarlas rompe el
despliegue, y no es una cuestión de estilo.

**El orden del despliegue tampoco es negociable: migraciones primero, código después.** Los
roles se asignan en P-11 «Cuentas del cuadro», que es de administrador: quien perdiera el
rol perdería también la pantalla donde volvería a dárselo, y la salida sería un `UPDATE` a
mano en producción.

### 2 · Qué se movió y qué no

Una tercera migración, `20260901092000`, repuntó lo que la anterior se había dejado:

| Tabla | Qué se hizo | Por qué |
|---|---|---|
| `t_usuario_rol` | Traspasada a `ADMINISTRADOR_DMIP` | Sin ella, la única cuenta administradora dejaba de abrir nada |
| `t_rol_auth` | El rol 58 de Auth repuntado al DMIP | La pantalla «Roles de Auth central» decía lo contrario de la verdad: listaba al administrador real entre los que no pueden entrar |
| `t_ventana_carga` | La fila repuntada al DMIP | Solo cosmético: la fila está inactiva, y una ventana inactiva —igual que una ausente— se resuelve como «sin restricción horaria» |
| `t_auditoria` | **Intacta.** 687 filas siguen diciendo `ADMINISTRADOR` | Es historia: dice quién hizo qué bajo qué rol **en su momento**. Reescribirla falsificaría el registro |

Esa distinción —configuración vigente frente a historia— es la que ordena las tres
migraciones, y es la razón de que los mapas de nombres del frontend conserven el rol
retirado: un rol que el mapa no supiera nombrar saldría como `undefined` en pantalla.

### 3 · Dos trampas para que no vuelva

`ADMINISTRADOR` sigue en el enumerado y **no se puede retirar**: PostgreSQL exigiría recrear
el tipo y las doce columnas que lo usan. Un rol vacío que aún se puede escribir es fácil de
resucitar sin querer —al resolver un conflicto de fusión con una rama anterior, o al copiar
un controlador viejo como plantilla— y **no rompería nada visible**: nadie tiene ya ese rol,
el endpoint seguiría funcionando para el DMIP y la línea muerta quedaría ahí hasta que
alguien volviera a asignarlo. Un fallo silencioso hoy, un agujero de autorización después.

- `src/common/auth/roles-administracion.spec.ts` recorre los `@Roles` de los controladores.
- `src/config/rolesDeAdministracion.spec.ts` recorre `pantallas` y el menú lateral.

Son dos listas distintas que tienen que decir lo mismo: el servidor decide quién puede, el
frontend decide qué se ofrece, y una pantalla ofrecida a quien el servidor rechazará es un
`403` en la cara del usuario.

**La primera encontró un defecto en sí misma al escribirse.** Comparaba con `includes`, y
`ADMINISTRADOR` es prefijo de los otros tres: al sumarlo a la lista dio por infractores a
los quince controladores que acababan de migrar correctamente. Había pasado desapercibido
mientras la lista solo tenía los dos sufijados, que no son prefijo de nada.

### 4 · El rol retirado ya no se puede asignar

«Cuentas del cuadro» y «Roles de Auth central» construían su lista con
`Object.keys(NOMBRE_ROL)`. Correcto mientras el mapa y los roles vigentes coincidieran;
dejó de serlo al vaciarse uno. Seguir ofreciéndolo dejaría **crear cuentas que entran y no
pueden hacer nada**, y el fallo no se vería al guardarlas sino días después, cuando esa
persona llamara diciendo que no le aparece ninguna pantalla. `ROLES_ASIGNABLES` lo excluye;
`ADMINISTRADOR_DMIT` y `ADMINISTRADOR_DAF` **sí** se ofrecen, porque están vacíos por no
tener trabajo aún, no por habérselo quitado.

### 5 · PER-09 sigue vigente

El reparto es **entre administradores**, no contra los departamentos. Los tres roles
departamentales siguen viendo el maestro acotado a su dirección y anotando las ausencias de
su propia gente en P-07, exactamente como desde el 27 de agosto.

---

## 0.6.6 · 26 de agosto de 2026 · **el texto deja de perderse al cambiar de tema**

Al pulsar el interruptor de tema, parte del texto desaparecía durante un instante. Y
buscando la causa apareció otro texto que **no desaparecía un instante: no estaba nunca**.

### 1 · El parpadeo

Los fondos cambian de golpe —`data-theme` no se anima— mientras que **dieciocho selectores
animan `color` durante 180 ms**: barra lateral, modales, pestañas y los `.btn` de daisyUI.
Durante esos 180 ms convive el fondo nuevo con el color de texto viejo.

Medido en el navegador, muestreando el contraste real cada 20 ms:

| | claro | t0 | t20 | t40 | t100 | t180 |
|---|---|---|---|---|---|---|
| Botón secundario, **antes** | 11,83 | **1,60** | 5,47 | 11,25 | 16,07 | 17,10 |
| Botón secundario, **ahora** | 11,83 | 17,10 | 17,10 | 17,10 | 17,10 | 17,10 |

**1,60:1 es texto invisible**, y duraba unos 100 ms.

`ThemeProvider` marca `<html data-cambiando-tema>`, cambia el tema, **fuerza un recálculo**
y suelta la marca en el fotograma siguiente; bajo ese atributo todo lleva
`transition: none`. Las transiciones **no se retiran** —en hover y foco hacen su trabajo—,
solo se suspenden durante el tránsito.

> **La lectura de `offsetHeight` no es un adorno.** Sin ella el navegador junta los tres
> cambios en un solo recálculo, cuando el atributo ya no está, y anima igual. Se descubrió
> midiendo: la regla estaba en el CSS compilado y el botón **seguía** cayendo a 1,60.

### 2 · El rótulo que no estaba nunca

`CLAUDE.md` regla 3 dice que el color del texto sobre el banner se elige por luminancia con
`banner.util.ts`. `BannerFormulario` lo hacía; **`PanelEdicionOperativo` y
`PanelAdicionalOperativo` llevaban `text-white` fijo**.

Y los nueve `colorFondo` del Excel aprobado **son pastel**:

```
  #  código   fondo      antes            ahora
  1  FIJOS   #A2C4C9     1.86:1           11.28:1
  2  PMO     #FCE5CD     1.22:1  ← peor   17.23:1
  4  ECU     #D9D9D9     1.41:1           14.88:1
  8  INSP    #CCCCFF     1.54:1           13.65:1
                         …los nueve por debajo de 1,9:1
```

El rótulo del formulario era ilegible **en los nueve, en los dos temas**, al editar un
operativo y al capturar un adicional. No es un fallo del tema oscuro: llevaba ahí desde
que existen esos paneles.

Se retiró además el `text-white` de `ModalExito`, que pisaba el `--color-success-content`
que daisyUI ya resuelve y dejaba **1,84:1** sobre el menta `#6ed0bd`.

### Qué cambió

`ThemeProvider.tsx` · `design-tokens.css` · `PanelEdicionOperativo.tsx` ·
`PanelAdicionalOperativo.tsx` · `ModalExito.tsx`. **Sin backend, sin base de datos, sin
migraciones y sin permisos.**

**Pruebas: 457**, cuatro nuevas sobre `ThemeProvider` —que la marca se ponga **antes** del
tema y se retire después—, comprobadas **degradando el código**: invirtiendo el orden cae
una, y suprimiendo la retirada caen dos. El contraste no se prueba en unitarias: se mide
con el arnés de navegador, que exige **≥ 4,5:1 en todos los instantes**.

> **Queda uno sin tocar, y se deja escrito:** el antetítulo de página
> (`page-heading-kicker`) da **4,29:1 en tema claro**, por debajo de AA. No es de este
> cambio —ocurre sin tocar el tema— y no entraba en el alcance.

---

## 0.6.5 · 26 de agosto de 2026 · **las pantallas aprovechan el ancho del monitor**

Los formularios dejaban franjas vacías a los lados. No era de los formularios: **el
contenedor de las doce pantallas estaba recortado a 1280 px y centrado**.

`src/styles/ui/page-header.css` · `.app-page-shell` · `max-width: 80rem → 110rem`

### La cuenta, en un monitor de 1920

| | px |
|---|---|
| Ventana | 1920 |
| − barra lateral (`16.375rem`) | −262 |
| − relleno del `<main>` (`lg:px-8`) | −64 |
| **Disponible** | **1594** |
| Tope anterior | 1280 |
| **Sobrante** | **314 → 157 px muertos a cada lado** |

Con la barra lateral plegada eran **288 px a cada lado**.

### Por qué nadie lo vio en meses

**El tope solo apretaba por encima de 1606 px de ventana**, y toda la verificación del
diseño se hizo a **1440 px** —está escrito en `FormularioOperativo.tsx` y en FASE5 §9.3—.
A 1440 el disponible es 1114 px: por debajo del tope, sin un píxel desperdiciado. El
defecto existía solo en pantallas grandes, que es donde se opera.

### Qué cambia y qué no

**No aparecen más columnas.** Ninguna rejilla del proyecto declara `2xl:`, y los puntos de
ruptura de Tailwind miden la ventana y no el contenedor: a 1920 ya regía `xl`, con cuatro.
Lo que cambia es que **esas cuatro pasan de ~296 px a ~377 px** cada una — los campos dejan
de apretarse, las etiquetas largas dejan de partirse y el formulario baja de alto, que es
la dirección que pidió el Product Owner (FASE5 §4.1).

**Por debajo de 1606 px de ventana no cambia absolutamente nada**: el tope no llegaba a
actuar. Ni una sola pantalla se toca; las doce heredan la declaración.

### Se corrigió una contradicción, y llevaba tiempo

FASE5 §2.2 y §5.1 declaraban el contenedor como `flex flex-col mx-auto w-full max-w-5/6`.
**Esa clase no existe en el código**: cero apariciones en todo `src/`, y las doce páginas
usan `app-page-shell`. La diferencia no era cosmética — `max-w-5/6` es fluido y
`max-width` es fijo.

Esa tabla se declara «fuente de verdad de la regla 1 de CLAUDE.md», y la revisión del
21-AGO corrigió tres filas y dejó ésta. Corregida: queda una sola fila, con su anchura.

### Lo que hay que saber al mantenerlo

> ⚠️ **Se aparta de dos sitios, y es deliberado.** El `80rem` estaba en el **prototipo
> aprobado** por el Product Owner y en la **plantilla corporativa que este módulo comparte
> con Instrucción**, donde `page-header.css` era byte a byte idéntico. Si algún día se
> vuelven a alinear las hojas, esta línea es la que hay que conservar. El comentario del
> CSS lo dice con fecha y motivo.

**Se eligió 110rem y no «sin tope»** porque 1760 px cubre entero un monitor de 1920 y deja
margen en uno ultraancho, donde el área de Observaciones sería una línea de texto
ilegible. La medida de lectura sigue importando aunque el hueco exista.

**Sin pruebas nuevas**, y por la razón que da `CLAUDE.md` §3: el maquetado no se prueba.
Una prueba que afirmara `max-width: 110rem` solo repetiría la hoja de estilos. **No cayó
ninguna** de las 453, incluida la única que afirma maquetado —`matriz.spec.tsx:298`, el
`overflow-x-auto` de la matriz—, que mira una clase del componente y no el contenedor.

Verificado **en `dist/assets/*.css`**, no en las fuentes: la declaración compilada lleva
110rem y nada la sobrescribe. El escaneo de layout de la skill sale limpio.

---

## 0.6.4 · 25 de agosto de 2026 · **el DMIT aporta personal a la patrulla ECU**

Hasta hoy el **4 · PATRULLA ECU DIURNA** era exclusivamente de DMIP Operativos. Por
decisión del negocio, el **DMIT Instrucción** pasa a poner personal en esas patrullas.

### Aportar personal no es registrar, y esa línea no se movió

| El DMIT, sobre un operativo ECU | |
|---|---|
| Verlo en «Mis operativos» | **Sí** |
| Asignar de **1 a 2** personas del área de Instrucción | **Sí** |
| Retirar a quien él mismo asignó | **Sí** — `aper_asignado_por_rol` lo distingue |
| Crear un operativo ECU | **No** — `operativos.service.ts`, `crear` |
| Editarlo o retirarlo | **No** — `exigirPropiedad` |
| Que ECU le salga en el selector de **P-01** | **No**, y es deliberado |

Lo último merece explicación: si ECU apareciera en el selector de registro, el DMIT
escribiría el formulario entero y recibiría un **403** al guardar. Es exactamente el fallo
que `reglas-formulario.ts` describe en su cabecera —«la interfaz mostraría un formulario
que la guarda rechaza al guardar, y el funcionario perdería el trabajo ya capturado»—.

### Tres filas de datos, y la tercera es la que se olvida

```sql
UPDATE t_formulario      SET form_rol_compartido='DMIT_INSTRUCTOR', form_cupo_compartido=2 …
UPDATE t_formulario_area SET farea_es_compartida=true …  -- ECU × INSTRUCCION
```

`farea_es_compartida` dice **de qué área** aporta el rol compartido. Sin esa marca, el cupo
rechaza a todo el mundo con «participa con personal de: ninguna área»: el cambio parece
aplicado y no funciona. ECU ya declaraba el área INSTRUCCION, pero sin marcar — significaba
«el dueño puede asignar gente de Instrucción», no «el DMIT aporta».

### El máximo es una columna; el mínimo no existía

**Máximo 2**: `form_cupo_compartido`, aplicado en cada asignación por `composicion-personal.ts`.

**Mínimo 1**: no hay columna para un mínimo. Se exige **al cerrar la jornada**, en
`CuadroDiarioService.cerrar()`, junto a INV-11 y por el mismo motivo que declara PV-05: el
aporte llega después del registro. En cada asignación no cabe, porque rechazaría siempre a
la primera persona (PV-29). Código de error nuevo: **`APORTE_COMPARTIDO_PENDIENTE`**, el
vigésimo, y va separado de `CUPO_COMPARTIDO_SUPERADO` porque es su espejo: aquél sobra,
éste falta.

> ⚠️ **Esto puede dejar una jornada sin poder cerrarse**, y hay que saberlo: si no queda
> nadie de Instrucción a quien asignar, el cierre se bloquea y no hay excepción. Hoy el
> maestro tiene **una sola persona activa** de esa área. Queda anotado como **PV-41**, con
> la salida —que es de datos, no de despliegue— escrita.

### P-02 aprende a distinguir al dueño del que aporta

En un operativo ECU, el usuario DMIT ve **«Personal»** en lugar de «Editar» —abre el mismo
panel con todo en lectura salvo el selector de personal, igual que la DAF en P-03 (regla
9)—, «Retirar» apagado **con su motivo escrito** (regla 6) y ningún botón «Adicional».

Y el panel muestra por fin **qué áreas le faltan a la patrulla** (RN-31, RN-32). El servidor
lo calculaba desde M-15 y **ninguna pantalla lo pintaba**: `composicion` viajaba en cada
respuesta y se tiraba.

**Pruebas.** Backend **827** y frontend **449**, las dos tandas en verde. Las nuevas se
comprobaron **degradando el código** —retirando la comprobación del cierre, y forzando
`esPropio = true` en P-02— y confirmando que caen: 2 y 3 respectivamente.

---

## 0.6.3 · 25 de agosto de 2026 · **la hora de cierre deja de estar escrita dos veces**

Al cambiar la hora de cierre de un departamento en P-09, la pantalla respondía:

> *El parámetro `HORA_CIERRE_DEPARTAMENTAL` dice 15H00 y esta ventana diría 16H00. Son dos
> formas de guardar el mismo dato: conviene cambiar también el parámetro.*

El aviso era cierto, y ese era exactamente el problema. **El dato estaba en dos sitios.**

### Solo uno de los dos gobernaba

| Dónde | Qué hacía |
|---|---|
| `t_ventana_carga.vcar_hora_cierre`, **una fila por rol** | **Manda.** `VentanaCargaGuard` lee esta tabla y ninguna otra; es la que devuelve el `423` al funcionario que llega tarde |
| `t_parametro_politica`, clave `HORA_CIERRE_DEPARTAMENTAL`, **un valor único** | **No decidía nada.** Su único consumidor era la advertencia de arriba |

La advertencia no impedía guardar: solo lo pedía por favor. Quien no le hacía caso dejaba
la pantalla de parámetros diciendo 15H00 mientras el sistema cerraba a las 16H00 — y el
único modo de descubrirlo era que a alguien le rechazaran un operativo a una hora que la
pantalla daba por buena.

### Se retira el parámetro, no la hora

**Nada deja de estar configurado.** La hora de cierre de cada rol se sigue administrando en
P-09, en el panel de ventanas, que es donde siempre se aplicó.

Y es lo que pide **RF-059**: «parametrizar las ventanas de carga **por rol**». Un valor
único no podía expresar que la DAF cierre a las 16H30 y los tres departamentos a las 15H00,
ni que mañana dos departamentos difieran entre sí. Una fila por rol sí.

`HORA_LIMITE_CUADRO` **se queda**, y no es lo mismo: dice a qué hora debe estar cerrado el
cuadro entero (RN-57), que es un hecho de la institución y no de un rol. Sigue gobernando la
advertencia de RN-57, que sí compara dos cosas distintas.

### Qué cambió

| Archivo | Cambio |
|---|---|
| `prisma/migrations/20260825090000_la_hora_de_cierre_vive_solo_en_la_ventana/` | `DELETE` de la fila del parámetro |
| `configuracion/application/reglas-ventana.ts` | Fuera la advertencia de coherencia y el campo `cierreDepartamental` del contexto |
| `configuracion/application/reglas-parametro.ts` | Fuera su entrada de dominio |
| `configuracion/application/ventana-carga.service.ts` | Deja de leer el parámetro para componer las advertencias |
| `pages/AdminVentanasPage.tsx` · `TablaParametros.tsx` · `interfaces/Administracion.ts` | Los parámetros pasan de **ocho a siete**; la cabecera de P-09 explica qué administra cada panel |

**Pruebas.** Las tres que afirmaban la advertencia se sustituyen por las que fijan su
retirada: `advertenciasDe` no devuelve nada al mover el cierre de un departamento, y
`VentanaCargaService.actualizar` lo guarda sin arrastrar ningún parámetro. Se comprobaron
**degradando el código** —reintroduciendo un `push` en `advertenciasDe`— y confirmando que
caen. Backend `118` pruebas de configuración en verde; frontend `437`.

**PV-06 sigue abierto**, y no lo cierra este cambio: las fuentes dan 14H00 en una sesión y
15H00 en otra, del mismo interlocutor. Lo que cambia es que ahora hay **un solo sitio** donde
escribir la respuesta cuando la Dirección la dé.

---

## 0.6.2 · 25 de agosto de 2026 · **la ventana avisa cuánto le queda, antes de cerrarse**

La ventana de carga **solo se anunciaba cuando ya había cerrado**. Quien empezaba a
capturar un operativo a las 14H55 no tenía forma de saberlo: se enteraba al guardar, con
un `423` y el formulario entero escrito.

RN-56 no es una preferencia —a las 15H00 el departamento deja de cargar—, así que el aviso
tiene que llegar **mientras todavía se puede hacer algo con él**.

### Tres tonos, y cada uno dice algo distinto

| Falta | Semáforo | Qué dice |
|---|---|---|
| más de 1 h | **verde** `alert-success` | «Falta **02:20** para cerrar la ventana, está activa hasta las 15H00.» |
| entre 30 min y 1 h | **amarillo** `alert-warning` | «Falta **00:55**… No empiece un operativo que no vaya a terminar.» |
| **30 min o menos** | **rojo** `alert-error` | «Falta **00:28**… Guarde lo que tenga capturado: después no podrá registrar ni editar.» |

**La cuenta va en `hh:mm` y monoespaciada**, y la hora de cierre en notación institucional
—`15H00`—. Las dos cosas son deliberadas: dos relojes con el mismo formato en la misma
frase se confunden, y `15H00` es la notación que ya usan la matriz, la orden y los
manuales. El ancho fijo permite comparar dos visitas seguidas sin leer: `00:28` y `00:04`
se distinguen de un vistazo.

Media hora es el umbral que pidió el negocio, y tiene sentido operativo: capturar un
operativo con su personal lleva varios minutos, así que por debajo ya no da tiempo a
empezar otro con holgura.

**Ninguna información depende del color** (regla 6): el tono cambia el `alert`, pero lo que
dice cuánto queda es el texto. Y **solo lo inminente interrumpe**: `role="alert"` corta lo
que el lector de pantalla esté diciendo, y a dos horas del cierre eso sería una grosería;
a ocho minutos es exactamente lo que hace falta. Los otros dos van con `role="status"`.

### Dónde y con qué pulso

En las tres pantallas con ventana —**P-01**, **P-02** y **P-03**—, por un componente único,
`common/AvisoVentana.tsx`: que el texto viva en un solo sitio es lo que impide que la DAF y
el DMIP lean dos redacciones distintas de lo mismo.

**No hace falta un segundo reloj.** `useVentanaCarga` ya reconsultaba cada minuto, y ese
render rehace la cuenta. Un temporizador propio habría abierto la puerta a que los dos
discreparan.

**No decide nada.** `puedeEscribir` sigue saliendo de `abierta`, que lo dice el servidor, y
`VentanaCargaGuard` sigue rechazando. Si el reloj del navegador va adelantado, la cuenta
atrás se equivoca y la guarda no.

### Cuándo se calla, que importa tanto como cuándo habla

Con la ventana cerrada —de eso ya avisa el mensaje del servidor—, sin restricción horaria,
sin hora de cierre, y **con días de apertura**: una ventana de lunes a viernes no se
resuelve comparando horas, y adivinarlo daría una cuenta atrás falsa el fin de semana. Es
el mismo criterio que ya aplicaba `momentoRespectoDeVentana`.

Se mide **en la zona de la ventana**, no en la del navegador, y una ventana que cruza la
medianoche —22H00 a 02H00— cuenta hasta el cierre del día siguiente: sin eso daría minutos
negativos justo mientras se está usando.

### Y más llamativo, sin romper la regla de marca

Se pidió que se viera más. El manual prohíbe el rojo y los complementarios «como fondos
completos», pero admite «acentos, cajas pequeñas, textos o **barras**», así que el golpe de
color lo da una **barra de acento de 4 px a saturación plena** en el canto izquierdo, el
relleno sube unos puntos y **la cifra va al frente, en negrita y más grande**: «**8 min**
para que cierre su ventana…».

La barra se aplicó a **toda la familia `alert`**, no solo a este aviso: un aviso del sistema
no puede tener dos aspectos según quién lo emita. Los ocho pares de color se volvieron a
medir con el tinte nuevo y **siguen cumpliendo AA** en los dos temas — claro 11.10 · 10.44 ·
5.55 · 5.49, oscuro 10.73 · 8.13 · 7.74 · 5.53.

**19 pruebas nuevas** —12 de la cuenta atrás y 7 del semáforo—, comprobadas degradando
el código: al cambiar el verde por amarillo caen dos, y al devolver el umbral a 15 minutos
cae la que fija el salto a rojo.

Que `INMINENTE` pinte rojo y `HOLGADA` verde **no lo comprueba nadie mirando**: son tres
clases en un mapa, y basta con reordenarlas para que el semáforo mienta sin que falle nada
más. Un aviso que se pone rojo cuando sobran dos horas se ignora a la semana siguiente, y
entonces el rojo de verdad tampoco se mira.

Solo frontend: ningún endpoint, ningún contrato, ningún dato.

---

## 0.6.0 · 25 de agosto de 2026 · **los PDF llevan el logotipo institucional · PV-30 cerrado**

La institución entregó el bloque institucional —Agencia · escudo · Quito Alcaldía
Metropolitana— y **los dos documentos que salen del sistema lo llevan en la cabecera**.

### PV-30, cerrado

Hasta hoy `src/assets/LogoAmc.jpeg` eran **70 bytes: un PNG transparente de 1×1 con
extensión `.jpeg`**, con el nombre y la ruta correctos. Por eso la matriz imprimía la
identificación **en texto**: imprimir aquel archivo habría puesto un píxel invisible en el
membrete de un documento oficial. El marcador se retiró.

El archivo entregado pesaba **474 kB**; se reescaló a **1200 × 268 y 101 kB**, que a 232 pt
de ancho impreso equivale a más de 300 ppp. Cada orden pasa de 2 kB a 106 kB.

### Qué más cambió en la orden de servicio

| | Antes | Ahora |
|---|---|---|
| Membrete | «AGENCIA METROPOLITANA DE CONTROL» en Helvetica | **el logotipo**. El titular de texto sobraba: el bloque ya lo dice |
| Jerarquía | tres tamaños de negrita | institución → tipo de documento (versalita azul) → **código a 17 pt** |
| Los cuatro campos | sueltos sobre el blanco | **en una caja recta**, con filetes entre casillas. Se leen como *la asignación*, que es lo que son (INV-24) |
| Color | negro y grises | azul marino institucional en filetes y rótulos |
| Aviso al pie | bloque azul claro | relleno tenue **con filete**, como los avisos de la aplicación |

### Y un fallo de fecha que llevaba desde M-19

`Emitida el ${emitidaEn.toISOString().slice(0, 10)}` **imprimía el día equivocado en toda
emisión posterior a las 19H00**: Quito es UTC−5, así que una orden emitida el 25 a las
20H00 salía fechada el 26. Comprobado, y corregido con `marcaDeTiempo`, que resuelve la
zona. En un documento que se entrega y se archiva, la fecha es parte de lo que se firma.

### La matriz

El logotipo va a la izquierda y la identidad del documento a su derecha —apaisado sobra
ancho, así que el membrete **no le quita altura a la tabla**—, con filete institucional
debajo.

**Y una columna que llevaba 40 puntos.** `OBSERVACIONES` era la más estrecha del documento
para el único campo de texto libre que existe: su propio título partía en dos renglones
—«OBSERVA / CIONES»— y el contenido salía cortado a las tres palabras. Ahora tiene **98**,
sacados de las columnas de longitud acotada y conocida —horario, placa, siglas—. Los
anchos siguen sumando exactamente el ancho útil.

### Cómo se verificó

Los dos PDF se generaron y **se miraron**, rasterizados con pdf.js: no se juzgó por el
código. `identidad-institucional.ts` concentra membrete y paleta para que un día no se
corrija un documento y no el otro, y **si el archivo faltara los dos siguen saliendo** con
el membrete de texto, registrando el aviso. El `Dockerfile` ya copiaba `src/assets`; su
comentario decía lo contrario de lo que ahora es cierto y se reescribió.

57 pruebas del módulo de documentos en verde. Ningún cambio de contrato ni de datos.

---

## 0.5.8 · 24 de agosto de 2026 · **«Adicional» solo donde el formulario lo admite**

**RN-61: un formulario admite adicionales si y solo si tiene un prefijo marcado para
ellos.** Y hoy lo tiene **uno solo**: `OCAPMO`, del **2 · CONTROL DE PUNTO DE MANDO
OPERATIVO (PMO)**.

Conviene decirlo porque induce a error: DMIT e INSP también tienen prefijos con «A»
—`ICA`, `OCA`, `IGA`, `ITA`— pero están marcados **como ordinarios**. Lo advierte el propio
código: «la A de `OCAPMO` significa *adicional*, pero la I de `IG` e `IT` significa otra
cosa».

### El defecto

**El servidor ya lo hacía cumplir** —`elegirPrefijoDeAdicional` rechaza con «el formulario
X no admite operativos adicionales»— pero **P-05 y P-02 ofrecían el botón «Adicional» en
los nueve formularios**. Se pulsaba, y fallaba en ocho de cada nueve. Ofrecer lo que va a
fallar enseña al funcionario a desconfiar de lo que lee.

| | Antes | Ahora |
|---|---|---|
| P-05 Órdenes · operativo de PMO | «Adicional» | igual |
| P-05 · los otros ocho formularios | «Adicional», y error al pulsar | **no se ofrece** |
| P-02 Mis operativos | igual defecto | **no se ofrece** |

**Desaparece, no se apaga.** Un botón apagado insinúa que en otras circunstancias se
podría, y en un formulario sin prefijo de adicional no se podrá nunca — a diferencia del
cuadro cerrado, que sí es una circunstancia y por eso allí sí se apaga con su motivo.

### Cómo viaja el dato

**Calculado, no almacenado, y decidido en el servidor.** `admiteAdicionales` sale de
`prefijos.some(p => p.esAdicional)` y se añade a **dos contratos**, porque las dos
pantallas leen de sitios distintos:

| Contrato | Para |
|---|---|
| `FormularioDelOperativoDto` | P-02, cuyas filas son operativos |
| `SeccionMatrizDto` | P-05, cuyas filas nacen de la matriz |

Cambiar qué formularios admiten adicionales es un **`UPDATE` sobre `t_formulario_prefijo`**,
sin desplegar código y sin tocar estas pruebas.

### Y otro `as` que tapaba un hueco

`ordenes.spec.tsx` construía su sección con `as SeccionMatriz`, así que le faltaban
`responsable`, `esPatrulla` y `totalOperativos` sin que el compilador dijera nada. Se retiró
la conversión, que es la tercera de esta jornada.

**Ningún cambio de base de datos ni de permisos.** Dos pruebas nuevas, comprobadas
degradando el código: al quitar la condición cae exactamente la que la protege.

---

## 0.5.7 · 24 de agosto de 2026 · **los avisos dejan de ser barras de color pleno**

El manual *Nueva Imagen 2025* es explícito: *«No usar el rojo ni los complementarios como
fondos completos. Solo acentos, cajas pequeñas, textos o barras»*. Los complementarios son
el lila, el verde menta y el naranja —es decir `info`, `success` y `warning`—, y con el rojo
son exactamente los cuatro `alert` y los cuatro `badge` de estado. **daisyUI los pintaba a
sangre y de ancho completo**: cuatro barras saturadas por pantalla.

Ahora son **relleno tenue, borde del color y texto legible**.

### Y había un fallo de accesibilidad real

`--color-warning-content` es blanco sobre `#f48a42`: **2.45:1**, muy por debajo del 4.5:1 de
AA. Lo llevan el aviso **ALV-04** —«sin conductor la jornada no se puede cerrar»— y el
distintivo «Sin ficha: no puede ser convocado».

| | Antes | Ahora |
|---|---|---|
| `alert-warning` / `badge-warning` | **2.45:1** | **5.99:1** / **5.78:1** |
| `alert-error` | 5.62:1, a sangre | **6.11:1**, en caja |
| `badge-error` | 5.62:1, a sangre | **5.88:1**, en caja |

### No se inventó: estaba en el prototipo

`docs/PROTOTIPO-sigoc-cuadro-colores.html`, líneas 190-228, ya definía `alert` y `badge`
exactamente así. Al construir la aplicación se heredaron las hojas del **armazón**
—compartidas con el módulo de Instrucción— pero **no las de componente**, y los valores por
defecto de daisyUI ocuparon su lugar. Es la misma causa que explica por qué la aplicación no
se parecía al prototipo: el prototipo define **106 selectores** y las hojas heredadas solo
traen los del armazón.

Tres mejoras sobre él, las tres medidas: sus dos hexadecimales escritos a mano —`#8a4a08` y
`#f8c894`— se derivan ahora de `--color-warning` con `color-mix`, como pide el manual; y sus
dos rojos de texto —**4.04:1** en oscuro y **4.78:1** en claro— dejan de estar al filo.

### Lo que no se tocó, y es deliberado

- **`badge-primary` y `badge-accent` siguen a sangre.** El manual solo prohíbe el rojo y los
  complementarios; los azules institucionales son justamente «fondos principales».
- **Ni una propiedad de caja.** Nada de `padding`, `height`, `border-width`, `font-size` ni
  `border-radius`: `.alert` y `.badge` de daisyUI ya traen borde, así que basta recolorearlo.
  **El layout no se mueve un píxel**, que es lo que se pidió.
- Sí se apagan en `.alert` la textura de ruido y el relieve con línea negra que daisyUI le
  pinta: el manual pide «reducir degradados y fondos texturados».

**Un archivo nuevo, `styles/ui/avisos-y-distintivos.css`, sin un solo `!important`**: va al
final de `index.css` y gana por orden. Verificado sobre el CSS construido y con capturas de
las dos temáticas a 1440 y 390 px.

---

## 0.5.6 · 24 de agosto de 2026 · **auditoría de interfaz contra el manual de marca**

Auditoría contra **Nueva Imagen 2025** —skill `diseno-sigoc`—, que pide *«minimalismo,
cajas rectas y reducir degradados»* y prohíbe *«escribir valores hexadecimales a mano»*.

> ### ⚠️ Rectificación del mismo día
>
> **Esta entrada dijo primero que se había aplanado la cabecera de panel, y que con ello el
> contraste del título pasaba de 4.77:1 a 11.36:1. Era falso, y el cambio se revirtió.**
>
> El degradado `linear-gradient(135deg, secondary, primary)` **está declarado** en
> `panels-theme.css`, pero **nunca llegaba a pintarse**: `administration-theme-light.css`
> —importado después y con más especificidad— ya fijaba
> `.app-modules-panel > .app-section-header { background: #20347d; background-image: none }`,
> y **las 19 cabeceras del proyecto cuelgan de un `app-modules-panel`**. La cabecera ya era
> azul marino plano, y su contraste ya era **11.36:1**.
>
> El error fue leer la hoja y no el CSS construido. Se detectó al comparar el proyecto con
> `instruccion-frontend`, y el archivo se devolvió a su estado anterior.

**Lo que sí quedó comprobado, y sigue en pie:**

| Hallazgo | Estado |
|---|---|
| `src/styles/` son **19 hojas heredadas del frontend de Instrucción**, llegadas en el commit base del 04-AGO. **17 de 18 son idénticas byte a byte** a las suyas | Es la plantilla corporativa, no deriva |
| El **prototipo aprobado** no es la fuente del diseño: está escrito **encima de esa misma plantilla**, con sus clases y sus variables | — |
| Las hojas escriben **hex a mano** en lugar de las variables del tema | Sin corregir |
| `--muted` se usa **35 veces en el prototipo y 0 en el código**: la transcripción puso `#5a6d99` literal | Sin corregir. Es el origen del punto anterior |
| **373 `!important`** en `src/styles/`: las hojas pelean con daisyUI en vez de configurarlo | Sin corregir. Es la causa de fondo |

**Las tres únicas diferencias reales con `instruccion-frontend`**, y dos son deliberadas:

| Diferencia | Origen |
|---|---|
| `tipografia.css` · **Montserrat** | 14-AGO. El manual la exige; Instrucción usa la pila del sistema |
| Radio **6 px** en lugar de 24 px | 20-AGO, «las cajas de los paneles bajan de 24 a 6 píxeles». El manual pide cajas rectas |
| `panels-theme.css` | **Revertido**: ver la rectificación de arriba |

Se corrigió además `.interface-design/system.md`, que afirmaba «cero degradados»: se había
medido solo la capa de los `.tsx`.

---

## 0.5.5 · 24 de agosto de 2026 · **el alta de personal empieza en el directorio de Auth**

P-07 tenía dos vistas conmutables —«Maestro» y «Directorio de Auth»— y «Nuevo funcionario»
abría una ficha en blanco. **La pestaña se retiró**: Auth central es la base de usuarios de
la institución —`GET /users` devuelve la AMC entera y este módulo solo descarta a los
inactivos—, así que teclear una ficha desde cero era copiar a mano algo ya escrito.

| | Antes | Ahora |
|---|---|---|
| Vistas del panel | dos, con conmutador | **una**: el maestro |
| «Nuevo funcionario» | ficha en blanco | **elegir del directorio** → ficha precargada |
| Cancelar la ficha | volvía al maestro | **vuelve al directorio**, si el alta nació allí |
| Filtro «sin ficha» | nacía apagado | **nace encendido**: es a lo que se viene |
| Consulta a Auth | al abrir la pestaña | al abrir la ventana, y **se conserva**: la segunda vez no cuesta nada |
| Alta de quien no está en Auth | «Nuevo funcionario» | **«Crear Funcionario Operativo»**, dentro de la misma ventana |

### La regla que había que preservar, y cómo se preserva

`CLAUDE.md` §7 dice: «el maestro sigue administrándose igual. **No acople una a la otra**».
Mover el directorio al camino del alta es precisamente ese acoplamiento, así que la regla
ahora vive en un botón: **«Crear Funcionario Operativo» está siempre, también con Auth caído**, abre la
ficha en blanco, y `POST /administracion/personal` no toca Auth en ningún punto — se
comprobó en el servidor, `funcionarios.service.ts` no tiene ni una referencia. **Dos pruebas
lo fijan**, una de componente y otra de recorrido.

### El fallo de Auth dejó de ser un 503

`GET /administracion/directorio` responde ahora `{ disponible, motivo, personas }` y **no
lanza** por esa causa. Que Auth no esté es un estado, no un error de la petición. Un fallo
**nuestro** sí sigue lanzando, y `directorio.controller.spec.ts` lo fija: atrapar de más
acusaría a Auth de algo que no hizo.

Es el contrato que ya usa el módulo de **Instrucción** para lo mismo, con los mismos tres
campos. Se analizaron sus dos repositorios antes de decidir: allí **no se crean personas**
—los identificadores vienen del CORE y Auth solo aporta identidad para vincular—, así que
para el alta no había precedente; lo que sí se adoptó es su forma de degradar sin romper.

### Qué se tocó

| Archivo | Qué |
|---|---|
| backend · `directorio.controller.ts` · `dto/directorio.dto.ts` | La respuesta envuelta. `AuthNoDisponibleError` se traduce, lo demás sube |
| backend · `directorio.controller.spec.ts` | **Nuevo.** 4 pruebas |
| `components/personal/ModalDirectorioAuth.tsx` | **Nuevo.** La ventana del alta: lista, buscador, cobertura y salida manual |
| `components/personal/TablaDirectorioAuth.tsx` | **Retirado.** Sin importadores; sus 5 pruebas se trasladaron |
| `pages/AdminPersonalPage.tsx` | Se va el conmutador y el cuerpo de la vista; entra la ventana |
| `components/personal/altaDesdeDirectorio.spec.tsx` | **Nuevo.** 8 pruebas del recorrido entre las dos ventanas |

**Deja de ser una tabla y pasa a ser una lista**, porque el ancho máximo de `MarcoModal` es
`max-w-2xl` y las siete columnas ahí solo caben con desplazamiento horizontal. **No se
pierde ningún dato**: correo, dependencia, roles y tipo de inspector bajan al renglón
secundario de cada persona.

**Ningún cambio de base de datos, de migración ni de permisos.** El endpoint sigue siendo
`@Roles(ADMINISTRADOR)`.

---

## 0.5.4 · 24 de agosto de 2026 · **el formulario que no habilita vehículo lo dice**

En P-01 la columna «Conductor» de un operativo de **1 · FIJOS** mostraba **«—»**. No era
un hueco de datos: era el sistema funcionando. `alertasDeTransporte` no emite ninguna
alerta sobre un formulario `NO_APLICA` —y hace bien, porque **nadie podría resolverla**—,
así que la celda no tenía nada que pintar. El problema es que «—» y «todavía no asignado»
se leen igual.

| Columna | FIJOS · LIMPIA · CBQ (`NO_APLICA`) | Los otros seis |
|---|---|---|
| Conductor | **«Propios medios»** | la alerta ALV-02 / ALV-04, como siempre |
| **Vehículo** *(nueva en P-01)* | **«No se activa»** | la alerta ALV-03 |

Las dos se pintan como `badge badge-ghost badge-sm`: no son un nombre ni una placa
—`Operativo` no los trae—, son una condición que deriva del formulario, igual que los
campos calculados de la regla 5.

### Qué se tocó

| Archivo | Qué |
|---|---|
| backend · `operativo.dto.ts` | `politicaVehiculo` viaja en el bloque `formulario` de la respuesta. **Es todo el cambio del servidor**: dos líneas, ningún dato, ninguna migración |
| `interfaces/Operativo.ts` | El campo, con su motivo |
| `utils/listadoOperativos.util.ts` | `operaPorPropiosMedios`, la columna `vehiculo` y el texto de las dos |
| `components/cuadro/TablaOperativos.tsx` | La columna nueva se alerta contra `placa` |
| `components/cuadro/misOperativos.spec.tsx` | Cuatro pruebas, comprobadas degradando el código |

**El dato almacenado sigue diciendo `PENDIENTE`,** y eso se decide aparte. La pantalla
resuelve por **la política del formulario**, no por `estadoTransporte`, precisamente
porque ese estado no puede cambiar: la bandeja de la DAF excluye los `NO_APLICA` y
`PATCH /transporte/operativos/:id` los rechaza con 409. La consecuencia visible es que en
**P-02** un operativo de FIJOS dirá «Propios medios» en Conductor y «Pendiente» en
Estado. Se cierra fijando el estado en el servidor al registrar; está analizado y
pendiente de decisión.

### Dos cosas que aparecieron al medir

**1 · El `as Operativo` de dos fixtures tapaba campos que faltaban.** `misOperativos` no
declaraba `esAdicional`, `origen` ni `adicionales` —los tres del operativo adicional— y el
compilador callaba. Se retiró la conversión en las dos, que es lo que ya exige la cabecera
de `registro.spec.tsx`.

**2 · Un operativo nocturno de 9 · CBQ deja la jornada sin poder cerrarse.** Ver PV-04.

---

## 0.5.3 · 24 de agosto de 2026 · **P-01 solo muestra los formularios que el rol registra**

Solo interfaz. **Ningún endpoint, ningún contrato, ninguna migración, ningún permiso.**

El selector de P-01 pintaba los nueve formularios y **deshabilitaba** los que el rol no
puede escribir. Se cambió a petición expresa: ahora **no se pintan**.

| | Antes | Ahora |
|---|---|---|
| `ESCRITURA` | botón activo | igual |
| `COMPARTIDO` | deshabilitado, con «Solo personal» | **no se pinta** |
| `LECTURA` | deshabilitado, con «Solo personal» —que era falso— | **no se pinta** |
| Sin ninguno escribible | fila de botones apagados | «Su perfil no registra operativos en ningún formulario del cuadro» |

**Quién veía los botones apagados.** No cualquiera: un rol puramente departamental **ya
recibía solo los suyos** del servidor. Los nueve llegan a `ADMINISTRADOR` y `DIRECTOR`, y
como `user.rolCodes` es plural desde el 19-AGO, una cuenta con rol transversal **y**
departamental los recibía todos y veía ocho apagados. Ése era el caso real.

**De paso se corrige un texto falso:** el distintivo «Solo personal» se pintaba sobre
cualquier formulario no escribible, incluidos los de `LECTURA`, donde ese departamento no
aporta a nadie.

**Va contra el criterio anterior, y queda registrado.** PER-06 y la resolución de PV-37
—en el selector de personal— dicen lo contrario: mostrar con el motivo en lugar de
esconder. Se decidió a sabiendas. **Las tres pruebas que fijaban el criterio anterior se
reescribieron, no se borraron**, y su cabecera cuenta que un día decía lo contrario.
Anotado como **PV-40**, pendiente de ratificar con el Product Owner: lo único que
desaparece con contenido es la constancia del cupo del DMIT en el formulario 6, y se
comprobó que **ese cupo no tiene hoy ninguna vía en la interfaz**.

**La seguridad no se toca.** `FormularioRolGuard` rechaza con 403
`FORMULARIO_NO_AUTORIZADO` contra la base de datos: ocultar un botón no relaja nada
porque el servidor nunca confió en la pantalla.

---

## 0.5.2 · 24 de agosto de 2026 · **los puntos de encuentro se leen por zonal**

Solo interfaz, y solo P-08. **Ningún endpoint, ningún contrato, ninguna migración.**

Los puntos se listaban en plano, con una columna «Zonal» que repetía el mismo nombre en
cada fila. El formulario 7 tiene **34 puntos repartidos en 10 zonales**: para responder
«¿qué ofrece Quitumbe?» había que leer las 34 filas, y la pantalla entera —tres catálogos
apilados— pasaba de los tres metros de desplazamiento.

| | Antes | Ahora |
|---|---|---|
| Presentación | una tabla plana, columna «Zonal» repetida | **una tarjeta por zonal**, el nombre dicho una vez |
| Búsqueda | ninguna | **por punto o por zonal**, sin tildes ni mayúsculas |
| Zonal sin puntos | **no aparecía en ninguna parte** | se nombra al pie, y desde ahí se le agrega el primero |
| Punto con zonal desconocida | se veía con un «—» | agrupado en «Sin zonal reconocida» |

**Lo que esto arregla no es solo la lectura.** P-08 existe para cargar a mano la matriz
zonal ↔ punto que nunca se entregó (PV-01), y **la zonal vacía era invisible**: no producía
ningún error, simplemente no ofrecía nada en la cascada de P-01 el día del registro. Ahora
es lo primero que se ve al pie del panel, con palabras.

### Archivos

| Archivo | Qué |
|---|---|
| `components/catalogos/PanelPuntosEncuentro.tsx` | **Nuevo.** Agrupación, buscador y cobertura por zonal |
| `components/catalogos/PanelCatalogo.tsx` | **Nuevo.** El marco y la cabecera que los tres catálogos siguen compartiendo, para que la división no traiga de vuelta D-01 |
| `components/catalogos/TablaCatalogo.tsx` | Deja de servir a los puntos; sigue sirviendo a tipos de control e instituciones |
| `pages/AdminCatalogosCuadroPage.tsx` | Usa el panel nuevo; el aviso de RF-058 baja de tres líneas a una |
| `components/catalogos/puntosEncuentro.spec.tsx` | **Nuevo.** 16 pruebas, comprobadas degradando el código |

`docs/FASE5-diseno-interfaz.md` §2.2 suma las dos composiciones que la tabla no recogía —la
rejilla de tarjetas y la tarjeta—, que ya existían en P-06 desde M-26.

---

## 0.5.1 · 21 de agosto de 2026 · **la jornada propuesta es la del día siguiente**

**No es una regla nueva: es RN-01**, «El Cuadro de Colores es diario y se elabora el día
anterior al de ejecución», declarada además como supuesto expreso del Product Owner
(`FASE2` §2.3, SUP-01). Lo que faltaba era aplicarla donde no se aplicó.

`utils/jornada.util.ts` existe desde el 11-AGO con `fechaDeJornadaPorDefecto()`, y **solo
dos pantallas la usaban**: P-01 y P-03. P-02, P-04 y P-05 seguían calculando la fecha de hoy.

### El defecto que esto cierra

**Lo que se registraba en P-01 no aparecía en P-02.** P-01 proponía mañana, P-02 listaba
hoy: el listado salía vacío, y un listado vacío después de guardar se lee como un fallo de
guardado, no como otro día.

| Pantalla | Antes | Ahora |
|---|---|---|
| P-01 Registro · P-03 Transporte | mañana | sin cambio |
| **P-02 Mis operativos** | hoy | **mañana** |
| **P-04 Matriz** | hoy | **mañana** |
| **P-05 Órdenes** | hoy | **mañana** |
| P-07 Personal | hoy | **hoy**: no es una jornada, es la vigencia de una ausencia |

### P-05 también, y con una consecuencia que conviene conocer

Emitir órdenes es el final del mismo flujo: la Dirección consolida la matriz de la jornada
siguiente, cierra el cuadro y **emite las órdenes de esa misma jornada**. Proponer hoy
dejaba delante un cuadro ya ejecutado, sobre el que no hay nada que emitir.

**El adicional de urgencia es el caso que no encaja.** De esta misma pantalla lo dispone la
Dirección, y RN-62 dice que se dispone «el mismo día en que se ejecuta». El adicional entra
siempre en la jornada de su operativo padre, no en la que muestre el selector: **para
disponer uno hay que retroceder un día** y elegir el operativo de hoy.

Se decidió así a sabiendas, el 21-AGO-2026, y está escrito en el código y en las pruebas. Si
la urgencia se vuelve frecuente, lo que corresponde no es mover este valor por defecto sino
dar al adicional su propia vía, con su propia fecha.

De paso se corrigió el texto emergente del botón «Adicional» de P-02, que decía «para hoy».
El adicional va **siempre a la jornada de su padre**, no a hoy, y eso deja de ser lo mismo
en cuanto la pantalla abre en otro día.

### Lo que NO se tocó

**El servidor.** `cuadro-diario.service.ts` solo prohíbe el pasado, y esa holgura hace
falta: en la base hay un cuadro del **lunes 24 creado el viernes 21**. La AMC arma el lunes
desde el viernes, y RN-01 —que dice «el día anterior»— no cubre el fin de semana. Es una
propuesta, no una imposición; el selector sigue admitiendo cualquier fecha.

Ninguna migración, ningún cambio de contrato, ningún cambio de permisos.

### Verificación

**362 pruebas de interfaz**, siete nuevas: dos por cada una de las tres pantallas que
cambian, más la del fin de mes. Cada pantalla se comprobó **degradándola por separado** —
retrasando un día su fecha propuesta— y confirmando que caen sus dos pruebas y solo esas.

---

## 0.5.0 · 21 de agosto de 2026 · **P-07 · el personal sale de Auth central**

**Dejar de teclear el maestro.** `t_funcionario` tenía **una ficha**, cargada a mano, y PV-02
—«base de personal certificada»— es uno de los bloqueantes del negocio: sin maestro no hay a
quién convocar, el selector de P-01 sale vacío y las reglas de descanso no tienen sobre qué
decidir. La institución ya tenía esos datos en Auth central.

Se resolvió como P-12: **traer lo que otro sistema ya tiene** en lugar de capturarlo.

### Lo que Auth sí sabe, y lo que no

Leído del código fuente de Auth, no supuesto. `GET /users` devuelve cédula, nombre, usuario,
correo, dependencia, roles ya formateados por subsistema, `active` y —mejor de lo esperado— una
entidad `inspector` con zonal, código y **tipo** `IG`/`IT`/`IS`/`IC`.

**No devuelve el tipo de contrato.** Ni nombramiento, ni ocasional, ni vinculación: no existe en
Auth. Es justo el dato del que dependen RN-26 y RN-33 —quién puede salir de noche y en fin de
semana—, así que **se sigue capturando en P-07** al crear cada ficha. Tampoco sabe el área, el
cargo ni el teléfono.

### Decisiones

| | |
|---|---|
| **El backend conserva el token de Auth** dentro de su token de sesión | Es la única vía: **Auth no tiene token de servicio ni clave de API**. Es un cambio de postura de seguridad y está registrado como riesgo aceptado en `17_KNOWN_ISSUES.md`, B-01 |
| **Auth propone, la ficha se completa aquí** | P-07 lista a los activos de Auth y marca quién no tiene ficha. `t_funcionario` sigue siendo el maestro del que cuelgan asignaciones, ausencias, historial y órdenes |
| **Dos vistas, y el título dice cuál se mira** | «Maestro» es lo de siempre y **no se tocó**: si Auth cae, P-07 sigue administrándose. «Directorio de Auth» se abre por defecto cuando el maestro está vacío |
| «Sin ficha: **no puede ser convocado**», con palabras | La ausencia de ficha no produce ningún error hasta el día en que alguien busca a esa persona en P-01 y no está. Regla 6, y aquí es lo único que la fila viene a decir |
| El nombre se parte **y se deja editable** | Auth lo guarda en un solo campo; la partición —dos primeras palabras, apellidos— falla con «DE LA TORRE PEREZ JUAN». El formulario avisa y quien da de alta lo confirma mirándolo |
| **Ninguna migración, ningún cambio de base** | Correo, dependencia, roles e inspector se muestran en vivo. Copiarlos a `t_funcionario` crearía dos versiones del mismo dato, y hoy ninguno decide nada |

### Sin cédula en Auth no hay alta

La cédula es la **única llave común** entre la cuenta y la ficha. Quien no la tenga en Auth sale
en la lista, pero el botón de crear ficha queda apagado con el motivo escrito: se corrige en
Auth, no aquí.

### Dos cosas que se reportan y no se tocaron

- **`GET /users` de Auth no comprueba rol.** Cualquier sesión válida de cualquier subsistema
  lista al personal completo con cédula y correo. No es nuestro; nuestro endpoint exige
  `ADMINISTRADOR`.
- **Una hipótesis que puede cerrar PV-27.** Los tipos de inspector de Auth —`IG`, `IT`, `IS`,
  `IC`— coinciden con los prefijos de formulario que PV-27 lleva bloqueando desde M-14. Si el
  Product Owner lo confirma, el criterio se lee de `inspector.tipoInspector`. **No se
  implementó**: es una decisión de negocio con su propio dueño.

### Dos defectos que solo aparecieron contra el Auth real

**Los dos se corrigieron el mismo día, y ninguna prueba los habría atrapado.**

**1 · El token iba sin el prefijo `Bearer`.** Se copió la forma del otro módulo del
ecosistema que consume `/users`, sin caer en que aquél reenvía la cabecera entera del
navegador y por eso ya lo trae. Contra el Auth desplegado:

```
sin cabecera        → 500 «Token no encontrado»
Authorization: xxx  → 500 «Token no encontrado»    ← INDISTINGUIBLE
Bearer xxx          → 500 «Token incorrecto o expirado»
```

Un token pelado **no da un error de autenticación: da el mismo error que no enviar nada**,
y el diagnóstico apuntaba a la sesión del administrador.

**2 · El mensaje redactado no llegaba a la pantalla.** `AuthNoDisponibleError` extendía
`Error` a secas, así que el filtro global lo trataba como fallo no controlado: `500` con el
texto genérico —«No se pudo completar la operación»— y el motivo, que dice **qué hacer**, se
quedaba en la bitácora. Es la **regla 7** incumplida sin que nada lo notara: todas las
pruebas del cliente comprobaban el texto del error, ninguna comprobaba que llegara a
mostrarse.

Ahora es un `ApplicationError` **503** con el código **`AUTH_NO_DISPONIBLE`** —el
decimonoveno, y el primero que habla de una dependencia y no del negocio— y arrastra el
texto que da Auth, que es lo que distingue una sesión caducada de un token que no llegó.

### Verificación

`GET /administracion/directorio` responde `401` sin sesión, y **carga contra el Auth real**.
Backend: **820** pruebas unitarias y **283** de integración. Interfaz: **343**. Las pruebas
nuevas se comprobaron **degradando el código** —borrando el texto «Sin ficha», dejando la
sigla del inspector sola y quitando la precarga de apellidos— y confirmando que caen las
tres. El cliente de Auth ganó su propio archivo de pruebas, `auth-usuarios.client.spec.ts`,
que **mira la cabecera que se envía** y no solo el resultado.

---

## 0.4.0 · 20 de agosto de 2026 · **P-12 · conductores y vehículos**

**Una pantalla sobre una API que ya estaba.** Los ocho endpoints de
`/administracion/conductores` y `/administracion/vehiculos` existían desde M-17, con `@Roles(
ADMINISTRADOR)`, auditoría y cobertura de integración. Lo que no existía era forma de usarlos
salvo `curl`: era la limitación **L-11**, y el manual del administrador lo decía con todas las
letras —«se administran por API. **No hay pantalla**: el plan no la contempla»—.

### La contradicción que lo motivó

`FASE2` §9 declara **RF-056, de prioridad Alta**: «el sistema debe permitir administrar conductores
y vehículos». La documentación de entrega decía que no había pantalla porque el plan no la
contemplaba. Un requisito Alta declarado fuera de alcance.

La consecuencia era medible: **0 conductores y 0 vehículos en la base** —el bloqueante **PV-03**—,
es decir que la DAF no podía asignar transporte a ningún operativo. Esta pantalla no carga los
datos, que los tiene la DAF; **desbloquea que se puedan cargar**.

### Decisiones

| | |
|---|---|
| **Una pantalla, dos paneles**, y los vehículos arriba | No se puede asignar vehículo habitual a un conductor si el vehículo no existe. El orden de carga es parte de la pantalla, no una nota al pie |
| El vehículo habitual **se señala cuando falta** | De él sale la placa que P-03 propone, y es la única vía por la que la DAF conoce un vehículo (PV-33). Dejarlo vacío no da error al guardar: falla el día del operativo |
| **Sin botón «Reactivar»** | `ActualizarConductorDto` y `ActualizarVehiculoDto` no admiten `activo`, a diferencia del contrato de personal. Ofrecerlo daría `400`. La confirmación de baja **advierte que no se deshace** |
| Filtrado **en memoria** | Los dos endpoints admiten un solo parámetro, `incluirInactivos`. Repartir filtros entre servidor y memoria daría dos comportamientos en la misma barra |

### Dos defectos de documentación corregidos

- **`06_Manual_API.md` §11 decía `usosHistoricos`**; la flota devuelve `operativosHistoricos`. Ese
  nombre es el de los catálogos. Se detectó al escribir el servicio contra el contrato documentado.
- El manual del administrador enumeraba **cuatro** ámbitos administrables; son **siete**.

### Uno reportado y no corregido

`FormikField` pinta la etiqueta en un `<label>` **hermano** del control, sin `htmlFor`, así que
ninguna etiqueta de formulario está asociada a su campo. Es un defecto de accesibilidad **común a
todos los formularios del sistema** y anterior a este cambio; corregirlo tocaría todas las
pantallas y merece su propia decisión.

### Qué apareció

| Repositorio | Qué |
|---|---|
| `transporte-backend` | **Nada.** Cero líneas |
| `transporte-frontend` | `AdminFlotaPage`, `TablaConductores`, `TablaVehiculos`, `ModalConductor`, `ModalVehiculo`, `flota.service.ts`, `interfaces/Flota.ts`, filtros en `flota.util.ts`, dos esquemas Yup, ruta y menú |

### Verificación

`npm test` (**323**, +22), `npm run lint` y `npm run build` con salida 0. Las pruebas nuevas se
comprobaron degradando el código —quitando el filtro de conductores activos en el recuento por
vehículo— y confirmando que caen.

---

## 0.3.0 · 20 de agosto de 2026 · **el operativo adicional del día**

**Una salida que no estaba en el cuadro y hay que hacer hoy.** A pedido de la operación sobre el
formulario PMO: un operativo **adicional** se dispone por urgencia el mismo día en que se ejecuta,
colgando de otro ya planificado.

### Por qué importa más de lo que parece

Es **la única escritura del sistema que funciona con la ventana de carga cerrada**. Todo lo demás
—registrar, editar, retirar, asignar transporte— exige que la ventana del departamento esté abierta,
y esa ventana es lo que sostiene que el cuadro esté armado antes de la jornada. Un adicional, por
definición, llega tarde: exigírsela lo haría imposible justo cuando hace falta.

**La excepción está acotada, y se acotó a propósito:**

| | |
|---|---|
| Vive en un **controlador aparte** que no declara `VentanaCargaGuard` | Se descartó un decorador `@SinVentanaDeCarga()`: un mecanismo general de exención acabaría puesto en un segundo endpoint, y la ventana dejaría de ser una garantía. Eximir a otro debe seguir costando crear otro controlador |
| Identidad, rol y **propiedad del formulario** se comprueban igual | La excepción es **solo horaria** |
| El **cuadro cerrado sí bloquea** (RN-63) | Reabrirlo es potestad de la Dirección y deja su propia traza. Es quien debe conocer lo que se sale de lo que ya aprobó |
| **Auditada**, no meramente permitida (RN-62) | La ventana se evalúa igual, no bloquea, y su veredicto se escribe: `cerrada (cerró a las 14H50) · adicional creado como excepción`. Sin eso, uno creado a las diez de la mañana sería indistinguible de uno creado a las once de la noche |
| **No se encadena** (RN-64) | Un adicional no admite adicionales, y un operativo con adicionales vigentes no se retira |

### Numeración propia

`OCAPMO-001` frente a `OCPMO-001`: prefijo distinto y **serie aparte**. El primer adicional del día
es el `001` aunque el formulario lleve seis operativos ordinarios (RN-61). Qué prefijo nombra a los
adicionales lo **declara la fila** —`fpre_es_adicional`—, no una convención sobre el texto: la A de
`OCAPMO` significa «adicional», pero la I de `IG` e `IT` significa el área del personal, y una regla
que acierta por casualidad en un caso y falla en el otro no es una regla.

### Un defecto que cayó de paso

**El PMO no podía registrar ningún operativo.** Tenía dos prefijos configurados y ninguno marcado
como predeterminado, así que la generación del identificador se detenía (PV-27). Al declarar
`OCAPMO` como el de adicionales, `OCPMO` quedó inequívocamente como el ordinario.

> **PV-27 sigue abierto para los formularios 5, 6, 7 y 8.** Allí los dos prefijos designan **áreas
> del personal** —`IG` frente a `IT`— y ese criterio sigue sin fuente; además no podría aplicarse
> todavía, porque el personal se asigna después de que el identificador ya esté impreso. Hay una
> prueba que lo afirma, para que nadie dé el pendiente por cerrado.

### Qué cambió

| Repositorio | Qué apareció |
|---|---|
| `transporte-backend` | Migraciones `…_adicional_del_dia_sobre_un_operativo` y `…_prefijo_que_nombra_al_adicional`; `AdicionalesController`; `OperativosService.registrarAdicional`; dos códigos de error nuevos |
| `transporte-backend` | `uq_operativo_cuad_form_sec` **partido en dos únicos parciales**, y `verificar-objetos.ts` vigilando los once |
| `transporte-frontend` | Acción «Adicional» en P-02, `PanelAdicionalOperativo`, y la fila que dice **con palabras** de qué operativo nació cada adicional |

### Verificación

`npm test`, `npm run lint` y `npm run build` en los dos repositorios, con código de salida 0.
Las pruebas nuevas se comprobaron **degradando el código a propósito** —anulando la serie separada
del secuencial y unificando las dos varas de bloqueo en la pantalla— y confirmando que caen.

---

## 0.2.0 · del 17 al 19 de agosto de 2026 · **ingreso con Auth central**

**Cae el último bloqueante de software.** B-01 —no había identidad real— era el único motivo por el
que el sistema no podía ir a producción. Ya no está.

### Lo que se construyó

**Patrón: cookie `HttpOnly`, como CORE.** El JWT **no llega nunca al navegador**: lo canjea el
backend contra `GET /auth/exchange` de Auth central y lo guarda en su propia cookie, que el
JavaScript de la aplicación no puede leer.

| Repositorio | Qué apareció |
|---|---|
| Backend | Submódulo `src/modules/identidad/` con `POST /auth/session/exchange`, `GET /auth/session` y `POST /auth/session/logout`; `common/auth/token-sesion.ts`; el modo cookie de `IdentidadGuard` |
| Frontend | `AuthCallbackPage`, `RutaConSesion`, `services/sesion.service.ts`; `LoginPage` deja de ser formulario y pasa a redirigir al portal |
| Base de datos | Dos migraciones: `FUNCIONARIO` en `RolDepartamental`, e índice **único** sobre `usua_identificador_ad` |

**El reparto que lo sostiene: Auth central dice QUIÉN es; el Cuadro de Colores decide QUÉ ROL
tiene**, resolviendo el `username` contra `t_usuario.usua_identificador_ad`. No es una preferencia
de diseño: **el canje del Auth desplegado no transmite el rol elegido**. La columna ya existía, así
que la integración no obligó a inventar traducción de permisos.

### Lo que se retiró

`usuarios-prueba.ts`, `MODO_IDENTIDAD_PROVISIONAL` y la cabecera `x-usuario-prueba` del backend;
`config/usuariosPrueba.ts`, `api/identidadProvisional.ts` y `components/navbar/SelectorRolPruebas.tsx`
del frontend. **Ya no hay más de una forma de autenticarse.**

Mientras existieron, **con el modo encendido cualquiera podía declararse `DIRECTOR`** enviando un
número y ver la matriz consolidada entera.

Con ellos se fue también el rol como número: `rolUser` guarda ahora los valores del enumerado del
servidor —`"DAF"`, `"DIRECTOR"`…— porque aquellos códigos del 1 al 7 existían solo para la cabecera.

### Los tres defectos que solo aparecieron en un navegador

Se descubrieron **después** de dar la integración por probada:

| Defecto | Alcance real |
|---|---|
| `crypto.randomUUID` solo existe en **contexto seguro** | Corre en el interceptor de **cada** petición: por HTTP en una IP **caía la aplicación entera** |
| Había que pulsar el rol **dos veces** | `user` y `estado` se movían por separado; la guarda decide con `estado` |
| 409 al registrar la ruta en Auth | El puerto 5176 lo tenía «Admin Core». El frontend pasó al **5180**, con `strictPort: true` |

**Ninguno era visible desde la línea de comandos.** `curl` no ejecuta JavaScript, no mantiene estado
entre páginas y no distingue contexto seguro. Los tres están corregidos y los dos primeros llevan
prueba de regresión —comprobada degradando el código y viendo que falla—.

### Un defecto de seguridad silencioso, corregido de paso

`x-correlation-id` se enviaba pero **el navegador lo ocultaba al JavaScript** en peticiones de otro
origen: faltaba `exposedHeaders` en el CORS. La trazabilidad de soporte no funcionaba y nada lo
delataba.

### Lo que queda abierto, y **no es nuestro**

- El rol **`Transporte - Funcionario`** no existe en Auth: **P-06 sigue inaccesible**.
- El canje no devuelve `roles` y el token no lleva `subsystemId`: no se puede comprobar que un
  código se emitió **para este módulo** y no para otro de SIGOC.
- El secreto es **HS256 compartido por todo el ecosistema**: cualquier módulo integrado puede firmar
  tokens válidos para los demás. Conviene plantear RS256 antes de producción.

### Y una corrección de diagnóstico que conviene no repetir

Durante tres intentos se sostuvo que el bloqueo era la columna `subsystems.path` de SIGOC, vacía.
**Era falso**, y salió de leer el repositorio de Auth en vez del paquete que su servidor sirve: el
portal resuelve el destino desde `permissions` y **compone `/auth/callback` por su cuenta**.

> **Para un servicio desplegado, el repositorio es una hipótesis.** La fuente de verdad es lo que
> ese servidor responde y sirve.

---

## Del 11 al 13 de agosto de 2026 · tres jornadas de uso real

Todo lo que sigue salió de **usar el sistema desplegado**, no de revisarlo. Ninguno de estos
defectos lo habrían encontrado las pruebas: los tres primeros exigían datos reales en la base.

### Un pendiente del análisis, resuelto

**PV-37 · La lista de personal explica por qué alguien no puede salir.** `GET /personal/elegible`
devuelve **todos** los candidatos del formulario con `elegible` y el `motivo` redactado, en lugar de
esconder a quien no puede. Era la quinta prioridad de `17_KNOWN_ISSUES.md` y la incidencia que más
llamadas iba a generar en la capacitación.

Con una excepción deliberada: **una ausencia dice que la hay, nunca cuál es.** No se publica un
reposo médico ni una calamidad doméstica. Queda como **PV-38** para que el Product Owner lo
ratifique.

### Una regla de negocio nueva

**La jornada se abre sola con el primer operativo del día.** Antes la abría el administrador por
API —no había pantalla— y hasta entonces los tres departamentos no podían registrar nada. Esa
precondición **no venía del negocio**: `FASE2` §5.3 la declara disparador del registro pero no
define ningún proceso ni actor que la ejecute.

Decisión de desarrollo del 11-AGO, pendiente de ratificación. Se abre para hoy o cualquier fecha
futura, nunca para una pasada.

### Tres defectos que solo el uso destapa

| Qué pasaba | Causa |
|---|---|
| El registro pedía **la jornada equivocada** | P-01 y P-03 fijaban la fecha de HOY, y el cuadro es **del día siguiente**. Pedían una jornada que nadie abre |
| **Cinco campos detenían el envío sin decir por qué** | `SelectorZonalPunto` pintaba el asterisco de obligatorio y no renderizaba el error. Formik bloqueaba, la petición no salía del navegador y en pantalla no cambiaba nada |
| Un operativo quedaba **creado y vacío** | El personal se asignaba después de crear, una petición por persona. Al rechazarse alguien, el operativo ya existía |

El tercero se corrigió a fondo: **`personalIds` viaja con el registro y todo se guarda en una sola
transacción.** Si alguien es rechazado no se crea nada, y lo capturado se conserva para corregir esa
persona. Invierte la decisión que el propio DTO razonaba —«qué hacer con las tres que pasan cuando
la cuarta no»—, porque el criterio anterior dejaba operativos vacíos en el cuadro.

Y una causa de fondo del primero: **la lista de personal se pedía sin el horario**, así que el
servidor solo podía descartar por área y ausencia. Ofrecía a gente ya ocupada y el cruce aparecía al
asignar, con el operativo creado.

### Una imprecisión del modelo, corregida en el modelo

**RN-20 es propiedad de cada catálogo, no del formulario.** `form_permite_captura_libre` se dividió
en `form_captura_libre_punto` y `form_captura_libre_tipo` — migración
`20260811120000_separa_la_captura_libre_por_catalogo`, la octava.

La columna única hacía que la interfaz ofreciera capturar a mano un punto de encuentro que **ningún
catálogo del insumo contempla**. Y el servidor no lo impedía: `ClasificacionControl` recibía la
bandera desde M-14 y `UbicacionOperativa` no, así que **aceptaba un punto libre en cualquiera de los
nueve formularios**. La interfaz lo tapaba; una petición directa entraba sin obstáculo.

La semilla dejó además de mantener una lista escrita a mano: lee la bandera **del propio insumo**.

### Interfaz

- La lista de personal **ya no parpadea** al elegir el horario: recarga silenciosa, uno de los
  estados obligatorios de FASE5 §8 que la pantalla no implementaba.
- `SelectorTokens` muestra su lista **siempre**, como el selector de personal, en lugar de
  desplegarla al enfocar.
- Los avisos de campo sin catálogo se ven **con el formato de los rechazos del servidor**.

### Entregable nuevo

**Colección de Postman** con los 64 endpoints y su entorno, en `transporte-backend/docs/postman/`.
Verificada contra el servicio en marcha.
| Período | 4 de agosto – 7 de agosto de 2026 |

---

## Bloque A · Cimientos

### M-01 · Base del proyecto
NestJS 11 con TypeScript estricto, `PrismaService` con enganches de apagado, prefijo `/api/v1`,
CORS por lista blanca y `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`.

### M-02 · Esquema de base de datos
**27 tablas, 11 enumerados, 24 restricciones `CHECK` y 7 índices parciales.** Detectó dos columnas
obligatorias sin valor en el insumo: `form_color_acento` y `form_es_patrulla` — origen de PV-25 y
PV-26, que bloquearon la siembra de los formularios durante todo el proyecto.

### M-03 · Semilla de catálogos
Idempotente por clave natural. **No inventa datos maestros**: imprime al terminar qué quedó sin
cargar y qué pendiente lo bloquea.

### M-04 · Núcleo transversal
Errores de dominio con dieciséis códigos, correlación por petición, registro estructurado en JSON y
auditoría que **se escribe dentro de la transacción**.

### M-05 · Cadena de autorización
`IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard`, con 401, 403, 403 y 423.
`FormularioRolGuard` consulta la base y **nunca confía en el cuerpo de la petición**.

---

## Bloque B · Configuración

### M-06 · Parámetros de política
Los ocho umbrales en base de datos, con tipo, rango y descripción. **Las políticas los leen; nunca
una constante literal.**

### M-07 · Formularios y catálogos
`GET /formularios/permitidos` filtrado por rol en el servidor. Detectó que el modelo no registraba
en qué formularios se ofrece `ADICIONALES`: migración `form_permite_captura_libre`.

### M-08 · Ventanas de carga
Seis ventanas, una por rol, con caché invalidada ante cualquier modificación. Sin `POST` ni
`DELETE`: **borrar una ventana abriría la carga las veinticuatro horas**.

---

## Bloque C · Talento operativo

### M-09 · Objetos de valor
`IdentificadorOperativo` y `RangoHorario`, con el cruce de medianoche resuelto en el dominio.

### M-10 · Personal y disponibilidad
Dos respuestas distintas para el mismo funcionario: la ficha completa solo para el
`ADMINISTRADOR`, y una selección **sin cédula ni teléfono** para quien arma el cuadro.

### M-11 · Historial de jornada
Proyección por persona y día sobre la que operan las reglas de descanso.

### M-12 · Políticas de descanso
Las cinco reglas que protegen a las personas, como **funciones puras**. Descubrió que dos
validaciones del conductor sí eran computables y las implementó.

---

## Bloque D · Jornada

### M-13 · Cuadro diario
Ciclo de vida con avance automático por ventanas. Corrigió que una ventana **inactiva** dejaba el
cuadro atrapado antes de `APROBADO` para siempre.

### M-14 · Operativos
Registro, edición y baja lógica con secuencial diario dentro de la transacción y reintento ante
colisión. Migración `oper_activo` (PV-10).

> **La baja cambió el 07-AGO**: hoy borra la fila si el operativo no tiene órdenes emitidas. Ver
> «Decisión · PV-10 pasa a baja física», más abajo. `oper_activo` sigue existiendo, y sirve para
> el caso en que sí las tiene.

### M-15 · Asignación de personal
Composición, cupo compartido y las seis alertas del cuadro.

### M-16 · Solicitud de apoyo
Registro y bandeja por rol. **Sin transiciones de estado** (PV-12).

---

## Bloque E · Logística

### M-17 · Asignación de transporte
**El módulo más acotado del sistema.** Endpoints propios, un DTO de exactamente dos propiedades y
escritura restringida en el repositorio.

### M-18 · Capacidad de flota
Compara demanda con lo declarado. **Nunca lanza excepción**: avisa.

---

## Bloque F · Documentos

### M-19 · Matriz consolidada
Exclusiva de la Dirección. PDF horizontal con `pdfkit`, elegido **porque trae sus propias fuentes**.

### M-20 · Órdenes de servicio
`DatoAislado` de cuatro campos, congelado y validado al leerlo. Migración `t_usuario.func_id`.

---

## Bloque G · Interfaz

### M-21 · Base del frontend
Interfaces, seis servicios, cuatro hooks, rutas con carga diferida y navegación por rol.
**Descubrió que el contenedor respondía 401 a toda petición**: `docker-compose.yml` forzaba
`MODO_IDENTIDAD_PROVISIONAL: "false"`, y las 278 pruebas de integración no podían detectarlo porque
corren contra la base local.

### M-22 · P-01 · Registro de operativo
Resolvió **D-01**: `FormikField` pasó de seis componentes casi idénticos a una envoltura más un
campo parametrizado, con 19 pruebas. **Incorporó Vitest + Testing Library**, que el frontend no
tenía.

### M-23 · P-02 · Mis operativos
Corrigió lo anticipado en M-22: **esta pantalla no usa `Table`**, porque aquel filtra contra el
servidor y `GET /operativos` solo admite `fecha` y `formulario`.

### M-24 · P-03 · Asignación de transporte
La pantalla que **dibuja una regla**. La prueba que la protege **cuenta** los controles habilitados.
Detectó **PV-33**: la DAF no puede listar la flota.

### M-25 · P-04 · Matriz consolidada
Una sola tabla con los banners como filas. **Dio a PV-25 una consecuencia visible** y lo resolvió
por cálculo de luminancia. La celda crítica pasó de `border` a `ring`, que no desalinea la fila.

### M-26 · P-05 y P-06 · Órdenes de servicio
Un solo componente pinta la orden, para que haya **un único sitio que vigilar**. La prueba del
aislamiento **afirma lo que no está**. Detectó **PV-34**.

### M-27 · P-07 · Personal y disponibilidad
Corrigió **dos desajustes de contrato** de M-21. Detectó **PV-35**.

### M-28 · P-08 · Catálogos del cuadro
**La pantalla que desbloquea PV-01.** Una tabla y un modal para los tres catálogos. Detectó
**PV-36**: desactivar es irreversible desde la interfaz.

### M-29 · P-09 · Ventanas y parámetros
**Cierra el bloque G.** La comprobación previa del rango **no duplica ninguna regla**: aplica la que
el servidor acaba de enviar. Se retiró el marcador `PantallaPendiente` de M-21.

---

## Bloque H · Cierre

### M-30 · Contenedores, despliegue e identidad real

**Etapa E11 completada; los siete casos se ejercitaron contra los contenedores en marcha.**

Corrigió tres fallos del despliegue:

1. **El frontend no se reconstruía**: `transporte-front` no declaraba `build:`.
2. **El nginx corría como root**: la imagen oficial solo baja los trabajadores.
3. **La imagen copiaba cuatro fuentes que nadie lee.**

Añadió `pg_stat_statements` y el `ANALYZE` tras la siembra.

**Corrigió el dato del logotipo**: el archivo existe, pero son **70 bytes de un PNG transparente de
1×1 con extensión `.jpeg`**.

**Etapa E12 no implementada**: el token de identidad no tiene contrato publicado.

---

## Fuera de plan · 7 de agosto de 2026

### Siembra de los nueve formularios · PV-26 y PV-25 resueltos

Un usuario reportó *«Su perfil no tiene formularios asignados en el cuadro»*. **No era un fallo**:
`t_formulario` estaba vacía porque la semilla se niega a inventar dos columnas obligatorias.

- **PV-26 · decidido por el Product Owner.** Son patrulla los formularios **4, 5, 6 y 9**. La
  decisión importaba: **el 9 es patrulla y no se llama así**, y el 4 lleva «Patrulla» en el nombre
  pero su personal no es la composición de RN-31. Deducirlo del nombre habría fallado en los dos
  sentidos.
- **PV-25 · resuelto por cálculo**, que era la opción 2 del propio pendiente: el acento es el color
  del texto sobre el banner, por luminancia WCAG. Los nueve dieron `#000000`.

Se sembraron además prefijos, áreas de personal y la delimitación de tipos e instituciones.

**La siembra rompió las 278 pruebas de integración y se corrigió**: `ck_formulario_numero` admite
del 1 al 9 y el catálogo institucional ocupa los nueve casilleros, así que las suites pasaron a
`transportedb_pruebas`.

### La orden de trabajo pasa a generarse · PV-28 resuelto

Al intentar abrir la primera jornada apareció el segundo dato que faltaba. **El Product Owner
resolvió PV-28: la orden de trabajo la genera el sistema, con el formato `AMC-AAAA-MM-DD`**, y su
único uso es exponer el día en la matriz consolidada.

Invierte lo que estaba implementado —hasta entonces era un dato de entrada obligatorio— y se aplicó
el mismo día:

- `CrearCuadroDto` quedó con **una sola propiedad, la fecha**. Se retiró `ordenTrabajo` del contrato
  **en lugar de dejarlo opcional**: enviarlo produce `400 CAMPOS_NO_PERMITIDOS`, y así no pueden
  convivir dos códigos para el mismo día.
- Se retiró la comprobación de orden duplicada y su método de repositorio: derivada de la fecha, que
  ya es única, **no podía ejecutarse nunca**.
- El código se compone en UTC, como el resto de las fechas de calendario: leerlo en local imprimiría
  el día anterior en Quito, y encabeza el documento que firma la Dirección.

Se agregaron tres pruebas —el formato, el borde de fin de año y el rechazo del campo— y se ajustó la
suite de integración, que aislaba sus filas por el prefijo de la orden y pasó a hacerlo por fecha.

---

## Corrección · Un operativo retirado seguía contando · 07-AGO

Detectado en uso: el sistema rechazaba asignar a una persona por solaparse con un operativo que el
propio usuario había eliminado.

**La causa.** La baja del operativo era **lógica** (PV-10, tal como estaba entonces) y
`t_asignacion_personal` **no se borra ni tiene columna de estado propia**: la única señal de que una
asignación ya no cuenta es `oper_activo`. Cuatro consultas leían operativos sin filtrarlo.

| Consulta | Qué provocaba |
|---|---|
| `asignacionesDelDia` | La persona quedaba **atrapada**: la retenía un operativo que ya no salía en ninguna pantalla. Afectaba a RN-28 (solapamiento) y RN-36 (jornada máxima) |
| `operativosConCondicionantePendiente` | Un nocturno retirado y sin transporte **impedía cerrar la jornada**, sin forma de resolverlo: la bandeja de la DAF sí filtra los retirados, así que el operativo que bloqueaba no aparecía donde se le podía asignar |
| `aportesDeLaJornada` | Consolidaba horas, patrullas y nocturnas de operativos retirados; como alimenta las reglas de descanso de los días siguientes, **el error se arrastraba** |
| `ultimaPatrullaDeConductor` | Dejaba al conductor en descanso por una patrulla que no condujo |

`conduccionesDelDia` —el equivalente para conductores, escrito en M-17— **sí lo filtraba**, y lo
documentaba: *«Los retirados no cuentan»*. Misma regla, dos implementaciones, una correcta.

Se agregó una prueba de integración que retira el operativo y comprueba que su personal queda libre
en las dos reglas que leen esa consulta.

> **Estas cuatro correcciones siguen siendo necesarias después del cambio de PV-10**, que ocurrió
> más tarde el mismo día. La baja pasó a borrar la fila, pero **solo cuando no hay órdenes
> emitidas**; cuando las hay se conserva desactivada, y entonces vuelve a ser `oper_activo` la
> única señal de que su personal quedó libre.

---

## Decisión · PV-10 pasa a baja física · 07-AGO

El Product Owner resolvió el pendiente: **retirar un operativo borra la fila**, y el número
**se reutiliza**, para que la numeración del día no deje huecos.

| Situación | Qué ocurre |
|---|---|
| Sin órdenes emitidas | La fila se borra. Caen con ella personal, zonales, instituciones y solicitudes de apoyo (`CASCADE`). El secuencial vuelve a quedar libre |
| Con órdenes emitidas | Se conserva desactivada. `fk_orden_operativo` es `RESTRICT`: la base lo impone, y una orden ya comunicada no puede quedarse sin origen |

**Consecuencias aceptadas y documentadas**, no descubiertas después:

- La auditoría **sobrevive sin enlace** (`fk_auditoria_operativo` es `SET NULL`). Por eso el
  asiento de la baja nombra el identificador en `valorAnterior`: es lo único que la deja legible.
  El esquema ya lo había previsto — *«si al eliminar un operativo se borrara su traza,
  desaparecería justamente la evidencia de que existió y de quién lo eliminó»*.
- **Un mismo código puede corresponder a dos operativos distintos** a lo largo del día, si el
  primero se eliminó antes de emitir nada. Es el precio de no dejar huecos, y se pagó a sabiendas.

La respuesta lleva `eliminado` y `ordenesEmitidas` para que P-02 diga cuál de las dos ocurrió: «se
eliminó, su número queda libre» y «se retiró, pero se conserva porque ya tiene órdenes» no son la
misma noticia. La confirmación previa **advierte que el borrado no se deshace**.

Se reescribieron —no se ampliaron— las cinco pruebas que afirmaban la regla anterior, y se
agregaron cuatro: el borrado con su cascada, la reutilización del número, la conservación con orden
emitida y el conflicto de versión en las dos ramas. **678 unitarias · 282 de integración.**

> Al escribir la prueba de la orden emitida apareció un defecto del propio banco de pruebas: la
> limpieza de la suite de operativos corría **antes** de restituir las ventanas de carga y sin
> protección, así que un fallo suyo dejaba las ventanas desactivadas en `transportedb_pruebas` y
> **hacía fallar a la suite de ventanas sin que nadie la hubiera tocado**. La restitución pasó a un
> `finally`.

---

## Interfaz · El campo de instituciones deja de ser un `<select multiple>` · 07-AGO

Reportado en uso: el control renderizaba mal y los nombres largos se partían dentro de una caja
de 6 rem. Se sustituyó por **`components/forms/SelectorTokens.tsx`**, un `combobox` propio —sin
librerías nuevas— con etiquetas removibles.

| Antes | Ahora |
|---|---|
| `<select multiple>` de 6 rem | Campo de texto con etiquetas y lista flotante |
| Ctrl+clic para varias | Enter, flechas, Esc y Retroceso |
| Sin filtro | Filtra por sigla y nombre, **sin distinguir tildes** |
| Lo elegido, solo resaltado | Etiquetas con aspa, y resumen «AMC, CACMQ +3» desde la quinta |

**El resumen se puede abrir.** Colapsado y fijo, quitar la cuarta de seis exigiría vaciar el
campo: escondería justamente el aspa que hace falta para corregirse.

Lo que **no** cambió: el valor sigue siendo `institucionesIds: number[]`, VAL-09 sigue exigiendo
al menos una, y el mismo componente sirve a P-01 y a P-02, porque `PanelEdicionOperativo` reutiliza
`FormularioOperativo`.

Dos cosas se arreglaron de paso, ambas visibles con los datos reales:

- La función `normalizar` —comparar sin tildes— estaba **duplicada** en `listadoOperativos.util` y
  `personal.util`. Al hacer falta la tercera copia se extrajo a `utils/texto.util.ts`.
- En la semilla varias instituciones traen `sigla` y `nombre` iguales. La lista imprimía
  «AMC · AMC»; ahora, cuando coinciden, se escribe una sola vez.

**17 pruebas nuevas** —filtro, teclado, resumen, estado deshabilitado y atributos ARIA—: 215 de
interfaz.

---

## Migraciones

| Fecha | Migración | Motivo |
|---|---|---|
| 05-AGO | `esquema_inicial` | Las 27 tablas |
| 05-AGO | `agrega_restricciones_verificacion` | Las 24 `CHECK` |
| 05-AGO | `agrega_indices_parciales` | Los 7 índices |
| 05-AGO | `agrega_valor_por_defecto_a_marcas_de_actualizacion` | Corrección de `updatedAt` |
| 05-AGO | `agrega_captura_libre_al_formulario` | RN-20 (M-07) |
| 06-AGO | `agrega_baja_logica_al_operativo` | PV-10 (M-14) |
| 06-AGO | `enlaza_usuario_con_funcionario` | Órdenes propias (M-20) |

---

## Pendientes de validación

**36 registrados. Dos resueltos el 7 de agosto de 2026** (PV-25 y PV-26).

**Seis surgieron de la implementación, no del análisis** —PV-31 a PV-36—: son huecos del contrato
que solo se ven al consumirlo.

---

## Estado final

| Aspecto | Estado |
|---|---|
| Código | ✅ Los 30 módulos |
| Pruebas | ✅ 1149, todas en verde |
| Contenedores | ✅ Los tres verificados en marcha |
| Documentación | ✅ 19 documentos en `docs/final` |
| **Identidad real** | ❌ **Depende de un tercero** |
| **Datos maestros** | ❌ **PV-01, PV-02, PV-03** |
| **Puesta en producción** | ❌ **No es posible todavía** |

> **Ninguna de las dos cosas que faltan es código.**
