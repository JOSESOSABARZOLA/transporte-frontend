# 06 · Manual de API

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
**67 endpoints** · 13 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

> **Colección de Postman:** `transporte-backend/docs/postman/`. Trae los 67 endpoints con sus
> cuerpos de ejemplo, más un entorno con las variables y los siete perfiles. Importe los dos
> archivos y seleccione el entorno.

---

## 1. Generalidades

| Dato | Valor |
|---|---|
| Base | `http://localhost:3003/api/v1` |
| Formato | JSON, salvo los PDF |
| Zona horaria | `America/Guayaquil` |
| CORS | Lista blanca por `CORS_ORIGINS` |

> **No hay Swagger ni OpenAPI.** `@nestjs/swagger` no está instalado y `main.ts` no lo configura.
> Este documento **es** la referencia de la API, junto con `docs/FASE4-arquitectura-tecnica.md` §8.
> Ver `DOCUMENTACION_INCONSISTENCIAS.md`.

### 1.1. Autenticación · cookie de sesión

**La identidad viaja en una cookie `HttpOnly`, y en ningún otro sitio.** No hay cabecera de
identidad, no hay `Authorization: Bearer`, y **el JavaScript del navegador no puede leer el token**.

```
Cookie: cuadro_colores_sesion=<JWT firmado por este módulo>
```

> **Retirada el 2026-08-18.** Antes la identidad viajaba en la cabecera `x-usuario-prueba` con un
> número del 1 al 6. **Cualquiera podía declararse `DIRECTOR`** enviando un 5 y ver la matriz
> consolidada entera. Esa cabecera ya no la lee nadie, y ninguna configuración puede devolverle
> significado.

#### Cómo se obtiene la cookie

```
portal de Auth  →  <origen>/auth/callback?code=…  →  POST /api/v1/auth/session/exchange
                                                     ↓
                                    el backend canjea el código contra Auth central,
                                    verifica la firma, resuelve el rol en t_usuario
                                    y responde con Set-Cookie: HttpOnly
```

| Endpoint | Acceso | Qué hace |
|---|---|---|
| `POST /api/v1/auth/session/exchange` | **Público** | Canjea el código del portal y emite la cookie |
| `GET /api/v1/auth/session` | Cookie | Devuelve el perfil vigente: `{username, displayName, rolCode}` |
| `POST /api/v1/auth/session/logout` | **Público** | Borra la cookie |

#### El reparto que hay que entender

**Auth central dice QUIÉN es; este módulo decide QUÉ ROL tiene.** El `username` que devuelve Auth
se resuelve contra `t_usuario.usua_identificador_ad`, y esa fila entrega el `RolDepartamental`.

No es una preferencia de diseño: **el canje de Auth no transmite el rol elegido**. Y tiene una
consecuencia operativa que conviene tener presente: **quien no tenga fila en `t_usuario` no entra**,
aunque Auth lo autentique correctamente. La respuesta distingue los dos casos con un mensaje escrito
para el funcionario, no para el desarrollador.

| Situación | Código |
|---|---|
| Sin cookie, o cookie inválida o vencida | `401` |
| Código del portal ya usado o caducado | `401` |
| Autenticado, pero sin alta en `t_usuario` o desactivado | `403` |
| Autenticado y con rol, pero el rol no puede tocar ese formulario | `403` |

#### Para probar con `curl`

Hace falta una cookie real: no hay atajo, y es justamente el punto. Se obtiene del navegador tras
ingresar por el portal, o firmando una con la clave del entorno de pruebas —que es lo que hace
`test/identidad-de-prueba.ts` en las suites de integración—.

```bash
curl -s -b "cuadro_colores_sesion=<token>" $BASE/matriz/2026-08-07
```

### 1.2. Correlación

Toda respuesta incluye `x-correlation-id`. Envíelo usted si quiere trazar una operación completa;
si no, el servidor lo genera. Aparece en el registro y en el cuerpo de los errores.

### 1.3. Forma de los errores

```json
{
  "correlacionId": "687f6b30-ffa4-490a-b520-6ffb76f2d36e",
  "timestamp": "2026-08-07T09:52:47.288-05:00",
  "ruta": "/api/v1/operativos",
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer. No puede tener patrulla dos días seguidos.",
  "detalles": { }
}
```

| Código HTTP | Cuándo |
|---|---|
| `400` | Validación de contrato, o campos fuera de contrato (`CAMPOS_NO_PERMITIDOS`) |
| `401` | Identidad no resuelta |
| `403` | Rol o formulario no autorizado |
| `404` | El recurso no existe |
| `409` | Regla de negocio o conflicto de concurrencia |
| `423` | **Ventana de carga cerrada** |

**Los mensajes están redactados para el funcionario.** Muéstrelos tal cual.

### 1.4. Los dieciocho códigos de dominio

`VENTANA_CARGA_CERRADA` · `FORMULARIO_NO_AUTORIZADO` · `ROL_NO_AUTORIZADO` ·
`CAMPOS_NO_PERMITIDOS` · `PERSONA_NO_DISPONIBLE` · `CONTRATO_NO_ADMITE_TURNO` ·
`PATRULLA_CONSECUTIVA` · `TOPE_SALIDAS_PESADAS` · `SOLAPAMIENTO_HORARIO` ·
`JORNADA_MAXIMA_SUPERADA` · `CUPO_COMPARTIDO_SUPERADO` · `AREA_NO_ADMITIDA` ·
`CONDUCTOR_PATRULLA_CONSECUTIVA` · `CONDICIONANTE_NOCTURNO` · `CUADRO_CERRADO` ·
`ADICIONAL_NO_ENCADENABLE` · `OPERATIVO_CON_ADICIONALES` · `CONFLICTO_CONCURRENCIA`

> Los dos nuevos llegaron el **20-AGO-2026** con el operativo adicional. Ver §7.

### 1.5. Paginación

Las consultas paginadas aceptan `pagina` (desde 1) y `tamanio` (**máximo 200**, por defecto 25) y
responden:

```json
{ "datos": [ … ], "meta": { "pagina": 1, "tamanio": 25, "total": 43, "totalPaginas": 2 } }
```

---

## 2. Estado del servicio

| Método | Ruta | Rol | Respuesta |
|---|---|---|---|
| `GET` | `/estado` | Público | `{ "servicio": "transporte-backend", "estado": "operativo" }` |

Es el punto que consultan las comprobaciones de salud del contenedor.

---

## 3. Formularios y catálogos

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/formularios/permitidos` | Cualquiera autenticado |
| `GET` | `/formularios/:codigo/catalogos` | Cualquiera autenticado |
| `GET` | `/formularios/:codigo/zonales/:zonalId/puntos` | Cualquiera autenticado |
| `GET` | `/zonales` | Cualquiera autenticado |

**`/formularios/permitidos` llega ya filtrado por rol.** Devuelve cada formulario con su `acceso`:
`ESCRITURA`, `COMPARTIDO` o `LECTURA`. Los roles transversales —DAF, Dirección, Administrador—
reciben los nueve con acceso de lectura.

Los diecisiete campos de la respuesta, verificados contra `aFormularioResponse`:

```json
{
  "id": 239, "numero": 1, "codigo": "FIJOS", "nombre": "OPERATIVOS DE CONTROL FIJOS",
  "colorFondo": "#A2C4C9", "colorAcento": "#000000", "colorNombre": "Verde azulado",
  "rolDueno": "DMIP_OPERATIVOS", "rolCompartido": null, "cupoCompartido": null,
  "politicaVehiculo": "NO_APLICA", "condicionanteNocturno": false, "esPatrulla": false,
  "capturaLibrePunto": false, "capturaLibreTipo": false, "orden": 1,
  "areas": [{ "area": "OPERATIVOS", "esCompartida": false }],
  "acceso": "LECTURA"
}
```

`id` es la clave sustituta y **es el único sitio donde se obtiene**: las tres altas de catálogo la
exigen como `formularioIds`. `numero` es el casillero institucional del 1 al 9 y no sirve para eso.

**`/formularios/:codigo/catalogos`** devuelve zonales, puntos, tipos de control, instituciones y
las dos banderas de captura libre. **Solo valores activos**: no hay forma de consultar los
desactivados.

**`capturaLibrePunto` y `capturaLibreTipo` eran una sola bandera hasta el 11-AGO-2026.** RN-20 dice
«los **catálogos** que lo prevén», y en el insumo aprobado `ADICIONALES` figura únicamente en
`tiposControl`, de los formularios 2 y 8. La columna única hacía que la interfaz ofreciera captura
libre de un punto de encuentro que ningún catálogo contempla. Hoy el punto es `false` en los nueve,
pero eso es **un valor, no una regla escrita en el código**.

---

## 4. Ventanas de carga

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/ventanas/estado` | Cualquiera autenticado |
| `GET` | `/administracion/ventanas` | `ADMINISTRADOR_DMIP` |
| `GET` | `/administracion/ventanas/:rol` | `ADMINISTRADOR_DMIP` |
| `PUT` | `/administracion/ventanas/:rol` | `ADMINISTRADOR_DMIP` |

**`/ventanas/estado` no lleva parámetro de rol**: el servidor lo resuelve de la identidad. Devuelve
`abierta`, `activo`, `horaApertura`, `horaCierre`, `zonaHoraria` y el `mensaje` redactado.

**No hay `POST` ni `DELETE`**: hay exactamente una ventana por rol. Eliminar una **abriría** la
carga las veinticuatro horas, porque la ausencia de ventana significa «sin restricción». Se
desactiva con `activo: false`.

`PUT` responde `{ ventana, advertencias: string[] }`. Las advertencias no impiden nada.

---

## 5. Parámetros de política

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/parametros` | `ADMINISTRADOR_DMIP` |
| `GET` | `/parametros/:clave` | `ADMINISTRADOR_DMIP` |
| `PUT` | `/parametros/:clave` | `ADMINISTRADOR_DMIP` |

Cada parámetro viaja con `valor`, `tipo`, `descripcion`, `unidad`, `minimo`, `maximo`,
`modificadoPor` y `modificadoEn`. **El rango viaja con el valor**, lo que permite validar en el
cliente sin duplicar la regla.

`PUT` acepta **una sola propiedad**: `{ "valor": "14:00" }`. Cualquier intento de cambiar el tipo,
el rango o la clave se rechaza con `400`.

---

## 6. Cuadro diario

| Método | Ruta | Rol |
|---|---|---|
| `POST` | `/cuadros` | `ADMINISTRADOR_DMIP` |
| `GET` | `/cuadros/:fecha` | Cualquiera autenticado |
| `POST` | `/cuadros/:fecha/cerrar` | `DIRECTOR` |
| `POST` | `/cuadros/:fecha/reabrir` | `DIRECTOR` |

```json
POST /cuadros   { "fecha": "2026-08-07" }
```

**Una sola propiedad.** La fecha se escribe `AAAA-MM-DD` y se interpreta **en UTC**. La semana, el
año y **la orden de trabajo** se derivan de ella: la orden se genera como `AMC-AAAA-MM-DD` (PV-28,
resuelto el 07-AGO-2026) y **enviarla produce `400 CAMPOS_NO_PERMITIDOS`**.

La respuesta trae el estado, la semana y `admiteEscritura`, ya calculado.

> **Desde el 11-AGO-2026 este endpoint rara vez hace falta.** Registrar el primer operativo del día
> **abre la jornada solo**, salvo que la fecha ya haya pasado. `POST /cuadros` queda para abrir
> jornadas por adelantado y como salida de emergencia. La apertura era una precondición sin dueño:
> `FASE2` §5.3 la declara disparador de PROC-02 pero no define ningún proceso ni actor que la
> ejecute.

**Cerrar** exige que el cuadro esté `APROBADO` y que ningún operativo nocturno con vehículo
obligatorio siga sin conductor; si lo hay, responde `409` nombrándolo.

**Y a `APROBADO` no lo lleva nadie: lo lleva el reloj.** El estado avanza al vencer las ventanas de
carga —primero las departamentales, después la de la DAF—. Si `cerrar` responde *«el cuadro todavía
está en asignación de transporte»*, lo que falta es que cierre la ventana de la DAF, no una acción
de una persona.

---

## 7. Operativos

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/operativos?fecha=&formulario=&pagina=&tamanio=` | Los tres de carga, DAF y Dirección |
| `GET` | `/operativos/:id` | Ídem |
| `POST` | `/operativos` | Los tres de carga |
| `POST` | `/operativos/:id/adicional` | Los tres de carga **y `DIRECTOR`** |
| `PATCH` | `/operativos/:id` | Los tres de carga |
| `POST` | `/operativos/:id/personal` | Los tres de carga |
| `DELETE` | `/operativos/:id/personal/:funcionarioId` | Los tres de carga |
| `DELETE` | `/operativos/:id?version=` | Los tres de carga |

**La consulta llega ya filtrada por rol**: cada departamento recibe lo suyo; DAF y Dirección, la
jornada completa.

### `POST /operativos`

```json
{
  "cuadroFecha": "2026-08-07",
  "formularioCodigo": "FIJOS",
  "horaInicio": "08:00",
  "horaFin": "12:00",
  "zonalesIds": [1],
  "puntoEncuentroId": 4,
  "tipoControlId": 30,
  "institucionesIds": [2],
  "personalIds": [150, 151],
  "observaciones": "opcional"
}
```

- **`personalIds` es opcional y funciona como todo o nada.** Desde el 11-AGO-2026 el operativo y su
  personal se guardan **en una sola transacción**: si alguna persona es rechazada, responde `409`
  con su motivo y **no se crea nada**. Antes se creaba el operativo y se asignaba después, una
  petición por persona, así que un rechazo dejaba un operativo vacío en el cuadro.
- **Abre la jornada si no existe**, salvo que la fecha ya haya pasado. Quien registra queda como
  autor de la apertura en la auditoría.
- `puntoLibre` y `tipoLibre` sustituyen a sus identificadores cuando **el catálogo correspondiente**
  admite captura libre. **Enviar los dos a la vez se rechaza**, y desde el 11-AGO-2026 el servidor
  también rechaza un punto libre en un formulario cuyo catálogo de puntos no lo prevé —hasta
  entonces lo aceptaba en los nueve, y solo la interfaz lo contenía—.
- **No acepta `conductorId` ni `vehiculoId`**: nacen nulos y solo la DAF los completa (RN-40).
- El identificador y el secuencial los genera el servidor.

> **`POST /operativos/:id/personal` sigue existiendo** y conserva el comportamiento contrario, a
> propósito: una persona por petición, con su propio veredicto, y una rechazada no afecta a las que
> ya están dentro. Es lo que usa la pantalla de edición sobre un operativo ya registrado.

### `POST /operativos/:id/adicional`

> Incorporado el **20-AGO-2026**, a solicitud del negocio sobre el formulario PMO.

Un **adicional** es una salida extraordinaria que se dispone **por urgencia el mismo día en que se
ejecuta**, colgando de un operativo que ya estaba planificado. `:id` es ese operativo.

> **El caso normal es que el cuadro ya esté cerrado.** La operación arma el cuadro, consolida la
> matriz, la cierra, y **entonces** llega la urgencia. Por eso `DIRECTOR` se sumó al endpoint el
> 20-AGO-2026: RN-58 exige *autorización de la Dirección* para tocar un cuadro cerrado, y ella es
> la autorización. Un rol departamental sigue recibiendo `409 CUADRO_CERRADO`.

```json
{
  "horaInicio": "14:00",
  "horaFin": "18:00",
  "zonalesIds": [1],
  "puntoEncuentroId": 4,
  "tipoControlId": 30,
  "institucionesIds": [2],
  "personalIds": [150],
  "observaciones": "opcional"
}
```

- **Es el cuerpo de `POST /operativos` menos `cuadroFecha` y `formularioCodigo`**, que se heredan
  del operativo del que nace. **Enviarlos responde `400 CAMPOS_NO_PERMITIDOS`**: un adicional en
  otra fecha no es un adicional, y en otro formulario llevaría un prefijo que no corresponde.
- **Numera en serie aparte y con prefijo propio.** El primero del día es `OCAPMO-001` aunque el
  formulario lleve seis operativos ordinarios. Los dos `001` conviven porque el prefijo los separa.
- **`personalIds` funciona como todo o nada**, igual que en el registro ordinario.
- **No exige la ventana de carga**, y es la única escritura del sistema que no lo hace. Todo lo
  demás se comprueba igual:

| Comprobación | ¿Se aplica? |
|---|---|
| Identidad y rol | **Sí** |
| Propiedad del formulario | **Sí** · `403 FORMULARIO_NO_AUTORIZADO` |
| Cuadro cerrado por la Dirección | **Solo para los roles departamentales** · `409 CUADRO_CERRADO`. La Dirección puede: ella es la autorización que RN-58 exige |
| Ventana de carga | **No** |
| Auditoría | **Sí, y reforzada.** Ver abajo |

**La traza deja dos asientos**, y el segundo es lo que hace la excepción *auditable* en lugar de
meramente permitida:

| Campo | Valor |
|---|---|
| `oper_origen_id` | El **identificador** del operativo del que nació, no su número de fila |
| `ventana_carga` | `abierta al crear el adicional`, o `cerrada (cerró a las 14H50) · adicional creado como excepción` |

Así se puede responder *«¿cuántos adicionales se crearon fuera de ventana el mes pasado?»*, que es
la pregunta que justifica la excepción.

**Dos rechazos propios:**

| Código | Situación | Qué hacer |
|---|---|---|
| `409 ADICIONAL_NO_ENCADENABLE` | `:id` ya es un adicional | Colgarlo del operativo original de la jornada |
| `409 OPERATIVO_CON_ADICIONALES` | Se intenta **retirar** un operativo con adicionales vigentes | Retirar primero el adicional |

La respuesta es un operativo completo, con tres campos nuevos que también viajan en `GET`:
`esAdicional`, `origen` —`{ id, identificador }` o `null`— y `adicionales`, el conteo de los que
cuelgan de él.

### `PATCH /operativos/:id`

Exige `version` — bloqueo optimista. Sin ella, `400`; con una versión vieja, `409`.

### `DELETE /operativos/:id`

**Dos bajas distintas** (PV-10, decidido el 07-AGO-2026). Exige `?version=`.

| Situación | Qué ocurre | Respuesta |
|---|---|---|
| **Sin órdenes emitidas** | La fila **se borra**. Caen con ella el personal, las zonales, las instituciones y las solicitudes de apoyo (`CASCADE`). El secuencial **se reutiliza** | `eliminado: true` |
| **Con órdenes emitidas** | La fila se conserva desactivada. No es preferencia: `fk_orden_operativo` es `RESTRICT` y una orden ya comunicada no puede quedarse sin origen | `eliminado: false`, `ordenesEmitidas: n` |
| **Con adicionales ya retirados** | Igual: `fk_operativo_origen` también es `RESTRICT` y esa fila sigue existiendo | `eliminado: false` |
| **Con adicionales vigentes** | **No se retira.** Retirar el original dejaría colgando una salida que va a ocurrir hoy | `409 OPERATIVO_CON_ADICIONALES` |

```json
{ "id": 450, "identificador": "OCECU-002-07-AGO-2026",
  "retirado": true, "eliminado": true, "ordenesEmitidas": 0 }
```

La traza de auditoría se escribe en los dos casos y **nombra el identificador en
`valorAnterior`**: `fk_auditoria_operativo` es `SET NULL`, así que tras el borrado la fila de
auditoría sobrevive sin enlace y el identificador es lo único que la deja legible.

---

## 8. Solicitudes de apoyo

| Método | Ruta | Rol |
|---|---|---|
| `POST` | `/operativos/:id/apoyo` | Los tres de carga |
| `GET` | `/operativos/:id/apoyo` | Los tres de carga, DAF y Dirección |
| `GET` | `/solicitudes-apoyo` | Los tres de carga, DAF y Dirección |

> El flujo está incompleto por decisión pendiente (PV-12): se registra en `SOLICITADA` y **no hay
> transiciones**.

---

## 9. Personal

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/personal/elegible?formulario=&inicio=&horaInicio=&horaFin=` | Los tres de carga |
| `GET` | `/administracion/personal?direccion=&area=&incluirInactivos=` | `ADMINISTRADOR_DMIP` |
| `GET` | `/administracion/personal/:id` | `ADMINISTRADOR_DMIP` |
| `POST` | `/administracion/personal` | `ADMINISTRADOR_DMIP` |
| `PUT` | `/administracion/personal/:id` | `ADMINISTRADOR_DMIP` |
| `DELETE` | `/administracion/personal/:id` | `ADMINISTRADOR_DMIP` |
| `GET` | `/administracion/personal/:id/disponibilidad` | `ADMINISTRADOR_DMIP` |
| `POST` | `/administracion/personal/:id/disponibilidad` | `ADMINISTRADOR_DMIP` |
| `DELETE` | `/administracion/personal/:id/disponibilidad/:periodoId` | `ADMINISTRADOR_DMIP` |
| `GET` | `/administracion/directorio` | `ADMINISTRADOR_DMIP` |

**Dos respuestas distintas para el mismo funcionario, y es deliberado:**

- `/administracion/personal` devuelve la ficha completa, **con cédula y teléfono**.
- `/personal/elegible` devuelve solo lo que hace falta para elegir, **sin cédula ni teléfono**. Un
  campo que no existe en el contrato no se filtra por descuido.

```json
[{ "id": 150, "apellidos": "SOSA BARZOLA", "nombres": "JOSE LUIS",
   "area": "OPERATIVOS", "cargo": "Agente",
   "elegible": false,
   "motivo": "SOSA BARZOLA JOSE LUIS ya está asignada al operativo OCF-001-12-AGO-2026 de 08H00 A 14H30, que se cruza con este horario." }]
```

**Devuelve TODOS los candidatos del formulario, con su veredicto** — `elegible`, y el `motivo`
redactado cuando no lo es. Desde el **11-AGO-2026**: hasta entonces descartaba a quien no podía
salir y quien faltaba desaparecía sin explicación (**PV-37** y **F-08**, ya resueltos).

**El motivo de una ausencia no dice su causa.** Las reglas de descanso explican su rechazo entero;
una ausencia informa de que la hay, nunca de si es reposo médico o calamidad doméstica.

> Cuidado al leer versiones anteriores de este manual: antes del 07-AGO describía un contrato con
> `funcionarioId`, `elegible` y `motivo` que el servidor **nunca envió** (`DOCUMENTACION_INCONSISTENCIAS.md`,
> I-03c). El de hoy sí existe y está verificado contra el servicio en marcha.

**Las horas van juntas o no van**: con una sola no se puede formar el rango.

`DELETE` sobre un funcionario es **baja lógica** y responde con `operativosHistoricos` y el motivo
redactado.

### `GET /administracion/directorio`

Añadido el **21-AGO-2026**. Devuelve las personas **activas en Auth central** cruzadas por cédula
con las fichas locales. **No escribe nada**: es el insumo con el que se dan de alta las fichas que
faltan, y resuelve el bloqueante **PV-02**.

```json
[{ "authId": 42, "cedula": "1712345678", "nombre": "PEREZ LOPEZ JUAN CARLOS",
   "usuario": "jcperez", "correo": "jcperez@amc.gob.ec", "dependencia": "DMIP",
   "roles": ["(Cuadro de Colores) Administrador"],
   "inspector": { "tipo": "IT", "zonal": "Zonal Norte", "codigo": "IT-014" },
   "ficha": { "id": 150, "apellidos": "PEREZ LOPEZ", "nombres": "JUAN CARLOS",
              "area": "GENERAL", "tipoContrato": "NOMBRAMIENTO", "activo": true } }]
```

`ficha: null` significa que esa persona **no puede ser convocada a un operativo** todavía.

**Cuatro límites que vienen de Auth, no de aquí:**

- **Auth no conoce el tipo de contrato.** Ni el área, ni el cargo, ni el teléfono. El contrato
  gobierna RN-26 y RN-33, y se sigue capturando al crear la ficha.
- **`GET /users` de Auth no pagina ni filtra.** Devuelve la institución entera; el filtro por
  activos y la paginación se hacen de este lado.
- **Auth no tiene token de servicio.** Se consulta con el token de la sesión de quien pregunta,
  conservado dentro de la cookie de sesión. Una sesión abierta **antes del 21-AGO-2026** no lo
  lleva: el endpoint responde con un mensaje que pide volver a entrar.
- **El nombre viene en un solo campo** y se parte por heurística. Llega editable al formulario.

Si Auth no responde o el ambiente no tiene `AUTH_API_URL`, responde **`503` con código
`AUTH_NO_DISPONIBLE`** y el motivo redactado, arrastrando el texto que dio Auth. La administración
del maestro no depende de este endpoint.

> **Auth no usa `401` en `/users`: rechaza con `500` y el motivo en el cuerpo**, y exige el prefijo
> `Bearer` en la cabecera. Sin él responde «Token no encontrado», **igual que a una petición sin
> cabecera**, así que un token mal enviado y un token ausente son indistinguibles desde fuera.
> Comprobado contra el servicio desplegado el 21-AGO-2026.

---

## 10. Transporte

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/transporte/pendientes/:fecha` | DAF y Dirección |
| `GET` | `/transporte/conductores?fecha=` | DAF y Dirección |
| `PATCH` | `/transporte/operativos/:id` | **Solo DAF** |
| `PATCH` | `/transporte/operativos/:id/propios-medios` | **Solo DAF** |
| `GET` | `/transporte/capacidad/:fecha` | DAF y Dirección |
| `PUT` | `/transporte/capacidad/:fecha` | DAF y `ADMINISTRADOR_DMIP` |

### `PATCH /transporte/operativos/:id`

```json
{ "conductorId": 10, "vehiculoId": 55 }
```

**Exactamente dos propiedades.** Cualquier campo adicional produce `400 CAMPOS_NO_PERMITIDOS` con
la lista de rechazados. Es la garantía escrita de que la DAF no toca el resto del operativo.

`propios-medios` **no lleva cuerpo**: la decisión es el propio acto.

`/transporte/pendientes/:fecha` devuelve **solo los pendientes**, con los nocturnos primero, y
**sin el personal asignado** —solo cuántas personas van, que es de lo que depende el tamaño del
vehículo—.

> **La DAF no puede listar la flota.** `GET /administracion/vehiculos` es del `ADMINISTRADOR_DMIP`. Su
> única vía es el `vehiculoHabitual` que viaja en `/transporte/conductores` (PV-33).

---

## 11. Administración de flota

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/administracion/conductores?incluirInactivos=` | `ADMINISTRADOR_DMIP` |
| `POST` | `/administracion/conductores` | `ADMINISTRADOR_DMIP` |
| `PATCH` | `/administracion/conductores/:id` | `ADMINISTRADOR_DMIP` |
| `DELETE` | `/administracion/conductores/:id` | `ADMINISTRADOR_DMIP` |
| `GET` | `/administracion/vehiculos?incluirInactivos=` | `ADMINISTRADOR_DMIP` |
| `POST` | `/administracion/vehiculos` | `ADMINISTRADOR_DMIP` |
| `PATCH` | `/administracion/vehiculos/:id` | `ADMINISTRADOR_DMIP` |
| `DELETE` | `/administracion/vehiculos/:id` | `ADMINISTRADOR_DMIP` |

`DELETE` es baja lógica y responde con **`operativosHistoricos`** y el motivo.

> **Este manual decía `usosHistoricos` hasta el 20-AGO-2026, y estaba equivocado.** Ese nombre es
> el de los catálogos (§12); la flota y el personal usan `operativosHistoricos`. Se detectó al
> escribir la pantalla P-12 contra el contrato documentado.

**Los administra la pantalla P-12** desde el 20-AGO-2026. Antes solo se podían usar con `curl`.

Dos asimetrías del contrato que conviene conocer antes de consumirlo:

- **`POST` y `PATCH` de conductores devuelven solo `{ id, nombreCompleto }`**, no la ficha
  completa; los de vehículos sí devuelven el registro entero. Quien escriba debe releer la lista.
- **Ninguno de los dos `PATCH` admite `activo`**, a diferencia de `PUT /administracion/personal/:id`.
  La baja de un conductor o un vehículo **no se puede deshacer por API**.

---

## 12. Catálogos del cuadro

| Método | Ruta | Rol |
|---|---|---|
| `POST` `PUT` `DELETE` | `/administracion/catalogos/puntos[/:id]` | `ADMINISTRADOR_DMIP` |
| `POST` `PUT` `DELETE` | `/administracion/catalogos/tipos-control[/:id]` | `ADMINISTRADOR_DMIP` |
| `POST` `PUT` `DELETE` | `/administracion/catalogos/instituciones[/:id]` | `ADMINISTRADOR_DMIP` |

**Nueve operaciones de escritura y ningún `GET`.** Para leer se usa
`/formularios/:codigo/catalogos`, que devuelve **solo lo activo** (PV-36).

Al crear se envía `formularioIds`: **omitirlo no significa «todos»**, significa que el valor no
queda vinculado a ningún formulario y no aparece en ninguna cascada.

`DELETE` **desactiva, no borra** (RF-058), y responde con `usosHistoricos` y el motivo.

---

## 13. Matriz consolidada

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/matriz/:fecha` | **Solo `DIRECTOR`** |
| `GET` | `/matriz/:fecha/exportar` | **Solo `DIRECTOR`** |

`GET /matriz/:fecha` devuelve `cabecera` —orden de trabajo, fecha natural, semana, estado, totales
y flota— y `secciones`, una por formulario, con su color, su responsable, sus filas y su
`evidencia` cuando quedó vacío.

`exportar` responde un **PDF horizontal** como descarga (`Content-Disposition: attachment`).

---

## 14. Órdenes de servicio

| Método | Ruta | Rol |
|---|---|---|
| `POST` | `/operativos/:id/ordenes-servicio` | **Solo `DIRECTOR`** |
| `GET` | `/operativos/:id/ordenes-servicio` | **Solo `DIRECTOR`** |
| `GET` | `/ordenes-servicio/mias?desde=` | **Cualquier usuario autenticado** |
| `GET` | `/ordenes-servicio/:codigo/documento` | Cualquier usuario autenticado |

Emitir crea **una orden por funcionario asignado**. Rechaza con `409` si el operativo no tiene
personal.

### El dato aislado · cuatro campos

```json
{
  "codigo": "OS-ICNECU-001-07-AGO-2026-7-1",
  "emitidaEn": "2026-08-07T18:00:00.000Z",
  "vigente": true,
  "fechaJornada": "2026-08-07",
  "datoAislado": {
    "horario": "18H00 A 23H30",
    "funcionario": "YUNDA JESSICA",
    "conductor": { "nombre": "VIVANCO JORGE", "telefono": "0978631797" },
    "placa": "PMA7892"
  }
}
```

**Cuatro campos y ninguno más** (INV-24, RN-50). No incluye punto de encuentro ni el resto del
personal: la filtración del cuadro completo era el problema que originó el encargo.

**`/ordenes-servicio/mias` no acepta ningún parámetro que diga de quién son.** El funcionario sale
del usuario autenticado y de ningún otro sitio. `/documento` comprueba que la orden **sea de quien
la pide**, y si no lo es responde igual que si no existiera.

Reemitir marca la anterior como no vigente y la conserva.

---

## 15. Ejemplos

Todo lo que no sea `/estado` exige la cookie de sesión. Se obtiene ingresando por el portal y
copiándola del navegador —Application → Cookies—; con `-b` se envía.

```bash
BASE=http://localhost:3003/api/v1
OPERATIVOS="cuadro_colores_sesion=<cookie de un usuario DMIP_OPERATIVOS>"
DIRECTOR="cuadro_colores_sesion=<cookie de un usuario DIRECTOR>"

curl -s $BASE/estado                                   # público, no pide cookie
curl -s -b "$OPERATIVOS" $BASE/formularios/permitidos
curl -s -b "$OPERATIVOS" $BASE/ventanas/estado

curl -s -X POST -b "$OPERATIVOS" -H "Content-Type: application/json" $BASE/operativos -d '{
  "cuadroFecha":"2026-08-07","formularioCodigo":"FIJOS",
  "horaInicio":"08:00","horaFin":"12:00","zonalesIds":[1],
  "puntoEncuentroId":4,"tipoControlId":30,"institucionesIds":[2]}'

curl -s -b "$DIRECTOR" $BASE/matriz/2026-08-07
curl -s -b "$DIRECTOR" -o matriz.pdf $BASE/matriz/2026-08-07/exportar
```

> **El rol va dentro de la cookie, firmado.** Cambiar de perfil no es cambiar un número en la
> petición: hay que ingresar con otra cuenta. Ésa es exactamente la propiedad que faltaba antes.

### Y una advertencia sobre verificar con `curl`

`curl` comprueba que el servidor responde. **No ejecuta JavaScript, no mantiene estado entre
páginas y no distingue contexto seguro.** Al cerrar esta integración, tres defectos reales
sobrevivieron a todas las comprobaciones de línea de comandos y solo aparecieron al abrir el sistema
en un navegador. Para el flujo de ingreso, **la comprobación tiene que pasar por un navegador**.
Ver `PLAN_INTEGRACION_AUTH.md` §13.
