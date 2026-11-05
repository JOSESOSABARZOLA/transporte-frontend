# 08 · Manual de Instalación

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> **Este manual cubre la instalación en la máquina de desarrollo**: local y en contenedores. Los
> servidores no construyen nada; se instalan con un paquete `.tar` y su guía:
>
> | Servidor | Guía |
> |---|---|
> | QA y producción, detrás del Gateway | `transporte-backend/INSTALACION-PRODUCCION.md` |
> | Preproducción sin Gateway | `transporte-backend/DESPLIEGUE.md` §7 y `COMANDOS-PREPRODUCCION.md` |
>
> El resumen del despliegue por ambiente está en `09_Manual_Despliegue.md`. Las variables, en
> `07_Manual_Configuracion.md`.

---

## 1. Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| Docker Engine + Docker Compose | Compose v2; **≥ 2.24** en servidores con Gateway | Contenedores. El overlay del Gateway usa `!reset` |
| Node.js | **≥ 20.11** (`engines` del backend) | Desarrollo, pruebas y migraciones fuera de Docker |
| PostgreSQL | 18 | Lo aporta la imagen `postgres:18` |
| Git | — | Obtener el código |
| Bash | Git Bash en Windows | `scripts/empaquetar.sh` |

Los dos repositorios versionan `package-lock.json` desde el 2026-10-21, así que `npm ci`
reproduce las dependencias y la imagen se construye desde un clon limpio.

Trabajamos en la rama `base/cuadro-colores` de los dos repositorios.

---

## 2. Estructura esperada

Los dos repositorios son **carpetas hermanas**: el `docker-compose.yml` vive en el backend y
construye el frontend con `context: ../transporte-frontend`. `scripts/empaquetar.sh` también lo
exige.

```
sigoc-cco/
├── transporte-backend/     ← docker-compose*.yml, Dockerfile, prisma/, scripts/empaquetar.sh
└── transporte-frontend/    ← Dockerfile, nginx.conf, vite.config.ts
```

---

## 3. Instalación en contenedores (desarrollo)

### 3.1. Configurar

```bash
cd transporte-backend
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Completamos en `.env` como mínimo:

```bash
DB_PASSWORD=<clave de postgres>
APP_DB_PASSWORD=<clave de transporte_app, distinta>
TZ=America/Guayaquil
CORS_ORIGINS=http://localhost:5180

# Sesión con Auth central. Sin ellas el contenedor arranca pero nadie entra.
AUTH_EXCHANGE_URL=http://<IP_SERVIDOR_AUTH>:10004/auth/exchange
AUTH_API_URL=http://<IP_SERVIDOR_AUTH>:10004
AUTH_JWT_SECRET=<la entrega el equipo de Auth>
AUTH_SUBSYSTEM_ID=11
SESSION_JWT_SECRET=<32 caracteres o más, distinta de la anterior>

# Portal de Auth que se hornea en la imagen del frontend. Obligatoria para construir.
VITE_AUTH_PORTAL_URL=http://<IP_SERVIDOR_AUTH>:10006/login
```

`DATABASE_URL` y `DIRECT_DATABASE_URL` solo hacen falta para el backend fuera de Docker (§4); el
compose las compone con la red interna.

### 3.2. Construir

```bash
docker compose build
```

Construye `transporte-backend:latest` (unos 194 MB) y `transporte-frontend:latest`. El cliente de
Prisma se genera **dentro** de la imagen; nunca se copia de la máquina. Sin
`VITE_AUTH_PORTAL_URL` el compose se detiene antes de construir.

### 3.3. Levantar la base

```bash
docker compose up -d transportedb
```

La base se publica en `localhost:5434`, solo en la interfaz local. Con el volumen vacío,
`prisma/init-db/01-extensiones.sql` crea `pg_stat_statements`. Sobre un volumen con datos el
script no corre y la creamos a mano:

```bash
docker exec transportedb psql -U postgres -d transportedb \
  -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

### 3.4. Migrar y crear el rol de aplicación

```bash
docker compose run --rm transporte-app npx prisma migrate deploy
```

El arranque del contenedor **no migra**, a propósito. Las migraciones crean el esquema y cargan
los catálogos institucionales: nueve formularios, zonales, tipos de control, instituciones,
ventanas, jornadas laborales y parámetros de política. **Ya no hay semilla aparte.**

Después, una vez por base, el rol `transporte_app`:

```bash
cat prisma/roles/crear-rol-aplicacion.sql \
  | docker exec -i transportedb psql -U postgres -d transportedb -v ON_ERROR_STOP=1 -v clave="'<APP_DB_PASSWORD>'"
```

La clave va entre comillas simples dentro de las dobles: psql espera un literal SQL.

### 3.5. Levantar todo

```bash
docker compose up -d
```

| Servicio | Puerto | Comprobación |
|---|---|---|
| `transportedb` | 5434 (solo local) | `pg_isready` |
| `transporte-app` | 3003 | `GET /api/v1/estado` |
| `transporte-front` | 5180 | `GET /health` |

### 3.6. Primer administrador

Sin una cuenta con rol `ADMINISTRADOR_DMIP` nadie puede abrir «Cuentas del cuadro». La primera se crea
por SQL, con el usuario de Auth de esa persona:

```sql
BEGIN;
INSERT INTO t_usuario (usua_correo, usua_nombre, usua_identificador_ad, func_id, usua_activo)
VALUES ('<correo>@quito.gob.ec', '<Apellidos Nombres>', '<usuario de Auth>', NULL, true);
INSERT INTO t_usuario_rol (usua_id, usro_rol)
SELECT usua_id, 'ADMINISTRADOR_DMIP'::e_rol_departamental
  FROM t_usuario WHERE usua_identificador_ad = '<usuario de Auth>';
COMMIT;
```

El resto de las cuentas se da de alta desde la pantalla, y la correspondencia entre roles de Auth
y roles del módulo, en «Roles de Auth central».

### 3.7. Comprobar

```bash
docker compose ps                                                              # los tres «healthy»
curl -s http://localhost:3003/api/v1/estado          # {"estado":"operativo","baseDatos":"disponible"}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/health          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/v1/estado   # 200, por el proxy
docker exec transporte-app id                                                  # uid=1001(nestjs)
docker exec transporte-front id                                                # uid=101(nginx)
docker exec transporte-app sh -c 'date'                                        # termina en -05
```

Y entramos de verdad por `http://localhost:5180`: el portal de Auth debe devolvernos a
`/auth/callback` y abrir la sesión.

---

## 4. Instalación local para desarrollo

### 4.1. Base de datos

Usamos solo el contenedor de PostgreSQL (§3.3 y §3.4).

### 4.2. Backend

En `transporte-backend/.env`, además de lo de §3.1:

```bash
DATABASE_URL=postgresql://transporte_app:<APP_DB_PASSWORD>@localhost:5434/transportedb?schema=public&connection_limit=10&pool_timeout=20
DIRECT_DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@localhost:5434/transportedb?schema=public
```

```bash
npm ci
npx prisma generate
npx prisma migrate deploy      # o migrate dev, si estamos creando una migración
npm run start:dev              # http://localhost:3003/api/v1
```

No hay modo de desarrollo sin autenticar: entramos por el portal de Auth como cualquier usuario y
necesitamos fila en `t_usuario` y en `t_usuario_rol`.

### 4.3. Frontend

```bash
cd ../transporte-frontend
cp .env.example .env.development.local    # y poner el portal real en VITE_AUTH_PORTAL_URL
npm ci
npm run dev                               # http://localhost:5180
```

`npm run dev` usa `VITE_API_BASE_URL=http://localhost:3003` (sin proxy: hace falta
`CORS_ORIGINS=http://localhost:5180` en el backend). Sin portal, la aplicación arranca pero
muestra «Falta configurar la dirección del portal de Auth». `vite.config.ts` usa
`strictPort: true`: si el 5180 está ocupado, falla en vez de moverse.

---

## 5. Base de las pruebas de integración

`npm run test:integracion` usa `transportedb_pruebas`, en el mismo servidor. El motivo es
`ck_formulario_numero`, que solo admite del 1 al 9: si el catálogo institucional ocupa los nueve
casilleros, las suites no tienen dónde crear los suyos.

```bash
docker exec transportedb psql -U postgres -c "CREATE DATABASE transportedb_pruebas;"

PRUEBAS="postgresql://postgres:<DB_PASSWORD>@localhost:5434/transportedb_pruebas?schema=public"
DATABASE_URL="$PRUEBAS" DIRECT_DATABASE_URL="$PRUEBAS" npx prisma migrate deploy
```

> **Hay que exportar las dos variables.** `migrate deploy` se conecta por `DIRECT_DATABASE_URL`;
> con solo la primera, migra en silencio la base de desarrollo. La línea `Datasource "db": …` dice
> qué base se tocó de verdad.

Las migraciones detectan esta base por su nombre y omiten los nueve formularios. Cuatro
migraciones del 27-AGO no se pueden aplicar aquí y se marcan como aplicadas; el procedimiento
está en `transporte-backend/DESPLIEGUE.md` §4.1. Después creamos el rol con
`crear-rol-aplicacion.sql` sobre esta base y repetimos el `migrate deploy` tras cada migración
nueva.

---

## 6. Verificación de la instalación

```bash
cd transporte-backend
npm run prisma:verificar     # 55 tablas, 20 enumerados, 48 restricciones, 14 índices parciales
npm test
npm run test:integracion
npm run lint:check && npm run build

cd ../transporte-frontend
npm test
npm run lint && npm run build
```

Estado esperado: todo con código de salida 0. `prisma:verificar` corresponde a la última
migración, `20261030120000_carga_por_operativos`.

---

## 7. Desinstalación

```bash
docker compose down                 # detiene y elimina los contenedores
docker compose down -v              # ELIMINA TAMBIÉN EL VOLUMEN Y TODOS LOS DATOS
docker rmi transporte-backend:latest transporte-frontend:latest
```

> `-v` borra `transporte_pgdata`. Sin un respaldo `pg_dump` no hay vuelta atrás.

---

## 8. Problemas frecuentes de instalación

| Síntoma | Causa | Solución |
|---|---|---|
| `docker compose up` se detiene al inicio | `DB_PASSWORD`, `APP_DB_PASSWORD` o `VITE_AUTH_PORTAL_URL` vacías | Completarlas en `.env`. En servidores, falta `--env-file .env.prod` |
| `npm run build` del frontend falla con «Falta VITE_AUTH_PORTAL_URL» | Sin portal de Auth | Definirla en `.env.development.local` o como argumento de construcción |
| `transporte-app` no arranca | `validar-entorno.ts` lo detiene | `docker logs transporte-app` dice qué falta: `DATABASE_URL`, `SESSION_JWT_SECRET` corta, `TRUST_PROXY` no entero, o con `NODE_ENV=production`, `CORS_ORIGINS` o la cookie `Secure` |
| `permission denied` en ejecución | Falta el rol `transporte_app` o sus privilegios | Ejecutar `crear-rol-aplicacion.sql` sobre esa base |
| El contenedor de la base reinicia en bucle | Volumen montado en `/var/lib/postgresql/data` | PostgreSQL 18 monta en `/var/lib/postgresql`. Los compose ya lo hacen |
| Toda petición responde `401` | Sin cookie de sesión | Ingresar por el portal |
| El ingreso responde `403` | Auth autenticó, pero no hay fila en `t_usuario` o en `t_usuario_rol` | Alta en «Cuentas del cuadro» con `usua_identificador_ad` = usuario de Auth |
| `429` al ingresar | Detrás de un proxy sin `TRUST_PROXY`: todos comparten cupo | `TRUST_PROXY=1` o `2` según el ambiente |
| El portal dice «El destino de la redirección no está permitido» | El host no está en `VITE_ALLOWED_REDIRECT_HOSTS` del portal | Lo agrega el equipo de Auth |
| `crypto.randomUUID is not a function` | Frontend por HTTP desde una IP: no es contexto seguro | `correlationId.ts` tiene respaldo; para uso real, HTTPS |
| Una pantalla nueva no aparece | Imagen del frontend antigua o `index.html` en caché | `docker compose build` reconstruye las dos; nginx sirve `index.html` con `no-store` |
| El visor de PDF no carga | Recurso `.mjs` con tipo equivocado | Ya resuelto en `nginx.conf`; reconstruir la imagen si es anterior al 2026-09-22 |
| «Su perfil no tiene formularios asignados» | Faltan migraciones o la cuenta no tiene rol | `npx prisma migrate deploy`; revisar `t_usuario_rol` |
