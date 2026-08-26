/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Esquemas de validación de formularios
 * Archivo: validationSchemas.ts
 * Responsabilidad: Centralizar los esquemas de validación con Yup del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import * as Yup from "yup";

/**
 * RN-07 · Los horarios se registran únicamente en horas completas y medias horas.
 * Fuente: docs/FASE2-documentacion-funcional.md §8.1
 */
export const PATRON_HORA_MEDIA = /^([01]\d|2[0-3]):(00|30)$/;

/**
 * VAL-02 y VAL-03 · Hora de inicio y de fin obligatorias, en intervalos de treinta
 * minutos. La comprobación de que el fin es posterior al inicio contempla el cruce
 * de medianoche y se resuelve con utils/horario.util.ts.
 * Fuente: docs/FASE2-documentacion-funcional.md §19.1
 */
export const esquemaHorario = Yup.object().shape({
  horaInicio: Yup.string()
    .required("Indique la hora de inicio del operativo.")
    .matches(PATRON_HORA_MEDIA, "La hora debe ser en punto o media hora."),
  horaFin: Yup.string()
    .required("Indique la hora de fin del operativo.")
    .matches(PATRON_HORA_MEDIA, "La hora debe ser en punto o media hora."),
});

/**
 * Los esquemas de cada pantalla se agregan en la etapa E10 de
 * docs/IMPLEMENTATION_GUIDE.md §12. Las validaciones del navegador existen para dar
 * respuesta inmediata, nunca como control efectivo: toda regla se verifica también
 * en el servidor. Ver docs/FASE5-diseno-interfaz.md §7.1.
 */
export type HorarioFormValues = Yup.InferType<typeof esquemaHorario>;

/**
 * VAL-01 a VAL-11 · Registro de operativo (P-01, módulo M-22).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS REGLAS DE DESCANSO **NO ESTÁN AQUÍ**, y su ausencia es deliberada.
 *
 * VAL-12 a VAL-18 —disponibilidad, patrulla consecutiva, tope de salidas, solapamiento,
 * jornada máxima, cupo compartido— dependen de datos que el navegador no posee: el
 * historial de la persona, sus otras asignaciones del día y los umbrales configurados.
 * Replicarlas aquí exigiría traerse esos datos al cliente, que es justo lo que la
 * frontera de `talento-operativo` impide.
 *
 * Se muestran al recibir el `409`, **sin perder lo capturado**.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const esquemaOperativo = Yup.object().shape({
  // VAL-01. El formulario se elige con el selector, no se escribe.
  formularioCodigo: Yup.string().required("Elija el formulario."),

  // VAL-02 y VAL-03.
  horaInicio: Yup.string()
    .required("Indique la hora de inicio del operativo.")
    .matches(PATRON_HORA_MEDIA, "La hora debe ser en punto o media hora."),
  horaFin: Yup.string()
    .required("Indique la hora de fin del operativo.")
    .matches(PATRON_HORA_MEDIA, "La hora debe ser en punto o media hora.")
    .notOneOf(
      [Yup.ref("horaInicio")],
      "El horario no tiene duración: indique una hora de fin distinta.",
    ),

  // VAL-04. Al menos una zonal. La pantalla ofrece una, pero el contrato admite varias.
  zonalId: Yup.number()
    .typeError("Elija al menos una zonal.")
    .required("Elija al menos una zonal."),

  // VAL-05 y VAL-06. El punto es del catálogo o capturado como adicional.
  punto: Yup.string().required("Elija el punto de encuentro."),
  puntoLibre: Yup.string()
    .max(220, "El punto adicional no puede superar los 220 caracteres.")
    .when("punto", {
      is: "ADICIONALES",
      then: (esquema) =>
        esquema.required("Escriba el punto de encuentro adicional."),
    }),

  // VAL-07 y VAL-08. Ídem para el tipo de control.
  tipoControl: Yup.string().required("Elija el tipo de control."),
  tipoLibre: Yup.string()
    .max(220, "El tipo adicional no puede superar los 220 caracteres.")
    .when("tipoControl", {
      is: "ADICIONALES",
      then: (esquema) =>
        esquema.required("Escriba el tipo de control adicional."),
    }),

  // VAL-09. Al menos una institución participante.
  institucionesIds: Yup.array()
    .of(Yup.number().required())
    .min(1, "Elija al menos una institución participante."),

  // VAL-11. Las observaciones son opcionales.
  observaciones: Yup.string().max(
    2000,
    "Las observaciones no pueden superar los 2000 caracteres.",
  ),
});

export type OperativoFormValues = Yup.InferType<typeof esquemaOperativo>;

/**
 * Alta y edición de un funcionario. Pantalla P-07 (M-27).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA CÉDULA SE COMPRUEBA POR SU FORMA, NO POR SU DÍGITO VERIFICADOR.
 *
 * Que sean diez dígitos es una ayuda para escribir: detecta el guion de más y el dígito
 * de menos antes de gastar un viaje al servidor. Que el dígito verificador cuadre es una
 * **regla**, la comprueba `verificarCedula` en el servidor, y replicar aquí el módulo 10
 * sería tener dos implementaciones de la misma norma que empiezan a diferir en cuanto se
 * corrija una. Cuando el servidor la rechaza, su mensaje se muestra tal cual.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const esquemaFuncionario = Yup.object({
  cedula: Yup.string()
    .matches(/^\d{10}$/, "La cédula son diez dígitos, sin guiones ni espacios.")
    .required("Indique la cédula del funcionario."),

  apellidos: Yup.string()
    .max(90, "Los apellidos no superan los 90 caracteres.")
    .required("Indique los apellidos del funcionario."),

  nombres: Yup.string()
    .max(90, "Los nombres no superan los 90 caracteres.")
    .required("Indique los nombres del funcionario."),

  telefono: Yup.string().max(20, "El teléfono no supera los 20 caracteres."),

  cargo: Yup.string().max(90, "El cargo no supera los 90 caracteres."),

  area: Yup.string().required("Indique el área del funcionario."),

  // De este campo depende RN-26: quién puede salir de noche y en fin de semana.
  tipoContrato: Yup.string().required(
    "Indique el tipo de contrato: de él depende si la persona puede salir de noche o en fin de semana.",
  ),

  direccion: Yup.string().required(
    "Indique a qué dirección pertenece el funcionario.",
  ),
});

/**
 * Registro de una ausencia. Pantalla P-07 (M-27).
 *
 * El rango se comprueba aquí **y** en el servidor **y** en la base, con
 * `ck_disponibilidad_rango`. No es redundancia inútil: aquí evita el viaje, allá es la
 * regla, y en la base es la garantía de que ningún camino la esquive.
 *
 * El **solape** con otro periodo (INV-14) no se comprueba aquí: depende de los demás
 * periodos de esa persona, que el formulario no tiene por qué conocer. Llega como `409` y
 * se muestra tal cual.
 */
export const esquemaAusencia = Yup.object({
  estado: Yup.string().required("Indique la situación de la persona."),

  desde: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como AAAA-MM-DD.")
    .required("Indique desde qué día está ausente."),

  hasta: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como AAAA-MM-DD.")
    .required("Indique hasta qué día está ausente.")
    // Las dos son fechas de calendario en `AAAA-MM-DD`: su orden alfabético es el
    // cronológico, así que comparar cadenas no necesita convertirlas ni desplazarlas.
    .test(
      "no-termina-antes",
      "La ausencia no puede terminar antes de empezar.",
      function (hasta) {
        const desde = this.parent.desde as string | undefined;
        return !desde || !hasta || desde <= hasta;
      },
    ),

  motivo: Yup.string().max(220, "El motivo no supera los 220 caracteres."),
});

/**
 * Alta de un punto de encuentro. Pantalla P-08 (M-28).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL NOMBRE ÚNICO DENTRO DE LA ZONAL **NO** SE COMPRUEBA AQUÍ.
 *
 * `uq_punto_nombre_zonal` es un índice compuesto y el servidor lo verifica antes de
 * escribir. Comprobarlo en el navegador exigiría tener todos los puntos de esa zonal
 * —incluidos los de otros formularios, que esta pantalla no recibe— y aun así dos
 * administradores trabajando a la vez lo esquivarían. Llega como rechazo del servidor con
 * el nombre del punto que ya existe, y se muestra tal cual. Es el caso 3 del plan.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const esquemaPunto = Yup.object({
  nombre: Yup.string()
    .min(3, "El nombre del punto es demasiado corto.")
    .max(200, "El nombre del punto no puede superar los 200 caracteres.")
    .required("Indique el nombre del punto de encuentro."),

  // RN-17: el punto pertenece a una zonal, y de ahí sale el filtrado en cascada de P-01.
  zonalId: Yup.number()
    .min(1, "Indique a qué zonal pertenece el punto.")
    .required("Indique a qué zonal pertenece el punto."),
});

/** Alta de un tipo de control. Pantalla P-08 (M-28). */
export const esquemaTipoControl = Yup.object({
  nombre: Yup.string()
    .min(3, "El nombre del tipo de control es demasiado corto.")
    .max(200, "El nombre del tipo de control no puede superar los 200 caracteres.")
    .required("Indique el nombre del tipo de control."),
});

/** Alta de una institución participante. Pantalla P-08 (M-28). */
export const esquemaInstitucion = Yup.object({
  sigla: Yup.string()
    .min(2, "La sigla es demasiado corta.")
    .max(40, "La sigla no puede superar los 40 caracteres.")
    .required("Indique la sigla de la institución."),

  nombre: Yup.string()
    .min(3, "La denominación es demasiado corta.")
    .max(200, "La denominación no puede superar los 200 caracteres.")
    .required("Indique la denominación completa de la institución."),
});

/**
 * Alta y edición de un conductor. Pantalla P-12 (2026-08-20).
 *
 * ESPEJO DEL CONTRATO DEL SERVIDOR, no una invención de la pantalla: `CrearConductorDto`
 * exige cédula y nombre, y acota teléfono a 20, licencia a 10 y nombre a 160. Validar aquí
 * evita el viaje, no sustituye la comprobación: el servidor sigue rechazando lo que no
 * cumple, y su mensaje se muestra tal cual (regla 7).
 *
 * LA CÉDULA SON DIEZ DÍGITOS, igual que en `esquemaFuncionario`. La columna admite trece
 * caracteres —`@db.VarChar(13)`, para pasaportes— pero ninguna fuente define ese caso y
 * aceptar cualquier cosa haría que la unicidad de cédula dejara de significar algo.
 */
export const esquemaConductor = Yup.object({
  cedula: Yup.string()
    .matches(/^\d{10}$/, "La cédula son diez dígitos, sin guiones ni espacios.")
    .required("Indique la cédula del conductor."),

  nombreCompleto: Yup.string()
    .max(160, "El nombre no supera los 160 caracteres.")
    .required("Indique el nombre completo del conductor."),

  telefono: Yup.string().max(20, "El teléfono no supera los 20 caracteres."),

  licenciaTipo: Yup.string().max(
    10,
    "El tipo de licencia no supera los 10 caracteres.",
  ),

  // Vacío es válido: un conductor puede no tener vehículo habitual asignado todavía.
  // Lo que no puede es QUITÁRSELO después, porque el contrato del servidor no admite
  // nulo en este campo. La pantalla lo advierte donde toca.
  vehiculoHabitualId: Yup.string(),
});

/**
 * Alta y edición de un vehículo. Pantalla P-12 (2026-08-20).
 *
 * LA PLACA NO SE VALIDA CONTRA UN PATRÓN, y es deliberado: `vehi_placa` es `VarChar(10)`
 * y **ninguna fuente define su formato**. La flota de la AMC incluye motocicletas y
 * vehículos con placa institucional, y ninguna transcripción dice cómo se escriben.
 * Inventar aquí un patrón `AAA-0000` rechazaría placas legítimas el primer día. Se acota
 * el largo, que es lo único que la base afirma.
 */
export const esquemaVehiculo = Yup.object({
  placa: Yup.string()
    .max(10, "La placa no supera los 10 caracteres.")
    .required("Indique la placa del vehículo."),

  descripcion: Yup.string().max(
    160,
    "La descripción no supera los 160 caracteres.",
  ),
});
