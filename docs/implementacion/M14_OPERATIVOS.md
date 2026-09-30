# M-14 · Operativos: registro, edición y baja

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E6 · Bloque D · Prioridad **P1 · Alta** · Dependencias M-07, M-09, M-12 y M-13
Desbloquea M-15, M-17, M-19 y M-22 · Fecha: 2026-08-06

---

## 0. ES EL NÚCLEO

Todo lo construido en los trece módulos anteriores existe para que esta operación sea posible, y
todo lo posterior parte de lo que aquí se guarda. Es también el primer submódulo que declara **la
cadena de autorización completa**:

```
IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard → DTO → Servicio
     401            403             403                 423            400     409
```

| Regla | Qué exige |
|---|---|
| RN-09 a RN-12 | El identificador se genera y el secuencial reinicia cada día, por formulario |
| RN-13 | El operativo se reprograma sin perder su identificador |
| RN-17 a RN-20 | Ubicación y tipo de control, del catálogo delimitado o capturados como adicionales |
| RN-40 | Conductor y vehículo **nacen nulos**: solo la DAF los completa |
| INV-06 a INV-08 | Horario válido, punto de la zonal y del formulario, tipo del formulario |
| PER-01, PER-02, PER-03 | Nadie escribe en formularios ajenos; cada perfil ve lo suyo; la DAF no crea ni elimina |
| VAL-32 | La colisión de secuencial se resuelve internamente |

---

## 1. ARCHIVOS

Seis nuevos, más tres de prueba, **más una migración**.

```
src/modules/operativos/
├── domain/
│   └── clasificacion-control.ts        + .spec.ts   17 pruebas   ← NUEVO
├── application/
│   ├── operativos.service.ts           + .spec.ts   33 pruebas
│   └── generador-identificador.service.ts + .spec.ts 11 pruebas  ← POL-04
├── infrastructure/
│   └── operativos.repository.ts
├── presentation/
│   ├── dto/operativo.dto.ts
│   └── operativos.controller.ts
└── operativos.module.ts

test/
└── operativos.integracion-spec.ts                   36 pruebas

prisma/migrations/
└── 20260806120000_agrega_baja_logica_al_operativo/
```

Los cuatro objetos de valor —`RangoHorario`, `IdentificadorOperativo`, `UbicacionOperativa`,
`EstadoTransporte`— ya existían desde M-09 y **no se tocaron**. `ClasificacionControl` es la
segunda mitad que M-09 dejó anunciada en su propio código.

**Modificados, los tres de forma aditiva:**

| Archivo | Cambio | Por qué |
|---|---|---|
| `formularios.repository.ts` y `formularios.service.ts` | `obtenerPrefijos(formularioId)` | `operativos` necesita el prefijo del identificador y no puede leer `t_formulario_prefijo`: la delimitación es de `configuracion` |
| `common/auth/auth.module.ts` | Exporta los dos repositorios de las guardas | Ver §6 |
| `src/app.module.ts` | Registra `OperativosModule` | — |

---

## 2. LA MIGRACIÓN: `oper_activo` (PV-10)

El plan exige que la baja sea **lógica** y el esquema aprobado no traía la columna:
`oper_alerta_activa` es otra cosa —si el operativo tiene alertas pendientes—.

El borrado físico no era alternativa:

- **RN-12 numera por día y formulario.** Borrar el 002 deja un hueco permanente en la numeración
  de la jornada, y esa numeración se imprime en la matriz.
- **`uq_operativo_cuad_form_sec` impide reutilizar el secuencial liberado**, así que el hueco no
  se puede cerrar después.
- **`t_auditoria` referencia el operativo con `ON DELETE SET NULL`**: borrarlo dejaría la traza
  sin el registro que explica, justo cuando más falta hace.

Sin índice nuevo, a propósito: el filtro por `oper_activo` acompaña siempre al filtro por cuadro y
formulario, que ya cubre `idx_operativo_cuad_form`. `npm run prisma:verificar` sigue dando **27
tablas, 11 enumerados, 24 restricciones y 7 índices parciales**.

---

## 3. LAS DOS GARANTÍAS QUE VIVEN EN LA BASE

Están en el repositorio y no en el servicio porque **solo la base puede darlas**.

### 3.1. El secuencial diario (RN-12, VAL-32)

```
1. Abrir transacción
2. Contar los operativos del cuadro y formulario   ← mismo cliente
3. Insertar con secuencial = conteo + 1            ← mismo cliente
4. Si la restricción única falla, reintentar (hasta 3)
5. Confirmar
```

Contar fuera y crear dentro dejaría una ventana entre las dos operaciones, que es exactamente el
momento en el que dos departamentos registran a la vez a las 14H50. La garantía real es
`uq_operativo_cuad_form_sec`; el reintento resuelve la colisión y **el funcionario no ve nada**.

Agotados los tres intentos el error sale tal cual: tres colisiones seguidas ya no son concurrencia
normal, y ocultarlas sería peor que mostrarlas.

**El secuencial de un operativo retirado no se reutiliza.** El conteo incluye los dados de baja:
volver a emitirlo produciría dos códigos iguales en dos órdenes de servicio distintas.

### 3.2. El bloqueo optimista

`UPDATE ... WHERE id = ? AND version = ?` con `version: { increment: 1 }` en la misma sentencia.
Si no afecta ninguna fila, alguien guardó antes y se responde `409 CONFLICTO_CONCURRENCIA`.

Leer la versión y escribir después dejaría el mismo hueco que en el punto anterior. Por eso
`version` es **obligatoria** en el DTO de edición y de baja: sin ella, dos asistentes editando el
mismo operativo se sobrescriben en silencio y el último gana sin saberlo.

---

## 4. EL IDENTIFICADOR, Y DÓNDE SE DETIENE (PV-27)

Formato `INSP-001-15-SEP-2026`, de los mockups aprobados de FASE5. El servicio elige el prefijo y
compone; **no decide el secuencial**, que llega del repositorio.

`t_formulario_prefijo` admite un prefijo por área —el formulario 8 usa `IG` o `IT`— y **ninguna
fuente define el criterio de selección**. Tampoco podría aplicarse todavía: el personal se asigna
en M-15, después de que el operativo exista y ya tenga su código impreso. Por eso:

1. Si hay un prefijo marcado como predeterminado, ese.
2. Si no lo hay y existe uno solo, ese.
3. Si hay varios y ninguno es predeterminado, **se detiene nombrando el formulario**.

Elegir por orden alfabético produciría un código institucional que no significa lo que aparenta.
Ver **PV-27**.

### 4.1. Un error que la prueba encontró antes que la producción

`cuad_fecha` es `@db.Date` y se maneja en UTC en todo el sistema, pero `IdentificadorOperativo`
—de M-09— lee día, mes y año con los captadores **locales**. En Quito, UTC-5, pasarle la fecha UTC
directamente imprimiría **el día anterior**: `2026-08-05` saldría como `04-AGO-2026`.

La conversión se hace en el borde, dentro del generador, y no dentro del objeto de valor:
cambiarlo a él modificaría un módulo ya entregado y su lectura dejaría de ser simétrica con su
escritura. Tiene dos pruebas propias, una de ellas sobre el 1 de enero.

---

## 5. API

Prefijo `/api/v1`.

| Método | Ruta | Roles | Guardas |
|---|---|---|---|
| `GET` | `/operativos?fecha=&formulario=&pagina=&tamanio=` | Los tres de carga, `DAF`, `DIRECTOR` | Identidad, Roles |
| `GET` | `/operativos/:id` | Ídem, según propiedad | Identidad, Roles |
| `POST` | `/operativos` | **Solo los tres de carga** | Las cuatro |
| `PATCH` | `/operativos/:id` | Rol dueño | Identidad, Roles, Ventana |
| `DELETE` | `/operativos/:id?version=` | Rol dueño | Identidad, Roles, Ventana |

**El listado es paginado** —`{ datos, meta }`, tamaño máximo 200—, y no por prolijidad: un cuadro
con la carga real de los nueve formularios devuelto entero es la consulta que la Dirección abre
todos los días.

### Quién escribe

Solo `DMIP_OPERATIVOS`, `DMIP_INSPECCIONES` y `DMIT_INSTRUCTOR`. La DAF **no crea ni elimina
operativos** (PER-03): su escritura son dos campos y llega en M-17. El `DIRECTOR` tampoco —caso 11
del plan—: su papel es revisar y cerrar.

### Quién consulta

Los tres de carga reciben ya filtrado lo que les corresponde; la DAF y la Dirección ven la jornada
completa, porque la primera asigna transporte en los nueve formularios y la segunda responde por el
cuadro entero. **El filtrado ocurre en la consulta, no en el cliente** (PER-02).

### Errores

| Situación | HTTP | Código |
|---|---|---|
| `conductorId`, `identificador` o `secuencial` en el cuerpo | 400 | `CAMPOS_NO_PERMITIDOS` |
| Hora fuera de la media hora, sin zonal, dos puntos a la vez | 400 | `VALIDACION` |
| Punto o tipo ajenos al formulario, punto de otra zonal | 400 | `VALIDACION` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| `DIRECTOR` o `DAF` registrando | 403 | `ROL_NO_AUTORIZADO` |
| Formulario ajeno, o rol compartido registrando | 403 | `FORMULARIO_NO_AUTORIZADO` |
| Fuera de la ventana de carga | 423 | `VENTANA_CARGA_CERRADA` |
| Jornada inexistente u operativo retirado | 404 | `RECURSO_NO_ENCONTRADO` |
| Cuadro cerrado | 409 | `CUADRO_CERRADO` |
| Versión desactualizada | 409 | `CONFLICTO_CONCURRENCIA` |

---

## 6. DOS COSAS QUE NO PUDO HACER LA GUARDA, Y POR QUÉ

### 6.1. `FormularioRolGuard` solo actúa en el registro

La guarda lee el código del formulario **de la petición**. En `POST` viaja en el cuerpo, y ahí
funciona. En `PATCH` y `DELETE` la ruta lleva el identificador del operativo: la guarda no tiene de
dónde sacar el formulario.

Hacer que lo cargue pondría acceso a una tabla de negocio dentro de la cadena de autorización
—que `common/auth` evita a propósito— y consultaría el operativo dos veces. **La comprobación vive
en el servicio y produce el mismo `403 FORMULARIO_NO_AUTORIZADO`.**

### 6.2. Compartir no es ser dueño (PER-06)

Para la guarda, compartir un formulario es una forma de acceso: deja pasar al rol compartido. Pero
el DMIT tiene **cupo de una persona** en el formulario 6, no la potestad de crear operativos en él.
El servicio lo rechaza al registrar, con un mensaje que explica exactamente eso.

Lo descubrió la prueba de integración: la unitaria no lo veía porque la guarda no participa en
ella. En el listado, en cambio, el rol compartido **sí** ve esos operativos: en M-15 tiene que
encontrarlos para asignar a su persona, y el listado no puede discrepar de la consulta directa.

### 6.3. `AuthModule` tuvo que exportar dos repositorios

`@UseGuards(Clase)` construye la guarda en el inyector del módulo que declara el controlador. Sin
exportar `FormularioAutorizacionRepository` y `VentanaCargaRepository`, las dos guardas no se
podían instanciar fuera de `common/auth`. M-14 es el primer submódulo que declara la cadena
completa, así que es aquí donde apareció. Exportarlos no abre acceso a nadie: son de solo lectura y
ningún servicio de negocio los inyecta.

---

## 7. LO QUE ESTE MÓDULO NO IMPLEMENTA, Y ES DELIBERADO

| Fuera de alcance | Dónde va | Por qué no aquí |
|---|---|---|
| `personal[]` en el DTO de registro | **M-15** | Asignar personal exige el veredicto de elegibilidad, el cupo compartido y el cálculo de alertas. Adelantarlo sería implementar M-15 dentro de M-14 |
| `oper_alertas` y `oper_alerta_activa` calculadas | **M-15** | Ídem. Hoy nacen con el valor por defecto del esquema |
| Conductor y vehículo | **M-17** | RN-40. `DatosOperativo` ni siquiera declara los campos: no se pueden enviar por descuido |
| Reglas de descanso | **`talento-operativo`** | Regla 1 de CLAUDE.md. Si aparecen aquí, es un defecto |

También quedan fuera, por decisión explicada en el propio DTO: **`cuadroFecha` y
`formularioCodigo` no se pueden editar**. Los dos componen el identificador ya emitido; cambiarlos
dejaría un código impreso en la matriz que ya no corresponde a lo que nombra. Mover un operativo a
otro día o a otro formulario es registrar otro y retirar este.

---

## 8. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npx prisma migrate deploy` | `transporte-backend` | migración #6 aplicada |
| `npm run prisma:verificar` | `transporte-backend` | 27 tablas, 11 enums, 24 CHECK, 7 índices |
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **36 suites · 493 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **7 suites · 145 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker exec transporte-app npx prisma migrate deploy` | — | sin migraciones pendientes |
| `docker logs transporte-app` | — | las cinco rutas mapeadas |

### 8.1. Los trece casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Registrar en formulario propio | `201` con identificador generado | ✅ `INSP-001-15-SEP-2026` |
| 2 | Registrar en formulario ajeno | `403 FORMULARIO_NO_AUTORIZADO` | ✅ |
| 3 | Enviar `conductorId` | `400 CAMPOS_NO_PERMITIDOS` | ✅ también con `identificador` y `secuencial` |
| 4 | Dos fechas distintas | Ambas empiezan en `001` | ✅ |
| 5 | Dos registros concurrentes | Secuenciales distintos, sin error visible | ✅ dos `POST` en paralelo |
| 6 | Estado inicial | `PENDIENTE`, conductor y vehículo nulos, alerta activa | ✅ comprobado en la base |
| 7 | Hora `08:15` | `400`, granularidad de 30 minutos | ✅ |
| 8 | Sin ninguna zonal | `400`, elija al menos una zonal | ✅ |
| 9 | Punto de catálogo y punto libre | `400` | ✅ |
| 10 | Editar con `version` desactualizada | `409 CONFLICTO_CONCURRENCIA` | ✅ |
| 11 | `DIRECTOR` registrando | `403` | ✅ la DAF tampoco |
| 12 | Consulta con rol departamental | Solo sus filas | ✅ verificado en la respuesta |
| 13 | Fallo a mitad del registro | Nada persiste | ✅ transacción real, con recuento antes y después |

El caso 13 no se simula con dobles: la prueba abre una transacción real contra PostgreSQL, inserta
el operativo con sus zonales e instituciones, lanza un error y comprueba que el recuento vuelve a
ser el de antes.

---

## 9. PENDIENTE DE VALIDACIÓN

- **PV-27 · Criterio de prefijo por área.** Se detiene con un mensaje claro cuando el formulario
  tiene varios y ninguno es predeterminado. Ver §4.
- **PV-10 · Baja física o lógica.** Implementada como **lógica**, con la migración de §2.
- **PV-15 · Número de códigos por formulario.** Se toman los prefijos enumerados, sin criterio de
  selección: es la otra cara de PV-27.
- **PV-16 · Antelación mínima entre registro e inicio del operativo.** Sin validación: ninguna
  fuente define el umbral, y uno inventado impediría registrar un operativo urgente.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
