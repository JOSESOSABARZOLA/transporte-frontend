# M-13 · Cuadro diario

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E5 · Bloque C · Prioridad **P0 · Crítica** · Dependencia M-08
Desbloquea M-14 · Fecha: 2026-08-06

---

## 0. QUÉ GOBIERNA ESTE MÓDULO

Todo lo construido hasta aquí describe **cómo** se registra un operativo. Este módulo decide
**cuándo**: abre la jornada, la lleva por sus cuatro estados y la congela cuando la Dirección se
hace responsable de ella.

Desde M-14 en adelante, cada escritura del sistema empieza preguntando aquí si todavía se puede
escribir. Por eso el servicio se documenta como *el reloj del sistema*: no es un CRUD de una tabla
más, es la condición previa de las demás.

| Regla | Qué exige |
|---|---|
| RN-05 | Un solo cuadro por fecha |
| RN-06 | El número de semana se **deriva** de la fecha, no se digita |
| RN-58 | El cuadro cerrado no admite modificaciones |
| INV-03 | Se pasa por los cuatro estados **en orden** |
| INV-11 | No se cierra con un operativo nocturno sin conductor |
| CU-10 | Cierra la Dirección, cuando las ventanas han vencido |
| PV-11 | La reapertura existe, sin flujo de autorización adicional |

---

## 1. ARCHIVOS

Siete nuevos, más cuatro de prueba. **Sin migraciones**: `t_cuadro_diario` ya existía desde M-02
con sus cuatro estados, su contador de reaperturas y su unicidad por fecha.

```
src/modules/cuadro-diario/
├── domain/
│   ├── semana-iso.ts               + .spec.ts   12 pruebas
│   └── estado-cuadro.ts            + .spec.ts   13 pruebas
├── application/
│   └── cuadro-diario.service.ts    + .spec.ts   21 pruebas
├── infrastructure/
│   └── cuadro-diario.repository.ts
├── presentation/
│   ├── dto/cuadro.dto.ts
│   └── cuadros.controller.ts
└── cuadro-diario.module.ts

test/
└── cuadro-diario.integracion-spec.ts            21 pruebas
```

Modificados: `src/app.module.ts` —registra el módulo— y `test/jest-integracion.json`, que pasa a
ejecutar las suites de integración **en serie** (§7).

---

## 2. LA DECISIÓN DE DISEÑO: EL ESTADO LO MUEVE EL RELOJ, NO UNA PERSONA

Es la decisión que define el módulo, y nace de cruzar dos frases de las fuentes:

- **INV-03** exige pasar por `BORRADOR → EN_TRANSPORTE → APROBADO → CERRADO` en orden.
- **CU-10** dice que el Director cierra cuando *«las ventanas de carga y de transporte han
  vencido»*.

Juntas describen un estado intermedio que **nadie mueve a mano**. Si hubiera que moverlo a mano,
alguien tendría que acordarse de pulsar «pasar a transporte» a las 15H00 todos los días, y el día
que se olvidara la DAF no podría trabajar.

`sincronizarConVentanas()` lleva el estado guardado hasta donde dicen las ventanas de M-08, **un
escalón a la vez**:

| Situación de las ventanas | Estado al que llega |
|---|---|
| Alguna departamental activa y abierta | `BORRADOR` |
| Departamentales vencidas, la de la DAF abierta | `EN_TRANSPORTE` |
| Todas vencidas | `APROBADO` |
| — | `CERRADO` solo por acto del Director |

Se invoca desde la consulta y desde el cierre. Consecuencias buscadas:

1. **No hace falta un planificador.** Un `@nestjs/schedule` sería una dependencia nueva sin
   autorización, y un proceso más que vigilar en producción.
2. **No hace falta un endpoint de «avanzar».** El plan no lo contempla y sería una pantalla más.
3. **El Director no puede cerrar un cuadro que la DAF sigue completando**: el cierre exige llegar
   a `APROBADO`, y a `APROBADO` solo se llega con las ventanas vencidas.
4. **Nunca retrocede.** Reabrir una ventana no devuelve a borrador un cuadro ya aprobado: la
   sincronización solo avanza.

### 2.1. Una ventana desactivada no retiene el cuadro

Detectado al probar contra la base real, y corregido. M-08 define que una ventana **desactivada**
significa *sin restricción horaria*, y su evaluador responde que se puede escribir siempre. Si eso
se leyera como «la ventana sigue abierta», desactivar la ventana de la DAF —cosa que el
administrador puede hacer desde la pantalla de M-08— dejaría el cuadro atrapado antes de `APROBADO`
y **la Dirección no podría cerrar la jornada nunca más**.

Por eso el servicio no pregunta `puedeEscribir()` sino `obtenerEstado()`, y solo una ventana
`activo && abierta` retiene la jornada. La distinción quedó escrita en el código y tiene su propia
prueba.

---

## 3. LA SEMANA ISO, QUE PARECE TRIVIAL Y NO LO ES

`cuad_nro_semana` alimenta los reportes semanales. La norma ISO 8601 no dice «la semana número N
del año»; dice que la semana pertenece al año de su **jueves**. De ahí que:

- el **31 de diciembre de 2026** sea la semana **53 de 2026**;
- el **1 de enero de 2027** siga siendo la semana **53 de 2026**;
- el **31 de diciembre de 2025** sea ya la semana **1 de 2026**.

Un cálculo ingenuo (`día del año / 7`) pondría dos jornadas contiguas en años distintos y partiría
el reporte de la primera semana de enero. Por eso `semanaIso()` devuelve **número y año juntos**:
guardar el número sin su año haría irrecuperable el caso del cambio de año.

Se calcula en **UTC**, como todo lo que toca `@db.Date`. Leer una fecha de calendario con el huso
de Quito la desplazaría un día, y una jornada de lunes caería en la semana anterior.

---

## 4. LO QUE NO SE INVENTÓ: LA ORDEN DE TRABAJO (PV-28)

`cuad_orden_trabajo` es obligatoria y única. **Ninguna fuente define su formato**: `FASE4` solo
dice «código institucional, único», y las transcripciones no lo mencionan.

Generarlo por nuestra cuenta —`OT-2026-217`, por ejemplo— pondría un código inventado en la matriz
consolidada y en cada orden de servicio que se entrega a un funcionario. Un código así circula
fuera del sistema y termina citado en un oficio.

Se toma, por tanto, **como dato de entrada obligatorio** y se registra como **PV-28** en
`PENDIENTES-VALIDACION.md`. El día que el negocio defina el formato, la generación se agrega
detrás del mismo endpoint sin cambiar el contrato.

---

## 5. API

Prefijo `/api/v1`. Cadena `IdentidadGuard → RolesGuard`. **Sin `VentanaCargaGuard`**, y es
deliberado: la ventana gobierna la carga de operativos, no el ciclo de vida de la jornada —
precisamente el cierre ocurre *cuando* las ventanas ya vencieron.

| Método | Ruta | Rol | Devuelve |
|---|---|---|---|
| `POST` | `/cuadros` | `ADMINISTRADOR_DMIP` | 201 con el cuadro abierto |
| `GET` | `/cuadros/:fecha` | Todos | 200 con el estado ya sincronizado |
| `POST` | `/cuadros/:fecha/cerrar` | **`DIRECTOR`** | 200 con el cuadro cerrado |
| `POST` | `/cuadros/:fecha/reabrir` | **`DIRECTOR`** | 200 con el contador subido |

El cuerpo de la apertura tiene **exactamente dos propiedades**: `fecha` y `ordenTrabajo`. Enviar
`nroSemana` produce `400 CAMPOS_NO_PERMITIDOS`; es el caso 3 del plan y la garantía de RN-06.

La respuesta incluye `admiteEscritura`, que es lo que la cabecera de cada pantalla necesita para
decidir si habilita los formularios.

### Errores

| Situación | Código HTTP | Código de negocio |
|---|---|---|
| Segundo cuadro para la misma fecha | 400 | `VALIDACION` |
| Orden de trabajo repetida | 400 | `VALIDACION` |
| Fecha mal escrita o inexistente | 400 | `VALIDACION` |
| `nroSemana` en el cuerpo | 400 | `CAMPOS_NO_PERMITIDOS` |
| Sin cabecera de identidad | 401 | `NO_AUTENTICADO` |
| Rol departamental cerrando | 403 | `ROL_NO_AUTORIZADO` |
| Fecha sin cuadro | 404 | `RECURSO_NO_ENCONTRADO` |
| Cerrar antes de que venzan las ventanas | 409 | `CUADRO_CERRADO` |
| Cerrar con un nocturno sin conductor | 409 | `CONDICIONANTE_NOCTURNO` |

---

## 6. EL CIERRE, PASO A PASO

```
1. sincronizarConVentanas()      ¿las ventanas vencieron?      si no → 409
2. ¿ya estaba cerrado?                                          si sí → 409
3. INV-11 · ¿algún nocturno sin conductor?                      si sí → 409 con la lista
4. ── transacción ──  estado = CERRADO + auditoría CERRAR
5. ── después de confirmar ──  consolidarJornada(fecha)   (M-11)
6. log «Cuadro diario cerrado»
```

Dos puntos que no son casuales:

**INV-11 se verifica al cerrar y no al registrar** (PV-05). El conductor lo asigna la DAF después
de que el operativo existe: registrar un nocturno sin conductor es normal; cerrar la jornada
dejándolo así, no. El mensaje enumera los operativos que faltan con su horario, porque el Director
necesita saber a quién reclamar, no solo que algo falta.

**La consolidación del historial ocurre fuera de la transacción** (regla 6 de CLAUDE.md). Si el
cierre se confirmó y la consolidación falla, el cuadro queda cerrado y el historial se rehace:
`consolidarJornada` es idempotente. Al revés no: meter una proyección derivada dentro de la
transacción del cierre haría que un fallo en ella impidiera cerrar la jornada del día.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **33 suites · 437 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **6 suites · 109 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las cuatro rutas mapeadas |

### 7.1. Las pruebas de integración pasan a ejecutarse en serie

Al escribir la suite de M-13 apareció un defecto latente en las cinco anteriores: **las seis
comparten una sola base**. La de catálogos ocupa los números de formulario 7, 8 y 9; esta ocupa el
6; y esta, además, desactiva las ventanas de carga mientras corre para no depender de la hora del
día a la que se ejecute.

En paralelo se pisan entre sí y el fallo aparece de forma intermitente, que es la peor manera de
descubrirlo. `test/jest-integracion.json` fija ahora `maxWorkers: 1`, con el motivo escrito en el
propio archivo.

### 7.2. Los nueve casos del plan

| # | Caso | Dónde se verifica |
|---|---|---|
| 1 | Dos cuadros para la misma fecha | unitaria + integración |
| 2 | 31 de diciembre → semana 53 | `semana-iso.spec.ts` (7 pruebas) + integración |
| 3 | `nroSemana` enviado por el cliente | integración, `400 CAMPOS_NO_PERMITIDOS` |
| 4 | Salto de `BORRADOR` a `CERRADO` | `estado-cuadro.spec.ts` |
| 5 | Cuadro cerrado no admite escritura | unitaria + integración |
| 6 | Cierre con nocturno sin conductor | unitaria + integración, `409 CONDICIONANTE_NOCTURNO` |
| 7 | El cierre consolida el historial | unitaria + integración |
| 8 | Rol departamental cerrando | integración, `403` |
| 9 | Reapertura sube el contador | unitaria + integración |

---

## 8. LO QUE ESTE MÓDULO DEJA LISTO PARA M-14

`CuadroDiarioService` publica tres operaciones que el núcleo de operativos consumirá:

| Operación | Para qué |
|---|---|
| `puedeEscribir(fecha)` | Comprobación silenciosa, sin lanzar |
| `exigirEscritura(fecha)` | Lanza `409 CUADRO_CERRADO` con el motivo redactado para el funcionario |
| `avanzar(fecha, destino)` | Publicada para que M-17 adelante el estado cuando la DAF termina antes de que venza su ventana |

Una jornada que **nadie abrió** no admite escritura: no se registra un operativo en un día que no
existe. Es lo primero con lo que M-14 se va a encontrar.

---

## 9. PENDIENTE DE VALIDACIÓN

- **PV-28 · Formato de la orden de trabajo.** Ninguna fuente lo define. Hoy es un dato de entrada
  obligatorio y único. Ver §4.
- **PV-11 · Autorización de la reapertura.** Se implementó como endpoint con verificación de rol,
  sin flujo adicional, y el contador queda como evidencia. Si el negocio define un autorizante,
  cambia el guard, no el modelo.
- **PV-05 · Momento de verificación del condicionante nocturno.** Se verifica al cerrar, por lo
  dicho en §6. Es el momento que las fuentes hacen posible, no uno elegido.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
