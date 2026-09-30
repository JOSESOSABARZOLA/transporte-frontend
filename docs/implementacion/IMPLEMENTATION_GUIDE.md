# IMPLEMENTATION_GUIDE.md
## Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control

> **Propósito.** Este documento es la fuente de verdad para la implementación. Está escrito para ser consumido por Claude Code dentro de los repositorios `transporte-backend` y `transporte-frontend`.
>
> **Documentos de entrada.** `docs/FASE1-informe-ejecutivo-analisis.md`, `docs/FASE2-documentacion-funcional.md`, `docs/FASE3-analisis-dominio.md`, `docs/FASE4-arquitectura-tecnica.md`, `docs/FASE4-diseno-base-datos.md`, `docs/FASE5-diseno-interfaz.md`.
>
> **Prototipo aprobado.** `docs/PROTOTIPO-sigoc-cuadro-colores.html`.

---

## 0. REGLAS DE ORO

Estas reglas anteceden a todo lo demás. Ante conflicto, mandan estas.

### 0.1 Lo que NO se debe inventar

Los siguientes puntos **no están definidos** por el negocio. Si la implementación los necesita, **detente y pregunta**. No completes con un valor razonable.

| # | Pendiente | Qué hacer |
|---|---|---|
| 1 | Matriz de correspondencia zonal ↔ punto de encuentro por formulario | El PO la entregará. Implementa la estructura; deja el `seed` con los puntos sin vincular y un `TODO` explícito |
| 2 | Base de personal certificada con teléfono y tipo de contrato | Ídem. El `seed` carga solo los registros de ejemplo marcados como tales |
| 3 | Catálogo de conductores y vehículos | Debe solicitarse a la DAF |
| 4 | Contradicción del formulario 9: tiene condicionante nocturno y a la vez conductor y placa no habilitados | Implementa ambos campos en el modelo. En el `seed`, deja `condicionanteNocturno = false` y añade comentario citando la contradicción |
| 5 | Momento de verificación del condicionante nocturno | Implementa la validación **en el cierre del cuadro**, no en el registro, porque el conductor lo asigna la DAF después. Marca con `TODO` para confirmación |
| 6 | Hora exacta de cierre de la carga departamental (14H00 o 15H00) | Es parámetro en `t_ventana_carga`. El `seed` usa 15H00 con comentario |
| 7 | Canal de entrega de la orden de servicio al funcionario | Implementa la emisión y la consulta propia. No implementes envío por correo |
| 8 | Formato unificado de la orden de servicio impresa | Usa el diseño del prototipo. Marca como provisional |
| 9 | Baja física o lógica de operativos | Implementa **baja lógica** con columna `oper_activo`. Marca con `TODO` |
| 10 | Procedimiento de reapertura del cuadro cerrado | Implementa el endpoint con verificación de rol Director. No implementes flujo de autorización adicional |
| 11 | Política de retención de auditoría e histórico | No implementes purga |
| 12 | Tratamiento de DMQ como zonal o ámbito | Se modela como zonal con `zona_es_dmq = true` |

### 0.2 Lo que NO se debe tocar

| Elemento | Motivo |
|---|---|
| `src/modules/` legados: `gestion-documental`, `expediente-instruccion`, `documento-generico`, `apertura-pruebas`, `asignaciones`, `administracion-roles` | Quedan deshabilitados por decisión del PO. No se eliminan; simplemente no se importan en `app.module.ts` |
| Carpeta `db/` del backend | Congelada. Contiene funciones `fu_*` del legado. El módulo nuevo usa `prisma/migrations/` |
| `src/common/auth/` existente | Se extiende con guardas nuevas, no se modifica lo existente |
| `src/api/httpClient.ts` del frontend | Se usa tal cual |
| Componentes en `src/components/common/`, `forms/`, `tabla/`, `modals/`, `navbar/` | Se reutilizan sin modificar |
| Tema de daisyUI en `src/index.css` | No se alteran los colores |
| `.claude/skills/` y `.claude/agents/` | Se leen y se respetan |

### 0.3 Prohibiciones

1. **No instalar dependencias fuera del stack.** Si una tarea parece requerirlo, avisa primero. Excepciones ya autorizadas: `@prisma/client`, `prisma`, `react-pdf`.
2. **No usar `any`.** Tipar con interfaces y DTO.
3. **No dejar código muerto**, variables sin usar ni `console.log` de depuración.
4. **No atribuir commits a Claude.** Sin `Co-authored-by`, sin menciones a IA.
5. **No usar `axios` directamente** en el frontend; solo `httpClient`.
6. **No escribir lógica de negocio en controladores ni en repositorios.**
7. **No introducir clases CSS nuevas** en el frontend.

### 0.4 Trazabilidad obligatoria

Toda validación, guarda o regla implementada lleva en su comentario el identificador de la regla que la origina.

```ts
/**
 * RN-24 · Quien salió en patrulla un día no puede ser asignado a patrulla
 * al día siguiente, ni diurna ni nocturna.
 * Fuente: docs/FASE2-documentacion-funcional.md §8.4
 */
```

---

## 1. ARQUITECTURA

### 1.1 Resumen

| Capa | Tecnología |
|---|---|
| Frontend | React 19.2 · Vite 7.3 · TypeScript 5.9 · Tailwind 4.2 · daisyUI 5.5 · Formik + Yup · TanStack Table 8.21 |
| Backend | NestJS 11 · TypeScript · Prisma ORM · class-validator |
| Base de datos | PostgreSQL 18, instancia propia `transportedb` |
| Infraestructura | Docker con construcción multietapa · Docker Compose |

### 1.2 Contextos delimitados y su módulo

| Contexto | Módulo backend | Responsabilidad |
|---|---|---|
| CTX-01 Planificación Operativa | `cuadro-diario`, `operativos` | Núcleo. Registro de operativos |
| CTX-02 Asignación Logística | `transporte` | Conductor, vehículo, capacidad |
| CTX-03 Talento Operativo | `talento-operativo` | Personal, disponibilidad, **políticas de descanso** |
| CTX-04 Emisión Documental | `documentos` | Matriz consolidada y órdenes de servicio |
| CTX-05 Configuración Institucional | `configuracion` | Formularios, catálogos, ventanas, **parámetros de política** |
| CTX-06 Identidad y Acceso | `common/auth` | Rol y autorización |

### 1.3 Regla de comunicación entre módulos

Los módulos se comunican **solo por servicios publicados**. Está prohibido que un módulo importe el repositorio de otro.

| Origen | Destino | Servicio |
|---|---|---|
| `operativos` | `talento-operativo` | `ElegibilidadService.verificar()` → devuelve veredicto y motivo, **no datos del funcionario** |
| `operativos` | `configuracion` | `FormulariosService.obtenerDefinicion()` |
| `transporte` | `operativos` | `OperativosService.asignarTransporte()` |
| `transporte` | `talento-operativo` | `ElegibilidadService.verificarConductor()` |
| `documentos` | `operativos`, `transporte` | Servicios de consulta |
| Todos | `cuadro-diario` | `CuadroDiarioService.puedeEscribir()` |

### 1.4 Capas por módulo

```
modules/<modulo>/
├── presentation/     Controllers + DTO. Sin reglas de negocio, sin acceso a datos
├── application/      Services y policies. Sin HTTP, sin Prisma directo
├── domain/           Objetos de valor con comportamiento. Sin dependencias externas
└── infrastructure/   Repositories. Único punto que toca PrismaService
```

---

## 2. CONVENCIONES

### 2.1 Cabecera obligatoria por archivo

Todo archivo nuevo la lleva, siguiendo el formato del proyecto.

```ts
/**
 * Microservicio: transporte
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativos
 * Archivo: operativos.service.ts
 * Responsabilidad: Orquestar el registro, edición y consulta de operativos.
 * Desarrollador: <nombre real, nunca Claude>
 * Fecha: <AAAA-MM-DD>
 */
```

### 2.2 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo backend | `kebab-case.tipo.ts` | `operativos.service.ts`, `crear-operativo.dto.ts` |
| Archivo frontend | `PascalCase.tsx` para componentes | `FormularioOperativo.tsx` |
| Clase | `PascalCase` | `OperativosService` |
| Método y variable | `camelCase` en español | `registrarOperativo`, `alertaActiva` |
| Constante | `UPPER_SNAKE_CASE` | `TOPE_SALIDAS_PESADAS_DEFECTO` |
| Tabla | `t_` + singular | `t_operativo` |
| Columna | prefijo + nombre | `oper_hora_inicio` |
| Modelo Prisma | `PascalCase` con `@@map` | `model Operativo { ... @@map("t_operativo") }` |
| Ruta REST | plural en español | `/api/v1/operativos` |
| Campo JSON | `camelCase` | `estadoTransporte` |

### 2.3 Idioma

Español en nombres de métodos, variables, comentarios, mensajes de error y textos de interfaz. Inglés únicamente donde lo impone el framework.

### 2.4 Imports

Frontend: extensión explícita, `import { X } from "./modulo.ts"`. Backend: sin extensión, como el estándar existente.

### 2.5 Commits

Convencional, corto, en español, una línea, imperativo. Sin atribución a herramientas.

```
feat: agrega politica de descanso de personal
fix: corrige calculo de solapamiento con cruce de medianoche
docs: documenta parametros de politica
```

---

## 3. ESTRUCTURA DE CARPETAS

### 3.1 Backend

```
transporte-backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── db/                                    ← CONGELADA, no tocar
├── src/
│   ├── main.ts                            ← modificar: registrar interceptores nuevos
│   ├── app.module.ts                      ← modificar: solo módulos nuevos
│   ├── config/app.config.ts               ← modificar: agregar DATABASE_URL, TZ
│   ├── prisma/
│   │   ├── prisma.module.ts               ← nuevo, @Global()
│   │   └── prisma.service.ts              ← nuevo
│   ├── common/
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   │   ├── identidad.guard.ts            ← nuevo · único punto provisional
│   │   │   │   ├── roles.guard.ts                ← existe, reutilizar
│   │   │   │   ├── formulario-rol.guard.ts       ← nuevo
│   │   │   │   └── ventana-carga.guard.ts        ← nuevo
│   │   │   ├── decorators/
│   │   │   │   ├── roles.decorator.ts            ← existe
│   │   │   │   ├── usuario-actual.decorator.ts   ← nuevo
│   │   │   │   └── formulario-desde.decorator.ts ← nuevo
│   │   │   └── interfaces/usuario-autenticado.interface.ts
│   │   ├── errors/
│   │   │   ├── application.error.ts              ← existe
│   │   │   ├── regla-negocio.error.ts            ← nuevo · 409
│   │   │   ├── ventana-cerrada.error.ts          ← nuevo · 423
│   │   │   └── autorizacion.error.ts             ← nuevo · 403
│   │   ├── filters/all-exceptions.filter.ts      ← existe, extender formato
│   │   ├── interceptors/
│   │   │   ├── correlacion.interceptor.ts        ← nuevo
│   │   │   ├── logging.interceptor.ts            ← nuevo
│   │   │   └── auditoria.interceptor.ts          ← nuevo
│   │   ├── logger/logger.service.ts              ← nuevo
│   │   └── dto/paginacion.dto.ts                 ← nuevo
│   └── modules/
│       ├── configuracion/
│       ├── talento-operativo/
│       ├── cuadro-diario/
│       ├── operativos/
│       ├── transporte/
│       └── documentos/
└── docs/                                  ← copiar aquí los 6 documentos de fases
```

### 3.2 Frontend

```
transporte-frontend/src/
├── config/
│   ├── routes.tsx                  ← modificar: agregar rutas del módulo
│   ├── navigation.ts               ← modificar: agregar secciones
│   ├── usuariosPrueba.ts           ← modificar: agregar los 7 perfiles
│   ├── env.ts                      ← modificar: agregar estados del módulo
│   └── validationSchemas.ts        ← modificar: agregar esquemas Yup
├── interfaces/
│   ├── Operativo.ts · Formulario.ts · CuadroDiario.ts
│   ├── Personal.ts · Transporte.ts · Alerta.ts
├── services/
│   ├── CuadroDiarioService.ts · OperativoService.ts
│   ├── TransporteService.ts · CatalogoCuadroService.ts
│   ├── PersonalService.ts · DocumentoService.ts
├── hooks/
│   ├── useCuadroDiario.ts · useFormulariosPermitidos.ts
│   ├── useCatalogosFormulario.ts · useVentanaCarga.ts
├── components/cuadro/
│   ├── FormularioOperativo.tsx · SelectorFormulario.tsx
│   ├── CamposCalculados.tsx · SelectorPersonal.tsx
│   ├── SelectorZonalPunto.tsx · BannerFormulario.tsx
│   ├── TablaOperativos.tsx · CeldaAlerta.tsx
│   ├── PanelAsignacionTransporte.tsx · FilaSinInformacion.tsx
├── pages/
│   ├── CuadroRegistroPage.tsx · MisOperativosPage.tsx
│   ├── AsignacionTransportePage.tsx · MatrizConsolidadaPage.tsx
│   ├── OrdenesServicioPage.tsx · MisOrdenesPage.tsx
│   └── administracion/
│       ├── AdminPersonalPage.tsx · AdminCatalogosCuadroPage.tsx
│       └── AdminVentanasPage.tsx
└── utils/horario.util.ts           ← espejo de RangoHorario, solo para UX
```

---

## 4. DEPENDENCIAS

### 4.1 Ya presentes, no reinstalar

Backend: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `class-validator`, `class-transformer`, `dotenv`, `pg`, `reflect-metadata`, `rxjs`, `pdfkit`, `pdf-lib`, `pdfmake`.

Frontend: `react` 19.2, `react-dom`, `react-router-dom` 7.13, `tailwindcss` 4.2, `daisyui` 5.5, `@tanstack/react-table` 8.21, `formik`, `yup`, `axios`, `date-fns`, FontAwesome, TipTap.

### 4.2 A instalar

| Paquete | Ámbito | Justificación |
|---|---|---|
| `prisma` | backend, desarrollo | ORM autorizado por el PO |
| `@prisma/client` | backend, producción | Cliente generado |
| `react-pdf@10.4.1` | frontend | Declarado en el enunciado del proyecto |

### 4.3 A retirar del módulo nuevo

`@nestjs/typeorm` y `typeorm` **no se desinstalan** —los módulos legados los declaran— pero **no se importan** en ningún archivo nuevo.

---

## 5. PARÁMETROS DE POLÍTICA CONFIGURABLES

> **Decisión del Product Owner.** El umbral de jornada máxima y el período de cómputo del tope de salidas pesadas son **configurables**, no constantes de código.

Esto resuelve los pendientes 3 y 4 del análisis de dominio y agrega una tabla al modelo de datos.

### 5.1 Tabla `t_parametro_politica`

| Columna | Tipo | Descripción |
|---|---|---|
| `para_id` | `SERIAL` | Clave primaria |
| `para_clave` | `VARCHAR(60)` | Identificador único del parámetro |
| `para_valor` | `VARCHAR(120)` | Valor actual |
| `para_tipo` | `e_tipo_parametro` | `ENTERO`, `DECIMAL`, `TEXTO`, `BOOLEANO` |
| `para_descripcion` | `VARCHAR(300)` | Explicación para el administrador |
| `para_unidad` | `VARCHAR(30)` | `horas`, `salidas`, `días` |
| `para_minimo` | `VARCHAR(120)` | Límite inferior admisible |
| `para_maximo` | `VARCHAR(120)` | Límite superior admisible |
| `para_modificado_por` | `INTEGER` | Usuario |
| `para_modificado_en` | `TIMESTAMPTZ(3)` | Momento |

### 5.2 Parámetros iniciales

| Clave | Valor | Tipo | Unidad | Regla | Nota |
|---|---|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | `12` | Decimal | horas | RN-36 | Rango 8 a 16. Las fuentes describen 16 horas como situación a evitar |
| `TOPE_SALIDAS_PESADAS` | `3` | Entero | salidas | RN-25 | Valor declarado por el PO |
| `PERIODO_COMPUTO_SALIDAS` | `MENSUAL` | Texto | — | RN-37 | Valores: `SEMANAL`, `QUINCENAL`, `MENSUAL` |
| `HORA_LIMITE_CUADRO` | `16:30` | Texto | — | RN-57 | Hora en que el cuadro debe estar listo |
| `FRANJA_NOCTURNA_INICIO` | `20:00` | Texto | — | RN-43 | Del Excel aprobado |
| `FRANJA_NOCTURNA_FIN` | `05:00` | Texto | — | RN-43 | Del Excel aprobado |
| `DIAS_DESCANSO_PATRULLA` | `1` | Entero | días | RN-24 | Días sin patrulla tras una patrulla |

> **`HORA_CIERRE_DEPARTAMENTAL` se retiró el 2026-08-25.** RN-59 se implementa en
> `t_ventana_carga.vcar_hora_cierre`, una fila por rol, que es la que gobierna:
> `VentanaCargaGuard` lee esa tabla y ninguna otra. El parámetro no decidía nada —solo
> alimentaba una advertencia de P-09 que pedía mantener los dos valores iguales—, y un
> valor único no podía expresar RF-059, «parametrizar las ventanas de carga **por rol**».
> La contradicción 14H00 / 15H00 de las fuentes sigue abierta (PV-06) y ahora se resuelve
> en el panel de ventanas.

### 5.3 Reglas de implementación

1. Las políticas **leen el parámetro**, nunca una constante literal.
2. `ParametroPoliticaService` cachea los valores en memoria y los invalida al modificarse.
3. Toda modificación queda en auditoría.
4. Existe pantalla de administración (P-09 ampliada) para editarlos.
5. La validación de rango se aplica al guardar: un umbral de jornada de 30 horas se rechaza.

```ts
/**
 * RN-36 · Límite de jornada diaria. Configurable por la Dirección.
 * Fuente: decisión del PO. Parámetro JORNADA_MAXIMA_HORAS.
 */
const limite = await this.parametros.obtenerDecimal("JORNADA_MAXIMA_HORAS");
if (horasAcumuladas > limite) {
  throw new ReglaNegocioError(
    "JORNADA_MAXIMA_SUPERADA",
    `${nombre} acumularía ${horasAcumuladas} horas en el día. El límite configurado es ${limite}.`,
  );
}
```

---

## 6. ORDEN DE IMPLEMENTACIÓN

El orden respeta las dependencias del análisis de dominio. **No se avanza a una etapa sin que la anterior compile y pase su lista de verificación.**

| # | Etapa | Entrega | Bloquea a |
|---|---|---|---|
| **E0** | Preparación | Prisma instalado, `app.module.ts` limpio, Docker levantado | Todo |
| **E1** | Esquema y datos iniciales | `schema.prisma`, migración inicial, `seed.ts` | Todo |
| **E2** | Transversales | Guardas, errores, filtro, interceptores, logger | E3 en adelante |
| **E3** | `configuracion` | Formularios, catálogos, ventanas, parámetros | E4, E5, E6 |
| **E4** | `talento-operativo` | Personal, disponibilidad, historial, **políticas de descanso** | E5, E6 |
| **E5** | `cuadro-diario` | Apertura, estados, cierre | E6 |
| **E6** | `operativos` | Registro, edición, asignación de personal | E7, E8 |
| **E7** | `transporte` | Asignación logística, capacidad de flota | E8 |
| **E8** | `documentos` | Matriz consolidada, órdenes de servicio | — |
| **E9** | Frontend base | Rutas, navegación, contexto, servicios, perfiles de prueba | E10 |
| **E10** | Pantallas | P-01 a P-09 en el orden del apartado 12 | — |
| **E11** | Docker y despliegue | Imágenes, compose, variables | — |
| **E12** | Autenticación real | Modo JWT del `IdentidadGuard` | — |

> **E12 se ejecuta cuando el microservicio de Active Directory esté disponible.** Hasta entonces, el sistema opera con el selector de perfil provisional.

---

## 7. MÓDULOS

### 7.1 `configuracion`

| Elemento | Detalle |
|---|---|
| **Servicios** | `FormulariosService`, `CatalogosService`, `VentanaCargaService`, `ParametroPoliticaService` |
| **Responsabilidad** | Define los nueve formularios, sus catálogos, las ventanas horarias y los parámetros de política |
| **Consume** | Nada |
| **Publica** | `obtenerDefinicion(codigo)`, `obtenerCatalogos(formularioId)`, `puedeEscribir(rol, momento)`, `obtenerDecimal(clave)`, `obtenerEntero(clave)`, `obtenerTexto(clave)` |

### 7.2 `talento-operativo`

| Elemento | Detalle |
|---|---|
| **Servicios** | `FuncionariosService`, `DisponibilidadService`, `HistorialJornadaService`, `ElegibilidadService` |
| **Policies** | `DescansoPersonalPolicy` (POL-01) |
| **Responsabilidad** | Maestro de personal y **todas las reglas de descanso** |
| **Consume** | `ParametroPoliticaService` |
| **Publica** | `verificar(funcionarioId, contexto)` → `{ elegible: boolean, codigo?: string, motivo?: string }` |

> **Crítico.** Las reglas de descanso viven **aquí y solo aquí**. `operativos` no consulta disponibilidad ni historial directamente: pregunta y recibe un veredicto. Si encuentras lógica de descanso fuera de este módulo, es un defecto.

### 7.3 `cuadro-diario`

| Elemento | Detalle |
|---|---|
| **Servicios** | `CuadroDiarioService` |
| **Responsabilidad** | Ciclo de vida de la jornada: apertura, estados, cierre, reapertura |
| **Publica** | `obtenerPorFecha(fecha)`, `puedeEscribir(cuadroId)`, `cerrar(fecha, usuario)` |
| **Emite** | `CuadroDiarioAbierto`, `CuadroCerrado`, `CuadroReabierto` |

### 7.4 `operativos`

| Elemento | Detalle |
|---|---|
| **Servicios** | `OperativosService`, `GeneradorIdentificadorService`, `CalculadorAlertasService` |
| **Policies** | `ExclusividadHorariaPolicy` (POL-03) |
| **Domain** | `RangoHorario`, `IdentificadorOperativo`, `EstadoTransporte`, `UbicacionOperativa` |
| **Consume** | `configuracion`, `talento-operativo`, `cuadro-diario` |
| **Emite** | `OperativoRegistrado`, `OperativoReprogramado`, `PersonalAsignado`, `OperativoRetirado` |

### 7.5 `transporte`

| Elemento | Detalle |
|---|---|
| **Servicios** | `TransporteService`, `CapacidadFlotaService` |
| **Policies** | `DescansoConductorPolicy` (POL-02) |
| **Responsabilidad** | Asignación de conductor y vehículo. **Solo dos campos** |
| **Emite** | `TransporteAsignado`, `OperativoDeclaradoPropiosMedios`, `CapacidadFlotaExcedida` |

### 7.6 `documentos`

| Elemento | Detalle |
|---|---|
| **Servicios** | `MatrizConsolidadaService`, `OrdenServicioService` |
| **Builders** | `DatoAisladoBuilder` (POL-09) |
| **Responsabilidad** | Matriz para la Dirección y órdenes individuales |
| **Emite** | `OrdenServicioEmitida` |

> **Crítico.** `DatoAisladoBuilder` construye un objeto **cerrado** con cuatro campos: horario, funcionario, conductor, placa. No recibe el operativo completo ni lo referencia. Garantiza INV-24.

---

## 8. ENDPOINTS

Base: `/api/v1`. Todos devuelven JSON. Todos aceptan y propagan `x-correlation-id`.

### 8.1 Cuadro diario

| Método | Ruta | Roles | Guardas |
|---|---|---|---|
| `POST` | `/cuadros` | `ADMINISTRADOR_DMIP` | Identidad, Roles |
| `GET` | `/cuadros/:fecha` | Todos | Identidad |
| `POST` | `/cuadros/:fecha/cerrar` | `DIRECTOR` | Identidad, Roles |
| `POST` | `/cuadros/:fecha/reabrir` | `DIRECTOR` | Identidad, Roles |

### 8.2 Operativos

| Método | Ruta | Roles | Guardas |
|---|---|---|---|
| `GET` | `/operativos?fecha=&formulario=` | Departamentales, `DIRECTOR` | Identidad, Roles |
| `GET` | `/operativos/:id` | Según propiedad | Identidad, FormularioRol |
| `POST` | `/operativos` | Departamentales | Identidad, Roles, FormularioRol, VentanaCarga |
| `PATCH` | `/operativos/:id` | Rol dueño | Identidad, Roles, FormularioRol, VentanaCarga |
| `DELETE` | `/operativos/:id` | Rol dueño | Identidad, Roles, FormularioRol, VentanaCarga |
| `POST` | `/operativos/:id/personal` | Rol dueño o compartido | Identidad, Roles, FormularioRol, VentanaCarga |
| `DELETE` | `/operativos/:id/personal/:funcionarioId` | Rol dueño | Identidad, Roles, FormularioRol, VentanaCarga |
| `POST` | `/operativos/:id/apoyo` | Departamentales | Identidad, Roles, VentanaCarga |

### 8.3 Transporte

| Método | Ruta | Roles | Guardas |
|---|---|---|---|
| `GET` | `/transporte/pendientes/:fecha` | `DAF`, `DIRECTOR` | Identidad, Roles |
| `PATCH` | `/transporte/operativos/:id` | **`DAF`** | Identidad, Roles, VentanaCarga |
| `PATCH` | `/transporte/operativos/:id/propios-medios` | **`DAF`** | Identidad, Roles, VentanaCarga |
| `GET` | `/transporte/capacidad/:fecha` | `DAF`, `DIRECTOR` | Identidad, Roles |
| `PUT` | `/transporte/capacidad/:fecha` | `DAF`, `ADMINISTRADOR_DMIP` | Identidad, Roles |

### 8.4 Documentos

| Método | Ruta | Roles |
|---|---|---|
| `GET` | `/matriz/:fecha` | **`DIRECTOR`** |
| `GET` | `/matriz/:fecha/exportar` | **`DIRECTOR`** |
| `POST` | `/operativos/:id/ordenes-servicio` | **`DIRECTOR`** |
| `GET` | `/ordenes-servicio/mias` | Funcionario autenticado |

### 8.5 Configuración

| Método | Ruta | Roles |
|---|---|---|
| `GET` | `/formularios/permitidos` | Todos |
| `GET` | `/formularios/:codigo/catalogos` | Todos |
| `GET` | `/zonales` | Todos |
| `GET` | `/formularios/:codigo/zonales/:zonalId/puntos` | Todos |
| `GET` | `/personal/elegible?formulario=&inicio=&fin=` | Departamentales |
| `GET` | `/ventanas/estado` | Todos |
| `GET` `PUT` | `/parametros` · `/parametros/:clave` | `ADMINISTRADOR_DMIP` |
| `CRUD` | `/administracion/personal` · `/administracion/catalogos` · `/administracion/ventanas` | `ADMINISTRADOR_DMIP` |

---

## 9. MODELOS

El esquema completo está en `docs/FASE4-diseno-base-datos.md` §10. Resumen de las **27 tablas**:

| Grupo | Tablas |
|---|---|
| Configuración | `t_formulario`, `t_formulario_prefijo`, `t_formulario_area`, `t_formulario_punto`, `t_formulario_tipo_control`, `t_formulario_institucion`, `t_zonal`, `t_punto_encuentro`, `t_tipo_control`, `t_institucion`, `t_ventana_carga`, **`t_parametro_politica`** |
| Talento | `t_funcionario`, `t_conductor`, `t_vehiculo`, `t_disponibilidad`, `t_historial_jornada` |
| Planificación | `t_cuadro_diario`, `t_operativo`, `t_asignacion_personal`, `t_operativo_zonal`, `t_operativo_institucion`, `t_solicitud_apoyo` |
| Logística | `t_capacidad_flota` |
| Entregables | `t_orden_servicio` |
| Transversal | `t_auditoria`, `t_usuario` |

### 9.1 Enumerados

`RolDepartamental`, `EstadoCuadro`, `EstadoTransporte`, `PoliticaVehiculo`, `AreaPersonal`, `TipoContrato`, `EstadoDisponibilidad`, `TipoVentana`, `AccionAuditoria`, `EstadoSolicitud`, **`TipoParametro`**.

### 9.2 Objetos de valor en `domain/`

| Objeto | Responsabilidad | Riesgo si falla |
|---|---|---|
| `RangoHorario` | Validez, granularidad de 30 minutos, condición nocturna, duración con cruce de medianoche, **solapamiento** | **Alto.** Es el punto de error más probable del sistema |
| `IdentificadorOperativo` | Composición prefijo + secuencial + fecha | Medio |
| `EstadoTransporte` | Tres estados excluyentes y transiciones válidas | Medio |
| `UbicacionOperativa` | Zonales y punto, catalogado o libre | Bajo |

> `RangoHorario` requiere **pruebas unitarias exhaustivas** antes de usarse. Casos mínimos: rango normal, cruce de medianoche, solapamiento parcial, solapamiento con cruce, contención, adyacencia sin solape, franja nocturna parcial, franja nocturna completa.

---

## 10. DTO

### 10.1 Reglas generales

1. Todo endpoint declara su DTO. Sin `any`, sin objetos sueltos.
2. `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — ya configurado en `main.ts`.
3. Los DTO de entrada **no incluyen campos calculados**: identificador, secuencial, número de semana, duración, alertas.
4. Los mensajes de `class-validator` van en español.

### 10.2 `CrearOperativoDto`

```ts
export class CrearOperativoDto {
  @IsDateString({}, { message: "La fecha del cuadro es obligatoria." })
  cuadroFecha: string;

  @IsString() @IsNotEmpty({ message: "Debe indicar el formulario." })
  formularioCodigo: string;

  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: "La hora de inicio debe ser en punto o media hora." })
  horaInicio: string;

  @Matches(/^([01]\d|2[0-3]):(00|30)$/, { message: "La hora de fin debe ser en punto o media hora." })
  horaFin: string;

  @IsArray() @ArrayNotEmpty({ message: "Elija al menos una zonal." })
  @IsInt({ each: true })
  zonalesIds: number[];

  @IsOptional() @IsInt()
  puntoEncuentroId?: number;

  @IsOptional() @IsString() @MaxLength(220)
  puntoLibre?: string;

  @IsOptional() @IsInt()
  tipoControlId?: number;

  @IsOptional() @IsString() @MaxLength(220)
  tipoLibre?: string;

  @IsArray() @ArrayNotEmpty({ message: "Elija al menos una institución participante." })
  @IsInt({ each: true })
  institucionesIds: number[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => AsignacionPersonalDto)
  personal: AsignacionPersonalDto[];

  @IsOptional() @IsString()
  observaciones?: string;
}
```

> **No incluye `conductorId` ni `vehiculoId`.** RN-40: nacen nulos y solo la DAF los completa.

### 10.3 `ActualizarTransporteDto`

Es el DTO más sensible del sistema. **Exactamente dos propiedades.**

```ts
export class ActualizarTransporteDto {
  @IsInt({ message: "Debe seleccionar un conductor." })
  conductorId: number;

  @IsInt({ message: "Debe seleccionar un vehículo." })
  vehiculoId: number;
}
```

Con `forbidNonWhitelisted`, cualquier campo adicional produce `400` con la lista de campos rechazados. **No agregar propiedades a este DTO bajo ninguna circunstancia.**

### 10.4 DTO de salida

`OperativoResponseDto` incluye los colores del formulario, el estado de transporte, las alertas calculadas y la traza de autoría. El frontend **no calcula colores ni alertas**: los recibe.

---

## 11. VALIDACIONES

Las 32 validaciones están en `docs/FASE2-documentacion-funcional.md` §19. Distribución por capa:

| Capa | Validaciones | Ejemplo |
|---|---|---|
| DTO · `class-validator` | Formato y obligatoriedad | VAL-01 a VAL-11 |
| Guarda | Autorización y ventana | VAL-26 a VAL-29 |
| Policy en `talento-operativo` | Descanso y rotación | VAL-12 a VAL-18 |
| Policy en `transporte` | Descanso de conductor y capacidad | VAL-19 a VAL-25 |
| Servicio | Coherencia e integridad | VAL-30 a VAL-32 |
| Base de datos | Invariantes estructurales | 22 restricciones `CHECK` |

### 11.1 Orden de evaluación

```
Identidad → Rol → Formulario → Ventana → DTO → Elegibilidad → Exclusividad → Persistencia
   401       403      403        423     400       409           409
```

### 11.2 Formato de error obligatorio

```json
{
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer. No puede tener patrulla dos días seguidos, ni diurna ni nocturna.",
  "detalles": { "funcionarioId": 118, "fechaUltimaPatrulla": "2026-07-30" },
  "correlacionId": "0f2c8a1e-…",
  "timestamp": "2026-07-31T09:14:22-05:00",
  "ruta": "/api/v1/operativos/5120/personal"
}
```

**El campo `mensaje` se muestra tal cual al usuario.** Debe nombrar a la persona o recurso implicado y explicar el motivo en términos operativos. Prohibido «error de validación» o «dato inválido».

### 11.3 Códigos de error

| Código | HTTP | Regla |
|---|---|---|
| `VENTANA_CARGA_CERRADA` | 423 | RN-56 |
| `FORMULARIO_NO_AUTORIZADO` | 403 | PER-01 |
| `ROL_NO_AUTORIZADO` | 403 | PER-05 |
| `CAMPOS_NO_PERMITIDOS` | 400 | RN-38 |
| `PERSONA_NO_DISPONIBLE` | 409 | RN-30 |
| `CONTRATO_NO_ADMITE_TURNO` | 409 | RN-26 |
| `PATRULLA_CONSECUTIVA` | 409 | RN-24 |
| `TOPE_SALIDAS_PESADAS` | 409 | RN-25 |
| `SOLAPAMIENTO_HORARIO` | 409 | RN-28 |
| `JORNADA_MAXIMA_SUPERADA` | 409 | RN-36 |
| `CUPO_COMPARTIDO_SUPERADO` | 409 | PER-06 |
| `CONDUCTOR_PATRULLA_CONSECUTIVA` | 409 | RN-44 |
| `CONDICIONANTE_NOCTURNO` | 409 | RN-43 |
| `CUADRO_CERRADO` | 409 | RN-58 |
| `AREA_NO_ADMITIDA` | 409 | RN-15, VAL-10 |
| `ADICIONAL_NO_ENCADENABLE` | 409 | RN-64 |
| `OPERATIVO_CON_ADICIONALES` | 409 | RN-64 |
| `CONFLICTO_CONCURRENCIA` | 409 | Bloqueo optimista |

> **`AREA_NO_ADMITIDA` se sumó en M-15** y no figuraba en esta tabla, aunque el código lo declara
> desde entonces. Los dos últimos llegaron el **2026-08-20** con el operativo adicional, y van
> separados aunque nazcan del mismo vínculo: la pantalla reacciona distinto a cada uno —el primero
> se corrige eligiendo el operativo original de la jornada; el segundo, retirando antes el
> adicional—. `errores-dominio.spec.ts` cuenta los dieciocho.

---

## 12. PANTALLAS DEL FRONTEND

Orden de implementación y su referencia en el prototipo aprobado.

| # | Pantalla | Ruta | Perfiles | Prototipo |
|---|---|---|---|---|
| 1 | Registro de operativo | `/cuadro/registro` | DMIP Op., DMIP Insp., DMIT | P-01 |
| 2 | Mis operativos | `/cuadro/mis-operativos` | Ídem | P-02 |
| 3 | Asignación de transporte | `/cuadro/transporte` | DAF | P-03 |
| 4 | Matriz Consolidada | `/cuadro/matriz` | Director | P-04 |
| 5 | Órdenes de servicio | `/cuadro/ordenes` | Director | P-05 |
| 6 | Mis órdenes | `/mis-ordenes` | Funcionario | P-06 |
| 7 | Personal y disponibilidad | `/administracion/personal` | Administrador | P-07 |
| 8 | Catálogos del cuadro | `/administracion/catalogos-cuadro` | Administrador | P-08 |
| 9 | Ventanas y parámetros | `/administracion/ventanas` | Administrador | P-09 |

### 12.1 Reglas de interfaz

1. **Ninguna clase CSS nueva.** Solo las verificadas en `docs/FASE5-diseno-interfaz.md` §2.2.
2. **Los colores de banner los entrega el backend**; se aplican con `style` en línea sobre la fila de banner.
3. **Las pantallas se montan según el rol**, no se ocultan controles. Un perfil no autorizado no tiene el componente en memoria.
4. **Ninguna información depende solo del color.** Toda señal cromática lleva equivalente textual.
5. **El formulario de registro usa rejilla** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
6. **Los campos calculados no son campos**: se muestran como `badge badge-ghost badge-sm`.
7. Validación con **Formik y Yup** en `config/validationSchemas.ts`.
8. Peticiones **solo por `httpClient`**.

---

## 13. PRISMA

### 13.1 Configuración

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 13.2 `PrismaService`

Extiende `PrismaClient`, implementa `OnModuleInit` y `OnModuleDestroy`, conecta al iniciar y desconecta de forma ordenada. Se expone en `PrismaModule` marcado con `@Global()` para no importarlo en cada módulo.

### 13.3 Reglas de uso

1. **Solo la capa `infrastructure` toca `PrismaService`.** Servicios y controladores nunca.
2. **Transacciones con `$transaction`** en toda operación que escriba más de una tabla. El registro de un operativo escribe operativo, asignaciones, zonales, instituciones y auditoría: es una sola transacción.
3. **La auditoría va dentro de la misma transacción** que la operación auditada.
4. **Carga anticipada con `include`** para evitar consultas por fila en la matriz consolidada.
5. **Prohibido `$queryRawUnsafe`.** Si se necesita SQL crudo, usar `$queryRaw` con plantilla parametrizada.
6. **Bloqueo optimista**: `where: { id, version }` y `data: { version: { increment: 1 } }`. Si el conteo es cero, lanzar `CONFLICTO_CONCURRENCIA`.

### 13.4 Generación del secuencial diario

```
1. Abrir transacción
2. Contar operativos del cuadro y formulario
3. Insertar con secuencial = conteo + 1
4. Si la restricción única falla, reintentar hasta 3 veces
5. Confirmar
```

La restricción `uq_operativo_cuad_form_sec` es la garantía real. El reintento resuelve la colisión concurrente.

---

## 14. MIGRACIONES

### 14.1 Flujo

| Entorno | Comando |
|---|---|
| Desarrollo | `npx prisma migrate dev --name <nombre_en_espanol>` |
| Producción | `npx prisma migrate deploy` |
| Datos iniciales | `npx prisma db seed` |
| Cliente | `npx prisma generate` |

### 14.2 Nomenclatura

Descriptiva en español y en minúsculas: `esquema_inicial`, `agrega_parametro_politica`, `agrega_restricciones_verificacion`.

### 14.3 Elementos no expresables en Prisma

Prisma no soporta restricciones `CHECK` ni índices parciales. Se agregan en **migraciones manuales complementarias**.

| Migración | Contenido |
|---|---|
| `0002_agrega_restricciones_verificacion` | Las 22 restricciones `CHECK` de `docs/FASE4-diseno-base-datos.md` §7.1 |
| `0003_agrega_indices_parciales` | Los 6 índices parciales y el índice único parcial de órdenes vigentes |

> **Advertencia.** Al ejecutar `prisma migrate dev` tras un cambio estructural, Prisma no detecta estos objetos y podría no preservarlos si regenera la tabla. Tras cada migración estructural, **verificar que siguen presentes** y documentar el hecho en `prisma/README.md`.

### 14.4 Las migraciones no se aplican al arrancar

`prisma migrate deploy` es un paso explícito del despliegue, nunca parte del arranque del contenedor. Un arranque que modifica el esquema puede dejar la base a medias.

### 14.5 Datos iniciales

`seed.ts` debe ser **idempotente**: se ejecuta varias veces sin duplicar. Usar `upsert` con la clave natural.

| Catálogo | Origen | Estado |
|---|---|---|
| 9 formularios con colores y políticas | `CUADRO_DE_COLORES.xlsx`, Hoja2 | Completo |
| Prefijos por formulario | Hoja2 | Completo |
| 10 zonales más DMQ | Hoja2 | Completo |
| ~70 puntos de encuentro | Hoja2 | Completo, **sin vincular a zonal** |
| ~60 tipos de control | Hoja2 | Completo |
| 16 instituciones | Hoja2 | Completo |
| 6 ventanas de carga | Parámetros acordados | Completo |
| 8 parámetros de política | Apartado 5.2 | Completo |
| Relación zonal ↔ punto por formulario | — | **PENDIENTE.** Dejar `TODO` |
| Personal | — | **PENDIENTE.** Solo ejemplos marcados |
| Conductores y vehículos | — | **PENDIENTE.** Solo ejemplos marcados |

---

## 15. DOCKER

### 15.1 Servicios

| Servicio | Contenedor | Puerto externo | Interno | Volumen |
|---|---|---|---|---|
| Base de datos | `transportedb` | 5434 | 5432 | `transporte_pgdata` |
| Backend | `transporte-app` | 3003 | 3003 | `./uploads` |
| Frontend | `transporte-front` | 5176 | 5176 | — |

Los puertos evitan colisión con el módulo de Instrucción, que usa 5433, 3002 y 5175.

### 15.2 Dockerfile del backend

Construcción multietapa, partiendo del `Dockerfile` existente con dos cambios:

1. **Agregar `npx prisma generate`** en la etapa de construcción. El cliente debe generarse dentro de la imagen, nunca copiarse desde la máquina de desarrollo: incluye binarios específicos de la plataforma. Es la causa más frecuente de fallo al contenerizar con Prisma.
2. **Retirar la instalación de LibreOffice**, que servía a la generación de documentos del legado.

Se conservan: usuario no privilegiado, gestor de señales, copia de `dist` desde la etapa de construcción.

### 15.3 Variables de entorno

| Variable | Ejemplo | Nota |
|---|---|---|
| `PORT` | `3003` | |
| `DATABASE_URL` | `postgresql://postgres:***@transportedb:5432/transportedb?schema=public` | |
| `CORS_ORIGINS` | `http://localhost:5176` | Lista blanca |
| `TZ` | `America/Guayaquil` | **Crítico**: las ventanas dependen de ella |
| `LOG_LEVEL` | `info` | |
| `MODO_IDENTIDAD_PROVISIONAL` | `false` | **Debe ser falso en producción** |
| `VITE_API_BASE_URL` | `http://localhost:3003` | Frontend |

---

## 16. SEGURIDAD

### 16.1 Cadena de autorización

```
IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard → ValidationPipe → Service
```

| Guarda | Pregunta | Fuente de verdad | Error |
|---|---|---|---|
| `IdentidadGuard` | ¿Quién realiza la petición? | Token o cabecera provisional | 401 |
| `RolesGuard` | ¿El rol figura entre los autorizados? | Decorador `@Roles()` | 403 |
| `FormularioRolGuard` | ¿El formulario pertenece a este rol? | **Tabla `t_formulario`**, no el cuerpo | 403 |
| `VentanaCargaGuard` | ¿Puede escribir ahora? | `t_ventana_carga` en `America/Guayaquil` | 423 |

### 16.2 Restricción de la DAF en tres niveles

| Nivel | Mecanismo |
|---|---|
| Ruta | Endpoint separado bajo `/transporte` con `@Roles(DAF)` |
| Contrato | `ActualizarTransporteDto` con exactamente dos propiedades |
| Validación | `forbidNonWhitelisted` rechaza campos adicionales |
| Servicio | El método escribe solo `conductorId`, `vehiculoId` y `estadoTransporte` |

### 16.3 Reglas

1. **La autorización se verifica en el servidor**, con independencia de lo que muestre la interfaz.
2. **Los datos de operativos ajenos no se transmiten** a perfiles no autorizados. El filtrado ocurre en la consulta, no en el cliente.
3. **Las órdenes propias se filtran por identidad del servidor**, nunca por parámetro de la petición.
4. **Nunca registrar en logs**: teléfonos, cédulas, contenido de órdenes de servicio, tokens.
5. **`MODO_IDENTIDAD_PROVISIONAL` en falso por defecto.** El arranque debe advertir en consola si está activo.
6. **Prisma parametriza toda consulta.** Prohibida la interpolación de cadenas.

---

## 17. BUENAS PRÁCTICAS

1. **Un archivo, una responsabilidad.** Si un servicio supera las 300 líneas, evaluar división.
2. **Las políticas son clases propias**, no métodos privados de un servicio. Se prueban por separado.
3. **Los objetos de valor no dependen de nada.** Ni de Prisma, ni de NestJS, ni de configuración. Reciben lo que necesitan.
4. **Los eventos se emiten después de confirmar la transacción**, nunca dentro. Un fallo en un escuchador no debe revertir un registro válido.
5. **Los mensajes de error se escriben pensando en el funcionario**, no en el desarrollador. El código técnico va en `codigo`.
6. **Los valores derivados se recalculan en la aplicación** dentro de la misma transacción. Sin disparadores de base de datos.
7. **Las alertas se recalculan completas** ante cualquier cambio, nunca de forma incremental.
8. **Prueba unitaria obligatoria** para `RangoHorario`, las tres políticas de descanso y el generador de identificador.
9. **Verificar antes de dar por hecho**: el backend con `npm run build`, el frontend con `npm run lint` y `npm run build`.

---

## 18. CHECKLIST POR ETAPA

### E0 · Preparación

- [ ] `npm install prisma --save-dev` y `npm install @prisma/client`
- [ ] `npx prisma init` con proveedor `postgresql`
- [ ] `app.module.ts` importa solo `PrismaModule` y los módulos nuevos
- [ ] `TypeOrmModule.forRoot` y `DatabaseModule` retirados del módulo raíz
- [ ] `docker compose up -d transportedb` levanta y responde a `pg_isready`
- [ ] `.env` con `DATABASE_URL`, `TZ`, `CORS_ORIGINS`, `MODO_IDENTIDAD_PROVISIONAL=true`
- [ ] Documentos de fases copiados a `docs/`
- [ ] `npm run build` sale con código cero

### E1 · Esquema y datos iniciales

- [ ] `schema.prisma` con 27 modelos y 11 enumerados
- [ ] Migración `esquema_inicial` aplicada
- [ ] Migración `agrega_restricciones_verificacion` con las 22 restricciones
- [ ] Migración `agrega_indices_parciales` con los 6 índices y el único parcial
- [ ] `seed.ts` idempotente: ejecutado dos veces no duplica
- [ ] Los 9 formularios cargados con sus colores exactos
- [ ] Los 8 parámetros de política cargados
- [ ] Pendientes marcados con `TODO` en el `seed`
- [ ] `npx prisma migrate diff` no reporta divergencias

### E2 · Transversales

- [ ] Las cuatro guardas implementadas y probadas
- [ ] Jerarquía de errores con los 15 códigos
- [ ] Filtro de excepciones devuelve el formato del apartado 11.2
- [ ] Interceptor de correlación propaga `x-correlation-id`
- [ ] Interceptor de auditoría escribe en la misma transacción
- [ ] Logger estructurado sin datos personales
- [ ] Arranque advierte si `MODO_IDENTIDAD_PROVISIONAL` está activo

### E3 · `configuracion`

- [ ] Los nueve formularios se consultan con sus catálogos
- [ ] `GET /formularios/permitidos` devuelve solo los del rol
- [ ] Puntos filtrados por formulario y zonal
- [ ] `VentanaCargaService` evalúa en `America/Guayaquil`
- [ ] `ParametroPoliticaService` cachea e invalida
- [ ] Parámetros validados contra su rango al guardar

### E4 · `talento-operativo`

- [ ] `RangoHorario` con pruebas de los 8 casos del apartado 9.2
- [ ] `DescansoPersonalPolicy` con las 6 reglas, **leyendo parámetros**
- [ ] `ElegibilidadService` devuelve veredicto y motivo, **no datos del funcionario**
- [ ] `HistorialJornadaService` consolida con el evento `CuadroCerrado`
- [ ] Ninguna regla de descanso fuera de este módulo
- [ ] Prueba: cambiar `JORNADA_MAXIMA_HORAS` altera el comportamiento sin recompilar

### E5 · `cuadro-diario`

- [ ] Un solo cuadro por fecha
- [ ] Número de semana ISO 8601 calculado
- [ ] Transiciones de estado válidas
- [ ] Cierre emite `CuadroCerrado`
- [ ] Cuadro cerrado rechaza escrituras con `CUADRO_CERRADO`

### E6 · `operativos`

- [ ] Identificador generado, secuencial reiniciado por día y formulario
- [ ] Colisión concurrente resuelta con reintento
- [ ] Conductor y vehículo nulos al registrar, estado `PENDIENTE`
- [ ] Alertas calculadas y recalculadas por completo
- [ ] Cupo compartido del formulario 6 respetado
- [ ] Un rol no puede escribir en formulario ajeno ni manipulando la petición

### E7 · `transporte`

- [ ] `ActualizarTransporteDto` con dos propiedades
- [ ] Campo adicional produce `400` con lista de rechazados
- [ ] Reglas de descanso del conductor aplicadas
- [ ] Propios medios retira la alerta sin asignar vehículo
- [ ] Capacidad excedida advierte sin bloquear

### E8 · `documentos`

- [ ] Matriz agrupada por los nueve formularios con sus colores
- [ ] Evidencia de formulario sin carga cuando la ventana venció
- [ ] Matriz restringida al rol Director
- [ ] Una orden por funcionario
- [ ] `DatoAisladoBuilder` produce objeto cerrado de cuatro campos
- [ ] Orden emitida es inmutable; la corrección genera reemisión

### E9 y E10 · Frontend

- [ ] Rutas registradas con `RutaProtegida`
- [ ] Navegación con `allowedRoles`, ítems ajenos atenuados
- [ ] Siete perfiles en `usuariosPrueba.ts`
- [ ] Servicios usan `httpClient`
- [ ] Ninguna clase CSS nueva
- [ ] Colores de banner recibidos del backend
- [ ] Rejilla de cuatro columnas en pantalla ancha
- [ ] Toda señal de color con equivalente textual
- [ ] `npm run lint` y `npm run build` sin errores nuevos

### E11 · Docker

- [ ] `npx prisma generate` en la etapa de construcción
- [ ] Contenedor con usuario no privilegiado
- [ ] Puertos sin colisión con Instrucción
- [ ] `TZ` configurada
- [ ] Migraciones fuera del arranque

---

## 19. CRITERIOS DE ACEPTACIÓN

Verificables por comando. No se declara una etapa completa sin que todos pasen.

### 19.1 Compilación y estilo

| Criterio | Comando | Esperado |
|---|---|---|
| Backend compila | `npm run build` | Código de salida 0 |
| Backend sin errores de estilo | `npm run lint` | Código de salida 0 |
| Frontend compila | `npm run build` | Código de salida 0 |
| Frontend sin errores de estilo | `npm run lint` | Código de salida 0 |
| Sin `any` en código nuevo | `grep -rn ": any" src/modules/` | Sin coincidencias |
| Sin `console.log` | `grep -rn "console.log" src/modules/` | Sin coincidencias |
| Sin TypeORM en módulos nuevos | `grep -rn "typeorm" src/modules/` | Sin coincidencias |

### 19.2 Base de datos

| Criterio | Comando | Esperado |
|---|---|---|
| Esquema sincronizado | `npx prisma migrate status` | Sin migraciones pendientes |
| Sin divergencia | `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma` | Sin diferencias |
| Restricciones presentes | `psql -c "\d+ t_operativo"` | Las 8 restricciones de la tabla |
| Semilla idempotente | `npx prisma db seed && npx prisma db seed` | Sin error, sin duplicados |
| 9 formularios | `psql -c "SELECT count(*) FROM t_formulario"` | `9` |
| 8 parámetros | `psql -c "SELECT count(*) FROM t_parametro_politica"` | `8` |

### 19.3 Autorización

| Criterio | Verificación | Esperado |
|---|---|---|
| Rol no puede escribir en formulario ajeno | `POST /operativos` con formulario de otra rama | `403 FORMULARIO_NO_AUTORIZADO` |
| DAF no puede crear operativos | `POST /operativos` con rol DAF | `403 ROL_NO_AUTORIZADO` |
| DAF no puede tocar otros campos | `PATCH /transporte/operativos/:id` con `horaInicio` | `400 CAMPOS_NO_PERMITIDOS` |
| Departamental no ve la matriz | `GET /matriz/:fecha` con rol DMIP | `403` |
| Director no puede registrar | `POST /operativos` con rol Director | `403` |
| Fuera de ventana | `POST /operativos` con ventana cerrada | `423 VENTANA_CARGA_CERRADA` |

### 19.4 Reglas de negocio

| Criterio | Verificación | Esperado |
|---|---|---|
| Patrulla consecutiva | Asignar a quien salió ayer | `409 PATRULLA_CONSECUTIVA` con el nombre |
| Tipo de contrato | Asignar nombramiento a turno nocturno | `409 CONTRATO_NO_ADMITE_TURNO` |
| Tope de salidas | Asignar a quien alcanzó el tope | `409 TOPE_SALIDAS_PESADAS` |
| Solapamiento | Asignar a la misma persona en horarios cruzados | `409 SOLAPAMIENTO_HORARIO` con el operativo en conflicto |
| Cruce de medianoche | Solapar `22:00–02:00` con `01:00–05:00` | Detectado |
| Jornada configurable | Cambiar `JORNADA_MAXIMA_HORAS` a `8` y reintentar | Comportamiento cambia sin recompilar |
| Secuencial diario | Registrar en dos fechas distintas | Ambas empiezan en `001` |
| Alerta se retira | Asignar transporte a operativo pendiente | `alertaActiva` pasa a falso |

### 19.5 Aislamiento del dato

| Criterio | Verificación | Esperado |
|---|---|---|
| Orden con cuatro campos | Emitir orden y revisar `oser_dato_aislado` | Solo horario, funcionario, conductor, placa |
| Una hoja por persona | Emitir sobre operativo con tres funcionarios | Tres órdenes, ninguna menciona a las otras |
| Órdenes propias | `GET /ordenes-servicio/mias` con dos usuarios | Cada uno ve solo las suyas |
| Sin filtración en logs | `grep -E "[0-9]{9,10}" logs/` | Sin teléfonos ni cédulas |

### 19.6 Interfaz

| Criterio | Verificación | Esperado |
|---|---|---|
| Sin clases nuevas | Comparar clases usadas contra §2.2 de FASE5 | Todas existentes |
| Colores del backend | Inspeccionar la respuesta de la matriz | Colores en el JSON, no en el código |
| Pantallas por rol | Cambiar de perfil | El árbol de componentes cambia |
| Señal no cromática | Revisar cada celda con color | Todas con texto o `title` |
| Responsivo | Probar en 375, 768 y 1440 px | Sin desbordamiento horizontal del contenedor |

---

## 20. AGENTES Y SKILLS

### 20.1 Skills ya presentes

`codigo-limpio-amc`, `diseno-sigoc`, `traer-main`, `tablas-amc`, `paquete-docker`, `nueva-rama`, `confirmaciones-amc`. Se cargan automáticamente y **se respetan**.

### 20.2 Agentes existentes

| Agente | Estado |
|---|---|
| `qa-pruebas` | **Requiere adaptación**: apunta a puertos 5073 y 3000, base `amcInstruccion` y funciones `fu_*`. Reapuntar a 5176, 3003, `transportedb` y Prisma |
| `revisor-amc` | Reutilizable |
| `ux-amc` | Reutilizable |

### 20.3 Agentes sugeridos

| Agente | Etapas | Herramientas |
|---|---|---|
| `prisma-schema` | E1, E14 | Read, Edit, Write, Bash |
| `dominio-reglas` | E4, E6 | Read, Edit, Write |
| `nest-modulo` | E3 a E8 | Read, Edit, Write, Bash |
| `react-pantalla` | E9, E10 | Read, Edit, Write |
| `auditor-rbac` | Tras cada módulo | **Solo lectura**: Read, Grep, Glob |

> Los agentes de auditoría y revisión deben ser de **solo lectura**. Reportan, no corrigen.

---

## 21. REFERENCIAS CRUZADAS

| Necesito | Documento | Apartado |
|---|---|---|
| Reglas de negocio con su fuente | FASE2 | §8 |
| Casos de uso detallados | FASE2 | §6 |
| Las 32 validaciones | FASE2 | §19 |
| Catálogos exactos de los 9 formularios | FASE2 | §16.3 |
| Invariantes y agregados | FASE3 | §5 |
| Objetos de valor | FASE3 | §7 |
| Eventos de dominio | FASE3 | §9 |
| Contratos de API con ejemplos | FASE4-arquitectura | §8 |
| Diccionario de datos | FASE4-base-datos | §6 |
| Restricciones e índices | FASE4-base-datos | §7 y §8 |
| Esquema Prisma completo | FASE4-base-datos | §10 |
| Clases CSS permitidas | FASE5 | §2.2 |
| Estados por pantalla | FASE5 | §8 |
| Accesibilidad | FASE5 | §10 |

---

## 22. ADVERTENCIA FINAL

Este documento permite implementar el proyecto de forma asistida, **no desatendida**. Tres motivos:

**Faltan datos maestros.** La matriz zonal ↔ punto, la base de personal y el catálogo de conductores siguen pendientes. El módulo de catálogos se construye pero no se puede poblar por completo.

**Doce puntos siguen sin definición del negocio.** Están en el apartado 0.1. Completarlos por inferencia destruiría el trabajo de cinco fases de análisis, cuyo valor está precisamente en distinguir lo acordado de lo supuesto.

**Las reglas de descanso protegen a personas.** Un defecto en `RangoHorario` o en `DescansoPersonalPolicy` no produce un error de sistema: produce un funcionario asignado a dieciséis horas de jornada o a patrullas en días consecutivos. Esa es la razón por la que existe el proyecto. Esas piezas se implementan con pruebas antes de usarse, y se verifican con el Product Owner antes de ir a producción.

**Verificación entre etapas.** Al terminar cada una, ejecutar su lista del apartado 18 y los criterios del apartado 19, y confirmar con el responsable funcional antes de continuar.

---

*Fin de la guía de implementación.*
