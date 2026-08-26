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

## 5. Las doce pantallas

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
| `/cuadro/transporte` | Asignación de transporte | DAF |
| `/cuadro/matriz` | Matriz Consolidada del Día | **Solo Director** |
| `/cuadro/ordenes` | Órdenes de servicio | **Solo Director** |
| `/mis-ordenes` | Mis órdenes | Funcionario |
| `/administracion/personal` | Personal y disponibilidad | Administrador |
| `/administracion/catalogos-cuadro` | Catálogos del cuadro | Administrador |
| `/administracion/ventanas` | Ventanas y parámetros | Administrador |
| `/administracion/roles-auth` | Roles de Auth central | Administrador |
| `/administracion/usuarios` | Cuentas del cuadro | Administrador |
| `/administracion/flota` | Conductores y vehículos | Administrador |

> **`user.rolCode` pasó a `user.rolCodes`, en plural, el 2026-08-19.** Una persona puede
> tener varios roles y ve la unión de lo que cada uno abre, así que `RutaProtegida` y el
> menú comprueban **intersección**, no igualdad.

**Las nueve están construidas desde M-29.** Se declaran en `config/routes.tsx`, en el mapa
`CONSTRUIDAS`, tipado como `Record<Ruta, ReactNode>`: si agregas una ruta a `pantallas` sin su
pantalla, TypeScript lo dirá. Cada una va en su propio fragmento diferido.

---

## 6. Reglas invariables de interfaz

1. **No se introducen clases CSS nuevas.** El inventario permitido está en
   `docs/FASE5-diseno-interfaz.md` §2.2. Si una composición parece requerirlo, avisa.
2. **No se alteran los colores del tema** de daisyUI en `src/index.css`.
3. **Los colores de banner los entrega el backend.** El frontend no los define ni los interpreta.
   Única excepción, y es de legibilidad: el **color del texto sobre el banner** se elige entre blanco
   y negro por luminancia (`banner.util.ts`), porque `colorAcento` sigue llevando relleno (PV-25).
4. **Las pantallas se montan según el rol**, no se ocultan controles. Un perfil no autorizado no
   tiene el componente en memoria.
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
    > 2026-08-24: hoy es **uno solo**, `OCAPMO` del **2 · PMO**. Las «A» de `ICA`, `OCA`,
    > `IGA` e `ITA` —DMIT e INSP— están marcadas **como ordinarias**, y confundirlas es
    > fácil. El servidor siempre lo hizo cumplir; P-05 y P-02 ofrecían el botón en los nueve
    > y fallaban en ocho. Viaja como `admiteAdicionales` en **dos** contratos —el de
    > operativo y el de sección de matriz—, porque las dos pantallas leen de sitios
    > distintos. **Es un `UPDATE` sobre `t_formulario_prefijo`, no un despliegue.**

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

    > **Estado al 2026-08-24: el código todavía no cumple, y hay un defecto visible.**
    > `iconoMap` **no tiene `temaClaro` ni `temaOscuro`**, que son los tres nombres que le pide el
    > interruptor de tema del panel de perfil (`Navbar.tsx`): los tres caen en el respaldo
    > `sinIcono` y **pintan un signo de interrogación**. Nada falla, nada se registra — porque
    > `nombre` es `string` y el respaldo tapa la errata. Es el motivo exacto de la tercera regla
    > de la tabla. Doce de las trece entradas del menú comparten el mismo `documentacion`
    > (`faFolderOpen`), y de los 25 nombres del mapa **20 son residuo de Instrucción**.
    > Está reportado, no corregido: tocarlo mueve la barra lateral y el panel de perfil.

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
> **La regla de arriba sigue vigente, y ahora vive en un botón.** «Registrar a mano», dentro de
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
| Guía de implementación y orden de pantallas | `docs/IMPLEMENTATION_GUIDE.md` §12 |
| Wireframes, mockups, estados, responsive, accesibilidad | `docs/FASE5-diseno-interfaz.md` |
| Prototipo aprobado por el Product Owner | `docs/PROTOTIPO-sigoc-cuadro-colores.html` |
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
