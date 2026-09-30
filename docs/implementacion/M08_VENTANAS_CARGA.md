# M-08 · Ventanas de carga

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E3 · Bloque B · Prioridad P1 · Dependencias M-05 y M-06 · Desbloquea M-13 y M-29
Fecha: 2026-08-05

---

## 0. QUÉ GOBIERNA ESTE MÓDULO

El cuadro del día siguiente se arma contra reloj. Los departamentos cargan sus operativos hasta una
hora, Transportes asigna conductor y vehículo después, y el cuadro debe estar cerrado y disponible
antes de las 16H30 (RN-57). Ese calendario es el que este módulo administra.

Hasta ahora las ventanas existían en dos sitios: las seis filas de `t_ventana_carga`, sembradas en
M-03, y la guarda de M-05 que las lee para bloquear una escritura tardía. Faltaba lo del medio:
**que la Dirección pueda ajustarlas y que el funcionario sepa antes de empezar** si su ventana está
abierta.

Es lo que se entrega. Cuatro endpoints, sin frontend —la pantalla P-09 es M-29 y el hook
`useVentanaCarga` es M-21, tal como declara la ficha del plan—.

---

## 1. ARCHIVOS

Ocho nuevos, más dos de prueba.

```
src/common/utilidades/
└── hora.ts                                    PATRON_HORA, aMinutos, formato institucional

src/modules/configuracion/
├── application/
│   ├── ventana-carga.service.ts               Estado, caché, modificación y advertencias
│   ├── ventana-carga.service.spec.ts          18 pruebas
│   ├── reglas-ventana.ts                      Qué se rechaza y de qué se advierte
│   └── reglas-ventana.spec.ts                 18 pruebas
├── infrastructure/
│   └── ventanas.repository.ts
└── presentation/
    ├── ventanas.controller.ts                 GET /ventanas/estado
    ├── administracion-ventanas.controller.ts  GET y PUT /administracion/ventanas
    └── dto/ventana.dto.ts

test/
└── ventanas-carga.integracion-spec.ts         13 pruebas contra la base real
```

Modificado: `configuracion.module.ts`, para registrar y exportar lo nuevo. **Nada más se tocó.**

---

## 2. LO QUE NO SE REIMPLEMENTÓ

`VentanaCargaEvaluador` —la política POL-05— ya existía en M-05, y este módulo **la reutiliza**. No
es una casualidad afortunada: se implementó allí como clase inyectable y no como método privado de
la guarda precisamente para que este servicio la usara. Contiene dos cosas que no conviene tener
por duplicado:

- La **aritmética del cruce de medianoche**: una ventana de 20H00 a 05H00 tiene cierre menor que
  apertura, y compararlas sin contemplarlo da resultados silenciosamente incorrectos (RT-01).
- La evaluación **en la zona horaria de la ventana**, no en la del servidor (RT-03).

Dos versiones de eso significarían, tarde o temprano, dos comportamientos distintos para la misma
pregunta.

---

## 3. LA DECISIÓN DE DISEÑO: LA GUARDA NO USA ESTE SERVICIO

`VentanaCargaService` tiene caché; `VentanaCargaGuard` sigue leyendo la base en cada escritura. Es
deliberado, y por dos motivos independientes:

**El primero es estructural.** `common/auth` no puede depender de un submódulo de negocio. Si la
guarda usara este servicio, la cadena de autorización pasaría a depender de `configuracion`, y con
ella todo el módulo.

**El segundo importa más.** Para la guarda, la frescura vale más que la velocidad. Una caché
desfasada mantendría abierta una ventana que el administrador acaba de cerrar —justo lo contrario
de lo que la guarda existe para impedir—. La consulta es una fila indexada de una tabla de seis:
el ahorro sería imperceptible y el riesgo, real.

La caché de este servicio sirve a la **consulta** del estado, que la interfaz pide cada vez que
dibuja la cabecera, y se invalida en cuanto se modifica una ventana.

> Esto cierra el hallazgo REN-03 de `CODE_REVIEW.md`, que señalaba la ausencia de caché y remitía a
> este módulo. La respuesta es: caché en la consulta, sí; en la guarda, no, y por escrito.

---

## 4. RECHAZAR O ADVERTIR: LA DISTINCIÓN QUE ORGANIZA EL MÓDULO

`reglas-ventana.ts` separa dos cosas que suelen mezclarse.

### 4.1 Se rechaza lo que no puede ser

| Situación | Motivo |
|---|---|
| Hora fuera de `HH:MM` de 00:00 a 23:59 | El evaluador no puede leerla |
| Día fuera de 1 a 7 | No existe |
| Ventana `SEMANAL` sin días | El evaluador la trataría como diaria y el administrador creería haber configurado otra cosa |
| Ventana activa sin apertura ni cierre | No restringe nada. Para eso está `activo: false`, que además lo dice de forma explícita |
| Mensaje de cierre vacío | Es lo que leerá el funcionario cuando no pueda escribir |

La base respalda las dos primeras con `ck_ventana_horas` y `ck_ventana_dias`. Aquí se comprueban
antes para devolver un mensaje que el administrador entienda, en lugar de un error del motor.

### 4.2 Se advierte de lo que el negocio no ha fijado

**PV-06 sigue abierto.** Las fuentes dan 14H00 en una sesión y 15H00 en otra, del mismo
interlocutor. Convertir RN-56 y RN-57 en rechazos impediría a la Dirección ajustar sus horarios
mientras esa contradicción no se resuelva. Dejarlas pasar en silencio permitiría configurar un
cuadro que nadie puede cerrar a tiempo.

Se advierte, y decide quien administra:

| Regla | Advertencia |
|---|---|
| **RN-56** | «La carga de Transportes abriría a las 14H00, antes de que cierre la departamental a las 15H00. Ambas quedarían abiertas a la vez.» |
| **RN-57** | «La carga de Transportes cerraría a las 18H00, después de la hora límite del cuadro (16H30).» |
| Coherencia | «El parámetro `HORA_CIERRE_DEPARTAMENTAL` dice 15H00 y esta ventana diría 14H00. Son dos formas de guardar el mismo dato.» |
| Desactivación | «Con la ventana desactivada, el rol DMIP_OPERATIVOS podrá escribir a cualquier hora.» |

La modificación se guarda igualmente y las advertencias viajan en la respuesta.

### 4.3 Un hallazgo del propio módulo

La tercera advertencia destapa algo que conviene registrar: **la hora de cierre departamental está
guardada dos veces**. Una en `t_ventana_carga.vcar_hora_cierre`, que es la que aplica la guarda, y
otra en el parámetro `HORA_CIERRE_DEPARTAMENTAL` de M-06, que documenta la regla RN-59.

Nada las mantiene sincronizadas. Cambiar una y no la otra deja el sistema diciendo dos cosas
distintas sobre el mismo hecho.

**No se unificaron**, y es una decisión consciente: eliminar el parámetro sería tocar M-06, y
eliminar la columna sería tocar el modelo aprobado. Lo que sí hace este módulo es **hacer visible
la divergencia en el momento en que se produce**, que es cuando se puede corregir. Queda anotado en
§8 para que el Product Owner decida cuál de las dos es la fuente.

---

## 5. ENDPOINTS

| Método | Ruta | Roles | Qué devuelve |
|---|---|---|---|
| `GET` | `/ventanas/estado` | Todos | El estado de **su propia** ventana |
| `GET` | `/administracion/ventanas` | `ADMINISTRADOR_DMIP` | Las seis |
| `GET` | `/administracion/ventanas/:rol` | `ADMINISTRADOR_DMIP` | Una |
| `PUT` | `/administracion/ventanas/:rol` | `ADMINISTRADOR_DMIP` | La guardada más las advertencias |

### 5.1 El estado devuelve la ventana propia, no la que se pida

El rol sale de la identidad que resolvió la guarda, **no de un parámetro**. Si viniera en la
petición, cualquiera podría consultar el horario de otro departamento. El aislamiento de
información es el requisito que originó el encargo, y se aplica también a lo que parece inofensivo.

### 5.2 No hay `POST` ni `DELETE`, y no es un olvido

El plan dice «CRUD». Aquí son solo lectura y modificación, por una razón concreta:

- Hay **exactamente una ventana por rol** —`uq_ventana_rol`— y los roles del cuadro son seis,
  fijos. Crear una séptima no significa nada.
- Borrar una tendría un efecto que nadie esperaría: el evaluador trata la ausencia de ventana como
  «sin restricción horaria», de modo que un `DELETE` **abriría** la carga de ese rol las
  veinticuatro horas. Un endpoint llamado «eliminar» que en realidad levanta una restricción es una
  trampa.

`activo: false` hace lo mismo diciéndolo, y deja rastro en la auditoría.

### 5.3 `null` es un valor, no la ausencia del campo

Una hora de apertura nula significa «sin restricción de apertura», que es justo lo que las fuentes
permiten afirmar de los departamentos: solo definen la hora de **cierre**. El contrato distingue
las dos cosas: lo que no viene no se toca, lo que viene como `null` se limpia.

---

## 6. SEGURIDAD Y TRAZA

| Endpoint | Guardas |
|---|---|
| `/ventanas/estado` | `IdentidadGuard` → `RolesGuard` |
| `/administracion/ventanas` | `IdentidadGuard` → `RolesGuard` + `@Roles(ADMINISTRADOR_DMIP)` |

**Sin `VentanaCargaGuard`**, por el mismo motivo que en M-06: aplicar la ventana a la pantalla que
configura las ventanas crea un cepo del que no se sale desde la aplicación.

Toda modificación se escribe **con su traza en la misma transacción** (DA-09). Cambiar una hora de
cierre altera quién puede escribir y hasta cuándo: es exactamente la clase de cambio que debe dejar
rastro. La traza nombra **columnas** —`vcar_hora_cierre`, `vcar_activo`—, criterio unificado en el
code review. Una modificación que no cambia nada no escribe ni audita.

---

## 7. PRUEBAS

### 7.1 Unitarias · `npm test`

```
Test Suites: 17 passed, 17 total
Tests:       182 passed, 182 total
```

34 nuevas: 18 de `reglas-ventana` y 16 de `VentanaCargaService`.

**El momento se pasa como dato.** Ninguna prueba manipula el reloj del sistema: las ventanas se
evalúan contra un instante explícito. Una prueba que dependa de la hora a la que se ejecuta falla
sola dos veces al año, y por el peor motivo posible.

### 7.2 Integración · `npm run test:integracion`

```
Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
```

13 nuevas, contra la base real. A diferencia de M-07 **no hacen falta datos de prueba**:
`t_ventana_carga` está sembrada con las seis filas reales desde M-03. Lo que sí hacen es
**modificar** ventanas, así que guardan el estado inicial de las seis y lo restituyen al terminar.
Comprobado después de ejecutarlas: las seis filas volvieron a su valor sembrado.

### 7.3 Los seis casos del plan

| # | Caso | Esperado | Verificado |
|---|---|---|---|
| 1 | `GET /ventanas/estado` a las 14H00, rol departamental | Abierta, con la hora de cierre | ✅ mensaje «abierta hasta las 15H00» |
| 2 | Ídem a las 15H30 | Cerrada, con la reapertura | ✅ «cerró a las 15H00. Vuelve a abrirse mañana» |
| 3 | Ídem a las 15H30 con rol `DAF` | Abierta | ✅ |
| 4 | Servidor en otra zona horaria | El resultado **no cambia** | ✅ el mismo instante escrito en dos husos da el mismo veredicto |
| 5 | Cambiar la hora de cierre a 14H00 | Cambia el comportamiento sin desplegar | ✅ unitaria y de integración |
| 6 | Rol con ventana `activo = false` | Sin restricción horaria | ✅ Dirección puede escribir a las 03H00 |

Adicionales: `401` sin identidad · `403` para quien no es `ADMINISTRADOR_DMIP` · `400` con hora mal
escrita · `400 CAMPOS_NO_PERMITIDOS` al enviar `zonaHoraria` · `400` con un rol inexistente, cuyo
mensaje **enumera los seis válidos** · advertencias devueltas sin impedir el cambio · auditoría con
usuario, rol, columna y correlación.

### 7.4 Compilación y despliegue

`npm run build` y `npm run lint:check` en 0. Imagen reconstruida y contenedor `healthy`, con las
cuatro rutas mapeadas y respondiendo `401` sin identidad, que es lo correcto con
`MODO_IDENTIDAD_PROVISIONAL=false`.

---

## 8. PENDIENTES QUE ESTE MÓDULO DEJA PLANTEADOS

| # | Asunto | A quién corresponde |
|---|---|---|
| 1 | **PV-06** · la hora de cierre departamental: 14H00 o 15H00 | Product Owner. Mientras tanto, la ventana se puede ajustar sin desplegar |
| 2 | **D-08** · ninguna fuente define ventana para `DIRECTOR` ni `ADMINISTRADOR_DMIP` | Siguen sembradas con `activo = false`, que es no restringir |
| 3 | **La hora de cierre está guardada dos veces** (§4.3) | Decidir cuál es la fuente: el parámetro o la ventana. Hasta entonces, la divergencia se advierte |
| 4 | `aMinutos` sigue duplicado en `ventana-carga.evaluador.ts` de M-05 | Consolidar con `common/utilidades/hora.ts` cuando M-05 esté aprobado |

El punto 4 se dejó así a propósito: unificar exigía modificar M-05, que está a la espera de
aprobación. El nuevo `hora.ts` ya es la versión buena —lanza en lugar de devolver un número
inventado— y el evaluador migrará a él en cuanto se pueda tocar.

---

## 9. LO QUE ESTE MÓDULO DESBLOQUEA

| Módulo | Qué consume |
|---|---|
| **M-13 · Ciclo del cuadro diario** | `VentanaCargaService.puedeEscribir(rol, momento)` |
| **M-21 · Hooks del frontend** | `GET /ventanas/estado` para el hook `useVentanaCarga` |
| **M-29 · Pantalla P-09** | Los tres endpoints de administración |

Todos por servicio publicado: `ConfiguracionModule` exporta `VentanaCargaService` y ningún
repositorio sale del submódulo.

---

## 10. CAMBIOS DEL SEGUNDO CODE REVIEW · 2026-08-05

| # | Cambio | Efecto |
|---|---|---|
| **DRY-04** | `VentanasRepository` hereda de `RepositorioPrisma` | `ejecutarEnTransaccion` deja de estar duplicado |
| **DRY-06** | `aRolDepartamental` delega en `common/utilidades/enumerado.ts` | El rol inválido en la ruta devuelve el mismo mensaje que cualquier otro enumerado del sistema |

Reportado sin corregir: `actualizar` consulta las seis ventanas para componer las advertencias
aunque el cambio resulte no ser tal. Son seis filas; optimizarlo añadiría una rama por ahorrar una
consulta trivial. Ver `CODE_REVIEW.md` §12.4.

---

## 11. ESTADO

**M-08 terminado.** Compilación y lint en 0; **182 pruebas unitarias** y **34 de integración** en
verde; los seis casos del plan verificados; base restituida a su estado sembrado; imagen
reconstruida y los tres contenedores sanos.

Ningún pendiente del negocio impide su funcionamiento: PV-06 y D-08 afectan a **qué valores** tienen
las ventanas, no a que se puedan consultar y ajustar. Es precisamente lo que este módulo aporta —el
día que el Product Owner decida entre 14H00 y 15H00, el cambio es una pantalla, no un despliegue—.

**A la espera de aprobación.**
