# 10 · Manual de Soporte

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Para mesa de ayuda y primera línea · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

---

## 1. Lo primero que hay que pedir

**El identificador de correlación.** Aparece en el detalle plegado de los mensajes de error
(«Ver detalle») y en toda respuesta del servidor, en la cabecera `x-correlation-id`. Con él se
localiza la petición exacta:

```bash
docker logs transporte-app 2>&1 | grep '687f6b30-ffa4-490a-b520-6ffb76f2d36e'
```

Si no lo tiene, pida: **perfil usado, hora aproximada, pantalla, fecha de la jornada y qué intentaba
hacer**. En los operativos agrupados (patrulla, registro por zonas) pida también los identificadores
que ve en la fila.

---

## 2. Diagnóstico rápido

```bash
docker compose ps                                          # ¿los tres «healthy»?
curl -s http://localhost:3003/api/v1/estado                # ¿responde el backend?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/health
docker logs --tail 50 transporte-app 2>&1 | grep '"nivel":"error"'
```

En los servidores, `docker compose` lleva los archivos de ese ambiente: `-f docker-compose.prod.yml`
en preproducción y, además, `-f docker-compose.gateway.yml` en producción. Los comandos completos
están en `COMANDOS-PREPRODUCCION.md` e `INSTALACION-PRODUCCION.md` del backend.

---

## 3. Incidencias frecuentes

### 3.1. «Su perfil no tiene formularios asignados en el cuadro»

**No es un fallo de la pantalla: está diciendo la verdad.**

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc "SELECT count(*) FROM t_formulario WHERE form_activo;"
```

| Resultado | Causa | Solución |
|---|---|---|
| `0` | Las migraciones no se aplicaron | `npx prisma migrate deploy` |
| Mayor que 0 | El rol no tiene formularios en `t_formulario_rol`, o la cuenta no tiene el rol | Comprobar la cuenta en «Cuentas del cuadro» |

### 3.2. Toda petición responde `401`

```bash
# ¿Está configurada la clave con que este módulo firma la sesión?
docker logs transporte-app 2>&1 | grep -i "SESSION_JWT_SECRET"   # bien: sin resultados

# ¿Llega la cookie? En el navegador: Application → Cookies → cuadro_colores_sesion
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/api/v1/auth/session   # sin cookie: 401
```

| Situación | Qué significa | Qué hacer |
|---|---|---|
| `401` en todo, y la cookie **no** existe en el navegador | La sesión nunca se estableció, o caducó (8 h) | Volver a ingresar por el portal |
| `401` en todo, y la cookie **sí** existe | `SESSION_JWT_SECRET` cambió o está vacía | Revisar la variable y volver a ingresar |
| `403` al ingresar, con mensaje sobre el alta | Auth le autenticó, pero **no tiene fila en `t_usuario`**, está desactivado o no tiene ningún rol | Darlo de alta en «Cuentas del cuadro» con su identificador de Auth |
| El portal no lo trae de vuelta | En Auth, el origen registrado para el módulo no es el del frontend de ese ambiente | Corregirlo en Auth. El destino sale del primer permiso con ruta, por orden |
| Pantalla «Falta configurar la dirección del portal de Auth» | La imagen del frontend se construyó sin `VITE_AUTH_PORTAL_URL` | **Escalar a desarrollo**: hay que reconstruir el paquete de ese ambiente |

> **La cookie es `HttpOnly`**: no la verá desde la consola del navegador, solo en el panel de
> almacenamiento. Es a propósito.

### 3.3. En producción el ingreso falla con «No se pudo contactar con el servicio de autenticación»

**Ocurrió el 22 de octubre de 2026, detrás del Gateway.** El Auth no envía su certificado
intermedio de DigiCert y Node no lo conoce.

```bash
docker logs transporte-app 2>&1 | grep -E "UNABLE_TO_VERIFY_LEAF_SIGNATURE|Ignoring extra certs"
```

| Mensaje | Causa | Solución |
|---|---|---|
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Falta `NODE_EXTRA_CA_CERTS` | Infraestructura: montar la intermedia con `docker-compose.gateway.yml` |
| `Warning: Ignoring extra certs from …` | La variable está, el archivo no | Infraestructura: comprobar la carpeta `CERTS_GATEWAY` y recrear `transporte-app` |

**Nunca** se resuelve con `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### 3.4. «Mis órdenes» o el perfil «Funcionario de campo» ya no existen

**Es correcto.** El rol `FUNCIONARIO` se retiró el 10 de septiembre de 2026: el personal de campo no
inicia sesión. Sus órdenes las emite **solo la Dirección** desde «Órdenes de servicio», con el
formato del departamento de cada persona, y se entregan por otro canal.

### 3.5. «No hay formato de orden para <departamento>»

La persona no recibe orden porque su departamento no tiene formato configurado. Las demás sí se
emiten. La Dirección lo configura en «Órdenes de servicio › Editar plantilla», en la pestaña de ese
departamento.

### 3.6. «Su ventana de carga cerró a las 15H00»

Es el comportamiento correcto (RN-56). Opciones:

1. Esperar al día siguiente.
2. La Dirección **reabre** el cuadro, si procede.
3. El administrador cambia la ventana en «Ventanas y parámetros». Rige de inmediato.
4. Si es urgente y el formulario los admite, un **adicional**: es la única escritura que ignora la
   ventana.

### 3.7. El desplegable de punto de encuentro está vacío

Desde el 13 de octubre de 2026 **cada formulario tiene sus propias zonales y puntos**. Un punto de
otro formulario no aparece.

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc \
  "SELECT f.form_numero, count(p.*) FROM t_formulario f
     LEFT JOIN t_punto_encuentro p ON p.form_id = f.form_id
    GROUP BY f.form_numero ORDER BY 1;"
```

Si el formulario tiene `0`, se cargan en «Catálogos del cuadro» con ese formulario elegido arriba.

### 3.8. No aparece nadie en el selector de personal

Causas posibles, en este orden:

1. **No escribió el horario del operativo.** Sin él, la lista dice «Ingrese el horario del operativo
   para ver quién está libre».
2. **Está en otra pestaña de área.** En los formularios que admiten Inspector General y Técnico la
   lista va por área, sin «Todas». En el 8 hay que elegir primero el tipo de personal.
3. **El maestro está vacío** o no hay personal del área que admite el formulario.
4. **La persona no tiene jornada laboral** (§3.10).
5. **No puede salir** por una ausencia o una regla de descanso. Aparece bajo «No disponibles», con su
   motivo.
6. **Se cruza con otro operativo.** Aparece al final con «Se cruza 18H00–22H00» y al pulsarlo dice
   con qué. Al editar, el propio registro no cuenta.

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc \
  "SELECT f.func_apellidos, f.func_area, f.jorl_id, d.disp_estado, d.disp_hasta
     FROM t_funcionario f
     LEFT JOIN t_disponibilidad d
       ON d.func_id = f.func_id AND CURRENT_DATE BETWEEN d.disp_desde AND d.disp_hasta
    WHERE f.func_activo;"
```

### 3.9. La ficha de una persona no se puede guardar por su zonal

**Corregido el 26 de octubre de 2026.** Si la zonal de la ficha se desactivó después en el catálogo,
el servidor rechazaba **cualquier** cambio de esa ficha, aunque nadie tocara la zonal.

Hoy:

- el servidor solo comprueba la zonal **si cambia** (`funcionarios.service.ts`);
- la ficha muestra la zonal como «<nombre> (desactivada)»;
- elegir «Sin zonal» la quita.

Si el usuario lo ve todavía, el servidor tiene una versión anterior: **escalar a despliegue**.

### 3.10. «No tiene jornada laboral asignada» · nadie queda convocable

**Es efecto de la migración del 23 de octubre de 2026.** La jornada laboral reemplazó al tipo de
contrato y la migración `20261023100000` sembró dos jornadas («Lunes a Viernes 8 horas» y «Lunes a
Domingo 24/7»), pero **no asignó ninguna a nadie**. Hasta que el administrador la asigna, la persona
no se convoca (`JORNADA_NO_ADMITE_TURNO`) y el conductor no recibe transporte (`SIN_JORNADA`).

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc \
  "SELECT 'personal', count(*) FROM t_funcionario WHERE func_activo AND jorl_id IS NULL
   UNION ALL SELECT 'conductores', count(*) FROM t_conductor WHERE cond_activo AND jorl_id IS NULL;"
```

La solución es de administración, no de desarrollo: asignar la jornada en cada ficha de
«Personal y disponibilidad» y en cada conductor de «Flota y garajes». Ambas pantallas marcan a quien
falta con «⚠ Sin jornada». La jornada 24/7 **no** exime de ausencias, cruces ni reglas de descanso.

### 3.11. La DAF ve dos solicitudes para una misma patrulla, o tramos sin conductor sueltos

**Datos heredados de antes del 4 de noviembre de 2026.** Desde esa fecha la patrulla 5/6 y el
registro por zonas del 8 son **una** solicitud con un conductor y un vehículo. Los tramos que se
crearon antes para los otros códigos siguen en la base.

```bash
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js                          # reporte
docker exec transporte-app node dist/scripts/tramos-registro-agrupado.js --aplicar --usuario=<usua_id>
```

- **Sin `--aplicar` solo reporta.** Empiece siempre así.
- Con `--aplicar` borra **solo** los tramos sin conductor. Los que tienen conductor quedan en el
  reporte para que la DAF los reasigne desde «Planificar el día».
- `--usuario` es el `usua_id` de quien firma la traza en `t_auditoria`. Es obligatorio.
- Lo ejecuta infraestructura o desarrollo, previo `pg_dump`.

### 3.12. Avisos en un registro agrupado: «No caben…» o «El horario del registro ya no coincide…»

**Son avisos, no errores.** Se calculan al leer y no liberan la asignación.

| Aviso | Qué pasó | Qué hacer |
|---|---|---|
| «No caben: el registro tiene N personas y la PLACA tiene M asientos.» | Se agregó gente a la patrulla después de asignar el vehículo | La DAF cambia de vehículo o divide el traslado |
| «El horario del registro ya no coincide con el transporte asignado.» | Se cambió un turno después de asignar | La DAF revisa la asignación |

Al asignar, en cambio, el mismo exceso de personas responde **409** y no se guarda.

### 3.13. «No llega» al asignar un conductor

El traslado entre la zonal anterior y la siguiente no cabe en el hueco. El mensaje dice cuántos
minutos faltan. Los tiempos son los de «Traslados entre zonales»; si un par está mal, lo corrige la
DAF ahí, y la pantalla avisa antes de guardar qué asignaciones dejarían de llegar.

### 3.14. No se puede dar de baja un vehículo o un conductor

Responde 409 `RECURSO_CON_ASIGNACION` con el motivo: traslados que aún no terminan, un mantenimiento
abierto, tareas del conductor, vehículos que duermen en el garaje o un cuadro cerrado futuro. Se
libera primero en «Planificar el día» y después se da de baja.

### 3.15. «El formulario … tiene varios prefijos de identificador y ninguno está marcado como predeterminado»

Es **PV-27**. En los formularios 5, 6 y 8 el prefijo se elige por el **área de la persona** desde
septiembre de 2026; si el mensaje aparece en otro formulario, falta el criterio del negocio.

**No lo resuelva marcando uno al azar**: el código del operativo aparece en la matriz y en las
órdenes, y uno equivocado dice algo que no es.

### 3.16. No se puede cerrar el cuadro

El mensaje nombra el operativo:

- un nocturno con vehículo obligatorio sin conductor → la DAF lo asigna o lo declara por propios
  medios;
- `APORTE_COMPARTIDO_PENDIENTE` → falta la persona que aporta otro departamento. En la patrulla se
  mide por registro: con el código de Instrucción presente, ya no bloquea.

### 3.17. «Vuelva a abrirlo y guarde de nuevo para no sobrescribir el trabajo de otra persona»

Conflicto de concurrencia: alguien modificó el operativo mientras el usuario lo editaba. **Es una
protección, no un error.** Recargar y repetir el cambio.

### 3.18. El PDF se descarga vacío, no se ve o falla la firma

| Síntoma | Causa probable |
|---|---|
| El visor de la orden queda en blanco | El nginx no sirve el *worker* de pdf.js como `text/javascript`. Imagen del frontend antigua |
| 502 `SERVICIO_FIRMA_NO_DISPONIBLE` | La firma digital `.p12` está configurada y falló. Escalar a desarrollo |
| Error al generar el memorando | Faltan las fuentes de `fonts/` en la imagen del backend |

En los demás casos, busque el error en el registro con el identificador de correlación.

### 3.19. Una pantalla nueva no aparece tras actualizar

El `index.html` se sirve sin caché desde el 25 de septiembre de 2026, así que basta recargar. Si
sigue igual, la imagen del frontend es antigua: el servidor no recibió el paquete nuevo.

### 3.20. Las horas no cuadran

```bash
docker exec transporte-app sh -c 'date'      # debe terminar en -05
```

Si no dice `-05`, `TZ` está mal y **las ventanas cierran a otra hora**.

---

## 4. Tabla de códigos de error

Los 42 códigos están en `transporte-backend/src/common/errors/codigos-error.ts`. Los que más llegan
a soporte:

| Código | Significa | Primera línea |
|---|---|---|
| `VENTANA_CARGA_CERRADA` | Fuera de horario | Explicar el horario (§3.6) |
| `FORMULARIO_NO_AUTORIZADO` | Formulario ajeno al rol | Comprobar el perfil |
| `ROL_NO_AUTORIZADO` | El rol no puede esa operación (p. ej., emitir órdenes sin ser Dirección) | Comprobar el perfil |
| `PERMISO_INSUFICIENTE` | El perfil no tiene el permiso de ese endpoint | Comprobar en «Permisos por rol» |
| `CAMPOS_NO_PERMITIDOS` | Se enviaron campos fuera de contrato | **Escalar**: es un defecto |
| `PERSONA_NO_DISPONIBLE` | Vacaciones, reposo, permiso | Comprobar en P-07 |
| `PERSONA_EN_DESCANSO` | Turno de descanso en la cobertura de Instrucción | Es correcto |
| `TURNO_FUERA_DE_RANGO` | El horario no cae en el turno de cobertura | Es correcto |
| `JORNADA_NO_ADMITE_TURNO` | Sin jornada laboral, o fuera de sus días u horas | §3.10, o es correcto (RN-26) |
| `PATRULLA_CONSECUTIVA` | Salió en patrulla ayer | Es correcto (RN-24) |
| `TOPE_SALIDAS_PESADAS` | Excedió las salidas del período | Es correcto (RN-25) |
| `SOLAPAMIENTO_HORARIO` | Ya está en otro operativo a esa hora | Es correcto (RN-28) |
| `JORNADA_MAXIMA_SUPERADA` | Excede las horas del día | Es correcto (RN-36) |
| `CUPO_COMPARTIDO_SUPERADO` | El rol compartido agotó su cupo | Es correcto (PER-06) |
| `AREA_NO_ADMITIDA` | El formulario no admite esa área | Comprobar el área en P-07 |
| `CONDUCTOR_PATRULLA_CONSECUTIVA` | Descanso del conductor | Es correcto |
| `CONDICIONANTE_NOCTURNO` | Nocturno sin conductor | La DAF debe asignarlo |
| `APORTE_COMPARTIDO_PENDIENTE` | Falta el aporte de otro departamento | §3.16 |
| `CUADRO_CERRADO` | La jornada está cerrada | La Dirección puede reabrir |
| `OPERATIVO_CON_ADICIONALES` | Un código tiene un adicional vigente | Retirar antes el adicional |
| `CONFLICTO_CONCURRENCIA` | Otro usuario modificó el dato | Recargar y repetir |
| `CAMBIO_CON_TRANSPORTE` / `CAMBIO_TIPO_CON_TRANSPORTE` | El cambio libera el transporte asignado | Confirmar en el aviso; la DAF reasigna |
| `VEHICULO_OCUPADO` | La placa ya está en otro tramo a esa hora | Elegir otra placa |
| `COMPARTIR_NO_COMPATIBLE` / `COMPARTIR_CON_EXCLUSIVO` | No pueden ir en la misma unidad | Es correcto; el motivo lo dice |
| `RECURSO_CON_ASIGNACION` | Baja de flota con asignaciones pendientes | §3.14 |
| `AUSENCIA_SOLAPADA` / `AUSENCIA_PASADA` | Ausencia que se cruza o en el pasado | Corregir las fechas |
| `CEDULA_CON_FICHA` | La cédula ya tiene ficha en el maestro | Buscar la ficha existente |
| `CATALOGO_EN_USO` | Valor de catálogo con uso | Desactivarlo en lugar de eliminarlo |
| `AUTH_NO_DISPONIBLE` | Auth central no respondió | §3.3; el alta manual sigue funcionando |
| `SERVICIO_FIRMA_NO_DISPONIBLE` | Falló la firma digital | Escalar |

**La mayoría no son averías: son el sistema protegiendo a una persona.** Antes de escalar,
compruebe si el mensaje describe una regla.

---

## 5. Cuándo escalar

| Situación | A quién |
|---|---|
| `CAMPOS_NO_PERMITIDOS` o error `500` | Desarrollo |
| «Falta configurar la dirección del portal de Auth» | Desarrollo: reconstruir el paquete del ambiente |
| Un contenedor no llega a «healthy» | Infraestructura |
| Las horas no coinciden con `-05` | Infraestructura |
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` en el registro | Infraestructura (§3.3) |
| Aplicar un script de datos heredados (`--aplicar`) | Infraestructura o desarrollo, con respaldo previo |
| Falta un dato maestro (PV-01, PV-02, PV-03) o jornadas sin asignar | **Administración o DAF**, no desarrollo |
| Un parámetro de política o un tiempo de traslado debe cambiar | **Dirección o DAF**, y lo aplica el administrador |
| Alguien pide ver el cuadro completo sin ser Dirección | **No se concede.** Es el requisito que originó el encargo |

> **Deuda conocida que no es una avería en producción:** ocho suites de integración del backend
> fallan por fixtures desactualizados (`puntoEncuentro.create` sin `formulario`, `400` de
> `/personal/elegible` con `inicio`, y un texto en configuracion-catalogos). Afecta a la red de
> pruebas, no al sistema desplegado. Ver `11_Guia_Mantenimiento.md` §5.

---

## 6. Consultas útiles

```sql
-- Estado de la jornada
SELECT cuad_fecha, cuad_estado, cuad_orden_trabajo FROM t_cuadro_diario ORDER BY cuad_fecha DESC LIMIT 7;

-- Operativos del día con su transporte y su registro
SELECT oper_identificador, oper_grupo_registro, oper_hora_inicio, oper_hora_fin,
       oper_estado_transporte, oper_alerta_activa
FROM t_operativo o JOIN t_cuadro_diario c ON c.cuad_id = o.cuad_id
WHERE c.cuad_fecha = CURRENT_DATE AND o.oper_activo
ORDER BY oper_grupo_registro, oper_identificador;

-- Tramos de transporte del día
SELECT t.trtr_tipo, t.trtr_hora_inicio, t.trtr_hora_fin, o.oper_identificador, t.cond_id, t.vehi_id
FROM t_tramo_transporte t LEFT JOIN t_operativo o ON o.oper_id = t.oper_id
WHERE t.trtr_fecha = CURRENT_DATE ORDER BY t.trtr_hora_inicio;

-- Qué se le hizo a un operativo
SELECT audi_accion, audi_campo, audi_valor_anterior, audi_valor_nuevo,
       audi_usuario, audi_rol, audi_momento, audi_correlacion
FROM t_auditoria WHERE audi_entidad = 't_operativo' AND audi_entidad_id = 123
ORDER BY audi_momento;

-- Ausencias vigentes hoy
SELECT f.func_apellidos, f.func_nombres, d.disp_estado, d.disp_desde, d.disp_hasta
FROM t_disponibilidad d JOIN t_funcionario f ON f.func_id = d.func_id
WHERE CURRENT_DATE BETWEEN d.disp_desde AND d.disp_hasta;

-- Estado de los catálogos
SELECT 't_formulario' t, count(*) FROM t_formulario
UNION ALL SELECT 't_punto_encuentro', count(*) FROM t_punto_encuentro
UNION ALL SELECT 't_funcionario', count(*) FROM t_funcionario
UNION ALL SELECT 't_conductor', count(*) FROM t_conductor
UNION ALL SELECT 't_jornada_laboral', count(*) FROM t_jornada_laboral;
```

> **Consulte, no modifique.** Un cambio hecho por SQL no pasa por las reglas de negocio y **no deja
> traza en la auditoría**. Para corregir datos heredados están los scripts de `dist/scripts/`.

---

## 7. Lo que soporte no puede resolver

| Petición | Por qué no |
|---|---|
| «Deme acceso a la matriz completa» | El documento exportable es exclusivo de la Dirección (RN-44, RN-48). La Jornada del Día muestra a cada departamento **solo sus formularios** desde el 15 de septiembre de 2026; ver los ajenos no se concede |
| «Sáltese la regla de descanso por esta vez» | Protege a una persona. Se cambia el parámetro, con decisión de la Dirección |
| «Póngale jornada 24/7 para que salga» | La jornada la decide el administrador según la persona; y la 24/7 no exime de las reglas de descanso |
| «Agregue el punto de encuentro a la orden de servicio» | La orden tiene cuatro campos por diseño (INV-24) |
| «Que otro departamento emita las órdenes» | Solo la Dirección emite órdenes desde el 27 de octubre de 2026 |
| «Déjeme registrar después de las 15H00» | La Dirección reabre, el administrador cambia la ventana, o se registra un adicional |
