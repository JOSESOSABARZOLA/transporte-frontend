# 04 · Manual Técnico

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Para quien recibe el código · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Los dos repositorios

| Repositorio | Contenido | Puerto |
|---|---|---|
| `transporte-backend` | API NestJS + Prisma + PostgreSQL | 3003 |
| `transporte-frontend` | Aplicación React + Vite | 5180 |

Están en carpetas hermanas bajo `sigoc-cco/`. El `docker-compose.yml` vive en el backend y
construye las dos imágenes.

---

## 2. Pila tecnológica · lo que está instalado de verdad

### Backend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 11 |
| Lenguaje | TypeScript estricto | 5.x |
| ORM | Prisma Client | 6.19.3 |
| Base de datos | PostgreSQL | 18 |
| Validación | class-validator · class-transformer | 0.15 · 0.5 |
| PDF | **pdfkit** | 0.18 |
| Runtime | Node | ≥ 20.11 |

> `pdf-lib` y `pdfmake` figuran como dependencias de producción y **ningún archivo los importa**.
> Se eligió `pdfkit` porque trae sus propias fuentes incrustadas. Ver
> `DOCUMENTACION_INCONSISTENCIAS.md`.

### Frontend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | React | 19.2 |
| Construcción | Vite | 7 |
| Estilos | Tailwind CSS 4.2 + daisyUI | 5 |
| Rutas | react-router-dom | 7.13 |
| Formularios | Formik + Yup | 2.4 · 1.7 |
| Tablas | @tanstack/react-table | 8.21 |
| HTTP | axios, **solo dentro de `httpClient`** | 1.13 |
| Pruebas | Vitest + Testing Library + jsdom | 3 |

> **`react-pdf` se desinstaló el 2026-08-19.** Figuraba como dependencia y no se importaba en
> ningún archivo: el PDF lo genera el servidor y el navegador solo lo descarga como `Blob`. Arrastraba
> `pdfjs-dist`, una librería con historial de CVE graves —CVE-2024-4367 permitía ejecutar JavaScript
> arbitrario desde una fuente maliciosa—, así que era superficie de ataque a cambio de nada. La
> versión instalada estaba parcheada; el problema era cargarla sin motivo.

**Prohibido en el backend:** `typeorm`, `@nestjs/typeorm`, `dataSource.query`, funciones `fu_*`,
`$queryRawUnsafe`, y cualquier dependencia fuera de la pila sin autorización previa.
**Prohibido en el frontend:** `axios` fuera de `src/api/httpClient.ts`.

---

## 3. Cómo trabajar

```bash
# Backend
cd transporte-backend
npm install
npx prisma generate
npx prisma migrate dev
# Retirado el 2026-08-19: los catálogos entran con `npx prisma migrate deploy`
npm run start:dev            # http://localhost:3003/api/v1

npm run build                # debe salir con código 0
npm run lint:check           # debe salir con código 0
npm test                     # 738 pruebas unitarias, sin base de datos
npm run test:integracion     # 283 pruebas, EXIGE transportedb_pruebas
npm run prisma:verificar     # comprueba tablas, enums, CHECK e índices parciales

# Frontend
cd transporte-frontend
npm install
npm run dev                  # http://localhost:5180
npm test                     # 258 pruebas
npm run lint
npm run build
```

> **Las pruebas de integración usan su propia base**, `transportedb_pruebas`. El motivo es
> estructural: `ck_formulario_numero` acota el número de formulario entre 1 y 9, así que si el
> catálogo institucional ocupa los nueve casilleros, las suites no tienen dónde crear los suyos.
> La preparación está en `08_Manual_Instalacion.md`.

---

## 4. Arquitectura del backend

### 4.1. Cuatro capas por submódulo

```
src/modules/<submodulo>/
├── presentation/     Controllers + DTO. Sin reglas de negocio, sin Prisma
├── application/      Services y policies. Sin HTTP, sin Prisma directo
├── domain/           Objetos de valor con comportamiento. Sin dependencias externas
└── infrastructure/   Repositories. Único punto que toca PrismaService
```

### 4.2. Seis submódulos

| Submódulo | Responsabilidad |
|---|---|
| `configuracion` | Los nueve formularios, catálogos, ventanas de carga, parámetros |
| `talento-operativo` | Personal, disponibilidad, historial y **todas las reglas de descanso** |
| `cuadro-diario` | Ciclo de vida de la jornada |
| `operativos` | Núcleo. Registro, edición y asignación de personal |
| `transporte` | Conductor y vehículo. **Dos campos** |
| `documentos` | Matriz consolidada y órdenes de servicio |

### 4.3. Comunicación entre submódulos

**Solo por servicios publicados.** Importar el repositorio de otro submódulo es un defecto.

| Origen | Destino | Servicio |
|---|---|---|
| `operativos` | `talento-operativo` | `ElegibilidadService.verificar()` → veredicto y motivo, **no datos del funcionario** |
| `operativos` | `configuracion` | `FormulariosService.obtenerDefinicion()` |
| `transporte` | `operativos` | `OperativosService.asignarTransporte()` |
| `documentos` | `operativos`, `transporte` | Servicios de consulta |
| Todos | `cuadro-diario` | `CuadroDiarioService.puedeEscribir()` |

### 4.4. Cadena de autorización

```
IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard → ValidationPipe → Service
     401             403              403                423              400          409
```

- **`FormularioRolGuard` consulta la base**, nunca confía en el cuerpo de la petición. Solo puede
  actuar donde el código del formulario viaja en el cuerpo —el registro—; en `PATCH` y `DELETE` la
  propiedad la comprueba el servicio, con el mismo 403.
- **`VentanaCargaGuard` solo restringe la escritura.** Toda lectura pasa siempre: la Dirección
  revisa el cuadro precisamente cuando las ventanas ya vencieron.
- **`IdentidadGuard` es el único punto provisional del sistema.** Ver §7.

### 4.5. Reglas invariables

1. Las reglas de descanso viven **solo** en `talento-operativo`.
2. Los umbrales son parámetros de base de datos, **nunca constantes**.
3. `ActualizarTransporteDto` tiene **exactamente dos propiedades**.
4. Conductor y vehículo **nacen nulos**; solo la DAF los completa.
5. Toda escritura multitabla en `$transaction`, **con la auditoría dentro**.
6. Los eventos se emiten **después** de confirmar la transacción.
7. Cada validación cita su regla en el comentario: `RN-24`, `RN-43`.
8. Los mensajes de error se escriben para el funcionario.

---

## 5. Arquitectura del frontend

```
src/
├── api/           httpClient · correlationId
├── components/    common · forms · tabla · navbar · cuadro · transporte · matriz · ordenes · personal · catalogos · administracion
├── config/        routes · navigation · env · validationSchemas
├── context/       UserContext · ModalContext · ThemeContext
├── hooks/         useConsulta y los cuatro hooks del cuadro
├── interfaces/    Un archivo por dominio
├── layouts/       MainLayout · LoginLayout
├── pages/         Las nueve pantallas + LoginPage
├── services/      Un servicio por dominio, todos sobre httpClient
├── utils/         Funciones puras, con sus pruebas al lado
└── pruebas/       Configuración de Vitest
```

### 5.1. Reglas de interfaz

1. **No se introducen clases CSS nuevas.** El inventario permitido está en FASE5 §2.2.
2. **No se alteran los colores del tema** de daisyUI.
3. **Los colores de banner los entrega el backend.** Única excepción, y es de legibilidad: el
   color del texto sobre el banner se elige entre blanco y negro por luminancia.
4. **Las pantallas se montan según el rol**, no se ocultan controles.
5. **Los campos calculados no son campos**: se muestran como distintivos, nunca como `input`
   deshabilitado.
6. **Ninguna información depende solo del color.**
7. **Los mensajes del servidor se muestran tal cual.**
8. **Peticiones solo por `httpClient`.**
9. La DAF escribe **exactamente dos campos**; la prueba que lo protege los **cuenta**.
10. La orden de servicio tiene **cuatro campos**, pintados en un solo componente.
11. Las fechas de calendario viajan como texto `AAAA-MM-DD`, sin convertir a `Date`.

### 5.2. Carga diferida

Cada una de las nueve pantallas va en **su propio fragmento** con `lazy` y su propio `Suspense`.
`RutaProtegida` envuelve **por fuera** de `Suspense`: al revés, la aplicación descargaría el
paquete de una pantalla para descubrir después que el rol no puede verla.

El mapa `CONSTRUIDAS` en `config/routes.tsx` está tipado por la lista de rutas: **si faltara una
pantalla, TypeScript lo diría.**

---

## 6. Manejo de errores

El backend responde siempre con la misma forma:

```json
{
  "correlacionId": "687f6b30-…",
  "timestamp": "2026-08-07T09:52:47.288-05:00",
  "ruta": "/api/v1/…",
  "statusCode": 409,
  "codigo": "PATRULLA_CONSECUTIVA",
  "mensaje": "BENAVIDES FERNANDO salió en patrulla ayer…",
  "detalles": { }
}
```

El frontend lo traduce a una decisión de interfaz en `utils/errorApi.util.ts`:

| Código | Trato | Comportamiento |
|---|---|---|
| 400 | `campo` | Marca el campo implicado |
| 401 / 403 | `permiso` | Aviso de falta de permiso |
| 404 / 409 | `conflicto` | Aviso destacado, **sin perder lo capturado** |
| 423 | `ventana` | Bloquea el formulario |
| 500 y otros | `generico` | Mensaje genérico **más el identificador de correlación** |

Los dieciséis códigos de dominio están en `src/common/errors/codigos-error.ts`.

---

## 7. Identidad · resuelta el 2026-08-18

> **Este apartado se llamaba «el punto provisional».** Lo era: la identidad se declaraba con una
> cabecera y **cualquiera podía decir quién era**. Se retiró entero —modo provisional, catálogo
> `usuarios-prueba.ts` y cabecera `x-usuario-prueba`— y lo sustituye lo que sigue.

**La identidad sale de una cookie `HttpOnly`, y de ningún otro sitio.**

```
src/modules/identidad/
├── presentation/     sesion.controller.ts    exchange · session · logout
├── application/      sesion.service.ts       canje, verificación y perfil vigente
└── infrastructure/   usuario-sesion.repository.ts

src/common/auth/
├── token-sesion.ts                  firma y verificación. Funciones sueltas, no un provider
└── guards/identidad.guard.ts        lee la cookie y llena request.user
```

**`token-sesion.ts` no es un provider de Nest a propósito:** serlo crearía un ciclo de dependencias
entre `common/auth` y `modules/identidad`. Son funciones puras y no necesitan inyección.

**Maneja dos claves distintas**, y la distinción importa: `AUTH_JWT_SECRET` **verifica** lo que Auth
central firmó —se usa una sola vez, en el canje— y `SESSION_JWT_SECRET` **firma** lo que este módulo
emite. Igualarlas permitiría a cualquier módulo del ecosistema emitir sesiones válidas aquí.

**El guard sigue siendo síncrono**, que era la propiedad que se quiso conservar: verificar un JWT
propio no toca la red ni Redis. Y si `SESSION_JWT_SECRET` no está configurada, ignora la cookie con
una advertencia en lugar de reventar: antes producía un 500 en cada petición de ese usuario.

**El reparto de responsabilidad:** Auth central dice **quién** es; este módulo decide **qué rol**
tiene, resolviendo el `username` contra `t_usuario.usua_identificador_ad`. No es una preferencia:
el canje del Auth desplegado **no transmite el rol elegido**. Consecuencia operativa: **quien no
tenga fila en `t_usuario` no entra**, aunque Auth lo autentique.

**La cadena de autorización no cambió al llegar Auth.** Ésa es la medida del acierto del diseño
anterior, y es lo que este apartado predijo correctamente cuando aún era una previsión.

**Las pruebas de integración firman su propia cookie** con `test/identidad-de-prueba.ts`: ejercitan
el mismo camino que el navegador, no uno paralelo montado para ellas.

---

## 8. Pruebas

| Suite | Cantidad | Requiere base |
|---|---|---|
| Backend unitarias | **738** en 49 suites | No |
| Backend integración | **283** en 13 suites | Sí, `transportedb_pruebas` |
| Frontend | **258** en 17 archivos | No |

*Recuento del 19 de agosto de 2026, ejecutado, no estimado.*

> **Las trece suites de integración cambiaron de raíz con la etapa 5.** Usaban la cabecera
> `x-usuario-prueba`, cada una con su propia copia de `const como = …`. Ahora firman una cookie de
> sesión real con `test/identidad-de-prueba.ts`, así que **ejercitan el mismo camino que el
> navegador** en vez de uno que solo existía para ellas. Cada suite construye su propia aplicación
> de Nest y hubo que registrar `cookie-parser` en las trece: sin eso la cookie no se interpreta y
> todo responde 401.

**Qué se prueba y qué no.** Se prueban **decisiones**: que un formulario ajeno no se pueda
seleccionar, que la hoja de una orden no mencione a los demás funcionarios, que Retroceso solo
quite etiquetas con el campo vacío. **No** se prueba el maquetado; eso se comprueba mirando.

Dos técnicas que conviene conservar:

- **Contar en lugar de enumerar.** La prueba de P-03 cuenta los controles habilitados y exige que
  sean dos. Nombrarlos habría dejado pasar un tercer campo agregado más adelante.
- **Afirmar lo que no está.** La prueba de las órdenes comprueba que la hoja de cada persona **no
  menciona a las otras dos**.

---

## 9. Convenciones

1. Cabecera de comentario por archivo: app/módulo, feature, archivo, responsabilidad, desarrollador,
   fecha.
2. **Español** en nombres, comentarios y textos de interfaz.
3. Cero variables, imports o funciones sin usar. Sin `console.log`. Sin `any`.
4. Imports con **extensión explícita** (`.ts` / `.tsx`) en el frontend: Vite lo exige.
5. Commits cortos, en español, estilo convencional.
6. Antes de terminar: `build` y `lint` con código de salida 0 en ambos repositorios.

### Orden de los decoradores de validación

`class-validator` informa las restricciones **en orden inverso** al de declaración, y el filtro
muestra la primera como `mensaje`. **El mensaje que debe leer el funcionario se declara el último.**
