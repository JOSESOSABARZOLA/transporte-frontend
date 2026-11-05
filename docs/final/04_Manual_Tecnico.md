# 04 · Manual Técnico

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Para quien recibe el código · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Describe el código de la rama `base/cuadro-colores` en `transporte-backend` 24520af y
> `transporte-frontend` d13a5db. Las guías vivas, con el detalle de cada cambio, son los dos
> `CLAUDE.md`; este manual es su resumen estable.

---

## 1. Los dos repositorios

| Repositorio | Contenido | Puerto |
|---|---|---|
| `transporte-backend` | API NestJS + Prisma + PostgreSQL | 3003 |
| `transporte-frontend` | Aplicación React + Vite, servida por nginx | 5180 |

Están en carpetas hermanas bajo `sigoc-cco/`. Los tres archivos de Compose viven en el backend:
`docker-compose.yml` (desarrollo, construye las dos imágenes), `docker-compose.prod.yml` (servidores,
imágenes etiquetadas por versión) y `docker-compose.gateway.yml` (el añadido para producción detrás
del Gateway). Los dos repositorios trabajan en la rama `base/cuadro-colores`.

**`package-lock.json` está versionado en los dos repositorios.** En el backend se agregó el 21 de
octubre de 2026 (commit 8981c34): la imagen se construye con `npm ci`, que sin el archivo de
bloqueo no funciona desde un clon limpio.

---

## 2. Pila tecnológica · lo que está instalado de verdad

### Backend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 11 |
| Lenguaje | TypeScript estricto | 5.x |
| ORM | Prisma Client | 6.19.3 |
| Base de datos | PostgreSQL | 18 |
| Validación | class-validator · class-transformer | 0.15 · 0.5 |
| Seguridad HTTP | helmet · @nestjs/throttler · cookie-parser | 8 · 6 · 1.4 |
| Sesión | jsonwebtoken | 9 |
| PDF | pdfkit · pdfmake · pdf-lib | 0.19 · 0.3 · 1.17 |
| Hojas de cálculo | exceljs | 4.4 |
| Runtime | Node 20 (`engines` ≥ 20.11) | |

**Cambió en septiembre de 2026: las tres librerías de PDF se usan, cada una para una cosa.**

| Librería | Dónde | Para qué |
|---|---|---|
| `pdfkit` | `documentos/application/exportador-matriz.ts`, `exportador-orden.ts` | Matriz consolidada y orden corta. Trae sus fuentes incrustadas |
| `pdfmake` | `documentos/application/motor-documento.ts` | Orden de servicio en formato memorando. Usa las fuentes Roboto de `fonts/`, que el `Dockerfile` copia |
| `pdf-lib` | `documentos/infrastructure/firma-digital.client.ts` | Firma digital `.p12` del memorando. Inerte si no se configura; `502 SERVICIO_FIRMA_NO_DISPONIBLE` si falla |

`exceljs` está autorizada solo para lo que ya hace: exportar la cobertura por turnos y los turnos de
conductores, y leer `.xlsx` en la carga inicial de la DAF.

### Frontend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | React + TypeScript | 19.2 · 5.9 |
| Construcción | Vite | 7.3 |
| Estilos | Tailwind CSS + daisyUI | 4.2 · 5.5 |
| Rutas | react-router-dom | 7.13 |
| Formularios | Formik + Yup | 2.4 · 1.7 |
| Tablas | @tanstack/react-table | 8.21 |
| HTTP | axios, **solo dentro de `src/api/httpClient.ts`** | 1.13 |
| Visor de PDF | react-pdf | 11 |
| Iconos | FontAwesome `free-solid`, solo por `components/common/Iconos.tsx` | 7 |
| Pruebas | Vitest + Testing Library + jsdom | 3 |

> **`react-pdf` volvió el 22 de septiembre de 2026.** Se había desinstalado el 19 de agosto porque no
> se importaba en ningún archivo. Ahora sí: `components/ordenes/VisorPdf.tsx` y
> `VisorPdfMemorando.tsx` muestran el memorando que genera el servidor, con vista previa al editar
> la plantilla. El PDF lo sigue generando el backend; el navegador solo lo pinta. El nginx de la
> imagen sirve el *worker* `.mjs` de pdf.js como `text/javascript`: sin eso, con `nosniff`, el
> visor no dibuja nada.

**Prohibido en el backend:** `typeorm`, `@nestjs/typeorm`, `dataSource.query`, funciones `fu_*`,
`$queryRawUnsafe`, y cualquier dependencia fuera de la pila sin autorización previa.
**Prohibido en el frontend:** `axios` fuera de `httpClient`, `window.alert/confirm/prompt`, la clase
`btn` fuera de `components/common/`, y cualquier recurso externo no declarado en la CSP de
`nginx.conf`.

---

## 3. Cómo trabajar

```bash
# Backend
cd transporte-backend
npm ci
npx prisma generate
npx prisma migrate dev       # los catálogos institucionales entran por migración
npm run start:dev            # http://localhost:3003/api/v1

npm run build                # debe salir con código 0
npm run lint:check           # debe salir con código 0
npm test                     # 2420 pruebas unitarias en 151 suites, sin base de datos
npm run test:integracion     # 22 suites, EXIGE transportedb_pruebas
npm run prisma:verificar     # tablas, enumerados, 48 CHECK y 14 índices parciales

# Frontend
cd transporte-frontend
npm ci
# .env.development.local con VITE_AUTH_PORTAL_URL (obligatoria)
npm run dev                  # http://localhost:5180
npm test                     # 2081 pruebas en 140 archivos
npm run lint
npm run build                # se detiene si falta VITE_AUTH_PORTAL_URL
```

> **`VITE_AUTH_PORTAL_URL` es obligatoria desde el 16 de octubre de 2026.** El código ya no trae
> una dirección del portal de Auth por omisión. `vite.config.ts` detiene `npm run build` sin ella y
> `npm run dev` muestra «Falta configurar la dirección del portal de Auth». La dirección queda
> **horneada** en el JavaScript, así que la imagen del frontend es distinta en cada ambiente.

> **Las pruebas de integración usan su propia base**, `transportedb_pruebas`. El motivo original
> era que `ck_formulario_numero` admitía solo del 1 al 9; el rango se amplió a 1..99 el 29 de
> septiembre de 2026 (migración `20260929120000`), pero la separación se mantiene: una suite no
> puede borrar un dato real y el resultado no depende del estado de la base de desarrollo. Corren
> en serie (`maxWorkers: 1` en `test/jest-integracion.json`). La preparación está en
> `08_Manual_Instalacion.md`.

**En repositorio no se escriben direcciones IP de servidores**, ni en código ni en comentarios ni en
documentación. Se usan marcadores (`<IP_SERVIDOR_AUTH>`, `<IP_PREPRODUCCION>`) o el nombre de host
público. Las direcciones reales viajan solo en los paquetes de despliegue.

---

## 4. Arquitectura del backend

### 4.1. Cuatro capas por submódulo

```
src/modules/<submodulo>/
├── presentation/     Controllers + DTO. Sin reglas de negocio, sin Prisma
├── application/      Services y políticas puras (application/politicas/). Sin HTTP, sin Prisma directo
├── domain/           Objetos de valor y reglas puras. Sin dependencias externas
└── infrastructure/   Repositories y clientes externos. Único punto que toca PrismaService
```

`transporte` no tiene carpeta `domain/`: sus reglas puras viven en `application/politicas/`
(`compartir-tramo.ts`, `registro-agrupado.ts`, `hoja-ruta.ts`, `optimizador-transporte.ts`,
`traslados.ts`, `jornada-daf.ts`, entre otras), y cada una tiene su `.spec.ts` al lado.

### 4.2. Siete submódulos

| Submódulo | Responsabilidad |
|---|---|
| `configuracion` | Formularios y su configuración propia (zonales, puntos, tipos de control, instituciones, áreas), ventanas de carga, parámetros, **jornadas laborales**, roles de Auth y **matriz rol↔permiso** |
| `talento-operativo` | Personal, disponibilidad, historial, **cobertura por turnos de Instrucción** y **todas las reglas de descanso del personal** |
| `cuadro-diario` | Ciclo de vida de la jornada: apertura, estados, cierre y reapertura |
| `operativos` | Núcleo. Registro (también por zonas y por lote), edición, personal, adicionales, solicitudes de apoyo y trámites de Inspección |
| `transporte` | Planificación DAF por tramos, flota, garajes, mantenimiento, turnos de conductores, traslados entre zonales y carga inicial |
| `documentos` | Matriz consolidada (pantalla y PDF), Jornada del Día y órdenes de servicio con plantilla por departamento |
| `identidad` | Sesión con Auth central, directorio de Auth y cuentas del cuadro |

Medido el 5 de noviembre de 2026: **39 controladores con 215 manejadores de ruta (216 endpoints con `GET /estado`)**. El transversal
`src/common/` aloja la autorización (`auth/`), la auditoría, los errores, el registro, las notas del
operativo (`notas/`), las reglas de ausencia compartidas por personal y conductores (`ausencias/`) y
la comprobación de salud.

### 4.3. Comunicación entre submódulos

**Solo por servicios publicados o por puertos.** Importar el repositorio de otro submódulo es un
defecto.

| Origen | Destino | Servicio |
|---|---|---|
| `operativos` | `talento-operativo` | `ElegibilidadService.verificar()` → veredicto y motivo, **no datos del funcionario** |
| `transporte` | `talento-operativo` | `ElegibilidadService.evaluadorDeConduccion()` → veredictos RN-44 y RN-25 del conductor, por lote |
| `operativos` | `configuracion` | `FormulariosService.obtenerDefinicion()` |
| `transporte` | `operativos` | `OperativosService.asignarTransporte()` |
| `operativos` | `transporte` | Por **puerto**, sin importar el módulo: `RegistroHerenciaTransporte` (el adicional hereda conductor y vehículo) y `RegistroCompatibilidadCompartir` (¿pueden ir en la misma unidad?) |
| `documentos` | `operativos`, `transporte` | Servicios de consulta |
| Todos | `cuadro-diario` | `CuadroDiarioService.puedeEscribir()` |

Los puertos los llena `transporte` al iniciar. Así `operativos` le pide algo sin crear una
dependencia circular entre módulos.

### 4.4. Cadena de autorización

```
IdentidadGuard → PermisosGuard → FormularioRolGuard → VentanaCargaGuard → ValidationPipe → Service
     401              403              403                  423              400          409
```

**Cambió el 16 de septiembre de 2026: el acceso es un permiso, no una lista de roles.** Cada
endpoint protegido declara `@RequierePermiso('modulo:accion')` y `PermisosGuard` lo valida contra
`t_rol_permiso`, cacheada en `PermisosService` e invalidada al editarla desde «Permisos por rol».
`RolesGuard` y `@Roles` quedaron sin uso.

- **`PermisosGuard` estrecha `usuario.rol`** al rol que otorga el permiso: es el «sombrero» que se
  graba en `oper_creado_por_rol` y en `audi_rol`. Para preguntar «¿tiene este rol?» se usa
  `usuario.roles`.
- **`FormularioRolGuard` consulta la base**, nunca confía en el cuerpo de la petición.
- **`VentanaCargaGuard` solo restringe la escritura.** `AdicionalesController` es el único endpoint
  de escritura sin ella (RN-61 a RN-64).
- **`DirectorGuard`** (`documentos/presentation/director.guard.ts`) va antes que `PermisosGuard` en
  las rutas de emisión de órdenes: solo la Dirección emite (`ROLES_QUE_EMITEN_ORDENES`).
- **Seis controladores solo exigen sesión**: `app`, `formularios`, `sesion`, `ventanas`,
  `zonales` y `personal`.

### 4.5. Reglas invariables

1. Las reglas de descanso del personal viven **solo** en `talento-operativo`. Las cuatro del
   conductor que se miden por tramo (ausencia, jornada laboral, solapamiento y jornada máxima como
   lapso) viven en `transporte/application/politicas/asignacion-conductor.policy.ts`.
2. Los umbrales son parámetros de `t_parametro_politica`, **nunca constantes**.
3. `ActualizarTransporteDto` tiene **exactamente dos propiedades**: conductor y vehículo.
4. Conductor y vehículo **nacen nulos**; solo la DAF los completa.
5. Toda escritura multitabla en `$transaction`, **con la auditoría dentro**.
6. Los eventos se emiten **después** de confirmar la transacción.
7. Cada validación cita su regla en el comentario: `RN-24`, `RN-43`.
8. Los mensajes de error se escriben para el funcionario.
9. **Qué es un registro agrupado lo dice `esLoteDeRegistro`**, nunca `if (grupoRegistro)` ni un
   número de formulario. Todo operativo lleva `oper_grupo_registro` desde el 27 de octubre.
10. **Qué tipo de transporte pide vehículo de la DAF lo dice `pideVehiculoDaf`**
    (`operativos/domain/tipo-transporte.ts`), nunca una comparación suelta con `'PROPIOS_MEDIOS'`.

### 4.6. Transporte DAF por tramos

**La ocupación de un conductor o un vehículo sale solo de `t_tramo_transporte`.** Un operativo
«dejar y retirar» ocupa al conductor en sus dos tramos y lo deja libre entre medio.
`t_operativo.cond_id/vehi_id` queda como reflejo de solo lectura para la orden, la matriz y
`ck_operativo_transporte`.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Resumen de los 4 pasos | `GET /transporte/jornada-daf/:fecha` (`jornada-daf.service.ts`) | Requisitos, pendientes, vehículos de la jornada, fin del día y hojas de ruta. El paso no se guarda: el frontend lo deriva |
| Asignación por tramos | `POST /transporte/tramos/asignar`, `DELETE /transporte/tramos/:id/asignacion` | Conductor y vehículo por bloque, con la política de tramos y traslados |
| Compartir unidad | `POST /transporte/tramos/compartir`, `GET /transporte/tramos/:operativoId/compartibles` | Regla única `politicas/compartir-tramo.ts`. Asientos contados **por momento** |
| Optimizador | `POST /transporte/optimizar` y `/optimizar/confirmar` | Propone y confirma; deja una traza por tramo y un resumen con su propia correlación |
| Vehículos de la jornada | `GET`/`PUT /transporte/vehiculos-jornada/:fecha` | Qué vehículos salen ese día (`t_vehiculo_jornada`) |
| Fin del día | `GET`/`PUT /transporte/fin-del-dia/:fecha` | Garaje sugerido y acta de parqueadero |
| Hojas de ruta | `POST /transporte/hojas-ruta/:fecha/emitir` | Guarda en `t_hoja_ruta_emision` la **huella** de los tramos; si cambian después, el resumen dice «cambio posterior» (`hoja-ruta-emision.ts`) |
| Traslados entre zonales | `GET`/`PUT /administracion/traslados`, `POST …/verificar-impacto` | Matriz dirigida `t_traslado_zonal`; regla única `politicas/traslados.ts` (`minutosTraslado`) |
| Registro agrupado | `politicas/registro-agrupado.ts`, `operativos/domain/registro-operativo.ts` | La patrulla 5/6 y el registro por zonas del 8 son **una** solicitud con un conductor y un vehículo. Habla el `representanteDeLote`; `sincronizarOperativos` copia la asignación a todos los códigos |

Los `CLAUDE.md` citan un contrato por pieza (`docs/CONTRATO-*.md`), pero **no están versionados**:
el `.gitignore` del backend excluye `docs/*` salvo las fases de análisis, y en la copia de trabajo
solo queda `CONTRATO-personal-por-lote.md`. Mientras no se recuperen, la referencia viva es el
`CLAUDE.md` del backend, §3.

### 4.7. Scripts de mantenimiento

Viven en `src/scripts/`, se compilan con el resto y corren en el contenedor sin `ts-node`. **Sin
`--aplicar` solo reportan.** Con él, una transacción y traza en `t_auditoria`; `--usuario=<usua_id>`
es obligatorio y firma la traza. Son idempotentes.

| Script | Qué corrige |
|---|---|
| `limpieza-catalogos.js` | Zonales que eran puntos, tipos de control fuera de MAYÚSCULAS, nombres de instituciones. `--incluir-zonales` para tocar zonas |
| `tramos-desde-asignacion-clasica.js` | Crea los tramos de los operativos asignados por la ruta clásica que no los tienen |
| `tramos-registro-agrupado.js` | Reporta los tramos de códigos que no son el representante de su registro; con `--aplicar` borra solo los que no tienen conductor |

```bash
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js --aplicar --usuario=<usua_id>
```

La lógica de cada uno está en su `*.logica.ts`, con pruebas unitarias.

### 4.8. Operación detrás del Gateway

Desde el 16 de octubre de 2026 hay tres ambientes: local, preproducción (sin Gateway) y producción
detrás del Gateway de `*.quito.gob.ec`, que termina el TLS.

| Pieza | Dónde | Por qué |
|---|---|---|
| `TRUST_PROXY` | `app.config.ts` (`saltosProxy`), `main.ts` | Número de proxies de confianza: **1** en preproducción (nginx), **2** en producción (Gateway y nginx). Sin ella, `req.ip` es la del proxy y `ThrottlerGuard` contaría a todos como uno. `validar-entorno.ts` rechaza todo lo que no sea un entero |
| `X-Forwarded-Proto` | `transporte-frontend/nginx.conf` (`map … $proto_reenviado`) | El nginx reenvía el protocolo que manda el Gateway; sin Gateway, el suyo |
| `NODE_EXTRA_CA_CERTS` | `docker-compose.gateway.yml` | Suma la intermedia de DigiCert que el Auth no envía. Sin ella el canje falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` |
| `VITE_API_BASE_URL` vacía | `transporte-frontend/src/config/env.ts` | Un build de producción sin ella pide al propio origen |

**La imagen del backend pasó de 331 a 194 MB** el 16 de octubre (commit f6b4302, con limpieza de
dependencias); su etapa final parte de `node:20-slim`. Es la misma en los dos servidores; la del frontend se compila por
ambiente con `scripts/empaquetar.sh <preproduccion|produccion> <portal>`.

---

## 5. Arquitectura del frontend

```
src/
├── api/           httpClient · correlationId
├── components/
│   ├── common/        Boton, BotonEnlace, DrawerLateral, MensajeModal, MensajeHost, AvisoEnLinea,
│   │                   EncabezadoPagina, PanelTabla, AccionesFila, Tooltip, Paginacion, Iconos…
│   ├── cuadro/        FormOperativo (alta | edicion | adicional), SelectorPersonal, SelectorFormulario,
│   │                   DrawerOperativo, TablaOperativos, PanelOperativos, GrupoPorZonas…
│   ├── transporte/    planificar/ (los 4 pasos, DrawerCandidatos) · linea/ (línea de tiempo)
│   ├── flota/         Vehículos, conductores, garajes, mantenimiento, ausencias de conductores
│   ├── personal/      Maestro, ficha, ausencias y cobertura/ (matriz de turnos)
│   ├── administracion/ Ventanas, jornadas laborales, parámetros, roles de Auth, cuentas
│   └── ausencias · catalogos · formularios · forms · jornada · matriz · navbar · ordenes · sesion
├── config/        routes · navigation · env · catalogoParametros · ordenesServicio · validationSchemas
├── context/       UserContext · ThemeContext · FechaDafContext
├── hooks/         useConsulta, useBorradorAporte, usePanelFlotante, usePaginaLocal, useAvisoAlSalir…
├── interfaces/    Un archivo por dominio
├── layouts/       MainLayout · LoginLayout
├── pages/         Las diecisiete pantallas + AuthCallbackPage + LoginPage
├── providers/     AppProviders (monta el único MensajeHost) · ThemeProvider · UserProvider
├── services/      Un servicio por dominio, todos sobre httpClient
├── styles/        Tokens y hojas del sistema visual
├── utils/         Reglas puras (85 archivos), con sus pruebas al lado
└── pruebas/       Configuración de Vitest, permisos y jornadas de prueba
```

### 5.1. Reglas de interfaz

1. **No se introducen clases CSS nuevas.** El inventario está en `docs/FASE5-diseno-interfaz.md` §2.2.
2. **No se alteran los colores del tema** de daisyUI.
3. **Los colores de banner los entrega el backend.** El texto sobre el banner se elige entre blanco y
   negro por luminancia (`banner.util.ts`).
4. **Las pantallas se montan según el permiso**, no se ocultan controles. `routes.tsx` y
   `navigation.ts` declaran los mismos permisos; lo fija `rolesDeAdministracion.spec.ts`.
5. **Los campos calculados no son campos**: distintivos, nunca un `input` deshabilitado.
6. **Ninguna información depende solo del color.**
7. **Los mensajes del servidor se muestran tal cual**, pasando por `traductorErrores`, que solo les
   pone título.
8. **Peticiones solo por `httpClient`**, y la CSP del nginx (`connect-src 'self'`) lo respalda.
9. La DAF escribe **exactamente dos campos**; la prueba «RN-40 · la DAF solo escribe conductor y
   placa» de `transporte/planificar/planificarDia.spec.tsx` lo vigila.
10. La orden de servicio tiene **cuatro campos**, pintados en `ordenes/CamposDeLaOrden.tsx`.
11. Las fechas de calendario viajan como texto `AAAA-MM-DD`, sin convertir a `Date`.
12. **Un botón, un cajón, un mensaje**: `<Boton>`, `<DrawerLateral>` y `MensajeModal`/`toast`/
    `AvisoEnLinea`. Lo vigilan `estandarBotones.spec.ts`, `cajonEstandar.spec.ts` y
    `mensajesEstandar.spec.ts`.

### 5.2. Plantilla visual única y cajón lateral

**Desde el 24 de octubre de 2026 todas las pantallas comparten la misma plantilla.**
`EncabezadoPagina` arriba (módulo, título, chip de perfil, fecha y selectores), `PanelTabla` con
cabecera azul y barra de filtros, `EtiquetaEstado` y `AccionesFila`. Las tablas densas usan
acciones de icono con `Tooltip`; las de seis columnas o menos, icono y texto.

**Todo formulario se captura en `DrawerLateral`**, con cabecera y pie azules. El estado del pie
(«Sin cambios pendientes», «Falta: …», «Listo para guardar») lo calcula
`utils/estadoPieDrawer.util.ts`, igual en todos.

**Las listas desplegables se abren en un portal desde el 4 de noviembre de 2026.**
`hooks/usePanelFlotante.ts` monta la lista en una capa fija sobre los paneles, que con
`backdrop-blur` creaban cada uno su propio contexto de apilamiento y tapaban la lista. Lo usan
`SelectorFormulario` y `SelectorTokens`.

### 5.3. Carga diferida

Cada pantalla va en **su propio fragmento** con `lazy` y su propio `Suspense`. `RutaProtegida`
envuelve **por fuera** de `Suspense`: al revés, la aplicación descargaría el paquete de una pantalla
para descubrir después que el permiso no alcanza.

El mapa `CONSTRUIDAS` en `config/routes.tsx` está tipado como `Record<Ruta, ReactNode>`: **si falta
una pantalla, TypeScript lo dice.** Las rutas antiguas de la DAF (`/cuadro/jornada-conductores`,
`/cuadro/capacidad`, `/administracion/mantenimiento`) redirigen a su destino actual.

---

## 6. Manejo de errores

El backend responde siempre con la misma forma:

```json
{
  "correlacionId": "687f6b30-…",
  "timestamp": "2026-08-07T09:52:47.288-05:00",
  "ruta": "/api/v1/…",
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer…",
  "detalles": { }
}
```

`detalles` lleva lo que la pantalla necesita para señalar el sitio exacto: `funcionarioId` cuando el
rechazo es de una persona, `errores: [{ clave, motivo }]` en el guardado de parámetros, o
`{ desde, hacia, huecoMin, necesarioMin, faltanMin }` en un «no llega».

El frontend lo traduce en dos sitios:

| Archivo | Qué decide |
|---|---|
| `utils/errorApi.util.ts` | El trato (`campo`, `permiso`, `conflicto`, `ventana`, `generico`) y la familia del aviso (`varianteDeAviso`, `avisoDeFallo`) |
| `utils/traductorErrores.ts` | El título de cada código de negocio. El mensaje sigue siendo el del servidor; lo técnico va al detalle plegado |

Los **42 códigos de dominio** están en `src/common/errors/codigos-error.ts`, cada uno con la regla
que lo origina.

---

## 7. Identidad

**La identidad sale de una cookie `HttpOnly` que emite el canje con Auth central, y de ningún otro
sitio.** El modo provisional (`x-usuario-prueba`) se retiró el 18 de agosto de 2026.

```
src/modules/identidad/
├── presentation/     sesion.controller.ts · directorio.controller.ts · administracion-usuarios.controller.ts
├── application/      sesion.service.ts      canje, verificación y perfil vigente
└── infrastructure/   usuario-sesion.repository.ts · auth-usuarios.client.ts

src/common/auth/
├── token-sesion.ts                  firma y verificación. Funciones sueltas, no un provider
├── guards/                          identidad · permisos · formulario-rol · ventana-carga
└── application/permisos.service.ts  matriz rol↔permiso con caché
```

**Dos claves distintas**: `AUTH_JWT_SECRET` verifica lo que Auth firmó, una sola vez en el canje, y
`SESSION_JWT_SECRET` firma lo que este módulo emite. `validar-entorno.ts` detiene el arranque si la
segunda falta o mide menos de 32 caracteres.

**Auth dice quién es; este módulo decide qué rol tiene**, resolviendo el `username` contra
`t_usuario.usua_identificador_ad`. Una persona puede tener varios roles (`t_usuario_rol`) y ve la
unión. `GET /auth/session` devuelve además `permisos: string[]`, re-derivados de la base en cada
respuesta, con los que el frontend gatea rutas y menú.

**La cookie conserva el token de Auth** (`tokenAuth`) porque Auth no tiene token de servicio: con él
se consulta el directorio y, servidor a servidor, los trámites de Inspección. Nunca se registra ni se
devuelve.

**El rol `FUNCIONARIO` se retiró el 10 de septiembre de 2026.** El personal de campo no inicia
sesión; sus órdenes se emiten desde la Dirección. Se conserva vacío en el enumerado.

**Las pruebas de integración firman su propia cookie** con `test/identidad-de-prueba.ts`.

---

## 8. Pruebas

| Suite | Cantidad | Requiere base |
|---|---|---|
| Backend unitarias | **2420** en 151 suites | No |
| Backend integración | **22** suites | Sí, `transportedb_pruebas` |
| Frontend | **2081** en 140 archivos | No |

*Recuento del 5 de noviembre de 2026.*

> **Ocho suites de integración fallaban en la última corrida completa**, por fixtures que no
> siguieron al código: `puntoEncuentro.create` sin `formulario` (operativos, matriz, órdenes,
> solicitud de apoyo, asignación de personal), `400` de `/personal/elegible` al enviar `inicio`
> (elegibilidad, personal-disponibilidad) y un texto de mensaje en configuracion-catalogos. Es deuda
> conocida; ver `11_Guia_Mantenimiento.md` §5.

Las fichas de las suites toman su jornada laboral con `test/jornadas-de-prueba.ts`
(`JORNADAS.lv` y `JORNADAS.total`); en el frontend, `pruebas/configuracion.ts` simula el catálogo de
jornadas y `pruebas/permisos.ts` deriva los permisos de cada rol (espejo de
`common/roles/matriz-permisos.ts`).

**Qué se prueba y qué no.** Se prueban **decisiones**: que un formulario ajeno no se pueda
seleccionar, que la hoja de una orden no mencione a los demás funcionarios, que la DAF solo envíe
conductor y vehículo. **No** se prueba el maquetado; la estructura de cada cajón sí queda fijada con
instantáneas (`common/cajonesSnapshots.spec.tsx`), que se aceptan con `-u` después de mirarlas.

Dos técnicas que conviene conservar:

- **Contar en lugar de enumerar.** La prueba de la DAF cuenta los controles y lo que viaja.
  Nombrarlos habría dejado pasar un tercer campo agregado más adelante.
- **Afirmar lo que no está.** La prueba de las órdenes comprueba que la hoja de cada persona **no
  menciona a las otras**.

---

## 9. Convenciones

1. Cabecera de comentario por archivo: app/módulo, feature, archivo, responsabilidad, desarrollador,
   fecha.
2. **Español** en nombres, comentarios y textos de interfaz.
3. Cero variables, imports o funciones sin usar. Sin `console.log`. Sin `any`.
4. Imports con **extensión explícita** (`.ts` / `.tsx`) en el frontend: Vite lo exige.
5. Commits cortos, en español, estilo convencional, sin atribución a herramientas.
6. Antes de terminar: `build`, `lint` y pruebas con código de salida 0 en ambos repositorios.
7. Ninguna IP de servidor en nada versionado.

### Orden de los decoradores de validación

`class-validator` informa las restricciones **en orden inverso** al de declaración, y el filtro
muestra la primera como `mensaje`. **El mensaje que debe leer el funcionario se declara el último.**
