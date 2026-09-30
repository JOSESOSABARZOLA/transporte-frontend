# M-10 · Maestro de personal y disponibilidad

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E4 · Bloque C · Prioridad P1 · Dependencias M-03 y M-05 · Desbloquea M-11, M-12 y M-27
Fecha: 2026-08-05

---

## 0. LO QUE CAMBIA CON ESTE MÓDULO

Hasta ahora el sistema manejaba catálogos: formularios, zonales, tipos de control, ventanas. Cosas.
**Desde aquí maneja personas**, con su cédula, su teléfono y el motivo por el que faltan al trabajo.

Eso reordena las prioridades. La corrección sigue importando, pero la pregunta que gobierna cada
decisión pasa a ser otra: *¿quién puede ver este dato, y por qué lo necesita?* Tres respuestas
concretas, todas verificadas por pruebas:

| Decisión | Efecto |
|---|---|
| **La traza no guarda el teléfono ni la cédula** | La auditoría registra QUE cambiaron, quién y cuándo. No replica el dato personal en una segunda tabla |
| **La consulta de elegibles no devuelve teléfono ni cédula** | Quien arma el cuadro elige personas, no las contacta. RN-34 |
| **El motivo de la ausencia no sale del submódulo** | «Cirugía programada» es un dato de salud. Quien arma el cuadro necesita saber que la persona no está, no por qué |

---

## 1. ARCHIVOS

Diez nuevos bajo `src/modules/talento-operativo/`, más cuatro de prueba.

```
src/modules/talento-operativo/
├── talento-operativo.module.ts
├── application/
│   ├── reglas-personal.ts               + .spec.ts   23 pruebas
│   ├── funcionarios.service.ts           + .spec.ts   14 pruebas
│   ├── disponibilidad.service.ts         + .spec.ts   14 pruebas
│   └── personal-elegible.service.ts      + .spec.ts    6 pruebas
├── infrastructure/
│   ├── funcionarios.repository.ts
│   └── disponibilidad.repository.ts
└── presentation/
    ├── administracion-personal.controller.ts
    ├── personal.controller.ts
    └── dto/personal.dto.ts

test/
└── personal-disponibilidad.integracion-spec.ts        19 pruebas
```

Un archivo modificado: `src/app.module.ts`, para importar `TalentoOperativoModule`. **Nada más se
tocó.**

---

## 2. BASE DE DATOS · NINGUNA MIGRACIÓN, Y CONSTA POR QUÉ

`t_funcionario` y `t_disponibilidad` existen desde M-02 con todo lo que este módulo necesita. Más
notable: **los dos índices que estas consultas requieren ya existen, y además son parciales**, que
es exactamente lo que hacía falta.

| Consulta de este módulo | Índice que la cubre | Por qué el predicado importa |
|---|---|---|
| Personal elegible por área | `idx_funcionario_area (func_area) WHERE func_activo = true` | La consulta nunca pregunta por inactivos; indexarlos sería peso muerto |
| Ausencias de una persona en un rango | `idx_disponibilidad_func (func_id, disp_desde, disp_hasta) WHERE func_id IS NOT NULL` | Deja fuera las filas de conductor y vehículo, que son las otras dos terceras partes de la tabla |

Y las dos restricciones que el módulo comprueba antes ya estaban puestas:
`ck_disponibilidad_rango` —el fin no es anterior al inicio— y `ck_disponibilidad_sujeto` —exactamente
uno de los tres sujetos—. El servicio las anticipa para devolver una frase que el administrador
entienda en lugar de un error del motor; la base es la que las garantiza.

`npm run prisma:verificar` sigue confirmando 27 tablas, 11 enumerados, 24 restricciones y 7 índices
parciales. **Este módulo no añade ni una migración.**

---

## 3. LA DECISIÓN MÁS DELICADA: QUÉ GUARDA LA AUDITORÍA

DA-09 exige que toda escritura deje traza. Pero una traza de «cambió el teléfono de 98 514 4231 a
99 111 2233» **copia un dato personal a una segunda tabla**, con otra política de acceso, sin fecha
de caducidad y fuera del alcance de cualquier corrección posterior en la ficha.

La auditoría existe para demostrar **quién cambió qué**. Para eso basta con saber que el teléfono
cambió:

```
audi_entidad  | t_funcionario
audi_campo    | func_telefono
audi_anterior | [dato personal]
audi_nuevo    | [dato personal]
audi_usuario  | 6
audi_rol      | ADMINISTRADOR
```

Lo mismo con el motivo de una ausencia: la traza dice `REPOSO_MEDICO · funcionario 12 · 2026-09-01 a
2026-09-05`, y **no** «cirugía programada».

**La contrapartida, dicha en voz alta.** Si alguien altera un teléfono de forma maliciosa, la traza
prueba quién lo hizo pero no permite restaurar el valor anterior desde ella. Es un intercambio
consciente: minimizar la copia de datos personales frente a la recuperación forense de un campo de
contacto. Si el Product Owner prefiere lo contrario, se cambia una constante —`CAMPOS_PERSONALES`—
y queda registrado como decisión suya.

Los demás campos —cargo, área, tipo de contrato, dirección, activo— **sí** guardan sus valores: son
datos administrativos y su historial tiene valor.

---

## 4. LOS ENDPOINTS Y LAS DOS RESPUESTAS

| Método | Ruta | Roles |
|---|---|---|
| `GET` `POST` | `/administracion/personal` | `ADMINISTRADOR_DMIP` |
| `GET` `PUT` `DELETE` | `/administracion/personal/:id` | `ADMINISTRADOR_DMIP` |
| `GET` `POST` | `/administracion/personal/:id/disponibilidad` | `ADMINISTRADOR_DMIP` |
| `DELETE` | `/administracion/personal/:id/disponibilidad/:periodoId` | `ADMINISTRADOR_DMIP` |
| `GET` | `/personal/elegible?formulario=&inicio=&fin=` | Departamentales |

**Dos formas de respuesta para el mismo funcionario**, y es el punto del módulo:

```
FuncionarioResponseDto        id, cédula, apellidos, nombres, teléfono, cargo,
                              área, tipo de contrato, dirección, activo
                              → solo ADMINISTRADOR_DMIP

PersonaElegibleResponseDto    id, apellidos, nombres, área, cargo
                              → lo que ve quien arma el cuadro
```

Que el DTO de selección **no tenga** el campo no es una omisión: es la forma de que no pueda
escaparse. Un campo que no existe en el contrato no se filtra por descuido en una pantalla nueva.
Es también el caso 5 del plan —«modificar teléfono desde el operativo: imposible, el campo no
existe en su DTO»— aplicado ya desde aquí.

### Un tercer servicio que el plan no nombra

El plan lista `FuncionariosService` y `DisponibilidadService`. Se añadió
**`PersonalElegibleService`** porque la consulta de elegibles cruza tres fuentes: qué áreas admite
el formulario (submódulo `configuracion`), quién pertenece a ellas y quién está ausente. Ponerla en
`FuncionariosService` lo obligaría a depender de `DisponibilidadService`, que ya depende de él:
**una dependencia circular**. Este servicio es la costura natural, y es donde M-12 enchufará las
políticas de descanso.

---

## 5. LAS REGLAS IMPLEMENTADAS

| Regla | Qué exige | Dónde vive |
|---|---|---|
| **RN-30** | Vacaciones, permiso, calamidad y reposo médico excluyen a la persona | `DisponibilidadService.ausentesEntre` |
| **RN-34** | El teléfono vive solo en el maestro | Ausente del DTO de elegibles |
| **RF-055** | Ausencias con rango y motivo | `CrearDisponibilidadDto` |
| **INV-14** | Los períodos de una persona no se solapan | `seSolapan`, comprobado antes de escribir |
| **Baja lógica** | Nunca física, por la rotación mensual | `FuncionariosService.desactivar` |

### 5.1 Los extremos son inclusivos, al revés que en `RangoHorario`

Una ausencia del 1 al 15 comprende **ambos días**, y compartir un solo día ya es solapar. Es lo
contrario de lo que decidió M-09 para los horarios, donde terminar a las 12H00 y empezar a las
12H00 es encadenar y no coincidir.

La diferencia no es un descuido: encadenar dos operativos a la misma hora es una jornada partida
legítima; «encadenar» dos ausencias el mismo día sería estar dos veces ausente. La prueba lo dice
con esas palabras para que nadie las unifique por parecerse.

### 5.2 La cédula se valida, no solo se exige numérica

Diez dígitos, provincia entre 01 y 24 y dígito verificador de módulo 10. La cédula es la clave
natural del maestro —`uq_funcionario_cedula`— y aparece en las órdenes de servicio: un dígito mal
escrito crea una persona duplicada que nadie detecta hasta que dos fichas distintas reclaman ser la
misma, y para entonces ya hay operativos colgando de ambas.

### 5.3 La baja es lógica, siempre

`fk_asignacion_funcionario` es `RESTRICT`: borrar a quien ya salió en un operativo fallaría en la
base. Pero el motivo de fondo es otro: **la rotación del personal es mensual**, así que dar de baja
es frecuente, y quien sale hoy puede reingresar el mes que viene. La ficha se conserva con su
historial y `PUT { activo: true }` la devuelve al maestro.

El mensaje dice lo que pasó y por qué:

> «PRUEBA_M10_UNO PERSONA salió del maestro y ya no se ofrecerá al armar el cuadro. La ficha no se
> elimina porque figura en 14 operativos anteriores.»

### 5.4 La ausencia sí se elimina físicamente, y es deliberado

Al revés que los catálogos y el maestro. Una ausencia registrada por error no es un dato de
referencia: nada apunta a ella, y conservarla «desactivada» obligaría a filtrar por ese estado en
cada consulta de RN-30, con el riesgo de que un olvido excluya a alguien que sí está disponible. La
traza de auditoría conserva la constancia de que existió y de quién la retiró.

---

## 6. SEGURIDAD

| Endpoint | Guardas | Por qué |
|---|---|---|
| Administración | `IdentidadGuard` → `RolesGuard` + `@Roles(ADMINISTRADOR_DMIP)` | Es el único endpoint del módulo que devuelve cédulas y teléfonos. Un rol de más aquí es una filtración de datos personales, no una molestia de permisos |
| `/personal/elegible` | `IdentidadGuard` → `RolesGuard` | Lectura para todo rol autenticado, con la respuesta reducida |

**Sin `VentanaCargaGuard`**: la ventana gobierna la jornada del cuadro, no la administración del
sistema. Mismo criterio que en M-06, M-07 y M-08.

**La consulta de elegibles tampoco dice por qué falta alguien.** Si una persona está de reposo
médico simplemente no aparece; devolver «excluida por reposo médico» convertiría esa consulta en un
parte de salud de la institución.

Y una comprobación que ya venía hecha: el registrador **suprime estructuralmente** teléfonos y
cédulas desde el code review, incluidos los nombres compuestos como `telefonoContacto`. Ese arreglo
se hizo anticipando este módulo; hoy tiene su primer consumidor real.

---

## 7. PRUEBAS

### 7.1 Unitarias · `npm test`

```
Test Suites: 25 passed, 25 total
Tests:       310 passed, 310 total
```

57 nuevas. Una de ellas encontró un error **en la propia prueba**: había compuesto tres cédulas «de
ejemplo» a mano y una tenía el dígito verificador mal. El validador la rechazó, como debía. Las
cédulas de las pruebas se recalcularon con el algoritmo y **no pertenecen a ninguna persona**:
PV-02 sigue abierto y este módulo no inventa personal.

### 7.2 Integración · `npm run test:integracion`

```
Test Suites: 3 passed, 3 total
Tests:       53 passed, 53 total
```

19 nuevas, contra la base real. Crean sus fichas con apellidos `PRUEBA_M10` y las borran al
terminar; comprobado después: `t_funcionario` 0, `t_disponibilidad` 0, `t_formulario` 0.

### 7.3 Los seis casos del plan

| # | Caso | Esperado | Verificado |
|---|---|---|---|
| 1 | Alta con cédula repetida | Rechazada | ✅ y el mensaje dice a nombre de quién está |
| 2 | Dos ausencias solapadas | Rechazada (INV-14) | ✅ el mensaje nombra el período que choca |
| 3 | Baja de funcionario con historial | Baja **lógica** | ✅ la fila sigue en la base con `activo = false` |
| 4 | `/personal/elegible` con persona de vacaciones | **No aparece** | ✅ |
| 5 | Modificar teléfono desde el operativo | Imposible: no está en su DTO | ✅ la respuesta de elegibles no contiene `telefono` ni `cedula` |
| 6 | Ausencia con fin anterior al inicio | Rechazada | ✅ antes de llegar a `ck_disponibilidad_rango` |

Adicionales: `401` sin identidad · `403` para un departamental en administración · `400` con cédula
de verificador incorrecto · `400` al omitir el tipo de contrato, con el mensaje que explica de qué
depende · `400` con fecha en otro formato · `404` con formulario inexistente · reingreso · traza sin
teléfono · traza sin motivo.

### 7.4 Compilación y despliegue

`npm run build` y `npm run lint:check` en 0. Imagen reconstruida, contenedor `healthy`, **nueve
rutas nuevas mapeadas** y `401` sin identidad, que es lo correcto con
`MODO_IDENTIDAD_PROVISIONAL=false`.

---

## 8. FRONTEND · POR QUÉ NO HAY

La ficha del plan lo dice: **«Frontend. Pantalla P-07 en M-27»** y **«Componentes React. —»**.
Construirla ahora sería implementar un módulo posterior por adelantado.

Se mantiene, además, lo señalado en M-07: **React Query y React Hook Form no están en el stack
aprobado** —el frontend usa `httpClient` y Formik + Yup— y `transporte-frontend/CLAUDE.md` §2 exige
avisar antes de incorporar una librería. El frontend **no se tocó** en este módulo.

---

## 9. REVISIÓN DE DISEÑO

| Criterio | Qué se hizo |
|---|---|
| **SRP** | `reglas-personal.ts` es puro; los repositorios no deciden; los controladores no validan reglas |
| **DIP** | `PersonalElegibleService` consume `FormulariosService` —servicio publicado—, nunca el repositorio de configuración |
| **Ciclos** | El tercer servicio existe precisamente para evitar el ciclo `Funcionarios ↔ Disponibilidad` |
| **DRY** | La normalización de una ficha vive en un solo sitio y la usan el alta y la modificación |
| **KISS** | RN-30 no calcula nada: mira si hay una fila que cubra la fecha |
| **Rendimiento** | Una sola consulta de ausencias para todos los candidatos, no una por persona. Los dos índices parciales cubren ambas consultas |
| **Seguridad** | Dos formas de respuesta · traza sin datos personales · motivo que no sale del submódulo |

**Duplicación conocida:** `ejecutarEnTransaccion` aparece ahora en cinco repositorios. Sigue
registrada la extracción a una unidad de trabajo compartida, pendiente de que M-03 y M-06 estén
aprobados.

---

## 10. PENDIENTES QUE ESTE MÓDULO DEJA PLANTEADOS

| # | Asunto | Estado |
|---|---|---|
| 1 | **PV-02** · base de personal certificada con tipo de contrato | Sigue bloqueante. El maestro está vacío: la estructura funciona y no hay datos |
| 2 | **Pasaportes**. La validación de cédula rechaza a un extranjero con pasaporte | Ningún funcionario del insumo lo requiere. Si aparece, es una decisión del negocio, no un cambio técnico |
| 3 | La traza oculta el valor de teléfono y cédula (§3) | Decisión reversible con una constante, si el PO prefiere lo contrario |
| 4 | `/personal/elegible` aún no aplica las políticas de descanso | **Resuelto en M-12 · 2026-08-06.** El endpoint admite ahora `horaInicio` y `horaFin` opcionales; con ellos aplica las seis reglas. Ver `M12_POLITICAS_DESCANSO.md` §7 |

---

## 11. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-11 · Historial de jornada** | `FuncionariosService` para consolidar por persona |
| **M-12 · Políticas de descanso** | `PersonalElegibleService`, que pasa a devolver el veredicto completo |
| **M-27 · Pantalla P-07** | Los nueve endpoints de administración |

Todos por servicio publicado. `TalentoOperativoModule` exporta los tres servicios y ningún
repositorio sale del submódulo.

---

## 12. VALIDACIÓN COMPLETA DE LA PILA · 2026-08-05

Ejecutada de extremo a extremo, con la pila **detenida y vuelta a levantar** para no validar sobre
un estado heredado de la sesión.

| # | Paso | Resultado |
|---|---|---|
| 1 | Dependencias backend | ✅ 767 paquetes · **0 vulnerabilidades** · Node 24.18.0 |
| 2 | Dependencias frontend | ⚠️ 242 paquetes · **2 vulnerabilidades altas** preexistentes (§12.2) |
| 3 | `npx prisma generate` | ✅ cliente v6.19.3 |
| 4 | `npx prisma migrate status` | ✅ 5 migraciones · *Database schema is up to date* |
| 5 | Compilación backend | ✅ código 0 |
| 6 | Lint backend | ✅ código 0 |
| 7 | Compilación frontend | ✅ 2,97 s · 334 kB |
| 8 | Lint frontend | ✅ código 0 · una advertencia preexistente en `FilterByColumn` |
| 9 | `docker compose down` y `up -d --build` | ✅ los tres contenedores; el volumen de datos sobrevive |
| 10 | PostgreSQL | ✅ `transportedb` sano en el 5434 |
| 11 | `npx prisma migrate deploy` | ✅ sin pendientes |
| 12 | `npm run prisma:verificar` | ✅ 27 tablas, 11 enumerados, 24 restricciones, 7 índices parciales |
| 13 | `npx prisma db seed` | ✅ idempotente, código 0. Informa los siete catálogos bloqueados, **Personal entre ellos** |
| 14 | Backend | ✅ contenedor `healthy`, nueve rutas de M-10 mapeadas |
| 15 | Frontend | ✅ contenedor `healthy` en el 5176 |
| 16 | Proxy del frontend | ✅ `GET localhost:5176/api/v1/estado` → 200 |
| 17 | Pruebas unitarias | ✅ **310 de 310**, 25 suites |
| 18 | Pruebas de integración | ✅ **53 de 53**, 3 suites |
| 19 | Prueba funcional con identidad | ✅ ver §12.1 |

### 12.1 Prueba funcional sobre la base real

Instancia local en el 3004 —para no alterar el contenedor, que corre con
`MODO_IDENTIDAD_PROVISIONAL=false`— con la identidad provisional activa:

| Caso | Resultado |
|---|---|
| `POST` ficha como `ADMINISTRADOR_DMIP` | `201` con cédula y teléfono |
| `POST` con la misma cédula | `400` · «ya está registrada a nombre de VALIDACION M10 PERSONA UNO» |
| `POST` con dígito verificador incorrecto | `400` explicando el motivo |
| `POST` como rol departamental | `403` |
| `POST` ausencia | `201` |
| `POST` ausencia solapada | `400` · nombra el período que choca, del 01 al 15 |
| `POST` ausencia con fin anterior al inicio | `400` antes de llegar a la base |
| `GET` ficha como `ADMINISTRADOR_DMIP` | `200` con cédula y teléfono |
| `PUT` teléfono | `200` |
| `DELETE` | `200` · baja lógica, con el mensaje de reingreso |
| `GET /personal/elegible` sin formulario | `400` |
| `GET /personal/elegible` con formulario inexistente | `404` |

**La traza, comprobada en la base tras la prueba funcional:**

```
audi_campo    | func_telefono
audi_anterior | [dato personal]
audi_nuevo    | [dato personal]

audi_campo    | disp_estado
audi_nuevo    | VACACIONES · funcionario 4 · 2026-09-01 a 2026-09-15
```

El teléfono no aparece, y el motivo registrado —«Cirugía programada»— **tampoco**. Es exactamente
lo que describe §3.

**La base quedó en su estado sembrado**: 0 funcionarios, 0 ausencias, 0 formularios, 44 tipos, 16
instituciones, 11 zonales, 8 parámetros, 6 ventanas. Las filas de auditoría se conservan: son
evidencia de que el mecanismo funcionó.

### 12.2 Un hallazgo que la validación destapó

`npm audit` del frontend reporta **dos vulnerabilidades altas** en `react-router` 7.18.2:

> **GHSA-qwww-vcr4-c8h2** · *RSC Mode CSRF Bypass Allows Action Execution Before 400 Response*.
> Rango afectado: `7.12.0 – 8.2.0`.

Dos precisiones antes de decidir nada:

1. **Es preexistente.** El frontend no se tocó en este módulo ni en los cinco anteriores.
2. **La vía de explotación no aplica a este proyecto.** El fallo está en el modo **RSC** —React
   Server Components con acciones de servidor—. Aquí el frontend es una SPA de Vite con enrutado en
   cliente y sin servidor de React: no hay acciones que ejecutar antes de un 400.

`npm audit fix --force` propone **bajar a `react-router-dom` 7.11.0**, un retroceso de versión
mayor sobre el enrutador. **No se ejecutó**: cambiar una dependencia sin autorización contradice
§0.3 de la guía, y un downgrade forzado del enrutador es justo el cambio que puede romper la
navegación. Queda como decisión del Product Owner: actualizar por encima de 8.2, retroceder a 7.11
o aceptar el riesgo documentado.

---

## 13. CAMBIOS DEL SEGUNDO CODE REVIEW · 2026-08-05

Posterior a la validación de §12. Ver `CODE_REVIEW.md` §12.

| # | Cambio | Efecto |
|---|---|---|
| **COR-05** | `retirar` exige que el período pertenezca al funcionario de la ruta | **Era un defecto real.** El servicio recibía solo el identificador del período y borraba el de cualquiera. La traza habría quedado impecable sobre el período borrado sin decir que era el equivocado |
| **SEG-08** | `listarPorAreas` selecciona solo cinco columnas | La cédula y el teléfono **ya no salen de la base** para la consulta de elegibles. Antes se cargaban y el DTO los descartaba: la protección dependía de que nadie tocara el mapeo |
| **DRY-04** | Los cinco repositorios heredan de `RepositorioPrisma` | `ejecutarEnTransaccion` deja de estar escrito cinco veces |
| **DRY-05** | `comoFechaIso` sustituye las dos copias del formato `AAAA-MM-DD` | — |
| **DRY-06** | El intérprete de enumerado pasa a `common/utilidades/enumerado.ts` | Un solo mensaje para el mismo problema, aquí y en las ventanas |
| **KISS-02** | `incluirInactivos` sustituye a `soloActivos === false` | Se retira la doble negación |

Queda reportado sin corregir que **`GET /administracion/personal` no pagina**: devuelve el maestro
completo con cédulas y teléfonos. Paginar cambia la forma de la respuesta, que es funcionalidad, y
corresponde decidirlo al construir la pantalla P-07 en M-27.

---

## 14. ESTADO

**M-10 terminado y validado de extremo a extremo** (§12). Compilación y lint en 0 en ambos
repositorios; **310 pruebas unitarias** y **53 de integración** en verde; los seis casos del plan
verificados; pila reconstruida desde cero con los tres contenedores sanos; base restituida a su
estado sembrado.

`t_funcionario` sigue vacía por **PV-02**, y eso no impide nada de lo entregado: el día que llegue
la base certificada, el alta es una pantalla y no un despliegue.

**A la espera de aprobación.**
