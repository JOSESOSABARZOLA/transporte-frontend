# 14 · Guía de Capacitación

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. Antes de convocar a nadie

Esta guía sirve **cuando el sistema tenga datos**. Hoy no los tiene: sin puntos de encuentro
(PV-01) y sin personal (PV-02) no se puede completar un registro, y una capacitación donde el
ejercicio no se puede terminar produce desconfianza en lugar de adopción.

**Requisitos mínimos para capacitar:**

| # | Requisito | Estado |
|---|---|---|
| 1 | Los nueve formularios sembrados | ✅ |
| 2 | Matriz zonal ↔ punto cargada | ⏳ **PV-01** |
| 3 | Maestro de personal cargado | ⏳ **PV-02** |
| 4 | Conductores y vehículos cargados | ⏳ **PV-03** |
| 5 | Criterio de prefijo por área | ⏳ **PV-27** — sin él, 5 de 9 formularios no registran |
| 6 | Una jornada de prueba abierta | Diario |

Con los seis, la capacitación es viable. Sin el 2, el 3 y el 5, no.

---

## 2. El mensaje que debe quedar

Antes de enseñar botones, conviene decir por qué existe el sistema. Dos frases:

> **El cuadro se hacía a mano y quien lo hacía se fue.**
> **El cuadro circulaba por WhatsApp y los intervenidos se anticipaban.**

Casi todo lo que el sistema hace —que cada departamento vea solo lo suyo, que la matriz sea de la
Dirección, que la orden tenga cuatro campos— se explica por la segunda frase. Si eso se entiende,
las restricciones dejan de parecer trabas.

---

## 2 bis. Lo que cambió en el ingreso · 19 de agosto de 2026

**Ya no se elige el perfil desde la pantalla.** Hasta el 18 de agosto había un selector en la barra
superior con siete perfiles de prueba; desapareció. Ahora se entra por el **portal institucional**
con el usuario y la contraseña de siempre.

Tres cosas que conviene decir en voz alta durante la capacitación, porque generan llamadas:

1. **Su perfil no lo elige usted.** Lo determina su cuenta institucional. Si ve menos opciones de
   las que espera, no es un fallo: es el perfil que tiene asignado.
2. **La sesión dura ocho horas.** Después vuelve al portal. No es un cierre inesperado.
3. **«Su usuario no está dado de alta» no es un error suyo.** Significa que el portal le reconoció
   pero el Cuadro de Colores todavía no le tiene registrado. Lo resuelve el administrador.

> **Para el instructor:** dar de alta a alguien nuevo **no tiene pantalla** todavía. Requiere semilla
> o SQL. Si en la sesión aparece alguien sin alta, no se puede resolver en el momento.

---

## 3. Plan por perfil

### 3.1. Departamentos de carga · 90 minutos

**Quién:** DMIP Operativos, DMIP Inspecciones, DMIT Instrucción.

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Por qué existe el sistema. Qué reemplaza |
| 2 | 10 | Entrar por el **portal institucional**, elegir el rol «Transporte», leer la cabecera de la jornada |
| 3 | 30 | **P-01 · Registro**, con ejercicio guiado |
| 4 | 20 | **P-02 · Mis operativos**: filtrar, editar, retirar |
| 5 | 10 | Qué hace la DAF después, y por qué usted no ve el conductor |
| 6 | 10 | Preguntas |

**Ejercicio:** registrar dos operativos en el mismo formulario, uno diurno y uno nocturno; agregar
personal; comprobar que el sistema rechaza a alguien y **leer el motivo**; editar el horario del
primero; retirar el segundo.

**Los tres puntos que más ahorran llamadas después:**

1. **Los avisos aparecen antes, no al guardar.** Si la ventana cerró, se dice arriba.
2. **Quien no puede salir aparece deshabilitado, con su motivo debajo del nombre** (PV-37, resuelto
   el 11-AGO-2026). Si alguien no aparece **en absoluto**, su área no participa en ese formulario.
   **Enséñelo en la capacitación**: era la pregunta que más llamadas iba a generar, y ahora la
   responde la propia pantalla.
3. **Los campos calculados no se escriben.** El identificador y la semana los pone el sistema:
   ese era el error original.

### 3.2. DAF · 60 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Su papel en la jornada y su ventana (15H00–16H30) |
| 2 | 25 | **P-03**: bandeja, panel, asignar, propios medios |
| 3 | 10 | El indicador de flota: avisa, no bloquea |
| 4 | 10 | Qué hacer cuando el conductor es rechazado |
| 5 | 5 | Preguntas |

**Ejercicio:** asignar transporte a un nocturno; provocar un rechazo por descanso y leerlo; marcar
un operativo por propios medios.

**Dos puntos:**

1. **Usted escribe dos campos.** Todo lo demás está deshabilitado a propósito.
2. **La placa se propone desde el vehículo habitual del conductor**, y se puede cambiar — **pero
   solo entre vehículos que son habituales de alguien** (PV-33).

### 3.3. Dirección · 60 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Qué ve la Dirección y **por qué nadie más lo ve** |
| 2 | 20 | **P-04 · Matriz**: banners, alertas, fila de evidencia |
| 3 | 10 | Exportar y cerrar el cuadro |
| 4 | 15 | **P-05 · Órdenes**: qué dice cada hoja y qué no dice |
| 5 | 5 | Preguntas |

**Ejercicio:** revisar la matriz del día; localizar un formulario sin carga y leer su evidencia;
intentar cerrar con un nocturno sin conductor y leer el rechazo; cerrar; emitir órdenes y
**comprobar que ninguna hoja menciona a los demás**.

**El punto central:** *el cierre habilita la emisión, y una orden emitida ya salió del sistema.* Por
eso la confirmación enumera lo que se firma.

### 3.4. Administrador · 120 minutos

| Bloque | Min | Contenido |
|---|---|---|
| 1 | 10 | Qué administra y qué no |
| 2 | 30 | **P-07 · Personal**: alta, edición, ausencias, baja lógica |
| 3 | 30 | **P-08 · Catálogos**, incluida **la carga de la matriz zonal ↔ punto** |
| 4 | 25 | **P-09 · Ventanas y parámetros** |
| 5 | 15 | Abrir la jornada, hoy por API |
| 6 | 10 | Preguntas |

**Ejercicio:** dar de alta un funcionario y comprobar que aparece en P-01; registrarle vacaciones y
comprobar que deja de ofrecerse; crear un punto en una zonal y comprobar la cascada; cambiar la
hora de cierre y ver el efecto inmediato.

**Los tres puntos críticos:**

1. **El tipo de contrato decide si alguien puede salir de noche.** No es una etiqueta.
2. **Desactivar un catálogo es irreversible desde la pantalla** (PV-36).
3. **Desactivar una ventana no la cierra: la abre las veinticuatro horas.**

### 3.5. Funcionario de campo · 20 minutos

> **No convocar todavía.** El sistema ya reconoce el perfil y las cuentas se enlazan por semilla,
> pero **falta crear el rol «Transporte - Funcionario» en el portal institucional**: sin él, el
> funcionario de campo no tiene cómo entrar. Está pedido al equipo de Auth central.
> Ver `17_KNOWN_ISSUES.md`, F-01.

Cuando funcione: abrir P-06 en el teléfono, leer la tarjeta, descargar el PDF, y entender que
**contiene solo su asignación** y que eso es deliberado.

---

## 4. Errores que conviene provocar en clase

Enseñar el sistema rechazando es más útil que enseñarlo aceptando: la mitad de las llamadas a
soporte son reglas funcionando bien.

| Provocar | Qué se aprende |
|---|---|
| Registrar con la ventana cerrada | El aviso aparece antes, no al guardar |
| Asignar a alguien que salió ayer en patrulla | El motivo se lee y no hay que llamar |
| Asignar a alguien de vacaciones | La disponibilidad manda |
| Cerrar el cuadro con un nocturno sin conductor | El sistema nombra el operativo |
| Poner 30 en la jornada máxima | El rango se indica antes de enviar |
| Dos personas editando el mismo operativo | El conflicto protege, no estorba |

---

## 5. Materiales

| Perfil | Documento |
|---|---|
| Todos | `01_Manual_Usuario.md` |
| Responsables de jornada | `02_Manual_Operativo.md` |
| Administrador | `03_Manual_Administrador.md` · `07_Manual_Configuracion.md` |
| Todos | `16_FAQ.md` |
| Formador | `17_KNOWN_ISSUES.md`, para no prometer lo que no hay |

---

## 6. Evaluación

| Perfil | Sabe usar el sistema si… |
|---|---|
| Carga | Registra un operativo completo en menos de cinco minutos y explica por qué alguien fue rechazado |
| DAF | Asigna transporte a un nocturno y explica por qué solo puede escribir dos campos |
| Dirección | Cierra el cuadro y explica qué contiene una orden y qué no |
| Administrador | Da de alta un funcionario, le registra una ausencia y comprueba el efecto en P-01 |

---

## 7. Después de la capacitación

1. **Acompañamiento la primera semana**, en la franja de 14H00 a 16H30, que es cuando ocurre todo.
2. **Recoger las preguntas repetidas** e incorporarlas a `16_FAQ.md`.
3. **Vigilar la señal de adopción**: si alguien sigue mandando el cuadro por WhatsApp, el problema
   no es de capacitación sino de que el sistema le resulta más lento. Ahí conviene medir cuánto
   tarda de verdad un registro.
