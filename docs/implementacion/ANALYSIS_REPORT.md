# ANALYSIS_REPORT.md
## Análisis previo a la implementación — Módulo Transportes / Cuadro de Colores Operativo (AMC)

| | |
|---|---|
| **Fecha del análisis** | 2026-08-04 |
| **Naturaleza** | Análisis de comprensión. **No se escribió ni modificó una sola línea de código** |
| **Alcance leído** | `IMPLEMENTATION_GUIDE.md`, `00-LEEME.md`, `PENDIENTES-VALIDACION.md`, `docs/` completo (6 documentos de fase + prototipo), `insumos/` completo, `transporte-backend/` y `transporte-frontend/` (código, configuración, `CLAUDE.md`, `.claude/agents`, `.claude/skills`, estado de Git) |
| **Estado** | Emitido. **A la espera de aprobación para iniciar la implementación** |

---

## 0. RESUMEN EJECUTIVO

El análisis y el diseño del módulo están **completos y son de calidad inusualmente alta**: cinco
fases documentadas, con trazabilidad explícita de cada regla a su fuente y con lo supuesto
separado de lo acordado. La guía de implementación es ejecutable tal como está.

Sin embargo, **el estado real de los dos repositorios no corresponde al que el kit asume**. Los
tres hallazgos que condicionan el arranque son:

1. **Los repositorios contienen íntegramente el sistema de Instrucción**, sin ninguna limpieza
   aplicada. Ni un solo archivo del módulo nuevo existe todavía.
2. **`origin/main` está vacío en ambos** (un único commit con solo `README.md`). Todo el código
   presente está **sin versionar**. El procedimiento de limpieza de `00-LEEME.md` §3.1, que
   supone el legado ya commiteado, **no es aplicable tal cual**.
3. **El kit está instalado a medias**: `CLAUDE.md` y `.claude/` sí están en ambos repositorios,
   pero **`docs/` no se copió**. Todo el contexto (`CLAUDE.md`, los nueve agentes, las once
   skills) apunta a `docs/IMPLEMENTATION_GUIDE.md` y a los documentos de fase, **que no existen
   dentro de los repositorios**.

Además se detectaron **cuatro contradicciones entre documentos del propio kit** y **siete
inconsistencias entre el insumo `catalogos-hoja2.json` y el diseño**, que deben resolverse antes
de E0 y E1 respectivamente. Están en los apartados §12 y §13, con recomendación para cada una.

**Veredicto:** el proyecto está listo para implementarse de forma asistida en cuanto se resuelvan
las **nueve decisiones de arranque** del apartado §14. Ninguna requiere al Product Owner: son
decisiones técnicas del equipo. Las que sí requieren al PO (los tres bloqueantes de datos
maestros) no impiden construir el esquema ni los módulos, solo poblarlos.

---

## 1. COMPRENSIÓN DEL PROYECTO

### 1.1 Qué es

El **Cuadro de Colores** es el compilado diario de los operativos que la Agencia Metropolitana de
Control ejecutará al día siguiente. **No es una herramienta de planificación**: cada dirección
planifica en sus propios instrumentos (SharePoint zonal semanal, Excel de entidades externas,
sistema legado .NET) y el cuadro únicamente responde a *dónde estará movilizado cada funcionario
mañana, con quién y con qué vehículo*.

Esta distinción —declarada literalmente por el Product Owner— es la que reordena todo el modelo
de datos: el agregado raíz es la **jornada**, no el plan.

### 1.2 Por qué existe

Tres problemas verificados en las ocho transcripciones:

| # | Problema | Consecuencia | Respuesta del sistema |
|---|---|---|---|
| 1 | Una sola persona consolidaba el cuadro completo a mano, y **cesó funciones durante el levantamiento, sin traspaso** | Proceso sin titular, conocimiento perdido | **Nueve formularios independientes** que reparten la carga entre departamentos |
| 2 | El cuadro completo circulaba por **WhatsApp** | Los intervenidos se anticipaban al operativo | **Órdenes de servicio individuales**: cada funcionario recibe solo su asignación |
| 3 | Funcionarios con **jornadas de dieciséis horas**, patrullas en días consecutivos, accidentes de conductores por jornadas encadenadas | Riesgo físico sobre personas | **Reglas de descanso como bloqueos duros**, no recomendaciones |

El tercer problema **no estaba en el encargo original**. Es el que justifica la exigencia de
pruebas unitarias exhaustivas sobre `RangoHorario` y las tres políticas de descanso: un defecto
ahí no produce un error de sistema, produce una persona agotada al volante.

### 1.3 Los nueve formularios

Estructura verificada en la Hoja2 de `CUADRO_DE_COLORES.xlsx` y en `AnalisisRolesFormularios.txt`.
Los nueve comparten la **misma cabecera de nueve columnas**; lo que varía es el contenido de sus
catálogos, su propiedad departamental y su política de vehículo.

| # | Formulario | Código | Color | Rol dueño | Política vehículo | Cond. nocturno | Prefijos |
|---|---|---|---|---|---|:---:|---|
| 1 | Operativos de Control Fijos | `FIJOS` | `#A2C4C9` Verde azulado | `DMIP_OPERATIVOS` | `NO_APLICA` | No | `OCF` |
| 2 | Control de Punto de Mando Operativo (PMO) | `PMO` | `#FCE5CD` Naranja claro | `DMIP_OPERATIVOS` | `CONDICIONAL` | **Sí** | `OCPMO`, `OCAPMO` |
| 3 | Operativos de Control Limpiaparabrisas | `LIMPIA` | `#B4C6E7` Azul | `DMIP_OPERATIVOS` | `NO_APLICA` | No | `OCL` |
| 4 | Patrulla ECU Diurna | `ECU` | `#D9D9D9` Gris | `DMIP_OPERATIVOS` | `REQUERIDO` | No | `OCECU` |
| 5 | Patrulla Reacción Diurna (UIG-UIT) | `REACD` | `#FFCCCC` Rosado | `DMIP_INSPECCIONES` | `REQUERIDO` | **Sí** | `IGECU`, `ITECU` |
| 6 | Patrulla Reacción Nocturna | `REACN` | `#F4CCCC` Rojo claro | `DMIP_INSPECCIONES` **+ cupo `DMIT_INSTRUCTOR`** | `REQUERIDO` | **Sí** | `ICNECU`, `IGNECU`, `ITNECU` |
| 7 | Operativo DMIT | `DMIT` | `#FCE4D6` Naranja fuerte | `DMIT_INSTRUCTOR` | `REQUERIDO` | **Sí** | `OC`, `IC`, `OCA`, `ICA` |
| 8 | Inspecciones Técnicas y Generales | `INSP` | `#CCCCFF` Morado | `DMIP_INSPECCIONES` | `OBLIGATORIO`* | No | `IG`, `IT`, `IGA`, `ITA` |
| 9 | Operativo de Control AMC-CBQ | `CBQ` | `#D9EAD3` Verde pastel | `DMIT_INSTRUCTOR` | `NO_APLICA` | **Contradictorio** | `OCB` |

\* Discrepancia entre el insumo y FASE2. Ver D-06.

**El formulario 6 es el único con rol compartido**: `DMIT_INSTRUCTOR` puede asignar personal de
Instrucción dentro de un cupo (PER-06), pero nada más. El cupo exacto sigue pendiente (PV-09).

### 1.4 Ciclo de una jornada

```
Apertura del cuadro (Administrador / automática)
        ↓  estado BORRADOR
Ventana departamental  ──  DMIP Operativos · DMIP Inspecciones · DMIT escriben EN PARALELO
        ↓  cierre 15H00 (parámetro HORA_CIERRE_DEPARTAMENTAL)
        ↓  estado EN_TRANSPORTE
Ventana DAF 15H00–16H30  ──  asigna SOLO conductor y vehículo, o declara propios medios
        ↓  estado APROBADO
Director revisa la Matriz Consolidada  →  cierra el cuadro
        ↓  estado CERRADO  ·  16H30 (parámetro HORA_LIMITE_CUADRO)
        ├── evento CuadroCerrado → consolida t_historial_jornada (alimenta descanso de mañana)
        └── habilita emisión de órdenes de servicio individuales
```

**La concurrencia es un requisito, no un accidente**: el PO describió que los departamentos
*"llenan las dos en paralelo, no primero la una ni la otra"*. Es la razón por la que el cuadro
diario **no contiene** a los operativos en el modelo de agregados (HAL-02).

### 1.5 Los seis roles

| Código | Rol | Escritura | Lectura |
|---|---|---|---|
| `DMIP_OPERATIVOS` | DMIP — Operativos | Formularios 1, 2, 3, 4 | Solo sus filas |
| `DMIP_INSPECCIONES` | DMIP — Inspecciones Técnicas y Generales | Formularios 5, 6, 8 | Solo sus filas |
| `DMIT_INSTRUCTOR` | DMIT — Instrucción | Formularios 7, 9 + cupo en 6 | Solo sus filas |
| `DAF` | DAF — Transportes | **Únicamente `conductorId` y `vehiculoId`** en los nueve | Los nueve formularios |
| `DIRECTOR` | Dirección | Ninguna sobre la planificación | **Único con la matriz completa.** Exporta PDF y emite órdenes |
| `ADMINISTRADOR` | Administrador del sistema | Catálogos, personal, ventanas, parámetros | Todo |

Existe además el **funcionario de campo**, que no es rol de escritura: solo consulta sus propias
órdenes de servicio (P-06).

---

## 2. ARQUITECTURA DEL BACKEND

### 2.1 Stack objetivo

| Capa | Tecnología |
|---|---|
| Framework | NestJS 11 · TypeScript estricto |
| Acceso a datos | **Prisma ORM** (`prisma` + `@prisma/client`, aún no instalados) |
| Base de datos | PostgreSQL 18, instancia propia, base `transportedb` |
| Validación | `class-validator` + `class-transformer` (ya presentes) |
| Contenedor | Docker multietapa · puerto **3003** |
| Zona horaria | `America/Guayaquil` — **crítica**: las ventanas de carga dependen de ella |

**Prohibido:** `typeorm`, `@nestjs/typeorm`, `dataSource.query`, funciones almacenadas `fu_*`,
`$queryRawUnsafe`, y cualquier dependencia fuera del stack sin autorización previa.

### 2.2 Seis submódulos, uno por contexto delimitado

La correspondencia contexto ↔ módulo es deliberada: si mañana un contexto debe extraerse a un
microservicio propio, la frontera ya está trazada.

| Contexto | Módulo | Servicios | Policies / Domain |
|---|---|---|---|
| CTX-05 Configuración Institucional | `configuracion` | `FormulariosService`, `CatalogosService`, `VentanaCargaService`, `ParametroPoliticaService` | `EvaluadorVentanaCarga` (POL-05) |
| CTX-03 Talento Operativo | `talento-operativo` | `FuncionariosService`, `DisponibilidadService`, `HistorialJornadaService`, `ElegibilidadService` | **`DescansoPersonalPolicy` (POL-01)** |
| CTX-01 Planificación (jornada) | `cuadro-diario` | `CuadroDiarioService` | — |
| CTX-01 Planificación (núcleo) | `operativos` | `OperativosService`, `GeneradorIdentificadorService`, `CalculadorAlertasService` | `ExclusividadHorariaPolicy` (POL-03) · `RangoHorario`, `IdentificadorOperativo`, `EstadoTransporte`, `UbicacionOperativa` |
| CTX-02 Asignación Logística | `transporte` | `TransporteService`, `CapacidadFlotaService` | `DescansoConductorPolicy` (POL-02) |
| CTX-04 Emisión Documental | `documentos` | `MatrizConsolidadaService`, `OrdenServicioService` | `DatoAisladoBuilder` (POL-09) |

### 2.3 Cuatro capas por submódulo

```
src/modules/<submodulo>/
├── presentation/     Controllers + DTO.  Sin reglas de negocio, sin Prisma
├── application/      Services y policies. Sin HTTP, sin Prisma directo
├── domain/           Objetos de valor con comportamiento. Sin dependencias externas
└── infrastructure/   Repositories. ÚNICO punto que toca PrismaService
```

La carpeta `domain/` es una **extensión aditiva** al patrón de tres capas del estándar
institucional (decisión DA-04), justificada porque los objetos de valor con comportamiento no son
ni orquestación ni acceso a datos.

### 2.4 Comunicación entre submódulos

Regla dura: **solo por servicios publicados**. Está prohibido que un módulo importe el repositorio
de otro.

| Origen | Destino | Servicio | Qué se transfiere |
|---|---|---|---|
| `operativos` | `talento-operativo` | `ElegibilidadService.verificar()` | **Veredicto y motivo**, nunca los datos del funcionario |
| `operativos` | `configuracion` | `FormulariosService.obtenerDefinicion()` | Áreas admitidas, política de vehículo, condicionante |
| `transporte` | `operativos` | `OperativosService.asignarTransporte()` | Operación explícita de dominio |
| `transporte` | `talento-operativo` | `ElegibilidadService.verificarConductor()` | Veredicto |
| `documentos` | `operativos`, `transporte` | Servicios de consulta | Datos consolidados de solo lectura |
| Todos | `cuadro-diario` | `CuadroDiarioService.puedeEscribir()` | Estado del cuadro |

**Por qué el veredicto y no los datos:** si `operativos` recibiera el tipo de contrato, el
historial y las ausencias, terminaría implementando las reglas de descanso por su cuenta y estas
se duplicarían en cada punto de captura. Es el hallazgo HAL-03, la decisión de mayor alcance del
análisis de dominio.

### 2.5 Capa transversal (`src/common/`)

| Elemento | Estado actual | Acción |
|---|---|---|
| `auth/guards/roles.guard.ts` | **Existe y es reutilizable** | Reutilizar tal cual |
| `auth/decorators/roles.decorator.ts` | **Existe** | Reutilizar |
| `auth/guards/identidad.guard.ts` | No existe | **Nuevo.** Único punto provisional del sistema |
| `auth/guards/formulario-rol.guard.ts` | No existe | **Nuevo** |
| `auth/guards/ventana-carga.guard.ts` | No existe | **Nuevo** |
| `errors/application.error.ts` | **Existe** (mensaje, statusCode, code, details) | Base de la jerarquía nueva |
| `errors/regla-negocio.error.ts` · `ventana-cerrada.error.ts` · `autorizacion.error.ts` | No existen | **Nuevos** (409 · 423 · 403) |
| `filters/http-exception.filter.ts` | **Existe**, formato `{statusCode, message, timestamp, path}` | **Extender** al formato §11.2 |
| `interceptors/` (correlación, logging, auditoría) | No existen | **Nuevos** |
| `logger/logger.service.ts` | No existe | **Nuevo** |
| `prisma/prisma.module.ts` + `prisma.service.ts` | No existen | **Nuevos**, módulo `@Global()` |

### 2.6 API REST

Base `/api/v1`, JSON, campos `camelCase`, fechas ISO 8601 con zona, horas `HH:MM` en intervalos
de treinta minutos, cabecera `x-correlation-id` propagada.

| Grupo | Endpoints | Nota |
|---|---|---|
| Cuadro diario | `POST /cuadros` · `GET /cuadros/:fecha` · `POST /cuadros/:fecha/cerrar` · `POST /cuadros/:fecha/reabrir` | Cierre y reapertura solo `DIRECTOR` |
| Operativos | `GET`/`POST` `/operativos` · `GET`/`PATCH`/`DELETE` `/operativos/:id` · `POST`/`DELETE` `/operativos/:id/personal[/:funcionarioId]` · `POST /operativos/:id/apoyo` | Cadena completa de cuatro guardas en escritura |
| Transporte | `GET /transporte/pendientes/:fecha` · `PATCH /transporte/operativos/:id` · `PATCH /transporte/operativos/:id/propios-medios` · `GET`/`PUT` `/transporte/capacidad/:fecha` | **Ruta separada con `@Roles(DAF)`** |
| Documentos | `GET /matriz/:fecha` · `GET /matriz/:fecha/exportar` · `POST /operativos/:id/ordenes-servicio` · `GET /ordenes-servicio/mias` | Matriz y emisión **solo `DIRECTOR`** |
| Configuración | `/formularios/permitidos` · `/formularios/:codigo/catalogos` · `/zonales` · `/formularios/:codigo/zonales/:zonalId/puntos` · `/personal/elegible` · `/ventanas/estado` · `/parametros` · `/administracion/*` | Parámetros y administración solo `ADMINISTRADOR` |

### 2.7 Contrato más sensible del sistema

```ts
export class ActualizarTransporteDto {
  @IsInt({ message: "Debe seleccionar un conductor." })  conductorId: number;
  @IsInt({ message: "Debe seleccionar un vehículo." })   vehiculoId: number;
}
```

**Exactamente dos propiedades.** Con `forbidNonWhitelisted: true` (ya configurado en `main.ts`),
cualquier campo adicional produce `400 CAMPOS_NO_PERMITIDOS` con la lista de campos rechazados.
La restricción de la DAF se aplica en **cuatro niveles independientes**: ruta, contrato, pipe de
validación y servicio.

---

## 3. ARQUITECTURA DEL FRONTEND

### 3.1 Stack objetivo

React 19.2 · Vite 7.3 · TypeScript 5.9 · Tailwind 4.2 + daisyUI 5.5 · react-router-dom 7.13 ·
Formik + Yup · `@tanstack/react-table` 8.21 · date-fns · FontAwesome · **react-pdf 10.4 (a
instalar)**. Puerto **5176**, API en **3003**.

**HTTP exclusivamente por `src/api/httpClient.ts`.** Nunca `axios` directo.

### 3.2 Organización por responsabilidad

| Carpeta | Contenido | Estado |
|---|---|---|
| `api/` | `httpClient.ts`, `correlationId.ts` | **Existe.** Se usa tal cual |
| `components/common/` | Alert, Boton, Loading, ModalConfirmacion, ModalExito, Paginacion, Collapse, Iconos, RutaProtegida… | **Existe.** Se reutiliza sin modificar |
| `components/forms/` | `FormikField.tsx`: TextInput, NumberInput, SelectInput, TextAreaInput, Checkbox, Radio | **Existe.** Se reutiliza |
| `components/tabla/` | Table, FilterByColumn, RowActions, RowActionMenu, ActionButton | **Existe.** Se reutiliza |
| `components/navbar/` | Navbar, Sidebar, SelectorRolPruebas, MenuDropdown, AlertList | **Existe.** Se extiende |
| `components/cuadro/` | Diez componentes del módulo | **A crear** |
| `config/` | routes, navigation, env, usuariosPrueba, validationSchemas | **Existe.** Se extiende |
| `context/` `providers/` | UserContext, ModalContext, ThemeContext | **Existe.** Ver H-07 |
| `hooks/` | useCuadroDiario, useFormulariosPermitidos, useCatalogosFormulario, useVentanaCarga | **A crear** |
| `interfaces/` | Operativo, Formulario, CuadroDiario, Personal, Transporte, Alerta | **A crear** |
| `layouts/` | MainLayout, LoginLayout | **Existe.** Se reutiliza |
| `pages/` | Nueve pantallas del módulo | **A crear** |
| `services/` | Seis servicios sobre `httpClient` | **A crear** |
| `styles/` | Tokens y hojas del sistema visual | **Existe.** No se altera |
| `utils/` | `horario.util.ts` — espejo de `RangoHorario`, **solo para experiencia de usuario** | **A crear** |

### 3.3 Las nueve pantallas

| # | Pantalla | Ruta declarada | Perfiles | Prototipo |
|---|---|---|---|---|
| 1 | Registro de operativo | `/cuadro/registro` | DMIP Op., DMIP Insp., DMIT | `#p01` |
| 2 | Mis operativos | `/cuadro/mis-operativos` | Ídem | `#p02` |
| 3 | Asignación de transporte | `/cuadro/transporte` | DAF | `#p03` |
| 4 | Matriz Consolidada del Día | `/cuadro/matriz` | **Solo Director** | `#p04` |
| 5 | Órdenes de servicio | `/cuadro/ordenes` | **Solo Director** | `#p05` |
| 6 | Mis órdenes | `/mis-ordenes` | Funcionario | `#p06` |
| 7 | Personal y disponibilidad | `/administracion/personal` | Administrador | `#p07` |
| 8 | Catálogos del cuadro | `/administracion/catalogos-cuadro` | Administrador | `#p08` |
| 9 | Ventanas y parámetros | `/administracion/ventanas` | Administrador | `#p09` |

El prototipo aprobado `docs/PROTOTIPO-sigoc-cuadro-colores.html` **contiene las nueve secciones
navegables** (`#p01` … `#p09`), verificadas una a una.

### 3.4 Composición por perfil, no por ocultamiento

Decisión de diseño explícita: **se monta un árbol de componentes distinto según el rol**. Un
perfil no autorizado **no tiene el componente en memoria**; no se trata de deshabilitar controles.
La navegación sí muestra atenuados los ítems ajenos (PER-07), para que el usuario comprenda que
existen y no le corresponden.

### 3.5 Sistema visual

**Ninguna clase CSS nueva.** El inventario permitido está verificado en `FASE5` §2.2 y replicado
en la skill `pantallas-cuadro`. Se comprobó que las clases citadas existen realmente en el
proyecto (`app-page-shell`, `page-heading-kicker`, `app-modules-panel`, `app-section-header`,
`app-data-panel-body`, `max-w-5/6`, entre otras).

Tema daisyUI en `src/index.css`, doble tema claro/oscuro, **no se altera**:

| Token | Claro | Oscuro |
|---|---|---|
| `primary` | `#1b77bb` | `#1b77bb` |
| `secondary` | `#20347d` | `#20347d` |
| `accent` | `#3744d0` | `#3744d0` |
| `warning` | `#f48a42` | `#f48a42` |
| `error` | `#cb1f03` | `#ea3446` |

**Única excepción admitida:** los nueve colores de banner del cuadro, que son **datos
institucionales entregados por el backend** y se aplican con `style` en línea sobre la fila de
banner. El frontend no los define ni los interpreta (decisión DA-12).

---

## 4. INVENTARIO DE MÓDULOS EXISTENTES

### 4.1 Backend — los quince módulos presentes son **todos del sistema de Instrucción**

`src/app.module.ts` importa hoy dieciséis módulos, ninguno del Cuadro de Colores:

| Módulo | Pertenencia | Trato según el kit |
|---|---|---|
| `gestion-documental` | Instrucción | Legado — retirar del arranque |
| `expediente-instruccion` | Instrucción | Legado — retirar |
| `documento-generico` | Instrucción | Legado — retirar |
| `apertura-pruebas` | Instrucción | Legado — retirar |
| `asignaciones` | Instrucción | Legado — retirar |
| `administracion-roles` | Instrucción | Legado — retirar |
| `excusas` | Instrucción | Legado (no listado explícitamente) — retirar |
| `core-cases` | Instrucción | Legado — retirar |
| `catalogos` | Instrucción | Legado — retirar |
| `tipos-documento` | Instrucción | Legado — retirar |
| `documento-dinamico` | Instrucción | Legado — retirar |
| `reglas-acciones` | Instrucción | Legado — retirar |
| `dashboard` | Instrucción | Legado — retirar |
| `notificaciones` | Instrucción | Legado — retirar |
| `DatabaseModule` (TypeORM) | Infraestructura legada | **Retirar del módulo raíz** |
| `AuthModule` (`common/auth`) | Transversal | **Conservar y extender** |

> **Nota.** `00-LEEME.md` §3.1 solo nombra seis módulos a eliminar. Existen **catorce** módulos de
> negocio del legado. Los ocho restantes (`excusas`, `core-cases`, `catalogos`, `tipos-documento`,
> `documento-dinamico`, `reglas-acciones`, `dashboard`, `notificaciones`) **no están cubiertos por
> la instrucción de limpieza**, pero todos dependen de `DataSource` de TypeORM y por tanto caen
> igualmente al retirar `DatabaseModule`. Debe decidirse su trato explícitamente (§14, Q-02).

### 4.2 Backend — módulos del Cuadro de Colores

**Ninguno existe.** Los seis (`configuracion`, `talento-operativo`, `cuadro-diario`, `operativos`,
`transporte`, `documentos`) se construyen desde cero, en el orden E3 → E8.

### 4.3 Frontend — páginas y servicios presentes

Veinte páginas y diecisiete servicios, **todos del sistema de Instrucción**:

| Tipo | Elementos legados |
|---|---|
| Páginas | Registro, ListosAsignar, MotorSorteo, SorteadosAsignados, BandejaDirector, Sustanciacion, Dictamen, DocumentosGenerados, DocumentosGeneradosDirector, DashboardIndicadores, GestionNotificaciones, GestionExcusas, BandejaReasignaciones, DirectorDevoluciones, DirectorExpedientesDocumentacion, DirectorSalida, AdminPermisos, AdminCatalogos, AdminTiposDocumento, AdminReglasAcciones, Login |
| Servicios | Case, Expediente, Excusa, Devolucion, Assignment, CoreCases, Dashboard, DocumentoDinamico, GenerarDocumentosPlantilla, Notificaciones, ReglaAccion, Role, TipoDocumento, User, Auth, Alert, Catalogo |
| Modales | Trece modales de expediente, sorteo, dictamen y excusas |
| Interfaces | Case, Expediente, Catalogo, Dashboard, Notificacion, Role, User, Alert, Collapse, Modal |
| `services/Api.ts` | **Cliente `axios` directo** — patrón prohibido por el kit |

**Ninguna página, servicio o interfaz del Cuadro de Colores existe todavía.**

---

## 5. COMPONENTES REUTILIZABLES

Verificados uno a uno en el árbol de archivos. Son el activo más valioso del repositorio actual y
**se reutilizan sin modificar**.

### 5.1 Frontend — inventario confirmado

| Componente | Ruta | Uso en el módulo nuevo |
|---|---|---|
| `Table` | `components/tabla/Table.tsx` | Los cinco listados: mis operativos, bandeja DAF, matriz, personal, catálogos. Genérico `<T>` con TanStack Table, paginación, filtros y acciones por fila |
| `FilterByColumn` | `components/tabla/FilterByColumn.tsx` | Fila de filtros por columna |
| `RowActions` / `RowActionMenu` / `ActionButton` | `components/tabla/` | Acciones por fila (editar, retirar, emitir orden) |
| `TextInput`, `NumberInput`, `SelectInput`, `TextAreaInput`, `CheckboxInput`, `RadioInput` | `components/forms/FormikField.tsx` | **Todos** los campos del formulario de registro. Ya aportan etiqueta, marca de obligatorio, `input-error` y mensaje |
| `Boton` | `components/common/Boton.tsx` | Botones con icono y contador |
| `Alert` | `components/common/Alert.tsx` | Avisos de resultado |
| `Loading` | `components/common/Loading.tsx` | Estado de carga |
| `ModalConfirmacion` | `components/common/ModalConfirmacion.tsx` | M-01 · confirmación de retiro de operativo |
| `ModalExito` | `components/common/ModalExito.tsx` | M-03 · confirmación de registro |
| `ModalContainer` | `components/modals/ModalContainer.tsx` | Envoltorio de modales (**ver D-03**) |
| `Paginacion` | `components/common/Paginacion.tsx` | Paginación de listados |
| `Collapse` | `components/common/Collapse.tsx` | Secciones plegables |
| `Iconos` | `components/common/Iconos.tsx` | Catálogo FontAwesome |
| `RutaProtegida` | `components/common/RutaProtegida.tsx` | Protección de rutas por rol |
| `SelectorRolPruebas` | `components/navbar/SelectorRolPruebas.tsx` | Cambio de perfil provisional |
| `Navbar`, `Sidebar`, `MenuDropdown` | `components/navbar/` | Armazón heredado |
| `MainLayout`, `LoginLayout` | `layouts/` | Armazón de página |

### 5.2 Frontend — infraestructura reutilizable

| Elemento | Estado | Observación |
|---|---|---|
| `api/httpClient.ts` | Reutilizable | Base `env.apiBaseUrl`, timeout 5 s, normalización de errores. **La inyección del `x-correlation-id` está comentada** — ver H-08 |
| `api/correlationId.ts` | Reutilizable | `CORRELATION_ID_HEADER` y `createCorrelationId()` listos |
| `context/UserContext.tsx` | Reutilizable con ajuste | Ver H-07 |
| `context/ThemeContext.tsx` + `providers/ThemeProvider.tsx` | Reutilizable | Doble tema |
| `context/ModalContext.tsx` + `providers/ModalProvider.tsx` | Reutilizable | |
| `config/validationSchemas.ts` | Se extiende | Esquemas Yup del módulo |
| `config/env.ts` | Se extiende | `estadoBadgeMap`, `colorEstado`, `rolUser` |
| `utils/datetime.util.ts` | Reutilizable | |
| `styles/` completo | Reutilizable | 17 hojas del sistema visual, tokens y doble tema |

### 5.3 Backend — piezas reutilizables

| Elemento | Estado |
|---|---|
| `common/auth/guards/roles.guard.ts` | **Reutilizable tal cual.** Lee `@Roles()` y `@Permissions()` desde el `Reflector` sobre `request.user` |
| `common/auth/decorators/roles.decorator.ts` | **Reutilizable** |
| `common/errors/application.error.ts` | **Base de la jerarquía**: ya expone `message`, `statusCode`, `code`, `details` |
| `common/filters/http-exception.filter.ts` | **Se extiende** al formato uniforme del apartado §11.2 de la guía |
| `main.ts` · `ValidationPipe` global | **Ya configurado** con `whitelist`, `forbidNonWhitelisted` y `transform` — exactamente lo que exige el contrato de la DAF |
| `main.ts` · CORS con lista blanca `CORS_ORIGINS` | **Reutilizable** |
| `Dockerfile` multietapa, usuario no privilegiado, `dumb-init` | **Base a adaptar** (§14, Q-08) |

---

## 6. PATRONES DE DISEÑO IDENTIFICADOS

### 6.1 Patrones de dominio (DDD táctico)

| Patrón | Aplicación en el proyecto |
|---|---|
| **Contextos delimitados** | Seis, con mapa de relaciones explícito: Conformista (CTX-05→CTX-01), Proveedor/Cliente (CTX-03→CTX-01), Capa anticorrupción (CTX-06→todos) |
| **Agregado** | Diez. El Operativo concentra la complejidad. **El Cuadro Diario deliberadamente no contiene a los operativos** (HAL-02), para no convertir la colaboración en contención |
| **Objeto de valor** | Veinticinco. `RangoHorario` es el más rentable: absorbe RN-07, RN-28 y RN-43 en un solo lugar |
| **Servicio de dominio publicado** | `ElegibilidadService.verificar()` devuelve `{ elegible, codigo, motivo }`. **Nunca datos del funcionario** |
| **Política como clase propia** | Nueve políticas (POL-01…POL-09), no métodos privados de un servicio. Se prueban por separado |
| **Evento de dominio** | Dieciséis. Emisor en proceso de NestJS, sin cola de mensajes (DA-05). **Se emiten después de confirmar la transacción**, nunca dentro |
| **Proyección persistida** | `t_historial_jornada` es conceptualmente derivada de los cuadros cerrados, pero se materializa para no recorrer el histórico en cada validación |
| **Objeto cerrado por construcción** | `DatoAisladoBuilder` produce un objeto de cuatro campos sin referencia al operativo. Convierte una regla de disciplina en garantía estructural (HAL-04) |
| **Máquina de estados explícita** | `EstadoCuadro` (4 estados) y `EstadoTransporte` (3 estados excluyentes, HAL-01) con transiciones válidas propias |
| **Dualidad catalogado/capturado** | Un patrón único aplicado dos veces: punto de encuentro y tipo de control (HAL-05) |

### 6.2 Patrones de arquitectura

| Patrón | Aplicación |
|---|---|
| **Arquitectura por capas** | Cuatro capas por submódulo, con dirección de dependencia estricta |
| **Repositorio** | Único punto que toca `PrismaService`. Los servicios no conocen Prisma |
| **Cadena de responsabilidad** | Cuatro guardas encadenadas, cada una con su propio código de estado (DA-07) |
| **Interceptor** | Correlación, logging y auditoría como aspectos transversales |
| **Bloqueo optimista** | Columna `oper_version`; `where: { id, version }` y `version: { increment: 1 }`. Conteo cero → `CONFLICTO_CONCURRENCIA` (DA-06) |
| **Reintento acotado** | Generación del secuencial diario: hasta tres intentos ante colisión de `uq_operativo_cuad_form_sec` |
| **Modo conmutable** | `IdentidadGuard` con modo provisional / modo JWT. La integración final toca **un archivo** (DA-11) |
| **Configuración externalizada** | Ocho parámetros de política en base de datos, con caché en memoria e invalidación al modificarse |

### 6.3 Patrones de frontend

| Patrón | Aplicación |
|---|---|
| **Composición condicional por rol** | Árbol de componentes distinto por perfil, no ocultamiento de controles |
| **Cliente HTTP centralizado** | Un solo punto de correlación y normalización de errores |
| **Servicio por dominio** | Seis servicios, uno por dominio, todos sobre `httpClient` |
| **Hook de consulta** | Cuatro hooks propios encapsulan carga, error y recarga silenciosa |
| **Componente controlado por Formik** | Todos los campos vía `FormikField`, con Yup en `config/validationSchemas.ts` |
| **Tabla genérica parametrizada** | `Table<T>` con columnas, filtros y resolución de acciones por fila |
| **Renderizado dirigido por datos del servidor** | El frontend **no calcula colores ni alertas**: los recibe |

---

## 7. ESTÁNDARES DE CODIFICACIÓN

### 7.1 Cabecera obligatoria por archivo

Verificada en **todos** los archivos existentes de ambos repositorios. Es la convención más
consistentemente aplicada del proyecto.

```ts
/**
 * Microservicio: transporte
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativos
 * Archivo: operativos.service.ts
 * Responsabilidad: Orquestar el registro, edición y consulta de operativos.
 * Desarrollador: <nombre real, NUNCA Claude>
 * Fecha: <AAAA-MM-DD>
 */
```

### 7.2 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo backend | `kebab-case.tipo.ts` | `operativos.service.ts`, `crear-operativo.dto.ts` |
| Archivo frontend | `PascalCase.tsx` componentes · `camelCase.ts` el resto | `FormularioOperativo.tsx`, `horario.util.ts` |
| Clase | `PascalCase` | `OperativosService` |
| Método y variable | `camelCase` **en español** | `registrarOperativo`, `alertaActiva` |
| Constante | `UPPER_SNAKE_CASE` | `TOPE_SALIDAS_PESADAS_DEFECTO` |
| Tabla | `t_` + singular | `t_operativo` |
| Columna | prefijo de tabla + nombre | `oper_hora_inicio` |
| Enumerado en base | `e_` + nombre | `e_estado_transporte` |
| Índice · único · verificación · foránea | `idx_` · `uq_` · `ck_` · `fk_` | `ck_operativo_transporte` |
| Modelo Prisma | `PascalCase` con `@map`/`@@map` | `model Operativo { … @@map("t_operativo") }` |
| Ruta REST | plural en español | `/api/v1/operativos` |
| Campo JSON | `camelCase` | `estadoTransporte` |

### 7.3 Idioma

Español en nombres de métodos, variables, comentarios, mensajes de error y textos de interfaz.
Inglés únicamente donde lo impone el framework.

### 7.4 Imports

- **Frontend: extensión explícita obligatoria** (`import { X } from "./modulo.ts"`). Vite lo exige
  en este proyecto.
- **Backend: sin extensión**, como el estándar existente.

### 7.5 Prohibiciones expresas

1. No instalar dependencias fuera del stack sin avisar. Excepciones ya autorizadas: `prisma`,
   `@prisma/client`, `react-pdf`.
2. **No usar `any`.** Tipar con interfaces y DTO.
3. No dejar código muerto, variables sin usar ni `console.log` de depuración.
4. **No atribuir commits a Claude ni a ninguna IA.** Sin `Co-authored-by`, sin «Generated with».
5. No usar `axios` directamente en el frontend; solo `httpClient`.
6. No escribir lógica de negocio en controladores ni en repositorios.
7. **No introducir clases CSS nuevas** en el frontend.
8. No subir `.claude/settings.local.json`, `.env`, `dist/`, `node_modules/`, ni temporales.

### 7.6 Trazabilidad obligatoria

Toda validación, guarda o regla lleva en su comentario el identificador de la regla que la origina
y su fuente documental. Es requisito, no recomendación.

```ts
/**
 * RN-24 · Quien salió en patrulla un día no puede ser asignado a patrulla
 * al día siguiente, ni diurna ni nocturna.
 * Fuente: docs/FASE2-documentacion-funcional.md §8.4
 */
```

### 7.7 Commits

Convencionales, cortos, en español, una línea, imperativo, sin relleno ni atribución a
herramientas: `feat: agrega politica de descanso de personal`.

### 7.8 Umbrales: parámetros, nunca constantes

```ts
// MAL
if (horas > 12) { … }

// BIEN
const limite = await this.parametros.obtenerDecimal("JORNADA_MAXIMA_HORAS");
if (horas > limite) { … }
```

---

## 8. FLUJO DE AUTENTICACIÓN Y AUTORIZACIÓN

### 8.1 La separación que sostiene el diseño

El microservicio de identidad contra **Active Directory está en desarrollo en otro proyecto**. El
diseño separa dos responsabilidades que suelen confundirse:

- **Autenticación** — *quién es el usuario*: se reduce a un único punto, cómo se llena
  `request.user`. Es lo provisional.
- **Autorización** — *qué puede hacer*: se construye **completa desde ahora**, porque ahí vive la
  lógica de negocio.

```
HOY                                          MAÑANA
SelectorRolPruebas                           Token del microservicio AD
  → cabecera x-usuario-prueba                  → Authorization: Bearer
  → IdentidadGuard (modo provisional)          → IdentidadGuard (modo JWT)
  → request.user                               → request.user
                    ↓                                          ↓
        ┌───────────────────────────────────────────────────────┐
        │  RolesGuard → FormularioRolGuard → VentanaCargaGuard   │
        │              SIN NINGÚN CAMBIO                        │
        └───────────────────────────────────────────────────────┘
```

### 8.2 Cadena de autorización y orden de evaluación

```
Identidad → Rol → Formulario → Ventana → DTO → Elegibilidad → Exclusividad → Persistencia
   401       403      403        423      400       409           409
```

| Guarda | Pregunta que responde | Fuente de verdad | Error |
|---|---|---|---|
| `IdentidadGuard` | ¿Quién realiza la petición? | Token, o cabecera provisional **solo si `MODO_IDENTIDAD_PROVISIONAL=true`** | 401 |
| `RolesGuard` | ¿El rol figura entre los autorizados? | Decorador `@Roles()` | 403 `ROL_NO_AUTORIZADO` |
| `FormularioRolGuard` | ¿El formulario pertenece a este rol? | **Tabla `t_formulario`**, nunca el cuerpo de la petición | 403 `FORMULARIO_NO_AUTORIZADO` |
| `VentanaCargaGuard` | ¿Puede escribir en este momento? | `t_ventana_carga`, evaluada en `America/Guayaquil` | 423 `VENTANA_CARGA_CERRADA` |

### 8.3 El cupo compartido del formulario 6

Es el único caso donde un rol escribe en formulario ajeno. **No puede resolverse en una guarda**,
porque depende del contenido: qué área tiene la persona que se pretende asignar y cuántas lleva
ese rol en el operativo. Se resuelve en la capa de aplicación, con la definición del formulario
como fuente. → `409 CUPO_COMPARTIDO_SUPERADO`.

### 8.4 Reglas de seguridad no negociables

1. La autorización se verifica **en el servidor**, con independencia de lo que muestre la interfaz.
2. Los datos de operativos ajenos **no se transmiten**: el filtrado ocurre en la consulta, no en el
   cliente.
3. `GET /ordenes-servicio/mias` filtra **por la identidad del servidor**, nunca por parámetro de la
   petición.
4. **Nunca en logs**: teléfonos, cédulas, contenido de órdenes de servicio, tokens.
5. `MODO_IDENTIDAD_PROVISIONAL` en **falso por defecto**; el arranque debe advertir en consola si
   está activo.
6. Prisma parametriza toda consulta. Prohibida la interpolación de cadenas.

### 8.5 Plan de integración final (E12)

| Paso | Alcance |
|---|---|
| Implementar el modo JWT del `IdentidadGuard` | Un archivo |
| Mapear reclamaciones del token a `UsuarioAutenticado` | Un archivo |
| Registrar el resolutor de token en `httpClient` | **Ya previsto y comentado** en el código actual |
| Retirar `SelectorRolPruebas` y `usuariosPrueba` | Dos archivos |
| Desactivar `MODO_IDENTIDAD_PROVISIONAL` | Configuración |

Ninguno toca servicios, políticas ni repositorios.

---

## 9. FLUJO DE NAVEGACIÓN

### 9.1 Mecánica actual, verificada en el código

```
main.tsx → AppProviders (UserProvider, ThemeProvider, ModalProvider)
         → RouterProvider(routes)
              ├── "/"      → LoginLayout
              └── "/home"  → MainLayout   ← armazón: Navbar + Sidebar + Outlet
                       └── children: una entrada por pantalla
```

- **`config/routes.tsx`** declara las rutas con **carga diferida** (`lazy` + `Suspense` con
  `<Loading/>`). Las rutas sensibles se envuelven en `<RutaProtegida rolesPermitidos={[…]}>`.
- **`config/navigation.ts`** declara `shellNavigationItems`: árbol de dos niveles con `id`,
  `label`, `path`, `icon`, `allowedRoles?: number[]`, `defaultOpen`. El `Sidebar` lo consume.
- **`RutaProtegida`** compara `user.rolCode` contra `rolesPermitidos` y, si no coincide, redirige.
- **`UserContext.cambiarUsuario()`** recorre `shellNavigationItems`, encuentra el **primer ítem de
  contenido permitido** para el rol nuevo y **recarga la página completa** hacia él, para que el
  menú y el contenido queden limpios.

### 9.2 Navegación objetivo del módulo

```
CUADRO DE COLORES
├── Registro de operativo      → DMIP_OPERATIVOS, DMIP_INSPECCIONES, DMIT_INSTRUCTOR
├── Mis operativos             → DMIP_OPERATIVOS, DMIP_INSPECCIONES, DMIT_INSTRUCTOR
├── Asignación de transporte   → DAF
├── Matriz Consolidada         → DIRECTOR
└── Órdenes de servicio        → DIRECTOR

ADMINISTRACIÓN
├── Personal y disponibilidad  → ADMINISTRADOR
├── Catálogos del cuadro       → ADMINISTRADOR
└── Ventanas de carga          → ADMINISTRADOR
```

Los ítems no autorizados se muestran **atenuados y bloqueados, no ocultos** (PER-07).

### 9.3 Flujo funcional por perfil

```
Ingreso → perfil resuelto por UserContext
   ├── DMIP Op. / DMIP Insp. / DMIT
   │      → P-01 Registro  ─ ¿ventana abierta?
   │           ├── No  → formulario bloqueado + alert-error con la hora de reapertura
   │           └── Sí  → captura → registro → fila añadida abajo con alerta amarilla
   │                      → P-02 Mis operativos (editar / retirar mientras la ventana siga abierta)
   ├── DAF → P-03 bandeja de pendientes → panel con TODO bloqueado salvo conductor y placa
   │           → asignar conductor (placa derivada del vehículo habitual) o propios medios
   │           → alerta retirada, la fila sale de pendientes
   ├── Director → P-04 Matriz Consolidada → revisar → cerrar cuadro
   │           → P-05 emisión de órdenes → una hoja por funcionario
   └── Administrador → P-07 · P-08 · P-09
Funcionario de campo → P-06 Mis órdenes (única pantalla pensada para móvil)
```

### 9.4 Conflicto de prefijo de ruta

`FASE4` y `FASE5` declaran las rutas como `/cuadro/registro`, `/administracion/personal`, etc.
El enrutador actual **anida todas las páginas bajo `/home`** (`MainLayout` está montado en
`/home`), y `navigation.ts` construye los destinos como `/home/${path}`. Ambas cosas no pueden ser
ciertas a la vez. → Decisión Q-06 en §14.

---

## 10. ARQUITECTURA DE BASE DE DATOS

### 10.1 Decisiones estructurales

| Decisión | Valor | Justificación |
|---|---|---|
| Motor | PostgreSQL 18 | Igual al legado, evita divergencia de versión |
| Instancia | **Propia e independiente** | Decisión del PO. Aísla respaldos, recursos y ciclos de mantenimiento |
| Base | `transportedb`, esquema `public` | Nueva, sin objetos heredados |
| Acceso | Prisma Client | Decisión del PO |
| Migraciones | `prisma/migrations/` | La carpeta `db/` del legado queda al margen |

### 10.2 Veintisiete tablas

| Grupo | Tablas |
|---|---|
| Configuración (12) | `t_formulario`, `t_formulario_prefijo`, `t_formulario_area`, `t_formulario_punto`, `t_formulario_tipo_control`, `t_formulario_institucion`, `t_zonal`, `t_punto_encuentro`, `t_tipo_control`, `t_institucion`, `t_ventana_carga`, **`t_parametro_politica`** |
| Talento (5) | `t_funcionario`, `t_conductor`, `t_vehiculo`, `t_disponibilidad`, `t_historial_jornada` |
| Planificación (6) | `t_cuadro_diario`, `t_operativo`, `t_asignacion_personal`, `t_operativo_zonal`, `t_operativo_institucion`, `t_solicitud_apoyo` |
| Logística (1) | `t_capacidad_flota` |
| Entregables (1) | `t_orden_servicio` |
| Transversal (2) | `t_auditoria`, `t_usuario` |

**Once enumerados**: `RolDepartamental`, `EstadoCuadro`, `EstadoTransporte`, `PoliticaVehiculo`,
`AreaPersonal`, `TipoContrato`, `EstadoDisponibilidad`, `TipoVentana`, `AccionAuditoria`,
`EstadoSolicitud`, **`TipoParametro`**.

### 10.3 Normalización y desnormalizaciones deliberadas

Se cumplen 1FN, 2FN, 3FN y Boyce-Codd. Dos correcciones notables sobre el diseño preliminar:

- Los arreglos `form_prefijos` y `form_areas_admitidas` se normalizaron a `t_formulario_prefijo` y
  `t_formulario_area`. **No es purismo**: el prefijo del identificador depende del área del
  personal asignado (formulario 8 usa `IG` o `IT`), dependencia que un arreglo plano no expresa.
- Se eliminaron cuatro dependencias transitivas: nombre del punto, color del banner, teléfono en la
  asignación (RN-34 exige que el teléfono viva solo en la persona) y conteo de operativos.

Cuatro desnormalizaciones **documentadas y justificadas**, para que una revisión posterior no las
corrija creyéndolas errores:

| # | Desnormalización | Justificación |
|---|---|---|
| 1 | Alertas en `JSONB` | Se leen siempre completas, nunca por campo. Se recalculan íntegramente |
| 2 | `oper_alerta_activa` redundante | Permite indexar y filtrar sin abrir el documento JSON |
| 3 | **Dato aislado congelado en `JSONB`** | **Decisión de dominio, no de rendimiento.** La orden refleja lo comunicado en el momento de la emisión, aunque el operativo cambie después |
| 4 | Atributos horarios derivados | `es_nocturno`, `cruza_medianoche`, `duracion_horas` intervienen en filtros frecuentes |

### 10.4 La restricción más valiosa

```sql
ck_operativo_transporte:
  estado = 'ASIGNADO'        ⇒ cond_id IS NOT NULL AND vehi_id IS NOT NULL
  estado IN ('PENDIENTE','PROPIOS_MEDIOS') ⇒ cond_id IS NULL AND vehi_id IS NULL
```

Traduce a garantía del motor el hallazgo HAL-01: con dos indicadores booleanos independientes la
base admitía combinaciones sin significado. **Nunca se elimina para simplificar una migración.**

En total: **22 restricciones de verificación**, **20 de unicidad** (incluido el índice único
**parcial** `uq_orden_vigente`, que permite reemitir órdenes conservando el histórico) y
**22 índices**, todos derivados de consultas identificadas en los casos de uso.

### 10.5 Lo que Prisma no expresa

Prisma no soporta `CHECK` ni índices parciales. Van en **migraciones manuales complementarias**:

| Migración | Contenido |
|---|---|
| `0001_esquema_inicial` | Generada por Prisma |
| `0002_agrega_restricciones_verificacion` | Las 22 restricciones `CHECK` |
| `0003_agrega_indices_parciales` | Los 6 índices parciales + el único parcial de órdenes vigentes |

> **Advertencia operativa.** Tras cada `prisma migrate dev` que regenere una tabla, hay que
> **verificar que siguen presentes**. Prisma no los detecta y puede perderlos.

### 10.6 Control de concurrencia

| Situación | Estrategia |
|---|---|
| Secuencial diario | Transacción + restricción única `uq_operativo_cuad_form_sec` + reintento hasta 3 veces |
| Edición simultánea del mismo operativo | Bloqueo optimista con `oper_version` |
| Mismo conductor en dos operativos | Verificación dentro de la transacción, respaldada por índice |
| Cierre del cuadro mientras se registra | Verificación del estado dentro de la transacción de escritura |

Se **descarta el bloqueo pesimista** sobre el cuadro: reintroduciría por vía técnica la contención
que el diseño de agregados evitó deliberadamente.

### 10.7 Volumetría proyectada

| Tabla | Crecimiento anual | Tratamiento |
|---|---|---|
| `t_operativo` | ~18.000 filas | Sin particionamiento |
| `t_asignacion_personal` | ~29.000 filas | Sin particionamiento |
| `t_orden_servicio` | ~29.000 filas | Sin particionamiento |
| `t_auditoria` | Alto, varias veces el resto | Candidata a particionamiento **si supera el millón de filas** |

---

## 11. AGENTES Y SKILLS DISPONIBLES

Ambos repositorios traen su propio contexto de Claude Code, ya instalado y verificado.

### 11.1 Nueve agentes

| Agente | Repo | Herramientas | Para qué |
|---|---|---|---|
| `prisma-transporte` | backend | Read, Edit, Write, Bash, Grep, Glob | Esquema, migraciones, semilla |
| `dominio-reglas` | backend | Read, Edit, Write, Bash, Grep, Glob | Objetos de valor y políticas, **con pruebas** |
| `nest-modulo` | backend | Read, Edit, Write, Bash, Grep, Glob | Submódulos en cuatro capas |
| `auditor-rbac` | backend | **Read, Grep, Glob** | Control de acceso. **Solo lectura** |
| `revisor-amc` | ambos | Read, Grep, Glob, Bash | Convenciones antes de commitear. **Solo lectura** |
| `qa-transporte` | backend | Read, Grep, Glob, Bash | Pruebas end-to-end no destructivas |
| `react-pantalla` | frontend | Read, Edit, Write, Bash, Grep, Glob | Las nueve pantallas |
| `auditor-ui` | frontend | **Read, Grep, Glob** | Clases y accesibilidad. **Solo lectura** |

Los **tres auditores no tienen `Write` ni `Edit`, deliberadamente**: un agente que encuentra y
corrige en el mismo paso deja sin rastro qué se corrigió.

### 11.2 Once skills

| Skill | Repo | Contenido |
|---|---|---|
| `stack-backend-amc` | backend | Cuatro capas, servicios publicados, parámetros, errores, guardas, transacciones |
| `prisma-amc` | backend | Nomenclatura, `CHECK` e índices parciales, secuencial diario, `include`, semilla idempotente |
| `reglas-descanso` | backend | **Las seis reglas en orden, los ocho casos de prueba de `RangoHorario`** |
| `docker-amc` | backend | Puertos, `prisma generate` en la etapa de construcción, variables, paquete de entrega |
| `codigo-limpio-amc` | ambos | Cabeceras, nomenclatura, commits sin atribución a IA, qué no subir |
| `flujo-git-amc` | ambos | Ramas desde `origin/main`, commits convencionales |
| `stack-frontend-amc` | frontend | Organización, `httpClient`, estado, manejo de errores por código HTTP |
| `pantallas-cuadro` | frontend | Inventario de clases, estados por pantalla, señales no cromáticas, accesibilidad |
| `diseno-sigoc` | frontend | Paleta Nueva Imagen 2025, Montserrat, mapeo al tema daisyUI |

**Ciclo de trabajo recomendado por etapa:** construir con el agente especializado → auditar con el
agente de solo lectura → verificar con los comandos de `IMPLEMENTATION_GUIDE.md` §18 y §19 →
confirmar con el responsable funcional.

---

## 12. ESTADO REAL DE LOS REPOSITORIOS · HALLAZGOS

Ordenados por severidad. Cada uno lleva una recomendación.

### H-01 · Los repositorios contienen íntegramente el sistema de Instrucción · **Crítico**

Ni un solo archivo del Cuadro de Colores existe. El backend importa dieciséis módulos, ninguno del
módulo nuevo; el frontend tiene veinte páginas y diecisiete servicios, todos del legado.
`app.config.ts` apunta a la base `amcInstruccion` y a la API del CORE de Instrucción.

> **Recomendación.** Ejecutar la limpieza como **etapa E0 formal, con lista de conservación
> explícita** (apartado §15), no como paso previo informal.

### H-02 · `origin/main` está vacío y todo el código está sin versionar · **Crítico**

```
transporte-backend  → 1aabdcd "Initial commit"  ·  único archivo versionado: README.md
transporte-frontend → 8d4bc22 "Initial commit"  ·  único archivo versionado: README.md
```

Todo lo demás aparece como **no rastreado** (`??`). El procedimiento de `00-LEEME.md` §3.1
(`git checkout -b limpieza/retiro-legado origin/main` seguido de `rm -rf …`) **no funciona como
está escrito**: al partir de `origin/main` el árbol quedaría prácticamente vacío y los archivos no
rastreados seguirían presentes, produciendo un estado híbrido confuso.

> **Recomendación.** Decidir la línea base antes de tocar nada (Q-01). La opción más limpia:
> ramificar desde `origin/main`, **eliminar del árbol de trabajo lo que no se conserva**, y hacer
> un primer commit de línea base con la infraestructura compartida ya depurada.

### H-03 · El kit está instalado a medias: falta `docs/` · **Crítico**

| Elemento | Backend | Frontend |
|---|---|---|
| `CLAUDE.md` del kit | ✅ Presente | ✅ Presente |
| `.claude/agents/` | ✅ 6 agentes | ✅ 3 agentes |
| `.claude/skills/` | ✅ 6 skills | ✅ 5 skills |
| `docs/IMPLEMENTATION_GUIDE.md` | ❌ **No existe la carpeta `docs/`** | ❌ `docs/` contiene **documentación del legado** |

`CLAUDE.md`, los nueve agentes y las once skills referencian constantemente
`docs/IMPLEMENTATION_GUIDE.md`, `docs/FASE2…`, `docs/FASE5…` y el prototipo. **Ninguno de esos
archivos existe dentro de los repositorios.** Cualquier agente que intente leerlos fallará.

> **Recomendación.** Completar §3.2 de `00-LEEME.md` antes de cualquier tarea de implementación.

### H-04 · El `.gitignore` del backend ignora `docs/` · **Alto**

```gitignore
# Documentación local e informes personales (no versionar en el repo del equipo)
docs/
```

Copiar los documentos de fase a `transporte-backend/docs/` los dejará **fuera del control de
versiones**, en contradicción directa con `FASE4` §14 («Documentación versionada junto al código,
en la carpeta `docs/`») y con todo el contexto de Claude, que los da por presentes en el repo.

> **Recomendación.** Sustituir la regla por una excepción explícita, p. ej. ignorar `docs/local/`
> y versionar el resto; o forzar la inclusión de los siete archivos del kit.

### H-05 · El frontend `docs/` contiene documentación del legado · **Medio**

`ARQUITECTURA-COLABORACION.md`, `FLUJO-PROCEDIMIENTO-INSTRUCCION.md`, `PLAN-PANEL-ADMIN-ROLES.md`,
`RESUMEN-CAMBIOS-ROLES.md`, `REVISION-Y-MEJORAS.md`, `SISTEMA-Y-ROLES.md`. Describen el sistema de
Instrucción y contradicen el contexto del módulo nuevo.

> **Recomendación.** Retirar junto con el resto del legado.

### H-06 · El modelo de roles del frontend es numérico y pertenece a Instrucción · **Alto**

```ts
export const rolUser: Record<string, number> = {
  rolAdmin: 1, rolDirector: 2, rolResponsableInstruccion: 3,
  roldelegadoSorteo: 4, rolinstructor: 5, rolsecretarioAbogado: 6, rolcoordinadorZonal: 7
}
```

`RutaProtegida` recibe `rolesPermitidos: number[]`; `navigation.ts` usa `allowedRoles?: number[]`;
`UserContext` trabaja con `user.rolCode: number`. El módulo nuevo define roles como **enumerado de
cadena** (`RolDepartamental`). Ambos componentes están en la lista de «no tocar».

> **Recomendación.** No modificar `RutaProtegida` ni el tipo de `allowedRoles`. Extender `rolUser`
> con los seis códigos numéricos del módulo y mantener un mapa `rolCode → RolDepartamental` que los
> servicios usen al construir la cabecera de identidad provisional. Es aditivo y no rompe nada.

### H-07 · `UserContext` depende de un endpoint del backend legado · **Alto**

```ts
await fetch(`${env.apiBaseUrl}/auth/acciones?userId=${usuarioActivoId}`, { cache: "no-store" });
```

Se ejecuta **en cada cambio de ruta**, usa `fetch` en lugar de `httpClient`, y apunta a un endpoint
que el backend nuevo no expondrá. `context/` figura en la lista de «conservar sin tocar», pero tal
como está **fallará contra el backend nuevo** en cada navegación.

> **Recomendación.** Adaptación mínima y documentada: hacer la carga de acciones opcional y
> tolerante al fallo, o reemplazarla por el perfil declarado en `usuariosPrueba`. Debe registrarse
> como excepción consciente a la regla de «no tocar».

### H-08 · La correlación está desactivada en `httpClient` · **Medio**

`FASE4` §12.3 afirma que el identificador de correlación «ya está presente en el `httpClient` del
estándar». En el código **está comentado**, junto con el resolutor de token:

```ts
// if (!headers.has(CORRELATION_ID_HEADER)) {
//   headers.set(CORRELATION_ID_HEADER, createCorrelationId());
// }
```

> **Recomendación.** Descomentar en E9. Son dos líneas y `createCorrelationId()` ya existe. Sin
> esto, la traza extremo a extremo del apartado §12.3 no funciona.

### H-09 · Falta el prefijo global `/api/v1` en el backend · **Medio**

`main.ts` no llama a `app.setGlobalPrefix()`. Todos los contratos del diseño asumen `/api/v1`.
Además, `httpClient` usa `env.apiBaseUrl` sin sufijo, y el legado `services/Api.ts` usa `/api`.

> **Recomendación.** `app.setGlobalPrefix('api/v1')` en E0, y `VITE_API_BASE_URL=http://localhost:3003`
> con el prefijo puesto en el `baseURL` del `httpClient` o en cada servicio. Decidir uno y solo uno.

### H-10 · Configuración e infraestructura apuntan a Instrucción · **Alto**

| Archivo | Estado actual | Debe ser |
|---|---|---|
| `.env` (backend) | `DATABASE_URL=postgres://…@localhost:5432/amcInstruccion` + 12 variables `CORE_API_*` | `postgresql://…@transportedb:5432/transportedb?schema=public`, `TZ`, `CORS_ORIGINS`, `LOG_LEVEL`, `MODO_IDENTIDAD_PROVISIONAL` |
| `app.config.ts` | `port 3000`, base `amcInstruccion`, bloque `coreApi` de 17 rutas | `PORT 3003`, `DATABASE_URL`, `TZ`. Sin `coreApi` |
| `docker-compose.yml` | `instrucciondb` 5433 · `instruccion-app` 3002 · `instruccion-front` 5175 | `transportedb` 5434 · `transporte-app` 3003 · `transporte-front` 5176 |
| `Dockerfile` | `EXPOSE 3002`, instala **LibreOffice** y fuentes, copia `fonts/` y `src/assets/` | `EXPOSE 3003`, **`npx prisma generate` en la etapa de construcción**, sin LibreOffice |
| `.env.dev` / `.env.example` (frontend) | `VITE_API_BASE_URL=http://localhost:3000`, `PGDATABASE=amcInstruccion` | `http://localhost:3003` |
| `package.json` (frontend) | `"name": "instruccion-frontend"` | `transporte-frontend` |

### H-11 · Dependencias · **Medio**

- **`node_modules/` no existe en ninguno de los dos repositorios.** No se puede verificar
  compilación ni lint hasta ejecutar `npm install`. Ningún comando de §19 es ejecutable hoy.
- Faltan por instalar: `prisma`, `@prisma/client` (backend); `react-pdf@10.4.1` (frontend).
- `@tanstack/react-query` **no está instalado** — es el pendiente PV-24, no un olvido.
- El backend declara `typeorm` y `@nestjs/typeorm`, además de `pdfkit`, `pdfmate`, `pdf-lib`,
  `jszip` y `@signpdf/*` del legado.

### H-12 · Archivos temporales sin versionar en el árbol · **Observación**

| Repo | Archivos |
|---|---|
| Backend | `tmp-check-tipo-proceso.js`, `tmp-inspect-estado-function.js`, `tmp_create_docx_with_textbox.js`, `debug-plantilla.js` |
| Frontend | `out.txt` (62 KB), `tsc-modal-output.txt`, `tsc-modal-output-utf8.txt`, `tailwind.config.tsold`, `instruccion-frontend.code-workspace`, `.vite/` |

La skill `codigo-limpio-amc` los prohíbe expresamente. Deben eliminarse en la limpieza.

### H-13 · Los `README.md` no corresponden al proyecto · **Observación**

El del backend es el genérico de NestJS; el del frontend describe *«la Dirección Metropolitana de
Resolución de la AMC»*. Ambos figuran como modificados (`M`) respecto al commit inicial.

---

## 13. INCONSISTENCIAS DETECTADAS EN LA DOCUMENTACIÓN

Ninguna es un defecto de análisis: son puntos donde dos documentos del kit dicen cosas distintas, o
donde el insumo no alcanza para poblar el modelo. **Todas requieren decisión antes de la etapa que
afectan.**

### D-01 · Eliminar el legado o solo deshabilitarlo · **Contradicción dentro del kit** · Bloquea E0

| Documento | Dice |
|---|---|
| `00-LEEME.md` §3.1 | `rm -rf src/modules/gestion-documental …` · `rm -rf db/ src/database/` · `npm uninstall typeorm @nestjs/typeorm` |
| `IMPLEMENTATION_GUIDE.md` §0.2 | «Quedan deshabilitados… **No se eliminan**; simplemente no se importan en `app.module.ts`» · «Carpeta `db/`: **congelada**, no tocar» |
| `IMPLEMENTATION_GUIDE.md` §4.3 | «`typeorm` y `@nestjs/typeorm` **no se desinstalan** —los módulos legados los declaran—» |
| `CLAUDE.md` (backend) | «**no hay** TypeORM, **no hay** funciones `fu_*`, **no hay** carpeta `db/`» |

Cuatro documentos, tres posturas incompatibles. **Es la contradicción más consecuente del kit**,
porque determina qué hay en el repositorio el día uno.

> **Recomendación.** Dado que `origin/main` está vacío (H-02), la postura de `00-LEEME.md` y de
> `CLAUDE.md` es la coherente: **el repositorio nace limpio**. La postura de la guía §0.2 tenía
> sentido si el legado estuviera commiteado, que no es el caso. **Eliminar**, y actualizar §0.2 y
> §4.3 de la guía para reflejarlo.

### D-02 · `components/modals/` — la guía dice reutilizar, `00-LEEME` dice eliminar · Bloquea E0

`00-LEEME.md` §3.1 ordena `rm -rf src/components/modals`, pero su propia lista de conservación
omite `modals/`, mientras que `IMPLEMENTATION_GUIDE.md` §0.2 lo incluye entre los componentes que
«se reutilizan sin modificar» y `FASE5` §2.3 usa `ModalContainer` explícitamente.

> **Recomendación.** Conservar **únicamente `ModalContainer.tsx`**; eliminar los otros doce modales
> (ActoInicio, AdjuntarEscritos, AperturaPruebas, DevolucionInadmision, DocumentacionExpediente,
> EmitirExcusa, Expediente, GenerarDocumento, Historial, MedidasCautelares, ParaEnvioDictamen,
> RevisionExpediente), que son del legado.

### D-03 · Número de tablas y enumerados · Bloquea E1

| Documento | Tablas | Enumerados |
|---|---|---|
| `IMPLEMENTATION_GUIDE.md` §9 | **27** | **11** (incluye `TipoParametro`) |
| `FASE4-diseno-base-datos.md` §12 | **26** | **10** |

La diferencia es exactamente `t_parametro_politica` y su enumerado `TipoParametro`, incorporados
por decisión posterior del PO (guía §5) y **no reflejados** en el documento de diseño de base de
datos, cuyo modelo Prisma §10 tampoco los contiene.

> **Recomendación.** La guía manda (§0: «ante conflicto, mandan estas reglas»). Implementar **27
> tablas y 11 enumerados**, y añadir a la migración `0002` las verificaciones que faltan para la
> tabla nueva: rango admisible (`para_minimo` ≤ `para_valor` ≤ `para_maximo` según `para_tipo`) y
> unicidad de `para_clave`. Ninguna de las 22 restricciones documentadas cubre esa tabla.

### D-04 · Numeración de reglas de negocio divergente entre FASE1 y FASE2 · Riesgo de trazabilidad

Los identificadores `RN-xx` **no coinciden** entre ambos documentos:

| ID | En FASE1 | En FASE2 |
|---|---|---|
| RN-36 | La DAF solo puede completar conductor y placa | **Límite de jornada diaria** |
| RN-38 | Inspecciones Técnicas requiere vehículo siempre | **La DAF solo puede completar conductor y placa** |
| RN-43 | Entre 18H00 y 05H00 se requiere salvoconducto | **Condicionante nocturno** |
| RN-44 | El cuadro deja de circular por WhatsApp | **Reglas de descanso aplican a conductores** |

La guía, las skills y los agentes usan **la numeración de FASE2**, y todos los códigos de error
(§11.3) son coherentes con ella.

> **Recomendación.** Declarar `FASE2-documentacion-funcional.md` §8 como **catálogo canónico de
> reglas**, y añadir una nota al inicio de `FASE1` advirtiendo que su numeración es preliminar. La
> exigencia de trazabilidad (§0.4) es inservible si dos documentos usan el mismo identificador para
> reglas distintas.

### D-05 · `catalogos-hoja2.json` contradice a la guía en el formulario 9 · Bloquea E1

| Fuente | `condicionanteNocturno` del formulario 9 |
|---|---|
| `insumos/catalogos-hoja2.json` | **`true`** |
| `IMPLEMENTATION_GUIDE.md` §0.1 punto 4 | «En el `seed`, deja `condicionanteNocturno = **false**` y añade comentario citando la contradicción» |

El insumo se presentó como «consumible directamente por el script de semilla». **Para este campo
no lo es.**

> **Recomendación.** El `seed` debe **sobrescribir explícitamente** ese valor, con el comentario que
> exige la guía. No consumir el JSON a ciegas.

### D-06 · Política de vehículo del formulario 8 · Bloquea E1

| Fuente | Valor |
|---|---|
| `catalogos-hoja2.json` | `OBLIGATORIO` |
| `FASE2` §16.2 | `Requerido` |

`PoliticaVehiculo` distingue ambos valores como estados distintos del enumerado, y ningún documento
define qué separa `REQUERIDO` de `OBLIGATORIO`.

> **Recomendación.** Decidir la semántica de los dos valores antes del `seed`. Si no hay diferencia
> funcional demostrable, plantear la unificación al PO en la próxima sesión de validación.

### D-07 · El insumo no alcanza para poblar `t_formulario` · Bloquea E1

Columnas del diseño que **no existen** en `catalogos-hoja2.json`:

| Columna | Nulo | Situación |
|---|---|---|
| `form_color_acento` | **No** | **No está en el insumo.** Obligatoria en el diseño |
| `form_es_patrulla` | No | No está. Determina si aplica RN-24 — **regla de protección de personas** |
| `form_orden` | No | No está. Deducible del número de formulario |
| `form_rol_compartido` / `form_cupo_compartido` | Sí | No están. Formulario 6, pendiente PV-09 |
| `t_formulario_area` (áreas admitidas) | — | Deducible de `listasPersonal`, pero requiere un mapeo de texto libre a enumerado |
| `t_formulario_prefijo.fpre_area_aplica` | Sí | **No está el criterio.** El formulario 8 tiene cuatro prefijos y dos áreas; el 7, cuatro prefijos y dos listas |

`form_es_patrulla` es el más delicado: de él depende la regla de patrulla consecutiva. Deducirlo
del nombre («Patrulla ECU Diurna», «Patrulla Reacción Nocturna») es exactamente el tipo de
inferencia que el proyecto prohíbe.

> **Recomendación.** Tratar `form_color_acento`, `form_es_patrulla` y el criterio de selección de
> prefijo por área como **pendientes nuevos de validación** (propuesta: PV-25, PV-26, PV-27) y
> llevarlos a la sesión con el PO. Mientras tanto, `seed` con `TODO` explícito.

### D-08 · Ventanas de carga: seis declaradas, dos definidas · Afecta E1 y E3

El `seed` debe cargar «6 ventanas, una por rol», pero las fuentes solo definen la departamental
(15H00, con la contradicción 14H00/15H00 documentada en PV-06) y la de la DAF (15H00–16H30). No hay
valores para `DIRECTOR`, `ADMINISTRADOR` ni distinción entre los tres roles departamentales.

> **Recomendación.** Sembrar las tres departamentales con el mismo horario, la de la DAF con el
> suyo, y las de `DIRECTOR` y `ADMINISTRADOR` con `vcar_activo = false` (sin restricción horaria),
> documentándolo como decisión provisional.

### D-09 · Área `CCF` sin formulario que la admita · Observación

`AreaPersonal` incluye `CCF`, y la dotación declara cinco personas CCF/TCC, pero ningún formulario
del insumo lista personal de esa área. En el formulario 8, «CCF / ITCC» aparece como **tipo de
control**, no como lista de personal.

> **Recomendación.** Confirmar con el PO si el personal CCF debe poder asignarse al formulario 8.

### D-10 · Prefijo `/home` en las rutas · Afecta E9

Ver §9.4. `FASE4` y `FASE5` declaran `/cuadro/registro`; el enrutador y la navegación actuales
construyen `/home/cuadro/registro`.

> **Recomendación.** Conservar el prefijo `/home`, que es el armazón existente, y documentar la
> divergencia respecto a las tablas de rutas de FASE4 §5.3 y FASE5 §3.1. Cambiarlo obligaría a
> tocar `MainLayout`, `navigation.ts` y `UserContext.cambiarUsuario()`, todos en la lista de «no
> tocar».

### D-11 · El formato de error cambia nombres de campo · Observación

El filtro actual devuelve `{statusCode, message, timestamp, path}`; el formato exigido es
`{statusCode, codigo, mensaje, detalles, correlacionId, timestamp, ruta}`. Es un cambio de contrato
que rompería a los consumidores del legado — irrelevante si el legado se retira (D-01), pero debe
ser una decisión consciente, no un efecto colateral.

---

## 14. DECISIONES REQUERIDAS ANTES DE EMPEZAR

### 14.0 Decisión tomada por el responsable del proyecto · 2026-08-04

> **«No voy a usar nada de Instrucción. Solo copié el proyecto para mantener la arquitectura y el
> diseño. Toda la implementación del módulo de automatización es nueva.»**

Esto **cierra Q-02, Q-03, Q-04 y Q-05**, y resuelve las contradicciones **D-01** y **D-02** en
favor de `00-LEEME.md` y de `CLAUDE.md`. Los repositorios se toman como **plantilla de arquitectura
y sistema visual**, no como base de código.

Consecuencia práctica: **se conserva el continente, se elimina el contenido.** Lo que permanece es
la forma de construir —estructura de carpetas, capas, convenciones, cabeceras, sistema de diseño y
componentes transversales sin negocio—; todo lo que sabe de expedientes, sorteos, dictámenes,
excusas o instrucción se retira.

### 14.1 Decisiones aplicadas · 2026-08-04

Las cinco se resolvieron con la recomendación de este informe y **ya están ejecutadas**.
Detalle en §16.

| # | Decisión | Resolución aplicada |
|---|---|---|
| **Q-01** | Línea base de Git (H-02) | Rama `base/cuadro-colores` desde `origin/main` en ambos repositorios, retiro del legado y **commit de línea base**. Respaldo íntegro del árbol previo antes de borrar |
| **Q-06** | Prefijo de rutas (D-10) | Se conserva `/home`. Las nueve pantallas colgarán de `/home/cuadro/…` y `/home/administracion/…`. Divergencia respecto a FASE4 §5.3 y FASE5 §3.1 documentada en `routes.tsx` |
| **Q-07** | Modelo de roles (H-06) | `rolUser` reescrito con los siete códigos del módulo, más `rolDepartamentalPorCodigo` para la cabecera de identidad provisional. `RutaProtegida` y `allowedRoles` siguen siendo numéricos |
| **Q-08** | `docs/` en el `.gitignore` (H-04) | Regla sustituida por `docs/*` con excepción explícita para los nueve documentos del kit. Verificado con `git check-ignore` |
| **Q-09** | Prefijo de API (H-09) | `setGlobalPrefix('api/v1')` en el backend; `baseURL: ${env.apiBaseUrl}/api/v1` en `httpClient`. Un solo sitio cada uno |

### 14.2 Decisiones cerradas por §14.0

| # | Decisión | Resolución |
|---|---|---|
| **Q-02** | Alcance de la limpieza | **Eliminar todo el legado.** Los **catorce** módulos de negocio del backend y las veinte páginas, diecisiete servicios, trece modales e interfaces del frontend |
| **Q-03** | `db/` y `src/database/` | **Eliminar ambos.** `db/` contiene funciones `fu_*` de Instrucción, sin relación con `transportedb` |
| **Q-04** | `typeorm` y `@nestjs/typeorm` | **Desinstalar**, junto con `@signpdf/*` y `jszip`. **Se conservan `pdfkit`, `pdf-lib` y `pdfmake`**, que la guía §4.1 declara presentes y necesarios para el submódulo `documentos` |
| **Q-05** | Conservación en el frontend | Lista de §14.3, con los acoplamientos cortados |

### 14.3 Qué se conserva exactamente, y qué acoplamiento hay que cortar

Los componentes «reutilizables» **no son todos independientes del negocio de Instrucción**. Se
verificaron sus importaciones una a una. Estos son los que arrastran algo y deben depurarse al
conservarlos:

| Elemento conservado | Acoplamiento detectado | Acción |
|---|---|---|
| `components/tabla/Table.tsx` | Importa `UserActions` de `interfaces/User.ts` — modelo de acciones por usuario de Instrucción | Conservar un `UserActions` **reducido** como tipo de interfaz de usuario para las acciones de fila. En el módulo nuevo los permisos son por rol, no por acción |
| `components/tabla/RowActions.tsx` | Importa `interfaces/Case` | Cortar la dependencia; tipar contra el modelo del módulo |
| `components/common/Collapse.tsx` | Importa `services/AssignmentService` e `interfaces/Collapse` | Retirar la llamada al servicio legado; conservar el componente y su interfaz |
| `components/navbar/Navbar.tsx` · `AlertList.tsx` | Importan `services/AlertService` e `interfaces/Alert` (campana de notificaciones) | Decidir si el módulo tendrá notificaciones en barra. Si no, retirar `AlertList` del `Navbar` |
| `components/common/BadgePriority.tsx` · `NewProcessButtons.tsx` | Prioridad de expediente y botones de proceso nuevo | **Eliminar.** Son de negocio, no transversales |
| `providers/AppProviders.tsx` | Importaciones comentadas a `../store`, `shared/api`, `features/auth` (Redux y react-query que este proyecto no usa) | Limpiar el código comentado. La composición efectiva (`Theme → User → Modal → ModalContainer`) es válida |
| `context/UserContext.tsx` | Llama a `/auth/acciones` del backend legado en cada cambio de ruta (H-07) | **Reescribir la carga de acciones.** El backend nuevo no expondrá ese endpoint |
| `common/auth/` (backend) | `auth.service.ts` ejecuta `fu_listado_acciones_autorizadas` vía TypeORM; `auth.controller.ts` expone `/auth/acciones` | **Eliminar servicio y controlador.** Conservar `roles.guard.ts`, `roles.decorator.ts`, `permissions.decorator.ts` y la interfaz `AuthUser`, que no dependen de nada |
| `Dockerfile` (backend) | Copia `fonts/` y `src/assets/` para el motor pdfmake, e instala **LibreOffice** | Conservar `fonts/` y el membrete si `documentos` usa pdfmake; **retirar LibreOffice**, que servía a la conversión DOCX→PDF del legado |

Lo que se conserva **sin ningún acoplamiento** y se reutiliza tal cual: `api/httpClient.ts`,
`api/correlationId.ts`, `components/forms/FormikField.tsx`, `components/common/{Alert, Boton,
Loading, ModalConfirmacion, ModalExito, Paginacion, Iconos, RutaProtegida, SubMenuDropdown}.tsx`,
`components/modals/ModalContainer.tsx`, `components/tabla/{FilterByColumn, ActionButton,
RowActionMenu}.tsx`, `context/{Theme,Modal}Context.tsx`, `providers/{Theme,Modal}Provider.tsx`,
`layouts/`, `styles/` completo, `index.css`, `utils/datetime.util.ts`, y en el backend
`common/errors/application.error.ts`, `common/filters/http-exception.filter.ts`, la configuración
de `ValidationPipe` y CORS de `main.ts`, y los archivos de `eslint`, `prettier`, `tsconfig` y
`nest-cli`.

### 14.4 Lo que sigue dependiendo del Product Owner

Los tres bloqueantes de `PENDIENTES-VALIDACION.md` **no impiden construir**, solo poblar:

| ID | Pendiente | Responsable | Bloquea |
|---|---|---|---|
| PV-01 | Matriz zonal ↔ punto de encuentro por formulario | Product Owner | Carga de `t_formulario_punto`. **El filtrado en cascada no funciona sin esto** |
| PV-02 | Base de personal certificada con teléfono y tipo de contrato | Product Owner | Políticas de descanso con datos reales |
| PV-03 | Catálogo de conductores y vehículos | **DAF** | Asignación logística con datos reales |

A los que este análisis propone añadir **tres nuevos**, derivados de D-07:

| ID propuesto | Pendiente |
|---|---|
| PV-25 | `form_color_acento` de los nueve formularios (columna obligatoria, ausente en el insumo) |
| PV-26 | `form_es_patrulla` por formulario — **determina si aplica RN-24** |
| PV-27 | Criterio de selección de prefijo por área en los formularios 5, 6, 7 y 8 |

---

## 15. PLAN DE IMPLEMENTACIÓN PROPUESTO

Respeta el orden de dependencias de `IMPLEMENTATION_GUIDE.md` §6, con la etapa E0 desglosada según
los hallazgos de este análisis. **No se avanza a una etapa sin que la anterior compile y pase su
lista de verificación** (§18) y sus criterios de aceptación (§19).

| Etapa | Contenido | Depende de | Verificación |
|---|---|---|---|
| ~~**E0.a**~~ | **HECHA.** Nueve decisiones resueltas (§14.0 y §14.1) | — | Aprobadas |
| ~~**E0.b**~~ | **HECHA.** Rama de línea base, retiro del legado, `npm install`, commit | Q-01 | `npm run build` y `npm run lint` **en cero** en ambos |
| ~~**E0.c**~~ | **HECHA.** Documentación copiada a ambos repos, `.gitignore` ajustado | Q-08 | `git check-ignore` confirma que los documentos se versionan |
| **E0.d** | Prisma instalado, `PrismaModule` global, `app.module.ts` limpio, `main.ts` con prefijo y advertencia de modo provisional, `.env`, `docker compose up -d transportedb` | E0.b, Q-09 | `pg_isready` responde · `npm run build` en cero |
| **E1** | `schema.prisma` (27 tablas, 11 enumerados), migraciones `0001`–`0003`, `seed.ts` idempotente | E0, D-03, D-05…D-08 | `count(t_formulario)=9` · `count(t_parametro_politica)=8` · doble ejecución del `seed` sin duplicados |
| **E2** | Transversales: 4 guardas, jerarquía de errores con 15 códigos, filtro con formato §11.2, 3 interceptores, logger | E1 | Pruebas de guarda · el arranque advierte si el modo provisional está activo |
| **E3** | `configuracion` | E2 | `/formularios/permitidos` devuelve solo los del rol · parámetros validados contra su rango |
| **E4** | `talento-operativo` — **`RangoHorario` con sus 8 casos ANTES que cualquier política** | E3 | Cambiar `JORNADA_MAXIMA_HORAS` altera el comportamiento **sin recompilar** |
| **E5** | `cuadro-diario` | E4 | Un solo cuadro por fecha · semana ISO 8601 · cuadro cerrado rechaza escrituras |
| **E6** | `operativos` | E5 | Secuencial reiniciado por día y formulario · colisión concurrente resuelta · rol no escribe en formulario ajeno |
| **E7** | `transporte` | E6 | DTO de dos propiedades · campo extra → `400` con lista de rechazados |
| **E8** | `documentos` | E7 | `oser_dato_aislado` con exactamente cuatro campos · una orden por funcionario, ninguna menciona a las otras |
| **E9** | Frontend base: rutas, navegación, contexto, servicios, interfaces, siete perfiles de prueba | E3, Q-06, Q-07, H-07, H-08 | `npm run lint` y `npm run build` sin errores nuevos |
| **E10** | Pantallas P-01 … P-09 | E9 y su módulo backend | Ninguna clase CSS nueva · colores del backend · toda señal cromática con equivalente textual |
| **E11** | Docker y despliegue | E8, E10 | `prisma generate` en la etapa de construcción · puertos sin colisión · `TZ` configurada |
| **E12** | Autenticación real (modo JWT) | Microservicio de AD disponible | — |

### 15.1 Orden dentro de E4, por criticidad

1. `RangoHorario` **con sus ocho pruebas unitarias pasando**. Nada más se construye antes.
2. `ParametroPoliticaService` con caché e invalidación (dependencia de las políticas).
3. `DescansoPersonalPolicy` con las seis reglas en su orden, leyendo parámetros.
4. `ElegibilidadService`, que devuelve **veredicto y motivo**, nunca datos del funcionario.
5. `HistorialJornadaService`, consumidor del evento `CuadroCerrado`.

**Las tres piezas que protegen a personas** —`RangoHorario`, `DescansoPersonalPolicy` y
`DescansoConductorPolicy`— se implementan con pruebas **antes** de usarse, y se verifican con el
Product Owner antes de ir a producción.

---

## 16. ETAPA E0 EJECUTADA · 2026-08-04

### 16.1 Qué se hizo

| Paso | Resultado |
|---|---|
| Respaldo | Copia íntegra de ambos repositorios antes de borrar nada. El legado estaba **sin versionar**: sin respaldo, el borrado era irreversible |
| Rama | `base/cuadro-colores` desde `origin/main` en los dos repositorios |
| Retiro del legado · backend | `src/modules/` (14 módulos), `src/database/`, `db/`, cuatro archivos temporales, `auth.service`/`auth.controller`/`auth.module` y sus DTO, cargas de expedientes y excusas |
| Retiro del legado · frontend | 20 páginas, 17 servicios, 12 modales, `components/documentacion/`, `components/uio/`, 5 componentes de negocio, 7 interfaces, 4 archivos de configuración, 2 utilidades, 2 hojas de estilo, `docs/` del legado y 5 archivos temporales |
| Dependencias retiradas | `typeorm`, `@nestjs/typeorm`, `@signpdf/*`, `jszip`, `@types/jszip`, `@tiptap/*`, `@faker-js/faker` |
| Dependencias conservadas | `pdfkit`, `pdf-lib`, `pdfmake` y `fonts/`, que el submódulo `documentos` necesita para la matriz y las órdenes |
| Reescrituras | `app.module.ts`, `main.ts`, `app.config.ts`, `.env`, `config/{env,navigation,routes,usuariosPrueba,validationSchemas}`, `interfaces/{Modal,User}`, `UserContext`, `RowActions`, ambos `README.md` |
| Documentación | Los nueve documentos del kit copiados a `transporte-backend/docs/`; cinco más los pendientes a `transporte-frontend/docs/` |
| Commit | `chore: establece la linea base del modulo cuadro de colores` en ambos. **Sin subir a origin** |

### 16.2 Verificación

| Criterio | Backend | Frontend |
|---|---|---|
| `npm run build` | **código 0** | **código 0** |
| `npm run lint` | **código 0** | **código 0** · 3 advertencias preexistentes |
| Sin `typeorm` en `src/` | Sin coincidencias | — |
| Sin `console.log` en `src/` | Sin coincidencias | Sin coincidencias |
| Sin `: any` en `src/` | Sin coincidencias | Sin coincidencias |
| `axios` fuera de `httpClient` | — | Sin coincidencias |
| Secretos o basura en el índice | Ninguno | Ninguno |

### 16.3 Correcciones de calidad sobre componentes conservados

Al exigir `lint` en cero afloraron diez errores **preexistentes** en componentes que se
conservan. Se corrigieron, porque el estándar del proyecto prohíbe `any` y código muerto:

| Archivo | Corrección |
|---|---|
| `common/auth/guards/roles.guard.ts` | Tipado de `request.user`, que era `any` |
| `components/forms/FormikField.tsx` | `(form.values as any)` → comprobación de `File` |
| `components/tabla/FilterByColumn.tsx` | `Column<any>` → componente genérico `<TData>` |
| `components/tabla/Table.tsx` | `col: any` y `as String` → tipos correctos |
| `components/tabla/RowActionMenu.tsx` | `useEffect` + `setState` → valor derivado con `useMemo` |
| `providers/ModalProvider.tsx` | Tres `any` → `unknown`; el hook `useModal` se movió a `hooks/` |
| `context/UserContext.tsx` | Separado en contexto (`context/`) y provider (`providers/UserProvider.tsx`), siguiendo el patrón que el propio proyecto ya usa para modales. `useUser` vive ahora en `hooks/useUser.ts` |

### 16.4 Puntos que quedaron pendientes y conviene registrar

| # | Punto | Estado |
|---|---|---|
| 1 | `.claude/` se versionó | El `.gitignore` de ambos repos declara «versionar skills/agents, ignorar config local», pero la skill `codigo-limpio-amc` lo lista entre lo que no se sube. **Se siguió el `.gitignore`**; conviene alinear la skill |
| 2 | Cabeceras de archivos conservados | Varias siguen diciendo «Microservicio: resolucion» o «instruccion». Se respetó la autoría original; corregir solo la línea del microservicio es un cambio cosmético pendiente |
| 3 | `components/common/Iconos.tsx` | Conserva claves con vocabulario del legado (`expediente`, `dictamen`). No estorban, pero convendría depurarlas al construir las pantallas |
| 4 | 3 advertencias de lint en el frontend | Dependencias de `useEffect` en `Table` y `FilterByColumn`, y la incompatibilidad conocida de `useReactTable` con el compilador de React. Preexistentes, no bloquean |
| 5 | Respaldo del legado | Está fuera de los repositorios, en el directorio temporal de la sesión. **Si se necesita conservar, hay que moverlo a un lugar permanente** |

---

## 17. RIESGOS

### 17.1 Riesgos del proyecto (heredados del análisis)

| ID | Riesgo | Estado |
|---|---|---|
| R-01 | El matrizador que consolidaba el cuadro cesó funciones sin traspaso | **Materializado.** Conviene sesión con quien lo sustituya |
| R-02 | Resistencia a la adopción: *«para ellos es más fácil mandar un WhatsApp»* | Abierto. Mitigación: formulario condensado (2-3 min) y estadísticas por unidad |
| R-03 | Un solo desarrollador para todo el ecosistema | Abierto |
| R-05 | Entidades externas sin obligación de usar la plantilla | Abierto. Requiere memorando institucional |
| R-07 | Riesgo legal preexistente: vehículos sin orden de movilización, personal sin licencia profesional | El sistema deja evidencia; no resuelve lo jurídico |

### 17.2 Riesgos técnicos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|:---:|:---:|---|
| RT-01 | Error en el solapamiento con cruce de medianoche | Media | **Alto** | Encapsular en `RangoHorario` con los ocho casos de prueba. **Es el punto de error más probable del sistema** |
| RT-02 | Colisión de secuencial en registro concurrente | Media | Medio | Restricción única + transacción con reintento acotado |
| RT-03 | `TZ` mal configurada en el contenedor | Media | **Alto** | Variable explícita. Si falla, los cierres de las 15H00 ocurren a otra hora **y nadie lo nota hasta que un departamento pierda su ventana** |
| RT-04 | Cliente de Prisma copiado en lugar de generado en la imagen | **Alta** | Medio | `npx prisma generate` dentro de la etapa de construcción |
| RT-05 | `MODO_IDENTIDAD_PROVISIONAL` activo en producción | Baja | **Muy alto** | Falso por defecto + advertencia en el arranque |
| RT-09 | **Nuevo.** Migración estructural que borra las `CHECK` y los índices parciales | Media | **Alto** | Verificar `\d+ t_operativo` tras cada `migrate dev`; documentarlo en `prisma/README.md` |
| RT-10 | **Nuevo.** El `seed` consume el insumo a ciegas y siembra el formulario 9 con condicionante nocturno `true` | **Alta** | Medio | Sobrescritura explícita con comentario (D-05) |
| RT-11 | **Nuevo.** Los agentes de Claude fallan por ausencia de `docs/` en los repos | **Alta** | Medio | Completar E0.c antes de invocar cualquier agente |
| RT-12 | **Nuevo.** `UserContext` invoca `/auth/acciones` en cada navegación contra un backend que no lo expone | **Alta** | Medio | Adaptación tolerante al fallo en E9 (H-07) |

---

## 18. LO QUE NO SE DEBE INVENTAR

Es la regla más importante del proyecto, repetida en el `CLAUDE.md` de cada repositorio, en las
once skills y en la guía. Se reproduce aquí íntegra porque condiciona cada etapa:

| # | Pendiente | Qué hacer |
|---|---|---|
| 1 | Matriz zonal ↔ punto de encuentro por formulario | Implementar la estructura; `seed` sin vincular y `TODO` explícito |
| 2 | Base de personal certificada con teléfono y tipo de contrato | `seed` solo con registros de ejemplo marcados como tales |
| 3 | Catálogo de conductores y vehículos | Solicitarlo a la DAF |
| 4 | Contradicción del formulario 9 | Ambos campos en el modelo; `seed` con `condicionanteNocturno = false` y comentario citando la contradicción |
| 5 | Momento de verificación del condicionante nocturno | Validación **en el cierre del cuadro**, no en el registro. Marcar con `TODO` |
| 6 | Hora exacta de cierre departamental (14H00 o 15H00) | Parámetro. `seed` con 15H00 y comentario |
| 7 | Canal de entrega de la orden de servicio | Emisión y consulta propia. **No** implementar envío por correo |
| 8 | Formato unificado de la orden impresa | Diseño del prototipo. Marcar como provisional |
| 9 | Baja física o lógica de operativos | **Baja lógica** con `oper_activo`. Marcar con `TODO` |
| 10 | Reapertura del cuadro cerrado | Endpoint con verificación de rol Director, sin flujo de autorización adicional |
| 11 | Política de retención de auditoría | No implementar purga |
| 12 | DMQ como zonal o ámbito | Zonal con `zona_es_dmq = true` |

**Si una tarea necesita uno de estos puntos, hay que detenerse y preguntar.** Completarlos con un
valor razonable destruye el trabajo de cinco fases de análisis, cuyo valor está precisamente en
distinguir lo acordado de lo supuesto.

---

## 19. CONCLUSIÓN

El material recibido es **suficiente para implementar**. La documentación de las cinco fases es
coherente, trazable y explícita respecto a sus propios límites; el prototipo está aprobado y
completo; el contexto de Claude Code (nueve agentes, once skills, dos `CLAUDE.md`) está bien
construido y alineado con los documentos.

Lo que **no** está listo es el punto de partida material: los dos repositorios contienen el sistema
de Instrucción sin limpiar, `origin/main` está vacío, el kit está instalado a medias y faltan los
documentos dentro de los repos. Nada de eso es grave, pero **debe resolverse de forma deliberada y
documentada**, no sobre la marcha, porque cuatro documentos del kit dan instrucciones incompatibles
sobre cómo hacerlo (D-01, D-02).

Las **nueve decisiones del apartado §14** son el único trabajo que separa el estado actual del
inicio de E0. Ninguna requiere al Product Owner. Las tres que sí lo requieren —los datos maestros—
permiten construir el sistema completo, solo no poblarlo.

Se recomienda **no ejecutar la limpieza tal como está escrita en `00-LEEME.md` §3.1** hasta
resolver Q-01 a Q-05, y **no invocar ningún agente de Claude** hasta completar E0.c, porque todos
dependen de documentos que hoy no existen dentro de los repositorios.

---

*Fin del análisis. No se implementó nada. A la espera de aprobación.*
