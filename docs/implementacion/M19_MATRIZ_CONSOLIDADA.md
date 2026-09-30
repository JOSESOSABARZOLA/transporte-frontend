# M-19 · Matriz consolidada y exportación

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E8 · Bloque F · Prioridad **P1 · Alta** · Dependencias M-15 y M-17
Desbloquea M-20 y M-25 · Fecha: 2026-08-06

---

## 0. ES EL ENTREGABLE QUE ORIGINÓ EL ENCARGO

El proyecto nació de dos problemas. El segundo era este: **el cuadro completo circulaba por
WhatsApp y los intervenidos se anticipaban al operativo**.

La matriz es la respuesta, y su rasgo principal no es lo que muestra sino **a quién no se le
muestra**. PER-02 y RN-48: la vista consolidada es de la Dirección. Cada departamento ve lo suyo en
P-02; la DAF ve los nueve formularios, pero solo para asignar transporte.

| Regla | Qué exige |
|---|---|
| RN-47 | El cuadro completo deja de circular por canales informales |
| RN-48 | Solo la Dirección accede a la vista consolidada |
| RN-53 | Si un formulario no fue cargado, la matriz lo dice |
| RN-54 | La evidencia registra **el departamento responsable y la hora de cierre** |
| PER-02 | La matriz **no se sirve a perfiles departamentales** |

---

## 1. ARCHIVOS

Seis nuevos, más dos de prueba. **Sin migraciones**: la matriz solo lee.

```
src/modules/documentos/
├── application/
│   ├── reglas-matriz.ts              + .spec.ts   17 pruebas
│   ├── matriz-consolidada.service.ts + .spec.ts   11 pruebas
│   └── exportador-matriz.ts
├── infrastructure/
│   └── matriz.repository.ts
├── presentation/
│   ├── dto/matriz.dto.ts
│   └── matriz.controller.ts
└── documentos.module.ts

test/
└── matriz-consolidada.integracion-spec.ts         21 pruebas
```

**Modificado:** `src/app.module.ts`, que registra `DocumentosModule`. Con él **los seis submódulos
de la guía §6 quedan compuestos**.

---

## 2. LA RESTRICCIÓN, EN UN SOLO SITIO

`@Controller('matriz')` con `@Roles(DIRECTOR)` a nivel de clase. **Un solo rol, y ningún filtro
adicional dentro del servicio.**

Podría parecer prudente añadir una segunda comprobación en la capa de aplicación, pero sería crear
una segunda verdad sobre quién puede ver el cuadro entero: el día que las dos discrepen, nadie sabrá
cuál manda. La lista corta en el decorador es la que se revisa de un vistazo, y la prueba de
integración la verifica desde fuera con cinco perfiles distintos.

La exportación está igual de restringida, y también se prueba: un PDF sin control de acceso sería
exactamente el archivo que hoy circula por WhatsApp.

---

## 3. LA FILA DE EVIDENCIA (RN-53 y RN-54)

Hoy, cuando un departamento no carga su formulario, el cuadro simplemente no lo menciona: la omisión
desaparece y a la mañana siguiente nadie puede decir quién dejó de informar. La matriz **nombra al
responsable y la hora en que se le cerró la ventana**.

**Solo cuando la ventana venció** (caso 5 del plan). Mientras siga abierta, el formulario vacío es
un formulario que todavía se está cargando, y marcarlo como omisión sería acusar a alguien de no
haber hecho algo que aún puede hacer.

Una ventana **desactivada** tampoco vence: sin restricción horaria no hay omisión. Es el mismo
criterio que M-13 aplicó al avance del estado del cuadro, y tiene su propia prueba.

La decisión vive en `reglas-matriz.ts`, en funciones puras, y se consulta a M-08 **solo por los
formularios que resultaron vacíos**: preguntar por los nueve cuando ocho tienen carga sería trabajo
que nadie mira.

---

## 4. EL COSTE DE COMPONER LA MATRIZ

Es el caso 7 del plan, y la razón de que este submódulo tenga **repositorio propio de solo lectura**
en lugar de pedir los datos pieza por pieza a otros submódulos.

Nueve formularios con hasta cincuenta operativos, cada uno con personal, zonales, instituciones,
conductor y vehículo. Compuesto a base de llamadas por fila serían **cientos de consultas** para
dibujar una pantalla. Con `include`, son **tres lecturas**: el cuadro, los formularios y los
operativos.

`MatrizRepository` **no tiene un solo método de escritura**, y esa ausencia es la garantía de la
licencia con la que lee `t_operativo` —la misma que declararon M-11, M-12 y M-13—.

Trae además **conductor y vehículo**, que la carga anticipada de `operativos` deja fuera a
propósito: dos `JOIN` en cada listado de la jornada para un dato que solo la matriz y la pantalla de
transporte usan. Aquí sí hacen falta: son dos de las diez columnas.

---

## 5. EL DOCUMENTO EXPORTADO

Horizontal, con los banners de color de cada formulario y el bloque de firmas. **Sin ningún control
de interfaz**: no es una captura de la pantalla, es el documento que se archiva y se firma. Por eso
no existe la columna «ACCIONES» de FASE5 §4.3 — no hay de dónde sacarla, porque el PDF se compone
desde los datos y no desde la vista.

**Se usa `pdfkit`, que ya estaba instalado.** La guía lo lista entre las dependencias presentes
(§4.1) junto con `pdf-lib` y `pdfmake`; **no se agregó ninguna**. Entre las tres se eligió `pdfkit`
porque trae sus propias fuentes: `pdfmake` exige registrar archivos `.ttf` que habría que empaquetar
en la imagen del contenedor, y un documento que falla en producción por una fuente ausente es peor
que uno más sobrio.

El color del texto sobre cada banner se calcula por luminancia: escribir siempre en negro dejaría
ilegible el banner de los formularios oscuros. **PV-23 —la verificación formal de contraste— sigue
pendiente**, y esto no la sustituye.

---

## 6. API

| Método | Ruta | Roles |
|---|---|---|
| `GET` | `/matriz/:fecha` | **`DIRECTOR`** |
| `GET` | `/matriz/:fecha/exportar` | **`DIRECTOR`** |

**Sin `VentanaCargaGuard`**: la matriz es una consulta, y la Dirección la revisa precisamente
*cuando las ventanas ya vencieron*.

La respuesta trae la cabecera —orden de trabajo, fecha en lenguaje natural, semana, estado, totales
y el indicador de flota de M-18— y las nueve secciones con **su color**, sus filas y su evidencia.

**Los colores y las alertas viajan en el JSON** (caso 6). El frontend no los define ni los
interpreta: son dato institucional del Excel aprobado, y tenerlos en el cliente significaría que
cambiar el color de un formulario exige desplegar la interfaz. Las alertas se **transportan**, no se
recalculan: un segundo cálculo en el navegador podría discrepar del que ve el departamento en su
propia pantalla.

### Errores

| Situación | HTTP | Código |
|---|---|---|
| Fecha mal escrita o inexistente | 400 | `VALIDACION` |
| Sin identidad | 401 | `NO_AUTENTICADO` |
| Cualquier rol que no sea `DIRECTOR` | 403 | `ROL_NO_AUTORIZADO` |
| Fecha sin jornada abierta | 404 | `RECURSO_NO_ENCONTRADO` |

El 404 es deliberado: la matriz **de un día que nadie abrió** no es una matriz vacía, es una fecha
equivocada, y confundirlas ocultaría el error.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Carpeta | Resultado |
|---|---|---|
| `npm run build` | `transporte-backend` | código 0 |
| `npm run lint` | `transporte-backend` | código 0 |
| `npm test` | `transporte-backend` | **44 suites · 647 pruebas** |
| `npm run test:integracion` | `transporte-backend` | **12 suites · 259 pruebas** |
| `docker compose up -d --build transporte-app` | `transporte-backend` | imagen reconstruida, contenedor sano |
| `docker logs transporte-app` | — | las dos rutas mapeadas |

Sin migraciones: `npm run prisma:verificar` sigue dando 27 tablas, 11 enumerados, 24 restricciones y
7 índices parciales.

### 7.1. Los nueve casos del plan

| # | Caso | Resultado | Verificado |
|---|---|---|---|
| 1 | `GET /matriz/:fecha` con `DIRECTOR` | Formularios agrupados, con sus colores | ✅ |
| 2 | Ídem con `DMIP_OPERATIVOS` | `403` | ✅ también con `DMIP_INSPECCIONES` |
| 3 | Ídem con `DAF` | `403` | ✅ y el `ADMINISTRADOR_DMIP` |
| 4 | Formulario sin carga y ventana vencida | Fila de evidencia con departamento y hora | ✅ `DMIT · Instrucción · cierre 00H01` |
| 5 | Formulario sin carga y ventana **abierta** | **Sin** fila de evidencia | ✅ y tampoco con la ventana desactivada |
| 6 | Colores | Vienen en el JSON | ✅ |
| 7 | Número de consultas al componer | Acotado; sin consulta por fila | ✅ **unitaria** + evidencia en integración (§7.2) |
| 8 | Documento exportado | Horizontal, con banners y firmas, sin botones | ✅ `%PDF` real, con `Content-Disposition` |
| 9 | Matriz de un día completo | Menos de tres segundos | ✅ con **treinta operativos** |

### 7.2. Cómo se verifica el caso 7, y por qué así

**El número de consultas se afirma en la prueba unitaria**, donde las llamadas del servicio son
observables: `listarFormularios` y `listarOperativos` una vez cada una, con cincuenta operativos
igual que con cinco.

La primera versión de la prueba de integración intentaba contarlas con `prisma.$on('query')` y
**registraba cero**: el cliente no emite ese evento salvo que se construya con `log: ['query']`, y
`PrismaService` es de M-01. Cambiarlo para que una prueba pudiera mirar habría sido modificar un
módulo entregado por una comodidad de la prueba.

Se sustituyó por la medición que sí significa algo desde fuera: **treinta operativos compuestos en
menos de tres segundos**. Con una consulta por fila y por relación —personal, zonales,
instituciones, conductor, vehículo— serían más de ciento cincuenta viajes a PostgreSQL y el tiempo
se dispararía. Es evidencia indirecta, y se declara como tal.

### 7.3. Dos correcciones de la propia prueba

- **El prefijo del formulario no admite dígitos.** `IdentificadorOperativo` exige una sigla de solo
  letras (M-09), y la prueba usaba `M1`. Los tres registros fallaban con `400` antes de llegar a la
  matriz.
- **La caché de ventanas de M-08 no se enteraba.** La prueba escribía el horario directamente en la
  base para situar el vencimiento, pero `VentanaCargaService` guarda las seis ventanas en memoria y
  solo las descarta cuando se modifican por su propio servicio. El caso 4 pasaba «por casualidad»
  con la ventana anterior. Ahora la prueba invalida la caché explícitamente, y eso quedó escrito en
  el ayudante que lo hace.

---

## 8. LO QUE ESTE MÓDULO NO IMPLEMENTA

| Fuera de alcance | Dónde va |
|---|---|
| Órdenes de servicio individuales | **M-20**, con `DatoAisladoBuilder` |
| Pantalla P-04 | **M-25** |
| Filtro por formulario en la pantalla | **M-25**: la matriz entrega las nueve secciones y el filtro es de interfaz |

---

## 9. PENDIENTE DE VALIDACIÓN

- **Logotipo institucional en el documento exportado.** El plan lo pide y hoy se imprime la
  identificación institucional en texto. **Se necesita que la DNP entregue el logotipo para el
  backend.**

  > **Corrección del 2026-08-06 (M-30).** Este punto decía que el archivo existía en el frontend
  > «pero no en este repositorio». **Sí existe**: `transporte-backend/src/assets/LogoAmc.jpeg`,
  > desde la línea base. Lo que no existe es el logotipo: son **70 bytes, un PNG transparente de
  > 1×1 con extensión `.jpeg`**; el real está en el frontend y pesa 98 kB. La conclusión no cambia
  > —no se puede imprimir—, pero el motivo es peor: hay un archivo con el nombre y la ruta
  > correctos que no es lo que aparenta.
- **PV-23 · Verificación de contraste.** El color del texto sobre los banners se calcula por
  luminancia, que es una aproximación razonable y **no** la verificación formal que sigue pendiente.
- **PV-08 · Formato unificado del documento.** El de la orden de servicio sigue sin definirse; el de
  la matriz se compuso siguiendo el prototipo de FASE5 §4.3.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
