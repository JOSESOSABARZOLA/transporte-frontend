# M-06 · Parámetros de política

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E3 · Bloque B · Prioridad P0 · Dependencias M-03 y M-05 · Desbloquea M-08 y M-12
Fecha: 2026-08-05

---

## 0. QUÉ SE ENTREGA Y POR QUÉ IMPORTA

Ocho valores gobiernan las reglas que protegen a las personas: cuántas horas puede acumular alguien
en una jornada, cuántas salidas nocturnas admite en un período, cuándo empieza la franja nocturna,
a qué hora cierra cada departamento. Ninguno de ellos es una constante en el código. Viven en
`t_parametro_politica` y **este submódulo es el único punto por donde se leen y se cambian**.

La razón es concreta y viene de la guía §5: la Dirección debe poder ajustar un umbral sin esperar
un despliegue. Un límite de jornada escrito en una constante obliga a compilar, probar y desplegar
para cambiar un número que el negocio decide en una reunión.

De ahí la segunda mitad del entregable. Si el umbral se puede cambiar desde una pantalla, **todo
cambio queda auditado**: quién, cuándo, de qué valor a qué valor. Sin eso, el módulo habría
convertido una regla de protección laboral en un campo editable sin rastro.

---

## 1. ARCHIVOS CREADOS

Siete archivos nuevos bajo `src/modules/configuracion/`, más dos de prueba.

```
src/modules/configuracion/
├── configuracion.module.ts                        Composición; publica el servicio
├── presentation/
│   ├── parametros.controller.ts                   Tres endpoints
│   └── dto/
│       ├── actualizar-parametro.dto.ts            Una sola propiedad
│       └── parametro-response.dto.ts              Proyección de salida
├── application/
│   ├── parametro-politica.service.ts              Caché, validación, transacción
│   ├── parametro-politica.service.spec.ts         11 pruebas
│   ├── reglas-parametro.ts                        Rango, tipo y dominio
│   └── reglas-parametro.spec.ts                   16 pruebas
└── infrastructure/
    └── parametro-politica.repository.ts           Único punto que toca Prisma
```

Un archivo modificado fuera del submódulo: `src/app.module.ts`, para importar `ConfiguracionModule`.

Es el **primer submódulo de negocio** del módulo y por tanto la primera aplicación completa de las
cuatro capas de la guía §6: `presentation` no conoce Prisma, `application` no conoce HTTP,
`infrastructure` es el único que ve `PrismaService`.

---

## 2. LA CACHÉ, Y POR QUÉ NO ES UNA OPTIMIZACIÓN PREMATURA

`obtenerDecimal('JORNADA_MAXIMA_HORAS')` no se llama una vez por pantalla: se llama **una vez por
cada persona que se intenta asignar a un operativo**. Las políticas de descanso de M-12 lo
consultan en cada verificación de elegibilidad, y el negocio pidió que la captura de un operativo
completo tarde dos o tres minutos, no diez.

Un `Map` en memoria, cargado entero en la primera lectura y **descartado por completo ante
cualquier modificación**:

```ts
async obtenerTexto(clave: string): Promise<string> {
  const cache = await this.cargarCache();
  const valor = cache.get(clave);
  if (valor === undefined) {
    throw new ValidacionError(`El parámetro de política ${clave} no está configurado.`);
  }
  return valor;
}
```

Dos decisiones dentro de esas seis líneas:

**Se invalida entera, no por clave.** Son ocho filas. Una invalidación selectiva añadiría una
posibilidad de error —olvidar una clave derivada— a cambio de ahorrar una consulta de ocho filas.

**Un parámetro ausente lanza; no devuelve un valor por omisión.** Es lo contrario de lo que suele
hacerse. Si `obtenerTexto` devolviera un valor razonable cuando la clave falta, reintroduciría en
silencio exactamente la constante literal que este servicio existe para eliminar, y nadie se
enteraría hasta que una regla de descanso dejara pasar a alguien que no debía salir.

### Advertencia para el despliegue

La caché es **por instancia**. Con una sola instancia del contenedor —el despliegue actual— es
correcta. Si alguna vez se replica el backend, dos instancias podrían sostener valores distintos
hasta que cada una reciba su propia escritura. Queda anotado aquí; la solución llegaría con una
caché compartida o con la invalidación por evento, y **no debe implementarse antes de que exista la
segunda instancia**.

---

## 3. LA VALIDACIÓN: TRES CAPAS DISTINTAS

`reglas-parametro.ts` responde una sola pregunta —`motivoDeRechazo(parametro, valor)`— y devuelve
`undefined` si el valor es admisible o la frase que leerá el funcionario si no lo es.

| Capa | Qué comprueba | Fuente |
|---|---|---|
| **Tipo** | `ENTERO`, `DECIMAL`, `BOOLEANO` o `TEXTO` según lo declarado en la fila | `para_tipo` |
| **Rango** | Entre `minimo` y `maximo`, inclusive | `para_minimo` y `para_maximo` de la propia fila |
| **Dominio** | Los valores admisibles de los parámetros de texto | Declarado en el código |

**El rango sale de la fila, no del código.** El servicio no sabe que la jornada va de 8 a 16: lo lee
de la fila que está modificando. Cambiar el rango admisible es un `UPDATE`, no un despliegue.

**El dominio sí está en el código, y es deliberado.** Dos casos:

- `PERIODO_COMPUTO_SALIDAS` admite `SEMANAL`, `QUINCENAL` o `MENSUAL`. Un cuarto período no es un
  dato: es una rama de cálculo que habría que programar en M-12. Aceptarlo en la base sin
  implementarlo produciría un tope de salidas que no se computa.
- `HORA_CIERRE_DEPARTAMENTAL`, `HORA_LIMITE_CUADRO`, `FRANJA_NOCTURNA_INICIO` y
  `FRANJA_NOCTURNA_FIN` deben cumplir `HH:MM` de 24 horas. El evaluador de ventanas de M-05
  compara cadenas: `15h00` o `3:00` no fallarían al guardarse, fallarían al evaluarse, y el efecto
  sería una ventana que se abre a una hora incorrecta.

Los mensajes citan el límite:

```
El valor máximo admitido para JORNADA_MAXIMA_HORAS es 16 horas.
El período de cómputo admite estos valores: SEMANAL, QUINCENAL, MENSUAL.
La hora debe escribirse como HH:MM en formato de 24 horas.
```

---

## 4. LA TRANSACCIÓN Y LA AUDITORÍA

DA-09: la traza se escribe **dentro de la misma transacción** que el cambio. Una evidencia que
puede perderse ante un fallo parcial no sirve como evidencia.

```ts
const actualizado = await this.repositorio.ejecutarEnTransaccion(async (cliente) => {
  const resultado = await this.repositorio.actualizarValor(clave, limpio, usuarioId, cliente);
  await this.auditoria.registrar({ ... }, cliente);
  return resultado;
});

this.invalidarCache();
```

El orden importa: **la caché se invalida después de que la transacción confirma**. Invalidarla
dentro dejaría, ante un rollback, una caché vacía que recargaría el valor viejo —inofensivo— pero
también abriría una ventana en la que otra petición podría leer un valor a medio confirmar.

Traza real de la verificación, tal como quedó en `t_auditoria`:

```
audi_entidad         | t_parametro_politica
audi_entidad_id      | 1
audi_accion          | ACTUALIZAR
audi_campo           | para_valor
audi_valor_anterior  | 12
audi_valor_nuevo     | 8
audi_usuario         | 6
audi_rol             | ADMINISTRADOR
audi_correlacion     | e0fecfb9-bc18-4cf1-b4fc-481453a7db53
audi_momento         | 2026-08-05 11:07:20.465-05
```

El rol y el identificador de correlación no los pasa el servicio: los toma `AuditoriaService` del
contexto de la petición que estableció M-04. El servicio solo declara **qué cambió**.

### Idempotencia

Reenviar el valor vigente devuelve `200` y **no escribe ni audita**. Una traza que registrara
`12 → 12` ensuciaría el historial que sirve para responder «¿quién bajó el umbral y cuándo?».

---

## 5. LAS DOS DECISIONES DE AUTORIZACIÓN

### 5.1 Sin `VentanaCargaGuard`, a propósito

La cadena completa de M-05 es `IdentidadGuard → RolesGuard → FormularioRolGuard →
VentanaCargaGuard`. Aquí se aplican **solo las dos primeras**.

`FormularioRolGuard` no corresponde: no hay formulario en juego.

`VentanaCargaGuard` se omite por una razón de fondo. La ventana de carga gobierna la jornada del
cuadro —quién registra operativos y hasta qué hora—, no la administración del sistema. Y aplicarla
aquí crearía un cepo: si alguna vez se activara una ventana para el `ADMINISTRADOR_DMIP`, quedaría sin
poder abrir **la pantalla que configura precisamente las ventanas**, sin forma de recuperarse desde
la aplicación. La omisión está documentada en la cabecera del controlador para que no se lea como
un olvido.

### 5.2 Un solo rol

`@Roles(RolDepartamental.ADMINISTRADOR_DMIP)` a nivel de clase. Lectura y escritura, ambas exclusivas.
El `DIRECTOR` **tampoco lee**: los umbrales no son información operativa del cuadro, y darle
lectura invitaría a discutir por qué no puede cambiarlos.

---

## 6. RESULTADO DE LAS PRUEBAS

### 6.1 Automatizadas

```
Test Suites: 11 passed, 11 total
Tests:       88 passed, 88 total
```

27 pruebas nuevas: 16 de `reglas-parametro` (rango, extremos, tipo, dominio, coma decimal),
11 de `ParametroPoliticaService` (caché, invalidación, lectura tipada, rechazo, auditoría dentro de
la transacción, idempotencia, recorte de espacios).

`npm run build` y `npm run lint:check` salen con código 0.

### 6.2 Los seis casos del plan, contra la pila en ejecución

Identidad provisional: `x-usuario-prueba: 6` (ADMINISTRADOR) y `5` (DIRECTOR).

| # | Caso | Esperado | Obtenido |
|---|---|---|---|
| 1 | `GET /parametros` como `ADMINISTRADOR_DMIP` | Ocho parámetros con su rango | ✅ `200`, ocho filas con mínimo, máximo y unidad |
| 2 | `GET /parametros` como `DIRECTOR` | `403` | ✅ `403 ROL_NO_AUTORIZADO` |
| 3 | `PUT JORNADA_MAXIMA_HORAS = 30` | `400`, fuera de 8 a 16 | ✅ `400 VALIDACION`, «El valor máximo admitido … es 16 horas.» |
| 4 | `PUT JORNADA_MAXIMA_HORAS = 8` | `200`; la caché se invalida | ✅ `200` con `modificadoPor: 6` |
| 5 | Lectura tras la modificación | Devuelve `8` sin reiniciar | ✅ `8`, servicio no reiniciado |
| 6 | Auditoría | Clave, valor anterior, valor nuevo, usuario y momento | ✅ y además rol y correlación |

Casos adicionales, no pedidos por el plan:

| Caso | Obtenido |
|---|---|
| `PUT` como `DIRECTOR` | `403 ROL_NO_AUTORIZADO` |
| `GET` sin cabecera de identidad | `401 NO_AUTENTICADO` |
| Cabecera de prueba con `MODO_IDENTIDAD_PROVISIONAL=false` (contenedor) | `401`; la cabecera se ignora |
| Clave inexistente | `404 RECURSO_NO_ENCONTRADO` |
| `PUT` con `clave` y `tipo` en el cuerpo | `400 CAMPOS_NO_PERMITIDOS`, ambos nombrados |
| `PUT` con cuerpo vacío | `400`, «Indique el nuevo valor del parámetro.» |
| `PUT PERIODO_COMPUTO_SALIDAS = ANUAL` | `400`, con los tres períodos admisibles |
| `PUT` repetido con el valor vigente | `200`, sin fila nueva en `t_auditoria` |

`JORNADA_MAXIMA_HORAS` quedó restaurado en `12`. Las cuatro filas de auditoría de la prueba
permanecen: son evidencia de que el mecanismo funciona, no datos de negocio.

---

## 7. CUATRO DEFECTOS QUE SOLO APARECIERON AL EJECUTAR

Los cuatro compilaban y pasaban lint. Tres estaban en M-04, no en M-06: **el primer consumidor real
del núcleo transversal es el que descubre lo que el núcleo hacía mal.**

### 7.1 El mensaje de campos rechazados hablaba de transportes en todas las pantallas

`forbidNonWhitelisted` devolvía siempre:

> «Transportes solo puede modificar el conductor y el vehículo. El resto de la planificación llega
> bloqueado.»

Escrito para el caso de la DAF de §16.2, pero el filtro lo aplicaba a **todos** los contratos. Un
administrador que enviaba un campo de más al editar un parámetro leía una explicación sobre
conductores que no tenía relación con lo que estaba haciendo.

Corregido en `http-exception.filter.ts`: el mensaje nombra los campos rechazados —«Esta operación
no permite modificar clave, tipo. Retire esos campos y vuelva a enviar.»— y sirve igual de bien al
analista de transportes. El código `CAMPOS_NO_PERMITIDOS` y `detalles.camposRechazados` no cambian.

### 7.2 El `403` salía en inglés y con el código equivocado

```json
{ "statusCode": 403, "codigo": "ERROR_INTERNO", "mensaje": "Forbidden resource" }
```

El `RolesGuard` heredado no lanza un error del dominio: deja que Nest emita su `ForbiddenException`
por omisión. El filtro no traducía ni el `401` ni el `403`, así que caían en la rama genérica.

Dos consecuencias, ambas graves: el funcionario leía inglés, y el frontend no podía distinguir un
permiso denegado de una falla del servidor porque ambos llegaban como `ERROR_INTERNO`.

Corregido: `401 → NO_AUTENTICADO`, `403 → ROL_NO_AUTORIZADO`, con mensaje en español. Cuando la
guarda escribió su propio mensaje en español, se respeta; los textos por omisión de NestJS
—`Unauthorized`, `Forbidden resource`— se reemplazan. `NO_AUTENTICADO` se suma a los tres códigos
transversales ya existentes; los quince códigos de negocio del catálogo siguen siendo quince.

### 7.3 El error de cuerpo vacío mostraba el motivo menos útil

Con `{}`, las tres restricciones de `valor` fallan a la vez y el filtro muestra la primera como
`mensaje`. Salía:

> «El valor del parámetro no puede superar los 120 caracteres.»

class-validator informa las restricciones **en orden inverso al de declaración**. Reordenados los
decoradores para que `@IsNotEmpty` quede al final, el funcionario lee ahora «Indique el nuevo valor
del parámetro.» La razón está anotada en el DTO: no es un orden arbitrario y no debe reordenarse
sin volver a probar el caso.

### 7.4 Una clave inexistente devolvía `400` en lugar de `404`

`obtener(clave)` lanzaba `ValidacionError`. Pero la clave viaja en la ruta e identifica al recurso:
el cuerpo enviado no tiene nada de malo, lo que no existe es aquello que se quiso consultar.
Cambiado a `RecursoNoEncontradoError`, que da `404 RECURSO_NO_ENCONTRADO`.

### 7.5 El contenedor no se reconstruía con `--build`

No es un defecto del código, pero costó una verificación en falso. El servicio `transporte-app` de
`docker-compose.yml` declara `image:` y **no declara `build:`**, así que `docker compose up --build`
levanta la imagen anterior sin avisar. El contenedor arrancó sin `ConfiguracionModule` y sin las
rutas de parámetros, aparentando que el módulo no se había integrado.

La imagen se construye aparte:

```bash
docker build -t transporte-backend:latest .
docker compose up -d transporte-app
```

Queda anotado en las acciones pendientes: añadir `build: .` al servicio, o dejar el paso explícito
documentado en la guía de despliegue. **No se cambió el `docker-compose.yml` en este módulo** para
no alterar el despliegue aprobado sin decisión.

---

## 8. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-08 · Ventanas de carga** | `HORA_CIERRE_DEPARTAMENTAL` y `HORA_LIMITE_CUADRO` |
| **M-12 · Políticas de descanso** | `JORNADA_MAXIMA_HORAS`, `TOPE_SALIDAS_PESADAS`, `PERIODO_COMPUTO_SALIDAS`, `DIAS_DESCANSO_PATRULLA`, `FRANJA_NOCTURNA_INICIO`, `FRANJA_NOCTURNA_FIN` |
| **M-29 · Pantalla P-09** | Los tres endpoints |

Ambos consumidores lo hacen **por el servicio publicado**, nunca por el repositorio.
`ConfiguracionModule` exporta `ParametroPoliticaService` y nada más.

Regla que hereda M-12: **ninguna política escribe un umbral literal.** Si en una regla de descanso
aparece un `16` o un `20:00`, es un defecto, no un atajo.

---

## 9. ACCIONES PENDIENTES

| # | Acción | Cuándo |
|---|---|---|
| 1 | Añadir `build: .` al servicio `transporte-app`, o documentar el paso manual en la guía de despliegue | Antes del primer despliegue formal |
| 2 | Extraer una unidad de trabajo compartida cuando un servicio deba abarcar varios repositorios en una transacción | Cuando aparezca el primer caso (previsiblemente M-14) |
| 3 | Revisar la caché por instancia si el backend llega a replicarse | Solo si se replica |
| 4 | Añadir un healthcheck al servicio `transporte-app` | Arrastrado desde Sprint 0 |

Ninguna es bloqueante para M-07.

---

## 10. ESTADO

**M-06 terminado.** Compilación, lint y 88 pruebas en verde; los seis casos del plan verificados
contra la pila en ejecución, más ocho casos adicionales; cuatro defectos corregidos, tres de ellos
en el núcleo transversal de M-04; documentación de M-04 y del plan actualizada.

Ningún punto pendiente de validación del negocio afecta a este módulo: los ocho parámetros y sus
rangos vienen del insumo aprobado.

**A la espera de aprobación para continuar con M-07 · Formularios y catálogos**, que sigue
bloqueado por PV-25 y PV-26.
