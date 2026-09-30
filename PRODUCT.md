# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**El usuario rey es el operador de central** — confirmado por el dueño del producto el
2026-09-03: cuando los intereses de pantalla chocan, manda él. Registra **decenas de
operativos por jornada**, en sesiones repetitivas, con teclado, bajo la presión de una
ventana de carga que cierra a hora fija. La meta documentada es registrar un operativo en
dos o tres minutos.

Los demás perfiles, en orden de frecuencia de uso:

- **Departamentales** (DMIP Operativos, DMIP Inspecciones, DMIT Instrucción): registran y
  corrigen operativos en sus propios formularios; consultan la Jornada del Día.
- **DAF · Planificación de Transporte**: asigna conductor y placa a los operativos, y solo
  eso. Su proceso real encadena varios operativos por conductor (levantamiento del 28-AGO).
- **Director**: consume la matriz consolidada una vez al día, la exporta y emite las
  órdenes de servicio. Solo lectura.
- **Administradores** (DMIP, DMIT, DAF): catálogos, personal, ventanas, cuentas y flota.
- **Funcionario**: ve únicamente sus propias órdenes de servicio.

## Product Purpose

El Cuadro de Colores es el **compilado diario de los operativos** que la Agencia
Metropolitana de Control ejecutará al día siguiente. No es una herramienta de
planificación: cada dirección planifica en sus instrumentos y aquí se consolida quién se
moviliza, a qué punto y con qué vehículo.

Nació de dos hechos concretos: una sola persona consolidaba el cuadro a mano **y renunció
durante el levantamiento sin traspaso**; y el cuadro circulaba por WhatsApp, con lo que
los intervenidos se anticipaban al operativo. Éxito significa: el cuadro se arma dentro de
su ventana sin depender de nadie insustituible, y cada persona ve exactamente lo suyo y
nada más.

## Positioning

**El aislamiento de la información es el producto, no una buena práctica añadida.** Nueve
formularios independientes, cada uno propiedad de un departamento; una matriz que solo ve
la Dirección; y órdenes de servicio individuales que entregan a cada funcionario solo su
propia asignación. Un sistema genérico de registro no podría afirmar esto: aquí cada
regla de visibilidad (PER-02, PER-04, PER-09) proviene del incidente que originó el
encargo.

## Operating Context

- Intranet institucional de la AMC, Quito. Monitores de escritorio; la verificación de
  diseño se hace a 1440 px y el tope de contenido es 110 rem.
- Identidad por el **portal de Auth central** de la institución; este módulo no tiene
  formulario de ingreso.
- **Ventanas de carga con hora de cierre** en zona `America/Guayaquil`; la carga se
  concentra en los minutos previos al cierre.
- Reemplaza instrumentos reales en uso: `CUADRO DE COLORES.xlsx` y el libro de rol de
  conductores de la DAF (`HORARIO AGOSTO.xlsx`).
- Convive con los demás módulos de SIGOC (Instrucción, Resolución, Ejecución), con los
  que comparte Auth, plantilla visual y pila técnica.

## Capabilities and Constraints

- Dieciséis pantallas construidas; registro y corrección en el mismo formulario; matriz
  y órdenes generadas por el servidor (el PDF nunca se arma en el navegador).
- **CSP estricta** (`script-src 'self'`, `connect-src 'self'`): ningún recurso externo
  —ni fuentes, ni CDN, ni imágenes remotas—. Montserrat se sirve localmente.
- Los colores de los nueve formularios **los entrega el backend**; son datos
  institucionales aprobados, no decisión del frontend.
- El inventario de clases CSS permitido vive en `docs/FASE5-diseno-interfaz.md` §2.2 y
  las reglas invariables en `CLAUDE.md` §6; ambos son autoridad sobre este archivo.
- **Abierto (2026-09-03): el módulo podría exponerse fuera de la intranet** —funcionarios
  en campo u otras dependencias—. No es un plan confirmado, pero el trabajo futuro debe
  preservar la portabilidad: no asumir red local, no depender de HTTP plano (hoy no hay
  TLS y es un hallazgo de seguridad abierto), no fijar anchos de escritorio como únicos.

## Brand Commitments

- **SIGOC — Quito Alcaldía Metropolitana**, manual *Nueva Imagen 2025*: Montserrat,
  minimalismo, cajas rectas, sin degradados, el rojo y los complementarios nunca como
  fondos completos. Fuente: skill `diseno-sigoc`, que es la autoridad de marca.
- El tema de daisyUI en `src/index.css` no se modifica sin autorización.
- Las dos aplicaciones de SIGOC deben **reconocerse como una sola**: plantilla, iconos
  FontAwesome `free-solid` y patrón de modal con cabecera institucional compartidos con
  Instrucción.

## Evidence on Hand

- Datos reales cargados: 9 formularios, 11 zonales, 635 puntos de encuentro del insumo
  aprobado por el negocio el 2026-09-02.
- Documentación funcional completa: `docs/FASE1…FASE5`, más actas de levantamiento con
  DMIP, DMIT y DAF (transcripciones y análisis en el repositorio y en `docs/`).
- Prototipo aprobado por el Product Owner: `docs/PROTOTIPO-sigoc-cuadro-colores.html`.
- **No existen** testimonios, métricas de adopción ni casos de estudio; no fabricarlos.

## Product Principles

1. **Optimizar para la repetición, no para la primera visita.** El operador rey usa esto
   decenas de veces al día; teclado y densidad valen más que la bienvenida.
2. **Lo capturado nunca se pierde.** Corregir, cambiar de modo o fallar un envío no
   descarta lo escrito.
3. **Quien no puede, lo ve apagado y con el motivo en palabras.** Ocultar produce
   sorpresa; explicar produce confianza. Nada se comunica solo con color.
4. **El aislamiento no se relaja por comodidad.** Toda ampliación de visibilidad es una
   decisión del negocio que queda documentada, nunca un efecto colateral.
5. **Los vacíos del negocio se elevan, no se rellenan.** Lo que la fuente no define se
   registra como pendiente de validación (PV-xx) en lugar de completarse con criterio
   propio.

## Accessibility & Inclusion

Sin norma formal exigida — confirmado el 2026-09-03. Rige la disciplina interna del
proyecto, que se mantiene como estándar: ninguna información depende solo del color
(regla 6, deliberada en un sistema que se llama *cuadro de colores*), foco de teclado
visible en todo control, contraste verificado por medición (mínimos 4,5:1 texto y 3:1
indicadores), y soporte de movimiento reducido.
