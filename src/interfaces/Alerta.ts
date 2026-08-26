/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alertas visuales
 * Archivo: Alerta.ts
 * Responsabilidad: Declarar las alertas que el servidor deriva por operativo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LAS ALERTAS LLEGAN CALCULADAS. POL-06 las deriva en el servidor y las guarda; aquí
 * solo se pintan. Un segundo cálculo en el navegador podría discrepar del que ve otro
 * departamento en su propia pantalla, y entonces nadie sabría cuál es la buena.
 *
 * REGLA 6 DE CLAUDE.md · ninguna información depende solo del color. En un sistema
 * llamado *cuadro de colores* eso exige atención deliberada: cada alerta trae su
 * `mensaje`, que es el equivalente textual de la celda amarilla.
 */

/** Celda del cuadro que la alerta marca. FASE2 §18.1. */
export type CampoAlertado =
  | "personal"
  | "conductor"
  | "placa"
  | "observaciones"
  | "puntoEncuentro"
  | "tipoControl";

export interface Alerta {
  /** Identificador de FASE2 §18.1: ALV-01 a ALV-06. */
  codigo: string;
  campo: CampoAlertado;
  /** Se muestra tal cual. Está redactado para el funcionario. */
  mensaje: string;
  /** ALV-04 lleva borde crítico; las demás, Amarillo de Alerta. */
  critica: boolean;
}

/**
 * Clase de celda según las alertas que la afectan.
 *
 * `bg-warning/25` es la clase del Amarillo de Alerta ya inventariada en FASE5 §2.2: no
 * se introduce ninguna clase nueva (regla 1 de CLAUDE.md).
 *
 * LA CRÍTICA USA `ring`, NO `border`, y son exactamente las clases que enumera FASE5 §5.3
 * para la matriz. La diferencia importa en una tabla: un borde ocupa espacio y desplaza el
 * contenido de las celdas vecinas, de modo que la fila con alerta crítica quedaría un
 * píxel desalineada respecto de las demás. `ring` se dibuja por encima y no mueve nada.
 */
export const claseDeAlerta = (alertas: Alerta[], campo: CampoAlertado): string => {
  const propias = alertas.filter((alerta) => alerta.campo === campo);

  if (propias.length === 0) return "";

  return propias.some((alerta) => alerta.critica)
    ? "bg-warning/25 font-semibold ring-1 ring-error ring-inset"
    : "bg-warning/25 font-semibold";
};

/** Texto acumulado de las alertas de una celda, para el atributo `title`. */
export const textoDeAlerta = (alertas: Alerta[], campo: CampoAlertado): string =>
  alertas
    .filter((alerta) => alerta.campo === campo)
    .map((alerta) => alerta.mensaje)
    .join(" ");
