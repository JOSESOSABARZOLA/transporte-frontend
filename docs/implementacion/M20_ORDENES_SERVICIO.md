# M-20 · Órdenes de servicio

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E8 · Bloque F · Prioridad **P1 · Alta** · Dependencia M-19
Desbloquea M-26 · Fecha: 2026-08-06

---

## 0. `DatoAisladoBuilder` ES LA RAZÓN DE SER DEL MÓDULO

La orden de servicio expone **exclusivamente horario, funcionario, conductor y placa**. RN-51 dice
por qué sin rodeos: la filtración del cuadro permitía a los intervenidos anticiparse al operativo.

La decisión de diseño no es *qué campos omitir*, sino **de dónde no puede sacarlos**:

> `construirDatoAislado()` **no recibe el operativo ni lo referencia.** Recibe cuatro valores
> sueltos y devuelve un objeto congelado.

La diferencia no es de estilo. Si recibiera el operativo, omitir un campo dependería de **recordar**
omitirlo, y cualquiera que mañana agregue una columna al modelo la filtraría sin darse cuenta.
Recibiendo cuatro valores, **no hay nada más que filtrar**: la fuga es estructuralmente imposible,
no una disciplina que haya que sostener. FASE3 §OV-24 lo formula igual.

| Regla | Qué exige |
|---|---|
| RN-49 | Cada funcionario recibe **únicamente** su orden |
| RN-50 | La orden expone exclusivamente los cuatro datos |
| INV-23 | Una sola orden vigente por operativo y funcionario |
| INV-24 | El contenido son esos cuatro campos |
| INV-25 | Una orden emitida es **inmutable**; la corrección genera una reemisión |
| VAL-30 | Sin personal asignado no hay destinatario |

---

## 1. ARCHIVOS

Seis nuevos, más dos de prueba, **más una migración**.

```
src/modules/documentos/
├── domain/
│   └── dato-aislado.ts             + .spec.ts   16 pruebas   ← POL-09
├── application/
│   ├── orden-servicio.service.ts   + .spec.ts   16 pruebas
│   └── exportador-orden.ts
├── infrastructure/
│   └── orden-servicio.repository.ts
└── presentation/
    ├── dto/orden-servicio.dto.ts
    └── ordenes-servicio.controller.ts

test/
└── ordenes-servicio.integracion-spec.ts        19 pruebas

prisma/migrations/
└── 20260806160000_enlaza_usuario_con_funcionario/
```

**Modificado:** `documentos.module.ts`, que registra el servicio, el repositorio y el controlador.

---

## 2. LA MIGRACIÓN: `t_usuario.func_id`

El plan exige `GET /ordenes-servicio/mias`, que «filtra por la identidad del servidor, nunca por un
parámetro de la petición». Para filtrar hace falta saber **a qué funcionario corresponde el usuario
autenticado**, y en el modelo aprobado no hay forma de saberlo:

- `t_usuario` guarda correo, nombre, rol e identificador de directorio activo.
- `t_funcionario` guarda cédula, apellidos, nombres, teléfono, cargo, área y dirección.
- **Ninguna columna las relaciona.**

Las alternativas descartadas, y por qué:

| Alternativa | Por qué no |
|---|---|
| Cruzar por correo | `t_funcionario` no tiene correo |
| Cruzar la cédula contra `usua_identificador_ad` | Sería **suponer** que el identificador de directorio activo es la cédula. Nadie lo ha dicho, y un cruce equivocado entregaría a una persona la orden de otra — exactamente lo que RN-49 impide |

La columna es **nula** y lo seguirá siendo para la Dirección y la administración, que no salen a
operativos. `ON DELETE SET NULL`, no `CASCADE`: dar de baja a un funcionario no debe borrar su
cuenta de acceso. Y un índice único impide que dos cuentas apunten a la misma persona, porque
entonces dos usuarios verían las mismas órdenes.

**Un usuario sin enlace no recibe órdenes ajenas: recibe una explicación.** Devolver una lista vacía
diría «no tiene órdenes», que es falso y deja al funcionario esperando un documento que nunca llega.

`npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones y 7 índices
parciales: la migración agrega una columna, una clave foránea y un índice único —que no es parcial—.

---

## 3. LA REEMISIÓN, SOSTENIDA POR LA BASE

`uq_orden_vigente` es un índice único **parcial**: solo sobre las filas vigentes. De ahí salen las
dos invariantes a la vez:

- **INV-23** · no puede haber dos órdenes vigentes para el mismo operativo y funcionario;
- **INV-25** · sí puede haber todas las anuladas que haga falta, que es lo que exige que una
  corrección genere una reemisión.

Anular la anterior y escribir la nueva ocurren **con el mismo cliente de transacción**: entre las
dos no puede quedar un hueco por el que se cuele otra emisión.

**La anulada no se borra.** Sigue en la tabla como evidencia de lo que se comunicó: es la diferencia
entre corregir y hacer desaparecer.

---

## 4. EL CONTENIDO SE CONGELA EN LA EMISIÓN

`oser_dato_aislado` guarda los cuatro campos tal como estaban al imprimir. **Si la DAF cambia el
conductor media hora después, la orden ya entregada sigue diciendo lo que decía.**

Es evidencia de lo comunicado, no una vista en vivo. Un documento que se modifica solo no sirve para
responder «¿qué le dijeron a esta persona?», que es la pregunta que aparece cuando algo sale mal.

La prueba de integración lo verifica de la única forma que significa algo: emite, **cambia el
conductor por HTTP** y comprueba que el contenido guardado es idéntico al anterior — y que una
reemisión posterior sí recoge el conductor nuevo.

---

## 5. API

| Método | Ruta | Roles |
|---|---|---|
| `POST` | `/operativos/:id/ordenes-servicio` | **`DIRECTOR`** |
| `GET` | `/operativos/:id/ordenes-servicio` | **`DIRECTOR`** |
| `GET` | `/ordenes-servicio/mias` | **Cualquier usuario autenticado** |
| `GET` | `/ordenes-servicio/:codigo/documento` | Cualquier usuario autenticado, **sobre lo suyo** |

Dos lógicas de acceso opuestas, y las dos deliberadas:

- **Emitir** es un acto de la Dirección (PER-05).
- **Consultar las propias** no lleva `@Roles`: el destinatario de una orden es un funcionario, no un
  rol. El filtro no es el rol, es la identidad.

`/ordenes-servicio/mias` **no acepta ningún parámetro que diga de quién son**. Es el caso 6 del plan:
si el identificador viajara en la ruta o en la consulta, bastaría cambiarlo para leer las órdenes de
otro. La prueba lo intenta con `?funcionarioId=&usuarioId=` de otra persona y recibe las suyas.

La descarga del documento comprueba que **la orden sea de quien la pide**, y si no lo es responde
como si no existiera: decir «existe, pero no es suya» ya confirmaría que esa persona tiene un
operativo ese día.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Código de otra persona, o inexistente | 400 | `VALIDACION` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| Emitir con un rol distinto de `DIRECTOR` | 403 | `ROL_NO_AUTORIZADO` |
| Operativo inexistente o retirado | 404 | `RECURSO_NO_ENCONTRADO` |
| Usuario sin ficha de personal asociada | 404 | `RECURSO_NO_ENCONTRADO` |
| Emitir sobre un operativo sin personal | 409 | VAL-30 |

---

## 6. EL DOCUMENTO

Vertical, una hoja por persona, con el aviso de aislamiento —«Este documento contiene únicamente su
asignación»—. No es cortesía: le dice al funcionario que **no le falta información**, para que no
busque el resto por otro canal.

Es el reverso de la matriz: aquella es horizontal y muestra la jornada entera a la Dirección; esta
cabe en un teléfono y muestra cuatro datos. Se compone con `pdfkit`, ya instalado; **no se agregó
ninguna dependencia**.

`exportarOrden()` **recibe el dato aislado, no el operativo**, por el mismo motivo que POL-09: aquí
tampoco hay nada más que se pueda imprimir por descuido.

El **teléfono del conductor** sí viaja, y FASE5 §9.6 lo muestra en la tarjeta: el funcionario tiene
que poder llamarlo. Es uno de los cuatro campos, no un quinto.

---

## 7. EL CÓDIGO DE LA EMISIÓN

`OS-<identificador del operativo>-<funcionario>-<número de emisión>`.

Se compone de datos que ya existen en lugar de un consecutivo suelto: así el código **dice de qué
orden habla** cuando alguien lo cita en un oficio, y la reemisión se distingue de la primera entrega
sin consultar la base.

A diferencia de `cuad_orden_trabajo` (PV-28), aquí generarlo es lo correcto: FASE2 §CU-09 dice que
**el sistema** registra la emisión con código único. Lo que ninguna fuente fija es su forma, y esta
se eligió por trazable.

---

## 8. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npx prisma migrate deploy` | `transporte-backend` | migración #7 aplicada |
| `npm run prisma:verificar` | `transporte-backend` | 27 tablas, 11 enums, 24 CHECK, 7 índices |
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **46 suites · 676 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **13 suites · 278 pruebas** |
| `docker compose up -d --build transporte-app` | — | contenedor sano, sin migraciones pendientes |
| `docker logs transporte-app` | — | las cuatro rutas mapeadas |

### 8.1. Los nueve casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Emitir sobre operativo con tres funcionarios | Tres órdenes; **ninguna menciona a las otras dos** | ✅ |
| 2 | Contenido de `oser_dato_aislado` | Solo los cuatro campos | ✅ leído de la base |
| 3 | Emitir sobre operativo sin personal | `409`, sin destinatario | ✅ |
| 4 | Emitir con rol distinto de `DIRECTOR` | `403` | ✅ departamental y DAF |
| 5 | Dos usuarios en `/ordenes-servicio/mias` | Cada uno ve **solo las suyas** | ✅ |
| 6 | Manipular la petición con otro identificador | Se ignora | ✅ con `funcionarioId` y `usuarioId` ajenos |
| 7 | Emitir dos veces sobre el mismo operativo y persona | La primera deja de ser vigente | ✅ y la anulada **no se borra** |
| 8 | Cambiar el conductor tras emitir | La orden ya emitida **no cambia** | ✅ cambiando el conductor por HTTP |
| 9 | Documento generado | Vertical, uno por persona, con el aviso | ✅ `%PDF` real |

Además: el punto de encuentro **no aparece** en la orden aunque el operativo lo tenga, y el
identificador del operativo tampoco viaja dentro del dato aislado —está en el código, que identifica
al documento, no en su contenido—.

### 8.2. Una corrección de la propia prueba

La prueba enlazaba dos usuarios con dos funcionarios y **pasaba por una coincidencia**: `t_usuario`
estaba vacía, la secuencia empezaba en 1, y esos identificadores resultaban coincidir con los
perfiles provisionales de `usuarios-prueba.ts`. Con la tabla poblada habría respondido `401` sin
decir por qué.

Ahora los identificadores se fijan **explícitamente** —1 y 2—, con una comprobación previa que falla
con un mensaje claro si esas filas ya existen. La dependencia entre la identidad provisional y los
datos de prueba quedó escrita, en lugar de funcionar de casualidad.

---

## 9. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Motivo |
|---|---|
| Envío por correo institucional | **PV-07.** El canal de entrega sigue sin definirse; se implementa la emisión y la consulta propia, como dice el plan |
| Formato institucional único del documento | **PV-08.** Se usa el diseño del prototipo, marcado como provisional, hasta que la DNP emita el suyo |
| Pantallas P-05 y P-06 | **M-26** |
| Logotipo en el documento | **PV-30**, abierto desde M-19 |

---

## 10. PENDIENTE DE VALIDACIÓN

- **PV-07 · Canal de entrega.** Sin definir. La consulta propia ya existe; el envío por correo no.
- **PV-08 · Formato unificado del documento impreso.** Sin definir.
- **PV-30 · Logotipo institucional para el backend.** Abierto desde M-19.
- **Quién enlaza cada usuario con su ficha de personal.** La columna existe y es nula por defecto;
  **falta decidir si lo hace el administrador desde una pantalla o si viene del directorio activo**.
  Mientras tanto, un usuario sin enlace recibe un mensaje que se lo explica.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
