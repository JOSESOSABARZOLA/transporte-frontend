# 12 · Documento de Arquitectura

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

---

## 1. El problema que resuelve

El Cuadro de Colores es el compilado diario de los operativos de la AMC. Antes de este sistema:

1. **Una sola persona lo consolidaba a mano** y dejó el cargo durante el levantamiento, sin
   traspaso.
2. **El cuadro circulaba por WhatsApp** y los intervenidos se anticipaban al operativo.

Casi todas las decisiones de arquitectura que siguen se explican por el segundo problema.

---

## 2. Vista general

```
┌───────────────────────────────────────────────────────────────────────┐
│  Navegador                                                            │
│  React 19 + Vite · nueve pantallas, cada una en su fragmento diferido │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ HTTPS (pendiente) · x-correlation-id
┌──────────────────────────────▼────────────────────────────────────────┐
│  nginx (contenedor del frontend, puerto 5180)                         │
│  Sirve los estáticos y hace de proxy de /api/ → transporte-app:3003   │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│  NestJS 11 (puerto 3003, prefijo /api/v1)                             │
│                                                                       │
│  IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard │
│       401            403             403                423           │
│                              ↓                                        │
│  ValidationPipe (400) → Service (409) → Repository → Prisma           │
│                                                                       │
│  Seis submódulos: configuracion · talento-operativo · cuadro-diario   │
│                   operativos · transporte · documentos                │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│  PostgreSQL 18 · 27 tablas · 24 CHECK · 8 índices parciales           │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decisiones de arquitectura

### DA-01 · El aislamiento de la información es el requisito, no una buena práctica

Todo el sistema está construido alrededor de que **nadie vea más de lo que le corresponde**:

- `GET /formularios/permitidos` llega **ya filtrado por el servidor**. Si la interfaz recortara una
  lista completa, bastaría con no recortarla.
- El **documento exportable** de la matriz es **exclusivo de la Dirección**: `/jornada/:fecha` no
  tiene ruta de exportación, y es la mitad que sostiene RN-44.
- La matriz consolidada (P-04) es **exclusiva de la Dirección**, ni siquiera la DAF la ve. Desde el
  2026-08-26, **DMIT Instrucción ve los nueve formularios en pantalla** por P-13, sin exportar ni
  cerrar; los otros dos roles departamentales y la DAF siguen viendo solo lo suyo.
- La orden de servicio tiene **cuatro campos** y no menciona a los demás funcionarios.
- `/ordenes-servicio/mias` **no acepta ningún parámetro** que diga de quién son.
- El DTO de selección de personal **no incluye el teléfono**: un campo que no existe en el contrato
  no se filtra por descuido.

### DA-02 · Cuatro capas por submódulo, con una frontera dura

`presentation` → `application` → `domain`, y `infrastructure` como único punto que toca Prisma.
La comunicación entre submódulos es **solo por servicios publicados**.

El caso que mejor lo ilustra: `operativos` pregunta a `talento-operativo` si una persona puede
salir y recibe **un veredicto con su motivo, nunca los antecedentes**. Sin acceso a ellos, no puede
reimplementar las reglas de descanso aunque quisiera.

### DA-03 · Las reglas viven en un solo sitio

Las reglas de descanso están **solo** en `talento-operativo`. Se resistió la tentación de
duplicarlas en `operativos` y en `transporte`, donde también harían falta.

### DA-04 · Los umbrales son datos, no código

Ocho parámetros en `t_parametro_politica`, con su tipo, su rango y su descripción. Las políticas
los leen; **nunca una constante literal**.

La consecuencia práctica: cuando la Dirección decida si la hora de cierre es 14H00 o 15H00, se
cambia desde una pantalla y rige de inmediato. Y como el rango viaja con el valor, **la pantalla
P-09 no conoce ningún parámetro en concreto**: un noveno aparecería solo.

### DA-05 · Cuatro niveles para acotar la escritura de la DAF

La DAF escribe dos campos de los nueve formularios. La restricción no está en un sitio, sino en
cuatro:

1. **Endpoints propios** bajo `/transporte`, con `@Roles(DAF)`.
2. **Un DTO de exactamente dos propiedades**, con `forbidNonWhitelisted`.
3. **Escritura acotada en el repositorio.**
4. **Una pantalla donde todo lo demás llega deshabilitado.**

Los tres primeros siguen en pie aunque la pantalla se equivoque.

### DA-06 · La ventana restringe la escritura, nunca la lectura

`VentanaCargaGuard` deja pasar toda petición de lectura. La Dirección revisa el cuadro
**precisamente cuando las ventanas ya vencieron**.

Y no se aplica a la administración: aplicar la ventana a la pantalla que configura las ventanas
crearía un cepo del que no se sale desde la aplicación.

### DA-07 · La auditoría se escribe dentro de la transacción

No existe la posibilidad de un cambio guardado sin su rastro. Los **eventos**, en cambio, se emiten
**después de confirmar**: un evento emitido dentro de una transacción que después se revierte
anuncia algo que no ocurrió.

### DA-08 · Concurrencia por bloqueo optimista

`t_operativo.version` con `updateMany({ where: { id, version } })`. Si otro usuario modificó la
fila, no se actualiza ninguna y se responde `409`. El secuencial diario se cuenta e inserta
**dentro de la misma transacción**, con reintento.

### DA-09 · Fechas de calendario en UTC, instantes en Guayaquil

Las columnas `@db.Date` no tienen hora ni huso: se manejan en UTC y viajan como texto
`AAAA-MM-DD`. Convertirlas a `Date` en Quito —UTC−5— las desplaza un día.

Es la fuente de error más silenciosa del sistema, y la regla se aplica en los dos lados: el
frontend compara cadenas y el backend construye con `Date.UTC(...)`.

### DA-10 · Aislar la identidad en un solo punto · **la decisión se validó sola**

Se aisló toda la resolución de identidad en `IdentidadGuard`: el único que la construye y el único
que asigna `request.user`. Mientras fue provisional, era **el único archivo provisional del
sistema**.

**Llegó Auth central en agosto de 2026 y la cadena posterior no cambió.** Ésa es la medida del
acierto: `RolesGuard`, `FormularioRolGuard` y `VentanaCargaGuard` siguen exactamente igual, porque
nunca supieron de dónde salía la identidad. Lo que sí hizo falta —y no estaba previsto— fue un
submódulo nuevo, `modules/identidad`, para los tres endpoints de sesión.

**El guard sigue siendo síncrono**, que era la otra propiedad que se quiso conservar: verificar un
JWT propio no toca la red ni Redis.

### DA-11 · Los colores son un dato institucional

Los nueve colores del banner viven en la base y viajan en el JSON. El frontend **los pinta, no los
define**: tenerlos en la hoja de estilos significaría que cambiar el color de un formulario exige
desplegar la interfaz.

Única excepción, y es de legibilidad: el **color del texto sobre el banner** se elige entre blanco
y negro por luminancia relativa WCAG, porque `colorAcento` no tenía valor real.

### DA-12 · Ninguna información depende solo del color

En un sistema llamado *cuadro de colores* esto exige atención deliberada. Cada celda amarilla lleva
el mensaje del servidor; cada estado lleva su palabra; cada banner lleva su número, su nombre y el
nombre de su color.

### DA-13 · Carga diferida por ruta, con la guarda por fuera

Cada pantalla en su fragmento. `RutaProtegida` envuelve **por fuera** de `Suspense`: al revés, la
aplicación descargaría el paquete de una pantalla para descubrir después que el rol no puede verla.

### DA-14 · El PDF lo genera el servidor

Con `pdfkit`, elegido entre las tres librerías ya presentes **porque trae sus propias fuentes**:
`pdfmake` exige empaquetar archivos `.ttf`, y un documento que falla en producción por una fuente
ausente es peor que uno más sobrio.

El navegador solo descarga. Montar un visor sería rehacer el documento con otra librería y otro
resultado.

### DA-15 · Los datos maestros no se inventan

La semilla **no completa** los catálogos que el negocio no entregó. Imprime al terminar qué quedó
sin cargar y qué pendiente lo bloquea.

Es la decisión que más veces se puso a prueba durante la implementación, y la que da valor al
análisis: **distinguir lo acordado de lo supuesto**.

---

## 4. Modelo de dominio

### Agregados

| Agregado | Raíz | Invariantes que protege |
|---|---|---|
| **Cuadro diario** | `CuadroDiario` | El estado se deriva de las ventanas; cerrado no admite escritura |
| **Operativo** | `Operativo` | Identificador único por día; punto de catálogo **o** libre, no ambos; transporte coherente |
| **Funcionario** | `Funcionario` | Baja lógica; disponibilidad sin solapes |
| **Orden de servicio** | `OrdenServicio` | Una sola vigente por operativo y persona; **cuatro campos** |

### Objetos de valor

`IdentificadorOperativo` · `RangoHorario` · `DatoAislado`

`DatoAislado` se construye congelado (`Object.freeze`) y se valida al leerlo de la base: si alguien
hubiera escrito en la columna JSONB por fuera del sistema, se detiene ahí en lugar de entregar un
documento con un campo que nadie autorizó.

### Políticas

| Política | Dónde | Qué decide |
|---|---|---|
| Descanso de personal | `talento-operativo` | Patrulla consecutiva, tope de salidas, jornada, contrato |
| Descanso de conductor | `talento-operativo` | Solapamiento y jornada del conductor |
| Alertas del operativo | `operativos` | Qué celdas se marcan y por qué |
| Composición de personal | `operativos` | Área admitida, cupo compartido, sin repetir |
| Capacidad de flota | `transporte` | Compara demanda con lo declarado. **Nunca lanza excepción** |

**Son funciones puras**: reciben los datos ya resueltos y devuelven un veredicto. Por eso se pueden
probar sin base de datos, y por eso hay 738 pruebas unitarias.

---

## 5. Atributos de calidad

| Atributo | Cómo se sostiene |
|---|---|
| **Confidencialidad** | Filtrado en el servidor; contratos que no incluyen lo que no debe salir |
| **Trazabilidad** | Auditoría dentro de la transacción; correlación en cada petición |
| **Corrección** | 24 `CHECK` en la base, además de las reglas en el código |
| **Disponibilidad** | Comprobaciones de salud; `depends_on` con condición |
| **Rendimiento** | 8 índices parciales; `ANALYZE` tras la siembra; `pg_stat_statements` desde el día uno |
| **Mantenibilidad** | Cuatro capas; políticas puras; 1149 pruebas |
| **Seguridad del contenedor** | Los dos contenedores de aplicación corren sin privilegios |

---

## 6. Lo que la arquitectura no resuelve

| Ausencia | Efecto | Dónde entraría |
|---|---|---|
| ~~**Identidad real**~~ | ✅ **Resuelta el 19-AGO-2026.** Auth central con cookie `HttpOnly` | `modules/identidad` + el modo cookie de `IdentidadGuard` |
| ~~**Administración de usuarios**~~ | ✅ **Resuelta el 19-AGO-2026.** Pantalla P-11, con el enlace de la ficha por cédula | `identidad/` + `/administracion/usuarios` |
| **Firma asimétrica** | El secreto de Auth es HS256 **compartido por todo el ecosistema**: cualquier módulo integrado puede firmar tokens válidos para los demás | RS256 con clave pública |
| **HTTPS** | Tráfico en claro | Proxy institucional |
| **Métricas y alertas** | Solo registro y `pg_stat_statements` | Infraestructura |
| **Purga de auditoría** | `t_auditoria` crece sin límite (PV-18) | Tarea programada |
| **Alta disponibilidad** | Un contenedor por servicio | El diseño la tolera; no se ha probado |
| **Notificaciones** | La solicitud de apoyo no avisa a nadie (PV-12) | Depende de decidir el flujo |

---

## 7. Riesgos vigentes

| # | Riesgo | Estado |
|---|---|---|
| R-01 | El matrizador cesó funciones sin traspaso | **Materializado.** Este sistema es la respuesta |
| R-02 | Resistencia a la adopción: «es más fácil mandar un WhatsApp» | Abierto. Mitigación: formulario condensado y estadísticas por unidad |
| R-03 | Un solo desarrollador para todo el ecosistema | Abierto |
| R-05 | Entidades externas sin obligación de usar la plantilla | Abierto. Requiere memorando |
| R-07 | Riesgo legal preexistente: vehículos sin orden de movilización | El sistema deja evidencia; no resuelve lo jurídico |

---

## 8. Trazabilidad módulo → arquitectura

| Bloque | Módulos | Aporte |
|---|---|---|
| A · Cimientos | M-01 a M-05 | Prisma, esquema, semilla, núcleo transversal, autorización |
| B · Configuración | M-06 a M-08 | Parámetros, formularios, ventanas |
| C · Talento | M-09 a M-12 | Objetos de valor, personal, historial, **reglas de descanso** |
| D · Jornada | M-13 a M-16 | Cuadro diario, operativos, personal, apoyo |
| E · Logística | M-17, M-18 | Transporte y capacidad de flota |
| F · Documentos | M-19, M-20 | Matriz consolidada y órdenes de servicio |
| G · Interfaz | M-21 a M-29 | Base del frontend y las nueve pantallas |
| H · Cierre | M-30 | Contenedores, despliegue e identidad real |
