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

import { esCorreoValido, esTelefonoValido } from "../utils/personal.util.ts";

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
  // clásico (adicional) el horario único lo valida `FormOperativo.validate`, que sabe
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

  /*
    FORMATO DEL TELÉFONO Y DEL CORREO PERSONAL EN EL NAVEGADOR DESDE EL 2026-10-08, a pedido del
    rediseño de P-07. Hasta entonces aquí solo se medía la longitud para no tener dos definiciones
    de «válido»; ahora las dos expresiones son ESPEJO EXACTO de las del servidor
    (`esTelefonoValido`, `esCorreoValido` de `utils/personal.util.ts` ↔ `reglas-personal.ts`) y el
    servidor sigue siendo quien decide. Vacíos no se validan: son opcionales.
  */
  telefono: Yup.string()
    .max(20, "El teléfono no supera los 20 caracteres.")
    .test(
      "celular-09",
      "El teléfono debe ser un celular de diez dígitos que empiece por 09, por ejemplo 0985144231.",
      (telefono) => !telefono || esTelefonoValido(telefono),
    ),

  correoInstitucional: Yup.string().max(
    160,
    "El correo institucional no supera los 160 caracteres.",
  ),
  correoPersonal: Yup.string()
    .max(160, "El correo personal no supera los 160 caracteres.")
    .test(
      "correo-valido",
      "Escriba un correo válido, por ejemplo nombre@correo.com.",
      (correo) => !correo || esCorreoValido(correo),
    ),

  cargo: Yup.string().max(90, "El cargo no supera los 90 caracteres."),

  area: Yup.string().required("Indique el área del funcionario."),

  /*
    ZONAL OPCIONAL EN LA FICHA (2026-09-21). Se ofrece a TODAS las áreas desde el 2026-10-08,
    Instrucción incluida (antes solo la fijaba la matriz de cobertura). Nunca se exige: es un dato
    optativo. El valor es el id como texto (valor del `<select>`).
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
 * EL NOMBRE ÚNICO DENTRO DE LA ZONAL **NO** SE COMPRUEBA EN ESTE ESQUEMA.
 *
 * Lo garantiza el servidor (409 `CATALOGO_DUPLICADO`, sin tildes ni mayúsculas), porque dos
 * administradores a la vez esquivarían cualquier control del navegador. Desde el 2026-10-12 el
 * cajón de P-08 AVISA en vivo contra lo que ya tiene cargado (`buscarDuplicado`, en
 * `utils/catalogos.util.ts`), pero eso es comodidad, no la garantía. Es el caso 3 del plan.
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

// ─────────────────────────── Ventana de carga (2026-10-07) ───────────────────────────

const PATRON_HORA_VENTANA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MENSAJE_HORA_VENTANA = "La hora se escribe en formato HH:MM, por ejemplo 16:30.";

/** `HH:MM` → minutos del día. */
const minutosVentana = (hora: string): number => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

/**
 * «Editar ventana de carga». Las horas viajan como texto `HH:MM` (el `input type="time"` entrega
 * ese formato) y una apertura vacía significa «desde el inicio del día». Con «Sin restricción» no
 * se exige nada: no se usan horas ni mensaje. Los textos son los mismos que devuelve el servidor,
 * que sigue siendo la autoridad.
 */
export const esquemaVentana = Yup.object().shape({
  tipo: Yup.string().required(),
  horaApertura: Yup.string()
    .default("")
    .test("formato", MENSAJE_HORA_VENTANA, (valor) => !valor || PATRON_HORA_VENTANA.test(valor)),
  horaCierre: Yup.string()
    .default("")
    .when("tipo", {
      is: (tipo: string) => tipo !== "SIN_RESTRICCION",
      then: (campo) =>
        campo
          .required("Indique la hora de cierre.")
          .matches(PATRON_HORA_VENTANA, MENSAJE_HORA_VENTANA)
          .test(
            "posterior",
            "La hora de cierre debe ser posterior a la de apertura.",
            function posterior(cierre) {
              const apertura = this.parent.horaApertura as string;
              if (!cierre || !apertura) return true;
              if (!PATRON_HORA_VENTANA.test(cierre) || !PATRON_HORA_VENTANA.test(apertura)) {
                return true;
              }
              return minutosVentana(cierre) > minutosVentana(apertura);
            },
          ),
    }),
  mensajeCierre: Yup.string()
    .default("")
    .when("tipo", {
      is: (tipo: string) => tipo !== "SIN_RESTRICCION",
      then: (campo) =>
        campo
          .trim()
          .required("Indique el mensaje que verá el funcionario cuando la ventana esté cerrada.")
          .min(10, "El mensaje de cierre debe explicarle al funcionario cuándo vuelve a abrirse.")
          .max(400, "El mensaje de cierre no puede superar los 400 caracteres."),
    }),
});
