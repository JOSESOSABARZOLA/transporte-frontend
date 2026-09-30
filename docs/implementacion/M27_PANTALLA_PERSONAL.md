# M-27 · Pantalla P-07 · Personal y disponibilidad

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
Etapa E10 · Bloque G · Prioridad **P2 · Media** · Dependencias M-10, M-21
No bloquea ningún módulo · Fecha: 2026-08-06

---

## 0. LA ÚNICA PANTALLA CON CÉDULAS Y TELÉFONOS

`FuncionarioResponseDto` es el único contrato del sistema que devuelve datos personales, y su
controlador lleva `@Roles(ADMINISTRADOR_DMIP)`. El resto del módulo trabaja con nombre y área:
`PersonaElegibleResponseDto` **no tiene** teléfono, y esa ausencia —no una comprobación— es lo que
impide que se filtre por descuido en una pantalla nueva (RN-34).

También es la pantalla de la que depende media aplicación sin que se note: si aquí falta gente o
alguien está mal clasificado, el desplegable de personal de P-01 ofrece lo que no debe y las reglas
de descanso deciden sobre datos equivocados.

---

## 1. ARCHIVOS

Cinco nuevos, uno de prueba y cuatro modificados.

```
src/
├── pages/
│   └── AdminPersonalPage.tsx                        (nuevo)
├── components/personal/                             (nuevo)
│   ├── TablaPersonal.tsx · ModalFuncionario.tsx
│   ├── PanelAusencias.tsx
│   └── personal.spec.tsx                            22 pruebas
├── utils/
│   └── personal.util.ts                             (nuevo)
├── interfaces/Personal.ts   (modificado: `Disponibilidad` corregida · `ActualizarFuncionario`)
├── services/personal.service.ts (modificado: `actualizar` · `listar(incluirInactivos)`)
├── config/validationSchemas.ts  (modificado: `esquemaFuncionario` y `esquemaAusencia`)
└── config/routes.tsx        (modificado: la ruta real sustituye al marcador)
```

**Sin dependencias nuevas.**

---

## 2. DOS CORRECCIONES DE CONTRATO

Al consumir de verdad lo que M-21 declaró aparecieron dos desajustes con el servidor:

- **`Disponibilidad` traía `funcionarioId` y no lo devuelve el servidor.** El periodo se pide por la
  ruta de su funcionario, así que repetirlo en el cuerpo sería un dato que puede contradecir a la
  ruta. Además le faltaban `registradoPor` y la nulabilidad real de `motivo`.
- **Faltaba `actualizar`.** El plan pide `CRUD /administracion/personal` y el controlador expone
  `PUT /administracion/personal/:id`; el servicio de M-21 no lo tenía. Es un `PUT` con cuerpo
  parcial: se modifica lo que llega y se conserva lo demás, de modo que enviar la ficha entera
  sobrescribiría con valores viejos lo que otro administrador acabara de corregir.

Ninguna de las dos se podía detectar antes: eran declaraciones sin consumidor.

---

## 3. LO QUE FALTA EN EL CONTRATO · PV-35

`GET /administracion/personal/:id/disponibilidad` devuelve los periodos **de un funcionario**. No
existe ningún endpoint que liste las ausencias de la institución, ni un campo en la ficha que diga
si la persona está ausente hoy.

Eso choca con dos cosas que el plan pide:

1. **El caso 3** —«funcionario con ausencia vigente → `badge badge-warning` con el motivo en
   texto»— necesita saber, por cada fila de la tabla, si hay periodo vigente.
2. **El esquema de FASE5 §4.5** dibuja una tabla «AUSENCIAS REGISTRADAS» con las de todos.

Resuelto así, y declarado:

- **Las ausencias se piden solo para las fichas que están a la vista**, en paralelo, y se recuerdan:
  paginar hacia atrás no vuelve a preguntar. Diez peticiones para pintar diez distintivos, en lugar
  de cincuenta y dos para pintar diez.
- **Mientras no se sabe, la fila dice «Consultando…»** en lugar de afirmar «Activo». Afirmar que
  alguien está disponible antes de haberlo comprobado es exactamente el error que esta pantalla
  existe para evitar. Hay una prueba dedicada.
- **La tabla de ausencias es la de la persona elegida**, no la global, y es además el contexto en el
  que se registra una.

**Registrado como PV-35.** La solución limpia es de backend —un `disponibilidadVigente` en
`FuncionarioResponseDto`, o un `GET /administracion/personal/disponibilidad`— y no la resolví por mi
cuenta porque es trabajo sobre M-10, que este módulo no tiene asignado.

---

## 4. LOS CASOS 3 Y 4 SON LA MISMA REGLA

Ninguna información depende solo del color (regla 6), y aquí se nota dos veces:

| Situación | Lo que se ve | Lo que se lee |
|---|---|---|
| Ausencia vigente | `badge badge-warning` | **«Vacaciones hasta el 2026-08-08»** |
| Ficha inactiva | Fila con `opacity-60` | **Distintivo «Inactivo»** |

Una fila atenuada y un distintivo naranja son indistinguibles de lo normal para quien no percibe
bien el contraste, y en un maestro de personal confundir activo con inactivo significa convocar a
alguien que ya no trabaja aquí.

**El motivo de la ausencia va en el `title`, no en la celda.** Puede describir una condición de
salud, y la fila la ve cualquiera que pase por detrás del escritorio. Hay una prueba que comprueba
las dos mitades: que el `title` lo lleva y que la celda no lo imprime.

---

## 5. TRES DECISIONES DEL FORMULARIO

**La cédula se comprueba por su forma, no por su dígito verificador.** Que sean diez dígitos es una
ayuda para escribir: detecta el guion de más antes de gastar un viaje. Que el dígito cuadre es una
**regla**, la comprueba `verificarCedula` en el servidor, y replicar el módulo 10 aquí sería tener
dos implementaciones de la misma norma que empiezan a diferir en cuanto se corrija una.

**Al editar, la cédula se muestra y no se toca.** El servidor sí admite cambiarla, pero es la
identidad de la persona y el único dato con el que se detecta un reingreso. Si está mal escrita,
corregirla debe ser un acto deliberado y no un descuido de teclado mientras se actualiza un
teléfono.

**El tipo de contrato lleva su consecuencia escrita debajo.** De él depende RN-26 —quién puede salir
de noche y en fin de semana— y quien registra la ficha no tiene por qué saberlo. Un contrato mal
elegido no produce un error: produce a alguien convocado a un operativo nocturno que no le
corresponde.

Y una que no es del formulario: **el desplegable de situación no ofrece `MANTENIMIENTO`**, que es de
vehículos y el servidor rechaza con su propio mensaje, ni `DISPONIBLE`, porque registrar «esta
persona está disponible del 1 al 15» no describe una ausencia —quien vuelve al servicio **retira**
el periodo—.

> **Las fechas viajan como texto `AAAA-MM-DD` y nunca se convierten a `Date`.** `PanelAusencias` usa
> un `<input type="date">` propio en lugar del `DateInput` de `FormikField`, que convierte a `Date`
> para entregarlo al formulario. `disp_desde` y `disp_hasta` son `@db.Date`: fechas de calendario,
> sin hora ni huso. Convertirlas en Quito —UTC−5— las desplazaría un día al volver a formatearlas.
> Por el mismo motivo `ausenciaVigente` compara cadenas: en ese formato el orden alfabético es el
> cronológico.

---

## 6. DAR DE BAJA NO BORRA, Y SE DICE CON NÚMEROS

El histórico de quién salió en cada operativo depende de la ficha, y la rotación del personal es
mensual: quien sale hoy puede reingresar el mes que viene con su historial intacto.
`fk_asignacion_funcionario` es `RESTRICT`, de modo que la base tampoco lo permitiría.

La confirmación lo explica antes, y el mensaje de éxito lo confirma después **con el número de
operativos que la ficha conserva**, redactado por el servidor. No es un tecnicismo: es la diferencia
entre creer que se borró a alguien y saber que sigue en el histórico.

---

## 7. VALIDACIÓN EJECUTADA

| Comando | Resultado |
|---|---|
| `npm test` | **11 archivos · 156 pruebas** (22 nuevas) |
| `npm run lint` | **código 0** · 1 advertencia heredada en `FilterByColumn` |
| `npm run build` | **código 0** · `AdminPersonalPage` en su fragmento (15,67 kB) |

### 7.1. Los seis casos del plan

**✅ = afirmado por una prueba automática. ⏳ = escrito y revisado, pero no ejercitado.**

| # | Caso | Estado |
|---|---|---|
| 1 | Alta · aparece en el listado y en los desplegables | ⏳ el segundo efecto es del servidor; **exige backend** |
| 2 | Registrar vacaciones · deja de ofrecerse en el rango | ⏳ lo decide `PersonalElegibleService`; **exige backend** |
| 3 | Ausencia vigente · `badge-warning` con el motivo en texto | ✅ el distintivo, y que el motivo va en el `title` y **no** en la celda |
| 4 | Funcionario inactivo · fila atenuada y distintivo textual | ✅ `opacity-60` **más** la palabra «Inactivo» |
| 5 | Baja con historial · confirmación que advierte la baja lógica | ⏳ el texto está; el conteo lo redacta el servidor. **Exige backend** |
| 6 | Acceso con otro perfil · redirige | ⏳ `RutaProtegida` más `@Roles(ADMINISTRADOR_DMIP)`; **exige navegador** |

Además, **16 pruebas** cubren lo que no depende del servidor: los extremos de `ausenciaVigente`
—incluida la ausencia de un solo día—, los filtros acumulados y sin tildes, y el esquema de la
ausencia, con la afirmación explícita de que **el solape no está en él** porque lo decide el
servidor (INV-14).

### 7.2. Qué queda pendiente de mirar

- **Los casos 1, 2 y 5 son afirmaciones sobre el servidor.** Que una persona nueva aparezca en el
  desplegable de P-01 y que una con vacaciones deje de ofrecerse lo decide
  `PersonalElegibleService`, no esta pantalla; comprobarlo desde la interfaz sería probar el
  simulacro. El caso 5 depende además del conteo que redacta el backend.
- **El caso 6 exige navegador**, por el mismo motivo que en M-25.
- **Maquetación** a 375 px: la tabla va en `overflow-x-auto` y el modal es `max-w-2xl` con
  desplazamiento propio, pero afirmarlo exige abrirlo.

---

## 8. PENDIENTE DE VALIDACIÓN

- **PV-35 · no hay forma de saber quién está ausente sin preguntar ficha por ficha.** Ver §3.
- **El enlace usuario ↔ funcionario sigue sin poblarse.** M-20 agregó `t_usuario.func_id` y P-06
  depende de él por completo, pero **esta pantalla no lo administra**: el contrato de personal no
  incluye el usuario, y el de usuarios no está en el plan. Es la pieza que falta para que un
  funcionario reciba su orden, y conviene decidir dónde se administra.
- **PV-02** —base de personal certificada— sigue siendo el bloqueante: esta pantalla permite
  cargarla a mano, pero el tipo de contrato de cada persona, del que depende RN-26, tiene que
  venir de Talento Humano y no de una captura.
- **La dirección no ofrece `ADMINISTRADOR_DMIP` ni `FUNCIONARIO`.** No son direcciones con personal
  operativo, y crear fichas ahí produciría gente que ningún formulario puede convocar. Conviene
  confirmarlo si existiera personal administrativo que deba salir a operativos.

---

**Estado: implementado, probado y documentado. A la espera de aprobación.**
