# 09 · Manual de Despliegue

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> **Los comandos viven en el backend, no aquí.** Este manual resume cómo desplegamos, por qué y
> qué comprobar. El procedimiento paso a paso está en:
>
> | Documento | Para qué |
> |---|---|
> | `transporte-backend/DESPLIEGUE.md` | Los tres ambientes, el empaquetado (§7.1–7.2) y la actualización por `.tar` (§8) |
> | `transporte-backend/INSTALACION-PRODUCCION.md` | Instalación, verificación, actualización y reversión detrás del Gateway (QA y producción) |
> | `transporte-backend/COMANDOS-PREPRODUCCION.md` | Plantilla de actualización del servidor de preproducción sin Gateway |
>
> Cada paquete trae además su propia guía con los valores reales; por ejemplo,
> `qa_preproduccion_20261104/PASOS-ACTUALIZACION-QA.md`.

---

## 1. Qué se despliega

Tres contenedores, versión **1.1.0**:

| Servicio | Imagen | Usuario | Notas |
|---|---|---|---|
| `transportedb` | `postgres:18` | `postgres` | Volumen `transporte_pgdata`. Nunca se publica en servidores |
| `transporte-app` | `transporte-backend:1.1.0` | `nestjs` (uid 1001) | Unos 194 MB. Volumen `transporte_uploads` para los documentos emitidos |
| `transporte-front` | `transporte-frontend:1.1.0` | `nginx` (uid 101) | nginx no privilegiado en el 5180; reenvía `/api/` al backend |

Ningún contenedor de aplicación corre como root. `docker-compose.prod.yml` fija las imágenes por
versión (`:1.1.0`), no `:latest`: el `.tar` debe traer esas mismas etiquetas o `up` no las
encuentra.

---

## 2. Los ambientes

| | Desarrollo | Preproducción (servidor actual) | QA (pruebas del Gateway) | Producción |
|---|---|---|---|---|
| Acceso | `http://localhost:5180` | `http://<IP_PREPRODUCCION>:5180` | `https://usit-gestion.quito.gob.ec` | `https://gestion-sigoc.quito.gob.ec` |
| Delante | nada | nada | Gateway (TLS) por la red `amc` | Gateway (TLS) por la red `amc` |
| Compose | `docker-compose.yml` (construye) | `docker-compose.prod.yml` | `prod` + `docker-compose.gateway.yml` | `prod` + `docker-compose.gateway.yml` |
| Puertos publicados | 5434 (local), 3003, 5180 | 3005 → 3003, 5180 | ninguno | ninguno |
| Portal de Auth horneado | el del `.env` local | `http://<IP_SERVIDOR_AUTH>:10006/login` | `https://usit-automatizacion.quito.gob.ec/login` | el de Auth de producción (por confirmar) |
| `TRUST_PROXY` | vacía | `1` | `2` | `2` |
| HTTPS y cookie | no | no | `NODE_ENV=production`, `AUTH_COOKIE_SECURE=true` | ídem |
| Intermedia DigiCert | no aplica | no aplica | `NODE_EXTRA_CA_CERTS` desde la carpeta del Gateway | ídem |
| Plantilla | `.env.example` | `.env.preproduccion.example` | `.env.produccion.example` | `.env.produccion.example` |
| Paquete | — | `empaquetar.sh preproduccion …` | `empaquetar.sh produccion <portal de QA>` | `empaquetar.sh produccion <portal de producción>` |

QA es la preproducción que usamos para validar con usuarios desde octubre: el servidor de pruebas
del data center nuevo, con la misma topología que producción. El servidor actual sin Gateway sigue
documentado como preproducción en `DESPLIEGUE.md` §7.

**La imagen del backend es la misma en todos los servidores; la del frontend es por ambiente**,
porque el portal de Auth queda dentro del JavaScript al compilar. Un `.tar` armado para QA no sirve
para producción.

### 2.1. Detrás del Gateway

```
Navegador ──HTTPS──> Gateway (*.quito.gob.ec, TLS)
                       └─ location / ──> transporte-front:5180       (red externa amc)
                                           └─ /api/ ──> transporte-app:3003  (red interna)
                                                          └─ transportedb:5432 (red interna)
```

Lo que pedimos al equipo del Gateway, detallado en `INSTALACION-PRODUCCION.md` §A.1:

- Una sola regla `location /` hacia `transporte-front:5180`, con `X-Forwarded-For` y
  `X-Forwarded-Proto`.
- HSTS, redirección a HTTPS y TLS de su lado.
- **Ninguna** CSP ni cabeceras de seguridad propias: el contenedor ya las emite y dos CSP rompen
  llamadas sin error visible.

Lo que pedimos al equipo de Auth (§A.2): agregar el host a `VITE_ALLOWED_REDIRECT_HOSTS` del
portal, la ruta del módulo, `AUTH_JWT_SECRET`, el id de SIGOC y las URL de la API y del canje.

El nginx del frontend reenvía al backend el `X-Forwarded-Proto` que manda el Gateway, y
`TRUST_PROXY=2` hace que el backend tome la IP real del usuario. Sin él, todos los usuarios
comparten cupo y el ingreso responde 429.

---

## 3. Empaquetado

En la máquina de desarrollo, con los dos repositorios como carpetas hermanas:

```bash
cd transporte-backend
./scripts/empaquetar.sh <preproduccion|produccion> <url-del-portal-de-auth> [--destino <carpeta>] [--sin-verificar-git]
#   VITE_AUTH_MODULE_CODE=<id> y VITE_AUTH_LOGOUT_URL=<url> son opcionales, como variables de entorno
```

| Qué hace | Detalle |
|---|---|
| Verifica git | Exige `main` limpio e igual a `origin/main` en los dos repositorios. `--sin-verificar-git` marca el paquete como ENSAYO |
| Valida el portal | URL absoluta; en `produccion`, `https://` obligatorio |
| Construye | `transporte-backend:1.1.0` y `transporte-frontend:1.1.0`, con `VITE_API_BASE_URL` vacía y el portal indicado |
| Comprueba el bundle | Que lleve el portal indicado y no lleve `localhost:3003` |
| Arma la carpeta | `../<ambiente>_<AAAAMMDD>/` con `gestion-<ambiente>-<AAAAMMDD>.tar`, los compose, la plantilla del `.env`, la guía (`INSTALACION-PRODUCCION.md` o `COMANDOS-PREPRODUCCION.md`) y `SHA256-ESPERADOS.txt` |
| No toca lo local | El compose de desarrollo sigue en `:latest` |

`SHA256-ESPERADOS.txt` registra el sha256 del `.tar`, el ID de cada imagen, los commits, el portal
horneado y el nombre del bundle principal. Es la referencia de todas las comprobaciones en el
servidor.

El `.env.prod` real **no viaja en el paquete**: se entrega aparte, por canal seguro.

> **El paquete del 2026-11-04 para QA es un ENSAYO.** Se armó con `--sin-verificar-git` desde la
> rama `base/cuadro-colores` (backend `24520af`, frontend `d13a5db`). Si `main` avanza por avance
> rápido a esos commits, corresponde exactamente a `main`; si no, se vuelve a empaquetar.

---

## 4. Primera instalación

Resumen de `INSTALACION-PRODUCCION.md` (QA y producción):

| Paso | Qué | Sección |
|---|---|---|
| 1 | Pedir lo que falta al Gateway, a Auth e infraestructura (Compose ≥ 2.24, intermedia DigiCert en `<carpeta del Gateway>/config/certs`) | A |
| 2 | Copiar la carpeta, comprobar el sha256 del `.tar`, `docker load` y comprobar los ID de imagen | B |
| 3 | Crear la red `amc` si no existe | C |
| 4 | `.env.prod` desde `.env.produccion.example`, sin ningún `<COMPLETAR>`, con permisos `600` | D |
| 5 | Base: vacía (extensión, `migrate deploy`, rol `transporte_app`, primer administrador) o restaurada desde preproducción | E |
| 6 | Levantar con `docker compose -p gestion --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.gateway.yml up -d` | F |
| 7 | Verificar | G |

En preproducción sin Gateway los pasos equivalen a `DESPLIEGUE.md` §7.3, con
`docker-compose.prod.yml` solo.

---

## 5. Actualización por paquete

El servidor nunca construye. Una actualización llega como un paquete nuevo con la misma etiqueta
`1.1.0` y se aplica así (`INSTALACION-PRODUCCION.md` §I; ejemplo real en
`PASOS-ACTUALIZACION-QA.md`):

| Paso | Qué | Por qué |
|---|---|---|
| 1 | Comprobar el sha256 del `.tar` contra `SHA256-ESPERADOS.txt` | Desplegamos exactamente lo verificado |
| 2 | Revisar la última migración aplicada y que no haya ninguna a medias | Una migración a medias bloquea `migrate deploy` |
| 3 | Re-etiquetar las imágenes vigentes (`1.1.0-<fecha anterior>`) | `docker load` pisa la etiqueta `1.1.0` |
| 4 | Detener `transporte-app` y `transporte-front` y respaldar con `pg_dump -Fc` | Nadie escribe mientras se copia; el respaldo es la vuelta atrás |
| 5 | `docker load -i <paquete>.tar` y comprobar los ID | Deben coincidir con `SHA256-ESPERADOS.txt` |
| 6 | `$DC run --rm transporte-app npx prisma migrate deploy` y `migrate status` | El contenedor no migra al arrancar |
| 7 | `$DC up -d --force-recreate transporte-app transporte-front` | Con la misma etiqueta, sin `--force-recreate` el contenedor puede quedarse con la imagen anterior |
| 8 | Verificar (§6) y comparar los conteos de antes y después | |

Algunas entregas traen pasos propios: la migración `20261021090000_matriz_traslados_dmq` pide una
consulta previa de solo lectura, y la del 2026-11-04 trae un script que reporta tramos heredados de
los registros agrupados. La guía de cada paquete los indica.

Si el `docker-compose.gateway.yml` del servidor no trae `NODE_EXTRA_CA_CERTS`, se reemplaza por el
del paquete guardando antes una copia.

---

## 6. Verificación

| Comprobación | Esperado |
|---|---|
| `$DC ps` | Los tres `healthy` |
| `/health` y `/api/v1/estado` dentro de `transporte-front` | `ok` y `{"estado":"operativo","baseDatos":"disponible"}` |
| `docker exec transporte-app id` | `uid=1001(nestjs)` |
| Puertos publicados (detrás del Gateway) | Ninguno |
| Intermedia de DigiCert | El archivo existe en `/certs` y el canje con un código falso da `HTTP 500`, no `UNABLE_TO_VERIFY_LEAF_SIGNATURE` |
| Bundle | Contiene el portal del ambiente y no contiene `localhost:3003`; el `index-*.js` es el de `SHA256-ESPERADOS.txt` |
| A través del Gateway | `/`, una ruta de la aplicación, `/auth/callback` y `/api/v1/estado` responden 200; una sola `Content-Security-Policy`; HSTS presente |
| En el navegador | Se entra por el portal, vuelve a `/auth/callback`, se exporta un PDF de la matriz y se cierra sesión |

Los comandos exactos están en `INSTALACION-PRODUCCION.md` §G.

---

## 7. Reversión

Una vuelta atrás tiene dos partes, y van juntas:

1. **Imágenes.** Las anteriores siguen cargadas con su etiqueta de respaldo: se vuelven a
   etiquetar como `1.1.0` y se recrean los contenedores con `--force-recreate`.
2. **Base.** Prisma no genera migraciones inversas. Si la migración de la entrega solo agrega
   objetos nulables, la versión anterior la ignora y basta con las imágenes. Si borra o cambia
   datos —como `20261030120000_carga_por_operativos`, que borra historial de cuadros abiertos—, hay
   que **restaurar el respaldo** con `pg_restore`. Tras restaurar, si `transporte_app` perdió
   privilegios, se vuelve a aplicar `crear-rol-aplicacion.sql`.

El detalle está en `INSTALACION-PRODUCCION.md` §I y en la sección 8 de la guía de cada paquete.
**Respaldamos antes de cada actualización, sin excepción.**

---

## 8. Respaldo

`INSTALACION-PRODUCCION.md` §J recomienda un `pg_dump -Fc` diario por `cron` a las 02:30 con 14
días de retención, y copiar los respaldos fuera del servidor. La política institucional de
retención sigue sin definirse (PV-19). El volumen `transporte_uploads` guarda los documentos
emitidos y se respalda con `tar` (ver §E.2 de esa guía).

---

## 9. Registro y observabilidad

```bash
docker logs transporte-app 2>&1 | grep '"nivel":"error"'
docker logs transporte-app 2>&1 | grep '<correlacionId>'
```

`pg_stat_statements` se precarga desde el primer arranque; en servidores la extensión se crea como
paso explícito con el guion que viaja dentro de la imagen del backend.

```sql
SELECT calls, round(mean_exec_time::numeric,2) AS ms_promedio, query
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

---

## 10. Lo que este despliegue no cubre

| Ausencia | Consecuencia |
|---|---|
| **Producción** | Servidor, acceso y URL de Auth de producción por confirmar; hoy solo QA está instalado detrás del Gateway |
| **Renovación del certificado de Auth** | Vence el 2026-11-20. Si la nueva intermedia es otra, el equipo de Auth cambia el archivo en la carpeta del Gateway y recreamos `transporte-app` |
| **`subsystemId` en el token de Auth** | El Auth desplegado no lo envía: `AUTH_SUBSYSTEM_ID` todavía no llega a comprobarse |
| **Política de respaldo** | Sin definir (PV-19). Solo la recomendación del `cron` diario |
| **Métricas y alertas** | Sin Prometheus, panel ni alertas. Solo registro y `pg_stat_statements` |
| **Alta disponibilidad** | Un contenedor por servicio. `connection_limit=10` deja margen para más réplicas, sin probar |

---

## 11. Lista de comprobación

| # | Paso | Hecho |
|---|---|---|
| 1 | Paquete armado con `empaquetar.sh` para **ese** ambiente y su portal; no es ENSAYO si va a producción | ☐ |
| 2 | sha256 del `.tar` e ID de imágenes iguales a `SHA256-ESPERADOS.txt` | ☐ |
| 3 | `.env.prod` con `DB_PASSWORD`, `APP_DB_PASSWORD`, `AUTH_JWT_SECRET` y `SESSION_JWT_SECRET` distintas entre sí; `SESSION_JWT_SECRET` de 32 caracteres o más | ☐ |
| 4 | `CORS_ORIGINS` con el origen real; `TRUST_PROXY` correcto (1 o 2); con HTTPS, `NODE_ENV=production` y `AUTH_COOKIE_SECURE=true` | ☐ |
| 5 | El host está en `VITE_ALLOWED_REDIRECT_HOSTS` del portal y la ruta del módulo en Auth coincide | ☐ |
| 6 | Detrás del Gateway: red `amc`, intermedia DigiCert legible, overlay con `NODE_EXTRA_CA_CERTS` | ☐ |
| 7 | Todos los `docker compose` llevan `--env-file .env.prod` (y `-p gestion` con el Gateway) | ☐ |
| 8 | Imágenes vigentes re-etiquetadas y respaldo `pg_dump` hecho | ☐ |
| 9 | `migrate deploy` antes de levantar; `migrate status` al día | ☐ |
| 10 | Primera instalación: `crear-rol-aplicacion.sql` una vez y primer administrador con `ADMINISTRADOR_DMIP` | ☐ |
| 11 | `up -d --force-recreate` y los tres `healthy` | ☐ |
| 12 | Verificación de §6 completa, incluido el ingreso real por el portal | ☐ |
