# M-11 · Historial de jornada

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E4 · Bloque C · Prioridad P1 · Dependencias M-10 · Desbloquea M-12
Fecha: 2026-08-06

---

## 0. QUÉ ES, Y QUÉ NO ES

`t_historial_jornada` **no guarda hechos nuevos**. Todo lo que contiene ya está en los operativos:
quién salió, cuántas horas, si fue de noche, si fue en patrulla. Es un resumen —una **proyección
persistida**— cuyo único propósito es que las reglas de descanso puedan preguntar «¿esta persona
salió ayer en patrulla?» sin recorrer el histórico completo de operativos en cada validación.

Esa naturaleza gobierna las tres decisiones del módulo, y conviene enunciarlas antes que el código:

| Decisión | Por qué |
|---|---|
| **Se recalcula entera, nunca se incrementa** | Reabrir un cuadro, borrar un operativo y volver a cerrar dejaría a esa persona con horas que ya no hizo |
| **No se audita** | La auditoría demuestra quién cambió qué; aquí no cambia nadie nada. Es un cálculo derivado, regenerable desde su fuente |
| **No tiene endpoints** | **RN-35**, decisión expresa del Product Owner: el acumulado de salidas no se muestra nunca en la interfaz |

---

## 1. ARCHIVOS

Tres nuevos, más tres de prueba.

```
src/modules/talento-operativo/
├── application/
│   ├── reglas-historial.ts              + .spec.ts   14 pruebas
│   └── historial-jornada.service.ts     + .spec.ts   12 pruebas
└── infrastructure/
    └── historial-jornada.repository.ts

test/
└── historial-jornada.integracion-spec.ts             16 pruebas
```

Un archivo modificado: `talento-operativo.module.ts`, para registrar y exportar el servicio.
**Nada más se tocó.** Sin migraciones: `t_historial_jornada` existe desde M-02 con su restricción
`ck_historial_horas`, su unicidad `uq_historial_func_fecha` y su índice
`idx_historial_func_fecha (func_id, hist_fecha DESC)`, que cubre las tres consultas de M-12.

---

## 2. EL RECÁLCULO ÍNTEGRO

`consolidarJornada(fecha)` rehace el historial de esa jornada desde cero:

1. Lee los aportes de todos los operativos de la fecha.
2. Los agrupa en una fila por persona.
3. Guarda cada fila con `upsert` por persona y fecha.
4. **Borra de esa fecha a quien ya no figura en el cuadro.**

El paso 4 es el que suele faltar. Sin él, este escenario deja datos falsos: el Director cierra el
cuadro, detecta que un operativo estaba mal, reabre, lo elimina y vuelve a cerrar. La persona que
figuraba en el operativo borrado conservaría sus horas y podría quedar excluida de un operativo al
día siguiente por una jornada que nunca ocurrió.

No es una idea nueva de este módulo: `FASE3 §OV-06` ya lo fija para el conjunto de alertas —*«el
recálculo total es deliberado; mantenerlas de forma incremental produciría estados residuales
cuando la condición que las originó desaparece, que es exactamente el defecto que hoy tiene el
cuadro en Excel»*—. Aquí se aplica el mismo criterio.

Los cuatro pasos ocurren **en una sola transacción**: un fallo a medias dejaría a unas personas con
la jornada nueva y a otras con la anterior, y las reglas de descanso se evaluarían contra un día
inconsistente.

**Es idempotente por construcción.** Ejecutarlo dos veces sobre la misma fecha deja el mismo
resultado; el servicio no lleva cuenta de si el cuadro se cerró por primera vez o por tercera, ni
necesita saberlo.

---

## 3. EL FIN DE SEMANA SE CALCULA EN UTC

Parece lo contrario de lo que exige RT-03 —*todo se evalúa en `America/Guayaquil`*— y por eso está
escrito en el código con su motivo.

`hist_fecha` y `cuad_fecha` son columnas **`@db.Date`**: fechas de calendario, sin hora ni zona, que
llegan a la aplicación como medianoche UTC. Preguntarle a esa fecha por su día de la semana en
Guayaquil —UTC-5— devolvería **las 19H00 del día anterior**:

```
2026-08-08T00:00:00Z   →   en Guayaquil, viernes 7 a las 19H00
```

Un operativo del sábado se contaría como viernes, y la persona sumaría **una salida de fin de
semana menos de las que hizo**, con lo que el tope de RN-25 dejaría pasar una guardia de más.

La zona horaria importa cuando se compara un **instante** con una hora de reloj: las ventanas de
carga, la franja nocturna. Una fecha de calendario no es un instante. Una prueba lo fija con ese
nombre: *«SE CALCULA EN UTC: un sábado no se convierte en viernes»*.

---

## 4. LAS BANDERAS Y LAS HORAS SE ACUMULAN DISTINTO

| Campo | Cómo se acumula | Regla |
|---|---|---|
| `hist_horas_jornada` | **Suma** de las duraciones del día | RN-36 · jornada máxima |
| `hist_fue_patrulla` | **Basta una** salida en patrulla | RN-24 · patrulla consecutiva |
| `hist_fue_nocturna` | **Basta una** salida nocturna | RN-25 · tope de salidas pesadas |
| `hist_fue_fin_semana` | Propiedad de la **jornada**, no del operativo | RN-25 |

Quien sale dos veces el mismo día suma las dos duraciones, pero le basta **una** salida en patrulla
para que el día entero cuente: RN-24 pregunta si salió, no cuántas veces.

Las horas se **redondean a una cifra decimal** antes de guardarse. `hist_horas_jornada` es
`DECIMAL(4,1)`, y sumar medias horas en coma flotante produce `8.399999999999999`, que la base
rechazaría o truncaría en silencio.

---

## 5. QUÉ CONSULTA M-12

El servicio expone exactamente lo que las políticas de descanso necesitan, y nada más:

| Método | Devuelve | Regla |
|---|---|---|
| `obtenerUltimaPatrulla(func)` | La **fecha** de la última patrulla, o `null` | RN-24 |
| `contarSalidasPesadas(func, periodo)` | Cuántas salidas nocturnas o de fin de semana | RN-25 |
| `obtenerHorasDelDia(func, fecha)` | Horas ya comprometidas, **0** si no hay historial | RN-36 |

`obtenerUltimaPatrulla` devuelve la fecha y no el registro entero: quien pregunta necesita saber si
fue ayer, no cuántas horas hizo ese día. Y `obtenerHorasDelDia` devuelve cero cuando no hay
historial porque **es exacto**: una persona sin jornada consolidada no ha salido. No es un valor por
defecto, es la respuesta.

---

## 6. UNA LICENCIA ARQUITECTÓNICA, DECLARADA

`HistorialJornadaRepository` es **el único repositorio que lee tablas de otro contexto**:
`t_operativo` y `t_asignacion_personal` pertenecen a `operativos` (M-14).

Es lo que hace una proyección. Si tuviera que pedir esos datos a otro submódulo, ese otro tendría
que exponer un servicio que devolviera exactamente esta forma, y la proyección viviría partida en
dos módulos que se mantendrían en sincronía a base de disciplina.

Lo que sí se respeta, y queda escrito en la cabecera del archivo:

- **No importa el repositorio de otro submódulo.** Consulta tablas, no clases ajenas.
- **No escribe en ninguna tabla que no sea la suya.**
- `operativos` **no sabe que esto existe**: la dependencia va en un solo sentido.

---

## 7. CUÁNDO SE EJECUTA, Y POR QUÉ NO HAY BUS DE EVENTOS

El plan dice que la proyección «se actualiza al consumir el evento `CuadroCerrado`». Ese evento lo
emitirá `cuadro-diario` en **M-13**, que todavía no existe.

Un bus de eventos exigiría `@nestjs/event-emitter`, una dependencia nueva que la guía §0.3 prohíbe
incorporar sin autorización. Así que **M-13 invocará `consolidarJornada(fecha)` directamente**, y
debe hacerlo **después de que la transacción del cierre haya confirmado**: la regla 6 de
`CLAUDE.md` dice que los eventos se emiten tras confirmar, nunca dentro.

Si algún día se aprueba un bus, lo único que cambia es **quién llama** a este método. La firma, el
comportamiento y las pruebas siguen igual.

---

## 8. PRUEBAS

### 8.1 Unitarias · `npm test`

```
Test Suites: 27 passed, 27 total
Tests:       335 passed, 335 total
```

26 nuevas: 14 de `reglas-historial` y 12 del servicio.

### 8.2 Integración · `npm run test:integracion`

```
Test Suites: 4 passed, 4 total
Tests:       69 passed, 69 total
```

16 nuevas. **Es la primera prueba que monta la cadena completa**: formulario, cuadro diario,
operativo, funcionario y asignación de personal. Todo con el prefijo `PRUEBA_M11` y borrado al
terminar; comprobado después: las cinco tablas quedaron en cero.

Los operativos de prueba usan `puntoLibre` y `tipoLibre` en lugar de las referencias del catálogo,
que es lo que `ck_operativo_punto` y `ck_operativo_tipo` admiten sin depender de PV-01.

### 8.3 Los seis casos del plan

| # | Caso | Esperado | Verificado |
|---|---|---|---|
| 1 | Cerrar un cuadro con tres operativos de una persona | Una sola fila con las horas sumadas | ✅ 9,5 horas y `operativos = 3` |
| 2 | Persona en patrulla nocturna | `fue_patrulla` y `fue_nocturna` verdaderos | ✅ |
| 3 | Operativo en sábado | `fue_fin_semana` verdadero | ✅ y la jornada del lunes no se contamina |
| 4 | Reabrir y volver a cerrar el mismo cuadro | Sin duplicar | ✅ dos consolidaciones seguidas dejan las mismas 9,5 horas |
| 5 | Operativo que cruza medianoche | Las horas se imputan al **día de inicio** | ✅ 22H00–02H00 del sábado suma al sábado; el domingo no existe |
| 6 | Ningún endpoint expone el acumulado | Confirmado por revisión de rutas | ✅ ver abajo |

**El caso 6 se verificó en tres niveles**, porque es una decisión de negocio y no un detalle:

1. El módulo **no registra ningún controlador** para el servicio.
2. Cinco rutas candidatas devuelven `404`, y la ficha completa del funcionario **no contiene**
   `horasJornada`, `fuePatrulla`, `fueNocturna` ni `fueFinSemana`.
3. Sobre el contenedor reconstruido: **30 rutas mapeadas, ninguna con «historial»**.

Una comprobación adicional que la prueba de integración deja fijada: al borrar los operativos de
una fecha y volver a consolidar, **el historial de esa fecha queda vacío**. Es el paso 4 de §2.

---

## 9. LO QUE SIGUE CONDICIONADO POR EL NEGOCIO

| Pendiente | Efecto sobre este módulo |
|---|---|
| **PV-26** · qué formularios son patrulla | `hist_fue_patrulla` se copia de `form_es_patrulla`. Con `t_formulario` vacía no hay nada que consolidar, y cuando se siembre, el valor de la bandera será el que decida el Product Owner |
| **PV-02** · base de personal | Sin funcionarios no hay asignaciones que resumir |
| **M-13** · cierre del cuadro | Nadie invoca todavía `consolidarJornada`. La proyección funciona; falta quien la dispare |

Ninguno impide lo entregado: el mecanismo está construido y probado con datos de prueba
verificables.

---

## 10. LO QUE ESTE MÓDULO DESBLOQUEA

**M-12 · Políticas de descanso y elegibilidad**, que el plan describe como *«la razón por la que
existe el proyecto»*. Las tres consultas de §5 son exactamente lo que RN-24, RN-25 y RN-36
necesitan para decidir si una persona puede salir.

---

## 11. ESTADO

**M-11 terminado.** Compilación y lint en 0; **335 pruebas unitarias** y **69 de integración** en
verde; los seis casos del plan verificados, el sexto en tres niveles; base restituida a su estado
inicial; contenedor reconstruido y sano, con 30 rutas mapeadas y ninguna que exponga el acumulado.

**A la espera de aprobación.**
