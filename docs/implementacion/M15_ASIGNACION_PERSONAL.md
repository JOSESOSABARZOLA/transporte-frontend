# M-15 · Asignación de personal y cálculo de alertas

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E6 · Bloque D · Prioridad **P1 · Alta** · Dependencia M-14
Desbloquea M-17, M-19 y M-20 · Fecha: 2026-08-06

---

## 0. ES DONDE SE JUNTAN LOS TRES SUBMÓDULOS

Una sola asignación atraviesa el sistema entero:

| Submódulo | Qué aporta |
|---|---|
| `configuracion` | Qué áreas admite el formulario y cuál es el cupo del rol compartido |
| `talento-operativo` | El maestro de personal y **el veredicto de descanso** |
| `operativos` | La composición, el cupo, la traza y las alertas |

Y es el módulo que cierra el círculo de M-12: las seis reglas de descanso que se escribieron
entonces se **aplican aquí por primera vez sobre datos reales**.

| Regla | Qué exige |
|---|---|
| VAL-10, INV-09 | La persona pertenece a un área que el formulario admite |
| INV-10 | Nadie figura dos veces en el mismo operativo |
| VAL-12 a VAL-17 | Las seis reglas de descanso, delegadas a `ElegibilidadService` |
| VAL-18, PER-06 | El rol compartido asigna dentro de su cupo y de su área |
| RN-34 | El teléfono sale del maestro, **nunca de la petición** |
| RN-52 a RN-55 | Las alertas se derivan del estado y desaparecen solas |
| RN-31, RN-32 | La composición de la patrulla, informada sin bloquear |

---

## 1. ARCHIVOS

Cuatro nuevos, más tres de prueba. **Sin migraciones**: `t_asignacion_personal`,
`oper_alertas` y `oper_alerta_activa` ya existían desde M-02.

```
src/modules/operativos/
├── application/
│   ├── politicas/
│   │   ├── alertas-operativo.ts        + .spec.ts   24 pruebas   ← POL-06
│   │   └── composicion-personal.ts     + .spec.ts   21 pruebas
│   └── calculador-alertas.service.ts
└── infrastructure/
    └── asignacion-personal.repository.ts

test/
└── asignacion-personal.integracion-spec.ts          21 pruebas
```

**Modificados:**

| Archivo | Cambio |
|---|---|
| `operativos.service.ts` | `asignarPersonal()`, `retirarPersonal()` y el recálculo de alertas al registrar y al editar |
| `operativos.repository.ts` | `personal` y `formulario.areas` en la carga anticipada; `guardarAlertas()`; `buscarPorIdEn()` |
| `operativo.dto.ts` | `AsignacionPersonalDto`, y `personal[]`, `alertas[]` y `composicion` en la respuesta |
| `operativos.controller.ts` | Los dos endpoints |
| `operativos.module.ts` | Importa `TalentoOperativoModule` |
| `codigos-error.ts` | El decimosexto código, `AREA_NO_ADMITIDA` (§4) |

---

## 2. POL-06 · LAS ALERTAS SE CALCULAN COMPLETAS, NUNCA DE FORMA INCREMENTAL

Es la decisión que define el módulo, y está tomada contra un defecto concreto: en el cuadro en
Excel **la celda sigue amarilla después de que el dato se completó**, porque alguien tiene que
acordarse de quitarle el color. RN-55 exige que la alerta desaparezca *automáticamente*.

`calcularAlertas()` recibe el estado del operativo y devuelve **todas** sus alertas. No recibe las
anteriores, no las modifica y no sabe cuáles había: **por construcción no puede dejar un residuo**.
La garantía no es un cuidado del programador, es la forma de la función.

| Alerta | Condición | Presentación |
|---|---|---|
| ALV-01 | Sin personal asignado | Celda de personal |
| ALV-02 | Transporte pendiente y el formulario habilita vehículo | Celda de conductor |
| ALV-03 | Consecuencia de ALV-02 | Celda de placa |
| ALV-04 | Condicionante nocturno **y** horario nocturno, sin conductor | Conductor, **crítica** |
| ALV-05 | Sin observaciones | Celda de observaciones |
| ALV-06 | Punto o tipo capturados como adicionales | Marca para normalizar |

Tres lecturas que convenía dejar escritas:

- **`NO_APLICA` no produce alertas de transporte.** Son los formularios que operan por propios
  medios o que no habilitan vehículo (RN-41, RN-42). Marcar en amarillo una celda que el formulario
  ni siquiera muestra sería una alerta que nadie puede resolver.
- **`PROPIOS_MEDIOS` tampoco.** La DAF ya decidió, y decidir que no hace falta vehículo es
  completar el dato, no dejarlo pendiente.
- **ALV-04 sustituye a ALV-02**, no se suma. Son la misma celda: mostrar dos avisos sobre el
  conductor obligaría al funcionario a decidir cuál lo describe.

### Cuándo se recalcula

Al **registrar**, al **editar**, al **asignar** y al **retirar** personal. Siempre **dentro de la
transacción** de la operación que lo provoca: si el registro se deshace, sus alertas también. Una
proyección que sobrevive a su origen es peor que ninguna.

`guardarAlertas` **no toca `oper_version`**, y es deliberado: la versión sostiene el bloqueo
optimista entre personas que editan; las alertas las recalcula el propio sistema. Incrementarla
haría que asignar personal invalidara la pantalla que otro tiene abierta, y ese conflicto no
existe.

---

## 3. QUÉ DECIDE ESTE MÓDULO Y QUÉ PREGUNTA

La asignación pasa por cuatro comprobaciones, en este orden:

```
1. Participación   ¿el rol participa en el formulario?      → 403
2. Jornada         ¿el cuadro admite escritura?             → 409 CUADRO_CERRADO
3. Composición     baja · repetición · área · cupo          → 409   ← lo decide `operativos`
4. Descanso        las seis reglas de M-12                  → 409   ← lo decide `talento-operativo`
```

**La composición va antes que el descanso a propósito.** Cuando las dos son ciertas, «ya figura en
este operativo» es más accionable que «superó su jornada máxima».

**Del descanso llega un veredicto, no una regla.** `ElegibilidadService.verificar()` devuelve
`{ elegible, codigo, motivo }` y este servicio lo traslada tal cual. Los antecedentes con los que
se decidió no cruzan la frontera: sin acceso a ellos, `operativos` no podría reimplementar el
descanso aunque quisiera, que es el propósito de la regla 1 de CLAUDE.md.

### POL-03 ya estaba implementada

El plan sitúa `ExclusividadHorariaPolicy` (POL-03, RN-28) en `operativos`. **No se creó, y es una
decisión**: M-12 ya la implementó como la quinta regla de `descanso-personal.policy.ts`, y llega en
el mismo veredicto. Escribirla otra vez aquí sería exactamente la duplicación que la regla 1
prohíbe —dos versiones de la aritmética de solapamiento, que FASE3 §OV-02 señala como el punto de
error más probable del sistema—.

Lo único que POL-03 no cubría es figurar dos veces en el **mismo** operativo: `ElegibilidadService`
excluye a propósito el operativo que se edita. Ese caso lo resuelve `composicion-personal.ts`.

---

## 4. EL DECIMOSEXTO CÓDIGO DE ERROR

El plan exige responder `409` cuando la persona es de un área que el formulario no admite, «con las
áreas que sí admite». Ninguno de los quince códigos de la guía §11.3 describe ese rechazo:
`CUPO_COMPARTIDO_SUPERADO` habla del cupo del rol compartido, que es otra cosa, y reutilizarlo
obligaría al frontend a distinguir dos situaciones **por el texto del mensaje**.

Se agregó `AREA_NO_ADMITIDA`, con su regla de origen (RN-15, VAL-10). Es el mismo criterio con el
que M-07 agregó una columna y M-14 otra: el diseño aprobado no cubría el caso, y completarlo en
silencio habría sido peor.

---

## 5. PER-06 · EL CUPO DEL ROL COMPARTIDO

El DMIT tiene **cupo de una persona del área de Instrucción** en el formulario 6 (PV-09,
provisional). Dos límites que el dueño no tiene:

- **Área.** Solo las marcadas `farea_es_compartida`. El modelo ya lo preveía; M-15 es el primero
  que usa esa columna.
- **Cantidad.** `form_cupo_compartido` personas, **contando solo las que él mismo asignó**. De ahí
  que `aper_asignado_por_rol` exista (RF-063): contarlas todas haría que el dueño consumiera el
  cupo ajeno con sus propias asignaciones.

Sin cupo declarado, el rol compartido no asigna: un cupo indefinido no es «ilimitado».

**La verificación no puede ir en una guarda**, y el plan lo dice: depende del área de la persona y
de cuántas lleva el rol en ese operativo, dos datos que la petición no trae.

### Una desviación del plan, para revisión

El plan reserva `DELETE /operativos/:id/personal/:funcionarioId` al **rol dueño**. Se implementó
así **más una excepción**: el rol compartido puede retirar **lo que él mismo asignó**.

Al pie de la letra, el DMIT podría ocupar su único cupo por error y necesitar que otro departamento
se lo liberase. `aper_asignado_por_rol` distingue exactamente eso, y el dueño sigue pudiendo
retirar a cualquiera. **Queda señalado por si el criterio del negocio es el literal.**

---

## 6. API

| Método | Ruta | Roles |
|---|---|---|
| `POST` | `/operativos/:id/personal` | Rol dueño **o compartido dentro de su cupo** |
| `DELETE` | `/operativos/:id/personal/:funcionarioId` | Rol dueño, o el compartido sobre lo suyo |

Ambos devuelven **el operativo completo**, con su personal, sus alertas ya recalculadas y el estado
de la composición: la pantalla no tiene que volver a consultarlo para pintar el resultado.

```jsonc
{
  "funcionarioId": 118,
  "esResponsable": true   // opcional
}
```

**El teléfono no está en el contrato de entrada.** Es RN-34 literal, y con `forbidNonWhitelisted`
enviarlo produce `400 CAMPOS_NO_PERMITIDOS` con el campo nombrado. Si pudiera enviarse, el cuadro
acabaría con tres números distintos para la misma persona, que es lo que hoy ocurre en el Excel.

La respuesta trae `nombre`, `area` y `telefono`, **sin cédula**: el cuadro no la usa, y M-10 ya
estableció que los datos personales no se exponen donde no hacen falta.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Teléfono u otro campo ajeno en el cuerpo | 400 | `CAMPOS_NO_PERMITIDOS` |
| Rol que no participa en el formulario | 403 | `FORMULARIO_NO_AUTORIZADO` |
| Retirar lo que asignó otro departamento | 403 | `FORMULARIO_NO_AUTORIZADO` |
| Persona inexistente, o que no figura en el operativo | 404 | `RECURSO_NO_ENCONTRADO` |
| Persona dada de baja | 409 | `PERSONA_NO_DISPONIBLE` |
| Ya figura en el operativo | 409 | `SOLAPAMIENTO_HORARIO` |
| Área no admitida por el formulario | 409 | **`AREA_NO_ADMITIDA`** |
| Fuera del área o del cupo compartido | 409 | `CUPO_COMPARTIDO_SUPERADO` |
| Las seis reglas de descanso | 409 | Su código de M-12 |
| Cuadro cerrado | 409 | `CUADRO_CERRADO` |

---

## 7. RN-31 Y RN-32 · SE INFORMAN, NO BLOQUEAN (PV-29)

«Las patrullas se integran con un inspector general y uno técnico» y «la nocturna suma una persona
de Instrucción» describen **la composición que la patrulla debe acabar teniendo**, no una condición
de cada asignación: aplicarlas al asignar **rechazaría siempre a la primera persona**, que por
definición deja la composición incompleta.

Ninguna fuente dice en qué momento se verifica ni qué ocurre si al cerrar la jornada no se cumple.
Inventarlo sería lo que el proyecto prohíbe, así que la respuesta informa:

```jsonc
"composicion": {
  "esPatrulla": true,
  "completa": false,
  "areasPendientes": ["INSTRUCCION"]
}
```

Registrado como **PV-29** en `PENDIENTES-VALIDACION.md`.

---

## 8. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **38 suites · 554 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **8 suites · 166 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las dos rutas nuevas mapeadas |

Sin migraciones: `npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones
y 7 índices parciales.

### 8.1. Los nueve casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Asignar persona elegible | `201`; la alerta de personal se retira | ✅ ALV-01 desaparece |
| 2 | La misma persona dos veces | `409` (INV-10) | ✅ antes de preguntar el descanso |
| 3 | Persona de área no admitida | `409` con las áreas que sí admite | ✅ `AREA_NO_ADMITIDA` |
| 4 | DMIT asignando dentro del cupo | Permitido | ✅ con `asignadoPorRol` |
| 5 | Ídem excediendo el cupo | `409 CUPO_COMPARTIDO_SUPERADO` | ✅ «1 de 1» |
| 6 | Ídem con personal que no es de Instrucción | `409` | ✅ con un área que el formulario **sí** admite |
| 7 | Retirar al último funcionario | ALV-01 vuelve a activarse | ✅ sin ningún código que la reactive |
| 8 | Asignar transporte y cambiar el horario | Las alertas se recalculan por completo | ✅ aparece ALV-04 y desaparece ALV-05 |
| 9 | Teléfono en la respuesta | Del maestro, no de la petición | ✅ y enviarlo produce 400 |

El caso 6 se probó con una persona del área **GENERAL**, que el formulario sí admite: es la única
forma de distinguir VAL-10 de PER-06. Con un área ajena al formulario respondía `AREA_NO_ADMITIDA`
y la prueba no habría verificado el cupo.

---

## 9. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Dónde va |
|---|---|
| Asignación de conductor y vehículo | **M-17**. Las alertas ya contemplan sus tres estados |
| Reglas de descanso del conductor (POL-02) | **M-17**, con `verificarConductor()`, ya disponible desde M-12 |
| Selector de personal en pantalla | **M-22** (P-01) |
| Celdas con alerta en la matriz | **M-22** y **M-24** (P-02 y P-04) |

---

## 10. PENDIENTE DE VALIDACIÓN

- **PV-09 · Cupo exacto del DMIT en el formulario 6.** Provisional: una persona. Es un dato de
  `form_cupo_compartido`, así que cambiarlo no exige desplegar código.
- **PV-29 · Momento de verificación de la composición de la patrulla (RN-31, RN-32).** Nuevo. Ver
  §7.
- **Desviación señalada:** el retiro por el rol compartido de sus propias asignaciones. Ver §5.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
