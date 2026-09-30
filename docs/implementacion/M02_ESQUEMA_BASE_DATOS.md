# M-02 · ESQUEMA DE BASE DE DATOS Y MIGRACIONES
## Documentación de lo implementado — Cuadro de Colores Operativo · AMC

| | |
|---|---|
| **Módulo** | M-02 de `PLAN_DE_IMPLEMENTACION.md` |
| **Etapa** | E1 de `IMPLEMENTATION_GUIDE.md` |
| **Fecha** | 2026-08-05 |
| **Depende de** | M-01 (aprobado) |
| **Alcance** | Solo backend. **Ningún módulo aprobado fue modificado**; el frontend no se tocó |
| **Estado** | **Terminado.** Los nueve casos de prueba del plan pasan, más doce pruebas de restricciones |

---

## 1. QUÉ SE ENTREGÓ

| Entregable | Detalle |
|---|---|
| `prisma/schema.prisma` | **27 modelos y 11 enumerados** |
| Migración 1 · `esquema_inicial` | 27 tablas, 11 enumerados, 23 índices únicos, 31 claves foráneas |
| Migración 2 · `agrega_restricciones_verificacion` | **24 restricciones `CHECK`** |
| Migración 3 · `agrega_indices_parciales` | **7 índices con predicado** |
| Migración 4 · `agrega_valor_por_defecto_a_marcas_de_actualizacion` | Corrige un defecto que destaparon las pruebas |
| Migración 5 · `agrega_captura_libre_al_formulario` | **Agregada en M-07**, no en M-02. `form_permite_captura_libre` cubre RN-20, que el modelo no podía expresar. Ver `M07_FORMULARIOS_CATALOGOS.md` §2 |
| `prisma/verificar-objetos.ts` | Verificación automática de lo que Prisma no expresa |
| `prisma/README.md` | Ampliado: decisiones, deriva conocida y registro de verificaciones |

### 1.1 Las 27 tablas

| Grupo | Tablas |
|---|---|
| Configuración (12) | `t_formulario`, `t_formulario_prefijo`, `t_formulario_area`, `t_formulario_punto`, `t_formulario_tipo_control`, `t_formulario_institucion`, `t_zonal`, `t_punto_encuentro`, `t_tipo_control`, `t_institucion`, `t_ventana_carga`, `t_parametro_politica` |
| Talento (5) | `t_funcionario`, `t_conductor`, `t_vehiculo`, `t_disponibilidad`, `t_historial_jornada` |
| Planificación (6) | `t_cuadro_diario`, `t_operativo`, `t_asignacion_personal`, `t_operativo_zonal`, `t_operativo_institucion`, `t_solicitud_apoyo` |
| Logística (1) | `t_capacidad_flota` |
| Entregables (1) | `t_orden_servicio` |
| Transversal (2) | `t_auditoria`, `t_usuario` |

Los 11 enumerados: `e_rol_departamental`, `e_estado_cuadro`, `e_estado_transporte`,
`e_politica_vehiculo`, `e_area_personal`, `e_tipo_contrato`, `e_estado_disponibilidad`,
`e_tipo_ventana`, `e_accion_auditoria`, `e_estado_solicitud`, `e_tipo_parametro`.

### 1.2 Nomenclatura

Se respeta la gramática institucional en toda la base: tabla `t_` + singular, columna con prefijo
de tabla, enumerado `e_`, índice `idx_`, único `uq_`, verificación `ck_`, foránea `fk_`. En el
esquema, modelo en `PascalCase` y campos en `camelCase`, siempre con `@map` y `@@map`.

---

## 2. LA RESTRICCIÓN MÁS VALIOSA

```sql
ALTER TABLE "t_operativo" ADD CONSTRAINT "ck_operativo_transporte"
  CHECK (
    ("oper_estado_transporte" = 'ASIGNADO'
      AND "cond_id" IS NOT NULL AND "vehi_id" IS NOT NULL)
    OR
    ("oper_estado_transporte" IN ('PENDIENTE', 'PROPIOS_MEDIOS')
      AND "cond_id" IS NULL AND "vehi_id" IS NULL)
  );
```

Traduce a garantía del motor el hallazgo HAL-01 del análisis de dominio: con dos indicadores
booleanos independientes, la base admitía combinaciones sin significado. **Un operativo `ASIGNADO`
sin conductor es ahora imposible de almacenar.** Verificado en la prueba 1.

**Nunca se elimina para simplificar una migración.**

---

## 3. DECISIONES TOMADAS

### 3.1 D-03 · Son 27 tablas y 11 enumerados, no 26 y 10

`FASE4-diseno-base-datos.md` documenta 26 tablas y 10 enumerados; `IMPLEMENTATION_GUIDE.md` §9 y
§5.1 exigen 27 y 11. La diferencia es `t_parametro_politica` y `TipoParametro`, incorporados por
decisión posterior del Product Owner.

**Se siguió la guía**, que manda ante conflicto (§0). El documento de base de datos debería
actualizarse.

### 3.2 Dos restricciones que ningún documento contemplaba

Las 22 restricciones de `FASE4-base-datos` §7.1 **no cubren `t_parametro_politica`**, porque esa
tabla se añadió después. Se agregaron dos:

| Restricción | Qué protege |
|---|---|
| `ck_parametro_valor` | El valor no puede quedar vacío |
| `ck_parametro_rango` | Para los tipos numéricos, el valor cae dentro de su mínimo y máximo |

`ck_parametro_rango` es la que impide almacenar una jornada máxima de 30 horas cuando el rango
declarado es de 8 a 16. La validación con mensaje comprensible vive en el servicio (M-06); esto es
la última línea de defensa. Verificado en las pruebas 10 y 11.

### 3.3 Cuatro índices que no se declaran en el esquema

**Es la decisión técnica más relevante del módulo.**

`FASE4-diseno-base-datos.md` §10.7 advierte que Prisma «no detecta» las restricciones y los índices
parciales y «podría no preservarlos». Se comprobó empíricamente qué ocurre.

Al declarar en `schema.prisma` un índice que luego se convierte en parcial por SQL, Prisma **no
reconoce el predicado `WHERE`** y lo reporta como *«índice eliminado»* en cada comparación:

```
[-] Removed index on columns (cond_id, oper_hora_inicio, oper_hora_fin)
[-] Removed index on columns (func_area)
[-] Removed index on columns (func_id, disp_desde, disp_hasta)
[-] Removed index on columns (cond_id, disp_desde, disp_hasta)
```

La siguiente migración los **recrearía completos**, destruyendo el predicado en silencio.

**Solución aplicada:** retirar esos cuatro índices de `schema.prisma` y dejarlos vivir solo en la
migración SQL. Prisma los ignora por completo y persisten. **La deriva de índices pasó a cero.**

Los otros tres —`idx_operativo_alerta`, `idx_historial_pesadas` y `uq_orden_vigente`— nunca
estuvieron en el esquema y nunca produjeron deriva, lo que confirma el diagnóstico.

### 3.4 Deriva residual conocida y benigna

`prisma migrate diff` sigue reportando una diferencia en el valor por defecto de un enumerado:

```
[*] Altered column `sapo_estado`
    (default changed from Value(Enum("SOLICITADA")) to DbGenerated("'SOLICITADA'::e_estado_solicitud"))
```

**No es deriva real.** Se comprobó el valor en la base: es exactamente
`'SOLICITADA'::e_estado_solicitud`, que es lo que declara el esquema. El comparador de Prisma no
reconoce la conversión de tipo de PostgreSQL como equivalente. La migración que propone es
idempotente y **no toca restricciones ni índices**.

**No debe corregirse regenerando tablas.** Eso sí sería una pérdida real.

---

## 4. DEFECTOS QUE DESTAPARON LAS PRUEBAS

El ciclo implementar → compilar → probar → corregir encontró dos defectos que ninguna herramienta
de análisis estático habría detectado. Ambos corregidos y verificados.

### 4.1 `@updatedAt` no crea valor por defecto en la base

Al ejecutar las pruebas de restricciones con `psql`, **cinco de doce fallaron por el motivo
equivocado**:

```
ERROR: null value in column "oper_actualizado_en" violates not-null constraint
```

Causa: `@updatedAt` de Prisma rellena la columna **desde el cliente**, no genera un `DEFAULT` en la
base. Pero el diccionario de datos —`FASE4-base-datos` §6.13— especifica `now()` como valor por
defecto de `oper_actualizado_en`.

**Consecuencia real:** cualquier inserción que no pase por Prisma —una carga de datos con `psql`,
un script del administrador de base de datos, una migración de datos— **falla**.

**Corrección.** Cuarta migración con `DEFAULT now()` en `oper_actualizado_en` y
`func_actualizado_en`. Y, de paso, esa migración absorbió tres de los cuatro artefactos de deriva de
enumerados.

### 4.2 El script de verificación rompió la compilación del contenedor

Al añadir `prisma/verificar-objetos.ts`, el contenedor entró en bucle de reinicio:

```
Error: Cannot find module '/app/dist/main'
```

Causa: `nest build` incorporó el archivo nuevo a la compilación. Al haber código fuente fuera de
`src/`, **TypeScript movió la raíz común al directorio del proyecto** y la salida pasó de
`dist/main.js` a `dist/src/main.js`.

Lo insidioso: **`npm run build` seguía devolviendo 0**. La compilación era correcta; lo que cambió
fue dónde quedó el resultado. Solo se manifestó al arrancar el contenedor.

**Corrección.** `tsconfig.build.json` acota la compilación a `src/**/*` y excluye `prisma`, con la
razón anotada en el propio archivo. El script sigue funcionando porque `ts-node` lo compila aparte.

---

## 5. VERIFICACIÓN AUTOMÁTICA

```bash
npm run prisma:verificar
```

```
Verificación correcta: 27 tablas, 11 enumerados, 24 restricciones y 7 índices parciales.
```

Comprueba nombre por nombre las 24 restricciones y los 7 índices con predicado. Si una migración
regenera una tabla y pierde alguno, **falla indicando cuál falta**, en lugar de que el defecto se
descubra el día en que la base acepte un dato que jamás debió aceptar.

Responde a la advertencia de `IMPLEMENTATION_GUIDE.md` §14.3, que pide verificar tras cada migración
estructural pero no decía cómo. **Ejecutarlo después de cada `prisma migrate dev`.**

Ya demostró su utilidad: se ejecutó tras la cuarta migración y confirmó que los 31 objetos
sobrevivieron, porque `ALTER COLUMN ... SET DEFAULT` no regenera la tabla.

---

## 6. PRUEBAS EJECUTADAS

### 6.1 Los nueve casos del plan

| # | Caso | Resultado |
|---|---|---|
| 1 | `prisma migrate status` | **Sin migraciones pendientes** |
| 2 | `prisma migrate diff` | Sin deriva de índices ni de restricciones. Solo el artefacto de §3.4 |
| 3 | Restricciones presentes en `t_operativo` | Las 8 de la tabla |
| 4 | Insertar operativo `ASIGNADO` sin conductor | **Rechazado por la base** |
| 5 | Dos cuadros con la misma fecha | Rechazado · `uq_cuadro_fecha` · RN-05 |
| 6 | Dos operativos con igual cuadro, formulario y secuencial | Rechazado · `uq_operativo_cuad_form_sec` · RN-12 |
| 7 | Disponibilidad con funcionario y conductor a la vez | Rechazado · `ck_disponibilidad_sujeto` |
| 8 | Dos órdenes vigentes para el mismo operativo y funcionario | Índice único parcial creado y verificado |
| 9 | Tras una migración estructural | Los 31 objetos siguen presentes |

### 6.2 Doce pruebas de restricciones contra la base

Ejecutadas con `psql` dentro del contenedor. Cada una comprueba que la base **rechaza lo que debe
rechazar** y **acepta lo que debe aceptar**.

| # | Prueba | Esperado | Resultado |
|---|---|---|---|
| 1 | `ASIGNADO` sin conductor | Falla | `ck_operativo_transporte` |
| 2 | Hora `08:15` | Falla | `ck_operativo_hora_inicio` |
| 3 | Punto de catálogo **y** punto libre | Falla | `ck_operativo_punto` |
| 4 | Operativo válido `PENDIENTE` con punto libre | **Inserta** | `INSERT 0 1` |
| 5 | Secuencial repetido | Falla | `uq_operativo_cuad_form_sec` |
| 6 | Disponibilidad con dos sujetos | Falla | `ck_disponibilidad_sujeto` |
| 7 | Ausencia que termina antes de empezar | Falla | `ck_disponibilidad_rango` |
| 8 | Formulario número 10 | Falla | `ck_formulario_numero` |
| 9 | Rol compartido sin cupo | Falla | `ck_formulario_compartido` |
| 10 | Jornada de 30 con máximo 16 | Falla | `ck_parametro_rango` |
| 11 | Jornada de 12 dentro del rango | **Inserta** | `INSERT 0 1` |
| 12 | Cuadro `CERRADO` sin usuario ni momento | Falla | `ck_cuadro_cierre` |

Los datos de prueba se eliminaron al terminar: las tablas quedaron vacías.

### 6.3 Compilación y ejecución

| Verificación | Resultado |
|---|---|
| `npm run build` | **0** · `dist/main.js` en su sitio |
| `npm run lint:check` | **0** |
| `npm test` | **0** · 1/1 |
| `npm run prisma:verificar` | **0** |
| Imagen de Docker | Construida, con las 4 migraciones dentro |
| Contenedor | `Up` · Prisma conectado · endpoint `200` |
| Frontend | **Sin cambios.** No entra en M-02 |

---

## 7. LO QUE NO SE HIZO, Y POR QUÉ

| Elemento | Motivo |
|---|---|
| Datos iniciales (`seed.ts`) | Es **M-03**. Este módulo entrega la estructura vacía |
| Repositorios y servicios | Son M-06 en adelante |
| Poblar `t_formulario_punto` | **PV-01**: la matriz zonal ↔ punto no la ha entregado el Product Owner. La tabla existe y está vacía, con la nota en el esquema |
| Poblar personal y conductores | **PV-02 y PV-03** |
| `form_color_acento` y `form_es_patrulla` | **PV-25 y PV-26**: las columnas existen y son obligatorias, pero **el insumo no trae sus valores**. Bloquean M-03, no M-02 |

**Ningún pendiente se resolvió por inferencia.**

---

## 8. RIESGO ABIERTO

`form_es_patrulla` existe en la base y es obligatoria, pero **nadie ha dicho qué formularios son
patrulla**. De esa columna depende RN-24, la regla que impide asignar a patrulla a quien salió el
día anterior.

Deducirla del nombre del formulario es exactamente la inferencia que el proyecto prohíbe, y
equivocarse no produce un error de sistema: deja a una persona en patrulla dos días seguidos.
**Debe resolverse antes de M-03**, que es cuando hay que sembrar un valor.

---

## 9. ARCHIVOS

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | **Reescrito**: 27 modelos, 11 enumerados |
| `prisma/migrations/…_esquema_inicial/` | **Nuevo** |
| `prisma/migrations/…_agrega_restricciones_verificacion/` | **Nuevo** · 24 `CHECK` |
| `prisma/migrations/…_agrega_indices_parciales/` | **Nuevo** · 7 índices con predicado |
| `prisma/migrations/…_agrega_valor_por_defecto…/` | **Nuevo** · corrección de §4.1 |
| `prisma/verificar-objetos.ts` | **Nuevo** |
| `prisma/README.md` | Ampliado |
| `package.json` | Script `prisma:verificar` |
| `tsconfig.build.json` | Compilación acotada a `src` · corrección de §4.2 |

**Sin cambios en `src/`**, salvo lo que ya entregó M-01. **Sin cambios en el frontend.**

---

*Fin de la documentación de M-02. A la espera de aprobación.*
