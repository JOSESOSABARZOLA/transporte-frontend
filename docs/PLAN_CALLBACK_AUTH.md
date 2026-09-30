# Plan · cerrar el regreso desde el portal de Auth

**Módulo Transportes / Cuadro de Colores Operativo (SIGOC-CCO)**
18 de agosto de 2026 · **ejecutado** · nota de cierre del 19 de agosto de 2026

> **EJECUTADO, POR EL CAMINO A, Y FUNCIONA.** Este documento acertó en lo esencial —el callback es
> del frontend, y no hacía falta escribir código— pero **el valor que proponía no sirvió**:
> `localhost:5176` daba 409, porque esa cadena exacta la tenía Admin Core (módulo 76). La unicidad
> es sobre la ruta completa, no sobre el puerto.
>
> **Quedó en `localhost:5180`.** El frontend se movió a ese puerto, fuera de la banda 5173–5179 por
> la que Vite salta solo cuando encuentra ocupado.
>
> Y al probarlo en un navegador aparecieron **tres defectos que ninguna comprobación con `curl`
> podía ver**. Están en `PLAN_INTEGRACION_AUTH.md` §13, que es hoy la referencia viva; este
> documento se conserva por su §2.1 y su §7, donde está la lectura del portal desplegado que
> destapó el diagnóstico equivocado.

Complementa a `PLAN_INTEGRACION_AUTH.md`, que cubre la integración entera. Éste ataca **lo único
que falta**: que el portal devuelva al usuario al sitio correcto.

---

## 0. Conclusión primero

**No hace falta escribir código.** El mecanismo del portal encaja exactamente con lo que ya está
construido. Falta **un valor en la base de Auth central** y **tres líneas de configuración** aquí.

Y hay que corregir un diagnóstico mío anterior, que está escrito en dos documentos del proyecto y
es falso. Ver §7.

---

## 1. Documentación relevante

| Documento | Qué aporta |
|---|---|
| `INTEGRACION_AUTH_CENTRAL_FRONTEND.md` | **Fija que el callback es del frontend.** Lo nombra siete veces, y su requisito de producción —«garantizar *fallback* SPA para `/auth/callback`»— solo tiene sentido en una aplicación de una sola página |
| `INTEGRACION_AUTH_CENTRALIZADO_BACKENDS.md` | Confirma el reparto: «`POST /auth/session/exchange` **es público**, lo llama el frontend al llegar a su callback `/auth/callback?code=…`» |
| `PLAN_INTEGRACION_AUTH.md` | Estado de la integración. **Su §D-1 está equivocado**, ver §7 |
| `ANALISIS_EVOLUCION_PROYECTO.md` §5 | Ídem |
| `transporte-frontend/CLAUDE.md` §7 | La regla 4 de interfaz: las pantallas se montan según el rol |
| `transporte-backend/CLAUDE.md` §5 | Los siete roles y de dónde sale la identidad |

**Y una fuente que no es documentación: el código servido del portal.** Es lo único que dice cómo se
comporta de verdad, y es donde estaba la respuesta.

---

## 2. Comportamiento actual

### 2.1. Lo que hace el portal, leído de su propio código

```js
V = (permisos) => permisos.filter(p => p.path?.trim())
                          .sort((a,b) => a.order - b.order)[0]?.path ?? null

Hg = (path, code) => {
  const s = tm(path);                                    // añade http:// si falta; quita barras finales
  Ph(s);                                                 // valida contra lista blanca (hoy vacía = todo permitido)
  window.location.href = em(`${s}/auth/callback`, code);  // ← EL PORTAL AÑADE /auth/callback
}
```

**Tres hechos que se deducen de ahí, y ninguno estaba documentado:**

1. El destino sale del **primer permiso con `path`, ordenado por `order`**. No de `subsystems.path`.
2. **El portal compone `/auth/callback` por su cuenta.** El `path` del permiso debe ser **solo el
   origen**.
3. El esquema es opcional: `tm()` antepone el del portal si falta.

### 2.2. El dato que hoy está mal

```json
{ "write": true, "scope": "all", "path": "localhost:3003",
  "icon": "FaCar", "label": "Transporte", "order": 62 }
```

`localhost:3003` es el **backend**. El portal compone `http://localhost:3003/auth/callback?code=…`
y ahí no hay nada:

```
GET :3003/auth/callback?code=X          →  404
GET :3003/api/v1/auth/callback?code=X   →  404
GET :5176/auth/callback?code=X          →  200   ← el frontend sí la tiene
```

### 2.3. Lo que sí funciona ya

Todo lo demás. Comprobado hoy de punta a punta contra el Auth real:

```
canje                       200 · ffnavarrete · DMIP_OPERATIVOS
cookie HttpOnly             ✓        el cuerpo no lleva el token   ✓
sesión viva                 200
/matriz con rol ajeno       403      código reutilizado            401
logout 200, y después       401
```

---

## 3. Comportamiento solicitado y diferencia

| | |
|---|---|
| **Solicitado** | Entrar en el portal, elegir rol, y aterrizar en el frontend con sesión abierta |
| **Diferencia** | **Un valor**: el puerto del `path`. 3003 es el backend; el frontend es el 5176 |

---

## 4. Los dos caminos

### Camino A · el frontend recibe el callback — **recomendado**

Es lo que fijan los dos documentos y lo que ya está construido.

```
portal ──> http://localhost:5180/auth/callback?code=X       (valor final, 19-AGO)
             │
             AuthCallbackPage          (existe)
             │  POST /api/v1/auth/session/exchange
             │
             backend canjea contra Auth, verifica firma,
             resuelve t_usuario, emite cookie HttpOnly
             │
             └──> /home
```

**Cambios:** un valor en Auth, tres líneas de configuración aquí. **Código nuevo: ninguno.**

### Camino B · el backend recibe el callback

Se deja el `path` en 3003 y se añade al backend un `GET /auth/callback` que canjea en el servidor y
redirige al frontend con la cookie ya puesta.

**Es técnicamente viable**: las cookies no distinguen puerto (RFC 6265 §8.5), así que una emitida
por `:3003` viaja a `:5176`. Y tiene una ventaja real: **el código nunca toca el JavaScript del
navegador**.

**Pero contradice el contrato compartido**, que sitúa el callback en el frontend en los dos
documentos. Y exige un endpoint nuevo, su prueba y su documentación.

**Cuándo elegirlo:** si el `path` del módulo lo administra otro equipo y no se puede cambiar en un
plazo razonable. Entonces deja de ser una preferencia de diseño y pasa a ser la única salida.

---

## 5. Impacto — Camino A

| Pregunta | Respuesta |
|---|---|
| **Impacto funcional** | El ingreso queda cerrado de extremo a extremo. Ninguna pantalla cambia |
| **Impacto técnico** | Solo configuración. Ningún módulo, servicio ni componente se toca |
| **Archivos afectados** | `transporte-backend/.env` · `.env.example` · `docker-compose.yml` · `transporte-frontend/.env.dev` |
| **Archivos nuevos** | **Ninguno** |
| **APIs afectadas** | **Ninguna.** Los tres endpoints de sesión ya existen |
| **Cambios de base de datos** | **Ninguno** en SIGOC-CCO. Uno en la de Auth, que no es nuestra |
| **Migraciones Prisma** | **Ninguna** |
| **Componentes React** | **Ninguno.** `AuthCallbackPage`, `RutaConSesion` y `sesion.service.ts` ya están |
| **Servicios NestJS** | **Ninguno.** `SesionService`, `IdentidadGuard` y `token-sesion` ya están |
| **Pruebas necesarias** | Ninguna nueva. Las 734 unitarias, 283 de integración y 250 de interfaz ya cubren esto |
| **Documentación** | `PLAN_INTEGRACION_AUTH.md` §D-1 y `ANALISIS_EVOLUCION_PROYECTO.md` §5, **para corregir el diagnóstico equivocado** (§7) |

### 5.1. Los cambios, uno por uno

**En Auth central** — módulo 80 «Transporte», o el permiso que lo referencia:

```
path:  localhost:3003        →   localhost:5180        ← valor final, 19-AGO
```

> Se propuso primero `172.20.136.73:5176` y luego `localhost:5176`. El segundo dio **409**: lo tenía
> Admin Core. El primero funcionaba, pero **no es contexto seguro** y rompía `crypto.randomUUID`.
> De ahí el 5180.

Sin `/auth/callback`: lo añade el portal. El esquema es opcional.

**En SIGOC-CCO:**

| Archivo | Valor | Por qué |
|---|---|---|
| `transporte-backend/.env` | `CORS_ORIGINS=http://localhost:5180,http://172.20.136.73:5180` | Otro origen es otro sitio para el navegador, y con credenciales descarta la respuesta |
| `.env.example` y `docker-compose.yml` | Igual | Para que el despliegue no repita el fallo |
| `transporte-frontend/.env.dev` | `VITE_API_BASE_URL=http://localhost:3003` | Solo para `npm run dev`; ver la nota |

> **Valores finales del 19-AGO.** En Docker `VITE_API_BASE_URL` **queda vacía a propósito**: el
> navegador pide `/api/v1/…` a su propio origen y el nginx de la imagen lo reenvía al backend.
> Mismo origen, así que ni CORS ni cookies entre sitios entran en juego por ese camino; `CORS_ORIGINS`
> importa solo para `npm run dev`.
>
> Y `localhost:5180` **solo funciona en la máquina que abre el navegador**. Se eligió igualmente
> porque es **contexto seguro**, sin el cual `crypto.randomUUID` no existe. Para que pruebe otra
> persona hace falta la IP o un nombre, y entonces HTTPS deja de ser opcional.

---

## 6. Verificación

Cada paso comprobable por separado, y en este orden:

| # | Comprobación | Resultado esperado |
|---|---|---|
| 1 | `GET /auth/exchange` tras elegir rol 53 | `permissions[0].path` = el origen del frontend |
| 2 | Abrir el portal y elegir *Transporte - Operativos* | Aterriza en `…:5176/auth/callback?code=…` |
| 3 | Pestaña Network | Un solo `POST /auth/session/exchange`, y responde `200` |
| 4 | Application → Cookies | `cuadro_colores_sesion` con **HttpOnly** |
| 5 | Application → Local Storage | **Vacío**: ni token, ni perfil |
| 6 | La aplicación | Aterriza en `/home` con la barra lateral del rol |
| 7 | Recargar con F5 | Sigue dentro: la sesión la sostiene la cookie |
| 8 | Cerrar sesión | Borra la cookie y sale al portal; volver a `/home` expulsa |
| 9 | Las tres suites | 734 · 283 · 250, sin cambios |

Los pasos 1 y 2 son de Auth; del 3 al 8, del navegador; el 9, nuestro.

---

## 7. Contradicción que debo declarar

**`PLAN_INTEGRACION_AUTH.md` §D-1 y `ANALISIS_EVOLUCION_PROYECTO.md` §5 dicen que el bloqueo es
`subsystems.path` de SIGOC, vacía. Es falso.**

Lo deduje del código del repositorio `project_auth/auth` 1.6.5, donde `getSubsystemPathById()` lee
esa columna. **El portal desplegado no la usa**: resuelve el destino desde `permissions`, como
demuestra su propio paquete JavaScript (§2.1).

Las dos afirmaciones hay que corregirlas. Y con ellas cae una advertencia que repetí varias veces:
que la ruta era **una sola por subsistema** y escribir la nuestra rompería a Ejecución, Instrucción
y Resolución. **No es así**: al salir de un permiso ligado a un módulo, cada módulo de SIGOC tiene
el suyo sin estorbarse, y **el Cuadro de Colores no necesita subsistema propio**.

> Cómo se detectó: la pantalla de error del portal —«El rol seleccionado no tiene una ruta de
> destino configurada»— habla del **rol**, no del subsistema. Esa palabra fue la que llevó a buscar
> en el código servido en vez de en el repositorio.

---

## 8. Riesgos

| Riesgo | Gravedad | Qué hacer |
|---|---|---|
| **`permissions` trae `write:true, scope:"all"`** | 🟠 | **Este módulo ignora los permisos de Auth**: decide con `RolDepartamental` y `FormularioRolGuard`. Ese `all` no concede nada aquí, pero quien lo lea suponiendo que sí se llevará una idea equivocada de quién puede qué. Conviene dejarlo escrito |
| El `path` con `localhost` solo funciona en la máquina que lo abre | 🟠 | Usar la IP. `Resolución` y `Admin Core` ya tienen ese defecto en la tabla de módulos |
| La lista blanca del portal —`Ug()`— podría rechazar el destino | 🟡 | Hoy está vacía y admite todo. Si la llenan, incluir nuestro origen |
| `AUTH_COOKIE_SECURE=false` | 🟡 | Correcto sobre HTTP. **En producción con HTTPS debe ser `true`**, o el navegador descarta la cookie |
| El secreto HS256 es compartido | 🟠 | Cualquier módulo integrado puede firmar tokens válidos para los demás. Plantear RS256 con clave pública antes de producción |
| Si el backend cae, el frontend rebota al portal | 🟡 | El contrato pide «*fallback* seguro» ante error técnico, y hoy no se distingue de un 401. **Es trabajo aparte**, fuera del alcance de este plan |

---

## 9. Lo que este plan NO incluye

Fuera de alcance, y se nombra para que no se confunda con lo que sí:

- El rol **`Transporte - Funcionario`**, que no existe en Auth y deja P-06 inaccesible.
- Que el canje devuelva `roles` y el token lleve `subsystemId`, sin lo cual **no se puede comprobar
  que un código se emitió para este módulo** y no para otro de SIGOC.
- La configuración en tiempo de ejecución que pide el contrato del frontend.
- Los cuarenta y tantos archivos sin confirmar en los dos repositorios.

---

## 10. Constancia

**Cuando se escribió, el 18 de agosto, no se había modificado ningún archivo.** Ese mismo día usted
aprobó el Camino A y se ejecutó; lo que se tocó fue configuración —puerto, `CORS_ORIGINS`, y la
ruta del módulo 80 en Auth— más las correcciones de §13 del plan maestro, que no estaban previstas
aquí porque no se podían prever sin un navegador.

Todo lo que afirma se comprobó contra el portal desplegado, el API de Auth y el código de los dos
proyectos. **Contra lo desplegado, no contra los repositorios**: esa distinción es la razón de ser
de §7.
