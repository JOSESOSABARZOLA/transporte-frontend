# 05 · Manual de Base de Datos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
PostgreSQL 18 · base `transportedb` · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

> Estado de la rama `base/cuadro-colores`, HEAD del backend `24520af`. Los inventarios de este
> manual salen de `transporte-backend/prisma/schema.prisma` y de los `migration.sql` de
> `transporte-backend/prisma/migrations/`, y los contrastamos el 5-NOV-2026 contra la base local
> levantada con esas migraciones: las cinco cifras del resumen coinciden.

---

## 1. Resumen

| Elemento | Cantidad | Agosto (versión anterior) |
|---|---|---|
| Tablas | **55** | 27 |
| Enumerados | **20** | 11 |
| Restricciones `CHECK` | **52** | 24 |
| Índices parciales | **15** | 11 |
| Migraciones aplicadas | **104** | 13 |

Todo el acceso pasa por **Prisma**. No hay TypeORM, no hay funciones almacenadas `fu_*` y
`$queryRawUnsafe` está prohibido. La única consulta escrita a mano es la plantilla etiquetada de
`bloquearSerie` (`pg_advisory_xact_lock`), parametrizada (§6.2).

**Convención de nombres.** Tablas con prefijo `t_`, enumerados con `e_`, restricciones `ck_`,
índices `idx_` y únicos `uq_`. Cada columna lleva el prefijo abreviado de su tabla: `oper_`,
`func_`, `cuad_`, `form_`, `trtr_`, `jorl_`…

**Dos roles de base.** La aplicación usa `transporte_app` (`DATABASE_URL`), que solo lee y escribe
datos; las migraciones usan `postgres` (`DIRECT_DATABASE_URL`), porque necesitan DDL.

---

## 2. Las 55 tablas por submódulo

El reparto sigue los submódulos del backend (`transporte-backend/src/modules/`). Las marcadas
**nueva** no existían en la versión de agosto.

### 2.1. Configuración · 12 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_formulario` | Los formularios del cuadro, con color, responsable y las banderas que gobiernan el registro | |
| `t_formulario_prefijo` | Prefijos del identificador, por área y por ordinario/adicional | |
| `t_formulario_area` | Áreas de personal que admite cada formulario | |
| `t_formulario_rol` | Qué puede hacer cada rol en cada formulario: `ESCRITURA` o `APORTA` con cupo | nueva |
| `t_zonal` | Zonas de la ciudad, con su sector | |
| `t_zonal_formulario` | Las zonales **de cada formulario**, con nombre y estado propios | nueva |
| `t_punto_encuentro` | Puntos de encuentro, cada uno de un formulario y una zona | |
| `t_tipo_control` | Tipos de control, cada uno de un formulario | |
| `t_institucion` | Instituciones, cada una de un formulario | |
| `t_ventana_carga` | Una ventana horaria por rol | |
| `t_parametro_politica` | Umbrales de política, con tipo, rango y valor de siembra | |
| `t_jornada_laboral` | Catálogo de jornadas: días y ventana horaria opcional | nueva |

### 2.2. Identidad y permisos · 7 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_usuario` | Cuentas del módulo, con enlace opcional a una ficha de personal | |
| `t_usuario_rol` | Los roles de cada cuenta (una persona puede tener varios) | nueva |
| `t_rol_auth` | Correspondencia entre los roles de Auth central y los de este módulo | nueva |
| `t_rol_direccion` | Qué direcciones administra cada rol administrador | nueva |
| `t_rol` | Catálogo de roles: nombre, orden y si se puede asignar | nueva |
| `t_permiso` | Catálogo de permisos atómicos `modulo:accion` (39) | nueva |
| `t_rol_permiso` | Matriz rol ↔ permiso, editable sin desplegar | nueva |

### 2.3. Talento operativo · 5 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_funcionario` | Maestro de personal. **Único sitio con cédula, teléfono y correos** | |
| `t_disponibilidad` | Ausencias de personas, de conductores y paradas de vehículos | |
| `t_historial_jornada` | Consolidado por persona y día para las reglas de descanso | |
| `t_cobertura_turno` | Turno diario (diurno, nocturno, descanso) del personal de Instrucción | nueva |
| `t_cobertura_mes` | Estado informativo del mes de cobertura | nueva |

### 2.4. Cuadro diario · 1 tabla

| Tabla | Qué guarda |
|---|---|
| `t_cuadro_diario` | Una fila por día: estado, semana, orden de trabajo, cierre |

### 2.5. Operativos · 9 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_operativo` | El núcleo: horario, lugar, transporte pedido, registro agrupado, versión | |
| `t_asignacion_personal` | Quién sale en cada operativo, con su turno propio | |
| `t_operativo_tramite_inspeccion` | Copia del trámite de Inspección elegido para un inspector | nueva |
| `t_operativo_zonal` | Zonales del operativo | |
| `t_operativo_institucion` | Instituciones participantes | |
| `t_operativo_tipo_control` | Varios tipos de control por operativo | nueva |
| `t_operativo_observacion` | Notas del operativo, como bitácora que solo crece | nueva |
| `t_solicitud_apoyo` | Solicitudes de personal entre direcciones | |
| `t_registro_operativo` | Zona y punto principales de un registro por zonas (formulario 8) | nueva |

### 2.6. Transporte y flota · 15 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_conductor` | Conductores, con vehículo habitual, sector, acta de parqueadero y jornada | |
| `t_vehiculo` | Vehículos, con asientos, kilometraje y vencimientos | |
| `t_ubicacion_flota` | Garajes y ubicaciones donde puede quedar un vehículo | nueva |
| `t_destino_vehiculo` | Dónde queda cada vehículo al terminar el día | nueva |
| `t_capacidad_flota` | Vehículos y conductores hábiles declarados por fecha | |
| `t_tramo_transporte` | Tramos (dejar, retirar, completo, tarea): **única fuente de ocupación** | nueva |
| `t_vehiculo_jornada` | Qué vehículos salen cada día | nueva |
| `t_hoja_ruta_emision` | Emisión de la hoja de ruta de un conductor, con la huella de sus tramos | nueva |
| `t_traslado_zonal` | Minutos de traslado entre dos zonas (matriz dirigida) | nueva |
| `t_turno_conductor` | Turno de un conductor en un día | nueva |
| `t_turno_conductor_mes` | Estado informativo del mes de turnos | nueva |
| `t_activacion_conductor` | Activación de un conductor de libre para un día | nueva |
| `t_checklist_vehiculo` | Lista de verificación diaria antes de salir | nueva |
| `t_kilometraje_vehiculo` | Lectura diaria del kilometraje | nueva |
| `t_vale_combustible` | Vales de combustible de 10 o 20 dólares | nueva |

### 2.7. Documentos · 5 tablas

| Tabla | Qué guarda | |
|---|---|---|
| `t_orden_servicio` | Órdenes emitidas, con su **dato aislado** en JSONB, número oficial y firmante | |
| `t_secuencia_orden` | Contador anual del número `AMC-OS-<8>-<año>` | nueva |
| `t_orden_config_cuadro` | Memorando, NUT y elaborador de cada jornada | nueva |
| `t_plantilla_orden` | Formato de la orden por departamento | nueva |
| `t_plantilla_orden_version` | Historial inmutable de versiones de cada plantilla | nueva |

### 2.8. Transversal · 1 tabla

| Tabla | Qué guarda |
|---|---|
| `t_auditoria` | Traza de toda escritura, campo a campo |

### 2.9. Tablas retiradas desde agosto

| Tabla | Migración | Por qué |
|---|---|---|
| `t_formulario_tipo_control` | `20260907120000_tipos_control_por_formulario` | Cada tipo de control pasó a pertenecer a un formulario |
| `t_formulario_punto` | `20260929140000_puntos_por_formulario` | Ídem con los puntos de encuentro |
| `t_formulario_institucion` | `20260929150000_instituciones_por_formulario` | Ídem con las instituciones |

---

## 3. Los 20 enumerados

| Enumerado | Valores | |
|---|---|---|
| `e_rol_departamental` | DMIP_OPERATIVOS · DMIP_INSPECCIONES · DMIT_INSTRUCTOR · DAF · DIRECTOR · ADMINISTRADOR · FUNCIONARIO · ADMINISTRADOR_DMIP · ADMINISTRADOR_DMIT · ADMINISTRADOR_DAF | |
| `e_acceso_formulario` | ESCRITURA · APORTA | nuevo |
| `e_estado_cuadro` | BORRADOR · EN_TRANSPORTE · APROBADO · CERRADO | |
| `e_estado_transporte` | PENDIENTE · ASIGNADO · PROPIOS_MEDIOS | |
| `e_politica_vehiculo` | NO_APLICA · CONDICIONAL · REQUERIDO · OBLIGATORIO | |
| `e_area_personal` | GENERAL · TECNICO · INSTRUCCION · OPERATIVOS | `CCF` retirado |
| `e_denominacion_instruccion` | LIDER_ZONAL · INSTRUCTOR_METROPOLITANO · AUXILIAR_FLAGRANCIA | nuevo |
| `e_estado_turno` | DIURNO · NOCTURNO · DESCANSO | nuevo |
| `e_estado_cobertura_mes` | BORRADOR · PUBLICADO · PUBLICADO_CON_CAMBIOS | nuevo |
| `e_tipo_transporte` | COMPLETO · SOLO_INICIO · SOLO_FIN · INICIO_Y_FIN · PROPIOS_MEDIOS · OTRA_INSTITUCION | nuevo |
| `e_tipo_tramo` | DEJAR · RETIRAR · COMPLETO · TAREA | nuevo |
| `e_turno_conductor` | DIA · NOCHE · ECU_NOCHE · LIBRE · ADMINISTRATIVO | nuevo |
| `e_tipo_ubicacion_vehiculo` | GARAJE · DOMICILIO · TALLER | nuevo |
| `e_sector_ciudad` | NORTE · SUR · CENTRO · VALLE | nuevo |
| `e_estado_disponibilidad` | DISPONIBLE · VACACIONES · REPOSO_MEDICO · CALAMIDAD · PERMISO · MANTENIMIENTO · LICENCIA · CAPACITACION · COMISION_SERVICIOS | |
| `e_tipo_ventana` | SEMANAL · DIARIO · INTERVALO · LABORABLE · SIN_RESTRICCION | |
| `e_accion_auditoria` | CREAR · ACTUALIZAR · ELIMINAR · CERRAR · REABRIR · EMITIR | |
| `e_estado_solicitud` | SOLICITADA · ATENDIDA · RECHAZADA · VENCIDA | |
| `e_tipo_parametro` | ENTERO · DECIMAL · TEXTO · BOOLEANO | |
| `e_estado_mantenimiento` | PROGRAMADO · EN_TALLER · LISTO | nuevo |

**Se retiró `e_tipo_contrato`** (NOMBRAMIENTO · OCASIONAL) con la jornada laboral del 23-OCT
(§9.3).

Valores que siguen en el tipo pero ya no se usan, porque retirar un valor de un enumerado de
PostgreSQL obliga a recrear el tipo y sus columnas:

- `FUNCIONARIO`: retirado el 2026-09-10; el personal de campo ya no inicia sesión.
- `SEMANAL` e `INTERVALO`: la migración `20261007171000` pasó esas ventanas a `DIARIO`.
- `MANTENIMIENTO` es un estado **de vehículos**: el servidor lo rechaza sobre una persona.

`ADMINISTRADOR` se retiró el 2026-09-01 y **se reactivó el 2026-09-10** como administrador general.

---

## 4. Las 52 restricciones `CHECK`

Son reglas de negocio que la base garantiza **aunque el código falle**. Prisma no las expresa:
viven en el SQL de las migraciones.

### 4.1. Configuración

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_formulario` | `ck_formulario_numero` | Un número fuera de **1 a 99** (era 1–9 hasta el 29-SEP) |
| | `ck_formulario_color_fondo` / `_acento` | Un color que no sea `#RRGGBB` |
| | `ck_formulario_vigencia` | Vigencia que termina antes de empezar |
| | `ck_formulario_max_personas` | Un tope de personas menor que 1 |
| `t_formulario_rol` | `ck_formulario_rol_cupo` | `APORTA` sin cupo positivo, o `ESCRITURA` con cupo |
| `t_ventana_carga` | `ck_ventana_horas` | Horas fuera de `HH:MM` |
| | `ck_ventana_dias` | Día fuera de 1–7 |
| `t_parametro_politica` | `ck_parametro_valor` | Valor vacío |
| | `ck_parametro_rango` | Un valor numérico fuera de su mínimo y máximo |
| `t_jornada_laboral` | `ck_jornada_dias` | Entre 1 y 7 días, cada uno de 1 a 7 |
| | `ck_jornada_horas_par` | Una hora sin la otra |
| | `ck_jornada_hora_formato` | Horas fuera de `HH:00` o `HH:30` |
| | `ck_jornada_hora_distinta` | Inicio igual al fin |

### 4.2. Identidad

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_rol_auth` | `ck_rol_auth_subsistema` | Subsistema no positivo |
| `t_rol_direccion` | `ck_rol_direccion_distinta` | Un rol que se administra a sí mismo |

### 4.3. Talento operativo y cuadro

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_disponibilidad` | `ck_disponibilidad_sujeto` | Un periodo sin sujeto o con más de uno: **exactamente uno** de `func_id`, `cond_id`, `vehi_id` |
| | `ck_disponibilidad_rango` | `hasta` anterior a `desde` |
| | `ck_disponibilidad_taller` | Taller u hora de cita fuera de un `MANTENIMIENTO` de vehículo |
| | `ck_disponibilidad_hora` | Hora de cita fuera de `HH:MM` |
| `t_historial_jornada` | `ck_historial_horas` | Horas fuera de 0–24 |
| `t_cobertura_mes` | `ck_cobertura_mes_formato` | Mes fuera de `AAAA-MM` |
| `t_cuadro_diario` | `ck_cuadro_semana` | Semana fuera de 1–53 |
| | `ck_cuadro_cierre` | Estado `CERRADO` sin quién ni cuándo |

### 4.4. Operativos

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_operativo` | `ck_operativo_hora_inicio` / `_fin` | Horas fuera de `HH:00` o `HH:30` |
| | `ck_operativo_duracion` | Duración fuera de (0, 24] |
| | `ck_operativo_punto` | Punto de catálogo **y** texto libre a la vez, o ninguno |
| | `ck_operativo_tipo` | Tipo de catálogo **y** texto libre a la vez. Desde el 7-SEP admite ninguno: los tipos van en `t_operativo_tipo_control` |
| | `ck_operativo_transporte` | `ASIGNADO` sin conductor y vehículo, o `PENDIENTE`/`PROPIOS_MEDIOS` con alguno |
| | `ck_operativo_secuencial` | Secuencial no positivo |
| | `ck_operativo_version` | Versión no positiva |
| | `ck_operativo_origen` | Un adicional que nace de sí mismo |
| | `ck_operativo_compartir_no_propio` | Pedir compartir unidad consigo mismo |
| | `ck_operativo_compartir_o_exclusivo` | Pedir compartir y vehículo exclusivo a la vez |
| `t_asignacion_personal` | `ck_asignacion_hora_inicio` / `_fin` | Turno propio fuera de `HH:00` o `HH:30` |
| | `ck_asignacion_hora_par` | Una hora del turno sin la otra |
| | `ck_asignacion_hora_distinta` | Turno que empieza y termina a la misma hora |
| `t_operativo_tramite_inspeccion` | `ck_tramite_inspeccion_codigo` | Código de trámite vacío |
| `t_solicitud_apoyo` | `ck_solicitud_cantidad` | Cantidad no positiva |

### 4.5. Transporte y flota

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_conductor` | `ck_conductor_patron_rotacion` | Patrón distinto de 2 a 14 letras `D N E L A` |
| `t_ubicacion_flota` | `ck_ubicacion_nombre` | Nombre vacío |
| `t_destino_vehiculo` | `ck_destino_sujeto` | Garaje **y** domicilio a la vez, o ninguno |
| `t_capacidad_flota` | `ck_capacidad_positiva` | Cantidades negativas |
| `t_tramo_transporte` | `ck_tramo_operativo` | Un tramo que no es `TAREA` y no tiene operativo |
| | `ck_tramo_horas` | Horas fuera de `HH:MM` |
| `t_traslado_zonal` | `ck_traslado_minutos` | Minutos fuera de 0–600 |
| `t_turno_conductor_mes` | `ck_turno_conductor_mes_formato` | Mes fuera de `AAAA-MM` |
| `t_checklist_vehiculo` | `ck_checklist_km` | Kilometraje de salida negativo |
| `t_kilometraje_vehiculo` | `ck_kilometraje_km` | Kilometraje negativo |
| `t_vale_combustible` | `ck_vale_monto` | Un vale distinto de 10 o 20 |

**Retirada:** `ck_formulario_compartido` (25-AGO), junto con las columnas que vigilaba; su regla
pasó a `ck_formulario_rol_cupo`.

> **El rango de `ck_formulario_numero` se amplió a 1–99 el 29-SEP-2026** para agregar formularios
> como dato. La base de pruebas `transportedb_pruebas` sigue siendo necesaria, pero ya no porque
> los nueve casilleros estén ocupados: las suites de integración crean sus propios formularios y
> no deben mezclarse con el catálogo institucional.

---

## 5. Los 15 índices parciales

Un índice parcial cubre solo las filas que cumplen una condición: ocupa menos y responde más
rápido a la consulta que importa.

| Índice | Tabla | Condición | Para qué |
|---|---|---|---|
| `idx_operativo_conductor` | `t_operativo` | `cond_id IS NOT NULL` | Reflejo del conductor asignado |
| `idx_operativo_vehiculo` | `t_operativo` | `vehi_id IS NOT NULL` | Clave foránea de la flota |
| `idx_operativo_alerta` | `t_operativo` | `oper_alerta_activa = true` | Alertas de la jornada |
| `idx_operativo_origen` | `t_operativo` | `oper_origen_id IS NOT NULL` | Clave foránea del adicional |
| `idx_operativo_compartir_con` | `t_operativo` | `oper_compartir_con_id IS NOT NULL` | Clave foránea de compartir unidad. **19-OCT** |
| `idx_historial_pesadas` | `t_historial_jornada` | nocturna **o** fin de semana | Tope de salidas pesadas (RN-25) |
| `idx_disponibilidad_func` | `t_disponibilidad` | `func_id IS NOT NULL` | Ausencias de personas |
| `idx_disponibilidad_cond` | `t_disponibilidad` | `cond_id IS NOT NULL` | Ausencias de conductores |
| `idx_funcionario_area` | `t_funcionario` | `func_activo = true` | Selección de personal |
| `idx_rol_direccion_rol` | `t_rol_direccion` | `rodi_activo` | Alcance de cada administrador. **1-SEP** |
| **`uq_orden_vigente`** | `t_orden_servicio` | `oser_vigente = true` | **Una sola orden vigente por operativo y persona** |
| **`uq_orden_numero_vigente`** | `t_orden_servicio` | vigente y con número | **Un número `AMC-OS` por año entre las vigentes**. **5-OCT** |
| **`uq_plantilla_director`** | `t_plantilla_orden` | `plor_director_id IS NOT NULL` | Una plantilla por Director (histórico). **5-OCT** |
| **`uq_plantilla_base`** | `t_plantilla_orden` | `plor_es_base` | Una sola plantilla base (histórico). **5-OCT** |
| **`uq_plantilla_departamento`** | `t_plantilla_orden` | `plor_departamento IS NOT NULL` | **Un formato por departamento**. **27-OCT** |

> **Retirados el 17-SEP-2026:** `uq_operativo_cuad_form_sec` y `uq_operativo_cuad_form_sec_adic`
> (migración `20260917140000`). Las patrullas numeran **por prefijo**: `IGNECU-001`, `ITNECU-001` e
> `INECU-001` del mismo formulario y día tienen secuencial 1 y chocaban en el índice. La unicidad
> del número la garantiza ahora `uq_operativo_cuad_ident` (cuadro, identificador), porque el
> identificador ya lleva el prefijo.

**Por qué los índices de `t_operativo` son parciales.** Es de dominio: conductor y vehículo
nacen nulos y solo la DAF los completa; casi ningún operativo es adicional ni pide compartir
unidad. Indexar las filas nulas sería pagar por lo que nadie consulta.

**Prisma no conoce el predicado.** Cinco de estos índices se retiraron a propósito de
`schema.prisma`: si se declararan, la siguiente migración los recrearía completos y el predicado
desaparecería en silencio.

`uq_orden_vigente` sostiene la reemisión: la orden anterior se marca no vigente y la nueva se
inserta **en la misma transacción**; si otra emisión se colara entre ambas, la base la rechazaría.

---

## 6. Concurrencia

### 6.1. Bloqueo optimista

`t_operativo` lleva `oper_version`. Toda edición actualiza con `WHERE id = ? AND version = ?` e
incrementa. Si otro usuario modificó la fila entretanto, no se actualiza ninguna y el sistema
responde `409 CONFLICTO_CONCURRENCIA`.

### 6.2. Secuencial diario

El identificador de un operativo —`OCF-003-07-AGO-2026`, `IG-030-28-OCT-2026`— reinicia cada día y
numera **por prefijo**. Desde el 28-OCT, todo registro toma antes un candado de transacción
(`bloquearSerie`, `pg_advisory_xact_lock(cuadro, formulario)`) y solo entonces lee el máximo
secuencial: dos registros simultáneos no duplican números. El reintento ante `P2002` sigue como
red.

### 6.3. Número de la orden de servicio

`t_secuencia_orden` guarda el último secuencial de cada año. Se incrementa dentro de la
transacción de emisión con `INSERT … ON CONFLICT DO UPDATE … RETURNING`, de modo que dos emisiones
simultáneas no colisionan. Se sembró con `(2026, 5571)` para continuar la numeración que ya
existía.

---

## 7. Fechas y zona horaria

Es la fuente de error más silenciosa del sistema, y la resolvemos con una regla firme:

- **Las columnas `@db.Date` son fechas de calendario**: sin hora ni huso. Se manejan **en UTC** en
  todo el sistema y viajan como texto `AAAA-MM-DD`.
- **Los instantes** (`@db.Timestamptz`) se interpretan en `America/Guayaquil`.
- **Las horas de reloj** (`oper_hora_inicio`, `trtr_hora_inicio`, `disp_hora`, `jorl_hora_inicio`)
  son `varchar(5)`: convertirlas a `timestamp` las desplazaría cinco horas en Quito.

Convertir una fecha de calendario a `Date` en Quito —UTC−5— la desplaza un día. Por eso el
frontend compara cadenas y el backend construye con `Date.UTC(...)`.

---

## 8. Auditoría

`t_auditoria` registra entidad, identificador, acción, **campo, valor anterior y valor nuevo**,
usuario, rol, correlación y momento.

**Se escribe dentro de la misma transacción que el dato.** No existe la posibilidad de un cambio
guardado sin su rastro.

- **Las migraciones de datos también firman**: con `audi_usuario = 0` y una correlación propia
  (`migracion-20261030120000`, `carga_matriz_dmq`, `migracion-20261024090000`).
- **Los scripts de mantenimiento firman con `--usuario`**: `limpieza-catalogos`,
  `tramos-desde-asignacion-clasica` y `tramos-registro-agrupado`.
- **El motivo de una ausencia no se copia.** Puede describir una condición de salud.
- **Los nombres no aparecen** en el registro de emisión de órdenes.
- `fk_auditoria_operativo` es `SET NULL`: la traza sobrevive al operativo borrado y nombra su
  identificador en `audi_valor_anterior`.

---

## 9. Migraciones

Son **104**, en `transporte-backend/prisma/migrations/`. Las migraciones **no se aplican al
arrancar el contenedor**: son un paso explícito del despliegue.

```bash
docker compose run --rm transporte-app npx prisma migrate deploy
```

### 9.1. Las trece primeras (agosto, hasta el 20-AGO)

| Migración | Qué introduce |
|---|---|
| `20260805134048_esquema_inicial` | Las 27 tablas y los 11 enumerados de origen |
| `20260805134100_agrega_restricciones_verificacion` | Las 24 restricciones `CHECK` de origen |
| `20260805134200_agrega_indices_parciales` | Los 7 índices parciales de origen |
| `20260805135219_agrega_valor_por_defecto_a_marcas_de_actualizacion` | Corrección de `updatedAt` |
| `20260805170000_agrega_captura_libre_al_formulario` | `form_permite_captura_libre` (RN-20) |
| `20260806120000_agrega_baja_logica_al_operativo` | `oper_activo` (PV-10) |
| `20260806160000_enlaza_usuario_con_funcionario` | `t_usuario.func_id` |
| `20260811120000_separa_la_captura_libre_por_catalogo` | La divide en `form_captura_libre_punto` y `form_captura_libre_tipo` |
| `20260817194510_agrega_el_rol_de_funcionario` | `FUNCIONARIO` en `e_rol_departamental` |
| `20260817200000_identificador_de_auth_unico` | Único `uq_usuario_identificador_ad` |
| `20260819160900_optimiza_indices_de_claves_foraneas` | Retira dos índices duplicados y cubre cuatro claves foráneas |
| `20260820120000_adicional_del_dia_sobre_un_operativo` | `oper_origen_id`, `ck_operativo_origen` y los dos únicos parciales del secuencial |
| `20260820130000_prefijo_que_nombra_al_adicional` | `fpre_es_adicional`; `OCPMO` y `OCAPMO` |

### 9.2. Las 91 posteriores

Nombre y propósito, sacados del encabezado de cada `migration.sql` y del commit que la trajo.

**Agosto (desde el 19-AGO)**

| Migración | Propósito |
|---|---|
| `20260819210000_catalogos_institucionales_en_la_base` | Lleva los catálogos institucionales a la base y retira la semilla y `prisma/insumos/*.json` |
| `20260819223638_agrega_homologacion_de_roles_de_auth` | Crea `t_rol_auth` y siembra los seis roles de Auth |
| `20260819234500_varios_roles_por_usuario` | Crea `t_usuario_rol`; **retira `usua_rol`** |
| `20260825090000_la_hora_de_cierre_vive_solo_en_la_ventana` | Borra el parámetro `HORA_CIERRE_DEPARTAMENTAL` |
| `20260825120000_el_dmit_aporta_personal_a_la_patrulla_ecu` | Abre el formulario 4 al cupo del DMIT |
| `20260825160000_un_formulario_admite_varios_roles` | Crea `t_formulario_rol` y `e_acceso_formulario`; **retira `form_rol_compartido` y `form_cupo_compartido`** |
| `20260827090000_el_formulario_dmit_admite_las_cuatro_areas` | El 7 admite las cuatro áreas |
| `20260827100000_retira_el_area_ccf` | Recrea `e_area_personal` sin `CCF` |
| `20260827140000_el_personal_ofrecido_se_filtra_por_rol` | `form_filtra_personal_por_rol` |
| `20260827160000_la_ecu_vuelve_a_ser_formulario_de_aporte` | El 4 vuelve a ser de aporte del DMIT |
| `20260831090000_el_mantenimiento_del_vehiculo_lleva_taller_y_hora` | `disp_taller`, `disp_hora` y sus dos `CHECK` |
| `20260831120000_el_vehiculo_tiene_destino_al_terminar_la_jornada` | Crea `t_ubicacion_flota` y `t_destino_vehiculo` |
| `20260831130000_el_conductor_tiene_sector_parqueadero_y_contrato` | `cond_sector`, `cond_parqueadero_autorizado` y `cond_tipo_contrato` (este último retirado el 23-OCT) |

**Septiembre**

| Migración | Propósito |
|---|---|
| `20260901090000_los_tres_administradores_departamentales` | Agrega `ADMINISTRADOR_DMIP`, `_DMIT` y `_DAF` |
| `20260901091000_las_cuentas_administradoras_pasan_al_dmip` | Traspasa las cuentas de `ADMINISTRADOR` |
| `20260901092000_la_configuracion_tambien_pasa_al_dmip` | Repunta al DMIP dos filas de configuración |
| `20260901093000_cada_administrador_gestiona_su_direccion` | Crea `t_rol_direccion` |
| `20260901094000_el_maestro_vuelve_a_un_solo_administrador` | Alcance del DMIP sobre las cuatro direcciones |
| `20260901150000_la_jornada_dice_quien_asigna` | `frol_edita_desde_jornada` |
| `20260901180000_la_ficha_guarda_el_correo` | `func_correo` |
| `20260901190000_cada_administrador_ve_su_personal` | Reparte el alcance de personal por administrador |
| `20260902160000_la_matriz_de_puntos_de_encuentro` | Carga la matriz zonal ↔ punto (PV-01) |
| `20260902170000_solo_lo_que_el_insumo_dice` | **Borra** puntos y vínculos que no figuran en el insumo del 2-SEP |
| `20260907120000_tipos_control_por_formulario` | Tipos de control por formulario; **retira `t_formulario_tipo_control`** |
| `20260907130000_multiple_tipo_control_form_8` | Crea `t_operativo_tipo_control` y `form_tipo_control_multiple`; relaja `ck_operativo_tipo` |
| `20260908120000_prefijo_por_area_form_8` | Prefijos IG/IT e IGA/ITA; el único pasa a incluir `fpre_es_adicional` |
| `20260908130000_horario_por_persona` | `aper_hora_inicio`/`_fin` y sus cuatro `CHECK` (RN-66) |
| `20260909100000_prefijo_por_area_form_5` | IGECU e ITECU |
| `20260909110000_prefijo_por_area_form_6` | IGNECU, ITNECU e ICNECU |
| `20260909120000_renombra_icnecu_a_inecu` | ICNECU pasa a INECU |
| `20260909130000_observaciones_como_notas` | Crea `t_operativo_observacion`; **retira `oper_observaciones`** tras copiarla |
| `20260910100000_el_administrador_general_recupera_su_rol_de_auth` | Devuelve la correspondencia de Auth a `ADMINISTRADOR` |
| `20260910110000_cantidad_por_persona_en_form_8` | `form_varios_por_persona` |
| `20260914120000_tipo_control_multiple_todos_formularios` | Tipo de control múltiple en todos los formularios |
| `20260914130000_varios_por_persona_en_form_5` | Un operativo por persona en el 5 |
| `20260914140000_cantidad_por_persona_separada_del_split` | `form_cantidad_por_persona` |
| `20260915160000_plantilla_orden_servicio` | Crea `t_plantilla_orden` |
| `20260916120000_cobertura_turnos_instruccion` | Crea `t_cobertura_turno`, `e_denominacion_instruccion`, `e_estado_turno`; zonal y denominación del funcionario |
| `20260916160000_parametros_ventanas_turno_cobertura` | Parámetros `HORA_TURNO_DIURNO_*` y `HORA_TURNO_NOCTURNO_*` |
| `20260916180000_rbac_permisos` | Crea `t_rol`, `t_permiso` y `t_rol_permiso`, sembrados 1:1 con los `@Roles` de antes |
| `20260917100000_varios_por_persona_en_form_6` | Un operativo por persona en el 6 |
| `20260917110000_el_dmit_registra_instruccion_en_la_patrulla_nocturna` | DMIT en escritura en el 6 (revertida por la de las 13:00) |
| `20260917120000_grupo_de_registro_del_operativo` | `oper_grupo_registro` |
| `20260917130000_la_instruccion_del_form_6_vuelve_a_ser_aporte` | El DMIT vuelve a aportar en el 6 |
| `20260917140000_numeracion_por_prefijo_sin_indice_de_secuencial` | **Retira** `uq_operativo_cuad_form_sec` y `_adic` |
| `20260922100000_ventana_horaria_del_nombramiento` | Parámetros `HORA_NOMBRAMIENTO_*` (retirados el 23-OCT) |
| `20260924120000_todos_los_formularios_admiten_tipo_de_control_libre` | Captura libre de tipo en todos |
| `20260924130000_agregar_punto_al_catalogo_en_el_registro` | `form_punto_manual` |
| `20260924140000_parametros_equidad_y_fatiga` | Parámetros `FATIGA_UMBRAL_*`, `PESO_*`, `PERIODO_EQUIDAD` |
| `20260925120000_carga_acumulada_por_periodo` | Parámetro `PESO_CARGA_PERIODO` |
| `20260929120000_amplia_el_rango_de_numero_de_formulario` | `ck_formulario_numero` pasa a 1–99 |
| `20260929140000_puntos_por_formulario` | Puntos por formulario; **retira `t_formulario_punto`** |
| `20260929150000_instituciones_por_formulario` | Instituciones por formulario; **retira `t_formulario_institucion`** |
| `20260929160000_equidad_margen` | Parámetro `EQUIDAD_MARGEN` |
| `20260930120000_motivo_baja_funcionario` | `func_motivo_baja` y `func_motivo_baja_detalle` |

**Octubre**

| Migración | Propósito |
|---|---|
| `20261001120000_la_ficha_guarda_correo_personal` | `func_correo_personal` |
| `20261001150000_orden_guarda_editables` | `oser_editables` |
| `20261002120000_numeracion_y_firmante_orden` | Crea `t_secuencia_orden`; `oser_numero_*` y `oser_firmante` |
| `20261002150000_config_orden_por_cuadro` | Crea `t_orden_config_cuadro` |
| `20261002160000_plantilla_datos_generales` | `plor_datos_generales` |
| `20261005180000_plantilla_por_director` | Crea `t_plantilla_orden_version`; plantilla y versión en la orden; tres únicos parciales |
| `20261005200000_cobertura_mes_y_avisos` | Crea `t_cobertura_mes` y `e_estado_cobertura_mes` |
| `20261006090000_transporte_tramos_y_turnos` | Crea `t_tramo_transporte`, `t_traslado_zonal`, `t_turno_conductor`, `t_turno_conductor_mes`, `t_activacion_conductor` y cuatro enumerados; datos de flota |
| `20261006150000_transporte_optimizador_y_mantenimiento` | Crea `t_checklist_vehiculo`, `t_kilometraje_vehiculo`, `t_vale_combustible` y `e_estado_mantenimiento` |
| `20261006200000_garaje_matriz_sin_zonal` | El garaje Matriz queda sin zonal |
| `20261006210000_ventanas_mensajes_horas_reales` | Corrige los mensajes de cierre |
| `20261007090000_transporte_consolidada` | `form_tipo_transporte_defecto`, `cond_patron_rotacion`, permiso `carga-inicial:administrar` y parámetros DAF |
| `20261007120000_operativo_tramite_inspeccion` | Crea `t_operativo_tramite_inspeccion` |
| `20261007150000_transporte_requerido_macrooperativo` | `oper_transporte_liberado_en`; transporte por defecto `PROPIOS_MEDIOS` en 1–4 |
| `20261007170000_tipo_ventana_laborable` | `LABORABLE` y `SIN_RESTRICCION` (solo enumerado) |
| `20261007171000_ventanas_tipo_y_marcadores` | Pasa las ventanas a los tipos nuevos |
| `20261008120000_tabla_control_en_plantilla` | La tabla de control sale a la plantilla |
| `20261008150000_planificar_dia_flujo_guiado` | Crea `t_vehiculo_jornada` y `t_hoja_ruta_emision`; `dest_acta_numero` |
| `20261008170000_situaciones_de_ausencia` | `LICENCIA`, `CAPACITACION`, `COMISION_SERVICIOS` |
| `20261013120000_zonal_por_formulario` | Crea `t_zonal_formulario`; borra cuatro «zonales» que eran puntos, solo si nunca se usaron |
| `20261013150000_mis_operativos_rango_max` | Parámetro `MIS_OPERATIVOS_RANGO_MAX_DIAS` |
| `20261014090000_daf_huecos_y_duracion_por_tipo` | Parámetros `DAF_DURACION_DEJAR_MIN`, `_RETIRAR_MIN`, `DAF_HUECO_MINIMO_MIN` |
| `20261015090000_placas_normalizadas` | Normaliza placas; parámetro `DAF_KM_MAXIMO` |
| `20261016120000_permiso_flota_ausencias` | Permiso `flota:ausencias` |
| `20261019090000_operativo_compartir_unidad` | `oper_compartir_con_id`, `oper_justificacion_exclusivo`, dos `CHECK` y un índice parcial |
| `20261019150000_compartir_solicitado` | `oper_compartir_solicitado_por`/`_en` |
| `20261020150000_baja_flota_con_fecha` | `*_baja_en` y `*_baja_por` en vehículo, conductor y ubicación, rellenos desde la auditoría |
| `20261021090000_matriz_traslados_dmq` | Carga los 90 pares de traslado validados por la DAF |
| `20261023090000_tipo_transporte_otra_institucion` | `OTRA_INSTITUCION` (sin transacción) |
| `20261023100000_jornada_laboral` | Crea `t_jornada_laboral` y `jorl_id`; **retira el tipo de contrato**. Ver §9.3 |
| `20261024090000_parametros_siembra_y_mensajes_ventana` | `para_valor_siembra`; mensajes de ventana con `{apertura}`/`{cierre}` |
| `20261027090000_id_de_registro_obligatorio` | `oper_grupo_registro` `NOT NULL` con `gen_random_uuid()`; índice |
| `20261027120000_plantilla_por_departamento` | `plor_departamento` y `uq_plantilla_departamento`; tres formatos |
| `20261028120000_una_persona_y_un_tipo_por_operativo` | `form_max_personas`, `form_elegir_una_area` y su `CHECK` |
| `20261028150000_registro_por_zonas` | Crea `t_registro_operativo` y `form_cantidad_por_zona` |
| `20261030120000_carga_por_operativos` | Parámetros `CARGA_OP_MEDIA`/`_ALTA`; **borra historial** de cuadros no cerrados. Ver §9.3 |

### 9.3. Migraciones irreversibles · respaldar antes

`migrate deploy` no tiene vuelta atrás. Estas migraciones **borran datos o estructura**; antes de
aplicarlas en un ambiente con datos reales hay que hacer `pg_dump` (§12).

| Migración | Qué se pierde |
|---|---|
| **`20261023100000_jornada_laboral`** | **`func_tipo_contrato`, `cond_tipo_contrato`, `idx_funcionario_contrato`, el enumerado `e_tipo_contrato` y los parámetros `HORA_NOMBRAMIENTO_*`**. No se convierte el contrato en jornada: **nadie queda con jornada** y, sin jornada, no se convoca a nadie (`JORNADA_NO_ADMITE_TURNO`; conductor, `SIN_JORNADA`). El administrador debe asignarla ficha por ficha |
| **`20261030120000_carga_por_operativos`** | Borra de `t_historial_jornada` las filas de fechas cuyo cuadro **no está `CERRADO`**. Cada fila deja traza en `t_auditoria` (usuario 0, correlación `migracion-20261030120000`), pero el historial no se reconstruye hasta volver a cerrar esos cuadros |
| `20261013120000_zonal_por_formulario` | Borra cuatro zonales que eran puntos, solo si nunca se usaron |
| `20260929140000` / `20260929150000` | Borran las tablas puente de puntos e instituciones tras copiar los datos por formulario |
| `20260909130000_observaciones_como_notas` | Retira `oper_observaciones` después de copiarla a notas |
| `20260907120000_tipos_control_por_formulario` | Retira `t_formulario_tipo_control` tras copiar los tipos por formulario |
| `20260902170000_solo_lo_que_el_insumo_dice` | Borra puntos y vínculos fuera del insumo del 2-SEP |
| `20260827100000_retira_el_area_ccf` | Recrea `e_area_personal` sin `CCF` |
| `20260825160000_un_formulario_admite_varios_roles` | Retira `form_rol_compartido` y `form_cupo_compartido` tras pasarlos a filas |
| `20260819234500_varios_roles_por_usuario` | Retira `usua_rol` tras pasarlo a `t_usuario_rol` |

> Las migraciones de octubre son **idempotentes** por diseño (`IF [NOT] EXISTS`, `ON CONFLICT DO
> NOTHING`, `WHERE NOT EXISTS`): repetirlas no cambia nada. Idempotente no es reversible.

---

## 10. Datos iniciales

**No hay semilla.** Se retiró el 19-AGO-2026: los catálogos institucionales, los parámetros, las
jornadas y la matriz de permisos viven en las migraciones, y `migrate deploy` los aplica. Cada
`INSERT` es idempotente.

Lo que sembraron las migraciones, y en qué estado lo encontramos en la base local el 5-NOV-2026:

| Catálogo | Origen | Base local |
|---|---|---|
| Parámetros de política | Varias migraciones, con su `para_valor_siembra` | 56 claves |
| Ventanas de carga | Esquema inicial | 6 |
| Zonas de la ciudad | Catálogos institucionales | 11 |
| Roles y correspondencia con Auth | `20260916180000`, `20260819223638` | 10 roles · 6 de Auth |
| Permisos | `20260916180000` y posteriores | 39 |
| Jornadas laborales | `20261023100000` | 2: «Lunes a Viernes 8 horas» (1–5, 08:00–16:00) y «Lunes a Domingo 24/7» |
| Traslados entre zonales | `20261021090000` | 90 pares |
| Formatos de orden | `20261027120000` | Tres, uno por departamento |

Los catálogos del cuadro (formularios, zonales de formulario, puntos, tipos, instituciones) y el
maestro de personal y flota se administran desde las pantallas y desde la carga inicial
(`/administracion/carga-inicial`), así que su conteo cambia por ambiente.

---

## 11. Verificación del esquema

```bash
npm run prisma:verificar
```

Ejecuta `transporte-backend/prisma/verificar-objetos.ts`: comprueba que haya **55 tablas** y **20
enumerados**, y que existan las restricciones e índices parciales de su lista.

> **La lista del verificador va atrasada.** Vigila 48 de las 52 restricciones —le faltan
> `ck_rol_auth_subsistema`, `ck_formulario_rol_cupo`, `ck_cobertura_mes_formato` y
> `ck_formulario_max_personas`— y 14 de los 15 índices parciales —le falta
> `uq_plantilla_departamento`—. Pasar la verificación no prueba que esas cinco existan.
> `transporte-backend/CLAUDE.md` §3 también cita cifras viejas (53 tablas, 21 enumerados).

Para contar directamente en la base:

```sql
SELECT count(*) FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace;  -- 52
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexdef ILIKE '% WHERE %';       -- 15
```

---

## 12. Copias de seguridad

**No hay política definida (PV-19).** El volumen `transporte_pgdata` contiene todo. Respaldarlo es
responsabilidad de la infraestructura, y **es obligatorio antes de aplicar las migraciones de
§9.3**.

```bash
docker exec transportedb pg_dump -U postgres transportedb > respaldo_$(date +%F).sql
```
