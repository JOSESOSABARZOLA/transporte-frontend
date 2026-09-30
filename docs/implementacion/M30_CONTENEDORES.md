# M-30 · Contenedores, despliegue e identidad real

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapas E11 y E12 · Bloque H · Prioridad **P2 · Media** (identidad real: **P3**) · Dependencia M-26
**Último módulo del plan** · Fecha: 2026-08-06

---

## 0. ESTE MÓDULO SE PODÍA VERIFICAR DE VERDAD, Y SE HIZO

Es la diferencia con los nueve anteriores. En M-22 a M-29 la mitad de los casos quedaba en ⏳ porque
comprobarlos exigía un backend con datos. Aquí el objeto de prueba **es el contenedor**, y el
contenedor se puede construir y levantar.

Así que los siete casos se ejercitaron contra los procesos en marcha: `docker exec`, `curl`, `psql`.
Lo que sigue no es una descripción de lo que debería pasar.

---

## 1. ARCHIVOS

Dos nuevos, cuatro modificados y tres correcciones de documentación.

```
transporte-backend/
├── DESPLIEGUE.md                      (nuevo · el procedimiento completo)
├── prisma/init-db/01-extensiones.sql  (nuevo · pg_stat_statements)
├── docker-compose.yml                 (modificado · build del frontend, precarga, TZ)
├── Dockerfile                         (modificado · se retira /app/fonts)
├── prisma/seed.ts                     (modificado · ANALYZE al terminar)
└── src/modules/documentos/application/exportador-matriz.ts  (corrección del logotipo)

transporte-frontend/
└── Dockerfile                         (modificado · imagen no privilegiada)
```

---

## 2. TRES FALLOS QUE ESTABAN EN EL DESPLIEGUE

### 2.1. El frontend no se reconstruía · y era el mismo fallo ya corregido una vez

`transporte-front` **no declaraba `build:`**. `docker compose up --build` reconstruía el backend y
dejaba el frontend en la imagen anterior, **sin avisar**: una pantalla recién construida no aparecía
y no había nada en el registro que lo explicara.

Es literalmente el fallo que ya se había corregido para `transporte-app`, con su comentario y todo,
en el mismo archivo. Se arregló allí y no se miró aquí.

### 2.2. El nginx del frontend corría como root

El caso 5 pide usuario no privilegiado. El backend lo cumplía; el frontend no, y no era evidente:
la imagen oficial de nginx baja los **trabajadores** a `nginx` pero deja el **maestro** como root.

```
$ docker exec transporte-front id      →  uid=0(root)
```

Se cambió a `nginxinc/nginx-unprivileged:1.27-alpine` —la misma nginx, del mismo equipo—. Funciona
sin tocar la configuración porque el puerto es 5176: por encima de 1024, que es lo único que
exigiría privilegios.

```
$ docker exec transporte-front id      →  uid=101(nginx)
$ docker exec transporte-front ps      →  PID 1 = nginx, usuario nginx
```

### 2.3. La imagen cargaba fuentes que nadie lee

El `Dockerfile` copiaba `/app/fonts` con cuatro `.ttf` de Roboto, bajo un comentario que hablaba del
«motor pdfmake». Pero **M-19 eligió `pdfkit` precisamente porque trae sus propias fuentes**, y ese
comentario nunca se actualizó. Comprobado antes de retirarlas:

```
$ grep -rn "Roboto\|registerFont\|fonts/" src/     →  sin una sola coincidencia
```

---

## 3. LO QUE FALTABA · MEDICIÓN Y ESTADÍSTICAS

**`pg_stat_statements` no estaba habilitado.** Comprobado antes de tocar nada:
`shared_preload_libraries` vacío y una sola extensión, `plpgsql`.

Necesita las dos mitades, y por eso viven en sitios distintos:

- La **biblioteca precargada**, en el `command:` del servicio: `shared_preload_libraries` solo se
  lee al arrancar el proceso, no se puede activar en caliente.
- La **extensión**, en `prisma/init-db/01-extensiones.sql`.

> **El script vive en `prisma/` y no en `docker/`, y no es un capricho.** Lo puse primero en
> `docker/` y `git add` no lo recogió: `.gitignore` ignora esa carpeta entera —es el kit de
> despliegue, que trae credenciales—. Un clon limpio habría desplegado sin la extensión y nadie lo
> habría notado hasta preguntarse por qué no hay estadísticas de consultas. Se detectó comprobando
> qué había quedado versionado después de confirmar.

> **El script de init solo corre con el volumen vacío.** Así funciona `/docker-entrypoint-initdb.d`.
> Sobre `transporte_pgdata`, que ya tenía datos, hubo que crearla a mano —y así quedó documentado en
> `DESPLIEGUE.md`, porque a cualquier despliegue existente le pasará lo mismo—.

**Por qué se mide desde el primer día:** `pg_stat_statements` acumula desde que la base arranca.
Habilitarla cuando alguien ya se queja de lentitud deja sin nada con que comparar.

**`ANALYZE` tras poblar los catálogos** tampoco estaba. Ahora la semilla termina ejecutándolo. El
planificador de PostgreSQL decide con estadísticas y sobre tablas recién pobladas no tiene ninguna:
sin esto, las primeras consultas de la jornada —la matriz recorre nueve formularios con su
personal— se planifican como si cada catálogo estuviera vacío. Es barato, ocurre una vez, y evita
un «va lento el primer día» que después nadie sabe explicar.

Se comprobó que Prisma admite la sentencia, que no era obvio: `$executeRaw` usa sentencias
preparadas y algunas utilidades de PostgreSQL se rechazan ahí.

---

## 4. LA CORRECCIÓN QUE DEBO A M-19 · EL LOGOTIPO

En M-19 escribí que el logotipo institucional «existe en el frontend **pero no en este
repositorio**», y registré PV-30 sobre esa base. **Es falso.**

`transporte-backend/src/assets/LogoAmc.jpeg` existe desde la línea base. Lo que no existe es el
logotipo:

```
$ ls -la src/assets/LogoAmc.jpeg          →  70 bytes
$ xxd src/assets/LogoAmc.jpeg | head -1   →  8950 4e47  ("\x89PNG")
```

**Son 70 bytes: un PNG transparente de 1×1 con extensión `.jpeg`.** El logotipo real está en el
frontend y pesa 98 kB.

La conclusión práctica no cambia —sigue sin poderse imprimir— pero el motivo es peor de lo que
escribí. No falta un archivo: **hay uno con el nombre correcto y la ruta correcta que no es lo que
aparenta**. Alguien que lo conecte sin abrirlo publicaría un documento oficial con un píxel
invisible donde va el membrete institucional.

Corregido en el comentario del exportador, en `M19_MATRIZ_CONSOLIDADA.md` y en PV-30.

---

## 5. E12 · LA IDENTIDAD REAL NO SE PUEDE IMPLEMENTAR, Y NO SE INVENTÓ

El plan marca esta etapa como **P3, «depende de un tercero»**. El microservicio contra Active
Directory está en desarrollo y **su token no tiene contrato publicado**: no se sabe cómo se llaman
las reclamaciones, ni cómo se firma, ni de dónde sale la clave.

Escribir un verificador con nombres supuestos —`sub`, `roles`, `preferred_username`— sería inventar
justo la clase de valor que este proyecto se prohíbe inventar. **No se hizo.**

Lo que sí se pudo verificar, y se verificó:

### 5.1. La afirmación de diseño es cierta · «un solo archivo cambia»

Es la medida del acierto del diseño según el propio plan, y se puede comprobar hoy sin el token:

```
$ grep -rn "x-usuario-prueba|buscarPerfilPrueba" src/   →  solo identidad.guard.ts
$ grep -rn "\.user = " src/                             →  solo identidad.guard.ts:51
```

**Un único archivo lee la cabecera, un único archivo construye la identidad y un único archivo la
deja en la petición.** `usuarios-prueba.ts` solo define los perfiles. La cadena que viene después
—`RolesGuard`, `FormularioRolGuard`, `VentanaCargaGuard`— no toca ninguno de los dos.

### 5.2. La cabecera provisional se ignora en producción · caso 7

Verificado con un contenedor efímero de la misma imagen, con el modo apagado:

| Situación | Resultado |
|---|---|
| Modo **apagado**, sin cabecera | `401 NO_AUTENTICADO` |
| Modo **apagado**, con `x-usuario-prueba: 1` | **`401 NO_AUTENTICADO`** |
| Modo **encendido**, sin cabecera | `401` |
| Modo **encendido**, con `x-usuario-prueba: 1` | `200` |

Y la advertencia de arranque aparece solo cuando corresponde: con el modo activo el registro escribe
*«MODO_IDENTIDAD_PROVISIONAL está ACTIVO… No usar en producción»*; con el modo apagado, ninguna
línea.

> **La consecuencia, dicha con claridad:** mientras el microservicio de identidad no exista, **el
> sistema no se puede poner en producción**. Con el modo apagado nadie se autentica; con el modo
> encendido cualquiera se hace pasar por quien quiera enviando un número en una cabecera. No es un
> defecto de este módulo: es su estado declarado desde el análisis, y así queda en `DESPLIEGUE.md`.

---

## 6. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `docker compose build` | **las dos imágenes**, backend y frontend |
| `docker compose up -d` | los tres contenedores **healthy** |
| `npm test` (backend) | **46 suites · 676 pruebas** |
| `npm run lint:check` · `npm run build` (backend) | **código 0** los dos |
| `npm test` · `lint` · `build` (frontend) | **195 pruebas** · código 0 |

### 6.1. Los siete casos del plan

**Todos ✅ salvo el 6, y ese se explica.**

| # | Caso | Verificación |
|---|---|---|
| 1 | El cliente Prisma se genera dentro de la imagen | ✅ `node_modules/.prisma/client/` con `libquery_engine-debian-openssl-3.0.x.so.node` |
| 2 | Tres contenedores sin colisión con Instrucción | ✅ 5434 · 3003 · 5176 frente a 5432 · 8080 del otro despliegue; los tres responden 200 |
| 3 | `TZ` en el contenedor | ✅ `America/Guayaquil` (−05) en los **tres**; el frontend no la tenía y se agregó |
| 4 | El arranque no aplica migraciones | ✅ `ENTRYPOINT dumb-init -- CMD node dist/main`; cero menciones a migraciones en el registro |
| 5 | Usuario del contenedor no privilegiado | ✅ backend `uid=1001(nestjs)`; frontend **corregido** de `uid=0` a `uid=101(nginx)`, maestro incluido |
| 6 | E12 · modo JWT: solo cambia `IdentidadGuard` | ⏳ **no se implementa: el token no tiene contrato.** La afirmación estructural sí se verificó (§5.1) |
| 7 | E12 · cabecera provisional en producción, ignorada | ✅ verificado con contenedor efímero, con el contraste de los cuatro casos |

### 6.2. Qué queda pendiente

- **E12 completa**, bloqueada por un tercero. Ver §5.
- **La retirada de `SelectorRolPruebas` y `usuariosPrueba`** que el plan sitúa en E12: no se hizo,
  porque retirarlos hoy dejaría la aplicación sin ninguna forma de autenticarse. Van juntos con el
  modo JWT, en la misma entrega.
- **Prueba de despliegue sobre volumen limpio.** Todo lo verificado corre sobre `transporte_pgdata`
  con datos. El camino de instalación desde cero —init-db creando la extensión sola, migraciones,
  semilla con su `ANALYZE`— está escrito y **no se ha ejercitado**: hacerlo exige borrar el volumen
  de trabajo, y esa es una decisión suya, no mía.

---

## 7. PENDIENTE DE VALIDACIÓN

- **PV-30 corregido y agravado.** Ver §4.
- **Dos librerías de PDF instaladas y sin usar.** `pdf-lib` y `pdfmake` están en dependencias de
  producción, así que `npm ci --omit=dev` las instala dentro de la imagen; **nada las importa**
  —solo `pdfkit`, que es el que M-19 eligió—. Retirarlas aligeraría la imagen, pero quitar una
  dependencia del producto es una decisión del dueño del stack, igual que agregarla: se reporta con
  la comprobación hecha y no se toca.
- **PV-19 · política de respaldo.** Sigue sin definirse, y ahora tiene un destinatario concreto: el
  volumen `transporte_pgdata` contiene todo.
- **HTTPS.** El nginx sirve en claro; la terminación TLS corresponde al proxy institucional. No está
  en el plan y conviene confirmarlo antes de publicar.

---

## 8. CON ESTO SE CIERRA EL PLAN

Los treinta módulos están implementados. El sistema **se construye, se levanta y responde**; sus
676 pruebas de backend y 195 de frontend pasan.

Y no se puede usar todavía, por dos motivos que no son de software:

1. **No hay identidad real.** Depende del microservicio de Active Directory (E12, P3).
2. **No hay datos.** Los cinco bloqueantes —PV-01 la matriz zonal ↔ punto, PV-02 la base de
   personal, PV-03 conductores y vehículos, PV-25 y PV-26— siguen abiertos desde el análisis.

Lo que este plan entrega es que **ninguna de las dos cosas que faltan es código**.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
