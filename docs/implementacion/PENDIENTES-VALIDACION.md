# REGISTRO DE PENDIENTES DE VALIDACIÓN
## Módulo Transportes / Cuadro de Colores Operativo — AMC

Documento de trabajo para la sesión con el Product Owner. Cada punto indica qué falta, qué
etapa bloquea y qué se implementó provisionalmente mientras tanto.

**Regla que rige todo el proyecto:** ninguno de estos puntos se completa por inferencia. El
valor de cinco fases de análisis está precisamente en distinguir lo acordado de lo supuesto.

---

## 1. BLOQUEANTES · impiden completar una etapa

### PV-01 · Matriz de correspondencia zonal ↔ punto de encuentro

| | |
|---|---|
| **Qué falta** | Qué puntos de encuentro pertenecen a cada zonal, dentro de cada formulario |
| **Por qué no se puede inferir** | La Hoja2 del Excel lista zonales y puntos en columnas paralelas, sin relación entre ellas |
| **Bloquea** | E1 · carga inicial de `t_formulario_punto`. El filtrado en cascada no funciona sin esto |
| **Provisional** | La estructura existe; el `seed` deja los puntos sin vincular con `TODO` |
| **Compromiso** | El PO se comprometió a entregarla el 31-JUL-2026 |
| **Regla afectada** | RN-17 |

> **Desde el 2026-08-06 ya hay dónde cargarla.** La pantalla P-08 (M-28) da de alta cada punto
> **dentro de una zonal y de un formulario**, que son las dos coordenadas que la cascada necesita.
> Queda por decidir si el Product Owner la entrega en papel para capturarla ahí, o si se prefiere
> una siembra —lo que sería trabajo sobre M-03—.

- [ ] Recibido · Fecha: ________ · Responsable: ________

---

### PV-02 · Base de personal certificada

| | |
|---|---|
| **Qué falta** | Nombre, cédula, teléfono, área y **tipo de contrato** de cada funcionario |
| **Por qué es crítico** | El tipo de contrato determina si la persona puede salir de noche o en fin de semana. Sin él, la regla RN-26 no se puede evaluar |
| **Bloquea** | E4 · políticas de descanso operativas con datos reales |
| **Provisional** | `seed` con registros de ejemplo marcados como tales |
| **Compromiso** | El PO se comprometió al 31-JUL-2026 |
| **Reglas afectadas** | RN-26, RN-27, RN-33, RN-34 |

> **El camino de poblado cambió de forma el 2026-08-24.** Desde el 21-AGO existía el directorio
> de Auth como pestaña de consulta; ahora **es el primer paso del alta**: «Nuevo funcionario»
> abre el directorio y la ficha llega con la cédula y el nombre ya puestos.
>
> **Esto no cierra PV-02.** Auth no conoce el **tipo de contrato** —ni el área, ni el teléfono—,
> y es justo el dato del que dependen RN-26 y RN-33. Lo que se acorta es el tecleo; lo que sigue
> faltando es la certificación de esos tres campos, que se capturan a mano ficha por ficha.

- [ ] Recibido · Fecha: ________ · Responsable: ________

---

### PV-03 · Catálogo de conductores y vehículos

| | |
|---|---|
| **Qué falta** | Conductores con licencia profesional, vehículos de la flota y capacidad hábil por día |
| **Por qué no se puede inferir** | Nadie en las reuniones supo cuántos conductores hábiles existen |
| **Bloquea** | E7 · asignación logística con datos reales |
| **Provisional** | El control de flota **avisa pero no bloquea**, y **M-18 lo hace estructural**: la política es una función pura que no puede lanzar. **M-17 aporta la administración** (`/administracion/conductores` y `/administracion/vehiculos`) para que el catálogo se cargue por pantalla el día que llegue, y no a mano en la base |
| **Decisión que trae aparejada** | Cuando la DAF entregue el catálogo, habrá que decidir **si el aviso pasa a ser bloqueante**. Es una decisión del negocio, no técnica: hoy el sistema registra la advertencia y deja seguir |
| **A quién pedirlo** | DAF · Dirección Administrativa Financiera |
| **Regla afectada** | RN-46 |

**Dos consecuencias detectadas al implementar M-17, el 2026-08-06:**

| Hallazgo | Estado |
|---|---|
| **Dos reglas de descanso del conductor no se pueden aplicar.** El tipo de contrato y el tope de salidas pesadas exigen datos que `t_conductor` no guarda y una proyección de jornadas que no existe. Las otras cuatro —ausencia, patrulla consecutiva, solapamiento y jornada máxima— **sí están implementadas** | Al recibir el catálogo, decidir si esos dos datos hacen falta |
| **Ningún módulo del plan administra la disponibilidad de conductores y vehículos.** M-10 administra la del personal; el modelo admite las otras dos y M-17 las **lee** —RN-45 y el vehículo en mantenimiento—, pero no hay pantalla ni endpoint para registrarlas | Decidir si la recoge M-18 o si merece módulo propio |

- [ ] Recibido · Fecha: ________ · Responsable: ________

---

> **Los dos pendientes que siguen no vienen del análisis, sino de la implementación.** Aparecieron
> el 2026-08-05 al crear el esquema (módulo M-02): son **columnas obligatorias del modelo aprobado
> cuyos valores el insumo `catalogos-hoja2.json` no trae**. Sin ellos no se puede insertar ni una
> sola fila en `t_formulario`, y sin `t_formulario` no hay nada. Ver `M02_ESQUEMA_BASE_DATOS.md` §8.

### PV-26 · Qué formularios son «patrulla» · `form_es_patrulla`

> ## ✅ RESUELTO · 2026-08-07
>
> **Son patrulla los formularios 4, 5, 6 y 9.** No lo son el 1, 2, 3, 7 y 8.
>
> Decidido por el Product Owner, no deducido. La pregunta que el análisis dejaba abierta —el
> formulario 4, que lleva «Patrulla» en el nombre pero no tiene la composición de RN-31— se planteó
> de forma explícita y la respuesta fue que **sí cuenta** para la regla de descanso. El 9, que no se
> llama patrulla, **sí lo es**: confirma que deducirlo del nombre habría fallado en los dos sentidos.
>
> Sembrado en `prisma/seed.ts` (`ES_PATRULLA`), con la decisión y su fecha en el comentario.


> **Es el más grave de los cinco bloqueantes.** No produce un dato feo: produce una persona en
> patrulla dos días seguidos.

| | |
|---|---|
| **Qué falta** | Qué formularios activan la regla de descanso de patrulla consecutiva |
| **Por qué no se puede inferir** | Deducirlo del nombre del formulario es exactamente la inferencia que el proyecto prohíbe. El formulario 4 se llama «Patrulla» pero **no tiene la composición de personal que RN-31 atribuye a las patrullas** |
| **Bloquea** | E1 · siembra de `t_formulario`. La columna es obligatoria |
| **Provisional** | Ninguno. **No se sembró ningún valor**: la tabla está vacía |
| **A quién pedirlo** | Product Owner |
| **Reglas afectadas** | **RN-24**, y con ella RN-31 y RN-32 |

**Evidencia disponible, para que la decisión no parta de cero:**

| # | Formulario | Personal admitido | ¿Encaja con RN-31 y RN-32? |
|---|---|---|---|
| 4 | **Patrulla** ECU Diurna | Instrucción + Unidad de Operativos | **No** |
| 5 | **Patrulla** Reacción Diurna (UIG-UIT) | Inspectores Generales + Técnicos | **Sí, exacto** |
| 6 | **Patrulla** Reacción Nocturna | Instrucción + Generales + Técnicos | **Sí, exacto** |
| 1, 2, 3, 7, 8, 9 | — | — | No se denominan patrulla |

Los formularios **5 y 6 son inequívocos**: RN-31 describe la patrulla como *un inspector general y
un inspector técnico*, y RN-32 añade *una persona de Instrucción* en la nocturna. Eso es,
literalmente, la composición de esos dos formularios.

**La duda es el formulario 4.** Lleva «Patrulla» en el nombre pero su personal es Instrucción y
Unidad de Operativos, que no es la integración de RN-31. Ya fue punto bloqueante B-02 del análisis
por su propiedad departamental.

**Pregunta para la sesión:**

> ¿El formulario 4 «Patrulla ECU Diurna» cuenta para la regla de descanso? Es decir: quien salió
> en ECU Diurna ayer, ¿puede salir hoy en Reacción Diurna o Nocturna, y a la inversa?

Conviene confirmar también la formulación, porque **el bloqueo es cruzado entre formularios**: quien
salió en cualquier patrulla no puede salir en ninguna otra al día siguiente. No es «no repetir el
mismo formulario».

- [ ] Resuelto · `es_patrulla` verdadero en los formularios: ____________________
- [ ] Confirmado que el bloqueo es cruzado entre patrullas · Fecha: ________

---

### PV-25 · Color de acento de los nueve formularios · `form_color_acento`

> ## ✅ RESUELTO POR CÁLCULO · 2026-08-07 · **opción 2**
>
> Al sembrarse los nueve formularios había que darle un valor, y se tomó la opción que este mismo
> documento planteaba: **el acento es el color del texto sobre el banner**, calculado por luminancia
> relativa WCAG desde `colorFondo`.
>
> Los nueve dieron `#000000`: los colores institucionales son pastel, tal como advertía FASE5 §10.2.
> Eso **cierra PV-23 de paso** en lo que toca al texto del banner —contrasta por construcción—, no en
> cuanto a si los fondos en sí son acertados.
>
> Queda abierto solo esto: **si la Dirección quiere apartarse del cálculo en algún formulario**. Si no,
> la columna puede quedarse como está.


| | |
|---|---|
| **Qué falta** | Un valor hexadecimal por formulario. La columna es `CHAR(7) NOT NULL` |
| **Por qué no se puede inferir** | El Excel aprobado solo define el color de **fondo** del banner. El insumo trae `colorFondo` y `colorNombre`, no el acento |
| **Bloquea** | E1 · siembra de `t_formulario` |
| **Provisional** | Ninguno. **No se sembró ningún valor** |
| **A quién pedirlo** | DNP, o resolverlo por medición. Ver abajo |
| **Regla afectada** | Ninguna de negocio. Solo presentación |

**Antes de pedir nueve hexadecimales, conviene resolver para qué sirven.** `FASE2` lo describe como
«valor hexadecimal complementario» y `FASE3` lo incluye en el objeto `IdentidadVisual`, pero
**ninguna pantalla de `FASE5` lo consume**: los wireframes y los mockups aplican el color de fondo
del banner y nada más.

Hay una hipótesis que encaja y que resolvería además **PV-23**, hoy abierto. `FASE5` §10.2 advierte
que los nueve colores de banner son pastel, que **no se eligieron con criterio de contraste**, y que
si alguno no alcanza el umbral de accesibilidad *«la solución que no altera el dato institucional es
oscurecer el texto del banner, no cambiar el color de fondo»*. Eso es, precisamente, un color
complementario por formulario.

**Opciones, en el orden en que conviene plantearlas:**

| # | Opción | Consecuencia |
|---|---|---|
| 1 | **La columna no tiene uso real** | Se hace opcional o se retira. Es más honesto que llenarla con datos que nadie mira |
| 2 | **El acento es el color del texto sobre el banner** | Se resuelve midiendo contraste sobre los nueve fondos. **Cierra PV-23 de paso** |
| 3 | **La DNP entrega los nueve valores** | Si existe una paleta complementaria oficial en el manual de marca |

> **Evidencia a favor de la opción 2, del 2026-08-06.** Al implementar M-25 la hipótesis dejó de ser
> teórica: el banner de la matriz **necesita** un color de texto, y no hay ninguno. La pantalla lo
> resuelve eligiendo entre blanco y negro por luminancia relativa WCAG (`utils/banner.util.ts`), que
> es exactamente lo que un «color complementario por formulario» haría, solo que calculado en lugar
> de declarado.
>
> Con eso, la opción 2 **ya no requiere trabajo de la DNP**: si se la adopta, basta con volcar el
> resultado del cálculo en la columna y que el frontend lo lea de ahí. La pregunta que queda es si la
> Dirección quiere poder apartarse de ese cálculo en algún formulario concreto —y esa es la única
> razón por la que la columna tendría valor propio—.

- [ ] Resuelto · Opción elegida: ________ · Fecha: ________

---

## 2. ALTOS · afectan reglas de negocio

### PV-04 · Contradicción del formulario 9 · AMC-CBQ

El libro Excel declara **simultáneamente** dos cosas incompatibles sobre el mismo formulario:

- Condicionante nocturno: si el horario comprende de 20H00 a 05H00, **debe** asignarse conductor
- Columnas de conductor y placa: **«No se habilite»**

| | |
|---|---|
| **Provisional** | Se implementó con `politicaVehiculo = NO_APLICA` y `condicionanteNocturno = false`, con comentario citando la contradicción |
| **Qué se necesita** | Que la DNP confirme cuál de las dos indicaciones prevalece |
| **Reglas afectadas** | RN-42, RN-43 |

> ## ⚠️ 2026-08-24 · LO PROVISIONAL NO SE APLICÓ, Y HOY BLOQUEA EL CIERRE
>
> **La base dice `form_condicionante_noct = true` para CBQ.** Consultado en la instancia en
> marcha:
>
> ```
>  9 | CBQ | NO_APLICA | noct = t
> ```
>
> La migración institucional `20260819210000` lo inserta así, fiel a RN-43. De modo que la
> contradicción del Excel **no se neutralizó**: se copió tal cual, y las dos indicaciones
> incompatibles conviven en la fila.
>
> **La consecuencia no es cosmética. Un operativo nocturno de CBQ deja la jornada sin
> poder cerrarse, y no hay salida por la aplicación:**
>
> | Vía | Qué responde |
> |---|---|
> | `PATCH /transporte/operativos/:id` · asignar | **409** — `exigirVehiculoHabilitado`: `NO_APLICA` no habilita vehículo |
> | `PATCH …/propios-medios` · declarar | **409** — `CONDICIONANTE_NOCTURNO`: nocturno exige conductor |
> | Bandeja de la DAF | **No aparece**: `operativos.repository.ts:347` excluye los `NO_APLICA` |
> | Cierre del cuadro | **Lo bloquea**: `operativosConCondicionantePendiente` lo devuelve (INV-11) |
>
> Las dos únicas salidas están cerradas **por reglas opuestas**, y la que bloquea el cierre
> no distingue entre ellas. Hoy es latente —no hay ningún operativo de CBQ en la base—,
> pero se activa el primer día que alguien registre uno con horario nocturno.
>
> **Cualquiera de las dos resoluciones lo desbloquea**, y las dos son un `UPDATE` de una
> fila, sin desplegar código:
>
> - Si prevalece «no se habilita conductor» → `form_condicionante_noct = false`, que es lo
>   que este documento decía que ya estaba hecho.
> - Si prevalece «conductor obligatorio de noche» → `form_politica_vehiculo = REQUERIDO`,
>   y entonces CBQ entra en la bandeja de la DAF como los demás.
>
> **No se tocó nada.** Es una decisión de la DNP, no de desarrollo.

- [ ] Resuelto · Decisión: ________________________________

---

### PV-05 · Momento de verificación del condicionante nocturno

El Excel dice que sin conductor **no se guarda la planificación**. Pero el conductor lo asigna
la DAF **después** del registro, en su propia ventana. Las dos cosas no pueden ser ciertas a la vez.

| | |
|---|---|
| **Provisional** | La validación se ejecuta **al cerrar el cuadro**, no al registrar |
| **Alternativa** | Que el departamento pueda asignar conductor en esos casos concretos |
| **Impacto en el modelo** | Si se traslada al registro, cambia la delimitación del agregado Operativo |
| **Regla afectada** | RN-43 · invariante INV-11 |

- [ ] Resuelto · Decisión: ________________________________

---

### PV-06 · Valores iniciales de los siete parámetros de política

Ya están **parametrizados** por decisión del PO, pero sus valores iniciales los fija la Dirección.

| Parámetro | Valor provisional | Rango admisible | Regla |
|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | `12` | 8 a 16 | RN-36 |
| `TOPE_SALIDAS_PESADAS` | `3` | 1 a 6 | RN-25 |
| `PERIODO_COMPUTO_SALIDAS` | `MENSUAL` | Semanal, Quincenal, Mensual | RN-37 |
| `HORA_LIMITE_CUADRO` | `16:30` | — | RN-57 |
| `FRANJA_NOCTURNA_INICIO` | `20:00` | — | RN-43 |
| `FRANJA_NOCTURNA_FIN` | `05:00` | — | RN-43 |
| `DIAS_DESCANSO_PATRULLA` | `1` | 1 a 3 | RN-24 |

> **Nota sobre la hora de cierre. Reescrita el 2026-08-25.** Las fuentes indican 14H00 en una
> sesión y 15H00 en otra, ambas del mismo interlocutor, y **eso sigue sin decidirse**. Lo que
> cambió es dónde se ajusta.
>
> Hasta esa fecha el dato estaba **dos veces**: en `t_ventana_carga`, una fila por rol, y en el
> parámetro `HORA_CIERRE_DEPARTAMENTAL`, un valor único. Solo la ventana gobernaba —el
> `VentanaCargaGuard` lee esa tabla y ninguna otra—; el parámetro únicamente alimentaba una
> advertencia de P-09 que pedía mantenerlos iguales, y que no impedía guardar. Quien la ignoraba
> dejaba la pantalla de parámetros diciendo una hora y el sistema cerrando a otra.
>
> **El parámetro se retiró** a petición del negocio: «debe existir solo un parámetro». La hora vive
> en el panel de ventanas de P-09, que además es lo que pide RF-059 —«parametrizar las ventanas de
> carga **por rol**»— y lo que un valor único no podía expresar: la DAF cierra a las 16H30 y los
> tres departamentos a las 15H00. Sigue sin desplegar código; sigue pendiente la decisión.

> **Desde el 2026-08-06 hay dónde ajustarlos.** La pantalla P-09 (M-29) muestra los siete con su
> rango, su unidad y su descripción, y los corrige en línea. **Lo que falta es la decisión, no la
> herramienta**: cada valor rige desde que se guarda, y cambiar un umbral de descanso altera de
> inmediato a quién ofrece el sistema al armar el cuadro.

- [ ] Confirmados · Fecha: ________ · Autoriza: ________

---

### PV-07 · Canal de entrega de la orden de servicio

| | |
|---|---|
| **Opciones** | Descarga por la Dirección · Consulta del propio funcionario en el sistema · Envío por correo institucional |
| **Provisional** | **Implementado así en M-20:** emisión por la Dirección, consulta propia en `/ordenes-servicio/mias` y descarga del PDF. **No** se implementa envío por correo |
| **Depende de esto** | Si la pantalla P-06 «Mis órdenes» es necesaria, y el consumidor del evento `OrdenServicioEmitida` |
| **Decisión que trae aparejada** | **Quién enlaza cada usuario con su ficha de personal.** La migración #7 de M-20 agrega `t_usuario.func_id`, nula por defecto: falta decidir si la puebla el administrador desde una pantalla o si viene del directorio activo. Sin enlace, el funcionario no puede consultar sus órdenes —recibe un mensaje que se lo explica— |

- [ ] Resuelto · Decisión: ________________________________

---

### PV-08 · Formato unificado de la orden de servicio impresa

El PO advirtió que cada dirección maneja hoy su propio formato.

| | |
|---|---|
| **Provisional** | **Implementado así en M-20:** el diseño del prototipo aprobado —vertical, cuatro datos, una hoja por funcionario, con el aviso de aislamiento— |
| **Qué se necesita** | Que la DNP emita el formato institucional único, **y el logotipo para el backend** (PV-30) |

- [ ] Resuelto · Formato recibido: ________

---

### PV-27 · Criterio de selección de prefijo por área · formularios 5, 6, 7 y 8

Estaba anotado en `ANALYSIS_REPORT.md` §1221 y en `M03_SEMILLA_CATALOGOS.md` desde el 2026-08-05,
pero **nunca se trasladó a este documento**. Se incorpora al detectarlo durante M-13.

| | |
|---|---|
| **Qué falta** | Con qué criterio se elige el prefijo cuando un formulario tiene varios por área. El formulario 8 tiene más de uno y nada dice cuál corresponde a cada operativo |
| **Por qué no se puede inferir** | El prefijo forma el identificador que se imprime en la matriz y en la orden de servicio. Elegirlo por orden alfabético o por el primero de la lista produciría códigos que no significan lo que aparentan |
| **Bloquea** | El generador de identificador de **M-14** (RN-09 y RN-12) |
| **Provisional** | Se sembraron los prefijos enumerados, sin criterio de selección. **M-14 elige el marcado como predeterminado**; si hay varios y ninguno lo es, se detiene con un mensaje que nombra el formulario en vez de elegir por orden alfabético |
| **A quién pedirlo** | Product Owner |

- [ ] Resuelto · Criterio: ________________________________

---

### PV-40 · El formulario ajeno se oculta en P-01, en lugar de explicarse

| | |
|---|---|
| **Detectado** | Decisión de cambio solicitada el **2026-08-24** |
| **Qué había** | `SelectorFormulario` pintaba **todos** los formularios que devuelve `GET /formularios/permitidos` y **deshabilitaba** los que el rol no puede escribir, con el motivo en el `title` y el distintivo «Solo personal». Criterio de PER-06, y el mismo con el que se resolvió **PV-37** en el selector de personal |
| **Qué se pidió** | Que **no se muestren**. Motivo: una fila de botones apagados genera confusión visual |
| **Implementado así** | Solo se pintan los de `acceso: ESCRITURA`. `COMPARTIDO` y `LECTURA` desaparecen del selector |
| **Qué se pierde** | La constancia de que el formulario 6 existe y de que el DMIT participa en él con cupo (PER-06). **No se pierde ninguna función**: se comprobó que ese cupo no tiene hoy ninguna vía en la interfaz — `POST /operativos/:id/personal` solo se invoca al editar operativos propios en P-02 |
| **Qué NO cambia** | La seguridad. `FormularioRolGuard` sigue rechazando con **403 `FORMULARIO_NO_AUTORIZADO`** cualquier registro ajeno, comprobado contra la base |

> **Dos cosas que conviene saber al ratificar esto.**
>
> **1 · Los ocho botones apagados solo los veía una cuenta con rol transversal.** Un rol
> puramente departamental **ya recibía solo los suyos**: `leCorresponde` en
> `reglas-formulario.ts:62-68` devuelve `LECTURA` para lo ajeno y lo descarta. Los nueve
> llegan a `ADMINISTRADOR_DMIP` y `DIRECTOR`, y `user.rolCodes` es plural desde el 19-AGO, así
> que una cuenta con rol transversal **y** departamental los recibía todos.
>
> **2 · El distintivo mentía.** «Solo personal» se pintaba sobre cualquier formulario que
> no fuera `ESCRITURA`, incluidos los de `LECTURA`, donde ese departamento **no aporta a
> nadie**. Eso ya era un defecto, y se va con el cambio.
>
> Queda por ratificar si la desaparición del formulario 6 para el DMIT es aceptable, o si
> su participación con cupo debe tener una vía propia en la interfaz —que hoy no tiene—.

- [ ] Ratificado · Decisión: ________________________________

---

### PV-37 · Quien no puede salir desaparece de la lista, en lugar de explicarse

> ## ✅ RESUELTO · 2026-08-11
>
> **`GET /personal/elegible` devuelve a todos los candidatos con su veredicto.** Cada persona llega
> con `elegible` y, si no lo es, el `motivo` redactado por el servidor. La pantalla la muestra
> deshabilitada con su explicación debajo del nombre, en lugar de esconderla.
>
> Decidido en desarrollo el 2026-08-11 sobre la opción que el propio pendiente enunciaba, y
> **pendiente de ratificación del Product Owner** solo en un punto: qué se dice de una ausencia.
>
> **Se resolvió así:** las reglas de descanso explican su rechazo entero —«ya está asignada al
> operativo OCF-001 de 08H00 A 14H30, que se cruza con este horario»— porque son hechos operativos
> del cuadro. Una ausencia informa **que la hay, nunca cuál es**. `DisponibilidadService.ausentesEntre`
> entrega solo identificadores a propósito, «para no exponer que alguien está de reposo médico o de
> calamidad doméstica», y esa decisión se respetó.
>
> Trabajo realizado sobre M-10 y M-12, sin migración: el servicio pasó de `filtrarElegibles` a
> `verificarVarios`, que ya conservaba el motivo. Sigue siendo una consulta de antecedentes para
> todo el grupo.

| | |
|---|---|
| **Detectado** | Al corregir un fallo de contrato el 2026-08-07 |
| **El problema** | `GET /personal/elegible` **descartaba** a quien no podía salir: filtraba ausentes y a quienes incumplen las reglas de descanso, y devolvía solo a los aptos |
| **La consecuencia** | Quien armaba el cuadro veía una lista más corta **sin saber por qué faltaba alguien**. El motivo solo aparecía si intentaba asignar a esa persona, y no podía intentarlo porque no estaba en la lista |
| **Por qué importaba** | Es exactamente lo que el análisis quiso evitar: una persona que desaparece sin explicación obliga a levantar el teléfono, que es el canal que este sistema existe para reemplazar |
| **Resuelto como** | **Todos los candidatos, con veredicto y motivo.** La causa de una ausencia no se publica |

- [x] Resuelto · Fecha: **2026-08-11** · Por: desarrollo, pendiente de ratificar el criterio de privacidad de la ausencia

### PV-39 · La jornada del personal de nombramiento se cita pero no se aplica

| | |
|---|---|
| **Detectado** | Probando con datos reales el 2026-08-12 |
| **El problema** | Al rechazar un turno nocturno, el mensaje dice que el personal de nombramiento *«cumple jornada de lunes a viernes de 08H00 a 16H30»*. **Ese horario no se comprueba.** La validación implementada es VAL-13, que solo declara «turno nocturno o fin de semana» |
| **Cómo se manifiesta** | Un operativo de 12H00 a 20H00 en día laborable **se admite** para personal de nombramiento: no entra en la franja nocturna —que empieza a las 20H00— y no es fin de semana |
| **Por qué está así** | Deliberado y razonado en `M12_POLITICAS_DESCANSO.md` §8.1: rechazar además un operativo de 17H00 a 19H00 sería una regla que la validación aprobada no enuncia, y **las horas extra ordinarias son parte del trabajo** |
| **El problema real no es la regla, es el texto** | El mensaje anuncia un horario que el sistema no aplica, y quien lo lee espera que lo aplique |
| **Qué se necesita** | Decidir entre: (a) que el mensaje deje de citar el horario y nombre solo lo que comprueba; o (b) aplicar RN-26 entera, rechazando a todo nombramiento fuera de 08H00–16H30. La opción (b) **es una línea de código**, pero excluye las horas extra |
| **A quién pedirlo** | Dirección |
| **Reglas afectadas** | RN-26, RN-33, VAL-13 |

- [ ] Resuelto · Criterio: ________________________________

---

### PV-38 · Qué se dice de una ausencia en la lista de personal

| | |
|---|---|
| **Detectado** | Al resolver PV-37, el 2026-08-11 |
| **La decisión tomada** | La lista de personal elegible informa **que la persona no está disponible**, sin decir si es vacaciones, permiso, calamidad doméstica o reposo médico |
| **Por qué así** | `DisponibilidadService.ausentesEntre` devuelve solo identificadores desde M-10, con este comentario: *«traer el estado de cada una expondría a quien arma el cuadro si alguien está de reposo médico o de calamidad doméstica»*. Se respetó esa decisión |
| **Qué conviene confirmar** | Si el Product Owner prefiere que quien arma el cuadro **sí** vea el tipo de ausencia. Hay un argumento operativo a favor —una calamidad de un día no es lo mismo que unas vacaciones de dos semanas, y cambia a quién se busca de reemplazo— y uno de privacidad en contra |
| **A quién pedirlo** | Product Owner, con criterio de Talento Humano |

- [ ] Confirmado · Criterio: ________________________________

---

### PV-36 · La administración de catálogos no tiene `GET` propio · desactivar es irreversible

| | |
|---|---|
| **Detectado** | Al implementar M-28 el 2026-08-06 |
| **El problema** | `AdministracionCatalogosController` expone **nueve operaciones de escritura y ningún `GET`**. Para leer hay que usar `GET /formularios/:codigo/catalogos`, que es el endpoint operativo y filtra `activo: true` |
| **Implementado así en M-28** | P-08 lee por el endpoint operativo. El contador dice «N vigentes» en lugar de fingir un filtro de estado, y la confirmación de baja **advierte que no se podrá reactivar** |
| **La consecuencia** | **Desactivar es una puerta de un solo sentido desde la interfaz.** El valor desaparece de la lista y no vuelve, aunque `ActualizarPuntoDto` acepte `activo: true`. Tampoco se puede mostrar una columna de estado: las tres respuestas no traen `activo` |
| **Qué se necesita** | Un `GET /administracion/catalogos/...` con `incluirInactivos`, y `activo` en `PuntoResponseDto`, `TipoControlResponseDto` e `InstitucionResponseDto`. Es trabajo sobre M-07 |
| **Decisión** | ______ |

> **Relacionado, y conviene decidirlo a la vez.** `ActualizarPuntoDto` no acepta `formularioIds`: un
> punto creado en el formulario 1 **no se puede compartir después con el 5** sin volver a crearlo, lo
> que chocaría con `uq_punto_nombre_zonal`. El modelo contempla la relación de muchos a muchos, así
> que si compartir puntos entre formularios es habitual, falta la operación que lo permita.

### PV-35 · No hay forma de saber quién está ausente sin preguntar ficha por ficha

| | |
|---|---|
| **Detectado** | Al implementar M-27 el 2026-08-06 |
| **El problema** | `GET /administracion/personal/:id/disponibilidad` devuelve los periodos **de un funcionario**, y `FuncionarioResponseDto` no trae ningún campo de situación. Para pintar el distintivo de ausencia del caso 3 haría falta una petición por ficha |
| **Implementado así en M-27** | Se piden las ausencias **solo de las filas visibles** —diez por página—, en paralelo, y se recuerdan: paginar hacia atrás no vuelve a preguntar. Mientras no se sabe, la fila dice «Consultando…» en lugar de afirmar «Activo» |
| **La consecuencia** | Diez peticiones adicionales por página del maestro, y la tabla «AUSENCIAS REGISTRADAS» del esquema de FASE5 §4.5 se muestra **por persona** y no de toda la institución |
| **Qué se necesita** | Decidir entre: (a) agregar `disponibilidadVigente` a `FuncionarioResponseDto` —resuelve el caso 3 sin peticiones extra—; (b) un `GET /administracion/personal/disponibilidad` que liste las de la institución —resuelve además la tabla global—; o (c) aceptar el comportamiento actual. Es trabajo sobre M-10 |
| **Decisión** | ______ |

### PV-34 · ¿La emisión de órdenes exige el cuadro cerrado?

| | |
|---|---|
| **Detectado** | Al implementar M-26 el 2026-08-06 |
| **El problema** | El caso 7 del plan dice «según la regla de negocio **confirmada en M-13**». En M-13 no se confirmó ninguna, y las dos fuentes disponibles se contradicen |
| **Lo que dice el diseño** | `FASE5` §6.1 dibuja el flujo de la Dirección como «cierre del cuadro → P-05 emisión de órdenes», y §7 declara que en el estado *cuadro cerrado* la emisión «queda habilitada» |
| **Lo que hace el servidor** | `OrdenServicioService.emitir` comprueba que el operativo exista y que tenga personal. **El estado del cuadro no se mira** |
| **Implementado así en M-26** | Siguiendo el diseño: el botón queda deshabilitado con la explicación en el `title` mientras el cuadro no esté cerrado, y un `alert-warning` lo dice arriba |
| **La consecuencia** | **Una regla que vive solo en la interfaz no es una regla.** Cualquiera con perfil de Dirección y una petición directa puede emitir sobre un cuadro en borrador |
| **Qué se necesita** | Confirmar si la regla es real. Si lo es, le falta su comprobación en `emitir` —trabajo de backend, sobre M-20—; si no lo es, sobra el bloqueo de la pantalla |
| **Decisión** | ______ |

### PV-33 · La DAF no puede listar la flota · bloquea parte de P-03

| | |
|---|---|
| **Detectado** | Al implementar M-24 el 2026-08-06 |
| **El problema** | `PATCH /transporte/operativos/:id` exige `vehiculoId`, pero el único endpoint que enumera vehículos —`GET /administracion/vehiculos`— lleva `@Roles(ADMINISTRADOR_DMIP)`. La DAF, que es quien asigna, **no tiene forma de ver la flota** |
| **Implementado así en M-24** | El desplegable de placas se compone con los **vehículos habituales de los conductores disponibles**, que llegan dentro de `GET /transporte/conductores`. Cubre el caso 3 del plan. Cuando no hay ninguno, el campo explica el motivo en lugar de quedarse vacío |
| **La consecuencia** | **Un vehículo que no sea habitual de ningún conductor no se puede asignar desde P-03** |
| **Qué se necesita** | Decidir entre: (a) abrir `GET /administracion/vehiculos` a la DAF —cambia el alcance del rol que esta pantalla existe para acotar—; (b) un endpoint nuevo `GET /transporte/vehiculos`; o (c) confirmar con la DAF que en la AMC todo vehículo tiene conductor habitual, en cuyo caso no hay nada que hacer |
| **Decisión** | ______ |

### PV-29 · Momento de verificación de la composición de la patrulla · RN-31 y RN-32

Detectado al implementar M-15, el 2026-08-06.

| | |
|---|---|
| **Qué falta** | En qué momento se verifica que la patrulla tenga un inspector general, uno técnico y —la nocturna— una persona de Instrucción, y qué ocurre si al cerrar la jornada no se cumple |
| **Por qué no se puede inferir** | Las dos reglas describen la composición que la patrulla debe **acabar** teniendo, no una condición de cada asignación: aplicarlas al asignar rechazaría siempre a la primera persona, que por definición deja la composición incompleta |
| **Provisional** | **Se informa y no se bloquea.** La respuesta del operativo trae `composicion: { esPatrulla, completa, areasPendientes }` |
| **A quién pedirlo** | Product Owner |
| **Si se define** | Si la verificación fuera al cerrar, el punto natural es `CuadroDiarioService.cerrar()`, junto a INV-11 |

- [ ] Resuelto · Momento y consecuencia: ________________________________

---

### PV-28 · Formato de la orden de trabajo · `cuad_orden_trabajo`

> ## ✅ RESUELTO · 2026-08-07
>
> **La genera el sistema con el formato `AMC-AAAA-MM-DD`.** Su único uso es exponer el día en la
> matriz consolidada; no participa en ninguna regla.
>
> Decidido por el Product Owner. Invierte lo provisional: dejó de ser un dato de entrada.
>
> **Implementado el mismo día.** `CrearCuadroDto` quedó con **una sola propiedad, la fecha**, y
> enviar `ordenTrabajo` produce `400 CAMPOS_NO_PERMITIDOS`. Se retiró del contrato en lugar de
> dejarlo opcional: dos códigos distintos para el mismo día no pueden convivir.
>
> Se retiró también la comprobación de orden duplicada, que ya no podía ejecutarse: el código se
> deriva de la fecha, y la fecha es única.

| | |
|---|---|
| **Qué faltaba** | Cómo se compone el código de la orden de trabajo de cada jornada |
| **Qué decían las fuentes** | `FASE4` solo decía «código institucional, único» |
| **Por qué no se pudo inferir** | El código se imprime en la matriz consolidada. Un código inventado circula fuera del sistema y termina citado en un oficio |
| **Resuelto como** | **Generado por el sistema: `AMC-AAAA-MM-DD`** |
| **Quién lo decidió** | Product Owner, el 2026-08-07 |

- [x] Resuelto · Formato: **`AMC-AAAA-MM-DD`, generado por el sistema** · Fecha: 2026-08-07

---

## 3. MEDIOS · afectan comportamiento, no reglas

| ID | Pendiente | Provisional | Decisión |
|---|---|---|---|
| PV-09 | Cupo exacto del rol DMIT en el formulario 6 | **Implementado así en M-15:** una persona, según la transcripción. Es el valor de `form_cupo_compartido`, así que cambiarlo no exige desplegar código. **El 2026-08-25 se sumó el formulario 4 con cupo 2**, por decisión del negocio; el del 6 no se tocó | ______ |
| PV-10 | Baja física o lógica de operativos | **RESUELTO el 2026-08-07 por el Product Owner: baja FÍSICA mientras no haya órdenes emitidas, y el secuencial SE REUTILIZA.** Con órdenes emitidas se conserva la baja lógica de M-14, porque `fk_orden_operativo` es `RESTRICT` y una orden ya comunicada no puede quedarse sin origen. Consecuencias aceptadas: la auditoría sobrevive sin enlace (`SET NULL`) y por eso su asiento nombra el identificador; y un mismo código puede corresponder a dos operativos distintos a lo largo del día, si el primero se eliminó antes de emitir nada | **Product Owner · 2026-08-07** |
| PV-11 | Procedimiento de reapertura del cuadro cerrado | **Implementado así en M-13:** endpoint con rol Director, sin flujo de autorización adicional, con contador de reaperturas como evidencia | ______ |
| PV-12 | Flujo completo de la solicitud de apoyo interdirección | **Implementado así en M-16:** se registra en `SOLICITADA` y se muestra en la bandeja de la dirección requerida; sin aceptación, rechazo ni vencimiento. **Tampoco se puede corregir ni anular una solicitud equivocada**, porque toda actualización con sentido es una transición de estado | ______ |
| PV-13 | Ubicación del rol Director: subdivisión de la DMIP o la DNP | Se modela como rol único | ______ |
| PV-14 | DMQ como zonal o como ámbito distinto | Zonal con `zona_es_dmq = true` | ______ |
| PV-15 | Número de códigos por formulario frente a prefijos enumerados | Se toman los prefijos enumerados | ______ |
| PV-16 | Antelación mínima entre registro e inicio del operativo | Sin validación | ______ |
| PV-17 | Campo observaciones en la cabecera oficial | Se incorpora por su uso efectivo | ______ |
| PV-18 | Política de retención de auditoría e histórico | Sin purga | ______ |
| PV-19 | Política de respaldo y restauración | No definida | ______ |
| PV-20 | Indicadores del reporte de estadísticas por unidad | No implementado | ______ |
| PV-30 | ✅ **RESUELTO el 2026-08-25.** La institución entregó el bloque y está en `src/assets/logo-amc.png` del backend —1200 × 268, 101 kB—; **los dos documentos lo llevan en la cabecera** por `identidad-institucional.ts`, y el marcador de 70 bytes se retiró. Si el archivo faltara, siguen saliendo con membrete de texto y se registra el aviso. Historia: **logotipo institucional para el documento exportado.** Detectado al implementar M-19 el 2026-08-06 y **corregido en M-30**: dije que el archivo no existía en el backend, y sí existe —`src/assets/LogoAmc.jpeg`, desde la línea base—. Lo que no existe es el logotipo: son **70 bytes, un PNG transparente de 1×1 con extensión `.jpeg`**. El real está en el frontend y pesa 98 kB. **Es peor que la ausencia**: hay un archivo con el nombre y la ruta correctos que no es lo que aparenta, y usarlo sin mirarlo imprimiría un píxel invisible en el membrete de un documento oficial | La matriz exportada imprime la identificación institucional **en texto**. Se necesita que la DNP entregue el logotipo real para el backend, y que se reemplace ese marcador | ______ |

---

## 4. DE DISEÑO · afectan la interfaz

| ID | Pendiente | Provisional | Decisión |
|---|---|---|---|
| PV-21 | Color primario de acción: el manual señala `#3744d0`, el tema usa `#1b77bb` | Se usa el tema tal como está | ______ |
| PV-22 | Tono del Amarillo de Alerta: el Excel indica amarillo puro, el tema define `warning` como naranja | Se usa `bg-warning/25` | ______ |
| PV-23 | Verificación de contraste sobre los nueve banners de color | Sin medir | ______ |
| PV-24 | Incorporación de `@tanstack/react-query` para caché de catálogos | No instalado | ______ |
| PV-32 | **¿Se consultan operativos de días anteriores?** Detectado al implementar M-23 el 2026-08-06: `GET /operativos` admite `fecha`, pero el esquema de P-02 (FASE5 §4.4) solo enseña la jornada del día. Sin un control que mueva la fecha, ese parámetro del contrato queda muerto | **Implementado así en M-23:** selector de fecha en la cabecera. Con fecha pasada el listado se consulta y las acciones de editar y retirar se deshabilitan solas por RN-56 y RN-58. **Ampliado el 2026-08-21:** los selectores de P-02, P-04 y P-05 **proponen la jornada del día siguiente**, no la de hoy, conforme a RN-01. En P-05 eso obliga a retroceder un día para disponer un adicional de urgencia (RN-62). Sigue pendiente confirmar si consultar días anteriores es deseable, y **si la fecha debe ser editable en P-01**, donde FASE5 §5.1 la declara dato calculado de solo lectura y el código pinta un selector | ______ |
| PV-31 | **¿Un operativo se reparte entre varias zonales con frecuencia?** Detectado al implementar M-22 el 2026-08-06: RN-19 admite varias y el contrato las envía como arreglo, pero **la pantalla ofrece una sola**. No es una limitación técnica: no hay evidencia en el insumo de que ocurra, y un selector múltiple para un caso inexistente estorba a los cientos de registros diarios que no lo necesitan | **Implementado así en M-22:** una zonal por operativo en la interfaz. Ampliarlo es un cambio de control, no de contrato: el servicio ya envía el arreglo | ______ |

---

## 5. RIESGOS ABIERTOS

| ID | Riesgo | Estado |
|---|---|---|
| R-01 | El matrizador que consolidaba el cuadro cesó funciones sin traspaso | **Materializado.** Conviene sesión con quien lo sustituya |
| R-02 | Resistencia a la adopción: *«para ellos es más fácil mandar un WhatsApp»* | Abierto. Mitigación: formulario condensado y estadísticas por unidad |
| R-03 | Un solo desarrollador para todo el ecosistema | Abierto |
| R-05 | Entidades externas sin obligación de usar la plantilla | Abierto. Requiere memorando institucional |
| R-07 | Riesgo legal preexistente: vehículos sin orden de movilización, personal sin licencia profesional | El sistema deja evidencia; no resuelve lo jurídico |

---

## 6. RESUMEN PARA LA SESIÓN

> **Actualizado el 2026-08-07.** Ese día el Product Owner resolvió cuatro pendientes en uso real:
> **PV-25** (color de acento), **PV-26** (formularios de patrulla: 4, 5, 6 y 9), **PV-28** (la
> orden de trabajo la genera el sistema como `AMC-AAAA-MM-DD`) y **PV-10** (la baja del operativo
> borra la fila si no tiene órdenes emitidas). Con ello **los bloqueantes bajan de cinco a cuatro**
> —PV-01, PV-02, PV-03 y PV-27—, y los tres primeros ya no son «tabla vacía»: la carga empezó.
>
> Se registró además **PV-37**, detectado al haber por fin personal en la base.

| Prioridad | Cantidad | Efecto si no se resuelve |
|---|---|---|
| Bloqueantes | **4** | No se puede operar con el catálogo institucional completo |
| Altos | 13 | Reglas de negocio incompletas o provisionales |
| Medios | 13 | Comportamientos supuestos, documentados como tales |
| De diseño | 6 | Interfaz funcional pero no alineada al manual de marca |

**Los cuatro bloqueantes tienen responsable concreto:** la matriz zonal ↔ punto, la base de
personal y el criterio de prefijo por área los entrega el Product Owner; el catálogo de conductores
y vehículos, la DAF.

### Orden sugerido para la sesión

| # | Pendiente | Por qué primero |
|---|---|---|
| 1 | **PV-27** · criterio de prefijo por área | **Es lo único que impide registrar** en los formularios 2, 5, 6, 7 y 8. Los otros cuatro ya funcionan de punta a punta |
| 2 | **PV-01** · matriz zonal ↔ punto | La cascada solo ofrece lo que se haya cargado a mano. P-08 ya permite darlo de alta |
| 3 | **PV-02** · base de personal con tipo de contrato | Sin el tipo de contrato, RN-26 no se puede evaluar |
| 4 | **PV-03** · conductores y vehículos | Depende de la DAF, no del PO. Puede ir en paralelo |

**Los tres primeros pasaron de «no se puede empezar» a «falta terminar»**: el 07-AGO se cargaron
las primeras filas desde las propias pantallas, así que lo que queda es entregar el catálogo
institucional, no habilitar la herramienta.

---

### PV-41 · El mínimo del cupo compartido puede dejar una jornada sin poder cerrarse

| | |
|---|---|
| **Detectado** | Al implementar la solicitud del **2026-08-25** |
| **Qué se pidió** | Que el DMIT aporte a la patrulla ECU **máximo 2, mínimo 1** personas del área de Instrucción |
| **Cómo se implementó el máximo** | `form_cupo_compartido = 2`. Lo aplica `composicion-personal.ts` en cada asignación, que es donde un techo tiene sentido |
| **Cómo se implementó el mínimo** | **No existe columna para un mínimo.** Se exige al **cerrar la jornada**, en `CuadroDiarioService.cerrar()`, junto a INV-11 y por el mismo motivo que declara PV-05: el aporte llega después del registro. Aplicarlo en cada asignación rechazaría siempre a la primera persona (PV-29) |
| **Qué hay que ratificar** | **Que sea un bloqueo y no un aviso**, con la consecuencia que eso tiene |

> **La consecuencia, dicha sin rodeos.** Si un día no queda nadie del área de Instrucción a quien
> asignar —de baja, ausente, o ya asignado a otro operativo que se cruza—, la Dirección **no puede
> cerrar el cuadro**, y no hay excepción prevista.
>
> **Hoy el riesgo es real y medible**: el maestro tiene **una sola persona activa** del área de
> Instrucción. Dos patrullas ECU con horarios que se crucen en la misma jornada bastan para que la
> segunda no pueda cumplir el mínimo.
>
> **La salida es de datos, no de código**: retirar el rol compartido del formulario lo saca de la
> comprobación. Pero conviene decidirlo antes de que ocurra un día a las 16H25.

> **Y el aviso llega antes que el bloqueo, desde el mismo día.** P-02 muestra en el panel del
> operativo qué áreas le faltan a la patrulla (RN-31 y RN-32). El servidor lo calculaba desde M-15
> y **ninguna pantalla lo pintaba**: el dato viajaba en cada respuesta y se tiraba.

- [ ] Ratificado · ¿Bloqueo o aviso? ________________________________

---

> **PV-25 y PV-26 no vienen del análisis.** Aparecieron al implementar el esquema el 2026-08-05.
> Son columnas obligatorias del modelo aprobado cuyos valores ninguna fuente aporta: el diseño las
> exigió y el insumo no las cubre. Documentado en `M02_ESQUEMA_BASE_DATOS.md` §8.

---

*Actualiza este documento tras cada sesión de validación y versiónalo junto al código.*
