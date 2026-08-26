/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: FilaSinInformacion.tsx
 * Responsabilidad: Dejar constancia de que un formulario no se cargó, y de quién.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES UNA FILA DE EVIDENCIA, NO UN ESTADO VACÍO. RN-53 y RN-54.
 *
 * La diferencia es de fondo. Un estado vacío dice «aquí no hay nada»; esta fila dice
 * **quién no cargó y hasta cuándo tuvo para hacerlo**. El cuadro es el documento con el
 * que la Dirección responde por la jornada, y un formulario ausente sin explicación se
 * lee como un fallo del sistema en lugar de como lo que es: un departamento que no
 * entregó a tiempo.
 *
 * Por eso el texto lo redacta el servidor —`leyenda`— y aquí se muestra tal cual (regla
 * 7): está escrito para constar en un documento, no para consolar al usuario.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SOLO APARECE CUANDO LA VENTANA VENCIÓ. El servidor únicamente envía `evidencia` si el
 * formulario quedó vacío **y** su plazo pasó: mientras la ventana sigue abierta, que no
 * haya operativos todavía no significa nada.
 */

import type { FC } from "react";

import { comoHoraInstitucional } from "../../utils/horario.util.ts";
import type { SeccionMatriz } from "../../interfaces/Documento.ts";

type FilaSinInformacionProps = {
  evidencia: NonNullable<SeccionMatriz["evidencia"]>;
  columnas: number;
};

const FilaSinInformacion: FC<FilaSinInformacionProps> = ({
  evidencia,
  columnas,
}) => (
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

export default FilaSinInformacion;
