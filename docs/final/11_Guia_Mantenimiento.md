# 11 · Guía de Mantenimiento

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Tareas periódicas

| Frecuencia | Tarea | Cómo |
|---|---|---|
| Diaria | Abrir la jornada | `POST /api/v1/cuadros` (administrador) |
| Diaria | Comprobar que los tres contenedores están «healthy» | `docker compose ps` |
| Semanal | Revisar errores del registro | `docker logs transporte-app 2>&1 \| grep '"nivel":"error"'` |
| Semanal | Consultas más lentas | `pg_stat_statements` |
| Mensual | Actualizar el maestro de personal | P-07. La rotación es mensual |
| Mensual | Respaldo verificado | `pg_dump` y **probar la restauración** |
| Trimestral | Revisar los ocho parámetros con la Dirección | P-09 |
| Por despliegue | `migrate deploy` en las **dos** bases | Ver `09_Manual_Despliegue.md` |

---

## 2. Antes de tocar el código

```bash
cd transporte-backend && npm test && npm run test:integracion && npm run lint:check && npm run build
cd ../transporte-frontend && npm test && npm run lint && npm run build
```

Estado de referencia: **738 + 283 + 258 pruebas**, todo en verde, con una advertencia heredada de
lint en `FilterByColumn.tsx`.

---

## 3. Las reglas que no se deben romper

Están en los dos `CLAUDE.md` y se repiten aquí porque son las que más caro cuestan:

### Backend

1. **Las reglas de descanso viven solo en `talento-operativo`.** Si aparecen en otro submódulo, es
   un defecto.
2. **Los umbrales son parámetros, nunca constantes.**
3. **`ActualizarTransporteDto` tiene exactamente dos propiedades.** Si alguna vez la DAF debe
   escribir otra cosa, **no se amplía este DTO**: se discute si esa competencia le corresponde y,
   si le corresponde, se le da su propio endpoint.
4. **Conductor y vehículo nacen nulos.**
5. **Toda escritura multitabla en `$transaction`, con la auditoría dentro.**
6. **Los eventos se emiten después de confirmar.**
7. **Cada validación cita su regla** en el comentario.
8. **Los mensajes se escriben para el funcionario.**

### Frontend

1. **No se introducen clases CSS nuevas.**
2. **No se alteran los colores del tema.**
3. **Los colores de banner los entrega el backend.**
4. **Las pantallas se montan según el rol**, no se ocultan controles.
5. **Los campos calculados no son campos.**
6. **Ninguna información depende solo del color.**
7. **Los mensajes del servidor se muestran tal cual.**
8. **Peticiones solo por `httpClient`.**
9. **La DAF escribe dos campos.** La prueba los **cuenta**; si agrega uno, caerá, y debe.
10. **La orden de servicio tiene cuatro campos**, en un solo componente.
11. **Las fechas de calendario viajan como texto `AAAA-MM-DD`.**

---

## 4. Cómo agregar cosas

### 4.1. Un parámetro de política

1. Agregarlo al arreglo `PARAMETROS` de `prisma/seed.ts`, con tipo, descripción, unidad y rango.
2. Ejecutar la semilla.
3. **No hay que tocar la pantalla P-09**: se dibuja sola con su rango y su descripción.
4. Leerlo desde la política con `ParametroPoliticaService`, nunca como constante.

### 4.2. Un endpoint

1. DTO en `presentation/dto/`, con el mensaje del funcionario **declarado el último**.
2. Método en el controlador, con su `@Roles(...)`.
3. Regla en el servicio; acceso a datos en el repositorio.
4. Prueba de integración en `test/`.
5. Documentarlo en `06_Manual_API.md`.

### 4.3. Una pantalla

1. Página en `src/pages/`.
2. Entrada en `pantallas` y en `CONSTRUIDAS` de `config/routes.tsx`. **El tipo obliga**: si falta
   una, TypeScript lo dice.
3. Servicio sobre `httpClient`; hook sobre `useConsulta` si consulta.
4. Prueba junto al componente.

### 4.4. Una migración

```bash
npx prisma migrate dev --name descripcion_en_espanol
npm run prisma:verificar
DATABASE_URL="…transportedb_pruebas…" npx prisma migrate deploy
```

**Nunca edite una migración ya aplicada.** Cree una nueva.

---

## 5. Deuda técnica conocida

| # | Qué | Dónde | Coste de arreglarlo |
|---|---|---|---|
| 1 | Advertencia de lint por dependencias de `useEffect` | `components/tabla/FilterByColumn.tsx` | Bajo. Es la única del repositorio |
| 2 | `Table` genérico sin consumidores | `components/tabla/Table.tsx` | Ninguno hoy. Ver §6 |
| 3 | `pdf-lib` y `pdfmake` instalados y sin usar | `transporte-backend/package.json` | Bajo. Aligera la imagen |
| 4 | `react-pdf` instalado y sin usar | `transporte-frontend/package.json` | Bajo |
| 5 | `docs/` triplicado en tres carpetas | raíz, backend, frontend | Medio. Ya divergió una copia |
| 6 | Sin pantalla de auditoría | — | Medio |
| 7 | Sin pantalla de apertura de jornada | — | Bajo |
| 8 | Sin pantalla de administración de usuarios | — | **Alto: bloquea P-06** |

---

## 6. Sobre el componente `Table`

`components/tabla/Table.tsx` es instrumental heredado que **ninguna pantalla usa**. Filtra y pagina
**contra el servidor**, y ningún endpoint del módulo acepta filtros por columna.

Si alguna vez se usa:

- **Memoizar `findRecordsFn` con `useCallback`.** Sin memoizar, incluirla en las dependencias del
  efecto provoca un bucle de peticiones.
- Trae **dos botones fijos de exportación a CSV y PDF que no hacen nada**. Sacar el cuadro a un
  archivo no es una función que nadie haya pedido, y en un sistema nacido de una filtración no es
  un detalle menor.
- Sus acciones por fila abren modales del registro `ModalType`; el diseño pide `ModalConfirmacion`
  directo para el retiro.

---

## 7. Evolución previsible

### 7.1. Identidad real · E12 · **HECHA los días 17 a 19 de agosto de 2026**

> **Este apartado describía un trabajo futuro y ya está ejecutado.** Se conserva porque su
> predicción central resultó cierta, y eso es útil saberlo: **la cadena de autorización no cambió**.
> Los cinco pasos que enumeraba se cumplieron, más otros que no estaban previstos.

**Lo que efectivamente ocurrió:**

| Previsto | Realidad |
|---|---|
| «Un solo archivo cambia» | El guard, sí. Pero además hizo falta un submódulo nuevo, `src/modules/identidad/`, con los tres endpoints de sesión |
| Implementar el modo JWT en el guard | Hecho, y **sigue siendo síncrono**: verificar el token propio no toca la red |
| Apagar el modo provisional | Retirado entero, no apagado: variable, cabecera y catálogo |
| Retirar los tres archivos del frontend | Hechos, más `LoginPage` como formulario |
| Resolutor de token en `httpClient` | **No hizo falta.** La cookie es `HttpOnly` y viaja sola con `withCredentials: true` |

**Lo que no estaba previsto y costó:**

- **Ninguna migración**, se dijo. Hubo dos: `FUNCIONARIO` en el enumerado `RolDepartamental`, y un
  índice único sobre `usua_identificador_ad`.
- **Las trece suites de integración usaban la cabecera**, cada una con su copia de `const como = …`.
  Se sustituyeron por `test/identidad-de-prueba.ts`, que firma una cookie real.
- **Tres defectos que solo aparecieron en un navegador**, invisibles para `curl`. Ver
  `PLAN_INTEGRACION_AUTH.md` §13.

**Lo que queda, y no es nuestro:** el rol `Transporte - Funcionario` en Auth —sin él P-06 es
inaccesible— y que el canje devuelva `roles` y el token lleve `subsystemId`.

**Para mantenerlo:** el detalle vivo está en `PLAN_INTEGRACION_AUTH.md`; la configuración, en
`07_Manual_Configuracion.md` §2.3 y §2.5.

### 7.2. Lo que hará falta con datos reales

| Cuando ocurra | Habrá que |
|---|---|
| Un departamento supere 200 operativos al día | Paginar P-02 contra el servidor con `formulario` y `fecha` |
| El maestro pase de unos cientos | Filtrar P-07 en el servidor, no en memoria |
| Se pidan filtros por columna reales | Agregarlos al endpoint **antes** de usar `Table` |
| Se pida reactivar catálogos | `GET` de administración con `incluirInactivos` (PV-36) |
| Se pida el historial de auditoría | Endpoint y pantalla sobre `t_auditoria` |

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
```

> **No hay política de purga de auditoría e histórico (PV-18).** `t_auditoria` y
> `t_historial_jornada` crecen sin límite. Conviene decidirlo antes de que sea un problema.

---

## 9. Documentación que hay que mantener al día

| Cuando cambie | Actualice |
|---|---|
| Un endpoint | `06_Manual_API.md` |
| El esquema | `05_Manual_Base_Datos.md` y `15_Diccionario_Datos.md` |
| Una pantalla | `01_Manual_Usuario.md` y `13_Catalogo_Funcional.md` |
| Una variable de entorno | `07_Manual_Configuracion.md` |
| Se resuelva un pendiente | `PENDIENTES-VALIDACION.md` y `17_KNOWN_ISSUES.md` |
| Se cierre una versión | `18_CHANGELOG_FINAL.md` |

> **Use la copia de la raíz.** `docs/` existe en tres sitios y `IMPLEMENTATION_GUIDE.md` ya divergió.
> Ver `DOCUMENTACION_INCONSISTENCIAS.md`.
