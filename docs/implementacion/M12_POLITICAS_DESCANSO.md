# M-12 · Políticas de descanso y elegibilidad

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E4 · Bloque C · Prioridad **P0 · Crítica** · Dependencias M-06, M-09 y M-11
Desbloquea M-14, M-15 y M-17 · Fecha: 2026-08-06

---

## 0. LO QUE ESTE MÓDULO IMPIDE

El plan lo enuncia sin rodeos: **es la razón por la que existe el proyecto**. Las transcripciones
describen funcionarios de dieciséis horas, patrullas en días consecutivos y accidentes por jornadas
encadenadas. Todo lo construido hasta aquí —el esquema, los catálogos, el maestro de personal, el
historial— existe para que estas seis reglas puedan ejecutarse.

| # | Regla | Código | Qué impide |
|---|---|---|---|
| 1 | Disponibilidad | `PERSONA_NO_DISPONIBLE` | Asignar a quien está de vacaciones, permiso, calamidad o reposo médico |
| 2 | Tipo de contrato | `CONTRATO_NO_ADMITE_TURNO` | Poner a personal de nombramiento en turno nocturno o fin de semana |
| 3 | Patrulla consecutiva | `PATRULLA_CONSECUTIVA` | Que alguien salga en patrulla dos días seguidos |
| 4 | Tope de salidas pesadas | `TOPE_SALIDAS_PESADAS` | Que las guardias se concentren siempre en las mismas personas |
| 5 | Solapamiento horario | `SOLAPAMIENTO_HORARIO` | Que una persona figure en dos operativos a la vez |
| 6 | Jornada máxima | `JORNADA_MAXIMA_SUPERADA` | Las jornadas encadenadas de dieciséis horas |

**Viven aquí y solo aquí.** Si aparece lógica de descanso en `operativos` o en `transporte`, es un
defecto que debe reportarse.

---

## 1. ARCHIVOS

Cuatro nuevos, más cuatro de prueba.

```
src/modules/talento-operativo/
├── application/
│   ├── politicas/
│   │   ├── descanso-personal.policy.ts    + .spec.ts   32 pruebas  ← POL-01
│   │   └── descanso-conductor.policy.ts   + .spec.ts    6 pruebas  ← POL-02
│   └── elegibilidad.service.ts            + .spec.ts   17 pruebas
└── infrastructure/
    └── elegibilidad.repository.ts

test/
└── elegibilidad.integracion-spec.ts                    19 pruebas
```

Modificados: `personal-elegible.service.ts` y `personal.controller.ts` —la consulta de elegibles
pasa a aplicar las políticas— y `talento-operativo.module.ts`. **Sin migraciones**: el módulo solo
lee.

---

## 2. LA DECISIÓN DE DISEÑO: LA POLÍTICA ES UNA FUNCIÓN PURA

`descanso-personal.policy.ts` no consulta la base, no lee parámetros y no conoce NestJS. Recibe
tres cosas —los antecedentes de la persona, el contexto de la asignación y los umbrales ya
resueltos— y devuelve un veredicto.

El trabajo se reparte así:

```
ElegibilidadService     consulta y traduce: parámetros, fechas, franjas, lotes
        ↓
verificarDescanso()     decide, sin tocar nada externo
```

Eso es lo que permite que los trece casos del plan se prueben **sin levantar nada**: 32 pruebas que
corren en dos segundos y cubren cada rama de cada regla. Un fallo aquí se ve en la prueba, no en
una jornada real.

También es lo que hace verificable el **caso 13** —«ninguna lógica de descanso fuera del
submódulo»—: las reglas están en un archivo que no exporta nada más que la función de decisión, y
`ElegibilidadService` es el único punto por el que otros submódulos preguntan. Sin acceso a los
antecedentes, no hay forma de reimplementarlas en otro sitio.

---

## 3. EL ORDEN IMPORTA, Y ES EL DEL PLAN

Las seis reglas se aplican en secuencia y **devuelve el primer motivo encontrado**:

```ts
return (
  reglaDisponibilidad(persona) ??
  reglaTipoContrato(persona, contexto) ??
  reglaPatrullaConsecutiva(persona, contexto, umbrales) ??
  reglaTopeSalidasPesadas(persona, contexto, umbrales) ??
  reglaSolapamiento(persona, contexto) ??
  reglaJornadaMaxima(persona, contexto, umbrales) ??
  ELEGIBLE
);
```

Enumerar todos los incumplimientos daría un mensaje que nadie lee entero. El primero es el que hay
que resolver, y cuando se resuelva aparecerá el siguiente si lo hubiera. Cuatro pruebas fijan la
precedencia entre reglas para que nadie reordene la cadena sin darse cuenta.

---

## 4. DE DÓNDE SALE CADA DATO

Aquí está la sutileza que más fácil se hace mal.

| Regla | Fuente | Por qué |
|---|---|---|
| Disponibilidad | `t_disponibilidad` | Estado y fecha de retorno; **nunca** `disp_motivo` |
| Tipo de contrato | `t_funcionario` | — |
| Patrulla consecutiva | `t_historial_jornada` | Días **cerrados**: la patrulla de ayer ya está consolidada |
| Tope de salidas | `t_historial_jornada` | Ídem, sobre el período de cómputo |
| Solapamiento | `t_asignacion_personal` + `t_operativo` | El día **en construcción**, que aún no está consolidado |
| Jornada máxima | `t_asignacion_personal` + `t_operativo` | Ídem |

**El historial sirve para el pasado; las asignaciones vivas, para el día que se está armando.**
Usar el historial para la jornada del día daría siempre cero: el cuadro todavía no se ha cerrado, y
la persona podría acumular veinte horas sin que ninguna regla se enterara.

### Lo que el veredicto NO deriva de quien pregunta

`esNocturno` **se calcula aquí**, con la franja de `FRANJA_NOCTURNA_INICIO` y `FRANJA_NOCTURNA_FIN`,
usando `RangoHorario` de M-09. Si lo aportara el llamador, cada submódulo tendría su propia idea de
qué es la noche y RN-43 dejaría de ser una sola regla. Lo mismo con el fin de semana, que se deriva
de la fecha en UTC según lo fijado en M-11.

---

## 5. LOS UMBRALES SON PARÁMETROS, Y SE NOTA

Ninguna de las seis reglas tiene un número escrito dentro. Los tres umbrales salen de
`t_parametro_politica` en cada verificación:

| Parámetro | Regla | Valor sembrado |
|---|---|---|
| `DIAS_DESCANSO_PATRULLA` | 3 | 1 |
| `TOPE_SALIDAS_PESADAS` | 4 | 3 |
| `JORNADA_MAXIMA_HORAS` | 6 | 12 |

`ParametroPoliticaService` los sirve de su caché en memoria, así que leerlos no cuesta una consulta,
y la caché se invalida en cuanto un administrador los modifica. Esa cadena es lo que hace verdadero
el **caso 10 del plan**, verificado de extremo a extremo contra la base:

```
verificar → elegible
PUT /parametros/JORNADA_MAXIMA_HORAS { "valor": "8" }   → 200
verificar → JORNADA_MAXIMA_SUPERADA, «el máximo es 8 horas»
PUT /parametros/JORNADA_MAXIMA_HORAS { "valor": "12" }  → 200
verificar → elegible
```

**Sin recompilar, sin reiniciar y sin desplegar.** RN-36 sigue marcada como pendiente de
validación: las fuentes describen jornadas de dieciséis horas como la situación a evitar, sin fijar
el límite. Por eso es un parámetro y no un número: el día que la Dirección lo decida, se cambia en
una pantalla.

---

## 6. LO QUE SALE Y LO QUE NO SALE DEL VEREDICTO

```ts
{ elegible: false, codigo: 'PATRULLA_CONSECUTIVA', motivo: '…' }
```

**Tres campos. Nada más.** Ni cédula, ni teléfono, ni área, ni tipo de contrato, ni siquiera el
identificador del funcionario. Una prueba lo comprueba campo por campo, y otra verifica que el
veredicto favorable ni siquiera lleva `codigo` ni `motivo`.

Hay una tensión aparente que conviene explicar. El plan dice «nunca devuelve datos del
funcionario», y a la vez el caso 5 exige el mensaje **con el nombre**:

> «PRUEBA_M12_PATRULLERO PERSONA salió en patrulla el día anterior y no puede repetir, ni diurna ni
> nocturna. Debe descansar 1 día entre patrullas.»

No se contradicen. Lo prohibido son los **campos estructurados**: que el veredicto sirva para
extraer la ficha de alguien. El nombre dentro del mensaje lo exige FASE2 §19.5 —*el mensaje debe
nombrar a la persona implicada y explicar el motivo en términos operativos*— y quien pregunta ya lo
conoce: está asignándola.

**El motivo de la ausencia sí queda dentro.** El veredicto dice «registra vacaciones hasta el
2026-08-15», no «cirugía programada». Una prueba de integración lo comprueba sobre datos reales.

---

## 7. LA CONSULTA DE ELEGIBLES, AHORA CON LAS SEIS REGLAS

`GET /personal/elegible` admite dos parámetros nuevos y **opcionales**:

```
?formulario=INSP&inicio=2026-08-06&horaInicio=08:00&horaFin=16:00
```

- **Sin horario**, la lista filtra como en M-10: área del formulario y ausencia.
- **Con horario**, aplica las seis reglas y devuelve solo a quien puede.

No podía ser de otra forma: sin horario no se sabe si el turno es nocturno, si se solapa con otro ni
cuántas horas sumaría. Las dos horas van juntas o no van —aplicar media regla sería peor que no
aplicarla—, y el endpoint lo rechaza con `400` si llega una sola.

**El filtrado es por lote.** La pantalla de registro puede tener cincuenta candidatos; preguntar
uno por uno serían ciento cincuenta viajes a la base cada vez que se abre el desplegable. El
repositorio trae los antecedentes de todo el grupo en cinco consultas y la política decide en
memoria.

---

## 8. TRES DECISIONES QUE CONVIENE CONFIRMAR

Ninguna bloquea; las tres son lecturas razonables de documentación aprobada, y se dejan escritas
para que el Product Owner pueda corregirlas si su intención era otra.

### 8.1 El nombramiento se rechaza por nocturno o fin de semana, no por horario completo

RN-26 dice que *«el personal de nombramiento cumple jornada de lunes a viernes de 08H00 a 16H30»*,
pero VAL-13 —la validación aprobada— solo declara la condición **«turno nocturno o fin de semana»**.

Se implementó VAL-13. Rechazar además un operativo de 17H00 a 19H00 en día laborable sería una
regla que la validación no enuncia, y las horas extra ordinarias son parte del trabajo. Si la
Dirección quiere el horario completo, es una línea.

### 8.2 El período de cómputo es de calendario, no una ventana deslizante

`PERIODO_COMPUTO_SALIDAS` admite `SEMANAL`, `QUINCENAL` y `MENSUAL`. Se interpretan como períodos
del calendario:

| Valor | Ventana para el 5 de agosto de 2026 |
|---|---|
| `SEMANAL` | lunes 3 a domingo 9 |
| `QUINCENAL` | 1 a 15 |
| `MENSUAL` | 1 a 31 |

Es la lectura natural de tres nombres de períodos del calendario, y permite al funcionario saber
cuándo se le renueva el cupo. La alternativa —los últimos treinta días— haría que el tope se
comportara distinto cada día.

### 8.3 La política del conductor tiene dos reglas, no seis

`t_conductor` guarda cédula, nombre, teléfono, licencia y vehículo habitual. No tiene tipo de
contrato, ni jornada consolidada, ni tope de salidas. Lo que sí tiene es disponibilidad —comparte
`t_disponibilidad`— y un historial de patrullas reconstruible desde los operativos que condujo.

`DescansoConductorPolicy` implementa esas dos: **ausencia** y **RN-44 patrulla consecutiva**. Añadir
las otras cuatro exigiría inventar datos que el modelo aprobado no guarda. Cuando llegue el catálogo
de conductores (**PV-03**) sabremos si hace falta más. M-17 es quien la aplicará.

---

## 9. PRUEBAS

### 9.1 Unitarias · `npm test`

```
Test Suites: 30 passed, 30 total
Tests:       390 passed, 390 total
```

55 nuevas: **32 de la política de personal**, 6 de la del conductor y 17 del servicio.

### 9.2 Integración · `npm run test:integracion`

```
Test Suites: 5 passed, 5 total
Tests:       88 passed, 88 total
```

19 nuevas, contra la base real: las seis reglas con datos verdaderos, el solapamiento con cruce de
medianoche sobre un operativo persistido, el caso 10 cambiando el parámetro **por la API**, y la
consulta de elegibles con y sin horario.

Todo lo creado lleva el prefijo `PRUEBA_M12` y se borra al terminar; `JORNADA_MAXIMA_HORAS` se
restituye a 12 pase lo que pase. Comprobado después: cinco tablas en cero y el parámetro en su valor
sembrado.

### 9.3 Los trece casos del plan

| # | Caso | Verificado |
|---|---|---|
| 1 | Persona de vacaciones | ✅ con motivo y fecha de retorno, sin el texto libre |
| 2 | Nombramiento en turno nocturno | ✅ |
| 3 | Nombramiento en sábado | ✅ |
| 4 | Ocasional en turno nocturno | ✅ elegible |
| 5 | Patrulla ayer, a patrulla diurna | ✅ **con el nombre** |
| 6 | Ídem a patrulla nocturna | ✅ la regla no distingue |
| 7 | Tope alcanzado, a turno nocturno | ✅ |
| 8 | `22:00–02:00` contra `01:00–05:00` | ✅ con el operativo en conflicto |
| 9 | Suma que supera la jornada | ✅ |
| 10 | Cambiar el umbral de 12 a 8 | ✅ **cambia sin recompilar**, verificado por la API |
| 11 | Persona con dos motivos | ✅ devuelve solo el primero |
| 12 | Contenido del veredicto | ✅ tres campos, ningún dato del funcionario |
| 13 | Lógica de descanso fuera del submódulo | ✅ ver abajo |

**Caso 13**, comprobado de tres formas: las reglas están en un único archivo puro; el único endpoint
que las consume devuelve la lista reducida sin `codigo`, `motivo` ni `elegible`; y ningún otro
submódulo importa las políticas —solo `ElegibilidadService`, que es lo que se exporta—.

Pruebas que el plan no pide y que conviene destacar: la precedencia entre las seis reglas, que el
umbral de patrulla admite dos días sin tocar código, que una patrulla **posterior** a la fecha
evaluada no descansa a nadie, que al editar un operativo este **no se solapa consigo mismo**, y que
la suma de medias horas no arrastra el error de la coma flotante.

---

## 10. LO QUE SIGUE CONDICIONADO POR EL NEGOCIO

| Pendiente | Efecto |
|---|---|
| **PV-26** · qué formularios son patrulla | La regla 3 lee `form_es_patrulla`. El mecanismo funciona; el dato lo decide el PO |
| **PV-02** · base de personal con tipo de contrato | La regla 2 depende de `func_tipo_contrato` |
| **RN-36** · umbral de jornada | Sigue pendiente de validación. Es un parámetro, con 12 como valor provisional |
| **PV-03** · catálogo de conductores | POL-02 no tiene a quién evaluar todavía |

Ninguno impide lo entregado. El día que lleguen los datos, **no hay código que escribir**.

---

## 11. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-14 · Registro de operativos** | `ElegibilidadService.verificar()` antes de asignar a cada persona |
| **M-15 · Asignación de personal** | Ídem, y `filtrarElegibles` para la lista |
| **M-17 · Asignación de transporte** | `verificarConductor()` |

Todos por servicio publicado. Ningún submódulo accede a los datos con los que se decidió.

---

## 12. VALIDACIÓN COMPLETA DE LA PILA · 2026-08-06

Ejecutada de extremo a extremo, con la pila **detenida y vuelta a levantar**.

| # | Paso | Resultado |
|---|---|---|
| 1 | Dependencias backend | ✅ 767 paquetes · **0 vulnerabilidades** · Node 24.18.0 |
| 2 | Dependencias frontend | ⚠️ 2 vulnerabilidades altas preexistentes (`react-router`, G-04) |
| 3 | `npx prisma generate` | ✅ v6.19.3 |
| 4 | `npx prisma migrate status` | ✅ *Database schema is up to date* |
| 5 | Compilación y lint backend | ✅ código 0 |
| 6 | Compilación y lint frontend | ✅ código 0 · una advertencia preexistente |
| 7 | `docker compose down` y `up -d --build` | ✅ los tres contenedores |
| 8 | PostgreSQL, backend y frontend | ✅ los tres `healthy` |
| 9 | `migrate deploy` · `prisma:verificar` · `db seed` | ✅ sin pendientes · 27/11/24/7 · semilla idempotente |
| 10 | Proxy del frontend | ✅ `localhost:5176/api/v1/estado` → 200 |
| 11 | Pruebas unitarias | ✅ **390 de 390**, 30 suites |
| 12 | Pruebas de integración | ✅ **88 de 88**, 5 suites |
| 13 | Rutas mapeadas | ✅ 30, **ninguna** con «elegibilidad», «historial» ni «veredicto» |
| 14 | Prueba funcional con identidad | ✅ ver §12.1 |

### 12.1 Las políticas, actuando sobre la lista real

Instancia local en el 3004, con tres personas de prueba: una ocasional, una de nombramiento y una
que salió en patrulla el martes 4.

| Consulta | Quiénes quedan | Regla que actúa |
|---|---|---|
| Sin horario | Las tres | Ninguna: sin horario no se pueden aplicar |
| Jueves, diurno, patrulla | Ocasional y nombramiento | **RN-24** excluye al patrullero |
| Miércoles, nocturno, patrulla | Solo la ocasional | RN-24 **y** RN-26/33 |
| Sábado, diurno, patrulla | Ocasional y patrullero | RN-26/33 excluye al nombramiento; el patrullero ya descansó cuatro días |
| Una sola hora | `400` | «Indique la hora de inicio y la de fin, o ninguna de las dos» |
| Hora `08:15` | `400` | «debe ser una hora en punto o y media» |

### 12.2 El umbral manda de verdad, comprobado en caliente

El mismo jueves 6, con la patrulla del martes 4 a dos días de distancia:

```
DIAS_DESCANSO_PATRULLA = 1  →  el patrullero aparece en la lista
PUT /parametros/DIAS_DESCANSO_PATRULLA {"valor":"3"}  →  200
                            →  el patrullero DESAPARECE, sin reiniciar
PUT ... {"valor":"1"}       →  200
                            →  vuelve a aparecer
```

De paso quedó demostrada una protección de M-06: el primer intento fue subirlo a **7** y la API lo
rechazó con `400` —«El valor máximo admitido para DIAS_DESCANSO_PATRULLA es 3 días»—, porque el
rango vive en la propia fila del parámetro.

### 12.3 Estado final

Base restituida: **0 funcionarios, 0 historial, 0 formularios, 0 operativos, 0 cuadros, 0
ausencias**, y los ocho parámetros en su valor sembrado, incluidos `JORNADA_MAXIMA_HORAS = 12` y
`DIAS_DESCANSO_PATRULLA = 1`.

---

## 13. ESTADO

**M-12 terminado y validado de extremo a extremo** (§12). Compilación y lint en 0 en ambos
repositorios; **390 pruebas unitarias** y **88 de integración** en verde; los trece casos del plan
verificados; pila reconstruida desde cero con los tres contenedores sanos; base restituida y los
ocho parámetros en su valor sembrado.

Es el módulo que da sentido a los once anteriores: desde hoy el sistema puede negarse a asignar a
una persona que no debe salir, y explicar por qué en una frase que esa persona entendería.

**A la espera de aprobación.**
