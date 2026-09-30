# 05 · Manual de Base de Datos

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
PostgreSQL 18 · base `transportedb` · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Resumen

| Elemento | Cantidad |
|---|---|
| Tablas | **27** |
| Enumerados | **11** |
| Restricciones `CHECK` | **24** |
| Índices parciales | **7** |
| Migraciones aplicadas | **11** |

Todo el acceso pasa por **Prisma**. No hay TypeORM, no hay funciones almacenadas `fu_*`, no hay
consultas construidas a mano: `$queryRawUnsafe` está prohibido.

**Convención de nombres.** Tablas con prefijo `t_`, enumerados con `e_`. Cada columna lleva el
prefijo abreviado de su tabla: `oper_`, `func_`, `cuad_`, `form_`.

---

## 2. Las 27 tablas por área

### 2.1. Configuración institucional · 11 tablas

| Tabla | Qué guarda |
|---|---|
| `t_formulario` | Los nueve formularios, con su color, su dueño y sus políticas |
| `t_formulario_prefijo` | Prefijos del identificador, opcionalmente por área |
| `t_formulario_area` | Áreas de personal que admite cada formulario |
| `t_zonal` | Zonales del DMQ, más el ámbito distrital |
| `t_punto_encuentro` | Puntos, cada uno perteneciente a una zonal |
| `t_tipo_control` | Tipos de control |
| `t_institucion` | Instituciones participantes |
| `t_formulario_punto` | Qué puntos ofrece cada formulario |
| `t_formulario_tipo_control` | Qué tipos ofrece cada formulario |
| `t_formulario_institucion` | Qué instituciones ofrece cada formulario |
| `t_ventana_carga` | Una ventana horaria por rol. Seis filas |

### 2.2. Política y personal · 6 tablas

| Tabla | Qué guarda |
|---|---|
| `t_parametro_politica` | Los ocho umbrales, con su tipo y su rango |
| `t_funcionario` | Maestro de personal. **Único sitio con cédula y teléfono** |
| `t_conductor` | Conductores, con su vehículo habitual |
| `t_vehiculo` | Vehículos |
| `t_disponibilidad` | Ausencias de personas **y** de vehículos |
| `t_historial_jornada` | Consolidado por persona y día, para las reglas de descanso |

### 2.3. Jornada y operativos · 6 tablas

| Tabla | Qué guarda |
|---|---|
| `t_cuadro_diario` | Una fila por día. Estado, semana y orden de trabajo |
| `t_operativo` | El núcleo. Horario, punto, tipo, transporte, alertas, versión |
| `t_asignacion_personal` | Quién sale en cada operativo |
| `t_operativo_zonal` | Zonales del operativo (RN-19 admite varias) |
| `t_operativo_institucion` | Instituciones participantes |
| `t_solicitud_apoyo` | Solicitudes de personal entre direcciones |

### 2.4. Logística y documentos · 4 tablas

| Tabla | Qué guarda |
|---|---|
| `t_capacidad_flota` | Vehículos y conductores hábiles declarados por fecha |
| `t_orden_servicio` | Órdenes emitidas, con su **dato aislado** en JSONB |
| `t_auditoria` | Traza de toda escritura |
| `t_usuario` | Cuentas, con enlace opcional a una ficha de personal |

---

## 3. Los 11 enumerados

| Enumerado | Valores |
|---|---|
| `e_rol_departamental` | DMIP_OPERATIVOS · DMIP_INSPECCIONES · DMIT_INSTRUCTOR · DAF · DIRECTOR · ADMINISTRADOR (retirado el 2026-09-01) · FUNCIONARIO · ADMINISTRADOR_DMIP · ADMINISTRADOR_DMIT · ADMINISTRADOR_DAF |
| `e_estado_cuadro` | BORRADOR · EN_TRANSPORTE · APROBADO · CERRADO |
| `e_estado_transporte` | PENDIENTE · ASIGNADO · PROPIOS_MEDIOS |
| `e_politica_vehiculo` | NO_APLICA · CONDICIONAL · REQUERIDO · OBLIGATORIO |
| `e_area_personal` | GENERAL · TECNICO · INSTRUCCION · OPERATIVOS · CCF |
| `e_tipo_contrato` | NOMBRAMIENTO · OCASIONAL |
| `e_estado_disponibilidad` | DISPONIBLE · VACACIONES · REPOSO_MEDICO · CALAMIDAD · PERMISO · MANTENIMIENTO |
| `e_tipo_ventana` | SEMANAL · DIARIO · INTERVALO |
| `e_accion_auditoria` | CREAR · ACTUALIZAR · ELIMINAR · CERRAR · REABRIR · EMITIR |
| `e_estado_solicitud` | SOLICITADA · ATENDIDA · RECHAZADA · VENCIDA |
| `e_tipo_parametro` | ENTERO · DECIMAL · TEXTO · BOOLEANO |

> `MANTENIMIENTO` es un estado **de vehículos**, no de personas. El servidor rechaza su uso sobre un
> funcionario y la interfaz no lo ofrece.

---

## 4. Las 24 restricciones `CHECK`

Son reglas de negocio que la base garantiza **aunque el código falle**.

| Tabla | Restricción | Qué impide |
|---|---|---|
| `t_formulario` | `ck_formulario_numero` | Un número fuera del rango **1 a 9** |
| | `ck_formulario_color_fondo` / `_acento` | Un color que no sea `#RRGGBB` |
| | `ck_formulario_vigencia` | Vigencia que termina antes de empezar |
| | `ck_formulario_compartido` | Rol compartido sin cupo, o al revés |
| `t_operativo` | `ck_operativo_hora_inicio` / `_fin` | Horas fuera de `HH:MM` |
| | `ck_operativo_duracion` | Duración inconsistente |
| | `ck_operativo_punto` | Punto de catálogo **y** texto libre a la vez |
| | `ck_operativo_tipo` | Ídem para el tipo de control |
| | `ck_operativo_transporte` | Estado de transporte incoherente con conductor y vehículo |
| | `ck_operativo_secuencial` | Secuencial no positivo |
| | `ck_operativo_version` | Versión no positiva |
| `t_cuadro_diario` | `ck_cuadro_semana` | Semana fuera de 1–53 |
| | `ck_cuadro_cierre` | Cierre incoherente con el estado |
| `t_disponibilidad` | `ck_disponibilidad_sujeto` | Un periodo sin funcionario **ni** vehículo, o con los dos |
| | `ck_disponibilidad_rango` | `hasta` anterior a `desde` |
| `t_ventana_carga` | `ck_ventana_horas` | Horas fuera de formato |
| | `ck_ventana_dias` | Día fuera de 1–7 |
| `t_parametro_politica` | `ck_parametro_valor` | Valor vacío |
| | `ck_parametro_rango` | Máximo menor que el mínimo |
| `t_capacidad_flota` | `ck_capacidad_positiva` | Cantidades negativas |
| `t_historial_jornada` | `ck_historial_horas` | Horas fuera de rango |
| `t_solicitud_apoyo` | `ck_solicitud_cantidad` | Cantidad no positiva |

> **`ck_formulario_numero` tiene una consecuencia operativa importante**: hay exactamente nueve
> casilleros de formulario y el catálogo institucional los ocupa todos. Por eso las pruebas de
> integración necesitan su propia base.

---

## 5. Los 11 índices parciales

Un índice parcial cubre solo las filas que cumplen una condición: ocupa menos y responde más
rápido a la consulta que importa.

| Índice | Tabla | Condición | Para qué |
|---|---|---|---|
| `idx_operativo_conductor` | `t_operativo` | `cond_id IS NOT NULL` | Solapamiento de conducción |
| `idx_operativo_vehiculo` | `t_operativo` | `vehi_id IS NOT NULL` | Clave foránea de la flota. **Añadido el 19-AGO-2026** |
| `idx_operativo_alerta` | `t_operativo` | `oper_alerta_activa = true` | Alertas de la jornada |
| `idx_historial_pesadas` | `t_historial_jornada` | nocturna **o** fin de semana | Tope de salidas pesadas |
| `idx_disponibilidad_func` | `t_disponibilidad` | `func_id IS NOT NULL` | Ausencias de personas |
| `idx_disponibilidad_cond` | `t_disponibilidad` | `cond_id IS NOT NULL` | Vehículos en taller |
| `idx_funcionario_area` | `t_funcionario` | `func_activo = true` | Selección de personal |
| **`uq_orden_vigente`** | `t_orden_servicio` | `oser_vigente = true` | **Una sola orden vigente por operativo y persona** |
| **`uq_operativo_cuad_form_sec`** | `t_operativo` | `oper_origen_id IS NULL` | **Secuencial único entre los operativos ordinarios** del formulario y el día. **20-AGO-2026** |
| **`uq_operativo_cuad_form_sec_adic`** | `t_operativo` | `oper_origen_id IS NOT NULL` | Ídem **entre los adicionales**, que numeran aparte |
| `idx_operativo_origen` | `t_operativo` | `oper_origen_id IS NOT NULL` | Clave foránea del adicional. **20-AGO-2026** |

> **Los dos únicos son los que más importa vigilar de esta lista.** Hasta el 20-AGO-2026
> `uq_operativo_cuad_form_sec` era un único entero de tres columnas. Se partió en dos parciales
> porque el operativo **adicional** numera en serie propia, y su `001` tiene que poder convivir con
> el `001` ordinario del mismo formulario. Si una migración futura los recreara sin predicado, o los
> fundiera otra vez, **nada fallaría al desplegar**: fallaría el día en que alguien intentara
> registrar el primer adicional de un formulario que ya tiene operativos.
>
> `idx_operativo_origen` es parcial por el mismo criterio de dominio que `idx_operativo_conductor`:
> casi ningún operativo es un adicional, y un índice completo pagaría el mantenimiento de todas las
> filas nulas para responder consultas que solo preguntan por las otras.

> **Por qué `idx_operativo_vehiculo` es parcial.** Por el mismo motivo que
> `idx_operativo_conductor`, y es de dominio, no de rendimiento: **conductor y vehículo nacen
> nulos** al registrar el operativo y solo la DAF los completa. Mientras esa dirección no interviene
> la mayoría de las filas tienen `vehi_id` nulo, e indexarlas sería pagar por lo que nadie consulta.

`uq_orden_vigente` es el que sostiene la reemisión: la orden anterior se marca no vigente y la
nueva se inserta **en la misma transacción**; si otra emisión se colara entre ambas, la base la
rechazaría.

---

## 6. Concurrencia

### 6.1. Bloqueo optimista

`t_operativo` lleva una columna `version`. Toda edición actualiza con `WHERE id = ? AND version = ?`
e incrementa. Si otro usuario modificó la fila entretanto, no se actualiza ninguna y el sistema
responde `409 CONFLICTO_CONCURRENCIA`.

### 6.2. Secuencial diario

El identificador de un operativo —`OCF-003-07-AGO-2026`— reinicia cada día. El conteo y la
inserción ocurren **dentro de la misma transacción**; ante colisión se reintenta hasta tres veces.

---

## 7. Fechas y zona horaria

Es la fuente de error más silenciosa del sistema, y está resuelta con una regla firme:

- **Las columnas `@db.Date` son fechas de calendario**: sin hora ni huso. Se manejan **en UTC** en
  todo el sistema y viajan como texto `AAAA-MM-DD`.
- **Los instantes** (`@db.Timestamptz`) se interpretan en `America/Guayaquil`.

Convertir una fecha de calendario a `Date` en Quito —UTC−5— la desplaza un día. Por eso el
frontend compara cadenas y el backend construye con `Date.UTC(...)`.

---

## 8. Auditoría

`t_auditoria` registra entidad, identificador, acción, usuario, momento y el detalle de los campos
que cambiaron.

**Se escribe dentro de la misma transacción que el dato.** No existe la posibilidad de un cambio
guardado sin su rastro.

Dos omisiones deliberadas:

- **El motivo de una ausencia no se copia.** Puede describir una condición de salud.
- **Los nombres no aparecen** en el registro de emisión de órdenes.

---

## 9. Las 11 migraciones

| Migración | Qué introduce |
|---|---|
| `20260805134048_esquema_inicial` | Las 27 tablas y los 11 enumerados |
| `20260805134100_agrega_restricciones_verificacion` | Las 24 restricciones `CHECK` |
| `20260805134200_agrega_indices_parciales` | Los 7 índices parciales |
| `20260805135219_agrega_valor_por_defecto_a_marcas_de_actualizacion` | Corrección de `updatedAt` |
| `20260805170000_agrega_captura_libre_al_formulario` | `form_permite_captura_libre` (RN-20) |
| `20260811120000_separa_la_captura_libre_por_catalogo` | La divide en `form_captura_libre_punto` y `form_captura_libre_tipo`. RN-20 es propiedad de cada catálogo, no del formulario. **El valor existente se traslada al tipo de control**, que es lo que significaba |
| `20260806120000_agrega_baja_logica_al_operativo` | `oper_activo` — baja lógica (PV-10) |
| `20260806160000_enlaza_usuario_con_funcionario` | `t_usuario.func_id`, para las órdenes propias |
| `20260817194510_agrega_el_rol_de_funcionario` | `FUNCIONARIO` en `e_rol_departamental`. **Exigió migración aunque parezca una línea**: es un enumerado de PostgreSQL, no una constante. Sin él, P-06 «Mis órdenes» no funcionaba para nadie |
| `20260817200000_identificador_de_auth_unico` | Índice **único** `uq_usuario_identificador_ad`. Dos cuentas con el mismo usuario de Auth harían que el ingreso resolviera a una cualquiera. Admite varios nulos: son las cuentas sin enlace |
| `20260819160900_optimiza_indices_de_claves_foraneas` | **Retira dos índices duplicados** —`idx_operativo_cuad_form` e `idx_historial_func_fecha` repetían las columnas de una restricción única de su propia tabla— y **cubre cuatro claves foráneas** que obligaban a recorrer `t_operativo` entera en cada comprobación de integridad. Ver §5 y §9.1 |
| `20260820120000_adicional_del_dia_sobre_un_operativo` | `oper_origen_id` con su clave foránea `RESTRICT` y `ck_operativo_origen`; parte `uq_operativo_cuad_form_sec` en **dos únicos parciales** para que el adicional numere aparte; índice parcial de la nueva clave foránea. Ver §5 |
| `20260820130000_prefijo_que_nombra_al_adicional` | `fpre_es_adicional` en `t_formulario_prefijo`, y declara los dos prefijos del PMO: `OCPMO` como predeterminado y `OCAPMO` como el de los adicionales. **De paso desbloquea el PMO**, que hasta entonces no podía registrar ningún operativo: tenía dos prefijos y ninguno marcado, así que la generación del identificador se detenía (PV-27) |

### 9.1. Qué buscaba la última migración

Salió de revisar la base con las reglas de rendimiento de PostgreSQL el 19 de agosto de 2026, y
conviene guardar el criterio con el que se decidió, porque la mitad de los hallazgos se descartaron.

**Lo que se hizo:**

- **Dos índices eran redundantes.** Duplicaban exactamente las columnas de una restricción única de
  su misma tabla. Una restricción única **ya crea su índice**, así que el gemelo no podía acelerar
  ninguna consulta y sí encarecía cada escritura —en `t_operativo`, la tabla que más se escribe—.
- **Cuatro claves foráneas quedaron cubiertas.** PostgreSQL no las indexa por su cuenta, y son
  `RESTRICT` o `CASCADE`: sin índice, **desactivar un tipo de control desde P-08 recorría
  `t_operativo` entera** para comprobar que ningún operativo lo referenciaba.

**Lo que se descartó a propósito, y por qué:**

- Las claves foráneas de `t_formulario_institucion`, `t_formulario_punto` y
  `t_formulario_tipo_control`. Son catálogo —entre 15 y 47 filas— y **no crecen**: el coste de
  escritura del índice superaría al ahorro.
- Todo ajuste de consulta. `pg_stat_statements` no registraba **ninguna** carga real de la
  aplicación, y los recorridos secuenciales sobre tablas de cuarenta filas son la elección correcta
  del planificador, no un defecto.
- Los tipos de datos: se revisaron y **están bien**. Las 23 marcas de tiempo son `timestamptz`, las
  fechas son `date` y las dos columnas de horas son `numeric`, exactas.

**Se hizo con la base vacía a propósito:** crear un índice sobre una tabla con datos toma un bloqueo
de escritura, y sobre `t_operativo` eso significaría detener el registro del cuadro del día
siguiente.

---

**Las migraciones no se aplican al arrancar el contenedor.** Son un paso explícito del despliegue:

```bash
docker compose run --rm transporte-app npx prisma migrate deploy
```

---

## 10. Datos iniciales

**Ya no hay semilla.** Se retiró el 19-AGO-2026 junto con `prisma/insumos/*.json`: los catálogos
institucionales viven ahora en la migración `20260819210000_catalogos_institucionales_en_la_base`,
y `migrate deploy` los aplica. Cada `INSERT` lleva `ON CONFLICT DO NOTHING`, así que sigue siendo
idempotente, y la migración reajusta las secuencias — sin eso, el primer alta de un administrador
reutilizaría un identificador existente.

| Catálogo | Filas | Estado |
|---|---|---|
| Parámetros de política | 8 | ✅ Provisionales (PV-06) |
| Ventanas de carga | 6 | ✅ |
| Zonales | 11 | ✅ |
| Tipos de control | 44 | ✅ |
| Instituciones | 16 | ✅ |
| **Formularios** | **9** | ✅ Sembrados el 07-AGO-2026 |
| Prefijos de identificador | 19 | ⚠️ Ninguno predeterminado (PV-27) |
| Áreas por formulario | 15 | ✅ |
| Delimitación de tipos e instituciones | 111 | ✅ |
| **Puntos de encuentro** | **0** | ⏳ **PV-01** |
| **Personal** | **0** | ⏳ **PV-02** |
| **Conductores y vehículos** | **0** | ⏳ **PV-03** |

**La semilla no inventa datos maestros.** Al terminar imprime qué quedó sin cargar y qué pendiente
lo bloquea, y ejecuta `ANALYZE` para que el planificador tenga estadísticas desde el primer día.

> Si `DATABASE_URL` apunta a `transportedb_pruebas`, la semilla **no siembra los nueve
> formularios**, a propósito: las suites de integración necesitan esos nueve casilleros.

---

## 11. Verificación del esquema

```bash
npm run prisma:verificar
```

Comprueba que estén las 27 tablas, los 11 enumerados, las 24 restricciones `CHECK` y los 7 índices
parciales. Útil tras una migración o al recibir un entorno nuevo.

---

## 12. Copias de seguridad

**No hay política definida (PV-19).** El volumen `transporte_pgdata` contiene todo. Respaldarlo es
responsabilidad de la infraestructura.

```bash
docker exec transportedb pg_dump -U postgres transportedb > respaldo_$(date +%F).sql
```
