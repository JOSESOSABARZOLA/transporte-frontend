# SPRINT 0 · INFORME DE VERIFICACIÓN DEL ENTORNO
## Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control

| | |
|---|---|
| **Fecha** | 2026-08-04 |
| **Alcance** | Verificación de entorno y corrección de configuración en `transporte-backend` y `transporte-frontend` |
| **Naturaleza** | **No se implementó ninguna funcionalidad.** Solo herramientas, dependencias, configuración y compilación |
| **Resultado** | **Entorno operativo.** 14 problemas encontrados, 13 corregidos, 1 documentado sin corregir |

---

## 1. VEREDICTO

| Área | Estado |
|---|---|
| Node y npm | ✅ Correcto |
| Docker y Docker Compose | ✅ Operativo (el motor estaba detenido; se levantó) |
| PostgreSQL | ✅ **18.4 en marcha**, zona horaria y codificación correctas |
| Prisma | ⏳ No instalado — **esperado**, corresponde al módulo M-01 |
| Dependencias | ✅ Corregidas. Backend sin vulnerabilidades; frontend con una conocida y documentada |
| Variables de entorno | ✅ Corregidas y completadas |
| Scripts | ✅ Corregidos |
| Compilación backend | ✅ `build`, `lint:check` y `test` en cero |
| Compilación frontend | ✅ `build` y `lint` en cero |
| Arranque real | ✅ Backend responde en `/api/v1`; frontend sirve en 5176 |

**El entorno está listo para iniciar M-01.**

---

## 2. HERRAMIENTAS DEL SISTEMA

| Herramienta | Versión encontrada | Requisito | Estado |
|---|---|---|---|
| Node.js | **v24.18.0** | ≥ 20.11 (imágenes usan `node:20`) | ✅ Compatible. Ver P-10 |
| npm | **11.16.0** | — | ✅ |
| Docker Engine | **29.5.2** (linux) | — | ✅ Tras levantar el motor |
| Docker Compose | **v5.1.3** | — | ✅ |
| PostgreSQL (servidor) | **18.4** en contenedor | 18 | ✅ |
| Cliente `psql` | No está en el `PATH` | — | ⚠️ Ver P-13 |
| Git | 2.55.0.windows.3 | — | ✅ |

> **Sobre el puerto 5432.** Aparecía en escucha antes de levantar nada. **No es un PostgreSQL
> nativo**: es `com.docker.backend.exe`, el proxy de Docker Desktop. No hay instalación local de
> PostgreSQL en la máquina, y no hace falta: la base vive en el contenedor.

---

## 3. PROBLEMAS ENCONTRADOS Y CORREGIDOS

### P-01 · Motor de Docker detenido · **Bloqueante** · ✅ Resuelto

El CLI y Compose estaban instalados, pero el motor no respondía:
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
Sin él no se puede levantar la base y **ningún criterio de aceptación de base de datos es
verificable**.

**Corrección.** Se inició Docker Desktop; el motor respondió en 15 segundos.

---

### P-02 · El contenedor `postgres:18` entraba en bucle de reinicio · **Bloqueante** · ✅ Resuelto

**Es el hallazgo más relevante de este sprint**, porque el defecto **está en el diseño aprobado**,
no en una copia mal hecha.

`FASE4-arquitectura-tecnica.md` §16.2 y `IMPLEMENTATION_GUIDE.md` §15.1 declaran el volumen como
`transporte_pgdata:/var/lib/postgresql/data`. **A partir de PostgreSQL 18 esa ruta ya no es
válida**: la imagen oficial guarda los datos en un subdirectorio con la versión mayor, y aborta el
arranque si encuentra un montaje en la ruta antigua.

```
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" …
       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data (unused mount/volume)
```

El contenedor quedó en `Restarting (1)` y el `healthcheck` en `unhealthy` durante 100 segundos
seguidos.

**Corrección.** El montaje sube un nivel, a `/var/lib/postgresql`, conforme a
`docker-library/postgres#1259`. Se recreó el volumen y el contenedor pasó a `healthy` en 15
segundos.

> **Acción documental pendiente:** corregir `FASE4-arquitectura-tecnica.md` §16.2 y
> `IMPLEMENTATION_GUIDE.md` §15.1, que hoy documentan una configuración que no arranca.

---

### P-03 · `docker-compose.yml` seguía siendo el de Instrucción · **Alto** · ✅ Resuelto

Declaraba `instrucciondb` en 5433, `instruccion-app` en 3002, `instruccion-front` en 5175, base
`amcInstruccion` y **la contraseña `2026` escrita en el archivo**.

**Corrección.** Reescrito para el módulo: `transportedb` 5434 → 5432, `transporte-app` 3003,
`transporte-front` 5176, base `transportedb`, `TZ` en los dos servicios, y la contraseña tomada de
`DB_PASSWORD` con `${DB_PASSWORD:?…}`, que **detiene el arranque con un mensaje claro si falta**.
Validado con `docker compose config`, que resuelve los tres puertos correctamente.

---

### P-04 · `Dockerfile` del backend con puerto y dependencias del legado · **Alto** · ✅ Resuelto

`EXPOSE 3002` e instalación de **LibreOffice** y `fonts-liberation`, que servían a la conversión
DOCX→PDF del módulo de documentos de Instrucción.

**Corrección.** `EXPOSE 3003` y retiro de LibreOffice. Se conservan `dumb-init`, el usuario no
privilegiado, y `fonts/` más `src/assets/`, que el motor pdfmake necesitará para la matriz y las
órdenes. Se dejaron **preparadas y comentadas** las cuatro líneas de Prisma (`COPY prisma`,
`npx prisma generate` y la copia del cliente generado), con la advertencia de que el cliente
**debe generarse dentro de la imagen y nunca copiarse desde la máquina de desarrollo**.

---

### P-05 · El servidor de desarrollo del frontend escuchaba en 5073 · **Alto** · ✅ Resuelto

`vite.config.ts` fijaba `port: 5073`, puerto del proyecto de Instrucción. El módulo usa **5176**.
Es el puerto que declaran `CLAUDE.md`, la guía §15.1 y la lista blanca de CORS del backend: con
5073, **el navegador habría rechazado todas las peticiones por CORS**.

**Corrección.** `port: 5176`. Verificado: el servidor responde `200` en `http://localhost:5176/`.

---

### P-06 · `Dockerfile` del frontend expuesto en 5175 · **Medio** · ✅ Resuelto

`EXPOSE 5175` y `HEALTHCHECK` contra `localhost:5175`.

**Corrección.** Ambos a 5176.

---

### P-07 · `nginx.conf` apuntaba al backend de Instrucción · **Alto** · ✅ Resuelto

`listen 5175` y `set $backend_url http://instruccion-app:3002`. La imagen del frontend **no habría
encontrado el backend** dentro de la red de Docker.

**Corrección.** `listen 5176` y `http://transporte-app:3003`, que es el nombre exacto del servicio
en el compose.

---

### P-08 · Doble prefijo de API en el despliegue con Docker · **Medio** · ✅ Resuelto

El `Dockerfile` del frontend fijaba `ARG VITE_API_BASE_URL=/api` y el `nginx.conf` reescribía
`^/api/(.*)$ → /$1`. Combinado con el `baseURL` del `httpClient` —`${apiBaseUrl}/api/v1`— la ruta
efectiva era `/api/api/v1/...`. Funcionaba por casualidad, gracias a que la reescritura quitaba el
primer `/api`, pero es frágil y contradice la decisión **Q-09**: el prefijo vive en un solo sitio
de cada lado.

**Corrección.** `ARG VITE_API_BASE_URL=` vacío y **se retiró la reescritura** de nginx. Ahora
`/api/v1/x` viaja tal cual hasta `http://transporte-app:3003/api/v1/x`.

---

### P-09 · Scripts de npm rotos o apuntando a rutas inexistentes · **Medio** · ✅ Resuelto

| Script | Problema |
|---|---|
| `format` | Incluía `"test/**/*.ts"`, carpeta que no existe |
| `lint` | Glob `{src,apps,libs,test}`; solo existe `src` |
| `test:e2e` | Invocaba `./test/jest-e2e.json`, **archivo inexistente**: el script fallaba siempre |

**Corrección.** Globs acotados a `src`. Se retiró `test:e2e` hasta que exista su configuración
(módulo de pruebas end-to-end). Se añadieron dos scripts de verificación que **no mutan archivos**,
porque `npm run lint` usa `--fix` y eso puede enmascarar problemas en integración continua:

| Script nuevo | Repositorio | Para qué |
|---|---|---|
| `lint:check` | backend | `eslint` sin `--fix` |
| `lint:strict` | frontend | `eslint . --max-warnings 0` |

---

### P-10 · Versión de Node sin declarar · **Bajo** · ✅ Resuelto

La máquina tiene **Node 24.18**; las imágenes de Docker usan **node:20**. Compila en ambas, pero
la divergencia no estaba declarada en ningún sitio.

**Corrección.** Campo `engines: { node: ">=20.11.0" }` en los dos `package.json`. Documenta el
mínimo sin romper la instalación local.

---

### P-11 · Faltaba `.env.example` en el backend · **Medio** · ✅ Resuelto

El frontend tenía plantilla; el backend no. Como `.env` está en `.gitignore`, **otro desarrollador
no tenía forma de saber qué variables necesita**.

**Corrección.** Se creó `transporte-backend/.env.example` con las ocho variables, cada una
comentada, incluida la advertencia sobre `TZ` y sobre `MODO_IDENTIDAD_PROVISIONAL`. Se añadió
`DB_PASSWORD` al `.env` local, que el compose necesita para crear el contenedor.

---

### P-12 · `.env.example` del frontend con el puerto de base equivocado · **Bajo** · ✅ Resuelto

`PGPORT=5432`, que es el puerto **interno** del contenedor. Desde el host hay que usar el
publicado, **5434**.

**Corrección.** `PGPORT=5434`.

---

### P-13 · `.dockerignore` desactualizado · **Bajo** · ✅ Resuelto

Cabecera del microservicio de Instrucción y exclusión de la carpeta `db`, que ya no existe.

**Corrección.** Cabecera actualizada y nota explícita de que **`prisma/` no se excluye**: el
esquema y las migraciones deben entrar en la imagen para `migrate deploy`.

---

### P-14 · Vulnerabilidades en dependencias · **Alto** · ✅ Resuelto en el backend, ⚠️ documentado en el frontend

Estado inicial: **8 vulnerabilidades en el backend** (1 baja, 3 medias, 4 altas) y **7 en el
frontend** (1 baja, 6 altas).

**Corrección.** `npm audit fix` en ambos, sin `--force`, es decir **sin cambios de versión mayor**:

| Repositorio | Antes | Después |
|---|---|---|
| Backend | 8 | **0** |
| Frontend | 7 | **2**, ambas del mismo paquete |

Paquetes actualizados dentro de su rango declarado: `@nestjs/core`, `body-parser`, `file-type`,
`multer`, `path-to-regexp`, `qs`, `brace-expansion` (backend); `axios` 1.19.0, `esbuild`,
`form-data`, `postcss`, `vite` 7.3.6 (frontend).

---

## 4. PROBLEMA DOCUMENTADO SIN CORREGIR

### `react-router` · advisory GHSA-qwww-vcr4-c8h2 · severidad alta

| | |
|---|---|
| **Versión instalada** | `react-router-dom` 7.18.2 |
| **Rango afectado** | 7.12.0 – 8.2.0 |
| **Corrección que propone npm** | **Bajar** a `react-router-dom@7.11.0`, marcado como cambio de ruptura |

**No se aplicó, y la razón es concreta:** el advisory describe un *bypass* de CSRF **en modo RSC**
—React Server Components—. Esta aplicación es una **SPA de cliente con Vite**: usa `BrowserRouter`
y `useRoutes`, no monta servidor de rutas ni utiliza modo framework. Se verificó por búsqueda en
el código: no hay `createBrowserRouter`, ni `RouterProvider`, ni ninguna API de RSC.

Bajar de versión implicaría **apartarse del stack fijado por la institución** —la guía §4.1 y
RNF-005 pinchan `react-router-dom` 7.13.1— para mitigar un vector que el proyecto no expone.

**Recomendación.** Mantener la versión actual y **revisar cuando react-router publique un 7.x
corregido**. Registrar el punto en la revisión de seguridad previa a producción.

---

## 5. VERIFICACIÓN FINAL

### 5.1 Compilación y calidad

| Comando | Backend | Frontend |
|---|---|---|
| `npm run build` | **0** | **0** |
| `npm run lint` | **0** | **0** · 3 advertencias preexistentes |
| `npm run lint:check` / `lint:strict` | **0** | — |
| `npm test` | **0** · 1 suite, 1 prueba | Sin suite todavía |
| `npm audit` | **0 vulnerabilidades** | 2 conocidas y documentadas |

### 5.2 Base de datos

| Verificación | Resultado |
|---|---|
| Contenedor `transportedb` | `Up (healthy)` |
| Versión | **PostgreSQL 18.4** (Debian) |
| Zona horaria del servidor | **`America/Guayaquil`** — crítica para las ventanas de carga |
| Codificación | **UTF8** |
| `pg_isready` en el puerto publicado 5434 | `accepting connections` |
| Colisión con Instrucción | Ninguna: 5434 frente a 5433 |

### 5.3 Arranque real del backend

```
[Arranque] WARN  MODO_IDENTIDAD_PROVISIONAL está ACTIVO: la identidad se toma de una
                 cabecera de pruebas. No usar en producción.
[RoutesResolver]  AppController {/api/v1}:
[RouterExplorer]  Mapped {/api/v1/estado, GET} route
[Arranque] LOG    Cuadro de Colores escuchando en http://localhost:3003/api/v1 ·
                  zona horaria America/Guayaquil
```

| Verificación | Resultado |
|---|---|
| `GET /api/v1/estado` | `200` · `{"servicio":"transporte-backend","estado":"operativo"}` |
| `GET /estado` sin prefijo | `404` — el prefijo global está activo |
| CORS con `Origin: http://localhost:5176` | Cabecera `Access-Control-Allow-Origin` devuelta |
| CORS con origen ajeno | **Sin cabecera**: la lista blanca funciona |
| Advertencia de modo provisional | Se emite, conforme a RT-05 |

### 5.4 Arranque real del frontend

| Verificación | Resultado |
|---|---|
| Servidor de desarrollo | Responde `200` en `http://localhost:5176/` |
| Construcción de producción | `dist/` generado, 334 kB de JavaScript y 169 kB de CSS |

Los procesos de prueba se detuvieron al terminar. **El contenedor `transportedb` quedó levantado**,
listo para M-01.

---

## 6. PRISMA · ESTADO Y SIGUIENTE PASO

**No está instalado, y es lo esperado.** Su instalación es el módulo **M-01** del plan, no del
Sprint 0. Lo que sí quedó preparado:

| Preparativo | Estado |
|---|---|
| `DATABASE_URL` en `.env` y en `.env.example` | ✅ Apunta a `localhost:5434` en local y a `transportedb:5432` en Docker |
| Base `transportedb` creada y accesible | ✅ |
| `prisma/` excluido del `.dockerignore` | ✅ **No** se excluye, con nota explícita |
| Líneas de `prisma generate` en el `Dockerfile` | ✅ Preparadas y comentadas, listas para descomentar |
| Zona horaria del servidor de base | ✅ `America/Guayaquil` |

M-01 solo tendrá que instalar los dos paquetes, crear `PrismaService` y `PrismaModule`, y
descomentar cuatro líneas del `Dockerfile`.

> **Actualización del 2026-08-04.** M-01 está ejecutado. Aparecieron dos cosas que este Sprint 0
> no podía anticipar: **Prisma 7 rompe la sintaxis del esquema aprobado** (se fijó la 6.19.3), y
> **`node:20-slim` necesita `openssl`** para que Prisma resuelva su motor de consultas. Detalle en
> `PLAN_DE_IMPLEMENTACION.md` §M-01.1.

---

## 7. ARCHIVOS MODIFICADOS

| Repositorio | Archivo | Cambio |
|---|---|---|
| backend | `docker-compose.yml` | Reescrito para el módulo · corrección del volumen de PostgreSQL 18 |
| backend | `Dockerfile` | Puerto 3003 · sin LibreOffice · Prisma preparado |
| backend | `.dockerignore` | Cabecera y exclusiones al día |
| backend | `package.json` | Scripts corregidos · `lint:check` · `engines` |
| backend | `.env.example` | **Nuevo** |
| backend | `.env` | `DB_PASSWORD` añadida *(no versionado)* |
| backend | `package-lock.json` | `npm audit fix` *(no versionado en este repo)* |
| frontend | `vite.config.ts` | Puerto 5073 → **5176** |
| frontend | `Dockerfile` | Puerto 5176 · `VITE_API_BASE_URL` vacía |
| frontend | `nginx.conf` | Puerto 5176 · backend `transporte-app:3003` · sin reescritura |
| frontend | `.env.example` | `PGPORT` 5434 |
| frontend | `package.json` | `lint:strict` · `engines` |
| frontend | `package-lock.json` | `npm audit fix` |

**Ninguna funcionalidad fue implementada.** Todos los cambios son de configuración, scripts o
dependencias.

---

## 8. ACCIONES PENDIENTES

| # | Acción | Responsable | Urgencia |
|---|---|---|---|
| 1 | **Corregir la documentación de fase**: `FASE4-arquitectura-tecnica.md` §16.2 y `IMPLEMENTATION_GUIDE.md` §15.1 documentan el volumen en `/var/lib/postgresql/data`, que **no arranca con PostgreSQL 18** | Equipo | **Alta** |
| 2 | Definir `DB_PASSWORD` real en el `.env` de cada entorno. Hoy es `admin` en local | Equipo | Media |
| 3 | Instalar el cliente `psql` en el `PATH`, o usar `docker exec transportedb psql`, para los criterios de aceptación §19.2 | Equipo | Baja |
| 4 | Revisar el advisory de `react-router` cuando exista un 7.x corregido | Equipo | Baja |
| 5 | Crear la configuración de pruebas end-to-end y restituir el script `test:e2e` | Módulo de QA | Baja |
| 6 | Alinear la skill `codigo-limpio-amc` con el `.gitignore` respecto a versionar `.claude/` | Equipo | Baja |

---

## 9. LISTA DE VERIFICACIÓN DEL SPRINT 0

- [x] Node y npm verificados y con versión mínima declarada
- [x] Docker y Compose operativos, compose validado con `docker compose config`
- [x] PostgreSQL 18 levantado, sano, con zona horaria y codificación correctas
- [x] Conectividad a la base desde el host por el puerto publicado
- [x] Prisma: estado confirmado y entorno preparado para M-01
- [x] Variables de entorno completas, con plantilla en ambos repositorios
- [x] Scripts corregidos y verificados uno a uno
- [x] Backend compila, pasa lint y pasa sus pruebas
- [x] Frontend compila y pasa lint
- [x] Backend arranca y responde en `/api/v1` con la lista blanca de CORS activa
- [x] Frontend sirve en el puerto 5176
- [x] Vulnerabilidades resueltas o documentadas con su razón
- [x] Sin colisión de puertos con el módulo de Instrucción
- [x] Ninguna funcionalidad implementada

---

*Fin del informe de Sprint 0. El entorno está listo para iniciar M-01.*
