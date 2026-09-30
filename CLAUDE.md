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
│   ├── common/    Table, Alert, Loading, ModalConfirmacion, ModalExito, Paginacion…
│   ├── forms/     FormikField: TextInput, SelectInput, TextAreaInput
│   │               SelectorTokens: elegir varios de un catálogo, con teclado
│   ├── tabla/     Table, FilterByColumn, RowActions
│   ├── navbar/    Navbar, Sidebar, SelectorRolPruebas
│   └── cuadro/    Componentes del módulo
├── config/        routes · navigation · env · usuariosPrueba · validationSchemas
├── context/       UserContext · ModalContext · ThemeContext
├── hooks/         useCuadroDiario · useFormulariosPermitidos · useVentanaCarga
├── interfaces/    Operativo · Formulario · CuadroDiario · Personal · Transporte · Alerta
├── layouts/       MainLayout · LoginLayout
├── pages/         Las nueve pantallas
├── providers/     AppProviders · ModalProvider · ThemeProvider
├── pruebas/       configuracion.ts — preparación común de Vitest
├── services/      Un servicio por dominio
├── styles/        Tokens y hojas del sistema visual
└── utils/         horario.util — espejo de RangoHorario, solo para experiencia de usuario
                   listadoOperativos.util — texto de cada columna, filtrado y paginación
                   valoresOperativo.util — valores del formulario de operativo
                   ventanaCarga.util — «todavía no» frente a «ya no», solo para el aviso
                   flota.util — lo que la DAF puede ofrecer de la flota (ver PV-33)
                   banner.util — texto legible sobre el color del banner, y descarga
                   ordenes.util — sobre qué operativos se puede emitir, y por qué no
                   personal.util — nombres en español de los enumerados, y ausencias
                   parametro.util — rango admisible de un parámetro, y horario de ventana
                   errorApi.util — traduce el error del servidor a decisión de interfaz
                   texto.util — comparar sin tildes ni mayúsculas. **Única copia**: estaba
                     repetida en listadoOperativos.util y personal.util
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
| `/cuadro/transporte` | Asignación de transporte | DAF. Desde el 2026-08-31 ofrece la **flota completa** (PV-33), permite **devolver a pendiente** (P-07) y declara el **destino** de cada vehículo (RN-DAF-03) |
| `/cuadro/jornada-conductores` | Jornada de los conductores | DAF, Director |
| `/cuadro/capacidad` | Capacidad de flota | DAF |
| `/administracion/mantenimiento` | Mantenimiento de vehículos | **Solo Administrador DAF** desde el 2026-09-01. Sale la DAF operativa: sigue **viendo** el vehículo parado —el estado viaja en `GET /transporte/vehiculos`— pero ya no lo para ella |
| `/cuadro/jornada` | Jornada del Día | Los **tres** departamentales desde el 2026-09-01. Cada rol ve **solo sus formularios** (los que escribe o aporta) desde el 2026-09-15. La acción de personal solo donde el servidor la concede (`frol_edita_desde_jornada`); para los demás es consulta |
| `/cuadro/matriz` | Matriz Consolidada del Día | **Solo Director** |
| `/cuadro/ordenes` | Órdenes de servicio | **Solo Director** |
| `/mis-ordenes` | Mis órdenes | Funcionario |
| `/administracion/personal` | Personal y disponibilidad | **Administrador DMIP y Administrador DMIT**, y cada uno ve **solo sus áreas**: el DMIP «Unidad de Operativos», «Inspector General» e «Inspector Técnico»; el DMIT «Personal de Instrucción». Lo acota el servidor por `func_direccion`, no el menú |
| `/administracion/catalogos-cuadro` | Catálogos del cuadro | Administrador |
| `/administracion/ventanas` | Ventanas y parámetros | Administrador |
| `/administracion/roles-auth` | Roles de Auth central | Administrador |
| `/administracion/usuarios` | Cuentas del cuadro | Administrador |
| `/administracion/flota` | Conductores y vehículos | **Solo Administrador DAF** desde el 2026-09-01 |
| `/administracion/permisos` | Permisos por rol | Permiso `permisos:administrar` (hoy el Administrador general). Edita la matriz rol↔permiso sin desplegar (RBAC, 2026-09-16) |

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
> `refinamiento.css`/`avisos-y-distintivos.css`, y los modales `MarcoModal` (theme-aware). El
> detalle vive en `docs/FASE5-diseno-interfaz.md` §2.2, que sigue siendo la fuente de verdad.

1. **No se introducen clases CSS nuevas.** El inventario permitido está en
   `docs/FASE5-diseno-interfaz.md` §2.2. Si una composición parece requerirlo, avisa.
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
   funcionario; no los reescribas ni los reemplaces por textos genéricos.
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
9. **La DAF escribe exactamente dos campos** de un operativo: conductor y placa (RN-40). En P-03
   todo lo demás llega deshabilitado, y los dos editables llevan `badge badge-accent badge-xs`.
   La prueba que lo protege **cuenta** los controles habilitados; si agregas uno, caerá, y debe.
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
    > **Un nombre que llega del servidor se comprueba, no se fuerza**: `esNombreIcono` es un
    > guardián de tipo, y lo que no está en el mapa cae en el respaldo a propósito.
    >
    > `Iconos.tsx` exporta esa función además del componente, lo que le cuesta la recarga en
    > caliente (`react-refresh/only-export-components`, silenciada en esa línea). Se prefiere
    > eso a partir el archivo: el mapa no existe sin importar de `@fortawesome/*`, y separarlo
    > abriría **una segunda puerta** a la librería, que es lo que la primera fila de esta tabla
    > previene. Si algún día se prefiere lo contrario, esa fila hay que reescribirla primero.

14. **El registro de operativo se percibe corto, o no se usa.** Añadida el 2026-08-26, del
    rediseño de P-01. La meta declarada es registrar un operativo en dos o tres minutos, y quien lo
    hace es un operador de central **decenas de veces al día**: se optimiza para repetición y
    teclado, no para primera visita. Hoy la pantalla obliga a desplazarse hasta el botón porque el
    formulario convive con la fecha de la jornada, dos avisos y la tabla de la sesión.

    | Regla | Qué significa |
    |---|---|
    | **Tres grupos, no una sábana** | Los campos van agrupados y rotulados con `app-section-heading`: `01 · DATOS DEL OPERATIVO`, `02 · PERSONAL ASIGNADO`, `03 · COORDINACIÓN`. Son subtítulos: **no** abren un `<h1>` nuevo |
    | **La etiqueta del formulario se acorta, el número no** | El nombre completo va en `title`; la etiqueta visible se recorta. Las nueve etiquetas largas empujan el ancho y en tablet parten los tabs en dos filas. El número **siempre** se pinta: es el equivalente textual del banner (regla 6) |
    | **Para elegir personal se usa `SelectorTokens`** | No se escribe otro selector. Es el caso que lo originó: se asignan **más de 30** efectivos y con lista plana no hay señal de lo ya elegido. Buscador por **apellido, unidad o cargo** —no solo apellido—, filtros por área con su conteo, «Asignar visibles (n)», y `Enter` que asigna el primer elegible visible |
    | **La bandeja de asignados tiene alto acotado** | Con desplazamiento propio. Treinta asignados no estiran la página; ese estiramiento es el defecto que se está corrigiendo |
    | **El horario del operativo desapareció; se captura POR PERSONA, en dos columnas** | Desde el 2026-09-08 (RN-66). **El operativo ya no tiene campo de horario en el registro**: cada persona lleva el suyo. La bandeja es un reparto de **dos columnas alineadas** —persona a la izquierda, horario a la derecha (`grid grid-cols-2`)—: cada asignado lleva dos **campos de hora ESCRIBIBLES** —inicio y fin— (`input input-bordered input-sm` + un `<datalist>` compartido con las horas 00:00–23:30 de `horasSeleccionables()`, desde el 2026-09-21): se teclea la hora («14» sugiere 14:00/14:30) o se elige de la lista, y es **OBLIGATORIO**: el vacío es el `placeholder` («Inicio…»/«Fin…»), no «heredar». El `:00/:30` lo garantiza la lista y lo revalida el servidor (RN-07). `FormularioOperativo.validate` rechaza el envío mientras alguna persona no tenga las dos horas. **Default-from-first**: al agregar a alguien su turno arranca copiando el de la **primera** persona asignada (`turnoDePrimera`), editable; la primera arranca vacía y hay que llenarla. Viaja en `CrearOperativo.personal` (`{ funcionarioId, horaInicio, horaFin }`); **no** se envía `horaInicio/horaFin` del operativo. El **servidor deriva la ventana del operativo** de las personas (`RangoHorario.envolvente`) y lo hace nocturno si **alguna** persona lo es; devuelve la ventana **efectiva** en `PersonaAsignada`. La lista de elegibles se pide **sin horario** (área+ausencia); el cruce lo valida el servidor por persona. El **adicional funciona igual** (por persona): hereda a su equipo en cuanto llegan los elegibles —sin horario, se dispara solo—, y a cada heredado se le fija su horario abajo. La **edición SÍ ofrece horario por persona desde el 2026-09-09**: la bandeja de corrección muestra los mismos dos campos de hora escribibles por persona (con su turno ya lleno) y cambiarlo es un `PATCH /operativos/:id/personal/:funcionarioId` **inmediato** —como asignar o retirar en edición—; el servidor **re-deriva la ventana del operativo** (envolvente) de los turnos y revalida el descanso/cruce de esa persona. `FormularioOperativo` ya no tiene un «modo clásico» de horario único |
    | **Quien no puede ser convocado se muestra, no se oculta** | Deshabilitado y **con su motivo en palabras** —sin ficha, ausencia, tope de salidas pesadas (RN-25), descanso tras patrulla (RN-24)—. Ocultarlo produce la misma sorpresa que `ficha: null` produjo en P-07 |
    | **Los campos calculados van como distintivo** | `badge badge-ghost badge-sm`, nunca un `input` deshabilitado (regla 5): la semana, el identificador y la fecha (`CamposCalculados`). Desde RN-66 el operativo **ya no tiene horario propio**, así que **no hay distintivo de duración ni de cruce de medianoche** en su formulario; el horario y su cruce viven por persona |
    | **El estado del envío se lee sin color** | Junto al botón, y **solo tras el primer intento de envío** (`submitCount > 0`, desde el 2026-09-23), el resumen dice qué falta —«Falta zonal, punto de encuentro…» y, si toca, «personal asignado» o «horario del personal»— o que está listo, en `role="status"`. Antes de pulsar no se pinta: un resumen colgado sobre un formulario en blanco es ruido permanente. El distintivo lleva el texto dentro (regla 6) |
    | **«Cantidad de operativos» genera N operativos por persona, con la misma hora general** | Desde el 2026-09-09. En el ALTA, cada persona lleva un contador «Cantidad de operativos» (columna en el bloque de Personal, con el stepper `[− n +]`; por defecto 1, máx. 50): el servidor crea N operativos independientes por persona, **todos con SU MISMA hora general**. **Desde el 2026-09-14 el horario ya NO se segmenta en tramos** —el negocio pidió una sola hora ini/fin para los N—. Lo enciende el flag **`cantidadPorPersona`** del catálogo (hoy solo el 8), que es **distinto de `variosPorPersona`** (el *split* por persona —un operativo por persona— que también tiene el 5, para que cada área lleve su código, pero SIN ofrecer cantidad). Viaja en `CrearOperativo.personal[].cantidad` (solo si >1) y con N>1 la página **relee** el listado. No se ofrece en edición ni en el adicional. El servidor compone los operativos (`componerOperativosDelRegistro`): el navegador no es el control |
    | **Los N operativos idénticos del 8 se AGRUPAN en las listas** | Desde el 2026-09-14. En las cuatro tablas —registro (P-01), mis operativos (P-02), matriz (P-04) y jornada (P-13)— las copias del 8 (operativos consecutivos de UNA persona, idénticos salvo el identificador) se pintan como **un bloque**: el **identificador** —y, donde existe, la **acción** (editar/retirar)— baja a la fila de cada operativo, y **todo lo demás se fusiona** en una celda que abarca el grupo (`rowSpan`), con el personal mostrando **«Nombre (n)»**. Lo decide `agrupacionForm8.util.ts` (`agruparConsecutivos`) comparando TODOS los campos que se fusionan, así la celda combinada nunca miente; **no cablea ningún número de formulario** —solo el 8 produce copias idénticas de una persona—. Si dos difieren en algo (otro conductor, otro punto), quedan en grupos distintos. Además, la celda fusionada va **centrada** (`align-middle text-center`), como una celda combinada de Excel; el identificador y la acción, por fila, siguen arriba a la izquierda |
    | **En el form 8, al EDITAR no se toca el personal** | Desde el 2026-09-14. Los N operativos del 8 tienen su identificador **ya generado** (uno por operativo, no modificable), así que corregir uno solo cambia **zonal, punto de encuentro, instituciones y tipo de control**; agregar/retirar/editar personal (y su horario y cantidad) queda **bloqueado**. Lo enciende `personalBloqueado` de `FormularioOperativo` —deshabilita solo el bloque de personal, no el resto—, que la página activa cuando `enEdicion` y el formulario tiene `cantidadPorPersona` (hoy solo el 8). Es UI: el servidor no lo fuerza |
    | **Las observaciones son NOTAS independientes, no un campo de texto** | Desde el 2026-09-09 (bitácora append-only). El `textarea` se sustituyó por `CapturadorNotas`: se teclea una nota y se **Agrega** (queda como renglón removible); al registrar viajan en `CrearOperativo.observaciones` (`string[]`). Cada nota se guarda como una fila propia (`t_operativo_observacion`) con su autor (rol) y fecha. En **corrección** las ya escritas se muestran en **solo lectura** (no se editan ni se borran) y solo se **agregan** nuevas, que viajan en `observacionesNuevas`. La **matriz** las pinta separadas, una por renglón. Solo clases del inventario (regla 1) |
    | **Los errores aparecen al primer envío, no antes** | Y el foco va al primer campo inválido. Esquema en `config/validationSchemas.ts` |
    | **El personal asignado SÍ es obligatorio** | Desde el 2026-09-02, y es lo que `FASE5` §7 pedía desde el diseño: «al menos una persona · al enviar · `alert alert-error` sobre el bloque». Esta misma tabla afirmaba lo contrario, y lo construido seguía a la tabla, no al wireframe. **No se valida en Yup**: el personal no es un campo de Formik —vive en la página, y al editar en el propio operativo—, así que lo comprueba `validate` de `<Formik>`, que sí lo alcanza. En modo aporte no aplica: allí no hay botón de guardar |

    > **Y el pie de acción fijo sigue siendo un punto abierto.** `sticky bottom-0` y `progress` no
    > están en el inventario de `docs/FASE5-diseno-interfaz.md` §2.2, y la regla 1 no admite
    > excepciones por comodidad: **hasta que se amplíe el inventario, el pie va al final del panel**
    > y el avance se muestra solo con el distintivo. Ampliarlo se decide, no se supone.

    > **Reordenar el pie no unifica las dos varas.** `bloqueado` y `bloqueadoParaAdicional` siguen
    > separadas (regla 11): al mover los botones es tentador dejar una sola condición, y eso
    > cerraría la puerta que el negocio pidió abrir para `OCAPMO`.

15. **En P-01 se registra y se corrige en el mismo formulario, y la tabla trae la jornada
    entera.** Añadida el 2026-09-01 por la tarde. Antes «Editar» abría un segundo panel al final
    de la página —había que desplazarse hasta él y volver— y la tabla era memoria de la sesión:
    nacía vacía, así que quien recargaba registraba sin ver lo que ya llevaba el día.

    | Regla | Qué significa |
    |---|---|
    | **Un solo formulario, y cinco propiedades que cambian con el modo** | Todas se derivan de `enEdicion`, así que no pueden contradecirse. `PanelEdicionOperativo` **no desaparece**: sigue sirviendo al modo aporte y a P-02 entera |
    | **Entrar a corregir no pierde la captura** | Es «LO CAPTURADO NUNCA SE PIERDE» de la cabecera del archivo, y con un formulario compartido ya no se cumple solo. El borrador se aparta al entrar —leyendo `refFormik`— y vuelve al cancelar **y** al guardar, por `enableReinitialize` |
    | **`resetForm()` a secas está prohibido en esta pantalla** | Repone `initialValues`, que mientras hay borrador **es el borrador**: al registrar, el formulario se habría rellenado solo con lo que se acababa de enviar. Se le dice a qué se vuelve |
    | **La tabla se pide al servidor, por código** | `GET /operativos?formulario=<codigo>`, nunca filtrando en memoria contra el texto visible: ése es el defecto que dejó la patrulla 6 vacía en agosto, porque su código es `REACN` y su nombre «PATRULLA REACCIÓN NOCTURNA» |
    | **Y por eso no todas sus filas son editables** | El formulario 4 tiene dos departamentos que registran: quien mira verá filas ajenas, y `exigirPropiedad` las rechazaría con 403. Lo decide `accesoOperativo.util.ts`, la misma utilidad que P-02, que **no nombra ningún rol** |
    | **Quien no puede, lo ve apagado y con el motivo** | Regla 6, y el mensaje nombra al departamento al que hay que pedírselo. Ocultar la acción en una fila y no en la de al lado se lee como una avería |
    | **Salir a otra pantalla y volver tampoco pierde la captura** | Añadido el 2026-09-04. React Router **desmonta** P-01 al navegar —a la Jornada del día, por ejemplo—, así que el borrador que ya sobrevivía a «Editar» no sobrevivía a esto: al volver, el formulario nacía vacío. Se conserva en `sessionStorage`, **no `localStorage`**, y es decisión de seguridad: lleva datos personales del personal (RN-34), es por pestaña y se borra al cerrarla; `UserProvider` ya declara que aquí no se persiste nada sensible en disco. Vive en `utils/borradorOperativo.util.ts`, se guarda en cada cambio —`FormularioOperativo` lo avisa por `onValoresCambian`, y no por `refFormik`, que al desmontar queda a `null`—, y **se retira al cerrar sesión** (`limpiarTodosLosBorradores`, desde `UserProvider`) y **al registrar con éxito**. Solo en alta: una corrección no se persiste, su captura ya está a salvo en `borrador` |
    | **Cada formulario guarda SU captura, y el otro no la ve** | Añadido el 2026-09-10, a petición del negocio: «si cambio de formulario, el otro no debe ver lo que estoy editando». El borrador dejó de ser uno por usuario a ser uno por **(usuario, formulario, FECHA)** —clave `…v6.form.<usuario>.<fecha>.<codigo>` desde el 2026-09-21—; aparte va un **puntero de sesión** (`…v6.ptr.<usuario>`) con la fecha y el último formulario, para reabrir donde iba. Al cambiar de pestaña —o de **fecha de la jornada**— se guarda lo capturado bajo el (formulario, fecha) que se abandona y se carga —o se vacía— lo del que entra; `codigoActivoRef` **y `fechaActivaRef`** son el formulario y el día dueños de lo que hay en memoria y solo se mueven tras guardar, para que `persistirBorrador` nunca escriba bajo la clave equivocada durante el cambio. **Cambiar la fecha de la jornada YA NO borra** (2026-09-21): cada día conserva su captura bajo su clave (RN-66: cada captura queda con su día), así que volver a una fecha la restaura; solo se vacía el listado de operativos y se cierra la corrección abierta |

16. **Responsivo y móvil-first.** El sistema ya es móvil-first y su especificación es
    `docs/FASE5-diseno-interfaz.md §9`. Los puntos de corte son los del proyecto —`sm/md/lg/xl` de
    Tailwind, **sin agregar ninguno**—: estilos base para móvil y modificadores en orden
    ascendente, con las utilidades responsive **ya inventariadas** en §2.2 (`sm:flex-row`,
    `md:grid-cols-2`, `overflow-x-auto`…). Todo cambio va con clases del inventario (regla 1).

    | Regla | Qué significa |
    |---|---|
    | **Tablas: scroll, no tarjetas** | En móvil las tablas del cuadro conservan `overflow-x-auto` con la columna de identificador visible (§9.4). El **card-view fue rechazado por el PO** y no se introduce. La única pantalla concebida con tarjetas es P-06 |
    | **El armazón ya colapsa** | La barra lateral pasa a **cajón deslizante (drawer)** por debajo de `lg` y la topbar queda `sticky` (§9.2, `MainLayout` + `MenuDropdown`). No se reinventa el patrón |
    | **Área táctil por `btn-sm`, no a mano** | El mínimo lo dan `btn-sm`/`input-sm`/`select-sm` (§10.6); se evita `btn-xs` en móvil. **Nada de `min-h-[44px]`** ni otros valores arbitrarios fuera del inventario |
    | **Nada de `w-screen`** | `100vw` incluye la barra de scroll y desborda en <375px: se usa `w-full` (con `relative` en el contenedor cuando hay que anclar un absoluto) |
    | **El teclado táctil lo fija el `type`** | En `FormikField`: correo → `EmailInput` (`type=email`), teléfono → `PhoneInput` (`type=tel`), fecha de calendario → **`DateTextInput`** (`type=date` que **conserva la cadena `AAAA-MM-DD`**, regla 12; distinto de `DateInput`, que convierte a `Date`). Pasar `tipo=`/`type=` a `TextInput` **no** surte efecto: se usa el componente dedicado |
    | **El error de Yup envuelve** | `.label` de daisyUI es `nowrap`; el pie de error de `FormikField` lleva `whitespace-normal` + `min-w-0` (§2.2) para que un mensaje largo no desborde un modal angosto |
    | **Los envíos muestran carga uniforme** | Un submit en proceso va `disabled` + `loading loading-spinner loading-sm` (con `aria-hidden`) **junto** al rótulo («Guardando…»/«Registrando…»), patrón de `FormularioOperativo`. El texto se conserva (regla 6) y el `<span>` vacío no cambia el nombre accesible, así que las pruebas por nombre siguen pasando |

    > **Lo que NO se hace sin decisión del PO (ampliar el inventario, regla 1):** card-view de
    > tablas, bottom-sheets, `min-h-[44px]`, nuevos breakpoints, `btn-md` global y los botones
    > sólidos `btn-error`/`btn-success` (el manual prohíbe rojo/complementarios como fondo
    > completo, regla 2; el patrón vigente para eliminar es `btn-ghost … text-error`).

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
| Guía de implementación y orden de pantallas | `docs/implementacion/IMPLEMENTATION_GUIDE.md` §12 |
| Wireframes, mockups, estados, responsive, accesibilidad | `docs/FASE5-diseno-interfaz.md` |
| Prototipo aprobado por el Product Owner | `docs/PROTOTIPO-sigoc-cuadro-colores.html` |
| **Rediseño de P-01: estructura, personal y pie de acción** | **`docs/handoff_registro_operativo/ANALISIS-codigo.md`** — origen de la regla 14. El prototipo que acompaña es **referencia**: sus hexadecimales y estilos en línea **no se llevan al código** |
| Contratos de API | `docs/FASE4-arquitectura-tecnica.md` §8 |
| Reglas de negocio | `docs/FASE2-documentacion-funcional.md` §8 |

---

## 9. Reglas para Claude en este repositorio

1. Antes de construir una pantalla, lee su wireframe y su mockup, y contrasta con el prototipo.
2. Reutiliza los componentes existentes: no reescribas `Table`, `FormikField` ni los modales.
   `FormikField` se unificó en M-22 (D-01): añade tipos nuevos sobre `CampoTexto`, no copiando un
   componente. `TablaOperativos` sirve a P-01 y P-02 mediante propiedades opcionales.
   `Table` filtra y pagina **contra el servidor**: úsalo solo donde el endpoint acepte de verdad
   esos filtros, y entonces **memoiza `findRecordsFn` con `useCallback`**.
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
