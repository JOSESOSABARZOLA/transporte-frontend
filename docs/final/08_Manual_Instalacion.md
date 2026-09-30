# 08 · Manual de Instalación

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 28 de agosto de 2026**

> **EL PROCEDIMIENTO VIVE EN `transporte-backend/DESPLIEGUE.md`, NO AQUÍ.**
>
> Este manual y el `09` describían los mismos pasos con distinto detalle, y ya divergían:
> tres documentos para un procedimiento son tres oportunidades de que uno mienta. Desde el
> 2026-08-28 los pasos se mantienen en un solo sitio y aquí queda lo que es propio de este
> manual —requisitos, instalación local, base de pruebas y resolución de problemas—.
>
> **Para el servidor `172.20.136.127`, la sección 7 de `DESPLIEGUE.md`**: las imágenes se
> llevan construidas en un `.tar`, no se construyen allí.

---

## 1. Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| Docker + Docker Compose | 24+ / v2+ | Instalación en contenedores |
| Node.js | **≥ 20.11** | Desarrollo, migraciones y semilla |
| PostgreSQL | 18 | Lo aporta el contenedor |
| Git | — | Obtener el código |

La instalación en contenedores es la recomendada. La local sirve para desarrollo.

---

## 2. Estructura esperada

Los dos repositorios deben ser **carpetas hermanas**: el `docker-compose.yml` vive en el backend y
construye el frontend con `context: ../transporte-frontend`.

```
sigoc-cco/
├── transporte-backend/     ← docker-compose.yml, Dockerfile, prisma/
└── transporte-frontend/    ← Dockerfile, nginx.conf
```

---

## 3. Instalación en contenedores

### 3.1. Configurar

```bash
cd transporte-backend
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Complete en `.env` como mínimo:

```bash
DB_PASSWORD=<una contraseña>
DATABASE_URL=postgresql://postgres:<esa contraseña>@localhost:5434/transportedb?schema=public&connection_limit=10&pool_timeout=20
TZ=America/Guayaquil
CORS_ORIGINS=http://localhost:5180

# Sesión con Auth central. Sin estas cuatro el contenedor arranca, pero NADIE puede entrar.
AUTH_EXCHANGE_URL=http://172.20.136.127:10004/auth/exchange
AUTH_JWT_SECRET=<la entrega el equipo de Auth central>
AUTH_SUBSYSTEM_ID=11
SESSION_JWT_SECRET=<una clave propia de este módulo, DISTINTA de la anterior>
```

### 3.2. Construir

```bash
docker compose build
```

Construye **las dos** imágenes. El cliente de Prisma se genera **dentro** de la imagen del backend;
nunca se copia de la máquina de desarrollo, porque incluye binarios específicos de la plataforma.

### 3.3. Levantar la base

```bash
docker compose up -d transportedb
```

Con el volumen vacío, `prisma/init-db/01-extensiones.sql` crea `pg_stat_statements` sola.

**Sobre un despliegue que ya tiene datos el script no corre** —así funciona
`/docker-entrypoint-initdb.d`— y hay que crear la extensión a mano:

```bash
docker exec transportedb psql -U postgres -d transportedb \
  -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

### 3.4. Aplicar migraciones · paso explícito

```bash
docker compose run --rm transporte-app npx prisma migrate deploy
```

**El arranque del contenedor no aplica migraciones**, y es deliberado: un contenedor que migra al
arrancar aplica cambios de esquema cada vez que se reinicia, en el peor momento posible.

### 3.5. Sembrar catálogos · solo la primera vez

Desde la máquina de desarrollo, con `DATABASE_URL` apuntando al puerto publicado (5434):

```bash
npm install
npx prisma generate
# Retirado el 2026-08-19: los catálogos entran con `npx prisma migrate deploy`
```

Carga parámetros, ventanas, zonales, tipos de control, instituciones y **los nueve formularios**,
y termina ejecutando `ANALYZE`. Imprime al final qué quedó sin cargar y qué pendiente lo bloquea.

### 3.6. Levantar todo

```bash
docker compose up -d
```

| Servicio | Puerto | Comprobación |
|---|---|---|
| `transportedb` | 5434 | `pg_isready` |
| `transporte-app` | 3003 | `GET /api/v1/estado` |
| `transporte-front` | 5180 | `GET /health` |

### 3.7. Comprobar

```bash
docker compose ps                                                              # los tres «healthy»
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/api/v1/estado   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/health          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/v1/estado   # 200, por el proxy
docker exec transporte-app id                                                  # uid=1001(nestjs)
docker exec transporte-front id                                                # uid=101(nginx)
docker exec transporte-app sh -c 'date'                                        # debe decir -05
```

---

## 4. Instalación local para desarrollo

### 4.1. Base de datos

Levante solo el contenedor de PostgreSQL:

```bash
cd transporte-backend
docker compose up -d transportedb
```

### 4.2. Backend

```bash
npm install
npx prisma generate
npx prisma migrate dev
# Retirado el 2026-08-19: los catálogos entran con `npx prisma migrate deploy`
npm run start:dev            # http://localhost:3003/api/v1
```

**No hay modo de desarrollo sin autenticar.** Se retiró el 2026-08-18: hasta entonces
`MODO_IDENTIDAD_PROVISIONAL=true` permitía identificarse con una cabecera, y **cualquiera podía
declararse `DIRECTOR`**. Para trabajar en local hace falta ingresar por el portal de Auth como con
cualquier otro usuario, y **tener fila en `t_usuario`**.

### 4.3. Frontend

```bash
cd ../transporte-frontend
npm install
npm run dev                  # http://localhost:5180
```

---

## 5. Base de las pruebas de integración

`npm run test:integracion` **no usa la base de desarrollo**: usa `transportedb_pruebas`, en el
mismo servidor.

El motivo es estructural: `ck_formulario_numero` acota el número de formulario **entre 1 y 9**. Si
el catálogo institucional ocupa los nueve casilleros, las suites no tienen dónde crear los suyos.

Se prepara una vez:

```bash
docker exec transportedb psql -U postgres -c "CREATE DATABASE transportedb_pruebas;"

URL="postgresql://postgres:CLAVE@localhost:5434/transportedb_pruebas?schema=public"
DATABASE_URL="$URL" npx prisma migrate deploy
# Ya no hace falta: la migración puebla también la base de pruebas, omitiendo
# a propósito los nueve formularios para no ocupar los casilleros de las suites.
```

La semilla **detecta esa base por su nombre y no le siembra los nueve formularios**, a propósito.

**Tras cada migración nueva hay que repetir el `migrate deploy` sobre esa base.**

---

## 6. Verificación de la instalación

```bash
cd transporte-backend
npm run prisma:verificar     # 27 tablas, 11 enums, 24 CHECK, 8 índices parciales
npm test                     # 738 pruebas unitarias
npm run test:integracion     # 283 pruebas
npm run lint:check && npm run build

cd ../transporte-frontend
npm test                     # 258 pruebas
npm run lint && npm run build
```

Estado esperado: **todo en verde**, con una única advertencia heredada de lint en
`components/tabla/FilterByColumn.tsx`.

---

## 7. Desinstalación

```bash
docker compose down                 # detiene y elimina los contenedores
docker compose down -v              # ELIMINA TAMBIÉN EL VOLUMEN Y TODOS LOS DATOS
docker rmi transporte-backend:latest transporte-frontend:latest
```

> `-v` borra `transporte_pgdata`. No hay vuelta atrás sin un respaldo.

---

## 8. Problemas frecuentes de instalación

| Síntoma | Causa | Solución |
|---|---|---|
| `docker compose up` se detiene al inicio | `DB_PASSWORD` vacío | Complételo en `.env` |
| El contenedor de la base reinicia en bucle | Volumen montado en la ruta antigua | El montaje va en `/var/lib/postgresql`, no en `/data`. Ya está corregido |
| El backend reinicia al primer acceso a datos | Motor de Prisma incompatible | La imagen instala `openssl`; reconstruya sin caché |
| Toda petición responde `401` | No hay cookie de sesión, o `SESSION_JWT_SECRET` está vacía | Ingrese por el portal. Si persiste: `docker logs transporte-app 2>&1 | grep SESSION_JWT_SECRET` |
| El ingreso responde `403` y no `401` | Auth le autenticó, pero **no tiene fila en `t_usuario`** o está desactivado | Dele de alta con `usua_identificador_ad` = su usuario de Auth |
| El portal devuelve a una página que no existe | La ruta del **módulo 80** en Auth no coincide con el origen real del frontend | Corríjala en Auth. Hoy: `localhost:5180` |
| `crypto.randomUUID is not a function` | El frontend se sirve por HTTP desde una IP: **no es contexto seguro** | Ya hay respaldo en `correlationId.ts`. Si reaparece, use `localhost` o HTTPS |
| Una pantalla nueva no aparece | Imagen del frontend antigua | `docker compose build` reconstruye las dos |
| «Su perfil no tiene formularios asignados» | Faltan las migraciones, o la cuenta no tiene rol | `npx prisma migrate deploy`; si persiste, compruebe que hay fila en **`t_usuario_rol`**: el rol dejó de ser una columna de `t_usuario` cuando una persona pasó a poder tener varios |
| El desplegable de puntos está vacío | Falta la matriz zonal ↔ punto (PV-01) | Cargarla desde P-08 |
