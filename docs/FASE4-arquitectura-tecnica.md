# ARQUITECTURA TÉCNICA
## Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control

| | |
|---|---|
| **Fase** | 4 — Diseño técnico |
| **Entrada** | Documentación funcional (Fase 2) y análisis de dominio (Fase 3) |
| **Base arquitectónica** | Proyectos `transporte-frontend` y `transporte-backend` |
| **Naturaleza** | Diseño. La implementación se aborda en la fase siguiente |

---

## 1. PRINCIPIOS RECTORES

El diseño se somete a cinco principios que resultan de las decisiones ya tomadas con el Product Owner y de las convenciones institucionales verificadas en los proyectos de referencia.

**Extender sin alterar la filosofía.** La arquitectura por módulo con tres capas, la organización de carpetas, la nomenclatura en español y la cabecera de comentario por archivo se respetan sin excepción. Lo que se extiende es el conjunto de módulos y la estrategia de acceso a datos, no la forma de construir.

**Independencia total del legado.** El módulo no reutiliza tablas, módulos ni lógica existentes. Los módulos legados quedan deshabilitados en el arranque. Esta decisión, tomada explícitamente por el Product Owner, es la que hace viable el uso de Prisma sin romper nada.

**Las reglas de negocio viven en el servidor.** El navegador replica validaciones por razones de experiencia de usuario, nunca como control efectivo. Toda regla se verifica en el backend, incluso si la interfaz ya la impidió.

**La autorización es una regla de dominio, no una capa decorativa.** Que la DAF solo pueda tocar dos campos no se resuelve deshabilitando controles en pantalla: se resuelve en el contrato del endpoint y en el objeto de transferencia, de modo que una petición manipulada no consiga escribir.

**El acceso se diseña completo aunque la autenticación llegue después.** El microservicio de Active Directory está en desarrollo. La arquitectura se construye con la cadena de autorización definitiva y un único punto provisional —el origen de la identidad— que se sustituye al final sin tocar el resto.

---

## 2. VISTA GENERAL

### 2.1 Arquitectura de referencia

```mermaid
flowchart TB
  subgraph CLIENTE["Navegador"]
    UI["SPA React 19<br/>Vite · Tailwind 4 · daisyUI 5"]
  end

  subgraph SERVIDOR["Servidor de aplicaciones"]
    subgraph API["transporte-backend · NestJS 11"]
      PRES["Capa de Presentación<br/>Controladores · DTO"]
      APP["Capa de Aplicación<br/>Servicios · Políticas"]
      INFRA["Capa de Infraestructura<br/>Repositorios"]
      COMMON["Transversal<br/>Guards · Filtros · Auditoría · Logs"]
    end
    PRISMA["Prisma Client"]
  end

  subgraph DATOS["Persistencia"]
    PG[("PostgreSQL 18<br/>instancia propia<br/>base transportedb")]
  end

  subgraph EXTERNO["Servicios externos"]
    AD["Microservicio de Identidad<br/>Active Directory<br/><i>en desarrollo</i>"]
  end

  UI -->|"HTTPS · JSON<br/>x-correlation-id"| PRES
  PRES --> APP --> INFRA --> PRISMA --> PG
  COMMON -.-> PRES
  COMMON -.-> APP
  APP -.->|"eventos de dominio"| APP
  PRES -.->|"integración diferida"| AD
```

### 2.2 Correspondencia entre contextos de dominio y módulos técnicos

Los seis contextos delimitados del análisis de dominio se materializan en módulos de NestJS. La correspondencia es directa y deliberada: si mañana un contexto necesita extraerse a un microservicio propio, la frontera ya está trazada.

| Contexto de dominio | Módulo backend | Módulo frontend |
|---|---|---|
| CTX-01 Planificación Operativa | `cuadro-diario`, `operativos` | `pages/cuadro`, `services/OperativoService` |
| CTX-02 Asignación Logística | `transporte` | `pages/transporte`, `services/TransporteService` |
| CTX-03 Talento Operativo | `talento-operativo` | `pages/administracion/personal` |
| CTX-04 Emisión Documental | `documentos` | `pages/cuadro/matriz`, `services/DocumentoService` |
| CTX-05 Configuración Institucional | `configuracion` | `pages/administracion/catalogos` |
| CTX-06 Identidad y Acceso | `common/auth` | `context/UserContext` |

---

## 3. DIAGRAMA DE COMPONENTES

```mermaid
flowchart TB
  subgraph FE["Frontend · transporte-frontend"]
    direction TB
    F1["<b>Páginas</b><br/>CuadroDiarioPage · MatrizConsolidadaPage<br/>AsignacionTransportePage · AdminPage"]
    F2["<b>Componentes de módulo</b><br/>FormularioOperativo · TablaOperativos<br/>PanelTransporte · BannerFormulario"]
    F3["<b>Componentes comunes heredados</b><br/>Table · FormikField · Modales · Alert"]
    F4["<b>Servicios</b><br/>OperativoService · TransporteService<br/>CatalogoService · DocumentoService"]
    F5["<b>Contexto</b><br/>UserContext · ModalContext · ThemeContext"]
    F6["<b>httpClient</b><br/>interceptores · correlation id"]
    F1 --> F2 --> F3
    F1 --> F4 --> F6
    F5 -.-> F1
  end

  subgraph BE["Backend · transporte-backend"]
    direction TB
    subgraph MOD["Módulos de negocio"]
      M1["<b>cuadro-diario</b><br/>apertura · estado · cierre"]
      M2["<b>operativos</b><br/>registro · edición · consulta"]
      M3["<b>transporte</b><br/>asignación · capacidad"]
      M4["<b>talento-operativo</b><br/>personal · elegibilidad"]
      M5["<b>configuracion</b><br/>formularios · catálogos · ventanas"]
      M6["<b>documentos</b><br/>matriz · órdenes de servicio"]
    end
    subgraph CROSS["Componentes transversales"]
      X1["auth<br/>guards · decoradores"]
      X2["filters<br/>excepciones"]
      X3["interceptors<br/>logs · correlación · auditoría"]
      X4["errors<br/>ApplicationError"]
      X5["prisma<br/>PrismaService"]
    end
    M2 -->|"consulta elegibilidad"| M4
    M2 -->|"lee definición"| M5
    M3 -->|"opera sobre"| M2
    M6 -->|"compone desde"| M2
    M6 -->|"compone desde"| M3
    M1 -->|"gobierna estado"| M2
    MOD --> X5
    X1 -.-> MOD
    X2 -.-> MOD
    X3 -.-> MOD
  end

  DB[("PostgreSQL<br/>transportedb")]
  F6 -->|"REST /api/v1"| MOD
  X5 --> DB
```

---

## 4. ARQUITECTURA DEL BACKEND

### 4.1 Estructura de carpetas

Se respeta el patrón de tres capas por módulo verificado en el proyecto de referencia. Los módulos nuevos se agregan junto a los legados, que quedan sin importar en el módulo raíz.

```
transporte-backend/
├── prisma/
│   ├── schema.prisma                    # esquema del módulo nuevo
│   ├── migrations/                      # migraciones versionadas por Prisma
│   └── seed.ts                          # carga inicial de catálogos
├── db/                                  # CONGELADA · funciones legadas, no se toca
├── src/
│   ├── main.ts                          # bootstrap: CORS, ValidationPipe, filtros
│   ├── app.module.ts                    # solo módulos nuevos + PrismaModule
│   ├── config/
│   │   └── app.config.ts                # configuración tipada desde entorno
│   ├── prisma/
│   │   ├── prisma.module.ts             # módulo global
│   │   └── prisma.service.ts            # ciclo de vida de la conexión
│   ├── common/
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   │   ├── identidad.guard.ts            # resuelve request.user
│   │   │   │   ├── roles.guard.ts                # verifica rol
│   │   │   │   ├── formulario-rol.guard.ts       # verifica propiedad del formulario
│   │   │   │   └── ventana-carga.guard.ts        # verifica ventana horaria
│   │   │   ├── decorators/
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── usuario-actual.decorator.ts
│   │   │   │   └── auditar.decorator.ts
│   │   │   └── interfaces/
│   │   │       └── usuario-autenticado.interface.ts
│   │   ├── errors/
│   │   │   ├── application.error.ts               # heredado del estándar
│   │   │   ├── regla-negocio.error.ts             # 409 con motivo humano
│   │   │   ├── ventana-cerrada.error.ts           # 423
│   │   │   └── autorizacion.error.ts              # 403
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts           # formato uniforme
│   │   ├── interceptors/
│   │   │   ├── correlacion.interceptor.ts         # x-correlation-id
│   │   │   ├── logging.interceptor.ts             # traza de peticiones
│   │   │   └── auditoria.interceptor.ts           # registro de escrituras
│   │   ├── logger/
│   │   │   └── logger.service.ts                  # logger estructurado
│   │   └── dto/
│   │       ├── paginacion.dto.ts
│   │       └── respuesta.dto.ts
│   └── modules/
│       ├── cuadro-diario/
│       │   ├── presentation/
│       │   │   ├── cuadro-diario.controller.ts
│       │   │   └── dto/
│       │   ├── application/
│       │   │   └── cuadro-diario.service.ts
│       │   ├── infrastructure/
│       │   │   └── cuadro-diario.repository.ts
│       │   └── cuadro-diario.module.ts
│       ├── operativos/
│       │   ├── presentation/
│       │   │   ├── operativos.controller.ts
│       │   │   └── dto/
│       │   │       ├── crear-operativo.dto.ts
│       │   │       ├── actualizar-operativo.dto.ts
│       │   │       └── filtro-operativos.dto.ts
│       │   ├── application/
│       │   │   ├── operativos.service.ts
│       │   │   ├── generador-identificador.service.ts
│       │   │   ├── calculador-alertas.service.ts
│       │   │   └── exclusividad-horaria.policy.ts
│       │   ├── domain/
│       │   │   ├── rango-horario.vo.ts
│       │   │   ├── identificador-operativo.vo.ts
│       │   │   └── estado-transporte.vo.ts
│       │   ├── infrastructure/
│       │   │   └── operativos.repository.ts
│       │   └── operativos.module.ts
│       ├── transporte/
│       │   ├── presentation/
│       │   │   ├── transporte.controller.ts
│       │   │   └── dto/
│       │   │       └── asignar-transporte.dto.ts      # SOLO dos campos
│       │   ├── application/
│       │   │   ├── transporte.service.ts
│       │   │   ├── descanso-conductor.policy.ts
│       │   │   └── capacidad-flota.service.ts
│       │   ├── infrastructure/
│       │   └── transporte.module.ts
│       ├── talento-operativo/
│       │   ├── presentation/
│       │   ├── application/
│       │   │   ├── elegibilidad.service.ts            # servicio publicado
│       │   │   ├── descanso-personal.policy.ts        # POL-01
│       │   │   └── historial-jornada.service.ts
│       │   ├── infrastructure/
│       │   └── talento-operativo.module.ts
│       ├── configuracion/
│       │   ├── presentation/
│       │   ├── application/
│       │   │   ├── formularios.service.ts
│       │   │   ├── catalogos.service.ts
│       │   │   └── ventana-carga.service.ts
│       │   ├── infrastructure/
│       │   └── configuracion.module.ts
│       └── documentos/
│           ├── presentation/
│           ├── application/
│           │   ├── matriz-consolidada.service.ts
│           │   ├── orden-servicio.service.ts
│           │   └── dato-aislado.builder.ts            # garantiza INV-24
│           ├── infrastructure/
│           └── documentos.module.ts
```

> **Nota sobre la carpeta `domain/`.** Es una extensión al patrón de tres capas del estándar. Se justifica porque el análisis de dominio identificó objetos de valor con comportamiento propio —el rango horario, el identificador, el estado de transporte— que no son ni controladores, ni orquestación, ni acceso a datos. Ubicarlos en `application/` los mezclaría con los servicios; dejarlos sueltos los dispersaría. La extensión es aditiva y no altera la filosofía del estándar.

### 4.2 Responsabilidad de cada capa

| Capa | Responsabilidad | Lo que **no** debe hacer |
|---|---|---|
| **Presentation** | Recibir la petición, validar forma con DTO, delegar y devolver | Contener reglas de negocio ni acceder a datos |
| **Application** | Orquestar el caso de uso, aplicar políticas, emitir eventos | Conocer detalles de HTTP ni de Prisma |
| **Domain** | Encapsular objetos de valor y sus invariantes | Depender de infraestructura |
| **Infrastructure** | Traducir entre el modelo y la persistencia | Contener decisiones de negocio |

### 4.3 Módulo raíz

El `app.module.ts` importa exclusivamente los módulos nuevos y el módulo global de Prisma. Los módulos legados —`gestion-documental`, `expediente-instruccion`, `documento-generico`, `apertura-pruebas`, `asignaciones`, `administracion-roles`— quedan fuera, así como `TypeOrmModule.forRoot` y el `DatabaseModule` que lo envuelve.

```mermaid
flowchart LR
  APP["app.module.ts"]
  APP --> P["PrismaModule<br/><i>global</i>"]
  APP --> M1["CuadroDiarioModule"]
  APP --> M2["OperativosModule"]
  APP --> M3["TransporteModule"]
  APP --> M4["TalentoOperativoModule"]
  APP --> M5["ConfiguracionModule"]
  APP --> M6["DocumentosModule"]
  APP --> M7["AuthModule"]
  LEG["Módulos legados<br/>TypeOrmModule · DatabaseModule"]
  APP -.->|"NO se importan"| LEG
  style LEG stroke-dasharray: 5 5,opacity:0.5
```

### 4.4 Comunicación entre módulos

La regla es que los módulos se comunican por **servicios publicados**, nunca accediendo a los repositorios ajenos. El caso más relevante es la consulta de elegibilidad: `operativos` no lee la tabla de funcionarios ni el historial; invoca al servicio de `talento-operativo`, que devuelve un veredicto con su motivo.

| Origen | Destino | Mecanismo | Qué se transfiere |
|---|---|---|---|
| `operativos` | `talento-operativo` | Servicio publicado | Veredicto de elegibilidad con motivo, no datos del funcionario |
| `operativos` | `configuracion` | Servicio publicado | Definición del formulario y sus catálogos |
| `transporte` | `operativos` | Servicio publicado | Operación específica de asignación |
| `transporte` | `talento-operativo` | Servicio publicado | Veredicto de elegibilidad del conductor |
| `documentos` | `operativos`, `transporte` | Servicio publicado | Datos consolidados de solo lectura |
| Cualquiera | `cuadro-diario` | Servicio publicado | Estado del cuadro para verificar si admite escritura |

### 4.5 Eventos de dominio

Los dieciséis eventos identificados en el análisis se implementan con el emisor de eventos de NestJS, en proceso. No se introduce una cola de mensajes: el volumen no lo justifica y añadiría una dependencia fuera del stack autorizado.

| Evento | Emisor | Escucha | Efecto |
|---|---|---|---|
| `OperativoRegistrado` | `operativos` | `transporte` | Incorpora a la bandeja de pendientes |
| `TransporteAsignado` | `transporte` | `operativos` | Recalcula alertas |
| `VentanaCargaVencida` | `configuracion` | `cuadro-diario` | Transición de estado del cuadro |
| `CuadroCerrado` | `cuadro-diario` | `talento-operativo` | Consolida historial de jornada |
| `CuadroCerrado` | `cuadro-diario` | `documentos` | Habilita emisión de órdenes |
| `CapacidadFlotaExcedida` | `transporte` | `documentos` | Registra advertencia en la matriz |

> **Decisión.** Los eventos se emiten **después** de confirmar la transacción, no dentro de ella. Un fallo en un escuchador no debe revertir el registro de un operativo válido.

---

## 5. ARQUITECTURA DEL FRONTEND

### 5.1 Estructura de carpetas

Se conserva la organización por responsabilidad del proyecto de referencia. Lo nuevo se agrega dentro de las carpetas existentes, agrupado por módulo.

```
transporte-frontend/
├── src/
│   ├── api/
│   │   ├── httpClient.ts                    # heredado · no se modifica
│   │   └── correlationId.ts                 # heredado
│   ├── config/
│   │   ├── env.ts                           # se extiende con nuevas variables
│   │   ├── routes.tsx                       # se agregan rutas del módulo
│   │   ├── navigation.ts                    # se agrega la sección del cuadro
│   │   ├── usuariosPrueba.ts                # se extiende con los 6 perfiles
│   │   └── validationSchemas.ts             # esquemas Yup del módulo
│   ├── components/
│   │   ├── common/                          # heredado · Table, Alert, Loading…
│   │   ├── forms/                           # heredado · FormikField
│   │   ├── navbar/                          # heredado · SelectorRolPruebas
│   │   └── cuadro/                          # NUEVO
│   │       ├── FormularioOperativo.tsx
│   │       ├── SelectorFormulario.tsx
│   │       ├── CamposCalculados.tsx
│   │       ├── SelectorPersonal.tsx
│   │       ├── SelectorZonalPunto.tsx
│   │       ├── BannerFormulario.tsx
│   │       ├── TablaOperativos.tsx
│   │       ├── CeldaAlerta.tsx
│   │       ├── PanelAsignacionTransporte.tsx
│   │       └── FilaSinInformacion.tsx
│   ├── interfaces/
│   │   ├── Operativo.ts
│   │   ├── Formulario.ts
│   │   ├── CuadroDiario.ts
│   │   ├── Personal.ts
│   │   ├── Transporte.ts
│   │   └── Alerta.ts
│   ├── services/
│   │   ├── CuadroDiarioService.ts
│   │   ├── OperativoService.ts
│   │   ├── TransporteService.ts
│   │   ├── CatalogoCuadroService.ts
│   │   ├── PersonalService.ts
│   │   └── DocumentoService.ts
│   ├── hooks/
│   │   ├── useCuadroDiario.ts
│   │   ├── useFormulariosPermitidos.ts
│   │   ├── useCatalogosFormulario.ts
│   │   └── useVentanaCarga.ts
│   ├── pages/
│   │   ├── CuadroRegistroPage.tsx           # DMIP y DMIT
│   │   ├── MisOperativosPage.tsx
│   │   ├── AsignacionTransportePage.tsx     # DAF
│   │   ├── MatrizConsolidadaPage.tsx        # Dirección
│   │   ├── OrdenesServicioPage.tsx
│   │   └── administracion/
│   │       ├── AdminPersonalPage.tsx
│   │       ├── AdminCatalogosCuadroPage.tsx
│   │       └── AdminVentanasPage.tsx
│   ├── styles/
│   │   └── cuadro/
│   │       ├── cuadro-banners.css           # colores de los 9 formularios
│   │       └── cuadro-alertas.css
│   └── utils/
│       ├── horario.util.ts                  # espejo de RangoHorario
│       └── cuadro.util.ts
```

### 5.2 Composición de pantallas por perfil

La pantalla no se construye ocultando controles: **se monta un árbol distinto según el rol**. Esta decisión hace que un perfil no autorizado no tenga siquiera el componente en memoria.

```mermaid
flowchart TD
  R{"Rol resuelto<br/>por UserContext"}
  R -->|"DMIP Operativos<br/>DMIP Inspecciones<br/>DMIT"| A["CuadroRegistroPage<br/>+ MisOperativosPage"]
  R -->|"DAF"| B["AsignacionTransportePage"]
  R -->|"Director"| C["MatrizConsolidadaPage<br/>+ OrdenesServicioPage"]
  R -->|"Administrador"| D["Páginas de administración"]

  A --> A1["SelectorFormulario<br/><i>solo formularios propios</i>"]
  A --> A2["FormularioOperativo<br/><i>disposición horizontal</i>"]
  A --> A3["TablaOperativos<br/><i>solo filas propias</i>"]
  B --> B1["Bandeja de pendientes"]
  B --> B2["PanelAsignacionTransporte<br/><i>dos campos habilitados</i>"]
  C --> C1["Matriz por banners"]
  C --> C2["Botón de exportación"]
  C --> C3["Emisión por fila"]
```

### 5.3 Rutas y protección

Se reutiliza el componente `RutaProtegida` del proyecto de referencia y la estructura de `routes.tsx` con carga diferida.

| Ruta | Página | Roles autorizados |
|---|---|---|
| `/cuadro/registro` | `CuadroRegistroPage` | DMIP Operativos, DMIP Inspecciones, DMIT |
| `/cuadro/mis-operativos` | `MisOperativosPage` | DMIP Operativos, DMIP Inspecciones, DMIT |
| `/cuadro/transporte` | `AsignacionTransportePage` | DAF |
| `/cuadro/jornada` | `JornadaDiaPage` | DMIT Instrucción |
| `/cuadro/matriz` | `MatrizConsolidadaPage` | Director |
| `/cuadro/ordenes` | `OrdenesServicioPage` | Director |
| `/administracion/personal` | `AdminPersonalPage` | Administrador |
| `/administracion/catalogos-cuadro` | `AdminCatalogosCuadroPage` | Administrador |
| `/administracion/ventanas` | `AdminVentanasPage` | Administrador |

En `navigation.ts` se agrega la sección del cuadro empleando el campo `allowedRoles` ya previsto por el estándar. Los ítems no autorizados se muestran atenuados, conforme a PER-07.

### 5.4 Gestión de estado y datos

| Necesidad | Mecanismo | Justificación |
|---|---|---|
| Identidad y rol | `UserContext` heredado | Ya existe y resuelve el patrón de rol provisional |
| Datos del servidor | Hooks propios sobre servicios | El estándar no incorpora una librería de caché de servidor |
| Estado del formulario | Formik con validación Yup | Convención institucional verificada |
| Tablas | TanStack Table | Convención institucional verificada |
| Modales | `ModalContext` heredado | Ya existe |
| Tema | `ThemeContext` heredado | Ya existe |

> **Observación.** El enunciado del proyecto menciona TanStack de forma genérica. En el proyecto de referencia solo está presente `@tanstack/react-table`. Incorporar `@tanstack/react-query` sería útil para la caché de catálogos, pero constituye una dependencia nueva y la convención `codigo-limpio-amc` exige avisar antes de instalarla. `PENDIENTE DE VALIDACIÓN CON EL USUARIO`.

### 5.5 Aplicación del sistema de diseño

Conforme al manual Nueva Imagen 2025 verificado en el proyecto:

| Elemento | Valor |
|---|---|
| Color primario de acción | `#3744d0` |
| Azul marino, estructura | `#20347d` |
| Azul medio | `#1b77bb` |
| Celeste | `#72b9e7` |
| Éxito | `#6ed0bd` |
| Información | `#8fa1ff` |
| Error | `#ea3446` |
| Tipografía | Montserrat, mayúsculas en títulos |
| Formas | Cajas rectas, sin degradados |

Los nueve colores de banner del cuadro son datos institucionales del negocio, no decisiones de diseño: provienen del libro Excel aprobado y los entrega el backend en la respuesta. El frontend no los define.

---

## 6. BASE DE DATOS

### 6.1 Decisiones estructurales

| Decisión | Valor | Justificación |
|---|---|---|
| Motor | PostgreSQL 18 | Igual al legado, evita divergencia de versión |
| Instancia | Propia, independiente | Decisión del Product Owner. Aísla respaldos y recursos |
| Base | `transportedb` | Nueva, sin objetos heredados |
| Esquema | `public` | No se requiere segmentación adicional |
| Acceso | Prisma Client | Decisión del Product Owner |
| Migraciones | `prisma/migrations` | La carpeta `db/` legada queda congelada |

### 6.2 Convenciones de nomenclatura

Se preserva la convención institucional de `snake_case` con prefijo por tabla, verificada en el legado, aunque el ORM cambie. Esto permite que el administrador de base de datos lea el esquema nuevo con la misma gramática que el resto del ecosistema.

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tabla | `t_` + nombre singular | `t_operativo` |
| Columna | prefijo de tres o cuatro letras + nombre | `oper_hora_inicio` |
| Clave primaria | prefijo + `_id` | `oper_id` |
| Clave foránea | prefijo de la tabla referida + `_id` | `cuad_id` |
| Tabla puente | `t_` + ambas entidades | `t_formulario_punto` |
| Índice | `idx_` + tabla + columnas | `idx_operativo_fecha_formulario` |
| Restricción única | `uq_` + tabla + columnas | `uq_operativo_cuadro_identificador` |

### 6.3 Modelo físico

```mermaid
erDiagram
  t_cuadro_diario ||--o{ t_operativo : contiene
  t_formulario ||--o{ t_operativo : clasifica
  t_operativo ||--o{ t_asignacion_personal : agrupa
  t_funcionario ||--o{ t_asignacion_personal : referencia
  t_operativo ||--o{ t_operativo_zonal : abarca
  t_zonal ||--o{ t_operativo_zonal : referencia
  t_operativo ||--o{ t_operativo_institucion : convoca
  t_institucion ||--o{ t_operativo_institucion : referencia
  t_operativo }o--o| t_conductor : compromete
  t_operativo }o--o| t_vehiculo : usa
  t_operativo }o--o| t_punto_encuentro : ocurre_en
  t_operativo }o--o| t_tipo_control : clasificado
  t_zonal ||--o{ t_punto_encuentro : agrupa
  t_formulario ||--o{ t_formulario_punto : delimita
  t_punto_encuentro ||--o{ t_formulario_punto : pertenece
  t_formulario ||--o{ t_formulario_tipo_control : delimita
  t_tipo_control ||--o{ t_formulario_tipo_control : pertenece
  t_formulario ||--o{ t_formulario_institucion : delimita
  t_institucion ||--o{ t_formulario_institucion : pertenece
  t_funcionario ||--o{ t_disponibilidad : declara
  t_conductor ||--o{ t_disponibilidad : declara
  t_vehiculo ||--o{ t_disponibilidad : declara
  t_funcionario ||--o{ t_historial_jornada : acumula
  t_operativo ||--o{ t_orden_servicio : origina
  t_funcionario ||--o{ t_orden_servicio : destinatario
  t_operativo ||--o{ t_auditoria : registra
  t_operativo ||--o{ t_solicitud_apoyo : genera
  t_cuadro_diario ||--o| t_capacidad_flota : declara
  t_ventana_carga ||--|| t_rol : parametriza
```

### 6.4 Estrategia de índices

Los índices se derivan de las consultas reales identificadas en los casos de uso, no de una regla general.

| Índice | Tabla y columnas | Consulta que resuelve |
|---|---|---|
| `idx_operativo_cuadro_formulario` | `t_operativo (cuad_id, form_id)` | Composición de la matriz consolidada agrupada por banner |
| `uq_operativo_cuadro_identificador` | `t_operativo (cuad_id, oper_identificador)` | Unicidad del identificador diario |
| `uq_operativo_cuadro_form_secuencial` | `t_operativo (cuad_id, form_id, oper_secuencial)` | Unicidad del secuencial por formulario |
| `idx_operativo_estado_transporte` | `t_operativo (cuad_id, oper_estado_transporte)` | Bandeja de pendientes de la DAF |
| `idx_operativo_conductor_horario` | `t_operativo (oper_conductor_id, oper_hora_inicio, oper_hora_fin)` | Detección de solapamiento de conductor |
| `idx_asignacion_funcionario` | `t_asignacion_personal (func_id)` | Detección de solapamiento de personal |
| `idx_historial_funcionario_fecha` | `t_historial_jornada (func_id, hist_fecha)` | Consulta de patrulla del día anterior |
| `idx_historial_funcionario_pesadas` | `t_historial_jornada (func_id, hist_fue_nocturna, hist_fue_fin_semana)` | Conteo de salidas pesadas |
| `idx_disponibilidad_rango` | `t_disponibilidad (func_id, disp_desde, disp_hasta)` | Verificación de disponibilidad en fecha |
| `idx_punto_zonal` | `t_punto_encuentro (zona_id)` | Filtrado en cascada |
| `idx_orden_funcionario` | `t_orden_servicio (func_id, oser_emitida_en)` | Consulta de órdenes propias |
| `idx_auditoria_operativo` | `t_auditoria (oper_id, audi_momento)` | Traza de cambios por operativo |

### 6.5 Control de concurrencia

El punto de contención está identificado: tres departamentos registran operativos en paralelo y el secuencial diario debe ser único.

| Situación | Estrategia |
|---|---|
| Generación del secuencial | Transacción con restricción única y reintento acotado ante colisión |
| Edición simultánea del mismo operativo | Bloqueo optimista mediante columna de versión |
| Asignación del mismo conductor a dos operativos | Verificación dentro de la transacción, respaldada por índice |
| Cierre del cuadro mientras se registra | Verificación del estado del cuadro dentro de la transacción de escritura |

> Se descarta el bloqueo pesimista sobre el cuadro. Bloquearlo para registrar un operativo reintroduciría por vía técnica la contención que el diseño de agregados evitó deliberadamente.

### 6.6 Estrategia de datos iniciales

La carga inicial es sustancial y proviene de fuentes verificadas.

| Catálogo | Volumen | Origen |
|---|---|---|
| Formularios | 9 | Hoja2 del libro Excel |
| Zonales | 10 más el ámbito DMQ | Hoja2 |
| Puntos de encuentro | Aproximadamente 70 | Hoja2, por formulario |
| Tipos de control | Aproximadamente 60 | Hoja2, por formulario |
| Instituciones | 16 | Hoja2 |
| Ventanas de carga | 6, una por rol | Parámetros acordados |
| Relación zonal ↔ punto | Pendiente | `PENDIENTE DE VALIDACIÓN CON EL USUARIO` |
| Personal | Pendiente | Compromiso del Product Owner |
| Conductores y vehículos | Pendiente | Debe solicitarse a la DAF |

---

## 7. DISEÑO CON PRISMA

### 7.1 Configuración

| Aspecto | Decisión |
|---|---|
| Proveedor | `postgresql` |
| Cliente | Generado en `node_modules/.prisma/client` |
| Conexión | Variable `DATABASE_URL` desde entorno |
| Registro de consultas | Activado en desarrollo, desactivado en producción |
| Ciclo de vida | `PrismaService` implementa conexión al iniciar y desconexión ordenada al terminar |
| Alcance | `PrismaModule` marcado como global, evitando importarlo en cada módulo |

### 7.2 Esquema — modelos principales

Se presenta el diseño del esquema. Los enumerados reflejan los objetos de valor identificados en el análisis de dominio.

```prisma
// ─────────────── Enumerados de dominio ───────────────

enum RolDepartamental {
  DMIP_OPERATIVOS
  DMIP_INSPECCIONES
  DMIT_INSTRUCTOR
  DAF
  DIRECTOR
  ADMINISTRADOR
  FUNCIONARIO
  ADMINISTRADOR_DMIP
  ADMINISTRADOR_DMIT
  ADMINISTRADOR_DAF
}

enum EstadoCuadro {
  BORRADOR
  EN_TRANSPORTE
  APROBADO
  CERRADO
}

/// Reemplaza los dos indicadores booleanos de la Fase 2 por tres estados
/// mutuamente excluyentes. Ver hallazgo HAL-01 del análisis de dominio.
enum EstadoTransporte {
  PENDIENTE
  ASIGNADO
  PROPIOS_MEDIOS
}

enum PoliticaVehiculo {
  NO_APLICA
  CONDICIONAL
  REQUERIDO
  OBLIGATORIO
}

enum AreaPersonal {
  GENERAL
  TECNICO
  INSTRUCCION
  OPERATIVOS
  CCF
}

enum TipoContrato {
  NOMBRAMIENTO
  OCASIONAL
}

enum EstadoDisponibilidad {
  DISPONIBLE
  VACACIONES
  REPOSO_MEDICO
  CALAMIDAD
  PERMISO
  MANTENIMIENTO
}

enum TipoVentana {
  SEMANAL
  DIARIO
  INTERVALO
}

enum NivelAlerta {
  INFORMATIVA
  CRITICA
}

// ─────────────── Configuración institucional ───────────────

model Formulario {
  id                Int              @id @default(autoincrement()) @map("form_id")
  numero            Int              @unique @map("form_numero")
  codigo            String           @unique @map("form_codigo") @db.VarChar(40)
  nombre            String           @map("form_nombre") @db.VarChar(160)
  prefijos          String[]         @map("form_prefijos")
  colorFondo        String           @map("form_color_fondo") @db.Char(7)
  colorAcento       String           @map("form_color_acento") @db.Char(7)
  colorNombre       String           @map("form_color_nombre") @db.VarChar(40)
  rolDueno          RolDepartamental @map("form_rol_dueno")
  rolCompartido     RolDepartamental? @map("form_rol_compartido")
  areasCompartido   AreaPersonal[]   @map("form_areas_compartido")
  cupoCompartido    Int?             @map("form_cupo_compartido")
  areasAdmitidas    AreaPersonal[]   @map("form_areas_admitidas")
  politicaVehiculo  PoliticaVehiculo @default(CONDICIONAL) @map("form_politica_vehiculo")
  condicionanteNoct Boolean          @default(false) @map("form_condicionante_nocturno")
  esPatrulla        Boolean          @default(false) @map("form_es_patrulla")
  vigenciaDesde     DateTime?        @map("form_vigencia_desde") @db.Date
  vigenciaHasta     DateTime?        @map("form_vigencia_hasta") @db.Date
  activo            Boolean          @default(true) @map("form_activo")

  operativos    Operativo[]
  puntos        FormularioPunto[]
  tiposControl  FormularioTipoControl[]
  instituciones FormularioInstitucion[]

  @@index([numero])
  @@index([rolDueno])
  @@map("t_formulario")
}

model Zonal {
  id     Int     @id @default(autoincrement()) @map("zona_id")
  codigo String  @unique @map("zona_codigo") @db.VarChar(30)
  nombre String  @map("zona_nombre") @db.VarChar(90)
  esDmq  Boolean @default(false) @map("zona_es_dmq")
  activo Boolean @default(true) @map("zona_activo")

  puntos     PuntoEncuentro[]
  operativos OperativoZonal[]

  @@map("t_zonal")
}

model PuntoEncuentro {
  id      Int     @id @default(autoincrement()) @map("pcto_id")
  nombre  String  @map("pcto_nombre") @db.VarChar(200)
  zonalId Int     @map("zona_id")
  activo  Boolean @default(true) @map("pcto_activo")

  zonal       Zonal             @relation(fields: [zonalId], references: [id])
  formularios FormularioPunto[]
  operativos  Operativo[]

  @@unique([nombre, zonalId])
  @@index([zonalId])
  @@map("t_punto_encuentro")
}

model FormularioPunto {
  formularioId Int @map("form_id")
  puntoId      Int @map("pcto_id")

  formulario Formulario     @relation(fields: [formularioId], references: [id], onDelete: Cascade)
  punto      PuntoEncuentro @relation(fields: [puntoId], references: [id], onDelete: Cascade)

  @@id([formularioId, puntoId])
  @@map("t_formulario_punto")
}

model VentanaCarga {
  id            Int              @id @default(autoincrement()) @map("vcar_id")
  rol           RolDepartamental @unique @map("vcar_rol")
  tipo          TipoVentana      @map("vcar_tipo")
  diaApertura   Int?             @map("vcar_dia_apertura")
  horaApertura  String?          @map("vcar_hora_apertura") @db.VarChar(5)
  diaCierre     Int?             @map("vcar_dia_cierre")
  horaCierre    String?          @map("vcar_hora_cierre") @db.VarChar(5)
  zonaHoraria   String           @default("America/Guayaquil") @map("vcar_zona_horaria") @db.VarChar(60)
  mensajeCierre String           @map("vcar_mensaje_cierre") @db.VarChar(400)
  activo        Boolean          @default(true) @map("vcar_activo")

  @@map("t_ventana_carga")
}

// ─────────────── Talento operativo ───────────────

model Funcionario {
  id           Int              @id @default(autoincrement()) @map("func_id")
  cedula       String           @unique @map("func_cedula") @db.VarChar(13)
  apellidos    String           @map("func_apellidos") @db.VarChar(90)
  nombres      String           @map("func_nombres") @db.VarChar(90)
  /// Asociado a la persona. No se digita en el formulario de operativo.
  telefono     String?          @map("func_telefono") @db.VarChar(20)
  cargo        String?          @map("func_cargo") @db.VarChar(90)
  area         AreaPersonal     @map("func_area")
  tipoContrato TipoContrato     @map("func_tipo_contrato")
  direccion    RolDepartamental @map("func_direccion")
  activo       Boolean          @default(true) @map("func_activo")

  asignaciones     AsignacionPersonal[]
  disponibilidades Disponibilidad[]
  historial        HistorialJornada[]
  ordenes          OrdenServicio[]

  @@index([area, activo])
  @@index([tipoContrato])
  @@map("t_funcionario")
}

model Disponibilidad {
  id            Int                  @id @default(autoincrement()) @map("disp_id")
  funcionarioId Int?                 @map("func_id")
  conductorId   Int?                 @map("cond_id")
  vehiculoId    Int?                 @map("vehi_id")
  estado        EstadoDisponibilidad @map("disp_estado")
  desde         DateTime             @map("disp_desde") @db.Date
  hasta         DateTime             @map("disp_hasta") @db.Date
  motivo        String?              @map("disp_motivo") @db.VarChar(220)

  funcionario Funcionario? @relation(fields: [funcionarioId], references: [id])
  conductor   Conductor?   @relation(fields: [conductorId], references: [id])
  vehiculo    Vehiculo?    @relation(fields: [vehiculoId], references: [id])

  @@index([funcionarioId, desde, hasta])
  @@index([conductorId, desde, hasta])
  @@map("t_disponibilidad")
}

/// Proyección persistida que alimenta las políticas de descanso.
/// Se actualiza con el evento CuadroCerrado.
model HistorialJornada {
  id            Int      @id @default(autoincrement()) @map("hist_id")
  funcionarioId Int      @map("func_id")
  fecha         DateTime @map("hist_fecha") @db.Date
  fuePatrulla   Boolean  @default(false) @map("hist_fue_patrulla")
  fueNocturna   Boolean  @default(false) @map("hist_fue_nocturna")
  fueFinSemana  Boolean  @default(false) @map("hist_fue_fin_semana")
  horasJornada  Decimal  @map("hist_horas_jornada") @db.Decimal(4, 1)

  funcionario Funcionario @relation(fields: [funcionarioId], references: [id], onDelete: Cascade)

  @@unique([funcionarioId, fecha])
  @@index([funcionarioId, fuePatrulla])
  @@index([funcionarioId, fueNocturna, fueFinSemana])
  @@map("t_historial_jornada")
}

model Conductor {
  id                Int     @id @default(autoincrement()) @map("cond_id")
  cedula            String  @unique @map("cond_cedula") @db.VarChar(13)
  nombreCompleto    String  @map("cond_nombre_completo") @db.VarChar(160)
  telefono          String? @map("cond_telefono") @db.VarChar(20)
  vehiculoHabitualId Int?   @map("cond_vehiculo_habitual_id")
  activo            Boolean @default(true) @map("cond_activo")

  vehiculoHabitual Vehiculo?        @relation(fields: [vehiculoHabitualId], references: [id])
  operativos       Operativo[]
  disponibilidades Disponibilidad[]

  @@map("t_conductor")
}

model Vehiculo {
  id          Int     @id @default(autoincrement()) @map("vehi_id")
  placa       String  @unique @map("vehi_placa") @db.VarChar(10)
  descripcion String? @map("vehi_descripcion") @db.VarChar(160)
  activo      Boolean @default(true) @map("vehi_activo")

  conductores      Conductor[]
  operativos       Operativo[]
  disponibilidades Disponibilidad[]

  @@map("t_vehiculo")
}

// ─────────────── Planificación operativa ───────────────

model CuadroDiario {
  id           Int          @id @default(autoincrement()) @map("cuad_id")
  fecha        DateTime     @unique @map("cuad_fecha") @db.Date
  ordenTrabajo String       @unique @map("cuad_orden_trabajo") @db.VarChar(40)
  nroSemana    Int          @map("cuad_nro_semana")
  anioSemana   Int          @map("cuad_anio_semana")
  estado       EstadoCuadro @default(BORRADOR) @map("cuad_estado")
  cerradoPorId Int?         @map("cuad_cerrado_por_id")
  cerradoEn    DateTime?    @map("cuad_cerrado_en") @db.Timestamptz(3)
  creadoEn     DateTime     @default(now()) @map("cuad_creado_en") @db.Timestamptz(3)

  operativos Operativo[]
  capacidad  CapacidadFlota?

  @@index([fecha, estado])
  @@map("t_cuadro_diario")
}

model Operativo {
  id               Int              @id @default(autoincrement()) @map("oper_id")
  cuadroId         Int              @map("cuad_id")
  formularioId     Int              @map("form_id")
  identificador    String           @map("oper_identificador") @db.VarChar(50)
  secuencial       Int              @map("oper_secuencial")
  horaInicio       String           @map("oper_hora_inicio") @db.VarChar(5)
  horaFin          String           @map("oper_hora_fin") @db.VarChar(5)
  esNocturno       Boolean          @default(false) @map("oper_es_nocturno")
  cruzaMedianoche  Boolean          @default(false) @map("oper_cruza_medianoche")
  duracionHoras    Decimal          @map("oper_duracion_horas") @db.Decimal(4, 1)
  puntoEncuentroId Int?             @map("pcto_id")
  puntoLibre       String?          @map("oper_punto_libre") @db.VarChar(220)
  tipoControlId    Int?             @map("tico_id")
  tipoLibre        String?          @map("oper_tipo_libre") @db.VarChar(220)

  // Asignación logística · exclusiva de la DAF
  estadoTransporte EstadoTransporte @default(PENDIENTE) @map("oper_estado_transporte")
  conductorId      Int?             @map("cond_id")
  vehiculoId       Int?             @map("vehi_id")
  asignadoEn       DateTime?        @map("oper_asignado_en") @db.Timestamptz(3)

  observaciones    String?          @map("oper_observaciones") @db.Text
  alertaActiva     Boolean          @default(true) @map("oper_alerta_activa")
  alertas          Json?            @map("oper_alertas") @db.JsonB

  // Trazabilidad
  creadoPorRol     RolDepartamental @map("oper_creado_por_rol")
  creadoPorId      Int              @map("oper_creado_por_id")
  modificadoPorRol RolDepartamental @map("oper_modificado_por_rol")
  modificadoPorId  Int              @map("oper_modificado_por_id")
  version          Int              @default(1) @map("oper_version")
  creadoEn         DateTime         @default(now()) @map("oper_creado_en") @db.Timestamptz(3)
  actualizadoEn    DateTime         @updatedAt @map("oper_actualizado_en") @db.Timestamptz(3)

  cuadro         CuadroDiario    @relation(fields: [cuadroId], references: [id], onDelete: Cascade)
  formulario     Formulario      @relation(fields: [formularioId], references: [id])
  puntoEncuentro PuntoEncuentro? @relation(fields: [puntoEncuentroId], references: [id])
  tipoControl    TipoControl?    @relation(fields: [tipoControlId], references: [id])
  conductor      Conductor?      @relation(fields: [conductorId], references: [id])
  vehiculo       Vehiculo?       @relation(fields: [vehiculoId], references: [id])

  zonales       OperativoZonal[]
  personal      AsignacionPersonal[]
  instituciones OperativoInstitucion[]
  ordenes       OrdenServicio[]
  auditoria     Auditoria[]
  solicitudes   SolicitudApoyo[]

  @@unique([cuadroId, identificador])
  @@unique([cuadroId, formularioId, secuencial])
  @@index([cuadroId, formularioId])
  @@index([cuadroId, estadoTransporte])
  @@index([conductorId, horaInicio, horaFin])
  @@index([creadoPorRol])
  @@map("t_operativo")
}

model AsignacionPersonal {
  id            Int              @id @default(autoincrement()) @map("aper_id")
  operativoId   Int              @map("oper_id")
  funcionarioId Int              @map("func_id")
  asignadoPor   RolDepartamental @map("aper_asignado_por")
  esResponsable Boolean          @default(false) @map("aper_es_responsable")
  creadoEn      DateTime         @default(now()) @map("aper_creado_en") @db.Timestamptz(3)

  operativo   Operativo   @relation(fields: [operativoId], references: [id], onDelete: Cascade)
  funcionario Funcionario @relation(fields: [funcionarioId], references: [id])

  @@unique([operativoId, funcionarioId])
  @@index([funcionarioId])
  @@map("t_asignacion_personal")
}

// ─────────────── Entregables y trazabilidad ───────────────

model OrdenServicio {
  id            Int      @id @default(autoincrement()) @map("oser_id")
  operativoId   Int      @map("oper_id")
  funcionarioId Int      @map("func_id")
  codigo        String   @unique @map("oser_codigo") @db.VarChar(50)
  /// Contenido congelado en el momento de la emisión. Garantiza INV-24.
  datoAislado   Json     @map("oser_dato_aislado") @db.JsonB
  emitidaPorId  Int      @map("oser_emitida_por_id")
  emitidaEn     DateTime @default(now()) @map("oser_emitida_en") @db.Timestamptz(3)
  vigente       Boolean  @default(true) @map("oser_vigente")

  operativo   Operativo   @relation(fields: [operativoId], references: [id])
  funcionario Funcionario @relation(fields: [funcionarioId], references: [id])

  @@index([funcionarioId, emitidaEn])
  @@map("t_orden_servicio")
}

model Auditoria {
  id            Int              @id @default(autoincrement()) @map("audi_id")
  operativoId   Int?             @map("oper_id")
  entidad       String           @map("audi_entidad") @db.VarChar(60)
  entidadId     Int              @map("audi_entidad_id")
  accion        String           @map("audi_accion") @db.VarChar(20)
  campo         String?          @map("audi_campo") @db.VarChar(60)
  valorAnterior String?          @map("audi_valor_anterior") @db.Text
  valorNuevo    String?          @map("audi_valor_nuevo") @db.Text
  usuarioId     Int              @map("audi_usuario_id")
  rol           RolDepartamental @map("audi_rol")
  correlacionId String?          @map("audi_correlacion_id") @db.VarChar(60)
  momento       DateTime         @default(now()) @map("audi_momento") @db.Timestamptz(3)

  operativo Operativo? @relation(fields: [operativoId], references: [id], onDelete: SetNull)

  @@index([operativoId, momento])
  @@index([entidad, entidadId])
  @@index([rol, momento])
  @@map("t_auditoria")
}
```

> El esquema completo incluye además `TipoControl`, `Institucion`, `FormularioTipoControl`, `FormularioInstitucion`, `OperativoZonal`, `OperativoInstitucion`, `CapacidadFlota` y `SolicitudApoyo`, que siguen el mismo patrón de nomenclatura y no se transcriben por brevedad.

### 7.3 Estrategia de migraciones

| Aspecto | Decisión |
|---|---|
| Desarrollo | `prisma migrate dev` genera y aplica la migración |
| Producción | `prisma migrate deploy` aplica lo pendiente, sin generar |
| Nomenclatura | Descriptiva en español: `agrega_estado_transporte` |
| Datos semilla | Script `seed.ts` idempotente, ejecutable múltiples veces |
| Coexistencia | La carpeta `db/` legada queda congelada y documentada como tal |

> **Nota de coordinación.** El estándar institucional aplica cambios de base con un ejecutor de scripts. Prisma trae su propio mecanismo. Ambos conviven sin conflicto porque operan sobre bases distintas, pero conviene dejarlo escrito en el `README` del proyecto para que quien lo retome no busque funciones `fu_*` que nunca existirán en esta base.

---

## 8. API REST

### 8.1 Convenciones

| Aspecto | Decisión |
|---|---|
| Prefijo | `/api/v1` |
| Formato | JSON en petición y respuesta |
| Nomenclatura de rutas | Sustantivos en plural, en español |
| Nomenclatura de campos | `camelCase` en el contrato, `snake_case` en la base |
| Fechas | ISO 8601 con zona horaria |
| Horas | Cadena `HH:MM` en intervalos de treinta minutos |
| Correlación | Cabecera `x-correlation-id`, propagada desde el frontend |
| Paginación | Parámetros `pagina` y `tamanio`, respuesta con metadatos |

### 8.2 Catálogo de endpoints

**Cuadro diario**

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/cuadros` | Administrador | Abre el cuadro de una fecha |
| `GET` | `/cuadros/:fecha` | Todos | Estado y metadatos del cuadro |
| `POST` | `/cuadros/:fecha/cerrar` | Director | Cierre y visto bueno final |
| `POST` | `/cuadros/:fecha/reabrir` | Director | Reapertura autorizada |

**Operativos**

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/operativos` | Departamentales | Operativos propios, filtrados por formulario y fecha |
| `POST` | `/operativos` | Departamentales | Registra un operativo |
| `GET` | `/operativos/:id` | Según propiedad | Detalle de un operativo |
| `PATCH` | `/operativos/:id` | Departamento dueño | Modifica un operativo propio |
| `DELETE` | `/operativos/:id` | Departamento dueño | Retira un operativo propio |
| `POST` | `/operativos/:id/adicional` | Departamento dueño | Registra un operativo **adicional** sobre uno ya existente. Ver más abajo |
| `POST` | `/operativos/:id/personal` | Departamento dueño o compartido | Asigna una persona |
| `DELETE` | `/operativos/:id/personal/:funcionarioId` | Departamento dueño | Retira una persona |
| `POST` | `/operativos/:id/apoyo` | Departamentales | Solicita apoyo a otra dirección |

**Transporte**

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/transporte/pendientes/:fecha` | DAF | Bandeja de asignación |
| `PATCH` | `/transporte/operativos/:id` | DAF | Asigna conductor y vehículo |
| `PATCH` | `/transporte/operativos/:id/propios-medios` | DAF | Declara que no requiere vehículo |
| `GET` | `/transporte/capacidad/:fecha` | DAF, Director | Demanda contra capacidad |
| `PUT` | `/transporte/capacidad/:fecha` | Administrador | Declara la capacidad del día |

**Documentos**

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/matriz/:fecha` | Director | Matriz consolidada completa |
| `GET` | `/matriz/:fecha/exportar` | Director | Documento horizontal |
| `GET` | `/jornada/:fecha` | DMIT Instrucción | La misma jornada, con cada sección marcada `ESCRITURA`, `APORTA` o `LECTURA` para quien consulta, y cada fila con `areasPendientesDelRol` —ALV-08—. **Sin ruta de exportación: no existe** |
| `POST` | `/operativos/:id/ordenes-servicio` | Director | Emite una orden por funcionario |
| `GET` | `/ordenes-servicio/mias` | Funcionario | Órdenes propias |

**Configuración y catálogos**

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/formularios/permitidos` | Todos | Formularios que el rol puede escribir |
| `GET` | `/formularios/:codigo/catalogos` | Todos | Catálogos del formulario |
| `GET` | `/zonales/:zonalId/puntos` | Todos | Puntos filtrados por zonal y formulario |
| `GET` | `/personal/elegible` | Departamentales | Personal que supera las políticas de descanso. Filtra por las áreas del formulario **y por las del departamento que consulta** (RF-014b); el rol sale de la sesión, nunca del parámetro |
| `PUT` | `/administracion/formularios/:codigo/areas` | Administrador | Reemplaza el conjunto de áreas admitidas. Rechaza dejarlo vacío y rechaza retirar un área con personal asignado en la jornada viva, **nombrando los operativos** |
| `GET` | `/ventanas/estado` | Todos | Si el rol puede escribir en este momento |
| `GET` `PUT` `POST` `DELETE` | `/administracion/personal…` | Administrador, y **los tres departamentales en consulta acotada a su propia dirección**, derivada de la sesión y **no** del `query`. Las ausencias las escribe cada departamento sobre su propia dirección; el alta, la edición y la baja llevan su propio `@Roles` de método (PER-09) |
| `GET` | `/administracion/directorio` | Administrador | Personal de la institución según Auth central, cruzado con las fichas locales. Ver §8.6 |
| `CRUD` | `/administracion/*` | Administrador | Gestión de catálogos, personal y parámetros |

### 8.3 Contrato del operativo adicional

> Incorporado el **2026-08-20**, a solicitud del negocio sobre el formulario PMO.

Un **adicional** es una salida extraordinaria que se dispone **por urgencia el mismo día en que
se ejecuta**, colgando de un operativo del cuadro que ya estaba planificado. No corrige al
original —para eso está `PATCH`— ni es una segunda salida programada.

**El cuerpo es el de `POST /operativos` menos dos campos.** `cuadroFecha` y `formularioCodigo` se
heredan del operativo del que nace y **enviarlos produce `400 CAMPOS_NO_PERMITIDOS`**: un adicional
en otra fecha no es un adicional, y en otro formulario llevaría un prefijo que no corresponde a su
padre. Todo lo demás —horario, zonales, punto, tipo, instituciones, personal y observaciones— es
suyo y puede diferir.

**Numera aparte.** El primer adicional del día es el `001` aunque el formulario lleve seis
operativos ordinarios, y lleva **prefijo propio**: `OCAPMO-001` frente a `OCPMO-001`. Los dos
códigos conviven sin ambigüedad porque el prefijo los separa. Qué prefijo nombra a los adicionales
lo declara `t_formulario_prefijo.fpre_es_adicional`, no una convención sobre el texto.

**Es la única escritura del sistema que no exige la ventana de carga (RN-56).** Se dispone cuando la
carga del departamento ya cerró, así que exigírsela lo haría imposible justo cuando hace falta. La
excepción está acotada, y el resto de la cadena se aplica igual:

| Comprobación | ¿Se aplica al adicional? |
|---|---|
| Identidad y rol | **Sí** |
| Propiedad del formulario | **Sí**, en el servicio: la ruta lleva el operativo, no un código |
| Estado del cuadro (RN-58) | **Depende de quién.** Un rol departamental sobre un cuadro `CERRADO` recibe `409 CUADRO_CERRADO`. La **Dirección no**: ver abajo |
| Ventana de carga (RN-56) | **No** |
| Auditoría | **Sí, y reforzada**: la traza anota de qué operativo nació y **si la ventana estaba abierta o cerrada** |

Implementado en un controlador propio que no declara `VentanaCargaGuard`, deliberadamente y no con
un decorador de exención: un mecanismo general acabaría puesto en un segundo endpoint, y la ventana
dejaría de ser una garantía.

#### La Dirección y el cuadro cerrado · RN-63, ampliada el 20-AGO-2026

**El caso normal es que el cuadro ya esté cerrado.** La operación real arma el cuadro, consolida la
matriz, la cierra, y **entonces** aparece la urgencia; con el cuadro abierto el adicional casi no
hace falta. La primera versión exigía cuadro abierto y dejaba la funcionalidad inservible justo en
el momento para el que se construyó.

RN-58 no dice que un cuadro cerrado sea inmutable: dice que **no admite modificaciones sin
autorización de la Dirección**. Si la Dirección es quien lo crea, la autorización es intrínseca.

| Quién | Cuadro abierto | Cuadro `CERRADO` |
|---|---|---|
| Departamento dueño | ✅ | ❌ `409 CUADRO_CERRADO` |
| `DIRECTOR` | ✅, y sobre **cualquier** formulario | ✅ |

Se descartó reabrir el cuadro: habría abierto la escritura a **todos** los departamentos durante
esa ventana, y con adicionales frecuentes eso no escala.

`DIRECTOR` va **primero** en el `@Roles` del endpoint, y el orden importa: `RolesGuard` estrecha el
rol efectivo al primero de la lista que la persona tenga, de modo que quien acumule Dirección y un
rol departamental actúe —y quede auditado— como Dirección.

**La traza lleva un tercer asiento**, `estado_cuadro`, con el estado **en el momento de crearlo**:
`CERRADO · dispuesto por la Dirección sobre un cuadro ya cerrado (RN-58)`. Es lo que convierte la
autorización en algo demostrable.

**Consecuencia sobre la matriz (RN-65).** Un adicional posterior al cierre desactualiza la copia ya
distribuida. La matriz no se almacena —se regenera al pedirla—, así que basta con volver a
descargarla: el documento sitúa los adicionales **después** de lo planificado, bajo una franja que
los nombra, y cada fila dice de qué operativo nace.

**Dos rechazos propios**, con código para que el frontend los distinga sin leer el texto:

| Código | Situación |
|---|---|
| `ADICIONAL_NO_ENCADENABLE` | Se intenta colgar un adicional de otro adicional. No se encadenan |
| `OPERATIVO_CON_ADICIONALES` | Se intenta retirar un operativo del que cuelgan adicionales vigentes. Se retira primero el adicional |

### 8.4 Contrato de asignación de transporte

Es el endpoint donde la autorización se materializa en el contrato. El objeto de transferencia admite exactamente dos propiedades; el `ValidationPipe` global está configurado con `whitelist` y `forbidNonWhitelisted`, de modo que cualquier campo adicional produce rechazo en lugar de ser ignorado silenciosamente.

**Petición**

```json
{
  "conductorId": 302,
  "vehiculoId": 27
}
```

**Respuesta correcta**

```json
{
  "id": 5120,
  "identificador": "ICNECU-001-31-JUL-2026",
  "estadoTransporte": "ASIGNADO",
  "conductor": { "id": 302, "nombre": "VIVANCO JORGE", "telefono": "97 863 1797" },
  "vehiculo": { "id": 27, "placa": "PMA7892" },
  "asignadoEn": "2026-07-30T15:42:11-05:00",
  "alertaActiva": false,
  "alertas": []
}
```

**Rechazo por campos no permitidos**

```json
{
  "statusCode": 400,
  "codigo": "CAMPOS_NO_PERMITIDOS",
  "mensaje": "Transportes solo puede modificar el conductor y el vehículo. El resto de la planificación llega bloqueado.",
  "detalles": { "camposRechazados": ["horaInicio", "puntoEncuentroId"] },
  "correlacionId": "0f2c…",
  "timestamp": "2026-07-30T15:42:11-05:00",
  "ruta": "/api/v1/transporte/operativos/5120"
}
```

### 8.5 Versionamiento de la API

| Aspecto | Decisión |
|---|---|
| Estrategia | Versión en la ruta, `/api/v1` |
| Criterio de cambio de versión | Solo ante ruptura de contrato: eliminar campo, cambiar tipo o alterar semántica |
| Cambios compatibles | Agregar campos opcionales o endpoints nuevos, sin cambiar versión |
| Convivencia | Dos versiones activas como máximo durante la transición |
| Depreciación | Cabecera de aviso y comunicación previa al frontend |

### 8.6 Contrato del directorio de Auth central

`GET /administracion/directorio` · `@Roles(ADMINISTRADOR_DMIP)` · añadido el 2026-08-21.

> **La respuesta va envuelta desde el 2026-08-24**, y el ejemplo de abajo es el contenido de
> `personas`:
>
> ```jsonc
> { "disponible": true, "motivo": null, "personas": [ /* … */ ] }
> ```
>
> **Ya no responde 503 cuando Auth falla.** Devuelve `disponible: false` con el `motivo`
> redactado y `personas: []`. El motivo del cambio es que el directorio dejó de ser una pestaña
> de consulta y pasó a ser **el primer paso del alta de personal**: con una excepción, la pantalla
> tendría que distinguir por el `catch` entre «no se pudo preguntar» y «preguntamos y no hay
> nadie», que son cosas distintas. Es el mismo contrato —y los mismos tres campos— que usa el
> módulo de Instrucción para esto.
>
> **Solo se atrapa la indisponibilidad de Auth.** Un fallo de nuestra base o un defecto de
> programación sigue subiendo al filtro global: disfrazarlo de `disponible: false` acusaría a
> Auth de algo que no hizo. Lo fija `directorio.controller.spec.ts`.

Existe por **PV-02**: el maestro de personal se cargaba a mano, y la institución ya tiene
esos datos en Auth central. Este endpoint **no crea ni modifica nada**: pone lo que Auth
sabe al lado de lo que sabemos aquí, para que el administrador dé de alta las fichas que
falten. `t_funcionario` sigue siendo el maestro del que cuelgan asignaciones, ausencias,
historial y órdenes de servicio.

```jsonc
[
  {
    "authId": 42,
    "cedula": "1712345678",
    "nombre": "PEREZ LOPEZ JUAN CARLOS",   // Auth lo guarda en UN SOLO campo
    "usuario": "jcperez",
    "correo": "jcperez@amc.gob.ec",
    "dependencia": "DMIP",                  // resuelta del catálogo de Auth
    "roles": ["(Cuadro de Colores) Administrador"],
    "inspector": { "tipo": "IT", "zonal": "Zonal Norte", "codigo": "IT-014" },
    "ficha": {                              // null ⇒ no puede ser convocado todavía
      "id": 150, "apellidos": "PEREZ LOPEZ", "nombres": "JUAN CARLOS",
      "area": "GENERAL", "tipoContrato": "NOMBRAMIENTO", "activo": true
    }
  }
]
```

**Cinco hechos que condicionan el diseño, comprobados en el código fuente de Auth:**

1. **Auth no tiene token de servicio ni clave de API.** La única credencial con la que se
   puede consultar `/users` es la de la persona que pregunta, así que el backend
   **conserva el token de Auth dentro de su propio token de sesión**. Es un cambio de
   postura de seguridad y está anotado como tal en `common/auth/token-sesion.ts`: quien
   obtenga la cookie obtiene una credencial de Auth. La cookie es `HttpOnly`, la sesión
   caduca con la de Auth y la CSP `connect-src 'self'` impide sacarla desde el navegador.
2. **Auth no conoce el tipo de contrato.** Ni nombramiento, ni ocasional, ni vinculación.
   Es justo el dato del que dependen RN-26 y RN-33 —quién puede salir de noche y en fin de
   semana—, así que se sigue capturando al crear la ficha. Tampoco conoce el área, el cargo
   ni el teléfono.
3. **`GET /users` no pagina ni filtra.** Devuelve la institución entera, activos e
   inactivos. El filtro por `active` y la paginación se hacen aquí.
4. **`GET /users` no comprueba rol**: cualquier sesión válida de cualquier subsistema puede
   listar al personal completo con su cédula y su correo. **No es nuestro para arreglarlo y
   se reporta al equipo de Auth**; nuestro endpoint sí exige `ADMINISTRADOR_DMIP`.
5. **El cruce es por cédula**, que es la única llave común. Una persona de Auth sin cédula
   sale en la lista pero **no se le puede crear la ficha**, y la pantalla lo explica.

El nombre se parte en apellidos y nombres por heurística —las dos primeras palabras son
los apellidos, que es lo que hace el propio Auth—, así que llega al formulario como valor
**editable**: «DE LA TORRE PEREZ JUAN» sale mal y quien da de alta lo corrige.

Si Auth no responde, si el ambiente no tiene `AUTH_API_URL` o si la sesión es anterior al
2026-08-21 y no lleva token de Auth, el endpoint responde **`503` con código
`AUTH_NO_DISPONIBLE`** y un mensaje redactado que la pantalla muestra tal cual. La vista
«Maestro» de P-07 sigue funcionando igual.

**Dos cosas que solo se supieron al llamar al Auth desplegado, el 2026-08-21:**

1. **El token va con el prefijo `Bearer`, y omitirlo no se parece a un error de
   autenticación.** Auth responde lo mismo a un token pelado que a una petición sin
   cabecera —`500` «Token no encontrado»—, mientras que con `Bearer` y un token malo
   responde `500` «Token incorrecto o expirado». La primera versión del cliente lo enviaba
   pelado, copiando al otro módulo que consume `/users` —que reenvía la cabecera entera del
   navegador y por eso ya lo trae—, y el diagnóstico apuntaba a la sesión del administrador.
2. **Auth no usa `401`: rechaza con `500` y el motivo en el cuerpo.** Por eso el cliente
   arrastra ese texto al mensaje: es lo único que distingue una sesión caducada de un token
   que no llegó.

---

## 9. AUTENTICACIÓN

### 9.1 Situación y estrategia

El microservicio de identidad contra Active Directory está en desarrollo en otro proyecto y se integrará al final. La arquitectura se diseña de modo que esa integración sea **un cambio de una sola pieza**.

La clave está en separar dos responsabilidades que suelen confundirse: **quién es el usuario** (autenticación) y **qué puede hacer** (autorización). La segunda se construye completa desde ahora, porque es donde vive la lógica de negocio. La primera se reduce a un único punto: cómo se llena `request.user`.

```mermaid
flowchart LR
  subgraph HOY["Etapa actual · identidad provisional"]
    H1["Frontend<br/>SelectorRolPruebas"] -->|"cabecera<br/>x-usuario-prueba"| H2["IdentidadGuard<br/>modo provisional"]
    H2 --> H3["request.user"]
  end
  subgraph MANANA["Etapa final · identidad real"]
    M1["Frontend<br/>token del microservicio"] -->|"Authorization<br/>Bearer"| M2["IdentidadGuard<br/>modo JWT"]
    M2 --> M3["request.user"]
  end
  H3 --> COMUN["<b>Cadena de autorización</b><br/>RolesGuard<br/>FormularioRolGuard<br/>VentanaCargaGuard<br/><i>sin cambios</i>"]
  M3 --> COMUN
```

### 9.2 Patrón provisional

El proyecto de referencia ya resolvió este escenario y su solución se reutiliza sin inventar nada:

| Pieza | Ubicación | Estado |
|---|---|---|
| `SelectorRolPruebas.tsx` | `components/navbar/` | Existe. Se extiende con los seis perfiles del módulo |
| `usuariosPrueba.ts` | `config/` | Existe. Se extiende con los perfiles departamentales |
| `UserContext.tsx` | `context/` | Existe. Se reutiliza tal cual |
| `IdentidadGuard` | `common/auth/guards/` | Nuevo. Único punto que cambiará al integrar |

Ambos archivos del frontend conservan el comentario de advertencia del estándar: *temporal, eliminar cuando el login esté operativo*. La cabecera provisional que transporta la identidad se acepta **únicamente cuando la variable de entorno de modo provisional está activa**, y nunca en el perfil de producción.

### 9.3 Plan de integración final

| Paso | Acción | Alcance |
|---|---|---|
| 1 | Implementar el modo JWT del `IdentidadGuard`, validando firma, expiración y emisor | Un archivo |
| 2 | Mapear las reclamaciones del token a la interfaz `UsuarioAutenticado` | Un archivo |
| 3 | Registrar el resolutor de token en `httpClient` | El código ya está previsto y comentado en el estándar |
| 4 | Retirar `SelectorRolPruebas` y `usuariosPrueba` | Dos archivos |
| 5 | Desactivar la variable de modo provisional | Configuración |

> Ninguno de los pasos toca los servicios, las políticas ni los repositorios. Esa es la medida del acierto del diseño.

---

## 10. AUTORIZACIÓN

### 10.1 Cadena de verificación

La autorización se resuelve en cuatro guardas encadenadas, cada una con una responsabilidad única. Se ejecutan en orden y la primera que falla detiene la petición.

```mermaid
flowchart TD
  P["Petición entrante"] --> G1{"<b>IdentidadGuard</b><br/>¿quién es?"}
  G1 -->|"sin identidad"| E1(["401 · No autenticado"])
  G1 --> G2{"<b>RolesGuard</b><br/>¿su rol accede<br/>a este endpoint?"}
  G2 -->|"rol no permitido"| E2(["403 · Rol no autorizado"])
  G2 --> G3{"<b>FormularioRolGuard</b><br/>¿el formulario le<br/>pertenece?"}
  G3 -->|"formulario ajeno"| E3(["403 · Formulario ajeno"])
  G3 --> G4{"<b>VentanaCargaGuard</b><br/>¿puede escribir<br/>en este momento?"}
  G4 -->|"fuera de ventana"| E4(["423 · Ventana cerrada"])
  G4 --> V{"<b>ValidationPipe</b><br/>¿el cuerpo respeta<br/>el contrato?"}
  V -->|"campos no permitidos"| E5(["400 · Campos rechazados"])
  V --> S["Servicio de aplicación<br/>reglas de negocio"]
  S -->|"regla incumplida"| E6(["409 · Motivo en lenguaje claro"])
  S --> OK(["200 · 201"])
```

### 10.2 Responsabilidad de cada guarda

| Guarda | Pregunta que responde | Fuente de verdad |
|---|---|---|
| `IdentidadGuard` | ¿Quién realiza la petición? | Token o cabecera provisional |
| `RolesGuard` | ¿El rol figura entre los autorizados para este endpoint? | Decorador `@Roles()` sobre el controlador |
| `FormularioRolGuard` | ¿El formulario del cuerpo o de la ruta pertenece a este rol? | Tabla `t_formulario`, columnas de rol dueño y compartido |
| `VentanaCargaGuard` | ¿El rol puede escribir en este momento? | Tabla `t_ventana_carga`, evaluada en `America/Guayaquil` |

### 10.3 Restricción de la DAF

La restricción a dos campos se aplica en tres niveles independientes, de modo que ninguno sea el único punto de defensa:

| Nivel | Mecanismo |
|---|---|
| Contrato | `AsignarTransporteDto` declara únicamente `conductorId` y `vehiculoId` |
| Validación | `forbidNonWhitelisted` rechaza cualquier campo adicional |
| Servicio | El método de aplicación solo escribe esas dos columnas y el estado de transporte |
| Endpoint | Ruta separada bajo `/transporte`, con `@Roles(DAF)` |

### 10.4 Cupo compartido del formulario 6

Es el único caso donde un rol escribe en un formulario ajeno, con alcance acotado. La verificación no puede resolverse en una guarda porque depende del contenido: qué área tiene la persona que se pretende asignar y cuántas lleva el rol en ese operativo. Se resuelve por tanto en la capa de aplicación, con la definición del formulario como fuente.

---

## 11. AUDITORÍA

### 11.1 Alcance

| Se audita | No se audita |
|---|---|
| Creación, modificación y eliminación de operativos | Consultas de lectura |
| Asignación y retiro de personal | Navegación |
| Asignación de transporte y declaración de propios medios | Exportación de documentos |
| Cierre y reapertura del cuadro | Cambios de tema o preferencias |
| Cambios en catálogos y personal | |
| Emisión de órdenes de servicio | |

### 11.2 Mecanismo

Se implementa como interceptor sobre las operaciones de escritura, complementado con registro explícito en los servicios cuando se requiere detalle de campo.

| Dato registrado | Origen |
|---|---|
| Entidad y su identificador | Ruta y cuerpo |
| Acción | Método HTTP y operación |
| Campo, valor anterior y valor nuevo | Comparación en el servicio, solo en modificaciones |
| Usuario y rol | `request.user` |
| Identificador de correlación | Cabecera `x-correlation-id` |
| Momento | Marca de tiempo con zona |

> **Decisión.** La auditoría se escribe en la misma transacción que la operación auditada. Un registro que puede perderse ante un fallo parcial no sirve como evidencia, y la evidencia es precisamente el propósito de esta funcionalidad: el Product Owner declaró que hoy la responsabilidad recae siempre sobre quien consolida, sin forma de demostrar quién cambió qué.

### 11.3 Retención

`PENDIENTE DE VALIDACIÓN CON EL USUARIO` — La política de retención de registros de auditoría no está definida. Se recomienda conservar sin purga durante el primer año de operación y revisar entonces.

---

## 12. LOGS

### 12.1 Niveles y criterio

| Nivel | Uso | Ejemplo |
|---|---|---|
| `error` | Fallos no controlados y errores de infraestructura | Pérdida de conexión con la base |
| `warn` | Situaciones anómalas que no detienen la operación | Capacidad de flota excedida |
| `info` | Hitos del negocio | Cuadro cerrado, orden emitida |
| `debug` | Detalle de diagnóstico | Solo en desarrollo |

### 12.2 Formato estructurado

Los registros se emiten como objetos estructurados, no como texto libre, para permitir su explotación posterior.

| Campo | Descripción |
|---|---|
| `momento` | Marca de tiempo ISO con zona |
| `nivel` | Nivel del registro |
| `modulo` | Módulo que lo emite |
| `operacion` | Caso de uso en curso |
| `correlacionId` | Identificador que enlaza toda la petición |
| `usuarioId` y `rol` | Cuando hay identidad resuelta |
| `mensaje` | Descripción legible |
| `duracionMs` | En registros de fin de operación |

### 12.3 Trazabilidad por correlación

El identificador de correlación se genera en el frontend, viaja en la cabecera `x-correlation-id` —mecanismo ya presente en el `httpClient` del estándar—, se propaga por todos los registros del backend y se devuelve en las respuestas de error. Esto permite reconstruir una petición completa desde el clic del usuario hasta la consulta a la base.

### 12.4 Lo que nunca se registra

| Prohibido en logs | Motivo |
|---|---|
| Teléfonos del personal | Dato personal |
| Cédulas | Dato personal |
| Contenido completo de órdenes de servicio | Contradice el principio de aislamiento |
| Tokens o credenciales | Riesgo de seguridad |
| Cuerpos completos de peticiones con datos personales | Se registra el identificador, no el contenido |

---

## 13. MANEJO DE ERRORES

### 13.1 Jerarquía

Se extiende la clase `ApplicationError` del estándar, que ya contempla mensaje, código de estado, código de error y detalles.

| Error | Código HTTP | Cuándo se emite |
|---|---|---|
| `ApplicationError` | 500 | Base de la jerarquía |
| `ValidacionError` | 400 | Datos con forma incorrecta |
| `AutorizacionError` | 403 | Rol sin permiso sobre el recurso |
| `RecursoNoEncontradoError` | 404 | Identificador inexistente |
| `VentanaCerradaError` | 423 | Escritura fuera de la ventana del rol |
| `ReglaNegocioError` | 409 | Regla de descanso, duplicidad o condicionante |
| `ConflictoConcurrenciaError` | 409 | Versión desactualizada del operativo |

### 13.2 Formato uniforme de respuesta

Se conserva la estructura del `AllExceptionsFilter` del estándar, extendida con el código de error, los detalles y el identificador de correlación.

```json
{
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer. No puede tener patrulla dos días seguidos, ni diurna ni nocturna.",
  "detalles": {
    "funcionarioId": 118,
    "fechaUltimaPatrulla": "2026-07-30",
    "sugerencia": "Elija otra persona del área General disponible para hoy."
  },
  "correlacionId": "0f2c8a1e-…",
  "timestamp": "2026-07-31T09:14:22-05:00",
  "ruta": "/api/v1/operativos/5120/personal"
}
```

### 13.3 Criterio de redacción

El campo `mensaje` va dirigido al usuario final y se muestra tal cual en la interfaz. Debe nombrar a la persona o el recurso implicado y explicar el motivo en términos operativos. El campo `codigo` va dirigido al desarrollador y permite al frontend reaccionar de forma diferenciada sin interpretar cadenas de texto.

Esta separación resuelve un problema declarado en las reuniones: hoy el personal desconoce por qué se rechaza una asignación, y quien digita no tiene forma de explicarlo.

### 13.4 Tratamiento en el frontend

| Código HTTP | Comportamiento en la interfaz |
|---|---|
| 400 | Marca el campo implicado y muestra el mensaje junto a él |
| 401 | Redirige al inicio de sesión |
| 403 | Aviso claro de que el perfil no tiene permiso |
| 404 | Mensaje de recurso inexistente |
| 409 | Aviso destacado con el mensaje completo, sin perder lo capturado |
| 423 | Bloquea el formulario y muestra la hora de reapertura |
| 500 | Mensaje genérico más el identificador de correlación para soporte |

---

## 14. VERSIONAMIENTO

| Ámbito | Estrategia |
|---|---|
| **API** | Versión en la ruta `/api/v1`. Cambio de versión solo ante ruptura de contrato |
| **Base de datos** | Migraciones de Prisma, numeradas y descriptivas, aplicadas en orden |
| **Código** | Ramas por funcionalidad. Mensajes de confirmación cortos, en español, estilo convencional, sin atribución a herramientas |
| **Imágenes de contenedor** | Etiqueta semántica más `latest` para el despliegue corriente |
| **Catálogos** | Sin versión. Los valores se desactivan lógicamente, nunca se eliminan, preservando la integridad de cuadros históricos |
| **Documentación** | Versionada junto al código, en la carpeta `docs/` |

---

## 15. SEGURIDAD

### 15.1 Medidas por capa

| Capa | Medida |
|---|---|
| Transporte | HTTPS en producción. Lista blanca de orígenes mediante la variable `CORS_ORIGINS` ya prevista en el estándar |
| Entrada | `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y transformación. DTO tipados en todos los endpoints |
| Consulta | Prisma parametriza toda consulta. Se prohíbe la interpolación de cadenas en consultas crudas |
| Autorización | Cadena de cuatro guardas verificada en el servidor, con independencia del estado de la interfaz |
| Datos personales | Teléfonos y cédulas nunca en logs. La orden de servicio expone únicamente los cuatro datos autorizados. **Desde el 2026-08-27 el maestro de personal —cédulas, teléfonos y motivos de ausencia— lo consultan además los tres roles departamentales**, por decisión del negocio: ver PER-09 |
| Contenedor | Ejecución con usuario no privilegiado, imagen de construcción multietapa |
| Secretos | Variables de entorno. El archivo de entorno excluido del control de versiones |
| Auditoría | Toda escritura registrada con usuario, rol y momento |

### 15.2 Amenazas consideradas

| Amenaza | Mitigación |
|---|---|
| Un departamento escribe en formulario ajeno manipulando la petición | `FormularioRolGuard` verifica contra la base, no contra el cuerpo |
| La DAF modifica campos fuera de su alcance | Contrato de dos campos más rechazo de campos adicionales |
| Un funcionario accede a órdenes de terceros | Filtrado por identidad en el servidor, no por parámetro de la petición |
| Escritura después del cierre del cuadro | Verificación del estado dentro de la transacción |
| Fuga del **documento** del cuadro completo | El PDF de la matriz solo se emite al rol Director. Es el artefacto que circulaba por WhatsApp, y RN-44 lo retiró de los canales informales |
| Fuga del cuadro completo **en pantalla** | Mitigación **reducida el 2026-08-26** por decisión de negocio: además del Director, DMIT Instrucción ve los nueve formularios en P-13 (`GET /jornada/:fecha`). Los otros dos roles departamentales y la DAF siguen recibiendo únicamente sus filas. Ver PER-02 en `FASE2` §4.4 |
| Escritura fuera del formulario propio desde una pantalla que muestra los nueve | `exigirParticipacion` verifica contra `t_formulario_rol`, no contra lo que la pantalla ofrezca. Un botón pintado de más devuelve 403 |
| Registro concurrente con identificador duplicado | Restricción única en base más transacción con reintento |

> **Observación sobre el alcance de la seguridad.** El proyecto nace de una filtración de información: el cuadro circulaba por WhatsApp y los intervenidos se anticipaban al operativo. Las medidas de aislamiento no son aquí buenas prácticas genéricas, sino el requisito funcional que originó el encargo.

---

## 16. DOCKER Y DESPLIEGUE

### 16.1 Servicios y puertos

| Servicio | Contenedor | Puerto externo | Puerto interno | Volumen |
|---|---|---|---|---|
| Base de datos | `transportedb` | 5434 | 5432 | `transporte_pgdata` |
| Backend | `transporte-app` | 3003 | 3003 | `./uploads` |
| Frontend | `transporte-front` | 5176 | 5176 | — |

Los puertos se eligieron para no colisionar con el módulo de Instrucción, que ocupa 5433, 3002 y 5175.

### 16.2 Orquestación

```yaml
services:
  transportedb:
    image: postgres:18
    container_name: transportedb
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
      POSTGRES_DB: transportedb
    ports:
      - "5434:5432"
    volumes:
      - transporte_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d transportedb"]
      interval: 10s
      timeout: 5s
      retries: 5

  transporte-app:
    image: transporte-backend:latest
    container_name: transporte-app
    restart: unless-stopped
    depends_on:
      transportedb:
        condition: service_healthy
    env_file:
      - .env
    environment:
      PORT: "3003"
      DATABASE_URL: "postgresql://postgres:${DB_PASSWORD}@transportedb:5432/transportedb?schema=public"
      TZ: "America/Guayaquil"
    ports:
      - "3003:3003"
    volumes:
      - ./uploads:/app/uploads

  transporte-front:
    image: transporte-frontend:latest
    container_name: transporte-front
    restart: unless-stopped
    depends_on:
      - transporte-app
    ports:
      - "5176:5176"

volumes:
  transporte_pgdata:
```

### 16.3 Imagen del backend

Se conserva la construcción multietapa del estándar, con dos diferencias: se agrega la generación del cliente de Prisma en la etapa de construcción, y se retira la instalación de LibreOffice, que servía a la generación de documentos del módulo legado y aquí no se requiere.

| Etapa | Contenido |
|---|---|
| Construcción | Node 20, instalación completa de dependencias, generación del cliente Prisma, compilación |
| Ejecución | Node 20 ligero, solo dependencias de producción, cliente Prisma generado, usuario no privilegiado, gestor de señales |

> **Punto de atención.** El cliente de Prisma debe generarse dentro de la imagen y no copiarse desde la máquina de desarrollo, porque incluye binarios específicos de la plataforma. Es la causa más frecuente de fallo al contenerizar proyectos con Prisma.

### 16.4 Aplicación de migraciones

Las migraciones **no se aplican al arrancar el contenedor**. Se ejecutan como paso explícito del despliegue, con `prisma migrate deploy`, por la misma razón que el estándar institucional mantiene los cambios de base fuera del arranque: un arranque que modifica el esquema es un arranque que puede dejar la base a medias.

### 16.5 Variables de entorno

| Variable | Propósito |
|---|---|
| `PORT` | Puerto de escucha del backend |
| `DATABASE_URL` | Cadena de conexión de Prisma |
| `CORS_ORIGINS` | Lista blanca de orígenes |
| `TZ` | Zona horaria, determinante para las ventanas de carga |
| `LOG_LEVEL` | Nivel mínimo de registro |
| `MODO_IDENTIDAD_PROVISIONAL` | Habilita la cabecera de identidad de pruebas. Falso en producción |
| `VITE_API_BASE_URL` | Base de la API para el frontend |

---

## 17. DIAGRAMA DE DESPLIEGUE

```mermaid
flowchart TB
  subgraph CLIENTE["Estación de trabajo · AMC"]
    NAV["Navegador<br/>SPA React"]
  end

  subgraph SERVIDOR["Servidor institucional"]
    subgraph DOCKER["Docker Engine"]
      subgraph RED["Red interna · transporte-net"]
        C1["<b>transporte-front</b><br/>nginx · 5176"]
        C2["<b>transporte-app</b><br/>NestJS · 3003<br/>usuario no privilegiado"]
        C3[("<b>transportedb</b><br/>PostgreSQL 18 · 5432")]
      end
      V1[("Volumen<br/>transporte_pgdata")]
      V2[("Volumen<br/>uploads")]
    end
    LEG["Contenedores del módulo<br/>de Instrucción<br/>5433 · 3002 · 5175"]
  end

  subgraph EXT["Servicios externos"]
    AD["Microservicio de Identidad<br/>Active Directory<br/><i>integración final</i>"]
  end

  NAV -->|"HTTPS · 5176"| C1
  NAV -->|"HTTPS · 3003<br/>/api/v1"| C2
  C1 -.->|"sirve la SPA"| NAV
  C2 -->|"5432 · red interna"| C3
  C3 --- V1
  C2 --- V2
  C2 -.->|"pendiente"| AD
  LEG -.->|"sin comunicación<br/>bases independientes"| C3
  style LEG stroke-dasharray: 5 5,opacity:0.55
```

---

## 18. DIAGRAMAS DE SECUENCIA

### 18.1 Registro de un operativo

```mermaid
sequenceDiagram
  autonumber
  actor U as Asistente<br/>DMIP Operativos
  participant FE as Frontend
  participant GD as Cadena de guardas
  participant CT as OperativosController
  participant SV as OperativosService
  participant TA as ElegibilidadService<br/>talento-operativo
  participant CF as FormulariosService<br/>configuracion
  participant PR as Prisma
  participant DB as PostgreSQL

  U->>FE: Completa el formulario
  FE->>GD: POST /api/v1/operativos<br/>x-correlation-id
  GD->>GD: Identidad · Rol · Formulario · Ventana
  GD->>CT: petición autorizada
  CT->>CT: Valida el DTO
  CT->>SV: registrarOperativo(datos, usuario)

  SV->>CF: obtenerDefinicion(formulario)
  CF-->>SV: áreas admitidas, política de vehículo,<br/>condicionante nocturno

  loop por cada persona asignada
    SV->>TA: verificarElegibilidad(persona, turno)
    TA->>PR: consulta disponibilidad e historial
    PR->>DB: SELECT
    DB-->>PR: datos
    PR-->>TA: datos
    TA-->>SV: veredicto y motivo
  end

  alt alguna persona no es elegible
    SV-->>CT: ReglaNegocioError
    CT-->>FE: 409 con motivo en lenguaje claro
    FE-->>U: Aviso con nombre y motivo
  else todas elegibles
    SV->>SV: Verifica exclusividad horaria
    SV->>PR: transacción
    PR->>DB: genera secuencial
    PR->>DB: INSERT operativo
    PR->>DB: INSERT asignaciones, zonales, instituciones
    PR->>DB: INSERT auditoría
    DB-->>PR: confirmación
    PR-->>SV: operativo creado
    SV->>SV: Calcula alertas
    SV-->>CT: operativo con alertas
    CT-->>FE: 201 Created
    FE-->>U: Fila con alerta amarilla<br/>en conductor y placa
    SV--)SV: emite OperativoRegistrado
  end
```

### 18.2 Asignación de transporte por la DAF

```mermaid
sequenceDiagram
  autonumber
  actor A as Analista DAF
  participant FE as Frontend
  participant GD as Cadena de guardas
  participant VP as ValidationPipe
  participant CT as TransporteController
  participant SV as TransporteService
  participant TA as ElegibilidadService
  participant PR as Prisma

  A->>FE: Abre la bandeja de pendientes
  FE->>CT: GET /transporte/pendientes/2026-07-31
  CT-->>FE: operativos con estado PENDIENTE
  FE-->>A: Lista con pendientes primero

  A->>FE: Selecciona conductor
  FE->>GD: PATCH /transporte/operativos/5120
  GD->>GD: Identidad · Rol DAF · Ventana
  GD->>VP: petición autorizada
  VP->>VP: Verifica que el cuerpo solo traiga<br/>conductorId y vehiculoId

  alt el cuerpo trae campos adicionales
    VP-->>FE: 400 · CAMPOS_NO_PERMITIDOS
  else contrato respetado
    VP->>CT: datos validados
    CT->>SV: asignarTransporte(operativo, conductor, vehiculo)
    SV->>TA: verificarElegibilidad(conductor, turno)
    TA-->>SV: veredicto

    alt conductor no elegible
      SV-->>FE: 409 con motivo
    else conductor elegible
      SV->>SV: Verifica solapamiento del conductor
      SV->>PR: transacción
      PR->>PR: UPDATE estado, conductor, vehículo
      PR->>PR: INSERT auditoría
      PR-->>SV: confirmación
      SV->>SV: Recalcula alertas
      SV-->>FE: 200 con alerta retirada
      FE-->>A: Fila sin alerta amarilla
      SV--)SV: emite TransporteAsignado
    end
  end
```

### 18.3 Emisión de órdenes de servicio

```mermaid
sequenceDiagram
  autonumber
  actor D as Director
  participant FE as Frontend
  participant CT as DocumentosController
  participant SV as OrdenServicioService
  participant DA as ConstructorDatoAislado
  participant PR as Prisma

  D->>FE: Pulsa emitir sobre una fila
  FE->>CT: POST /operativos/5120/ordenes-servicio
  CT->>CT: Verifica rol Director
  CT->>SV: emitirOrdenes(operativo, usuario)
  SV->>PR: recupera operativo con personal y transporte
  PR-->>SV: datos completos

  alt operativo sin personal
    SV-->>FE: 409 · sin destinatario
  else con personal asignado
    loop por cada funcionario
      SV->>DA: construir(operativo, funcionario)
      Note over DA: Solo horario, funcionario,<br/>conductor y placa.<br/>Garantiza INV-24
      DA-->>SV: dato aislado congelado
      SV->>PR: INSERT orden de servicio
    end
    SV->>SV: Compone el documento vertical<br/>una hoja por persona
    SV-->>CT: documento y códigos emitidos
    CT-->>FE: 201 con el documento
    FE-->>D: Descarga con N hojas
    SV--)SV: emite OrdenServicioEmitida
  end
```

### 18.4 Cierre del cuadro y consolidación

```mermaid
sequenceDiagram
  autonumber
  actor D as Director
  participant CT as CuadroController
  participant SC as CuadroDiarioService
  participant EV as Emisor de eventos
  participant TA as HistorialJornadaService
  participant DO as DocumentosService
  participant PR as Prisma

  D->>CT: POST /cuadros/2026-07-31/cerrar
  CT->>SC: cerrarCuadro(fecha, usuario)
  SC->>PR: verifica estado y ventanas vencidas

  alt existen operativos con condicionante incumplido
    SC-->>CT: 409 · operativos nocturnos sin conductor
  else cuadro consistente
    SC->>PR: transacción · UPDATE estado a CERRADO
    PR->>PR: INSERT auditoría
    PR-->>SC: confirmación
    SC-->>CT: 200
    SC--)EV: CuadroCerrado
    EV--)TA: consolida jornada
    TA->>PR: UPSERT historial por funcionario
    Note over TA: Alimenta las políticas<br/>de descanso del día siguiente
    EV--)DO: habilita emisión de órdenes
  end
```

---

## 19. DECISIONES ARQUITECTÓNICAS

| ID | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| DA-01 | Prisma sobre base independiente | TypeORM con funciones almacenadas, como el legado | Decisión del Product Owner. La independencia total de la base la hace viable sin romper el ecosistema |
| DA-02 | Instancia de base propia | Base nueva en la instancia existente | Decisión del Product Owner. Aísla respaldos, recursos y ciclos de mantenimiento |
| DA-03 | Módulos legados deshabilitados | Convivencia de ambos ORM en el mismo proceso | Decisión del Product Owner. Elimina la complejidad de dos estrategias de acceso simultáneas |
| DA-04 | Carpeta `domain/` por módulo | Ubicar objetos de valor en `application/` | Los objetos de valor con comportamiento no son orquestación. Extensión aditiva al estándar |
| DA-05 | Eventos en proceso | Cola de mensajes | El volumen no lo justifica y añadiría dependencia fuera del stack autorizado |
| DA-06 | Bloqueo optimista con columna de versión | Bloqueo pesimista sobre el cuadro | Bloquear el cuadro reintroduciría la contención que el diseño de agregados evitó |
| DA-07 | Autorización en cuatro guardas encadenadas | Verificación única en el servicio | Separa responsabilidades y permite que cada una falle con su propio código de estado |
| DA-08 | Dato aislado congelado en la orden | Referencia navegable al operativo | Convierte el aislamiento en garantía estructural y no en disciplina del programador |
| DA-09 | Auditoría en la misma transacción | Registro asíncrono | Una evidencia que puede perderse no sirve como evidencia |
| DA-10 | Migraciones fuera del arranque | Aplicación automática al iniciar | Un arranque que modifica el esquema puede dejar la base a medias |
| DA-11 | Modo de identidad conmutable | Dos ramas de código | La integración final toca un archivo, no la lógica de autorización |
| DA-12 | Colores servidos por el backend | Definidos en el frontend | Son datos institucionales del negocio, provienen del libro Excel aprobado |

---

## 20. RIESGOS TÉCNICOS

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| RT-01 | Error en el cálculo de solapamiento con cruce de medianoche | Media | Alto | Encapsular en un único objeto de valor con pruebas unitarias exhaustivas |
| RT-02 | Colisión de secuencial en registro concurrente | Media | Medio | Restricción única en base más transacción con reintento acotado |
| RT-03 | Zona horaria mal configurada en el contenedor | Media | Alto | Variable `TZ` explícita. Las ventanas de carga dependen de ella |
| RT-04 | Cliente de Prisma copiado en lugar de generado en la imagen | Alta | Medio | Generación explícita en la etapa de construcción |
| RT-05 | La cabecera de identidad provisional queda activa en producción | Baja | Muy alto | Variable de entorno con valor falso por defecto y verificación en el arranque |
| RT-06 | Degradación de la matriz consolidada con muchos operativos | Baja | Medio | Índice compuesto por cuadro y formulario. Medición con datos reales |
| RT-07 | Datos maestros no entregados a tiempo | Media | Alto | Script de carga inicial preparado para recibirlos cuando lleguen |
| RT-08 | Divergencia de convenciones respecto del estándar | Media | Medio | Revisión previa a cada confirmación conforme a la convención institucional |

---

## 21. PENDIENTES QUE CONDICIONAN LA ARQUITECTURA

| # | Pendiente | Elemento afectado |
|---|---|---|
| 1 | Momento de verificación del condicionante nocturno | Transacción de cierre del cuadro, invariante INV-11 |
| 2 | Contradicción del formulario 9 | Enumerado `PoliticaVehiculo` y datos iniciales |
| 3 | Umbral de jornada máxima y período del tope de salidas pesadas | Política de descanso, consultas al historial |
| 4 | Incorporación de la librería de caché de servidor | Dependencias del frontend |
| 5 | Canal de entrega de la orden de servicio | Consumidor del evento `OrdenServicioEmitida` |
| 6 | Política de retención de auditoría e histórico | Estrategia de crecimiento de la base |
| 7 | Matriz zonal ↔ punto de encuentro | Datos iniciales, tabla `t_formulario_punto` |
| 8 | Baja física o lógica de operativos | Modelo de datos y auditoría |

---

## 22. SÍNTESIS

La arquitectura se construye **dentro** de los proyectos `transporte-frontend` y `transporte-backend`, respetando su organización de carpetas, su patrón de tres capas por módulo, su cliente HTTP centralizado, su filtro de excepciones, su sistema de diseño y sus convenciones de nomenclatura. Se extiende en tres puntos: se incorpora Prisma sobre una base independiente, se agrega una carpeta de dominio por módulo para los objetos de valor con comportamiento, y se encadenan cuatro guardas de autorización en lugar de una.

Los seis contextos delimitados del análisis de dominio se materializan en seis módulos de NestJS con fronteras explícitas, comunicados por servicios publicados y eventos, de modo que la comunicación entre ellos nunca atraviesa repositorios ajenos.

La autenticación se difiere sin comprometer el diseño: la cadena de autorización se construye completa desde ahora y la integración final se reduce a implementar el modo JWT de una sola guarda y retirar dos archivos provisionales del frontend.

Quedan **ocho pendientes funcionales** que condicionan puntos concretos de la arquitectura. Ninguno impide iniciar la implementación, pero cada uno deja una zona expresada de forma provisional que deberá revisarse al resolverse.

---

*Fin del diseño de arquitectura técnica. A la espera de revisión para iniciar la implementación.*
