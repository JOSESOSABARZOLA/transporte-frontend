# M-21 · Base del frontend

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E9 · Bloque G · Prioridad **P1 · Alta** · Dependencia M-07
Desbloquea M-22 a M-29 · Fecha: 2026-08-06

---

## 0. QUÉ HABILITA ESTE MÓDULO

Ninguna pantalla. **La posibilidad de que existan.** Interfaces del dominio, seis servicios sobre
`httpClient`, cuatro hooks de consulta, las nueve rutas con carga diferida y la navegación por rol.

Y una cosa más, que era la que impedía todo lo demás: **la primera llamada a la API que funciona**.

| Requisito | Qué exigía |
|---|---|
| I-01 · `CODE_REVIEW.md` | `httpClient` no enviaba `x-usuario-prueba`: toda petición recibía `401` |
| P-01 · `MODULE_REVIEW.md` | Restaurar la carga diferida antes de acumular las nueve pantallas |
| PER-07 | Los ítems ajenos, **atenuados y no ocultos** |

---

## 1. ARCHIVOS

Diecisiete nuevos.

```
src/
├── api/
│   └── identidadProvisional.ts        ← I-01
├── interfaces/
│   ├── CuadroDiario.ts · Formulario.ts · Operativo.ts
│   ├── Personal.ts · Transporte.ts · Documento.ts · Alerta.ts
├── services/
│   ├── cuadroDiario.service.ts · catalogoCuadro.service.ts
│   ├── operativo.service.ts · personal.service.ts
│   ├── transporte.service.ts · documento.service.ts
├── hooks/
│   ├── useConsulta.ts (base)
│   ├── useCuadroDiario.ts · useFormulariosPermitidos.ts
│   ├── useCatalogosFormulario.ts · useVentanaCarga.ts
├── utils/
│   ├── horario.util.ts · errorApi.util.ts
└── pages/
    └── PantallaPendiente.tsx          ← temporal, M-22 a M-29 la sustituyen
```

**Modificados:** `httpClient.ts` (I-01), `usuariosPrueba.ts` y `UserProvider.tsx` (clave
compartida), `routes.tsx` (nueve rutas con `lazy`), `MenuDropdownParts.tsx` (PER-07) y
`docker-compose.yml` del backend (§3).

**Dependencia instalada:** `react-pdf@10.4.1`, la única autorizada en `IMPLEMENTATION_GUIDE.md`
§4.2. No se agregó ninguna otra.

---

## 2. I-01 · LA CABECERA QUE FALTABA

El backend resuelve la identidad con `x-usuario-prueba` mientras el microservicio contra Active
Directory no exista. `httpClient` **no la enviaba**, y sin ella toda petición recibe `401`. Estaba
registrado desde el segundo Code Review y asignado a este módulo por ser el primero que llama a la
API.

Se resuelve **en el mismo punto donde entrará el token real**: el interceptor de petición. Cuando
llegue la identidad definitiva se sustituye una cabecera por otra y nada más cambia.

`identidadProvisional.ts` lee el perfil de `localStorage` y **no del contexto de React**, porque
`httpClient` es un módulo y no puede consumir un contexto. Para que las dos piezas no tengan cada
una su cadena, la clave se declara una sola vez en `usuariosPrueba.ts` —el archivo que desaparece
completo en E12— y la importan tanto el proveedor como el cliente.

**Verificado contra el backend en ejecución:**

| Petición | Respuesta |
|---|---|
| `GET /api/v1/formularios/permitidos` sin cabecera | `401` |
| Ídem con `x-usuario-prueba: 1` | `200` |

---

## 3. EL CONTENEDOR RESPONDÍA 401 A TODO

Al comprobar lo anterior apareció algo que ninguna prueba del backend podía detectar: sus 278
pruebas de integración corren contra la base local, donde `.env` tiene
`MODO_IDENTIDAD_PROVISIONAL=true`.

**El contenedor lo forzaba a `"false"`** en el bloque `environment:` de `docker-compose.yml`. Con el
modo desactivado, `IdentidadGuard` **ignora la cabecera** —correctamente: en producción no debe
existir— y responde `401`. Como el frontend apunta al puerto 3003, que es ese contenedor, **ninguna
pantalla habría podido consumir la API**, y el síntoma habría sido un `401` inexplicable en M-22.

La corrección es quitar esa línea, no cambiar su valor: las demás variables de ese bloque describen
la red interna de Docker —puerto, cadena de conexión, CORS, zona horaria— y se fijan a propósito.
Esta es una decisión del desarrollador, y vuelve a `.env`, donde vale `true` en desarrollo;
`.env.example`, que es la plantilla de despliegue, la deja en `false`.

Tras recrear el contenedor, la misma comprobación de §2 devuelve `401` sin cabecera y `200` con
ella.

---

## 4. CARGA DIFERIDA · REQUISITO P-01

Las nueve rutas se declaran con `lazy` y cada una con **su propio `Suspense`**. Con un único límite
en la raíz, cambiar de pantalla vaciaría toda la zona de contenido, incluida la cabecera de la
jornada que ya estaba dibujada.

El orden importa: `RutaProtegida` **envuelve** a `Suspense`, no al revés. Invertido, la aplicación
descargaría el paquete de una pantalla para descubrir después que el rol no puede verla — justo el
trabajo que la carga diferida evita.

La construcción lo confirma: `PantallaPendiente` sale en **su propio fragmento** de 0,62 kB, separada
del paquete principal. Cuando M-25 traiga `react-pdf`, entrará en el fragmento de la matriz y no en
el de todos.

### Las nueve rutas existen desde hoy

Con un marcador temporal, `PantallaPendiente`, que dice **qué módulo trae cada vista**. No es
decoración: sin rutas declaradas, entrar por URL a una pantalla ajena no redirige a ninguna parte y
**el caso 2 del plan no se puede verificar**. Cada módulo de M-22 a M-29 sustituye una referencia
sin tocar el resto del archivo.

---

## 5. PER-07 · ATENUADOS, NO OCULTOS

La navegación **filtraba** los ítems no autorizados. Eso contradice PER-07 y el caso 3 del plan: el
usuario tiene que comprender que la opción existe y no le corresponde.

Un menú que cambia de tamaño según el perfil hace pensar que la aplicación es distinta para cada
quien, y quien busca «Matriz Consolidada» sin encontrarla acaba preguntando por teléfono — que es el
canal que este sistema existe para reemplazar.

Ahora se renderizan con `opacity-40`, `pointer-events-none`, `aria-disabled` y un `title` que
explica por qué. Ninguna clase nueva: todas están inventariadas en FASE5 §2.2.

---

## 6. LOS SEIS SERVICIOS

Todos sobre `httpClient`, que ya resuelve correlación, identidad y normalización de errores. Una
llamada suelta con `axios` se saltaría las tres.

| Servicio | Consume |
|---|---|
| `CuadroDiarioService` | M-13 · jornada, apertura, cierre y reapertura |
| `CatalogoCuadroService` | M-07 y M-08 · formularios permitidos, catálogos, puntos por zonal, ventana |
| `OperativoService` | M-14 y M-15 · registro, edición, baja, personal |
| `PersonalService` | M-10 y M-12 · maestro, ausencias y **elegibles con su veredicto** |
| `TransporteService` | M-17 y M-18 · asignación, propios medios, capacidad |
| `DocumentoService` | M-19 y M-20 · matriz, exportación, órdenes |

**Ninguno captura errores.** Los dejan pasar tal como los normaliza `httpClient`, para que la
pantalla decida con `presentarError()`. Un `catch` aquí, aunque solo registrara, haría que el aviso
llegara sin el código que decide cómo mostrarlo.

Las rutas se escribieron **contra los controladores reales**, no contra el plan: `GET
/formularios/permitidos` y no `/formularios`, `GET /ventanas/estado` y no `/ventanas/mi-estado`,
`GET /formularios/:codigo/zonales/:zonalId/puntos` con la zonal en la ruta y no en la consulta. La
primera versión de este módulo las tenía como las imaginaba y habrían fallado con `404` en M-22.

---

## 7. LA TABLA DE ERRORES

`errorApi.util.ts` traduce la respuesta del servidor a una decisión de interfaz, exactamente como
pide el plan:

| Código | Trato | Comportamiento |
|---|---|---|
| 400 | `campo` | Marca los campos que el servidor nombra en `detalles` |
| 401 · 403 | `permiso` | Aviso de que el perfil no tiene permiso |
| 404 · 409 | `conflicto` | Aviso destacado, **sin perder lo capturado** |
| 423 | `ventana` | Bloquea el formulario y muestra la hora de reapertura |
| 500 y otros | `generico` | Mensaje genérico **más el identificador de correlación** |
| Sin respuesta | `generico` | Aviso de falta de comunicación |

**El `mensaje` del servidor se muestra tal cual**, salvo en el trato genérico —donde puede ser un
volcado interno—. Está redactado para el funcionario y nombra a la persona implicada: reescribirlo
lo convertiría en «error de validación», que es lo que el backend se prohíbe a sí mismo.

`conservaCaptura` es `true` en todos los casos: **nunca se descarta lo escrito**. Perder un
operativo completo por un `409` sería la peor forma de enseñar la regla.

---

## 8. `horario.util.ts` ES UN ESPEJO, NO UNA DECISIÓN

`RangoHorario` de M-09 es el archivo de mayor riesgo del sistema: un defecto en el cruce de
medianoche no produce un error visible, produce un funcionario asignado a dieciséis horas seguidas.

Este archivo evita que el funcionario viaje al servidor para enterarse de que `08:15` no es una hora
válida, y **nada más**. Si alguna vez discrepan, manda el servidor. Por eso **no copia el
solapamiento ni la condición nocturna**: son las dos operaciones de las que depende una regla de
descanso, y tenerlas aquí invitaría a usarlas para decidir en lugar de para adelantar un aviso.

---

## 9. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm install react-pdf@10.4.1` | `transporte-frontend` | instalada, la única autorizada |
| `npm run lint` | `transporte-frontend` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | `transporte-frontend` | **código 0** · fragmento diferido separado |
| `docker compose up -d transporte-app` | `transporte-backend` | contenedor recreado |
| Comprobación HTTP con y sin cabecera | — | `401` / `200` |

### 9.1. Los seis casos del plan

| # | Caso | Resultado | Cómo se verificó |
|---|---|---|---|
| 1 | Cambiar de perfil | La navegación cambia; se aterriza en la primera vista permitida | **Pendiente de comprobación en el navegador** |
| 2 | Entrar por URL a una ruta no autorizada | Redirige | `RutaProtegida` en las nueve rutas; **pendiente en el navegador** |
| 3 | Ítems no autorizados | Visibles pero atenuados y bloqueados | Implementado en §5; **pendiente en el navegador** |
| 4 | Petición desde cualquier servicio | Lleva `x-correlation-id` | ✅ verificado contra el backend: se envía y **vuelve el mismo valor** |
| 5 | `grep` de `axios` fuera de `httpClient` | Sin coincidencias | ✅ `axios` se importa **solo** en `httpClient.ts` |
| 6 | `npm run lint` y `npm run build` | Código de salida 0 | ✅ los dos |

### 9.2. Qué NO se pudo verificar automáticamente, y por qué

**El frontend no tiene ejecutor de pruebas.** No hay `vitest` ni `jest` en `package.json`, y
añadirlo sería una dependencia nueva que este módulo no tiene autorizada. Los casos 1, 2 y 3 son
comportamiento en el navegador y **quedan pendientes de comprobación manual**; se declaran así en
lugar de darlos por buenos.

Lo que sí se verificó de forma objetiva: las dos comprobaciones estáticas (casos 4 y 5), la
construcción con el fragmento diferido separado, y **la cabecera de identidad contra el backend en
ejecución**, que es la que decidía si algo de esto podía funcionar.

> **Incorporar un ejecutor de pruebas al frontend merece decidirse antes de M-22.** Nueve pantallas
> con formularios, tablas y estados de error son mucho para dejar sin red. Es una dependencia
> nueva: se pregunta, no se instala.

---

## 10. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Dónde va |
|---|---|
| Las nueve pantallas | **M-22 a M-29** |
| Refactorización de `FormikField` (D-01) | Requisito previo de **M-22**, con sus pruebas |
| Componentes de `components/cuadro/` | Cada pantalla trae los suyos |
| Identidad real | **E12** |

---

## 11. PENDIENTE DE VALIDACIÓN

- **Comprobación en el navegador de los casos 1, 2 y 3.** Ver §9.2.
- **Ejecutor de pruebas para el frontend.** Decisión previa a M-22.
- **PV-24 · `@tanstack/react-query`.** Sigue sin instalarse: `useConsulta` cubre lo que hace falta
  hoy —pedir, mostrar y volver a pedir—, sin caché ni dependencia nueva.
- **Una advertencia de lint heredada** en `FilterByColumn.tsx`, anterior a este módulo. No se tocó:
  el componente no tiene consumidores todavía y arreglarlo sin pruebas es arriesgarse a cambiar su
  comportamiento a ciegas.

---

**Estado: implementado, compilado y documentado. A la espera de aprobación.**
