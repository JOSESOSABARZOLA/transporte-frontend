# M-26 · Pantallas P-05 y P-06 · Órdenes de servicio

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P1 · Alta** · Dependencias M-20, M-25
Desbloquea M-30 · Fecha: 2026-08-06

---

## 0. DONDE LA INFORMACIÓN SALE DEL SISTEMA

Todo lo construido hasta aquí ocurre dentro de la aplicación. Una orden de servicio **se entrega a
una persona**: sale a papel, a un teléfono, a un grupo. Es el punto por el que la información deja
de estar bajo control, y por eso es donde RN-51 se juega de verdad.

La respuesta del diseño es el dato aislado: cuatro campos —horario, funcionario, conductor y
placa— y ninguno más. La filtración del cuadro completo permitía a los intervenidos anticiparse al
operativo; una orden que dijera el punto de encuentro de los demás reproduciría el problema en
formato individual.

Dos pantallas, dos lógicas de acceso opuestas: la Dirección **emite**, el funcionario **recibe
únicamente la suya**.

---

## 1. ARCHIVOS

Seis nuevos, uno de prueba y uno modificado.

```
src/
├── pages/
│   ├── OrdenesServicioPage.tsx                      (nuevo · P-05, Director)
│   └── MisOrdenesPage.tsx                           (nuevo · P-06, funcionario)
├── components/ordenes/                              (nuevo)
│   ├── CamposDeLaOrden.tsx     ← el único sitio donde se pinta una orden
│   ├── VistaPreviaOrden.tsx · TarjetaOrden.tsx
│   └── ordenes.spec.tsx                             14 pruebas
├── utils/
│   └── ordenes.util.ts                              (nuevo)
└── config/routes.tsx        (modificado: las dos rutas reales sustituyen los marcadores)
```

**Sin dependencias nuevas.**

---

## 2. UN SOLO SITIO DONDE SE PINTA UNA ORDEN

`CamposDeLaOrden` es el componente más pequeño del módulo y el más importante.

P-05 y P-06 lo usan las dos en lugar de dibujar cada una sus campos. Con dos copias, «agregar el
punto de encuentro para que el funcionario sepa a dónde ir» sería un cambio en un archivo que nadie
relacionaría con el aislamiento. Con una, **hay un solo sitio que vigilar**, y la prueba que cuenta
los rótulos lo cubre entero:

```
expect(rotulos).toEqual(["Horario", "Funcionario", "Conductor", "Placa"]);
```

Es la misma técnica que en M-24 con los dos campos editables de la DAF: **contar, no enumerar**. Un
quinto campo agregado más adelante hace caer la prueba, que es exactamente lo que INV-24 necesita.

El teléfono del conductor acompaña al nombre sin ser un campo aparte: es el único dato de contacto
de la orden y sirve para encontrarse en territorio (RN-34).

---

## 3. LA PRUEBA DEL CASO 3

Es la razón de ser del archivo de pruebas. Se emiten tres órdenes y se comprueba que **la hoja de
cada persona no menciona a las otras dos**:

```
nombres.filter((_, otro) => otro !== indice)
       .forEach((ajeno) => expect(within(hoja).queryByText(ajeno)).toBeNull());
```

Una prueba que solo mirara que el nombre propio aparece habría pasado igual con una hoja que los
nombra a los tres. Lo que hay que afirmar es **lo que no está**.

Y `VistaPreviaOrden` lleva esa comprobación a la pantalla: muestra las hojas emitidas una junto a
otra precisamente para que quien firma la emisión vea de un vistazo que ninguna menciona a las
demás. Sin ella, el aislamiento sería una promesa del backend que nadie mira.

---

## 4. EL CASO 7 · UNA REGLA QUE NO ESTÁ DONDE DEBERÍA · PV-34

El plan dice, para el caso 7: *«Emisión con cuadro no cerrado → según la regla de negocio confirmada
en M-13»*. **En M-13 no se confirmó ninguna**, y al ir a implementarlo apareció una discrepancia:

- **El diseño lo dice dos veces.** FASE5 §6.1 dibuja el flujo de la Dirección como «cierre del
  cuadro → P-05 emisión de órdenes», y §7 declara que en el estado *cuadro cerrado* la «emisión de
  órdenes queda habilitada».
- **El servidor no lo exige.** `OrdenServicioService.emitir` comprueba que el operativo exista y que
  tenga personal. El estado del cuadro no se mira.

Se implementó **siguiendo el diseño**: el botón queda deshabilitado con la explicación en el
`title` mientras el cuadro no esté cerrado, igual que cuando no hay personal, y un `alert-warning`
lo dice arriba.

Pero conviene ser claro sobre lo que eso significa: **una regla que vive solo en la interfaz no es
una regla**. Cualquiera con el perfil de Dirección y una petición directa puede emitir sobre un
cuadro en borrador. Si la regla es real, le falta su comprobación en el servidor; si no lo es, sobra
el bloqueo de la pantalla. **Registrado como PV-34** — no lo resolví por mi cuenta porque agregar la
comprobación es trabajo de backend sobre un módulo que este no tiene asignado, y quitarla sería
contradecir dos documentos de diseño.

> **`motivoParaNoEmitir` devuelve el motivo, no un booleano.** Con un booleano, el texto del `title`
> habría que componerlo aparte, y el día que se agregue una tercera condición alguien la añadiría al
> booleano y olvidaría el texto. Aquí no se puede deshabilitar sin decir por qué, porque son el
> mismo valor. Y la falta de personal manda sobre el estado del cuadro: decir «ciérrelo primero»
> mandaría a cerrar el cuadro para chocar después con el mismo bloqueo.

---

## 5. P-06 ES UNA TARJETA, NO UNA FILA

Es **la única pantalla concebida principalmente para el teléfono**, porque su destinatario es el
funcionario en territorio. Una tabla a 375 px obliga a desplazarse en horizontal para leer cuatro
datos que caben de sobra en vertical, y quien la consulta está de pie, con una mano, a las seis de
la tarde.

La rejilla crece con la pantalla —una, dos y tres columnas, FASE5 §9.6—, pero el diseño nace del
teléfono hacia arriba y no al revés. El fragmento resultante pesa **2,69 kB**, el más liviano de las
seis pantallas: quien la abre desde datos móviles no descarga nada más.

**No se le pasa ningún identificador al servidor, y esa ausencia es la garantía.**
`GET /ordenes-servicio/mias` resuelve de quién son las órdenes a partir de la identidad autenticada.
Esta pantalla no tiene ningún control que elija destinatario, ni podría tenerlo: el servicio no
acepta el parámetro.

**La cuenta sin ficha de personal se explica, no se deja en blanco.** Si el usuario no está enlazado
a un funcionario, el servidor responde con el motivo redactado; mostrar «no tiene órdenes» haría
creer que no salió a ningún operativo, cuando lo que ocurre es que el administrador no completó su
ficha. Es el enlace `t_usuario.func_id` que agregó M-20, y sigue sin poblarse.

---

## 6. DE DÓNDE SALE LA LISTA DE OPERATIVOS

El plan asigna a este módulo dos endpoints de órdenes y **ninguno que enumere operativos**. La lista
se toma de `GET /matriz/:fecha`, que ya se consume en P-04, es exclusivo del `DIRECTOR` y trae de
cada fila justo lo que hace falta: su identificador, su personal —para el caso 4— y el estado del
cuadro —para el caso 7—.

Pedirla por `GET /operativos` habría traído lo mismo con un contrato más y sin el estado del cuadro,
que habría que consultar aparte.

`operativosDeLaMatriz` aplana las secciones a la lista corrida: la matriz llega por formulario
porque así se lee como documento, pero para emitir lo que hace falta es la lista. Los formularios que
nadie cargó desaparecen solos, y con razón: no tienen órdenes que emitir.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **10 archivos · 134 pruebas** (14 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · `MisOrdenesPage` 2,69 kB · `OrdenesServicioPage` 7,15 kB |

### 7.1. Los siete casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Emitir sobre operativo con tres personas · tres hojas | ✅ tres artículos, uno por persona |
| 2 | Contenido de cada hoja · cuatro campos, nada más | ✅ **contando** los rótulos, no enumerándolos |
| 3 | Revisar una hoja · no menciona a los otros dos | ✅ se afirma lo que **no** está, para cada una de las tres |
| 4 | Operativo sin personal · botón deshabilitado con explicación | ✅ el motivo es el valor que deshabilita: no se puede tener uno sin el otro |
| 5 | P-06 con dos funcionarios · cada uno ve lo suyo | ⏳ el filtro es la identidad del servidor; **exige backend con dos cuentas** |
| 6 | P-06 a 375 px · tarjetas apiladas con aviso | ✅ la tarjeta y su descarga; la maquetación, **pendiente de mirar** |
| 7 | Emisión con cuadro no cerrado | ✅ el bloqueo y su motivo · pero ver **PV-34**: el servidor no lo exige |

### 7.2. Qué queda pendiente de mirar

- **El caso 5 no se puede verificar sin backend**, y no debería verificarse de otra manera: lo que
  hay que comprobar es que **el servidor** filtra por identidad. Una prueba de interfaz que pasara
  órdenes ajenas y comprobara que no se pintan estaría afirmando justo el diseño que este módulo
  rechaza —el mismo razonamiento que en el caso 1 de M-23—.
- **El caso 6 está verificado a medias.** Que la tarjeta lleve sus campos y su botón se afirma; que
  a 375 px se lea cómoda exige abrirlo en un teléfono. Es, además, la pantalla donde más importa.
- **El recorrido completo** —cerrar el cuadro, emitir, descargar el PDF— sigue bloqueado por PV-01,
  PV-25 y PV-26, y además por el enlace `t_usuario.func_id`, que nadie puebla todavía.

---

## 8. PENDIENTE DE VALIDACIÓN

- **PV-34 · ¿la emisión exige el cuadro cerrado?** Ver §4. Es la pregunta del caso 7, que el plan
  daba por confirmada en M-13 y no lo está.
- **PV-07 · canal de entrega de la orden** sigue abierto, y es lo que decide si P-06 hace falta. Hoy
  la pantalla existe y el PDF se descarga; si la entrega definitiva fuera por correo o por WhatsApp
  institucional, esta pantalla pasaría a ser un respaldo y no el canal.
- **El enlace usuario ↔ funcionario no se puebla desde ninguna pantalla.** M-20 agregó
  `t_usuario.func_id` y P-06 depende de él por completo: sin ese enlace, todo funcionario recibe el
  mensaje de «su usuario no tiene ficha de personal asociada». Poblarlo corresponde a la
  administración de personal (M-27) o al alta de usuarios, que no está en el plan.
- **PV-28** · formato de la orden de trabajo, y **PV-30** · logotipo institucional para el backend,
  siguen afectando al documento que se descarga desde estas pantallas.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
