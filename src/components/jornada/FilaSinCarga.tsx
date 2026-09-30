/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: FilaSinCarga.tsx
 * Responsabilidad: Dejar constancia de que un formulario no se cargó, y de quién.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ES UNA COPIA DE `matriz/FilaSinInformacion.tsx`. No se comparte por la misma razón que
 * el resto de esta carpeta: dos pantallas con permisos distintos no comparten piezas.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES UNA FILA DE EVIDENCIA, NO UN ESTADO VACÍO. RN-53 y RN-54.
 *
 * Un estado vacío dice «aquí no hay nada»; esta fila dice **quién no cargó y hasta cuándo
 * tuvo para hacerlo**. Y en esta pantalla tiene un segundo lector: el DMIT ve aquí
 * formularios que no son suyos, y saber que el plazo de otro departamento venció es lo
 * que le explica por qué la sección está vacía.
 *
 * El texto lo redacta el servidor —`leyenda`— y se muestra tal cual (regla 7).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SOLO APARECE CUANDO LA VENTANA VENCIÓ. Mientras el plazo sigue abierto, que no haya
 * operativos todavía no significa nada.
 */

import type { FC } from "react";

import { comoHoraInstitucional } from "../../utils/horario.util.ts";
import type { SeccionJornada } from "../../interfaces/Jornada.ts";

type FilaSinCargaProps = {
  evidencia: NonNullable<SeccionJornada["evidencia"]>;
  columnas: number;
};

const FilaSinCarga: FC<FilaSinCargaProps> = ({ evidencia, columnas }) => (
  <tr className="bg-error/10 text-sm italic">
    <td
      colSpan={columnas}
      className="px-3 py-2"
    >
      <span className="block">{evidencia.leyenda}</span>
      <span className="block not-italic">
        Responsable: {evidencia.responsable}
        {evidencia.horaCierre
          ? ` · cierre ${comoHoraInstitucional(evidencia.horaCierre)}`
          : ""}
      </span>
    </td>
  </tr>
);

export default FilaSinCarga;
