# 15 · Diccionario de Datos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
PostgreSQL 18 · base `transportedb` · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> **55 tablas.** Columnas, tipos y nulabilidad salen de `transporte-backend/prisma/schema.prisma`
> (rama `base/cuadro-colores`, HEAD del backend `24520af`), traducidos al tipo de PostgreSQL. Las
> restricciones `CHECK` e índices parciales de cada tabla están en
> [05 · Manual de Base de Datos](05_Manual_Base_Datos.md) §4 y §5.

---

## Convenciones

- Tablas con prefijo `t_`, enumerados con `e_`.
- Cada columna lleva el prefijo abreviado de su tabla: `oper_`, `func_`, `cuad_`, `form_`. Las
  claves foráneas conservan el nombre de la columna referida: `form_id`, `oper_id`, `cond_id`.
- `date` = **fecha de calendario**, sin hora ni huso, manejada en UTC.
- `timestamptz` = instante, interpretado en `America/Guayaquil`.
- `varchar(5)` en una hora = hora de reloj `HH:MM`, a propósito no convertida a instante.
- **Derivado** = lo calcula el sistema; nadie lo digita.
- Los `serial` son claves primarias; no los repetimos en cada descripción.

### Qué cambió desde agosto

| Cambio | Detalle |
|---|---|
| Tablas nuevas | 31 (marcadas **nueva** en el título de su sección) |
| Tablas retiradas | `t_formulario_punto`, `t_formulario_tipo_control`, `t_formulario_institucion` |
| Columnas retiradas | `form_rol_compartido`, `form_cupo_compartido`, `func_tipo_contrato`, `cond_tipo_contrato`, `oper_observaciones`, `usua_rol`, `form_permite_captura_libre` |
| Columnas que pasaron a ser de un formulario | `form_id` en `t_punto_encuentro`, `t_tipo_control` y `t_institucion` |

---

## 1. Configuración

### 1.1. `t_formulario`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `form_id` | serial | No | |
| `form_numero` | int | No | **1 a 99** (`ck_formulario_numero`, ampliado el 29-SEP). Único |
| `form_codigo` | varchar(40) | No | Código corto. Único. `FIJOS`, `PMO`, `REACN` |
| `form_nombre` | varchar(160) | No | Denominación oficial |
| `form_color_fondo` | char(7) | No | `#RRGGBB`. Dato institucional |
| `form_color_acento` | char(7) | No | Color del texto sobre el banner. Calculado por luminancia |
| `form_color_nombre` | varchar(40) | No | Nombre del color: «Verde azulado» |
| `form_rol_dueno` | `e_rol_departamental` | No | Departamento **responsable**. Desde el 25-AGO no decide la autorización: eso lo hace `t_formulario_rol` |
| `form_politica_vehiculo` | `e_politica_vehiculo` | No | NO_APLICA · CONDICIONAL · REQUERIDO · OBLIGATORIO |
| `form_condicionante_noct` | bool | No | Si en franja nocturna exige conductor (RN-43) |
| `form_es_patrulla` | bool | No | **Dispara RN-24.** De ella depende quién no puede volver a salir mañana |
| `form_captura_libre_punto` | bool | No | Habilita texto libre en el catálogo de puntos (RN-20) |
| `form_captura_libre_tipo` | bool | No | Habilita texto libre en tipos de control. Verdadero en todos desde el 24-SEP |
| `form_punto_manual` | bool | No | Permite **crear** un punto en el catálogo al registrar. **24-SEP** |
| `form_filtra_personal_por_rol` | bool | No | Acota los elegibles al área del rol que consulta. Falso solo en el 7. **27-AGO** |
| `form_tipo_control_multiple` | bool | No | Admite varios tipos de control por operativo. **7-SEP** |
| `form_varios_por_persona` | bool | No | Un operativo por persona (patrullas 5 y 6, y el 8). **10-SEP** |
| `form_cantidad_por_persona` | bool | No | Ofrece fijar cuántos operativos genera cada persona. Solo el 8. **14-SEP** |
| `form_max_personas` | smallint | Sí | Tope de personas por operativo. Nulo = sin tope. El 8 lleva 1. **28-OCT** |
| `form_elegir_una_area` | bool | No | Todas las personas de una misma área. Solo el 8. **28-OCT** |
| `form_cantidad_por_zona` | bool | No | Registro por zonas: una persona, varias zonales. Solo el 8. **28-OCT** |
| `form_tipo_transporte_defecto` | `e_tipo_transporte` | No | Transporte sugerido al registrar. **7-OCT** |
| `form_orden` | int | No | Orden de presentación |
| `form_vigencia_desde` / `_hasta` | date | Sí | Vigencia del formulario |
| `form_activo` | bool | No | Baja lógica |
| `form_creado_en` | timestamptz | No | |

> **Retiradas el 25-AGO:** `form_rol_compartido` y `form_cupo_compartido`. Solo daban para un
> dueño y un invitado; los reemplaza `t_formulario_rol`.

### 1.2. `t_formulario_prefijo`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `fpre_id` | serial | No | |
| `form_id` | int | No | Formulario |
| `fpre_prefijo` | varchar(12) | No | Prefijo del identificador: `OCF`, `IGECU`, `IG` |
| `fpre_area_aplica` | `e_area_personal` | Sí | Área que lo usa. Nulo = sirve a cualquiera |
| `fpre_es_predeterminado` | bool | No | Prefijo por defecto del formulario |
| `fpre_es_adicional` | bool | No | Nombra a los adicionales: `OCAPMO`, `IGA`, `ITA` |

Único `uq_formulario_prefijo_area`: (`form_id`, `fpre_area_aplica`, `fpre_es_adicional`) desde el
8-SEP; el 8 tiene dos prefijos por área.

### 1.3. `t_formulario_area`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `form_id` | int | No | Formulario |
| `farea_area` | `e_area_personal` | No | Área admitida |
| `farea_es_compartida` | bool | No | Solo el rol que aporta puede asignar esta área |

Clave primaria compuesta.

### 1.4. `t_formulario_rol` · nueva

Qué puede hacer cada rol en cada formulario. Agregar un departamento es un `INSERT`.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `form_id` | int | No | Formulario |
| `frol_rol` | `e_rol_departamental` | No | Rol |
| `frol_acceso` | `e_acceso_formulario` | No | `ESCRITURA` registra y edita lo suyo; `APORTA` solo asigna personal |
| `frol_cupo` | smallint | Sí | Máximo de personas que aporta. Solo en `APORTA` (`ck_formulario_rol_cupo`) |
| `frol_edita_desde_jornada` | bool | No | Si asigna personal desde la Jornada del Día. Es un camino, no un permiso |

Clave primaria (`form_id`, `frol_rol`).

### 1.5. `t_zonal` · zona de la ciudad

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `zona_id` | serial | No | |
| `zona_codigo` | varchar(30) | No | Código derivado del nombre. Único |
| `zona_nombre` | varchar(90) | No | «Zonal La Delicia» |
| `zona_es_dmq` | bool | No | Marca el ámbito distrital |
| `zona_orden` | int | No | Orden de presentación |
| `zona_activo` | bool | No | Baja lógica |
| `zona_sector` | `e_sector_ciudad` | Sí | Sector, para el traslado «mismo sector». **6-OCT** |

La usan personal, flota, tramos, traslados y transporte para reconocer el mismo sitio entre
formularios. No se administra desde Catálogos.

### 1.6. `t_zonal_formulario` · nueva

Las zonales **de cada formulario**, con nombre y estado propios (13-OCT).

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `zofo_id` | serial | No | |
| `form_id` | int | No | Formulario. `CASCADE` |
| `zona_id` | int | No | Zona de la ciudad a la que corresponde. `RESTRICT` |
| `zofo_nombre` | varchar(90) | No | Nombre en ese formulario |
| `zofo_activo` | bool | No | Baja lógica |
| `zofo_orden` | int | No | Orden de presentación |

Únicos: (`form_id`, `zona_id`) y (`form_id`, `zofo_nombre`).

### 1.7. `t_punto_encuentro`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `pcto_id` | serial | No | |
| `form_id` | int | No | Formulario al que pertenece. **29-SEP** |
| `pcto_nombre` | varchar(200) | No | Denominación |
| `zona_id` | int | No | Zona. Clave foránea compuesta hacia la zonal **de su formulario** |
| `pcto_activo` | bool | No | Baja lógica |

Único: (`form_id`, `zona_id`, `pcto_nombre`).

### 1.8. `t_tipo_control` · `t_institucion`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `tico_id` | serial | No | |
| `form_id` | int | No | Formulario al que pertenece. **7-SEP** |
| `tico_nombre` | varchar(200) | No | Único por formulario |
| `tico_activo` | bool | No | Baja lógica |

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `inst_id` | serial | No | |
| `form_id` | int | No | Formulario al que pertenece. **29-SEP** |
| `inst_sigla` | varchar(40) | No | Única por formulario |
| `inst_nombre` | varchar(200) | No | Denominación completa |
| `inst_activo` | bool | No | Baja lógica |

> Las tablas puente `t_formulario_punto`, `t_formulario_tipo_control` y
> `t_formulario_institucion` **ya no existen**: cada valor pertenece a un formulario.

### 1.9. `t_ventana_carga`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `vcar_id` | serial | No | |
| `vcar_rol` | `e_rol_departamental` | No | **Único**: una ventana por rol |
| `vcar_tipo` | `e_tipo_ventana` | No | Se ofrecen DIARIO, LABORABLE y SIN_RESTRICCION |
| `vcar_dia_apertura` / `_cierre` | smallint | Sí | 1 lunes … 7 domingo |
| `vcar_hora_apertura` / `_cierre` | varchar(5) | Sí | `HH:MM`. Nulo = sin restricción |
| `vcar_zona_horaria` | varchar(60) | No | `America/Guayaquil` |
| `vcar_mensaje_cierre` | varchar(400) | No | Lo que lee el funcionario. Admite `{apertura}` y `{cierre}` |
| `vcar_activo` | bool | No | **Derivado** del tipo desde el 7-OCT: falso = `SIN_RESTRICCION` |

### 1.10. `t_parametro_politica`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `para_id` | serial | No | |
| `para_clave` | varchar(60) | No | Única. `JORNADA_MAXIMA_HORAS`, `CARGA_OP_ALTA` |
| `para_valor` | varchar(120) | No | Valor, siempre como texto |
| `para_tipo` | `e_tipo_parametro` | No | ENTERO · DECIMAL · TEXTO · BOOLEANO |
| `para_descripcion` | varchar(300) | No | Con la regla que gobierna |
| `para_unidad` | varchar(30) | Sí | «horas», «operativos», «minutos» |
| `para_minimo` / `_maximo` | varchar(120) | Sí | Rango admisible. Viaja a la pantalla |
| `para_valor_siembra` | varchar(120) | Sí | Valor con que se sembró: «Modificado» y «Restaurar». **24-OCT** |
| `para_modificado_por` | int | Sí | Nulo = valor de siembra |
| `para_modificado_en` | timestamptz | No | |

### 1.11. `t_jornada_laboral` · nueva

Reemplaza al tipo de contrato desde el 23-OCT. Decide en qué días y horas se convoca a una
persona o a un conductor (RN-26, RN-33).

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `jorl_id` | serial | No | |
| `jorl_nombre` | varchar(80) | No | Único. «Lunes a Viernes 8 horas» |
| `jorl_dias` | smallint[] | No | 1 = lunes … 7 = domingo (`ck_jornada_dias`) |
| `jorl_hora_inicio` / `_fin` | varchar(5) | Sí | Ventana opcional, `HH:00`/`HH:30`, en par. Sin ella, cualquier hora de esos días |
| `jorl_activo` | bool | No | No se borra: se desactiva y quien la tiene la conserva |
| `jorl_creado_por` / `_en` | int / timestamptz | Sí / No | Autoría |
| `jorl_modificado_por` / `_en` | int / timestamptz | Sí / No | Última modificación |

---

## 2. Identidad y permisos

### 2.1. `t_usuario`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `usua_id` | serial | No | |
| `usua_correo` | varchar(160) | No | Correo de la cuenta. Único |
| `usua_nombre` | varchar(160) | No | Nombre para mostrar |
| `usua_identificador_ad` | varchar(120) | Sí | **Usuario de Auth central**, llave del canje. Único (`uq_usuario_identificador_ad`); admite varios nulos |
| `func_id` | int | Sí | Enlace con la ficha de personal. Único |
| `usua_activo` | bool | No | |
| `usua_creado_en` | timestamptz | No | |

> **`usua_rol` se retiró el 19-AGO.** Los roles viven en `t_usuario_rol`.

### 2.2. `t_usuario_rol` · nueva

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `usua_id` | int | No | Cuenta |
| `usro_rol` | `e_rol_departamental` | No | Rol concedido |
| `usro_creado_en` | timestamptz | No | Desde cuándo lo tiene |

Clave primaria (`usua_id`, `usro_rol`). Valen todos a la vez: la persona ve la unión.

### 2.3. `t_rol_auth` · nueva

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `rola_id_auth` | int | No | Identificador del rol en Auth central. Clave primaria |
| `rola_nombre_auth` | varchar(120) | No | Nombre en Auth. Solo para mostrar |
| `rola_rol` | `e_rol_departamental` | No | Rol de este módulo |
| `rola_subsistema` | int | No | Subsistema de Auth. SIGOC es el 11 |
| `rola_activo` | bool | No | |
| `rola_creado_en` / `_actualizado_en` | timestamptz | No | |

### 2.4. `t_rol_direccion` · nueva

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `rodi_id` | serial | No | |
| `rodi_rol` | `e_rol_departamental` | No | Rol que administra |
| `rodi_direccion` | `e_rol_departamental` | No | Dirección administrada, como en `func_direccion` |
| `rodi_activo` | bool | No | |
| `rodi_creado_en` | timestamptz | No | |

Único (`rodi_rol`, `rodi_direccion`).

### 2.5. `t_rol` · `t_permiso` · `t_rol_permiso` · nuevas

RBAC por permisos atómicos (16-SEP). La identidad del rol sigue siendo el enumerado.

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_rol` | `rol_codigo` | `e_rol_departamental` | No | Clave primaria |
| | `rol_nombre` | varchar(120) | No | Nombre del organigrama |
| | `rol_orden` | smallint | No | Orden de presentación |
| | `rol_asignable` | bool | No | Si se ofrece en Cuentas |
| `t_permiso` | `perm_codigo` | varchar(60) | No | Clave primaria. `transporte:asignar` |
| | `perm_modulo` | varchar(40) | No | Módulo del permiso |
| | `perm_descripcion` | varchar(200) | No | |
| | `perm_activo` | bool | No | |
| `t_rol_permiso` | `rper_rol` | `e_rol_departamental` | No | Rol |
| | `rper_permiso` | varchar(60) | No | Permiso |

---

## 3. Talento operativo

### 3.1. `t_funcionario` · maestro de personal

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `func_id` | serial | No | |
| `func_cedula` | varchar(13) | No | **Única.** Diez dígitos con verificador |
| `func_apellidos` / `func_nombres` | varchar(90) | No | |
| `func_telefono` | varchar(20) | Sí | Único origen del teléfono (RN-34) |
| `func_correo` | varchar(160) | Sí | Correo **institucional**, precargado de Auth. **1-SEP** |
| `func_correo_personal` | varchar(160) | Sí | Correo personal, a mano. **1-OCT** |
| `func_cargo` | varchar(90) | Sí | |
| `func_area` | `e_area_personal` | No | GENERAL · TECNICO · INSTRUCCION · OPERATIVOS |
| `jorl_id` | int | Sí | **Jornada laboral** (RN-26). Nula = sin jornada: no se convoca. **23-OCT** |
| `func_direccion` | `e_rol_departamental` | No | Dirección a la que pertenece |
| `func_zonal_id` | int | Sí | Zona de trabajo. Opcional en DMIP; en Instrucción la fija la cobertura |
| `func_denominacion` | `e_denominacion_instruccion` | Sí | Solo Instrucción |
| `func_activo` | bool | No | **Baja lógica.** El histórico depende de la ficha |
| `func_motivo_baja` | varchar(30) | Sí | FIN_CONTRATO · RENUNCIA · TRASLADO · OTRO. Se limpia al reactivar. **30-SEP** |
| `func_motivo_baja_detalle` | varchar(220) | Sí | Solo con OTRO |
| `func_creado_en` / `_actualizado_en` | timestamptz | No | |

> **`func_tipo_contrato` se retiró el 23-OCT** junto con `e_tipo_contrato`. Ver
> [05](05_Manual_Base_Datos.md) §9.3.

### 3.2. `t_disponibilidad` · ausencias y paradas

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `disp_id` | serial | No | |
| `func_id` | int | Sí | Funcionario ausente |
| `cond_id` | int | Sí | O conductor ausente |
| `vehi_id` | int | Sí | O vehículo en mantenimiento |
| `disp_estado` | `e_estado_disponibilidad` | No | Situación |
| `disp_desde` / `_hasta` | date | No | Extremos incluidos |
| `disp_motivo` | varchar(220) | Sí | **Puede describir una condición de salud. No se audita** |
| `disp_taller` | varchar(120) | Sí | Taller. Solo en `MANTENIMIENTO` de vehículo |
| `disp_hora` | varchar(5) | Sí | Hora de la cita, `HH:MM` |
| `disp_estado_mantenimiento` | `e_estado_mantenimiento` | Sí | PROGRAMADO · EN_TALLER · LISTO. Solo vehículos |
| `disp_zonal_taller_id` | int | Sí | Zona del taller: destino de la tarea «Llevar a taller» |
| `disp_registrado_por` | int | No | Usuario que lo registró |
| `disp_creado_en` | timestamptz | No | |

`ck_disponibilidad_sujeto`: exactamente uno de `func_id`, `cond_id` o `vehi_id`.

### 3.3. `t_historial_jornada`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `hist_id` | serial | No | |
| `func_id` | int | No | Persona |
| `hist_fecha` | date | No | Día |
| `hist_fue_patrulla` | bool | No | RN-24: bloquea patrulla al día siguiente |
| `hist_fue_nocturna` | bool | No | RN-25: suma al tope de salidas pesadas |
| `hist_fue_fin_semana` | bool | No | RN-25 |
| `hist_horas_jornada` | numeric(4,1) | No | RN-36: jornada máxima |
| `hist_operativos` | smallint | No | Operativos del día |
| `hist_consolidado_en` | timestamptz | No | |

Único (`func_id`, `hist_fecha`). Se escribe al **cerrar** el cuadro y, desde el 30-OCT, se borra al
**reabrirlo**.

### 3.4. `t_cobertura_turno` · `t_cobertura_mes` · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_cobertura_turno` | `cotu_id` | serial | No | |
| | `cotu_funcionario_id` | int | No | Persona de Instrucción |
| | `cotu_fecha` | date | No | Día. Único con la persona |
| | `cotu_estado` | `e_estado_turno` | No | DIURNO · NOCTURNO · DESCANSO. Las ausencias no van aquí |
| | `cotu_registrado_por` | int | Sí | |
| | `cotu_creado_en` / `_actualizado_en` | timestamptz | No | |
| `t_cobertura_mes` | `comes_id` | serial | No | |
| | `comes_mes` | varchar(7) | No | `AAAA-MM` |
| | `comes_direccion` | `e_rol_departamental` | No | Dirección al alcance. Único con el mes |
| | `comes_estado` | `e_estado_cobertura_mes` | No | Solo informativo; sin fila = BORRADOR |
| | `comes_publicado_por` / `_en` | int / timestamptz | Sí | |
| | `comes_actualizado_en` | timestamptz | No | |

---

## 4. Cuadro diario · `t_cuadro_diario`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `cuad_id` | serial | No | |
| `cuad_fecha` | date | No | **Única.** Jornada (RN-05) |
| `cuad_orden_trabajo` | varchar(40) | No | **Generada**: `AMC-AAAA-MM-DD`. Única |
| `cuad_nro_semana` | smallint | No | **Derivado.** Semana ISO, 1 a 53 |
| `cuad_anio_semana` | smallint | No | **Derivado** |
| `cuad_estado` | `e_estado_cuadro` | No | BORRADOR · EN_TRANSPORTE · APROBADO · CERRADO |
| `cuad_cerrado_por` / `_en` | int / timestamptz | Sí | Quién y cuándo cerró |
| `cuad_reaperturas` | smallint | No | Contador, como evidencia |
| `cuad_creado_en` | timestamptz | No | |

---

## 5. Operativos

### 5.1. `t_operativo` · el núcleo

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `oper_id` | serial | No | |
| `cuad_id` | int | No | Jornada |
| `form_id` | int | No | Formulario |
| `oper_identificador` | varchar(50) | No | **Generado** (RN-09). `OCF-003-07-AGO-2026`. Único por cuadro |
| `oper_secuencial` | int | No | **Reinicia cada día y numera por prefijo** (RN-12) |
| `oper_origen_id` | int | Sí | Operativo del que nace un **adicional**. `RESTRICT` |
| `oper_grupo_registro` | uuid | No | **Id del registro.** Lo comparten los códigos de una patrulla o de un registro por zonas. Nunca nulo desde el 27-OCT |
| `oper_hora_inicio` / `_fin` | varchar(5) | No | `HH:00`/`HH:30`. **Derivada** del turno de las personas (envolvente, RN-66) |
| `oper_es_nocturno` | bool | No | **Derivado**: alguna persona lo es |
| `oper_cruza_medianoche` | bool | No | **Derivado** |
| `oper_duracion_horas` | numeric(4,1) | No | **Derivado**, contemplando el cruce |
| `pcto_id` | int | Sí | Punto de catálogo |
| `oper_punto_libre` | varchar(220) | Sí | O texto libre (RN-20). Nunca los dos |
| `tico_id` | int | Sí | Tipo de control escalar, de operativos anteriores al 7-SEP. Hoy se lee `t_operativo_tipo_control` |
| `oper_tipo_libre` | varchar(220) | Sí | Tipo en texto libre |
| `oper_estado_transporte` | `e_estado_transporte` | No | PENDIENTE · ASIGNADO · PROPIOS_MEDIOS. Lo fija la DAF |
| `oper_tipo_transporte` | `e_tipo_transporte` | No | Transporte que pide quien registra. **6-OCT** |
| `oper_es_macrooperativo` | bool | No | Vehículo exclusivo. Solo con `COMPLETO` |
| `oper_compartir_con_id` | int | Sí | Operativo con el que pide compartir unidad. `SET NULL`. **19-OCT** |
| `oper_justificacion_exclusivo` | varchar(300) | Sí | Por qué pide vehículo exclusivo |
| `oper_compartir_solicitado_por` / `_en` | int / timestamptz | Sí | Quién pidió compartir y cuándo |
| `oper_transporte_liberado_en` | timestamptz | Sí | Cuándo un cambio liberó el transporte asignado (alerta ALV-07) |
| `cond_id` | int | Sí | **Reflejo** del primer tramo asignado. Nace nulo (RN-40) |
| `vehi_id` | int | Sí | Ídem |
| `oper_asignado_en` | timestamptz | Sí | Cuándo asignó la DAF |
| `oper_alerta_activa` | bool | No | **Derivado** |
| `oper_alertas` | jsonb | Sí | Alertas calculadas (POL-06) |
| `oper_activo` | bool | No | Baja lógica solo con órdenes o adicionales; si no, la fila se borra (PV-10) |
| `oper_creado_por_rol` / `_por` | enum / int | No | Autoría |
| `oper_modificado_por_rol` / `_por` | enum / int | No | Última modificación |
| `oper_version` | int | No | **Bloqueo optimista** |
| `oper_creado_en` / `_actualizado_en` | timestamptz | No | |

> **`oper_observaciones` se retiró el 9-SEP.** Las notas viven en `t_operativo_observacion`.
>
> **`cond_id` y `vehi_id` ya no deciden la ocupación.** Desde el 14-OCT la única fuente es
> `t_tramo_transporte`; estas columnas son el reflejo que leen la orden de servicio, la matriz y
> `ck_operativo_transporte`.

### 5.2. `t_asignacion_personal`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `aper_id` | serial | No | |
| `oper_id` | int | No | Operativo |
| `func_id` | int | No | Persona. Única por operativo |
| `aper_asignado_por_rol` | `e_rol_departamental` | No | Distingue al dueño del rol que aporta |
| `aper_es_responsable` | bool | No | |
| `aper_hora_inicio` / `_fin` | varchar(5) | Sí | Turno propio de la persona, en par. **8-SEP** |
| `aper_creado_en` | timestamptz | No | |

### 5.3. `t_operativo_tramite_inspeccion` · nueva

Copia del trámite que el sistema de Inspección tiene asignado a un inspector. No cambia si
Inspección lo modifica después; se borra con la asignación (`CASCADE`).

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `otin_id` | serial | No | |
| `aper_id` | int | No | Asignación |
| `otin_codigo_tramite` | varchar(60) | No | Código del trámite, no vacío |
| `otin_nro_sitra` | varchar(80) | Sí | |
| `otin_predio` | varchar(40) | Sí | |
| `otin_zonal` | varchar(80) | Sí | Zonal según Inspección |
| `otin_materia` | varchar(160) | Sí | |
| `otin_tipo_tramite` | varchar(60) | Sí | |
| `otin_estado` | varchar(40) | Sí | |
| `otin_tomado_por` / `_en` | int / timestamptz | No | Quién lo eligió y cuándo |

### 5.4. Tablas de relación del operativo

| Tabla | Columnas | Descripción |
|---|---|---|
| `t_operativo_zonal` | `oper_id`, `zona_id`, `ozon_orden` (smallint) | Zonas del operativo. La de orden 1 es la principal |
| `t_operativo_institucion` | `oper_id`, `inst_id` | Instituciones participantes |
| `t_operativo_tipo_control` · nueva | `oper_id`, `tico_id` | Tipos de control del operativo |

### 5.5. `t_operativo_observacion` · nueva

Bitácora que solo crece: las notas no se editan ni se borran.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `oobs_id` | serial | No | |
| `oper_id` | int | No | Operativo |
| `oobs_texto` | text | No | Nota |
| `oobs_creado_por_rol` / `_por` | enum / int | No | Autor |
| `oobs_creado_en` | timestamptz | No | |

### 5.6. `t_solicitud_apoyo`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `sapo_id` | serial | No | |
| `oper_id` | int | No | Operativo |
| `sapo_rol_solicitante` / `_requerido` | `e_rol_departamental` | No | |
| `sapo_area_requerida` | `e_area_personal` | Sí | |
| `sapo_cantidad` | smallint | No | Mayor que cero |
| `sapo_estado` | `e_estado_solicitud` | No | **Solo se usa `SOLICITADA`**: no hay transiciones (PV-12) |
| `sapo_observacion` | varchar(400) | Sí | |
| `sapo_creado_en` | timestamptz | No | |

> La versión anterior de este diccionario nombraba estas columnas con `soli_`. El prefijo real
> siempre fue `sapo_`.

### 5.7. `t_registro_operativo` · nueva

Lo que es del registro por zonas y no de cada identificador (formulario 8, 28-OCT).

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `rope_grupo_registro` | uuid | No | Clave primaria. El mismo `oper_grupo_registro` de sus códigos |
| `form_id` | int | No | Formulario |
| `zona_id` | int | No | **Zona principal**: origen y prioridad del transporte común |
| `pcto_id` | int | No | Punto principal |
| `rope_creado_por` / `_en` | int / timestamptz | No | |
| `rope_modificado_por` / `_en` | int / timestamptz | Sí | |

---

## 6. Transporte y flota

### 6.1. `t_conductor`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `cond_id` | serial | No | |
| `cond_cedula` | varchar(13) | No | Única |
| `cond_nombre_completo` | varchar(160) | No | |
| `cond_telefono` | varchar(20) | Sí | |
| `cond_licencia_tipo` | varchar(10) | Sí | |
| `vehi_id` | int | Sí | Vehículo habitual |
| `cond_activo` | bool | No | Baja lógica |
| `cond_sector` | `e_sector_ciudad` | Sí | Dónde vive. **31-AGO** |
| `cond_parqueadero_autorizado` | bool | No | Si puede llevarse el vehículo a casa (RN-DAF-04) |
| `jorl_id` | int | Sí | **Jornada laboral.** Nula = no se le asigna transporte. **23-OCT** |
| `cond_acta_parqueadero_numero` | varchar(60) | Sí | Acta del parqueadero autorizado |
| `cond_acta_parqueadero_desde` / `_hasta` | date | Sí | Vigencia del acta |
| `cond_patron_rotacion` | varchar(14) | Sí | Ciclo `D N E L A`, de 2 a 14 días |
| `cond_baja_en` / `_por` | timestamptz / int | Sí | Cuándo y quién lo dio de baja. **20-OCT** |

> **`cond_tipo_contrato` se retiró el 23-OCT.** Había llegado el 31-AGO.

### 6.2. `t_vehiculo`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `vehi_id` | serial | No | |
| `vehi_placa` | varchar(10) | No | Única. Normalizada `AAA-9999` desde el 15-OCT |
| `vehi_descripcion` | varchar(160) | Sí | |
| `vehi_activo` | bool | No | Baja lógica |
| `vehi_tipo` | varchar(40) | Sí | **6-OCT** |
| `vehi_asientos` | smallint | Sí | Decide si caben las personas |
| `vehi_kilometraje` | int | Sí | |
| `vehi_matricula_vencimiento` / `vehi_soat_vencimiento` | date | Sí | |
| `vehi_baja_en` / `_por` | timestamptz / int | Sí | **20-OCT** |

### 6.3. `t_ubicacion_flota` · nueva

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `ubic_id` | serial | No | |
| `ubic_nombre` | varchar(120) | No | No vacío |
| `ubic_activo` | bool | No | |
| `ubic_garaje_autorizado` | bool | No | Garaje del Reglamento (Art. 8) |
| `zona_id` | int | Sí | Para medir el traslado al primer punto del día |
| `ubic_baja_en` / `_por` | timestamptz / int | Sí | |

### 6.4. `t_destino_vehiculo` · nueva

Dónde queda el vehículo al terminar el día. Es del vehículo y del día, no del operativo.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `dest_id` | serial | No | |
| `vehi_id` | int | No | Vehículo. Único con la fecha |
| `dest_fecha` | date | No | |
| `ubic_id` | int | Sí | Garaje |
| `dest_domicilio` | bool | No | Se lo lleva el conductor. Excluyente con `ubic_id` |
| `dest_observacion` | varchar(220) | Sí | |
| `dest_tipo` | `e_tipo_ubicacion_vehiculo` | Sí | GARAJE · DOMICILIO · TALLER |
| `cond_id` | int | Sí | Quien se lo lleva |
| `dest_acta_numero` | varchar(60) | Sí | Acta de parqueadero con que se dejó en el domicilio |
| `dest_registrado_por` | int | No | |
| `dest_creado_en` | timestamptz | No | |

### 6.5. `t_capacidad_flota`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `capa_id` | serial | No | |
| `cuad_id` | int | No | Jornada |
| `capa_fecha` | date | No | **Única** |
| `capa_vehiculos_habiles` / `capa_conductores_habiles` | smallint | No | No negativos |
| `capa_observacion` | varchar(300) | Sí | |
| `capa_declarado_por` / `_en` | int / timestamptz | No | |

### 6.6. `t_tramo_transporte` · nueva

**Única fuente de ocupación** de conductores y vehículos (14-OCT).

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `trtr_id` | serial | No | |
| `oper_id` | int | Sí | Operativo. Nulo solo en una `TAREA` |
| `cond_id` | int | Sí | Conductor asignado |
| `vehi_id` | int | Sí | Vehículo. Puede ir sin placa (aviso `SIN_VEHICULO`) |
| `trtr_fecha` | date | No | Día del cuadro |
| `trtr_tipo` | `e_tipo_tramo` | No | DEJAR · RETIRAR · COMPLETO · TAREA |
| `trtr_hora_inicio` / `_fin` | varchar(5) | No | Horas de la jornada |
| `trtr_cruza_medianoche` | bool | No | Fin al día siguiente |
| `trtr_zonal_origen_id` / `_destino_id` | int | Sí | Zonas del traslado |
| `trtr_compartido_con_id` | int | Sí | Tramo anfitrión cuando comparte unidad |
| `trtr_descripcion` | varchar(200) | Sí | Texto de la tarea |
| `disp_id` | int | Sí | Cita de taller que originó la tarea |
| `trtr_creado_por` / `_en` | int / timestamptz | No | |

### 6.7. Planificación del día · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_vehiculo_jornada` | `vejo_id` | serial | No | |
| | `vejo_fecha` | date | No | Único con el vehículo |
| | `vehi_id` | int | No | |
| | `vejo_sale` | bool | No | Si sale ese día |
| | `vejo_registrado_por` / `_en` | int / timestamptz | No | |
| `t_hoja_ruta_emision` | `hore_id` | serial | No | |
| | `hore_fecha` | date | No | Único con el conductor |
| | `cond_id` | int | No | |
| | `hore_huella` | varchar(64) | No | Huella de los tramos al emitir; si cambia, «cambio posterior» |
| | `hore_emitida_por` / `_en` | int / timestamptz | No | El PDF no se guarda |
| `t_traslado_zonal` | `trzo_id` | serial | No | |
| | `trzo_zonal_origen_id` / `_destino_id` | int | No | Par dirigido. Único |
| | `trzo_minutos` | smallint | No | 0 a 600 |
| `t_activacion_conductor` | `acco_id` | serial | No | |
| | `cond_id` | int | No | Único con la fecha |
| | `acco_fecha` | date | No | |
| | `acco_motivo` | varchar(220) | No | Por qué se activa a alguien de libre |
| | `acco_activado_por` / `acco_creado_en` | int / timestamptz | No | |

### 6.8. Turnos de conductores · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_turno_conductor` | `tuco_id` | serial | No | |
| | `cond_id` | int | No | Único con la fecha |
| | `tuco_fecha` | date | No | |
| | `tuco_turno` | `e_turno_conductor` | No | DIA · NOCHE · ECU_NOCHE · LIBRE · ADMINISTRATIVO |
| | `tuco_registrado_por` | int | Sí | |
| | `tuco_creado_en` / `_actualizado_en` | timestamptz | No | |
| `t_turno_conductor_mes` | `tcme_id` | serial | No | |
| | `tcme_mes` | varchar(7) | No | `AAAA-MM`. Único |
| | `tcme_estado` | `e_estado_cobertura_mes` | No | Solo informativo |
| | `tcme_publicado_por` / `_en` | int / timestamptz | Sí | |
| | `tcme_actualizado_en` | timestamptz | No | |

### 6.9. Operación de la flota · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_checklist_vehiculo` | `chve_id` | serial | No | |
| | `vehi_id`, `cond_id` | int | No | Único con la fecha |
| | `chve_fecha` | date | No | |
| | `chve_items` | jsonb | No | Ítems verificados |
| | `chve_observacion` | varchar(400) | Sí | |
| | `chve_km_salida` | int | Sí | No negativo |
| | `chve_registrado_por` / `_creado_en` | int / timestamptz | No | |
| `t_kilometraje_vehiculo` | `kive_id` | serial | No | |
| | `vehi_id` | int | No | Único con la fecha |
| | `cond_id` | int | Sí | |
| | `kive_fecha` | date | No | |
| | `kive_km` | int | No | No negativo |
| | `kive_registrado_por` / `_creado_en` | int / timestamptz | No | |
| `t_vale_combustible` | `vaco_id` | serial | No | |
| | `cond_id`, `vehi_id` | int | No | |
| | `vaco_fecha` | date | No | |
| | `vaco_monto` | smallint | No | 10 o 20 |
| | `vaco_numero` | varchar(40) | Sí | |
| | `vaco_registrado_por` / `_creado_en` | int / timestamptz | No | |

---

## 7. Documentos

### 7.1. `t_orden_servicio`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `oser_id` | serial | No | |
| `oper_id` | int | No | Operativo |
| `func_id` | int | No | Destinatario |
| `oser_codigo` | varchar(50) | No | **Único.** Llave interna `OS-…`, usada en las rutas |
| `oser_dato_aislado` | jsonb | No | **Horario, funcionario, conductor y placa, y ninguno más** (INV-24) |
| `oser_emitida_por` / `_en` | int / timestamptz | No | |
| `oser_vigente` | bool | No | Falso al reemitir. La anterior no se borra |
| `oser_editables` | jsonb | Sí | Datos del memorando que completa la Dirección. Nulo = borrador. **1-OCT** |
| `oser_numero_secuencial` / `_anio` | int | Sí | Número `AMC-OS-<8>-<año>`, al quedar vigente. **2-OCT** |
| `oser_firmante` | jsonb | Sí | Copia congelada del Director firmante |
| `oser_ruta_pdf` | varchar(300) | Sí | |
| `oser_director_id` | int | Sí | Director que la generó. **5-OCT** |
| `oser_plantilla_id` / `_version` | int | Sí | Plantilla y versión con que se resuelve siempre |

### 7.2. `t_secuencia_orden` · `t_orden_config_cuadro` · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_secuencia_orden` | `seor_anio` | int | No | Clave primaria |
| | `seor_ultimo_secuencial` | int | No | Último número usado |
| `t_orden_config_cuadro` | `ocuc_fecha` | date | No | Clave primaria: la jornada |
| | `ocuc_numero_memorando` | varchar(120) | Sí | Nulo = sin configurar |
| | `ocuc_nut` | varchar(120) | Sí | |
| | `ocuc_elaborado_por` | varchar(200) | Sí | |
| | `ocuc_creado_en` / `_actualizado_en` | timestamptz | No | |

### 7.3. `t_plantilla_orden` · `t_plantilla_orden_version` · nuevas

| Tabla | Columna | Tipo | Nulo | Descripción |
|---|---|---|---|---|
| `t_plantilla_orden` | `plor_id` | serial | No | |
| | `plor_clave` | varchar(40) | No | Única |
| | `plor_apartados` | jsonb | No | Secciones ordenadas `[{ id, titulo, tipo, contenido }]` |
| | `plor_datos_generales` | jsonb | Sí | Dirección, memorando de designación, firmante |
| | `plor_actualizado_en` / `_por` | timestamptz / int | No / Sí | |
| | `plor_director_id` | int | Sí | Plantilla por Director (histórico, sin uso desde el 27-OCT) |
| | `plor_version` | int | No | Versión vigente |
| | `plor_es_base` | bool | No | Plantilla base (histórico) |
| | `plor_departamento` | `e_rol_departamental` | Sí | **Formato del departamento.** Único parcial. **27-OCT** |
| `t_plantilla_orden_version` | `plov_id` | serial | No | |
| | `plor_id` | int | No | Plantilla. Único con la versión |
| | `plov_version` | int | No | |
| | `plov_apartados` / `plov_datos_generales` | jsonb | No / Sí | Copia inmutable |
| | `plov_creado_por` / `_en` | int / timestamptz | Sí / No | |

---

## 8. Transversal · `t_auditoria`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `audi_id` | serial | No | |
| `oper_id` | int | Sí | Operativo. `SET NULL`: la traza sobrevive |
| `audi_entidad` | varchar(60) | No | Tabla auditada |
| `audi_entidad_id` | int | No | Fila auditada |
| `audi_accion` | `e_accion_auditoria` | No | |
| `audi_campo` | varchar(60) | Sí | Campo que cambió |
| `audi_valor_anterior` / `_nuevo` | text | Sí | |
| `audi_usuario` | int | No | 0 en las migraciones de datos |
| `audi_rol` | `e_rol_departamental` | No | Rol bajo el que se actuó |
| `audi_correlacion` | varchar(60) | Sí | `x-correlation-id`, o la de la migración o el script |
| `audi_momento` | timestamptz | No | |

**Se escribe dentro de la misma transacción que el dato.** No hay purga (PV-18).

---

## Anexo · valores derivados

Estos campos **no se digitan nunca**. Si alguna vez aparecen como editables, es un defecto.

| Campo | Cómo se deriva |
|---|---|
| `oper_identificador` | Prefijo (por área y ordinario/adicional) + secuencial + fecha |
| `oper_secuencial` | Siguiente número de su prefijo en el día, bajo `bloquearSerie` |
| `oper_grupo_registro` | `randomUUID()` por registro; el aporte hereda el de la patrulla |
| `oper_hora_inicio` / `_fin` | Envolvente de los turnos de las personas (RN-66) |
| `oper_es_nocturno` | Alguna persona trabaja en la franja nocturna |
| `oper_cruza_medianoche` | Hora de fin menor que la de inicio |
| `oper_duracion_horas` | Diferencia, contemplando el cruce |
| `oper_alertas` / `oper_alerta_activa` | Política POL-06 |
| `cond_id` / `vehi_id` del operativo | Reflejo del primer tramo asignado |
| `cuad_nro_semana` / `cuad_anio_semana` | Semana ISO de la fecha |
| `cuad_estado` | Sincronizado con las ventanas |
| `vcar_activo` | Tipo distinto de `SIN_RESTRICCION` |
| `form_color_acento` | Luminancia relativa WCAG sobre `form_color_fondo` |
| `hore_huella` | Huella de los tramos del conductor al emitir |
