# 07 · Manual de Configuración

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Dónde vive cada cosa

El sistema se configura en **tres sitios distintos**, y confundirlos es la causa habitual de que
un cambio «no haga nada»:

| Dónde | Qué se configura | Requiere reinicio |
|---|---|---|
| `.env` del backend | Conexión, puertos, zona horaria, modo de identidad | **Sí** |
| `.env` del frontend | Dirección de la API en tiempo de construcción | **Sí, y reconstruir** |
| Base de datos (P-09) | Ventanas de carga y los ocho parámetros de política | **No** |

**Regla práctica:** todo lo que gobierna el negocio —horas de cierre, umbrales de descanso— vive
en la base y se cambia desde la pantalla. Lo que gobierna la infraestructura vive en `.env`.

---

## 2. Variables del backend

Plantilla versionada: `transporte-backend/.env.example`. El `.env` real **no se versiona**.

```bash
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3003` | Puerto de escucha. Evita colisión con Instrucción (3002) |
| `DB_PASSWORD` | *(vacío)* | Contraseña de `postgres`. **Sin ella `docker compose up` se detiene** |
| `DATABASE_URL` | — | Cadena de conexión de Prisma |
| `CORS_ORIGINS` | `http://localhost:5180` | Lista blanca de orígenes, separados por coma |
| `TZ` | `America/Guayaquil` | **Crítico.** Zona en que se evalúan las ventanas |
| `LOG_LEVEL` | `info` | Con `debug` activa además el registro de consultas de Prisma |
| `AUTH_EXCHANGE_URL` | — | Canje del código con Auth central. `http://<host>:10004/auth/exchange` |
| `AUTH_API_URL` | *(vacío)* | Base de la API de Auth, de la que cuelga `/users`. `http://<host>:10004`. **Vacía significa sin directorio de personal**, no error: P-07 lo dice y el maestro se administra a mano |
| `AUTH_JWT_SECRET` | *(vacío)* | **Secreto.** Verifica la firma de Auth. Lo entrega ese equipo |
| `AUTH_SUBSYSTEM_ID` | `11` | SIGOC |
| `SESSION_JWT_SECRET` | *(vacío)* | **Secreto, y distinto del anterior.** Firma la cookie de este módulo |
| `SESSION_EXPIRES_IN` | `28800` | Vigencia de la sesión, en segundos (8 h) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `transporte-backend` / `TRANSPORTE` | Emisor y destinatario del token propio |
| `AUTH_COOKIE_NAME` | `cuadro_colores_sesion` | Nombre de la cookie de sesión |
| `AUTH_COOKIE_SECURE` | `false` | **`true` en producción con HTTPS**, o el navegador la descarta |
| `AUTH_COOKIE_SAME_SITE` | `lax` | |

> **`AUTH_API_URL` va aparte de `AUTH_EXCHANGE_URL` aunque hoy sean el mismo servidor.** La
> segunda apunta a un endpoint concreto —`…/auth/exchange`—, y recortarle el camino para
> adivinar la base sería una suposición que se rompe el día que Auth mueva una de las dos.
> Ambas se declaran, y la barra final sobra: el código la quita.

### 2.1. `DATABASE_URL` · dos formas según desde dónde se conecte

```bash
# Desde la máquina de desarrollo, contra el contenedor publicado
DATABASE_URL=postgresql://postgres:CLAVE@localhost:5434/transportedb?schema=public&connection_limit=10&pool_timeout=20

# Desde dentro de la red de Docker
DATABASE_URL=postgresql://postgres:CLAVE@transportedb:5432/transportedb?schema=public&connection_limit=10&pool_timeout=20

> **`connection_limit` no es opcional, y el valor por defecto es peligroso.** Sin él, Prisma
> dimensiona su pool con `num_cpus × 2 + 1`: en la máquina de despliegue son 28 núcleos, o sea
> **57 conexiones por instancia** contra un `max_connections` de 100. **Con dos réplicas el
> servidor se agota** y la segunda responde `too many connections`.
>
> Diez sobran: PostgreSQL no rinde más por tener más conexiones concurrentes, y el contenedor de
> la base comparte esas mismas CPU. Si algún día hacen falta más réplicas, **baje este número**,
> no lo suba: el presupuesto total es `max_connections`, repartido entre todas.
```

`docker-compose.yml` **sobrescribe** esta variable con la forma interna: el bloque `environment:`
gana sobre `env_file:`. No la ajuste para Docker en el `.env`.

### 2.2. `TZ` · por qué es crítica

De ella dependen las ventanas de carga. Mal configurada, **los cierres ocurren a otra hora y nadie
lo nota** hasta que un departamento pierde su ventana. Está fijada en los tres contenedores.

Para comprobarla:

```bash
docker exec transporte-app sh -c 'date'     # debe terminar en -05
```

### 2.3. Las claves de sesión · lo más delicado de este archivo

> **`MODO_IDENTIDAD_PROVISIONAL` ya no existe.** Se retiró el 2026-08-18 junto con la cabecera
> `x-usuario-prueba` y el catálogo `usuarios-prueba.ts`. Mientras existió, con el modo encendido
> **cualquiera podía declararse `DIRECTOR`** enviando un número y ver la matriz consolidada entera.
> Si la encuentra en un `.env` heredado, sobra: no la lee nadie.

**Son dos claves, y son distintas a propósito.**

| Variable | Qué firma o verifica | Alcance |
|---|---|---|
| `AUTH_JWT_SECRET` | **Verifica** lo que Auth central firmó. Se usa una sola vez, en el canje | **Todo el ecosistema.** La comparten todos los módulos integrados |
| `SESSION_JWT_SECRET` | **Firma** la cookie de sesión que emite este módulo | Solo este módulo |

Poner el mismo valor en las dos permitiría a cualquier módulo integrado emitir sesiones válidas
aquí. **No las iguale.**

**Si `SESSION_JWT_SECRET` queda vacía**, el guardián no revienta: ignora la cookie, escribe una
advertencia y toda petición responde 401. Es deliberado —antes producía un 500 por petición, con un
mensaje genérico y sin pista del motivo—.

```bash
docker logs transporte-app 2>&1 | grep -i "SESSION_JWT_SECRET"   # bien configurado: sin resultados
```

> **`docker-compose.yml` no fija ninguna de las dos**, y por dos motivos: son secretos, y escribirlos
> en un archivo versionado publicaría `AUTH_JWT_SECRET`, **que vale para todos los módulos**; y las
> URL cambian por ambiente, así que fijarlas obligaría a editar el compose en cada despliegue.

### 2.4. Tiempos máximos · el seguro contra transacciones huérfanas

Se pasan al servidor en el `command:` del contenedor de la base, junto a la precarga de métricas.

| Parámetro | Valor | Qué evita |
|---|---|---|
| `idle_in_transaction_session_timeout` | 60 s | Que una transacción abierta y abandonada **retenga bloqueos e impida que autovacuum limpie**, sin límite de tiempo |
| `lock_timeout` | 10 s | Que una consulta espere indefinidamente por un bloqueo que no se libera |

> **No son ajuste fino, son un seguro.** El primero cubre el caso en que la aplicación muera a
> mitad de una transacción —un contenedor que se reinicia, un corte de red—. Sin él, esa sesión
> queda abierta para siempre y la base **se degrada despacio, sin avisar**, hasta que algo se
> bloquea. Es una de las causas clásicas de caída en producción.

> **`statement_timeout` NO se fija aquí, y es deliberado.** Global rompería las migraciones si
> alguna tarda más de la cuenta. Va por rol de aplicación:
>
> ```sql
> ALTER ROLE transporte_app SET statement_timeout = '30s';
> ```
>
> Queda pendiente hasta que ese rol exista. Hoy la aplicación se conecta como `postgres`,
> superusuario, que es un asunto abierto por derecho propio.

Y el lado de la aplicación tiene su propio tope, en `ejecutarEnTransaccion`: `maxWait` de 5 s y
`timeout` de 20 s. Prisma aplicaría 2 s y 5 s si no se dijeran, y cinco segundos se quedan cortos
aquí porque **toda escritura multitabla lleva la auditoría dentro** de la misma transacción.

---

### 2.5. El origen del frontend debe coincidir con el registrado en Auth

El portal devuelve al usuario a la ruta del **módulo 80** del subsistema 11, y le añade
`/auth/callback` por su cuenta. Hoy vale `localhost:5180`.

**Tres valores que deben concordar**, o el ingreso no se cierra:

| Dónde | Valor |
|---|---|
| Auth central · módulo 80 | `localhost:5180` |
| `CORS_ORIGINS` del backend | `http://localhost:5180,…` |
| Puerto del frontend | `vite.config.ts` y `nginx.conf` |

> **`localhost` solo sirve en la máquina que abre el navegador**, y se eligió aun así porque es
> **contexto seguro**: sobre HTTP en una dirección IP el navegador retira parte de su API
> —`crypto.randomUUID` entre otras— y la aplicación falla en **cada** petición. Para que entre
> alguien desde otro equipo hace falta la IP o un nombre, y entonces **HTTPS deja de ser opcional**.

---

## 3. Variables del frontend

Plantilla: `transporte-frontend/.env.example`.

| Variable | Por defecto | Para qué |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3003` | Base de la API. El prefijo `/api/v1` lo agrega `httpClient` |

**Se lee en tiempo de construcción**, no de ejecución: cambiarla exige reconstruir. Dentro de
Docker se deja **vacía**: el nginx de la propia imagen hace de proxy hacia `transporte-app:3003` y
las peticiones salen del mismo origen, con lo que no hay CORS.

> **Todo lo que lleve el prefijo `VITE_` se empaqueta EN EL NAVEGADOR y es público.** Cualquiera
> que abra la aplicación puede leerlo. Las cuatro que hay son URL, que es lo correcto: **nunca ponga
> ahí un secreto.**

> **Retiradas el 2026-08-19:** `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` y `PGPASSWORD`, que este
> archivo declaraba y la aplicación no usa —un frontend no se conecta a PostgreSQL—. La clave estaba
> vacía y el historial de git confirma que nunca llevó valor, así que no hubo fuga; lo que se cerró
> es la posibilidad, porque tener la variable escrita invita a rellenarla.
>
> Con ellas, **`.env.dev` dejó de versionarse**. Se describía a sí mismo como «modo LOCAL», así que
> era el archivo donde alguien acabaría escribiendo una clave real, y estaba rastreado en git. Las
> cuatro `VITE_` tienen valor por defecto en `config/env.ts`, de modo que un clon nuevo arranca sin
> él; para personalizar, se copia `.env.example`.

---

## 4. Configuración de negocio · pantalla P-09

### 4.1. Ventanas de carga

Seis, una por rol. Se editan desde `/home/administracion/ventanas`.

| Rol | Apertura | Cierre | Activa |
|---|---|---|---|
| DMIP Operativos | *(sin restricción)* | 15:00 | Sí |
| DMIP Inspecciones | *(sin restricción)* | 15:00 | Sí |
| DMIT Instrucción | *(sin restricción)* | 15:00 | Sí |
| DAF | 15:00 | 16:30 | Sí |
| Dirección | — | — | **No** |
| Administrador | — | — | **No** |

Campos: tipo (`DIARIO`, `SEMANAL`, `INTERVALO`), horas en `HH:MM`, mensaje de cierre y estado.

**Una hora vacía significa «sin restricción»**, no falta de dato. **Desactivar una ventana deja al
rol sin restricción horaria.** No hay creación ni borrado: eliminar abriría la carga las
veinticuatro horas.

### 4.2. Los siete parámetros de política

| Clave | Tipo | Valor | Rango | Regla |
|---|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | Decimal | `12` | 8–16 horas | RN-36 |
| `TOPE_SALIDAS_PESADAS` | Entero | `3` | 1–6 salidas | RN-25 |
| `PERIODO_COMPUTO_SALIDAS` | Texto | `MENSUAL` | SEMANAL · QUINCENAL · MENSUAL | RN-37 |
| `HORA_LIMITE_CUADRO` | Texto | `16:30` | `HH:MM` | RN-57 |
| `FRANJA_NOCTURNA_INICIO` | Texto | `20:00` | `HH:MM` | RN-43 |
| `FRANJA_NOCTURNA_FIN` | Texto | `05:00` | `HH:MM` | RN-43 |
| `DIAS_DESCANSO_PATRULLA` | Entero | `1` | 1–3 días | RN-24 |

**Las políticas leen estos valores; nunca una constante literal.** Cada cambio rige desde que se
guarda y queda auditado.

> **Los siete valores son provisionales (PV-06).** Los fija la Dirección.

> **`HORA_CIERRE_DEPARTAMENTAL` se retiró el 2026-08-25.** RN-59 se implementa en
> `t_ventana_carga.vcar_hora_cierre`, **una fila por rol**, que es la que gobierna: el
> `VentanaCargaGuard` lee esa tabla y ninguna otra, y es la que devuelve el `423`.
>
> Mientras existió, el parámetro no decidía nada: su único consumidor era una advertencia de P-09
> que pedía mantener los dos valores iguales. Cuando discrepaban —y discrepaban en cuanto alguien
> guardaba la ventana sin hacer caso al aviso—, el que se leía era el de la ventana.
>
> Y un valor único no podía expresar RF-059, «parametrizar las ventanas de carga **por rol**»: la
> DAF cierra a las 16H30 y los tres departamentos a las 15H00. La contradicción de fuentes de PV-06
> —14H00 en una sesión, 15H00 en otra— sigue abierta, y ahora se resuelve en el panel de ventanas.

---

## 5. Puertos

| Servicio | Puerto externo | Interno | Evita chocar con |
|---|---|---|---|
| PostgreSQL | **5434** | 5432 | Instrucción (5433), otro despliegue (5432) |
| Backend | **3003** | 3003 | Instrucción (3002) |
| Frontend | **5180** | 5180 | Los demás frontales de SIGOC: Resolución 5173, Instrucción 5175, Admin Core 5176, Ejecución 5177 |

> **El 5180 no se eligió por gusto.** Auth central exige que la ruta de cada módulo sea única
> dentro del subsistema 11, y `localhost:5176` ya la tenía «Admin Core»: el registro respondía 409.
> Se salió además de la banda 5173–5179 porque es por la que **Vite salta solo** cuando encuentra el
> puerto ocupado —de ahí `strictPort: true` en `vite.config.ts`, para que falle en vez de moverse
> en silencio—.
>
> **Si cambia este puerto, hay que cambiarlo en tres sitios**: `vite.config.ts` y `nginx.conf` del
> frontend, `CORS_ORIGINS` del backend, y **la ruta del módulo 80 en Auth central**. Si el último
> se olvida, el portal devuelve al usuario a una dirección donde no hay nada.

---

## 6. Registro

`LOG_LEVEL` admite `debug`, `info`, `warn` y `error`. Toda la aplicación emite el mismo formato
estructurado en JSON, incluidos los mensajes internos de NestJS.

```json
{"momento":"2026-08-07T09:34:10.513-05:00","nivel":"info","modulo":"transporte",
 "mensaje":"Historial de jornada consolidado","fecha":"2026-08-08","personas":2}
```

> **`LOG_LEVEL=debug` activa el registro de consultas de Prisma. Debe permanecer desactivado en
> producción**: imprime los parámetros de cada consulta, incluidos datos personales.

---

## 7. Comprobación de la configuración

```bash
docker compose ps                                     # los tres «healthy»
docker exec transporte-app sh -c 'date'               # -05
docker exec transporte-app id                         # uid=1001(nestjs), NO root
docker exec transporte-front id                       # uid=101(nginx),  NO root
docker logs transporte-app 2>&1 | grep -i PROVISIONAL # producción: vacío
curl -s http://localhost:3003/api/v1/estado           # {"estado":"operativo"}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/v1/estado   # 200
```
