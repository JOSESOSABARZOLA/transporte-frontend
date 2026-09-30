# M-28 · Pantalla P-08 · Catálogos del cuadro

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P2 · Media** · Dependencias M-07, M-21
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. ES LA PANTALLA QUE DESBLOQUEA PV-01

El filtrado en cascada de P-01 —formulario → zonal → punto— está construido desde M-22 y no
funciona con datos reales, porque **la matriz de correspondencia zonal ↔ punto nunca se entregó**.
Es el primero de los cinco bloqueantes del proyecto.

Aquí es donde se carga. Cada punto se da de alta **dentro de una zonal y de un formulario**, que son
exactamente las dos coordenadas que la cascada necesita. Mientras el Product Owner no entregue la
matriz, esta pantalla permite construirla a mano; cuando la entregue, será donde se verifique.

---

## 1. ARCHIVOS

Cuatro nuevos, uno de prueba y cuatro modificados.

```
src/
├── pages/
│   └── AdminCatalogosCuadroPage.tsx                 (nuevo)
├── components/catalogos/                            (nuevo)
│   ├── TablaCatalogo.tsx · ModalCatalogo.tsx
│   ├── SelectorFormularioAdmin.tsx
│   └── catalogos.spec.tsx                           15 pruebas
├── interfaces/Formulario.ts     (modificado: contratos de administración)
├── services/catalogoCuadro.service.ts (modificado: nueve operaciones de administración)
├── config/validationSchemas.ts  (modificado: tres esquemas de alta)
└── config/routes.tsx            (modificado: la ruta real sustituye al marcador)
```

**Sin dependencias nuevas.**

---

## 2. LO QUE FALTA EN EL CONTRATO · PV-36

`AdministracionCatalogosController` expone **nueve operaciones de escritura y ningún `GET`**. Para
leer hay que usar `GET /formularios/:codigo/catalogos`, que es el endpoint operativo y filtra
`activo: true` en las tres consultas.

De ahí salen dos consecuencias, y ninguna se disimula:

1. **Un valor desactivado no se vuelve a listar.** Desaparece de la tabla, que para el caso 2 está
   bien —el mensaje del servidor explica que se desactivó y cuántos operativos lo usan—, pero
   significa que **no se puede reactivar desde la interfaz**, aunque el `PUT` acepte `activo: true`.
   Es una puerta de un solo sentido, y la confirmación de baja lo advierte con esas palabras.
2. **La tabla no puede mostrar una columna de estado**, porque `PuntoResponseDto`,
   `TipoControlResponseDto` e `InstitucionResponseDto` no traen `activo`. Todo lo listado está
   vigente por construcción, así que el contador dice «N vigentes» en lugar de fingir un filtro.

**Registrado como PV-36.** La solución es de backend —un `GET` de administración con
`incluirInactivos`, y `activo` en las tres respuestas— y es trabajo sobre M-07, que este módulo no
tiene asignado.

---

## 3. UNA TABLA Y UN MODAL PARA LOS TRES CATÁLOGOS

Puntos, tipos de control e instituciones se administran igual: se listan, se dan de alta, se
corrigen y se desactivan. Lo único que cambia son las columnas —el punto lleva su zonal, la
institución lleva sigla y denominación— y los campos del formulario.

`TablaCatalogo` recibe sus columnas como datos y `ModalCatalogo` recibe sus campos y su esquema.
**Tres tablas y tres modales casi idénticos son exactamente el hallazgo D-01** que costó una
refactorización en M-22; aquí se evita desde el principio. El día que haya que cambiar cómo se avisa
una baja, hay un solo sitio donde hacerlo.

---

## 4. LA PANTALLA NO PROMETE LO QUE NO HACE

RF-058 e INV-22: un valor usado en cuadros históricos **se desactiva, no se elimina**. La interfaz
lo dice con esas palabras, en tres sitios:

| Dónde | Qué dice |
|---|---|
| Aviso permanente arriba | «Los valores no se eliminan: se desactivan» y **por qué** — para que los operativos anteriores se puedan leer |
| El botón de cada fila | **«Desactivar»**, no «Eliminar». Hay una prueba que comprueba que la palabra «Eliminar» no aparece |
| La confirmación | Nombra el valor, explica que no se elimina y **advierte que no se podrá reactivar** |

Un botón que promete borrar y desactiva enseña al administrador a desconfiar de lo que lee, y
después no cree tampoco los avisos que sí importan.

Y el mensaje de éxito es **el del servidor**, que dice cuántos operativos anteriores usan el valor.
Es lo que convierte el aviso en una explicación en lugar de en una negativa.

---

## 5. TRES DECISIONES

**El selector no es `SelectorFormulario`.** Aquel distingue dueño de compartido y deshabilita los
que el rol no puede escribir, porque en P-01 elegir un formulario ajeno sería registrar donde no
corresponde (PER-06). Aquí los nueve son administrables: el `ADMINISTRADOR_DMIP` es un rol transversal y
`GET /formularios/permitidos` se los devuelve todos con `acceso: LECTURA`. Reutilizar aquel
componente con una excepción habría dejado que el mismo control significara «puede escribir» en una
pantalla y «existe» en otra.

**Al crear se envía siempre `formularioIds`.** Omitirlo no significa «todos»: `crearPunto` vincula a
la lista recibida, y sin ella el valor queda sin vincular a ningún formulario y no aparece en
ninguna cascada. Se envía el que se está administrando, y el selector lo explica debajo.

**El nombre único dentro de la zonal no se comprueba aquí.** `uq_punto_nombre_zonal` es un índice
compuesto; comprobarlo en el navegador exigiría tener todos los puntos de esa zonal —incluidos los
de otros formularios, que esta pantalla no recibe— y aun así dos administradores trabajando a la vez
lo esquivarían. Llega como rechazo del servidor **con el nombre del punto que ya existe**, se
muestra dentro del modal y no se pierde lo escrito: quien lo ve tiene que poder corregir esa
palabra, no volver a escribir el formulario.

---

## 6. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **12 archivos · 171 pruebas** (15 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** |

### 6.1. Los cuatro casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Alta de punto en una zonal y un formulario · aparece en la cascada de P-01 | ⏳ el alta envía zonal y formulario; **que aparezca en P-01 exige backend** |
| 2 | Eliminar un valor en uso · se desactiva, con aviso | ✅ el botón dice «Desactivar» y **no** existe «Eliminar»; el aviso lo redacta el servidor |
| 3 | Nombre duplicado en la misma zonal · rechazado | ✅ el rechazo se muestra sin perder lo escrito; y se afirma que **no** está en el esquema |
| 4 | Cambiar de formulario · los tres catálogos se recargan | ✅ el selector; la recarga la hace `useCatalogosFormulario` con el código como dependencia |

### 6.2. Qué queda pendiente de mirar

- **El caso 1 solo se cierra con backend y con la matriz.** Que un punto recién creado aparezca en
  la cascada de P-01 depende de `puntosDeFormularioYZonal`, no de esta pantalla. Es además el caso
  que **cierra el circuito completo del sistema**: cargar un punto aquí y usarlo allá.
- **Maquetación** a 375 px: las tres tablas van en `overflow-x-auto` y los modales son `max-w-lg`
  con desplazamiento propio, pero afirmarlo exige abrirlo.
- **El acceso con otro perfil** no está entre los casos de este módulo, pero aplica igual que en
  M-25 y M-27: `RutaProtegida` más `@Roles(ADMINISTRADOR_DMIP)`.

---

## 7. PENDIENTE DE VALIDACIÓN

- **PV-36 · la administración de catálogos no tiene `GET` propio.** Ver §2. Su consecuencia visible
  es que **desactivar es irreversible desde la interfaz**.
- **PV-01 sigue siendo el bloqueante, y esta pantalla es su destino.** Cargar la matriz a mano es
  posible desde hoy; lo que falta es el dato. Conviene decidir si el Product Owner la entrega en
  papel para capturarla aquí, o si se prefiere una siembra —lo que sería trabajo sobre M-03—.
- **Un valor no se puede re-delimitar a otro formulario.** `ActualizarPuntoDto` no acepta
  `formularioIds`: un punto creado en el formulario 1 no se puede compartir después con el 5 sin
  volver a crearlo, lo que chocaría con el nombre único de la zonal. Si compartir puntos entre
  formularios es habitual —y el modelo lo contempla, por eso la relación es de muchos a muchos—,
  falta la operación que lo permita.
- **PV-25 y PV-26** siguen bloqueando la siembra de los nueve formularios, de la que depende que
  esta pantalla tenga algo que administrar.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
