# Inconsistencias entre la documentación y el código

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Fase 10 · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## Criterio

**La fuente de verdad es el código.** Cada punto indica qué dice la documentación, qué hace el
sistema, cómo se comprobó y qué conviene hacer.

Se analizaron: el código de los dos repositorios, las tres carpetas `docs/`,
`IMPLEMENTATION_GUIDE.md`, `PLAN_DE_IMPLEMENTACION.md`, las siete migraciones, los archivos Docker,
los de configuración y los treinta informes de módulo.

| Gravedad | Significado |
|---|---|
| 🔴 | Puede inducir a una decisión equivocada |
| 🟠 | Documentación que promete algo que no existe |
| 🟡 | Divergencia menor o riesgo de divergencia futura |

---

## 🔴 I-01 · No existe `CHANGELOG.md`

**La documentación dice.** El encargo de esta fase lo enumera como fuente a analizar.

**El sistema.** No existe en ninguno de los dos repositorios ni en la raíz.

```bash
find . -maxdepth 3 -iname "CHANGELOG*" -not -path "*/node_modules/*"   →  sin resultados
```

**Efecto.** La historia del proyecto vive dispersa en treinta informes `M01`…`M30`, en el plan y en
el historial de git.

**Acción.** Se consolidó en `18_CHANGELOG_FINAL.md`. Si se quiere un `CHANGELOG.md` vivo, conviene
crearlo en la raíz y mantenerlo por versión.

---

## 🔴 I-02 · No hay Swagger ni OpenAPI

**La documentación dice.** El encargo pide analizar «la documentación Swagger/OpenAPI».

**El sistema.** `@nestjs/swagger` **no está instalado** y `main.ts` no lo configura. No hay
`/api/docs`, ni `swagger.json`, ni decoradores `@ApiProperty`.

```bash
grep -rn "swagger\|OpenAPI" transporte-backend/package.json src/main.ts   →  sin resultados
```

**Efecto.** No hay contrato ejecutable ni cliente generable. La referencia es prosa.

**Acción.** `06_Manual_API.md` documenta los 67 endpoints. Si se quiere Swagger, es trabajo nuevo:
instalar el paquete, configurarlo y anotar los DTO.

---

## ~~🔴 I-03 · El frontend ofrece un perfil que el backend no conoce~~ · ✅ **RESUELTA el 17-AGO-2026**

**Lo que decía la documentación.** FASE2 §4.1 describe siete roles, y el frontend ofrecía siete
perfiles; el backend solo conocía seis. El séptimo devolvía `401`.

**Cómo se resolvió.** `FUNCIONARIO` se agregó al enumerado `RolDepartamental`, y **exigió migración**
aunque pareciera una línea: es un enumerado de PostgreSQL, no una constante.

**Lo que sobrevive de esta inconsistencia, con otra forma.** El rol existe en el servidor, pero
**no en Auth central**: el negocio creó los seis roles de Transporte (53 a 58) y no el séptimo. Sin
un rol de Transporte que elegir en el portal, el funcionario de campo **no llega** al módulo.
**P-06 sigue inaccesible**, ahora por el ingreso y no por el servidor. Ver F-01 en
`17_KNOWN_ISSUES.md`.

---

## 🔴 I-03b · El frontend esperaba un valor de `acceso` que el backend nunca envía

**CORREGIDO el 2026-08-07.** Se deja constancia porque es el defecto más caro que tuvo el sistema y
la lección que deja vale más que el arreglo.

**El código decía.** `AccesoFormulario = "DUENO" | "COMPARTIDO"`, y cinco sitios comparaban
`acceso === "DUENO"`.

**El servidor envía.** `accesoDe()` devuelve **`ESCRITURA`**, `COMPARTIDO` o `LECTURA`. `DUENO` no
existe en el contrato.

```
GET /formularios/permitidos  (perfil DMIP Operativos)
→ 1 FIJOS acceso=ESCRITURA · 2 PMO acceso=ESCRITURA · …
```

**Efecto.** `esDueno` era **falso siempre**, así que en P-01 **los nueve formularios salían
deshabilitados y no se podía registrar nada**. La pantalla principal del sistema estaba inutilizada.

**Por qué ninguna prueba lo detectó.** Los objetos de prueba de `registro.spec.tsx` construían el
formulario con `acceso: "DUENO"`, **el mismo valor inventado que usaba el código**. Un ficticio que
repite la suposición del código confirma el error en lugar de detectarlo.

**Acción.** Corregidos los cinco sitios; el tipo pasó a `"ESCRITURA" | "COMPARTIDO" | "LECTURA"`; el
objeto de prueba se tipa ahora con `AccesoFormulario` en lugar de un literal escrito a mano —lo que
habría hecho fallar la compilación—; y se agregó una prueba de que **`LECTURA` tampoco habilita el
registro**, que es el caso de los roles transversales.

> **La lección, para las pruebas que se escriban después:** cuando un objeto de prueba inventa el
> valor de un campo del contrato, la prueba deja de comprobar la integración y pasa a comprobar la
> coherencia interna del código consigo mismo. **Los ficticios de un contrato se construyen con los
> valores del contrato**, no con los que uno cree recordar.

---

## 🔴 I-03c · El frontend inventó la forma de `GET /personal/elegible`

**CORREGIDO el 2026-08-07.** Tercer desajuste de la misma familia, y el que más lejos llegó.

**El código decía.** `PersonaElegible = { funcionarioId, nombre, area, elegible, codigo?, motivo? }`.

**El servidor envía.** `{ id, apellidos, nombres, area, cargo }` — cinco campos, **y la lista ya
viene filtrada**: descarta a quien no puede salir en lugar de marcarlo.

```
GET /personal/elegible?formulario=FIJOS&inicio=2026-08-07
→ [{"id":150,"apellidos":"SOSA BARZOLA","nombres":"JOSE LUIS","area":"OPERATIVOS","cargo":"Agente"}]
```

**Efecto.** `persona.nombre` era `undefined` y P-01 **se rompía con una excepción** al escribir en
la búsqueda: `Cannot read properties of undefined (reading toLowerCase)`. No se vio antes porque
`t_funcionario` estaba vacía y el arreglo nunca llegaba a recorrerse.

**Lo que revela, más allá del tipo.** `SelectorPersonal` estaba construido para mostrar a los no
elegibles **deshabilitados y con su motivo** —la decisión de interfaz más subrayada de M-22— sobre
un contrato que no existe. **El endpoint hace lo contrario: los esconde.** La función nunca pudo
haber funcionado.

**Acción.** La interfaz se adaptó al contrato real y el motivo aparece ahora al asignar, en el `409`,
que es lo que el plan pedía en su caso 7. La pérdida —que la persona desaparezca en lugar de
explicarse— queda registrada como **PV-37** y **F-08**, porque exige trabajo de backend.

---

## 🔴 I-03d · La interfaz `Formulario` tenía tres campos que no coinciden con el servidor

**CORREGIDO el 2026-08-07.** Cuarto desajuste de la misma familia, y el que más pantallas tocaba,
porque `Formulario` lo consumen las nueve.

| Campo | El frontend declaraba | El servidor envía | Consecuencia |
|---|---|---|---|
| `id` | `number` | **no lo enviaba** | **Ningún catálogo se podía dar de alta** |
| `condicionanteNoct` | `boolean` | `condicionanteNocturno` | El aviso de operativo nocturno de P-01 **nunca se mostró** |
| `areas` | `AreaPersonal[]` | `{ area, esCompartida }[]` | Sin efecto: ninguna pantalla lo lee |

Además el servidor envía `orden`, que la interfaz no declaraba.

**El síntoma.** P-08 componía las tres altas con `formularioIds: [formulario.id]`. Como `id` no
llegaba, enviaba `[undefined]` y el servidor respondía `400` con *«Los formularios se indican por su
identificador»* — un mensaje exacto que señalaba un campo que el administrador nunca escribió.

```
POST /administracion/catalogos/puntos   {"nombre":"…","zonalId":1,"formularioIds":[undefined]}
→ 400  Los formularios se indican por su identificador.
```

**Por qué importa más que los tres anteriores.** P-08 **es la pantalla que desbloquea PV-01**: la
matriz zonal ↔ punto de encuentro se carga ahí y no existe otra vía salvo la API. Mientras el alta
falló, la cascada de P-01 no podía llenarse por ningún camino de la interfaz.

**Acción.** `id` se agregó a `FormularioResponseDto` —faltaba en el servidor, que es la única fuente
posible: es una clave sustituta y las altas de catálogo la exigen—, y la interfaz se copió campo por
campo de él. Comprobado contra el sistema en marcha: el alta responde `201` y el punto aparece en la
cascada del formulario y la zonal donde se creó.

**La causa de los cuatro es la misma, y aquí se cerró.** Los objetos de prueba de `Formulario` se
construían con `as unknown as Formulario`, una conversión que apaga al compilador: por eso llevaban
`condicionanteNoct` y un `id` inventado sin que nada protestara. Se eliminó de los dos archivos que
la usaban, y ahora un `Formulario` de prueba al que le falte o le sobre un campo **rompe la
compilación**. Es la única comprobación que cubre los campos que ninguna prueba lee.

---

## 🔴 I-04 · `PENDIENTES-VALIDACION.md` existe en dos versiones que no coinciden

**El sistema.**

| Copia | Entradas PV | Máximo | Resueltos |
|---|---|---|---|
| Raíz `PENDIENTES-VALIDACION.md` | 17 | **PV-36** | 2 |
| `docs/`, `transporte-backend/docs/`, `transporte-frontend/docs/` | 10 | PV-26 | 0 |

**Efecto.** Quien consulte la copia de `docs/` **no verá los seis pendientes detectados durante la
implementación** (PV-31 a PV-36) ni sabrá que PV-25 y PV-26 están resueltos. Podría volver a
plantear al Product Owner una pregunta ya contestada.

**Acción.** **La copia válida es la de la raíz.** Conviene eliminar las tres de `docs/` y dejar un
enlace, o sincronizarlas por proceso.

---

## 🟠 I-05 · `IMPLEMENTATION_GUIDE.md` divergió entre repositorios

**El sistema.** Hay tres copias y **la del backend difiere** de las otras dos.

```
FASE2, FASE4, FASE5, PENDIENTES  →  raíz = backend = frontend
IMPLEMENTATION_GUIDE.md          →  backend ≠ raíz = frontend
```

**Efecto.** Dos desarrolladores pueden seguir instrucciones distintas creyendo que leen lo mismo.

**Acción.** Unificar. Es la demostración de que **triplicar la documentación no sale gratis**.

---

## 🟠 I-06 · FASE5 dibuja elementos que no existen

Tres esquemas de interfaz muestran controles que la implementación **no construyó**, con motivo
documentado en cada caso:

| Esquema | Qué dibuja | Qué hay | Por qué |
|---|---|---|---|
| §4.2 · P-03 | Una fila ya resuelta con acción «Revisar» | Solo pendientes | `GET /transporte/pendientes/:fecha` filtra por `PENDIENTE`; traerla exige otra fuente |
| §4.3 · P-04 | Columna «ACCIONES» con botón de emitir orden | Sin columna de acciones | Ese endpoint es contrato de M-26, no de M-25 |
| §4.5 · P-07 | Tabla global «AUSENCIAS REGISTRADAS» | Ausencias **por persona** | El contrato las entrega por funcionario (PV-35) |

**Acción.** Actualizar FASE5, o decidir que esos elementos se construyan. Están anotados como
limitaciones L-04, L-05 en `17_KNOWN_ISSUES.md`.

> **Y un quinto, del mismo tipo. Cerrado el 2026-09-02.**
>
> `FASE5` §7 —la tabla de validaciones de P-01— dice desde el diseño: «**Personal · al menos
> una persona · al enviar · `alert alert-error` sobre el bloque**». La regla 14 de
> `CLAUDE.md` decía lo contrario, en una sola línea: «el personal asignado **no** es
> obligatorio». Lo construido siguió a la regla, no al wireframe.
>
> No es el mismo caso que los tres de arriba —ahí FASE5 dibuja algo que no se construyó;
> aquí **dos documentos se contradicen** y el código eligió uno sin dejar constancia de que
> hubiera dos—. El negocio lo resolvió a favor de FASE5.
>
> Conviene notar el patrón: es la segunda vez en dos días que FASE5 tenía razón y la
> implementación había seguido otra fuente. La primera fue el `[✎] [🗑]` de la tabla de
> P-01, justo abajo.

> **Hubo un cuarto caso, y esta lista no lo tenía. Cerrado el 2026-09-01.**
>
> `FASE5` §4.1 (línea 257) dibuja la fila de la tabla de P-01 terminando en `[✎] [🗑]`. El resto de
> la documentación —prototipo, plan, M-22, M-23 y el manual— describe esa tabla como resultado de
> solo lectura y sitúa la corrección en P-02, **pero nadie escribió nunca que P-01 no debiera
> corregir**: la separación se argumentaba por propósito, no por prohibición. Era un hueco, no una
> decisión revocada, y llevaba meses sin que nadie lo mirara.
>
> El negocio lo resolvió a favor del wireframe. Queda anotado aquí porque el valor de I-06 está en
> **estar completa**: una lista de esquemas no construidos a la que le falta un caso no sirve para
> revisarla antes de tocar una pantalla, que es para lo que existe.

### Había un cuarto caso, y no estaba en esta lista

`FASE5` §4.1 dibuja la fila de la tabla de **P-01** terminando en **`[✎] [🗑]`** (línea 257). Se
construyó el **2026-09-01**, por decisión del negocio, y con ello el caso se cierra **al revés que
los tres de arriba**: no actualizando el esquema, sino haciéndolo cierto.

**Lo que este documento tiene que aprender del episodio** es que faltaba. Nadie lo había anotado,
así que durante meses ese `[✎] [🗑]` no fue ni una promesa pendiente ni una decisión revocada: fue
un dibujo que nadie miraba. Los tres casos de arriba están vigilados porque están escritos; el
cuarto sobrevivió invisible precisamente por no estarlo.

**Conviene revisar si hay un quinto.** Esta lista se compuso a mano, y una lista de discrepancias
compuesta a mano tiene exactamente el mismo defecto que acaba de destaparse.

---

## ~~🟠 I-07 · El plan describe una etapa E12 que no se ejecutó~~ · ✅ **RESUELTA del 17 al 19-AGO-2026**

**Lo que decía.** M-30 incluía «retirada de `SelectorRolPruebas` y `usuariosPrueba` en E12» y el modo
JWT del `IdentidadGuard`. Ninguna de las dos se había hecho, y el plan marcaba E12 como **P3,
«depende de un tercero»**.

**Cómo se resolvió.** E12 se ejecutó en cinco etapas. Los tres archivos de prueba del frontend y el
catálogo del backend **ya no existen**, y el guard verifica una cookie `HttpOnly` firmada por este
módulo.

**Y su advertencia era correcta**, conviene dejarlo escrito: *«retirar los perfiles de prueba hoy
dejaría la aplicación sin ninguna forma de autenticarse»*. Por eso el apagado fue la **etapa 5**,
después de que las cuatro anteriores estuvieran probadas. El orden lo tomó de aquí.

**Lo que costó y no estaba previsto:** las **trece suites de integración** usaban la cabecera de
pruebas, cada una con su copia de `const como = …`. Se sustituyeron por
`test/identidad-de-prueba.ts`, que firma una cookie real, de modo que ahora **ejercitan el mismo
camino que el navegador**.

---

## 🟠 I-08 · El PV-30 documentado no coincidía con lo que hay

**La documentación decía.** M-19 y PV-30 afirmaban que el logotipo «existe en el frontend **pero no
en el backend**».

**El sistema.** `transporte-backend/src/assets/LogoAmc.jpeg` **existe** desde la línea base. Pero
son **70 bytes: un PNG transparente de 1×1 con extensión `.jpeg`**.

```bash
ls -la src/assets/LogoAmc.jpeg          →  70 bytes
xxd src/assets/LogoAmc.jpeg | head -1   →  8950 4e47   ("\x89PNG")
```

**Efecto.** Es **peor que la ausencia**: hay un archivo con el nombre y la ruta correctos que no es
lo que aparenta. Conectarlo sin abrirlo publicaría un documento oficial con un píxel invisible donde
va el membrete.

**Acción.** **Ya corregido** el 6 de agosto en el comentario del exportador, en
`M19_MATRIZ_CONSOLIDADA.md` y en PV-30. Se deja constancia aquí porque es la clase de error que la
documentación puede propagar durante meses.

---

## 🟡 I-09 · Dependencias declaradas y no usadas

| Repositorio | Paquete | Comprobación |
|---|---|---|
| Backend | `pdf-lib` | Ningún `import`. Solo se usa `pdfkit` |
| Backend | `pdfmake` | Ningún `import`; solo se menciona en un comentario |
| Frontend | `react-pdf` | Ningún `import`; solo se menciona en un comentario de `routes.tsx` |

Las dos del backend son **dependencias de producción**, así que `npm ci --omit=dev` las instala
dentro de la imagen.

**Acción.** Retirarlas aligera la imagen. **No se hizo**: quitar una dependencia del producto es una
decisión del dueño de la pila, igual que agregarla. Registrado como D-03 y D-04.

---

## 🟡 I-10 · El `.env.example` del frontend declara variables de PostgreSQL

**El sistema.** `transporte-frontend/.env.example` contiene `PGHOST`, `PGPORT`, `PGUSER`,
`PGDATABASE` y `PGPASSWORD`.

**Efecto.** Un frontend **no se conecta a PostgreSQL**, y ninguna de las cinco se lee en el código.
Una plantilla que pide una contraseña de base de datos para un cliente de navegador induce a
ponerla, y a que acabe en un repositorio.

**Acción.** Retirarlas. Solo `VITE_API_BASE_URL` tiene efecto.

---

## 🟡 I-11 · El plan atribuye a `Table` un papel que ninguna pantalla cumple

**El plan dice.** «Al usar `Table`, memoizar `findRecordsFn` con `useCallback`», para M-22 en
adelante.

**El sistema.** **Ninguna de las nueve pantallas usa `Table`.** Filtra y pagina contra el servidor,
y ningún endpoint del módulo acepta filtros por columna. Además trae **dos botones de exportación a
CSV y PDF que no hacen nada**.

**Acción.** La advertencia sigue siendo válida **para cuando se use**. Documentado en
`11_Guia_Mantenimiento.md` §6.

---

## 🟡 I-12 · Cinco archivos de prueba con errores de tipo

**El sistema.** `npx tsc --noEmit` señala **11 errores en cinco archivos** de spec:

```
operativos.service.spec.ts               'ordenesEmitidas' does not exist  (×4)
operativos.service.spec.ts               Type '"CCF"' is not assignable to '"GENERAL"'  (×3)
historial-jornada.service.spec.ts        Type 'number' is not assignable to type 'Decimal'
personal-elegible.service.spec.ts        Expected 4 arguments, but got 3
capacidad-flota.service.spec.ts          Type 'string | null' is not assignable to type 'null'
operativos.integracion-spec.ts           Property 'horaFin' does not exist
```

**Efecto.** **Ninguno operativo**: `npm run build` los excluye y las pruebas del backend pasan.
Pero un `tsc --noEmit` limpio es una señal útil que hoy no se puede usar.

> **Eran cuatro archivos hasta el 07-AGO-2026.** `operativos.service.spec.ts` se sumó con la baja
> física de PV-10: el `armar()` de esa suite acepta `ordenesEmitidas` sin declararlo en su tipo de
> opciones. Es la señal de por qué conviene mantener este número en cero — la deuda crece con cada
> cambio y nadie lo nota, porque nada falla.

**Acción.** Corregirlos. Es deuda menor, y hoy son once líneas.

---

## 🔴 I-15 · `ADICIONALES` se ofrecía donde ningún catálogo lo prevé

**La regla.** RN-20 dice «los **catálogos que lo prevén** incluyen la opción `ADICIONALES`»: es
propiedad de cada catálogo. En el insumo aprobado `ADICIONALES` figura **únicamente en
`tiposControl`**, y solo de los formularios 2 (PMO) y 8 (INSP). En `puntosEncuentro` no aparece en
ninguno de los nueve.

**El sistema.** El esquema tenía **una sola columna por formulario**, `form_permite_captura_libre`,
y la pantalla la aplicaba a los dos desplegables: ofrecía capturar a mano un punto de encuentro que
ningún catálogo contempla — justo en los formularios cuyos puntos no están cargados por PV-01, que
es donde más tentador resultaba usarla.

**Y el servidor no lo impedía.** `ClasificacionControl` recibía la bandera desde M-14 y rechazaba un
tipo de control libre donde no correspondía; `UbicacionOperativa` no la recibía, así que **aceptaba
un punto libre en cualquiera de los nueve formularios**. La interfaz lo tapaba; una petición directa
entraba sin obstáculo.

**Corregido el 11-AGO-2026**, en el modelo y no solo en la pantalla: migración
`20260811120000_separa_la_captura_libre_por_catalogo`, y la semilla pasó a leer la bandera **del
propio insumo** en lugar de una lista escrita a mano.

---

## 🟡 I-16 · El mensaje del `NOMBRAMIENTO` cita un horario que no se aplica

**El mensaje.** Al rechazar un turno nocturno dice: «…cumple jornada de lunes a viernes de 08H00 a
16H30».

**El sistema.** La validación implementada es VAL-13, que solo declara «turno nocturno o fin de
semana». **Un operativo de 17H00 a 19H00 en día laborable se admite**, y con él las horas extra
ordinarias. Está razonado en `M12_POLITICAS_DESCANSO.md` §8.1 como decisión a confirmar.

**El problema no es la regla, es el texto**: anuncia un horario que no se comprueba, y quien lo lee
espera que el sistema lo aplique.

**Acción.** O el mensaje deja de citar el horario, o RN-26 se aplica entera. Lo segundo lo decide la
Dirección, no el desarrollo.

---

## 🟡 I-13 · El conteo de endpoints no estaba documentado

**El sistema.** **67 endpoints** en 18 controladores, contados sobre los decoradores. Los tres nuevos son los de sesión, del 17-AGO-2026.

FASE4 §8 describe los contratos pero no los enumera de forma que se pueda verificar.

**Acción.** `06_Manual_API.md` los lista todos con su rol.

---

## 🟡 I-14 · No hay pantalla para funciones que el plan da por cubiertas

| Función | Endpoint | Pantalla |
|---|---|---|
| Abrir la jornada | `POST /cuadros` | **No existe** |
| Reabrir la jornada | `POST /cuadros/:fecha/reabrir` | **No existe** |
| Administrar conductores y vehículos | `/administracion/conductores`, `/vehiculos` | **No existe** |
| Declarar capacidad de flota | `PUT /transporte/capacidad/:fecha` | **No existe** |
| Administrar usuarios y su enlace con personal | — | **No existe endpoint ni pantalla** |
| Consultar la auditoría | — | **No existe endpoint ni pantalla** |

**El plan enumera nueve pantallas y las nueve están construidas.** Estas funciones **no estaban
entre ellas**; se ejecutan por API o por base de datos.

**Efecto.** La última es la más grave: **bloquea P-06 por completo**.

**Acción.** Registrado como F-02 y L-10 a L-12 en `17_KNOWN_ISSUES.md`.

---

## Resumen

| # | Inconsistencia | Gravedad | Estado |
|---|---|---|---|
| I-01 | No existe `CHANGELOG.md` | 🔴 | Consolidado en el documento 18 |
| I-02 | No hay Swagger/OpenAPI | 🔴 | Documentado en el documento 06 |
| I-03 | Perfil de funcionario ausente en el backend | 🔴 | **Abierto.** Bloquea P-06 |
| I-03b | El frontend esperaba `acceso: "DUENO"`, que no existe | 🔴 | **Corregido** el 07-AGO. Inutilizaba P-01 |
| I-03c | El frontend inventó la forma de `/personal/elegible` | 🔴 | **Corregido** el 07-AGO. Rompía P-01 con una excepción |
| I-03d | `Formulario` sin `id` y con `condicionanteNoct` | 🔴 | **Corregido** el 07-AGO. Inutilizaba P-08, y con ella PV-01 |
| I-04 | `PENDIENTES-VALIDACION.md` en dos versiones | 🔴 | **Abierto.** Usar la de la raíz |
| I-05 | `IMPLEMENTATION_GUIDE.md` divergió | 🟠 | **Abierto** |
| I-06 | FASE5 dibuja elementos inexistentes | 🟠 | Documentado |
| I-07 | El plan describe E12, no ejecutada | 🟠 | Aclarado en la ficha de M-30 |
| I-08 | El logotipo no era lo que decía la documentación | 🟠 | **Corregido** el 06-AGO |
| I-09 | Tres dependencias sin usar | 🟡 | **Abierto**, es decisión del dueño |
| I-10 | Variables `PG*` en el frontend | 🟡 | **Abierto** |
| I-11 | El plan atribuye a `Table` un papel no cumplido | 🟡 | Documentado |
| I-12 | **Cinco** spec con errores de tipo | 🟡 | **Abierto**, y creció el 07-AGO |
| I-15 | `ADICIONALES` se ofrecía donde ningún catálogo lo prevé | 🔴 | **Corregido** el 11-AGO, en el modelo y en la pantalla |
| I-16 | El mensaje del `NOMBRAMIENTO` cita un horario que no se aplica | 🟡 | **Abierto.** Decisión de la Dirección |
| I-13 | Endpoints sin enumerar | 🟡 | Resuelto en el documento 06 |
| I-14 | Funciones sin pantalla | 🟡 | Documentado |

---

## Lo que conviene hacer primero

1. **I-04** · dejar una sola versión de `PENDIENTES-VALIDACION.md`. Es barato y evita replantear al
   Product Owner preguntas ya contestadas.
2. **I-03** · agregar el perfil de funcionario. Es pequeño y desbloquea media pantalla.
3. **I-05** · unificar `IMPLEMENTATION_GUIDE.md`.
4. **I-10** · retirar las variables `PG*` del frontend.

Los demás son documentales o decisiones que corresponden al dueño del producto.

**Y antes que todos ellos: contrastar las interfaces restantes de `src/interfaces` con el DTO que
las produce.** Cuatro de ellas —I-03b, I-03c, I-03d— se escribieron en M-21 sin consumidor y
adivinando la forma; las tres aparecieron el mismo día, en cuanto hubo datos reales. Quedan sin
contrastar `Transporte.ts`, `Documento.ts`, `CuadroDiario.ts`, `Alerta.ts` y la parte de
`Operativo.ts` que ninguna pantalla lee. Es lectura comparada, no desarrollo.

---

## Lo que se comprobó y **sí** coincide

Conviene decirlo, porque es la mayor parte:

- Las **27 tablas**, los **11 enumerados**, las **24 `CHECK`** y los **7 índices parciales**
  coinciden con FASE4.
- La **cadena de cuatro guardas** con sus códigos 401/403/403/423 está tal como se diseñó.
- Los **roles y sus formularios** coinciden con FASE2 §4.1.
- Los **ocho parámetros** coinciden en clave, tipo, rango y unidad.
- Las **seis ventanas** coinciden con lo sembrado.
- Las **nueve pantallas** existen, con sus rutas y sus roles.
- El **dato aislado de cuatro campos** se respeta en el modelo, el DTO, el servicio y la interfaz.
- La **restricción de dos campos de la DAF** se sostiene en los cuatro niveles descritos.
