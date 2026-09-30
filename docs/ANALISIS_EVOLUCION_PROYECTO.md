# Análisis de organización y guía de evolución

**Módulo Transportes / Cuadro de Colores Operativo (SIGOC-CCO) — Agencia Metropolitana de Control**
**19 de agosto de 2026** · Análisis.

> **Tercera versión.** La del 17 de agosto se escribió antes de la integración con Auth central y
> dejaba abierta la pregunta de qué patrón de autenticación regía. La del 18 la dio por resuelta,
> **pero su §5 contenía un diagnóstico equivocado** sobre el mecanismo de regreso del portal. Esta
> lo corrige y añade los tres defectos que solo aparecieron al abrir el sistema en un navegador.
> Han cambiado **§4.3, §5 y §11**.
>
> El alcance y el estado de la integración viven en el documento hermano
> **`PLAN_INTEGRACION_AUTH.md`**. Este informe no lo repite: lo referencia.

---

## 0. Para qué existe este documento

El sistema está construido y funcionando. Lo que empieza ahora no es construcción sino
**evolución y mantenimiento**, y eso cambia la pregunta que hay que responder.

Durante la construcción el orden lo fijaba `PLAN_DE_IMPLEMENTACION.md`: módulo M-01 a M-30, en
fila. Ese orden ya no sirve, porque quien llega a partir de hoy no viene a construir el siguiente
módulo sino a **tocar uno que ya existe**. La pregunta deja de ser «qué toca ahora» y pasa a ser
**«dónde miro antes de tocar esto, y qué actualizo después»**.

Esa información existe, pero repartida entre `11_Guia_Mantenimiento.md`,
`DOCUMENTACION_INCONSISTENCIAS.md`, `17_KNOWN_ISSUES.md` y los dos `CLAUDE.md`. **Tres de esos
cuatro están fechados el 7 de agosto**, antes de las jornadas de uso real y de la integración con
Auth, y varias de sus afirmaciones ya no son ciertas.

**Este documento no corrige nada.** Cada diferencia entre documentación y código se reporta con su
comprobación, para que la decisión sea suya.

> **Relación con `11_Guia_Mantenimiento.md`.** Aquél sigue siendo válido para las tareas periódicas,
> las consultas de salud y el procedimiento de migración. Éste cubre lo que aquél no tiene: qué
> documento manda cuando dos se contradicen, el estado real frente a la documentación, y el
> procedimiento por tamaño de cambio. Donde coinciden, se indica cuál está superado.

---

## 1. Antes de empezar: el árbol de trabajo, y esto es lo urgente

**Los dos repositorios tienen trabajo sin confirmar, y está mezclado.** Comprobado hoy:

```
git -C transporte-backend  status --short   →  39 archivos  (20 M · 9 D · 10 sin seguimiento)
git -C transporte-frontend status --short   →  27 archivos  (13 M · 10 D · 4 sin seguimiento)
```

Y no es un solo cambio. Son **cinco cuerpos de trabajo distintos entrelazados**:

| # | Trabajo | Archivos representativos |
|---|---|---|
| 1 | Eliminación de `docs/` en los dos repos | 9 archivos en el backend, 7 en el frontend |
| 2 | Endurecimiento del arranque | `ThrottlerModule`, `src/common/salud/`, retirada de `/uploads` |
| 3 | Integración con Auth central · etapas 2 a 4 | `src/modules/identidad/`, `token-sesion.ts`, `RutaConSesion.tsx`, `sesion.service.ts`, y la retirada de los tres archivos de identidad provisional del frontend |
| 4 | Semilla de cuentas y las dos migraciones nuevas | `prisma/insumos/usuarios-cuadro.json`, `20260817*` |
| 5 | Corrección de las pruebas de integración obsoletas | los tres `*.integracion-spec.ts` |

**Nada de esto está confirmado.** El último commit del backend es `7da3986` y el del frontend
`d2e476a`, los dos anteriores a todo lo anterior.

**Por qué es lo primero.** Cinco trabajos en un solo árbol significan que no se puede revertir uno
sin arrastrar los demás, que el historial no explicará qué se hizo ni por qué, y que cualquier
commit nuevo los mezcla todavía más. **Antes de escribir una línea más conviene separarlos en
commits por naturaleza**, en este orden: la eliminación de `docs/` sola, el endurecimiento, las
migraciones, la integración de backend, la de frontend, y las pruebas.

### 1.1. Dos efectos colaterales de la eliminación de `docs/`

La decisión de fondo es correcta: salda las deudas **D-06** —`docs/` triplicado— y **D-07**
—`PENDIENTES-VALIDACION.md` en dos versiones que no coincidían—, que
`DOCUMENTACION_INCONSISTENCIAS.md` registraba como I-04 e I-05. Pero:

1. **Las rutas documentales de los dos `CLAUDE.md` quedaron rotas.** Comprobado: backend §8 cita
   nueve rutas `docs/…` y frontend §8 cinco, todas relativas a su repositorio, y ahí ya no hay
   nada. Lo mismo con `CLAUDE.md` §7 del backend, que remite a `docs/IMPLEMENTATION_GUIDE.md §0.1`
   para los doce puntos que no se inventan.

2. **`transporte-frontend/docs/CHANGE-IMPACT-ANALYSIS-diseno.md` está confirmado en git** (`d966411`)
   pero no en el disco. Quien busque el razonamiento del cambio de diseño del 14-AGO no lo
   encontrará mirando.

Hoy `transporte-backend/docs/` conserva solo `postman/` —con cuatro colecciones— y
`transporte-frontend/docs/` está vacía.

---

## 2. Mapa documental: las tres capas

```
sigoc-cco/
├── docs/                    ← CAPA 1 · Requisitos y diseño. Qué se acordó
│   ├── FASE1 … FASE5                          7.420 líneas
│   ├── PROTOTIPO-sigoc-cuadro-colores.html    aprobado por el Product Owner
│   ├── ANALISIS_EVOLUCION_PROYECTO.md         ← este documento
│   └── PLAN_INTEGRACION_AUTH.md               ← estado de la integración con Auth
│
├── docs/implementacion/     ← CAPA 2 · Histórico. Cómo se llegó aquí
│   ├── PLAN_DE_IMPLEMENTACION.md      125 KB · CERRADO, no rige la evolución
│   ├── IMPLEMENTATION_GUIDE.md         51 KB
│   ├── M01…M30                         30 informes de módulo
│   ├── ANALYSIS_REPORT · CODE_REVIEW · MODULE_REVIEW · SPRINT0_REPORT
│   └── PENDIENTES-VALIDACION.md       ← VIVO. Lo que falta decidir el negocio
│
├── docs/final/              ← CAPA 3 · El sistema tal como quedó
│   ├── 00_LEEME … 18_CHANGELOG_FINAL   19 documentos
│   └── DOCUMENTACION_INCONSISTENCIAS.md
│
├── INTEGRACION_AUTH_CENTRAL_FRONTEND.md       ← contrato compartido del ecosistema
├── INTEGRACION_AUTH_CENTRALIZADO_BACKENDS.md
└── CHANGE-IMPACT-ANALYSIS.md                  ← «Elaborado por», pendiente de decisión
```

**La capa 1 dice qué se acordó. La capa 2, cómo se hizo y por qué. La capa 3, qué hay hoy.** Cuando
la 1 y la 3 no coinciden, el criterio ya lo fija `docs/final/00_LEEME.md`: **manda el código**, y la
diferencia se reporta.

Dos excepciones en la capa 2:

- **`PENDIENTES-VALIDACION.md` está vivo**, no es histórico. Registra lo que el Product Owner no ha
  decidido, y **crece**: hoy llega a **PV-39**.
- **`PLAN_DE_IMPLEMENTACION.md` está cerrado.** Sirve para entender por qué algo se construyó como
  se construyó; no describe el sistema de hoy ni marca el trabajo siguiente. Ya generó un
  malentendido documentado (I-07): describe una etapa E12 que en su momento no se ejecutó.

### 2.1. Fuente de verdad por tipo de información

| Necesito saber | Fuente de verdad | Segunda lectura |
|---|---|---|
| **Qué hace el sistema hoy** | **El código** | `13_Catalogo_Funcional.md` |
| Por qué existe una regla | `FASE1` · `FASE2` §8 — citan la transcripción de origen | — |
| Reglas de negocio y las 32 validaciones | `FASE2` §8 y §19 | skill `reglas-descanso` |
| Agregados, objetos de valor, eventos | `FASE3` | — |
| **Contratos de API** | **`docs/final/06_Manual_API.md`** | `FASE4` §8 · las colecciones de Postman |
| **Modelo de datos** | **`prisma/schema.prisma` + `prisma/migrations/`** | `15_Diccionario_Datos.md` · `FASE4-diseno-base-datos.md` |
| Arquitectura y su porqué | `12_Documento_Arquitectura.md` | `FASE4-arquitectura-tecnica.md` |
| Interfaz: inventario de clases | `FASE5` §2.2 — **con la salvedad de §4.1** | prototipo HTML |
| Cómo se usa cada pantalla | `01_Manual_Usuario.md` | `14_Guia_Capacitacion.md` |
| Variables de entorno | `.env.example` de cada repo | `07_Manual_Configuracion.md` |
| **Qué no funciona** | **`17_KNOWN_ISSUES.md`** | `DOCUMENTACION_INCONSISTENCIAS.md` |
| **Qué falta decidir el negocio** | **`PENDIENTES-VALIDACION.md`** | — |
| Reglas de desarrollo | **`CLAUDE.md` de cada repositorio** | skills de `.claude/skills/` |
| **Autenticación: qué ofrece Auth** | **`project_auth/auth/backend/src/auth/auth.controller.ts`** | `project_auth/auth/docs/auth_v1.5.md` |
| **Autenticación: qué debe hacer el módulo** | `INTEGRACION_AUTH_*.md` — **especificación, no descripción** | **`PLAN_INTEGRACION_AUTH.md`** |
| Cómo se llegó aquí | `docs/implementacion/M01…M30` | `18_CHANGELOG_FINAL.md` |

**Por qué el manual de API manda sobre FASE4 §8.** No hay Swagger ni OpenAPI —el paquete no está
instalado, `main.ts` no lo configura—, así que no existe contrato ejecutable. `06_Manual_API.md`
enumeró los endpoints contándolos sobre los decoradores; `FASE4` §8 los describe sin enumerarlos de
forma verificable. **Hoy son 67**, no 64: la integración sumó los tres de sesión.

**Por qué el esquema manda sobre el diccionario.** `schema.prisma` y las migraciones son lo que la
base ejecuta. Para lo que Prisma **no** expresa —las 24 `CHECK` y los 8 índices parciales— la fuente
son las migraciones `20260805134100` y `20260805134200`, y `npm run prisma:verificar` las comprueba.

**Por qué la autenticación lleva dos filas.** Son dos cosas y confundirlas causó el enredo del §5.
El **código de Auth** dice qué se puede consumir hoy: es verificable. Los **`INTEGRACION_AUTH_*.md`**
describen un patrón que el módulo tuvo que construir: son especificación. Leerlos como si
describieran el sistema lleva a buscar endpoints que Auth no tiene.

---

## 3. Documentos obsoletos o superados

Ninguno se corrigió. Se listan con lo que dicen de más.

| Documento | Qué dice | Qué ocurre |
|---|---|---|
| `11_Guia_Mantenimiento.md` §1 | Tarea diaria: abrir la jornada con `POST /cuadros` | **La jornada se abre sola** con el primer registro, desde el 11-AGO |
| `11_Guia_Mantenimiento.md` §2 | «678 + 282 + 215 pruebas» | Hoy: **742 unitarias · 283 integración · 250 interfaz** |
| `11_Guia_Mantenimiento.md` §5 y §9 | «`docs/` triplicado, use la copia de la raíz» | Ya no hay tres copias (§1). El consejo sobrevive, el motivo no |
| `11_Guia_Mantenimiento.md` §7.1 | La identidad real «cambia **un solo archivo**» | **Superado.** Cambió un submódulo entero del backend y diez archivos del frontend. Ver `PLAN_INTEGRACION_AUTH.md` |
| `17_KNOWN_ISSUES.md` · F-01 | «Agregar el perfil `FUNCIONARIO`… es pequeño y no está hecho» | **Hecho** el 17-AGO. Exigió migración: `20260817194510_agrega_el_rol_de_funcionario` |
| `17_KNOWN_ISSUES.md` · B-01 | «No hay identidad real · depende de un tercero» | **Construida y probada.** Falta que Auth llene una columna. Ya no es «un tercero» en abstracto |
| `18_CHANGELOG_FINAL.md`, migraciones | Enumera **7** | Hay **10**. Faltan tres filas |
| `18_CHANGELOG_FINAL.md` | «36 pendientes registrados» | `PENDIENTES-VALIDACION.md` llega a **PV-39** |
| `docs/implementacion/00-LEEME.md` §2 y §3.2 | «copiar `docs/` a ambos repositorios» | Es **la instrucción que creó el triplicado** que acaba de deshacerse |
| `PLAN_DE_IMPLEMENTACION.md` | Plan M-01…M-30 | **Histórico.** Cerrado |
| `README.md` del frontend, §Estructura | `hooks/ useUser · useModal · useTheme` | Hay **ocho** hooks; el `CLAUDE.md` §4 lista otros tres. Ninguna lista está completa |
| `CLAUDE.md` §7 del frontend | E12 «registra el resolutor de token en `httpClient`» | **Superado**: se adoptó cookie `HttpOnly`, y el token no llega al navegador |
| `CLAUDE.md` §8 de ambos repos | Rutas `docs/…` relativas al repositorio | **Rotas.** Ver §1.1 |

**`11_Guia_Mantenimiento.md` merece un comentario.** Es el documento más cercano a lo que este
proyecto necesita ahora, y el que más ha envejecido: cuatro de sus nueve apartados dicen algo que ya
no es cierto. No conviene retirarlo —§4 «cómo agregar cosas», §6 sobre `Table` y §8 «salud del
sistema» siguen siendo correctos— sino ponerlo al día.

---

## 4. Documentación frente a código

Comprobado hoy contra el código. Los comandos están en el §12.

### 4.1. El inventario de clases de FASE5 ya no describe la interfaz

`FASE5` §2.2 fija `rounded-3xl` para el panel de datos, en dos sitios. **El código usa
`rounded-md`** en las nueve pantallas, desde `d2e476a`. Fue una divergencia deliberada: el manual de
marca pide «cajas rectas» y el inventario especificaba 24 px; se compararon los tres valores en
pantalla y se eligió 6.

**Sigue abierta, y es la que más conviene cerrar de esta lista**, porque `CLAUDE.md` §6.1 prohíbe
introducir clases nuevas remitiendo precisamente a ese inventario: mientras no coincidan, la regla
apunta a un documento que el código no respeta.

### 4.2. La tipografía se implementó y FASE5 no la recoge

`FASE2` **RNF-012** exige Montserrat. Hasta el 14-AGO no había ninguna declaración de fuente. Hoy
sí: `src/styles/foundation/tipografia.css` y los `.woff2` de `public/fuentes/`, alojados en el
repositorio porque la aplicación puede correr en intranet. RNF-012 pasa de incumplido a cumplido, y
`FASE5` no menciona ni la hoja ni la carpeta.

### 4.3. Divergencias nuevas, de la integración con Auth

| # | Documentación | Código | Estado |
|---|---|---|---|
| 1 | `INTEGRACION_AUTH_*` piden un **guard JWT global** con tres exclusiones | Guarda por endpoint | **Desviación consciente.** `auth.module.ts` la razona: la cadena no es igual en todos, y una exclusión olvidada es un agujero silencioso; aquí lo olvidado es una inclusión, que falla ruidosamente |
| 2 | Sobre de error `{success:false, error:{code,message}}` | El del módulo, con `codigo: APP-UNAUTHORIZED-001` | **Desviación consciente.** Se conserva el código del contrato; el sobre es el del resto de la API |
| 3 | El frontend arma `?redirectUri=…&module=…` | **Sí se envían** | **El portal los ignora**: su paquete no lee ningún parámetro de la URL. Se mandan porque el contrato compartido los pide y no estorban, pero **no influyen en nada**. El destino sale de `permissions`; ver §5 |
| 4 | Perfil mínimo `{username, displayName}` | Se añade `rolCode` | **Ampliación necesaria**: este frontend monta las pantallas según el rol |
| 5 | `VITE_AUTH_MODULE_CODE` | **Existe, vale `TRANSPORTE`** | Confirmado por usted el 18-AGO. El portal ignora `module`, pero el mismo valor **sí se usa** en el backend como `JWT_AUDIENCE`, destinatario del token de sesión propio |
| 6 | Configuración en tiempo de ejecución antes que `VITE_` | La URL se hornea en el build | **Pendiente.** Es cambio de despliegue, no de aplicación |

Las tres primeras están documentadas y razonadas en `PLAN_INTEGRACION_AUTH.md` §4. **Ninguna se
resolvió por cuenta propia**: las tres esperan que quien fijó el contrato compartido las confirme.

**Y una divergencia más, la número 7, que no es del contrato sino del entorno:** la guía no dice
nada sobre **contexto seguro**, y resulta que decide si la aplicación funciona. Servida por HTTP
desde una dirección IP, el navegador retira parte de su API —`crypto.randomUUID` entre ellas— y el
frontend caía en **cada** petición. Está corregido con respaldo, pero conviene que el contrato
compartido lo recoja: afecta a todos los módulos, no solo a éste.

### 4.4. Deudas registradas que siguen exactamente donde estaban

| Deuda | Comprobación de hoy | Estado |
|---|---|---|
| **D-05** · variables `PG*` en el frontend | `.env.example` conserva **5**, incluida `PGPASSWORD` | Abierta. Un frontend no se conecta a PostgreSQL, y una plantilla que pide esa clave induce a escribirla |
| **D-03 / D-04** · dependencias sin uso | `pdf-lib`, `pdfmake` en el backend; `react-pdf` en el frontend | Abiertas. Las dos del backend van dentro de la imagen |
| **D-08** · specs con errores de tipo | `npx tsc --noEmit` → **11 errores en 5 archivos** | Abierta, **no creció** desde el 07-AGO |

### 4.5. Lo que sí coincide

Es la mayor parte, y es lo que permite trabajar con confianza:

- **27 modelos** y **11 enumerados** en `schema.prisma` — el enumerado de roles ganó un valor,
  `FUNCIONARIO`, sin cambiar el conteo de enumerados
- **67 endpoints** en 18 controladores · **10 migraciones**, ninguna editada después de aplicarse
- **7 submódulos** en cuatro capas, con comunicación por servicios publicados
- **11 pantallas** en `src/pages/` — las nueve, más `LoginPage` y `AuthCallbackPage`
- La **cadena de cuatro guardas** con sus códigos 401/403/403/423, **intacta tras la integración**
- La **restricción de dos campos de la DAF**, sostenida en el DTO, el servicio y la interfaz

---

## 5. La autenticación: resuelta, y qué queda

Era el punto abierto del informe anterior. **Hoy está construida y probada de punta a punta contra
el Auth de desarrollo.** El detalle vive en `PLAN_INTEGRACION_AUTH.md`; aquí solo el estado.

**Patrón adoptado: cookie `HttpOnly`**, como CORE. El JWT no llega nunca al navegador: lo canjea el
backend del módulo contra `GET /auth/exchange` y lo guarda en su propia cookie.

**El reparto que lo sostiene: Auth central dice QUIÉN es; el Cuadro de Colores decide QUÉ ROL
tiene**, con `t_usuario.usua_identificador_ad`. No es una preferencia: el canje del Auth desplegado
**no transmite el rol elegido** —devuelve `{token, permissions, username}` y el token solo
`{userId, iat, exp}`—, así que no hay otra vía.

De los siete desajustes, **cinco están cerrados**: la ruta del portal (10006), el puerto del canje
(10004), el subsistema (**SIGOC = 11**), la clave de firma y —el 18 de agosto— **el mecanismo de
regreso**. Quedan dos, y **ninguno es trabajo nuestro**:

| | Qué falta | Efecto |
|---|---|---|
| 🟠 | **No existe el rol `Transporte - Funcionario`** | Sin un rol de Transporte nadie puede elegir el módulo en el portal: quien recibe una orden no puede entrar a verla. **P-06 inaccesible** |
| 🟠 | El Auth desplegado va por detrás del repositorio | Su token no trae `subsystemId`, así que **no se puede comprobar que un código se emitió para este módulo** y no para otro de SIGOC |

### Una corrección que hay que dejar por escrito

**Este apartado afirmó, en tres versiones sucesivas, que el bloqueo era la columna
`subsystems.path` de SIGOC, vacía. Era falso.**

El portal desplegado no usa esa columna: resuelve el destino desde `permissions`, tomando el primer
permiso con `path` no vacío ordenado por `order`, y **compone `/auth/callback` por su cuenta**. El
error salió de leer el repositorio `project_auth/auth` en vez del paquete que el servidor sirve.

Con ello cae también una advertencia que se repitió varias veces: que la ruta era **una sola por
subsistema** y escribir la nuestra rompería a Instrucción, Resolución y Ejecución. **No es así:** la
ruta cuelga del módulo, y **el Cuadro de Colores no necesita subsistema propio**.

**Cómo quedó:** el módulo **80 · Transporte** apunta a `localhost:5180`. Se movió del 5176 porque
ese valor exacto lo tenía Admin Core y Auth respondía 409 —la unicidad es sobre la cadena completa,
no sobre el puerto—. El detalle está en `PLAN_INTEGRACION_AUTH.md` §D-1.

> **La lección de método, que vale más que el dato:** para un servicio desplegado, el repositorio es
> una hipótesis; la fuente de verdad es lo que ese servidor responde y sirve.

### Y tres defectos que solo aparecieron en el navegador

Después de dar la integración por probada, al abrirla en un navegador aparecieron tres fallos que
ninguna verificación con `curl` podía ver. Están documentados en `PLAN_INTEGRACION_AUTH.md` §13:

| | Defecto | Alcance real |
|---|---|---|
| 🔴 | `crypto.randomUUID` no existe fuera de contexto seguro | Corre en el interceptor de **cada** petición: sobre HTTP en una IP, **la aplicación entera caía** |
| 🔴 | Había que pulsar el rol **dos veces** | `user` y `estado` se movían por separado en `UserProvider`, y la guarda decide con `estado` |
| 🟠 | 409 al registrar la ruta en Auth | El puerto 5176 lo tenía Admin Core |

**Los tres se corrigieron, y los dos primeros llevan prueba de regresión.** El patrón común importa
más que los casos: `curl` comprueba que el servidor responde, pero no ejecuta JavaScript, no
mantiene estado entre páginas y no distingue contexto seguro. **Un flujo que vive en el navegador
tiene que verificarse en un navegador.**

> **Un dato que conviene tener presente.** El negocio creó los seis roles de Transporte en Auth
> (53 a 58) y su correspondencia con `RolDepartamental` está registrada en
> `prisma/insumos/usuarios-cuadro.json`. **Falta el séptimo**, el del funcionario de campo.

---

## 6. Qué consultar antes de tocar

Tres listas cerradas. La idea es que no haya que buscar.

### 6.1. Cambios de frontend

| Orden | Archivo | Para qué |
|---|---|---|
| 1 | `transporte-frontend/CLAUDE.md` §6 | **Las once reglas invariables de interfaz.** Se leen enteras |
| 2 | Skill `pantallas-cuadro` | Composición: prohíbe clases nuevas, obliga a componer con lo existente |
| 3 | Skill `diseno-sigoc` | Paleta, tipografía y estilo del manual *Nueva Imagen 2025* |
| 4 | `docs/FASE5-diseno-interfaz.md` | Wireframes, estados, responsive, accesibilidad e **inventario §2.2** (ver §4.1) |
| 5 | `docs/PROTOTIPO-sigoc-cuadro-colores.html` | Lo que el Product Owner aprobó |
| 6 | Skill `stack-frontend-amc` | Carpetas, `httpClient`, estado, convenciones de import |
| 7 | `docs/final/01_Manual_Usuario.md` · `13_Catalogo_Funcional.md` | Cómo se usa y qué cubre la pantalla |
| 8 | `docs/final/17_KNOWN_ISSUES.md` | Si lo que va a tocar ya tiene limitación registrada |

**Las que más caro cuestan si se saltan:**

- **Ninguna información depende solo del color** (§6.6). En un sistema llamado *cuadro de colores*
  exige atención deliberada.
- **Las fechas de calendario viajan como texto `AAAA-MM-DD`** (§6.11). Convertirlas a `Date` en
  Quito —UTC−5— las desplaza un día.
- **Las interfaces de `src/interfaces/` se copian del DTO del servidor, campo por campo.** Cuatro de
  los seis defectos del 07-AGO tuvieron esta única causa. **Quedan sin contrastar `Transporte.ts`,
  `Documento.ts`, `CuadroDiario.ts` y `Alerta.ts`.** Es lectura comparada, no desarrollo.
- **Si toca la sesión**: `PLAN_INTEGRACION_AUTH.md` §6.2, y no reintroduzca ninguna identidad en
  `httpClient` — viaja sola, en la cookie.

### 6.2. Cambios de backend

| Orden | Archivo | Para qué |
|---|---|---|
| 1 | `transporte-backend/CLAUDE.md` §4, §5, §6 | Cuatro capas, seis roles, **ocho reglas invariables** |
| 2 | `CLAUDE.md` §7 | **Los doce puntos que no se inventan.** Si su tarea necesita uno, se para y se pregunta |
| 3 | Skill `stack-backend-amc` | Capas, servicios publicados, parámetros, errores, trazabilidad a RN |
| 4 | Skill `reglas-descanso` | **Obligatoria** si toca `ElegibilidadService`, `RangoHorario` o cualquier política |
| 5 | `docs/FASE2-documentacion-funcional.md` §8 y §19 | Reglas de negocio con su fuente, y las 32 validaciones |
| 6 | `docs/FASE3-analisis-dominio.md` | Agregados, objetos de valor, eventos |
| 7 | `docs/final/06_Manual_API.md` | El contrato de los endpoints |
| 8 | `docs/implementacion/M__.md` del submódulo | Por qué se decidió lo que se decidió |
| 9 | `docs/implementacion/PENDIENTES-VALIDACION.md` | Si el cambio roza un PV abierto |

**Las que más caro cuestan:**

- **Las reglas de descanso viven solo en `talento-operativo`.** Si aparecen en otro submódulo es un
  defecto. Protegen a personas de jornadas de dieciséis horas: es la razón por la que el proyecto
  existe.
- **`ActualizarTransporteDto` tiene exactamente dos propiedades.** Si la DAF debe escribir otra
  cosa, no se amplía el DTO: se discute si esa competencia le corresponde y, si le corresponde, se
  le da su propio endpoint.
- **Los umbrales son parámetros, nunca constantes.** Ocho viven en `t_parametro_politica`.
- **Toda escritura multitabla en `$transaction`, con la auditoría dentro**; los eventos se emiten
  **después** de confirmar.

### 6.3. Cambios que afectan la base de datos

| Orden | Archivo | Para qué |
|---|---|---|
| 1 | `transporte-backend/prisma/schema.prisma` | **La fuente de verdad del modelo** |
| 2 | `transporte-backend/prisma/migrations/` | Las 11 migraciones, en orden |
| 3 | Skill `prisma-amc` | `snake_case` con prefijo por tabla, `CHECK` e índices que Prisma no expresa, transacciones |
| 4 | `docs/FASE4-diseno-base-datos.md` | Diccionario, restricciones, índices, decisiones del modelo |
| 5 | `docs/final/15_Diccionario_Datos.md` · `05_Manual_Base_Datos.md` | Significado de cada columna, y operación |
| 6 | `prisma/insumos/` | Los insumos aprobados que alimentan la semilla |

**Procedimiento, y las cuatro reglas que no se negocian:**

```bash
npx prisma migrate dev --name descripcion_en_espanol
npm run prisma:verificar        # 27 tablas · 11 enums · 24 CHECK · 8 índices parciales
DATABASE_URL="…transportedb_pruebas…" npx prisma migrate deploy
```

1. **Nunca se edita una migración ya aplicada.** Se crea una nueva. *Y esto ya se incumplió*: el
   commit `4aa665d` cambió una línea de comentario en cinco migraciones aplicadas, lo que dejó sus
   sumas de verificación desalineadas y **bloqueó `migrate dev` por completo** hasta repararlas el
   17-AGO. Ni una línea, ni un comentario.
2. **`migrate deploy` se ejecuta en las DOS bases**: `transportedb` y `transportedb_pruebas`. Si se
   olvida la segunda, la suite de integración falla por entorno. *Y esto también pasó*: la base de
   pruebas estaba tres migraciones por detrás, y al ponerla al día aparecieron 24 pruebas obsoletas
   que nadie veía.
3. **Las migraciones no se aplican al arrancar el contenedor.** Son un paso explícito del despliegue.
4. **Si el cambio toca un enumerado**, es una migración aunque parezca una línea. Añadir
   `FUNCIONARIO` lo demostró.

---

## 7. Qué actualizar al agregar funcionalidad

Amplía la §9 de `11_Guia_Mantenimiento.md`, que cubre seis casos y deja fuera los que más se olvidan.

| Cuando cambie… | Actualice | Obligatorio |
|---|---|---|
| Un endpoint | `docs/final/06_Manual_API.md` **y la colección de Postman** | Sí |
| El esquema | `05_Manual_Base_Datos.md` y `15_Diccionario_Datos.md` | Sí |
| Una pantalla | `01_Manual_Usuario.md` y `13_Catalogo_Funcional.md` | Sí |
| Una variable de entorno | El `.env.example` del repo **y el `docker-compose.yml`** | Sí |
| **El inventario de clases o el sistema visual** | **`FASE5` §2.2** | **Sí** — hoy no se hizo (§4.1) |
| **Se resuelve o cierra un problema conocido** | **`17_KNOWN_ISSUES.md`**, tachando la entrada | **Sí** |
| **El Product Owner decide un pendiente** | **`PENDIENTES-VALIDACION.md`**, con fecha y responsable | **Sí** |
| Aparece un pendiente nuevo del negocio | `PENDIENTES-VALIDACION.md`, con número correlativo | Sí |
| Una regla de negocio | `FASE2` §8, y el comentario del código que la cita (`RN-24`, `VAL-13`…) | Sí |
| Una decisión de arquitectura | `12_Documento_Arquitectura.md` | Sí |
| **Una regla de desarrollo** | **`CLAUDE.md` del repositorio**, y la skill que la repita | **Sí** |
| **Algo del contrato con Auth central** | **`PLAN_INTEGRACION_AUTH.md`** | **Sí** |
| Se cierra una versión | `18_CHANGELOG_FINAL.md` | Sí |
| Se decide entre varios caminos | Un análisis de impacto propio | Recomendado |

**Dos hábitos que este proyecto ya demostró que valen.** El **análisis de impacto antes del código**:
los tres que existen capturan por qué se eligió un camino y qué se descartó, y un mes después eso no
está en ningún otro sitio. Y **cada validación cita su regla** en el comentario, que es lo que
mantiene `FASE2` §8 navegable desde el código.

---

## 8. Agents y skills

### 8.1. Lo primero: dónde se abre Claude Code

**Comprobado.** `sigoc-cco/` **no tiene `CLAUDE.md` ni `.claude/`**. Trabajando desde la raíz:

| | Desde la raíz | Desde cada repositorio |
|---|---|---|
| `CLAUDE.md` del proyecto | **No se carga.** No existe | Sí |
| Skills | **Sí**, delimitadas por directorio | Sí |
| **Agents** | **NINGUNO se carga** | Sí |

**Recomendación operativa, y es la más práctica de este informe: la evolución se trabaja abriendo
Claude Code dentro de cada repositorio.** La raíz sirve para leer documentación y para análisis
transversal como éste.

### 8.2. Los nueve agentes

Nueve archivos, ocho nombres distintos: `revisor-amc` está en los dos repositorios.

| Agente | Repo | Escribe | Para qué |
|---|---|---|---|
| `prisma-transporte` | back | **Sí** | Esquema, migraciones, semilla |
| `dominio-reglas` | back | **Sí** | Objetos de valor y políticas, **con sus pruebas antes de usarse** |
| `nest-modulo` | back | **Sí** | Controladores, DTO, servicios y repositorios en cuatro capas |
| `qa-transporte` | back | Sí, no destructivo | End-to-end: levanta front y back, valida por perfil, comprueba en PostgreSQL |
| `auditor-rbac` | back | **No** | Cadena de guardas, DTO fuera de contrato, los dos campos de la DAF |
| `revisor-amc` | ambos | **No** | Convenciones, cabeceras, español, `any`, código muerto, mensajes de commit |
| `react-pantalla` | front | **Sí** | Las pantallas |
| `auditor-ui` | front | **No** | Clases y accesibilidad |

**Los cuatro auditores no tienen `Write` ni `Edit`, y es deliberado:** un agente que encuentra y
corrige en el mismo paso deja sin rastro qué se corrigió.

**El ciclo:** construir con el agente que escribe → auditar con el de solo lectura → revisar
convenciones con `revisor-amc` antes de commitear → verificar con los comandos → confirmar con el
responsable funcional.

### 8.3. Las once skills del proyecto

Se activan solas por directorio. No hace falta invocarlas, pero conviene saber cuál gobierna.

| Skill | Repo | Gobierna |
|---|---|---|
| `stack-backend-amc` | back | Cuatro capas, servicios publicados, parámetros, errores, trazabilidad |
| `prisma-amc` | back | Esquema, migraciones, semilla, transacciones |
| `reglas-descanso` | back | **Descanso y rotación.** Obligatoria en políticas y elegibilidad |
| `docker-amc` | back | Imágenes, compose, puertos, variables |
| `stack-frontend-amc` | front | Carpetas, `httpClient`, estado, imports |
| `pantallas-cuadro` | front | Composición, prohibición de clases nuevas, color + texto |
| `diseno-sigoc` | front | Paleta, Montserrat, cajas rectas |
| `codigo-limpio-amc` | ambos | Cabecera por archivo, español, sin huérfanos, **commits sin atribución a IA** |
| `flujo-git-amc` | ambos | Ramas desde el `main` real del equipo, convención de commits |

> **Herramientas personales, no del producto.** Los dos repositorios tienen ahora `.agents/` y
> `skills-lock.json` sin seguimiento: el frontend con `frontend-design` y el backend con
> `nestjs-best-practices`, esta última traída de GitHub. **El frontend las ignora en su
> `.gitignore`; el backend no**, así que aparecen como archivos nuevos y podrían acabar
> confirmadas. Conviene replicar esas dos líneas en el `.gitignore` del backend.

**La regla de commits que más se olvida:** cortos, en español, estilo convencional, **nunca
atribuidos a Claude ni a ninguna herramienta de IA**.

---

## 9. El modo Plan

### 9.1. Cuándo entrar

| Situación | Modo Plan |
|---|---|
| Corregir un texto, una etiqueta, un mensaje | No hace falta |
| Cambio en un solo archivo, con efecto evidente | No hace falta |
| **Cualquier cosa que toque los dos repositorios** | **Sí** |
| **Cualquier cosa que toque PostgreSQL** | **Sí**, sin excepción |
| **Cualquier cosa que roce la sesión o la autorización** | **Sí** |
| **Cualquier cosa que roce un PV abierto o `17_KNOWN_ISSUES.md`** | **Sí** |
| Funcionalidad nueva, aunque parezca pequeña | Sí |
| No está claro si el comportamiento buscado es el documentado | Sí — y probablemente haya que **preguntar**, no planificar |

### 9.2. Qué debe contener el plan en este proyecto

Además de qué archivos y en qué orden, cinco cosas propias de SIGOC-CCO:

1. **Impacto en los dos repositorios**, aunque parezca de uno solo. Los defectos más caros nacieron
   de mirar un lado sin el otro: cuatro de los seis del 07-AGO fueron interfaces del frontend
   escritas sin leer el DTO del backend.
2. **Si toca PostgreSQL**, el modelo actual y las migraciones **antes** de proponer nada. Y si toca
   un enumerado, decirlo: es migración.
3. **Qué pendiente PV roza.** Si el cambio necesita un dato que el negocio no ha entregado, eso va
   en el plan, no se descubre a mitad.
4. **Qué documentos quedan por actualizar** (§7). Se decide al planificar, no después, que es cuando
   se olvida.
5. **Cómo se verifica.** Los comandos concretos, no «se prueba». Este proyecto tiene tres suites y
   un verificador de objetos de base.

### 9.3. Cuándo el plan no basta y hay que parar

**Los doce puntos que no se inventan** —`CLAUDE.md` §7 del backend— no se resuelven planificando
mejor. Si la tarea necesita uno, **se detiene y se pregunta**. Completarlo con un valor razonable
perdería el rastro de qué se acordó y qué se supuso, que es exactamente el valor de las cinco fases
de análisis.

Los más frecuentes hoy: la matriz zonal ↔ punto de encuentro (PV-01), el catálogo de conductores y
vehículos (PV-03), y el criterio de prefijo por área (PV-27, que impide registrar en cinco de los
nueve formularios).

**Lo mismo vale cuando documentación y código discrepan.** No se resuelve por cuenta propia: se
reporta y se pide la decisión.

---

## 10. Procedimiento por tamaño de cambio

El flujo del proyecto tiene nueve pasos:

```
Solicitud → Análisis de impacto → Plan → Aprobación → Implementación
         → Pruebas → Validación → Documentación → Cierre
```

Los tres tamaños se distinguen por **qué pasos se comprimen**, nunca por cuáles se saltan. Los
cuatro últimos no se saltan nunca.

### 10.1. Cambio pequeño

*Un texto, una etiqueta, un mensaje de error, un ajuste de estilo dentro del inventario.*

| Paso | Cómo |
|---|---|
| Análisis y plan | **Comprimidos.** Una frase: qué cambia y por qué |
| Implementación | Directa, en la rama de trabajo |
| Pruebas | `npm test` · `npm run lint` · `npm run build` **en el repositorio tocado** |
| Documentación | Solo si el cambio es visible para el usuario |
| Cierre | Un commit, con la convención institucional |

**Aviso.** «Pequeño» se mide por el **efecto**, no por las líneas. Agregar `FUNCIONARIO` a
`usuarios-prueba.ts` son cinco líneas y arrastró una migración, un enumerado de Prisma, un mapa
exhaustivo en otro submódulo y una pantalla entera.

### 10.2. Cambio mediano

*Un endpoint, un campo en un formulario, una columna, una validación, un parámetro de política.*

| Paso | Cómo |
|---|---|
| Análisis de impacto | **Escrito.** Los dos repositorios, la base, y el PV que roce |
| Plan | Modo Plan, con los cinco puntos de §9.2 |
| Aprobación | **Suya, antes de tocar código** |
| Implementación | Con el agente que corresponda; migración aparte si la hay |
| Pruebas | Unitarias · **integración si toca backend** · interfaz si toca pantalla · `prisma:verificar` si toca el esquema |
| Validación | Con el sistema levantado, por el perfil afectado |
| Documentación | Tabla §7, entera |
| Cierre | Commits separados por naturaleza: migración, backend, frontend, documentación |

**Regla de oro del backend**, de `11_Guia_Mantenimiento.md` §4.2: DTO primero, con el mensaje del
funcionario declarado el último; el método del controlador con su `@Roles(...)`; la regla en el
servicio; el acceso a datos en el repositorio; la prueba de integración en `test/`; y el endpoint
documentado en `06_Manual_API.md`.

### 10.3. Cambio grande

*Una pantalla nueva, un submódulo, un cambio del modelo que afecte a varias tablas, una integración.*

| Paso | Cómo |
|---|---|
| Análisis de impacto | **Documento propio**: caminos posibles, qué descarta cada uno, qué exige |
| Decisión | **Suya, entre los caminos.** No se elige por defecto |
| Plan | Modo Plan, **por etapas verificables por separado** |
| Aprobación | Por etapa, no solo al principio |
| Implementación | Etapa a etapa, con el árbol de trabajo limpio entre una y otra |
| Pruebas | Suites completas de los dos repositorios, más integración con base preparada |
| Validación | **Con el responsable funcional**, sobre el sistema levantado |
| Documentación | Tabla §7 completa, más el análisis de impacto actualizado con lo decidido |
| Cierre | Una serie de commits legible por sí sola, y `18_CHANGELOG_FINAL.md` |

**La integración con Auth es el ejemplo trabajado.** Se dividió en cinco etapas, cada una
verificable sola, y eso permitió construir el backend mientras faltaba la clave y el frontend
mientras falta la ruta del portal. El patrón vale para cualquier cambio grande: **etapas que no se
bloquean entre sí**.

**Lo que no se hace en un cambio grande:** empezar a escribir para ver qué sale. Y **no dejar cinco
trabajos sin confirmar en el mismo árbol**, que es donde está hoy el proyecto (§1).

---

## 11. Lo que conviene hacer primero

### Higiene, antes de cualquier cosa

| # | Acción | Por qué |
|---|---|---|
| 1 | **Separar y confirmar los cinco trabajos del árbol** (§1) | Es lo más urgente. Hoy no se puede revertir uno sin arrastrar los demás |
| 2 | **Reparar las rutas de `CLAUDE.md` §8** en ambos repos (§1.1) | Catorce referencias apuntan a carpetas vacías |
| 3 | Añadir `.agents/` y `skills-lock.json` al `.gitignore` del backend (§8.3) | Herramientas personales que podrían acabar versionadas |
| 4 | Retirar el usuario y contraseña de `Comandos claude.txt` | Están en claro, en la raíz del proyecto |

### Coordinación con Auth central · no es código

| # | Acción | Desbloquea |
|---|---|---|
| ~~5~~ | ~~Llenar `subsystems.path` de SIGOC~~ · **Cerrado el 18-AGO, y el diagnóstico era equivocado** (§5) | Hecho: el módulo 80 apunta a `localhost:5180` |
| 6 | **Crear el rol `Transporte - Funcionario`** | P-06 «Mis órdenes» |
| 7 | Que el canje devuelva `roles` y el token lleve `subsystemId` | Alcance y una comprobación de seguridad |

### Desarrollo

| # | Acción | Desbloquea |
|---|---|---|
| ~~8~~ | ~~**Etapa 5**: apagar `MODO_IDENTIDAD_PROVISIONAL` y retirar `usuarios-prueba.ts`~~ | **Hecha el 18-AGO.** Ya no hay más de una forma de autenticarse |
| 8b | **Poner al día `FASE4` §1114-1145 y `FASE5` §92** | Siguen describiendo `SelectorRolPruebas` y `usuariosPrueba`, que **ya no existen** |
| 9 | **Contrastar las cuatro interfaces restantes** con su DTO | Previene la familia de defectos del 07-AGO. Es lectura, no desarrollo |
| 10 | **Poner al día `11_Guia_Mantenimiento.md`** (§3) | Es el documento que más se consultará y el que más ha envejecido |
| 11 | **Actualizar `FASE5` §2.2** con el radio real (§4.1) | Hoy `CLAUDE.md` §6.1 remite a un inventario que el código no respeta |
| 12 | **D-08** · los 11 errores de tipo en 5 spec | Hoy son once líneas. Deja usable `tsc --noEmit` como señal |
| 13 | D-05 · variables `PG*` · D-03/D-04 · dependencias sin uso | Bajo coste, decisión del dueño de la pila |

### Negocio · sigue siendo lo que más bloquea

| # | Pendiente | Desbloquea | Quién |
|---|---|---|---|
| 14 | **PV-27** · criterio de prefijo por área | Registrar en **5 de los 9 formularios** | Product Owner |
| 15 | **PV-01** · matriz zonal ↔ punto | La cascada de P-01 | Product Owner |
| 16 | **PV-02** · base de personal certificada | Asignación y reglas de descanso con datos reales | Product Owner |
| 17 | **PV-03** · conductores y vehículos | **P-03 completa** | DAF |
| 18 | **PV-06** · confirmar los ocho parámetros | Certeza operativa | Dirección |
| 19 | **PV-34** · si emitir órdenes exige el cuadro cerrado | Que la regla viva en el servidor, no solo en la pantalla | Product Owner |
| 20 | Asignar los seis roles de Transporte a las personas | Que cada perfil pueda entrar | Product Owner |

**Los del bloque de negocio no son trabajo de desarrollo.** El software para recibirlos está
construido y probado. Y sigue esperando un hilo abierto: **«Elaborado por» en la Matriz
Consolidada** (`CHANGE-IMPACT-ANALYSIS.md`), entre el Camino 4 y el Camino 1.

---

## 12. Anexo · Cómo se comprobó cada afirmación

Para que este informe se pueda reejecutar dentro de un mes y no haya que creerle.

```bash
cd C:/Users/Administrador/Documents/sigoc-cco

# §1 · El árbol de trabajo
git -C transporte-backend  status --short | wc -l      # → 39
git -C transporte-frontend status --short | wc -l      # → 27
# Desglose por tipo:
git -C transporte-backend status --short | awk '{print $1}' | sort | uniq -c
git -C transporte-backend  log --oneline -1            # → 7da3986
git -C transporte-frontend log --oneline -1            # → d2e476a

# §3 y §4.5 · Inventario real
grep -c '^model ' transporte-backend/prisma/schema.prisma          # → 27
grep -c '^enum '  transporte-backend/prisma/schema.prisma          # → 11
ls transporte-backend/prisma/migrations | grep -c '^202'           # → 10
grep -rhoE '@(Get|Post|Put|Patch|Delete)\(' transporte-backend/src \
     --include=*.controller.ts | wc -l                             # → 67
ls -d transporte-backend/src/modules/*/ | wc -l                    # → 7
ls transporte-frontend/src/pages | wc -l                           # → 11

# §4.1 · Diseño frente a FASE5
grep -c 'rounded-3xl' docs/FASE5-diseno-interfaz.md                # → 2
grep -rc 'rounded-md' transporte-frontend/src/pages/MatrizConsolidadaPage.tsx

# §4.4 · Deudas abiertas
grep -c '^PG' transporte-frontend/.env.example                     # → 5
grep -c 'pdf-lib\|pdfmake' transporte-backend/package.json         # → 3
cd transporte-backend && npx tsc --noEmit | grep -c 'error TS'     # → 11
npm run prisma:verificar                                           # → correcto
cd ..

# §5 · Auth central
AUTH=http://172.20.136.127:10004
curl -s -X POST $AUTH/auth -H 'Content-Type: application/json' \
     -d '{"username":"<usuario>","password":"<clave>"}'
# La colección de Postman reproduce el flujo completo y diagnostica lo que falta:
#   transporte-backend/docs/postman/SIGOC-Auth-Central.postman_collection.json

# §8 · Agents y skills
find transporte-backend/.claude transporte-frontend/.claude -type f | wc -l
ls CLAUDE.md .claude                                   # → no existen en la raíz
git -C transporte-backend check-ignore .agents skills-lock.json    # → no ignorados
```

---

## 13. Nota de higiene

`Comandos claude.txt`, en la raíz del proyecto, termina con un **usuario y una contraseña en
claro**. La raíz no es un repositorio git, así que no está publicado, pero es un directorio que
contiene dos repositorios y que se comparte con facilidad.

Se reporta. **No se ha tocado el archivo.**

---

## 14. Constancia

Este informe **sustituye al del 17 de agosto en la misma ruta** y **no modificó ningún archivo de
código**. Vive en la raíz del proyecto —`sigoc-cco/docs/`—, fuera de los dos repositorios: el
`git status` de `transporte-backend` y `transporte-frontend` es exactamente el mismo antes y después
de escribirlo.

Todo lo que afirma se comprobó el 18 de agosto de 2026 contra el código y el disco, con los comandos
del §12. Donde documentación y código difieren, se ha dicho cuál dice qué y **no se ha resuelto la
diferencia**: la decisión es suya.
