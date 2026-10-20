# CLAUDE.md — Transporte Frontend

Aplicación web del **Módulo Transportes / Cuadro de Colores Operativo** de la Agencia
Metropolitana de Control (AMC), Quito.

> Este repositorio contiene **un solo módulo**. Las páginas y componentes del sistema de
> Instrucción fueron retirados. Si encuentras referencias a expedientes, sorteos, dictámenes
> o sustanciación, son residuos que deben eliminarse.

---

## 1. Qué hace este sistema

El Cuadro de Colores es el compilado diario de los operativos de la AMC. Nueve formularios
independientes, cada uno propiedad de un departamento, que se consolidan en una matriz que solo
ve la Dirección, y de la que se emiten órdenes de servicio individuales.

El proyecto nació porque el cuadro circulaba por WhatsApp y los intervenidos se anticipaban al
operativo. **El aislamiento de la información es el requisito que originó el encargo**, no una
buena práctica genérica.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19.2 + TypeScript 5.9 |
| Construcción | Vite 7.3 |
| Estilos | Tailwind CSS 4.2 + **daisyUI 5.5** |
| Rutas | react-router-dom 7.13 |
| Formularios | Formik + Yup |
| Iconos | FontAwesome 7 — **solo `free-solid`**, y solo por `components/common/Iconos.tsx`. Ver regla 13 |
| Tablas | @tanstack/react-table 8.21 |
| Documentos | **ninguna librería.** El PDF lo genera el servidor y el navegador solo lo descarga |
| HTTP | `src/api/httpClient.ts` — **nunca `axios` directo** |
| Pruebas | **Vitest 3 + Testing Library + jsdom** (M-22) |
| Puerto | **5180** · API en **3003** |

Si una tarea parece necesitar una librería nueva, **avisa primero**.

---

## 3. Cómo ejecutar

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # Vitest, una pasada
npm run test:watch # Vitest en observación
npm run lint       # debe salir con código 0
npm run build      # debe salir con código 0
```

**`VITE_AUTH_PORTAL_URL` es obligatoria (2026-10-16).** El código ya no trae una dirección del
portal de Auth por omisión: en el repositorio **no se escriben IP de servidores** (ni en código,
ni en comentarios, ni en documentación; se usan marcadores como `<IP_SERVIDOR_AUTH>`). `npm run
build` se detiene sin ella (`vite.config.ts`) y `npm run dev` muestra «Falta configurar la
dirección del portal de Auth». Para desarrollar, póngala en `.env.development.local` (ignorado).

Las pruebas viven junto al código que verifican, como `*.spec.ts` o `*.spec.tsx`. La configuración
compartida está en `src/pruebas/configuracion.ts`.

**Qué se prueba y qué no.** Se prueban **decisiones**: que un formulario ajeno no se pueda
seleccionar, que una persona no elegible muestre su motivo, que el cruce de medianoche se admita.
**No** se prueba el maquetado —que haya cuatro columnas a 1440 px se comprueba mirando—, y una
prueba que solo repita el marcado no aporta nada.

---

## 4. Estructura

```
src/
├── api/           httpClient · correlationId
├── components/
│   ├── common/    NotasObservacion (las notas de las cuatro tablas, solo lectura), Boton, AccionesFila, DrawerLateral, BarraPie (pie azul del cajón y del alta),
│   │               SeccionDrawer, CampoDrawer, MensajeModal, MensajeHost, AvisoEnLinea, Loading, Paginacion…
│   ├── ausencias/ PanelAusenciasBase — el cajón de ausencias de Personal y de Flota
│   ├── forms/     FormikField: TextInput, SelectInput, TextAreaInput
│   │               SelectorTokens: elegir varios de un catálogo, con teclado
│   ├── navbar/    Navbar, Sidebar, SelectorRolPruebas
│   └── cuadro/    Componentes del módulo. FormOperativo (el formulario único del operativo, `modo`
│                   alta | edicion | adicional), SelectorPersonal, SelectorFormulario (P-01, con «N hoy»
│                   y recientes), ObservacionesOperativo (las notas, alta y cajón), DrawerOperativo,
│                   TablaOperativos, NotasDeFila (las notas de la Jornada y la Matriz)…
├── config/        routes · navigation · env · usuariosPrueba · validationSchemas
├── context/       UserContext · ThemeContext · FechaDafContext
├── hooks/         useCuadroDiario · useFormulariosPermitidos · useVentanaCarga
├── interfaces/    Operativo · Formulario · CuadroDiario · Personal · Transporte · Alerta
├── layouts/       MainLayout · LoginLayout
├── pages/         Las nueve pantallas
├── providers/     AppProviders (monta el único MensajeHost) · ThemeProvider · UserProvider
├── pruebas/       configuracion.ts — preparación común de Vitest
├── services/      Un servicio por dominio
├── styles/        Tokens y hojas del sistema visual
└── utils/         horario.util — espejo de RangoHorario, solo para experiencia de usuario
                   listadoOperativos.util — texto de cada columna, filtrado y paginación
                   valoresOperativo.util — valores del formulario de operativo
                   ventanaCarga.util — «todavía no» frente a «ya no», solo para el aviso
                   flota.util — reglas puras de «Flota y garajes»: filtros, estado de
                     documentos (espejo), placa, patrón, hoy en Quito (ver PV-33)
                   formularioFlota.util — valores, validación y envío de sus tres cajones
                   banner.util — texto legible sobre el color del banner, y descarga
                   ordenes.util — sobre qué operativos se puede emitir, y por qué no
                   personal.util — nombres en español de los enumerados, y ausencias
                   parametro.util — rango admisible de un parámetro, y horario de ventana
                   errorApi.util — traduce el error del servidor a decisión de interfaz
                     (`presentarError`, `varianteDeAviso`, `avisoDeFallo`)
                   traductorErrores — el fallo a título + mensaje + detalle técnico (regla 19)
                   mensaje — el servicio de mensajes: `mensaje.*` y `toast.*` (regla 19)
                   texto.util — comparar sin tildes ni mayúsculas. **Única copia**: estaba
                     repetida en listadoOperativos.util y personal.util
                   politicasOperativo.util — reglas puras del formulario del operativo: qué
                     falta y en qué tarjeta, horario por persona, estado del pie del alta
                   selectorFormulario.util — selector de P-01: filtrar sin tildes, agrupar por
                     dueño, conteos, recientes (solo ids) y la línea de ayuda
                   estadoPieDrawer.util — el estado del pie de todo cajón (regla 18)
                   notasOperativo.util — las notas de la sesión: agregar, corregir, quitar,
                     fecha de Quito y la nota escrita sin «Agregar» al enviar (regla 14)
                   compartirUnidad.util — «compartir unidad»: lo que se dice a la DAF, invitados
                     de un anfitrión y el aviso de la intención retirada
                   notasDeTabla.util — las notas de la celda «Observaciones» (P-01/P-02): las
                     `notas` del servidor (NOTA y COMPARTIDA) o armadas con `observaciones`, el
                     texto que filtra y las fechas cortas de Quito
```

---

## 5. Las diecisiete pantallas

> **Y las tres últimas llegaron el 2026-08-31, con la implementación DAF.** Salen del
> levantamiento con Planificación de Transporte del 28-AGO:
>
> | Pantalla | Qué cierra |
> |---|---|
> | **P-14 · Jornada de los conductores** | El hallazgo central: el sistema modelaba «un operativo, un conductor» y el **38 % de las asignaciones reales encadenan más de uno**. Es una **vista**: no asigna |
> | **P-15 · Capacidad de flota** | `PUT /transporte/capacidad/:fecha` existía desde M-18 y **ningún componente lo llamaba**, así que RN-46 no se disparaba nunca en producción |
> | **P-16 · Mantenimiento de vehículos** | `MANTENIMIENTO` estaba en el enumerado desde el esquema inicial y **nadie podía escribirlo**: parar un vehículo era un `INSERT` a mano |
>
> **P-14 no es un tablero de arrastrar y soltar, y es deliberado.** Una línea de tiempo
> gráfica exige clases CSS que el inventario de `docs/FASE5-diseno-interfaz.md` §2.2 no
> tiene, y la regla 1 no admite excepciones por comodidad; y arrastrar solo tendría sentido
> si el sistema pudiera proponer dónde cae cada operativo, lo que exige el tiempo de
> traslado entre puntos —la pregunta Q-03, sin respuesta—. Ampliar el inventario **se
> decide, no se supone**.

> **Y la decimotercera llegó el 2026-08-26: `/cuadro/jornada`.** Es la Jornada del Día,
> con el diseño de la matriz y el personal editable solo donde `t_formulario_rol` lo concede.
>
> **La abren los tres departamentales desde el 2026-09-01, y CADA UNO VE SOLO SUS FORMULARIOS
> (2026-09-15).** Al principio la jornada mostraba los **nueve** formularios «solo en lectura y
> sin el personal ajeno», para dar visibilidad del día. El 2026-09-15 el negocio revirtió esa
> apertura: `componer` (backend) descarta las secciones que el rol solo leería (por
> `t_formulario_rol`, sobre la UNIÓN de sus roles), así que **el resto ni siquiera aparece**.
> DMIP_OPERATIVOS ve 1,2,3,4; INSPECCIONES 5,6,8; DMIT 4,6,7,9. Pesa más el aislamiento (RN-48)
> que ver el volumen ajeno; ya no hay «personal ajeno» que recortar porque la sección no viaja.
>
> **Son dos preguntas distintas y ahora son dos campos distintos.** `acceso` sigue diciendo
> qué autoridad tiene el rol; **`puedeEditarPersonal`** dice si esta pantalla es donde la
> ejerce. Sale de la columna `frol_edita_desde_jornada`, así que **aquí no se comprueba
> ningún rol** y conceder el camino es un `UPDATE`. Si algún día vuelve a derivarse de
> `acceso`, cae la prueba «con ESCRITURA pero sin el camino, tampoco ofrece nada».
>
> **No es P-04 ni la sustituye, y no comparte con ella ni un componente.** La matriz sigue
> siendo del Director, con su exportación y su cierre; P-13 no tiene ninguna de las dos, y
> su endpoint `GET /jornada/:fecha` **no tiene ruta de exportación**. Son dos pantallas con
> dos permisos, y compartir piezas sería por donde se colara una regresión en la que más se
> restringe.
>
> **Amplía el alcance de lectura de cuatro formularios a nueve**, que es una excepción a
> PER-02 tomada por el negocio con RN-48 sobre la mesa. Está documentada en
> `docs/FASE2-documentacion-funcional.md` §4.4.

> **Y la duodécima llegó el 2026-08-20: `/administracion/flota`.** No trajo backend: los ocho
> endpoints de `/administracion/conductores` y `/administracion/vehiculos` existían desde M-17 y
> **solo se podían usar con curl**. Era la limitación L-11, y dejaba la flota en cero, es decir
> PV-03, es decir que la DAF no podía asignar transporte a nada.
>
> **Eran nueve hasta el 2026-08-19.** Se sumaron dos de administración al retirar la
> semilla: las cuentas se sembraban desde un archivo de insumo y, sin él, dar de alta a
> alguien era una sentencia SQL a mano. `CONSTRUIDAS` sigue tipado como
> `Record<Ruta, ReactNode>`: si agrega una ruta sin su pantalla, TypeScript lo dirá.

| Ruta | Página | Perfiles |
|---|---|---|
| `/cuadro/registro` | Registro de operativo | DMIP Operativos, DMIP Inspecciones, DMIT |
| `/cuadro/mis-operativos` | Mis operativos | Ídem |
| `/cuadro/transporte` | **Planificar el día** | DAF. **Flujo guiado en 4 pasos desde el 2026-10-08** (Preparar → Asignar → Fin del día → Emitir). Ver la nota de abajo |
| `/cuadro/jornada-conductores` | Redirige a Planificar el día (vista «Tabla» del paso 2) | — |
| `/cuadro/capacidad` | Redirige a Planificar el día (paso 1, vehículos que salen) | — |
| `/administracion/mantenimiento` | Mantenimiento de vehículos | **Solo Administrador DAF** desde el 2026-09-01. Sale la DAF operativa: sigue **viendo** el vehículo parado —el estado viaja en `GET /transporte/vehiculos`— pero ya no lo para ella |
| `/cuadro/jornada` | Jornada del Día | Los **tres** departamentales desde el 2026-09-01. Cada rol ve **solo sus formularios** (los que escribe o aporta) desde el 2026-09-15. La acción de personal solo donde el servidor la concede (`frol_edita_desde_jornada`); para los demás es consulta |
| `/cuadro/matriz` | Matriz Consolidada del Día | **Solo Director** |
| `/cuadro/ordenes` | Órdenes de servicio | **Solo Director** |
| `/mis-ordenes` | Mis órdenes | Funcionario |
| `/administracion/personal` | Personal y disponibilidad | **Administrador DMIP y Administrador DMIT**, y cada uno ve **solo sus áreas**: el DMIP «Unidad de Operativos», «Inspector General» e «Inspector Técnico»; el DMIT «Personal de Instrucción». Lo acota el servidor por `func_direccion`, no el menú. **Rediseñada el 2026-10-08**: ver la nota de abajo |
| `/administracion/catalogos-cuadro` | Catálogos del cuadro | Administrador. **Rediseñada el 2026-10-12; configuración propia por formulario desde el 2026-10-13**: ver la nota de abajo |
| `/administracion/ventanas` | Ventanas y parámetros | Administrador |
| `/administracion/roles-auth` | Roles de Auth central | Administrador |
| `/administracion/usuarios` | Cuentas del cuadro | Administrador |
| `/administracion/flota` | **Flota y garajes** | **Solo Administrador DAF** desde el 2026-09-01. **Rediseñada el 2026-10-14**: ver la nota de abajo |
| `/administracion/permisos` | Permisos por rol | Permiso `permisos:administrar` (hoy el Administrador general). Edita la matriz rol↔permiso sin desplegar (RBAC, 2026-09-16) |

> **«Planificar el día» (P-03), rediseñada el 2026-10-08 como FLUJO GUIADO EN 4 PASOS.** Antes
> mostraba a la vez lista de chequeo, cinco indicadores, cuatro controles, dos paneles y la línea de
> tiempo. Ahora un `Stepper` navegable (`common/Stepper.tsx` con `onIr`) y UNA acción por paso,
> en `components/transporte/planificar/`: **1 Preparar** (requisitos del servidor con su acción;
> vehículos que salen con «Confirmar/Corregir»; ficha del conductor en el mismo cajón de Flota, `CompletarConductor` → `DrawerConductor`),
> **2 Asignar** (barra `progress`, «Asignar automáticamente» = optimizador sobre los pendientes,
> «Opciones (n)» en `dropdown`, sugerencia de libres por SIMULACIÓN, columna «Sin conductor»,
> línea de tiempo `linea/LineaConductores.tsx` con los avisos como chips, o tabla; cajón
> `DrawerCandidatos` con categoría y motivo del servidor —desde el 2026-10-16; era `ModalCandidatos`—, y la
> tarea de taller en `DrawerTareaTaller`), **3 Fin del día** (garaje sugerido y
> parqueadero con N.º de acta obligatorio) y **4 Emitir** (hojas de ruta con estado
> Pendiente/Emitida/«cambio posterior»). **El paso no se guarda: se deriva** del resumen
> `GET /transporte/jornada-daf/:fecha` con `derivarPaso` (`utils/planificarDia.util.ts`, espejo
> de la política del servidor). Se retiraron la vista de tabla heredada (bandeja, panel clásico de dos
> campos, destinos, P-14), los KPIs, «Por cubrir» con arrastrar y soltar, «Libres del día»,
> «Capacidad confirmada», el modal de propuesta y «Antes de asignar». Contrato:
> `transporte-backend/docs/CONTRATO-planificar-dia.md`.
> **Compartir unidad (2026-10-19, plan «compartir unidad»).** Quien registra deja la INTENCIÓN y la DAF
> la ejecuta (RN-40). La tarjeta del pendiente dice «Pide compartir con X» o «Exclusivo: <justificación>»
> (`utils/compartirUnidad.util.ts`). En `DrawerCandidatos`, sin asignación actual, la sección **«Compartir
> unidad»** (`GET /transporte/tramos/:id/compartibles`) lista los operativos ya asignados con los que puede
> viajar —el pedido primero, «Solicitado por el registrante»; los incompatibles apagados con su motivo; «X ·
> conductor · placa · N de M asientos libres»— y [Compartir unidad] (`acento`) llama a
> `POST /transporte/tramos/compartir`. Quitar a un anfitrión avisa antes a quién deja sin conductor y después
> dice el `aviso` del servidor (`DELETE …/asignacion` responde 200 con `{ liberados, aviso }`). En la línea
> de tiempo anfitrión e invitados son UN viaje (`fundirCompartidos`), «· Compartido con X». En la tabla, la
> insignia «Compartido con X». **«La misma unidad» (2026-10-19, aclaración del negocio):** se comparte el
> conductor con su vehículo, así que basta UN traslado en común —un «dejar y retirar» comparte el dejar con
> un «solo dejar»—. El registro lo dice bajo las opciones (`notaMismaUnidad`: «Viajarán juntos para dejar
> al personal; el mismo conductor y vehículo harán también el retiro si su agenda lo permite…») y, si no es
> compatible, escribe el motivo («No se puede compartir con X: …», no solo en el `title`). En el cajón,
> cada anfitrión dice «Comparte: dejar · Retiro con la misma unidad: viable / no viable (motivo)»
> (`detalleMismaUnidad`); si al compartir un traslado propio queda pendiente, sale un aviso de advertencia,
> y la tarjeta dice «Dejar compartido con X · falta el retiro» (`estadoMismaUnidad`). **Sin traslado en común
> pero sin cruce** (un «solo retirar» de la tarde con un «solo dejar» de la mañana) la opción se llama «Usar la
> misma unidad que X» (`rotuloCompartir`; en el cajón, `accionCompartir`) y la nota dice «No viajan juntos: el
> mismo conductor y vehículo pueden hacer el retiro después del traslado de X…». En el grupo A/B/C la nota dice
> con quién va cada traslado (`comparteCon`: «retirar al personal con OCPMO-002»). **«Completo» comparte unidad
> (2026-10-20):** la unidad que acompaña un «completo» todo el día puede dejar y retirar a otros del MISMO sitio. El registro
> lo dice con `contiene` («La unidad acompaña su operativo todo el día y además deja y retira al personal de X, sin moverse de
> su punto.») o `contenidoEn` («Viajará en la unidad que acompaña a X todo el día.»), en `notaMismaUnidad`; en el cajón,
> `detalleMismaUnidad` lo dice según `completo` (`ABARCA` / `DENTRO`). **Los asientos se cuentan POR MOMENTO (2026-10-21,
> decisión definitiva del negocio):** lo que va a bordo a cada hora —el «completo» todo el día, cada dejar y cada retirar
> en su traslado—. `textoAsientos` dice «Al dejar (08:00): 3 de 3 · Al retirar (16:00): 3 de 3» (`asientosPorMomento`),
> «Ocupará 3 de 4 asientos» con un solo momento o, si no cabe, «0 de 2 asientos libres» con el motivo del servidor («No caben a
> las 08:00: la unidad llevaría 3 personas y el vehículo tiene 2 asientos.»). Con la PMA-3370 en 3 asientos caben los cuatro
> operativos del 21-OCT. Por unas horas del mismo día rigió «todo el grupo»; se revirtió. En la línea de tiempo el grupo es UNA barra del «completo», del primer inicio
> al último fin, con el dejar y el retirar marcados dentro y dichos en el `title` (`fundirCompartidos(tramos, inicioJornada)` →
> `marcas`). **Desde el 2026-10-21 el «completo» es la raíz y también lo hace «Asignar automáticamente»:** el
> optimizador propone los dejar y retirar del mismo punto en la unidad del «completo» (salen en `compartidos`) y `PasoAsignar`
> confirma aunque la propuesta no traiga asignaciones (`textoAsignacionAutomatica`: «… N traslados viajan en una unidad ya
> asignada»). En `DrawerCandidatos`, el conductor ocupado solo por esa unidad llega como categoría `COMPARTE` («Misma
> unidad», `app-insignia-suave`, motivo «Comparte unidad con X») y su botón «Compartir unidad» (`acento`) llama a
> `POST /transporte/tramos/compartir` con `compartirCon`. Contrato:
> `transporte-backend/docs/CONTRATO-compartir-unidad.md`.
> **Sustitución de flota (2026-10-15).** En el cajón de candidatos, «Cambiar vehículo» pide
> `POST /transporte/evaluar/vehiculos` SOLO para ese candidato y abre un desplegable con la flota del
> día: arranca en la placa propuesta, las que darían 409 van deshabilitadas con su motivo («— en
> taller», «— ocupada por …»), las de aviso se eligen con el aviso debajo, y «Sin vehículo» envía
> `null`. Asignar sin placa lo dice en el mensaje («sin vehículo: falta la placa») y en la línea de
> tiempo (distintivo «Sin vehículo»; el operativo sigue PENDIENTE hasta tener placa). RN-40 intacta:
> la placa es uno de los dos campos de la DAF. «Traslados entre zonales» dice cuántos pares usan aún la
> regla general (`cobertura`). Contrato: `transporte-backend/docs/CONTRATO-sustitucion-flota.md`.

> **«Personal y disponibilidad» (P-07), rediseñada el 2026-10-08.** Maestro con cabecera de una
> fila y fija, 10 por página, filtro segmentado **Activos** (por omisión) | Inactivos | Todos y un
> solo contador «N funcionarios · X activos de Y en el maestro» (Y = sus direcciones). La columna
> Estado sale de **una** consulta (`GET /administracion/personal/ausencias`), no de una por fila.
> «Editar» y «Ausencias» visibles; el «⋮» solo con Dar de baja / Reactivar, ambos con modal de
> confirmación (la baja conserva su motivo obligatorio). Alta en dos pasos: el paso 1 oculta a quien
> ya tiene ficha **vigente** (`tieneFichaActiva`, casilla para mostrarlos), muestra las bajas sin poder
> elegirlas, filtra por dependencia y avanza con doble clic; el paso 2 va por secciones, valida
> teléfono `09…` y correo personal (espejo del servidor) **solo tras intentar guardar** y envía
> `origen: "AUTH" | "MANUAL"` —con AUTH el servidor toma el correo institucional de Auth—. Modal de
> ausencias con mensaje en vivo (`utils/ausencias.util.ts`), aviso de los operativos que la ausencia
> **no** retira y estado En curso / Próxima / Pasada (las pasadas no se quitan). Contrato:
> `transporte-backend/docs/CONTRATO-personal-rediseno.md`.

> **«Catálogos del cuadro» (P-08), rediseñada el 2026-10-12.** Cabecera con el selector del
> formulario que se configura (`SelectorFormularioCabecera`, con su color; pregunta si hay áreas sin
> guardar), áreas en barra plegable, tres pestañas (`tabs tabs-border`) con el número de activos y
> una barra común (buscar, Todos | Activos | Inactivos, contador, alta). Zonales en acordeón
> (`AcordeonZonales`; las abiertas las guarda la página, abierta la primera, la búsqueda abre las
> que coinciden). Crear y editar en un cajón (`DrawerValorCatalogo`, `ancho="md"` desde el cajón estándar) con aviso de
> duplicado en vivo (`utils/catalogos.util.ts`, espejo del 409 del servidor). «Eliminar» llega
> apagado con el motivo del servidor (`puedeEliminar`). Se retiraron `SelectorFormularioAdmin` y
> `PanelPuntosEncuentro`; `TablaCatalogo` y `ModalCatalogo` se retiraron el 2026-10-13.
> **Desde el 2026-10-13 cada formulario tiene su configuración PROPIA**: zonales, puntos, tipos e
> instituciones son del formulario elegido, todo viaja por `/administracion/catalogos/:codigo/…`
> y no hay copias ni «Disponible en los formularios». La zonal nueva elige su **zona de la ciudad**
> (`zonasDisponibles`); al cambiar de formulario se recarga todo, se limpia la búsqueda y se
> cierran los acordeones. `GET /zonales` (zonas de la ciudad) sigue sirviendo a personal, flota y
> cobertura. Contrato: `transporte-backend/docs/CONTRATO-zonal-por-formulario.md`.
> Acepta `?formulario=<código o id>&areas=abierto` (2026-10-13): abre con ese formulario y la barra
> de áreas desplegada. Es el ÚNICO sitio donde se editan las áreas de un formulario.

> **«Flota y garajes» (P-12), rediseñada el 2026-10-14.** Cuatro indicadores clicables
> (`TarjetaIndicador`, de `GET /administracion/flota/resumen`: vehículos activos, documentos por
> vencer con `DAF_DIAS_AVISO_VENCIMIENTO`, vehículos sin conductor habitual, conductores con datos
> incompletos) que abren su pestaña con su filtro, visible como ficha que se quita. Tres pestañas
> (`tabs tabs-border`) en lugar de tres tablas apiladas, con la pestaña y el filtro en la URL
> (`?tab=vehiculos|conductores|garajes&filtro=documentos|sin-conductor|incompletos`); `?conductor=<id>`
> sigue abriendo esa ficha. Barra común con Activos | De baja | Todos (Vigentes en garajes) **que
> arranca en Activos**. Distintivos de `Insignia` (nueva variante `error`): documentos, «⚠ Sin
> conductor habitual», «⚠ Sin vehículo», «⚠ Sin contrato», «⚠ Sin zonal: no se sugerirá»; patrón en
> fichas de la paleta de «Turnos del mes» (`utils/paletaTurnos.util.ts`). Acciones con `AccionesFila`
> (Editar + ⋮ con Dar de baja / Reactivar). Alta y edición en `DrawerVehiculo`, `DrawerConductor` y
> `DrawerGaraje` (`ancho="md"` (conductor `lg`) desde el cajón estándar, pie con estado, errores tras intentar guardar, repetidos de
> placa —sin guion—, cédula y nombre en vivo, descarte del cajón estándar); el patrón se arma con
> `ConstructorPatron`. La placa AAA-999/AAA-9999 se exige solo al crear o cambiarla (D4). La baja
> pregunta antes `impacto-baja`: con transporte asignado desde hoy no se ofrece (el servidor daría 409
> `RECURSO_CON_ASIGNACION`), y la de un vehículo nombra a quienes quedan sin él (D3). Garajes: sin
> combo de zonal ni alta en línea, y una sola baja (D2: «vigente» = activo y autorizado). La ficha que
> abre «Planificar el día» es el mismo `DrawerConductor` con `senalarFaltantes` desde el 2026-10-15 (D6).
> Se retiraron `ModalVehiculo`, `PanelUbicaciones`, `esquemaConductor` y `esquemaVehiculo`. Contrato:
> `transporte-backend/docs/CONTRATO-flota-y-garajes.md`.
> **Ajustes del 2026-10-15:** placa NORMALIZADA (`normalizarPlaca`, espejo del servidor: `PMA3370`,
> `pma-3370` y `PMA 3370` son `PMA-3370`) al guardar, buscar, comparar y mostrar; tope de kilometraje
> `DAF_KM_MAXIMO` (`resumen.kmMaximo`) solo al crear o al cambiarlo; «Documentos por vencer» dice
> «N sin fechas registradas» (`resumen.vehiculos.sinFechas`, borde ámbar suave si es lo único) y abre
> `?filtro=alertas-documentos` (vencidos + por vencer + sin fechas; distintivo `avisoSuave`); bajo la
> placa solo la descripción real (`descripcionVisible`: nada si repite el tipo); nombre de garaje tal
> cual se escribe; pie gris / rojo / verde; segmentado como grupo con borde. **Paginado en el
> navegador** con `Paginacion numerada ocultarSiUnaPagina` (10/25/50, `?page=&size=`, cada pestaña
> recuerda su página, vuelve a la 1 al filtrar, va a la página de la fila guardada y retrocede si una
> baja vacía la página). El menú ya no le pone `?fecha=` (`sinFechaDaf`) y la página la quita si llega.
> **Ajustes finales del 2026-10-15:** acciones como botones visibles (`AccionesFila modo="botones"`: Editar · Dar de baja en rojo · Reactivar en verde) bajo el encabezado «Acciones»; Conductores con columna «Identificación» (cédula) y «Teléfono», y solo «Licencia X» bajo el nombre; paginador numerado a 32 px / 13 px; documentos `INCOMPLETO` («Falta SOAT», «Falta matrícula») y «Sin fechas» en ámbar suave (`avisoSuave` = `badge-soft badge-warning`), rojo solo lo vencido, y la tarjeta dice «N con fechas faltantes»; kilometraje inusual (`kmSospechoso`: sobre el tope o desde 500.000) con «Revisar».
> **Ausencias de los conductores (2026-10-16, plan «ausencias-conductores-flota»).** Permiso `flota:ausencias` (DAF, Administrador DAF y Administrador). En la pestaña Conductores, «📅 Ausencias» en la fila (`AccionesFila` `propia`, apagada para un conductor de baja) abre `flota/AusenciasConductor.tsx`, que es el MISMO cajón de Personal: `ausencias/PanelAusenciasBase.tsx` (desde esta fecha `personal/PanelAusencias.tsx` es su envoltorio, sin cambio de comportamiento). Mismas situaciones y reglas (409 `AUSENCIA_SOLAPADA` / `AUSENCIA_PASADA`, en el cajón). Al registrar, los tramos que el conductor YA tiene en el rango (`tramosAfectados`) se avisan en ámbar: la ausencia no los retira; se reasignan en «Planificar el día». La columna «Estado» suma «Ausente dd/mm–dd/mm» (en curso) o «Ausencia dd/mm–dd/mm» (próxima), de UNA consulta (`hooks/useAusenciasDeLaFlota.ts`, `GET /administracion/conductores/ausencias`, sin motivo). El cajón de ausencias y el de edición nunca están abiertos a la vez. Contrato: `transporte-backend/docs/CONTRATO-ausencias-conductor.md`.

> **«Formularios del cuadro» (rediseño del 2026-10-13).** Tabla propia (`TablaFormularios`) con
> buscador, Vigentes | Inactivos | Todos (arranca en Vigentes) y distintivos de `Insignia`; alta y
> edición en `DrawerFormulario` (`ancho="lg"`, cinco secciones sin número). Número y código fijos al
> editar; repetidos de número, código y prefijo en vivo; color repetido solo avisa; áreas en solo
> lectura con enlace a Catálogos; política de vehículo en tres opciones (REQUERIDO y OBLIGATORIO se
> leen «Siempre requiere vehículo» y no se reescriben si no se tocan). Reglas puras en
> `utils/formularioAdmin.util.ts`. Contrato: `transporte-backend/docs/CONTRATO-formularios-rediseno.md`.

> **QUIÉN ABRE CADA PANTALLA SE DECIDE POR PERMISO, no por rol (RBAC, 2026-09-16).** La
> columna «Perfiles» describe los roles que HOY tienen el permiso de cada pantalla, pero el
> gate es el permiso (`routes.tsx` → `permisos`, `navigation.ts` → `requiredPermissions`). Ver
> la regla 4 de §6. Cambiar quién entra es marcar una casilla en «Permisos por rol», no editar
> estas listas.

> **`user.rolCode` pasó a `user.rolCodes`, en plural, el 2026-08-19.** Una persona puede
> tener varios roles y ve la unión de lo que cada uno abre. Desde el RBAC (2026-09-16) la
> intersección se comprueba sobre **`user.permisos`**, no sobre los roles.

**Las nueve están construidas desde M-29.** Se declaran en `config/routes.tsx`, en el mapa
`CONSTRUIDAS`, tipado como `Record<Ruta, ReactNode>`: si agregas una ruta a `pantallas` sin su
pantalla, TypeScript lo dirá. Cada una va en su propio fragmento diferido.

---

## 6. Reglas invariables de interfaz

> **El estándar visual es el de `instruccion-frontend` (2026-09-14).** Ambos son proyectos de la
> AMC sobre el mismo sistema de diseño (misma paleta daisyUI, mismas familias de clases `app-*`,
> mismo armazón). El diseño de este módulo se alineó con el de `instruccion-frontend`: esquinas
> `rounded-3xl`, contenedor de página a **80rem**, tablas con `table-zebra` y paso del cursor
> `hover:bg-primary/5`, y botones de color **planos** (sin sombra propia). Lo que este módulo
> **conserva por encima de instruccion**, porque es marca oficial o calidad, no se pierde:
> **Montserrat** local (skill `diseno-sigoc`, *Nueva Imagen 2025*), la capa de acabado
> `refinamiento.css`/`avisos-y-distintivos.css`, y los mensajes `MensajeModal` (theme-aware; `MarcoModal` se retiró el 2026-10-16). El
> detalle vive en `docs/FASE5-diseno-interfaz.md` §2.2, que sigue siendo la fuente de verdad.

1. **No se introducen clases CSS nuevas.** El inventario permitido está en
   `docs/FASE5-diseno-interfaz.md` §2.2. Si una composición parece requerirlo, avisa.

   > **Texto y contraste (2026-10-08): `docs/estilos.md`.** Cuatro utilidades —`text-app-strong`,
   > `text-app-label`, `text-app-muted`, `text-app-disabled`— y ningún gris suelto: el lint marca
   > `text-base-content/NN`, `opacity-NN` sobre texto y `text-gray-*`/`text-slate-*` como error.
2. **No se alteran los colores del tema** de daisyUI en `src/index.css`.
3. **Los colores de banner los entrega el backend.** El frontend no los define ni los interpreta.
   Única excepción, y es de legibilidad: el **color del texto sobre el banner** se elige entre blanco
   y negro por luminancia (`banner.util.ts`), porque `colorAcento` sigue llevando relleno (PV-25).
4. **Las pantallas se montan según el PERMISO** (RBAC, 2026-09-16), no se ocultan controles. Un
   perfil no autorizado no tiene el componente en memoria.

   > Antes se gateaba por rol quemado (`rolUser`, `allowedRoles`, `roles`). Ahora la sesión trae
   > `user.permisos: string[]` (de `GET /auth/session`) y se gatea por permiso atómico
   > (`modulo:accion`): `RutaProtegida` recibe `permisosPermitidos`, `routes.tsx` declara
   > `permisos` por pantalla, `navigation.ts` declara `requiredPermissions`, y el filtro del menú
   > (`MenuDropdownParts`) y `InicioSegunRol` comparan contra `user.permisos`. Basta tener UNO
   > (intersección). El hook `usePermiso('...')` / `tienePermiso` decide dentro de una pantalla
   > (p. ej. `AdminVentanasPage` muestra «Ventanas de carga» solo con `ventanas:administrar`).
   >
   > **El servidor sigue siendo la autoridad** (`PermisosGuard`): esto solo evita ofrecer lo que
   > daría 403. **Ruta y menú deben declarar los MISMOS permisos** —`rolesDeAdministracion.spec`
   > lo fija—, o quien ve la entrada y la abre rebota. Los **nombres** de rol siguen viniendo del
   > servidor (`useCatalogoRoles` → `GET /administracion/roles`).
   >
   > **Sigue por rol, a propósito** (es lógica de dominio, no de acceso): la ventana de carga
   > (`useVentanaCarga`, `ROLES_DE_CARGA`/`ROLES_DE_TRANSPORTE`), el aviso de personal pendiente y
   > el acceso a operativo por fila (`accesoOperativo.util`, contra `creado_por_rol`).
   >
   > **La matriz rol↔permiso se administra en «Permisos por rol»** (`administracion/permisos`,
   > `AdminPermisosPage`, permiso `permisos:administrar`): marcar/desmarcar y guardar cambia el
   > acceso sin desplegar. Las pruebas de gating derivan los permisos de los roles con
   > `pruebas/permisos.ts` (espejo de la semilla del servidor).
5. **Los campos calculados no son campos.** Número de semana, identificador y fecha se muestran
   como `badge badge-ghost badge-sm`, nunca como `input` deshabilitado.
6. **Ninguna información depende solo del color.** En un sistema llamado *cuadro de colores*
   esto exige atención deliberada: toda señal cromática lleva equivalente textual.
7. **Los mensajes de error del servidor se muestran tal cual.** Están redactados para el
   funcionario; no los reescribas ni los reemplaces por textos genéricos. **Desde el 2026-10-16
   pasan por `traductorErrores`** (regla 19), que CONSERVA ese texto como mensaje y solo le pone
   un título; los textos técnicos (estado HTTP, código, seguimiento, el `message` de axios o de
   pdf.js) van al detalle colapsable, nunca como mensaje principal. Lo único que se sustituye es lo
   que el servidor no redactó para nadie: un 500 sin código de negocio, un tiempo agotado, sin red.
8. **Peticiones solo por `httpClient`.**

    Y una consecuencia nueva desde el 2026-08-19: **el nginx de la imagen sirve una
    Content-Security-Policy estricta**, con `script-src 'self'` y `connect-src 'self'`.

    - **No agregues recursos externos** —ni una fuente de Google, ni un script de CDN, ni una
      imagen remota— sin declararlos en `nginx.conf`. Si no, el navegador los descarta **sin
      error visible en la interfaz**: el aviso sale en la consola. Hoy todo es local, incluida
      Montserrat.
    - **No llames a otro origen desde el navegador.** En Docker la API va por el proxy del
      mismo origen; `connect-src 'self'` lo respalda. Esto es deliberado: aunque alguien
      lograra ejecutar código, no podría enviar los datos del cuadro fuera.
    - `dangerouslySetInnerHTML`, `innerHTML` y `eval` **no aparecen en este proyecto**, y la
      CSP es la red por si un día aparecen. Los mensajes del servidor se muestran tal cual
      (regla 7) y es seguro **porque React escapa**, no por casualidad.
9. **La DAF escribe exactamente dos campos** de un operativo: conductor y placa (RN-40). Desde el
   2026-10-08 P-03 ya no tiene un formulario del operativo: asigna por TRAMOS (`POST
   /transporte/tramos/asignar`, conductor y vehículo) desde el cajón de candidatos, y no hay ningún
   control para el resto de campos. La garantía de los dos campos vive en el servidor
   (`ActualizarTransporteDto`, regla 3 de su `CLAUDE.md`), y en el frontend la vigila la prueba
   «RN-40 · la DAF solo escribe conductor y placa» de `planificar/planificarDia.spec.tsx`: el
   cajón no tiene ningún control de captura y el envío solo lleva identificación + conductor y
   vehículo. Si agregas un campo, caerá, y debe.
10. **La orden de servicio tiene cuatro campos** (INV-24, RN-50): horario, funcionario, conductor y
    placa. Se pintan en un solo componente, `components/ordenes/CamposDeLaOrden.tsx`, para que haya
    un único sitio que vigilar. No le agregues ninguno: se decide con el Product Owner y se amplía
    primero en el servidor, que es donde el dato se construye y se guarda.
11. **El operativo adicional es la única escritura que ignora la ventana de carga.** Desde el
    2026-08-20. Se dispone por urgencia el mismo día en que se ejecuta, cuando la carga del
    departamento ya cerró, y por eso en P-02 el botón «Adicional» sigue habilitado con la ventana
    cerrada mientras «Editar» y «Retirar» no. Son **dos varas distintas** —`bloqueado` frente a
    `bloqueadoParaAdicional`— y unificarlas no rompería nada visible: cerraría una puerta que el
    negocio pidió abrir. La excepción es **solo horaria**: el cuadro cerrado sí lo bloquea, un
    adicional no engendra adicionales, y el servidor deja constancia en la auditoría de si la
    ventana estaba abierta. Ver RN-61 a RN-64.

    > **Y solo lo admite el formulario que tiene prefijo para ellos.** RN-61, precisado el
    > 2026-08-24: eran **dos** —`OCAPMO` del **2 · PMO** y, **desde el 2026-09-08**, el
    > **8 · INSPECCIONES** con `IGA`/`ITA`—. En el 8 el prefijo (ordinario `IG`/`IT`,
    > adicional `IGA`/`ITA`) lo decide el **área del personal**: General → `IG`/`IGA`,
    > Técnico → `IT`/`ITA`. Las «A» de `ICA` y `OCA` —DMIT— siguen **ordinarias**, y
    > confundirlas es fácil. El servidor siempre lo hizo cumplir; P-05 y P-02 ofrecían el
    > botón en los nueve y fallaban en los que no lo admiten. Viaja como `admiteAdicionales`
    > en **dos** contratos —el de operativo y el de sección de matriz—, porque las dos
    > pantallas leen de sitios distintos. **Es un `UPDATE` sobre `t_formulario_prefijo`, no
    > un despliegue.**

    > Y no se confunda con `OPCION_ADICIONALES` de `valoresOperativo.util.ts`, que es otra cosa por
    > completo: la captura libre de un punto o un tipo de control (RN-20).

    > **Y se captura en UN SOLO CAJÓN, en las dos pantallas que lo ofrecen (2026-10-08).**
    > `components/cuadro/DrawerOperativo.tsx` en modo `"adicional"` —`DrawerLateral` con `ancho="lg"`— lo
    > usan Órdenes de servicio (que antes lo insertaba encima de la tabla y la empujaba) y Mis
    > operativos. Cuerpo por secciones (Personal y horario · Lugar · Control · Transporte y
    > observaciones, las cuatro tarjetas de `FormOperativo` en `modo="adicional"`), pie fijo con «N de M efectivos ·
    > faltan: …», «Registrar adicional» con `aria-disabled` (se ve apagado, pero al pulsarlo lleva
    > al primer error) y confirmación «¿Descartar cambios?» del cajón estándar si hay cambios. Al
    > registrar: aviso breve, recarga y fila resaltada. El botón de la fila es «+ Adicional»; en
    > Órdenes va en la columna Acción, junto a «Ver órdenes».

12. **Las fechas de calendario viajan como texto `AAAA-MM-DD`.** Las columnas `@db.Date` no tienen
    hora ni huso; convertirlas a `Date` en Quito —UTC−5— las desplaza un día. Compara cadenas: en
    ese formato el orden alfabético es el cronológico. `DateInput` de `FormikField` **sí** convierte
    a `Date`, así que no lo uses para ellas.

13. **Los iconos entran por un solo sitio y son de un solo estilo.** Añadida el 2026-08-24. El
    estilo de marca lo fija la skill `diseno-sigoc` —manual *Nueva Imagen 2025*—, que pide
    minimalismo, cajas rectas y **ningún hexadecimal escrito a mano**. Un icono es un elemento
    más: entra si dice algo.

    | Regla | Qué significa |
    |---|---|
    | **Un único importador** | `components/common/Iconos.tsx` es el **único** archivo que importa de `@fortawesome/*`. Ningún otro, nunca |
    | **Un solo juego: `free-solid`** | Un trazo y un peso. `free-brands` y `free-regular` están declarados en `package.json` y **no se importan en ninguna parte** |
    | **El nombre es un tipo, no una cadena** | El mapa se declara `Record<NombreIcono, IconDefinition>` y el componente recibe `NombreIcono`. Una errata la dice el compilador, no la pantalla |
    | **El icono acompaña, nunca sustituye** | Regla 6. Todo icono va con su texto, o con el nombre accesible del control que lo contiene |
    | **No le pases `aria-label`** | FontAwesome pone `aria-hidden="true"` y `role="img"` por su cuenta. Pasar `aria-label` lo vuelve **anunciable** y el lector de pantalla repite lo que ya dijo el botón |
    | **Sin color ni tamaño propios** | Hereda `currentColor` y el tamaño del texto. Nada de `size="2x"` ni `text-primary` sobre el icono: el color lo pone el control, desde las variables del tema |
    | **Un icono repetido no informa** | Si la misma figura sirve para doce entradas distintas, no está diciendo nada. O cada una lleva la suya, o no lleva ninguna |
    | **Nombres del Cuadro de Colores** | `retirar`, `adicional`, `matriz`. No `expediente`, `dictamen` ni `providencia`: eso es Instrucción, y el aviso de la cabecera de este archivo también alcanza al mapa de iconos |

    > **Cumplido el 2026-09-03.** Hasta esa fecha el código no cumplía y había dos defectos
    > visibles: `iconoMap` **no tenía `temaClaro` ni `temaOscuro`**, de modo que el interruptor
    > de tema del panel de perfil **pintaba signos de interrogación**; y **dieciséis de las
    > dieciocho** entradas del menú compartían `documentacion` (`faFolderOpen`). De los 29
    > nombres del mapa, **22 eran residuo de Instrucción**.
    >
    > Ahora el mapa declara **26 nombres y el proyecto usa 26**: dieciocho de navegación, una
    > por entrada y todas distintas; tres de acción; dos de tema; dos del armazón; y el
    > respaldo. `nombre` es `NombreIcono` —derivado de las claves del propio mapa— y
    > `navigation.ts` declara su `icon` con ese mismo tipo, así que **la errata la dice el
    > compilador**. Lo que el tipo no puede decir —que dos entradas repitan figura— lo fija
    > `iconos.spec.tsx`, que recorre la navegación de verdad.
    >
    > **Un nombre que llega del servidor se comprobaba con `esNombreIcono`**, retirado el
    > 2026-10-15 junto con la tabla genérica (`components/tabla/`), su único usuario: hoy ningún
    > icono llega del servidor. Si vuelve a hacer falta, se comprueba con un guardián de tipo, no
    > con `as`, y lo que no está en el mapa cae en el respaldo.

14. **El registro de operativo se percibe corto, o no se usa.** Añadida el 2026-08-26, del
    rediseño de P-01. La meta declarada es registrar un operativo en dos o tres minutos, y quien lo
    hace es un operador de central **decenas de veces al día**: se optimiza para repetición y
    teclado, no para primera visita. Hoy la pantalla obliga a desplazarse hasta el botón porque el
    formulario convive con la fecha de la jornada, dos avisos y la tabla de la sesión.

    | Regla | Qué significa |
    |---|---|
    | **Tres grupos, no una sábana** | Los campos van agrupados y rotulados con `app-section-heading`: `01 · DATOS DEL OPERATIVO`, `02 · PERSONAL ASIGNADO`, `03 · COORDINACIÓN`. Son subtítulos: **no** abren un `<h1>` nuevo |
    | **La etiqueta del formulario se acorta, el número no** | El nombre completo va en `title`; la etiqueta visible se recorta. Las nueve etiquetas largas empujan el ancho y en tablet parten los tabs en dos filas. El número **siempre** se pinta: es el equivalente textual del banner (regla 6) |
    | **Un selector de formulario, no una rejilla (2026-10-16, R10)** | `SelectorFormulario` vive en la barra azul «FORMULARIO», con la fecha de la jornada a la derecha: caja blanca con punto de color, «N. NOMBRE», «N hoy» (`GET /operativos/conteo?fecha=`, `OperativoService.conteo`) y ▾. Al abrir: buscador por número, nombre o código sin tildes (`combobox` sobre un `listbox`, ↓/↑/Enter/Escape), grupos por departamento dueño («DMIP · Unidad de Operativos», «DMIP · Inspecciones Técnicas y Generales», «DMIT · Instrucción»), «N hoy» y ✓; «Sin formularios con ese texto.». Solo `ESCRITURA` y `COMPARTIDO` (con «Aporta personal»; sin `onAportar`, apagado). **RECIENTES** al lado: los tres últimos usados sin el actual («N · CÓDIGO»), en `localStorage` por usuario y SOLO con ids (única excepción a «nada en disco»: no son datos personales). Debajo de la barra, una **línea de ayuda** con lo que declara el formulario (condicionante nocturno, vehículo siempre requerido, transporte sugerido; `lineaDeAyuda`). Reglas puras en `utils/selectorFormulario.util.ts`. Cambiar de formulario (lista o recientes) **no pregunta ni descarta**: aparta la captura bajo su formulario (regla 15) |
    | **Para elegir personal se usa `SelectorTokens`** | No se escribe otro selector. Es el caso que lo originó: se asignan **más de 30** efectivos y con lista plana no hay señal de lo ya elegido. Buscador por **apellido, unidad o cargo** —no solo apellido—, filtros por área con su conteo y, desde el 2026-10-01, candidatos en una **grilla de 2 columnas (2×3, 6/pág)** con TARJETAS donde **solo el botón «+ Agregar» es clicable** (no la tarjeta), orden sugeridos→menor carga→alfabético, pestañas de unidad solo si hay más de una, y el botón de lista «**Completar con N de menor carga**» (se retiró «Asignar visibles» y la pista «↵ asigna el primer elegible»; el modo de tarjeta-botón clicable completo solo lo conserva P-13, que usa `SelectorPersonal` directo). **Desde el 2026-10-16 (bloque 3 del rediseño del registro)** la tarjeta «Personal y horario» —alta, edición y adicional— es: cabecera con «Ver reparto de carga» en la línea del título (lo pinta `FormOperativo` en el `accion` de `SeccionDrawer`; el selector lo recibe con `verReparto`/`onCambiarVerReparto`), «N de M efectivos» (ámbar sin nadie, verde con gente, rojo con «· agregue al menos una persona» tras intentar; icono + texto) y «Horario por defecto: …» —el de la primera persona, `turnoDePrimera`: el formulario no declara uno—; franja **SELECCIONADOS** punteada con cada persona, su horario en línea y su «✕» (el motivo de un horario mal escrito, «Termina al día siguiente» si cruza la medianoche y el rechazo del servidor para esa persona —`detalles.funcionarioId`, `funcionarioDelRechazo`— van debajo de ella; vale en el alta y en los cajones de edición y adicional de P-01 y P-02, que reciben `idPersonaRechazada`); «Completar con N de menor carga» con **N = hasta 4** (`cuantosCompletar`); DISPONIBLES solo con quien puede salir, **8 por página** (4×2), tarjeta con el nombre en una línea (`truncate` + `title`) y «Cargo · N op. esta semana»; y «▸ No disponibles (N)» plegado al final, con el motivo en ámbar y «+ Agregar» apagado con el motivo. «Cupo completo» solo con un cupo real (`cupo`): hoy ningún operativo declara un número exigido de efectivos, así que M son los candidatos. Se retiró el «Cambiar turno» de la lista compacta |
    | **La bandeja de asignados tiene alto acotado** | Con desplazamiento propio. Treinta asignados no estiran la página; ese estiramiento es el defecto que se está corrigiendo |
    | **El horario del operativo desapareció; se captura POR PERSONA, con los campos de hora inline** | Desde el 2026-09-08 (RN-66). **El operativo ya no tiene campo de horario en el registro**: cada persona lleva el suyo. **Desde el 2026-10-01 el bloque de personal del ALTA comparte la presentación del cajón de P-02**: AGREGADOS en una columna y DISPONIBLES en una **grilla de 2 columnas (2×3, 6/pág)** con tarjetas (solo el botón «+ Agregar» clicable), filtros en pestañas (`role="tablist"`, solo con más de una unidad), botón «Completar con N de menor carga», contador único y nota de borrador; se retiraron «Asignar visibles» y «↵ asigna el primer elegible», **PERO el horario sigue capturándose POR PERSONA con los dos campos de hora SIEMPRE VISIBLES inline** (regla 14, no detrás de «Cambiar turno»): lo gobierna `horarioInline` de `SelectorPersonal` (`FormOperativo` lo pone en sus tres modos). Cada asignado lleva dos **campos de hora ESCRIBIBLES** —inicio y fin— (`input input-bordered input-sm` + un `<datalist>` compartido con las horas 00:00–23:30 de `horasSeleccionables()`, desde el 2026-09-21): se teclea la hora («14» sugiere 14:00/14:30) o se elige de la lista, y es **OBLIGATORIO**: el vacío es el `placeholder` («Inicio…»/«Fin…»), no «heredar». El `:00/:30` lo garantiza la lista y lo revalida el servidor (RN-07). `FormOperativo.validate` rechaza el envío mientras alguna persona no tenga las dos horas. **Default-from-first**: al agregar a alguien su turno arranca copiando el de la **primera** persona asignada (`turnoDePrimera`), editable; la primera arranca vacía y hay que llenarla. Viaja en `CrearOperativo.personal` (`{ funcionarioId, horaInicio, horaFin }`); **no** se envía `horaInicio/horaFin` del operativo. El **servidor deriva la ventana del operativo** de las personas (`RangoHorario.envolvente`) y lo hace nocturno si **alguna** persona lo es; devuelve la ventana **efectiva** en `PersonaAsignada`. La lista de elegibles se pide **sin horario** (área+ausencia); el cruce lo valida el servidor por persona. El **adicional funciona igual** (por persona): hereda a su equipo en cuanto llegan los elegibles —sin horario, se dispara solo—, y a cada heredado se le fija su horario abajo. La **edición SÍ ofrece horario por persona desde el 2026-09-09**: la bandeja de corrección muestra los mismos dos campos de hora escribibles por persona (con su turno ya lleno) y cambiarlo es un `PATCH /operativos/:id/personal/:funcionarioId` **inmediato** —como asignar o retirar en edición—; el servidor **re-deriva la ventana del operativo** (envolvente) de los turnos y revalida el descanso/cruce de esa persona. `FormOperativo` ya no tiene un «modo clásico» de horario único |
    | **Quien no puede ser convocado se muestra, no se oculta** | Deshabilitado y **con su motivo en palabras** —sin ficha, ausencia, tope de salidas pesadas (RN-25), descanso tras patrulla (RN-24)—. Ocultarlo produce la misma sorpresa que `ficha: null` produjo en P-07 |
    | **Los campos calculados van como distintivo** | `badge badge-ghost badge-sm`, nunca un `input` deshabilitado (regla 5): la semana, el identificador y la fecha (`CamposCalculados`). Desde RN-66 el operativo **ya no tiene horario propio**, así que **no hay distintivo de duración ni de cruce de medianoche** en su formulario; el horario y su cruce viven por persona |
    | **El estado del envío se lee sin color** | **Desde el 2026-10-16 (R7) el pie del alta es `BarraPie`**, al final del bloque, con [Limpiar] y [Registrar operativo]; **en la página va en su tono CLARO** (ajustes visuales del mismo día: blanco, `border-t border-base-200`, sin borde blanco en los botones; el cajón sigue azul). Nombra lo que falta DESDE QUE SE ABRE, en gris —«Falta: personal, zonal, punto de encuentro, institución, tipo de control»—; tras intentar registrar, lo mismo en rojo (`--app-msg-error-fg`), con el campo inválido con borde rojo (y la tarjeta del personal en `border-error` si es lo que falta); completo, «Listo para registrar · N efectivos · <transporte>» en verde (`--app-msg-exito-fg`). Siempre en `role="status"`. «Limpiar» con algo capturado pregunta «¿Limpiar el formulario?» (`MensajeModal` peligro). La lista sale de `utils/politicasOperativo.util.ts` (`nombresQueFaltan`, `estadoPieAlta`), la misma que usa el pie del cajón |
    | **«Cantidad de operativos» genera N operativos por persona, con la misma hora general** | Desde el 2026-09-09. En el ALTA, cada persona lleva un contador «Cantidad de operativos» (columna en el bloque de Personal, con el stepper `[− n +]`; por defecto 1, máx. 50): el servidor crea N operativos independientes por persona, **todos con SU MISMA hora general**. **Desde el 2026-09-14 el horario ya NO se segmenta en tramos** —el negocio pidió una sola hora ini/fin para los N—. Lo enciende el flag **`cantidadPorPersona`** del catálogo (hoy solo el 8), que es **distinto de `variosPorPersona`** (el *split* por persona —un operativo por persona— que también tiene el 5, para que cada área lleve su código, pero SIN ofrecer cantidad). Viaja en `CrearOperativo.personal[].cantidad` (solo si >1) y con N>1 la página **relee** el listado. No se ofrece en edición ni en el adicional. El servidor compone los operativos (`componerOperativosDelRegistro`): el navegador no es el control |
    | **Los N operativos idénticos del 8 se AGRUPAN en las listas** | Desde el 2026-09-14. En las cuatro tablas —registro (P-01), mis operativos (P-02), matriz (P-04) y jornada (P-13)— las copias del 8 (operativos consecutivos de UNA persona, idénticos salvo el identificador) se pintan como **un bloque**: el **identificador** —y, donde existe, la **acción** (editar/retirar)— baja a la fila de cada operativo, y **todo lo demás se fusiona** en una celda que abarca el grupo (`rowSpan`), con el personal mostrando **«Nombre (n)»**. Lo decide `agrupacionForm8.util.ts` (`agruparConsecutivos`) comparando TODOS los campos que se fusionan, así la celda combinada nunca miente; **no cablea ningún número de formulario** —solo el 8 produce copias idénticas de una persona—. Si dos difieren en algo (otro conductor, otro punto), quedan en grupos distintos. Además, la celda fusionada va **centrada** (`align-middle text-center`), como una celda combinada de Excel; el identificador y la acción, por fila, siguen arriba a la izquierda |
    | **En el form 8, al EDITAR no se toca el personal** | Desde el 2026-09-14. Los N operativos del 8 tienen su identificador **ya generado** (uno por operativo, no modificable), así que corregir uno solo cambia **zonal, punto de encuentro, instituciones y tipo de control**; agregar/retirar/editar personal (y su horario y cantidad) queda **bloqueado**. Lo enciende `personalBloqueado` de `FormOperativo` —deshabilita solo el bloque de personal, no el resto—, que la página activa cuando `enEdicion` y el formulario tiene `cantidadPorPersona` (hoy solo el 8). Es UI: el servidor no lo fuerza |
    | **Las observaciones son NOTAS independientes, no un campo de texto** | **Desde el 2026-10-16 una sola pieza, `ObservacionesOperativo`, en el alta y en el cajón** (sustituye a `CapturadorNotas` y al `textarea` simple que el alta tuvo unas horas, R8): se teclea una nota y se **Agrega** (botón o Enter), y cada nota de la sesión —aún no guardada— muestra «Autor · dd/mm/aaaa HHhMM» (Quito) y se **corrige en línea** («Editar»: Enter guarda, Mayús+Enter salta de línea, Escape cancela, una a la vez, vacía no se guarda; no se marca «editada» porque aún no se guardó) o se **quita** (✕). Lo escrito sin «Agregar» (`notaPendiente`, viaja en el borrador con `observacionesHoras`, ninguno se envía) **se suma solo al registrar o guardar** (`conNotaPendiente`, `utils/notasOperativo.util.ts`) y el aviso de éxito lo dice («Se agregó también la nota que estaba escrita.»; en el alta y en «Guardar cambios» de los cajones de P-01 y P-02; el adicional la suma igual pero su aviso no lo menciona). Es solo interfaz: lo que viaja no cambia. Desde el 2026-09-09 (bitácora append-only): al registrar viajan en `CrearOperativo.observaciones` (`string[]`). Cada nota se guarda como una fila propia (`t_operativo_observacion`) con su autor (rol) y fecha. En **corrección** las ya escritas se muestran en **solo lectura** (no se editan ni se borran) y solo se **agregan** nuevas, que viajan en `observacionesNuevas`. La **matriz** las pinta separadas, una por renglón. **En las tablas de P-01 y P-02 (2026-10-19)** la celda «Observaciones» es `NotasObservacion` (`common/`, desde el 2026-10-19 la MISMA pieza de la Jornada y la Matriz, plan «notas-jornada-matriz»): una tarjeta ámbar por nota (`app-nota`, «Autor · dd/mm HHhMM» de Quito debajo, fecha completa en el tooltip) y la solicitud de compartir como tarjeta azul aparte (`app-nota-compartida`, «↗ Comparte con <ID>»: si ese operativo está en la tabla lleva a su fila —a su página, centrada con `scrollIntoView` y con el destello `app-fila-destello` de 1,5 s, `useDestelloDeFila`—; si no, abre su detalle); de la más reciente a la más antigua, como mucho dos con «+ N notas más» / «Ver menos», y «—» sin notas. Vienen del campo `notas` del servidor (`CONTRATO-notas-operativo.md`); el filtro busca en todas, incluido el identificador compartido. **P-02 lleva la columna desde esa fecha.** **Jornada del Día y Matriz** (2026-10-19) pintan las mismas tarjetas con `fila.notas` (`NotasDeFila` + `ProveedorNotas`; sin `notas`, los textos de `observaciones`): la compartida lleva a la fila de X si está en la tabla y, si no, no se pulsa y dice «No está en esta vista» (esas pantallas no tienen cajón de detalle). En la Jornada, una compartida hacia un formulario que el rol no ve llega del servidor SIN identificador ni `operativoRelacionadoId` (RN-48) y no se pulsa. La fusión de las copias del 8 sigue comparando solo los textos (`observaciones`). Cada fila de las cuatro tablas lleva su ancla `data-operativo-id`. Columna de ~220 px (`app-columna-notas`). La columna **Formulario** de P-02 es compacta: punto de su color + «N · CÓDIGO», con el nombre en el tooltip, y se filtra por número, código o nombre. Solo clases del inventario (regla 1) |
    | **Compartir unidad: la sugerencia del grupo «Transporte» (2026-10-19)** | Con fecha, un punto del catálogo, una zonal, el horario del personal y un transporte DAF, `SugerenciaCompartirUnidad` pregunta (`useCoincidenciasTransporte`: 400 ms de espera, cancela la anterior, silenciosa si falla) `GET /operativos/coincidencias-transporte` con la ventana = envolvente del personal (`envolventeDeHorarios`, espejo del servidor). Solo devuelve operativos del PROPIO ámbito (RN-48), y del personal solo el nombre. Con coincidencia: `AvisoEnLinea` info «Se detectó la solicitud X (personal) registrada para el mismo punto y horario. ¿Desea solicitar esta movilización en la misma unidad?» y **UN solo check** «Solicitar compartir unidad con X» («Solicitar usar la misma unidad que X» si no viajan juntos; `rotuloCompartir`). Sin marcar, decide la DAF. Apagado y con el motivo ESCRITO si el servidor dice incompatible o si está marcado el macrooperativo («Un vehículo exclusivo no se comparte.»). **Desde el 2026-10-19 (a pedido del usuario) no hay «Propios medios», «Vehículo exclusivo» ni «Dejar que decida la DAF» en la sugerencia**: repetían «Transporte requerido» y el check del macrooperativo; y la justificación del exclusivo se retiró (opción A: el formulario ya no la pide ni la envía; la de un operativo que la trae de antes no se toca). No bloquea registrar. Si la coincidencia elegida desaparece, la solicitud se limpia y se dice. Viaja `compartirConOperativoId` (`camposCompartirParaEnvio`; al editar, solo si cambió); al editar, `avisos: ['COMPARTIR_RETIRADO']` sale como aviso breve de advertencia. La tabla de P-01/P-02 lleva la insignia «Comparte con X» o «Vehículo exclusivo» en la columna **Observaciones**, junto a las notas (no en Transporte; 2026-10-19, a pedido del usuario). Se llama «compartir unidad», nunca «adicional». No en el adicional ni en la corrección de una patrulla |
    | **Los errores aparecen al primer envío, no antes** | Y el foco va al primer campo inválido. Esquema en `config/validationSchemas.ts` |
    | **El personal asignado SÍ es obligatorio** | Desde el 2026-09-02, y es lo que `FASE5` §7 pedía desde el diseño: «al menos una persona · al enviar · `alert alert-error` sobre el bloque». Esta misma tabla afirmaba lo contrario, y lo construido seguía a la tabla, no al wireframe. **No se valida en Yup**: el personal no es un campo de Formik —vive en la página, y al editar en el propio operativo—, así que lo comprueba `validate` de `<Formik>`, que sí lo alcanza. En modo aporte no aplica: allí no hay botón de guardar |

    > **Un solo formulario: `FormOperativo` (2026-10-16, plan «registro-operativo-rediseno»).** `FormularioOperativo` y sus siete banderas (`enCajon`, `seccionado`, `selectoresFlotantes`, `horarioInline`, `ocultarAcciones`, `bandejaSinTope`…) pasaron a **una prop `modo`**: `"alta"` (P-01, con su pie), `"edicion"` y `"adicional"` (el cajón, que lleva el pie con `idForm` + `onEstadoEnvio`). En el cajón, cuatro tarjetas `SeccionDrawer` —Personal y horario · Lugar · Control · Transporte y observaciones—. **En la página (`variante="pagina"`, por omisión en el alta; ajustes visuales del 2026-10-16)** solo «Personal y horario» es tarjeta: la columna derecha va **sin recuadros ni títulos** —Zonales + Punto · Instituciones + Tipo de control · Transporte + macrooperativo · Observaciones—, cada grupo un `role="group"` con nombre y un filete `border-t border-base-200` (14 px arriba) entre ellos (`SeccionDrawer abierta separada`); a dos columnas desde `lg` (~55/45). Mismos campos y mismo orden en los dos: lo fija `formOperativo.spec.tsx`. El «otro tipo» va **dentro del combobox** de Tipo de control como ficha «OTRO ·» (uno solo: el servidor guarda un texto); `CampoOtroTipo` se retiró. Al quitar la zonal del punto elegido, el punto se limpia. El transporte sugerido va marcado «(sugerido)». **«Requiere vehículo exclusivo (macrooperativo)» solo se ofrece con «Completo» (2026-10-19, a pedido del negocio)**: en Solo dejar, Solo retirar, Dejar y retirar o Propios medios no se muestra y se desmarca al cambiar de tipo; se envía con `macroSegunTipo` (`utils/tipoTransporte.util.ts`, espejo del servidor, que lo guarda en `false` con cualquier otro tipo). Las reglas puras viven en `utils/politicasOperativo.util.ts`; el cruce de horario, el descanso y el cupo siguen siendo del servidor.

    > **Y el pie de acción fijo sigue siendo un punto abierto.** `sticky bottom-0` no está en el
    > inventario (`progress` sí, desde el 2026-10-08, solo para «Planificar el día») de `docs/FASE5-diseno-interfaz.md` §2.2, y la regla 1 no admite
    > excepciones por comodidad: **hasta que se amplíe el inventario, el pie va al final del panel**
    > y el avance se muestra solo con el distintivo. Ampliarlo se decide, no se supone.

    > **Reordenar el pie no unifica las dos varas.** `bloqueado` y `bloqueadoParaAdicional` siguen
    > separadas (regla 11): al mover los botones es tentador dejar una sola condición, y eso
    > cerraría la puerta que el negocio pidió abrir para `OCAPMO`.


    > **Y la EDICIÓN usa ese mismo cajón (2026-10-08).** `DrawerOperativo` tiene `modo`:
    > `"adicional"` (Órdenes, Mis operativos), `"editar"` (Mis operativos y Registro: título «Editar
    > operativo», «Guardar cambios», personal DIFERIDO) y `"personal"` (aporte y «Agregar Personal»
    > de la patrulla: cada persona al instante, sin botón de envío). Mismo ancho, secciones, pie con
    > su estado, confirmación de descarte («¿Descartar cambios?», regla 18), foco y error del servidor
    > sobre el pie. **Con la ventana o el cuadro cerrados, «Editar» ya no se apaga: abre en SOLO
    > LECTURA** (sin «Guardar cambios»); «Eliminar» sí se apaga. Si el operativo tiene transporte
    > asignado y el borrador cambia un turno o las zonales, avisa «Este cambio puede dejar el
    > transporte pendiente de reasignación por la DAF». Se retiraron `DrawerEdicionOperativo` y los
    > `DrawerLateral` sueltos de Registro. La Jornada del Día no edita el operativo (solo personal,
    > `PanelPersonalJornada`) y queda fuera. Las dos varas `bloqueado` / `bloqueadoParaAdicional`
    > siguen separadas.
15. **En P-01 «Editar» un operativo propio abre el CAJÓN LATERAL (como P-02), y la tabla trae la
    jornada entera.** Añadida el 2026-09-01 por la tarde; **cambiada el 2026-10-01**: hasta entonces
    «Editar» cargaba el operativo en el formulario de arriba (modo corrección inline). Ahora abre el
    MISMO cajón lateral de Mis operativos (`DrawerOperativo` en modo «editar» desde el 2026-10-08), con el personal
    DIFERIDO —se aplica al «Guardar cambios», no al instante—; el formulario de arriba se queda
    siempre en modo ALTA. La tabla era memoria de la sesión y nacía vacía; ahora trae la jornada del
    formulario desde el servidor.

    | Regla | Qué significa |
    |---|---|
    | **«Editar» un operativo propio abre el cajón lateral, no el formulario de arriba** | `DrawerOperativo` (modo «editar», que monta `PanelEdicionOperativo`) con `personalInmediato={false}`: el personal (alta/baja/turno) se acumula en `enEdicion` y se aplica al «Guardar cambios», en orden bajas→altas→turnos y luego los generales (`editar`). Un fallo por persona (descanso/cruce) detiene el guardado, lo avisa y NO toca los generales; lo ya aplicado queda guardado y el cajón sigue abierto. Es el mismo modelo que Mis operativos (P-02). **El APORTE** (operativo ajeno, DMIT) sigue en su cajón de solo-personal al instante, y la **PATRULLA** propia se corrige **inline** con el roster (su personal al instante): ninguno de los dos es diferido |
    | **El formulario de arriba es siempre el del alta** | Ya no cambia de modo al editar: sus propiedades se derivan de `editandoPatrulla` (la única edición que sigue inline), no de `enEdicion`. El personal del formulario sale siempre de `personalAgregado` (la captura en memoria); la edición propia tiene su propio personal en el cajón |
    | **Entrar a corregir no pierde la captura** | «LO CAPTURADO NUNCA SE PIERDE» de la cabecera del archivo. El borrador del alta se aparta al abrir la corrección —leyendo `refFormik`— y vuelve al cancelar **y** al guardar, por `enableReinitialize`; el formulario de arriba, al quedarse en alta, lo muestra de vuelta |
    | **`resetForm()` a secas está prohibido en esta pantalla** | Repone `initialValues`, que mientras hay borrador **es el borrador**: al registrar, el formulario se habría rellenado solo con lo que se acababa de enviar. Se le dice a qué se vuelve |
    | **La tabla se pide al servidor, por código** | `GET /operativos?formulario=<codigo>`, nunca filtrando en memoria contra el texto visible: ése es el defecto que dejó la patrulla 6 vacía en agosto, porque su código es `REACN` y su nombre «PATRULLA REACCIÓN NOCTURNA» |
    | **Y por eso no todas sus filas son editables** | El formulario 4 tiene dos departamentos que registran: quien mira verá filas ajenas, y `exigirPropiedad` las rechazaría con 403. Lo decide `accesoOperativo.util.ts`, la misma utilidad que P-02, que **no nombra ningún rol** |
    | **Quien no puede, lo ve apagado y con el motivo** | Regla 6, y el mensaje nombra al departamento al que hay que pedírselo. Ocultar la acción en una fila y no en la de al lado se lee como una avería |
    | **Salir a otra pantalla y volver tampoco pierde la captura** | Añadido el 2026-09-04. React Router **desmonta** P-01 al navegar —a la Jornada del día, por ejemplo—, así que el borrador que ya sobrevivía a «Editar» no sobrevivía a esto: al volver, el formulario nacía vacío. Se conserva en `sessionStorage`, **no `localStorage`**, y es decisión de seguridad: lleva datos personales del personal (RN-34), es por pestaña y se borra al cerrarla; `UserProvider` ya declara que aquí no se persiste nada sensible en disco. Vive en `utils/borradorOperativo.util.ts`, se guarda en cada cambio —`FormOperativo` lo avisa por `onValoresCambian`, y no por `refFormik`, que al desmontar queda a `null`—, y **se retira al cerrar sesión** (`limpiarTodosLosBorradores`, desde `UserProvider`) y **al registrar con éxito**. Solo en alta: una corrección no se persiste, su captura ya está a salvo en `borrador` |
    | **Cada formulario guarda SU captura, y el otro no la ve** | Añadido el 2026-09-10, a petición del negocio: «si cambio de formulario, el otro no debe ver lo que estoy editando». El borrador dejó de ser uno por usuario a ser uno por **(usuario, formulario, FECHA)** —clave `…v6.form.<usuario>.<fecha>.<codigo>` desde el 2026-09-21—; aparte va un **puntero de sesión** (`…v6.ptr.<usuario>`) con la fecha y el último formulario, para reabrir donde iba. Al cambiar de pestaña —o de **fecha de la jornada**— se guarda lo capturado bajo el (formulario, fecha) que se abandona y se carga —o se vacía— lo del que entra; `codigoActivoRef` **y `fechaActivaRef`** son el formulario y el día dueños de lo que hay en memoria y solo se mueven tras guardar, para que `persistirBorrador` nunca escriba bajo la clave equivocada durante el cambio. **Cambiar la fecha de la jornada YA NO borra** (2026-09-21): cada día conserva su captura bajo su clave (RN-66: cada captura queda con su día), así que volver a una fecha la restaura; solo se vacía el listado de operativos y se cierra la corrección abierta. Cambiar de formulario **cambia directo y no pierde nada**: volver al formulario devuelve su captura tal cual —personal con sus horarios, lugar, control, transporte, notas de la lista y lo escrito sin «Agregar»—. El rediseño del 2026-10-16 (R10) llegó a preguntar «¿Cambiar de formulario?» y descartar; **se revirtió el mismo día a pedido del usuario**. Solo «Limpiar» (que pregunta) y registrar con éxito vacían la captura, y solo la del formulario actual |

16. **Responsivo y móvil-first.** El sistema ya es móvil-first y su especificación es
    `docs/FASE5-diseno-interfaz.md §9`. Los puntos de corte son los del proyecto —`sm/md/lg/xl` de
    Tailwind, **sin agregar ninguno**—: estilos base para móvil y modificadores en orden
    ascendente, con las utilidades responsive **ya inventariadas** en §2.2 (`sm:flex-row`,
    `md:grid-cols-2`, `overflow-x-auto`…). Todo cambio va con clases del inventario (regla 1).

    | Regla | Qué significa |
    |---|---|
    | **Tablas: scroll, no tarjetas** | En móvil las tablas del cuadro conservan `overflow-x-auto` con la columna de identificador visible (§9.4). El **card-view fue rechazado por el PO** y no se introduce. La única pantalla concebida con tarjetas es P-06 |
    | **El armazón ya colapsa** | La barra lateral pasa a **cajón deslizante (drawer)** por debajo de `lg` y la topbar queda `sticky` (§9.2, `MainLayout` + `MenuDropdown`). No se reinventa el patrón |
    | **Área táctil por `<Boton>`, no a mano** | Ningún botón mide menos de 32 px: el mínimo lo dan `<Boton tamano="sm">` (regla 17) e `input-sm`/`select-sm` (§10.6); `btn-xs` no se usa. **Nada de `min-h-[44px]`** ni otros valores arbitrarios fuera del inventario |
    | **Nada de `w-screen`** | `100vw` incluye la barra de scroll y desborda en <375px: se usa `w-full` (con `relative` en el contenedor cuando hay que anclar un absoluto) |
    | **El teclado táctil lo fija el `type`** | En `FormikField`: correo → `EmailInput` (`type=email`), teléfono → `PhoneInput` (`type=tel`), fecha de calendario → **`DateTextInput`** (`type=date` que **conserva la cadena `AAAA-MM-DD`**, regla 12; distinto de `DateInput`, que convierte a `Date`). Pasar `tipo=`/`type=` a `TextInput` **no** surte efecto: se usa el componente dedicado |
    | **El error de Yup envuelve** | `.label` de daisyUI es `nowrap`; el pie de error de `FormikField` lleva `whitespace-normal` + `min-w-0` (§2.2) para que un mensaje largo no desborde un modal angosto |
    | **Los envíos muestran carga uniforme** | Un submit en proceso va `disabled` + `loading loading-spinner loading-sm` (con `aria-hidden`) **junto** al rótulo («Guardando…»/«Registrando…»), patrón de `FormOperativo`. El texto se conserva (regla 6) y el `<span>` vacío no cambia el nombre accesible, así que las pruebas por nombre siguen pasando |

    > **Lo que NO se hace sin decisión del PO (ampliar el inventario, regla 1):** card-view de
    > tablas, bottom-sheets, `min-h-[44px]`, nuevos breakpoints y los botones sólidos
    > `btn-error`/`btn-success` (el manual prohíbe rojo/complementarios como fondo completo,
    > regla 2). **Una sola excepción, decidida el 2026-10-15 (D1 del estándar de botones):** el
    > botón que confirma una acción IRREVERSIBLE va relleno en rojo. **Ampliada el 2026-10-16 (M2 de
    > los mensajes estándar):** TODA confirmación destructiva (`MensajeModal` variante `peligro`:
    > Eliminar, Desactivar, Dar de baja, Retirar, Quitar todos, Descartar) confirma en rojo relleno.
    > El borrado en una fila o un menú es `peligroTexto` (texto rojo y papelera).

17. **Un solo botón: `<Boton>` (`components/common/Boton.tsx`).** Añadida el 2026-10-15, del
    estándar único de botones. Las pantallas eligen VARIANTE y TAMAÑO; las clases de daisyUI se
    escriben solo dentro de `Boton`. No se estiliza un `<button>` a mano en las pantallas.
    **Un enlace que navega** («Ver la Jornada del Día», «Ir a Mis operativos») sigue siendo un
    `<Link>`, con el mismo aspecto, por `BotonEnlace` (`components/common/BotonEnlace.tsx`).

    | Variante | Aspecto | Para qué |
    |---|---|---|
    | `primario` | relleno azul de marca | la acción principal; **una por zona** (página, cajón o modal) |
    | `secundario` | blanco, borde neutro | Editar, Cancelar, Exportar, Corregir |
    | `acento` | borde y texto azul | crear o agregar DENTRO de una fila, tarjeta o sección (+ Adicional, + Punto) |
    | `peligro` | borde y texto rojo | sacar de uso, reversible (Desactivar, Dar de baja, Retirar) |
    | `exito` | borde y texto verde | volver a poner en uso (Activar, Reactivar) |
    | `peligroTexto` | sin borde, texto rojo, papelera | el borrado definitivo (mejor dentro del ⋮, siempre confirmado) |
    | `enlace` | texto azul | navegación o acciones menores (Limpiar filtros, Cambiar, Descartar) |
    | `peligroRelleno` | relleno rojo | la acción de toda confirmación destructiva en `MensajeModal` (M2, regla 16) |
    | `fantasma` | sin borde ni fondo | el aspa ✕ de la cabecera del cajón (blanca sobre el azul) |

    | Tamaño | Alto · texto | Dónde |
    |---|---|---|
    | `sm` | 32 px · 13 px | acciones de fila, paginador, dentro de tarjetas |
    | `md` | 36 px · 14 px | barras de herramientas, cabeceras, acciones de página |
    | `lg` | 40 px · 14 px | pie de cajones y modales |

    - **En cabeceras azules** (`enBarraOscura`): `secundario` (blanco) o `primario` con borde claro. Dentro de
      la cabecera y el pie del cajón no hace falta pedirlo: `BarraOscuraContexto` lo aplica solo.
    - **Apagado = `aria-disabled`, nunca `disabled`**, con `motivoDeshabilitado` en el `title`: daisyUI
      le quita el puntero a un `:disabled` y el motivo no se veía. Se ve en su variante al 50 %.
    - **Acciones de fila: `AccionesFila`** — [✎ Editar] → [acción propia] → [estado] → [⋮], como mucho
      tres visibles, columna «Acciones» a la derecha. Verbos: Desactivar/Activar (catálogos,
      formularios, personal, cuentas), Dar de baja/Reactivar (flota), Retirar (solo Roles de Auth).
    - **`modo="icono" | "texto"` (2026-10-19, plan «acciones-icono-notas»).** Las tablas DENSAS —más de
      ocho columnas— usan `icono`: botones cuadrados de 32 px (icono de 16 px, 4 px entre ellos, clase
      `app-acciones-icono`), sin texto visible, con `aria-label` = acción + registro («Eliminar
      OCPMO-001-20-OCT-2026») y el nombre —o el motivo si está apagado— en el **`<Tooltip>`**
      (`components/common/Tooltip.tsx`, el ÚNICO: arriba, 300 ms con el ratón, al instante con el foco,
      Escape lo cierra, cambia de lado si no cabe, `alinear="fin"` en el último botón, portal y
      `aria-describedby`; token `--app-tooltip-bg`). El resto de tablas, icono + texto (por omisión).
      La pieza reutilizable es `BotonIcono` de `AccionesFila.tsx`.
    - **Operativos (P-01 y P-02): `AccionesOperativo`, solo icono y sin «⋮» (2026-10-19).** Cuatro
      casilleros fijos: [✎ Editar · secundario] [+ Agregar adicional · acento] [👁 Ver detalle ·
      secundario] [🗑 Eliminar · peligro], columna `w-[9.5rem]`. Fila de CONSULTA (`consulta`: cuadro
      cerrado o ventana vencida): solo «Ver detalle» —y «Agregar adicional» si la ventana está vencida
      pero el cuadro abierto: RN-61 a RN-64, regla 11; NO se unifican `bloqueado` y
      `bloqueadoParaAdicional`—. Formulario sin adicionales: «Agregar adicional» apagado con su motivo.
      Fila de otro departamento: «Editar» apagado con el motivo; quien APORTA ve «Agregar personal»
      (personas). La patrulla lleva «Editar» solo en la cabeza. «Eliminar» confirma con `MensajeModal`
      peligro («Se quitará el operativo y su personal quedará libre. Esta acción no se puede deshacer.»)
      y avisa con `toast` (si el servidor lo retira por tener órdenes, lo dice).
    - **Pie de cajones: el de `DrawerLateral`** (cajón estándar, 2026-10-15; `PieDrawer` se retiró) — [Cancelar] secundario lg + acción primario lg, con
      los estados de la regla 18.
    - **Tablas que se paginan en el navegador: `usePaginaLocal`** (`hooks/usePaginaLocal.ts`) + `Paginacion`,
      de a 10: vuelve a la primera si cambian las filas y salta a la de la fila resaltada.
    - **«+ Nuevo X»** va a la derecha de la barra de su tabla (md); si la tabla no tiene barra —Roles de
      Auth, Cuentas—, en la cabecera azul como `primario enBarraOscura` sm.
    - **Administración migrada (2026-10-15)**: Personal (Editar · 📅 Ausencias · Desactivar/Activar, sin
      ⋮), Catálogos (Editar · Desactivar/Activar · ⋮ 🗑 Eliminar con motivo; «+ Nueva zonal», «+ Nuevo
      punto de encuentro», «+ Nuevo tipo de control», «+ Nueva institución»), Formularios (sin ⋮),
      Ventanas, Parámetros («Guardar» secundario apagado «Sin cambios» → primario con cambios,
      «Descartar» solo con cambios, fila resaltada y `useAvisoAlSalir` antes de salir), Roles («+ Nuevo
      rol», Retirar con confirmación de peligro reversible: el rol se reactiva), Cuentas («+ Nueva cuenta», ↺ Activar en la fila con
      `PUT {activo:true}`), Permisos («Sin cambios») y Carga inicial. `BotonEliminarCatalogo` se retiró.
    - **Aviso al salir: `useAvisoAlSalir`**: `beforeunload` y, como la app usa `<BrowserRouter>` (sin
      `useBlocker`), el clic en enlaces internos en fase de captura con `mensaje.confirmar` («¿Salir sin
      guardar?», desde el 2026-10-16; `window.confirm` lo prohíbe el lint). «Atrás» del navegador no
      queda cubierto.
    - **Paginador único: `Paginacion`** (numerado, 10/25/50). **Filtro de estado único:**
      `SelectorSegmentado` en el orden Activos | Inactivos (De baja, Vigentes) | Todos, arrancando en
      Activos.
    - **Transporte · DAF migrado (2026-10-15)**: Planificar el día (pie de cada paso «← Volver»
      secundario lg + «Continuar…» primario lg con su motivo; «Asignar automáticamente» primario md,
      único primario de su tarjeta; en el paso 1 «Confirmar» pasa a secundario; «Asignar conductor» y
      «Asignar» de los candidatos son `acento`; el candidato que no puede tomarlo ya no muestra «No
      disponible»: su «Asignar» queda apagado con el motivo; «Quitar activación» peligro; «Emitir todas»
      primario md con motivo), Turnos del mes (‹ › secundario sm, Exportar/Generar propuesta md con
      motivo, «Publicar mes» primario md, «Copiar mes anterior» secundario, barra de selección sm,
      «Quitar selección» y «Cambiar zona» enlace, modales lg), Mantenimiento (🔧 «Programar» acento +
      «Ver paradas» secundario, semana ‹ › `enBarraOscura`, paginado de a 10, la parada se **Elimina**
      —borra la fila de `t_disponibilidad`— con confirmación irreversible), Flota (ficha del filtro
      enlace, «+ Nuevo X» md, ⌫/Limpiar del patrón) y Traslados («Guardar cambios» con «Sin cambios» /
      «Hay celdas inválidas», ↺ y «Restablecer todo» enlace). El `Stepper` apaga con `aria-disabled`
      y su motivo. **`app-modules-panel-action` se retiró** (27,6 px, translúcido).
    - **Un `<summary>` o un `<a href>` externo con aspecto de botón** usan `clasesBoton(variante,
      tamano)` de `Boton.tsx`: el aspecto sigue escribiéndose en un solo sitio.
    - **El lint lo exige (D6).** `eslint.config.js` rechaza la clase `btn` entera en un `className`
      fuera de `components/common/`, y `common/estandarBotones.spec.ts` recorre el código por si el lint
      no corrió. Los controles de SELECCIÓN —segmentados, pestañas, pastillas de filtro y de fecha,
      letras de turno, fichas de patrón, el contador «[−] n [+]», el selector de formulario— no son
      acciones y se marcan uno por uno con
      `// eslint-disable-next-line no-restricted-syntax -- control de selección, no acción`. La lista
      vive en `docs/FASE5-diseno-interfaz.md` §2.2.

18. **Un solo cajón: `<DrawerLateral>` (`components/common/DrawerLateral.tsx`).** Añadida el 2026-10-15,
    del cajón estándar (plan «drawer-estandar»). **Todo formulario se captura en un cajón** y **todo
    mensaje es `MensajeModal`**: desde el 2026-10-16 no hay `MarcoModal` (se retiró). Una confirmación
    es `MensajeModal` (la baja con motivo lleva su campo dentro) y el error de la acción queda en ese
    mismo modal. El diálogo de candidatos de «Planificar el día» es el cajón `DrawerCandidatos` (`lg`,
    lectura: cada fila actúa sola) y la tarea de taller, `DrawerTareaTaller` (`md`); los dos confirman
    «Quitar asignación» con `MensajeModal` peligro. `common/cajonEstandar.spec.ts` falla si `MarcoModal`
    vuelve a aparecer.

    | Pieza | Qué fija |
    |---|---|
    | **Ancho** | `lg` (por omisión) = `clamp(720px, 50vw, 860px)` para formularios con varias secciones; `md` = 600 px para los cortos; 100 % por debajo de `md` (768 px). No hay otros |
    | **Panel** | Pegado a la derecha, alto completo, `rounded-l-2xl` arriba y abajo con `overflow-hidden` (la curva recorta cabecera, cuerpo y pie), sombra lateral y entrada de 220 ms. El cuerpo es el ÚNICO scroll. Ningún hijo con márgenes negativos, ancho sobre el 100 % ni `w-screen` (lo vigila `cajonEstandar.spec.ts`) |
    | **Cabecera** | **Azul corporativo** (`app-cajon-barra`, `--app-cajon-barra` = `--color-secondary`, igual en los dos temas): `titulo` (20 px, blanco) + `subtitulo` (13 px, claro suave; admite un nodo: identificador en mono, cuadro de color) + aspa `fantasma` de 36 px. **Sin versalita**: el contexto va en el subtítulo. Una `Insignia` del subtítulo se pinta translúcida sola (`BarraOscuraContexto`). `ayuda` opcional al principio del cuerpo |
    | **Cuerpo** | Secciones con `SeccionDrawer` (tarjeta, título de 14 px legible, **sin número**) y campos con `CampoDrawer` (etiqueta, `*` roja, ayuda, error con `aria-describedby`) |
    | **Pie** | **Azul, como la cabecera.** Lo arma el cajón, nunca a mano: [`extraPie` · estado] ··· [`accionesPie`] [Cancelar `secundario lg`, blanco] [`textoGuardar` `primario lg`, borde blanco], con `onGuardar` o `formId`. El estado sale de **`estadoPieDrawer`** (`utils/estadoPieDrawer.util.ts`), igual en todos: edición sin cambios «Sin cambios pendientes» (y Guardar apagado «Sin cambios», `motivoSinCambios`) · edición con cambios «Cambios sin guardar» (ámbar, tono `cambios`) · alta con faltantes «N campos por completar» (claro suave, nunca naranja) · tras intentar «Falta: …» (rojo claro, icono; el foco va al primer campo inválido y su borde se pone rojo) · alta completa «Listo para guardar» (verde claro, check) · «Guardando…». Se admite contexto propio delante («1 efectivo · Sin cambios pendientes»). `motivoGuardar` apaga de verdad; `guardarPendiente` se ve apagado pero valida al pulsar. Apagado sobre el azul: colores fijos sin opacidad (`--app-cajon-deshabilitado-*`) y el motivo en el `title` |
    | **Lectura** | `modo="lectura"`: [Cerrar] y, con `onAccionLectura`, [Listo]. Para consultas y para lo que se guarda al instante (ausencias, personal de la Jornada) |
    | **Descarte** | Con `sucio`, el aspa, Escape, el velo y Cancelar preguntan «¿Descartar cambios?» [Seguir editando] / [Descartar] (rojo relleno). Mientras `guardando`, nada cierra y el cuerpo va `inert` |
    | **Al guardar** | El cajón se cierra, aviso breve (`toast.exito`, `utils/mensaje.ts`) y la fila resaltada. Con «Agregar otro después» (`extraPie`), el formulario se limpia, el cajón sigue abierto y sale el aviso igual. `ModalExito` se retiró |
    | **Instantánea** | La estructura de cada cajón (ancho, cabecera, secciones, campos, pie) está fijada con `pruebas/resumenCajon.ts` en `common/cajonesSnapshots.spec.tsx` (los de una pantalla, en la prueba de su pantalla). Un cambio de forma se mira y se acepta con `-u`, no a ciegas |
    | **Un cajón a la vez** | Las capas son una pila (`usePanelAccesible`): Escape, el tabulador y el velo solo actúan sobre la de arriba. Un flujo que necesita otro cajón lo REEMPLAZA y vuelve al cerrar («Ver paradas» ↔ «Registrar parada»), o lo pinta como vista dentro del mismo («Reparto de carga» en la Jornada). Abrir un segundo cajón avisa en desarrollo (`console.warn`); una confirmación encima sí se apila |

    > `antetitulo`, `marca`, `pie` y los anchos `xl`/`formulario`/`2xl`/`3xl`/`amplio` se retiraron al
    > terminar la migración. Las clases viven en `docs/FASE5-diseno-interfaz.md` §2.2 («Cajón estándar»).

19. **Mensajes estándar: `MensajeModal`, avisos breves y `AvisoEnLinea`.** Añadida el 2026-10-16, del
    plan «mensajes-estandar». Todo lo que se le dice al usuario es una de tres piezas, con las
    mismas cuatro familias de color e icono (`--app-msg-*`, `common/IconoMensaje.tsx`: advertencia,
    error, éxito, info). **No hay `window.alert`/`confirm`/`prompt`** (lint `no-alert` y
    `no-restricted-globals`), ni `alert alert-*` fuera de `components/common/`, ni `MarcoModal`,
    `ModalConfirmacion`, `AvisoEfimero`, `ModalProvider` o `Alert.tsx`: lo vigilan
    `common/mensajesEstandar.spec.ts` y `common/cajonEstandar.spec.ts`.

    | Pieza | Cuándo | Cómo |
    |---|---|---|
    | **`MensajeModal` advertencia** | Confirmar algo con consecuencias NO destructivas (cerrar o reabrir el cuadro, publicar el mes, emitir) | Acción `primario`. Título como pregunta: verbo + objeto («¿Cerrar el cuadro del día?») |
    | **`MensajeModal` peligro** | Toda confirmación destructiva: dar de baja, desactivar, eliminar, retirar, quitar todos, descartar | Icono de advertencia, acción `peligroRelleno` (M2). Foco inicial en el botón SEGURO; Escape y el velo son «Cancelar»; Enter no confirma |
    | **`MensajeModal` error** | Una ACCIÓN del usuario falló o no se permite (409, 403, 422, 500) | [Entendido], o [Cerrar] + [Reintentar] si reintentar puede salir bien. «Ver detalle» con lo técnico |
    | **`MensajeModal` éxito** | Solo los hitos: cuadro cerrado ([Ver órdenes]), órdenes emitidas, mes publicado, permisos guardados, carga inicial terminada | [Aceptar], o [Cerrar] + la acción siguiente |
    | **`MensajeModal` info** | Una explicación sin riesgo | [Entendido] |
    | **Aviso breve (`toast.*`)** | Éxitos rutinarios (guardado, creado, reactivado…), «Guardado con avisos», un error leve | Abajo a la derecha, 4 s, se pausa con el ratón, máximo 3. El error leve lleva «Ver», que abre el `MensajeModal` error. La fila resaltada sigue |
    | **`AvisoEnLinea`** | Lo que vive DENTRO de la página, un formulario o un cajón: contexto (ventana de carga, «Sin rol en Auth central…»), el error de CARGA de una pantalla (con [Reintentar]) y el `errorServidor` de un cajón | `variante` + `titulo`/`accion` opcionales; `rol="alert"` si una advertencia debe interrumpir. `AvisoVentana` y `AvisoVentanaCerrada` lo usan por dentro |

    - **El servicio (`utils/mensaje.ts`)**, sin montar nada a mano: `mensaje.confirmar({variante, titulo,
      mensaje, detalle, textoPrincipal, textoSecundario, onPrincipal})` → `Promise<boolean>`;
      `mensaje.error`/`exito`/`advertencia`/`info`; **`mensaje.errorDe(fallo, {titulo, reintentar})`** para
      el error de una acción; `toast.exito`/`advertencia`/`info`/`error(titulo, {texto, accion, fallo})`. Un solo
      modal a la vez (cola). Lo pinta el único `MensajeHost`, en `AppProviders`.
      `configMensajes.exitoComoModal` cambia todos los avisos de éxito a modal desde un solo sitio.
    - **Declarativo también vale**: una confirmación con estado propio pinta `<MensajeModal abierto …>`.
      Con `onPrincipal` async, el botón dice «Procesando…», todo queda bloqueado y, si falla, **el MISMO
      modal pasa a error**: no se cierra para avisar arriba en la página.
    - **`traductorErrores`** (`utils/traductorErrores.ts`) es el único sitio que pone título a un código
      de negocio del servidor; el mensaje sigue siendo el del servidor (regla 7). Un código desconocido
      de 4xx: «No se pudo completar la acción» + el mensaje del servidor. 500, tiempo agotado o un fallo del
      navegador: el texto genérico, y lo técnico al detalle.
    - **`varianteDeAviso(trato)`** y **`avisoDeFallo(fallo)`** (`errorApi.util.ts`) dan la familia de un
      aviso en línea (el 403 es error, no advertencia). `claseDeAviso` se retiró.
    - **Lo que sigue en línea, a propósito**: el rechazo de UN CAMPO al registrar en P-01 (`avisoGeneral`,
      trato `campo`, junto al formulario que se corrige), el de una persona (bajo su horario), los errores
      dentro de un cajón y los de un campo. Son avisos de formulario (spec §7), no mensajes. **Desde el
      2026-10-16 (R11)** el resto de los rechazos al registrar —ventana, cuadro cerrado, permiso, un 500—
      es `mensaje.errorDe` («No se pudo registrar el operativo», con «Ver detalle»).

---

## 7. Autenticación

**La identidad la resuelve Auth central.** El ingreso ocurre en el portal institucional; este
frontend no tiene formulario de acceso y nunca ve un token.

```
portal de Auth  →  <origen>/auth/callback?code=…  →  POST /auth/session/exchange
                                                     ↓  el backend canjea y emite
                                              cookie HttpOnly que este código no puede leer
```

**El portal compone `/auth/callback` por su cuenta.** En Auth se registra **solo el origen**, y hoy
es `localhost:5180` en el módulo 80. El destino no sale de `subsystems.path`, que no se usa, sino
del primer permiso con `path` ordenado por `order`.

Cuatro piezas, y ninguna guarda credenciales:

| Archivo | Qué hace |
|---|---|
| `services/sesion.service.ts` | Las tres llamadas: canje, sesión y cierre. Contra **nuestro** backend, nunca contra Auth |
| `pages/AuthCallbackPage.tsx` | Ruta pública `/auth/callback`. Canjea el código **una sola vez** |
| `providers/UserProvider.tsx` | Resuelve la sesión al arrancar y la establece tras el canje |
| `components/common/RutaConSesion.tsx` | Envuelve el marco entero: sin sesión no se pinta ni la barra lateral |

### Dos reglas que nacieron de defectos reales

**1 · `user` y `estado` son un mismo hecho y solo se mueven juntos.** El contexto **no** expone
`setUser`: expone `establecerSesion(perfil)`, que fija los dos. Cuando no era así, al llegar del
portal el arranque fijaba `estado = "sinSesion"` —todavía no hay cookie—, el canje ponía `user` y
`estado` se quedaba atrás, y `RutaConSesion` devolvía al portal: **había que pulsar el rol dos
veces**. Si añade estado de sesión, añádalo dentro del provider y muévalo con los demás.

**2 · No dé por hecho el contexto seguro.** `crypto.randomUUID`, `crypto.subtle` y compañía **no
existen** sobre HTTP en una dirección IP, y `correlationId.ts` corre en **cada** petición: un
descuido ahí no rompe una pantalla, rompe la aplicación entera. Use el respaldo que ya está escrito
en ese archivo como modelo.

**`httpClient` lleva `withCredentials: true` y NINGUNA cabecera de identidad.** La cookie viaja
sola. Un `401` de una API privada se anuncia con un evento, no navegando desde el interceptor, y
los tres endpoints de sesión quedan exentos para no producir un bucle en el arranque.

### El frontend nunca habla con Auth, ni siquiera para leer el personal

Desde el **2026-08-21**, P-07 tiene una vista que lista a las personas activas de Auth central
(PV-02: el maestro se cargaba a mano). **Esa consulta la hace el backend, no el navegador**, por
`GET /administracion/directorio`, y la CSP `connect-src 'self'` lo respalda: desde aquí no hay
forma de llamar a otro origen.

Tres cosas que conviene saber antes de tocar esa vista:

1. **Auth no conoce el tipo de contrato**, ni el área, ni el teléfono. Se siguen capturando en el
   formulario de la ficha, y el del contrato decide si esa persona puede salir de noche (RN-26).
   No los precargue con un valor por omisión «razonable»: invita a no mirarlos.
2. **El nombre viene en un solo campo** y se parte por heurística —`partirNombre`, en
   `interfaces/DirectorioAuth.ts`, misma regla que aplica el servidor—. Llega **editable** y la
   pantalla avisa de que puede salir mal.
3. **`ficha: null` no es un hueco de la tabla: es «no puede ser convocado».** Se escribe con
   palabras (regla 6), porque no produce ningún error hasta el día en que alguien busca a esa
   persona en el selector de P-01 y no está.

Si Auth no responde, la pantalla lo dice y **el maestro sigue administrándose igual**. No acople
una a la otra.

> **Precisado el 2026-08-24, al mover el directorio al camino del alta.** Ya no es una vista al
> lado del maestro: **«Nuevo funcionario» abre el directorio**, se elige a la persona y su ficha
> llega precargada. El directorio de Auth es la base de usuarios de la institución —`GET /users`
> devuelve la AMC entera y este módulo solo descarta a los inactivos—, así que teclear una ficha
> desde cero es copiar a mano algo que ya está escrito.
>
> **La regla de arriba sigue vigente, y ahora vive en un botón.** «Crear Funcionario Operativo»
> —«Registrar a mano» hasta el 2026-08-31; cambió el rótulo, no lo que hace—, dentro de
> esa misma ventana y visible **también con Auth caído**, abre la ficha en blanco;
> `POST /administracion/personal` no toca Auth por ningún lado. Sin ese botón, el alta —y con
> ella el maestro entero— pasaría a depender de que Auth conteste. Lo fijan dos pruebas.
>
> Y el fallo de Auth **dejó de ser un 503**: `GET /administracion/directorio` responde
> `{ disponible, motivo, personas }` y nunca lanza por esa causa. Que Auth no esté es un estado,
> no un error de la petición; con una excepción, la ventana tendría que distinguir por el `catch`
> entre «no se pudo preguntar» y «no hay nadie». Es el mismo contrato que usa el módulo de
> Instrucción. Un fallo **nuestro** sí sigue lanzando, y debe.

> **Retirado el 2026-08-18, etapa 5.** Hasta entonces el perfil se simulaba con
> `SelectorRolPruebas`, `config/usuariosPrueba.ts` e `api/identidadProvisional.ts`, que enviaba la
> cabecera `x-usuario-prueba`. Los tres archivos **ya no existen**: mientras existieron, cualquiera
> que conociera el nombre de esa cabecera podía declararse Dirección enviando un número.
>
> Con ellos desapareció también el rol como número: `rolUser` guarda ahora los valores del
> enumerado del servidor —`"DAF"`, `"DIRECTOR"`…— porque aquellos códigos del 1 al 7 existían solo
> para esa cabecera.

---

## 8. Documentación

| Necesito | Archivo |
|---|---|
| **Paleta, tipografía y estilo de marca** | **`.claude/skills/diseno-sigoc/SKILL.md`** — manual *Nueva Imagen 2025* de la Alcaldía. Es la fuente de las reglas 2 y 13 |
| **Texto y contraste: los cuatro tokens, la corrección de daisyUI y el lint** | **`docs/estilos.md`** |
| Guía de implementación y orden de pantallas | `docs/implementacion/IMPLEMENTATION_GUIDE.md` §12 |
| Wireframes, mockups, estados, responsive, accesibilidad | `docs/FASE5-diseno-interfaz.md` |
| Prototipo aprobado por el Product Owner | `docs/PROTOTIPO-sigoc-cuadro-colores.html` |
| **Rediseño de P-01: estructura, personal y pie de acción** | **`docs/handoff_registro_operativo/ANALISIS-codigo.md`** — origen de la regla 14. El prototipo que acompaña es **referencia**: sus hexadecimales y estilos en línea **no se llevan al código** |
| Contratos de API | `docs/FASE4-arquitectura-tecnica.md` §8 |
| Reglas de negocio | `docs/FASE2-documentacion-funcional.md` §8 |

---

## 9. Reglas para Claude en este repositorio

1. Antes de construir una pantalla, lee su wireframe y su mockup, y contrasta con el prototipo.
2. Reutiliza los componentes existentes: no reescribas `Boton`, `FormikField`, `DrawerLateral`,
   `MensajeModal` ni `AvisoEnLinea`.
   `FormikField` se unificó en M-22 (D-01): añade tipos nuevos sobre `CampoTexto`, no copiando un
   componente. `TablaOperativos` sirve a P-01 y P-02, y desde el 2026-10-13 las dos la montan
   dentro de `PanelOperativos` (con `useTablaOperativos`: filtros, páginas y resaltado) y con
   `AccionesOperativo` en cada fila; solo cambian las columnas (`COLUMNAS_SESION` / `COLUMNAS_LISTADO`).
   El «+ Adicional» de las dos tablas es `useAdicionalOperativo` con `DrawerOperativo` en modo «adicional».
   La tabla genérica `components/tabla/Table` (filtraba y paginaba contra el servidor) se retiró el
   2026-10-15: ninguna pantalla la usaba.
   Para elegir **varios** valores de un catálogo usa `SelectorTokens`, no un `<select multiple>`:
   ahí donde lo había, los nombres largos se partían y hacía falta Ctrl+clic. Sus `etiquetaCorta`
   y `etiquetaLarga` van **fuera del componente**: son dependencias de su filtro memoizado.
3. Cero variables, imports o funciones sin usar. Sin `console.log`. Sin `any`.
4. Español en nombres, comentarios y textos de interfaz.
5. Imports con **extensión explícita** (`.ts` / `.tsx`): Vite lo exige en este proyecto.
6. Cabecera de comentario por archivo.
7. Commits cortos, en español, estilo convencional. **Nunca atribuyas a Claude ni a IA.**
8. Antes de terminar: `npm test`, `npm run lint` y `npm run build` con código de salida 0.
9. **Un prototipo externo no es una fuente de estilo.** Los que llegan de fuera del repositorio
   traen hexadecimales a mano, fuentes remotas y estilos en línea: se leen por su **estructura,
   orden, densidad y comportamiento**, y se implementan con las clases del inventario, las
   variables del tema y Montserrat local. Si una composición del prototipo parece exigir una clase
   nueva, **avisa antes de escribirla** (regla 1); no la introduzcas porque el prototipo la tenga.
