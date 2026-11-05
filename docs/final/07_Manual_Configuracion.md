# 07 · Manual de Configuración

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Corresponde al código de la rama `base/cuadro-colores` (backend `24520af`, frontend `d13a5db`),
> versión de imágenes **1.1.0**. Las plantillas versionadas mandan sobre este manual si difieren:
> `transporte-backend/.env.example`, `.env.preproduccion.example`, `.env.produccion.example` y
> `transporte-frontend/.env.example`.

---

## 1. Dónde vive cada cosa

El sistema se configura en **tres sitios distintos**. Confundirlos es la causa habitual de que un
cambio «no haga nada».

| Dónde | Qué se configura | Cómo se aplica un cambio |
|---|---|---|
| `.env` (desarrollo) o `.env.prod` (servidores) del backend | Conexión, red, proxy, sesión con Auth, integraciones | Recrear `transporte-app` |
| Argumentos de construcción del frontend (`VITE_*`) | Portal de Auth, código del módulo, base de la API | **Reconstruir la imagen** del frontend (un paquete nuevo) |
| Base de datos, pantalla «Ventanas y parámetros» | Ventanas de carga, jornadas laborales y parámetros de política | Ninguno: rige al guardar |

Todo lo que gobierna el negocio —horas de cierre, umbrales de descanso, carga del personal—
vive en la base y se cambia desde la pantalla. Lo que gobierna la infraestructura vive en el
archivo de entorno o en la imagen.

### 1.1. Plantilla por ambiente

| Ambiente | Plantilla | Archivo real | Compose |
|---|---|---|---|
| Desarrollo local | `.env.example` | `.env` | `docker-compose.yml` |
| Preproducción, servidor sin Gateway | `.env.preproduccion.example` | `.env.prod` | `docker-compose.prod.yml` |
| QA y producción, detrás del Gateway | `.env.produccion.example` | `.env.prod` | `docker-compose.prod.yml` + `docker-compose.gateway.yml` |

Los archivos reales no se versionan y se entregan por canal seguro. En los servidores, todo
`docker compose` lleva `--env-file .env.prod`: la interpolación `${...}` del compose no lee
`env_file:` y, sin la opción, el primer `up` se detiene pidiendo `DB_PASSWORD`.

---

## 2. Variables del backend

Los valores de ejemplo usan marcadores (`<host-de-auth>`, `<IP_SERVIDOR_AUTH>`); los reales se
piden al equipo correspondiente. «Obligatoria» significa que sin ella el sistema no arranca o
nadie puede entrar.

### 2.1. Operación, base de datos y red

| Variable | Obligatoria | Ejemplo | Efecto |
|---|---|---|---|
| `PORT` | No | `3003` | Puerto interno del backend. Los compose lo fijan en `3003` |
| `NODE_ENV` | Solo con HTTPS | `production` | Endurece el arranque: exige `CORS_ORIGINS` y `AUTH_COOKIE_SECURE=true`, y helmet emite HSTS. Sin TLS por delante se deja comentada |
| `TZ` | Sí | `America/Guayaquil` | **Crítica.** Zona en que se evalúan ventanas y jornadas. Los compose la fijan en los tres contenedores |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn` o `error`. Con `debug` registra además las consultas de Prisma |
| `DB_PASSWORD` | Sí | `openssl rand -hex 32` | Clave de `postgres`. La usan el contenedor de la base y las migraciones. Sin ella `docker compose up` se detiene |
| `APP_DB_PASSWORD` | Sí | otra, distinta | Clave del rol `transporte_app`, con el que corre la aplicación |
| `DATABASE_URL` | Sí (solo desarrollo fuera de Docker) | ver §2.4 | Conexión del cliente en ejecución, como `transporte_app`. En contenedores la compone el compose |
| `DIRECT_DATABASE_URL` | Sí (solo desarrollo fuera de Docker) | ver §2.4 | Conexión de `migrate deploy`/`migrate dev`, como `postgres`. En contenedores la compone el compose |
| `CORS_ORIGINS` | Sí en producción | `https://gestion-sigoc.quito.gob.ec` | Orígenes del frontend admitidos, separados por coma, sin barra final. Con el origen fuera de la lista el navegador descarta la respuesta sin error |
| `TRUST_PROXY` | Sí en servidores | `1` o `2` | Saltos de proxy de confianza: vacía en desarrollo, `1` sin Gateway (nginx → app), `2` con Gateway (Gateway → nginx → app). Un valor no entero detiene el arranque |
| `LIMITE_VENTANA_MS` | No | `60000` | Ventana del límite de peticiones, por endpoint y por origen |
| `LIMITE_MAXIMO` | No | `300` | Peticiones admitidas por ventana. El punto de salud está exento |
| `LIMITE_MAXIMO_INGRESO` | No | `10` | Cupo del canje de sesión, más estrecho a propósito |
| `CERTS_GATEWAY` | No | `../gateway/config/certs` | Solo detrás del Gateway. Carpeta del host con `start_quito_gob_ec_intermediate.crt`; vacía usa ese mismo valor |

`NODE_EXTRA_CA_CERTS` no se escribe en el `.env.prod`: la fija `docker-compose.gateway.yml`
apuntando a la intermedia de DigiCert montada en `/certs`. El Auth de `*.quito.gob.ec` no envía
esa intermedia y, sin ella, el canje termina en 401 con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Nunca
usamos `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### 2.2. Sesión con Auth central

| Variable | Obligatoria | Ejemplo | Efecto |
|---|---|---|---|
| `AUTH_EXCHANGE_URL` | Sí | `https://<host-de-auth>/api/auth/exchange` · local: `http://<IP_SERVIDOR_AUTH>:10004/auth/exchange` | Endpoint de canje del código. Sin ella nadie entra |
| `AUTH_API_URL` | No | `https://<host-de-auth>/api` | Base de la API de Auth, de la que cuelga `/users`. Vacía: sin directorio de personal en P-07 |
| `AUTH_JWT_SECRET` | Sí | la entrega Auth | **Secreto compartido** con todo el ecosistema. Verifica lo que Auth firmó |
| `AUTH_SUBSYSTEM_ID` | Sí | `11` en el Auth actual | Id de SIGOC en la base de Auth de cada ambiente. Vacío o `0` desactiva la comprobación y el arranque lo advierte |
| `SESSION_JWT_SECRET` | Sí | `openssl rand -hex 32` | **Secreto propio**, distinto del anterior. Firma la cookie de este módulo. Vacía o de menos de 32 caracteres detiene el arranque |
| `SESSION_EXPIRES_IN` | No | `28800` | Vigencia de la sesión en segundos (8 h) |
| `JWT_ISSUER` | No | `transporte-backend` | Emisor del token propio |
| `JWT_AUDIENCE` | No | `TRANSPORTE` | Destinatario del token propio. Mismo valor que `VITE_AUTH_MODULE_CODE` por omisión |
| `AUTH_COOKIE_NAME` | No | `cuadro_colores_sesion` | Nombre de la cookie |
| `AUTH_COOKIE_SECURE` | Sí con HTTPS | `true` | `false` sobre HTTP; `true` con HTTPS, junto con `NODE_ENV=production` |
| `AUTH_COOKIE_SAME_SITE` | No | `lax` | `lax`, `strict` o `none`. Otro valor se toma como `lax` |

`AUTH_API_URL` va aparte de `AUTH_EXCHANGE_URL` aunque apunten al mismo servidor: la segunda
nombra un endpoint concreto, y recortarla para adivinar la base se rompería el día que Auth mueva
una de las dos. La barra final sobra: el código la quita.

### 2.3. Integraciones opcionales

| Variable | Obligatoria | Ejemplo | Efecto |
|---|---|---|---|
| `INSPECCION_API_URL` | No | `https://inspeccion-sigoc.quito.gob.ec/api` | Base de la API de Inspección (`/operativos?fecha=`). Vacía: sin integración, el registro funciona igual |
| `FIRMA_URL` | No | `http://<host-firma>:<puerto>/api/firmas/sign-pdf/upload` | Servicio de firma del memorando de la orden. Sin `FIRMA_URL`, `FIRMA_P12_PATH` y `FIRMA_P12_CLAVE`, el memorando sale sin firmar y el registro lo avisa |
| `FIRMA_P12_PATH` | No | `/certs/firma.p12` | Ruta del `.p12` **dentro** del contenedor, montado como volumen de solo lectura |
| `FIRMA_P12_CLAVE` | No | — | Clave del `.p12`. Secreto |
| `FIRMA_TOKEN` | No | — | Bearer, si el servicio de firma lo exige |
| `FIRMA_PAGINA` | No | vacía | Página de la firma; por omisión, la última |

Con el servicio de firma configurado y caído, la emisión responde 502 con un mensaje al
funcionario.

### 2.4. `DATABASE_URL` y `DIRECT_DATABASE_URL`

Solo se escriben en el `.env` de desarrollo, para trabajar con el backend fuera de Docker contra
la base publicada en `localhost:5434`:

```bash
DATABASE_URL=postgresql://transporte_app:<APP_DB_PASSWORD>@localhost:5434/transportedb?schema=public&connection_limit=10&pool_timeout=20
DIRECT_DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@localhost:5434/transportedb?schema=public
```

En los tres compose el bloque `environment:` las compone con la red interna
(`transportedb:5432`) y gana sobre el archivo de entorno. En `.env.prod` no se escriben.

| Rol | Lo usa | Puede |
|---|---|---|
| `transporte_app` | La aplicación en ejecución | Leer y escribir datos. No altera el esquema ni crea roles. `statement_timeout` de 30 s |
| `postgres` | El contenedor de la base y las migraciones | Todo |

El rol se crea una vez por base con `prisma/roles/crear-rol-aplicacion.sql`, después de la primera
migración.

> **`connection_limit=10` no es opcional.** Sin él, Prisma dimensiona su pool con
> `num_cpus × 2 + 1`: en una máquina de 28 núcleos son 57 conexiones por instancia contra un
> `max_connections` de 100. Si alguna vez hay más réplicas, bajamos este número.

### 2.5. Lo que se valida al arrancar

`src/config/validar-entorno.ts` separa lo que detiene el arranque de lo que solo se advierte.

| Condición | Resultado |
|---|---|
| `DATABASE_URL` vacía | Detiene |
| `SESSION_JWT_SECRET` vacía o de menos de 32 caracteres | Detiene |
| `TRUST_PROXY` con un valor que no es entero | Detiene |
| `NODE_ENV=production` sin `CORS_ORIGINS` | Detiene |
| `NODE_ENV=production` con `AUTH_COOKIE_SECURE=false` | Detiene |
| `AUTH_JWT_SECRET` vacía | Advierte: el canje no podrá verificar tokens |
| `AUTH_SUBSYSTEM_ID` vacío o `0` | Advierte: no se comprueba el subsistema |

`docker logs transporte-app` dice qué variable falta.

### 2.6. Las dos claves de sesión

| Variable | Qué hace | Alcance |
|---|---|---|
| `AUTH_JWT_SECRET` | **Verifica** lo que Auth central firmó, una vez, en el canje | Todo el ecosistema |
| `SESSION_JWT_SECRET` | **Firma** la cookie de sesión de este módulo | Solo este módulo |

Con el mismo valor en las dos, cualquier módulo integrado podría emitir sesiones válidas aquí.
Rotar `SESSION_JWT_SECRET` invalida las sesiones vivas: lo hacemos en ventana de mantenimiento.
Los compose no fijan ninguna de las dos.

### 2.7. Tiempos máximos de la base

Van en el `command:` del contenedor de la base, igual en desarrollo y en servidores.

| Parámetro | Valor | Qué evita |
|---|---|---|
| `idle_in_transaction_session_timeout` | 60 s | Que una transacción abandonada retenga bloqueos e impida que autovacuum limpie |
| `lock_timeout` | 10 s | Que una consulta espere indefinidamente un bloqueo |
| `statement_timeout` | 30 s, por rol | Solo para `transporte_app`; global rompería migraciones largas |

En la aplicación, `ejecutarEnTransaccion` usa `maxWait` de 5 s y `timeout` de 20 s, porque toda
escritura multitabla lleva la auditoría dentro de la misma transacción.

### 2.8. Valores que cambian por ambiente

| Variable | Desarrollo | Preproducción (sin Gateway) | QA y producción (Gateway) |
|---|---|---|---|
| `NODE_ENV` | sin definir | comentada | `production` |
| `AUTH_COOKIE_SECURE` | `false` | `false` | `true` |
| `TRUST_PROXY` | vacía | `1` | `2` |
| `CORS_ORIGINS` | `http://localhost:5180` | `http://<IP_PREPRODUCCION>:5180,http://localhost:5180` | `https://usit-gestion.quito.gob.ec` (QA) · `https://gestion-sigoc.quito.gob.ec` (producción) |
| `AUTH_EXCHANGE_URL` | `http://<IP_SERVIDOR_AUTH>:10004/auth/exchange` | igual | `https://usit-auth.quito.gob.ec/api/auth/exchange` (QA) · la de Auth de producción |
| `AUTH_SUBSYSTEM_ID` | `11` | `11` | el id de SIGOC en ese Auth |
| `CERTS_GATEWAY` | no aplica | no aplica | vacía o la ruta de los certificados del Gateway |

---

## 3. Variables del frontend

**Se hornean al construir la imagen; no se leen al arrancar.** Ponerlas en el `.env.prod` del
servidor no cambia nada. Para otro portal hacemos un paquete nuevo con `scripts/empaquetar.sh`.

| Variable | Obligatoria | Ejemplo | Efecto |
|---|---|---|---|
| `VITE_AUTH_PORTAL_URL` | **Sí** | `https://usit-automatizacion.quito.gob.ec/login` · local: `http://<IP_SERVIDOR_AUTH>:10006/login` | Portal al que se envía a quien llega sin sesión. Sin ella `npm run build` se detiene (`vite.config.ts`) y `npm run dev` muestra «Falta configurar la dirección del portal de Auth» |
| `VITE_API_BASE_URL` | No | vacía en imágenes · `http://localhost:3003` en `npm run dev` | Base de la API; `httpClient` agrega `/api/v1`. Vacía o ausente en un build: pide al propio origen, y el nginx de la imagen reenvía `/api/` a `transporte-app:3003`. Nunca `/api` |
| `VITE_AUTH_LOGOUT_URL` | No | vacía | Destino al cerrar sesión. Vacía: el mismo portal |
| `VITE_AUTH_MODULE_CODE` | No | vacía → `TRANSPORTE` | Código del módulo que se envía al portal como `?module=`. Hoy el portal no decide nada con él |

Dónde se definen:

| Caso | Dónde |
|---|---|
| `npm run dev` | `transporte-frontend/.env.development.local` o `.env` (los dos fuera de git), copiando de `.env.example` |
| `docker compose build` en desarrollo | `VITE_AUTH_PORTAL_URL` en el `.env` del **backend**: el compose la pasa como `args:` y se detiene si falta |
| Paquete para un servidor | Segundo argumento de `scripts/empaquetar.sh`; `VITE_AUTH_MODULE_CODE` y `VITE_AUTH_LOGOUT_URL` como variables del entorno del script |

> **Todo lo que lleva el prefijo `VITE_` llega al navegador y es público.** Nunca va un secreto.
> El frontend no tiene variables de base de datos: las `PG*` se retiraron el 2026-08-19, y
> `.env.dev` no se versiona.

### 3.1. El nginx de la imagen

`nginx.conf` sirve en el 5180 con usuario no privilegiado (uid 101) y hace cuatro cosas que
afectan a la configuración:

- Reenvía `/api/` a `transporte-app:3003` con `X-Forwarded-For` y `X-Forwarded-Proto`. Este
  último respeta el que manda el Gateway y, si no hay Gateway, usa el esquema propio.
- Emite `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` y
  `Referrer-Policy`. Por eso el Gateway no debe añadir su propia CSP.
- Sirve `index.html` con `no-store`, para que tras cada despliegue se cargue la versión nueva
  sin cerrar sesión, y los recursos con hash como inmutables.
- Fuerza `text/javascript` para `.mjs`, que necesita el visor de PDF.

---

## 4. Regreso desde el portal de Auth

El portal elige a dónde devolver al usuario en este orden:

1. El `?redirectUri=` que envía la aplicación (`<origen>/auth/callback`), si su host está en
   `VITE_ALLOWED_REDIRECT_HOSTS` del portal.
2. El `subsystemPath` que devuelve la API de Auth.
3. La ruta del primer módulo con `path`, por orden.

Para que el ingreso se cierre deben concordar tres valores:

| Dónde | Qué |
|---|---|
| Portal de Auth del ambiente | El host del frontend en `VITE_ALLOWED_REDIRECT_HOSTS` (lo agrega el equipo de Auth) |
| Auth, módulo de Transporte | Su ruta: `localhost:5180` en desarrollo; `https://usit-gestion.quito.gob.ec` en QA |
| Backend | `CORS_ORIGINS` con el mismo origen |

Fuera de `localhost`, HTTPS deja de ser opcional: sobre HTTP en una dirección IP el navegador no
es contexto seguro y retira parte de su API, y la cookie `Secure` exige TLS.

---

## 5. Configuración de negocio · «Ventanas y parámetros»

Pantalla `/home/administracion/ventanas`. La ven quienes tienen `ventanas:administrar`,
`parametros:administrar` o `jornadas:administrar`. Cada cambio rige al guardar y queda auditado.
Cada parámetro muestra «Modificado» cuando difiere de su valor de siembra y ofrece «Restaurar».

### 5.1. Ventanas de carga

Una por rol. Tipos: `DIARIO`, `SEMANAL`, `INTERVALO`, `LABORABLE` y `SIN_RESTRICCION` (desde el
2026-10-07, «sin restricción» es un tipo y no una ventana desactivada). El mensaje de cierre admite
los marcadores `{apertura}` y `{cierre}`.

| Rol | Tipo | Apertura | Cierre (siembra) |
|---|---|---|---|
| DMIP Operativos | `DIARIO` | — | 15:00 |
| DMIP Inspecciones | `DIARIO` | — | 15:00 |
| DMIT Instrucción | `DIARIO` | — | 15:00 |
| DAF | `DIARIO` | 15:00 | 16:30 |
| Dirección | `SIN_RESTRICCION` | — | — |
| Administrador DMIP | `SIN_RESTRICCION` | — | — |

Son valores de siembra en una base nueva; en cada servidor la administración los ajusta. El
`VentanaCargaGuard` lee esta tabla y devuelve `423` fuera de la ventana.

### 5.2. Jornadas laborales

Desde el 2026-10-23 la jornada laboral reemplaza al tipo de contrato: define qué días y horas se
puede convocar a una persona o a un conductor. **Sin jornada asignada no se convoca.** La
migración siembra dos:

| Jornada | Días | Horas |
|---|---|---|
| Lunes a Viernes 8 horas | L–V | 08:00–16:00 |
| Lunes a Domingo 24/7 | L–D | sin ventana horaria |

La 24/7 sigue sujeta a descanso y ausencias. El conductor puede seguir
`MINUTOS_TOLERANCIA_FIN_CONDUCTOR` después del fin de su ventana.

### 5.3. Parámetros de política vigentes

Tabla `t_parametro_politica`. Los valores son los que siembran las migraciones hasta
`20261030120000_carga_por_operativos` (columna `para_valor_siembra`). Las políticas leen siempre
estos valores, nunca una constante.

**Personal: jornada, descanso y salidas**

| Clave | Siembra | Unidad (rango) | Qué controla |
|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | 12 | horas (8–16) | RN-36. Horas máximas que una persona acumula en una jornada |
| `TOPE_SALIDAS_PESADAS` | 3 | salidas (1–6) | RN-25. Salidas nocturnas o de fin de semana por persona en el período |
| `PERIODO_COMPUTO_SALIDAS` | MENSUAL | SEMANAL · QUINCENAL · MENSUAL | RN-37. Período del tope anterior |
| `DIAS_DESCANSO_PATRULLA` | 1 | días (1–3) | RN-24. Días sin patrulla tras salir en patrulla |
| `FRANJA_NOCTURNA_INICIO` | 20:00 | hora | RN-43. Inicio de la franja nocturna |
| `FRANJA_NOCTURNA_FIN` | 05:00 | hora | RN-43. Fin de la franja nocturna |
| `HORA_LIMITE_CUADRO` | 16:30 | hora | RN-57. Hora a la que el cuadro debe estar cerrado |
| `MIS_OPERATIVOS_RANGO_MAX_DIAS` | 31 | días (1–366) | Máximo de días del filtro Desde–Hasta en «Mis operativos» |

**Carga y equidad del personal**

| Clave | Siembra | Unidad (rango) | Qué controla |
|---|---|---|---|
| `CARGA_OP_MEDIA` | 2 | operativos (1–50) | Desde cuántos operativos de la semana la persona se muestra con «Carga Media» |
| `CARGA_OP_ALTA` | 3 | operativos (1–50) | Desde cuántos, «Carga Alta»: se pide confirmación y no se marca «Sugerido» |
| `PERIODO_EQUIDAD` | SEMANAL | SEMANAL · QUINCENAL · MENSUAL | Período sobre el que se reparte la carga |
| `EQUIDAD_MARGEN` | 0.25 | fracción (0–1) | Banda alrededor de la cuota justa que se considera equilibrada |
| `PESO_HORAS_DIA` | 1 | puntos/hora (0–100) | Índice de carga: peso de cada hora ya asignada en el día |
| `PESO_CARGA_PERIODO` | 1 | puntos/hora (0–100) | Índice de carga: peso de cada hora asignada en otros días del período |
| `PESO_SALIDAS_PESADAS` | 2 | puntos/salida (0–100) | Índice de carga: peso de cada salida pesada del período |
| `PESO_PATRULLA_RECIENTE` | 3 | puntos (0–100) | Índice de carga: peso de haber salido en patrulla recientemente |
| `FATIGA_UMBRAL_AMBAR` | 6 | puntos (0–100) | Índice de fatiga desde el que el semáforo pasa a ámbar (aviso) |
| `FATIGA_UMBRAL_ROJO` | 10 | puntos (0–100) | Índice desde el que pasa a rojo (sigue asignable) |

Desde el 2026-10-30 la etiqueta de carga del **personal** sale de los operativos del período
(`CARGA_OP_*`). El índice de horas y los umbrales `FATIGA_UMBRAL_*` siguen rigiendo para los
conductores de la DAF y para desempatar.

**Cobertura por turnos (Instrucción)**

| Clave | Siembra | Unidad (rango) | Qué controla |
|---|---|---|---|
| `HORA_TURNO_DIURNO_INICIO` | 08:00 | hora | Inicio del turno diurno |
| `HORA_TURNO_DIURNO_FIN` | 16:30 | hora | Fin del turno diurno |
| `HORA_TURNO_NOCTURNO_INICIO` | 17:30 | hora | Inicio del turno nocturno |
| `HORA_TURNO_NOCTURNO_FIN` | 02:00 | hora | Fin del turno nocturno (cruza medianoche) |
| `COBERTURA_MAX_DIAS_SIN_DESCANSO` | 0 | días (0–31) | Días seguidos sin descanso antes de avisar. 0 = no se evalúa |
| `COBERTURA_PERMITE_NOCTURNO_A_DIURNO` | SIN_CONFIGURAR | SI · NO · SIN_CONFIGURAR | Si se admite diurno tras nocturno. Con NO, avisa |

**Transporte: traslados, compartir y jornada del conductor**

| Clave | Siembra | Unidad (rango) | Qué controla |
|---|---|---|---|
| `TRASLADO_MISMA_ZONA_MIN` | 15 | minutos (0–600) | Traslado por defecto dentro de la misma zonal |
| `TRASLADO_MISMO_SECTOR_MIN` | 30 | minutos (0–600) | Traslado entre zonales del mismo sector |
| `TRASLADO_OTRO_SECTOR_MIN` | 60 | minutos (0–600) | Traslado entre sectores distintos |
| `COMPARTIR_VENTANA_MIN` | 30 | minutos (0–180) | Diferencia máxima de inicio para que dos operativos compartan carro |
| `INICIO_JORNADA_TRANSPORTE` | 05:00 | hora | Inicio de la línea de tiempo de la jornada de transporte |
| `GUARDA_HORA_TARDE` | 20:00 | hora | Desde esta hora la guarda sugerida es el garaje más cercano al conductor |
| `DAF_MAX_JORNADA_HORAS` | 14 | horas (1–24) | Jornada máxima del conductor; por encima no se asigna |
| `DAF_JORNADA_AVISO_HORAS` | 12 | horas (1–24) | Jornada desde la que se avisa |
| `DAF_DESCANSO_MIN_HORAS` | 9 | horas (0–24) | Descanso mínimo entre el último tramo de ayer y el primero de hoy; por debajo, avisa |
| `MINUTOS_TOLERANCIA_FIN_CONDUCTOR` | 30 | minutos (0–240) | Tiempo que el conductor puede seguir tras el fin de su jornada laboral |
| `DAF_DURACION_TRAMO_MIN` | 30 | minutos (5–240) | Duración de un tramo de dejar o retirar |
| `DAF_DURACION_DEJAR_MIN` | 30 | minutos (5–240) | Duración del tramo de dejar |
| `DAF_DURACION_RETIRAR_MIN` | 30 | minutos (5–240) | Duración del tramo de retirar |
| `DAF_HUECO_MINIMO_MIN` | 60 | minutos (15–600) | Minutos útiles para mostrar un hueco libre de un conductor |
| `DURACION_TAREA_TALLER_MIN` | 60 | minutos (10–480) | Duración de la tarea «Llevar a taller» |
| `COSTO_PENALIZACION_AVISO` | 30 | minutos (0–1000) | Optimizador: penalización por cada aviso del conductor |
| `COSTO_ACTIVAR_LIBRE` | 120 | minutos (0–1000) | Optimizador: penalización por activar a un conductor libre |
| `COSTO_ARRANQUE_LEJOS` | 20 | minutos (0–1000) | Optimizador: penalización por arrancar lejos de donde amanece el vehículo |

**Transporte: turnos de conductores y flota**

| Clave | Siembra | Unidad (rango) | Qué controla |
|---|---|---|---|
| `HORA_TURNO_CONDUCTOR_DIA_INICIO` | 06:00 | hora | Inicio del turno DÍA |
| `HORA_TURNO_CONDUCTOR_DIA_FIN` | 18:00 | hora | Fin del turno DÍA |
| `HORA_TURNO_CONDUCTOR_NOCHE_INICIO` | 18:00 | hora | Inicio del turno NOCHE |
| `HORA_TURNO_CONDUCTOR_NOCHE_FIN` | 06:00 | hora | Fin del turno NOCHE (día siguiente) |
| `HORA_TURNO_CONDUCTOR_ECU_NOCHE_INICIO` | 20:00 | hora | Inicio del turno ECU NOCHE |
| `HORA_TURNO_CONDUCTOR_ECU_NOCHE_FIN` | 05:00 | hora | Fin del turno ECU NOCHE (día siguiente) |
| `DAF_MAX_DIAS_SIN_LIBRE` | 0 | días (0–31) | Días seguidos con turno sin un LIBRE. 0 = no se evalúa |
| `DAF_PERMITE_NOCHE_A_DIA` | SIN_CONFIGURAR | SI · NO · SIN_CONFIGURAR | Si se admite DÍA tras NOCHE |
| `DAF_MIN_CONDUCTORES_DIA` | SIN_CONFIGURAR | siete enteros L…D | Mínimo de conductores en turno DÍA por día de la semana |
| `DAF_MIN_CONDUCTORES_NOCHE` | SIN_CONFIGURAR | siete enteros L…D | Mínimo de conductores en turno NOCHE por día de la semana |
| `DAF_DIAS_AVISO_VENCIMIENTO` | 30 | días (1–365) | Anticipación del aviso de vencimiento de matrícula o SOAT |
| `DAF_KM_MAXIMO` | 999999 | km (1000–9999999) | Kilometraje máximo aceptado al registrar un vehículo |

**Orden de servicio (sin siembra)**

| Clave | Siembra | Qué controla |
|---|---|---|
| `ORDEN_FIRMANTE_CARGO` | — | Cargo del firmante (Director) de las órdenes de servicio |
| `ORDEN_FIRMANTE_DEPENDENCIA` | — | Dependencia del firmante |

Estas dos no se siembran: `ck_parametro_valor` prohíbe valores vacíos, así que «sin configurar»
es la ausencia de la fila. Mientras falten, la orden queda en Borrador. La fila se crea al
guardar el valor desde la pantalla.

Los valores marcados como supuestos en la descripción de la pantalla (turnos de conductor y
costos del optimizador) los confirma la DAF. `HORA_CIERRE_DEPARTAMENTAL` se retiró el
2026-08-25: el cierre por rol vive en la ventana de carga. Las claves `HORA_NOMBRAMIENTO_*` se
retiraron el 2026-10-23 con la jornada laboral.

---

## 6. Puertos

| Servicio | Desarrollo | Preproducción (sin Gateway) | QA y producción (Gateway) |
|---|---|---|---|
| `transportedb` | `5434` solo en la interfaz local | no se publica | no se publica |
| `transporte-app` | `3003` | `3005` → `3003` | no se publica |
| `transporte-front` | `5180` | `5180` | no se publica; el Gateway llega a `transporte-front:5180` por la red `amc` |

El 5180 está fuera de la banda 5173–5179 que usan los demás frontales de SIGOC y Vite usa
`strictPort: true`, para que falle en vez de moverse a otro puerto. Si cambiamos este puerto hay
que cambiar `vite.config.ts`, `nginx.conf`, `CORS_ORIGINS` y la ruta del módulo en Auth.

---

## 7. Registro

`LOG_LEVEL` admite `debug`, `info`, `warn` y `error`. Toda la aplicación emite el mismo formato
JSON, incluidos los mensajes internos de NestJS:

```json
{"momento":"2026-08-07T09:34:10.513-05:00","nivel":"info","modulo":"transporte",
 "mensaje":"Historial de jornada consolidado","fecha":"2026-08-08","personas":2}
```

> `LOG_LEVEL=debug` imprime los parámetros de cada consulta, con datos personales. En servidores
> queda en `info`.

---

## 8. Comprobación de la configuración

En desarrollo:

```bash
docker compose ps                                                              # los tres «healthy»
docker exec transporte-app sh -c 'date'                                        # termina en -05
docker exec transporte-app id                                                  # uid=1001(nestjs)
docker exec transporte-front id                                                # uid=101(nginx)
docker logs transporte-app 2>&1 | grep -iE "SESSION_JWT_SECRET|AUTH_SUBSYSTEM"  # sin advertencias
curl -s http://localhost:3003/api/v1/estado              # {"estado":"operativo","baseDatos":"disponible"}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/v1/estado    # 200, por el proxy
```

En los servidores detrás del Gateway, la verificación completa —incluida la intermedia de
DigiCert, el portal horneado en el bundle y la cabecera CSP única— está en la sección G de
`transporte-backend/INSTALACION-PRODUCCION.md`.
