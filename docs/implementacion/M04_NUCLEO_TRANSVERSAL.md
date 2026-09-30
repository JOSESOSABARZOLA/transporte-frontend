# M-04 · NÚCLEO TRANSVERSAL
## Documentación de lo implementado — Cuadro de Colores Operativo · AMC

| | |
|---|---|
| **Módulo** | M-04 de `PLAN_DE_IMPLEMENTACION.md` |
| **Etapa** | E2 de `IMPLEMENTATION_GUIDE.md` |
| **Fecha** | 2026-08-05 |
| **Depende de** | M-01 (aprobado) |
| **Alcance** | Solo backend. **Ningún módulo aprobado fue modificado**; el frontend no se tocó |
| **Estado** | **Terminado.** 23 pruebas unitarias y los 7 casos del plan pasan |

---

## 1. QUÉ SE ENTREGÓ

| Elemento | Archivo |
|---|---|
| Los quince códigos de error | `common/errors/codigos-error.ts` |
| Seis clases de error sobre `ApplicationError` | `common/errors/errores-dominio.ts` |
| Filtro con el formato uniforme de §11.2 | `common/filters/http-exception.filter.ts` |
| Contexto de petición | `common/contexto/contexto-peticion.ts` |
| Correlación | `common/interceptors/correlacion.middleware.ts` |
| Traza de peticiones con duración | `common/interceptors/logging.interceptor.ts` |
| Registro estructurado sin datos personales | `common/logger/logger.service.ts` |
| Auditoría transaccional | `common/auditoria/auditoria.service.ts` · `.repository.ts` |
| Marca de tiempo con desfase horario | `common/utilidades/marca-tiempo.ts` |
| Paginación y respuesta paginada | `common/dto/paginacion.dto.ts` · `respuesta.dto.ts` |
| Módulo global | `common/common.module.ts` |

Más cuatro archivos de prueba con **23 casos**.

### 1.1 El formato uniforme de error

```json
{
  "correlacionId": "err-1",
  "timestamp": "2026-08-05T09:51:42.329-05:00",
  "ruta": "/api/v1/inexistente",
  "statusCode": 404,
  "codigo": "RECURSO_NO_ENCONTRADO",
  "mensaje": "El recurso solicitado no existe."
}
```

Los siete campos de `IMPLEMENTATION_GUIDE.md` §11.2. `detalles` solo aparece cuando hay algo que
detallar.

**La separación entre `mensaje` y `codigo` es deliberada.** El mensaje se muestra tal cual al
funcionario y debe nombrar a la persona o el recurso implicado; el código va dirigido al
desarrollador y permite al frontend reaccionar sin interpretar cadenas de texto. Resuelve un
problema declarado en las reuniones: hoy el personal desconoce por qué se rechaza una asignación y
quien digita no tiene forma de explicarlo.

### 1.2 El caso de la DAF, resuelto en el filtro

El `ValidationPipe` con `forbidNonWhitelisted` devuelve mensajes como
`property horaInicio should not exist`. El filtro los reconoce y los traduce:

```json
{
  "statusCode": 400,
  "codigo": "CAMPOS_NO_PERMITIDOS",
  "mensaje": "Esta operación no permite modificar horaInicio, puntoEncuentroId. Retire esos campos y vuelva a enviar.",
  "detalles": { "camposRechazados": ["horaInicio", "puntoEncuentroId"] }
}
```

Es el cuarto nivel de la restricción de la DAF de §16.2: ruta, contrato, validación y servicio. El
mensaje ya está redactado para el analista de transportes, no para el programador.

> **Corregido al probar M-06 · 2026-08-05.** El mensaje era un texto fijo sobre conductor y
> vehículo. `forbidNonWhitelisted` protege **todos** los contratos del módulo, no solo el de
> transporte: al rechazar un campo en `PUT /parametros/:clave`, el administrador leía una
> explicación sobre transportes que no tenía relación con lo que estaba haciendo. Ahora el mensaje
> nombra los campos rechazados, y sirve igual de bien a la DAF que a cualquier otro contrato.

### 1.3 Los 401 y 403 de NestJS, traducidos

El `RolesGuard` heredado no lanza un error del dominio: deja que Nest emita un `ForbiddenException`
con el texto `Forbidden resource`. Ese texto llegaba al funcionario, en inglés y con el código
`ERROR_INTERNO`. El filtro ahora traduce ambos estados:

| Estado | Código | Mensaje |
|---|---|---|
| `401` | `NO_AUTENTICADO` | El de la guarda si está en español; si no, «No se pudo identificar al usuario de la petición. Vuelva a iniciar sesión.» |
| `403` | `ROL_NO_AUTORIZADO` | El de la guarda si está en español; si no, «Su rol no tiene permiso para realizar esta operación.» |

Los `403` **con motivo** —formulario ajeno, cupo compartido— viajan como `AutorizacionError` con su
propio código y no pasan por esta traducción. `NO_AUTENTICADO` se suma a `ERROR_INTERNO`,
`VALIDACION` y `RECURSO_NO_ENCONTRADO` como código transversal: son distintos de los quince códigos
de negocio del catálogo, que siguen siendo quince.

### 1.4 Los errores de la base, traducidos

> **Añadido en el code review del 2026-08-05.** Ver `CODE_REVIEW.md` COR-02.

Dos situaciones ordinarias del usuario terminaban en «Ocurrió un error inesperado»: dos
administradores creando el mismo valor de catálogo a la vez, y modificar algo que otro acaba de dar
de baja. Ambas son cosas que el funcionario entiende y puede resolver.

| Código de Prisma | Estado | Mensaje |
|---|---|---|
| `P2002` · unicidad | `409` | «Ese valor ya está registrado. Actualice la pantalla y compruebe si otra persona acaba de crearlo.» |
| `P2025` · registro inexistente | `404` | «El registro que intenta modificar ya no existe. Actualice la pantalla.» |
| `P2003` · clave foránea | `409` | «El registro está en uso por otra información del cuadro y no se puede modificar así.» |

Se reconocen **por su `code`, sin importar `@prisma/client`**: el filtro es transversal y no debe
depender de la capa de datos. El nombre de la columna infringida no se le muestra al funcionario.

---

## 2. TRES CORRECCIONES QUE SOLO APARECIERON AL EJECUTAR

El ciclo implementar → compilar → probar → corregir encontró tres defectos que compilaban y pasaban
lint. Ninguno lo habría detectado el análisis estático.

### 2.1 El identificador de correlación se perdía antes de llegar al controlador

Implementado primero como interceptor, tal como lo nombra el plan. Al probarlo, **el registro salía
sin `correlacionId`**.

Causa: `AsyncLocalStorage` **no sobrevive al límite de RxJS**. Un interceptor devuelve el
`Observable`, y Nest se suscribe a él **fuera** del `run()`, de modo que el contexto se pierde antes
de que el controlador se ejecute.

### 2.2 Las respuestas de error 404 salían sin correlación

Los interceptores solo se ejecutan en **rutas emparejadas**. Una petición a una ruta inexistente no
pasaba por él, y su respuesta salía sin identificador de correlación, que es precisamente cuando más
falta hace para dar soporte.

**Ambos se resuelven con lo mismo:** un middleware de Express en lugar de un interceptor. Se ejecuta
antes del enrutador, para **toda** petición, y `next()` invocado dentro del `run()` propaga el
contexto a la cadena completa: controlador, servicio, repositorio y filtro de excepciones.

El archivo conserva la explicación para que nadie lo devuelva a interceptor creyendo que se apartó
del plan sin motivo.

> **Añadido en el code review del 2026-08-05 · `CODE_REVIEW.md` SEG-04.**
>
> El identificador que llega del cliente **se valida**; antes se usaba tal cual. El motivo no es
> teórico: `audi_correlacion` es `VARCHAR(60)`, y como la auditoría se escribe **dentro de la
> transacción** (DA-09), una cabecera más larga hacía fallar la inserción y con ella la operación
> completa. Un cliente con un identificador largo rompía toda escritura auditada.
>
> Se admite si cumple `[A-Za-z0-9._:-]{8,60}`; si no, se genera uno. La petición **no** se rechaza:
> es legítima, lo dudoso es la cabecera, y perder la correlación es peor que perder el valor que
> propuso el cliente.

### 2.3 La mitad del registro no era estructurado

Los mensajes internos de NestJS —`Starting Nest application`, `Mapped {/api/v1/estado, GET} route`—
salían como texto con color, mientras los propios salían en JSON. **Un registro donde la mitad de
las líneas son JSON y la otra mitad texto no es explotable.**

Corregido en dos pasos: `app.useLogger()` para que Nest emita por el registrador del módulo, y
`bufferLogs: true` para que los mensajes anteriores a esa llamada se retengan y se vuelquen con el
mismo formato.

Resultado verificado: **11 de 11 líneas de arranque en JSON**.

---

## 3. LA DECISIÓN DE DISEÑO DEL MÓDULO: LA AUDITORÍA NO ES UN INTERCEPTOR

El plan lista `auditoria.interceptor` como entregable, con la nota «registra escrituras **dentro de
la misma transacción**». **Esas dos cosas son incompatibles**, y conviene dejar claro por qué.

La decisión DA-09 exige que la auditoría se escriba en la misma transacción que la operación
auditada: *«una evidencia que puede perderse ante un fallo parcial no sirve como evidencia»*. Es el
propósito entero de la funcionalidad: el Product Owner declaró que hoy la responsabilidad recae
siempre sobre quien consolida, sin forma de demostrar quién cambió qué.

Un interceptor **se ejecuta fuera** de la transacción que el servicio abre después, así que no puede
participar en ella. La única forma de que lo hiciera sería que el interceptor abriese una
transacción para **toda** petición y la pasara hacia abajo, lo que obligaría a transaccionar también
las lecturas y a que cada servicio usara un cliente inyectado en lugar del suyo. Eso contradice
«toda escritura multitabla en `$transaction`» del propio servicio, y convertiría cada lectura en una
transacción abierta.

**Lo entregado en su lugar:**

```
AuditoriaService.registrar(datos, clienteDeTransaccion)
```

El servicio de negocio la invoca **dentro** de su propio `$transaction`, pasando el cliente. Así la
traza y la operación se confirman o se pierden juntas, que es lo que DA-09 pide.

El contexto —correlación, usuario y rol— **no hay que pasarlo**: viaja por `AsyncLocalStorage`. Y si
la identidad no está resuelta, `registrar` **falla**: una traza anónima no dice quién cambió qué,
que es lo único que esta funcionalidad debe garantizar.

`compararCambios` completa la pieza: recibe el registro anterior y el nuevo y devuelve solo los
campos que cambiaron, en el formato de `t_auditoria` (RF-062). Evita que cada servicio repita esa
comparación.

---

## 4. LA SUPRESIÓN DE DATOS PERSONALES ES ESTRUCTURAL, NO DISCIPLINA

`FASE4` §12.4 prohíbe registrar teléfonos, cédulas, contenido de órdenes de servicio y tokens.

Se podría haber cumplido con una regla de conducta: «no pases esos campos al logger». En su lugar,
**el servicio los suprime aunque se los pasen**:

```
{ funcionarioId: 118, telefono: '98 514 4231' }
      ↓
{ funcionarioId: 118, telefono: '[suprimido]' }
```

Recorre objetos anidados y arreglos. Es el mismo criterio que el análisis aplica al dato aislado de
la orden de servicio (HAL-04): convertir una regla que hay que recordar en una garantía de la
construcción.

> **Corregido en el code review del 2026-08-05 · `CODE_REVIEW.md` SEG-01, SEG-02 y SEG-03.**
>
> La primera versión comparaba **nombres exactos y sensibles a mayúsculas**. La garantía que este
> apartado describe no se cumplía: `telefono` se suprimía, pero `Telefono`, `telefonoContacto` y
> `cedulaFuncionario` salían íntegros. Con M-09 —personal, con teléfono y cédula— esos nombres
> compuestos son la norma.
>
> Ahora la comparación es **por raíz sobre el nombre normalizado**: sin acentos, en minúsculas y sin
> separadores. Diez raíces cubiertas, entre ellas `datoaislado`, que alcanza también a
> `oser_dato_aislado`.
>
> `clave` **salió** de la lista: en castellano designa tanto una contraseña como la clave de un
> parámetro, y suprimirla borraba de la traza de M-06 **qué** parámetro se había modificado. Las
> credenciales quedan cubiertas por `password`, `contrasena` y `claveacceso`.
>
> Además, la supresión está protegida contra referencias circulares y anidamientos desmedidos, y
> `JSON.stringify` no puede lanzar: el registrador lo invoca también el filtro de excepciones, y un
> desbordamiento de pila **ahí** dejaría la petición sin respuesta y sin traza.

Trece pruebas lo respaldan.

---

## 5. LA MARCA DE TIEMPO NO USA LA ZONA DEL PROCESO

`toISOString()` devuelve siempre UTC, y el formato de §11.2 muestra el desfase local:
`2026-07-31T09:14:22-05:00`.

La zona se toma de la configuración y **no** de la del proceso, por una razón concreta: `dotenv`
carga `TZ` **después** de que Node haya fijado su zona horaria, de modo que en desarrollo local el
proceso puede estar en una distinta a `America/Guayaquil`. Formatear con la zona explícita hace el
resultado independiente de dónde se ejecute.

En un módulo cuyas ventanas de carga, franjas nocturnas y cierres dependen de la hora, esto no es un
detalle cosmético. Cuatro pruebas lo cubren, incluida una que comprueba que la misma instancia
formateada en dos zonas distintas produce resultados distintos.

---

## 6. PRUEBAS

### 6.1 Los siete casos del plan

| # | Caso | Resultado |
|---|---|---|
| 1 | Petición con `x-correlation-id` | El mismo identificador vuelve en la cabecera y aparece en el registro |
| 2 | Petición sin la cabecera | El servidor genera un UUID y lo propaga |
| 3 | Error con el formato de §11.2 | Los siete campos, con `mensaje` en lenguaje operativo |
| 4 | Fallo a mitad de una escritura | La auditoría se escribe con el cliente de la transacción: se pierde con ella |
| 5 | Teléfonos o cédulas en los registros | **Ninguno** |
| 6 | Registro de una orden de servicio | `datoAislado` sale como `[suprimido]` |
| 7 | Arranque con `MODO_IDENTIDAD_PROVISIONAL` | Advierte en local; **ausente en el contenedor**, donde el compose lo pone en `false` |

### 6.2 Las 23 pruebas unitarias

| Suite | Casos | Qué cubre |
|---|---|---|
| `errores-dominio.spec.ts` | 5 | Herencia, estado HTTP de cada error, códigos y detalles, y que sean quince |
| `marca-tiempo.spec.ts` | 4 | Formato con desfase, Guayaquil, independencia de la zona del proceso, UTC como `Z` |
| `logger.service.spec.ts` | 6 | Supresión de teléfono, cédula, orden, credenciales, anidados y arreglos |
| `auditoria.service.spec.ts` | 7 | Contexto, **propagación del cliente de transacción**, rechazo sin identidad, una fila por campo, comparación de cambios |
| `app.controller.spec.ts` | 1 | Preexistente |

### 6.3 Compilación y ejecución

| Verificación | Resultado |
|---|---|
| `npm run build` | **0** |
| `npm run lint:check` | **0** |
| `npm test` | **0** · 23/23 |
| `npm run prisma:verificar` | **0** |
| Imagen de Docker y contenedor | Arranca, registro estructurado, correlación en los errores |
| Frontend | **Sin cambios** |

---

## 7. LO QUE NO ENTRA EN ESTE MÓDULO

| Elemento | Dónde va |
|---|---|
| Las cuatro guardas de autorización | **M-05** |
| Resolver `usuarioId` y `rol` | M-05. El contexto ya tiene `registrarIdentidad()` preparado para que `IdentidadGuard` lo llame |
| Escribir trazas de auditoría reales | M-06 en adelante: cada servicio la invoca dentro de su transacción |
| Emitir eventos de dominio | M-13 en adelante |

---

## 8. ARCHIVOS

| Archivo | Cambio |
|---|---|
| `common/errors/codigos-error.ts` | **Nuevo** |
| `common/errors/errores-dominio.ts` | **Nuevo** |
| `common/errors/errores-dominio.spec.ts` | **Nuevo** |
| `common/contexto/contexto-peticion.ts` | **Nuevo** |
| `common/interceptors/correlacion.middleware.ts` | **Nuevo** |
| `common/interceptors/logging.interceptor.ts` | **Nuevo** |
| `common/logger/logger.service.ts` + `.spec.ts` | **Nuevo** |
| `common/auditoria/auditoria.service.ts` + `.repository.ts` + `.spec.ts` | **Nuevo** |
| `common/utilidades/marca-tiempo.ts` + `.spec.ts` | **Nuevo** |
| `common/dto/paginacion.dto.ts` · `respuesta.dto.ts` | **Nuevo** |
| `common/common.module.ts` | **Nuevo** |
| `common/filters/http-exception.filter.ts` | Reescrito al formato §11.2 |
| `app.module.ts` | Importa `CommonModule` |
| `main.ts` | Middleware de correlación, registrador unificado, interceptor y filtro |

Sin cambios en el esquema, las migraciones, la semilla ni el frontend.

---

*Fin de la documentación de M-04. A la espera de aprobación.*
