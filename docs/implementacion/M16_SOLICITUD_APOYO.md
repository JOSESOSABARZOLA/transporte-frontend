# M-16 · Solicitud de apoyo interdirección

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E6 · Bloque D · Prioridad **P2 · Media** · Dependencia M-14
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. QUÉ RESUELVE

CU-13. Un operativo conjunto necesita personal de otra dirección. Hoy eso se pide **por teléfono**,
y no queda constancia de quién lo pidió, a quién, para qué operativo ni cuántas personas.

Es el módulo más pequeño del bloque, y el que menos puede hacer: **el flujo de aceptación y rechazo
no está definido** (PV-12). Lo que sí puede hacer —dejar constancia y que le llegue a quien
corresponde— es exactamente lo que falta hoy.

| Regla | Qué exige |
|---|---|
| RF-019 | Registrar una solicitud de apoyo a otra dirección |
| CU-13 | La solicitud queda registrada y **notificada** a la dirección requerida |
| NOT-01 | La notificación va a la dirección requerida al registrarse |
| `ck_solicitud_cantidad` | La cantidad es mayor que cero |
| FASE2 §14 | La solicitud es de los tres roles departamentales; Dirección y administración leen |

---

## 1. ARCHIVOS

Cuatro nuevos, más dos de prueba. **Sin migraciones**: `t_solicitud_apoyo`, su enumerado y su
índice ya existían desde M-02.

```
src/modules/operativos/
├── application/
│   └── solicitud-apoyo.service.ts      + .spec.ts   17 pruebas
├── infrastructure/
│   └── solicitud-apoyo.repository.ts
└── presentation/
    ├── dto/solicitud-apoyo.dto.ts
    └── solicitudes-apoyo.controller.ts

test/
└── solicitud-apoyo.integracion-spec.ts             22 pruebas
```

**Modificados:** `operativos.module.ts` —registra el servicio, el repositorio y el controlador— y
`operativos.service.ts`, que publica `exigirOperativoPropio()` (§5).

---

## 2. SE REGISTRA Y SE NOTIFICA. NO SE ACEPTA NI SE RECHAZA (PV-12)

Es la decisión que define el alcance del módulo, y no es una limitación técnica.

`e_estado_solicitud` declara cuatro estados —`SOLICITADA`, `ATENDIDA`, `RECHAZADA`, `VENCIDA`— y
**ninguna fuente define quién los mueve, cuándo ni con qué consecuencia**. FASE2 §CU-13 lo marca
como pendiente de validación con el usuario, y el plan lo repite en PV-12.

Por eso la solicitud nace en `SOLICITADA` y **ahí se queda**. Implementar las transiciones exigiría
inventar el flujo, y un flujo inventado en una herramienta de coordinación **entre direcciones** es
peor que no tenerlo: la gente seguiría llamando por teléfono, pero ahora con un sistema que además
dice otra cosa.

El paso 4 del flujo principal de CU-13 —«la dirección destino asigna el personal solicitado»— sí se
puede cumplir hoy: la dirección requerida ve la solicitud en su bandeja y asigna personal al
operativo con los endpoints de **M-15**, si el formulario la admite como rol compartido.

Consecuencias, escritas para que se revisen:

- El DTO **no acepta `estado`**. Enviarlo produce `400 CAMPOS_NO_PERMITIDOS`.
- **No hay endpoint de actualización ni de anulación.** La matriz de FASE2 §14 concede `U` a los
  tres roles departamentales, pero toda actualización con sentido operativo —atender, rechazar,
  vencer— es una transición de estado, que es justamente lo indefinido. Corregir hoy una solicitud
  equivocada no es posible; **queda señalado como parte de PV-12**.

---

## 3. API

| Método | Ruta | Roles |
|---|---|---|
| `POST` | `/operativos/:id/apoyo` | Los tres de carga |
| `GET` | `/operativos/:id/apoyo` | Quien puede ver el operativo |
| `GET` | `/solicitudes-apoyo?fecha=&estado=` | Los tres de carga, `DIRECTOR`, `ADMINISTRADOR_DMIP` |

Guardas: `IdentidadGuard → RolesGuard → VentanaCargaGuard`, como indica el plan. **Sin
`FormularioRolGuard`**: la ruta lleva el identificador del operativo y no el código del formulario,
igual que en `PATCH` y `DELETE` de M-14. La propiedad la comprueba el servicio.

### La bandeja no es un extra: es el caso 4

El plan solo enumera el `POST`, pero su caso 4 dice «la dirección requerida consulta → ve la
solicitud». **No puede verla por el operativo**: el operativo es de otro formulario y PER-02 le
responde `403`. Sin `GET /solicitudes-apoyo` la dirección requerida no se enteraría nunca de que le
pidieron personal, y el módulo cumpliría la mitad de su propósito.

La bandeja devuelve **lo que le piden y lo que pidió**, en una sola consulta: son la misma pregunta
desde los dos lados, y separarlas obligaría a la pantalla a hacer dos llamadas para dibujar una
lista. Cada solicitud viaja con el identificador del operativo, su horario, su fecha y el nombre
del formulario — sin eso, la bandeja sería un rol y un número, y nadie puede decidir a quién manda
con eso.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Cantidad cero, negativa o no entera | 400 | `VALIDACION` |
| `estado` o `rolSolicitante` en el cuerpo | 400 | `CAMPOS_NO_PERMITIDOS` |
| Solicitar a la propia dirección | 400 | `VALIDACION` |
| Solicitar a una dirección sin personal operativo | 400 | `VALIDACION` |
| Solicitud idéntica ya abierta | 400 | `VALIDACION` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| `DIRECTOR` o `DAF` solicitando | 403 | `ROL_NO_AUTORIZADO` |
| Operativo de otro departamento | 403 | `FORMULARIO_NO_AUTORIZADO` |
| Fuera de la ventana de carga | 423 | `VENTANA_CARGA_CERRADA` |
| Cuadro cerrado | 409 | `CUADRO_CERRADO` |

---

## 4. TRES VALIDACIONES Y POR QUÉ CADA UNA

**Cantidad mayor que cero.** Lo exige `ck_solicitud_cantidad` en la base y el DTO lo anticipa con un
mensaje legible. El máximo es 32 767 y **no es un límite del negocio**: es el rango de `SMALLINT`,
declarado como tal en el código para que nadie lo lea como una regla.

**El rol requerido debe ser otro.** Es el caso 3 del plan. Pedirse apoyo a uno mismo no describe
nada: si el personal es propio, se asigna.

**Y debe ser una dirección con personal operativo.** Las tres de carga. Las otras tres no tienen
personal que prestar —la DAF asigna transporte, la Dirección supervisa, la administración
configura—, así que una solicitud dirigida a ellas no tendría destinatario capaz de atenderla. Es
una lectura de la matriz de FASE2 §14, donde la solicitud de apoyo es `C R U` solo para esas tres.

**Además**, una solicitud idéntica que siga abierta —mismo operativo, misma dirección, misma área—
se rechaza. **No es una regla de negocio**: es la defensa contra el doble envío. El modelo admite
varias solicitudes por operativo, a direcciones o áreas distintas, y por eso no hay restricción
única que lo resuelva en la base.

---

## 5. LO QUE SE PUBLICÓ DE M-14

`OperativosService.exigirOperativoPropio()`. La comprobación que `editar` y `retirar` ya hacían en
privado: el operativo existe y su formulario es del rol.

Solicitar apoyo es parte de **construir** el operativo, y construirlo es del dueño del formulario;
el rol compartido participa con cupo de personal, no decide qué apoyo hace falta. Publicar la
comprobación evita que este servicio repita la regla —y con ella el riesgo de que las dos versiones
se separen— o que lea el repositorio de otro submódulo.

---

## 6. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **39 suites · 571 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **9 suites · 188 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las tres rutas mapeadas |

Sin migraciones: `npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones y
7 índices parciales.

### 6.1. Los cinco casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | Solicitar apoyo a otra dirección | `201`, estado `SOLICITADA` | ✅ con el contexto del operativo |
| 2 | Cantidad cero | `400` | ✅ también negativa y no entera |
| 3 | Solicitar apoyo a la propia dirección | `400` | ✅ |
| 4 | La dirección requerida consulta | Ve la solicitud | ✅ **y se comprueba que el operativo le sigue vedado** |
| 5 | Rol no departamental solicitando | `403` | ✅ `DIRECTOR` y `DAF` |

El caso 4 es el que justifica la prueba de integración: comprueba a la vez que la bandeja se la
muestra **y** que `GET /operativos/:id` le responde `403`. Con dobles se vería la primera mitad y no
la segunda, que es la que hace necesaria la bandeja.

### 6.2. Una corrección de la propia prueba

La verificación de la traza contaba todas las filas de `t_auditoria` con entidad
`t_solicitud_apoyo`, y fallaba en la **segunda** ejecución: `fk_auditoria_operativo` es
`ON DELETE SET NULL`, así que las trazas de corridas anteriores siguen en la tabla —sin operativo—
cuando la prueba borra sus datos. Ahora se filtra por el operativo de la ejecución en curso.

---

## 7. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Motivo |
|---|---|
| Aceptación, rechazo y vencimiento | **PV-12.** Ver §2 |
| Bloque adicional del operativo conjunto en la matriz | El plan lo excluye expresamente; se mencionó en la primera reunión y no volvió a definirse |
| Canal de la notificación (NOT-01) | FASE2 §18 lo marca pendiente. Hoy queda en el registro de actividad y en la bandeja |
| Control en la pantalla de registro | **M-22** (P-01) |

---

## 8. PENDIENTE DE VALIDACIÓN

- **PV-12 · Flujo completo de la solicitud de apoyo.** Sin definir: quién mueve los estados, cuándo
  y con qué consecuencia. Provisional: se registra en `SOLICITADA` y no se mueve. **Incluye que hoy
  no se puede corregir ni anular una solicitud equivocada.**
- **NOT-01 · Canal de la notificación.** Sin definir. Provisional: registro de actividad y bandeja.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
