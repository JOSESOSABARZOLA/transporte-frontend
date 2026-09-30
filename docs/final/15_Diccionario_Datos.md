# 15 · Diccionario de Datos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
PostgreSQL 18 · base `transportedb` · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## Convenciones

- Tablas con prefijo `t_`, enumerados con `e_`.
- Cada columna lleva el prefijo abreviado de su tabla: `oper_`, `func_`, `cuad_`, `form_`.
- `@db.Date` = **fecha de calendario**, sin hora ni huso, manejada en UTC.
- `@db.Timestamptz(3)` = instante, interpretado en `America/Guayaquil`.
- **Derivado** = lo calcula el sistema; nadie lo digita.

---

## 1. `t_formulario` · los nueve formularios

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `form_id` | serial | No | Clave primaria |
| `form_numero` | int | No | **1 a 9** (`ck_formulario_numero`). Único |
| `form_codigo` | varchar(40) | No | Código corto. Único. `FIJOS`, `PMO`, `REACN` |
| `form_nombre` | varchar(160) | No | Denominación oficial |
| `form_color_fondo` | char(7) | No | `#RRGGBB`. **Dato institucional del Excel** |
| `form_color_acento` | char(7) | No | Color del texto sobre el banner. Calculado por luminancia |
| `form_color_nombre` | varchar(40) | No | Nombre del color: «Verde azulado» |
| `form_rol_dueno` | enum | No | Departamento propietario |
| `form_rol_compartido` | enum | Sí | Departamento que aporta personal sin registrar |
| `form_cupo_compartido` | int | Sí | **Máximo** de personas que puede aportar. Hoy: **2** en el 4 · ECU y **1** en el 6 · REACN (PV-09). No hay columna para el mínimo: se exige al cerrar la jornada |
| `form_politica_vehiculo` | enum | No | NO_APLICA · CONDICIONAL · REQUERIDO · OBLIGATORIO |
| `form_condicionante_noct` | bool | No | Si en franja nocturna exige conductor (RN-43) |
| `form_es_patrulla` | bool | No | **Dispara RN-24.** Verdadero en 4, 5, 6 y 9 |
| `form_captura_libre_punto` | bool | No | Habilita `ADICIONALES` en el catálogo de PUNTOS. **Falso en los nueve**: el insumo no lo contempla ahí |
| `form_captura_libre_tipo` | bool | No | Habilita `ADICIONALES` en el catálogo de TIPOS DE CONTROL. Verdadero en 2 y 8 |
| `form_orden` | int | No | Orden de presentación |
| `form_vigencia_desde` / `_hasta` | date | Sí | Vigencia del formulario |
| `form_activo` | bool | No | Baja lógica |

> `form_es_patrulla` es la columna más delicada del sistema: de ella depende quién no puede volver
> a salir mañana. Decidida por el Product Owner el 07-AGO-2026.

## 2. `t_formulario_prefijo`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `fpre_id` | serial | No | Clave primaria |
| `form_id` | int | No | Formulario |
| `fpre_prefijo` | varchar(12) | No | Prefijo del identificador: `OCF`, `IGECU` |
| `fpre_area_aplica` | enum | Sí | Área que determina su uso. **Sin definir (PV-27)** |
| `fpre_es_predeterminado` | bool | No | Prefijo por defecto. **Hoy ninguno lo es** |

Único: `(form_id, fpre_area_aplica)`.

## 3. `t_formulario_area`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `form_id` | int | No | Formulario |
| `farea_area` | enum | No | Área de personal admitida |
| `farea_es_compartida` | bool | No | Solo el rol compartido puede asignar esta área |

Clave primaria compuesta.

## 4. `t_zonal` · `t_punto_encuentro`

**`t_zonal`**

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `zona_id` | serial | No | Clave primaria |
| `zona_codigo` | varchar(30) | No | Código derivado del nombre. Único |
| `zona_nombre` | varchar(90) | No | «Zonal La Delicia» |
| `zona_es_dmq` | bool | No | Marca el ámbito distrital, que no es una zonal |
| `zona_orden` | int | No | Orden de presentación |
| `zona_activo` | bool | No | Baja lógica |

**`t_punto_encuentro`**

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `pcto_id` | serial | No | Clave primaria |
| `pcto_nombre` | varchar(200) | No | Denominación |
| `zona_id` | int | No | Zonal a la que pertenece (RN-17) |
| `pcto_activo` | bool | No | Baja lógica |

Único: `(pcto_nombre, zona_id)`. **Tabla vacía: PV-01.**

## 5. `t_tipo_control` · `t_institucion`

| Tabla | Columnas |
|---|---|
| `t_tipo_control` | `tico_id`, `tico_nombre` (único), `tico_activo` |
| `t_institucion` | `inst_id`, `inst_sigla` (único), `inst_nombre`, `inst_activo` |

## 6. Tablas puente de delimitación

`t_formulario_punto` · `t_formulario_tipo_control` · `t_formulario_institucion`

Cada una con clave primaria compuesta de los dos identificadores. Definen **qué ofrece cada
formulario** (RN-16).

## 7. `t_ventana_carga`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `vcar_id` | serial | No | Clave primaria |
| `vcar_rol` | enum | No | **Único**: una ventana por rol |
| `vcar_tipo` | enum | No | SEMANAL · DIARIO · INTERVALO |
| `vcar_dia_apertura` / `_cierre` | smallint | Sí | 1 lunes … 7 domingo |
| `vcar_hora_apertura` / `_cierre` | varchar(5) | Sí | `HH:MM`. **Nulo = sin restricción** |
| `vcar_zona_horaria` | varchar(60) | No | `America/Guayaquil` |
| `vcar_mensaje_cierre` | varchar(400) | No | **Lo que lee el funcionario** |
| `vcar_activo` | bool | No | Falso = sin restricción horaria |

## 8. `t_parametro_politica`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `para_id` | serial | No | Clave primaria |
| `para_clave` | varchar(60) | No | Único. `JORNADA_MAXIMA_HORAS` |
| `para_valor` | varchar(120) | No | Valor, siempre como texto |
| `para_tipo` | enum | No | ENTERO · DECIMAL · TEXTO · BOOLEANO |
| `para_descripcion` | varchar(300) | No | Con la regla que gobierna |
| `para_unidad` | varchar(30) | Sí | «horas», «salidas», «días» |
| `para_minimo` / `_maximo` | varchar(120) | Sí | Rango admisible. **Viaja a la pantalla** |
| `para_modificado_por` | int | Sí | Nulo = valor de siembra |
| `para_modificado_en` | timestamptz | No | |

## 9. `t_funcionario` · maestro de personal

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `func_id` | serial | No | Clave primaria |
| `func_cedula` | varchar(13) | No | **Único.** Diez dígitos con verificador |
| `func_apellidos` | varchar(90) | No | |
| `func_nombres` | varchar(90) | No | |
| `func_telefono` | varchar(20) | Sí | **Solo lo ve el ADMINISTRADOR_DMIP** (RN-34) |
| `func_cargo` | varchar(90) | Sí | |
| `func_area` | enum | No | GENERAL · TECNICO · INSTRUCCION · OPERATIVOS · CCF |
| `func_tipo_contrato` | enum | No | **De él depende RN-26** |
| `func_direccion` | enum | No | Dirección a la que pertenece |
| `func_activo` | bool | No | **Baja lógica.** El histórico depende de la ficha |

**Tabla vacía: PV-02.**

## 10. `t_conductor` · `t_vehiculo`

**`t_conductor`**: `cond_id`, `cond_cedula` (único), `cond_nombre_completo`, `cond_telefono`,
`cond_licencia_tipo`, `vehi_id` (**vehículo habitual**), `cond_activo`.

**`t_vehiculo`**: `vehi_id`, `vehi_placa` (único), `vehi_descripcion`, `vehi_activo`.

**Ambas vacías: PV-03.** El vehículo habitual es la **única vía** por la que la DAF conoce un
vehículo (PV-33).

## 11. `t_disponibilidad` · ausencias

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `disp_id` | serial | No | Clave primaria |
| `func_id` | int | Sí | Funcionario ausente |
| `cond_id` | int | Sí | O vehículo en mantenimiento |
| `disp_estado` | enum | No | VACACIONES · REPOSO_MEDICO · CALAMIDAD · PERMISO · MANTENIMIENTO |
| `disp_desde` / `_hasta` | date | No | Extremos incluidos |
| `disp_motivo` | varchar(220) | Sí | **Puede describir una condición de salud. No se audita** |
| `disp_registrado_por` | int | No | Usuario que lo registró |

`ck_disponibilidad_sujeto`: exactamente uno de `func_id` o `cond_id`.
`ck_disponibilidad_rango`: `hasta >= desde`.

## 12. `t_historial_jornada`

Consolidado por persona y día, sobre el que operan las reglas de descanso: horas acumuladas, si
fue nocturna, si fue fin de semana, si fue patrulla.

## 13. `t_cuadro_diario`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `cuad_id` | serial | No | Clave primaria |
| `cuad_fecha` | date | No | **Único.** Jornada |
| `cuad_orden_trabajo` | varchar(40) | No | **Generada**: `AMC-AAAA-MM-DD`. Única. Solo identifica el día (PV-28) |
| `cuad_nro_semana` | int | No | Derivado. 1 a 53 |
| `cuad_anio_semana` | int | No | Derivado |
| `cuad_estado` | enum | No | BORRADOR · EN_TRANSPORTE · APROBADO · CERRADO |
| `cuad_cerrado_por` / `_en` | int / timestamptz | Sí | Quién y cuándo cerró |
| `cuad_reaperturas` | int | No | Contador, como evidencia |

## 14. `t_operativo` · el núcleo

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `oper_id` | serial | No | Clave primaria |
| `cuad_id` | int | No | Jornada |
| `form_id` | int | No | Formulario |
| `oper_identificador` | varchar(50) | No | **Generado** (RN-09). `OCF-003-07-AGO-2026` |
| `oper_secuencial` | int | No | **Reinicia cada día, por formulario** (RN-12), y **en dos series**: los adicionales cuentan aparte (RN-61) |
| `oper_origen_id` | int | Sí | Operativo del que nace este **adicional**. Nulo en un operativo ordinario. `RESTRICT`: el original no se borra mientras cuelgue de él. **Añadida el 20-AGO-2026** |
| `oper_hora_inicio` / `_fin` | varchar(5) | No | `HH:MM`, solo `:00` o `:30` (RN-07) |
| `oper_es_nocturno` | bool | No | **Derivado**: intersecta la franja nocturna |
| `oper_cruza_medianoche` | bool | No | **Derivado**: la hora de fin es menor que la de inicio |
| `oper_duracion_horas` | decimal(4,1) | No | **Derivado**, contemplando el cruce |
| `pcto_id` | int | Sí | Punto de catálogo |
| `oper_punto_libre` | varchar(220) | Sí | O texto libre. **Nunca los dos** |
| `tico_id` | int | Sí | Tipo de control |
| `oper_tipo_libre` | varchar(220) | Sí | O texto libre. **Nunca los dos** |
| `oper_estado_transporte` | enum | No | PENDIENTE · ASIGNADO · PROPIOS_MEDIOS |
| `cond_id` | int | Sí | **Escritura exclusiva de la DAF.** Nace nulo (RN-40) |
| `vehi_id` | int | Sí | Ídem |
| `oper_asignado_en` | timestamptz | Sí | Cuándo asignó la DAF |
| `oper_observaciones` | text | Sí | |
| `oper_alerta_activa` | bool | No | **Derivado**: permite filtrar sin abrir el JSON |
| `oper_alertas` | jsonb | Sí | Alertas calculadas por POL-06 |
| `oper_activo` | bool | No | Baja lógica **solo cuando el operativo tiene órdenes emitidas**; sin ellas la fila se borra (PV-10) |
| `oper_creado_por_rol` / `_por` | enum / int | No | Autoría |
| `oper_modificado_por_rol` / `_por` | enum / int | No | Última modificación |
| `oper_version` | int | No | **Bloqueo optimista** |
| `oper_creado_en` / `_actualizado_en` | timestamptz | No | |

**Únicos:** `(cuad_id, oper_identificador)`, y `(cuad_id, form_id, oper_secuencial)` **partido en dos
índices parciales** el 20-AGO-2026 —uno `WHERE oper_origen_id IS NULL`, otro `IS NOT NULL`—, porque
el adicional numera en serie propia y su `001` debe poder convivir con el ordinario `001` del mismo
formulario. Los dos códigos no se confunden porque el prefijo los separa: `OCAPMO` frente a `OCPMO`.

## 15. `t_asignacion_personal` · `t_operativo_zonal` · `t_operativo_institucion`

| Tabla | Contenido |
|---|---|
| `t_asignacion_personal` | `oper_id`, `func_id`, `asig_es_responsable`, `asig_asignado_por_rol` |
| `t_operativo_zonal` | `oper_id`, `zona_id`. RN-19 admite varias |
| `t_operativo_institucion` | `oper_id`, `inst_id` |

## 16. `t_solicitud_apoyo`

`soli_id`, `oper_id`, `soli_rol_solicitante`, `soli_rol_requerido`, `soli_cantidad`,
`soli_area`, `soli_estado`, `soli_motivo`, `soli_creada_en`.

**Solo se usa `SOLICITADA`**: no hay transiciones (PV-12).

## 17. `t_capacidad_flota`

`capa_id`, `capa_fecha` (**único**), `capa_vehiculos_habiles`, `capa_conductores_habiles`,
`capa_observacion`, `capa_declarado_por`, `capa_declarado_en`.

## 18. `t_orden_servicio`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `oser_id` | serial | No | Clave primaria |
| `oser_codigo` | varchar(80) | No | **Único.** `OS-<identificador>-<funcionario>-<emisión>` |
| `oper_id` | int | No | Operativo |
| `func_id` | int | No | Destinatario |
| `oser_dato_aislado` | **jsonb** | No | **Los cuatro campos, y ninguno más** (INV-24) |
| `oser_vigente` | bool | No | Falso al reemitir. **La anterior no se borra** |
| `oser_emitida_por` / `_en` | int / timestamptz | No | |

**`uq_orden_vigente`**: índice único parcial sobre `(oper_id, func_id) WHERE oser_vigente = true`.

## 19. `t_auditoria`

`audi_id`, `audi_entidad`, `audi_entidad_id`, `audi_accion`, `audi_cambios` (jsonb),
`audi_usuario`, `audi_rol`, `audi_momento`, `oper_id`.

**Se escribe dentro de la misma transacción que el dato.** No hay purga (PV-18).

## 20. `t_usuario`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `usua_id` | serial | No | Clave primaria |
| `usua_identificador_ad` | varchar(120) | No | **Usuario de Auth central.** Es la llave del ingreso: resuelve quién autenticó el portal contra el rol de este módulo. **Índice único** (`uq_usuario_identificador_ad`) desde el 17-AGO-2026; admite varios nulos, que son las cuentas sin enlace |
| `usua_rol` | enum | No | Rol departamental |
| `func_id` | int | Sí | **Enlace con la ficha de personal.** Único |
| `usua_activo` | bool | No | |

**Tabla vacía.** El enlace `func_id` lo agregó la migración de 06-AGO-2026 y **P-06 depende de él
por completo**; ninguna pantalla lo administra.

---

## Anexo · valores derivados

Estos campos **no se digitan nunca**. Si alguna vez aparecen como editables, es un defecto.

| Campo | Cómo se deriva |
|---|---|
| `oper_identificador` | Prefijo del formulario + secuencial + fecha |
| `oper_secuencial` | Conteo del día, dentro de la transacción |
| `oper_es_nocturno` | Intersección con la franja nocturna |
| `oper_cruza_medianoche` | Hora de fin menor que la de inicio |
| `oper_duracion_horas` | Diferencia, contemplando el cruce |
| `oper_alertas` / `oper_alerta_activa` | Política POL-06 |
| `cuad_nro_semana` / `cuad_anio_semana` | Semana ISO de la fecha |
| `cuad_estado` | Sincronizado con las ventanas |
| `form_color_acento` | Luminancia relativa WCAG sobre `form_color_fondo` |
