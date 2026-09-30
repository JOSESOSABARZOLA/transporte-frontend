# 09 · Manual de Despliegue

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 28 de agosto de 2026**

> **LOS PASOS VIVEN EN `transporte-backend/DESPLIEGUE.md`, NO AQUÍ.**
>
> Aquí quedan el porqué de cada decisión, el respaldo, la reversión y la lista de
> comprobación. Los comandos se mantienen en un solo sitio desde el 2026-08-28.

---

## 1. Qué se despliega

Tres contenedores, orquestados por `transporte-backend/docker-compose.yml`.

| Servicio | Imagen | Puerto | Usuario |
|---|---|---|---|
| `transportedb` | `postgres:18` | 5434 → 5432 | `postgres` |
| `transporte-app` | `transporte-backend:latest` | 3003 | **`nestjs` (uid 1001)** |
| `transporte-front` | `transporte-frontend:latest` | 5180 | **`nginx` (uid 101)** |

**Ninguno de los dos contenedores de aplicación corre como root**, maestro de nginx incluido.

---

## 2. Decisiones del despliegue, y su porqué

### 2.1. Imagen del backend en dos etapas

La etapa de construcción compila y **genera el cliente de Prisma dentro de la imagen**. Nunca se
copia desde la máquina de desarrollo: incluye binarios específicos de la plataforma y es la causa
más frecuente de fallo al contenerizar con Prisma.

La etapa de ejecución instala `dumb-init` —manejo correcto de señales— y **`openssl`**, que
`node:20-slim` no trae: sin él, la detección del motor de consultas cae a una variante distinta de
la que se generó y el contenedor entra en bucle de reinicio al primer acceso a datos.

### 2.2. Las migraciones no se aplican al arrancar

`ENTRYPOINT dumb-init -- CMD node dist/main`. Nada más.

Un contenedor que migra al arrancar aplica cambios de esquema cada vez que se reinicia, en el peor
momento posible, y con varias réplicas los aplica varias veces a la vez.

### 2.3. El frontend se sirve con nginx

`nginxinc/nginx-unprivileged:1.27-alpine`. La configuración hace de proxy de `/api/` hacia
`transporte-app:3003`, con lo que las peticiones salen del mismo origen y no hay CORS.

**No hay bloque de CORS en nginx, y es deliberado**: anunciarlo contradiría la lista blanca del
backend.

### 2.4. Comprobaciones de salud

Los tres servicios las declaran, y `depends_on` las respeta. Sin ellas, el backend figuraba como
«Up» desde el primer instante aunque NestJS todavía no estuviera escuchando.

---

## 3. Despliegue inicial

Ver `08_Manual_Instalacion.md`. En resumen:

```bash
cd transporte-backend
cp .env.example .env && ${EDITOR:-nano} .env
docker compose build
docker compose up -d transportedb
docker compose run --rm transporte-app npx prisma migrate deploy
# Retirado el 2026-08-19: los catálogos entran con `npx prisma migrate deploy`
docker compose up -d
```

---

## 4. Actualización de versión

```bash
git pull                                                        # en los dos repositorios
docker compose build
docker compose run --rm transporte-app npx prisma migrate deploy
docker compose up -d
```

**`docker compose build` reconstruye las dos imágenes.** Hasta agosto de 2026 el servicio del
frontend no declaraba `build:` y se quedaba en la imagen anterior sin avisar: una pantalla nueva no
aparecía y no había nada en el registro que lo explicara.

Si hubo migraciones, repita también el `migrate deploy` sobre `transportedb_pruebas`.

---

## 5. Comprobación posterior al despliegue

```bash
docker compose ps                                                              # los tres «healthy»
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/api/v1/estado   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/health          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/v1/estado   # 200

docker exec transporte-app id                            # uid=1001(nestjs) · NO root
docker exec transporte-front id                          # uid=101(nginx)  · NO root
docker exec transporte-app sh -c 'date'                  # debe decir -05
docker logs transporte-app 2>&1 | grep -i PROVISIONAL    # en producción: sin resultados
```

> **La última línea es la que importa en producción.** Si devuelve algo, la identidad se está
> tomando de una cabecera HTTP y el despliegue **no es seguro**.

---

## 6. Reversión

Las imágenes llevan la etiqueta `latest`, así que no hay versión anterior a la que volver
automáticamente. Para revertir:

```bash
git checkout <etiqueta-anterior>
docker compose build
docker compose up -d
```

> **Las migraciones no se revierten solas.** Prisma no genera migraciones inversas. Si el
> despliegue incluyó una migración destructiva, la vuelta atrás exige restaurar el respaldo.
> **Respalde antes de cada despliegue con migraciones.**

---

## 7. Respaldo

```bash
docker exec transportedb pg_dump -U postgres transportedb > respaldo_$(date +%F).sql

# Restauración
cat respaldo_2026-08-07.sql | docker exec -i transportedb psql -U postgres -d transportedb
```

**No hay política de retención definida (PV-19).** El volumen `transporte_pgdata` contiene todo.

---

## 8. Registro y observabilidad

```bash
docker compose logs -f transporte-app
docker logs transporte-app 2>&1 | grep '"nivel":"error"'
docker logs transporte-app 2>&1 | grep '<correlacionId>'
```

**`pg_stat_statements` está habilitado desde el primer arranque**, a propósito: acumula desde que
la base arranca, y habilitarlo cuando alguien ya se queja de lentitud deja sin nada con que
comparar.

```sql
SELECT calls, round(mean_exec_time::numeric,2) AS ms_promedio, query
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

---

## 9. Lo que este despliegue no cubre

| Ausencia | Consecuencia |
|---|---|
| **Identidad real (E12)** | **El sistema no se puede poner en producción.** Con el modo apagado nadie se autentica; con el modo encendido cualquiera se hace pasar por quien quiera |
| **HTTPS** | El nginx sirve en claro. La terminación TLS corresponde al proxy institucional |
| **Política de respaldo** | Sin definir (PV-19) |
| **Métricas y alertas** | No hay Prometheus, ni panel, ni alertas. Solo registro y `pg_stat_statements` |
| **Alta disponibilidad** | Un contenedor por servicio. El bloqueo optimista y `uq_orden_vigente` toleran varias réplicas del backend, pero no se ha probado |

**Los cinco bloqueantes del negocio** —PV-01, PV-02, PV-03, PV-25 y PV-26— condicionan el uso real.
Dos quedaron resueltos el 7 de agosto de 2026 (PV-25 y PV-26); los otros tres siguen abiertos.

---

## 10. Lista de comprobación

> Para el servidor, use además la sección 7 de `DESPLIEGUE.md`: allí no se construye.

| # | Paso | Hecho |
|---|---|---|
| 1 | `.env.prod` con `DB_PASSWORD`, `APP_DB_PASSWORD`, `AUTH_JWT_SECRET` y `SESSION_JWT_SECRET` **distintas entre sí** | ☐ |
| 1b | `AUTH_COOKIE_SECURE=true` si hay HTTPS; `CORS_ORIGINS` con **el origen real**, no el de otra máquina | ☐ |
| 1c | La ruta del **módulo 80** en Auth central coincide con ese origen | ☐ |
| 1d | Si Auth central **no** está en `172.20.136.127`: reconstruir el frontend con `VITE_AUTH_PORTAL_URL`. No basta con ponerlo en el `.env` | ☐ |
| 2 | Respaldo de la base anterior | ☐ |
| 3 | `docker compose build` en la máquina, y `docker save` de las dos imágenes | ☐ |
| 4 | `docker load` en el servidor | ☐ |
| 5 | `prisma migrate deploy` sobre `transportedb` | ☐ |
| 6 | `crear-rol-aplicacion.sql`, una vez por base | ☐ |
| 7 | `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d` | ☐ |
| 7b | **Todos los `docker compose` llevan `--env-file .env.prod`.** Sin ello el primer `up` se detiene: la interpolación `${...}` no lee `env_file:` | ☐ |
| 7c | El primer administrador: **dos** inserciones, `t_usuario` y `t_usuario_rol`. No existe la columna `usua_rol` | ☐ |
| 8 | Los tres «healthy» | ☐ |
| 9 | Los endpoints de comprobación responden 200 **por la IP del servidor**, no por localhost | ☐ |
| 10 | Ningún contenedor corre como root | ☐ |
| 11 | **Se entra de verdad por el portal de Auth** y la sesión se abre | ☐ |
