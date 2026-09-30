# MODULE_REVIEW.md
## Revisión completa del módulo — Cuadro de Colores Operativo · AMC

| | |
|---|---|
| **Fecha** | 2026-08-04 |
| **Alcance** | `transporte-backend` y `transporte-frontend` en su estado actual: línea base + Sprint 0 + M-01 |
| **Dimensiones** | Arquitectura · React · NestJS · Base de datos · Endpoints · Seguridad · UX · Rendimiento · Código duplicado · Errores |
| **Resultado** | **19 hallazgos.** 13 corregidos y verificados, 6 reportados con recomendación |

---

## 1. VEREDICTO

| Dimensión | Estado | Hallazgos |
|---|---|---|
| Arquitectura | ✅ Conforme al diseño | 1 corregido · 2 observaciones |
| NestJS | ✅ Conforme | 1 corregido |
| React | ⚠️ Deuda heredada acotada | 4 corregidos · 1 reportado |
| Base de datos | ⏳ Sin tablas — corresponde a M-02 | — |
| Endpoints | ⏳ Solo `/api/v1/estado` — el resto llega en M-06 a M-20 | 1 observación |
| **Seguridad** | ⚠️ **Una fuga de información corregida** | 1 corregido · 2 observaciones |
| UX | ⚠️ Un callejón sin salida corregido | 4 corregidos |
| Rendimiento | ⚠️ Aceptable, con una mejora pendiente | 2 reportados |
| Código duplicado | ⚠️ Una duplicación grande sin resolver | 1 corregido · 1 reportado |
| Errores | ✅ Ninguno de compilación | 3 corregidos |

**Backend:** `build` 0 · `lint:check` 0 · `test` 1/1.
**Frontend:** `build` 0 · `lint` 0 errores, 1 advertencia.
**Pila en ejecución:** los tres contenedores responden tras las correcciones.

### 1.1 Distinción que ordena toda la revisión

Conviene separar dos cosas que se confunden con facilidad:

- **Defecto:** algo entregado que está mal. Se corrige ahora.
- **Ausencia planificada:** algo que todavía no existe porque su módulo no ha llegado. **No es un
  defecto** y no se «corrige» adelantando trabajo.

Que no haya tablas, ni guardas, ni endpoints de negocio **no es un hallazgo**: es el plan
cumpliéndose. Lo que sí se revisó es que lo entregado esté bien hecho.

---

## 2. HALLAZGOS CORREGIDOS

### 2.1 Seguridad

#### S-01 · El filtro de excepciones devolvía detalle interno al cliente · **Alto** · ✅ Corregido

`AllExceptionsFilter` hacía esto ante cualquier error no controlado:

```
} else if (exception instanceof Error) {
  message = exception.message;      // ← se devuelve al cliente con estado 500
}
```

Cualquier fallo inesperado —un error de Prisma, un problema de conexión, una ruta del servidor—
**viajaba literalmente al navegador**. Un error de conexión de Prisma incluye el host, el puerto y
el nombre de la base; en algunas variantes, la cadena completa.

Esto contradice `FASE4-arquitectura-tecnica.md` §13.4, que para el estado 500 exige «mensaje
genérico más el identificador de correlación», y §12.4, que prohíbe exponer detalle interno.

**Corrección.** El detalle se registra en el servidor con `Logger`, incluida la traza, y al cliente
se le devuelve un mensaje genérico. Los errores controlados —`ApplicationError` y `HttpException`—
siguen devolviendo su mensaje, que está redactado para el funcionario.

> El formato completo del apartado §11.2 —con `codigo`, `detalles` y `correlacionId`— sigue siendo
> trabajo de **M-04**. Lo que se corrigió aquí es la fuga, no el formato.

### 2.2 UX

#### U-01 · El botón «Ingresar» llevaba a una ruta inexistente · **Alto** · ✅ Corregido

`LoginPage` navegaba a `/home/registro`. Esa ruta **desapareció** al retirar el legado: `routes.tsx`
declara `/home` sin hijos. El usuario pulsaba Ingresar y quedaba en una pantalla en blanco, sin
mensaje y sin vuelta atrás.

Es el hallazgo más visible de la revisión y no lo detectó ninguna herramienta: compila, pasa lint y
solo se manifiesta al hacer clic.

**Corrección.** Navega a `/home`, que es el armazón real.

#### U-02 · Errores de accesibilidad y de semántica en el formulario de ingreso · **Medio** · ✅ Corregido

| Problema | Consecuencia |
|---|---|
| `<label>` sin `htmlFor` y campos sin `id` | El lector de pantalla no asocia etiqueta y campo |
| Campos dentro de `<fieldset>` sin `<form>` | **Enter no envía**: solo funciona el clic |
| Botón sin `type` | Comportamiento ambiguo |
| Sin `autoComplete` | El gestor de contraseñas no reconoce los campos |
| `try/catch` alrededor de un `navigate` síncrono | El `catch` es inalcanzable; disfraza de robusto algo que no lo es |

**Corrección.** `<form onSubmit>` con `htmlFor`, `id`, `autoComplete` y `type="submit"`.

#### U-03 · Errata visible al usuario · **Medio** · ✅ Corregido

«Constraseña» aparecía **dos veces** en la pantalla de ingreso, en la etiqueta y en el marcador de
posición.

#### U-04 · Opciones de menú que no hacían nada · **Medio** · ✅ Corregido

El menú de perfil ofrecía «Cerrar Sesión» con `onClick: () => { }` y «Cambiar Contraseña» sin
manejador. Botones que el usuario pulsa y no responden.

**Corrección.** Retiradas hasta E12, que es cuando llega la identidad real. Se conservan «Acerca de»
y «Versión».

### 2.3 React y calidad de código

#### E-01 · `console.log` vivo en código entregado · **Alto** · ✅ Corregido

`AlertList.tsx` línea 29: `onClick={() => console.log("click")}` en cada elemento de la lista de
avisos. La convención `codigo-limpio-amc` lo prohíbe expresamente.

**Corrección.** Retirado junto con el manejador vacío.

#### E-02 · `console.error` de depuración · **Medio** · ✅ Corregido

`ModalContainer` registraba en consola cuando un tipo de modal no estaba en el registro. Con el
registro vacío hasta M-10, cada modal no registrado ensuciaría la consola. El componente ya
devuelve `null` correctamente.

#### E-03 · Código duplicado en `Table.tsx` · **Alto** · ✅ Corregido

`refetchData` —envuelto en `useCallback`— y el `useEffect` de recarga **repetían la misma lógica**:
el mapeo de `columnFilters` a parámetros, la composición de la consulta y la actualización de los
dos estados. Dieciocho líneas duplicadas en un componente que van a usar los cinco listados del
módulo.

Además explicaba la advertencia de `exhaustive-deps`: el efecto no dependía de `refetchData`.

**Corrección.** El efecto ahora invoca `refetchData`. Se conservan los disparadores explícitos
—página, tamaño y filtros— con la razón documentada: `findRecordsFn` la define el componente padre
y, si no está memoizada, incluirla en las dependencias provocaría **un bucle de peticiones**.

> **Contrato para las pantallas de M-22 en adelante:** conviene memoizar `findRecordsFn` con
> `useCallback` en cada página que use `Table`.

#### E-04 · Propiedad declarada y nunca usada · **Bajo** · ✅ Corregido

`Alert.tsx` declaraba `icon?: string` en sus propiedades. El componente **nunca la leía**: el mapeo
de iconos estaba comentado. Un consumidor podía pasarla y no ocurriría nada.

#### E-05 · Estado de React para un valor constante · **Bajo** · ✅ Corregido

`Navbar` usaba `const [alerts] = useState<Alert[]>([])` y `const [totalAlerts] = useState(0)`,
descartando ambos actualizadores. Son constantes: la campana no consulta nada porque los canales de
notificación siguen pendientes de definición.

**Corrección.** Constantes, con la referencia al pendiente documentada.

#### E-06 · Código comentado muerto · **Bajo** · ✅ Corregido

Unas setenta líneas repartidas en seis archivos: el bloque de consulta de avisos en `Navbar`, la
lógica de login antigua en `LoginPage`, el mapeo de iconos en `Alert`, `console.log` comentados en
`ActionButton` y `RowActionMenu`, y `onRowUpdateRef` en `Table`.

> **Una excepción deliberada.** El bloque comentado del resolutor de token en `httpClient.ts`
> **se conserva**: `FASE4-arquitectura-tecnica.md` §9.3, paso 3, lo referencia expresamente como
> «código ya previsto y comentado en el estándar» para la integración de E12. Borrarlo destruiría
> una decisión de diseño.

#### E-07 · Cabeceras de archivo con la aplicación equivocada · **Bajo** · ✅ Corregido

Seis archivos del backend declaraban «Microservicio: ModuloInstruccion Backend / Módulo:
Instrucción», y en el frontend quedaban «Microservicio: resolucion», «Microservicio: instruccion»,
«App: Administración» y «Módulo: N/A».

**Corrección.** Normalizadas. **La autoría original se conserva**, con la anotación «adaptado por»
donde el contenido cambió: quien escribió el componente sigue siendo su autor.

#### U-05 · `key={index}` en lista dinámica · **Bajo** · ✅ Corregido

`AlertList` usaba el índice del arreglo como clave. Ante reordenamiento o inserción, React reutiliza
nodos equivocados. Ahora usa `item.userAlertId`.

---

## 3. HALLAZGOS REPORTADOS SIN CORREGIR

### D-01 · Seis componentes casi idénticos en `FormikField.tsx` · **Alto** · ✅ Corregido en M-22

> **Resuelto el 2026-08-06, en el momento previsto y por el motivo previsto.** Se unificó en
> `CampoEnvoltura` más un `CampoTexto` parametrizado por su `type`, **acompañado de 19 pruebas** —la
> condición que la recomendación ponía—. Los seis nombres exportados se conservan.
>
> `DateInput` quedó aparte porque convierte `Date`↔texto, y las casillas porque llevan la etiqueta a
> la derecha: unificarlas habría trasladado esas particularidades al componente común. Detalle en
> `M22_PANTALLA_REGISTRO.md` §2.
>
> El texto original se conserva abajo como registro del criterio.

`TextInput`, `NumberInput`, `EmailInput`, `PhoneInput`, `DateInput` y los demás repiten **la misma
estructura de unas cuarenta líneas**, con una única diferencia real: el atributo `type` del `input`.
Cada uno recalcula `hasError` y `errorMessage`, y repite las mismas clases y el mismo bloque de
error.

Son unas doscientas cuarenta líneas donde bastarían unas sesenta.

**Por qué no lo refactoricé, aunque es el hallazgo de duplicación más grande:**

1. `IMPLEMENTATION_GUIDE.md` §0.2 lo incluye entre los componentes que **se reutilizan sin
   modificar**.
2. **No tiene pruebas.** Un fallo sutil en el componente base lo heredarían **todos los campos de
   las nueve pantallas**, y el formulario de registro es el corazón del módulo.
3. El beneficio es de mantenimiento; el riesgo, funcional. Con la relación de riesgo invertida
   —sin consumidores todavía— haría falta cubrir el componente con pruebas primero.

**Recomendación.** Refactorizar a un `CampoBase` parametrizado por `type`, **acompañado de pruebas
unitarias**, antes de construir P-01 (M-22). Es el momento más barato: hoy no tiene consumidores.

### P-01 · Sin división de código por rutas · **Medio** · ⚠️ No corregido

El paquete de producción pesa **334 kB de JavaScript** (106 kB comprimido) **sin ninguna pantalla
todavía**. Proviene de React, el enrutador, TanStack Table, Formik, Yup, FontAwesome, axios y
date-fns.

Al retirar el legado, `routes.tsx` perdió la carga diferida: antes cada página se declaraba con
`lazy(() => import(...))` y `<Suspense>`. Ahora no hay páginas, así que no hay nada que dividir,
pero **la práctica se perdió con ellas**.

**Recomendación.** Restaurar `lazy` y `Suspense` al declarar las rutas en M-21, antes de que se
acumulen las nueve pantallas y `react-pdf`, que es pesado. Corregirlo después cuesta mucho más.

### P-02 · Dependencias de `useEffect` en `FilterByColumn` · **Bajo** · ⚠️ No corregido

Única advertencia de lint que queda. El efecto del retardo no declara `debounce` ni `onChange`. Con
los valores actuales funciona, pero si un consumidor pasara un `onChange` cambiante, el filtro
quedaría con una referencia obsoleta.

**Recomendación.** Resolver junto con D-01, en la misma pasada de endurecimiento con pruebas.

> **Nota posterior (2026-08-06).** Al cerrar M-22 propuse corregirlo en M-23, «que sí usa `Table`».
> M-23 **no** lo usa: `Table` filtra y pagina contra el servidor, y `GET /operativos` solo admite
> `fecha` y `formulario`. La premisa cayó, y tocar un componente que el módulo no monta sería trabajo
> fuera de su alcance. Queda para el primero que use `Table` de verdad —**M-27**, la administración
> de personal—, junto con la memoización de `findRecordsFn`. Sigue siendo la única advertencia de
> lint del repositorio.

### A-01 · `transporte-app` sin comprobación de salud · **Observación**

La base y el frontend declaran `HEALTHCHECK`; el backend no. Por eso aparece como `Up` y no como
`Up (healthy)`, y `depends_on` del frontend **solo puede esperar a que arranque, no a que esté
listo**.

**Recomendación.** Añadir una comprobación contra `/api/v1/estado`, que ya existe. Tres líneas.

### A-02 · El formato de error anida `message` · **Observación**

Un `404` devuelve hoy:

```json
{ "statusCode": 404, "message": { "message": "Cannot GET …", "error": "Not Found", "statusCode": 404 } }
```

El objeto de `HttpException` se incrusta dentro del campo `message`. Es incómodo de consumir.
**M-04 lo normaliza** al formato de §11.2; no se tocó aquí para no adelantar ese módulo.

### S-01b · `MODO_IDENTIDAD_PROVISIONAL=true` en el `.env` local · **Observación, no defecto**

Es correcto: en desarrollo debe estar activo, el arranque lo advierte en consola, y el
`docker-compose.yml` lo fija en `false` para el contenedor. Verificado: el contenedor **no** emite
la advertencia. Se deja constancia por ser el riesgo RT-05.

---

## 4. REVISIÓN POR DIMENSIÓN

### 4.1 Arquitectura · ✅ Conforme

| Verificación | Resultado |
|---|---|
| Cuatro capas por submódulo | Estructura preparada; sin submódulos de negocio todavía |
| `PrismaService` solo en la capa de datos | **0 referencias** fuera de `src/prisma/` |
| Sin TypeORM ni funciones `fu_*` | **0 coincidencias** |
| `app.module.ts` importa solo lo del módulo | `PrismaModule` y nada más |
| Módulo global de Prisma | `@Global()` correcto |
| Ciclo de vida de la conexión | Conecta al iniciar, desconecta con `enableShutdownHooks` |

### 4.2 NestJS · ✅ Conforme

`ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform` —la garantía del
contrato de dos campos de la DAF—, CORS con lista blanca, prefijo `/api/v1`, filtro global de
excepciones y advertencia de modo provisional en el arranque.

`RolesGuard` y `@Roles()` existen y son reutilizables, **pero no están registrados en ningún
endpoint**: corresponde a M-05. `permissions.decorator.ts` y `jwt-claims.interface.ts` quedan sin
uso hasta E12; se conservan deliberadamente.

### 4.3 React · ⚠️ Deuda heredada acotada

Los quince componentes preservados son sólidos y el sistema visual está intacto. La deuda que
quedaba era del proyecto de origen, no del módulo: código comentado, `console.log`, un `key={index}`
y una propiedad muerta. Todo corregido salvo D-01.

**El tema de daisyUI no se tocó**: los doce tokens de `index.css` siguen exactamente igual, en
ambos temas.

### 4.4 Base de datos · ⏳ Corresponde a M-02

`transportedb` en PostgreSQL 18.4, con zona horaria `America/Guayaquil` y codificación UTF8. Sin
tablas: las 27 llegan en M-02. El esquema de Prisma solo tiene generador y origen de datos, que es
lo que M-01 debía entregar.

### 4.5 Endpoints · ⏳ Corresponde a M-06 en adelante

Un solo endpoint, `GET /api/v1/estado`, verificado directo y a través del proxy del frontend.
Responde `404` sin el prefijo, lo que confirma que el prefijo global está activo.

### 4.6 Seguridad · ⚠️ Una corrección

Además de S-01, se verificó:

| Verificación | Resultado |
|---|---|
| CORS con origen ajeno | **Rechazado**: sin cabecera de permiso |
| CORS con `http://localhost:5176` | Permitido |
| Secretos en el repositorio | Ninguno. `.env` ignorado, `.env.example` sin valores |
| Contraseña en `docker-compose.yml` | Ninguna: viene de `DB_PASSWORD` y el arranque falla si no está |
| Usuario del contenedor | `nestjs`, no privilegiado |
| Datos personales en registros | Ninguno |

### 4.7 UX · ⚠️ Cuatro correcciones

Cubiertas en §2.2. El armazón —barra superior, barra lateral, doble tema, selector de perfil— está
íntegro y funcionando.

### 4.8 Rendimiento · ⚠️ Una mejora pendiente

| Medición | Valor |
|---|---|
| Paquete JavaScript | 334 kB · 106 kB comprimido |
| Hoja de estilos | 169 kB · 26 kB comprimido |
| Construcción del frontend | ~2 s |
| Arranque del backend | ~2 s, con conexión a la base |
| Contenedor sano | 15 s |

P-01 es la única mejora relevante. En el backend no hay nada que medir todavía: sin consultas.

### 4.9 Código duplicado · ⚠️ Uno corregido, uno reportado

Corregido el de `Table.tsx`. Pendiente D-01. No se detectó ninguna otra duplicación significativa:
la revisión de módulos sin consumidores confirmó que los diez «no usados» son el instrumental
preservado a propósito —`Table`, `FormikField`, los modales, `Paginacion`, `RutaProtegida`,
`httpClient`— que consumirán las nueve pantallas. **No es código muerto.**

### 4.10 Errores · ✅ Ninguno de compilación

Ni un error de compilación en ninguno de los dos repositorios, antes ni después de la revisión. Los
hallazgos fueron de calidad, seguridad y experiencia de usuario, no de tipos.

---

## 5. VERIFICACIÓN POSTERIOR A LAS CORRECCIONES

| Comprobación | Backend | Frontend |
|---|---|---|
| `npm run build` | **0** | **0** |
| `npm run lint:check` / `lint` | **0** | **0** errores · 1 advertencia |
| `npm test` | **0** · 1/1 | Sin suite todavía |
| `console.*` | 0 | 0 |
| `: any` | 0 | 0 |
| Cabeceras de otra aplicación | 0 | 0 |

**Pila reconstruida y en ejecución:**

```
transporte-front  Up (healthy)   5176 → 200 · proxy a la API → 200
transporte-app    Up             3003 → 200 · Prisma conectado
transportedb      Up (healthy)   5434 → PostgreSQL 18.4 · America/Guayaquil
```

---

## 6. ACCIONES RECOMENDADAS

| # | Acción | Cuándo | Prioridad |
|---|---|---|---|
| 1 | ✅ Refactorizar `FormikField` con pruebas (D-01) | **Antes de M-22** — hecho en M-22 | Alta |
| 2 | Restaurar `lazy` y `Suspense` en las rutas (P-01) | En M-21 | Alta |
| 3 | Añadir comprobación de salud al backend (A-01) | Cuando convenga | Media |
| 4 | Normalizar el formato de error (A-02) | M-04 | Media |
| 5 | Memoizar `findRecordsFn` en cada pantalla con `Table` | **M-27**: P-01 y P-02 no lo usan | Media |
| 6 | Resolver las dependencias de `FilterByColumn` (P-02) | Junto con la acción 1 | Baja |
| 7 | Decidir si la campana de avisos se conserva | Cuando se definan los canales NOT-01 a NOT-07 | Baja |

---

## 7. CONCLUSIÓN

El módulo está **bien asentado**. La arquitectura se respeta sin excepciones, el sistema visual no
se alteró, y las convenciones se cumplen de forma verificable por comando.

De los diecinueve hallazgos, **dieciséis venían heredados del proyecto de origen** y solo tres
tocaban código escrito para este módulo. Eso es esperable: los repositorios se adoptaron como
plantilla de arquitectura, y con ella vino su deuda.

Los dos que merecen atención antes de seguir son **S-01**, ya corregido, porque una fuga de detalle
interno en un sistema que nació de una filtración de información es especialmente inoportuna; y
**U-01**, un botón que dejaba al usuario en una pantalla en blanco y que ninguna herramienta podía
detectar: compilaba y pasaba lint.

Queda **D-01** como la única deuda consciente. Está sin resolver por criterio, no por descuido: el
momento correcto de tocar `FormikField` es con pruebas y antes de que nueve pantallas dependan de
él.

> **Nota posterior (2026-08-06).** Así ocurrió: D-01 se resolvió al inicio de M-22, con 19 pruebas y
> aún sin consumidores. La deuda consciente que queda es **P-02**, la advertencia de lint en
> `FilterByColumn`, que ahora sí puede corregirse con red y se propone para M-23 —el primer módulo
> que usa `Table`—.

---

*Fin de la revisión. Las correcciones están aplicadas y verificadas.*
