# Documentación final · Módulo Transportes / Cuadro de Colores Operativo

**Agencia Metropolitana de Control (AMC) · Quito, Ecuador**
Fase 10 · Documentación y Transferencia de Conocimiento · 7 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

---

## Qué cambió entre el 2 de septiembre y el 5 de noviembre de 2026

**Actualizamos los diecinueve documentos contra el código de la rama `base/cuadro-colores`**
(backend `24520af`, frontend `d13a5db`). La revisión anterior de fondo era del 2 de septiembre;
desde entonces entraron 104 commits en el backend y 134 en el frontend, y el sistema pasó de
**27 tablas y 67 endpoints** a **55 tablas y 216 endpoints**.

| Hito | Fecha | Dónde leerlo |
|---|---|---|
| Permisos por rol (RBAC) en lugar de roles fijos; se retira el perfil de funcionario de campo | 16-SEP | `03`, `12` DA-16, `18` 0.9.1 |
| La DAF planifica por **tramos**, en «Planificar el día» de cuatro pasos | 7/8-OCT | `01` §6, `02` §4, `06`, `18` 1.0.0 |
| Órdenes con plantilla por director; desde el 27-OCT solo emite la Dirección, con formato por departamento | 7-OCT · 27-OCT | `01` §8, `02` §3 |
| Cada formulario con su configuración propia de catálogos | 13-OCT | `03` §5 |
| Flota y garajes, ausencias de conductores, compartir unidad y traslados entre zonales | 14 a 21-OCT | `03` §8–9, `02` §4 |
| **1.1.0: primera instalación de producción, y QA pasa detrás del Gateway** | 21-OCT | `07`, `08`, `09`, `18` 1.1.0 |
| La **jornada laboral** reemplaza al tipo de contrato (migración irreversible) | 23-OCT | `03` §3–4, `10`, `17` F-11 |
| Registro por zonas del 8, personal por lote y aporte de Instrucción a la patrulla | 29-OCT | `01` §4.5 y §5.2 |
| La patrulla 5/6 y el registro por zonas son **una sola solicitud** para la DAF | 4-NOV | `02` §4, `06`, `18` 1.1.6 |
| Las **zonas de la ciudad** se administran desde la aplicación («Zonas de la ciudad») | 5-NOV | `03` §5.4, `06`, `18` 1.1.7 |

**Lo que hay que saber antes de leer el resto:**

- **Quién abre cada pantalla lo decide un permiso**, y se cambia en «Permisos por rol» sin desplegar.
- **Sin jornada laboral no se convoca.** La migración del 23-OCT dejó a todas las fichas y conductores
  sin jornada; hay que asignarla en Personal y disponibilidad y en Flota y garajes.
- **El administrador vigente es `ADMINISTRADOR_DMIP`.** `ADMINISTRADOR` se conserva en el enumerado
  y no se usa.
- **«Mis órdenes» (P-06) se retiró** junto con el perfil de funcionario de campo.
- **Las cifras de pruebas de hoy:** backend 2453 unitarias en 153 suites, frontend 2088 pruebas en
  141 archivos. En la última corrida completa de integración, 8 suites fallan por fixtures
  desactualizados, no por una regresión verificada (`17_KNOWN_ISSUES.md` D-10).

El detalle por versión está en `18_CHANGELOG_FINAL.md` (0.8.0 a 1.1.7) y lo pendiente, en
`17_KNOWN_ISSUES.md`.

---

## Qué cambió el 19 de agosto de 2026

**Se integró el ingreso con Auth central**, y con él cayó el último bloqueante de software del
proyecto. Dieciocho de estos veinte documentos se actualizaron; los dos que no —`02_Manual_Operativo`
y `03_Manual_Administrador`— no describían el ingreso.

**Lo que hay que saber antes de leer el resto:**

- **Se entra por el portal institucional**, con la cuenta de siempre. Ya no hay selector de perfiles
  en la pantalla: desapareció el 18 de agosto, y con él la posibilidad de que **cualquiera se
  declarara `DIRECTOR`**.
- **Auth dice QUIÉN es; el Cuadro de Colores decide QUÉ ROL tiene**, con `t_usuario`. Consecuencia
  práctica: **quien no tenga fila ahí no entra**, aunque el portal le reconozca, y darlo de alta
  todavía **no tiene pantalla**.
- **La variable `MODO_IDENTIDAD_PROVISIONAL` ya no existe.** Si la encuentra en un `.env`, sobra.
- **El frontend cambió de puerto**, del 5176 al **5180**.

**Lo que sigue abierto y no es nuestro:** el rol `Transporte - Funcionario` en Auth —sin él **P-06
sigue inaccesible**— y que el token traiga el subsistema.

El detalle está en `18_CHANGELOG_FINAL.md` 0.2.0, y la historia completa de la integración en
`../PLAN_INTEGRACION_AUTH.md`.

---

## Qué es esta carpeta

Diecinueve documentos que describen **el sistema tal como quedó construido**, no como se
planificó. Donde el diseño y el código difieren, manda el código; las diferencias están
enumeradas en `DOCUMENTACION_INCONSISTENCIAS.md`.

## Cómo leerlos

| Si usted es… | Empiece por |
|---|---|
| Funcionario que registra operativos | `01_Manual_Usuario.md` · `14_Guia_Capacitacion.md` |
| Responsable de la jornada (DAF, Dirección) | `02_Manual_Operativo.md` |
| Administrador del sistema | `03_Manual_Administrador.md` · `07_Manual_Configuracion.md` |
| Desarrollador que recibe el código | `04_Manual_Tecnico.md` · `12_Documento_Arquitectura.md` |
| Responsable de base de datos | `05_Manual_Base_Datos.md` · `15_Diccionario_Datos.md` |
| Integrador de otro sistema | `06_Manual_API.md` |
| Responsable de infraestructura | `08_Manual_Instalacion.md` · `09_Manual_Despliegue.md` |
| Mesa de ayuda | `10_Manual_Soporte.md` · `16_FAQ.md` |
| Quien decide qué se hace ahora | `17_KNOWN_ISSUES.md` · `18_CHANGELOG_FINAL.md` |

## Índice

| # | Documento | Contenido |
|---|---|---|
| 01 | `01_Manual_Usuario.md` | Las pantallas del menú, paso a paso, por perfil |
| 02 | `02_Manual_Operativo.md` | El ciclo diario del cuadro, hora por hora |
| 03 | `03_Manual_Administrador.md` | Personal, ventanas, jornadas, parámetros, catálogos, formularios, cuentas y flota |
| 04 | `04_Manual_Tecnico.md` | Estructura del código, convenciones, cómo trabajar |
| 05 | `05_Manual_Base_Datos.md` | 55 tablas, restricciones, índices, migraciones |
| 06 | `06_Manual_API.md` | Los 216 endpoints, con su permiso y su contrato |
| 07 | `07_Manual_Configuracion.md` | Variables de entorno y parámetros de política |
| 08 | `08_Manual_Instalacion.md` | Instalación desde cero, local y en contenedores |
| 09 | `09_Manual_Despliegue.md` | Procedimiento de despliegue y actualización |
| 10 | `10_Manual_Soporte.md` | Diagnóstico de incidencias frecuentes |
| 11 | `11_Guia_Mantenimiento.md` | Tareas periódicas y evolución del sistema |
| 12 | `12_Documento_Arquitectura.md` | Decisiones de arquitectura y su porqué |
| 13 | `13_Catalogo_Funcional.md` | Qué hace el sistema, funcionalidad por funcionalidad |
| 14 | `14_Guia_Capacitacion.md` | Plan de formación por perfil |
| 15 | `15_Diccionario_Datos.md` | Cada columna, su tipo y su significado |
| 16 | `16_FAQ.md` | Preguntas frecuentes con respuesta verificada |
| 17 | `17_KNOWN_ISSUES.md` | Lo que no funciona y por qué |
| 18 | `18_CHANGELOG_FINAL.md` | Historia del proyecto por módulos |
| — | `DOCUMENTACION_INCONSISTENCIAS.md` | Diferencias entre documentación y código |

---

## Advertencia que ningún documento debe ocultar

**El sistema está construido e instalado: la versión 1.1.0 se instaló en producción el 21 de octubre
de 2026, con base vacía.** Para operar con datos reales siguen faltando dos cosas, y ninguna es de
software:

1. **Datos maestros** de cada ambiente: la matriz zonal ↔ punto de encuentro (PV-01), el maestro de
   personal certificado (PV-02) y la flota (PV-03). Se cargan desde las pantallas de administración.
2. **Jornada laboral asignada** a cada ficha de personal y a cada conductor: sin ella el sistema no
   los convoca (`17_KNOWN_ISSUES.md` F-11).

> **Cambió el 5 de noviembre de 2026.** El rol `Transporte - Funcionario` y P-06 dejaron de ser un
> pendiente: el perfil de funcionario de campo se retiró en septiembre. Lo que sigue es el texto
> del 19 de agosto, como historia.

> **Cambió el 19 de agosto de 2026.** Eran dos motivos; el primero —no había identidad real— se
> resolvió del 17 al 19 de agosto con el **ingreso por Auth central**, patrón de cookie `HttpOnly`.
> **Ya no queda ningún bloqueante de desarrollo.** Ver `18_CHANGELOG_FINAL.md` 0.2.0.
>
> Del ingreso quedan dos cosas abiertas, y **ninguna es nuestra**: falta el rol
> `Transporte - Funcionario` en Auth —sin él **P-06 sigue inaccesible**— y que el canje devuelva el
> subsistema, sin lo cual no se puede comprobar que un código se emitió para este módulo.

1. **Faltan datos maestros.** Tres bloqueantes del negocio siguen abiertos: la matriz
   zonal ↔ punto de encuentro (PV-01), la base de personal certificada (PV-02) y el
   catálogo de conductores y vehículos (PV-03). El 07-AGO empezó la carga de los dos
   primeros —cinco puntos y un funcionario—, pero **son filas de prueba, no el catálogo
   institucional**.

Todo lo demás está implementado, probado y verificado. El detalle en `17_KNOWN_ISSUES.md`.

---

## Estado de esta documentación

**Actualizada el 13 de agosto de 2026, tras tres jornadas de uso real sobre el sistema desplegado.**

En esas tres jornadas se resolvió **PV-37** —la lista de personal ya explica por qué alguien no
puede salir—, la jornada del cuadro **pasó a abrirse sola** con el primer registro del día, y la
captura libre se separó por catálogo en el modelo. Los cambios están en `18_CHANGELOG_FINAL.md` y
su efecto sobre lo pendiente, en `17_KNOWN_ISSUES.md`.

**Actualizada antes el 7 de agosto de 2026, después de la primera jornada con datos reales.**

Ese día se corrigieron seis defectos que ninguna prueba había detectado —cuatro de ellos, la
misma causa: interfaces del frontend escritas sin consumidor— y el Product Owner resolvió tres
pendientes: **PV-25**, **PV-26** y **PV-10**. Todos los documentos de esta carpeta reflejan el
código posterior a esas correcciones.

Lo que cambió de fondo, por si lo leyó antes:

| Documento | Qué dice ahora |
|---|---|
| `01`, `06`, `13`, `14` | `/personal/elegible` **esconde** a quien no puede salir; no muestra su motivo (PV-37) — **superado el 11-AGO**, ver abajo |
| `01`, `06`, `13`, `15` | Retirar un operativo **lo borra** si no tiene órdenes emitidas, y el número se reutiliza (PV-10) |
| `06` | `/formularios/permitidos` devuelve `id`, `condicionanteNocturno` y `orden` |
| `01` | Las instituciones se eligen con etiquetas y teclado, no con un `<select multiple>` |
| `16` | La bandeja de transporte vacía **puede ser correcta**: tres formularios nunca llegan a la DAF |
| `17` | La carga de datos maestros empezó; el orden de prioridades cambió |

Las cifras de este conjunto —738 pruebas unitarias, 283 de integración, 258 de interfaz, 67
endpoints— se verificaron ejecutándolas ese día, no se copiaron de un informe anterior.
