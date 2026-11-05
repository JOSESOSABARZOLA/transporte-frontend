# 06 · Manual de API

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
**216 endpoints** en 40 controladores · 13 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> El inventario sale de los `*.controller.ts` de `transporte-backend/src/` (rama
> `base/cuadro-colores`, HEAD del backend `24520af`), leídos con un script que toma el prefijo de
> `@Controller`, el verbo y la ruta de cada manejador, su `@RequierePermiso` y el DTO de `@Body`.
> Son **215 manejadores en 39 controladores de `src/modules/`**, más `GET /estado` de
> `app.controller.ts`.
>
> Un recuento con `grep "@Get("` da 215: cinco de esas coincidencias están en comentarios
> (cuatro en `administracion-personal.controller.ts` y una en `directorio.controller.ts`) y no
> son rutas.

---

## 1. Generalidades

| Dato | Valor |
|---|---|
| Base | `http://localhost:3003/api/v1` (prefijo `api/v1`) |
| Formato | JSON, salvo los PDF y los `.xlsx` |
| Zona horaria | `America/Guayaquil` |
| Fechas | `AAAA-MM-DD`, interpretadas en UTC |
| CORS | Lista blanca por `CORS_ORIGINS` (obligatoria en producción) |
| Límite de peticiones | 300 por minuto por cliente (`LIMITE_MAXIMO`, `LIMITE_VENTANA_MS`); `429` al pasarlo. `/estado` está exento |

> **No hay Swagger ni OpenAPI.** `@nestjs/swagger` no está instalado. Este documento es la
> referencia de la API. Ya no existe la colección de Postman que citaba la versión de agosto.

### 1.1. Autenticación · cookie de sesión

**La identidad viaja en una cookie `HttpOnly`, y en ningún otro sitio.** No hay cabecera de
identidad ni `Authorization: Bearer`, y el JavaScript del navegador no puede leer el token.

```
Cookie: cuadro_colores_sesion=<JWT firmado por este módulo>
```

```
portal de Auth  →  <origen>/auth/callback?code=…  →  POST /api/v1/auth/session/exchange
                                                     ↓
                                    el backend canjea el código contra Auth central,
                                    resuelve los roles en t_usuario_rol
                                    y responde con Set-Cookie: HttpOnly
```

| Endpoint | Acceso | Qué hace |
|---|---|---|
| `POST /auth/session/exchange` | **Público** | Canjea el código del portal (`CanjearCodigoDto`) y emite la cookie |
| `GET /auth/session` | Cookie | Perfil vigente: `{ username, displayName, rolCodes, permisos }` |
| `POST /auth/session/logout` | **Público** | Borra la cookie |

**Auth central dice QUIÉN es; este módulo decide QUÉ ROLES tiene.** El `username` se resuelve
contra `t_usuario.usua_identificador_ad` y los roles salen de `t_usuario_rol`. Una persona puede
tener varios y valen todos a la vez. Quien no tenga cuenta aquí no entra, aunque Auth lo
autentique.

`permisos` es la unión de los permisos de sus roles, **releída de la base en cada respuesta**: no
viaja en el JWT, así que un cambio en «Permisos por rol» rige en la siguiente petición.

### 1.2. Autorización por permisos

Desde el 16-SEP-2026 cada endpoint protegido declara **`@RequierePermiso('modulo:accion')`** y
`PermisosGuard` lo valida contra `t_rol_permiso`. `@Roles` y `RolesGuard` ya no se usan.

```
IdentidadGuard → PermisosGuard → FormularioRolGuard → VentanaCargaGuard → ValidationPipe → Service
     401             403               403                423              400          409
```

- **Sin `@RequierePermiso`, basta la sesión**: `/formularios/*`, `/zonales`, `/ventanas/estado`,
  `/personal/elegible`, `/cuadros/:fecha`, `GET /administracion/jornadas-laborales`,
  `/ordenes-servicio/mias` y `/ordenes-servicio/:codigo/documento`.
- **Las rutas de la Dirección llevan `DirectorGuard` antes de `PermisosGuard`**: todo otro rol
  recibe `403 ROL_NO_AUTORIZADO` «Solo la Dirección emite órdenes de servicio.».
- **El `AdicionalesController` es la única escritura sin `VentanaCargaGuard`** (regla 9 de
  `transporte-backend/CLAUDE.md`).

Los 39 permisos y los roles que los tienen en la siembra de las migraciones
(`20260916180000_rbac_permisos` y posteriores). La matriz es editable en caliente desde
`PUT /administracion/roles/:rol/permisos`, así que un ambiente puede diferir:

| Permiso | Roles en la siembra |
|---|---|
| `operativos:leer` | DMIP_OPERATIVOS, DMIP_INSPECCIONES, DMIT_INSTRUCTOR, DAF, DIRECTOR |
| `operativos:registrar` · `:editar` · `:retirar` · `:personal:gestionar` · `:apoyo:solicitar` | Los tres departamentales |
| `operativos:adicional:crear` | Los tres departamentales y DIRECTOR |
| `operativos:apoyo:ver` | Los tres departamentales, DAF, DIRECTOR, ADMINISTRADOR_DMIP |
| `operativos:apoyo:bandeja` | Los tres departamentales, DIRECTOR, ADMINISTRADOR_DMIP |
| `jornada:ver` | Los tres departamentales |
| `cuadro:abrir` | ADMINISTRADOR_DMIP, ADMINISTRADOR |
| `cuadro:cerrar-reabrir` · `matriz:ver` · `ordenes:gestionar` | DIRECTOR |
| `transporte:asignar` · `:jornada:ver` · `:destino:fijar` · `:propios-medios` · `:desasignar` | DAF |
| `transporte:pendientes:ver` · `:conductores:ver` · `:destinos:ver` | DAF, DIRECTOR |
| `transporte:vehiculos:ver` | DAF, DIRECTOR, ADMINISTRADOR_DAF |
| `flota:administrar` · `flota:mantenimiento` · `flota:ausencias` | DAF, ADMINISTRADOR_DAF, ADMINISTRADOR |
| `flota:capacidad:ver` | DAF, DIRECTOR |
| `flota:capacidad:declarar` | DAF, ADMINISTRADOR_DMIP, ADMINISTRADOR |
| `personal:administrar` · `personal:directorio:ver` | ADMINISTRADOR_DMIP, ADMINISTRADOR_DMIT, ADMINISTRADOR |
| `catalogos:administrar` · `usuarios:administrar` · `ventanas:administrar` · `roles-auth:administrar` · `roles:ver` · `jornadas:administrar` | ADMINISTRADOR_DMIP, ADMINISTRADOR |
| `parametros:administrar` | ADMINISTRADOR_DMIP, ADMINISTRADOR_DMIT, ADMINISTRADOR_DAF, ADMINISTRADOR (cada administrador, solo sus claves) |
| `permisos:administrar` · `carga-inicial:administrar` | ADMINISTRADOR |

> En la base local del 5-NOV-2026 DIRECTOR **no** tiene `transporte:pendientes:ver`,
> `:conductores:ver`, `:destinos:ver` ni `:vehiculos:ver`: alguien los retiró desde la pantalla.
> Lo que manda es la tabla de cada ambiente.

### 1.3. Correlación

Toda respuesta incluye `x-correlation-id`. Envíelo para trazar una operación completa; si no, el
servidor lo genera. Aparece en la bitácora, en `t_auditoria.audi_correlacion` y en el cuerpo de
los errores.

### 1.4. Forma de los errores

Todos los errores pasan por `AllExceptionsFilter` (`src/common/filters/http-exception.filter.ts`):

```json
{
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer. No puede tener patrulla dos días seguidos.",
  "detalles": { "funcionarioId": 150 },
  "correlacionId": "687f6b30-ffa4-490a-b520-6ffb76f2d36e",
  "timestamp": "2026-08-07T09:52:47.288-05:00",
  "ruta": "/api/v1/operativos"
}
```

| Código HTTP | Cuándo | `codigo` típico |
|---|---|---|
| `400` | Validación del contrato, o campos fuera de contrato | `VALIDACION`, `CAMPOS_NO_PERMITIDOS` |
| `401` | Sin sesión, o sesión inválida o vencida | `NO_AUTENTICADO`, `APP-UNAUTHORIZED-001` |
| `403` | Permiso, rol o formulario no autorizado | `PERMISO_INSUFICIENTE`, `ROL_NO_AUTORIZADO`, `FORMULARIO_NO_AUTORIZADO` |
| `404` | El recurso no existe, o es de otro formulario | `RECURSO_NO_ENCONTRADO` |
| `409` | Regla de negocio o concurrencia | Ver §1.5 |
| `423` | **Ventana de carga cerrada** | `VENTANA_CARGA_CERRADA` |
| `429` | Límite de peticiones | — |
| `500` | Fallo propio. El mensaje es genérico y pide citar la correlación | `ERROR_INTERNO` |
| `503` | Falla una dependencia: Auth, Inspección, firma, o la base en `/estado` | `AUTH_NO_DISPONIBLE`, `INSPECCION_NO_DISPONIBLE`, `SERVICIO_FIRMA_NO_DISPONIBLE` |

- **`ValidationPipe` usa `whitelist` y `forbidNonWhitelisted`**: un campo que el DTO no declara
  produce `400 CAMPOS_NO_PERMITIDOS` con la lista de rechazados. Es la garantía de que la DAF no
  escriba más que conductor y vehículo.
- **Cuando el rechazo es de una persona**, `detalles.funcionarioId` la señala. El frontend pinta el
  motivo bajo esa persona.
- **Los mensajes están redactados para el funcionario.** Se muestran tal cual.

### 1.5. Los 42 códigos de dominio

Viven en `src/common/errors/codigos-error.ts`, más los genéricos `VALIDACION`,
`RECURSO_NO_ENCONTRADO`, `NO_AUTENTICADO`, `APP-UNAUTHORIZED-001` y `ERROR_INTERNO`.

| Grupo | Códigos |
|---|---|
| Acceso | `VENTANA_CARGA_CERRADA` · `FORMULARIO_NO_AUTORIZADO` · `ROL_NO_AUTORIZADO` · `PERMISO_INSUFICIENTE` · `CAMPOS_NO_PERMITIDOS` |
| Personal | `PERSONA_NO_DISPONIBLE` · `PERSONA_EN_DESCANSO` · `TURNO_FUERA_DE_RANGO` · `JORNADA_NO_ADMITE_TURNO` · `PATRULLA_CONSECUTIVA` · `TOPE_SALIDAS_PESADAS` · `SOLAPAMIENTO_HORARIO` · `JORNADA_MAXIMA_SUPERADA` · `CUPO_COMPARTIDO_SUPERADO` · `AREA_NO_ADMITIDA` · `APORTE_COMPARTIDO_PENDIENTE` |
| Cuadro y operativo | `CUADRO_CERRADO` · `ADICIONAL_NO_ENCADENABLE` · `OPERATIVO_CON_ADICIONALES` · `CONFLICTO_CONCURRENCIA` · `CAMBIO_TIPO_CON_TRANSPORTE` · `CAMBIO_CON_TRANSPORTE` · `COMPARTIR_CON_EXCLUSIVO` · `COMPARTIR_NO_COMPATIBLE` · `TRAMITE_INSPECCION_NO_VALIDO` |
| Transporte y flota | `CONDUCTOR_PATRULLA_CONSECUTIVA` · `CONDICIONANTE_NOCTURNO` · `VEHICULO_OCUPADO` · `ASIGNACION_NO_VIABLE` · `RECURSO_CON_ASIGNACION` · `MES_NO_PUBLICADO` |
| Catálogos y fichas | `CATALOGO_EN_USO` · `CATALOGO_DUPLICADO` · `FORMULARIO_DUPLICADO` · `NOMBRE_DUPLICADO` · `CEDULA_CON_FICHA` · `AUSENCIA_SOLAPADA` · `AUSENCIA_PASADA` · `PERSONA_NO_ENCONTRADA_EN_AUTH` |
| Dependencias | `AUTH_NO_DISPONIBLE` · `INSPECCION_NO_DISPONIBLE` · `SERVICIO_FIRMA_NO_DISPONIBLE` |

> **`CONTRATO_NO_ADMITE_TURNO` ya no existe.** Lo reemplazó `JORNADA_NO_ADMITE_TURNO` con la
> jornada laboral del 23-OCT. Para el conductor, la política de tramos usa los motivos
> `SIN_JORNADA`, `DIA_FUERA_DE_JORNADA` y `JORNADA_FUERA_DE_HORARIO`, que viajan como veredicto y no
> como código de error.

### 1.6. Paginación

`GET /operativos` acepta `pagina` (desde 1) y `tamanio` (**máximo 200**, por defecto 25) y
responde:

```json
{ "datos": [ … ], "meta": { "pagina": 1, "tamanio": 25, "total": 43, "totalPaginas": 2 } }
```

---

## 2. Inventario por controlador

En las tablas, «Sesión» quiere decir que basta estar autenticado. El permiso es el de
`@RequierePermiso`; los roles que lo tienen están en §1.2.

### 2.1. Estado y sesión · 4

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/estado` | Público | Salud del servicio. **`503` si la base no responde** |
| `POST` | `/auth/session/exchange` | Público | Canje del código del portal |
| `GET` | `/auth/session` | Sesión | Perfil, roles y permisos |
| `POST` | `/auth/session/logout` | Público | Cierre de sesión |

### 2.2. Configuración · 56

**`FormulariosController`, `ZonalesController`, `VentanasController` · 5**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/formularios/permitidos` | Sesión | Formularios del usuario con su `acceso` |
| `GET` | `/formularios/:codigo/catalogos` | Sesión | Zonales, puntos, tipos, instituciones y banderas del formulario. Solo lo activo |
| `GET` | `/formularios/:codigo/zonales/:zonalId/puntos` | Sesión | Puntos de una zonal del formulario |
| `GET` | `/zonales?incluirInactivas=` | Sesión | Zonas de la ciudad (personal, flota, cobertura) |
| `GET` | `/ventanas/estado` | Sesión | Estado de la ventana del rol de la sesión |

`/formularios/:codigo/catalogos` suma, además de los catálogos: `maxPersonas`, `elegirUnaArea`,
`prefijosPorArea` (28-OCT), `areasAdmitidas` y `esPatrulla` (4-NOV), y las banderas del registro
(`cantidadPorPersona`, `cantidadPorZona`, `tipoControlMultiple`, `puntoManual`…).

**`ZonasCiudadController` · 6** · permiso `catalogos:administrar` (2026-11-05)

Las zonas de la ciudad (`t_zonal`), la tabla maestra de las zonales. Contrato:
`transporte-backend/docs/CONTRATO-zonas-ciudad.md`.

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/zonas` | Todas, con `uso`, `formulariosActivos`, `paresSinTiempo` y si se pueden desactivar o eliminar (con el motivo) |
| `POST` | `/administracion/zonas` | `{ nombre, sector, orden? }`. 409 `CATALOGO_DUPLICADO` sin tildes ni mayúsculas |
| `PUT` | `/administracion/zonas/:id` | Nombre, sector u orden. El código no cambia. El DMQ, 400 |
| `DELETE` | `/administracion/zonas/:id` | Baja lógica. 409 `CATALOGO_EN_USO` si un formulario la tiene activa |
| `POST` | `/administracion/zonas/:id/reactivar` | Reactiva |
| `DELETE` | `/administracion/zonas/:id/permanente` | Borrado, solo sin uso. Sus pares de traslado se van con ella |

**`AdministracionCatalogosController` · 19** · permiso `catalogos:administrar`

Todo cuelga del formulario: un valor de otro formulario responde `404`.

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/catalogos/:codigo` | Catálogos del formulario, **incluidos los desactivados**, con `puedeEliminar` |
| `GET` | `/administracion/catalogos/:codigo/zonales` | Zonales del formulario con sus puntos y usos |
| `GET` | `/administracion/catalogos/:codigo/zonas-disponibles` | Zonas de la ciudad que el formulario aún no tiene |
| `POST` | `/administracion/catalogos/:codigo/zonales` | Alta de zonal (`CrearZonalDto`) |
| `PUT` | `/administracion/catalogos/:codigo/zonales/:zonaId` | Edición (`ActualizarZonalDto`) |
| `DELETE` | `/administracion/catalogos/:codigo/zonales/:zonaId` | Desactiva |
| `DELETE` | `/administracion/catalogos/:codigo/zonales/:zonaId/permanente` | Borra, solo si nunca se usó y no tiene puntos; si no, `409` |
| `POST` · `PUT` · `DELETE` · `DELETE …/permanente` | `/administracion/catalogos/:codigo/puntos[/:id]` | Alta, edición, desactivación y borrado físico de puntos |
| `POST` · `PUT` · `DELETE` · `DELETE …/permanente` | `/administracion/catalogos/:codigo/tipos-control[/:id]` | Ídem tipos de control |
| `POST` · `PUT` · `DELETE` · `DELETE …/permanente` | `/administracion/catalogos/:codigo/instituciones[/:id]` | Ídem instituciones |

Duplicados: `409 CATALOGO_DUPLICADO`. Borrar algo usado: `409 CATALOGO_EN_USO`.

**`AdministracionFormulariosController` y `AdministracionAreasController` · 7** · permiso `catalogos:administrar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/formularios` | Todos, incluidos los dados de baja |
| `GET` | `/administracion/formularios/paleta` | Paleta institucional de colores |
| `GET` | `/administracion/formularios/numero-libre` | Número libre más bajo (1–99), o `null` |
| `POST` | `/administracion/formularios` | Alta (`CrearFormularioDto`). Duplicado: `409 FORMULARIO_DUPLICADO` |
| `PUT` | `/administracion/formularios/:codigo` | Edición (`ActualizarFormularioDto`). Número, código y áreas no se cambian aquí: `400` |
| `DELETE` | `/administracion/formularios/:codigo` | Baja lógica |
| `PUT` | `/administracion/formularios/:codigo/areas` | Reemplaza las áreas admitidas (`ReemplazarAreasDto`) |

**`AdministracionVentanasController` · 3** · permiso `ventanas:administrar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/ventanas` | Las seis ventanas |
| `GET` | `/administracion/ventanas/:rol` | Una ventana |
| `PUT` | `/administracion/ventanas/:rol` | Edita (`ActualizarVentanaDto`). Responde `{ ventana, advertencias }` |

No hay `POST` ni `DELETE`: una ventana por rol. «Sin restricción» es el tipo `SIN_RESTRICCION`.

**`ParametrosController` · 4** · permiso `parametros:administrar`, con alcance por clave

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/parametros` | Las claves al alcance del rol |
| `PUT` | `/parametros` | **Guardado único** (`ActualizarParametrosDto`) |
| `GET` | `/parametros/:clave` | Una clave |
| `PUT` | `/parametros/:clave` | Una clave (`ActualizarParametroDto`: solo `{ "valor": "…" }`) |

```json
PUT /parametros   { "cambios": [ { "clave": "CARGA_OP_ALTA", "valor": "4" } ] }
```

- Entre 1 y 60 cambios. **Valida todos antes de escribir**: una clave inexistente da `404`; una
  repetida o fuera de rango, `400 VALIDACION` con `detalles.errores: [{ clave, motivo }]`, **y no
  guarda ninguna**.
- Una clave fuera del alcance del administrador da `403`.
- Si pasan, una transacción con su traza por clave; lo que no cambia no se escribe.
- Cada parámetro viaja con `valor`, `tipo`, `descripcion`, `unidad`, `minimo`, `maximo`,
  `valorSiembra`, `opciones`, `modificadoPor`, `modificadoPorNombre` y `modificadoEn`.

**`JornadasLaboralesController` · 4**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/administracion/jornadas-laborales` | Sesión | Catálogo, con cuántos funcionarios y conductores usan cada jornada |
| `POST` | `/administracion/jornadas-laborales` | `jornadas:administrar` | Alta (`GuardarJornadaLaboralDto`) |
| `PUT` | `/administracion/jornadas-laborales/:id` | `jornadas:administrar` | Edición |
| `PATCH` | `/administracion/jornadas-laborales/:id/activo` | `jornadas:administrar` | Activa o desactiva (`{ "activo": false }`). No se borra |

```json
POST /administracion/jornadas-laborales
{ "nombre": "Lunes a Viernes 8 horas", "dias": [1,2,3,4,5], "horaInicio": "08:00", "horaFin": "16:00" }
```

`dias` va de 1 (lunes) a 7 (domingo). Sin `horaInicio`/`horaFin`, la jornada admite cualquier hora
de esos días (la 24/7). Nombre repetido: `409 NOMBRE_DUPLICADO`.

**Roles, permisos y correspondencia con Auth · 8**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/administracion/roles` | `roles:ver` | Catálogo `t_rol` |
| `GET` | `/administracion/permisos` | `permisos:administrar` | Catálogo de permisos |
| `GET` | `/administracion/roles/:rol/permisos` | `permisos:administrar` | Permisos de un rol |
| `PUT` | `/administracion/roles/:rol/permisos` | `permisos:administrar` | Reemplaza los permisos de un rol (`GuardarPermisosRolDto`); invalida la caché |
| `GET` | `/administracion/roles-auth` | `roles-auth:administrar` | Correspondencia con Auth |
| `POST` | `/administracion/roles-auth` | `roles-auth:administrar` | Alta (`CrearRolAuthDto`) |
| `PUT` | `/administracion/roles-auth/:idAuth` | `roles-auth:administrar` | Edición |
| `DELETE` | `/administracion/roles-auth/:idAuth` | `roles-auth:administrar` | Desactiva |

### 2.3. Identidad · 5

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/administracion/usuarios` | `usuarios:administrar` | Cuentas |
| `POST` | `/administracion/usuarios` | `usuarios:administrar` | Alta (`CrearUsuarioDto`) |
| `PUT` | `/administracion/usuarios/:id` | `usuarios:administrar` | Edición y reactivación (`ActualizarUsuarioDto`) |
| `DELETE` | `/administracion/usuarios/:id` | `usuarios:administrar` | Desactiva |
| `GET` | `/administracion/directorio` | `personal:directorio:ver` | Personas activas de Auth cruzadas por cédula con las fichas |

`/administracion/directorio` responde `{ disponible, motivo, personas }`: que Auth no conteste es
un estado, no un error. Se consulta con el token de Auth de la sesión, porque Auth no tiene token
de servicio.

### 2.4. Cuadro diario · 4

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `POST` | `/cuadros` | `cuadro:abrir` | Abre una jornada por adelantado (`{ "fecha": "AAAA-MM-DD" }`) |
| `GET` | `/cuadros/:fecha` | Sesión | Estado, semana y `admiteEscritura` |
| `POST` | `/cuadros/:fecha/cerrar` | `cuadro:cerrar-reabrir` | Cierra. Exige `APROBADO` y el aporte compartido completo **por registro** |
| `POST` | `/cuadros/:fecha/reabrir` | `cuadro:cerrar-reabrir` | Reabre y borra el historial de jornada de esa fecha |

El primer operativo del día abre la jornada solo; `POST /cuadros` queda para abrir por adelantado.
A `APROBADO` lo lleva el reloj al vencer las ventanas, no una persona.

### 2.5. Operativos · 24

**`OperativosController` · 19** · cadena completa con `FormularioRolGuard` y `VentanaCargaGuard`

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/operativos?fecha=&desde=&hasta=&formulario=&pagina=&tamanio=` | `operativos:leer` | Listado paginado, filtrado por la unión de roles departamentales |
| `GET` | `/operativos/rango` | `operativos:leer` | «Mis operativos» por rango; máximo `MIS_OPERATIVOS_RANGO_MAX_DIAS` |
| `GET` | `/operativos/conteo?fecha=` | `operativos:leer` | `[{ formularioId, total }]`: el «N hoy» del selector |
| `GET` | `/operativos/coincidencias-transporte` | `operativos:leer` | Operativos del propio ámbito con mismo día, punto, zonal y horario, para compartir unidad |
| `GET` | `/operativos/proximo-identificador?fecha=&formulario=&area=` | `operativos:registrar` | Prefijo y siguiente número, sin reservarlo |
| `POST` | `/operativos/por-zonas` | `operativos:registrar` | **Registro por zonas** del formulario 8 (`RegistrarPorZonasDto`) |
| `PUT` | `/operativos/registro/:grupoRegistro/zonas` | `operativos:editar` | Edita el registro por zonas con su estado final (`EditarPorZonasDto`) |
| `DELETE` | `/operativos/registro/:grupoRegistro` | `operativos:retirar` | **Retira el registro completo**: todos sus códigos, todo o nada |
| `GET` | `/operativos/:id` | `operativos:leer` | Un operativo |
| `POST` | `/operativos` | `operativos:registrar` | Registro (`CrearOperativoDto`) |
| `PATCH` | `/operativos/:id` | `operativos:editar` | Edición con `version` (`ActualizarOperativoDto`) |
| `PATCH` | `/operativos/patrulla/:grupoRegistro` | `operativos:editar` | Datos comunes de una patrulla 5/6 (`EditarPatrullaDto`) |
| `POST` | `/operativos/:id/personal` | `operativos:personal:gestionar` | Asigna una persona (`AsignacionPersonalDto`); en la patrulla, el aporte crea su propio código |
| `PUT` | `/operativos/:id/personal/lote` | `operativos:personal:gestionar` | **Conjunto final** de personas, todo o nada (`GuardarPersonalLoteDto`) |
| `PATCH` | `/operativos/:id/personal/:funcionarioId` | `operativos:personal:gestionar` | Cambia el turno de una persona y re-deriva la ventana |
| `PUT` | `/operativos/:id/personal/:funcionarioId/tramite` | `operativos:personal:gestionar` | Fija o quita el trámite de Inspección de un inspector |
| `PUT` | `/operativos/:id/personal` | `operativos:personal:gestionar` | Reemplaza a la persona (`ReemplazarPersonalDto`), misma área |
| `DELETE` | `/operativos/:id/personal/:funcionarioId` | `operativos:personal:gestionar` | Retira una persona |
| `DELETE` | `/operativos/:id?version=` | `operativos:retirar` | Retira un operativo (borra o baja lógica, PV-10) |

**`AdicionalesController` · 1**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `POST` | `/operativos/:id/adicional` | `operativos:adicional:crear` | Adicional del día, **sin ventana de carga** (`CrearAdicionalDto`) |

**`SolicitudesApoyoController` · 3** y **`TramitesInspeccionController` · 1**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `POST` | `/operativos/:id/apoyo` | `operativos:apoyo:solicitar` | Solicita personal a otra dirección |
| `GET` | `/operativos/:id/apoyo` | `operativos:apoyo:ver` | Solicitudes de un operativo |
| `GET` | `/solicitudes-apoyo` | `operativos:apoyo:bandeja` | Bandeja. Solo hay `SOLICITADA` (PV-12) |
| `GET` | `/inspeccion/tramites` | `operativos:registrar` | Trámites que Inspección asignó a los inspectores en la fecha. `503 INSPECCION_NO_DISPONIBLE` si no responde |

#### `POST /operativos`

```json
{
  "cuadroFecha": "2026-11-05",
  "formularioCodigo": "FIJOS",
  "zonalesIds": [1],
  "puntoEncuentroId": 4,
  "tipoControlIds": [30],
  "institucionesIds": [2],
  "personal": [{ "funcionarioId": 150, "horaInicio": "08:00", "horaFin": "16:00" }],
  "observaciones": ["Llevar chalecos"],
  "tipoTransporte": "INICIO_Y_FIN",
  "compartirConOperativoId": null
}
```

- **El horario viaja por persona** (RN-66) y el servidor deriva el del operativo como envolvente.
  `horaInicio`/`horaFin` del operativo siguen aceptándose (modo clásico).
- **El personal es todo o nada**: si alguien es rechazado, `409` con su motivo y
  `detalles.funcionarioId`, y no se crea nada.
- `cantidad` por persona solo donde el formulario la ofrece (el 8); `tramiteInspeccion` por persona
  donde aplica; `puntoNuevo` crea el punto en el catálogo si el formulario lo admite.
- **No acepta `conductorId` ni `vehiculoId`**: nacen nulos (RN-40).
- `esMacrooperativo` solo rige con `COMPLETO`; con otro tipo se guarda falso.
- Con `form_max_personas` o `form_elegir_una_area` (el 8), más de una persona o áreas mezcladas
  dan `400`.
- Abre la jornada si no existe, salvo que la fecha ya haya pasado.

#### Registro por zonas · `POST /operativos/por-zonas`

```json
{
  "cuadroFecha": "2026-11-05", "formularioCodigo": "INSP",
  "personal": [{ "funcionarioId": 210, "horaInicio": "08:00", "horaFin": "16:00" }],
  "zonas": [
    { "zonalId": 2, "puntoId": 41, "cantidad": 13, "institucionIds": [5], "tipoControlIds": [70] },
    { "zonalId": 7, "puntoId": 88, "cantidad": 1,  "institucionIds": [5], "tipoControlIds": [71] }
  ],
  "tipoTransporte": "INICIO_Y_FIN",
  "observaciones": []
}
```

Una persona, varias zonas, un transporte común. La numeración es correlativa zona por zona en la
serie IG/IT del formulario. La zona principal se guarda en `t_registro_operativo`.

#### Registro agrupado, patrulla y aporte

- **Todo operativo lleva `grupoRegistro`** (UUID). Qué se agrupa lo dice `esLote` en la respuesta,
  no la presencia del UUID.
- **Patrulla 5/6**: `PUT /operativos/:id/personal/lote` recibe el conjunto de TODO el registro;
  una persona nueva crea su código por prefijo de área, una quitada retira el suyo, y
  `reemplazaA` conserva el código de quien sale. La respuesta suma `identificadoresDelRegistro`.
- **Aporte del DMIT**: crea su propio operativo de una persona (`INECU`) en el mismo
  `grupoRegistro` y hereda conductor y placa si el registro ya está asignado.
- **`DELETE /operativos/registro/:grupoRegistro`** responde `{ retirados, eliminados,
  desactivados, identificadores, identificadoresDesactivados }`. Solo el rol que lo registró
  (`403` si no); un código con adicional vigente detiene todo (`409 OPERATIVO_CON_ADICIONALES`).
- Cambiar horario, zonal o un turno con transporte asignado pide `confirmarLiberacion: true`; sin
  él, `409 CAMBIO_CON_TRANSPORTE` (o `CAMBIO_TIPO_CON_TRANSPORTE` si solo cambia el tipo). Liberar
  alcanza a todos los códigos del registro.

#### Adicional · `POST /operativos/:id/adicional`

Es el cuerpo de `POST /operativos` sin `cuadroFecha` ni `formularioCodigo`, que se heredan
(`400 CAMPOS_NO_PERMITIDOS` si se envían). Numera en serie aparte con su prefijo (`OCAPMO`, `IGA`,
`ITA`). Comprueba identidad, rol, propiedad y cuadro cerrado (este último solo para los roles
departamentales: la Dirección es la autorización de RN-58); **no** comprueba la ventana. La traza
anota el origen y si la ventana estaba abierta. `409 ADICIONAL_NO_ENCADENABLE` si `:id` ya es un
adicional. Hereda el transporte del original por tramos.

#### `DELETE /operativos/:id`

| Situación | Qué ocurre | Respuesta |
|---|---|---|
| Sin órdenes ni adicionales | La fila se borra con su personal, zonales, instituciones y solicitudes | `eliminado: true` |
| Con órdenes emitidas o adicionales retirados | Baja lógica: las claves foráneas son `RESTRICT` | `eliminado: false` |
| Con adicionales vigentes | No se retira | `409 OPERATIVO_CON_ADICIONALES` |

### 2.6. Personal · 21

**`PersonalController` · 1**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/personal/elegible?formulario=&inicio=&fin=&horaInicio=&horaFin=&excluirRegistro=` | Sesión | **Todos** los candidatos del formulario con su veredicto |

```json
[{ "id": 150, "apellidos": "SOSA BARZOLA", "nombres": "JOSE LUIS",
   "area": "OPERATIVOS", "cargo": "Agente", "zonalId": 3,
   "elegible": false,
   "motivo": "SOSA BARZOLA JOSE LUIS ya está asignada al operativo OCF-001-12-AGO-2026 de 08H00 A 14H30, que se cruza con este horario.",
   "indiceCarga": 0.4, "nivelFatiga": "VERDE", "nivelCarga": "AMBAR", "operativosAsignados": 2,
   "cuotaJusta": 2.5, "desviacionCarga": -0.5, "nivelEquidad": "EQUILIBRADO", "sugerido": true,
   "operativosDelDia": [{ "identificador": "OCF-001-05-NOV-2026", "formulario": { "numero": 1, "codigo": "FIJOS" },
                          "horaInicio": "08:00", "horaFin": "14:30", "zonal": "Zonal Norte", "punto": "…" }] }]
```

- **Sin cédula ni teléfono.** Un campo que no existe en el contrato no se filtra por descuido.
- Los roles salen de la sesión, nunca de la petición: la lista se acota al personal del que esos
  departamentos disponen.
- Las horas van juntas o no van. `excluirRegistro` (UUID) descuenta el registro que se edita.
- `operativosDelDia` es informativo; de un formulario que el rol no ve solo viajan las horas, con
  `ajeno: true` (RN-48). El cruce lo decide RN-28 al guardar.
- Sin jornada laboral, el motivo es `JORNADA_NO_ADMITE_TURNO`.

**`AdministracionPersonalController` · 20** · permiso `personal:administrar`, acotado por `t_rol_direccion`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/personal?direccion=&area=&incluirInactivos=` | Maestro, con cédula, teléfono y jornada |
| `GET` | `/administracion/personal/ausencias` | Ausencias de todo el maestro desde una fecha, en una consulta |
| `GET` | `/administracion/personal/direcciones` | Direcciones que el rol gestiona |
| `GET` | `/administracion/personal/areas` | Áreas que el rol gestiona |
| `GET` | `/administracion/personal/:id` | Ficha |
| `POST` | `/administracion/personal` | Alta (`CrearFuncionarioDto`, con `origen: AUTH \| MANUAL` y `jornadaLaboralId`). Cédula con ficha: `409 CEDULA_CON_FICHA` |
| `PUT` | `/administracion/personal/:id` | Edición |
| `DELETE` | `/administracion/personal/:id` | Baja lógica con motivo (`BajaFuncionarioDto`) |
| `POST` | `/administracion/personal/:id/reactivar` | Reactiva y limpia el motivo |
| `GET` | `/administracion/personal/:id/disponibilidad` | Ausencias de la persona. Otra dirección: `403` |
| `POST` | `/administracion/personal/:id/disponibilidad` | Registra ausencia (`409 AUSENCIA_SOLAPADA`) |
| `DELETE` | `/administracion/personal/:id/disponibilidad/:periodoId` | Quita una ausencia; una pasada da `409 AUSENCIA_PASADA` |
| `GET` | `/administracion/personal/:id/operativos` | Operativos de la persona en un rango |
| `PUT` | `/administracion/personal/:id/instruccion` | Zona y denominación de una persona de Instrucción |
| `GET` | `/administracion/personal/cobertura?mes=` | Matriz de cobertura por turnos de Instrucción |
| `PUT` | `/administracion/personal/cobertura` | Una celda |
| `PUT` | `/administracion/personal/cobertura/lote` | Varias celdas |
| `POST` | `/administracion/personal/cobertura/propuesta-rotacion` | Propone continuar el ciclo. No escribe |
| `POST` | `/administracion/personal/cobertura/publicar` | Marca el mes como publicado |
| `GET` | `/administracion/personal/cobertura/exportar?mes=` | `.xlsx` |

### 2.7. Documentos · 14

**`JornadaController` y `MatrizController` · 3**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/jornada/:fecha` | `jornada:ver` | Jornada del Día: solo los formularios que el rol escribe o aporta |
| `GET` | `/matriz/:fecha` | `matriz:ver` | Matriz Consolidada: `cabecera` y `secciones` |
| `GET` | `/matriz/:fecha/exportar` | `matriz:ver` | PDF horizontal, como descarga |

Las filas llevan `grupoRegistro`, `esLote`, `esZonaPrincipal`, `tipoTransporte` y `notas`. El
registro por zonas sale en dos niveles: lo del operativo una vez y lo de cada zona en su bloque.

**`OrdenesServicioController` · 11**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `POST` | `/operativos/:id/ordenes-servicio` | Dirección + `ordenes:gestionar` | Emite una orden por persona asignada |
| `GET` | `/operativos/:id/ordenes-servicio` | Dirección + `ordenes:gestionar` | Lo ya emitido para un operativo |
| `GET` | `/ordenes-servicio/mias?desde=` | Sesión | Órdenes del usuario autenticado |
| `GET` | `/ordenes-servicio/:codigo/documento` | Sesión | PDF de la orden, solo si es de quien la pide |
| `GET` | `/ordenes-servicio/:codigo/memorando` | Dirección + `ordenes:gestionar` | PDF del memorando |
| `GET` | `/ordenes-servicio/:codigo/memorando/datos` | Dirección + `ordenes:gestionar` | Datos editables del memorando |
| `POST` | `/ordenes-servicio/:codigo/memorando` | Dirección + `ordenes:gestionar` | Guarda los editables (`EditarMemorandoDto`) y devuelve el PDF |
| `GET` | `/plantillas-orden` | Dirección + `ordenes:gestionar` | Los tres formatos, con `configurado` |
| `GET` | `/plantilla-orden/:departamento` | Dirección + `ordenes:gestionar` | Un formato |
| `PUT` | `/plantilla-orden/:departamento` | Dirección + `ordenes:gestionar` | Guarda una versión nueva (`GuardarPlantillaDto`) y regenera sus borradores |
| `POST` | `/plantilla-orden/:departamento/previsualizar` | Dirección + `ordenes:gestionar` | PDF de prueba (`PrevisualizarPlantillaDto`) |

- **`:departamento`** es `DMIT_INSTRUCTOR`, `DMIP_OPERATIVOS` o `DMIP_INSPECCIONES`; otro valor da
  `400` (`DepartamentoFormatoPipe`). Se retiraron `GET`/`PUT /plantilla-orden` sin departamento.
- **El formato sale del área de la persona**: INSTRUCCION → DMIT, OPERATIVOS → DMIP Operativos,
  GENERAL y TECNICO → DMIP Inspecciones.
- **Emitir responde `{ ordenes, sinFormato }`.** Quien no tiene formato configurado no recibe orden
  y va en `sinFormato` con su aviso; las demás se emiten. Cada orden suma `formato: { departamento,
  nombre } | null`.
- **El dato aislado tiene cuatro campos** (INV-24, RN-50): horario, funcionario, conductor y
  placa. El horario es el turno efectivo de la persona.
- Reemitir marca la anterior como no vigente y la conserva. El número `AMC-OS-<8>-<año>` se asigna
  cuando la orden queda vigente, sin faltantes.

```json
{
  "codigo": "OS-ICNECU-001-07-AGO-2026-7-1", "vigente": true, "fechaJornada": "2026-08-07",
  "datoAislado": {
    "horario": "18H00 A 23H30", "funcionario": "YUNDA JESSICA",
    "conductor": { "nombre": "VIVANCO JORGE", "telefono": "0978631797" }, "placa": "PMA-7892"
  }
}
```

### 2.8. Transporte DAF · 46

**`JornadaDafController` · 7** · «Planificar el día», sin `VentanaCargaGuard` (son lecturas o
declaraciones que la DAF necesita también con la ventana cerrada)

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/transporte/jornada-daf/:fecha` | `transporte:asignar` | **Resumen de los 4 pasos** en una llamada |
| `GET` | `/transporte/candidatos/:operativoId?fecha=` | `transporte:asignar` | Conductores para un operativo, por categoría y con motivo |
| `GET` | `/transporte/huecos/:fecha?conductorId=&vehiculoId=&zonalId=` | `transporte:asignar` | Horas libres de conductores y vehículos |
| `GET` | `/transporte/conductores/:id/huecos-libres?fecha=&zonalId=` | `transporte:asignar` | Horas libres de un conductor |
| `GET` | `/transporte/vehiculos-jornada/:fecha` | `flota:capacidad:ver` | Vehículos activos con `sale` (o `null` si no se confirmó) |
| `PUT` | `/transporte/vehiculos-jornada/:fecha` | `flota:capacidad:declarar` | Confirma los que salen (`{ saleIds, observacion }`) y declara el conteo (RN-46) |
| `POST` | `/transporte/hojas-ruta/:fecha/emitir` | `transporte:asignar` | Emite la hoja de ruta de un conductor, o de todos (`{ conductorId? }`) |

#### `GET /transporte/jornada-daf/:fecha`

```json
{
  "fecha": "2026-11-05",
  "pasos": { … },
  "preparacion": { "requisitos": [ … ], "listos": 3, "pendientes": 1, "conductoresIncompletos": [ … ] },
  "ventana": { "abierta": true, "horaApertura": "18:25", "horaCierre": "18:28", "mensaje": "…", "zonaHoraria": "America/Guayaquil" },
  "totales": { "operativos": 12, "cubiertos": 9, "sinConductor": 3, "propiosMedios": 4, "otraInstitucion": 1,
               "conductoresEnUso": 6, "libresEnUso": 1, "vehiculosDisponibles": 10, "vehiculosEnUso": 6,
               "enTaller": 1, "avisos": 2 },
  "operativos": [{
    "id": 450, "identificador": "IGECU-001-05-NOV-2026", "formulario": "5. PATRULLA REACCIÓN DIURNA",
    "horaInicio": "08:00", "horaFin": "16:00", "zonal": "Zonal Norte", "zonalId": 2, "punto": "…",
    "registro": {
      "grupoRegistro": "0b6c…", "identificadores": ["IGECU-001-05-NOV-2026", "ITECU-001-05-NOV-2026", "INECU-001-05-NOV-2026"],
      "tambienAtiende": [{ "zonal": "Calderón", "punto": "AMC Calderón" }],
      "personas": 3,
      "avisos": ["No caben: el registro tiene 3 personas y la PMA-3370 tiene 2 asientos."]
    },
    "tipoTransporte": "INICIO_Y_FIN", "esMacrooperativo": false,
    "compartirCon": null, "justificacionExclusivo": null, "transporteLiberado": false,
    "personas": 3, "cubierto": false, "parcial": true, "tramos": [ … ]
  }],
  "conductores": [{ "id": 10, "nombre": "…", "turno": "DIA", "activado": false, "ausente": false,
                    "vehiculoId": 55, "placa": "PMA-3370", "vehiculoIds": [55], "tramoIds": [ … ],
                    "avisos": [ … ], "hojaRuta": { "estado": "EMITIDA", "emitidaEn": "…" } }],
  "vehiculos": { "flota": 23, "confirmada": true, "confirmadaEn": "…", "lista": [ … ] },
  "finDelDia": { … },
  "garajes": [{ "id": 1, "nombre": "Matriz" }]
}
```

- **El paso no se guarda: se deriva** de este resumen.
- **Un registro agrupado es UNA solicitud**: la patrulla 5/6 (con el código que aporta el DMIT) y
  el registro por zonas del 8 llegan como un solo operativo, el representante, con `registro`
  anotado. `registro` es `null` en los operativos sueltos.
- `registro.identificadores` lleva todos los códigos; el frontend los compacta («IGECU-001 ·
  ITECU-001»). `registro.personas` son las personas distintas de todos los códigos.
- `registro.avisos` se calcula al leer (asientos y horario del registro frente al transporte
  asignado) y no libera nada. El UUID no se muestra en pantalla.
- Asignar, quitar, liberar y compartir actúan sobre el representante y copian conductor y placa a
  todos los códigos.

#### `GET /transporte/candidatos/:operativoId`

Responde `{ operativo, actual, candidatos }`. Cada candidato:

| Campo | Qué dice |
|---|---|
| `conductorId`, `nombre`, `turno` | Quién es y su turno del día |
| `categoria` | `DISPONIBLE` · `COMPARTE` · `FUERA_TURNO` · `OCUPADO` · `LIBRE_INACTIVO` |
| `motivo` | Una frase: «Disponible · ya trabaja en Calderón», «Ocupado 08H00–16H30 con OCPMO-001» |
| `avisos` | Los demás avisos (jornada larga, descanso, arranque lejos); no cambian la categoría |
| `asignable` | Verdadero solo en `DISPONIBLE` y `FUERA_TURNO` |
| `vehiculoId`, `placa` | Placa propuesta |
| `actual` | Si es el conductor ya asignado (va al final) |
| `compartirCon` | Con `COMPARTE`: `{ operativoId, identificador }` de la unidad que se comparte |
| `indiceCarga`, `nivelFatiga` (`VERDE` · `AMBAR` · `ROJO`), `operativosAsignados`, `cuotaJusta`, `desviacionCarga`, `nivelEquidad` (`DEBAJO` · `EQUILIBRADO` · `ENCIMA`) | Carga del conductor, desde el 30-OCT |

Orden: disponibles → comparte unidad → fuera de turno → ocupados → libres sin activar.

#### Emisión de hojas de ruta

`POST /transporte/hojas-ruta/:fecha/emitir` guarda la **huella** de los tramos de cada conductor y
responde `{ emitidas, hojas: [{ conductorId, estado: "EMITIDA", emitidaEn }] }`. No genera ni
guarda el PDF. Si después cambian los tramos, el estado pasa a `PENDIENTE_CAMBIO`. Sin tramos
asignados: `400`.

**`PlanificacionTransporteController` · 12** · con `VentanaCargaGuard`

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/transporte/planificacion/:fecha` | `transporte:asignar` | Línea de tiempo: operativos, tramos, conductores y vehículos |
| `GET` | `/transporte/ubicaciones/:fecha` | `transporte:asignar` | Dónde amanece, dónde queda y si está en taller cada vehículo |
| `POST` | `/transporte/evaluar` | `transporte:asignar` | ✓/⚠/✕ de cada conductor para un bloque (`BloqueOperativosDto`). No escribe |
| `POST` | `/transporte/evaluar/vehiculos` | `transporte:asignar` | Cada placa del día para un conductor y un bloque. No escribe |
| `POST` | `/transporte/tramos/generar` | `transporte:asignar` | Genera los tramos que faltan del día. Idempotente |
| `POST` | `/transporte/tramos/operativo/:operativoId/regenerar` | `transporte:asignar` | Regenera los tramos de un operativo sin asignar |
| `POST` | `/transporte/tramos/asignar` | `transporte:asignar` | **Asigna un bloque** (`AsignarBloqueDto`: `fecha`, `operativoIds`, `tramoIds?`, `conductorId`, `vehiculoId \| null`) |
| `DELETE` | `/transporte/tramos/:id/asignacion` | `transporte:asignar` | Quita la asignación; responde `200 { liberados, aviso }` |
| `POST` | `/transporte/tramos/compartir` | `transporte:asignar` | El invitado viaja en la unidad del anfitrión (`{ operativoId, anfitrionOperativoId }`) |
| `GET` | `/transporte/tramos/:operativoId/compartibles` | `transporte:asignar` | Con qué operativos asignados puede compartir, con asientos por momento |
| `POST` | `/transporte/activaciones` | `transporte:asignar` | Activa a un conductor de libre con su motivo |
| `DELETE` | `/transporte/activaciones/:conductorId?fecha=` | `transporte:asignar` | Quita la activación |

`409 ASIGNACION_NO_VIABLE` con el motivo del primer bloqueo (`NO_LLEGA`, `SOLAPAMIENTO`,
`JORNADA_MAXIMA`, `SIN_JORNADA`, `ASIENTOS`…); `409 VEHICULO_OCUPADO` si la placa está con otro
conductor; `409 COMPARTIR_NO_COMPATIBLE` si no pueden ir juntos.

**`OptimizacionTransporteController` · 8** · con `VentanaCargaGuard`

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `POST` | `/transporte/optimizar` | `transporte:asignar` | «Cubrir al máximo»: propuesta del día. No guarda |
| `POST` | `/transporte/optimizar/confirmar` | `transporte:asignar` | Aplica la propuesta re-evaluada en una transacción (`ConfirmarOptimizacionDto`) |
| `POST` | `/transporte/priorizacion` | `transporte:asignar` | Pide priorización de un operativo sin recurso |
| `POST` | `/transporte/tramos/tarea/:id/asignar` | `transporte:asignar` | Asigna la tarea «Llevar a taller» |
| `GET` | `/transporte/fin-del-dia/:fecha` | `transporte:destinos:ver` | Guarda final sugerida de cada vehículo que salió |
| `PUT` | `/transporte/fin-del-dia/:fecha` | `transporte:destino:fijar` | Declara varias guardas (`GuardarFinDelDiaDto`); una que falla no impide las demás |
| `GET` | `/transporte/movilizacion/:fecha/vehiculo/:vehiculoId/json` | `transporte:asignar` | **Hoja de ruta** del vehículo, en JSON |
| `GET` | `/transporte/movilizacion/:fecha/vehiculo/:vehiculoId` | `transporte:asignar` | La misma hoja de ruta, en PDF |

```json
POST /transporte/optimizar
{ "fecha": "2026-11-05", "activarLibres": false, "compartirCarro": true, "simular": true }
```

Con **`simular: true`** compara «sin libres» y «con libres» en memoria sobre los tramos que ya
existen y devuelve la sugerencia de libres: no genera tramos ni escribe nada. La confirmación deja
una fila de auditoría por tramo asignado, compartido o libre activado, más un resumen con su
correlación.

#### Hoja de ruta · JSON y PDF

```json
{
  "fecha": "2026-11-05",
  "vehiculo": { "id": 55, "placa": "PMA-3370", "tipo": "Camioneta" },
  "conductores": ["VIVANCO JORGE"],
  "tramos": [{
    "orden": 1, "id": 901, "tipo": "DEJAR", "horaInicio": "07:30", "horaFin": "08:00",
    "identificador": "IGECU-001 · ITECU-001 · INECU-001", "conductor": "VIVANCO JORGE",
    "origen": "Matriz", "destino": "Zonal Norte", "lugares": "…",
    "unidad": "DMIP · Inspecciones + DMIT · Instrucción", "personal": 3, "grupoRegistro": "0b6c…"
  }],
  "guardaFinal": { "tipo": "GARAJE", "lugar": "Matriz", "observacion": null },
  "leyenda": "…"
}
```

- **Una fila por registro, tipo y hora**: los tramos heredados de otros códigos del mismo registro
  no se repiten.
- **`personal`** son las personas distintas del operativo o de su registro; las tareas llevan 0.
  El PDF imprime la columna **«Personal»** entre Tipo y Operativo, con «—» en las tareas.
- No lleva número oficial: la orden de movilización la emite otro sistema de la DAF.

**`TransporteController` · 9** · la vía clásica, con `VentanaCargaGuard`

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/transporte/pendientes/:fecha?incluirResueltos=` | `transporte:pendientes:ver` | Pendientes del día, nocturnos primero, sin el personal |
| `GET` | `/transporte/vehiculos?fecha=` | `transporte:vehiculos:ver` | Flota del día con el motivo de la que no se puede usar |
| `GET` | `/transporte/conductores?fecha=` | `transporte:conductores:ver` | Conductores ya filtrados (RN-45), con su vehículo habitual |
| `GET` | `/transporte/jornada-conductores/:fecha` | `transporte:jornada:ver` | Jornada encadenada de cada conductor. Vista |
| `GET` | `/transporte/destinos/:fecha` | `transporte:destinos:ver` | Destinos declarados |
| `PUT` | `/transporte/vehiculos/:id/destino/:fecha` | `transporte:destino:fijar` | Dónde queda el vehículo al terminar (`DeclararDestinoDto`) |
| `PATCH` | `/transporte/operativos/:id` | `transporte:asignar` | **Conductor y vehículo** (`ActualizarTransporteDto`) |
| `PATCH` | `/transporte/operativos/:id/propios-medios` | `transporte:propios-medios` | Propios medios. Sin cuerpo |
| `PATCH` | `/transporte/operativos/:id/desasignar` | `transporte:desasignar` | Vuelve a `PENDIENTE` y vacía sus tramos. Sin cuerpo |

#### `ActualizarTransporteDto` · exactamente dos campos

```json
PATCH /transporte/operativos/450   { "conductorId": 10, "vehiculoId": 55 }
```

**Dos propiedades enteras y ninguna más** (regla 3 de `transporte-backend/CLAUDE.md`, RN-40).
Cualquier otro campo da `400 CAMPOS_NO_PERMITIDOS`. Desde el 14-OCT este endpoint **delega en la
asignación por tramos** (`asignarBloque`) con las mismas reglas que «Planificar el día»; en un
registro agrupado alcanza a todos sus códigos. El destino del vehículo y la desasignación tienen
endpoints propios en lugar de sumarse aquí.

**`PreparacionTransporteController` y `CapacidadFlotaController` · 4**

| Verbo | Ruta | Permiso | Propósito |
|---|---|---|---|
| `GET` | `/transporte/preparacion/:fecha` | `transporte:asignar` | Requisitos del día antes de asignar |
| `GET` | `/transporte/capacidad/:fecha` | `flota:capacidad:ver` | Capacidad declarada (POL-07) |
| `GET` | `/transporte/capacidad/:fecha/calculada` | `flota:capacidad:ver` | Capacidad calculada: turnos − ausencias + libres; flota − taller |
| `PUT` | `/transporte/capacidad/:fecha` | `flota:capacidad:declarar` | Declara vehículos y conductores hábiles (RF-057) |

**`OperacionFlotaController` · 6** · permiso `transporte:asignar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `POST` | `/transporte/checklist` | Lista de verificación diaria (`ChecklistDto`) |
| `GET` | `/transporte/checklist/:fecha` | Listas del día |
| `POST` | `/transporte/kilometraje` | Lectura de kilometraje (`KilometrajeDto`) |
| `GET` | `/transporte/vehiculos/:id/kilometraje` | Historial |
| `POST` | `/transporte/vales` | Vale de combustible de 10 o 20 (`ValeCombustibleDto`) |
| `GET` | `/transporte/vales/:fecha` | Vales del día |

### 2.9. Flota y garajes · 42

**`AdministracionFlotaController` · 19** · permiso `flota:administrar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/flota/resumen` | Indicadores: activos, documentos por vencer, en taller hoy, sin conductor, incompletos |
| `GET` | `/administracion/flota/vehiculos/disponibilidad?fecha=` | Cada vehículo `DISPONIBLE` · `EN_TALLER` · `DE_BAJA`, con sus paradas de la semana |
| `GET` | `/administracion/conductores?incluirInactivos=` | Conductores, con `jornadaLaboralId`, `faltantes`, `estado`, `bajaEn`, `bajaPorNombre` |
| `POST` | `/administracion/conductores` | Alta (`CrearConductorDto`) |
| `PATCH` | `/administracion/conductores/:id` | Edición (`ActualizarConductorDto`) |
| `DELETE` | `/administracion/conductores/:id` | Baja. Con asignaciones pendientes: `409 RECURSO_CON_ASIGNACION` |
| `GET` | `/administracion/conductores/:id/impacto-baja` | Qué impediría la baja, con `motivo` |
| `PATCH` | `/administracion/conductores/:id/reactivar` | Reactiva |
| `GET` · `POST` · `PATCH` · `DELETE` | `/administracion/vehiculos[/:id]` | Ídem vehículos (`CrearVehiculoDto`, `ActualizarVehiculoDto`) |
| `GET` | `/administracion/vehiculos/:id/impacto-baja` | Qué impediría la baja del vehículo, y quiénes quedan sin él |
| `PATCH` | `/administracion/vehiculos/:id/reactivar` | Reactiva |
| `GET` · `POST` · `PATCH` · `DELETE` | `/administracion/ubicaciones-flota[/:id]` | Garajes y ubicaciones |
| `PATCH` | `/administracion/ubicaciones-flota/:id/reactivar` | Reactiva un garaje |

La placa se normaliza a `AAA-9999`. La baja y la reactivación escriben solo el estado, la fecha y
el autor.

**`AusenciasConductorController` · 4** · permiso `flota:ausencias`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/administracion/conductores/ausencias?desde=` | Ausencias de toda la flota, sin motivo |
| `GET` | `/administracion/conductores/:id/ausencias` | Ausencias de un conductor |
| `POST` | `/administracion/conductores/:id/ausencias` | Registra; avisa `tramosAfectados` sin retirarlos |
| `DELETE` | `/administracion/conductores/:id/ausencias/:periodoId` | Quita |

**`MantenimientoVehiculoController` y `MantenimientoSemanaController` · 6** · permiso `flota:mantenimiento`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/transporte/vehiculos/:id/mantenimiento/impacto?desde=&hasta=` | Traslados ya asignados en el rango, antes de guardar |
| `GET` | `/transporte/vehiculos/:id/mantenimiento` | Paradas del vehículo |
| `POST` | `/transporte/vehiculos/:id/mantenimiento` | Programa una parada (`CrearMantenimientoDto`); con hora crea la tarea |
| `PATCH` | `/transporte/vehiculos/:id/mantenimiento/:mantenimientoId/estado` | `PROGRAMADO` · `EN_TALLER` · `LISTO` |
| `DELETE` | `/transporte/vehiculos/:id/mantenimiento/:mantenimientoId` | Elimina la parada |
| `GET` | `/transporte/mantenimiento/semana?desde=` | Paradas de la semana |

**`TurnosConductoresController` · 11** · permiso `flota:administrar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `GET` | `/transporte/turnos-conductores?mes=` | Matriz del mes |
| `PUT` | `/transporte/turnos-conductores` | Una celda; `turno: null` la limpia. Día con ausencia: `400` |
| `PUT` | `/transporte/turnos-conductores/lote` | Varias celdas |
| `POST` | `/transporte/turnos-conductores/propuesta-rotacion` | Continúa el ciclo de unos conductores. No escribe |
| `POST` | `/transporte/turnos-conductores/propuesta-mes` | Propone el mes con resumen. No escribe |
| `POST` | `/transporte/turnos-conductores/publicar` | Publica el mes |
| `GET` | `/transporte/turnos-conductores/exportar?mes=&formato=xlsx\|pdf` | Reporte; solo de un mes publicado (`409 MES_NO_PUBLICADO`) |
| `POST` | `/transporte/turnos-conductores/importar/previsualizar` | Vista previa del HORARIO `.xlsx` (la usa la carga inicial) |
| `GET` | `/administracion/traslados` | Matriz de traslados con `cobertura: { posibles, sinTiempo }` |
| `PUT` | `/administracion/traslados` | Fija pares o los borra con `minutos: null` (`GuardarTrasladosDto`) |
| `POST` | `/administracion/traslados/verificar-impacto` | Qué asignaciones dejarían de llegar, desde hoy y por 60 días. No escribe |

```json
PUT /administracion/traslados   { "pares": [ { "zonalOrigenId": 2, "zonalDestinoId": 7, "minutos": 45 } ] }
```

La matriz es dirigida. Sin par explícito rigen `TRASLADO_MISMA_ZONA_MIN`,
`TRASLADO_MISMO_SECTOR_MIN` y `TRASLADO_OTRO_SECTOR_MIN`.

**`CargaInicialController` · 2** · permiso `carga-inicial:administrar`

| Verbo | Ruta | Propósito |
|---|---|---|
| `POST` | `/administracion/carga-inicial/previsualizar` | Lee un `.xlsx` (conductores, vehículos, garajes, turnos) y muestra qué cargaría |
| `POST` | `/administracion/carga-inicial/aplicar` | Aplica lo previsualizado (`AplicarCargaInicialDto`) |

---

## 3. Endpoints retirados desde agosto

| Antes | Ahora |
|---|---|
| `POST`/`PUT`/`DELETE /administracion/catalogos/puntos[/:id]` y análogos sin formulario | Cuelgan del formulario: `/administracion/catalogos/:codigo/…` |
| `GET`/`PUT /plantilla-orden` | `/plantilla-orden/:departamento` |
| Asignación por `PATCH /transporte/operativos/:id` como única vía | Sigue, pero delega en `POST /transporte/tramos/asignar` |
| Cabecera `x-usuario-prueba` | Retirada el 18-AGO; solo la cookie |

---

## 4. Ejemplos

Todo lo que no sea `/estado` ni las rutas públicas de sesión exige la cookie. Se obtiene
ingresando por el portal y copiándola del navegador (Application → Cookies).

```bash
BASE=http://localhost:3003/api/v1
OPERATIVOS="cuadro_colores_sesion=<cookie de un usuario DMIP_OPERATIVOS>"
DAF="cuadro_colores_sesion=<cookie de un usuario DAF>"
DIRECTOR="cuadro_colores_sesion=<cookie de un usuario DIRECTOR>"

curl -s $BASE/estado
curl -s -b "$OPERATIVOS" $BASE/auth/session
curl -s -b "$OPERATIVOS" "$BASE/personal/elegible?formulario=FIJOS&inicio=2026-11-05&horaInicio=08:00&horaFin=16:00"

curl -s -b "$DAF" $BASE/transporte/jornada-daf/2026-11-05
curl -s -X POST -b "$DAF" -H "Content-Type: application/json" $BASE/transporte/optimizar \
  -d '{"fecha":"2026-11-05","simular":true}'
curl -s -b "$DAF" -o hoja.pdf $BASE/transporte/movilizacion/2026-11-05/vehiculo/55

curl -s -b "$DIRECTOR" -o matriz.pdf $BASE/matriz/2026-11-05/exportar
```

> **El rol va dentro de la cookie, firmado.** Cambiar de perfil es ingresar con otra cuenta.
> `curl` comprueba que el servidor responde, pero no ejecuta JavaScript ni distingue contexto
> seguro: el flujo de ingreso se verifica en un navegador.
