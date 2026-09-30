# Plan de integración con Auth central

**Módulo Transportes / Cuadro de Colores Operativo (SIGOC-CCO) — Agencia Metropolitana de Control**
17 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

> **YA NO ES UN PLAN: ESTÁ EJECUTADO.** Las cinco etapas se completaron entre el 17 y el 19 de
> agosto y el ingreso funciona de punta a punta contra el Auth de desarrollo. El documento se
> conserva entero —incluidas las hipótesis que resultaron falsas— porque explica **por qué** cada
> pieza quedó como quedó, y porque §D-1 contiene un error de diagnóstico que se sostuvo tres veces
> y conviene que no se repita.
>
> Lo nuevo está en **§D-1 reescrito** y en **§13**, que recoge los tres defectos que solo
> aparecieron al abrirlo en un navegador.

Documento hermano de `ANALISIS_EVOLUCION_PROYECTO.md` §5. Cubre la etapa **E12 · identidad real**,
que es el bloqueante **B-01**: el único motivo de software por el que el sistema no puede ir a
producción.

---

## 0. Conclusión primero

**El patrón adoptado es la cookie `HttpOnly`, como CORE.** El JWT no llega nunca al navegador: lo
canjea el backend de SIGOC-CCO contra Auth central y lo guarda en su propia cookie de sesión.

**El trabajo de código es acotado y no necesita ninguna migración de esquema**, gracias a una
columna que ya existe. Lo que sí es grande es lo que hay **antes**: nueve puntos de coordinación
y decisión que no puede resolver el desarrollo por su cuenta, seis con Auth central y tres con
usted.

**Y hay un prerrequisito que se convierte en camino crítico:** `t_usuario` está vacía. El día que
la identidad real se encienda, **nadie entra a SIGOC-CCO** hasta que esa tabla esté poblada.

### Estado al 19 de agosto de 2026

**Construido, probado y desplegado.** El recorrido completo —portal → elección de rol → callback →
canje → cookie `HttpOnly` → `/home` con la barra lateral del rol— funciona con un solo clic.

De los siete desajustes, **cinco cerrados** (D-1, D-2, D-3, D-4, D-6 en parte). Los dos que quedan
**no son trabajo nuestro**:

| | Qué falta | Efecto |
|---|---|---|
| 🟠 | No existe el rol `Transporte - Funcionario` | **P-06 «Mis órdenes» inaccesible**: quien recibe una orden no puede entrar a verla |
| 🟠 | El canje no devuelve `roles` y el token no lleva `subsystemId` (D-5, D-7) | No se puede comprobar que un código se emitió **para este módulo** y no para otro de SIGOC |

Y el prerrequisito sigue vivo con otra forma: `t_usuario` ya no está vacía, pero **quien no tenga
fila ahí no entra**, aunque Auth lo autentique.

---

## 1. El contrato real de Auth central

Verificado contra el código, no contra la guía. Proyecto en
`C:\Users\Administrador\Documents\project_auth\auth`, versión **1.6.5**.

### 1.1. Qué expone

| Endpoint | Acceso | Devuelve |
|---|---|---|
| `POST /auth` | Público | `{token, subsystemPath, username, redirectCode}` si el usuario tiene **un** subsistema; `{token, username, subsystems[]}` si tiene varios |
| `POST /auth/role` | Token de login | `{subsystemPath, redirectCode}` |
| **`GET /auth/exchange?code=`** | **Público** | **`{token, permissions, username, roles}`** |
| `GET /auth/session/validate` | `Authorization: Bearer` | `{valid: true}` |

`auth.controller.ts:129` y `:241`. `docs/auth_v1.5.md:20` lo confirma: *«Las rutas protegidas
requieren `Authorization: Bearer <token>`»*.

### 1.2. El flujo, tal como está construido

```
1. El usuario entra al portal de Auth y se autentica.
2. Auth resuelve sus subsistemas.  Si hay varios, el usuario elige en /role.
3. Auth crea la sesión en Redis, firma un JWT y genera un redirectCode de un solo uso.
4. El portal navega a  <origen-del-modulo>/auth/callback?code=<redirectCode>
   ── el origen sale del primer permiso con `path`, ordenado por `order`;
      `/auth/callback` lo añade el portal.  NO se usa `subsystems.path`, y
      NO influye nada que envíe el módulo.  Corregido el 18-AGO, ver §D-1 ──
5. El destino canjea el código en  GET /auth/exchange  y recibe el JWT.
```

### 1.3. Las reclamaciones del JWT de sesión

`auth.service.ts:65`:

```ts
jwt.sign(
  { userId, cedula, tokenType: 'session', sessionId, subsystemId, roleIds },
  process.env.JWT_SECRET,
  { expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 36000) },  // 10 horas
);
```

Cuatro consecuencias que importan:

- **No se declara algoritmo**, así que `jsonwebtoken` firma en **HS256**. Coincide con el
  `JWT_ALGORITHM=HS256` de la guía.
- **No hay `iss` ni `aud`.** El `JWT_ISSUER`/`JWT_AUDIENCE` de la guía aplican al token **propio**
  del módulo, no al de Auth.
- **No hay `username` en el token.** Llega solo en el cuerpo de la respuesta del exchange.
- **Sí hay `subsystemId`**, y eso habilita una comprobación de seguridad que la guía no menciona:
  ver §4.3.

### 1.4. Lo que Auth **no** tiene

**No existe ningún endpoint de cookie de sesión.** Ni `POST /auth/session/exchange`, ni
`GET /auth/session`, ni logout de sesión.

> `grep -rn 'session/exchange\|httpOnly\|cookie' backend/src` → sin resultados.

Los `INTEGRACION_AUTH_*.md` **no describen a Auth**: describen una capa que cada backend de módulo
construye **encima** de `GET /auth/exchange`. Es implementable sin tocar Auth —el exchange no
pregunta quién lo llama— y es lo que CORE ya hizo. Es lo que vamos a hacer.

---

## 2. Los siete desajustes con Auth central

Cada uno cita el archivo que lo demuestra, para que la reunión se resuelva con datos. Nacieron seis;
el séptimo apareció al sondear el servidor, porque no se podía saber sin mirar.

**Cerrados:** D-1 🟢 · D-2 🟢 · D-3 🟢 · D-4 🟢 · D-6 🟠 en parte. **Abiertos:** D-5 y D-7, los dos
del lado de Auth central.

### D-1 · Cómo decide el portal a dónde devolver 🟢 · **CERRADO el 2026-08-18**

> **AQUÍ HUBO UN DIAGNÓSTICO EQUIVOCADO, y se corrige entero.** Durante tres intentos este
> apartado sostuvo que el bloqueo era la columna `subsystems.path` de SIGOC, vacía. **Era falso.**
>
> El error tuvo un origen concreto: se dedujo leyendo el repositorio `project_auth/auth` 1.6.5,
> donde `getSubsystemPathById()` lee esa columna. **El portal desplegado no la usa.** La pista que
> lo destapó fue su propia pantalla de error —«El rol **seleccionado** no tiene una ruta de destino
> configurada»—: habla del *rol*, no del subsistema. Eso llevó a leer el paquete JavaScript que el
> portal sirve, en vez de su código fuente.
>
> **Lección, y vale más que el dato:** para un servicio desplegado, el repositorio es una hipótesis;
> la fuente de verdad es lo que ese servidor responde y sirve.

**Lo que hace el portal, leído de su paquete servido:**

```js
V = (permisos) => permisos.filter(p => p.path?.trim())
                          .sort((a,b) => a.order - b.order)[0]?.path ?? null

Hg = (path, code) => {
  const s = tm(path);                                     // antepone http:// si falta
  Ph(s);                                                  // lista blanca; hoy vacía = todo pasa
  window.location.href = em(`${s}/auth/callback`, code);   // ← EL PORTAL AÑADE /auth/callback
}
```

**Tres hechos, ninguno documentado en la guía:**

1. El destino sale del **primer permiso con `path` no vacío, ordenado por `order`**. No de
   `subsystems.path`.
2. **El portal compone `/auth/callback` por su cuenta.** En Auth se registra **solo el origen**.
3. El esquema es opcional: `tm()` antepone el del portal si falta.

**Consecuencia que deshace la advertencia anterior.** Se dijo varias veces que la ruta era **una
sola por subsistema**, y que escribir la nuestra rompería a Instrucción, Resolución y Ejecución.
**No es así.** La ruta cuelga del módulo, cada uno tiene la suya, y **el Cuadro de Colores no
necesita subsistema propio**. La unicidad es sobre la **cadena completa**, no sobre el puerto:
`localhost:5176` y `172.20.136.127:5176` conviven sin conflicto.

**Y la guía tampoco acierta con `redirectUri` y `module`:** el portal no lee ningún parámetro de
la URL. El frontend los sigue enviando porque el contrato compartido los pide y no estorban, pero
**no influyen en nada**.

**Cómo quedó registrado** (subsistema 11 · SIGOC, a 2026-08-19):

| Módulo | Ruta |
|---|---|
| 74 Resolución | `localhost:5173` |
| 73 Instrucción | `localhost:5175` |
| 76 Admin Core | `localhost:5176` |
| 77 Admin Sorteos | `172.20.136.127:5176` |
| 75 Ejecución | `172.20.136.127:5177` |
| **80 Transporte** | **`localhost:5180`** |

```bash
PUT /modules/80
{"id":80,"name":"Transporte","path":"localhost:5180","icon":"FaCar","subsystemId":11}
→ 200 · Módulo actualizado
```

> **Ese cuerpo tiene truco, y cuesta encontrarlo.** Exige `id` **y** `subsystemId` a la vez: sin el
> segundo responde «Subsistema incorrecto», sin el primero «ID incorrecto». Y **rechaza `order`**
> con «property order should not exist». Además `GET /modules` no devuelve módulos, sino
> subsistemas con sus módulos anidados; `GET /modules/:id` no existe.

**Por qué 5180 y por qué `localhost`.** El 5176 daba 409: lo tenía exactamente Admin Core. Se
eligió 5180 y no otro de la banda 5173–5179 porque ahí viven los demás frontales de SIGOC y es la
banda por la que **Vite salta solo** cuando encuentra ocupado —de ahí `strictPort: true` en
`vite.config.ts`, para que falle en vez de moverse en silencio—. Y `localhost` y no la IP porque
es **contexto seguro**; el precio está en §13.

### D-2 · La ruta del portal 🟡 · **CERRADO**

> **Confirmado el 2026-08-18: el portal es `http://172.20.136.127:10006/login`** y responde 200.
> La API es el **10004**. El otro frontend, el 10003 (`<title>AMC auth</title>`), no es el portal
> de integración.

La guía propone `AUTH_PORTAL_URL=…/login`. El login del portal está en **`/`**:

```tsx
// frontend/src/router.tsx:21
{ path: "", element: <Login /> },
```

Puede que un proxy inverso lo publique en `/login`. **Confirmar por ambiente.**

### D-3 · Host y puerto del exchange 🟡 · **CERRADO**

> **La guía acertaba.** `http://172.20.136.127:10004/auth/exchange` responde el contrato exacto:
> `{"statusCode":500,"message":"Código inválido o expirado"}`. Comprobado además que el backend
> de SIGOC-CCO lo alcanza desde su contenedor.
>
> **Un matiz para quien implemente el frontend:** Auth devuelve **500**, no 401, cuando rechaza un
> código. Este módulo ya lo traduce al `401` que pide el contrato compartido.

La guía propone `AUTH_EXCHANGE_URL=http://<host>:10004/auth/exchange`. El `CLAUDE.md` de Auth dice
que en desarrollo el backend se expone en `http://auth-api.localhost` (Postgres en 10001, Redis en
10002). **Confirmar host y puerto por ambiente**, incluida la ruta de red desde el contenedor de
SIGOC-CCO.

### D-4 · La clave de firma 🔴 · **CERRADO**

> **RECIBIDA Y VERIFICADA el 2026-08-18.** Con ella el ingreso completo funciona contra el Auth
> real: `ffnavarrete` se autentica, el código se canjea, **la firma se valida**, la cuenta se
> resuelve en `t_usuario` y la cookie `HttpOnly` queda emitida. La API del cuadro responde con esa
> cookie y respeta el rol —200 en administración, 403 en la matriz—.
>
> El valor **no se escribe aquí ni en `.env.example`**: vive solo en el `.env` de cada ambiente,
> que está en `.gitignore`.
>
> **La objeción de abajo sigue en pie, y recibir la clave no la cierra.**


Auth firma con `process.env.JWT_SECRET`, HS256. Para que el backend de SIGOC-CCO **valide firma y
vencimiento** —paso 4 del exchange en la guía— necesita esa clave.

**Hay que pedirla, y decidir cómo se aprovisiona**: no se versiona, así que va por CI/CD, gestor de
secretos o configuración del servidor.

> Alternativa que conviene plantear en la reunión: que Auth exponga una clave pública y firme en
> RS256. Con secreto compartido HS256, **cada módulo integrado puede falsificar tokens de todos los
> demás**. No es un problema hoy, pero crece con cada módulo que se sume.

### D-5 · La forma de la respuesta del exchange 🟡

La guía pide confirmar que *«`userId`, `username` y `exp` estén presentes en la respuesta de
exchange»*. La respuesta real es `{token, permissions, username, roles}`:

- `username` ✅ está en el cuerpo.
- `userId` y `exp` **están dentro del JWT**, no en el cuerpo.
- **`username` no está en el JWT.** Si el backend solo decodificara el token, no tendría el nombre
  de usuario — que es justo la llave con la que SIGOC-CCO resuelve la identidad (§3).

**Consecuencia práctica:** el backend debe usar **las dos** cosas, cuerpo y token. No basta con
una.

### D-6 · Sin subsistema, módulos y roles en Auth, no hay login 🔴 · **CERRADO EN PARTE**

> **El subsistema existe y es `SIGOC`, identificador 11.** Confirmado el 2026-08-17 contra
> `GET /roles/bySubsystem` del servidor de desarrollo, que devuelve el mapa completo:
>
> | id | subsistema | roles | | id | subsistema | roles |
> |---|---|---|---|---|---|---|
> | 1 | Seguridades | 1 | | 7 | Actas de Advertencia | 4 |
> | 2 | Timbre | 1 | | 8 | Actas-advertencia | 0 |
> | 3 | Chat | 0 | | 9 | Trabajo comunitario | 0 |
> | 4 | IVs | 2 | | 10 | Monitoreo | 1 |
> | 5 | Inspección | 17 | | **11** | **SIGOC** | **26** |
> | 6 | Vehículos | 4 | | | | |
>
> **El Cuadro de Colores no tiene subsistema propio: vive dentro de SIGOC.** Eso corrige lo que
> este documento decía antes —«SIGOC-CCO no está registrado»—: sí lo está, pero como parte de un
> subsistema que comparte con Ejecución, Instrucción y Resolución.
>
> `AUTH_SUBSISTEMA_ID=11` ya está en `.env.example`.
>
> **Lo que sigue abierto de este punto:** los 26 roles de SIGOC son de Ejecución, Instrucción,
> Resolución y administración; **ninguno es del Cuadro de Colores**. Eso no impide entrar —basta
> tener cualquier rol de SIGOC— pero mantiene en pie el §3: el rol del cuadro lo decide
> `t_usuario`, no Auth.

`POST /auth` falla antes de llegar a ninguna parte si el usuario no tiene roles del subsistema:

```ts
// backend/src/auth/auth.controller.ts:63
if (subsystems.length === 0) throw new Error('Subsistemas no asignados al usuario');
```

**Qué hace falta en Auth**, y es trabajo de administración, no de código:

1. Una fila en `subsystems` para SIGOC-CCO, con su `path` (D-1).
2. Filas en `Module` para las pantallas que se quieran ver en su menú.
3. Filas en `Role` ligadas a ese subsistema.
4. Asignar esos roles a cada usuario que deba entrar.

> **Nota sobre los identificadores.** `backend/src/constants/subsystems.ts` tiene los IDs
> **codificados a mano** (`timbre 2`, `ivs 4`, `inspeccion 5`) y deben coincidir con la tabla.
> SIGOC-CCO **no está ahí**. Si nuestro módulo necesitara un endpoint dedicado como `/auth/timbre`,
> haría falta tocar Auth; **con el flujo de `exchange` no hace falta**, y es una razón más para no
> pedir un endpoint propio.

### D-7 · El Auth desplegado va por detrás del repositorio 🔴 · **NUEVO**

No estaba en la lista porque no se podía saber sin sondear el servidor. Comprobado el
2026-08-17 contra `172.20.136.127:10004`:

| | `project_auth/auth` 1.6.5 | Lo desplegado |
|---|---|---|
| Token de sesión | `{userId, cedula, tokenType, sessionId, subsystemId, roleIds}` | **`{userId, iat, exp}`** |
| `POST /auth` devuelve | `subsystems[]` | `roles[]` con `{id, role, subsystem, label}` |
| `POST /auth/role` recibe | `{subsystemId}` | **`{username, roleId}`** |
| Respuesta del canje | `{token, permissions, username, roles}` | `{token, permissions, username}` |

**Dos consecuencias, y la segunda es de seguridad:**

1. La verificación de este módulo se adaptó: `tokenType` y `subsystemId` se comprueban **solo si
   el token los declara**, y su ausencia se advierte en el registro en cada canje. Sin eso, la
   integración sería inservible contra el único Auth que hay.
2. **La comprobación de subsistema del §4.3 no se puede ejecutar hoy.** `AUTH_SUBSISTEMA_ID=11`
   queda configurado y documentado, pero mientras el token no traiga `subsystemId` **no hay forma
   de saber si un código fue emitido para el Cuadro de Colores o para otro módulo de SIGOC**. Se
   cierra actualizando el Auth desplegado, no tocando este código.

> **Consecuencia práctica para la reunión:** conviene preguntar qué versión está desplegada en
> cada ambiente antes de fijar el contrato, porque el repositorio y el servidor no coinciden.

---

## 3. El hallazgo que abarata el trabajo

`t_usuario` ya tiene la columna de correspondencia, y el propio esquema lo dice:

```prisma
// transporte-backend/prisma/schema.prisma
/// Active Directory no este disponible. La columna de correspondencia ya existe
/// para que la integracion no requiera migracion.
model Usuario {
  id              Int      @id @map("usua_id")
  correo          String   @unique @map("usua_correo")
  nombre          String   @map("usua_nombre")
  rol             RolDepartamental @map("usua_rol")
  identificadorAd String?  @map("usua_identificador_ad")   // ← la llave
  funcionarioId   Int?     @unique @map("func_id")          // ← el enlace de P-06
  activo          Boolean  @default(true) @map("usua_activo")
}
```

**El reparto queda limpio: Auth central dice QUIÉN es; SIGOC-CCO decide QUÉ ROL tiene.**

```
username (de Auth)  →  t_usuario.identificadorAd  →  { id, nombre, rol, funcionarioId }
```

Es exactamente el principio que ya rige el modo provisional, escrito en `usuarios-prueba.ts`:

> *«El cliente indica QUIÉN dice ser; el rol que le corresponde lo decide el servidor con esta
> tabla. Un cliente no puede reclamar un rol que no le pertenece cambiando una cabecera.»*

**Y esquiva el problema que parecía el más grande.** Auth modela permisos como la tupla
`(roleId, moduleId)` con `write` y `scope`; SIGOC-CCO decide con `RolDepartamental` y
`FormularioRolGuard` consultando `t_formulario`. Traducir uno al otro sería inventar
correspondencias que nadie ha acordado. **No se traduce: se ignora.** Los `permissions` que
devuelve el exchange no gobiernan este módulo; sirven, como mucho, para el menú.

> Esto conserva intacta la regla más fuerte del diseño de autorización: `FormularioRolGuard`
> consulta `t_formulario` y **nunca confía en el cuerpo de la petición**. Ahora tampoco confiará
> en lo que diga Auth.

---

## 4. Las tres decisiones que le corresponden a usted

### 4.1. El prefijo de las rutas

La guía fija `/auth/session/exchange`, `/auth/session`, `/auth/session/logout`. SIGOC-CCO monta
**todo** bajo `/api/v1` (`main.ts`, `appConfig.server.prefijoApi`).

**Recomiendo `/api/v1/auth/session/*`**: la coherencia interna vale más que la literalidad de la
guía, y `httpClient` ya construye su `baseURL` con ese prefijo. **Hay que avisarlo** a quien fijó
el contrato, porque otros módulos podrían asumir la ruta desnuda.

### 4.2. El sobre de la respuesta

La guía impone `{success, data, correlationId, requestId}` y el código de error
`APP-UNAUTHORIZED-001`. SIGOC-CCO tiene su `AllExceptionsFilter` con otro formato, y una regla de
interfaz que dice que **los mensajes del servidor se muestran tal cual** porque están redactados
para el funcionario.

**Recomiendo usar el sobre de la guía solo en los tres endpoints de sesión** y no tocar el resto
de la API. Son endpoints de infraestructura que ninguna pantalla de trabajo consume.

### 4.3. El perfil mínimo no basta

La guía limita el perfil a `{username, displayName}`. **Este frontend monta las pantallas según el
rol** —regla de interfaz nº 4: *«un perfil no autorizado no tiene el componente en memoria»*—, así
que necesita el rol para decidir qué construir.

**Recomiendo extender `GET /auth/session`** con `rol` y `rolName`. Es una ampliación del contrato
compartido: **hay que acordarla**, no darla por hecha.

> **Y una comprobación que la guía no pide y conviene añadir.** El JWT de Auth trae `subsystemId`.
> El backend debe verificar que coincide con el de SIGOC-CCO: sin eso, un `redirectCode` emitido
> para Timbre o para IVs se podría canjear contra este módulo. Es una línea, y cierra un agujero
> real.

---

## 5. Dependencias nuevas · requieren autorización

`CLAUDE.md` §2 del backend prohíbe dependencias fuera del stack sin autorización previa.

| Paquete | Para qué | ¿Evitable? |
|---|---|---|
| `cookie-parser` | Leer la cookie de sesión en el guard | No |
| `@nestjs/jwt` **o** `jsonwebtoken` | Firmar el JWT propio y verificar el de Auth | No |
| ~~`axios` / `@nestjs/axios`~~ | Llamada servidor-a-servidor a Auth | **Sí.** Node 20 trae `fetch` global |

Dos paquetes, ambos maduros y sin árbol de dependencias significativo. **`jsonwebtoken` es además
el mismo que usa Auth**, lo que garantiza compatibilidad de firma sin sorpresas.

---

## 6. El trabajo, por repositorio

### 6.1. Backend `transporte-backend`

**Submódulo nuevo `src/modules/identidad/`**, en las cuatro capas del proyecto:

| Capa | Archivo | Responsabilidad |
|---|---|---|
| `presentation/` | `sesion.controller.ts` | Los tres endpoints. `exchange` y `logout` públicos; `session` protegido |
| `presentation/dto/` | `canjear-codigo.dto.ts` | Un solo campo, `code`. Con `forbidNonWhitelisted` activo, nada más entra |
| `application/` | `sesion.service.ts` | Llama a Auth, verifica el JWT, resuelve la identidad, emite el token propio |
| `infrastructure/` | `usuario.repository.ts` | `identificadorAd` → fila de `t_usuario`. Único punto que toca Prisma |

**El servicio, paso a paso:**

1. `fetch(AUTH_EXCHANGE_URL + '?code=' + code)`.
2. Verificar el JWT recibido con `AUTH_JWT_SECRET`, HS256: firma, `exp` y `tokenType === 'session'`.
3. **Verificar que `subsystemId` es el de SIGOC-CCO** (§4.3).
4. Resolver `username` → `t_usuario`. Si no hay fila o `activo = false`, `401` con un mensaje
   escrito **para el funcionario**: *«Su cuenta no está habilitada en el Cuadro de Colores.
   Solicite el alta al administrador del módulo.»*
5. Firmar el JWT propio con `usuarioId`, `rol`, `nombre` y `funcionarioId`.
6. Ponerlo en la cookie `HttpOnly`, `SameSite=lax`, `Path=/`, `Secure` según ambiente.
7. Devolver solo el perfil. **Nunca el token.**

**`IdentidadGuard`** (`src/common/auth/guards/identidad.guard.ts`) — se le agrega el modo cookie
junto al provisional. Sigue siendo **síncrono**: verificar el JWT propio no toca red, base ni
Redis. Sigue llenando `request.user` con el mismo `UsuarioAutenticado`, así que **la cadena de
guardas que viene después no cambia ni una línea** — `RolesGuard`, `FormularioRolGuard` y
`VentanaCargaGuard` quedan intactos. Esa parte de la promesa de diseño sí se cumple.

**Lo que no cambia:**

- `main.ts` solo suma `cookie-parser`. El CORS **ya** tiene `credentials: true` y lista blanca por
  `CORS_ORIGINS`.
- El identificador de correlación ya existe (`correlacionMiddleware`).
- **Ninguna migración de esquema.** `identificadorAd` y `funcionarioId` ya existen.

**Configuración**, en `app.config.ts` con el estilo tipado del archivo:

```env
AUTH_EXCHANGE_URL=http://auth-api.localhost/auth/exchange
AUTH_JWT_SECRET=<compartido con Auth · no se versiona>
AUTH_SUBSYSTEM_ID=<el que asigne Auth>
SESION_JWT_SECRET=<propio del módulo · no se versiona>
SESION_COOKIE_NOMBRE=cuadro_colores_sesion
SESION_COOKIE_SEGURA=false        # true en producción con HTTPS
SESION_COOKIE_SAME_SITE=lax
MODO_IDENTIDAD_PROVISIONAL=false  # se apaga en la etapa 5
```

### 6.2. Frontend `transporte-frontend`

| Archivo | Cambio |
|---|---|
| `api/httpClient.ts` | `withCredentials: true`; se retira la cabecera `x-usuario-prueba`; se agrega `X-Request-Id`; interceptor de `401` que **excluye** `/auth/session/*` |
| `config/routes.tsx` | Ruta **pública** `/auth/callback`, fuera del mapa `CONSTRUIDAS` |
| `pages/AuthCallbackPage.tsx` | Lee `code`, ejecuta el exchange **una sola vez**, limpia la URL con `replace` y navega al destino |
| `providers/` | Arranque de sesión: `GET /auth/session` al montar; guarda de rutas privadas |
| `context/UserContext` | Se hidrata desde la sesión real en lugar de `localStorage` |
| `pages/LoginPage.tsx` | **Se retira.** La guía prohíbe formulario de login local |
| `config/usuariosPrueba.ts` · `api/identidadProvisional.ts` · `components/navbar/SelectorRolPruebas.tsx` | **Se retiran** en la etapa 5 |

**Se usa Context, no Redux.** La guía supone Redux porque está escrita para otro frontend de la
institución; introducir otro sistema de estado violaría la skill `stack-frontend-amc`.

**`LoginPage` merece una confirmación aparte.** Tiene diseño propio en `styles/auth/auth.css` y es
la única pantalla que desaparece. Con Auth central, el ingreso ocurre en el portal.

---

## 7. El prerrequisito que se vuelve camino crítico

**`t_usuario` está vacía** —es el defecto F-02— y **no hay ninguna pantalla que la pueble**.

Hoy eso solo rompe P-06. **Con la identidad real encendida, deja a todo el mundo fuera:** el paso 4
del §6.1 no encuentra a nadie y todas las cuentas reciben `401`.

Así que F-01 y F-02 dejan de ser «la primera acción de desarrollo pendiente» y pasan a ser **parte
de esta integración**:

| | Qué | Coste |
|---|---|---|
| **F-01** | Agregar `FUNCIONARIO` al enum `RolDepartamental` | **Es una migración**, aunque parezca una línea |
| **F-02** | Poblar `t_usuario` con `identificadorAd`, `rol` y `funcionarioId` | **Decisión suya**: pantalla de administración, semilla, o carga SQL en el despliegue |

**Recomiendo la pantalla**, aunque sea la opción cara. La correspondencia usuario ↔ funcionario ↔
rol va a cambiar con cada rotación mensual de personal, y una carga por SQL convierte cada alta en
un ticket para el equipo de desarrollo. Pero es su decisión: por semilla se avanza mucho antes.

---

## 8. Las cinco etapas

Cada una se verifica por separado, y el árbol de trabajo queda limpio entre una y otra.

| # | Etapa | Contenido | Se puede verificar con |
|---|---|---|---|
| # | Etapa | Estado |
|---|---|---|
| **1** | **Coordinación** · los desajustes del §2 y las decisiones del §4 | ✅ 17-AGO. Cinco de siete cerrados; los dos abiertos son de Auth central |
| **2** | **Backend** · los tres endpoints y el modo cookie del guard | ✅ 17-AGO |
| **3** | **Datos** · F-01 (migración del enum) y F-02 (poblado de `t_usuario`) | ✅ 17-AGO. Desbloqueó P-06 |
| **4** | **Frontend** · callback, arranque de sesión, guarda | ✅ 18-AGO |
| **5** | **Apagado** del modo provisional | ✅ 18-AGO. Ver abajo |
| — | **Corrección de los defectos del navegador** | ✅ 18/19-AGO. Ver §13 |

**El orden importaba y se respetó**: la etapa 2 era reversible porque el modo provisional seguía
encendido, así que el sistema funcionó igual que antes hasta que 1–4 estuvieron probadas.

> **ETAPA 5 COMPLETADA el 2026-08-18.** Desaparecieron del backend `usuarios-prueba.ts`,
> `MODO_IDENTIDAD_PROVISIONAL` y la cabecera `x-usuario-prueba`; del frontend ya se habían ido en
> la etapa 4. **Ya no hay más de una forma de autenticarse.**
>
> Lo que costó, y no estaba previsto: **las trece suites de integración usaban la cabecera**, cada
> una con su propia copia de `const como = …`. Se sustituyeron por `test/identidad-de-prueba.ts`,
> que firma una cookie de sesión real. Las pruebas dejaron de ejercitar un modo que solo existía
> para ellas y pasaron a usar el mismo camino que el navegador. **283 de 283 en verde.**
>
> Y hizo falta registrar `cookie-parser` en cada suite: construyen su propia aplicación de Nest y
> ninguna lo hacía, así que la cookie no se interpretaba y todo respondía 401.

**Lo que la etapa 5 advertía antes de hacerse**, y que sigue siendo verdad para quien vuelva sobre
esto: retirar los perfiles de prueba antes de que 1–4 estén probadas deja la aplicación **sin
ninguna forma de autenticarse**. Es lo que `DOCUMENTACION_INCONSISTENCIAS.md` ya había escrito
en I-07.

---

## 9. Pruebas y verificación

**Backend.** Pruebas unitarias del servicio de sesión con el exchange simulado, cubriendo:
código ausente, código ya consumido, JWT con firma inválida, JWT vencido, `subsystemId` de otro
módulo, y `username` sin fila en `t_usuario`. Prueba de integración de los tres endpoints.

**Frontend.** Las pruebas existentes verifican **decisiones**, no maquetado, y esa regla se
mantiene: se prueba que una ruta privada sin sesión redirige al portal, y que el exchange se
ejecuta **una sola vez**.

**Las diez pruebas mínimas de la guía**, ejecutadas sobre el sistema levantado. La décima es la
que cierra el patrón: **en DevTools no debe existir ningún JWT** en Storage, en la URL ni en los
registros.

### Lo que se ejecutó, al 19 de agosto de 2026

```
backend      738 unitarias · 283 de integración · lint y build limpios
frontend     258 de interfaz · lint y build limpios
contenedores transporte-front :5180 · transporte-app :3003 · transportedb :5434, los tres sanos

canje                       200 · ffnavarrete · DMIP_OPERATIVOS
cookie HttpOnly             ✓        el cuerpo no lleva el token   ✓
sesión viva                 200
/matriz con rol ajeno       403      código reutilizado            401
logout 200, y después       401
recorrido desde el portal   entra con UN clic, y /home muestra la barra del rol
```

**Y una lección de método**, que es lo que §13 documenta: estas comprobaciones se dieron por
suficientes y **no lo eran**. Ninguna de las de línea de comandos ejecuta JavaScript ni mantiene
estado entre páginas, así que tres defectos reales sobrevivieron a todas ellas.

**Comandos, antes de dar por cerrada cada etapa:**

```bash
cd transporte-backend  && npm test && npm run test:integracion && npm run lint && npm run build
cd ../transporte-frontend && npm test && npm run lint && npm run build
```

---

## 10. Lo que este plan no resuelve, y conviene decir

- **El cierre de sesión global.** `POST /auth/session/logout` borra la cookie **de este módulo**.
  Auth central no publica hoy un endpoint de revocación, así que la sesión en Redis sigue viva y
  el usuario puede volver a entrar sin credenciales desde el portal. La guía lo admite
  explícitamente y pide no improvisarlo. **Queda abierto con Auth central.**
- **El secreto compartido HS256** (§ D-4), que hace que cada módulo integrado pueda firmar tokens
  válidos para los demás.
- **El `ENVIRONMENT` de Auth.** En `dev` y `test`, Auth **omite la verificación de contraseña
  contra Keycloak**: cualquier clave entra (`auth.controller.ts:54`). Es cómodo para desarrollar y
  **no debe confundirse con el comportamiento de producción** al validar la integración.
- **Qué se hace con `permissions` y `roles`** que devuelve el exchange. Este plan los descarta
  (§3). Si en el futuro el menú de SIGOC-CCO debe salir de Auth, es trabajo nuevo.

---

## 11. Cómo se comprobó

```bash
AUTH=C:/Users/Administrador/Documents/project_auth/auth

# §1 · El contrato real
grep -n "@Get('exchange')\|@Get('session/validate')" $AUTH/backend/src/auth/auth.controller.ts
grep -n -A8 'generateSessionToken' $AUTH/backend/src/auth/auth.service.ts
grep -n 'Bearer' $AUTH/docs/auth_v1.5.md
grep -rn 'session/exchange\|httpOnly\|cookie' $AUTH/backend/src      # → sin resultados

# §2 · Los desajustes
grep -n -A5 'buildUrlWithCode' $AUTH/frontend/src/auth/login/login.helpers.ts   # D-1
grep -n 'path: ""' $AUTH/frontend/src/router.tsx                                # D-2
cat $AUTH/backend/src/constants/subsystems.ts                                   # D-6
grep -n 'Subsistemas no asignados' $AUTH/backend/src/auth/auth.controller.ts    # D-6

# §3 · La llave que ya existe
grep -n 'identificadorAd\|funcionarioId' transporte-backend/prisma/schema.prisma

# §5 y §6 · El punto de partida del módulo
grep -nE 'cookie|jwt|jose|axios' transporte-backend/package.json     # → sin resultados
grep -n 'credentials' transporte-backend/src/main.ts                 # → ya en true
```

---

## 13. Los tres defectos que solo aparecieron en el navegador

Los tres se descubrieron **después** de dar la integración por probada, y ninguno era visible con
las herramientas con que se había verificado. Merecen quedar escritos porque el patrón se repite.

### 13.1. `crypto.randomUUID is not a function` · toda la aplicación caída

**Síntoma.** Al volver del portal, tarjeta de error: «No se pudo iniciar sesión —
`crypto.randomUUID is not a function`».

**Causa.** `crypto.randomUUID()` solo existe en **contextos seguros**: HTTPS, o `localhost`. El
frontend se estaba sirviendo por HTTP desde `172.20.136.73:5180`, y ahí el navegador no expone esa
función.

**Y no era un fallo del ingreso.** `createCorrelationId()` corre en el interceptor de **cada**
petición de `httpClient`, así que en ese contexto **la aplicación entera estaba rota**; el ingreso
fue simplemente lo primero que la tocó.

**Por qué no se detectó.** Las dos formas en que se verificó lo ocultaban: `curl` no ejecuta
JavaScript, y `localhost` **sí** es contexto seguro. Una comprobación que devuelve 200 dice que el
servidor entregó el archivo, no que el archivo funcione.

**Arreglo** — `src/api/correlationId.ts`, tres niveles: `crypto.randomUUID()` si existe;
`crypto.getRandomValues()`, que **sí** está disponible sin contexto seguro, componiendo el UUID v4;
y `Math.random()` como último recurso, que no es criptográfico y no necesita serlo —esto identifica
una petición en el registro, no autentica nada—. El formato sigue encajando en
`/^[A-Za-z0-9._:-]{8,60}$/`, que es lo que valida el middleware del servidor.

**Se mantiene aunque el origen ya sea `localhost`**: en producción sobre HTTP en cualquier otro
origen el fallo vuelve.

### 13.2. Había que pulsar el rol dos veces

**Síntoma.** El primer clic en «Transporte - Operativos» devolvía al portal; el segundo entraba.

**Causa, y era nuestra.** `UserProvider` exponía el `setUser` crudo del `useState`: movía `user` y
**dejaba `estado` como estuviera**. Y `RutaConSesion` decide con `estado`.

Al llegar del portal la aplicación arranca en `/auth/callback` **sin cookie todavía**, así que el
arranque consultaba `GET /auth/session`, recibía «no hay sesión» y fijaba `estado = "sinSesion"`.
El canje iba bien —cookie puesta, 200— y llamaba a `setUser(perfil)`, pero `estado` se quedaba
atrás; al navegar a `/home` la guarda leía `"sinSesion"` y devolvía al portal. **El segundo clic
entraba gracias al primero:** la cookie que aquél dejó ya existía al arrancar.

**Y escondía una segunda carrera.** La consulta del arranque y el canje salen a la vez, y el canje
tarda más porque habla con Auth central. Si la respuesta «no hay sesión» llegaba después, borraba
una sesión válida: un fallo que se gana o se pierde según la red, y que habría reaparecido de forma
intermitente aunque solo se hubiera corregido lo primero.

**Arreglo.** `user` y `estado` son **un mismo hecho** y solo se mueven juntos. Se retiró `setUser`
del contexto y se sustituyó por `establecerSesion(perfil)`, que fija los dos; el provider lleva una
bandera para que la consulta tardía del arranque no pise la sesión recién canjeada. De paso
desapareció la copia del armado del usuario que la página de callback duplicaba del provider —una
segunda copia es una segunda ocasión de que difieran—.

**Prueba de regresión**, en `src/components/sesion/sesion.spec.tsx`, con el `UserProvider` **real**
porque el fallo no estaba en ningún componente sino en la coordinación entre arranque y canje. Se
comprobó que sirve: degradado el provider al comportamiento anterior, **las dos fallan**.

### 13.3. El choque de rutas en Auth · 409

**Síntoma.** `PUT /modules/80` con `localhost:5176` → 409.

**Causa.** Ese valor exacto lo tenía **Admin Core** (módulo 76). La unicidad es sobre la **cadena
completa**, no sobre el puerto.

**Arreglo.** El frontend se movió al **5180**, fuera de la banda 5173–5179 donde viven los demás
frontales de SIGOC y por la que Vite salta solo cuando encuentra ocupado. Se añadió
`strictPort: true`, para que falle en vez de moverse en silencio: ese salto ya había costado dos
días de probar una versión antigua creyendo que era la recién construida.

### Lo que los tres tienen en común

**Ninguno se podía ver desde la línea de comandos.** `curl` comprueba que el servidor responde;
no ejecuta el JavaScript, no mantiene estado entre páginas y no distingue contexto seguro. Para un
flujo que vive en el navegador —redirecciones, cookies, estado de React— **la verificación tiene que
pasar por un navegador**, o por pruebas que simulen uno.

---

## 12. Constancia

**Cuando se escribió, el 17 de agosto, no se había modificado ningún archivo de código.** Eso dejó
de ser cierto el 18: las etapas 2 a 5 se implementaron con su aprobación, y este apartado se
conserva para dejar constancia de que **el plan precedió al código**, no al revés.

**Lo que sigue sin tocarse:** los `INTEGRACION_AUTH_*.md` de la raíz —son contrato compartido, no
nuestro— y el proyecto `project_auth`. Del lado de Auth central se cambió **un dato**, la ruta del
módulo 80, y con autorización.

**Todo lo que este documento afirma se comprobó contra el servidor desplegado**, no contra su
repositorio. Esa distinción es la que costó tres diagnósticos equivocados en §D-1, y es la
recomendación con la que conviene cerrar: **para un servicio desplegado, el repositorio es una
hipótesis.**
