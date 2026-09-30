# CODE REVIEW · Módulo Transportes / Cuadro de Colores Operativo

**Agencia Metropolitana de Control — Quito**
Alcance: todo lo implementado · backend y frontend

> Revisión posterior a `MODULE_REVIEW.md`, que se hizo sobre el repositorio **plantilla**
> antes de escribir código. Esta se hace sobre el módulo ya construido.

| Pasada | Fecha | Alcance | Hallazgos | Corregidos |
|---|---|---|---|---|
| **Primera** | 2026-08-05 | Hasta M-07 · 148 pruebas unitarias | 28 | 16 |
| **Segunda** | 2026-08-05 | M-08, M-09 y M-10 · 311 unitarias y 53 de integración | 9 | 6 |

La segunda pasada está en el **apartado 12**, al final. Los apartados 1 a 11 conservan la primera
tal como se entregó, con las notas de cierre de los hallazgos que módulos posteriores resolvieron.

---

## 0. RESUMEN

| | |
|---|---|
| Archivos revisados | 71 en el backend, 49 en el frontend, 6 de infraestructura |
| Hallazgos | **28** |
| **Corregidos** | **16** |
| Reportados sin corregir | 12, con el motivo en cada ficha |
| Verificación | compilación y lint en 0 · 148 + 21 pruebas · pila reconstruida y sana |

Los hallazgos corregidos se eligieron con un criterio: **no cambian lo que el módulo hace**.
Arreglan lo que hacía mal, o lo que habría hecho mal en una situación que todavía no se ha dado.
Los que exigían decidir algo —una dependencia nueva, un índice, partir un servicio— se reportan
para que la decisión sea tuya.

### Los tres que más importan

| # | Hallazgo | Por qué importa |
|---|---|---|
| **SEG-01** | La supresión de datos personales del registro comparaba nombres **exactos y sensibles a mayúsculas** | `telefono` se suprimía, `telefonoContacto` y `Telefono` salían íntegros. Con M-09 esos nombres compuestos son la norma |
| **SEG-04** | El identificador de correlación del cliente se usaba **sin validar** | `audi_correlacion` es `VARCHAR(60)`: una cabecera larga rompía **toda escritura auditada** |
| **SEG-05** | `VentanaCargaGuard` fallaba **abierta** si no había identidad | Un endpoint mal cableado admitía escrituras sin ventana y sin usuario |

---

## 1. SEGURIDAD · 7 hallazgos, 7 corregidos

### SEG-01 · La supresión de datos personales era exacta y sensible a mayúsculas
**Archivo:** `common/logger/logger.service.ts` · **Gravedad: alta** · **Corregido**

El servicio declara en su cabecera que suprime teléfonos y cédulas *«aunque se le pasen»*, y que
convierte «una regla de conducta en una garantía de la construcción». La implementación no lo
cumplía: comparaba el nombre del campo contra una lista de literales exactos.

Comprobado sobre el código compilado antes de corregir:

```
{"telefono":"[suprimido]","Telefono":"0999","telefonoContacto":"0999","cedulaFuncionario":"17..."}
```

Tres de cuatro salían íntegros. Y M-09 —personal, con teléfono y cédula— trae precisamente nombres
compuestos: `telefonoContacto`, `cedulaIdentidad`.

**Corrección.** La comparación es ahora por **raíz sobre el nombre normalizado** —minúsculas, sin
acentos, sin separadores— de modo que `Telefono`, `telefonoContacto`, `oser_dato_aislado` y
`accessToken` quedan cubiertos. Seis pruebas nuevas lo fijan.

> **Confirmado con M-10 · 2026-08-05.** El maestro de personal es el primer consumidor real de esta
> supresión: maneja `telefono` y `cedula` de personas. La corrección se hizo anticipándolo y hoy
> tiene a quién proteger. M-10 añade además que **la traza de auditoría tampoco guarda el valor** de
> esos dos campos. Ver `M10_PERSONAL_DISPONIBILIDAD.md` §3.

### SEG-02 · La traza no decía qué parámetro se había modificado
**Archivo:** `common/logger/logger.service.ts` · **Gravedad: media** · **Corregido**

`clave` figuraba en la lista de campos suprimidos como sinónimo de contraseña. Pero M-06 registra
la modificación de un parámetro de política así:

```ts
this.logger.log('Parámetro de política modificado', { clave, valorAnterior, valorNuevo });
```

El resultado era `{"clave":"[suprimido]","valorAnterior":"12","valorNuevo":"8"}`: la traza decía
que algo cambió de 12 a 8, pero no **qué**.

**Corrección.** `clave` sale de la lista —en castellano designa tanto una contraseña como la clave
de un parámetro— y las credenciales quedan cubiertas por `password`, `contrasena` y `claveacceso`.

### SEG-03 · El registrador podía tumbar la petición que estaba registrando
**Archivo:** `common/logger/logger.service.ts` · **Gravedad: media** · **Corregido**

La supresión recorría el objeto sin control de ciclos ni de profundidad, y `JSON.stringify` se
llamaba sin protección. Un objeto de Express pasado por descuido a `logger.error` —una referencia
circular— desbordaba la pila. Y ocurre dentro del **filtro de excepciones**, es decir, justo cuando
la petición ya venía fallando: se quedaría sin respuesta y sin traza.

**Corrección.** `WeakSet` para los ciclos, profundidad máxima de 6, fechas normalizadas a ISO, y
`JSON.stringify` protegido con una línea mínima de reserva.

### SEG-04 · El identificador de correlación llegaba del cliente sin validar
**Archivo:** `common/interceptors/correlacion.middleware.ts` · **Gravedad: alta** · **Corregido**

`x-correlation-id` se tomaba tal cual y se usaba en tres sitios: la cabecera de respuesta, cada
línea del registro y la columna `audi_correlacion`. Tres consecuencias, la primera grave:

1. **`audi_correlacion` es `VARCHAR(60)`.** Una cabecera más larga hace fallar la inserción de la
   auditoría y, como la auditoría va **dentro de la transacción** (DA-09), tumba la operación
   completa. Un cliente con un identificador largo rompía toda escritura auditada.
2. Con caracteres de control, `setHeader` lanza y la petición muere con un 500 sin explicación.
3. Un valor arbitrario ensucia la traza que sirve para dar soporte.

**Corrección.** Se admite el identificador del cliente solo si cumple `[A-Za-z0-9._:-]{8,60}`; si
no, se genera uno. No se rechaza la petición: lo dudoso es la cabecera, y perder la correlación es
peor que perder el valor propuesto. Ocho pruebas nuevas.

Verificado contra el contenedor:

```
enviado b7c1b1f0-0f2a-4a1e-9c4a-2f0d4f6b8a11  → devuelto igual
enviado "id con espacios y muy largo aaaa..." → devuelto a8c49b41-8850-483e-b233-4775f638e7b4
```

### SEG-05 · `VentanaCargaGuard` fallaba abierta
**Archivo:** `common/auth/guards/ventana-carga.guard.ts` · **Gravedad: media** · **Corregido**

```ts
const usuario = peticion.user;
if (!usuario) return true;        // ← admitía la escritura
```

Daba por hecho que `IdentidadGuard` se había ejecutado antes. Un endpoint que declarara esta
guarda sin aquella, o en otro orden, admitía escrituras sin ventana y sin identidad. `FormularioRolGuard`
ya fallaba cerrada ante lo mismo: dos guardas de la misma cadena con criterios opuestos.

**Corrección.** Falla cerrada, con el mismo error que su hermana.

### SEG-06 · CORS comodín en el proxy del frontend
**Archivo:** `transporte-frontend/nginx.conf` · **Gravedad: media** · **Corregido**

El bloque de verificación previa anunciaba `Access-Control-Allow-Origin: *`, contradiciendo la
lista blanca del backend (`CORS_ORIGINS`), y omitía `x-correlation-id` de las cabeceras admitidas.
Además **no se ejecutaba nunca**: las peticiones que pasan por el proxy son del mismo origen que la
aplicación, así que el navegador no hace verificación previa.

**Corrección.** Se retiró el bloque. El acceso directo al puerto 3003 lo resuelve el CORS del
backend, que sí tiene lista blanca.

### SEG-07 · Las cabeceras de seguridad no llegaban a los archivos estáticos
**Archivo:** `transporte-frontend/nginx.conf` · **Gravedad: baja** · **Corregido**

nginx **no hereda** las `add_header` del nivel superior en un bloque que declara las suyas. Los
bloques de `.js`, `.css` y `.html` declaraban `Cache-Control`, de modo que servían la aplicación
entera **sin `nosniff` ni `X-Frame-Options`**.

**Corrección.** Se repiten las cabeceras en esos bloques. Verificado sobre la imagen reconstruida:

```
GET /assets/index-C8Ywx5R9.js → 200
X-Content-Type-Options: nosniff · X-Frame-Options: SAMEORIGIN · Referrer-Policy: strict-origin-when-cross-origin
```

---

## 2. CORRECCIÓN · 3 hallazgos, 3 corregidos

### COR-01 · Mover un punto de zonal podía reventar contra la base
**Archivo:** `modules/configuracion/application/catalogos.service.ts` · **Corregido**

`uq_punto_nombre_zonal` es **compuesto**. La comprobación de duplicados solo se hacía si cambiaba
el nombre, así que mover un punto a una zonal donde ya existía esa denominación infringía la
restricción y el error llegaba desde la base como fallo no controlado: un `500` genérico.

**Corrección.** La comprobación se hace si cambia el nombre **o la zonal**. Prueba unitaria nueva.

### COR-02 · Los errores de Prisma salían como 500 genérico
**Archivo:** `common/filters/http-exception.filter.ts` · **Corregido**

Dos situaciones ordinarias del usuario terminaban en «Ocurrió un error inesperado»: dos
administradores creando el mismo valor a la vez (`P2002`) y modificar algo que otro acaba de dar de
baja (`P2025`).

**Corrección.** El filtro traduce `P2002` a `409`, `P2025` a `404` y `P2003` a `409`, con mensajes
operativos. **Sin importar `@prisma/client`**: se reconocen por su `code`, para que el filtro
transversal no dependa de la capa de datos. El nombre de la columna infringida **no** se le muestra
al funcionario.

### COR-03 · `diaIsoEnZona` devolvía lunes en silencio
**Archivo:** `common/utilidades/marca-tiempo.ts` · **Corregido**

`return dias[nombre] ?? 1;`. Un lunes supuesto desplaza la ventana de carga de un rol **un día
entero**, y nadie lo notaría hasta que un departamento perdiera la suya. Es el riesgo RT-03.

**Corrección.** Lanza con un mensaje explícito. La rama es inalcanzable con `en-US`; la diferencia
es que si algún día deja de serlo, se sabrá.

---

## 3. RENDIMIENTO · 3 hallazgos, 1 corregido

### REN-01 · Un formateador nuevo por cada línea de registro
**Archivo:** `common/utilidades/marca-tiempo.ts` · **Corregido**

`marcaDeTiempo`, `horaEnZona` y `diaIsoEnZona` construían un `Intl.DateTimeFormat` en **cada**
llamada. Construirlo es de las operaciones más caras de la biblioteca estándar —carga y compila los
datos de la zona horaria— y estas funciones se invocan en cada línea de registro, en cada respuesta
de error y en cada evaluación de ventana: varias veces por petición.

**Corrección.** Memorizados por zona horaria en un `Map`. El formateador no guarda estado entre
llamadas, de modo que el resultado es idéntico. Las 34 pruebas de `marca-tiempo` siguen pasando sin
cambios.

### REN-02 · Dos claves foráneas sin índice · **reportado**
**Archivos:** `t_operativo.tico_id`, `t_operativo_institucion.inst_id`

PostgreSQL **no indexa** las claves foráneas automáticamente. Las tres consultas de RF-058
—«¿cuántos operativos usan este valor?»— recorren la tabla entera:

| Consulta | Índice | Situación |
|---|---|---|
| `count where puntoEncuentroId` | `idx_operativo_punto` | ✅ cubierta |
| `count where tipoControlId` | — | ❌ recorrido completo |
| `count where institucionId` | PK `(oper_id, inst_id)` | ❌ el filtro no usa la columna inicial |

**No se corrige** y es deliberado: solo se ejecutan al dar de baja un valor de catálogo, que es una
operación rara, y `t_operativo` está vacía. Añadir índices encarece cada escritura de operativo, que
sí es frecuente. Conviene reevaluarlo cuando la tabla tenga volumen real, con `EXPLAIN` y no con
suposiciones.

### REN-03 · La ventana de carga se consulta en cada escritura · **resuelto en M-08**
**Archivo:** `common/auth/infrastructure/ventana-carga.repository.ts`

`VentanaCargaGuard` va a la base en **cada** petición de escritura. Son seis filas que cambian
pocas veces al año. M-06 ya estableció el patrón —caché en memoria invalidada al modificar—, y
**M-08 es el módulo dueño** de las ventanas: la caché corresponde implementarla allí, junto al
servicio que las administra, no en la guarda.

> **Resuelto el 2026-08-05 con M-08**, y la respuesta tiene dos partes. `VentanaCargaService`
> cachea la **consulta** del estado, que es la que la interfaz pide en cada pantalla. La **guarda
> sigue leyendo la base**, a propósito: `common/auth` no puede depender de un submódulo de negocio,
> y para la guarda la frescura vale más que la velocidad —una caché desfasada mantendría abierta
> una ventana que el administrador acaba de cerrar—. Ver `M08_VENTANAS_CARGA.md` §3.

---

## 4. SOLID, DRY y KISS · 5 hallazgos, 2 corregidos

### DRY-01 · Tres bajas lógicas idénticas
**Archivo:** `catalogos.service.ts` · **Corregido**

`desactivarPunto`, `desactivarTipoControl` y `desactivarInstitucion` eran la misma secuencia
escrita tres veces —buscar, contar usos, salir si ya estaba inactivo, escribir con traza, componer
el mensaje—, con la diferencia de que cada copia podía divergir.

**Corrección.** Un solo `darDeBaja` parametrizado por los cuatro datos que de verdad cambian:
tabla, columna de estado, cómo se busca y de dónde sale la denominación. Cada método pasa de ~25
líneas a 11, y las 5 pruebas de RF-058 pasan sin tocarlas.

### DRY-02 · `ejecutarEnTransaccion` duplicado · **resuelto en la segunda pasada**
En `parametro-politica.repository.ts` y `catalogos.repository.ts`. Son tres líneas idénticas.
Extraer una unidad de trabajo compartida obligaría a modificar M-06, **que está a la espera de
aprobación**; hacerlo cambiaría lo que estás a punto de aprobar. Queda para después.

> **Corregido el 2026-08-05**, cuando las copias llegaron a **cinco** con M-08 y M-10. Ver §12.2,
> hallazgo DRY-04: los cinco repositorios heredan de `RepositorioPrisma`.

### DRY-03 · `sinAcentos` duplicado en la semilla · **reportado**
`prisma/seed.ts` conserva su copia privada. Mismo motivo: consolidarla toca M-03.

Nota: durante esta revisión **sí** se consolidó el otro caso —el registrador ahora usa `sinAcentos`
de `common/utilidades/texto.ts` en lugar de su propia normalización—, porque ambos archivos son de
esta misma entrega.

### SOLID-01 · `catalogos.service.ts` concentra dos responsabilidades · **reportado**
480 líneas: consulta delimitada por formulario **y** administración de tres catálogos. Lo natural
sería partirlo en `CatalogosService` y `AdministracionCatalogosService`.

**No se hace ahora** por una razón concreta, no por comodidad: partirlo cambia el contrato que
`ConfiguracionModule` exporta y que **M-14 va a consumir**. Conviene decidir la frontera cuando
M-14 diga qué necesita, y no antes. Si se pospone más allá de M-28 —que añade la administración de
la delimitación— el archivo pasará de largo el punto en que la división es barata.

### KISS-01 · La duplicación restante entre los tres catálogos · **aceptada**
`crear*` y `actualizar*` siguen escritos tres veces. Se estudió unificarlos con un descriptor
genérico y **se descartó**: los delegados tipados de Prisma obligan a genéricos que oscurecen más de
lo que ahorran. Tres bloques planos y legibles valen más que una abstracción que hay que descifrar.

---

## 5. LIMPIEZA · 4 hallazgos, 4 corregidos

`transporte-backend/CLAUDE.md` §9.3 exige cero variables, imports o funciones sin usar.

| Elemento | Situación | Acción |
|---|---|---|
| `common/auth/jwt/jwt-claims.interface.ts` | Residuo de Instrucción, sin un solo consumidor. Su forma (`sub: string`) contradice el modelo de identidad del módulo, que usa un identificador numérico | **Eliminado.** E12 definirá el contrato real |
| `obtenerCorrelacionId()` | Exportada, nunca invocada: el registrador usa `obtenerContexto()` | **Eliminada** |
| `nivelConfigurado()` | Exportada, nunca invocada | **Eliminada** |
| `PERFILES_PRUEBA_DISPONIBLES` | Exportada «para diagnóstico», nunca invocada | **Eliminada** |
| Código comentado en `httpClient.ts` | 20 líneas del resolutor de token, comentadas desde marzo | **Sustituidas** por un comentario que dice qué falta y cuándo |
| Comentarios «llega en M-05» | M-05 está entregado | **Actualizados** |

---

## 6. DOCKER · 3 hallazgos, 3 corregidos

### DOC-01 · `docker compose up --build` no reconstruía nada
**Archivo:** `docker-compose.yml` · **Corregido**

El servicio `transporte-app` declaraba `image:` y **no** `build:`. `--build` no tenía nada que
construir y levantaba la imagen anterior sin avisar. Durante M-06 y M-07 esto produjo dos
verificaciones en falso: el contenedor arrancaba sin el código recién compilado y aparentaba que el
módulo no se había integrado.

**Corrección.** `build: .` junto a `image:`. La imagen conserva su nombre y `up -d` la sigue
reutilizando si existe; lo que cambia es que `--build` ahora funciona.

### DOC-02 · El backend no tenía comprobación de salud
**Archivo:** `docker-compose.yml` · **Corregido**

`transporte-app` figuraba como `Up` desde el primer instante, aunque Nest todavía no estuviera
escuchando, y el frontend arrancaba sin poder esperarlo (`depends_on` sin condición).

**Corrección.** Comprobación contra `/api/v1/estado` con `start_period: 15s`, y el frontend depende
ahora de `service_healthy`. Verificado en el arranque:

```
Container transporte-app Waiting → Healthy → Container transporte-front Starting
```

### DOC-03 · El frontend no tenía `.dockerignore`
**Archivo nuevo:** `transporte-frontend/.dockerignore` · **Corregido**

Su Dockerfile hace `COPY . .`. Sin `.dockerignore` entraban al contexto de construcción
`node_modules` completo —con binarios compilados para Windows, inservibles en la imagen—, el
historial de git y **`.env.dev`**, que quedaba dentro de una capa intermedia.

---

## 7. FRONTEND Y REACT · 4 hallazgos, 1 corregido

### I-01 · El frontend no envía la cabecera de identidad · **reportado · es el más importante**
**Archivo:** `src/api/httpClient.ts`

`IdentidadGuard` resuelve al usuario con `x-usuario-prueba` mientras el microservicio de identidad
esté en desarrollo. **El cliente HTTP no envía esa cabecera.** Hoy no rompe nada porque ninguna
pantalla llama a la API; **la primera que lo haga recibirá 401 en todas sus peticiones**.

**No se corrige aquí** porque no es un defecto sino trabajo de **M-21**: exige tomar el perfil de
`UserProvider` y decidir cómo se registra el resolutor, que es exactamente el punto donde entrará
el token real en E12. Queda anotado en el propio archivo para que quien construya M-21 lo vea antes
de escribir la primera llamada.

### Código comentado en `httpClient.ts` · **corregido** (ver §5)

### FormikField.tsx · 434 líneas sin pruebas · **reportado**
Ya registrado como pendiente antes de M-22. Sigue siendo el archivo más grande del frontend y el
que más pantallas van a usar.

### `RutaProtegida` sin uso todavía · **observación**
Correcto: las rutas se incorporan en E10. Se deja constancia de que existe y de que las nueve
pantallas deben envolverse en ella, no ocultar controles (regla 4 de interfaz).

---

## 8. NESTJS, PRISMA Y POSTGRESQL · observaciones

| # | Observación | Estado |
|---|---|---|
| **N-01** | Las guardas se declaran por endpoint y no globalmente. Es correcto y está documentado: una exclusión olvidada sería un agujero silencioso | ✅ sin cambio |
| **N-02** | El registro de la petición cae a `originalUrl` cuando no hay patrón de ruta, e `originalUrl` lleva identificadores. Ocurre solo en rutas no emparejadas | Reportado |
| **P-01** | `prisma migrate diff` informa diferencias en los valores por omisión de cuatro columnas de tipo enumerado. Es representación, no cambio: `'BORRADOR'::e_estado_cuadro` frente a `BORRADOR`. Existe desde M-02 | Reportado |
| **P-02** | La `@updatedAt` de Prisma convive con `DEFAULT now()` en la base desde la migración 4. Correcto: protege las inserciones que no pasan por Prisma | ✅ sin cambio |
| **G-01** | Cinco archivos heredados de Instrucción son UTF-8 **con BOM**; el resto, sin BOM. TypeScript admite ambos | Reportado. Se intentó normalizarlos durante esta revisión y **se revirtió**: la conversión dañó los acentos. No vale el riesgo por una diferencia cosmética |
| **G-02** | `PaginacionDto` y `componerPaginada` no tienen consumidor todavía | Reportado. Son la convención de `FASE4` §8.1 y los usará el primer listado paginado (M-09). Se conservan a propósito |
| **G-03** | El contenedor corre Node 20; el desarrollo local, Node 24 | Reportado. `engines` pide `>=20.11.0` y ambas lo cumplen, pero conviene alinearlos antes del despliegue formal |
| **G-04** | `react-router` 7.18.2 arrastra **GHSA-qwww-vcr4-c8h2**, dos avisos de severidad alta. Detectado en la validación de M-10, el 2026-08-05 | Reportado. **La vía de explotación es el modo RSC**, que este frontend no usa: es una SPA de Vite con enrutado en cliente. `npm audit fix --force` propone retroceder a 7.11.0, un cambio de versión mayor sobre el enrutador que no se ejecutó sin autorización. Ver `M10_PERSONAL_DISPONIBILIDAD.md` §12.2 |

---

## 9. VERIFICACIÓN DE ESTA REVISIÓN

Todo lo corregido se comprobó de extremo a extremo, no solo compilando.

| Paso | Resultado |
|---|---|
| `npm run build` (backend) | ✅ código 0 |
| `npm run lint:check` (backend) | ✅ código 0 |
| `npm test` | ✅ **148 de 148**, 15 suites · **17 pruebas nuevas** |
| `npm run test:integracion` | ✅ 21 de 21 |
| `npm run lint` y `npm run build` (frontend) | ✅ código 0 |
| Imágenes reconstruidas y pila levantada | ✅ los tres contenedores `healthy` |
| Cabeceras de seguridad sobre un activo real | ✅ `nosniff` presente |
| Correlación válida / abusiva | ✅ conservada / sustituida |

Las 17 pruebas nuevas se reparten así: 6 de supresión de datos personales, 8 del identificador de
correlación, 2 de traducción de errores de Prisma y 1 del duplicado al mover un punto de zonal.

---

## 10. LO QUE QUEDA PENDIENTE DE TU DECISIÓN

| # | Asunto | Qué hace falta decidir |
|---|---|---|
| 1 | **I-01** · cabecera de identidad en el frontend | Se resuelve al construir M-21. No requiere decisión, sí atención |
| 2 | React Query y React Hook Form | No están en el stack aprobado. Decidir **antes** de M-21 |
| 3 | Unidad de trabajo compartida y `sinAcentos` de la semilla | Requiere tocar M-03 y M-06: hacerlo tras aprobarlos |
| 4 | Partir `catalogos.service.ts` | Conviene decidir la frontera cuando M-14 diga qué consume |
| 5 | Índices de `tico_id` e `inst_id` | Medir con `EXPLAIN` cuando `t_operativo` tenga volumen |
| 6 | Node 20 frente a Node 24 | Alinear entorno de desarrollo y contenedor |
| 7 | `@nestjs/swagger` | Arrastrado de M-07 |

Ninguno bloquea M-08.

---

## 11. ESTADO DE LA PRIMERA PASADA

**Revisión completa aplicada.** 16 de 28 hallazgos corregidos, todos verificados; los 12 restantes
documentados con su motivo. El módulo compila, pasa lint, tiene 169 pruebas en verde y la pila
funciona con los tres contenedores sanos.

---
---

# 12. SEGUNDA PASADA · M-08, M-09 y M-10

**2026-08-05.** Sobre los tres módulos entregados después de la primera revisión, y repasando el
conjunto. **9 hallazgos: 6 corregidos, 3 reportados.**

## 12.1 El que más importa

### COR-05 · Se podía borrar la ausencia de otro funcionario
**Archivo:** `talento-operativo/application/disponibilidad.service.ts` · **Gravedad: alta** ·
**Corregido**

La ruta es `/administracion/personal/:id/disponibilidad/:periodoId`, pero el servicio recibía
**solo el identificador del período**:

```ts
async retirar(id: number, usuarioId: number)   // el :id de la ruta no llegaba
```

El controlador comprobaba que el funcionario existiera y acto seguido borraba el período indicado,
**perteneciera a quien perteneciera**. Un identificador equivocado retiraba la ausencia de otra
persona, y esa persona pasaba a figurar como disponible el día de sus vacaciones.

Lo más incómodo del defecto: **la traza habría quedado impecable**. Registraba correctamente qué
período se borró y quién lo hizo; lo que no diría es que el operador creía estar corrigiendo otra
cosa. Un fallo que la auditoría no puede delatar es peor que uno ruidoso.

No es escalada de privilegios —ambos endpoints son exclusivos del `ADMINISTRADOR`—, pero sí una
puerta abierta a excluir a alguien de una regla que existe para protegerlo.

**Corrección.** `retirar(funcionarioId, id, usuarioId)` exige que el período pertenezca a la
persona de la ruta; si no, `404`. Una prueba nueva lo fija, con el caso escrito con esas palabras.

## 12.2 Duplicación · 3 hallazgos, 3 corregidos

### DRY-04 · `ejecutarEnTransaccion`, escrito cinco veces
**Corregido** · Nueva clase `common/persistencia/repositorio-prisma.ts`

Estaba palabra por palabra en los repositorios de parámetros, catálogos, ventanas, funcionarios y
disponibilidad. Cada copia era idéntica y cada una podía divergir: bastaba con que alguien añadiera
un nivel de aislamiento o un tiempo máximo en una sola para que dos escrituras del sistema se
comportaran distinto sin motivo.

Los cinco repositorios heredan ahora de `RepositorioPrisma`. **Por qué herencia y no una unidad de
trabajo inyectada:** la forma canónica obligaría a cambiar el constructor de nueve servicios y de
todos sus dobles de prueba sin ganar nada —la transacción se abre igual y donde mismo—. La clase
base conserva el contrato que los servicios ya usan y borra la duplicación. Cuando un servicio
necesite abarcar **varios** repositorios en una transacción, esa sí será la señal para extraer la
unidad de trabajo.

Los repositorios que no abren transacciones —`AuditoriaRepository` y los dos de `common/auth`— no
heredan: la herencia solo donde se gana algo.

### DRY-05 · Dos formas de escribir una fecha `AAAA-MM-DD`
**Corregido** · `comoFechaIso` en `reglas-personal.ts`

Estaba en el servicio, para los mensajes, y en el DTO, para la respuesta. Dos copias del mismo
corte de cadena que podían divergir en cuanto una de las dos cambiara de huso.

### DRY-06 · Dos intérpretes de enumerado con mensajes distintos
**Corregido** · Nuevo `common/utilidades/enumerado.ts`

`aRolDepartamental` en las ventanas e `interpretar` en los filtros de personal hacían lo mismo —
comprobar un valor que llega por ruta o consulta, donde el `ValidationPipe` no alcanza— y devolvían
frases distintas para el mismo problema. Ahora el funcionario lee siempre la misma, y esa frase
enumera los valores admitidos.

## 12.3 Seguridad y KISS · 2 corregidos

### SEG-08 · La consulta de elegibles cargaba cédulas y teléfonos que no usa
**Archivo:** `funcionarios.repository.ts` · **Corregido**

`listarPorAreas` traía la fila completa y el DTO descartaba después lo sensible. El resultado era
correcto, pero la protección dependía de que nadie tocara el mapeo.

Ahora la consulta **selecciona solo las cinco columnas necesarias**: id, apellidos, nombres, área y
cargo. La cédula y el teléfono ya no salen de la base para este camino. Es defensa en profundidad,
no rendimiento: *la defensa que no depende de recordar algo es la única que aguanta*.

### KISS-02 · Un filtro con doble negación
**Corregido**

```ts
activo: filtro.soloActivos === false ? undefined : true   // antes
activo: filtro.incluirInactivos ? undefined : true        // ahora
```

El controlador hacía `soloActivos: incluirInactivos === 'true' ? false : undefined`: dos negaciones
encadenadas para expresar «por omisión, solo los vigentes».

### M-09 · La fecha del identificador era mutable
**Archivo:** `operativos/domain/identificador-operativo.ts` · **Corregido**

`readonly fecha: Date` impide reasignar la referencia, **no mutar el objeto**. Con la fecha
pública, `identificador.fecha.setFullYear(1999)` cambiaba un objeto de valor desde fuera, y con él
el código impreso en una orden de servicio ya emitida. Ahora se guarda una copia, el campo es
privado y se accede por `fechaOperativa`, que devuelve otra copia.

## 12.4 Reportados sin corregir · 3

| # | Hallazgo | Por qué no se corrige |
|---|---|---|
| **REN-04** | `GET /administracion/personal` devuelve el maestro completo, sin paginar, con cédulas y teléfonos. `PaginacionDto` y `componerPaginada` existen desde M-04 y siguen sin consumidor | Paginar **cambia la forma de la respuesta**, que es funcionalidad. Es la decisión natural al construir la pantalla P-07 (M-27), que es quien sabe cuántas filas necesita por página |
| **REN-05** | `VentanaCargaService.actualizar` consulta las seis ventanas para componer las advertencias aunque el cambio resulte no ser tal | Seis filas. Optimizarlo añadiría una rama por ahorrar una consulta trivial |
| **SOLID-02** | Tres formas de la misma idea: `escribirConTraza` en catálogos, otro en funcionarios y la transacción en línea en ventanas y disponibilidad | Unificarlos exige un genérico que abarque cuatro entidades con claves distintas. Se estudió y **se descartó por ahora**: el genérico oscurecería más de lo que ahorra. Conviene revisarlo cuando M-14 añada el quinto caso |

## 12.5 Dimensiones sin hallazgos nuevos

| Dimensión | Estado |
|---|---|
| **React / UX** | El frontend **no se ha tocado desde M-01**. Siguen abiertos I-01 —`httpClient` no envía `x-usuario-prueba`— y `FormikField.tsx` sin pruebas. Nada nuevo |
| **Docker** | `build:`, comprobación de salud y `.dockerignore` se corrigieron en la primera pasada y siguen funcionando: el arranque vuelve a mostrar `Waiting → Healthy` antes de levantar el frontend |
| **PostgreSQL** | M-10 no necesitó migraciones: los índices parciales de M-02 ya cubrían sus dos consultas. Sigue abierto REN-02 —`tico_id` e `inst_id` sin índice—, a medir cuando `t_operativo` tenga volumen |
| **Prisma** | `distinct` sobre `funcionarioId` se resuelve en el motor. La discrepancia cosmética de los valores por omisión de los enumerados (P-01) sigue igual |

## 12.6 Verificación de esta pasada

| Paso | Resultado |
|---|---|
| `npm run build` | ✅ código 0 |
| `npm run lint:check` | ✅ código 0 |
| `npm test` | ✅ **311 de 311**, 25 suites · una prueba nueva por COR-05 |
| `npm run test:integracion` | ✅ 53 de 53 |
| Imagen reconstruida y pila levantada | ✅ los tres contenedores `healthy` |
| Proxy del frontend | ✅ `localhost:5176/api/v1/estado` → 200 |

Los seis cambios aplicados **no alteran ninguna respuesta del sistema**, salvo COR-05, que es la
corrección de un defecto: donde antes se borraba el período de otra persona, ahora hay un `404`.

## 12.7 Nota de método

Durante esta pasada volví a usar PowerShell para un reemplazo de texto sobre un archivo UTF-8 y
**volvió a corromper los acentos**, igual que en la primera revisión. Lo detecté de inmediato y
reescribí el archivo completo. Es el mismo error dos veces: en este repositorio los archivos se
editan con las herramientas de edición, nunca con `Set-Content`.

---

## 13. ESTADO

**Dos pasadas aplicadas.** 22 de 37 hallazgos corregidos y verificados; los 15 restantes
documentados con su motivo. El módulo compila, pasa lint, tiene **364 pruebas en verde** —311
unitarias y 53 de integración— y la pila funciona con los tres contenedores sanos.

**A la espera de aprobación.**
