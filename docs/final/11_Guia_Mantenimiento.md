# 11 · Guía de Mantenimiento

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

---

## 1. Tareas periódicas

| Frecuencia | Tarea | Cómo |
|---|---|---|
| Diaria | Abrir la jornada | `POST /api/v1/cuadros` (administrador) |
| Diaria | Comprobar que los tres contenedores están «healthy» | `docker compose ps` |
| Semanal | Revisar errores del registro | `docker logs transporte-app 2>&1 \| grep '"nivel":"error"'` |
| Semanal | Consultas más lentas | `pg_stat_statements` |
| Semanal | Documentos de vehículos por vencer | Tarjeta «Documentos por vencer» de Flota y garajes |
| Mensual | Actualizar el maestro de personal | P-07. La rotación es mensual |
| Mensual | **Comprobar que toda ficha activa tiene jornada laboral** | Consulta de §8. Sin jornada no se convoca |
| Mensual | Publicar la cobertura por turnos y los turnos de conductores | «Personal y disponibilidad › Cobertura por turnos» y «Turnos de conductores» |
| Mensual | Respaldo verificado | `pg_dump` y **probar la restauración** |
| Trimestral | Revisar los parámetros con la Dirección y la DAF | «Ventanas y parámetros › Parámetros». «Modificado» marca los que se apartan de su valor de siembra |
| Trimestral | Revisar la matriz de traslados con la DAF | «Traslados entre zonales». La cobertura dice cuántos pares usan aún la regla general |
| Por despliegue | `migrate deploy` antes de levantar, en cada servidor | `DESPLIEGUE.md` del backend y `09_Manual_Despliegue.md` |
| Tras ciertas migraciones | Correr en modo reporte los scripts de datos heredados | §4.6 |

---

## 2. Antes de tocar el código

```bash
cd transporte-backend && npm test && npm run test:integracion && npm run lint:check && npm run build
cd ../transporte-frontend && npm test && npm run lint && npm run build
```

Estado de referencia del 5 de noviembre de 2026:

| Suite | Resultado |
|---|---|
| Backend unitarias | 2420 pruebas en 151 suites |
| Backend integración | 22 suites; **ocho fallan por fixtures desactualizados** (§5, punto 1) |
| Frontend | 2081 pruebas en 140 archivos |

La construcción del frontend exige `VITE_AUTH_PORTAL_URL`; en desarrollo va en
`.env.development.local`, que no se versiona.

---

## 3. Las reglas que no se deben romper

Están en los dos `CLAUDE.md` y se repiten aquí porque son las que más caro cuestan.

### Backend

1. **Las reglas de descanso del personal viven solo en `talento-operativo`.** Las del conductor
   que se miden por tramo viven solo en `asignacion-conductor.policy.ts`.
2. **Los umbrales son parámetros, nunca constantes.**
3. **`ActualizarTransporteDto` tiene exactamente dos propiedades.** Si la DAF debe escribir otra
   cosa, recibe su propio endpoint.
4. **Conductor y vehículo nacen nulos.**
5. **Toda escritura multitabla en `$transaction`, con la auditoría dentro.**
6. **Los eventos se emiten después de confirmar.**
7. **Cada validación cita su regla** en el comentario.
8. **Los mensajes se escriben para el funcionario.**
9. **`AdicionalesController` es la única escritura sin `VentanaCargaGuard`.**
10. **Un endpoint protegido declara su permiso** con `@RequierePermiso`; no se vuelve a `@Roles`.
11. **Las reglas únicas se consultan, no se copian**: `esLoteDeRegistro` (nunca
    `if (grupoRegistro)`), `pideVehiculoDaf` (nunca `'PROPIOS_MEDIOS'` suelto), `minutosTraslado`,
    `admiteJornada`, `representanteDeLote`.
12. **La ocupación del transporte sale solo de `t_tramo_transporte`.**

### Frontend

1. **No se introducen clases CSS nuevas.**
2. **No se alteran los colores del tema.**
3. **Los colores de banner los entrega el backend.**
4. **Las pantallas se montan según el permiso**; ruta y menú declaran los mismos.
5. **Los campos calculados no son campos.**
6. **Ninguna información depende solo del color.**
7. **Los mensajes del servidor se muestran tal cual**, por `traductorErrores`.
8. **Peticiones solo por `httpClient`.**
9. **La DAF escribe dos campos.** La prueba de `planificarDia.spec.tsx` los **cuenta**; si se agrega
   uno, caerá, y debe.
10. **La orden de servicio tiene cuatro campos**, en `CamposDeLaOrden.tsx`.
11. **Las fechas de calendario viajan como texto `AAAA-MM-DD`.**
12. **Un botón, un cajón, un mensaje**: `Boton`, `DrawerLateral`, `MensajeModal` / `toast` /
    `AvisoEnLinea`. Nada de `window.confirm` ni de modales propios.
13. **Lo capturado no se pierde**: el borrador del registro vive por (usuario, formulario, fecha) en
    `sessionStorage`, nunca en `localStorage`.

---

## 4. Cómo agregar cosas

### 4.1. Un parámetro de política

1. Migración con su `INSERT` en `t_parametro_politica`: tipo, descripción, unidad, rango y
   **`para_valor_siembra`**. La semilla se retiró el 19 de agosto de 2026.
2. Leerlo desde la política con `ParametroPoliticaService`, nunca como constante.
3. Darle grupo, etiqueta y «Afecta» en `transporte-frontend/src/config/catalogoParametros.ts`. Sin
   esa entrada aparece igual, en «Otros».

### 4.2. Un endpoint

1. DTO en `presentation/dto/`, con el mensaje del funcionario **declarado el último**.
2. Método en el controlador con `@RequierePermiso('modulo:accion')` y `PermisosGuard`.
3. Si el permiso es nuevo: migración en `t_permiso` y `t_rol_permiso`, y súmelo a
   `common/roles/matriz-permisos.ts` y al espejo del frontend, `src/pruebas/permisos.ts`.
4. Regla en el servicio o en una política pura; acceso a datos en el repositorio.
5. Prueba unitaria de la política y prueba de integración en `test/`.
6. Documentarlo en `06_Manual_API.md`.

### 4.3. Una pantalla

1. Página en `src/pages/`, compuesta con `EncabezadoPagina` y `PanelTabla`.
2. Entrada en `pantallas` (con sus `permisos`) y en `CONSTRUIDAS` de `config/routes.tsx`, y la misma
   lista de permisos en `config/navigation.ts`. **El tipo obliga** a lo primero;
   `rolesDeAdministracion.spec.ts`, a lo segundo.
3. Servicio sobre `httpClient`; hook sobre `useConsulta` si consulta.
4. Formularios en `DrawerLateral`; confirmaciones con `mensaje.confirmar`.
5. Prueba junto al componente.

### 4.4. Una migración

```bash
npx prisma migrate dev --name descripcion_en_espanol
npm run prisma:verificar
DATABASE_URL="…transportedb_pruebas…" npx prisma migrate deploy
```

**Nunca edite una migración ya aplicada.** Cree una nueva. Las de datos se escriben idempotentes y
dejan su traza en `t_auditoria` con una correlación `migracion-<fecha>`. Un `CHECK` o un índice
parcial nuevo se agrega también a `prisma/verificar-objetos.ts`.

### 4.5. Un formulario, una jornada laboral o un rol

- **Formulario**: es un dato desde que `ck_formulario_numero` admite 1..99 (29 de septiembre). Se da
  de alta en «Formularios del cuadro» y se configura en «Catálogos del cuadro». Su comportamiento
  (`variosPorPersona`, `cantidadPorPersona`, `maxPersonas`, `elegirUnaArea`, `cantidadPorZona`) son
  columnas de `t_formulario`, no ramas de código.
- **Jornada laboral**: «Ventanas y parámetros › Jornadas laborales». No se borra: se desactiva y
  quien la tiene la conserva.
- **Rol**: una migración `ADD VALUE` en el enumerado; desde ahí, su nombre y sus permisos son datos.

### 4.6. Scripts de datos heredados

Corren en el contenedor y **sin `--aplicar` solo reportan**. Antes de aplicarlos en producción:
`pg_dump` y revisar el reporte con el negocio.

| Script | Cuándo correrlo |
|---|---|
| `limpieza-catalogos.js` | Tras cargar catálogos heredados o al detectar zonales que son puntos |
| `tramos-desde-asignacion-clasica.js` | Si hay operativos asignados por la ruta clásica sin tramos |
| `tramos-registro-agrupado.js` | Tras desplegar el registro agrupado (4 de noviembre), o si la DAF ve dos solicitudes para una misma patrulla |

```bash
docker exec transporte-app node dist/scripts/<script>.js                          # reporte
docker exec transporte-app node dist/scripts/<script>.js --aplicar --usuario=<usua_id>
```

---

## 5. Deuda técnica conocida

| # | Qué | Dónde | Coste de arreglarlo |
|---|---|---|---|
| 1 | **Ocho suites de integración fallan por fixtures desactualizados**: `puntoEncuentro.create` sin `formulario` (operativos, matriz-consolidada, ordenes-servicio, solicitud-apoyo, asignacion-personal); `400` de `/personal/elegible` al enviar `inicio` (elegibilidad, personal-disponibilidad); texto de un mensaje en configuracion-catalogos | `transporte-backend/test/` | Bajo a medio. Son las pruebas, no el código; mientras tanto la integración no es señal fiable |
| 2 | Los contratos `docs/CONTRATO-*.md` que citan los `CLAUDE.md` no están versionados | `transporte-backend/.gitignore` (`docs/*`) | Bajo. Recuperarlos y exceptuarlos del `.gitignore` |
| 3 | Mis operativos, la matriz, la jornada y la orden muestran el nombre de la zona de la ciudad, no el de la zonal del formulario | `documentos`, `operativos` | Bajo. Hoy coinciden |
| 4 | `RolesGuard` sigue en el repositorio sin uso | `src/common/auth/guards/roles.guard.ts` | Bajo |
| 5 | `FUNCIONARIO` se conserva vacío en el enumerado | `e_rol_departamental` | Medio: borrar un valor exige recrear el tipo |
| 6 | `docs/` repetido en la raíz de `sigoc-cco` y en el frontend | raíz, frontend | Medio. Ya divergió una copia |
| 7 | Sin pantalla de auditoría | — | Medio |
| 8 | Sin pantalla de apertura de jornada | — | Bajo |
| 9 | Sin purga de `t_auditoria` ni de `t_historial_jornada` (PV-18) | — | Medio |

**Resueltas desde agosto:** la pantalla de administración de usuarios existe («Cuentas del cuadro»);
`react-pdf` volvió con uso real (visor del memorando); `pdf-lib` y `pdfmake` se usan (firma y
memorando); la tabla genérica `components/tabla/` y su advertencia de lint en `FilterByColumn.tsx`
se retiraron el 15 de octubre.

---

## 6. Evolución previsible

### 6.1. Lo que queda de la integración con Auth

La identidad real está hecha desde el 19 de agosto de 2026. Queda, y no es nuestro: que el canje
transmita el rol elegido (desajuste D-5), firma RS256 en lugar del secreto HS256 compartido y
revocación del cierre de sesión en el servidor. El detalle vive en
`transporte-frontend/docs/PLAN_INTEGRACION_AUTH.md`; la configuración, en
`07_Manual_Configuracion.md`.

### 6.2. Lo que hará falta con datos reales

| Cuando ocurra | Habrá que |
|---|---|
| Un departamento supere 200 operativos al día | Paginar P-02 contra el servidor; hoy pagina en el navegador con `usePaginaLocal` |
| El maestro pase de unos cientos | Filtrar P-07 en el servidor, no en memoria |
| Se pida el historial de auditoría | Endpoint y pantalla sobre `t_auditoria` |
| Se defina dónde aborda el personal | Calcular la duración del tramo con la matriz de traslados en lugar del parámetro por tipo |
| La DAF pida mover asignaciones arrastrando | Ampliar antes el inventario de clases (regla 1) y responder la pregunta Q-03 |

---

## 7. Operación detrás del Gateway

Lo que hay que conservar al tocar el despliegue de producción:

| Pieza | Valor | Si falla |
|---|---|---|
| `TRUST_PROXY` | 1 en preproducción, 2 en producción | El limitador de peticiones cuenta a todos los usuarios como uno |
| `X-Forwarded-Proto` | Lo reenvía `nginx.conf` del frontend | El backend cree que la petición llegó por HTTP |
| `NODE_EXTRA_CA_CERTS` | La intermedia de DigiCert, montada por `docker-compose.gateway.yml` | El canje responde 401 con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` en el registro |
| `VITE_AUTH_PORTAL_URL` | Horneada al compilar, una por ambiente | La imagen del frontend apunta al portal de otro ambiente |
| `NODE_ENV=production` y `AUTH_COOKIE_SECURE=true` | Juntas, solo con HTTPS | Sin HTTPS, la cookie `Secure` no viaja |

**Nunca** se usa `NODE_TLS_REJECT_UNAUTHORIZED=0` para salir del paso.

---

## 8. Salud del sistema

```sql
-- Consultas más lentas
SELECT calls, round(mean_exec_time::numeric,2) ms, round(total_exec_time::numeric,2) total, query
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Tamaño de las tablas
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) tam
FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- Crecimiento de la auditoría (no hay purga: PV-18)
SELECT count(*), min(audi_momento), max(audi_momento) FROM t_auditoria;

-- Fichas y conductores activos sin jornada laboral: no se convocan
SELECT 'personal' t, count(*) FROM t_funcionario WHERE func_activo AND jorl_id IS NULL
UNION ALL
SELECT 'conductores', count(*) FROM t_conductor WHERE cond_activo AND jorl_id IS NULL;
```

En la interfaz, Personal y disponibilidad y Flota y garajes marcan esas filas con «⚠ Sin jornada».

> **No hay política de purga de auditoría e histórico (PV-18).** `t_auditoria` y
> `t_historial_jornada` crecen sin límite.

---

## 9. Documentación que hay que mantener al día

| Cuando cambie | Actualice |
|---|---|
| Cualquier comportamiento | El `CLAUDE.md` del repositorio afectado, en la misma entrega |
| Un endpoint | `06_Manual_API.md` |
| El esquema | `05_Manual_Base_Datos.md` y `15_Diccionario_Datos.md` |
| Una pantalla | `01_Manual_Usuario.md` y `13_Catalogo_Funcional.md` |
| Una variable de entorno | `07_Manual_Configuracion.md` y las plantillas `.env.*.example` |
| El procedimiento de despliegue | `DESPLIEGUE.md` del backend; los manuales 08 y 09 remiten a él |
| Se resuelva un pendiente | `17_KNOWN_ISSUES.md` |
| Se cierre una versión | `18_CHANGELOG_FINAL.md` |

> **Ninguna IP de servidor en la documentación.** Se escriben marcadores como `<IP_SERVIDOR_AUTH>`
> o el nombre de host público.
