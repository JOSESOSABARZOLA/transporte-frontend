# 10 · Manual de Soporte

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Para mesa de ayuda y primera línea · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Lo primero que hay que pedir

**El identificador de correlación.** Aparece en los mensajes de error genéricos y en toda respuesta
del servidor, en la cabecera `x-correlation-id`. Con él se localiza la petición exacta:

```bash
docker logs transporte-app 2>&1 | grep '687f6b30-ffa4-490a-b520-6ffb76f2d36e'
```

Si no lo tiene, pida: **perfil usado, hora aproximada, pantalla y qué intentaba hacer**.

---

## 2. Diagnóstico rápido

```bash
docker compose ps                                          # ¿los tres «healthy»?
curl -s http://localhost:3003/api/v1/estado                # ¿responde el backend?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/health
docker logs --tail 50 transporte-app 2>&1 | grep '"nivel":"error"'
```

---

## 3. Incidencias frecuentes

### 3.1. «Su perfil no tiene formularios asignados en el cuadro»

**No es un fallo de la pantalla: está diciendo la verdad.**

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc "SELECT count(*) FROM t_formulario;"
```

| Resultado | Causa | Solución |
|---|---|---|
| `0` | Las migraciones no se aplicaron | `npx prisma migrate deploy` |
| `9` | El perfil no tiene formularios propios | Compruebe el rol elegido |

### 3.2. Toda petición responde `401`

```bash
# ¿Está configurada la clave con que este módulo firma la sesión?
docker logs transporte-app 2>&1 | grep -i "SESSION_JWT_SECRET"   # bien: sin resultados

# ¿Llega la cookie? En el navegador: Application → Cookies → cuadro_colores_sesion
curl -s -o /dev/null -w "%{http_code}
" http://localhost:3003/api/v1/auth/session   # sin cookie: 401
```

| Situación | Qué significa | Qué hacer |
|---|---|---|
| `401` en todo, y la cookie **no** existe en el navegador | La sesión nunca se estableció, o caducó (8 h) | Volver a ingresar por el portal |
| `401` en todo, y la cookie **sí** existe | `SESSION_JWT_SECRET` cambió o está vacía: la firma ya no valida | Revisar la variable y volver a ingresar |
| `403` al ingresar, con mensaje sobre el alta | Auth le autenticó, pero **no tiene fila en `t_usuario`** o está desactivado | Darlo de alta con `usua_identificador_ad` |
| El portal no lo trae de vuelta | La ruta del **módulo 80** en Auth no apunta al frontend | Corregirla en Auth. Hoy: `localhost:5180` |

> **La cookie es `HttpOnly`**: no la verá desde la consola del navegador, solo en el panel de
> almacenamiento. Es a propósito, y es lo que impide que un script se lleve la sesión.

### 3.3. El perfil «Funcionario de campo» no funciona

**Es un defecto conocido.** El selector lo ofrece pero el servidor solo conoce seis perfiles; el
séptimo devuelve `401`. **P-06 «Mis órdenes» no se puede usar todavía.** Ver `17_KNOWN_ISSUES.md`.

### 3.4. «Su ventana de carga cerró a las 15H00»

Es el comportamiento correcto (RN-56). Opciones:

1. Esperar al día siguiente.
2. La Dirección **reabre** el cuadro, si procede.
3. El administrador cambia la hora de cierre desde P-09. Rige de inmediato.

### 3.5. El desplegable de punto de encuentro está vacío

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc "SELECT count(*) FROM t_punto_encuentro;"
```

Si devuelve `0`, es **PV-01**: la matriz zonal ↔ punto nunca se entregó. Se carga desde
**P-08 · Catálogos del cuadro**.

### 3.6. No aparece nadie en el selector de personal

Tres causas posibles, en este orden:

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc "SELECT count(*) FROM t_funcionario;"
```

1. **`0`** → el maestro está vacío (**PV-02**). Se carga desde P-07.
2. Hay personal pero **no del área que admite el formulario**.
3. Hay personal del área, pero **no puede salir** por una ausencia vigente o por las reglas de
   descanso. **Desde el 11-AGO-2026 esto se distingue en la propia pantalla**: esas personas
   aparecen deshabilitadas y con su motivo, así que la causa 3 ya no se confunde con la 2 —en la
   2 la persona no aparece en absoluto—.

Si aun así hace falta comprobarlo en la base:

```bash
docker exec transportedb psql -U postgres -d transportedb -tAc \
  "SELECT f.func_apellidos, f.func_area, d.disp_estado, d.disp_hasta
     FROM t_funcionario f
     LEFT JOIN t_disponibilidad d
       ON d.func_id = f.func_id AND CURRENT_DATE BETWEEN d.disp_desde AND d.disp_hasta
    WHERE f.func_activo;"
```

Una fila con `disp_estado` no nulo es alguien ausente hoy: esa es la explicación que la pantalla
todavía no da.

### 3.7. «El formulario … tiene varios prefijos de identificador y ninguno está marcado como predeterminado»

Es **PV-27**, y afecta a los formularios **2, 5, 6, 7 y 8**. Falta el criterio de qué prefijo
corresponde a cada área. Los formularios **1, 3, 4 y 9** funcionan.

**No lo resuelva marcando uno al azar**: el código del operativo aparece en la matriz y en las
órdenes, y uno equivocado dice algo que no es.

### 3.8. No se puede cerrar el cuadro

El mensaje nombra el operativo: hay un nocturno con vehículo obligatorio sin conductor. La DAF debe
asignarlo, o declararlo por propios medios.

### 3.9. «Vuelva a abrirlo y guarde de nuevo para no sobrescribir el trabajo de otra persona»

Conflicto de concurrencia: alguien modificó el operativo mientras el usuario lo editaba. **Es una
protección, no un error.** Recargar y repetir el cambio.

### 3.10. El PDF se descarga vacío o corrupto

Compruebe que el navegador no bloquea la descarga. El documento lo genera el servidor; si el
problema persiste, busque el error en el registro con el identificador de correlación.

### 3.11. Una pantalla nueva no aparece tras actualizar

Imagen del frontend antigua. `docker compose build` reconstruye las dos.

### 3.12. Las horas no cuadran

```bash
docker exec transporte-app sh -c 'date'      # debe terminar en -05
```

Si no dice `-05`, `TZ` está mal y **las ventanas cierran a otra hora**. Es la avería más silenciosa
del sistema.

---

## 4. Tabla de códigos de error

| Código | Significa | Primera línea |
|---|---|---|
| `VENTANA_CARGA_CERRADA` | Fuera de horario | Explicar el horario |
| `FORMULARIO_NO_AUTORIZADO` | Formulario ajeno al rol | Comprobar el perfil |
| `ROL_NO_AUTORIZADO` | El rol no puede esa operación | Comprobar el perfil |
| `CAMPOS_NO_PERMITIDOS` | Se enviaron campos fuera de contrato | **Escalar**: es un defecto |
| `PERSONA_NO_DISPONIBLE` | Vacaciones, reposo, permiso | Comprobar en P-07 |
| `CONTRATO_NO_ADMITE_TURNO` | Contrato ocasional en turno no permitido | Es correcto (RN-26) |
| `PATRULLA_CONSECUTIVA` | Salió en patrulla ayer | Es correcto (RN-24) |
| `TOPE_SALIDAS_PESADAS` | Excedió las salidas del período | Es correcto (RN-25) |
| `SOLAPAMIENTO_HORARIO` | Ya está en otro operativo a esa hora | Es correcto |
| `JORNADA_MAXIMA_SUPERADA` | Excede las horas del día | Es correcto (RN-36) |
| `CUPO_COMPARTIDO_SUPERADO` | El rol compartido agotó su cupo | Es correcto (PER-06) |
| `AREA_NO_ADMITIDA` | El formulario no admite esa área | Comprobar el área en P-07 |
| `CONDUCTOR_PATRULLA_CONSECUTIVA` | Descanso del conductor | Es correcto |
| `CONDICIONANTE_NOCTURNO` | Nocturno sin conductor | La DAF debe asignarlo |
| `CUADRO_CERRADO` | La jornada está cerrada | La Dirección puede reabrir |
| `CONFLICTO_CONCURRENCIA` | Otro usuario modificó el dato | Recargar y repetir |

**La mayoría no son averías: son el sistema protegiendo a una persona.** Antes de escalar,
compruebe si el mensaje describe una regla.

---

## 5. Cuándo escalar

| Situación | A quién |
|---|---|
| `CAMPOS_NO_PERMITIDOS` o error `500` | Desarrollo |
| Un contenedor no llega a «healthy» | Infraestructura |
| Las horas no coinciden con `-05` | Infraestructura |
| Falta un dato maestro (PV-01, PV-02, PV-03) | **Product Owner o DAF**, no desarrollo |
| Un parámetro de política debe cambiar | **Dirección**, y lo aplica el administrador |
| Alguien pide ver el cuadro completo sin ser Dirección | **No se concede.** Es el requisito que originó el encargo |

---

## 6. Consultas útiles

```sql
-- Estado de la jornada
SELECT cuad_fecha, cuad_estado, cuad_orden_trabajo FROM t_cuadro_diario ORDER BY cuad_fecha DESC LIMIT 7;

-- Operativos del día con su transporte
SELECT oper_identificador, oper_hora_inicio, oper_hora_fin, oper_estado_transporte, oper_alerta_activa
FROM t_operativo o JOIN t_cuadro_diario c ON c.cuad_id = o.cuad_id
WHERE c.cuad_fecha = CURRENT_DATE AND o.oper_activo;

-- Qué se le hizo a un operativo
SELECT audi_accion, audi_usuario, audi_momento, audi_cambios
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
UNION ALL SELECT 't_conductor', count(*) FROM t_conductor;
```

> **Consulte, no modifique.** Un cambio hecho por SQL no pasa por las reglas de negocio y **no deja
> traza en la auditoría**.

---

## 7. Lo que soporte no puede resolver

| Petición | Por qué no |
|---|---|
| «Deme acceso a la matriz completa» | El **documento exportable** es exclusivo de la Dirección (RN-44, RN-48): es el origen del encargo. **Si quien pregunta es DMIT Instrucción**, ya tiene la jornada en pantalla —P-13, «Jornada del Día»—; compruebe que su cuenta lleve ese rol antes de escalar |
| «Sáltese la regla de descanso por esta vez» | Protege a una persona. Se cambia el parámetro, con decisión de la Dirección |
| «Agregue el punto de encuentro a la orden de servicio» | La orden tiene cuatro campos por diseño (INV-24) |
| «Déjeme registrar después de las 15H00» | La Dirección reabre, o el administrador cambia la hora |
