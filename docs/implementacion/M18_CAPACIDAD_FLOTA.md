# M-18 · Capacidad de flota

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E7 · Bloque E · Prioridad **P2 · Media** · Dependencia M-17
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. QUÉ RESUELVE, Y QUÉ NO PUEDE RESOLVER TODAVÍA

La DAF declara cuántos vehículos y conductores tiene hábiles cada día, y el sistema compara esa
cifra con lo que la jornada necesita. Hoy esa comparación se hace de memoria, y cuando falla se
descubre por la mañana, con el operativo a punto de salir.

**Pero nadie sabe todavía cuántos conductores hábiles existen** (PV-03). Por eso RN-46 dice
*advierte, sin bloquear*, y este módulo lo lleva al extremo de hacerlo estructuralmente imposible:
la política **no puede lanzar**.

| Regla | Qué exige |
|---|---|
| RN-46 | Advertir cuando la demanda supera la capacidad declarada, **sin bloquear** |
| VAL-24 | El mensaje: «La demanda de vehículos supera la capacidad declarada para la fecha» |
| RF-057 | Declarar la capacidad de flota por fecha |
| `ck_capacidad_positiva` | Cantidades mayores o iguales a cero |

---

## 1. ARCHIVOS

Cuatro nuevos, más dos de prueba. **Sin migraciones**: `t_capacidad_flota` ya existía desde M-02,
con sus dos restricciones de unicidad y su `CHECK`.

```
src/modules/transporte/
├── application/
│   ├── politicas/
│   │   └── capacidad-flota.ts       + .spec.ts   13 pruebas   ← POL-07
│   └── capacidad-flota.service.ts   + .spec.ts   13 pruebas
├── infrastructure/
│   └── capacidad-flota.repository.ts
└── presentation/
    ├── dto/capacidad.dto.ts
    └── capacidad-flota.controller.ts

test/
└── capacidad-flota.integracion-spec.ts          19 pruebas
```

**Modificados, los dos de forma aditiva:** `operativos.repository.ts` y `operativos.service.ts`
—`contarDemandaDeTransporte(fecha)`— y `transporte.module.ts`.

---

## 2. «ADVIERTE SIN BLOQUEAR» COMO PROPIEDAD DEL CÓDIGO, NO COMO INTENCIÓN

`verificarCapacidad()` es una función pura que **devuelve una comparación**. No lanza, no puede
lanzar, y tiene una prueba que lo afirma:

```ts
expect(() => verificarCapacidad(declarada(0, 0), demanda(50, 50))).not.toThrow();
```

No es una prueba decorativa. Bloquear una asignación con un número que nadie ha confirmado dejaría
un operativo sin transporte por un dato provisional, y el cuadro volvería a llenarse por WhatsApp
—que es el problema que el sistema existe para resolver—. Mientras la política no pueda interrumpir
a quien la llama, ese riesgo no existe por descuido de nadie.

El aviso llega por tres caminos, todos pasivos:

1. **El indicador** de P-03 y de la cabecera de P-04, que lee `GET /transporte/capacidad/:fecha`.
2. **El evento `CapacidadFlotaExcedida`**, emitido al declarar y solo cuando la demanda supera lo
   declarado.
3. **El texto de la advertencia**, redactado para la DAF y terminado en «la asignación sigue
   permitida».

**M-17 no se tocó.** Habría sido tentador añadir la advertencia a la respuesta de la asignación,
pero eso significa modificar el contrato de un módulo ya entregado para un aviso que la pantalla ya
tiene. El plan es explícito: el indicador va en P-03 y P-04.

---

## 3. QUÉ ES «LA DEMANDA»

Los operativos de la jornada que **requieren vehículo**: activos, de un formulario que habilita
vehículo (`politicaVehiculo != NO_APLICA`) y que no se cubren por propios medios.

Tres consecuencias, todas deliberadas:

- **Los ya asignados siguen contando.** La demanda del día es la misma antes y después de que la
  DAF resuelva; una demanda que baja al asignar no serviría para declarar capacidad por la mañana.
- **Declarar propios medios sí la reduce**, porque ese operativo dejó de necesitar vehículo. Está
  verificado en la prueba de integración.
- **Un vehículo reutilizado en dos turnos cuenta dos veces.** Es el lado conservador de un aviso, y
  el modelo no permite distinguirlo sin inventar una regla de reutilización que nadie ha definido.

La demanda de conductores es **la misma cifra**: un operativo con vehículo lleva un conductor, y no
hay en el modelo nada que permita separarlas.

`transporte` **no cuenta los operativos por su cuenta**: se lo pregunta a
`OperativosService.contarDemandaDeTransporte()`. Es la misma frontera que sostiene el cuarto nivel
de la restricción de la DAF en M-17.

---

## 4. API

| Método | Ruta | Roles |
|---|---|---|
| `GET` | `/transporte/capacidad/:fecha` | `DAF`, `DIRECTOR` |
| `PUT` | `/transporte/capacidad/:fecha` | `DAF`, `ADMINISTRADOR_DMIP` |

**Roles distintos para cada cosa, y así lo pide el plan.** Declarar es de quien conoce la flota —la
DAF— y de la administración; consultar el indicador es de la DAF y de la Dirección, que revisa la
jornada antes de cerrarla. El `ADMINISTRADOR_DMIP` declara pero no necesita el indicador operativo, y
está verificado en la prueba: recibe `403` al consultar.

**`PUT` y no `POST`**: el recurso es la capacidad *de esa fecha* y solo hay una. Declarar dos veces
deja el mismo resultado que declarar una, que es el caso 4 del plan, y lo resuelve un `upsert` sobre
`uq_capacidad_fecha` —no una comprobación previa que dejaría hueco entre la lectura y la escritura—.

**Sin `VentanaCargaGuard`**: declarar la flota disponible no es cargar el cuadro. La DAF tiene que
poder corregir el número cuando un vehículo entra al taller a las seis de la tarde.

El DTO **no incluye `fecha` ni `declaradoPor`**: la fecha va en la ruta y el declarante lo resuelve
`IdentidadGuard`. Enviarlos produce `400 CAMPOS_NO_PERMITIDOS`.

### La consulta funciona sin declaración

Mientras la DAF no declare nada, la respuesta trae la demanda y `declarada: null`. La pantalla
distingue **«sin declarar» de «cero hábiles»**, que son cosas distintas: inventar un cero produciría
una advertencia todos los días hasta que alguien declare, y una advertencia permanente deja de
leerse.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Cantidad negativa o no entera | 400 | `VALIDACION` |
| `fecha` o `declaradoPor` en el cuerpo | 400 | `CAMPOS_NO_PERMITIDOS` |
| Fecha mal escrita | 400 | `VALIDACION` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| Rol departamental, o `DIRECTOR` declarando | 403 | `ROL_NO_AUTORIZADO` |
| Declarar para un día sin jornada abierta | 404 | `RECURSO_NO_ENCONTRADO` |

El 404 al declarar no es un capricho: `capa_cuad_id` es obligatoria en el modelo, y declarar
capacidad para un día que nadie abrió no describe nada. Se responde con una frase en lugar de dejar
que salte la clave foránea.

---

## 5. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **42 suites · 619 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **11 suites · 238 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las dos rutas mapeadas |

Sin migraciones: `npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones y
7 índices parciales.

### 5.1. Los cinco casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Declarar 15 vehículos y demandar 18 | Advertencia; **la asignación sigue permitida** | ✅ **las dos mitades** |
| 2 | Ídem con 12 | Sin advertencia | ✅ |
| 3 | Declarar cantidad negativa | `400` | ✅ también la no entera |
| 4 | Dos declaraciones para la misma fecha | La segunda actualiza, no duplica | ✅ una sola fila en la base |
| 5 | Rol departamental consultando | `403` | ✅ tampoco declara |

**El caso 1 es el que justifica la prueba de integración.** Su segunda mitad —«la asignación sigue
permitida»— no se puede demostrar con dobles: hay que declarar una capacidad insuficiente y
**después asignar transporte de verdad**, comprobando que el `200` llega igual. Eso es lo que hace
la prueba, con operativos reales registrados por HTTP.

---

## 6. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Dónde va |
|---|---|
| El indicador en pantalla | **M-24** (P-03) y **M-25** (cabecera de P-04) |
| Distinguir la demanda de conductores de la de vehículos | Ninguna fuente la separa: un operativo con vehículo lleva un conductor |
| Reutilización de un vehículo en dos turnos | No hay regla definida. El conteo es conservador, que es el lado seguro de un aviso |

---

## 7. PENDIENTE DE VALIDACIÓN

- **PV-03 · Catálogo de conductores y vehículos.** Sigue sin entregarse, y es lo que mantiene este
  control en «avisa pero no bloquea». Cuando la DAF entregue el catálogo habrá que decidir si el
  aviso pasa a ser bloqueante —y **esa decisión es del negocio, no técnica**: hoy el sistema
  registra la advertencia y deja seguir.
- **Sin endpoint para la disponibilidad de conductores y vehículos.** Señalado en M-17 y sigue
  abierto: la capacidad se declara a mano porque no hay forma de derivarla de las ausencias
  registradas.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
