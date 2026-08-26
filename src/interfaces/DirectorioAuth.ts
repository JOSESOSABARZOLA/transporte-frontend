/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: DirectorioAuth.ts
 * Responsabilidad: Declarar el directorio de Auth central cruzado con las fichas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-21
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ ES ESTO Y QUÉ NO ES.
 *
 * Es **lo que Auth central sabe** de las personas de la institución, puesto al lado de lo
 * que sabemos aquí. No es el maestro de personal: el maestro sigue siendo `t_funcionario`,
 * y de él cuelgan las asignaciones, las ausencias, el historial y las órdenes de servicio.
 *
 * Sirve para una sola cosa: dejar de teclear el maestro. Es el bloqueante **PV-02**, y la
 * institución ya tiene esos datos en otro sitio.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LO QUE AUTH NO SABE, y por eso no está aquí: **el tipo de contrato**. Ni nombramiento,
 * ni ocasional. Comprobado en su código fuente el 2026-08-21. Y es justo el dato del que
 * depende RN-26 —quién puede salir de noche o en fin de semana—, así que se sigue
 * capturando en esta pantalla al crear la ficha.
 *
 * Tampoco sabe el área, ni el cargo, ni el teléfono.
 */

/**
 * Lo que Auth sabe del inspector. `null` si esa persona no lo es.
 *
 * `tipo` son dos letras: `IG` General · `IT` Técnico · `IS` Sustanciador · `IC` CCF/ITCC.
 * Se muestran acompañadas de su nombre, nunca solas: dos letras no son información para
 * quien no conoce la nomenclatura.
 */
export interface InspectorDeAuth {
  tipo: string;
  zonal: string | null;
  codigo: string;
}

/** La ficha local de esa persona, si existe. */
export interface FichaDelDirectorio {
  id: number;
  apellidos: string;
  nombres: string;
  area: string;
  tipoContrato: string;
  activo: boolean;
}

/** Una fila del directorio. Respuesta de `GET /administracion/directorio`. */
export interface FilaDirectorio {
  authId: number;
  cedula: string;
  /**
   * Nombre completo **en un solo campo**: Auth no separa apellidos de nombres.
   *
   * Al crear la ficha se parte por heurística —las dos primeras palabras son los
   * apellidos, que es lo que hace el propio Auth— y el resultado llega al formulario como
   * valor **editable**. «DE LA TORRE PEREZ JUAN» sale mal, y por eso se confirma mirándolo.
   */
  nombre: string;
  usuario: string;
  correo: string;
  dependencia: string | null;
  /** Formateados por Auth como `(Subsistema) Rol`. Se muestran tal cual. */
  roles: string[];
  inspector: InspectorDeAuth | null;
  /**
   * `null` ⇒ esa persona **no puede ser convocada a un operativo** todavía.
   *
   * Es el dato que da sentido a la pantalla, no un adorno: sin ficha no hay a quién
   * asignar, ni reglas de descanso que aplicar, ni orden de servicio que emitir.
   */
  ficha: FichaDelDirectorio | null;
}

/**
 * Respuesta de `GET /administracion/directorio`. Desde el 2026-08-24.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUE AUTH NO ESTÉ ES UN ESTADO, NO UN ERROR DE ESTA PETICIÓN.
 *
 * Antes el servidor respondía 503 y la pantalla lo atrapaba. Servía mientras el directorio
 * era una pestaña: fallaba una vista y el resto seguía. Deja de servir cuando el
 * directorio es **el primer paso del alta**, porque entonces la ventana tiene que
 * distinguir «no se pudo preguntar» de «preguntamos y no hay nadie», y por el `catch` esa
 * distinción se pierde.
 *
 * Son los mismos tres campos que usa el módulo de Instrucción para lo mismo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export interface RespuestaDirectorio {
  disponible: boolean;
  /** Redactado por el servidor. Se muestra tal cual (regla 7). `null` si todo fue bien. */
  motivo: string | null;
  personas: FilaDirectorio[];
}

/** Nombre legible de cada tipo de inspector de Auth. Regla 6: la sigla no basta. */
export const NOMBRE_TIPO_INSPECTOR: Record<string, string> = {
  IG: "Inspector General",
  IT: "Inspector Técnico",
  IS: "Inspector Sustanciador",
  IC: "Inspector CCF/ITCC",
};

/**
 * Parte el nombre completo de Auth en apellidos y nombres.
 *
 * **ES UNA HEURÍSTICA**, y es la misma que aplica el servidor: las dos primeras palabras
 * son los apellidos. Vive también aquí porque el formulario precarga con ella antes de
 * enviar nada, y tener dos criterios distintos haría que la pantalla propusiera una cosa y
 * el servidor guardara otra.
 */
export const partirNombre = (
  nombreCompleto: string,
): { apellidos: string; nombres: string } => {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (partes.length <= 2) {
    return { apellidos: partes.join(" "), nombres: "" };
  }

  return {
    apellidos: partes.slice(0, 2).join(" "),
    nombres: partes.slice(2).join(" "),
  };
};
