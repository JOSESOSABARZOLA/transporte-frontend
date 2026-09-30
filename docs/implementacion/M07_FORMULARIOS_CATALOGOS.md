# M-07 · Formularios y catálogos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E3 · Bloque B · Prioridad P1 · Dependencias M-03 y M-05 · Desbloquea M-14, M-21 y M-28
Fecha: 2026-08-05

---

## 0. QUÉ SE ENTREGA, Y QUÉ NO

Los nueve formularios son la estructura del cuadro: cada uno pertenece a un departamento, tiene
su color, su política de vehículo y **sus propios catálogos** de puntos de encuentro, tipos de
control e instituciones. Este módulo publica esa definición y permite administrar los catálogos.

Se entrega **completo el backend**: cinco endpoints de consulta y nueve de administración, con sus
servicios, repositorios, validaciones, autorización, auditoría y 48 pruebas.

**No se entrega frontend, y no por falta de tiempo.** El propio plan lo dice en la ficha de M-07:

> **Frontend.** Consumido por M-21 (hooks y servicios) y M-28 (pantalla P-08).
> **Componentes React.** —

Los hooks y servicios de este dominio son el módulo **M-21**, y la pantalla de catálogos es
**M-28**. Construirlos ahora sería implementar dos módulos posteriores por adelantado, justo lo
que la instrucción «no continúes con el siguiente módulo» pide evitar. Dos apuntes adicionales
para cuando llegue ese momento:

| Lo pedido en el encargo | Lo que hay en el proyecto |
|---|---|
| React Query | **No está en el stack aprobado.** El acceso a datos es `src/api/httpClient.ts` |
| React Hook Form | **No está en el stack aprobado.** Los formularios son **Formik + Yup** |

Ambas son dependencias nuevas y `transporte-frontend/CLAUDE.md` §2 es explícito: *«Si una tarea
parece necesitar una librería nueva, avisa primero»*. Queda planteado para decidirlo antes de
M-21; el frontend **no se tocó** en este módulo y sigue compilando y pasando lint.

---

## 1. ARCHIVOS

Diez archivos nuevos en el backend, más tres de prueba y una migración.

```
prisma/migrations/20260805170000_agrega_captura_libre_al_formulario/
└── migration.sql                                   RN-20 · una columna (ver §2)

src/common/utilidades/
└── texto.ts                                        Normalización para comparar denominaciones

src/modules/configuracion/
├── application/
│   ├── reglas-formulario.ts                        Qué acceso tiene cada rol
│   ├── reglas-formulario.spec.ts                   9 pruebas
│   ├── formularios.service.ts                      Definición y filtrado por rol
│   ├── formularios.service.spec.ts                 15 pruebas
│   ├── catalogos.service.ts                        Consulta y administración
│   └── catalogos.service.spec.ts                   24 pruebas
├── infrastructure/
│   ├── formularios.repository.ts
│   └── catalogos.repository.ts
└── presentation/
    ├── formularios.controller.ts                   3 endpoints
    ├── zonales.controller.ts                       1 endpoint
    ├── administracion-catalogos.controller.ts      9 endpoints
    └── dto/
        ├── formulario-response.dto.ts
        ├── catalogos-response.dto.ts
        └── administrar-catalogos.dto.ts            6 contratos de escritura

test/
├── jest-integracion.json                           Configuración aparte (ver §7.2)
├── entorno-integracion.ts
└── configuracion-catalogos.integracion-spec.ts     21 pruebas de integración
```

Modificados: `configuracion.module.ts` (registra y exporta lo nuevo), `schema.prisma` (una columna)
y `package.json` (el script `test:integracion`).

---

## 2. BASE DE DATOS · UNA COLUMNA NUEVA, Y POR QUÉ

**RN-20** exige que los catálogos «que lo prevean» incluyan la opción `ADICIONALES` con captura de
texto libre. Al implementar la respuesta de catálogos apareció que **el modelo no puede decir en
qué formularios se ofrece esa opción**:

- `ADICIONALES` **no es una fila** de `t_tipo_control`. INV-08 lo dice literalmente: *«el tipo de
  control pertenece al catálogo del formulario, **salvo captura como adicional**»*. Por eso la
  semilla de M-03 lo excluye.
- `t_formulario_tipo_control` solo enlaza tipos reales, de modo que la delimitación tampoco puede
  expresarlo.
- `t_operativo.oper_tipo_libre` resuelve **dónde se guarda** el texto, no **quién puede escribirlo**.

Sin ese dato, la pantalla de registro tendría que decidir por su cuenta si muestra la opción, que
es exactamente la clase de inferencia que el proyecto prohíbe.

```sql
ALTER TABLE "t_formulario"
  ADD COLUMN "form_permite_captura_libre" BOOLEAN NOT NULL DEFAULT false;
```

**El valor no se inventa.** El insumo aprobado trae `ADICIONALES` en los formularios **2 (PMO)** y
**8 (INSP)**, y en ningún otro. El 7 tiene dos tipos cuyo nombre contiene «ADICIONAL»
—`INTERVENCIONES DE CONTROL - ADICIONAL` y `OPERATIVOS DE CONTROL - ADICIONAL`—, que son valores
del catálogo y no la opción de captura libre; conviene no confundirlos.

Es la quinta migración. `npm run prisma:verificar` sigue confirmando **27 tablas, 11 enumerados,
24 restricciones y 7 índices parciales**: la columna no altera ninguno de esos objetos, y
`t_formulario` está vacía, así que no toca ningún dato.

### Índices: ninguno nuevo, y es una decisión

| Consulta | Cómo se resuelve |
|---|---|
| Formularios por orden | `idx_formulario_orden`, ya existe |
| Formularios por rol dueño | `idx_formulario_rol_dueno`, ya existe |
| Formularios por rol compartido | **Sin índice, a propósito.** Son nueve filas: recorrerlas es más barato que consultar un índice |
| Puntos del formulario | `idx_formulario_punto_form`, ya existe |
| Puntos de la zonal | `idx_punto_zonal`, ya existe |

Crear un índice sobre una tabla de nueve filas no acelera nada y sí añade un objeto más que
mantener y verificar en cada migración estructural.

---

## 3. ENDPOINTS

### 3.1 Consulta · todos los roles autenticados

| Método | Ruta | Devuelve |
|---|---|---|
| `GET` | `/formularios/permitidos` | Los formularios del rol que consulta, con su acceso |
| `GET` | `/formularios/:codigo/catalogos` | Zonales, puntos, tipos e instituciones **de ese formulario** |
| `GET` | `/zonales` | Las diez zonales más el ámbito DMQ |
| `GET` | `/formularios/:codigo/zonales/:zonalId/puntos` | Los puntos del formulario en esa zonal |

### 3.2 Administración · exclusivo `ADMINISTRADOR_DMIP`

| Método | Ruta |
|---|---|
| `POST` · `PUT` · `DELETE` | `/administracion/catalogos/puntos[/:id]` |
| `POST` · `PUT` · `DELETE` | `/administracion/catalogos/tipos-control[/:id]` |
| `POST` · `PUT` · `DELETE` | `/administracion/catalogos/instituciones[/:id]` |

### 3.3 Dos precisiones sobre el contrato

**La ruta de puntos lleva el formulario.** `FASE4` §8.2 la enuncia como
`GET /zonales/:zonalId/puntos`, sin formulario. Se implementó la del plan,
`GET /formularios/:codigo/zonales/:zonalId/puntos`, porque **RN-16 y RN-17 actúan juntas**: el
punto depende de la zonal *dentro de* los del formulario. Sin el código en la ruta, el endpoint
devolvería puntos de otros departamentos.

**No hay Swagger.** `@nestjs/swagger` no está instalado y la guía §0.3 prohíbe incorporar
dependencias sin autorización previa. Los contratos quedan documentados aquí y en los DTO, que son
tipos de TypeScript y no comentarios: no se desactualizan en silencio. Instalarlo es una decisión
de una línea el día que se apruebe.

---

## 4. RN-16 · LA DECISIÓN MÁS IMPORTANTE DEL MÓDULO

Los catálogos se consultan **siempre por las tablas puente**. Un formulario sin filas puente
recibe listas vacías.

Hoy eso significa que `GET /formularios/:codigo/catalogos` devuelve las once zonales y **nada
más**, porque `t_formulario_punto`, `t_formulario_tipo_control` y `t_formulario_institucion` están
vacías (PV-01, PV-25 y PV-26).

La alternativa tentadora era devolver el catálogo completo «mientras llega la delimitación». Se
descartó:

- **Incumpliría RN-16 en silencio.** El funcionario de Inspecciones vería los 44 tipos de control
  del sistema, incluidos los de Instrucción, y no tendría forma de saber que eso está mal.
- **Nadie lo notaría al llegar la matriz.** El sistema pasaría de «todo» a «lo que corresponde»
  como si fuera una regresión.

Una lista vacía, en cambio, se ve, se pregunta y se corrige. Ver PV-01.

---

## 5. LAS REGLAS IMPLEMENTADAS

| Regla | Qué exige | Dónde vive |
|---|---|---|
| **RN-16** | Cada formulario despliega sus propios catálogos | `CatalogosRepository.catalogosDeFormulario` |
| **RN-17** | El punto depende de la zonal | `puntosDeFormularioYZonal` |
| **RN-18** | Las zonales aparecen siempre completas | `listarZonales`, sin filtro por formulario |
| **RN-20** | Opción `ADICIONALES` con captura libre | `permiteCapturaLibre` en la respuesta |
| **RF-051 a RF-053** | Administrar catálogos por formulario | `formularioIds` opcional en el alta |
| **RF-058 · INV-22** | Un valor usado no se elimina, se desactiva | `desactivar*`, siempre lógica |
| **PER-01** | El rol ve solo sus formularios | `reglas-formulario.ts` |

### 5.1 Por qué `DELETE` desactiva siempre

RF-058 pide desactivar en vez de eliminar **cuando el valor se usó en cuadros históricos**. Se
implementó desactivando **siempre**, esté o no en uso:

- Borrar cuando nadie lo usa exige acertar en la comprobación **cada vez**; desactivar siempre lo
  garantiza por construcción.
- Las claves foráneas hacia el catálogo son `RESTRICT`, de modo que un borrado físico de un valor
  usado fallaría en la base con un mensaje que el administrador no puede interpretar.

La respuesta explica lo ocurrido y cuenta los usos:

```
«Control de ruido se retiró del catálogo y ya no se ofrecerá al registrar.
 No se elimina porque está registrado en 12 operativos anteriores.»
```

Con cero usos el mensaje cambia el motivo, no el efecto: *«Los valores de catálogo no se eliminan:
se conservan para que los cuadros anteriores sigan siendo legibles.»* Reactivar es un `PUT` con
`activo: true`.

### 5.2 Duplicados que solo cambian en mayúsculas o acentos

`uq_tipo_control_nombre` y `uq_institucion_sigla` distinguen mayúsculas y acentos, de modo que
«Control de ruido» y «CONTROL DE RUIDO» conviven como **dos filas del mismo catálogo**. M-03
detectó el problema en los datos de origen y lo informó, pero una semilla no puede impedir lo que
se cree después.

El alta ahora compara en forma canónica —sin acentos, en mayúsculas, espacios colapsados— y
rechaza el choque nombrando el valor existente:

> «Ya existe un tipo de control registrado como «Control de ruido». Los catálogos no distinguen
> mayúsculas ni acentos: use el valor existente o cámbiele el nombre a ese.»

**Es una validación, no un cambio de esquema.** Los duplicados que ya trae la fuente siguen ahí:
fusionarlos es una decisión del Gestor de Calidad, no del sistema. Si el negocio decidiera que
dos escrituras distintas son valores distintos, se retira esta comprobación sin tocar la base.

---

## 6. SEGURIDAD

| Endpoint | Guardas | Motivo |
|---|---|---|
| Consulta | `IdentidadGuard` → `RolesGuard` | Lectura para todo rol autenticado, según el plan |
| Administración | `IdentidadGuard` → `RolesGuard` + `@Roles(ADMINISTRADOR_DMIP)` | El catálogo es el marco de todos |

**Sin `FormularioRolGuard` en la consulta, y es deliberado.** Esa guarda protege la *escritura*
sobre un formulario ajeno. Aquí no se escribe: se consultan las opciones que el formulario ofrece,
que son catálogo institucional. El aislamiento que originó el encargo protege **quién sale, a qué
hora y a qué punto**, no la lista de puntos que existen. `GET /formularios/permitidos` sí filtra
por rol, porque ahí la pregunta es otra: qué puede registrar quien consulta.

**Sin `VentanaCargaGuard`**, por el mismo motivo que en M-06: la ventana gobierna la jornada del
cuadro, no la administración del sistema.

### 6.1 La prueba que impide la deriva

`obtenerPermitidos` decide qué se le ofrece al funcionario; `FormularioRolGuard` decide qué entra
al guardar. Si discreparan, la interfaz mostraría un formulario que la guarda rechaza **después**
de que el funcionario capturó el operativo completo.

Por eso `formularios.service.spec.ts` ejecuta la **guarda real de M-05** contra la misma
definición y exige que «acceso distinto de LECTURA» y «la guarda deja pasar» sean el mismo
conjunto, para los seis roles y los nueve formularios. Cambiar una de las dos reglas sin la otra
rompe la prueba.

### 6.2 Auditoría

Las nueve operaciones de administración escriben **el cambio y su traza en la misma transacción**
(DA-09), mediante un único punto —`escribirConTraza`— que abre la transacción, ejecuta la
operación y registra con el identificador que la operación produjo, que en un alta solo se conoce
después de insertar.

Traza real de la prueba de integración:

| entidad | acción | usuario | rol | correlación |
|---|---|---|---|---|
| `t_tipo_control` | `CREAR` | 6 | `ADMINISTRADOR` | presente |
| `t_tipo_control` | `ELIMINAR` | 6 | `ADMINISTRADOR` | presente |

Una modificación que no cambia nada, y una baja repetida, **no escriben ni auditan**: una traza
que dijera que nada cambió ensucia el historial que sirve para responder quién cambió qué.

---

## 7. PRUEBAS

### 7.1 Unitarias · `npm test`

```
Test Suites: 14 passed, 14 total
Tests:       131 passed, 131 total
```

48 nuevas: 9 de `reglas-formulario`, 15 de `FormulariosService` —incluida la de coherencia con la
guarda— y 24 de `CatalogosService`.

### 7.2 Integración · `npm run test:integracion`

```
Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

**Configuración aparte, en `test/jest-integracion.json`.** Estas pruebas exigen la base levantada;
mezclarlas con las unitarias haría que `npm test` fallara cuando el contenedor está detenido, y
una suite que falla por el entorno deja de ser una señal útil.

**Sobre sus datos.** `t_formulario` está vacía y seguirá estándolo hasta PV-25 y PV-26, así que la
prueba crea tres formularios propios con el prefijo `PRUEBA_` y los borra al terminar. No es
sembrar: viven dentro de la prueba, el prefijo impide confundirlos, y **ninguna aserción depende
de `esPatrulla` ni de `colorAcento`**, que llevan valores de relleno declarados como tales.
Si algún día la tabla tuviera formularios institucionales, la prueba se detiene con un mensaje
explícito en vez de fallar por una violación de unicidad sin contexto.

La auditoría **no** se limpia al terminar: es evidencia, y borrarla por comodidad contradiría el
motivo por el que existe.

### 7.3 Los ocho casos del plan

| # | Caso | Esperado | Obtenido |
|---|---|---|---|
| 1 | `/formularios/permitidos` con `DMIP_OPERATIVOS` | Solo los suyos | ✅ y con `acceso: ESCRITURA` |
| 2 | Ídem con `DMIT_INSTRUCTOR` | Los suyos más el compartido | ✅ el compartido llega marcado `COMPARTIDO` |
| 3 | Ídem con `DAF` | Todos, en lectura | ✅ (comprobado también con `DIRECTOR`) |
| 4 | `/formularios/:codigo/catalogos` | Lo suyo, nada de otro formulario | ✅ el formulario vecino recibe lista vacía |
| 5 | `GET /zonales` | Las diez más DMQ, completas | ✅ once filas, una marcada `esDmq` |
| 6 | Puntos de una zonal sin mapeo | Lista vacía, **pero la zonal aparece** | ✅ |
| 7 | Eliminar un tipo usado en cuadros históricos | Se desactiva, no se borra | ✅ la fila sigue en la base con `activo = false` |
| 8 | Respuesta de formulario | Incluye `colorFondo` y `colorAcento` | ✅ |

El caso 7 se comprueba en dos niveles: la prueba de integración verifica que la fila sobrevive y
deja de ofrecerse; la unitaria cubre la variante con doce usos históricos y su mensaje, que
exigiría montar un cuadro y un operativo completos para reproducirla contra la base.

Casos adicionales verificados: `401` sin identidad · `403` para un rol que no es `ADMINISTRADOR_DMIP` ·
`404` con código de formulario o zonal inexistente · `400 CAMPOS_NO_PERMITIDOS` nombrando el campo
sobrante · `400` con el mensaje útil cuando falta el nombre · rechazo del duplicado por acentos ·
rechazo de la vinculación a un formulario inexistente.

### 7.4 Estado de la base al terminar

`t_formulario` 0 · `t_punto_encuentro` 0 · `t_tipo_control` 44 · `t_institucion` 16 ·
`t_formulario_punto` 0. Exactamente como antes de las pruebas.

---

## 8. REVISIÓN DE DISEÑO

| Criterio | Qué se hizo |
|---|---|
| **SRP** | `reglas-formulario.ts` no toca base ni HTTP · los repositorios no deciden nada · los controladores no validan reglas |
| **DIP** | `operativos` (M-14) consumirá `FormulariosService` y `CatalogosService`, nunca sus repositorios. `ConfiguracionModule` exporta los servicios y no los repositorios |
| **DRY** | Las nueve operaciones de administración comparten `escribirConTraza`. La normalización de denominaciones vive en `common/utilidades/texto.ts` |
| **KISS** | La baja lógica no consulta el uso para decidir: desactiva siempre. Menos ramas, menos formas de equivocarse |
| **Rendimiento** | `catalogosDeFormulario` lanza las tres consultas en paralelo con `Promise.all`. Sin índices nuevos: sobre nueve filas no aportan |
| **Seguridad** | Autorización por endpoint, nunca global. Auditoría dentro de la transacción. Mensajes escritos para el funcionario |

### Duplicación conocida, y por qué no se retiró

| Duplicación | Decisión |
|---|---|
| `ejecutarEnTransaccion` en dos repositorios | Extraer una unidad de trabajo compartida obligaría a modificar M-06, **que está a la espera de aprobación**. Registrado en §9 |
| `sinAcentos` en `prisma/seed.ts` | Consolidarlo obligaría a modificar M-03, en la misma situación. Registrado en §9 |
| `FormularioAutorizacionRepository` y `FormulariosRepository` leen `t_formulario` | **No es duplicación.** Aquel lee cinco columnas para que la cadena de autorización no dependa de un submódulo de negocio; este lee la definición completa. Dueños distintos, contratos distintos |

---

## 9. ACCIONES PENDIENTES

| # | Acción | Cuándo |
|---|---|---|
| 1 | Al sembrar `t_formulario`, marcar `permiteCapturaLibre` en los formularios **2 y 8** | Cuando se resuelvan PV-25 y PV-26 |
| 2 | Decidir React Query y React Hook Form, o construir M-21 con `httpClient` + Formik | Antes de M-21 |
| 3 | Extraer la unidad de trabajo compartida y consolidar `sinAcentos` | Cuando M-03 y M-06 estén aprobados |
| 4 | Instalar `@nestjs/swagger` si el equipo quiere contrato navegable | Decisión del Product Owner |
| 5 | Añadir `build: .` al servicio `transporte-app` | Arrastrado de M-06 |

**Un defecto corregido de paso.** `.gitignore` excluía la carpeta `test/` completa, herencia del
proyecto plantilla donde guardaba material desechable. Las pruebas de integración recién escritas
no se habrían versionado: existirían solo en esta máquina y nadie más las ejecutaría. Se retiró la
regla —`coverage/` sigue ignorado— y se registró el motivo en el propio archivo.

**Observación menor.** `prisma migrate diff` informa diferencias en los valores por omisión de
cuatro columnas de tipo enumerado (`t_cuadro_diario`, `t_formulario`, `t_operativo`,
`t_solicitud_apoyo`). Es una discrepancia de representación entre Prisma y PostgreSQL —
`'BORRADOR'::e_estado_cuadro` frente a `BORRADOR`—, no un cambio real: existe desde M-02 y no la
introdujo este módulo. `npm run prisma:verificar` sigue en verde.

---

## 10. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-14 · Registro de operativos** | `FormulariosService.obtenerDefinicion()` para la política de vehículo y el condicionante nocturno; `CatalogosService` para validar punto, tipo e institución |
| **M-21 · Hooks y servicios del frontend** | Los cinco endpoints de consulta |
| **M-28 · Pantalla P-08** | Los nueve endpoints de administración |

Todos por **servicio publicado**. `ConfiguracionModule` exporta `FormulariosService`,
`CatalogosService` y `ParametroPoliticaService`; ningún repositorio sale del submódulo.

---

## 11. VALIDACIÓN COMPLETA DE LA PILA · 2026-08-05

Ejecutada de extremo a extremo, con la pila **detenida y vuelta a levantar desde cero** para no
validar contra un estado heredado de la sesión.

| # | Paso | Comando | Resultado |
|---|---|---|---|
| 1 | Dependencias backend | `npm install` | ✅ 0 vulnerabilidades · Node 24.18.0 · npm 11.16.0 |
| 2 | Dependencias frontend | `npm install` | ✅ |
| 3 | Cliente Prisma | `npx prisma generate` | ✅ v6.19.3 |
| 4 | Estado de migraciones | `npx prisma migrate status` | ✅ 5 migraciones · *Database schema is up to date* |
| 5 | Compilación backend | `npm run build` | ✅ código 0 |
| 6 | Lint backend | `npm run lint:check` | ✅ código 0 |
| 7 | Compilación frontend | `npm run build` | ✅ 3,7 s · 334 kB |
| 8 | Lint frontend | `npm run lint` | ✅ código 0 · una advertencia preexistente en `FilterByColumn` |
| 9 | Pila abajo y arriba | `docker compose down` · `up -d` | ✅ los tres contenedores; el volumen de datos sobrevive |
| 10 | PostgreSQL | contenedor `transportedb` | ✅ `healthy` en el puerto 5434 |
| 11 | Migraciones | `npx prisma migrate deploy` | ✅ sin pendientes |
| 12 | Objetos de base | `npm run prisma:verificar` | ✅ 27 tablas, 11 enumerados, 24 restricciones, 7 índices parciales |
| 13 | Semilla | `npx prisma db seed` | ✅ idempotente: 8 parámetros, 6 ventanas, 11 zonales, 44 tipos, 16 instituciones |
| 14 | Backend | contenedor `transporte-app` | ✅ **17 rutas mapeadas**, 13 de este módulo |
| 15 | Frontend | contenedor `transporte-front` | ✅ `healthy`, sirve en 5176 |
| 16 | Proxy del frontend | `GET localhost:5176/api/v1/estado` | ✅ 200 desde el backend: la corrección de Sprint 0 sigue en pie |
| 17 | Pruebas unitarias | `npm test` | ✅ **131 de 131**, 14 suites |
| 18 | Pruebas de integración | `npm run test:integracion` | ✅ **21 de 21** |
| 19 | Prueba funcional con identidad | instancia local en el 3004 | ✅ ver §11.2 |

### 11.1 Seguridad, comprobada contra el contenedor

El contenedor corre con `MODO_IDENTIDAD_PROVISIONAL=false`, de modo que la cabecera de pruebas se
ignora. Las tres rutas nuevas responden `401 NO_AUTENTICADO`, incluida la de administración. Es la
comprobación de que el modo provisional **no queda activo en el despliegue** (RT-05).

### 11.2 Prueba funcional sobre datos reales

Con una instancia local en el puerto 3004 —para no alterar el contenedor— y la identidad
provisional activa:

| Caso | Resultado |
|---|---|
| `GET /zonales` como departamental | `200` con **las diez zonales más DMQ**, sobre datos sembrados reales |
| `GET /formularios/permitidos` | `200` con lista vacía: `t_formulario` sigue bloqueada por PV-25 y PV-26 |
| `GET /formularios/INSP/catalogos` | `404` con mensaje operativo |
| `POST` tipo de control como `ADMINISTRADOR_DMIP` | `201` |
| `POST` el mismo nombre en mayúsculas | `400` nombrando el valor existente |
| `POST` como `DIRECTOR` | `403 ROL_NO_AUTORIZADO` |
| `POST` con campo fuera de contrato | `400 CAMPOS_NO_PERMITIDOS`, «no permite modificar activo» |
| `POST` punto con zonal inexistente | `404` |
| `POST` institución vinculada a formulario inexistente | `400` con el identificador |
| `PUT` renombrar · `PUT` sin cambios | `200` · `200` **sin traza**: nada cambió |
| `DELETE` · `DELETE` repetido | `200` desactivado · `200` «ya estaba fuera de uso», sin traza |
| `PUT` con `activo: true` | `200`: la reactivación funciona |
| `PUT` sobre identificador inexistente | `404` |

**La base quedó en su estado de partida**: 44 tipos, 0 puntos, 16 instituciones, 11 zonales,
0 formularios, 8 parámetros, 6 ventanas. Los valores creados durante la prueba se eliminaron; las
filas de auditoría **no**, porque son evidencia.

### 11.3 Un defecto encontrado por la validación

Revisando la traza de la prueba funcional apareció una **incoherencia de vocabulario en la
auditoría**: la baja registraba `tico_activo` —nombre de columna— pero el renombrado registraba
`nombre`, que es la propiedad del modelo Prisma. La misma tabla, dos idiomas.

No rompía nada, y por eso importaba encontrarlo: quien consulte `t_auditoria` dentro de un año
para responder «¿quién cambió esto?» tendría que saber de antemano cuál de los dos vocabularios se
usó en cada fila. M-06 ya había fijado el criterio correcto al auditar `para_valor`.

Corregido en los tres catálogos —`pcto_nombre`, `zona_id`, `pcto_activo`, `tico_nombre`,
`tico_activo`, `inst_sigla`, `inst_nombre`, `inst_activo`—, con prueba unitaria y de integración
que lo fijan. Verificado después en la base:

```
22 | t_tipo_control | 49 | ACTUALIZAR | tico_nombre | VALIDACION M07 renombrado | VALIDACION M07 segundo nombre
23 | t_tipo_control | 49 | ACTUALIZAR | tico_activo | false                     | true
```

---

## 12. CAMBIOS DEL CODE REVIEW · 2026-08-05

Posterior a la validación de §11. Ver `CODE_REVIEW.md`.

| # | Cambio | Efecto |
|---|---|---|
| **COR-01** | La comprobación de duplicados se hace también al **cambiar de zonal** | `uq_punto_nombre_zonal` es compuesto: mover un punto a una zonal donde ya existe esa denominación infringía la restricción, y el fallo llegaba desde la base como `500` no controlado |
| **DRY-01** | Las tres bajas lógicas se unifican en `darDeBaja` | Eran la misma secuencia escrita tres veces. Cada método pasa de ~25 líneas a 11, y las cinco pruebas de RF-058 pasan sin tocarlas |
| **COR-02** | El filtro traduce `P2002`, `P2025` y `P2003` de Prisma | Una infracción de unicidad en carrera —dos administradores creando el mismo valor a la vez— ya no sale como «Ocurrió un error inesperado» |

Se estudió partir `catalogos.service.ts` en un servicio de consulta y otro de administración, y se
pospuso a propósito: la división cambia el contrato que `ConfiguracionModule` exporta y que **M-14
va a consumir**. Conviene fijar la frontera cuando M-14 diga qué necesita. Queda registrado como
SOLID-01.

---

## 13. ESTADO

**M-07 terminado en su alcance de backend y validado de extremo a extremo** (§11). Compilación y
lint en 0 en ambos repositorios; 131 pruebas unitarias y 21 de integración en verde; los ocho
casos del plan verificados; pila reconstruida desde cero con los tres contenedores en marcha y las
trece rutas del módulo mapeadas. El frontend no se tocó y sigue compilando.

**Sigue condicionado por el negocio**, sin que ello afecte a lo entregado:

| Pendiente | Efecto |
|---|---|
| **PV-25 y PV-26** | `t_formulario` vacía: los endpoints funcionan y devuelven cero formularios |
| **PV-01** | Sin matriz zonal ↔ punto: `t_punto_encuentro` vacía y el filtrado en cascada no devuelve puntos |

La estructura está construida y probada. El día que lleguen los datos, **no hay código que
escribir**: basta ejecutar la semilla.

**A la espera de aprobación.**
