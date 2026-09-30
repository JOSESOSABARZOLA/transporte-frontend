# M-03 · SEMILLA DE CATÁLOGOS
## Documentación de lo implementado — Cuadro de Colores Operativo · AMC

| | |
|---|---|
| **Módulo** | M-03 de `PLAN_DE_IMPLEMENTACION.md` |
| **Etapa** | E1 de `IMPLEMENTATION_GUIDE.md` |
| **Fecha** | 2026-08-05 |
| **Depende de** | M-02 (aprobado) |
| **Alcance** | Solo backend. **Ningún módulo aprobado fue modificado**; el frontend no se tocó |
| **Estado** | **Entregado parcialmente, a propósito.** 5 catálogos cargados, 7 bloqueados por pendientes del negocio |

---

## 1. RESUMEN

La semilla está **completa como pieza de software** —es idempotente, informa y está probada— pero
**carga solo cinco de los doce catálogos**. Los siete restantes dependen de datos que el negocio no
ha entregado.

**No se completó ninguno por inferencia.** Es la regla que rige el proyecto entero: el valor de
cinco fases de análisis está en distinguir lo acordado de lo supuesto.

| Cargado | Filas |
|---|---|
| Parámetros de política | **8** |
| Ventanas de carga | **6** |
| Zonales, incluido el ámbito distrital | **11** |
| Tipos de control | **44** |
| Instituciones | **16** |

| No cargado | Pendiente |
|---|---|
| Los nueve formularios | PV-25 y PV-26 |
| Prefijos de identificador | PV-27 |
| Áreas de personal por formulario | PV-25 y PV-26 |
| Puntos de encuentro (67 en el insumo) | **PV-01** |
| Las tres tablas puente de delimitación | PV-01, PV-25 y PV-26 |
| Personal | PV-02 |
| Conductores y vehículos | PV-03 |

---

## 2. QUÉ DESBLOQUEA Y QUÉ NO

Aunque parcial, la entrega **desbloquea dos módulos completos**:

| Módulo | Necesita | Estado |
|---|---|---|
| **M-06 · Parámetros de política** | `t_parametro_politica` | ✅ **Desbloqueado** |
| **M-08 · Ventanas de carga** | `t_ventana_carga` | ✅ **Desbloqueado** |
| M-07 · Formularios y catálogos | `t_formulario` y sus puentes | ❌ Bloqueado |
| M-10 · Maestro de personal | Estructura, no datos | ⚠️ Construible; sin datos reales |

M-06 es además **prerrequisito de M-12**, las políticas de descanso. Es decir: la parte de la
cadena que protege a las personas puede seguir avanzando.

---

## 3. LO QUE SE CARGÓ, Y CON QUÉ RESPALDO

### 3.1 Los ocho parámetros de política

Valores exactos de `IMPLEMENTATION_GUIDE.md` §5.2, con su rango admisible y una descripción que
cita la regla que gobiernan.

| Clave | Valor | Tipo | Rango | Regla |
|---|---|---|---|---|
| `JORNADA_MAXIMA_HORAS` | 12 | Decimal | 8–16 | RN-36 |
| `TOPE_SALIDAS_PESADAS` | 3 | Entero | 1–6 | RN-25 |
| `PERIODO_COMPUTO_SALIDAS` | MENSUAL | Texto | — | RN-37 |
| `HORA_CIERRE_DEPARTAMENTAL` | 15:00 | Texto | — | RN-59 |
| `HORA_LIMITE_CUADRO` | 16:30 | Texto | — | RN-57 |
| `FRANJA_NOCTURNA_INICIO` | 20:00 | Texto | — | RN-43 |
| `FRANJA_NOCTURNA_FIN` | 05:00 | Texto | — | RN-43 |
| `DIAS_DESCANSO_PATRULLA` | 1 | Entero | 1–3 | RN-24 |

Son **provisionales por diseño** (PV-06): los fija la Dirección y se ajustan sin desplegar código.
`HORA_CIERRE_DEPARTAMENTAL` lleva anotada en su descripción la contradicción de las fuentes —14H00
en una sesión, 15H00 en otra, del mismo interlocutor—.

### 3.2 Las seis ventanas de carga

| Rol | Apertura | Cierre | Activa |
|---|---|---|---|
| DMIP Operativos · DMIP Inspecciones · DMIT Instrucción | — | 15:00 | Sí |
| DAF | 15:00 | 16:30 | Sí |
| Director · Administrador | — | — | **No** |

**Dos decisiones que conviene explicar:**

**La hora de apertura queda nula en los departamentales.** Las fuentes solo definen la hora de
*cierre* (RN-56). Poner `00:00` habría sido inventar un dato; nulo significa «sin restricción de
apertura», que es exactamente lo que las fuentes permiten afirmar.

**Director y Administrador quedan inactivos.** Ninguna fuente define una ventana para ellos —es el
hallazgo D-08 del análisis—. Desactivarla es no restringir, que es la lectura conservadora: lo
contrario habría sido inventar un horario y bloquear a la Dirección.

### 3.3 Las once zonales

Las diez administraciones zonales más `DMQ`, marcada con `zona_es_dmq = true` conforme al punto 12
de la guía §0.1.

El **código técnico se deriva del nombre oficial** —`Zonal Chocó Andino` → `CHOCO_ANDINO`—. Es
normalización, no inferencia: el código no aporta información que no esté ya en el nombre, y sirve
de clave natural para que la semilla sea idempotente.

### 3.4 Tipos de control e instituciones

Se cargan como **unión sin repetir** a lo largo de los nueve formularios: 44 tipos y 16
instituciones. La delimitación de cuáles corresponden a cada formulario es otra cosa, y esa sí está
bloqueada.

**`ADICIONALES` no se carga como fila.** RN-20 lo describe como la opción que habilita la captura de
texto libre, y el modelo la resuelve con `oper_tipo_libre` más la restricción `ck_operativo_tipo`.
Cargarlo como tipo de control permitiría seleccionarlo y dejar el operativo sin clasificación real.
Por eso el insumo tiene 45 valores y la tabla 44.

**Sobre las instituciones:** el insumo entrega **una sola cadena** por institución. Para `AMC` esa
cadena es una sigla; para `Secretaría de Seguridad`, una denominación. Ambos campos conservan el
valor de la fuente. La separación entre sigla oficial y nombre completo la aportará el administrador
desde la pantalla de catálogos (M-28); inventarla ahora sería suponer.

---

## 4. HALLAZGO: LA UNICIDAD DE CATÁLOGOS DISTINGUE MAYÚSCULAS

Al revisar los datos apareció un problema que no estaba documentado en ninguna fase.

`uq_tipo_control_nombre` y `uq_institucion_sigla` son **sensibles a mayúsculas y acentos**. Se
comprobó insertando a mano:

```sql
INSERT INTO t_tipo_control (tico_nombre) VALUES ('control espacio público');
-- INSERT 0 1   ← aceptado, conviviendo con 'CONTROL ESPACIO PÚBLICO'
```

Dos escrituras de la misma cosa conviven como filas distintas. La restricción no lo impide. El
riesgo real aparece en M-28, la pantalla de administración de catálogos: cualquier alta con distinta
capitalización crea un duplicado semántico invisible.

**No se cambió la restricción**, porque `t_tipo_control` pertenece a M-02, ya aprobado, y volverla
insensible a mayúsculas es una decisión de modelo que corresponde al arquitecto.

**Lo que sí se hizo:** la semilla revisa **lo que hay en la base** —no solo el insumo— y avisa de los
valores que solo difieren en forma:

```
REQUIEREN NORMALIZACIÓN · valores que solo difieren en forma
  · CONTROL ESPACIO PÚBLICO  |  control espacio público
  No se fusionan: unificarlos es una decisión del Gestor de Calidad.
```

Cubre tanto la fuente como lo que el administrador agregue después. **No fusiona nada**: unificar
dos valores es una decisión de negocio, y la normalización de catálogos es responsabilidad del
Gestor de Calidad, según la matriz RACI de `FASE2` §14.2.

### 4.1 Un caso que el detector NO agrupa, y por qué

El insumo trae dos tipos de control muy parecidos en el formulario 8:

```
RE-INSPECCIÓN CON DRON - POR FALTA DE ELEMENTOS
reinspección por falta de elementos
```

**No se agrupan, y es correcto:** no difieren solo en forma, difieren en contenido —«con dron»—.
Podrían ser el mismo concepto escrito dos veces o dos supuestos distintos. Decidirlo exige criterio
humano, no un algoritmo. Quedan las dos filas cargadas y esta anotación para la sesión de
normalización.

---

## 5. POR QUÉ NO SE CARGARON LOS OTROS SIETE

### 5.1 Los nueve formularios · PV-25 y PV-26

`form_color_acento` y `form_es_patrulla` son **columnas obligatorias** y el insumo no trae sus
valores. Sin ellas no entra ni una fila.

De `form_es_patrulla` depende **RN-24**, la regla que impide asignar a patrulla a quien salió el día
anterior. Deducirla del nombre del formulario es exactamente la inferencia que el proyecto prohíbe:
el formulario 4 se llama «Patrulla ECU Diurna» pero **no tiene la composición de personal que RN-31
atribuye a las patrullas**.

Las fichas están redactadas en `docs/PENDIENTES-VALIDACION.md` §1, con la evidencia y la pregunta
lista para la sesión.

### 5.2 Los 67 puntos de encuentro · PV-01

Este merece explicación porque **la guía lo daba por resoluble** y no lo es.

`IMPLEMENTATION_GUIDE.md` §14.5 dice: *«~70 puntos de encuentro · Completo, **sin vincular a
zonal**»*. Pero el modelo aprobado define `t_punto_encuentro.zona_id` como **obligatoria**: en
`FASE4-diseno-base-datos.md` §2.2, *«El punto pertenece siempre a una zonal»*.

No se puede cargar un punto «sin vincular a zonal»: la columna no admite nulo. Y la Hoja2 lista
zonales y puntos en **columnas paralelas, sin relación entre ellas**, que es justamente PV-01.

Algunos puntos llevan la zonal en el nombre —`AMC Eugenio Espejo`, `AZ Calderón`— pero otros no:
`HCAM`, `Tejar`, `KFC - Caja del Seguro`. Asignarles zonal sería adivinar.

**La guía y el modelo se contradicen en este punto.** Se siguió el modelo, que es el que la base
impone.

### 5.3 El resto

| Catálogo | Motivo |
|---|---|
| Prefijos | PV-27: falta el criterio de selección por área en los formularios 5, 6, 7 y 8 |
| Áreas por formulario | Depende de que existan los formularios |
| Tablas puente | Dependen de los formularios y de los puntos |
| Personal | PV-02: sin tipo de contrato, RN-26 no se puede evaluar |
| Conductores y vehículos | PV-03: debe solicitarse a la DAF |

**No se cargaron «ejemplos marcados» de personal ni de conductores**, pese a que la guía §14.5 lo
autoriza. Motivo: con `t_formulario` vacío no hay nada a lo que asignarlos, y datos de ejemplo sin
uso confunden más de lo que ayudan. Se cargarán cuando lleguen los formularios, o antes si se
necesitan para probar M-10.

---

## 6. PRUEBAS EJECUTADAS

| # | Prueba | Resultado |
|---|---|---|
| 1 | `npx prisma db seed` | Carga los cinco catálogos e informa de los siete bloqueados |
| 2 | **Idempotencia**: cinco ejecuciones seguidas | **Sin error y sin duplicados**. Conteos idénticos |
| 3 | Los 8 parámetros con su rango | Verificado en la base, uno por uno |
| 4 | Las 6 ventanas con su horario y estado | Verificado |
| 5 | 11 zonales, una con `zona_es_dmq = true` | Verificado |
| 6 | 44 tipos de control | Verificado. `ADICIONALES` **no** está |
| 7 | 16 instituciones | Verificado |
| 8 | Detector de casi duplicados **con** duplicado presente | **Avisa** y nombra las dos filas |
| 9 | Detector **sin** duplicado | No avisa |
| 10 | Restricción `ck_parametro_rango` sobre los valores sembrados | Ninguno la viola |
| 11 | `npm run prisma:verificar` | 27 tablas, 11 enumerados, 24 restricciones, 7 índices parciales |
| 12 | `npm run build` · `lint:check` · `test` | **0** · **0** · **0** |
| 13 | Frontend | **Sin cambios** |

Los datos de prueba insertados a mano se eliminaron: la tabla quedó en 44 tipos.

---

## 7. ARCHIVOS

| Archivo | Cambio |
|---|---|
| `prisma/seed.ts` | **Nuevo** |
| `prisma/insumos/catalogos-hoja2.json` | **Nuevo**: copia del insumo, para que el repositorio sea autónomo |
| `package.json` | Bloque `prisma.seed` |

**Sin cambios en `src/`, en el esquema, en las migraciones ni en el frontend.**

### 7.1 Nota de despliegue

`prisma db seed` usa `ts-node`, que es dependencia de desarrollo. **No se puede ejecutar dentro de
la imagen de producción**, que instala solo dependencias de producción. Es coherente con el diseño:
la semilla es un paso explícito del despliegue, como las migraciones, y se ejecuta desde una
instalación completa.

---

## 8. LO QUE HAY QUE DECIDIR PARA COMPLETAR ESTE MÓDULO

| # | Decisión | Quién | Desbloquea |
|---|---|---|---|
| 1 | **PV-26** · qué formularios son patrulla | Product Owner | Los nueve formularios, y con ellos M-07 |
| 2 | **PV-25** · para qué sirve el color de acento | DNP, o medición | Ídem |
| 3 | **PV-01** · matriz zonal ↔ punto | Product Owner | Los 67 puntos y el filtrado en cascada |
| 4 | **PV-27** · criterio de prefijo por área | Product Owner | Los prefijos, y con ellos el generador de identificador |
| 5 | Contradicción guía §14.5 / modelo sobre `zona_id` | Arquitecto | Aclara §5.2 de este documento |
| 6 | ¿La unicidad de catálogos debe ignorar mayúsculas? | Arquitecto | Cierra el hallazgo §4 |

Cuando lleguen 1 y 2, completar la semilla es cuestión de minutos: la estructura ya está escrita y
probada. Solo hay que añadir los valores y quitar la entrada correspondiente de la lista de
bloqueados.

---

*Fin de la documentación de M-03. A la espera de aprobación.*
