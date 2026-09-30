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
 * docs/implementacion/IMPLEMENTATION_GUIDE.md §12. Las validaciones del navegador existen para dar
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

  // VAL-02 y VAL-03. El HORARIO DEL OPERATIVO SALIÓ DEL ESQUEMA el 2026-09-08 (RN-66): en el
  // registro el operativo ya no tiene horario propio —lo lleva cada persona— y en el modo
  // clásico (adicional) el horario único lo valida `FormularioOperativo.validate`, que sabe
  // en qué modo está. Dejarlo obligatorio aquí bloquearía el registro, donde el campo no existe.
  horaInicio: Yup.string(),
  horaFin: Yup.string(),

  // VAL-04. Al menos una zonal (RN-19): la pantalla ya ofrece varias desde el 2026-09-21.
  zonalesIds: Yup.array()
    .of(Yup.number())
    .min(1, "Elija al menos una zonal."),

  // VAL-05 y VAL-06. El punto es del catálogo o capturado como adicional.
  punto: Yup.string().required("Elija el punto de encuentro."),
  puntoLibre: Yup.string()
    .max(220, "El punto adicional no puede superar los 220 caracteres.")
    .when("punto", {
      is: "ADICIONALES",
      then: (esquema) =>
        esquema.required("Escriba el punto de encuentro adicional."),
    }),

  // VAL-07 y VAL-08. El tipo de control. En el desplegable único es obligatorio; en el
  // formulario que admite varios (form 8) el valor único queda vacío y basta con haber
  // elegido al menos uno en la lista (`tiposControlIds`) O escrito un adicional (`tipoLibre`).
  // Depende de los DOS para que «solo adicional, sin tipo de catálogo» —válido en el
  // servidor— también lo sea aquí. El ciclo con `tipoLibre` se evita porque `tipoLibre` lee
  // `tipoControl` con un `.test` (sin declarar dependencia), no con otro `.when`.
  tipoControl: Yup.string().when(["tiposControlIds", "tipoLibre"], {
    is: (ids: number[] | undefined, libre: string | undefined) =>
      (ids?.length ?? 0) === 0 && (libre ?? "").trim() === "",
    then: (esquema) => esquema.required("Elija el tipo de control."),
    otherwise: (esquema) => esquema,
  }),
  /** Varios tipos, SOLO en el formulario que lo admite (form 8). */
  tiposControlIds: Yup.array().of(Yup.number().required()).default([]),
  tipoLibre: Yup.string()
    .max(220, "El tipo adicional no puede superar los 220 caracteres.")
    .test(
      "adicional-requerido",
      "Escriba el tipo de control adicional.",
      function (valor) {
        // Solo en el desplegable único: al elegir «ADICIONALES» hay que escribirlo. En el
        // form 8 el adicional es opcional, y allí `tipoControl` nunca vale «ADICIONALES».
        if (this.parent.tipoControl !== "ADICIONALES") return true;
        return (valor ?? "").trim() !== "";
      },
    ),

  // VAL-09. Al menos una institución participante.
  institucionesIds: Yup.array()
    .of(Yup.number().required())
    .min(1, "Elija al menos una institución participante."),

  // VAL-11. Las observaciones son opcionales. Desde el 2026-09-09 son NOTAS independientes
  // (bitácora): una lista de textos. El servidor valida el largo y el número de cada una.
  observaciones: Yup.array()
    .of(Yup.string().max(2000, "Cada nota no puede superar los 2000 caracteres."))
    .default([]),
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
// LONGITUD DE LA CÉDULA, EN UN SOLO SITIO (Opción B, 2026-09-28). Gemelo del backend
// (`LONGITUD_CEDULA` en reglas-personal.ts). Cambiar aquí ajusta los dos esquemas de este
// archivo (funcionario y conductor). Es solo formato —esa cantidad de dígitos—, no el
// verificador, que el servidor ya no exige.
const LONGITUD_CEDULA = 10;
const PATRON_CEDULA = new RegExp(`^\\d{${LONGITUD_CEDULA}}$`);

export const esquemaFuncionario = Yup.object({
  cedula: Yup.string()
    .matches(
      PATRON_CEDULA,
      `La cédula son ${LONGITUD_CEDULA} dígitos, sin guiones ni espacios.`,
    )
    .required("Indique la cédula del funcionario."),

  apellidos: Yup.string()
    .max(90, "Los apellidos no superan los 90 caracteres.")
    .required("Indique los apellidos del funcionario."),

  nombres: Yup.string()
    .max(90, "Los nombres no superan los 90 caracteres.")
    .required("Indique los nombres del funcionario."),

  telefono: Yup.string().max(20, "El teléfono no supera los 20 caracteres."),

  /*
    SOLO LA LONGITUD, NO EL FORMATO, y es deliberado. Quien decide si un correo es válido
    es `esCorreoValido` en el servidor, y su mensaje se muestra tal cual (regla 7). Poner
    aquí una segunda expresión daría dos definiciones de «correo válido» que acabarían
    discrepando, y la que rechazara primero sería la del navegador — la que nadie recuerda
    que existe. Es el mismo criterio con el que el teléfono tampoco valida su formato aquí.
  */
  correo: Yup.string().max(160, "El correo no supera los 160 caracteres."),

  cargo: Yup.string().max(90, "El cargo no supera los 90 caracteres."),

  area: Yup.string().required("Indique el área del funcionario."),

  /*
    ZONAL OPCIONAL EN LA FICHA (2026-09-21). Se ofrece al personal DMIP (OPERATIVOS/GENERAL/TECNICO);
    para INSTRUCCION el campo ni se pinta (su zonal la fija la matriz de cobertura). Nunca se exige:
    es un dato optativo. El valor es el id como texto (valor del `<select>`).
  */
  zonalId: Yup.string(),

  // De este campo depende RN-26: quién puede salir de noche y en fin de semana.
  tipoContrato: Yup.string().required(
    "Indique el tipo de contrato: de él depende si la persona puede salir de noche o en fin de semana.",
  ),

  /*
    SIN `direccion`, DESDE EL 2026-09-01. Se retiró el campo del formulario: la deduce el
    servidor del área. Dejarla exigida aquí habría impedido guardar cualquier ficha, sin
    ningún control al que llevar el foco —el defecto que el propio esquema existe para
    evitar—, porque el mensaje señalaría un campo que ya no se pinta.
  */
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

/**
 * Alta o corrección de una zonal. Pantalla P-08 (2026-09-04). Solo el nombre: el código
 * lo autogenera el servidor. El máximo es 90, el ancho de `zona_nombre`.
 */
export const esquemaZonal = Yup.object({
  nombre: Yup.string()
    .min(3, "El nombre de la zonal es demasiado corto.")
    .max(90, "El nombre de la zonal no puede superar los 90 caracteres.")
    .required("Indique el nombre de la zonal."),
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
 * Alta y edición de un formulario. Pantalla de administración de formularios (2026-09-29).
 *
 * Valida en el borde lo que la pantalla puede: número (1..99), código, nombre, que se haya
 * elegido un color de la paleta (`colorFondo`), el rol dueño, el prefijo y al menos un área.
 * El resto (paleta exacta, unicidad) lo revalida el servidor y su mensaje se muestra tal cual.
 */
export const esquemaFormulario = Yup.object({
  numero: Yup.number()
    .typeError("El número del formulario es un entero.")
    .integer("El número del formulario es un entero.")
    .min(1, "El número del formulario va del 1 al 99.")
    .max(99, "El número del formulario va del 1 al 99.")
    .required("Indique el número del formulario."),

  codigo: Yup.string()
    .trim()
    .max(40, "El código no puede superar los 40 caracteres.")
    .required("Indique el código del formulario."),

  nombre: Yup.string()
    .trim()
    .max(160, "El nombre no puede superar los 160 caracteres.")
    .required("Indique el nombre del formulario."),

  colorFondo: Yup.string().required("Elija un color de la paleta."),

  rolDueno: Yup.string().required("Elija el departamento dueño del formulario."),

  prefijo: Yup.string()
    .trim()
    .max(12, "El prefijo no puede superar los 12 caracteres.")
    .required("Indique el prefijo del identificador."),

  areas: Yup.array()
    .of(Yup.string())
    .min(1, "El formulario debe admitir al menos un área."),
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
    .matches(
      PATRON_CEDULA,
      `La cédula son ${LONGITUD_CEDULA} dígitos, sin guiones ni espacios.`,
    )
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

/**
 * P-16 · una parada de taller. RN-DAF-05.
 *
 * `desde` y `hasta` se comparan **como cadenas**, no como fechas: en `AAAA-MM-DD` el orden
 * alfabético es el cronológico, y convertirlas a `Date` en Quito —UTC−5— las desplazaría
 * un día (regla 12 de CLAUDE.md).
 *
 * El taller, la hora y el motivo son opcionales a propósito: una avería se registra en
 * cuanto se sabe, y el taller concreto se conoce después. Exigirlos retrasaría el registro
 * justo cuando más urge que la placa deje de ofrecerse.
 */
export const esquemaMantenimiento = Yup.object({
  desde: Yup.string().required("Indique desde qué día está parado el vehículo."),

  hasta: Yup.string()
    .required("Indique hasta qué día está parado el vehículo.")
    .test(
      "no-anterior",
      "La fecha de fin no puede ser anterior a la de inicio.",
      function (valor) {
        const { desde } = this.parent as { desde?: string };
        if (!valor || !desde) return true;
        return valor >= desde;
      },
    ),

  taller: Yup.string().max(120, "El taller no supera los 120 caracteres."),

  hora: Yup.string().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$|^$/, {
    message: "La hora de la cita se escribe como HH:MM.",
  }),

  motivo: Yup.string().max(220, "El motivo no supera los 220 caracteres."),
});

/**
 * P-15 · la capacidad declarada del día. RN-46.
 *
 * Los dos números son ENTEROS y admiten cero: declarar cero vehículos hábiles es una
 * afirmación legítima —hoy no hay flota— y distinta de no haber declarado nada, que es lo
 * que el servidor representa con `declarada: null`.
 */
export const esquemaCapacidad = Yup.object({
  vehiculosHabiles: Yup.number()
    .typeError("Indique cuántos vehículos están hábiles hoy.")
    .integer("El número de vehículos no admite decimales.")
    .min(0, "El número de vehículos no puede ser negativo.")
    .required("Indique cuántos vehículos están hábiles hoy."),

  conductoresHabiles: Yup.number()
    .typeError("Indique cuántos conductores están hábiles hoy.")
    .integer("El número de conductores no admite decimales.")
    .min(0, "El número de conductores no puede ser negativo.")
    .required("Indique cuántos conductores están hábiles hoy."),

  observacion: Yup.string().max(
    300,
    "La observación no supera los 300 caracteres.",
  ),
});
