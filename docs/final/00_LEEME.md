# Documentación final · Módulo Transportes / Cuadro de Colores Operativo

**Agencia Metropolitana de Control (AMC) · Quito, Ecuador**
Fase 10 · Documentación y Transferencia de Conocimiento · 7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

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
| 01 | `01_Manual_Usuario.md` | Las nueve pantallas, paso a paso, por perfil |
| 02 | `02_Manual_Operativo.md` | El ciclo diario del cuadro, hora por hora |
| 03 | `03_Manual_Administrador.md` | Catálogos, personal, ventanas y parámetros |
| 04 | `04_Manual_Tecnico.md` | Estructura del código, convenciones, cómo trabajar |
| 05 | `05_Manual_Base_Datos.md` | 27 tablas, restricciones, índices, migraciones |
| 06 | `06_Manual_API.md` | Los 67 endpoints, con su rol y su contrato |
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

**El sistema está construido y le queda un motivo para no ir a producción, que no es de software.**

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
