# M-24 · Pantalla P-03 · Asignación de transporte

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P1 · Alta** · Dependencias M-17, M-18, M-21
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. LA PANTALLA QUE DIBUJA UNA REGLA

El plan lo dice sin rodeos: **es la pantalla donde el diseño expresa visualmente una regla de
negocio**. La DAF escribe **dos campos** de los nueve formularios (RN-40); todo lo demás lo cargó
otro departamento y no le corresponde tocarlo.

Eso no se explica aquí en un aviso: se ve. El panel llega entero deshabilitado salvo dos controles,
y esos dos llevan `badge badge-accent badge-xs` con la palabra *Editable* junto a su etiqueta.

Es el cuarto nivel de la restricción de la DAF, y el único que el funcionario percibe. Los otros
tres —endpoint propio bajo `/transporte`, DTO de dos propiedades, escritura acotada en el
repositorio— viven en el servidor y siguen ahí aunque esta pantalla se equivoque.

---

## 1. ARCHIVOS

Seis nuevos, dos de prueba y uno modificado.

```
src/
├── pages/
│   └── AsignacionTransportePage.tsx                 (nuevo)
├── components/transporte/                           (nuevo)
│   ├── PanelAsignacionTransporte.tsx
│   ├── BandejaTransporte.tsx
│   ├── IndicadorFlota.tsx
│   └── transporte.spec.tsx                          17 pruebas
├── utils/
│   ├── ventanaCarga.util.ts                         (nuevo)
│   ├── flota.util.ts                                (nuevo)
│   └── ventanaCarga.spec.ts                         12 pruebas
└── config/routes.tsx        (modificado: la ruta real sustituye al marcador)
```

**Sin dependencias nuevas.** Los servicios y las interfaces ya estaban desde M-21.

---

## 2. LO QUE FALTA EN EL CONTRATO · PV-33

Hay que decirlo antes que nada porque condiciona la pantalla.

`PATCH /transporte/operativos/:id` exige `vehiculoId`. Pero **la DAF no tiene ningún endpoint para
listar la flota**: el único que enumera vehículos es `GET /administracion/vehiculos`, y su
controlador lleva `@Roles(ADMINISTRADOR_DMIP)` a nivel de clase. Lo único que este perfil llega a conocer
es el **vehículo habitual de cada conductor**, que viaja dentro de `GET /transporte/conductores`.

Así que la lista de placas se compone con los vehículos habituales de los conductores disponibles,
sin repetir. Es lo que se puede ofrecer **sin inventar nada**, y cubre el caso 3 del plan.

**La consecuencia se declara en lugar de disimularse:** un vehículo que no sea habitual de ningún
conductor no se puede asignar desde esta pantalla. Cuando no hay ninguno, el desplegable lo dice con
su motivo —«ningún conductor disponible tiene vehículo habitual registrado»— en vez de quedarse
vacío como si fuera un fallo.

No lo resolví por mi cuenta porque las tres salidas posibles son decisiones ajenas:

- **Abrir `GET /administracion/vehiculos` a la DAF** cambia el alcance de un rol, y en esta pantalla
  el alcance de la DAF es precisamente lo que se está protegiendo.
- **Un endpoint nuevo `GET /transporte/vehiculos`** es trabajo de backend, y el plan de M-24 dice
  «Frontend» y no lista ninguno.
- **Aceptar la limitación** exige saber si en la AMC todo vehículo tiene conductor habitual, que es
  una pregunta para la DAF.

Registrado como **PV-33**.

---

## 3. LOS DOS EDITABLES, VERIFICADOS CONTANDO

La prueba más importante del módulo no nombra los dos campos escribibles: **los cuenta**.

```
const editables = controles.filter((control) => !control.disabled);
expect(editables).toHaveLength(2);
```

Nombrarlos habría dejado pasar exactamente la regresión que importa: alguien agrega mañana un tercer
campo editable al panel y las aserciones sobre conductor y placa siguen pasando. Contando, no.

**Los campos bloqueados son `input disabled`, no distintivos**, al revés que en P-01. No es una
incoherencia: en P-01 los valores calculados **no los escribe nadie**, y un campo sugeriría lo
contrario. Aquí sí son campos del operativo, escritos por otra persona, y mostrarlos con aspecto de
campo es justamente lo que comunica «esto se edita, pero no por usted».

---

## 4. «TODAVÍA NO» NO ES LO MISMO QUE «YA NO»

Los casos 7 y 8 piden dos mensajes distintos para la misma ventana cerrada, y el servidor devuelve
un solo `mensajeCierre`. `momentoRespectoDeVentana` elige cuál de las dos frases lo acompaña:

| Momento | Aviso |
|---|---|
| Antes de las 15H00 | `alert-info` · «aún no es su turno», con la hora de apertura |
| Después de las 16H30 | `alert-error` · «la ventana ya cerró» |

Confundirlas hace que alguien crea que se le pasó el plazo cuando faltan dos horas, y llame por
teléfono a preguntar —que es el canal que este sistema existe para cerrar—.

**No decide si se puede escribir. Eso ya viene decidido:** `abierta` lo dice el servidor y es la
única palabra que habilita los controles. Y el `mensaje` del servidor se sigue mostrando tal cual
(regla 7); esto lo acompaña, no lo sustituye.

**Se mide en la zona de la ventana**, con `Intl.DateTimeFormat` sobre `zonaHoraria`, no en la del
navegador. Hay dos pruebas dedicadas: 20H00 UTC son las 15H00 en Quito.

Cuando no se puede afirmar de qué lado se está —una ventana semanal, o sin horas declaradas— la
función **se calla** y deja hablar solo al servidor, en lugar de arriesgar un aviso equivocado el
sábado.

> **La ventana cierra la escritura, no la consulta.** `VentanaCargaGuard` deja pasar toda petición
> de lectura, así que la bandeja se ve a cualquier hora. Es lo que permite que los casos 7 y 8 sean
> «solo lectura» y no «pantalla en blanco».

---

## 5. LA BANDEJA

**El orden lo decide el servidor y no se reordena aquí.** `GET /transporte/pendientes/:fecha`
devuelve los nocturnos primero porque son los que impiden cerrar la jornada (INV-11 y RN-43).
Reordenar en el cliente por identificador o por formulario enterraría el operativo urgente en mitad
de la lista sin que nadie lo notara.

**Todo lo que llega está pendiente.** El endpoint filtra por `estadoTransporte = PENDIENTE` y por
formularios que habilitan vehículo. Por eso al guardar una asignación **la fila sale de la bandeja**
y el contador baja: es literalmente el caso 5 del plan.

> El esquema de FASE5 §4.2 dibuja además una fila ya resuelta, con acción «Revisar». Esa fila **no
> es alcanzable** desde el endpoint que el plan asigna a este módulo, que solo devuelve pendientes.
> Traerla exigiría una segunda fuente —`GET /operativos`— que el plan no lista aquí. Se deja fuera y
> se declara, en lugar de ampliar el alcance por cuenta propia.

**RN-43 se distingue del simple pendiente.** La celda amarilla de conductor dice «Obligatorio,
pendiente» cuando es un nocturno con condicionante, y «Pendiente» cuando no. No es lo mismo «falta»
que «sin esto no se cierra la jornada», y el Amarillo de Alerta por sí solo no distingue las dos
(regla 6).

---

## 6. LA FLOTA AVISA, NO BLOQUEA

Caso 9 y VAL-24. Que la demanda supere la flota declarada es un hecho de la jornada, no un error de
captura: el cuadro sigue siendo válido y alguien lo resolverá pidiendo apoyo o cubriendo por propios
medios. Un bloqueo aquí obligaría a la DAF a mentir en la declaración de capacidad para poder seguir
trabajando.

El distintivo excedido es `badge-error`; el que alcanza, `badge-ghost`. Y **`declarada` en nulo no
es cero**: mientras la DAF no declare su flota no hay con qué comparar, y decir «0/0» afirmaría que
no hay vehículos. Se dice que falta declararla.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **7 archivos · 102 pruebas** (29 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · `AsignacionTransportePage` en su fragmento (12,2 kB) |

### 7.1. Los diez casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Bandeja · pendientes primero, con contador | ⏳ el orden es del servidor y el contador es la longitud; **exige backend** |
| 2 | Abrir el panel · todo deshabilitado salvo dos | ✅ **contando** los controles habilitados, más los dos distintivos *Editable* |
| 3 | Elegir conductor · la placa se completa | ✅ y sigue siendo cambiable; y sin vehículo habitual, queda por elegir |
| 4 | Conductor no elegible | ✅ el motivo del `409` tal cual, y el panel sigue en pie |
| 5 | Guardar · la fila sale de pendientes | ⏳ el panel se cierra y la bandeja se recarga; **exige backend** |
| 6 | Propios medios · sin asignar vehículo | ✅ el botón se pulsa sin conductor ni placa elegidos |
| 7 | Antes de las 15H00 · solo lectura | ✅ 12 pruebas sobre el momento, más el botón deshabilitado con su motivo |
| 8 | Después de las 16H30 · solo lectura | ✅ ídem, con el aviso en `alert-error` |
| 9 | Flota excedida · avisa sin bloquear | ✅ el distintivo excedido y el que alcanza |
| 10 | Sin pendientes · estado vacío | ✅ |

### 7.2. Qué queda pendiente de mirar

- **Los casos 1 y 5 exigen backend con datos.** El orden lo garantiza el `orderBy` del repositorio
  y el vaciado de la fila es consecuencia de que el endpoint solo devuelva pendientes: las dos son
  afirmaciones sobre el servidor, y probarlas desde la interfaz sería probar el simulacro.
- **Maquetación a 375, 768 y 1440 px.** FASE5 §9 pide panel apilado, dos columnas y cuatro
  columnas; las clases están puestas (`sm:grid-cols-2 xl:grid-cols-4`) pero afirmarlo exige abrirlo.
- **El recorrido completo** —asignar de verdad, ver caer el contador— sigue bloqueado por PV-01,
  PV-03, PV-25 y PV-26.

---

## 8. PENDIENTE DE VALIDACIÓN

- **PV-33 · la DAF no puede listar la flota.** Es el punto de este módulo. Ver §2.
- **La fila ya resuelta del esquema no se muestra**, porque el endpoint asignado no la devuelve.
- **PV-03** —catálogo de conductores y vehículos, que entrega la DAF— bloquea el uso real de esta
  pantalla más que ninguna otra: sin conductores no hay nada que elegir.
- **La capacidad se consulta pero no se declara desde aquí.** `PUT /transporte/capacidad/:fecha`
  existe y el servicio lo consume, pero el plan sitúa la declaración en P-09 (M-29). Si la DAF
  espera declararla en su propia pantalla, es un cambio de alcance que conviene confirmar.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
