# M-17 · Asignación de transporte

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E7 · Bloque E · Prioridad **P1 · Alta** · Dependencias M-12 y M-15
Desbloquea M-19 y M-24 · Fecha: 2026-08-06

---

## 0. ES EL ENDPOINT DONDE LA AUTORIZACIÓN SE MATERIALIZA EN EL CONTRATO

La DAF escribe **dos campos** de los nueve formularios. Todo lo demás del operativo —el horario, el
punto, el personal, las observaciones— es de quien lo cargó.

Esa restricción se sostiene en **cuatro niveles independientes**, para que ninguno sea el único
punto de defensa:

| Nivel | Mecanismo | Dónde se comprueba |
|---|---|---|
| 1 · Ruta | Endpoints propios bajo `/transporte`, con `@Roles(DAF)` | `transporte.controller.ts` |
| 2 · Contrato | `ActualizarTransporteDto` con **exactamente dos propiedades** | `transporte.dto.ts` |
| 3 · Validación | `forbidNonWhitelisted` rechaza cualquier campo adicional | `main.ts`, global |
| 4 · Servicio | `OperativosService.asignarTransporte()`, cuya firma **no puede expresar** otra columna | `operativos.service.ts` |

El cuarto es el que sobrevive a un descuido en los tres anteriores: aunque alguien añadiera un campo
al DTO y relajara la validación, **no habría por dónde escribirlo**.

---

## 1. ARCHIVOS

Seis nuevos, más dos de prueba. **Sin migraciones**: `t_conductor`, `t_vehiculo` y las cuatro
columnas de `t_operativo` ya existían desde M-02.

```
src/modules/transporte/
├── application/
│   ├── transporte.service.ts        + .spec.ts   22 pruebas
│   └── flota.service.ts
├── infrastructure/
│   └── flota.repository.ts
├── presentation/
│   ├── dto/transporte.dto.ts
│   ├── transporte.controller.ts
│   └── administracion-flota.controller.ts
└── transporte.module.ts

test/
└── transporte.integracion-spec.ts                31 pruebas
```

**Modificados:**

| Archivo | Cambio | Por qué |
|---|---|---|
| `descanso-conductor.policy.ts` | **VAL-21 y VAL-22** para el conductor | §3 |
| `elegibilidad.repository.ts` | `conduccionesDelDia()` | Los datos de esas dos reglas |
| `elegibilidad.service.ts` | Los reúne y pasa el umbral | Ídem |
| `operativos.repository.ts` | `listarPendientesDeTransporte()` y `actualizarTransporte()` | §4 |
| `operativos.service.ts` | `consultarPendientesDeTransporte()` y `asignarTransporte()` | Contrato de CLAUDE.md §4 |
| `app.module.ts` | Registra `TransporteModule` | — |

---

## 2. POL-02 NO SE DUPLICÓ: SE COMPLETÓ

El plan pide `DescansoConductorPolicy` «dentro de `transporte`». **No se creó ahí**, y es la misma
decisión que en M-15 con POL-03: las reglas de descanso viven en `talento-operativo` y en ningún
otro sitio, tanto si protegen a un inspector como si protegen a quien conduce (regla 1 de
CLAUDE.md). `TransporteService` **pregunta** y traslada el veredicto.

Escribirla en `transporte` habría producido dos versiones de la aritmética de solapamiento —la que
FASE3 §OV-02 señala como el punto de error más probable del sistema— y la que se corrigiera primero
dejaría a la otra equivocada.

---

## 3. DOS REGLAS QUE M-12 DIO POR IMPOSIBLES Y SÍ ERAN CALCULABLES

M-12 dejó POL-02 con **dos** reglas y advirtió que las otras exigirían datos que el modelo no
guarda. Al implementar M-17 se comprobó que **dos de esas cuatro sí salen del modelo**:

| Validación | Regla | De dónde salen los datos |
|---|---|---|
| VAL-21 | El conductor no conduce dos operativos cruzados | `t_operativo.cond_id` con sus horas |
| VAL-22 | La suma al volante no supera la jornada máxima | Ídem, con `JORNADA_MAXIMA_HORAS` |

El plan las pide expresamente en M-17, así que se incorporaron **a la política de
`talento-operativo`**, no a `transporte`. Usan `RangoHorario`, el mismo objeto de valor del
personal: el cruce de medianoche no admite una segunda implementación.

Las dos que siguen sin poder aplicarse son el **tipo de contrato** y el **tope de salidas pesadas**:
`t_conductor` guarda cédula, nombre, teléfono, licencia y vehículo habitual, y no hay proyección de
conductores equivalente a `t_historial_jornada`. Inventarlas exigiría datos que el modelo aprobado
no tiene. **Queda anotado en PV-03**, con el catálogo de conductores.

---

## 4. LA ESCRITURA PASA POR EL DUEÑO DEL AGREGADO

`transporte` **no escribe `t_operativo`**. Su repositorio toca `t_conductor`, `t_vehiculo` y
`t_disponibilidad`; la columna del operativo la escribe su dueño, a través de
`OperativosService.asignarTransporte()`. Es el contrato que CLAUDE.md §4 ya declaraba.

Tres consecuencias buscadas:

- **El cuarto nivel de la restricción es real.** El método recibe conductor, vehículo o `null`, y
  nada más. No hay un objeto de cambios genérico en el que colar una columna.
- **Las alertas se recalculan solas.** Al asignar conductor, ALV-02, ALV-03 y ALV-04 desaparecen
  dentro de la misma transacción (POL-06, M-15). Es el caso 1 del plan y no hay un solo `if` que lo
  provoque: se recalcula el conjunto entero.
- **`oper_version` no se toca.** La DAF y los departamentos escriben columnas disjuntas —dos campos
  frente a todo lo demás—, así que el conflicto que resuelve el bloqueo optimista no se produce
  entre ellos. Por eso el DTO **no lleva `version`**, y por eso puede tener exactamente dos
  propiedades.

---

## 5. API

| Método | Ruta | Roles |
|---|---|---|
| `GET` | `/transporte/pendientes/:fecha` | `DAF`, `DIRECTOR` |
| `GET` | `/transporte/conductores?fecha=` | `DAF`, `DIRECTOR` |
| `PATCH` | `/transporte/operativos/:id` | **`DAF`** |
| `PATCH` | `/transporte/operativos/:id/propios-medios` | **`DAF`** |
| `GET · POST · PATCH · DELETE` | `/administracion/conductores` | `ADMINISTRADOR_DMIP` |
| `GET · POST · PATCH · DELETE` | `/administracion/vehiculos` | `ADMINISTRADOR_DMIP` |

`GET /transporte/conductores` no estaba en la tabla del plan y **RN-45 la exige**: «el desplegable
excluye a quienes están en vacaciones o compensación». Si la lista llegara completa al navegador,
bastaría con no filtrarla para asignar a alguien ausente. El servidor no ofrece lo que después
rechazaría, y cada conductor viaja con su **vehículo habitual**, que es de donde la pantalla propone
la placa (caso 9).

El cuerpo de la asignación es, literalmente, esto:

```jsonc
{ "conductorId": 70, "vehiculoId": 80 }
```

Declarar propios medios **no lleva cuerpo**: la decisión es el propio acto, y un cuerpo vacío es una
superficie menos que vigilar.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Cualquier campo además de los dos | 400 | `CAMPOS_NO_PERMITIDOS` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| Un rol departamental o el `DIRECTOR` asignando | 403 | `ROL_NO_AUTORIZADO` |
| Conductor o vehículo inexistentes | 404 | `RECURSO_NO_ENCONTRADO` |
| Conductor o vehículo de baja, o vehículo en mantenimiento | 409 | `PERSONA_NO_DISPONIBLE` |
| Conductor ausente | 409 | `PERSONA_NO_DISPONIBLE` |
| Conductor que condujo patrulla ayer | 409 | `CONDUCTOR_PATRULLA_CONSECUTIVA` |
| Conductor con horario cruzado | 409 | `SOLAPAMIENTO_HORARIO` |
| Conductor que superaría la jornada | 409 | `JORNADA_MAXIMA_SUPERADA` |
| Formulario que no habilita vehículo | 409 | `CAMPOS_NO_PERMITIDOS` |
| Nocturno con condicionante declarado por propios medios | 409 | `CONDICIONANTE_NOCTURNO` |
| Fuera de la ventana de la DAF | 423 | `VENTANA_CARGA_CERRADA` |
| Cuadro cerrado | 409 | `CUADRO_CERRADO` |

---

## 6. TRES DECISIONES QUE CONVIENE REVISAR

**El vehículo en mantenimiento no se asigna.** No está en la lista de validaciones del plan, pero
`t_disponibilidad` admite `vehi_id` y `MANTENIMIENTO` existe en el enumerado **exactamente para
esto**. Asignar un vehículo que el modelo declara en taller sería usar el dato para nada.

**El nocturno con condicionante no se puede declarar por propios medios** (RN-43). Dejarlo sin
transporte la noche en que más falta hace contradice la regla, y además impediría cerrar la jornada
(INV-11, verificado en M-13).

**Declarar propios medios dos veces no es un error.** El resultado es el mismo, y rechazarlo
obligaría a la pantalla a comprobar el estado antes de cada clic.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **40 suites · 597 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **10 suites · 219 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las doce rutas mapeadas |

Sin migraciones: `npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones y
7 índices parciales.

### 7.1. Los once casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Asignar conductor y vehículo | `200`, `ASIGNADO`, alerta retirada | ✅ ALV-02 desaparece de la base |
| 2 | Enviar `horaInicio` además de los dos campos | `400 CAMPOS_NO_PERMITIDOS` con la lista | ✅ también `observaciones`, `version`, `estadoTransporte` |
| 3 | Rol `DMIP_OPERATIVOS` en este endpoint | `403` | ✅ |
| 4 | La DAF intentando crear un operativo | `403 ROL_NO_AUTORIZADO` | ✅ tampoco edita ni retira |
| 5 | Conductor de vacaciones | `409` con motivo y fecha de retorno | ✅ «2026-12-20» |
| 6 | Conductor que condujo patrulla ayer | `409 CONDUCTOR_PATRULLA_CONSECUTIVA` | ✅ unitaria de POL-02 |
| 7 | Conductor comprometido en horario cruzado | `409` con el operativo en conflicto | ✅ nombra `PMO-002-02-DIC-2026` |
| 8 | Propios medios | `PROPIOS_MEDIOS`, sin conductor ni vehículo | ✅ comprobado en la base |
| 9 | Seleccionar conductor | La placa se propone desde su vehículo habitual | ✅ |
| 10 | Asignación fuera de la ventana de la DAF | `423` | ✅ y la consulta **no** se restringe |
| 11 | Revisión del servicio | Solo escribe conductor, vehículo y estado | ✅ **comparando la fila completa** |

El caso 11 no se comprueba leyendo el código: la prueba lee **la fila entera antes y después** y
compara columna por columna. Solo pueden diferir las cuatro de transporte, las alertas —proyección
derivada— y `oper_actualizado_en`, que Prisma mantiene con `@updatedAt` en cualquier escritura.
`oper_version` y `oper_modificado_por_rol` se verifican explícitamente **sin cambiar**.

### 7.2. Dos correcciones de la propia prueba

- `TipoVentana` no tiene `DIARIA` sino **`DIARIO`**. La prueba fallaba con «Argument `tipo` is
  missing», porque un valor de enumerado inexistente llega como `undefined`.
- `oper_actualizado_en` sí cambia con la asignación: lo mantiene `@updatedAt`, no el servicio. Se
  incorporó a las columnas admitidas con esa explicación, en lugar de relajar la comparación.

---

## 8. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Dónde va |
|---|---|
| Aviso de capacidad de flota excedida | **M-18** (POL-07) |
| Pantalla P-03 de la DAF | **M-24** |
| Administración de la **disponibilidad** de conductores y vehículos | No está en ningún módulo del plan. Hoy las ausencias de conductor y vehículo se leen, pero solo se registran directamente en la base. **Ver §9** |

---

## 9. PENDIENTE DE VALIDACIÓN

- **PV-03 · Catálogo de conductores y vehículos.** Sigue sin entregarse. M-17 aporta la
  administración (`/administracion/conductores` y `/vehiculos`) para que el día que llegue se cargue
  por pantalla y no a mano en la base.
- **Sin endpoint para la disponibilidad de conductores y vehículos.** M-10 administra la del
  personal; el modelo admite las otras dos y este módulo las **lee** —RN-45 y el vehículo en
  taller—, pero ningún módulo del plan las administra. Se señala para decidir si M-18 las recoge o
  si merece su propio módulo.
- **Tipo de contrato y tope de salidas del conductor.** Las dos reglas de descanso que siguen sin
  poder aplicarse por falta de datos. Ver §3.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
