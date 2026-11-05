# 12 · Documento de Arquitectura

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Refleja el código de la rama `base/cuadro-colores` (backend 24520af, frontend d13a5db). Las
> decisiones DA-01 a DA-15 siguen vigentes, algunas precisadas; DA-16 a DA-22 son de septiembre a
> noviembre de 2026.

---

## 1. El problema que resuelve

El Cuadro de Colores es el compilado diario de los operativos de la AMC. Antes de este sistema:

1. **Una sola persona lo consolidaba a mano** y dejó el cargo durante el levantamiento, sin
   traspaso.
2. **El cuadro circulaba por WhatsApp** y los intervenidos se anticipaban al operativo.

Casi todas las decisiones de arquitectura que siguen se explican por el segundo problema.

Desde septiembre de 2026 el sistema cubre además la **planificación del transporte de la DAF**:
conductores, vehículos, garajes, mantenimiento, turnos y tiempos de traslado entre zonales.

---

## 2. Vista general

```
┌───────────────────────────────────────────────────────────────────────┐
│  Navegador                                                            │
│  React 19 + Vite · diecisiete pantallas, cada una en su fragmento     │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ HTTPS en producción · x-correlation-id
┌──────────────────────────────▼────────────────────────────────────────┐
│  Gateway de *.quito.gob.ec (solo producción; termina el TLS)          │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ X-Forwarded-Proto · X-Forwarded-For
┌──────────────────────────────▼────────────────────────────────────────┐
│  nginx (contenedor transporte-front, puerto 5180)                     │
│  Estáticos con CSP estricta · proxy de /api/ → transporte-app:3003    │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│  NestJS 11 (puerto 3003, prefijo /api/v1) · helmet · throttler        │
│                                                                       │
│  IdentidadGuard → PermisosGuard → FormularioRolGuard →                │
│       401              403              403                           │
│  VentanaCargaGuard → ValidationPipe → Service → Repository → Prisma   │
│       423                 400          409                            │
│                                                                       │
│  Siete submódulos: configuracion · talento-operativo · cuadro-diario  │
│      operativos · transporte · documentos · identidad                 │
│  39 controladores · 215 manejadores de ruta                           │
└───────────┬───────────────────────────────────┬───────────────────────┘
            │                                   │ HTTPS (canje, directorio,
┌───────────▼───────────────────────┐           │ trámites de Inspección)
│  PostgreSQL 18                    │   ┌───────▼───────────────────────┐
│  55 modelos · 20 enumerados       │   │  Auth central · Inspección    │
│  52 CHECK · 15 índices parciales  │   └───────────────────────────────┘
│  104 migraciones                  │
└───────────────────────────────────┘
```

**Hay tres ambientes** desde el 16 de octubre de 2026: local, preproducción (el usuario llega
directo al nginx, sin Gateway) y producción detrás del Gateway. La imagen del backend es la misma
en los dos servidores; la del frontend se compila por ambiente, porque la dirección del portal de
Auth queda dentro del JavaScript (`VITE_AUTH_PORTAL_URL`).

---

## 3. Decisiones de arquitectura

### DA-01 · El aislamiento de la información es el requisito, no una buena práctica

Todo el sistema está construido alrededor de que **nadie vea más de lo que le corresponde**:

- `GET /formularios/permitidos` llega **ya filtrado por el servidor**. Si la interfaz recortara una
  lista completa, bastaría con no recortarla.
- El **documento exportable** de la matriz es **exclusivo de la Dirección**: `/jornada/:fecha` no
  tiene ruta de exportación, y es la mitad que sostiene RN-44.
- La matriz consolidada (P-04) es **exclusiva de la Dirección**.
- **La Jornada del Día muestra a cada rol solo sus formularios** (cambió el 15 de septiembre de
  2026). Durante unas semanas los departamentales vieron los nueve en lectura; el negocio lo
  revirtió y `componer` descarta en el servidor las secciones que el rol solo leería. Ni siquiera
  viajan.
- **De un formulario ajeno, solo las horas.** La ocupación del día de `GET /personal/elegible` y las
  notas «compartir con» de la Jornada no nombran operativos que el rol no ve (RN-48).
- La orden de servicio tiene **cuatro campos**, no menciona a los demás funcionarios y **solo la
  emite la Dirección** (`DirectorGuard`, desde el 27 de octubre).
- El DTO de selección de personal **no incluye el teléfono**: un campo que no existe en el contrato
  no se filtra por descuido.

### DA-02 · Cuatro capas por submódulo, con una frontera dura

`presentation` → `application` → `domain`, y `infrastructure` como único punto que toca Prisma.
La comunicación entre submódulos es **solo por servicios publicados o por puertos**.

El caso que mejor lo ilustra: `operativos` pregunta a `talento-operativo` si una persona puede
salir y recibe **un veredicto con su motivo, nunca los antecedentes**.

Cuando la dependencia iría en el sentido contrario —`operativos` necesita que `transporte` herede
la asignación de un adicional o diga si dos operativos caben en una misma unidad— se usa un
**puerto** (`RegistroHerenciaTransporte`, `RegistroCompatibilidadCompartir`) que `transporte` llena al
iniciar. Así no hay dependencia circular entre módulos.

### DA-03 · Las reglas viven en un solo sitio

Las reglas de descanso del personal están **solo** en `talento-operativo`. Desde el 14 de octubre
de 2026 las del conductor se reparten en **dos** sitios, y solo en ellos:

| Dónde | Qué reglas |
|---|---|
| `talento-operativo` | RN-44 (patrulla consecutiva) y RN-25 (tope de salidas pesadas), entregadas como veredictos por `ElegibilidadService.evaluadorDeConduccion` |
| `transporte/application/politicas/asignacion-conductor.policy.ts` | Ausencia, jornada laboral, solapamiento y jornada máxima como lapso del primer al último tramo |

Las cuatro se movieron porque solo se miden bien por tramo y con traslados. El mismo principio rige
reglas más pequeñas: `pideVehiculoDaf`, `esLoteDeRegistro`, `minutosTraslado` y `admiteJornada` son
funciones únicas que todos consultan, y los `CLAUDE.md` prohíben reescribirlas en línea.

### DA-04 · Los umbrales son datos, no código

Los umbrales viven en `t_parametro_politica`, con su tipo, rango, descripción y, desde el 24 de
octubre, su **valor de siembra** (`para_valor_siembra`). Las políticas los leen; **nunca una
constante literal**.

Ya no son ocho: incluyen equidad e índice de fatiga, duración de tramos, traslados, turnos y flota de
la DAF. La pantalla los agrupa con `config/catalogoParametros.ts`, y uno que no esté catalogado cae
en «Otros» sin que haya que tocar la interfaz. `PUT /parametros` guarda varios a la vez, **todos o
ninguno**.

### DA-05 · Cuatro niveles para acotar la escritura de la DAF

La DAF escribe dos campos: conductor y vehículo. La restricción sigue en cuatro sitios:

1. **Endpoints propios** bajo `/transporte`, con el permiso `transporte:asignar`.
2. **Un DTO de exactamente dos propiedades** (`ActualizarTransporteDto`), con
   `forbidNonWhitelisted`. El `PATCH` clásico delega en la asignación por tramos.
3. **Escritura acotada en el repositorio**: tramos, y el reflejo en el operativo.
4. **Una pantalla sin controles de captura**: el cajón de candidatos de «Planificar el día» solo
   envía identificación, conductor y vehículo.

Cuando la DAF necesitó escribir otra cosa —destino del vehículo, vehículos de la jornada, acta de
fin del día, hojas de ruta— cada dato recibió **su propio endpoint**, no un campo más en el DTO.

### DA-06 · La ventana restringe la escritura, nunca la lectura

`VentanaCargaGuard` deja pasar toda petición de lectura. La Dirección revisa el cuadro
**precisamente cuando las ventanas ya vencieron**.

No se aplica a la administración, y `AdicionalesController` es la única escritura exenta: el
adicional se dispone por urgencia cuando la carga ya cerró. La excepción vive en un controlador
aparte, no en un decorador que cualquiera pueda copiar.

### DA-07 · La auditoría se escribe dentro de la transacción

No existe la posibilidad de un cambio guardado sin su rastro. Los **eventos** se emiten **después
de confirmar**. Los scripts de mantenimiento y las migraciones de datos siguen la misma regla:
dejan su traza en `t_auditoria` con una correlación propia.

### DA-08 · Concurrencia por bloqueo optimista y por serie

`t_operativo.version` con `updateMany({ where: { id, version } })`: si otro usuario modificó la
fila, `409`. **Desde el 28 de octubre la numeración diaria se serializa** con
`pg_advisory_xact_lock(cuadro, formulario)` (`bloquearSerie`) antes de leer el máximo secuencial; el
reintento por `P2002` queda como red.

### DA-09 · Fechas de calendario en UTC, instantes en Guayaquil

Las columnas `@db.Date` no tienen hora ni huso: se manejan en UTC y viajan como texto
`AAAA-MM-DD`. Convertirlas a `Date` en Quito —UTC−5— las desplaza un día. El frontend compara
cadenas y el backend construye con `Date.UTC(...)`.

### DA-10 · Aislar la identidad en un solo punto · **la decisión se validó sola**

Toda la resolución de identidad está en `IdentidadGuard`. Llegó Auth central en agosto de 2026 y la
cadena posterior no cambió. Lo que sí hizo falta fue el submódulo `modules/identidad`. **El guard
sigue siendo síncrono**: verificar un JWT propio no toca la red.

### DA-11 · Los colores son un dato institucional

Los colores del banner viven en la base y viajan en el JSON. El frontend **los pinta, no los
define**. Única excepción: el color del texto sobre el banner, por luminancia WCAG.

### DA-12 · Ninguna información depende solo del color

Cada celda amarilla lleva el mensaje del servidor; cada estado lleva su palabra; cada banner lleva
su número, su nombre y el nombre de su color. Una acción apagada lleva su motivo en el `Tooltip`.

### DA-13 · Carga diferida por ruta, con la guarda por fuera

Cada pantalla en su fragmento. `RutaProtegida` envuelve **por fuera** de `Suspense`.

### DA-14 · El PDF lo genera el servidor

La matriz y la orden corta se dibujan con `pdfkit`, que trae sus propias fuentes. **Desde
septiembre de 2026** el memorando de la orden se compone con `pdfmake` (`motor-documento.ts`), que
resuelve mejor un documento de apartados y tablas, con las fuentes Roboto de `fonts/`. La firma
digital `.p12`, opcional, la aplica `pdf-lib`.

El navegador **muestra** el PDF con `react-pdf` (visor y vista previa de la plantilla), pero no lo
construye: lo que se ve es exactamente lo que se emite.

### DA-15 · Los datos maestros no se inventan

Lo que el negocio no entregó no se completa con un valor razonable. El caso de la jornada laboral lo
muestra: la migración `20261023100000` siembra el catálogo pero **no asigna jornada a nadie**, y sin
jornada no se convoca. Cada asignación la decide el administrador.

### DA-16 · El acceso es un permiso, no un rol · 16 de septiembre de 2026

Cada endpoint declara `@RequierePermiso('modulo:accion')` y `PermisosGuard` lo valida contra
`t_rol_permiso`. Tres tablas: `t_rol`, `t_permiso` y `t_rol_permiso`. La matriz se edita en caliente
desde «Permisos por rol» y rige en la siguiente petición.

**Lo que sigue en código, a propósito**, porque es regla de negocio y no acceso: el enumerado
`RolDepartamental` como identidad física del rol, el «sombrero» de auditoría, `ROL_DEL_AREA`, la
máquina de estados del cuadro y la composición multi-rol.

En el frontend, rutas y menú se gatean con `user.permisos`; el servidor sigue siendo la autoridad.

### DA-17 · La ocupación del transporte tiene una sola fuente: el tramo · 14 de octubre de 2026

Un operativo se descompone en tramos (`t_tramo_transporte`) según su tipo: dejar, retirar o
completo. **Solo los tramos dicen si un conductor o un vehículo está ocupado.** El conductor y la
placa del operativo son un reflejo para la orden, la matriz y `ck_operativo_transporte`.

Sobre esa base se construyeron compartir unidad (asientos contados por momento), el optimizador, las
horas libres, la sustitución de placa y el aviso de traslados. La hoja de ruta emitida guarda la
**huella** de sus tramos para detectar un cambio posterior sin guardar copias.

### DA-18 · Un registro agrupado es una sola solicitud · 4 de noviembre de 2026

La patrulla 5/6 y el registro por zonas del 8 producen varios operativos, uno por código, con el
mismo `oper_grupo_registro`. Para la DAF son **una** solicitud con **un** conductor y **un**
vehículo:

- `esLoteDeRegistro` decide qué se agrupa; no hay ramas por número de formulario.
- `representanteDeLote` elige el código que habla por el registro (nunca el que aporta el DMIT).
- `sincronizarOperativos` copia la asignación a todos los códigos.
- Los avisos de asientos y horario se calculan al leer y **no liberan** la asignación.

La misma idea rige en el cuadro: retirar o editar el operativo es retirar o editar el registro
entero.

### DA-19 · La jornada laboral es un catálogo, no un enumerado · 23 de octubre de 2026

El tipo de contrato (Nombramiento / Ocasional) estaba cableado en el enumerado `e_tipo_contrato`.
Lo reemplaza `t_jornada_laboral` (días y ventana opcional), administrable desde «Ventanas y
parámetros». Una sola regla pura, `admiteJornada`, sirve al personal y al conductor. Agregar una
jornada nueva es un dato, no una migración.

### DA-20 · Una pieza para cada cosa en la interfaz · octubre de 2026

Un botón (`Boton`), un cajón (`DrawerLateral`), tres formas de decir algo (`MensajeModal`, `toast`,
`AvisoEnLinea`), un paginador, un tooltip y, desde el 24 de octubre, una plantilla de página
(`EncabezadoPagina` + `PanelTabla`). Pruebas que recorren el código (`estandarBotones.spec.ts`,
`cajonEstandar.spec.ts`, `mensajesEstandar.spec.ts`) y reglas de lint impiden que vuelvan las
variantes. Las listas desplegables se abren en un portal (`usePanelFlotante`) para no quedar
atrapadas bajo los paneles.

### DA-21 · Detrás del Gateway, la confianza se declara · 16 y 22 de octubre de 2026

El backend no adivina cuántos proxies tiene delante: `TRUST_PROXY` lo dice (1 en preproducción, 2 en
producción) y `validar-entorno.ts` rechaza cualquier valor que no sea un entero. El nginx reenvía el
`X-Forwarded-Proto` del Gateway. La intermedia de DigiCert que el Auth no envía se suma con
`NODE_EXTRA_CA_CERTS`; **nunca** se desactiva la verificación TLS.

### DA-22 · Ninguna IP en el repositorio · 16 de octubre de 2026

Ni en código, ni en comentarios, ni en documentación. Por eso `VITE_AUTH_PORTAL_URL` no tiene valor
por omisión y la construcción se detiene sin ella. Las direcciones reales viajan solo en los paquetes
que arma `scripts/empaquetar.sh`.

---

## 4. Modelo de dominio

### Agregados

| Agregado | Raíz | Invariantes que protege |
|---|---|---|
| **Cuadro diario** | `CuadroDiario` | El estado se deriva de las ventanas; cerrado no admite escritura; el aporte compartido se mide por registro |
| **Registro** | `oper_grupo_registro` (`t_registro_operativo` en el registro por zonas) | Un id por registro, nunca nulo; se edita y se retira entero; una zona principal |
| **Operativo** | `Operativo` | Identificador único por día; punto de catálogo **o** libre; ventana derivada de su personal (RN-66); transporte coherente |
| **Funcionario** | `Funcionario` | Baja lógica con motivo; disponibilidad sin solapes; jornada laboral para ser convocado |
| **Orden de servicio** | `OrdenServicio` | Una vigente por operativo y persona; **cuatro campos**; formato según el área de la persona |
| **Jornada de transporte** | `TramoTransporte` | Un conductor y un vehículo por tramo; sin solapes; asientos por momento |
| **Flota** | `Vehiculo`, `Conductor`, `UbicacionFlota` | Placa normalizada y única; baja con fecha y autor; no se da de baja con asignaciones pendientes |

### Objetos de valor y reglas de dominio

`IdentificadorOperativo` · `RangoHorario` (con `envolvente`) · `DatoAislado` · `RangoIdentificadores`
· `ClasificacionControl` · `EstadoTransporte` · `JornadaLaboral` · `FormatoOrden`.

`DatoAislado` se construye congelado (`Object.freeze`) y se valida al leerlo de la base.

### Políticas

| Política | Dónde | Qué decide |
|---|---|---|
| Descanso de personal | `talento-operativo` | Patrulla consecutiva, tope de salidas, jornada máxima, jornada laboral, turno de cobertura |
| Descanso de conductor | `talento-operativo` | RN-44 y RN-25 del conductor, como veredicto por lote |
| Índice de fatiga y equidad | `talento-operativo` | Semáforo de carga. **Advierte, no bloquea** |
| Cobertura por turnos | `talento-operativo` | Rotación y alertas del mes de Instrucción |
| Alertas del operativo | `operativos` | Qué celdas se marcan y por qué |
| Composición de personal | `operativos` | Área admitida, tope de personas, una sola área, faltantes por registro |
| Asignación de conductor | `transporte` | Ausencia, jornada laboral, solapamiento, traslados, jornada como lapso |
| Compartir tramo | `transporte` | Compartido, secuencial, contenido o conflicto; asientos por momento |
| Registro agrupado | `transporte` | Agrupación, representante y avisos |
| Optimizador | `transporte` | Propuesta de asignación de los pendientes |
| Hoja de ruta | `transporte` | Filas por registro, tipo y hora; huella de emisión |
| Capacidad de flota | `transporte` | Compara demanda con lo declarado. **Nunca lanza excepción** |

**Son funciones puras**: reciben los datos ya resueltos y devuelven un veredicto. Por eso se prueban
sin base de datos, y por eso hay 2420 pruebas unitarias.

---

## 5. Atributos de calidad

| Atributo | Cómo se sostiene |
|---|---|
| **Confidencialidad** | Filtrado en el servidor; contratos que no incluyen lo que no debe salir; RN-48 en la ocupación y en las notas |
| **Trazabilidad** | Auditoría dentro de la transacción; correlación en cada petición, en los scripts y en las migraciones de datos |
| **Corrección** | 52 `CHECK` y 15 índices parciales en la base, además de las reglas en el código |
| **Disponibilidad** | Comprobaciones de salud; `depends_on` con condición |
| **Rendimiento** | Índices parciales; lecturas en lote (ocupación del día, autores de notas, ausencias de la flota) en lugar de una consulta por fila |
| **Mantenibilidad** | Cuatro capas; políticas puras; 2420 pruebas unitarias en el backend y 2081 en el frontend |
| **Seguridad** | Cookie `HttpOnly`; RBAC en el servidor; `helmet`; `ThrottlerGuard` con la IP real (`TRUST_PROXY`); CSP estricta en el nginx; contenedores sin privilegios |

---

## 6. Lo que la arquitectura no resuelve

| Ausencia | Efecto | Dónde entraría |
|---|---|---|
| **Firma asimétrica** | El secreto de Auth es HS256 **compartido por todo el ecosistema** | RS256 con clave pública, en Auth central |
| **Revocación del cierre de sesión** | El logout no invalida el token en el servidor | Auth central |
| **HTTPS en preproducción** | Ese servidor se sirve por HTTP; producción ya va por el Gateway | Infraestructura |
| **Métricas y alertas** | Solo registro y `pg_stat_statements` | Infraestructura |
| **Purga de auditoría** | `t_auditoria` crece sin límite (PV-18) | Tarea programada |
| **Alta disponibilidad** | Un contenedor por servicio | El diseño la tolera; no se ha probado |
| **Notificaciones** | La solicitud de apoyo no avisa a nadie (PV-12) | Depende de decidir el flujo |
| **Dónde aborda el personal** | La duración del tramo es un parámetro por tipo, no la matriz de traslados | Definición del negocio (§7 de la lógica DAF) |

---

## 7. Riesgos vigentes

| # | Riesgo | Estado |
|---|---|---|
| R-01 | El matrizador cesó funciones sin traspaso | **Materializado.** Este sistema es la respuesta |
| R-02 | Resistencia a la adopción: «es más fácil mandar un WhatsApp» | Abierto. Mitigación: formulario condensado, selector con «N hoy» y recientes |
| R-03 | Un solo desarrollador para todo el ecosistema | Abierto |
| R-05 | Entidades externas sin obligación de usar la plantilla | Abierto. Requiere memorando |
| R-07 | Riesgo legal preexistente: vehículos sin orden de movilización | El sistema deja evidencia y emite hojas de ruta; no resuelve lo jurídico |
| R-08 | Pruebas de integración desactualizadas | Abierto. Ocho suites con fixtures por corregir (ver `11_Guia_Mantenimiento.md` §5) |

---

## 8. Trazabilidad módulo → arquitectura

| Bloque | Módulos | Aporte |
|---|---|---|
| A · Cimientos | M-01 a M-05 | Prisma, esquema, semilla, núcleo transversal, autorización |
| B · Configuración | M-06 a M-08 | Parámetros, formularios, ventanas |
| C · Talento | M-09 a M-12 | Objetos de valor, personal, historial, **reglas de descanso** |
| D · Jornada | M-13 a M-16 | Cuadro diario, operativos, personal, apoyo |
| E · Logística | M-17, M-18 | Transporte y capacidad de flota |
| F · Documentos | M-19, M-20 | Matriz consolidada y órdenes de servicio |
| G · Interfaz | M-21 a M-29 | Base del frontend y las primeras pantallas |
| H · Cierre | M-30 | Contenedores, despliegue e identidad real |
| I · Evolución (sep–nov 2026) | Sin numeración M | RBAC, cobertura por turnos, memorando con plantilla, transporte DAF por tramos, flota y garajes, traslados, jornada laboral, registro por zonas y agrupado, plantilla visual única, operación detrás del Gateway |
